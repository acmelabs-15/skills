/**
 * Layer 6 (Stop turn-end backstop) end-to-end smoke test.
 *
 * Covers TASK-046 DoD smoke test 7. Drives the ACTUAL handler script
 * (`stop-backstop.ts`) via `bun run` against a real `Stop`-event payload (cwd +
 * `hook_event_name: "Stop"` — NO tool_name/tool_input).
 *
 * Threat model: an adversarial `docs/**` write that BYPASSED Layers 1/2 (an MCP
 * edit_note that slipped a matcher gap, or any direct on-disk write that never
 * went through a gated tool) leaves an uncommitted working-tree modification.
 * Layer 6 enumerates those via `git status --porcelain --untracked-files=all`,
 * reads the on-disk content, dispatches it, and blocks turn completion when any
 * modified note fails validation — the defense-in-depth catch-all.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { lyingClaim } from "./_helpers/fixtures.ts";
import { initRepo, removeRepo, writeFixtureFile } from "./_helpers/git-repo.ts";
import { type StopResponse, parseResponse, runHandler } from "./_helpers/run-handler.ts";

const HANDLER = "stop-backstop";

describe("Layer 6 smoke — Stop turn-end backstop", () => {
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await initRepo("layer-6");
  });

  afterEach(async () => {
    await removeRepo(repoRoot);
  });

  // Smoke 7 (Layer 6 block): a lying-claim docs/** note written directly to disk
  // — NOT staged, never through a gated tool, as a Layer-1/2-bypassing MCP edit
  // would produce — is caught at turn end via `git status --porcelain` and
  // blocks the turn with a "Turn-end backstop: ..." reason naming the note.
  test("blocks turn completion on an unvalidated docs/** edit that bypassed L1/L2", async () => {
    const relPath = "docs/specs/SPEC-008/tasks/TASK-099-SPEC-008-fabricated.md";
    const lying = await lyingClaim("task/drift-02-checkbox-flip-without-evidence.md", "task");
    // Direct on-disk write — no `git add`, no Edit/Write tool.
    await writeFixtureFile(repoRoot, relPath, lying);

    const payload = { cwd: repoRoot, hook_event_name: "Stop", stop_hook_active: false };

    const run = await runHandler(HANDLER, payload, repoRoot);
    expect(run.exitCode).toBe(0);

    const res = parseResponse<StopResponse>(run);
    expect(res.decision).toBe("block");
    expect(res.reason).toContain("Turn-end backstop:");
    expect(res.reason).toContain(relPath);
  });

  // Counterpart: a clean turn (no docs/** modifications) emits NO payload and
  // lets the turn complete — proving the backstop is not a blanket blocker.
  test("emits no payload on a clean turn (lets the turn complete)", async () => {
    const payload = { cwd: repoRoot, hook_event_name: "Stop", stop_hook_active: false };

    const run = await runHandler(HANDLER, payload, repoRoot);
    expect(run.exitCode).toBe(0);
    expect(run.stdout.trim()).toBe("");
  });
});
