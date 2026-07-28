// Enumerate staged Brain notes (docs/**/*.md) and read each post-image
// via `git show :<file>`.
//
// Used by Layer 3 (`pre-commit-validate.ts`). Filters to docs/** so that
// non-Brain files do not invoke validators. Path containment is a handler
// concern; this module assumes the caller has already resolved + validated
// `repoRoot`.

export interface StagedNote {
  filePath: string;
  content: string;
}

/**
 * Run a git subprocess with explicit cwd. Returns trimmed stdout on
 * successful exit; throws with a descriptive message on non-zero exit.
 */
async function runGit(repoRoot: string, args: readonly string[]): Promise<string> {
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
  if (exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed (exit ${exitCode}): ${stderr.trim()}`);
  }
  return stdout;
}

/** Filter to docs/** Markdown files. */
function isBrainNote(filePath: string): boolean {
  return filePath.startsWith("docs/") && filePath.endsWith(".md");
}

/**
 * Enumerate staged Brain notes (added / copied / modified) and read each
 * staged post-image via `git show :<file>`.
 *
 * Returns `[]` when no Brain notes are staged.
 */
export async function readStagedBrainNotes(repoRoot: string): Promise<StagedNote[]> {
  const rawList = await runGit(repoRoot, [
    "diff",
    "--cached",
    "--name-only",
    "--diff-filter=ACM",
  ]);
  const paths = rawList
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter(isBrainNote);

  if (paths.length === 0) {
    return [];
  }

  const notes: StagedNote[] = [];
  for (const filePath of paths) {
    const content = await runGit(repoRoot, ["show", `:${filePath}`]);
    notes.push({ filePath, content });
  }
  return notes;
}
