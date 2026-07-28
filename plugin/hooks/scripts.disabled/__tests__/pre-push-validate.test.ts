import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { DispatchOutcome } from "../../lib/dispatch-validator.ts";
import type { StagedNote } from "../../lib/git-staged-files.ts";
import {
  PathContainmentError,
  decideForNotes,
  emitFailOpen,
  evaluatePush,
  parsePushCommand,
  readCommand,
} from "../pre-push-validate.ts";

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

async function initRepoWithOrigin(): Promise<{ baseDir: string; repoRoot: string }> {
  const baseDir = await mkdtemp(join(tmpdir(), "pre-push-test-"));
  const originPath = join(baseDir, "origin.git");
  const repoRoot = join(baseDir, "work");
  await mkdir(originPath, { recursive: true });
  await runGit(originPath, ["init", "--bare", "--initial-branch=main", "--quiet"]);
  await mkdir(repoRoot, { recursive: true });
  await runGit(repoRoot, ["init", "--initial-branch=main", "--quiet"]);
  await runGit(repoRoot, ["config", "commit.gpgsign", "false"]);
  await runGit(repoRoot, ["remote", "add", "origin", originPath]);
  await writeFixture(repoRoot, "README.md", "# seed\n");
  await runGit(repoRoot, ["add", "README.md"]);
  await runGit(repoRoot, ["commit", "-m", "seed", "--quiet"]);
  await runGit(repoRoot, ["push", "-u", "origin", "main", "--quiet"]);
  return { baseDir, repoRoot };
}

const FIXTURE_DIR = new URL("../../../../packages/fixtures/", import.meta.url);

async function taskSample(): Promise<string> {
  return Bun.file(new URL("task-note-sample.md", FIXTURE_DIR)).text();
}

function asDenying(content: string): string {
  return content.replace(/^status:.*$/m, "status: DONE");
}

/**
 * The canonical sample sits at the structural floor (3 observations, 2
 * relations), so its dispatch verdict is `allow-with-warning`, which a BOUNDARY
 * gate (Layer 4) denies. Lift BOTH counts above the floor (a 4th observation +
 * a 3rd relation) so a genuinely clean note verdicts `allow`.
 */
function asFullyClean(content: string): string {
  const withObs = content.replace(
    "## Relations",
    "- [outcome] Fourth observation lifts the count above the floor #clean\n\n## Relations",
  );
  return `${withObs.trimEnd()}\n- relates_to [[ANALYSIS-001: Sample]]\n`;
}

describe("parsePushCommand", () => {
  test("defaults to origin/HEAD with no positional args", () => {
    expect(parsePushCommand("git push")).toEqual({ remote: "origin", branch: "HEAD" });
  });

  test("parses `git push <remote>`", () => {
    expect(parsePushCommand("git push upstream")).toEqual({ remote: "upstream", branch: "HEAD" });
  });

  test("parses `git push <remote> <branch>`", () => {
    expect(parsePushCommand("git push origin feature/x")).toEqual({
      remote: "origin",
      branch: "feature/x",
    });
  });

  test("skips the -u / --set-upstream flag", () => {
    expect(parsePushCommand("git push -u origin main")).toEqual({
      remote: "origin",
      branch: "main",
    });
    expect(parsePushCommand("git push --set-upstream origin main")).toEqual({
      remote: "origin",
      branch: "main",
    });
  });

  test("skips no-value flags and `--opt=value` forms", () => {
    expect(parsePushCommand("git push --force --no-verify origin main")).toEqual({
      remote: "origin",
      branch: "main",
    });
    expect(parsePushCommand("git push --repo=x origin main")).toEqual({
      remote: "origin",
      branch: "main",
    });
  });

  test("rejects a remote ref carrying a traversal segment", () => {
    expect(() => parsePushCommand("git push ../evil main")).toThrow(PathContainmentError);
  });

  test("rejects a branch ref carrying a traversal segment", () => {
    expect(() => parsePushCommand("git push origin ../../etc")).toThrow(/traversal/);
  });
});

describe("readCommand", () => {
  test("returns the command string", () => {
    expect(readCommand({ command: "git push" })).toBe("git push");
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
      emitFailOpen("pre-push-validate", new PathContainmentError("boom"));
    } finally {
      process.stderr.write = orig;
    }
    expect(JSON.parse(captured[0] ?? "{}")).toMatchObject({
      handler: "pre-push-validate",
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

  test("denies and names every failing pushed note", () => {
    const notes: StagedNote[] = [
      { filePath: "docs/a.md", content: "x" },
      { filePath: "docs/b.md", content: "y" },
    ];
    const decision = decideForNotes(
      notes,
      stub({
        "docs/a.md": { verdict: "deny", reason: "DoD unchecked" },
        "docs/b.md": { verdict: "allow" },
      }),
    );
    expect(decision.verdict).toBe("deny");
    expect(decision.reason).toContain("Push blocked");
    expect(decision.reason).toContain("docs/a.md");
  });

  test("allows a clean pushed set", () => {
    expect(decideForNotes([], stub({})).verdict).toBe("allow");
  });
});

describe("evaluatePush (integration against a real repo)", () => {
  let baseDir: string;
  let repoRoot: string;

  beforeEach(async () => {
    ({ baseDir, repoRoot } = await initRepoWithOrigin());
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  test("allows when fully clean pushed Brain notes pass their claims", async () => {
    await writeFixture(
      repoRoot,
      "docs/specs/SPEC-001/tasks/TASK-001.md",
      asFullyClean(await taskSample()),
    );
    await runGit(repoRoot, ["add", "."]);
    await runGit(repoRoot, ["commit", "-m", "add task", "--quiet"]);
    expect((await evaluatePush(repoRoot, "git push origin main")).verdict).toBe("allow");
  });

  test("denies a pushed note with only a hygiene issue (floor warning)", async () => {
    await writeFixture(repoRoot, "docs/specs/SPEC-001/tasks/TASK-001.md", await taskSample());
    await runGit(repoRoot, ["add", "."]);
    await runGit(repoRoot, ["commit", "-m", "add task", "--quiet"]);
    const decision = await evaluatePush(repoRoot, "git push origin main");
    expect(decision.verdict).toBe("deny");
    expect(decision.reason).toContain("docs/specs/SPEC-001/tasks/TASK-001.md");
  });

  test("denies when a pushed Brain note fails its claim", async () => {
    await writeFixture(
      repoRoot,
      "docs/specs/SPEC-001/tasks/TASK-001.md",
      asDenying(await taskSample()),
    );
    await runGit(repoRoot, ["add", "."]);
    await runGit(repoRoot, ["commit", "-m", "add task", "--quiet"]);
    const decision = await evaluatePush(repoRoot, "git push -u origin main");
    expect(decision.verdict).toBe("deny");
    expect(decision.reason).toContain("docs/specs/SPEC-001/tasks/TASK-001.md");
  });

  test("allows (empty diff) when nothing is ahead of the remote", async () => {
    expect((await evaluatePush(repoRoot, "git push")).verdict).toBe("allow");
  });

  test("rejects a traversal-bearing repo root before invoking git", async () => {
    await expect(evaluatePush("/tmp/work/../etc", "git push")).rejects.toThrow(
      PathContainmentError,
    );
  });
});
