/**
 * Layer 1 (local Edit/Write/MultiEdit on docs/**) end-to-end smoke tests.
 *
 * Covers TASK-046 DoD smoke tests 2, 9, 10 — the Layer-1 deny path against a
 * lying-claim fixture, the clean-edit allow happy path, and the low-severity
 * hygiene allow-with-warning path — plus the AC10 Layer-1 latency measurement.
 *
 * Every assertion drives the ACTUAL handler script (`pre-write-brain-note.ts`)
 * via `bun run` with JSON on stdin (see `_helpers/run-handler.ts`), exercising
 * the full stdin-read → decide → stdout-emit wiring end-to-end, not the inner
 * pure core (which the unit suite already covers).
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  asFullyClean,
  lyingClaim,
  taskSample,
  withMissingObservationTag,
} from "./_helpers/fixtures.ts";
import { initRepo, removeRepo, writeFixtureFile } from "./_helpers/git-repo.ts";
import { type PreToolUseResponse, parseResponse, runHandler } from "./_helpers/run-handler.ts";

const HANDLER = "pre-write-brain-note";
const NOTE_REL = "docs/specs/SPEC-008/tasks/TASK-099-SPEC-008-smoke.md";

/** Build an `Edit` HookInput payload that proposes `proposed` for `NOTE_REL`. */
function editPayload(cwd: string, current: string, proposed: string) {
  return {
    tool_name: "Edit",
    tool_input: { file_path: NOTE_REL, old_string: current, new_string: proposed },
    cwd,
  };
}

/**
 * Build a `Write` HookInput payload that proposes the full `content` for
 * `NOTE_REL`. Used for new-file (clean / hygiene) cases: an `Edit` with an empty
 * `old_string` fails-open by design (oldString must be non-empty), so a
 * full-content `Write` is the correct tool for a fresh note.
 */
function writePayload(cwd: string, content: string) {
  return {
    tool_name: "Write",
    tool_input: { file_path: NOTE_REL, content },
    cwd,
  };
}

describe("Layer 1 smoke — local Edit on docs/** Brain note", () => {
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await initRepo("layer-1");
  });

  afterEach(async () => {
    await removeRepo(repoRoot);
  });

  // Smoke 2 (Layer 1 deny): an Edit that flips a TASK to DONE while a DoD item
  // is unsatisfied must be denied, naming the failing DoD item.
  test("denies a lying TASK-DONE claim and names the failing DoD item", async () => {
    const lying = await lyingClaim("task/drift-02-checkbox-flip-without-evidence.md", "task");
    // Seed the on-disk note at IN_PROGRESS; the Edit proposes the DONE flip.
    const onDisk = lying.replace(/^status:.*$/m, "status: IN_PROGRESS");
    await writeFixtureFile(repoRoot, NOTE_REL, onDisk);

    const run = await runHandler(HANDLER, editPayload(repoRoot, onDisk, lying), repoRoot);
    expect(run.exitCode).toBe(0);

    const res = parseResponse<PreToolUseResponse>(run);
    expect(res.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(res.hookSpecificOutput.permissionDecisionReason).toContain("status=DONE");
    expect(res.hookSpecificOutput.permissionDecisionReason).toContain("commit SHA");
  });

  // Smoke 9 (Layer 1 clean-edit happy path): a fully-clean note (claim N/A,
  // counts above the structural floor) is allowed with NO warning.
  test("allows a clean edit with no additionalContext warning", async () => {
    const clean = asFullyClean(await taskSample());

    const run = await runHandler(HANDLER, writePayload(repoRoot, clean), repoRoot);
    expect(run.exitCode).toBe(0);

    const res = parseResponse<PreToolUseResponse>(run);
    expect(res.hookSpecificOutput.permissionDecision).toBe("allow");
    expect(res.hookSpecificOutput.additionalContext).toBeUndefined();
  });

  // Smoke 10 (Layer 1 low-severity hygiene): a missing observation tag is a
  // recoverable schema issue — allowed, but with an additionalContext warning.
  test("allows a low-severity hygiene issue (missing observation tag) with a warning", async () => {
    const hygiene = withMissingObservationTag(asFullyClean(await taskSample()));

    const run = await runHandler(HANDLER, writePayload(repoRoot, hygiene), repoRoot);
    expect(run.exitCode).toBe(0);

    const res = parseResponse<PreToolUseResponse>(run);
    expect(res.hookSpecificOutput.permissionDecision).toBe("allow");
    expect(res.hookSpecificOutput.additionalContext).toBeDefined();
    expect(res.hookSpecificOutput.additionalContext).toContain("non-blocking");
  });

  // AC10 (REQ-011, folded here per Event 122): a representative Layer-1 edit
  // handler invocation against a typical TASK note completes within a sane
  // ceiling. The bound is deliberately generous (CI variance tolerant); the
  // point is that a REAL end-to-end measurement exists. The measured ms is
  // logged so a regression is visible even when the assertion stays green.
  test("AC10 latency: a representative Layer-1 edit completes under ceiling", async () => {
    const clean = asFullyClean(await taskSample());

    const run = await runHandler(HANDLER, writePayload(repoRoot, clean), repoRoot);
    expect(run.exitCode).toBe(0);

    // Generous ceiling (2s): a `bun run` cold-start dominates the budget; the
    // inner decide path is sub-millisecond. Logged for regression visibility.
    console.log(`[AC10] Layer-1 edit handler end-to-end: ${run.durationMs.toFixed(1)}ms`);
    expect(run.durationMs).toBeLessThanOrEqual(2000);
  });
});
