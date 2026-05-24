/**
 * Layer 5 PreToolUse handler — `Bash` + `if: "Bash(gh pr create *)"`.
 *
 * Fires before an agent opens a PR with `gh pr create`. Parses the command
 * string to identify the `--base` branch (defaulting to `origin/HEAD` — the
 * remote default branch — when absent), reads every Brain note (`docs/**` Markdown)
 * in the PR diff via the git-diff helper, dispatches each through the
 * composition-library claim validator, and DENIES the PR open when ANY PR-diff
 * note fails its status-flip claim — naming every failing note. Allows
 * otherwise.
 *
 * Argument parsing (per the ADR-005 D-8 directive that `Bash` handlers parse
 * the actual command STRING rather than trusting `tool_input` shape): handles
 * `--base <branch>`, `--base=<branch>`, and the `-B <branch>` short form.
 *
 * Security boundary (Phase 3 reviewer P1): the repo root (`cwd`) and the parsed
 * base ref are validated for `..` traversal before any value reaches a git
 * subprocess.
 *
 * Fail-mode: infrastructure exceptions write structured JSON to stderr and exit
 * non-zero (PreToolUse runtime fail-open). Claim failures fail-closed via the
 * explicit `deny` decision.
 */

import { isAbsolute } from "node:path";

import type { DispatchOutcome } from "../lib/dispatch-validator.ts";
import { dispatchValidator } from "../lib/dispatch-validator.ts";
import { emitResponse } from "../lib/format-hook-response.ts";
import { readPrDiffBrainNotes } from "../lib/git-diff-commits.ts";
import type { StagedNote } from "../lib/git-staged-files.ts";
import { readHookInput } from "../lib/parse-tool-input.ts";

/** Default base ref when `gh pr create` carries no `--base`: the remote HEAD. */
export const DEFAULT_BASE_REF = "origin/HEAD";

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
 * Reject a base ref carrying a `..` traversal segment. Git refs forbid `..`
 * as a path component (`git check-ref-format`), so its presence signals an
 * injection attempt against the diff subprocess.
 */
function assertSafeRef(ref: string): void {
  if (ref.trim() === "") {
    throw new PathContainmentError("base ref is empty");
  }
  if (hasTraversalSegment(ref)) {
    throw new PathContainmentError(`base ref contains traversal segments: ${ref}`);
  }
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

/**
 * Parse a `gh pr create ...` command string to extract the `--base` branch,
 * defaulting to `origin/HEAD` when absent. Recognizes `--base <value>`,
 * `--base=<value>`, `-B <value>`, and `-B=<value>`.
 */
export function parsePrCreateBase(command: string): string {
  const tokens = tokenizeCommand(command);
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === undefined) continue;
    if (token === "--base" || token === "-B") {
      const value = tokens[i + 1];
      if (value === undefined || value.startsWith("-")) {
        throw new Error(`\`${token}\` flag present without a branch value`);
      }
      assertSafeRef(value);
      return value;
    }
    if (token.startsWith("--base=")) {
      const value = token.slice("--base=".length);
      assertSafeRef(value);
      return value;
    }
    if (token.startsWith("-B=")) {
      const value = token.slice("-B=".length);
      assertSafeRef(value);
      return value;
    }
  }
  return DEFAULT_BASE_REF;
}

/** Allow/deny decision plus optional advisory warning text. */
export interface PrCreateDecision {
  verdict: "allow" | "deny";
  reason?: string;
  warning?: string;
}

/**
 * Apply per-batch HYBRID semantics across the PR-diff note set. Any `deny`
 * verdict denies the whole PR open, naming every failing note.
 */
export function decideForNotes(
  notes: readonly StagedNote[],
  dispatch: (content: string, filePath: string) => DispatchOutcome,
): PrCreateDecision {
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
      reason: `PR open blocked — ${failures.length} PR-diff Brain note(s) failed claim validation:\n${failures.join("\n")}`,
    };
  }
  if (warnings.length > 0) {
    return { verdict: "allow", warning: warnings.join("\n") };
  }
  return { verdict: "allow" };
}

/**
 * Parse the PR-create command, enumerate PR-diff Brain notes, and produce the
 * allow/deny decision. Separated from stdin/stdout wiring for unit testing.
 */
export async function evaluatePrCreate(
  repoRoot: string,
  command: string,
): Promise<PrCreateDecision> {
  const safeRoot = assertSafeRepoRoot(repoRoot);
  const baseBranch = parsePrCreateBase(command);
  const notes = await readPrDiffBrainNotes(safeRoot, baseBranch);
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
    const decision = await evaluatePrCreate(input.cwd, command);
    if (decision.verdict === "deny") {
      emitResponse({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: decision.reason ?? "PR open blocked",
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
    emitFailOpen("pre-pr-create-validate", err);
    process.exit(1);
  }
}

/* istanbul ignore next -- @preserve */
if (import.meta.main) {
  void main();
}
