// Enumerate Brain notes (docs/**/*.md) whose content differs in a push
// or PR diff range, and read each post-image (HEAD blob) via
// `git show HEAD:<file>`.
//
// Used by Layer 4 (`pre-push-validate.ts`) and Layer 5
// (`pre-pr-create-validate.ts`). Path containment is a handler concern;
// this module assumes the caller has resolved + validated `repoRoot`.

import type { StagedNote } from "./git-staged-files.ts";

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

function isBrainNote(filePath: string): boolean {
  return filePath.startsWith("docs/") && filePath.endsWith(".md");
}

function parsePathList(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter(isBrainNote);
}

async function readHeadBlobs(repoRoot: string, paths: readonly string[]): Promise<StagedNote[]> {
  const notes: StagedNote[] = [];
  for (const filePath of paths) {
    const content = await runGit(repoRoot, ["show", `HEAD:${filePath}`]);
    notes.push({ filePath, content });
  }
  return notes;
}

/**
 * Check whether a git ref (e.g. `origin/main`, `@{u}`) is resolvable.
 */
async function refExists(repoRoot: string, ref: string): Promise<boolean> {
  const result = await runGitRaw(repoRoot, ["rev-parse", "--verify", "--quiet", ref]);
  return result.exitCode === 0;
}

/**
 * Read Brain-note post-images for the commits being pushed.
 *
 * Primary path: `git diff <remote>/<branch>...HEAD --name-only`.
 *
 * No-upstream fallback: if `<remote>/<branch>` does not resolve, try
 * walking commits ahead of `@{u}` (`git diff @{u}...HEAD`). If `@{u}`
 * is also unreachable, log a warning and return `[]` — the caller's
 * handler chooses whether to allow or block.
 */
export async function readPushDiffBrainNotes(
  repoRoot: string,
  remote: string,
  branch: string,
): Promise<StagedNote[]> {
  const remoteRef = `${remote}/${branch}`;
  if (await refExists(repoRoot, remoteRef)) {
    const raw = await runGit(repoRoot, ["diff", `${remoteRef}...HEAD`, "--name-only"]);
    return readHeadBlobs(repoRoot, parsePathList(raw));
  }

  if (await refExists(repoRoot, "@{u}")) {
    const raw = await runGit(repoRoot, ["diff", "@{u}...HEAD", "--name-only"]);
    return readHeadBlobs(repoRoot, parsePathList(raw));
  }

  console.warn(
    `[git-diff-commits] no upstream resolvable for ${remoteRef} or @{u}; returning empty diff set`,
  );
  return [];
}

/**
 * Read Brain-note post-images for the commits in a PR diff range.
 *
 * `git diff <baseBranch>...HEAD --name-only`, filtered to docs Markdown,
 * with each post-image read via `git show HEAD:<file>`.
 */
export async function readPrDiffBrainNotes(
  repoRoot: string,
  baseBranch: string,
): Promise<StagedNote[]> {
  const raw = await runGit(repoRoot, ["diff", `${baseBranch}...HEAD`, "--name-only"]);
  return readHeadBlobs(repoRoot, parsePathList(raw));
}
