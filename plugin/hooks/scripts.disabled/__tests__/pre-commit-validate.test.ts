import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { DispatchOutcome } from "../../lib/dispatch-validator.ts";
import { UnparseableNoteError } from "../../lib/dispatch-validator.ts";
import type { StagedNote } from "../../lib/git-staged-files.ts";
import {
  PathContainmentError,
  assertSafeRepoRoot,
  decideForNotes,
  emitFailOpen,
  evaluateStagedCommit,
} from "../pre-commit-validate.ts";

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
  const repoRoot = await mkdtemp(join(tmpdir(), "pre-commit-test-"));
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
const FIXTURE_DIR = new URL("../../../../packages/fixtures/", import.meta.url);

async function taskSample(): Promise<string> {
  return Bun.file(new URL("task-note-sample.md", FIXTURE_DIR)).text();
}

/** Flip the canonical sample to DONE with an unsatisfied DoD — a lying claim. */
function asDenying(content: string): string {
  return content.replace(/^status:.*$/m, "status: DONE");
}

/**
 * The canonical sample sits at the structural floor (3 observations, 2
 * relations), so its dispatch verdict is `allow-with-warning`, which a BOUNDARY
 * gate denies. For the "fully clean note allows" cases, lift BOTH counts above
 * the floor (a 4th observation + a 3rd relation) so the floor warning does not
 * fire and the verdict is `allow`.
 */
function asFullyClean(content: string): string {
  const withObs = content.replace(
    "## Relations",
    "- [outcome] Fourth observation lifts the count above the floor #clean\n\n## Relations",
  );
  return `${withObs.trimEnd()}\n- relates_to [[ANALYSIS-001: Sample]]\n`;
}

describe("assertSafeRepoRoot", () => {
  test("returns the path for an absolute traversal-free root", () => {
    expect(assertSafeRepoRoot("/tmp/work")).toBe("/tmp/work");
  });

  test("rejects an empty root", () => {
    expect(() => assertSafeRepoRoot("   ")).toThrow(PathContainmentError);
  });

  test("rejects a relative root", () => {
    expect(() => assertSafeRepoRoot("work/repo")).toThrow(PathContainmentError);
  });

  test("rejects a root with a `..` traversal segment", () => {
    expect(() => assertSafeRepoRoot("/tmp/work/../etc")).toThrow(/traversal/);
  });
});

describe("emitFailOpen", () => {
  test("writes a single-line structured JSON error to stderr", () => {
    const captured: string[] = [];
    const orig = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: string | Uint8Array): boolean => {
      captured.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    try {
      emitFailOpen("pre-commit-validate", new PathContainmentError("boom"));
    } finally {
      process.stderr.write = orig;
    }
    expect(JSON.parse(captured[0] ?? "{}")).toMatchObject({
      handler: "pre-commit-validate",
      error: "PathContainmentError",
      message: "boom",
    });
  });
});

describe("decideForNotes", () => {
  const stub =
    (verdicts: Record<string, DispatchOutcome>) =>
    (_content: string, filePath: string): DispatchOutcome =>
      verdicts[filePath] ?? { verdict: "allow" };

  test("allows an empty staged set", () => {
    expect(decideForNotes([], stub({})).verdict).toBe("allow");
  });

  test("allows a clean set", () => {
    const notes: StagedNote[] = [{ filePath: "docs/a.md", content: "x" }];
    expect(decideForNotes(notes, stub({ "docs/a.md": { verdict: "allow" } })).verdict).toBe(
      "allow",
    );
  });

  test("denies and names every failing note", () => {
    const notes: StagedNote[] = [
      { filePath: "docs/a.md", content: "x" },
      { filePath: "docs/b.md", content: "y" },
      { filePath: "docs/c.md", content: "z" },
    ];
    const decision = decideForNotes(
      notes,
      stub({
        "docs/a.md": { verdict: "deny", reason: "AC unsatisfied" },
        "docs/b.md": { verdict: "allow" },
        "docs/c.md": { verdict: "deny", reason: "DoD unchecked" },
      }),
    );
    expect(decision.verdict).toBe("deny");
    expect(decision.reason).toContain("docs/a.md");
    expect(decision.reason).toContain("docs/c.md");
    expect(decision.reason).toContain("2 staged Brain note(s)");
    expect(decision.reason).not.toContain("docs/b.md");
  });

  test("BOUNDARY gate: allow-with-warning (hygiene) denies the commit", () => {
    // Layer 3 maps allow-with-warning → deny (full conformance required at the
    // commit boundary; nothing non-conformant enters history).
    const notes: StagedNote[] = [{ filePath: "docs/a.md", content: "x" }];
    const decision = decideForNotes(
      notes,
      stub({ "docs/a.md": { verdict: "allow-with-warning", warning: "floor" } }),
    );
    expect(decision.verdict).toBe("deny");
    expect(decision.reason).toContain("floor");
    expect(decision.reason).toContain("docs/a.md");
  });

  test("BOUNDARY gate: a deny and an allow-with-warning are both named", () => {
    const notes: StagedNote[] = [
      { filePath: "docs/a.md", content: "x" },
      { filePath: "docs/b.md", content: "y" },
    ];
    const decision = decideForNotes(
      notes,
      stub({
        "docs/a.md": { verdict: "deny", reason: "DoD unchecked" },
        "docs/b.md": { verdict: "allow-with-warning", warning: "bad category" },
      }),
    );
    expect(decision.verdict).toBe("deny");
    expect(decision.reason).toContain("DoD unchecked");
    expect(decision.reason).toContain("bad category");
    expect(decision.reason).toContain("2 staged Brain note(s)");
  });

  test("BOUNDARY fail-closed: an unparseable staged note denies the commit", () => {
    // A per-note UnparseableNoteError at the commit boundary fails CLOSED
    // (REQ-011 AC#9): it denies rather than slipping through fail-open.
    const notes: StagedNote[] = [{ filePath: "docs/a.md", content: "garbage" }];
    const decision = decideForNotes(notes, () => {
      throw new UnparseableNoteError("docs/a.md", [], "no frontmatter");
    });
    expect(decision.verdict).toBe("deny");
    expect(decision.reason).toContain("unparseable note");
    expect(decision.reason).toContain("docs/a.md");
  });

  test("a non-Unparseable dispatch throw propagates (infra fail-open at main level)", () => {
    const notes: StagedNote[] = [{ filePath: "docs/a.md", content: "x" }];
    expect(() =>
      decideForNotes(notes, () => {
        throw new Error("unexpected infra failure");
      }),
    ).toThrow("unexpected infra failure");
  });
});

describe("evaluateStagedCommit (integration against a real repo)", () => {
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await initRepo();
  });

  afterEach(async () => {
    await rm(repoRoot, { recursive: true, force: true });
  });

  test("allows when no Brain notes are staged", async () => {
    await writeFixture(repoRoot, "src/code.ts", "export const x = 1;\n");
    await runGit(repoRoot, ["add", "src/code.ts"]);
    expect((await evaluateStagedCommit(repoRoot)).verdict).toBe("allow");
  });

  test("allows when a fully clean staged Brain note passes its claim", async () => {
    await writeFixture(
      repoRoot,
      "docs/specs/SPEC-001/tasks/TASK-001.md",
      asFullyClean(await taskSample()),
    );
    await runGit(repoRoot, ["add", "."]);
    expect((await evaluateStagedCommit(repoRoot)).verdict).toBe("allow");
  });

  test("denies a staged note with only a hygiene issue (floor warning)", async () => {
    // The canonical sample at 3 observations trips the floor warning →
    // allow-with-warning → BOUNDARY deny at the commit gate.
    await writeFixture(repoRoot, "docs/specs/SPEC-001/tasks/TASK-001.md", await taskSample());
    await runGit(repoRoot, ["add", "."]);
    const decision = await evaluateStagedCommit(repoRoot);
    expect(decision.verdict).toBe("deny");
    expect(decision.reason).toContain("docs/specs/SPEC-001/tasks/TASK-001.md");
  });

  test("denies when a staged Brain note fails its claim", async () => {
    await writeFixture(
      repoRoot,
      "docs/specs/SPEC-001/tasks/TASK-001.md",
      asDenying(await taskSample()),
    );
    await runGit(repoRoot, ["add", "."]);
    const decision = await evaluateStagedCommit(repoRoot);
    expect(decision.verdict).toBe("deny");
    expect(decision.reason).toContain("docs/specs/SPEC-001/tasks/TASK-001.md");
    expect(decision.reason).toContain("TaskNoteSchema");
  });

  test("rejects a traversal-bearing repo root before invoking git", async () => {
    await expect(evaluateStagedCommit("/tmp/work/../etc")).rejects.toThrow(PathContainmentError);
  });
});
