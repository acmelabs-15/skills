import { describe, expect, test } from "bun:test";
import type { PlanNote } from "@acmelabs/models/schemas/plan-note";
import {
  type PlanClaimResult,
  validatePlanDoneClaim,
} from "@acmelabs/models/validators/plan-claim-validator";

/**
 * Validator-level unit tests for `validatePlanDoneClaim` (SPEC-008 REQ-003,
 * TASK-010, Wave 2). The validator is the runtime-callable equivalent of
 * the parse-time `superRefine` arm in `PlanNoteSchema`; these cases
 * exercise the boundary behaviors locked in DoD items 4-6:
 *
 *   - status NOT DONE → `{ ok: true }` trivially
 *   - status DONE + every part terminal → `{ ok: true }`
 *   - status DONE + any part non-terminal → `{ ok: false }` with one
 *     unsatisfied entry per offending part, naming `part_id` + `substatus`
 *
 * The fixtures are deliberately constructed as plain objects (cast as
 * `PlanNote`) rather than round-tripped through `PlanNoteSchema.parse()`
 * so the validator can be exercised on inputs that the schema would
 * itself reject — proving the validator does not rely on the schema
 * having pre-rejected non-terminal-DONE plans.
 */
function minimalPlan(overrides: Partial<PlanNote["frontmatter"]> = {}): PlanNote {
  return {
    frontmatter: {
      title: "PLAN-001: Validator Fixture",
      type: "plan",
      status: "IN_PROGRESS",
      complexity_tier: "TIER_2",
      branches: ["feat/test"],
      permalink: "planning/plan-001-validator-fixture",
      tags: ["plan", "test"],
      ...overrides,
    },
    scope: "Scope text.",
    objectives: [{ id: "O-1", text: "Do the thing", done: false }],
    parts: [
      {
        id: "research",
        phase: "research",
        title: "Research",
        substatus: "DONE",
        outcome: "[[ANALYSIS-001: Test]]",
        source_artifacts: [],
        depends_on: [],
        dod: [{ text: "Done", done: true }],
      },
      {
        id: "decisions.1",
        phase: "decisions",
        title: "Decisions",
        substatus: "DONE",
        outcome: "[[ADR-001: Test]]",
        source_artifacts: [],
        depends_on: ["research"],
        dod: [{ text: "Locked", done: true }],
      },
    ],
    tasks: [],
    pending_decisions: [],
    editor_mirror: [],
    blockers: [],
    observations: [
      { category: "fact", text: "obs 1", tags: ["a"] },
      { category: "decision", text: "obs 2", tags: ["b"] },
      { category: "insight", text: "obs 3", tags: ["c"] },
    ],
    relations: [
      { verb: "implements", target: "SPEC-001: Test" },
      { verb: "depends_on", target: "ADR-001: Test" },
    ],
  };
}

describe("validatePlanDoneClaim", () => {
  test("ok=true when status is IN_PROGRESS (the trivial non-DONE branch)", () => {
    // DoD item 4: validator returns { ok: true } when input status is not DONE.
    const plan = minimalPlan({ status: "IN_PROGRESS" });
    // Make a part non-terminal to prove the gate is dormant when not DONE.
    const second = plan.parts[1];
    if (!second) throw new Error("setup");
    second.substatus = "IN_PROGRESS";
    const result = validatePlanDoneClaim(plan);
    expect(result).toEqual({ ok: true });
  });

  test("ok=true when status is PAUSED (also non-DONE)", () => {
    const plan = minimalPlan({ status: "PAUSED" });
    const second = plan.parts[1];
    if (!second) throw new Error("setup");
    second.substatus = "PENDING";
    const result = validatePlanDoneClaim(plan);
    expect(result).toEqual({ ok: true });
  });

  test("ok=true when status is DONE and every part substatus is terminal", () => {
    // DoD item 6: DONE + all-terminal → ok=true.
    const plan = minimalPlan({ status: "DONE" });
    // Both parts already DONE in the fixture; this is the happy path.
    const result = validatePlanDoneClaim(plan);
    expect(result).toEqual({ ok: true });
  });

  test("ok=true when status is DONE and parts use all three terminal values", () => {
    const plan = minimalPlan({ status: "DONE" });
    const first = plan.parts[0];
    const second = plan.parts[1];
    if (!first || !second) throw new Error("setup");
    first.substatus = "DEFERRED";
    second.substatus = "ABANDONED";
    const result = validatePlanDoneClaim(plan);
    expect(result).toEqual({ ok: true });
  });

  test("ok=false when status is DONE and one part is IN_PROGRESS — names the offending part", () => {
    // DoD item 5: DONE + one non-terminal → ok=false with one unsatisfied entry.
    const plan = minimalPlan({ status: "DONE" });
    const second = plan.parts[1];
    if (!second) throw new Error("setup");
    second.substatus = "IN_PROGRESS";
    const result: PlanClaimResult = validatePlanDoneClaim(plan);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("setup");
    expect(result.unsatisfied).toEqual([{ part_id: "decisions.1", substatus: "IN_PROGRESS" }]);
  });

  test("ok=false with one unsatisfied entry per non-terminal part", () => {
    // Multi-failure case: every non-terminal part is reported individually.
    const plan = minimalPlan({ status: "DONE" });
    const first = plan.parts[0];
    const second = plan.parts[1];
    if (!first || !second) throw new Error("setup");
    first.substatus = "READY";
    second.substatus = "PENDING";
    const result = validatePlanDoneClaim(plan);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("setup");
    expect(result.unsatisfied).toEqual([
      { part_id: "research", substatus: "READY" },
      { part_id: "decisions.1", substatus: "PENDING" },
    ]);
  });

  test("ok=false reports BLOCKED part as non-terminal", () => {
    // BLOCKED is explicitly NOT in the terminal set — confirm the
    // validator rejects it under DONE.
    const plan = minimalPlan({ status: "DONE" });
    const second = plan.parts[1];
    if (!second) throw new Error("setup");
    second.substatus = "BLOCKED";
    const result = validatePlanDoneClaim(plan);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("setup");
    expect(result.unsatisfied).toContainEqual({ part_id: "decisions.1", substatus: "BLOCKED" });
  });

  test("validator is pure — does not mutate the input PlanNote", () => {
    // DoD item 7: validator is pure (no I/O, no mutation). Snapshot the
    // input as JSON before + after; equality proves no in-place mutation.
    const plan = minimalPlan({ status: "DONE" });
    const second = plan.parts[1];
    if (!second) throw new Error("setup");
    second.substatus = "IN_PROGRESS";
    const snapshot = JSON.stringify(plan);
    validatePlanDoneClaim(plan);
    expect(JSON.stringify(plan)).toBe(snapshot);
  });
});
