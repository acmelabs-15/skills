/**
 * Layer 2 (Brain MCP write_note / edit_note) end-to-end smoke tests.
 *
 * Covers TASK-046 DoD smoke tests 1 and 3 — the matcher-risk mitigation that
 * closes the gap an MCP-mediated state-flip would otherwise slip through (Layer
 * 1 only sees local Edit/Write/MultiEdit; an `mcp__plugin_brain_brain__edit_note`
 * never invokes a local file tool). Per ADR-005 D-8 Failure Modes, an MCP write
 * MUST trigger Layer 2.
 *
 * Drives the ACTUAL handler script (`pre-write-brain-note-mcp.ts`) via `bun run`
 * with JSON on stdin, exercising the MCP-shape parse + identifier→path resolve +
 * in-memory edit-apply + dispatch wiring end-to-end.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { lyingClaim } from "./_helpers/fixtures.ts";
import { initRepo, removeRepo, writeFixtureFile } from "./_helpers/git-repo.ts";
import { type PreToolUseResponse, parseResponse, runHandler } from "./_helpers/run-handler.ts";

const HANDLER = "pre-write-brain-note-mcp";

describe("Layer 2 smoke — Brain MCP edit_note matcher-risk mitigation", () => {
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await initRepo("layer-2");
  });

  afterEach(async () => {
    await removeRepo(repoRoot);
  });

  // Smoke 1 (Layer 2, the headline matcher-risk mitigation): a simulated
  // `mcp__plugin_brain_brain__edit_note` that flips a TASK to DONE while a DoD
  // checkbox is unsatisfied is denied, naming the failing DoD item. The on-disk
  // note sits at IN_PROGRESS; the edit_note `find_replace` performs the DONE
  // flip, and the handler dispatches the proposed (DONE) content.
  test("denies an MCP edit_note that flips a TASK to DONE with an unsatisfied DoD item", async () => {
    const identifier = "specs/spec-008-protocol-hardening-wave-2/tasks/task-099-spec-008-smoke";
    const relPath = `docs/${identifier}.md`;
    const lying = await lyingClaim("task/drift-02-checkbox-flip-without-evidence.md", "task");
    const onDisk = lying.replace(/^status:.*$/m, "status: IN_PROGRESS");
    await writeFixtureFile(repoRoot, relPath, onDisk);

    const payload = {
      tool_name: "mcp__plugin_brain_brain__edit_note",
      tool_input: {
        identifier,
        operation: "find_replace",
        find_text: "status: IN_PROGRESS",
        content: "status: DONE",
      },
      cwd: repoRoot,
    };

    const run = await runHandler(HANDLER, payload, repoRoot);
    expect(run.exitCode).toBe(0);

    const res = parseResponse<PreToolUseResponse>(run);
    expect(res.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(res.hookSpecificOutput.permissionDecisionReason).toContain("status=DONE");
    expect(res.hookSpecificOutput.permissionDecisionReason).toContain("commit SHA");
  });

  // Smoke 3 (Layer 2 against the canonical adversarial fixture for its failure
  // mode): a `write_note` carrying a lying DONE TASK body is denied. write_note
  // supplies the full proposed body as `content`, so no disk read is required.
  test("denies an MCP write_note whose body is a lying TASK-DONE claim", async () => {
    const lying = await lyingClaim("task/drift-03-dod-partial-flip-bypass.md", "task");

    const payload = {
      tool_name: "mcp__plugin_brain_brain__write_note",
      tool_input: {
        title: "TASK-099-SPEC-008: Smoke Fabricated",
        directory: "docs/specs/spec-008/tasks",
        content: lying,
        tags: ["smoke", "adversarial"],
      },
      cwd: repoRoot,
    };

    const run = await runHandler(HANDLER, payload, repoRoot);
    expect(run.exitCode).toBe(0);

    const res = parseResponse<PreToolUseResponse>(run);
    expect(res.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(res.hookSpecificOutput.permissionDecisionReason).toContain("status=DONE");
    expect(res.hookSpecificOutput.permissionDecisionReason).toContain("tsc --noEmit passes");
  });
});
