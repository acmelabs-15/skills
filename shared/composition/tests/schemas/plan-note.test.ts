import { describe, expect, test } from "bun:test";
import { type PlanNote, PlanNoteSchema } from "../../src/schemas/plan-note.js";

/**
 * Builds a minimal valid PLAN note with status IN_PROGRESS. Tests mutate a
 * clone of this to exercise the SPEC-008 REQ-001 done-claim superRefine arm
 * (TASK-010): PLAN status DONE requires every part substatus terminal
 * (DONE / DEFERRED / ABANDONED).
 *
 * Companion file to the Wave 1 `tests/plan-note-schema.test.ts`. Those
 * legacy cases continue to cover the pre-Wave-2 PlanNoteSchema invariants
 * (build_workflow_items pairing, qa-DONE-requires-test_report_ref, task
 * part-reference validity, etc.) and MUST still pass — DoD item 2.
 */
function minimalPlan(): PlanNote {
  return {
    frontmatter: {
      title: "PLAN-001: Done Claim Fixture",
      type: "plan",
      status: "IN_PROGRESS",
      complexity_tier: "TIER_2",
      branches: ["feat/test"],
      permalink: "planning/plan-001-done-claim-fixture",
      tags: ["plan", "test"],
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
        substatus: "IN_PROGRESS",
        source_artifacts: [],
        depends_on: ["research"],
        dod: [{ text: "Locked", done: false }],
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

/**
 * Builds a PLAN where every part substatus is terminal. Used to exercise
 * the DONE-with-all-terminal-parts accept path. PLAN status is left as
 * IN_PROGRESS by default so the caller can flip to DONE per-test.
 */
function minimalAllTerminalPlan(): PlanNote {
  const plan = minimalPlan();
  // Flip the decisions part to a terminal substatus (DEFERRED) so every
  // part qualifies. The research part is already DONE in the fixture.
  const decisions = plan.parts[1];
  if (!decisions) throw new Error("setup");
  decisions.substatus = "DEFERRED";
  return plan;
}

describe("PlanNoteSchema — done-claim superRefine (SPEC-008 REQ-001, TASK-010)", () => {
  test("accepts IN_PROGRESS plan with mixed-substatus parts (gate dormant when not DONE)", () => {
    // Sanity baseline — the new arm MUST NOT fire when PLAN status != DONE.
    const result = PlanNoteSchema.safeParse(minimalPlan());
    expect(result.success).toBe(true);
  });

  test("accepts DONE plan when every part substatus is terminal (DONE + DEFERRED)", () => {
    const plan = minimalAllTerminalPlan();
    plan.frontmatter.status = "DONE";
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(true);
  });

  test("accepts DONE plan with parts terminal across all three terminal values (DONE / DEFERRED / ABANDONED)", () => {
    const plan = minimalPlan();
    plan.frontmatter.status = "DONE";
    // research → DONE (already)
    // decisions → DEFERRED
    const decisions = plan.parts[1];
    if (!decisions) throw new Error("setup");
    decisions.substatus = "DEFERRED";
    plan.parts.push({
      // Use a non-`build.SPEC-` id so the existing build_workflow_items
      // invariant (which only fires on `build.SPEC-NNN` parts in any
      // non-PENDING substatus) does not interact with this case.
      id: "review",
      phase: "review",
      title: "Abandoned review",
      substatus: "ABANDONED",
      source_artifacts: [],
      depends_on: ["decisions.1"],
      dod: [{ text: "Abandoned", done: false, deferred_rationale: "scope cut" }],
    });
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(true);
  });

  test("rejects DONE plan when a single part is still IN_PROGRESS", () => {
    const plan = minimalPlan();
    plan.frontmatter.status = "DONE";
    // decisions.1 remains IN_PROGRESS — non-terminal
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(false);
    if (result.success) throw new Error("setup");
    const message = result.error.issues.map((i) => i.message).join("\n");
    expect(message).toMatch(/PLAN status DONE/);
    expect(message).toMatch(/decisions\.1/);
    expect(message).toMatch(/IN_PROGRESS/);
  });

  test("rejects DONE plan when any non-terminal substatus is present (PENDING / READY / BLOCKED)", () => {
    for (const nonTerminal of ["PENDING", "READY", "BLOCKED"] as const) {
      const plan = minimalAllTerminalPlan();
      plan.frontmatter.status = "DONE";
      const decisions = plan.parts[1];
      if (!decisions) throw new Error("setup");
      decisions.substatus = nonTerminal;
      const result = PlanNoteSchema.safeParse(plan);
      expect(result.success).toBe(false);
      if (result.success) throw new Error("setup");
      const message = result.error.issues.map((i) => i.message).join("\n");
      expect(message).toMatch(new RegExp(`substatus ${nonTerminal}`));
    }
  });

  test("DONE plan with multiple non-terminal parts surfaces one issue per offending part", () => {
    const plan = minimalPlan();
    plan.frontmatter.status = "DONE";
    // research → flip to non-terminal too
    const research = plan.parts[0];
    if (!research) throw new Error("setup");
    research.substatus = "READY";
    // decisions.1 stays IN_PROGRESS
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(false);
    if (result.success) throw new Error("setup");
    const doneClaimIssues = result.error.issues.filter((i) => /PLAN status DONE/.test(i.message));
    expect(doneClaimIssues.length).toBe(2);
    const messages = doneClaimIssues.map((i) => i.message).join("\n");
    expect(messages).toMatch(/research/);
    expect(messages).toMatch(/decisions\.1/);
  });

  test("PAUSED plan with non-terminal parts passes (gate is DONE-only)", () => {
    // The gate fires only on status DONE. PAUSED + IN_PROGRESS + DONE
    // statuses other than DONE leave the arm dormant — verified explicitly
    // because a "non-IN_PROGRESS not DONE" enum value (PAUSED) is otherwise
    // uncovered by the IN_PROGRESS baseline test above.
    const plan = minimalPlan();
    plan.frontmatter.status = "PAUSED";
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(true);
  });
});
