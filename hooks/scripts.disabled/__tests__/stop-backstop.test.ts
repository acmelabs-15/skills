import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  type ModifiedNote,
  PathContainmentError,
  assertContainedAbsolutePath,
  buildResponse,
  decideForNotes,
  enumerateModifiedBrainNotes,
  evaluateTurnEnd,
  parsePorcelainPath,
  readModifiedNotes,
} from "../stop-backstop.ts";

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

async function runGit(cwd: string, args: readonly string[]): Promise<string> {
  const proc = Bun.spawn(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe", env: GIT_ENV });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`git ${args.join(" ")} failed: ${stderr}`);
  return stdout;
}

async function writeFixture(repoRoot: string, relPath: string, content: string): Promise<void> {
  const abs = join(repoRoot, relPath);
  await mkdir(abs.slice(0, abs.lastIndexOf("/")), { recursive: true });
  await Bun.write(abs, content);
}

async function initRepo(): Promise<string> {
  const repoRoot = await mkdtemp(join(tmpdir(), "stop-backstop-test-"));
  await runGit(repoRoot, ["init", "--initial-branch=main", "--quiet"]);
  await runGit(repoRoot, ["config", "commit.gpgsign", "false"]);
  await writeFixture(repoRoot, "README.md", "# seed\n");
  await runGit(repoRoot, ["add", "README.md"]);
  await runGit(repoRoot, ["commit", "-m", "seed", "--quiet"]);
  return repoRoot;
}

// The canonical composition-library TASK sample (status IN_PROGRESS — claim
// gate dormant, dispatch returns allow). Read at runtime so the fixture stays
// authoritative as the schema evolves.
const FIXTURE_DIR = new URL("../../../shared/composition/tests/fixtures/", import.meta.url);

async function taskSample(): Promise<string> {
  return Bun.file(new URL("task-note-sample.md", FIXTURE_DIR)).text();
}

/** Flip the canonical sample to DONE with an unsatisfied DoD — a lying claim. */
function asDenying(content: string): string {
  return content.replace(/^status:.*$/m, "status: DONE");
}

describe("parsePorcelainPath", () => {
  test("returns null for a blank line", () => {
    expect(parsePorcelainPath("")).toBeNull();
  });

  test("extracts the path from a modified (unstaged) entry", () => {
    expect(parsePorcelainPath(" M docs/specs/SPEC-001/tasks/TASK-001.md")).toBe(
      "docs/specs/SPEC-001/tasks/TASK-001.md",
    );
  });

  test("extracts the path from a staged-added entry", () => {
    expect(parsePorcelainPath("A  docs/analysis/ANALYSIS-001.md")).toBe(
      "docs/analysis/ANALYSIS-001.md",
    );
  });

  test("extracts the post-rename path from a rename entry", () => {
    expect(parsePorcelainPath("R  docs/old.md -> docs/new.md")).toBe("docs/new.md");
  });

  test("extracts the path from an untracked entry", () => {
    expect(parsePorcelainPath("?? docs/specs/SPEC-002/tasks/TASK-009.md")).toBe(
      "docs/specs/SPEC-002/tasks/TASK-009.md",
    );
  });
});

describe("assertContainedAbsolutePath", () => {
  test("returns the resolved absolute path for a contained relative path", () => {
    expect(assertContainedAbsolutePath("/tmp/work", "docs/a.md")).toBe("/tmp/work/docs/a.md");
  });

  test("rejects an absolute path that escapes the repo root", () => {
    expect(() => assertContainedAbsolutePath("/tmp/work", "/etc/passwd")).toThrow(
      PathContainmentError,
    );
  });

  test("rejects a `..` traversal path", () => {
    expect(() => assertContainedAbsolutePath("/tmp/work", "../../etc/passwd")).toThrow(/escapes/);
  });
});

describe("decideForNotes", () => {
  const stub =
    (verdicts: Record<string, { verdict: string; reason?: string }>) =>
    (_content: string, filePath: string): { verdict: string; reason?: string } =>
      verdicts[filePath] ?? { verdict: "allow" };

  test("allows an empty modified set (empty-modification turn)", () => {
    expect(decideForNotes([], stub({})).verdict).toBe("allow");
  });

  test("allows an all-passing turn", () => {
    const notes: ModifiedNote[] = [
      { filePath: "docs/a.md", content: "x" },
      { filePath: "docs/b.md", content: "y" },
    ];
    expect(decideForNotes(notes, stub({})).verdict).toBe("allow");
  });

  test("does not block on allow-with-warning (advisory only)", () => {
    const notes: ModifiedNote[] = [{ filePath: "docs/a.md", content: "x" }];
    const decision = decideForNotes(
      notes,
      stub({ "docs/a.md": { verdict: "allow-with-warning", reason: "floor" } }),
    );
    expect(decision.verdict).toBe("allow");
  });

  test("blocks a one-failing turn and lists the failing file", () => {
    const notes: ModifiedNote[] = [
      { filePath: "docs/a.md", content: "x" },
      { filePath: "docs/b.md", content: "y" },
    ];
    const decision = decideForNotes(
      notes,
      stub({ "docs/b.md": { verdict: "deny", reason: "DoD unchecked" } }),
    );
    expect(decision.verdict).toBe("block");
    expect(decision.reason).toContain("docs/b.md");
    expect(decision.reason).toContain("1 docs/** notes modified this turn fail validation");
    expect(decision.reason).not.toContain("docs/a.md");
  });

  test("blocks and names every failing note when multiple fail", () => {
    const notes: ModifiedNote[] = [
      { filePath: "docs/a.md", content: "x" },
      { filePath: "docs/b.md", content: "y" },
    ];
    const decision = decideForNotes(
      notes,
      stub({
        "docs/a.md": { verdict: "deny", reason: "AC unsatisfied" },
        "docs/b.md": { verdict: "deny", reason: "DoD unchecked" },
      }),
    );
    expect(decision.verdict).toBe("block");
    expect(decision.reason).toContain("docs/a.md");
    expect(decision.reason).toContain("docs/b.md");
    expect(decision.reason).toContain("2 docs/** notes");
  });
});

describe("enumerateModifiedBrainNotes (integration against a real repo)", () => {
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await initRepo();
  });

  afterEach(async () => {
    await rm(repoRoot, { recursive: true, force: true });
  });

  test("returns empty when no docs/** files were modified", async () => {
    await writeFixture(repoRoot, "src/code.ts", "export const x = 1;\n");
    expect(await enumerateModifiedBrainNotes(repoRoot)).toEqual([]);
  });

  test("captures an unstaged docs/** modification", async () => {
    await writeFixture(repoRoot, "docs/specs/SPEC-001/tasks/TASK-001.md", await taskSample());
    const paths = await enumerateModifiedBrainNotes(repoRoot);
    expect(paths).toContain("docs/specs/SPEC-001/tasks/TASK-001.md");
  });

  test("captures a staged docs/** modification (covers Edit/Write path)", async () => {
    await writeFixture(repoRoot, "docs/analysis/ANALYSIS-001.md", await taskSample());
    await runGit(repoRoot, ["add", "."]);
    const paths = await enumerateModifiedBrainNotes(repoRoot);
    expect(paths).toContain("docs/analysis/ANALYSIS-001.md");
  });

  test("ignores non-docs modifications", async () => {
    await writeFixture(repoRoot, "src/code.ts", "export const x = 1;\n");
    await writeFixture(repoRoot, "docs/a.md", "x\n");
    const paths = await enumerateModifiedBrainNotes(repoRoot);
    expect(paths).toEqual(["docs/a.md"]);
  });
});

describe("readModifiedNotes", () => {
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await initRepo();
  });

  afterEach(async () => {
    await rm(repoRoot, { recursive: true, force: true });
  });

  test("reads current on-disk content for existing notes", async () => {
    await writeFixture(repoRoot, "docs/a.md", "alpha\n");
    const notes = await readModifiedNotes(repoRoot, ["docs/a.md"]);
    expect(notes).toEqual([{ filePath: "docs/a.md", content: "alpha\n" }]);
  });

  test("skips a path with no on-disk content (deleted this turn)", async () => {
    const notes = await readModifiedNotes(repoRoot, ["docs/gone.md"]);
    expect(notes).toEqual([]);
  });

  test("throws PathContainmentError on a traversal path before reading", async () => {
    await expect(readModifiedNotes(repoRoot, ["../escape.md"])).rejects.toThrow(
      PathContainmentError,
    );
  });
});

describe("evaluateTurnEnd (integration against a real repo)", () => {
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await initRepo();
  });

  afterEach(async () => {
    await rm(repoRoot, { recursive: true, force: true });
  });

  test("allows an empty-modification turn (no docs/** changes)", async () => {
    expect((await evaluateTurnEnd(repoRoot)).verdict).toBe("allow");
  });

  test("allows an all-passing turn", async () => {
    await writeFixture(repoRoot, "docs/specs/SPEC-001/tasks/TASK-001.md", await taskSample());
    expect((await evaluateTurnEnd(repoRoot)).verdict).toBe("allow");
  });

  test("blocks a one-failing turn and lists the file", async () => {
    await writeFixture(
      repoRoot,
      "docs/specs/SPEC-001/tasks/TASK-001.md",
      asDenying(await taskSample()),
    );
    const decision = await evaluateTurnEnd(repoRoot);
    expect(decision.verdict).toBe("block");
    expect(decision.reason).toContain("docs/specs/SPEC-001/tasks/TASK-001.md");
  });
});

describe("buildResponse (fail-CLOSED on infrastructure error)", () => {
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await initRepo();
  });

  afterEach(async () => {
    await rm(repoRoot, { recursive: true, force: true });
  });

  test("returns null (no payload) for a clean turn", async () => {
    expect(await buildResponse(repoRoot)).toBeNull();
  });

  test("returns a block payload for a failing turn", async () => {
    await writeFixture(
      repoRoot,
      "docs/specs/SPEC-001/tasks/TASK-001.md",
      asDenying(await taskSample()),
    );
    const response = await buildResponse(repoRoot);
    expect(response).not.toBeNull();
    expect(response?.decision).toBe("block");
  });

  test("fails CLOSED: blocks when the repo root is not a git repository", async () => {
    const nonRepo = await mkdtemp(join(tmpdir(), "stop-backstop-nonrepo-"));
    try {
      const response = await buildResponse(nonRepo);
      expect(response).not.toBeNull();
      expect(response?.decision).toBe("block");
      expect(response?.reason).toContain("infrastructure error");
    } finally {
      await rm(nonRepo, { recursive: true, force: true });
    }
  });
});

describe("smoke: MCP edit_note bypassing Layer 2 is caught by Layer 6", () => {
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await initRepo();
  });

  afterEach(async () => {
    await rm(repoRoot, { recursive: true, force: true });
  });

  // Simulate an `mcp__plugin_brain_brain__edit_note` write that bypassed the
  // Layer 2 PreToolUse gate (matcher gap) by writing a lying-claim Brain note
  // directly to disk WITHOUT staging or going through any Edit/Write tool. The
  // `git status --porcelain` enumeration still sees the uncommitted on-disk
  // modification, so Layer 6 catches the unvalidated state change at turn end.
  test("a docs/** note modified on disk without a PreToolUse gate is caught via git status --porcelain", async () => {
    // No `git add`, no Edit/Write tool — a direct on-disk write, as an MCP
    // edit_note that slipped past Layer 2 would produce.
    await writeFixture(
      repoRoot,
      "docs/specs/SPEC-008/tasks/TASK-099-SPEC-008-fabricated.md",
      asDenying(await taskSample()),
    );

    const enumerated = await enumerateModifiedBrainNotes(repoRoot);
    expect(enumerated).toContain("docs/specs/SPEC-008/tasks/TASK-099-SPEC-008-fabricated.md");

    const decision = await evaluateTurnEnd(repoRoot);
    expect(decision.verdict).toBe("block");
    expect(decision.reason).toContain("docs/specs/SPEC-008/tasks/TASK-099-SPEC-008-fabricated.md");
  });
});
