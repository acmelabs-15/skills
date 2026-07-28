/**
 * Layer 6 — Stop turn-end backstop handler (SPEC-008 TASK-044, Wave 2).
 *
 * Binds to the `Stop` event with NO matcher (declared in `hooks/hooks.json`),
 * so it fires at the end of every agent turn. On invocation it:
 *
 *   1. Reads hook input from stdin (seed `cwd`).
 *   2. Resolves the repo root via `git rev-parse --show-toplevel`.
 *   3. Enumerates `docs/**` Markdown files modified this turn via
 *      `git status --porcelain` — every uncommitted modified/added/renamed
 *      working-tree entry under `docs/`. This catches Edit/Write/MultiEdit
 *      local writes AND `mcp__plugin_brain_brain__edit_note`/`write_note` MCP
 *      writes alike, because both leave on-disk modifications. (Amended
 *      2026-05-24, SESSION-2026-05-23_02 Event 105, user-approved: git-status
 *      enumeration replaces transcript-walk per REQ-012 AC1 — transcript-
 *      parsing misses Brain-MCP edits and mtime-scanning misses reverts;
 *      git-status catches tool-mediated edits regardless of the Edit/Write vs
 *      MCP path and regardless of commit state.)
 *   4. Deduplicates the enumerated set (git status yields one entry per path).
 *   5. Validates path containment for the set, rejecting `..` traversal or
 *      absolute escapes with a structured block reason (Phase 3 security P1).
 *   6. Reads each file's current on-disk content and dispatches it through
 *      `dispatchValidator`.
 *   7. If ANY file fails: emits `{ decision: "block", reason: "Turn-end
 *      backstop: <N> docs/** notes modified this turn fail validation:
 *      <list>" }` to block turn completion.
 *   8. Otherwise: emits NO payload and exits 0, letting the turn complete.
 *
 * Layer 6 is the defense-in-depth backstop for the matcher-gap risk: if a
 * `PreToolUse` matcher fails to fire on `mcp__plugin_brain_brain__*` (Layer 2)
 * or any other path, the turn end still runs the validators before the agent
 * yields control.
 *
 * Fail-mode asymmetry: unlike Layers 1-5 (fail OPEN on infrastructure error),
 * Layer 6 fails CLOSED. If the git enumeration or validator dispatch throws,
 * the handler emits `{ decision: "block", reason: "Turn-end backstop:
 * infrastructure error ..." }` so the protocol is preserved at the turn
 * boundary — the outermost gate where conservative defaults outrank
 * availability.
 */

import { isAbsolute, relative, resolve } from "node:path";

import { dispatchValidator } from "../lib/dispatch-validator.ts";
import { type StopBlock, emitResponse } from "../lib/format-hook-response.ts";
import { readStopHookInput } from "../lib/parse-tool-input.ts";

/** Reason emitted when git enumeration or validator dispatch throws (fail CLOSED). */
const INFRA_ERROR_REASON =
  "Turn-end backstop: infrastructure error during validation; turn blocked pending investigation";

/** Thrown when an enumerated path escapes the repo root (traversal / absolute escape). */
export class PathContainmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathContainmentError";
  }
}

/** A single modified Brain note plus its current on-disk content. */
export interface ModifiedNote {
  filePath: string;
  content: string;
}

interface GitRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function runGitRaw(repoRoot: string, args: readonly string[]): Promise<GitRunResult> {
  const proc = Bun.spawn(["git", ...args], {
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { exitCode, stdout, stderr };
}

async function runGit(repoRoot: string, args: readonly string[]): Promise<string> {
  const result = await runGitRaw(repoRoot, args);
  if (result.exitCode !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed (exit ${result.exitCode}): ${result.stderr.trim()}`,
    );
  }
  return result.stdout;
}

/** True for `docs/**`-rooted Markdown notes. */
function isBrainNote(filePath: string): boolean {
  return filePath.startsWith("docs/") && filePath.endsWith(".md");
}

/**
 * Resolve the git repo root from a seed directory. The hook input `cwd` is the
 * trusted runtime seed; `git rev-parse --show-toplevel` resolves the enclosing
 * work-tree root from it.
 */
export async function resolveRepoRoot(seedCwd: string): Promise<string> {
  const out = await runGit(seedCwd, ["rev-parse", "--show-toplevel"]);
  return out.trim();
}

/**
 * Extract the working-tree path from a single `git status --porcelain` (v1)
 * line. The format is `XY <path>`, where `XY` are the two status columns and a
 * single space separates them from the path. A rename/copy line is
 * `R  <old> -> <new>` (or `C  ...`) — the post-rename path (after ` -> `) is
 * the on-disk file to validate. Returns `null` for a blank line.
 */
export function parsePorcelainPath(line: string): string | null {
  if (line.length === 0) return null;
  // Columns 0-1 are the status code; column 2 is the separator space.
  const rest = line.slice(3);
  if (rest.length === 0) return null;
  const arrowIndex = rest.indexOf(" -> ");
  const path = arrowIndex >= 0 ? rest.slice(arrowIndex + 4) : rest;
  return path.length > 0 ? path : null;
}

/**
 * Enumerate `docs/**` Markdown files modified this turn via `git status
 * --porcelain --untracked-files=all`. Captures uncommitted modified/added/
 * renamed/untracked working-tree entries (both staged and unstaged) under
 * `docs/`. The `--untracked-files=all` flag is REQUIRED: plain `--porcelain`
 * collapses an untracked directory to a single `?? docs/` summary line, which
 * would miss every individual new note (e.g. an MCP `write_note` that created
 * a fresh file). `-uall` forces one line per untracked file so new notes are
 * enumerated individually. Deletions yield no on-disk content and are filtered
 * out by the existence check downstream. The returned set is deduplicated
 * (git status emits one line per path, but a defensive Set guards against
 * future format quirks).
 */
export async function enumerateModifiedBrainNotes(repoRoot: string): Promise<string[]> {
  const raw = await runGit(repoRoot, ["status", "--porcelain", "--untracked-files=all"]);
  const seen = new Set<string>();
  for (const line of raw.split("\n")) {
    const path = parsePorcelainPath(line);
    if (path === null || !isBrainNote(path)) continue;
    seen.add(path);
  }
  return [...seen];
}

/**
 * Verify a repo-relative path stays inside the repo root, rejecting `..`
 * traversal or absolute escapes per the REQ-012 security AC. Returns the
 * absolute on-disk path. Throws `PathContainmentError` when the path escapes —
 * the Stop handler converts that into a structured block reason (fail CLOSED).
 */
export function assertContainedAbsolutePath(repoRoot: string, relPath: string): string {
  if (isAbsolute(relPath)) {
    throw new PathContainmentError(`path is absolute (escapes repo root): ${relPath}`);
  }
  const abs = resolve(repoRoot, relPath);
  const rel = relative(repoRoot, abs);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new PathContainmentError(`path escapes repo root: ${relPath}`);
  }
  return abs;
}

/**
 * Read each modified note's current on-disk content. Containment is asserted
 * per path before any read. A note that no longer exists on disk (e.g. deleted
 * this turn) is skipped — there is no current content to validate.
 */
export async function readModifiedNotes(
  repoRoot: string,
  paths: readonly string[],
): Promise<ModifiedNote[]> {
  const notes: ModifiedNote[] = [];
  for (const filePath of paths) {
    const abs = assertContainedAbsolutePath(repoRoot, filePath);
    const file = Bun.file(abs);
    if (!(await file.exists())) continue;
    notes.push({ filePath, content: await file.text() });
  }
  return notes;
}

/** A turn-end decision: block (with reason) or allow (let the turn complete). */
export interface BackstopDecision {
  verdict: "block" | "allow";
  /** Populated when `verdict === "block"`. */
  reason?: string;
}

/**
 * Apply BACKSTOP-gate layered-severity semantics across the modified set
 * (REQ-011 amended Event 114). Any note whose dispatch verdict is `deny` OR
 * `allow-with-warning` — i.e. ANY non-conformance, claim OR hygiene — blocks
 * turn completion; the reason names every non-conforming note. A fully clean
 * (or empty) set allows the turn to complete.
 *
 * `allow-with-warning` DOES block here: Layer 6 is the turn-end backstop where
 * full conformance is required — nothing non-conformant may survive turn-end.
 * The per-write ergonomics (allow-with-warning proceeds so a note stays
 * editable) apply only at Layers 1-2; the backstop is a boundary-class gate.
 */
export function decideForNotes(
  notes: readonly ModifiedNote[],
  dispatch: (
    content: string,
    filePath: string,
  ) => { verdict: string; reason?: string; warning?: string },
): BackstopDecision {
  const failures: string[] = [];
  for (const note of notes) {
    const outcome = dispatch(note.content, note.filePath);
    if (outcome.verdict === "deny") {
      failures.push(`${note.filePath}: ${outcome.reason ?? "claim validation failed"}`);
    } else if (outcome.verdict === "allow-with-warning") {
      failures.push(`${note.filePath}: ${outcome.warning ?? "schema hygiene issue"}`);
    }
  }
  if (failures.length > 0) {
    return {
      verdict: "block",
      reason: `Turn-end backstop: ${failures.length} docs/** notes modified this turn fail full-conformance validation: ${failures.join("; ")}`,
    };
  }
  return { verdict: "allow" };
}

/**
 * Pure backstop core: resolve repo root, enumerate the turn's modified Brain
 * notes via `git status --porcelain`, read their on-disk content, and produce
 * the block/allow decision. Separated from the stdin/stdout wiring so it can be
 * unit-tested against a real fixture repo.
 *
 * Throws on any infrastructure failure (git error, read error, validator
 * exception) — the caller converts that throw into a fail-CLOSED block.
 */
export async function evaluateTurnEnd(seedCwd: string): Promise<BackstopDecision> {
  const repoRoot = await resolveRepoRoot(seedCwd);
  const paths = await enumerateModifiedBrainNotes(repoRoot);
  const notes = await readModifiedNotes(repoRoot, paths);
  return decideForNotes(notes, dispatchValidator);
}

/**
 * Build the Layer 6 response, or `null` when the turn should complete normally
 * (no block payload). Fails CLOSED: any infrastructure exception becomes a
 * block with `INFRA_ERROR_REASON` rather than letting the turn slip through.
 */
export async function buildResponse(seedCwd: string): Promise<StopBlock | null> {
  let decision: BackstopDecision;
  try {
    decision = await evaluateTurnEnd(seedCwd);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { decision: "block", reason: `${INFRA_ERROR_REASON} (${detail})` };
  }
  if (decision.verdict === "block") {
    return { decision: "block", reason: decision.reason ?? INFRA_ERROR_REASON };
  }
  return null;
}

/* istanbul ignore next -- @preserve */
async function main(): Promise<void> {
  // Fail CLOSED: if even reading stdin throws, block the turn rather than let
  // an unvalidated state change escape. A clean turn emits no payload and the
  // process exits 0, allowing completion.
  let response: StopBlock | null;
  try {
    // Parse the real `Stop`-event shape (cwd-only; no tool_name / tool_input).
    // A normal turn-end event validates cleanly here; only a genuinely
    // malformed payload throws and is converted to a fail-CLOSED block below.
    const input = await readStopHookInput();
    response = await buildResponse(input.cwd);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    response = { decision: "block", reason: `${INFRA_ERROR_REASON} (${detail})` };
  }
  if (response !== null) {
    emitResponse(response);
  }
}

/* istanbul ignore next -- @preserve */
if (import.meta.main) {
  void main();
}
