import { describe, expect, test } from "bun:test";
import { type PlanNote, PlanNoteSchema } from "../src/schemas/plan-note.js";

function minimalPlan(): PlanNote {
  return {
    frontmatter: {
      title: "PLAN-001: Test",
      type: "plan",
      status: "IN_PROGRESS",
      complexity_tier: "TIER_2",
      branches: ["feat/test"],
      permalink: "planning/plan-001-test",
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
        id: "build.SPEC-001",
        phase: "build",
        title: "Build SPEC-001",
        substatus: "IN_PROGRESS",
        source_artifacts: ["[[SPEC-001: Test]]"],
        depends_on: ["research"],
        dod: [{ text: "Tests pass", done: false }],
      },
    ],
    tasks: [
      {
        id: "T-01",
        subject: "Implement parser",
        part: "build.SPEC-001",
        files: ["src/parser.ts"],
        status: "PENDING",
      },
    ],
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

describe("PlanNoteSchema", () => {
  test("accepts a minimal valid plan", () => {
    const result = PlanNoteSchema.safeParse(minimalPlan());
    expect(result.success).toBe(true);
  });

  test("rejects DONE part without outcome", () => {
    const plan = minimalPlan();
    const part = plan.parts[1];
    if (!part) throw new Error("setup");
    part.substatus = "DONE";
    // outcome intentionally omitted
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  test("rejects DONE task without resolved_at_event", () => {
    const plan = minimalPlan();
    const task = plan.tasks[0];
    if (!task) throw new Error("setup");
    task.status = "DONE";
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  test("rejects task referencing unknown part", () => {
    const plan = minimalPlan();
    const task = plan.tasks[0];
    if (!task) throw new Error("setup");
    task.part = "build.SPEC-999";
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  test("rejects part depending on unknown part", () => {
    const plan = minimalPlan();
    const part = plan.parts[1];
    if (!part) throw new Error("setup");
    part.depends_on = ["spec.SPEC-999"];
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  test("rejects plan with no parts", () => {
    const plan = minimalPlan();
    plan.parts = [];
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  test("rejects plan with too few observations (min 3)", () => {
    const plan = minimalPlan();
    plan.observations = plan.observations.slice(0, 2);
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  test("rejects malformed frontmatter title", () => {
    const plan = minimalPlan();
    plan.frontmatter.title = "Plan-001: bad";
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });
});
