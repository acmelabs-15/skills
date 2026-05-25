import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readPrDiffBrainNotes, readPushDiffBrainNotes } from "../git-diff-commits.ts";

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

async function runGit(cwd: string, args: readonly string[]): Promise<string> {
  const proc = Bun.spawn(["git", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: GIT_ENV,
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${stderr}`);
  }
  return stdout;
}

async function writeFixture(repoRoot: string, relPath: string, content: string): Promise<void> {
  const abs = join(repoRoot, relPath);
  const parent = abs.slice(0, abs.lastIndexOf("/"));
  await mkdir(parent, { recursive: true });
  await writeFile(abs, content);
}

/**
 * Build a fixture origin/local pair to simulate a push-diff scenario.
 *
 * - Initializes a bare `origin.git` repo.
 * - Clones it into a working repo.
 * - Pre-seeds the working repo with an initial commit on `main` and pushes to origin.
 * - Returns the working repo path.
 */
async function initRepoWithOrigin(): Promise<{ repoRoot: string; originPath: string }> {
  const baseDir = await mkdtemp(join(tmpdir(), "git-diff-test-"));
  const originPath = join(baseDir, "origin.git");
  const repoRoot = join(baseDir, "work");

  await mkdir(originPath, { recursive: true });
  await runGit(originPath, ["init", "--bare", "--initial-branch=main", "--quiet"]);

  await mkdir(repoRoot, { recursive: true });
  await runGit(repoRoot, ["init", "--initial-branch=main", "--quiet"]);
  await runGit(repoRoot, ["config", "commit.gpgsign", "false"]);
  await runGit(repoRoot, ["remote", "add", "origin", originPath]);

  // Seed initial commit and push.
  await writeFixture(repoRoot, "README.md", "# seed\n");
  await runGit(repoRoot, ["add", "README.md"]);
  await runGit(repoRoot, ["commit", "-m", "seed", "--quiet"]);
  await runGit(repoRoot, ["push", "-u", "origin", "main", "--quiet"]);

  return { repoRoot, originPath };
}

async function initRepoNoUpstream(): Promise<string> {
  const repoRoot = await mkdtemp(join(tmpdir(), "git-diff-noup-"));
  await runGit(repoRoot, ["init", "--initial-branch=main", "--quiet"]);
  await runGit(repoRoot, ["config", "commit.gpgsign", "false"]);
  await writeFixture(repoRoot, "README.md", "# seed\n");
  await runGit(repoRoot, ["add", "README.md"]);
  await runGit(repoRoot, ["commit", "-m", "seed", "--quiet"]);
  return repoRoot;
}

describe("readPushDiffBrainNotes", () => {
  let repoRoot: string;
  let originPath: string;

  beforeEach(async () => {
    ({ repoRoot, originPath } = await initRepoWithOrigin());
  });

  afterEach(async () => {
    // Both paths live under a common tmp parent — clean both.
    const parent = repoRoot.slice(0, repoRoot.lastIndexOf("/"));
    await rm(parent, { recursive: true, force: true });
    void originPath; // silence unused
  });

  test("returns Brain-note post-images for commits ahead of remote branch", async () => {
    // Add commits ahead of origin/main.
    await writeFixture(repoRoot, "docs/decisions/ADR-100.md", "# adr100\n");
    await writeFixture(repoRoot, "src/code.ts", "export const x = 1;\n");
    await runGit(repoRoot, ["add", "."]);
    await runGit(repoRoot, ["commit", "-m", "adr100 + src", "--quiet"]);

    await writeFixture(repoRoot, "docs/decisions/ADR-101.md", "# adr101\n");
    await runGit(repoRoot, ["add", "docs/decisions/ADR-101.md"]);
    await runGit(repoRoot, ["commit", "-m", "adr101", "--quiet"]);

    const notes = await readPushDiffBrainNotes(repoRoot, "origin", "main");
    const paths = notes.map((n) => n.filePath).sort();
    expect(paths).toEqual(["docs/decisions/ADR-100.md", "docs/decisions/ADR-101.md"]);
    const adr100 = notes.find((n) => n.filePath === "docs/decisions/ADR-100.md");
    expect(adr100?.content).toBe("# adr100\n");
  });

  test("filters non-docs paths from push diff", async () => {
    await writeFixture(repoRoot, "docs/decisions/ADR-200.md", "# adr200\n");
    await writeFixture(repoRoot, "src/lib.ts", "export {};\n");
    await writeFixture(repoRoot, "scripts/run.sh", "#!/bin/sh\n");
    await runGit(repoRoot, ["add", "."]);
    await runGit(repoRoot, ["commit", "-m", "mixed", "--quiet"]);

    const notes = await readPushDiffBrainNotes(repoRoot, "origin", "main");
    expect(notes.map((n) => n.filePath)).toEqual(["docs/decisions/ADR-200.md"]);
  });

  test("returns [] when nothing changed ahead of remote", async () => {
    const notes = await readPushDiffBrainNotes(repoRoot, "origin", "main");
    expect(notes).toEqual([]);
  });

  test("no-upstream fallback: returns [] with logged warning when remote ref and @{u} both unreachable", async () => {
    const noUpstreamRoot = await initRepoNoUpstream();
    try {
      const warnings: string[] = [];
      const origWarn = console.warn;
      console.warn = (...args: unknown[]) => {
        warnings.push(args.map((a) => String(a)).join(" "));
      };
      try {
        const notes = await readPushDiffBrainNotes(noUpstreamRoot, "origin", "main");
        expect(notes).toEqual([]);
        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings.join("\n")).toContain("no upstream resolvable");
      } finally {
        console.warn = origWarn;
      }
    } finally {
      await rm(noUpstreamRoot, { recursive: true, force: true });
    }
  });
});

describe("readPrDiffBrainNotes", () => {
  let repoRoot: string;
  let parentDir: string;

  beforeEach(async () => {
    const tmp = await mkdtemp(join(tmpdir(), "git-prdiff-"));
    parentDir = tmp;
    repoRoot = join(tmp, "work");
    await mkdir(repoRoot, { recursive: true });
    await runGit(repoRoot, ["init", "--initial-branch=main", "--quiet"]);
    await runGit(repoRoot, ["config", "commit.gpgsign", "false"]);
    await writeFixture(repoRoot, "README.md", "# seed\n");
    await runGit(repoRoot, ["add", "README.md"]);
    await runGit(repoRoot, ["commit", "-m", "seed", "--quiet"]);
    // Create a feature branch off of main.
    await runGit(repoRoot, ["checkout", "-b", "feature", "--quiet"]);
  });

  afterEach(async () => {
    await rm(parentDir, { recursive: true, force: true });
  });

  test("returns Brain-note post-images for commits ahead of base branch", async () => {
    await writeFixture(repoRoot, "docs/decisions/ADR-300.md", "# adr300\n");
    await runGit(repoRoot, ["add", "."]);
    await runGit(repoRoot, ["commit", "-m", "add adr300", "--quiet"]);

    await writeFixture(repoRoot, "docs/specs/SPEC-XX/REQ-001.md", "# req\n");
    await runGit(repoRoot, ["add", "."]);
    await runGit(repoRoot, ["commit", "-m", "add req", "--quiet"]);

    const notes = await readPrDiffBrainNotes(repoRoot, "main");
    const paths = notes.map((n) => n.filePath).sort();
    expect(paths).toEqual(["docs/decisions/ADR-300.md", "docs/specs/SPEC-XX/REQ-001.md"]);
  });

  test("filters non-docs paths from PR diff", async () => {
    await writeFixture(repoRoot, "docs/decisions/ADR-400.md", "# adr400\n");
    await writeFixture(repoRoot, "src/feature.ts", "export {};\n");
    await runGit(repoRoot, ["add", "."]);
    await runGit(repoRoot, ["commit", "-m", "mixed", "--quiet"]);

    const notes = await readPrDiffBrainNotes(repoRoot, "main");
    expect(notes.map((n) => n.filePath)).toEqual(["docs/decisions/ADR-400.md"]);
  });

  test("returns [] when no commits ahead of base", async () => {
    const notes = await readPrDiffBrainNotes(repoRoot, "main");
    expect(notes).toEqual([]);
  });
});
