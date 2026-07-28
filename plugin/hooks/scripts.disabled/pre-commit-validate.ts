/**
 * Layer 3 PreToolUse handler — `Bash` + `if: "Bash(git commit *)"`.
 *
 * Fires before an agent's `git commit`. Reads every staged Brain note
 * (`docs/**` Markdown) via `git show :<file>`, dispatches each through the
 * composition-library claim validator, and DENIES the commit when ANY
 * staged note fails its status-flip claim — naming every failing note.
 * Allows otherwise.
 *
 * Layered-severity semantics (REQ-011 amended Event 114): Layer 3 is a BOUNDARY
 * gate, so it maps BOTH `deny` AND `allow-with-warning` to a commit-block. Once
 * a batch reaches the commit boundary, full conformance is required — nothing
 * non-conformant (claim-lie OR hygiene) may enter git history. Any single
 * non-conforming staged note denies the whole commit, naming every offender.
 * The per-write ergonomics (allow-with-warning proceeds so notes stay editable)
 * apply only at Layers 1-2; they do not apply here.
 *
 * Security boundary (Phase 3 reviewer P1): the working directory (`cwd`)
 * arrives from the trusted Claude Code hook dispatcher, but the handler still
 * resolves it to an absolute path and rejects traversal before shelling out to
 * `git`. The `git commit` command itself carries no path argument to validate.
 *
 * Fail-mode: any infrastructure exception (unreadable stdin, git failure,
 * unparseable note) is written as structured JSON to stderr and the process
 * exits non-zero. The PreToolUse runtime treats non-zero exit as a non-blocking
 * error (fail-open) so a hook crash never wedges the commit. Schema-violation
 * claims fail-closed via the explicit `deny` decision.
 */

import { isAbsolute } from "node:path";

import type { DispatchOutcome } from "../lib/dispatch-validator.ts";
import { UnparseableNoteError, dispatchValidator } from "../lib/dispatch-validator.ts";
import { emitResponse } from "../lib/format-hook-response.ts";
import type { StagedNote } from "../lib/git-staged-files.ts";
import { readStagedBrainNotes } from "../lib/git-staged-files.ts";
import { readHookInput } from "../lib/parse-tool-input.ts";

/** Thrown when a path argument escapes the repo root or is not absolute. */
export class PathContainmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathContainmentError";
  }
}

/** A path segment that walks up the tree. */
function hasTraversalSegment(candidate: string): boolean {
  return candidate.split("/").some((segment) => segment === "..");
}

/**
 * Validate the repo root: it MUST be absolute and MUST NOT contain a `..`
 * traversal segment. The hook dispatcher supplies `cwd`, but defense-in-depth
 * requires the handler to reject a malformed value before invoking git.
 */
export function assertSafeRepoRoot(repoRoot: string): string {
  if (repoRoot.trim() === "") {
    throw new PathContainmentError("repo root is empty");
  }
  if (!isAbsolute(repoRoot)) {
    throw new PathContainmentError(`repo root is not absolute: ${repoRoot}`);
  }
  if (hasTraversalSegment(repoRoot)) {
    throw new PathContainmentError(`repo root contains traversal segments: ${repoRoot}`);
  }
  return repoRoot;
}

/** Allow/deny decision plus optional reason text. */
export interface CommitDecision {
  verdict: "allow" | "deny";
  /** Populated when `verdict === "deny"`. */
  reason?: string;
}

/**
 * Apply BOUNDARY-gate layered-severity semantics across the staged note set
 * (REQ-011 amended Event 114). Any note whose dispatch verdict is `deny` OR
 * `allow-with-warning` — i.e. ANY non-conformance, claim OR hygiene — denies the
 * whole commit; the reason names every non-conforming note with its specific
 * cause. A fully clean set (every note `allow`) allows.
 */
export function decideForNotes(
  notes: readonly StagedNote[],
  dispatch: (content: string, filePath: string) => DispatchOutcome,
): CommitDecision {
  const failures: string[] = [];
  for (const note of notes) {
    // An UnparseableNoteError on a single staged note is a per-note structural
    // defect. At a BOUNDARY gate the conservative default is FAIL-CLOSED
    // (REQ-011 AC#9): the unparseable note denies the commit rather than slipping
    // through. Only git/infra failures (raised before this loop) fail-open.
    let outcome: DispatchOutcome;
    try {
      outcome = dispatch(note.content, note.filePath);
    } catch (err) {
      if (err instanceof UnparseableNoteError) {
        failures.push(`${note.filePath}: unparseable note (fail-closed at commit boundary)`);
        continue;
      }
      throw err;
    }
    if (outcome.verdict === "deny") {
      failures.push(`${note.filePath}: ${outcome.reason ?? "claim validation failed"}`);
    } else if (outcome.verdict === "allow-with-warning") {
      failures.push(`${note.filePath}: ${outcome.warning ?? "schema hygiene issue"}`);
    }
  }
  if (failures.length > 0) {
    return {
      verdict: "deny",
      reason: `Commit blocked — ${failures.length} staged Brain note(s) failed full-conformance validation:\n${failures.join("\n")}`,
    };
  }
  return { verdict: "allow" };
}

/**
 * Resolve the repo root, enumerate staged Brain notes, and produce the
 * allow/deny decision. Separated from the stdin/stdout wiring so it can be
 * unit-tested against a real fixture repo.
 */
export async function evaluateStagedCommit(repoRoot: string): Promise<CommitDecision> {
  const safeRoot = assertSafeRepoRoot(repoRoot);
  const notes = await readStagedBrainNotes(safeRoot);
  return decideForNotes(notes, dispatchValidator);
}

/** Write a structured fail-open error to stderr (shared shape across layers). */
export function emitFailOpen(handler: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "Error";
  process.stderr.write(`${JSON.stringify({ handler, error: name, message })}\n`);
}

/* istanbul ignore next -- @preserve */
async function main(): Promise<void> {
  try {
    const input = await readHookInput();
    const decision = await evaluateStagedCommit(input.cwd);
    if (decision.verdict === "deny") {
      emitResponse({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: decision.reason ?? "commit blocked",
        },
      });
      return;
    }
    emitResponse({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
      },
    });
  } catch (err) {
    emitFailOpen("pre-commit-validate", err);
    process.exit(1);
  }
}

/* istanbul ignore next -- @preserve */
if (import.meta.main) {
  void main();
}
