import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { type PlanMutation, applyPlanMutation } from "../src/mutations/plan-mutations.js";
import { parsePlanNote } from "../src/parsers/plan-note.js";

/**
 * Mutation invariant tests (TASK-026-SPEC-008).
 *
 * Closes two of the three gaps surfaced in ADR-005 D-3 Phase 3 critic P1.2
 * (REQ-007 AC-4): backward-transition rejection and double-apply idempotency.
 * The third gap (duplicate-event-number rejection) lives in TASK-027.
 *
 * Discovered semantics (probed against the real applyPlanMutation, NOT assumed):
 *
 * 1. Backward transition has NO standalone direction guard in the mutation
 *    layer. `transition-impl-item` uses its `from` field as an
 *    optimistic-concurrency check — it throws only when `from` mismatches the
 *    item's current status. Declaring `from: "DONE", to: "IN_PROGRESS"` on an
 *    item that is genuinely DONE passes the `from` check and, in isolation,
 *    mutates the item backward without error.
 *
 *    The REAL backward-transition rejection comes from the PlanNoteSchema
 *    cross-field invariant: once the paired qa item is DONE, the schema
 *    requires its paired impl item to remain DONE. Walking impl backward
 *    (DONE → IN_PROGRESS) while qa is DONE orphans that pairing, so the
 *    re-validation inside applyPlanMutation rejects it with a recognizable
 *    message: "qa item ... status DONE requires paired impl ... to be DONE".
 *    That is the direction-specific, invariant-backed rejection asserted below.
 */

const fixturePath = join(import.meta.dir, "fixtures", "plan-note-sample.md");

async function loadFixture(): Promise<string> {
  return Bun.file(fixturePath).text();
}

function applyChain(md: string, mutations: PlanMutation[]): string {
  return mutations.reduce((acc, m) => applyPlanMutation(acc, m), md);
}

const BUILD_PART = "build.SPEC-007";
const TASK_REF = "TASK-001-SPEC-007";
const SESSION = "SESSION-2026-05-20_04";

/** Drive impl DONE, then qa DONE — the all-DONE precondition for a build part. */
function driveImplAndQaToDone(md: string): string {
  return applyChain(md, [
    {
      type: "transition-impl-item",
      partId: BUILD_PART,
      taskRef: TASK_REF,
      from: "IN_PROGRESS",
      to: "DONE",
      owning_session: SESSION,
      at_event: 5,
    },
    {
      type: "transition-qa-item",
      partId: BUILD_PART,
      taskRef: TASK_REF,
      from: "PENDING",
      to: "IN_PROGRESS",
      owning_session: SESSION,
      at_event: 6,
    },
    {
      type: "transition-qa-item",
      partId: BUILD_PART,
      taskRef: TASK_REF,
      from: "IN_PROGRESS",
      to: "DONE",
      owning_session: SESSION,
      at_event: 7,
      test_report_ref: "TEST-REPORT-001-SPEC-007",
    },
  ]);
}

function implStatus(md: string): string | undefined {
  const part = parsePlanNote(md).parts.find((p) => p.id === BUILD_PART);
  return part?.build_workflow_items?.find((i) => i.type === "impl")?.status;
}

describe("mutation invariants — backward transition", () => {
  test("rejects backward impl transition DONE → IN_PROGRESS when paired qa is DONE", async () => {
    const md = await loadFixture();
    const allDone = driveImplAndQaToDone(md);
    // Sanity: precondition reached.
    expect(implStatus(allDone)).toBe("DONE");

    // Backward move: impl DONE → IN_PROGRESS. The schema cross-field invariant
    // (qa-DONE requires paired impl-DONE) rejects the re-validation. The `from`
    // is declared honestly as "DONE", so the optimistic-concurrency check
    // passes and the invariant — not a from-mismatch — is what fires.
    expect(() =>
      applyPlanMutation(allDone, {
        type: "transition-impl-item",
        partId: BUILD_PART,
        taskRef: TASK_REF,
        from: "DONE",
        to: "IN_PROGRESS",
        owning_session: SESSION,
        at_event: 8,
      }),
    ).toThrow(/requires paired impl-TASK-001-SPEC-007 to be DONE/);
  });

  test("forward impl transition IN_PROGRESS → DONE succeeds (rejection is direction-specific)", async () => {
    const md = await loadFixture();
    // Positive control: the same item, same mutation type, opposite direction,
    // from the fixture's initial IN_PROGRESS state — must succeed, proving the
    // rejection above is direction-specific, not an absolute block on the item.
    const out = applyPlanMutation(md, {
      type: "transition-impl-item",
      partId: BUILD_PART,
      taskRef: TASK_REF,
      from: "IN_PROGRESS",
      to: "DONE",
      owning_session: SESSION,
      at_event: 5,
    });
    expect(implStatus(out)).toBe("DONE");
  });

  test("forward → backward asymmetry holds on the same item within one chain", async () => {
    const md = await loadFixture();
    // Forward leg succeeds (impl + qa driven to DONE).
    const forward = driveImplAndQaToDone(md);
    expect(implStatus(forward)).toBe("DONE");
    // Backward leg on that same item is rejected — same item, both directions,
    // proving the asymmetry is in the transition, not the item.
    expect(() =>
      applyPlanMutation(forward, {
        type: "transition-impl-item",
        partId: BUILD_PART,
        taskRef: TASK_REF,
        from: "DONE",
        to: "IN_PROGRESS",
        owning_session: SESSION,
        at_event: 9,
      }),
    ).toThrow(/requires paired impl-TASK-001-SPEC-007 to be DONE/);
  });
});

describe("mutation invariants — double-apply idempotency", () => {
  /**
   * Idempotency contract: applying a mutation that sets a value to a target,
   * then applying the identical mutation again on the once-mutated state,
   * yields byte-identical rendered output. State hash via Bun.hash over the
   * rendered markdown is the simplest equality witness (per TASK observation).
   *
   * Three mutation types where idempotency is the genuine intended contract:
   *
   * - flip-dod-item (done: true): sets a checkbox to a fixed boolean. No
   *   precondition on prior state; re-applying re-sets the same value.
   * - lock-decision (same topic): upserts a decision to LOCKED with a topic.
   *   The upsert finds the existing LOCKED entry and rewrites identical fields.
   * - set-part-substatus (DONE → DONE): the `from` guard accepts the current
   *   substatus and writes the same target. A no-op transition by design.
   *
   * Excluded as NON-idempotent by design: transition-impl-item /
   * transition-qa-item / transition-task all consume the `from` state — a
   * second apply with the same `from` throws (the first apply changed the
   * status), so they are intentionally single-shot. add-task throws on
   * duplicate id. add-blocker appends unconditionally (grows on each apply).
   */

  function hashOf(md: string): bigint {
    return Bun.hash(md) as bigint;
  }

  test("flip-dod-item (done:true) is idempotent on double apply", async () => {
    const md = await loadFixture();
    const once = applyPlanMutation(md, {
      type: "flip-dod-item",
      partId: BUILD_PART,
      dodIndex: 0,
      done: true,
    });
    const twice = applyPlanMutation(once, {
      type: "flip-dod-item",
      partId: BUILD_PART,
      dodIndex: 0,
      done: true,
    });
    expect(hashOf(twice)).toBe(hashOf(once));
    expect(twice).toBe(once);
  });

  test("lock-decision (same topic) is idempotent on double apply", async () => {
    const md = await loadFixture();
    const once = applyPlanMutation(md, {
      type: "lock-decision",
      partId: "decisions.1",
      decisionId: "D-1",
      topic: "Use Zod",
    });
    const twice = applyPlanMutation(once, {
      type: "lock-decision",
      partId: "decisions.1",
      decisionId: "D-1",
      topic: "Use Zod",
    });
    expect(hashOf(twice)).toBe(hashOf(once));
    expect(twice).toBe(once);
  });

  test("set-part-substatus (DONE → DONE) is idempotent on double apply", async () => {
    const md = await loadFixture();
    // The fixture's `research` part is already DONE with an outcome; a
    // DONE → DONE transition restating the outcome is a structural no-op.
    const once = applyPlanMutation(md, {
      type: "set-part-substatus",
      partId: "research",
      from: "DONE",
      to: "DONE",
      outcome: "[[ANALYSIS-001: Sample]]",
    });
    const twice = applyPlanMutation(once, {
      type: "set-part-substatus",
      partId: "research",
      from: "DONE",
      to: "DONE",
      outcome: "[[ANALYSIS-001: Sample]]",
    });
    expect(hashOf(twice)).toBe(hashOf(once));
    expect(twice).toBe(once);
  });
});
