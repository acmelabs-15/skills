/**
 * Layer 7 (FileChanged post-commit observability) end-to-end smoke test.
 *
 * Covers TASK-046 DoD smoke test 8. Drives the ACTUAL handler script
 * (`git-state-observer.ts`) via `bun run` in a throwaway repo whose HEAD commit
 * touches a `docs/**` note.
 *
 * Layer 7 is OBSERVABILITY, never a blocking gate: it emits ONLY a `FileChanged`
 * `additionalContext` line — never a `permissionDecision` / `decision` — and
 * fails open. The smoke asserts the response shape and that the summary names
 * the post-commit state (commit SHA + full-graph validation result).
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { asFullyClean, lyingClaim, taskSample } from "./_helpers/fixtures.ts";
import { initRepo, removeRepo, runGit, writeFixtureFile } from "./_helpers/git-repo.ts";
import { type FileChangedResponse, parseResponse, runHandler } from "./_helpers/run-handler.ts";

const HANDLER = "git-state-observer";

/**
 * A real FileChanged hook payload (session metadata + `cwd` + changed-file
 * descriptor — NO `tool_name` / `tool_input`). This is the shape the Claude Code
 * runtime actually emits on a `FileChanged` event, so the smoke exercises the
 * genuine `parseFileChangedHookInput` path end-to-end (the go-live proof).
 */
function fileChangedPayload(cwd: string) {
  return {
    session_id: "smoke-layer-7",
    transcript_path: "/tmp/transcript-layer-7.jsonl",
    cwd,
    hook_event_name: "FileChanged",
    file_path: ".git/HEAD",
    event: "change",
  };
}

describe("Layer 7 smoke — FileChanged post-commit observability", () => {
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await initRepo("layer-7");
  });

  afterEach(async () => {
    await removeRepo(repoRoot);
  });

  // Smoke 8 (Layer 7 observe): a commit that touches a docs/** note produces a
  // FileChanged additionalContext summary naming the post-commit state. A clean
  // note yields an "all passing" summary; the response NEVER blocks.
  test("emits a FileChanged additionalContext summary for a docs/** commit (clean note)", async () => {
    const relPath = "docs/specs/SPEC-008/tasks/TASK-099-SPEC-008-clean.md";
    await writeFixtureFile(repoRoot, relPath, asFullyClean(await taskSample()));
    await runGit(repoRoot, ["add", relPath]);
    await runGit(repoRoot, ["commit", "-m", "land clean task note", "--quiet"]);

    const run = await runHandler(HANDLER, fileChangedPayload(repoRoot), repoRoot);
    expect(run.exitCode).toBe(0);

    const res = parseResponse<FileChangedResponse>(run);
    expect(res.hookSpecificOutput.hookEventName).toBe("FileChanged");
    expect(res.hookSpecificOutput.additionalContext).toContain("Post-commit state:");
    expect(res.hookSpecificOutput.additionalContext).toContain("PASS");
    // Observability NEVER blocks — no permission/decision field is present.
    expect(res).not.toHaveProperty("permissionDecision");
    expect(res).not.toHaveProperty("decision");
  });

  // Counterpart: a commit landing a lying-claim note still only OBSERVES — the
  // summary reports the FAIL but the handler emits no blocking field.
  test("reports a FAIL in the summary for a landed lying-claim note without blocking", async () => {
    const relPath = "docs/specs/SPEC-008/tasks/TASK-098-SPEC-008-lying.md";
    const lying = await lyingClaim("task/drift-02-checkbox-flip-without-evidence.md", "task");
    await writeFixtureFile(repoRoot, relPath, lying);
    await runGit(repoRoot, ["add", relPath]);
    await runGit(repoRoot, ["commit", "-m", "land lying task note", "--quiet"]);

    const run = await runHandler(HANDLER, fileChangedPayload(repoRoot), repoRoot);
    expect(run.exitCode).toBe(0);

    const res = parseResponse<FileChangedResponse>(run);
    expect(res.hookSpecificOutput.hookEventName).toBe("FileChanged");
    expect(res.hookSpecificOutput.additionalContext).toContain("Post-commit state:");
    expect(res.hookSpecificOutput.additionalContext).toContain("FAIL");
    expect(res.hookSpecificOutput.additionalContext).toContain(relPath);
    expect(res).not.toHaveProperty("decision");
  });
});
