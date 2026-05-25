/**
 * Layer 7 — FileChanged post-commit observability handler (SPEC-008 TASK-045).
 *
 * Binds to the `FileChanged` event with matcher
 * `.git/HEAD|.git/index|.git/logs/HEAD` (declared in `hooks/hooks.json`). The
 * matcher fires when a commit lands. This handler:
 *
 *   1. Reads hook input from stdin (seed `cwd`).
 *   2. Resolves the repo root via `git rev-parse --show-toplevel`.
 *   3. Reads the new commit SHA via `git rev-parse HEAD`.
 *   4. Enumerates `docs/**` Markdown files touched by that commit via
 *      `git diff-tree --no-commit-id --name-only -r HEAD`.
 *   5. Reads each touched file's current on-disk (post-commit) content and
 *      dispatches it through `dispatchValidator`.
 *   6. Aggregates PASS/FAIL counts plus the failing-file list into a summary.
 *   7. Emits a `FileChanged` `additionalContext` line into the transcript.
 *
 * Layer 7 is OBSERVABILITY, never a blocking gate. The handler emits ONLY
 * `additionalContext` — never a `permissionDecision` or `decision` field — and
 * fails open: any exception (git failure, read failure, validator
 * infrastructure error) degrades to a diagnostic `additionalContext` rather
 * than crashing the turn. Its purpose is to make the post-commit graph state
 * explicit in the transcript ledger so the agent and operator both see what was
 * just enforced.
 *
 * External editor edits (e.g. `vim` outside Claude Code) that modify a
 * `docs/**` Markdown note without touching
 * `.git/HEAD`/`.git/index`/`.git/logs/HEAD` do NOT fire this handler — the
 * matcher uses literal filenames, not globs.
 * Tool-mediated edits are the threat model; external editor edits are
 * explicitly out of scope.
 */

import { isAbsolute, relative, resolve } from "node:path";

import { dispatchValidator } from "../lib/dispatch-validator.ts";
import { type FileChangedObserve, emitResponse } from "../lib/format-hook-response.ts";
import { type FileChangedHookInput, readFileChangedHookInput } from "../lib/parse-tool-input.ts";

/** Degraded-state context emitted when validation infrastructure throws. */
const INFRA_ERROR_CONTEXT =
  "Post-commit state: validation infrastructure error; manual inspection required";

/** A single touched Brain note plus its post-commit on-disk content. */
export interface TouchedNote {
  filePath: string;
  content: string;
}

/** Per-note validation outcome used to build the aggregate summary. */
export interface NoteValidation {
  filePath: string;
  passed: boolean;
}

/** Aggregate validation summary across every touched Brain note. */
export interface ValidationSummary {
  total: number;
  passed: number;
  failed: number;
  failingFiles: readonly string[];
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
 * Resolve the git repo root from a seed directory.
 *
 * The hook input `cwd` is the trusted runtime seed; `git rev-parse
 * --show-toplevel` resolves the enclosing work-tree root from it.
 */
export async function resolveRepoRoot(seedCwd: string): Promise<string> {
  const out = await runGit(seedCwd, ["rev-parse", "--show-toplevel"]);
  return out.trim();
}

/** Read the current `HEAD` commit SHA. */
export async function readHeadSha(repoRoot: string): Promise<string> {
  const out = await runGit(repoRoot, ["rev-parse", "HEAD"]);
  return out.trim();
}

/**
 * Verify a repo-relative path stays inside the repo root before any read,
 * rejecting `..` traversal or absolute escapes per the REQ-012 security AC.
 * Returns the absolute on-disk path when contained; `null` otherwise.
 */
export function containedAbsolutePath(repoRoot: string, relPath: string): string | null {
  if (isAbsolute(relPath)) return null;
  const abs = resolve(repoRoot, relPath);
  const rel = relative(repoRoot, abs);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return null;
  return abs;
}

/**
 * Enumerate `docs/**` Markdown files touched by the given commit.
 *
 * `git diff-tree --no-commit-id --name-only -r <sha>` lists every path
 * touched by the commit; the result is filtered to Brain notes. Traversal-
 * unsafe paths are dropped (defense in depth — git never emits absolute paths,
 * but the containment check is the security boundary).
 */
export async function touchedBrainNotePaths(repoRoot: string, sha: string): Promise<string[]> {
  const raw = await runGit(repoRoot, ["diff-tree", "--no-commit-id", "--name-only", "-r", sha]);
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter(isBrainNote)
    .filter((line) => containedAbsolutePath(repoRoot, line) !== null);
}

/**
 * Read each touched note's current on-disk (post-commit) content. A note that
 * no longer exists on disk (e.g. deleted in the commit) is skipped — there is
 * no post-commit content to validate.
 */
export async function readTouchedNotes(
  repoRoot: string,
  paths: readonly string[],
): Promise<TouchedNote[]> {
  const notes: TouchedNote[] = [];
  for (const filePath of paths) {
    const abs = containedAbsolutePath(repoRoot, filePath);
    if (abs === null) continue;
    const file = Bun.file(abs);
    if (!(await file.exists())) continue;
    notes.push({ filePath, content: await file.text() });
  }
  return notes;
}

/**
 * Validate a single note. A `deny` verdict from the claim validator means a
 * landed note fails its terminal-status contract; an `UnparseableNoteError`
 * (or any other throw) likewise counts as a FAIL for the observability tally —
 * Layer 7 reports state, it does not adjudicate fail-open vs fail-closed.
 */
function validateNote(note: TouchedNote): NoteValidation {
  try {
    const outcome = dispatchValidator(note.content, note.filePath);
    return { filePath: note.filePath, passed: outcome.verdict !== "deny" };
  } catch {
    return { filePath: note.filePath, passed: false };
  }
}

/** Compute the aggregate PASS/FAIL summary across every touched note. */
export function summarize(notes: readonly TouchedNote[]): ValidationSummary {
  const results = notes.map(validateNote);
  const failingFiles = results.filter((r) => !r.passed).map((r) => r.filePath);
  return {
    total: results.length,
    passed: results.length - failingFiles.length,
    failed: failingFiles.length,
    failingFiles,
  };
}

/** Render the aggregate summary into the human-readable summary clause. */
export function renderSummary(summary: ValidationSummary): string {
  if (summary.total === 0) {
    return "no docs/** notes touched";
  }
  const head = `${summary.passed}/${summary.total} PASS`;
  if (summary.failed === 0) {
    return `${head} (all passing)`;
  }
  return `${head}, ${summary.failed} FAIL: ${summary.failingFiles.join(", ")}`;
}

/** Build the full `additionalContext` line for a landed commit. */
export function buildAdditionalContext(sha: string, summary: ValidationSummary): string {
  return `Post-commit state: commit ${sha} landed; full graph validation: ${renderSummary(summary)}`;
}

/**
 * Pure observation core: resolve repo root + HEAD SHA, enumerate and read the
 * touched Brain notes, validate them, and build the `additionalContext` string.
 * Exposed for unit testing without the stdin/stdout coupling.
 */
export async function observePostCommitState(seedCwd: string): Promise<string> {
  const repoRoot = await resolveRepoRoot(seedCwd);
  const sha = await readHeadSha(repoRoot);
  const paths = await touchedBrainNotePaths(repoRoot, sha);
  const notes = await readTouchedNotes(repoRoot, paths);
  return buildAdditionalContext(sha, summarize(notes));
}

/**
 * Build the Layer 7 response from hook input. Always returns a
 * `FileChangedObserve` — never blocks. On any infrastructure error the
 * response degrades to `INFRA_ERROR_CONTEXT` (fail-open observe-only).
 */
export async function buildResponse(input: FileChangedHookInput): Promise<FileChangedObserve> {
  let additionalContext: string;
  try {
    additionalContext = await observePostCommitState(input.cwd);
  } catch {
    additionalContext = INFRA_ERROR_CONTEXT;
  }
  return {
    hookSpecificOutput: {
      hookEventName: "FileChanged",
      additionalContext,
    },
  };
}

/* istanbul ignore next -- @preserve */
async function main(): Promise<void> {
  // Even a malformed hook payload must not crash the turn — Layer 7 is
  // observe-only and fails open. A failed stdin read degrades to the infra
  // error context.
  let response: FileChangedObserve;
  try {
    const input = await readFileChangedHookInput();
    response = await buildResponse(input);
  } catch {
    response = {
      hookSpecificOutput: {
        hookEventName: "FileChanged",
        additionalContext: INFRA_ERROR_CONTEXT,
      },
    };
  }
  emitResponse(response);
}

/* istanbul ignore next -- @preserve */
if (import.meta.main) {
  await main();
}
