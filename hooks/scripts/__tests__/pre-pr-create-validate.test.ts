import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { DispatchOutcome } from "../../lib/dispatch-validator.ts";
import type { StagedNote } from "../../lib/git-staged-files.ts";
import {
  DEFAULT_BASE_REF,
  PathContainmentError,
  decideForNotes,
  emitFailOpen,
  evaluatePrCreate,
  parsePrCreateBase,
  readCommand,
} from "../pre-pr-create-validate.ts";

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

async function initRepoOnFeatureBranch(): Promise<{ parentDir: string; repoRoot: string }> {
  const parentDir = await mkdtemp(join(tmpdir(), "pre-pr-test-"));
  const repoRoot = join(parentDir, "work");
  await mkdir(repoRoot, { recursive: true });
  await runGit(repoRoot, ["init", "--initial-branch=main", "--quiet"]);
  await runGit(repoRoot, ["config", "commit.gpgsign", "false"]);
  await writeFixture(repoRoot, "README.md", "# seed\n");
  await runGit(repoRoot, ["add", "README.md"]);
  await runGit(repoRoot, ["commit", "-m", "seed", "--quiet"]);
  await runGit(repoRoot, ["checkout", "-b", "feature", "--quiet"]);
  return { parentDir, repoRoot };
}

const FIXTURE_DIR = new URL("../../../shared/composition/tests/fixtures/", import.meta.url);

async function taskSample(): Promise<string> {
  return Bun.file(new URL("task-note-sample.md", FIXTURE_DIR)).text();
}

function asDenying(content: string): string {
  return content.replace(/^status:.*$/m, "status: DONE");
}

describe("parsePrCreateBase", () => {
  test("defaults to origin/HEAD when no --base is present", () => {
    expect(parsePrCreateBase("gh pr create --fill")).toBe(DEFAULT_BASE_REF);
  });

  test("parses `--base <branch>`", () => {
    expect(parsePrCreateBase("gh pr create --base develop --fill")).toBe("develop");
  });

  test("parses `--base=<branch>`", () => {
    expect(parsePrCreateBase("gh pr create --base=develop")).toBe("develop");
  });

  test("parses the `-B <branch>` short form", () => {
    expect(parsePrCreateBase("gh pr create -B release/2.0")).toBe("release/2.0");
  });

  test("parses the `-B=<branch>` short form", () => {
    expect(parsePrCreateBase("gh pr create -B=release/3.0")).toBe("release/3.0");
  });

  test("rejects a `-B=` form with a traversal segment", () => {
    expect(() => parsePrCreateBase("gh pr create -B=../evil")).toThrow(/traversal/);
  });

  test("throws when --base is followed by another flag", () => {
    expect(() => parsePrCreateBase("gh pr create --base --draft")).toThrow(
      /without a branch value/,
    );
  });

  test("throws when --base is present without a value", () => {
    expect(() => parsePrCreateBase("gh pr create --base --fill")).toThrow(/without a branch value/);
  });

  test("rejects a base ref carrying a traversal segment", () => {
    expect(() => parsePrCreateBase("gh pr create --base ../evil")).toThrow(PathContainmentError);
  });

  test("rejects a `--base=` form with a traversal segment", () => {
    expect(() => parsePrCreateBase("gh pr create --base=../../etc")).toThrow(/traversal/);
  });
});

describe("readCommand", () => {
  test("returns the command string", () => {
    expect(readCommand({ command: "gh pr create" })).toBe("gh pr create");
  });

  test("throws when command is missing", () => {
    expect(() => readCommand({})).toThrow();
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
      emitFailOpen("pre-pr-create-validate", new PathContainmentError("boom"));
      emitFailOpen("pre-pr-create-validate", "raw string error");
    } finally {
      process.stderr.write = orig;
    }
    const first = JSON.parse(captured[0] ?? "{}");
    expect(first).toMatchObject({
      handler: "pre-pr-create-validate",
      error: "PathContainmentError",
      message: "boom",
    });
    const second = JSON.parse(captured[1] ?? "{}");
    expect(second).toMatchObject({ error: "Error", message: "raw string error" });
  });
});

describe("decideForNotes", () => {
  const stub =
    (verdicts: Record<string, DispatchOutcome>) =>
    (_content: string, filePath: string): DispatchOutcome =>
      verdicts[filePath] ?? { verdict: "allow" };

  test("denies and names every failing PR-diff note", () => {
    const notes: StagedNote[] = [{ filePath: "docs/a.md", content: "x" }];
    const decision = decideForNotes(
      notes,
      stub({ "docs/a.md": { verdict: "deny", reason: "AC unsatisfied" } }),
    );
    expect(decision.verdict).toBe("deny");
    expect(decision.reason).toContain("PR open blocked");
    expect(decision.reason).toContain("docs/a.md");
  });

  test("allows a clean PR-diff set", () => {
    expect(decideForNotes([], stub({})).verdict).toBe("allow");
  });
});

describe("evaluatePrCreate (integration against a real repo)", () => {
  let parentDir: string;
  let repoRoot: string;

  beforeEach(async () => {
    ({ parentDir, repoRoot } = await initRepoOnFeatureBranch());
  });

  afterEach(async () => {
    await rm(parentDir, { recursive: true, force: true });
  });

  test("allows when PR-diff Brain notes pass their claims", async () => {
    await writeFixture(repoRoot, "docs/specs/SPEC-001/tasks/TASK-001.md", await taskSample());
    await runGit(repoRoot, ["add", "."]);
    await runGit(repoRoot, ["commit", "-m", "add task", "--quiet"]);
    expect((await evaluatePrCreate(repoRoot, "gh pr create --base main")).verdict).toBe("allow");
  });

  test("denies when a PR-diff Brain note fails its claim", async () => {
    await writeFixture(
      repoRoot,
      "docs/specs/SPEC-001/tasks/TASK-001.md",
      asDenying(await taskSample()),
    );
    await runGit(repoRoot, ["add", "."]);
    await runGit(repoRoot, ["commit", "-m", "add task", "--quiet"]);
    const decision = await evaluatePrCreate(repoRoot, "gh pr create --base main");
    expect(decision.verdict).toBe("deny");
    expect(decision.reason).toContain("docs/specs/SPEC-001/tasks/TASK-001.md");
  });

  test("allows (empty diff) when no commits are ahead of base", async () => {
    expect((await evaluatePrCreate(repoRoot, "gh pr create --base main")).verdict).toBe("allow");
  });

  test("rejects a traversal-bearing repo root before invoking git", async () => {
    await expect(evaluatePrCreate("/tmp/work/../etc", "gh pr create --base main")).rejects.toThrow(
      PathContainmentError,
    );
  });
});
