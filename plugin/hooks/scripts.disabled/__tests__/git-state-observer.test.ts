import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { HookInputError, parseFileChangedHookInput } from "../../lib/parse-tool-input.ts";
import {
  type ValidationSummary,
  buildAdditionalContext,
  buildResponse,
  containedAbsolutePath,
  observePostCommitState,
  readHeadSha,
  renderSummary,
  resolveRepoRoot,
  summarize,
  touchedBrainNotePaths,
} from "../git-state-observer.ts";

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
  await Bun.write(abs, content);
}

/**
 * A TASK note that PASSES its claim validator: status TODO, all DoD unchecked
 * (no terminal-status claim, so dispatchValidator returns allow / allow-with-warning).
 */
function passingTaskNote(id: string): string {
  return `---
title: 'TASK-${id}-SPEC-999: Sample Task'
type: task
permalink: specs/spec-999-sample/tasks/task-${id}-spec-999-sample
status: TODO
tags:
  - task
  - sample
---

# TASK-${id}-SPEC-999: Sample Task

## Objective

A sample task fixture.

## Definition of Done

- [ ] Do the first thing
- [ ] Do the second thing

## ADR Compliance

- [ ] Honors [[ADR-001: Sample]] decision

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| src/x.ts | NEW | sample |

## Observations

- [fact] First observation #sample
- [decision] Second observation #sample
- [insight] Third observation #sample

## Relations

- part_of [[SPEC-999: Sample Spec]]
- implements [[REQ-001-SPEC-999: Sample Requirement]]
`;
}

/**
 * A TASK note that FAILS its claim validator: status DONE while a DoD item is
 * still unchecked — the lying-claim transition the schema rejects.
 */
function failingTaskNote(id: string): string {
  return `---
title: 'TASK-${id}-SPEC-999: Lying Task'
type: task
permalink: specs/spec-999-sample/tasks/task-${id}-spec-999-sample
status: DONE
tags:
  - task
  - sample
---

# TASK-${id}-SPEC-999: Lying Task

## Objective

A task claiming DONE with unsatisfied DoD.

## Definition of Done

- [x] First thing done
- [ ] Second thing NOT done

## ADR Compliance

- [x] Honors [[ADR-001: Sample]] decision

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| src/x.ts | NEW | sample |

## Observations

- [fact] First observation #sample
- [decision] Second observation #sample
- [insight] Third observation #sample

## Relations

- part_of [[SPEC-999: Sample Spec]]
- implements [[REQ-001-SPEC-999: Sample Requirement]]
`;
}

async function initRepo(): Promise<{ repoRoot: string; parentDir: string }> {
  const parentDir = await mkdtemp(join(tmpdir(), "git-state-obs-"));
  const repoRoot = join(parentDir, "work");
  await mkdir(repoRoot, { recursive: true });
  await runGit(repoRoot, ["init", "--initial-branch=main", "--quiet"]);
  await runGit(repoRoot, ["config", "commit.gpgsign", "false"]);
  await writeFixture(repoRoot, "README.md", "# seed\n");
  await runGit(repoRoot, ["add", "README.md"]);
  await runGit(repoRoot, ["commit", "-m", "seed", "--quiet"]);
  return { repoRoot, parentDir };
}

// REGRESSION (FU-6b): the Layer-7 FileChanged observer previously validated its
// hook input against the PreToolUse schema (requiring `tool_name` +
// `tool_input`). A real `FileChanged` event carries NEITHER — only session
// metadata, `cwd`, and the changed-file descriptor. That made `readHookInput()`
// throw, which the handler converted into the INFRA_ERROR_CONTEXT fail-open
// degrade on EVERY real event — so the observer never actually validated
// anything (a SILENT failure, masked by the smoke test feeding a fake
// tool-shaped payload). The fix routes the handler through the per-event
// `parseFileChangedHookInput`, which validates the actual FileChanged shape.
describe("parseFileChangedHookInput — real FileChanged input shape (FU-6b regression)", () => {
  test("accepts the full real FileChanged event (no tool_name/tool_input)", () => {
    const raw = JSON.stringify({
      session_id: "abc123",
      transcript_path: "/Users/me/.../transcript.jsonl",
      cwd: "/Users/my-project",
      hook_event_name: "FileChanged",
      file_path: "/Users/my-project/.envrc",
      event: "change",
    });
    const input = parseFileChangedHookInput(raw);
    expect(input.cwd).toBe("/Users/my-project");
    expect(input.hook_event_name).toBe("FileChanged");
    expect(input.session_id).toBe("abc123");
    expect(input.transcript_path).toBe("/Users/me/.../transcript.jsonl");
    expect(input.file_path).toBe("/Users/my-project/.envrc");
    expect(input.event).toBe("change");
  });

  test("accepts a minimal FileChanged event (cwd + hook_event_name only)", () => {
    const input = parseFileChangedHookInput(
      JSON.stringify({ cwd: "/repo", hook_event_name: "FileChanged" }),
    );
    expect(input.cwd).toBe("/repo");
    expect(input.session_id).toBeUndefined();
    expect(input.transcript_path).toBeUndefined();
    expect(input.file_path).toBeUndefined();
    expect(input.event).toBeUndefined();
  });

  test("does NOT require tool_name/tool_input (the old PreToolUse-shape bug)", () => {
    // A FileChanged event with no tool fields must NOT be rejected as a shape error.
    expect(() =>
      parseFileChangedHookInput(JSON.stringify({ cwd: "/repo", hook_event_name: "FileChanged" })),
    ).not.toThrow();
  });

  test("throws HookInputError on a PreToolUse-shaped payload missing cwd", () => {
    // The old fake payload shape (tool fields, no cwd) is a genuine infra error —
    // `cwd` is the repo-root seed Layer 7 functionally needs.
    expect(() =>
      parseFileChangedHookInput(
        JSON.stringify({ tool_name: "FileChanged", tool_input: { file_path: ".git/HEAD" } }),
      ),
    ).toThrow(HookInputError);
  });

  test("throws HookInputError on empty input", () => {
    expect(() => parseFileChangedHookInput("")).toThrow(HookInputError);
    expect(() => parseFileChangedHookInput("   \n")).toThrow(HookInputError);
  });

  test("throws HookInputError on malformed JSON", () => {
    expect(() => parseFileChangedHookInput("{ not json")).toThrow(HookInputError);
    expect(() => parseFileChangedHookInput("{ not json")).toThrow(/not valid JSON/);
  });
});

describe("containedAbsolutePath", () => {
  const root = "/repo";

  test("returns absolute path for a contained relative path", () => {
    expect(containedAbsolutePath(root, "docs/decisions/ADR-001.md")).toBe(
      "/repo/docs/decisions/ADR-001.md",
    );
  });

  test("rejects parent-traversal escapes", () => {
    expect(containedAbsolutePath(root, "../outside.md")).toBeNull();
    expect(containedAbsolutePath(root, "docs/../../outside.md")).toBeNull();
  });

  test("rejects absolute input paths", () => {
    expect(containedAbsolutePath(root, "/etc/passwd")).toBeNull();
  });

  test("rejects the repo root itself (empty relative)", () => {
    expect(containedAbsolutePath(root, ".")).toBeNull();
  });
});

describe("renderSummary", () => {
  test("reports no notes when total is zero", () => {
    const summary: ValidationSummary = { total: 0, passed: 0, failed: 0, failingFiles: [] };
    expect(renderSummary(summary)).toBe("no docs/** notes touched");
  });

  test("renders an all-passing summary", () => {
    const summary: ValidationSummary = { total: 3, passed: 3, failed: 0, failingFiles: [] };
    expect(renderSummary(summary)).toBe("3/3 PASS (all passing)");
  });

  test("renders a mixed pass/fail summary with failing-file list", () => {
    const summary: ValidationSummary = {
      total: 3,
      passed: 1,
      failed: 2,
      failingFiles: ["docs/a.md", "docs/b.md"],
    };
    expect(renderSummary(summary)).toBe("1/3 PASS, 2 FAIL: docs/a.md, docs/b.md");
  });
});

describe("buildAdditionalContext", () => {
  test("embeds the SHA and the rendered summary", () => {
    const summary: ValidationSummary = { total: 1, passed: 1, failed: 0, failingFiles: [] };
    expect(buildAdditionalContext("abc1234", summary)).toBe(
      "Post-commit state: commit abc1234 landed; full graph validation: 1/1 PASS (all passing)",
    );
  });
});

describe("summarize", () => {
  test("tallies passing and failing notes", () => {
    const summary = summarize([
      { filePath: "docs/specs/SPEC-999/tasks/TASK-001.md", content: passingTaskNote("001") },
      { filePath: "docs/specs/SPEC-999/tasks/TASK-002.md", content: failingTaskNote("002") },
    ]);
    expect(summary.total).toBe(2);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.failingFiles).toEqual(["docs/specs/SPEC-999/tasks/TASK-002.md"]);
  });

  test("counts an unparseable note as a FAIL for the tally", () => {
    const summary = summarize([{ filePath: "docs/broken.md", content: "no frontmatter here" }]);
    expect(summary.total).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.failingFiles).toEqual(["docs/broken.md"]);
  });

  test("treats an unknown-type note as PASS (no claim contract)", () => {
    const note = `---
title: 'CRIT-001-ADR-001: Sample'
type: critique
status: DRAFT
tags:
  - critique
---

# CRIT-001-ADR-001: Sample

## Observations

- [insight] one #x

## Relations

- relates_to [[ADR-001: Sample]]
`;
    const summary = summarize([{ filePath: "docs/critique/CRIT-001.md", content: note }]);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(0);
  });
});

describe("observePostCommitState (real-git integration)", () => {
  let repoRoot: string;
  let parentDir: string;

  beforeEach(async () => {
    ({ repoRoot, parentDir } = await initRepo());
  });

  afterEach(async () => {
    await rm(parentDir, { recursive: true, force: true });
  });

  test("resolves repo root from a seed cwd", async () => {
    const resolved = await resolveRepoRoot(repoRoot);
    // macOS tmp dirs are symlinked via /private; compare the trailing segment.
    expect(resolved.endsWith("/work")).toBe(true);
  });

  test("reads the HEAD SHA", async () => {
    const sha = await readHeadSha(repoRoot);
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
  });

  test("happy path: enumerates docs/** notes touched by the landed commit", async () => {
    await writeFixture(repoRoot, "docs/specs/SPEC-999/tasks/TASK-001.md", passingTaskNote("001"));
    await writeFixture(repoRoot, "src/code.ts", "export const x = 1;\n");
    await runGit(repoRoot, ["add", "."]);
    await runGit(repoRoot, ["commit", "-m", "add task + code", "--quiet"]);

    const sha = await readHeadSha(repoRoot);
    const paths = await touchedBrainNotePaths(repoRoot, sha);
    expect(paths).toEqual(["docs/specs/SPEC-999/tasks/TASK-001.md"]);
  });

  test("all-passing summary: emits N/N PASS additionalContext", async () => {
    await writeFixture(repoRoot, "docs/specs/SPEC-999/tasks/TASK-001.md", passingTaskNote("001"));
    await writeFixture(repoRoot, "docs/specs/SPEC-999/tasks/TASK-002.md", passingTaskNote("002"));
    await runGit(repoRoot, ["add", "."]);
    await runGit(repoRoot, ["commit", "-m", "two passing tasks", "--quiet"]);

    const context = await observePostCommitState(repoRoot);
    const sha = await readHeadSha(repoRoot);
    expect(context).toBe(
      `Post-commit state: commit ${sha} landed; full graph validation: 2/2 PASS (all passing)`,
    );
  });

  test("mixed pass/fail summary: lists failing files", async () => {
    await writeFixture(repoRoot, "docs/specs/SPEC-999/tasks/TASK-001.md", passingTaskNote("001"));
    await writeFixture(repoRoot, "docs/specs/SPEC-999/tasks/TASK-002.md", failingTaskNote("002"));
    await runGit(repoRoot, ["add", "."]);
    await runGit(repoRoot, ["commit", "-m", "one passing one lying", "--quiet"]);

    const context = await observePostCommitState(repoRoot);
    expect(context).toContain("1/2 PASS, 1 FAIL:");
    expect(context).toContain("docs/specs/SPEC-999/tasks/TASK-002.md");
    expect(context).not.toContain("docs/specs/SPEC-999/tasks/TASK-001.md");
  });

  test("no docs/** notes touched: emits the empty-set summary", async () => {
    await writeFixture(repoRoot, "src/only-code.ts", "export {};\n");
    await runGit(repoRoot, ["add", "."]);
    await runGit(repoRoot, ["commit", "-m", "code only", "--quiet"]);

    const context = await observePostCommitState(repoRoot);
    expect(context).toContain("no docs/** notes touched");
  });

  test("external editor scope: an uncommitted on-disk docs edit is NOT in the touched set", async () => {
    // Simulate vim outside Claude editing a docs note WITHOUT committing.
    // The handler keys off the landed commit's diff-tree, so the uncommitted
    // edit never appears — confirming external-editor edits are out of scope.
    await writeFixture(repoRoot, "src/code.ts", "export const y = 2;\n");
    await runGit(repoRoot, ["add", "src/code.ts"]);
    await runGit(repoRoot, ["commit", "-m", "code commit", "--quiet"]);
    const sha = await readHeadSha(repoRoot);

    // Now an external editor writes a docs note on disk but does not commit it.
    await writeFixture(repoRoot, "docs/decisions/ADR-999.md", failingTaskNote("999"));

    const paths = await touchedBrainNotePaths(repoRoot, sha);
    expect(paths).toEqual([]);
  });

  test("skips a docs note deleted in the commit (no post-commit content)", async () => {
    await writeFixture(repoRoot, "docs/decisions/ADR-500.md", passingTaskNote("500"));
    await runGit(repoRoot, ["add", "."]);
    await runGit(repoRoot, ["commit", "-m", "add adr500", "--quiet"]);
    await runGit(repoRoot, ["rm", "docs/decisions/ADR-500.md", "--quiet"]);
    await runGit(repoRoot, ["commit", "-m", "delete adr500", "--quiet"]);

    // diff-tree reports the deletion, but readTouchedNotes skips the absent file.
    const context = await observePostCommitState(repoRoot);
    expect(context).toContain("no docs/** notes touched");
  });
});

describe("buildResponse", () => {
  let repoRoot: string;
  let parentDir: string;

  beforeEach(async () => {
    ({ repoRoot, parentDir } = await initRepo());
  });

  afterEach(async () => {
    await rm(parentDir, { recursive: true, force: true });
  });

  test("emits a FileChanged response with additionalContext and no decision field", async () => {
    await writeFixture(repoRoot, "docs/specs/SPEC-999/tasks/TASK-001.md", passingTaskNote("001"));
    await runGit(repoRoot, ["add", "."]);
    await runGit(repoRoot, ["commit", "-m", "task", "--quiet"]);

    const response = await buildResponse({
      cwd: repoRoot,
      hook_event_name: "FileChanged",
    });
    expect(response.hookSpecificOutput.hookEventName).toBe("FileChanged");
    expect(response.hookSpecificOutput.additionalContext).toContain("Post-commit state:");
    // Observe-only: no permissionDecision, no decision.
    expect(Object.keys(response)).toEqual(["hookSpecificOutput"]);
    expect(Object.keys(response.hookSpecificOutput)).toEqual([
      "hookEventName",
      "additionalContext",
    ]);
  });

  test("infrastructure error: degrades to manual-inspection context (fail-open)", async () => {
    // A cwd that is not inside any git repo makes `git rev-parse` fail.
    const nonRepo = await mkdtemp(join(tmpdir(), "git-state-obs-norepo-"));
    try {
      const response = await buildResponse({
        cwd: nonRepo,
        hook_event_name: "FileChanged",
      });
      expect(response.hookSpecificOutput.additionalContext).toBe(
        "Post-commit state: validation infrastructure error; manual inspection required",
      );
    } finally {
      await rm(nonRepo, { recursive: true, force: true });
    }
  });
});
