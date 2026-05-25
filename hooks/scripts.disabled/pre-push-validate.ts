/**
 * Layer 4 PreToolUse handler — `Bash` + `if: "Bash(git push *)"`.
 *
 * Fires before an agent's `git push`. Parses the push command string to
 * identify the `<remote>` and `<branch>` arguments, reads every Brain note
 * (`docs/**` Markdown) in the commits-being-pushed diff via the git-diff helper,
 * dispatches each through the composition-library claim validator, and DENIES
 * the push when ANY pushed note fails its status-flip claim — naming every
 * failing note. Allows otherwise.
 *
 * Argument parsing (per the ADR-005 D-8 directive that `Bash` handlers parse
 * the actual command STRING rather than trusting `tool_input` shape): handles
 * `git push`, `git push <remote>`, `git push <remote> <branch>`, and the
 * `-u`/`--set-upstream` flag form. When the remote/branch are absent the
 * handler defaults to `origin` + the current branch (`HEAD`); the underlying
 * diff helper falls back to the tracked upstream (`@{u}`) when that ref does
 * not resolve, returning an empty set when no upstream exists at all.
 *
 * Security boundary (Phase 3 reviewer P1): the repo root (`cwd`) and the parsed
 * remote/branch arguments are validated for `..` traversal before any value is
 * handed to a git subprocess.
 *
 * Fail-mode: infrastructure exceptions write structured JSON to stderr and exit
 * non-zero (PreToolUse runtime fail-open). Claim failures fail-closed via the
 * explicit `deny` decision.
 */

import { isAbsolute } from "node:path";

import type { DispatchOutcome } from "../lib/dispatch-validator.ts";
import { UnparseableNoteError, dispatchValidator } from "../lib/dispatch-validator.ts";
import { emitResponse } from "../lib/format-hook-response.ts";
import { readPushDiffBrainNotes } from "../lib/git-diff-commits.ts";
import type { StagedNote } from "../lib/git-staged-files.ts";
import { readHookInput } from "../lib/parse-tool-input.ts";

/** Thrown when a path/ref argument escapes the repo root or is malformed. */
export class PathContainmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathContainmentError";
  }
}

function hasTraversalSegment(candidate: string): boolean {
  return candidate.split("/").some((segment) => segment === "..");
}

/** Validate the repo root: absolute and traversal-free. */
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

/**
 * Reject a remote/branch ref that carries a `..` traversal segment. Git refs
 * legitimately never contain `..` as a path segment (it is forbidden by
 * `git check-ref-format`), so its presence signals an injection attempt.
 */
function assertSafeRef(kind: string, ref: string): void {
  if (hasTraversalSegment(ref)) {
    throw new PathContainmentError(`${kind} ref contains traversal segments: ${ref}`);
  }
}

/** Parsed push target. `branch` defaults to `HEAD` (the current branch). */
export interface PushTarget {
  remote: string;
  branch: string;
}

const PUSH_FLAGS_WITH_NO_VALUE = new Set([
  "-u",
  "--set-upstream",
  "-f",
  "--force",
  "--force-with-lease",
  "--tags",
  "--all",
  "-q",
  "--quiet",
  "-v",
  "--verbose",
  "--no-verify",
  "--dry-run",
  "-n",
  "--atomic",
  "--porcelain",
  "--progress",
]);

/**
 * Parse a `git push ...` command string into its positional `<remote>` and
 * `<branch>` arguments, defaulting to `origin` + `HEAD`. Flags (and their
 * values, for the value-bearing forms) are skipped; only the first two
 * positionals are treated as remote and branch.
 *
 * Note: `--option=value` forms are self-contained and skipped wholesale;
 * value-bearing space-separated options other than the known no-value flags
 * are not expected in agent push commands, so any unknown token starting with
 * `-` is treated as a flag and ignored.
 */
export function parsePushCommand(command: string): PushTarget {
  const tokens = tokenizeCommand(command);
  // Drop the leading `git push` tokens.
  const rest = stripLeading(tokens, ["git", "push"]);
  const positionals: string[] = [];
  for (const token of rest) {
    if (token.startsWith("-")) {
      if (token.includes("=")) continue; // self-contained `--opt=value`
      if (PUSH_FLAGS_WITH_NO_VALUE.has(token)) continue;
      // Unknown bare flag — skip the flag token itself; no value consumption.
      continue;
    }
    positionals.push(token);
  }
  const remote = positionals[0] ?? "origin";
  const branch = positionals[1] ?? "HEAD";
  assertSafeRef("remote", remote);
  assertSafeRef("branch", branch);
  return { remote, branch };
}

/** Split a command string on whitespace, honoring simple single/double quotes. */
function tokenizeCommand(command: string): string[] {
  const tokens: string[] = [];
  const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null = regex.exec(command);
  while (match !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3] ?? "");
    match = regex.exec(command);
  }
  return tokens;
}

/** Remove an expected leading token sequence; returns the remainder. */
function stripLeading(tokens: readonly string[], leading: readonly string[]): string[] {
  let index = 0;
  for (const expected of leading) {
    if (tokens[index] === expected) {
      index += 1;
    }
  }
  return tokens.slice(index);
}

/** Allow/deny decision plus optional reason text. */
export interface PushDecision {
  verdict: "allow" | "deny";
  reason?: string;
}

/**
 * Apply BOUNDARY-gate layered-severity semantics across the pushed note set
 * (REQ-011 amended Event 114). Any `deny` OR `allow-with-warning` verdict —
 * i.e. ANY non-conformance, claim OR hygiene — denies the whole push, naming
 * every non-conforming note. Full conformance is required before history is
 * shared with the remote.
 */
export function decideForNotes(
  notes: readonly StagedNote[],
  dispatch: (content: string, filePath: string) => DispatchOutcome,
): PushDecision {
  const failures: string[] = [];
  for (const note of notes) {
    // BOUNDARY fail-closed (REQ-011 AC#9): a per-note UnparseableNoteError denies
    // the push; only git/infra failures (raised before this loop) fail-open.
    let outcome: DispatchOutcome;
    try {
      outcome = dispatch(note.content, note.filePath);
    } catch (err) {
      if (err instanceof UnparseableNoteError) {
        failures.push(`${note.filePath}: unparseable note (fail-closed at push boundary)`);
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
      reason: `Push blocked — ${failures.length} pushed Brain note(s) failed full-conformance validation:\n${failures.join("\n")}`,
    };
  }
  return { verdict: "allow" };
}

/**
 * Parse the push command, enumerate pushed Brain notes, and produce the
 * allow/deny decision. Separated from stdin/stdout wiring for unit testing.
 */
export async function evaluatePush(repoRoot: string, command: string): Promise<PushDecision> {
  const safeRoot = assertSafeRepoRoot(repoRoot);
  const { remote, branch } = parsePushCommand(command);
  const notes = await readPushDiffBrainNotes(safeRoot, remote, branch);
  return decideForNotes(notes, dispatchValidator);
}

/** Write a structured fail-open error to stderr. */
export function emitFailOpen(handler: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "Error";
  process.stderr.write(`${JSON.stringify({ handler, error: name, message })}\n`);
}

/** Extract the `Bash` command string from the hook tool_input. */
export function readCommand(toolInput: Record<string, unknown>): string {
  const command = toolInput["command"];
  if (typeof command !== "string" || command.trim() === "") {
    throw new Error("Bash hook input missing a non-empty `command` string");
  }
  return command;
}

/* istanbul ignore next -- @preserve */
async function main(): Promise<void> {
  try {
    const input = await readHookInput();
    const command = readCommand(input.tool_input);
    const decision = await evaluatePush(input.cwd, command);
    if (decision.verdict === "deny") {
      emitResponse({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: decision.reason ?? "push blocked",
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
    emitFailOpen("pre-push-validate", err);
    process.exit(1);
  }
}

/* istanbul ignore next -- @preserve */
if (import.meta.main) {
  void main();
}
