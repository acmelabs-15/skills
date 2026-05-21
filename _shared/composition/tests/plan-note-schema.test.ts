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
        // Per feedback_per_task_build_qa_cycle: build.SPEC-NNN parts in any non-PENDING
        // substatus require per-TASK impl + qa items.
        build_workflow_items: [
          {
            id: "impl-TASK-001-SPEC-001",
            type: "impl",
            task_ref: "TASK-001-SPEC-001",
            status: "PENDING",
            failed_iterations: 0,
          },
          {
            id: "qa-TASK-001-SPEC-001",
            type: "qa",
            task_ref: "TASK-001-SPEC-001",
            status: "PENDING",
            failed_iterations: 0,
          },
        ],
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

  // BuildWorkflowItem invariants (Phase X — per-TASK build+qa cycle protocol)

  test("rejects build.SPEC-NNN IN_PROGRESS without build_workflow_items", () => {
    const plan = minimalPlan();
    const part = plan.parts[1];
    if (!part) throw new Error("setup");
    part.build_workflow_items = undefined;
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  test("rejects build.SPEC-NNN IN_PROGRESS with empty build_workflow_items", () => {
    const plan = minimalPlan();
    const part = plan.parts[1];
    if (!part) throw new Error("setup");
    part.build_workflow_items = [];
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  test("rejects TASK with only impl item (missing qa)", () => {
    const plan = minimalPlan();
    const part = plan.parts[1];
    if (!part || !part.build_workflow_items) throw new Error("setup");
    part.build_workflow_items = part.build_workflow_items.filter((i) => i.type !== "qa");
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  test("rejects TASK with only qa item (missing impl)", () => {
    const plan = minimalPlan();
    const part = plan.parts[1];
    if (!part || !part.build_workflow_items) throw new Error("setup");
    part.build_workflow_items = part.build_workflow_items.filter((i) => i.type !== "impl");
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  test("rejects qa item DONE without test_report_ref", () => {
    const plan = minimalPlan();
    const part = plan.parts[1];
    if (!part || !part.build_workflow_items) throw new Error("setup");
    const impl = part.build_workflow_items.find((i) => i.type === "impl");
    const qa = part.build_workflow_items.find((i) => i.type === "qa");
    if (!impl || !qa) throw new Error("setup");
    impl.status = "DONE";
    qa.status = "DONE";
    // test_report_ref intentionally omitted
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  test("rejects qa item IN_PROGRESS when paired impl is PENDING", () => {
    const plan = minimalPlan();
    const part = plan.parts[1];
    if (!part || !part.build_workflow_items) throw new Error("setup");
    const qa = part.build_workflow_items.find((i) => i.type === "qa");
    if (!qa) throw new Error("setup");
    qa.status = "IN_PROGRESS";
    // impl stays PENDING
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  test("rejects build.SPEC-NNN DONE when items not all DONE", () => {
    const plan = minimalPlan();
    const part = plan.parts[1];
    if (!part) throw new Error("setup");
    part.substatus = "DONE";
    part.outcome = "[[SPEC-001: Test]]";
    // build_workflow_items still PENDING/PENDING from fixture
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  test("accepts build.SPEC-NNN DONE when all items DONE with valid test_report_ref", () => {
    const plan = minimalPlan();
    const part = plan.parts[1];
    if (!part || !part.build_workflow_items) throw new Error("setup");
    part.substatus = "DONE";
    part.outcome = "[[SPEC-001: Test]]";
    const task = plan.tasks[0];
    if (task) task.status = "DONE";
    if (task) task.resolved_at_event = 5;
    for (const item of part.build_workflow_items) {
      item.status = "DONE";
      if (item.type === "qa") {
        item.test_report_ref = "TEST-REPORT-001-SPEC-001";
      }
    }
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(true);
  });

  test("rejects BuildWorkflowItem with mismatched id and type+task_ref", () => {
    const plan = minimalPlan();
    const part = plan.parts[1];
    if (!part || !part.build_workflow_items) throw new Error("setup");
    const impl = part.build_workflow_items.find((i) => i.type === "impl");
    if (!impl) throw new Error("setup");
    impl.id = "impl-TASK-999-SPEC-001"; // mismatch with task_ref "TASK-001-SPEC-001"
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  test("rejects BuildWorkflowItem failed_iterations exceeding 3", () => {
    const plan = minimalPlan();
    const part = plan.parts[1];
    if (!part || !part.build_workflow_items) throw new Error("setup");
    const impl = part.build_workflow_items.find((i) => i.type === "impl");
    if (!impl) throw new Error("setup");
    impl.failed_iterations = 4;
    const result = PlanNoteSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });
});
