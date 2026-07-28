/**
 * Layer 3 (`Bash` + `git commit`) end-to-end smoke test.
 *
 * Covers TASK-046 DoD smoke test 4 (Layer-3 boundary deny against a lying-claim
 * fixture) plus the AC10 Layer-3 commit-handler latency measurement over a
 * 5-10 file staged set.
 *
 * Drives the ACTUAL handler script (`pre-commit-validate.ts`) via `bun run` in a
 * throwaway repo: stage Brain notes, then invoke the handler with a `git commit`
 * tool_input. The handler reads the staged post-images via `git show :<file>`
 * and applies BOUNDARY-gate semantics (any non-conformance denies the commit).
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { asFullyClean, lyingClaim, taskSample } from "./_helpers/fixtures.ts";
import { initRepo, removeRepo, runGit, writeFixtureFile } from "./_helpers/git-repo.ts";
import { type PreToolUseResponse, parseResponse, runHandler } from "./_helpers/run-handler.ts";

const HANDLER = "pre-commit-validate";

/** A `Bash(git commit ...)` HookInput payload. */
function commitPayload(cwd: string) {
  return {
    tool_name: "Bash",
    tool_input: { command: 'git commit -m "batch close"' },
    cwd,
  };
}

describe("Layer 3 smoke — pre-commit boundary gate", () => {
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await initRepo("layer-3");
  });

  afterEach(async () => {
    await removeRepo(repoRoot);
  });

  // Smoke 4 (Layer 3 deny): a staged Brain note carrying a lying REQ-ACCEPTED
  // claim denies the whole commit, naming the failing note.
  test("denies a commit whose staged Brain note is a lying REQ-ACCEPTED claim", async () => {
    const relPath = "docs/specs/SPEC-008/requirements/REQ-099-SPEC-008-lying.md";
    const lying = await lyingClaim(
      "requirement/drift-01-ac-flip-without-evidence.md",
      "requirement",
    );
    await writeFixtureFile(repoRoot, relPath, lying);
    await runGit(repoRoot, ["add", relPath]);

    const run = await runHandler(HANDLER, commitPayload(repoRoot), repoRoot);
    expect(run.exitCode).toBe(0);

    const res = parseResponse<PreToolUseResponse>(run);
    expect(res.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(res.hookSpecificOutput.permissionDecisionReason).toContain(relPath);
    expect(res.hookSpecificOutput.permissionDecisionReason).toContain("Evidence");
  });

  // AC10 latency (REQ-011, folded here per Event 122): a Layer-3 commit-handler
  // invocation over a 5-10 file staged set completes under a generous ceiling.
  // The set is all-clean so the gate allows; the measurement covers the
  // multi-file `git show` + dispatch fan-out end-to-end via `bun run`.
  test("AC10 latency: a commit over a clean 8-file staged set completes under ceiling", async () => {
    const clean = asFullyClean(await taskSample());
    for (let i = 1; i <= 8; i += 1) {
      const rel = `docs/specs/SPEC-008/tasks/TASK-${String(i).padStart(3, "0")}-SPEC-008-clean.md`;
      await writeFixtureFile(repoRoot, rel, clean);
    }
    await runGit(repoRoot, ["add", "docs"]);

    const run = await runHandler(HANDLER, commitPayload(repoRoot), repoRoot);
    expect(run.exitCode).toBe(0);

    const res = parseResponse<PreToolUseResponse>(run);
    expect(res.hookSpecificOutput.permissionDecision).toBe("allow");

    // Logged for regression visibility — a real measurement exists even when
    // the (generous, CI-tolerant) ceiling assertion stays green.
    console.log(
      `[AC10] Layer-3 commit handler (8-file staged set) end-to-end: ${run.durationMs.toFixed(1)}ms`,
    );
    expect(run.durationMs).toBeLessThanOrEqual(10000);
  });
});
