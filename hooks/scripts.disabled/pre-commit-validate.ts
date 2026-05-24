/**
 * Layer 3 PreToolUse handler — `Bash` + `if: "Bash(git commit *)"`.
 *
 * Fires before an agent's `git commit`. Reads every staged Brain note
 * (`docs/**` Markdown) via `git show :<file>`, dispatches each through the
 * composition-library claim validator, and DENIES the commit when ANY
 * staged note fails its status-flip claim — naming every failing note.
 * Allows otherwise.
 *
 * Batch semantics (ADR-005 D-8 HYBRID, per-batch hardening): once a batch
 * reaches the commit boundary the per-note allow-with-warning ergonomics no
 * longer apply — the batch must be clean, so any single failing note denies
 * the whole commit.
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
import { dispatchValidator } from "../lib/dispatch-validator.ts";
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

/** Allow/deny decision plus optional advisory warning text. */
export interface CommitDecision {
  verdict: "allow" | "deny";
  /** Populated when `verdict === "deny"`. */
  reason?: string;
  /** Populated for an allow carrying advisory text. */
  warning?: string;
}

/**
 * Apply per-batch HYBRID semantics across the staged note set. Any note whose
 * dispatch verdict is `deny` denies the whole commit; the reason names every
 * failing note. A clean set allows, surfacing the first advisory warning (if
 * any) as `additionalContext`.
 */
export function decideForNotes(
  notes: readonly StagedNote[],
  dispatch: (content: string, filePath: string) => DispatchOutcome,
): CommitDecision {
  const failures: string[] = [];
  const warnings: string[] = [];
  for (const note of notes) {
    const outcome = dispatch(note.content, note.filePath);
    if (outcome.verdict === "deny") {
      failures.push(`${note.filePath}: ${outcome.reason ?? "claim validation failed"}`);
    } else if (outcome.verdict === "allow-with-warning" && outcome.warning !== undefined) {
      warnings.push(`${note.filePath}: ${outcome.warning}`);
    }
  }
  if (failures.length > 0) {
    return {
      verdict: "deny",
      reason: `Commit blocked — ${failures.length} staged Brain note(s) failed claim validation:\n${failures.join("\n")}`,
    };
  }
  if (warnings.length > 0) {
    return { verdict: "allow", warning: warnings.join("\n") };
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
        ...(decision.warning !== undefined ? { additionalContext: decision.warning } : {}),
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
