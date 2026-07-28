import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readStagedBrainNotes } from "../git-staged-files.ts";

async function runGit(cwd: string, args: readonly string[]): Promise<void> {
  const proc = Bun.spawn(["git", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@example.com",
    },
  });
  await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${stderr}`);
  }
}

async function initRepo(): Promise<string> {
  const repoRoot = await mkdtemp(join(tmpdir(), "git-staged-test-"));
  await runGit(repoRoot, ["init", "--initial-branch=main", "--quiet"]);
  await runGit(repoRoot, ["config", "commit.gpgsign", "false"]);
  await runGit(repoRoot, ["config", "tag.gpgsign", "false"]);
  // Seed an initial commit so HEAD exists.
  await writeFile(join(repoRoot, "README.md"), "# seed\n");
  await runGit(repoRoot, ["add", "README.md"]);
  await runGit(repoRoot, ["commit", "-m", "seed", "--quiet"]);
  return repoRoot;
}

async function writeFixture(repoRoot: string, relPath: string, content: string): Promise<void> {
  const abs = join(repoRoot, relPath);
  const parent = abs.slice(0, abs.lastIndexOf("/"));
  await mkdir(parent, { recursive: true });
  await writeFile(abs, content);
}

describe("readStagedBrainNotes", () => {
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await initRepo();
  });

  afterEach(async () => {
    await rm(repoRoot, { recursive: true, force: true });
  });

  test("returns [] when nothing is staged", async () => {
    const notes = await readStagedBrainNotes(repoRoot);
    expect(notes).toEqual([]);
  });

  test("returns staged Brain notes with their post-image content", async () => {
    await writeFixture(
      repoRoot,
      "docs/decisions/ADR-001-test.md",
      "---\ntitle: 'ADR-001: Test'\n---\n",
    );
    await writeFixture(repoRoot, "docs/specs/SPEC-001-test/REQ-001.md", "# REQ-001\n");
    await runGit(repoRoot, ["add", "docs/decisions/ADR-001-test.md"]);
    await runGit(repoRoot, ["add", "docs/specs/SPEC-001-test/REQ-001.md"]);

    const notes = await readStagedBrainNotes(repoRoot);
    expect(notes).toHaveLength(2);
    const byPath = new Map(notes.map((n) => [n.filePath, n.content]));
    expect(byPath.get("docs/decisions/ADR-001-test.md")).toBe("---\ntitle: 'ADR-001: Test'\n---\n");
    expect(byPath.get("docs/specs/SPEC-001-test/REQ-001.md")).toBe("# REQ-001\n");
  });

  test("filters out non-docs paths from staged set", async () => {
    await writeFixture(repoRoot, "docs/decisions/ADR-002.md", "# adr\n");
    await writeFixture(repoRoot, "src/index.ts", "export const x = 1;\n");
    await writeFixture(repoRoot, "README.notes.md", "# notes\n");
    await runGit(repoRoot, ["add", "."]);

    const notes = await readStagedBrainNotes(repoRoot);
    expect(notes.map((n) => n.filePath)).toEqual(["docs/decisions/ADR-002.md"]);
  });

  test("filters out non-.md paths under docs/", async () => {
    await writeFixture(repoRoot, "docs/decisions/ADR-003.md", "# adr3\n");
    await writeFixture(repoRoot, "docs/assets/diagram.svg", "<svg />");
    await runGit(repoRoot, ["add", "."]);

    const notes = await readStagedBrainNotes(repoRoot);
    expect(notes.map((n) => n.filePath)).toEqual(["docs/decisions/ADR-003.md"]);
  });

  test("returns the staged post-image, not the working-tree content", async () => {
    await writeFixture(repoRoot, "docs/decisions/ADR-004.md", "staged content\n");
    await runGit(repoRoot, ["add", "docs/decisions/ADR-004.md"]);
    // Modify working tree AFTER staging.
    await writeFixture(repoRoot, "docs/decisions/ADR-004.md", "working tree drift\n");

    const notes = await readStagedBrainNotes(repoRoot);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.content).toBe("staged content\n");
  });

  test("ignores Deleted files (--diff-filter=ACM excludes D)", async () => {
    // First, commit a doc so it can be deleted in the next commit.
    await writeFixture(repoRoot, "docs/decisions/ADR-005.md", "# adr5\n");
    await runGit(repoRoot, ["add", "docs/decisions/ADR-005.md"]);
    await runGit(repoRoot, ["commit", "-m", "add adr5", "--quiet"]);
    // Stage a deletion.
    await runGit(repoRoot, ["rm", "docs/decisions/ADR-005.md", "--quiet"]);
    // Also stage a new add.
    await writeFixture(repoRoot, "docs/decisions/ADR-006.md", "# adr6\n");
    await runGit(repoRoot, ["add", "docs/decisions/ADR-006.md"]);

    const notes = await readStagedBrainNotes(repoRoot);
    expect(notes.map((n) => n.filePath)).toEqual(["docs/decisions/ADR-006.md"]);
  });
});
