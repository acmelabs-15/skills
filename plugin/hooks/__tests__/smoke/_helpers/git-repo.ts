/**
 * Temporary-git-repo harness for the boundary/backstop/observer smoke tests
 * (Layers 3-7). Mirrors the pattern the existing `stop-backstop.test.ts`
 * integration suite uses: init a throwaway repo, seed a commit, then stage /
 * commit Brain-note fixtures so the handler's `git`-driven enumeration has real
 * working-tree state to read.
 */

import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/** Deterministic git identity so commits succeed without a global git config. */
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

/** Run a git subprocess in `cwd`; throw on non-zero exit. Returns stdout. */
export async function runGit(cwd: string, args: readonly string[]): Promise<string> {
  const proc = Bun.spawn(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe", env: GIT_ENV });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed (exit ${exitCode}): ${stderr.trim()}`);
  }
  return stdout;
}

/** Write a file (creating parent directories) inside the repo. */
export async function writeFixtureFile(
  repoRoot: string,
  relPath: string,
  content: string,
): Promise<void> {
  const abs = join(repoRoot, relPath);
  await mkdir(dirname(abs), { recursive: true });
  await Bun.write(abs, content);
}

/**
 * Initialise a throwaway git repo with one seed commit on `main`. GPG signing
 * is disabled so commits land without a signing key in CI.
 */
export async function initRepo(label: string): Promise<string> {
  const repoRoot = await mkdtemp(join(tmpdir(), `smoke-${label}-`));
  await runGit(repoRoot, ["init", "--initial-branch=main", "--quiet"]);
  await runGit(repoRoot, ["config", "commit.gpgsign", "false"]);
  await writeFixtureFile(repoRoot, "README.md", "# seed\n");
  await runGit(repoRoot, ["add", "README.md"]);
  await runGit(repoRoot, ["commit", "-m", "seed", "--quiet"]);
  return repoRoot;
}

/** Recursively remove a temporary repo. */
export async function removeRepo(repoRoot: string): Promise<void> {
  await rm(repoRoot, { recursive: true, force: true });
}

/**
 * Set up a second repo to act as the `origin` remote for push/PR diff tests,
 * wire it as `origin`, and push the seed `main` so a `<remote>/<branch>` ref
 * exists. Returns the bare remote path (caller cleans both up).
 */
export async function attachOriginRemote(repoRoot: string, label: string): Promise<string> {
  const remotePath = await mkdtemp(join(tmpdir(), `smoke-${label}-remote-`));
  await runGit(remotePath, ["init", "--bare", "--initial-branch=main", "--quiet"]);
  await runGit(repoRoot, ["remote", "add", "origin", remotePath]);
  await runGit(repoRoot, ["push", "--quiet", "origin", "main"]);
  return remotePath;
}
