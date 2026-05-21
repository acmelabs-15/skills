import { describe, expect, test } from "bun:test";
import { renderPlanNote } from "../src/renderers/plan-note.js";
import {
  type BuildWorkflowItem,
  type Part,
  type PlanNote,
  PlanNoteSchema,
} from "../src/schemas/plan-note.js";

/**
 * Tests for X.D.2: PlanNote renderer emits Build Workflow Items sub-section
 * under each Part that carries build_workflow_items. Validates:
 *  - absence (part without build_workflow_items renders no header)
 *  - presence + per-item line set (7 metadata lines)
 *  - deterministic ordering: impl before qa per task_ref, task_refs lex-sorted
 *  - em-dash for absent optional fields
 *  - byte-identical determinism across repeated renders
 *
 * Fixtures are constructed inline as typed PlanNote literals — independent
 * of plan-note-sample.md (which will be updated in X.D.4).
 */

const BASE_OBSERVATIONS = [
  { category: "fact" as const, text: "obs 1", tags: ["a"] },
  { category: "decision" as const, text: "obs 2", tags: ["b"] },
  { category: "insight" as const, text: "obs 3", tags: ["c"] },
];

const BASE_RELATIONS = [
  { verb: "implements" as const, target: "SPEC-003: Test" },
  { verb: "depends_on" as const, target: "ADR-001: Test" },
];

function makePlan(buildPart: Part): PlanNote {
  const plan: PlanNote = {
    frontmatter: {
      title: "PLAN-001: Renderer Test",
      type: "plan",
      status: "IN_PROGRESS",
      complexity_tier: "TIER_2",
      branches: ["feat/test"],
      permalink: "planning/plan-001-renderer-test",
      tags: ["plan", "test"],
    },
    scope: "Scope text.",
    objectives: [{ id: "O-1", text: "Build the renderer", done: false }],
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
      buildPart,
    ],
    tasks: [],
    pending_decisions: [],
    editor_mirror: [],
    blockers: [],
    observations: BASE_OBSERVATIONS,
    relations: BASE_RELATIONS,
  };
  // Schema validate so tests reflect real-world valid plans.
  return PlanNoteSchema.parse(plan);
}

function makeBuildPart(items: BuildWorkflowItem[] | undefined, substatus: Part["substatus"]): Part {
  const part: Part = {
    id: "build.SPEC-003",
    phase: "build",
    title: "Build SPEC-003",
    substatus,
    source_artifacts: ["[[SPEC-003: Test]]"],
    depends_on: ["research"],
    dod: [{ text: "Tests pass", done: false }],
  };
  if (items !== undefined) part.build_workflow_items = items;
  if (substatus === "DONE") part.outcome = "[[SESSION-2026-05-20_01: Done]]";
  return part;
}

describe("renderPlanNote Build Workflow Items", () => {
  test("part without build_workflow_items renders no Build Workflow Items header", () => {
    // research part has no build_workflow_items + the build part stays PENDING
    // without items (schema allows build.SPEC-NNN PENDING without items).
    const part = makeBuildPart(undefined, "PENDING");
    const plan = makePlan(part);
    const out = renderPlanNote(plan);
    expect(out).not.toContain("Build Workflow Items");
    expect(out).toContain("**DoD**:");
  });

  test("part with one impl + one qa item renders both with all 7 metadata lines and em-dash for absent optionals", () => {
    const items: BuildWorkflowItem[] = [
      {
        id: "impl-TASK-001-SPEC-003",
        type: "impl",
        task_ref: "TASK-001-SPEC-003",
        status: "PENDING",
        failed_iterations: 0,
      },
      {
        id: "qa-TASK-001-SPEC-003",
        type: "qa",
        task_ref: "TASK-001-SPEC-003",
        status: "PENDING",
        failed_iterations: 0,
      },
    ];
    const plan = makePlan(makeBuildPart(items, "IN_PROGRESS"));
    const out = renderPlanNote(plan);

    expect(out).toContain("**Build Workflow Items**:");
    expect(out).toContain("#### impl-TASK-001-SPEC-003");
    expect(out).toContain("#### qa-TASK-001-SPEC-003");

    // impl block before qa block
    const implIdx = out.indexOf("#### impl-TASK-001-SPEC-003");
    const qaIdx = out.indexOf("#### qa-TASK-001-SPEC-003");
    expect(implIdx).toBeLessThan(qaIdx);

    // 7 metadata lines per item — assert all labels appear in the impl section
    const implBlock = out.slice(implIdx, qaIdx);
    expect(implBlock).toContain("- **Type**: impl");
    expect(implBlock).toContain("- **Task Ref**: TASK-001-SPEC-003");
    expect(implBlock).toContain("- **Status**: PENDING");
    expect(implBlock).toContain("- **Owning Session**: —");
    expect(implBlock).toContain("- **Transitioned At Event**: —");
    expect(implBlock).toContain("- **Failed Iterations**: 0");
    expect(implBlock).toContain("- **Test Report Ref**: —");
    expect(implBlock).toContain("- **Fix Brief For Event**: —");
  });

  test("multiple tasks render impl-before-qa per task and tasks in lex order regardless of input order", () => {
    // Deliberately shuffled input: TASK-002 qa first, TASK-001 qa, TASK-002 impl, TASK-001 impl
    const items: BuildWorkflowItem[] = [
      {
        id: "qa-TASK-002-SPEC-003",
        type: "qa",
        task_ref: "TASK-002-SPEC-003",
        status: "PENDING",
        failed_iterations: 0,
      },
      {
        id: "qa-TASK-001-SPEC-003",
        type: "qa",
        task_ref: "TASK-001-SPEC-003",
        status: "PENDING",
        failed_iterations: 0,
      },
      {
        id: "impl-TASK-002-SPEC-003",
        type: "impl",
        task_ref: "TASK-002-SPEC-003",
        status: "PENDING",
        failed_iterations: 0,
      },
      {
        id: "impl-TASK-001-SPEC-003",
        type: "impl",
        task_ref: "TASK-001-SPEC-003",
        status: "PENDING",
        failed_iterations: 0,
      },
    ];
    const plan = makePlan(makeBuildPart(items, "IN_PROGRESS"));
    const out = renderPlanNote(plan);

    const i1 = out.indexOf("#### impl-TASK-001-SPEC-003");
    const q1 = out.indexOf("#### qa-TASK-001-SPEC-003");
    const i2 = out.indexOf("#### impl-TASK-002-SPEC-003");
    const q2 = out.indexOf("#### qa-TASK-002-SPEC-003");

    expect(i1).toBeGreaterThan(-1);
    expect(q1).toBeGreaterThan(-1);
    expect(i2).toBeGreaterThan(-1);
    expect(q2).toBeGreaterThan(-1);

    expect(i1).toBeLessThan(q1);
    expect(q1).toBeLessThan(i2);
    expect(i2).toBeLessThan(q2);
  });

  test("qa item with test_report_ref set renders the ref string verbatim", () => {
    const items: BuildWorkflowItem[] = [
      {
        id: "impl-TASK-001-SPEC-003",
        type: "impl",
        task_ref: "TASK-001-SPEC-003",
        status: "DONE",
        failed_iterations: 0,
      },
      {
        id: "qa-TASK-001-SPEC-003",
        type: "qa",
        task_ref: "TASK-001-SPEC-003",
        status: "DONE",
        failed_iterations: 0,
        test_report_ref: "TEST-REPORT-005-SPEC-003",
      },
    ];
    const plan = makePlan(makeBuildPart(items, "IN_PROGRESS"));
    const out = renderPlanNote(plan);

    const qaIdx = out.indexOf("#### qa-TASK-001-SPEC-003");
    const tail = out.slice(qaIdx);
    expect(tail).toContain("- **Test Report Ref**: TEST-REPORT-005-SPEC-003");
  });

  test("impl item with owning_session + transitioned_at_event + failed_iterations renders all three verbatim", () => {
    const items: BuildWorkflowItem[] = [
      {
        id: "impl-TASK-001-SPEC-003",
        type: "impl",
        task_ref: "TASK-001-SPEC-003",
        status: "IN_PROGRESS",
        owning_session: "SESSION-2026-05-20_03",
        transitioned_at_event: 7,
        failed_iterations: 2,
      },
      {
        id: "qa-TASK-001-SPEC-003",
        type: "qa",
        task_ref: "TASK-001-SPEC-003",
        status: "PENDING",
        failed_iterations: 0,
      },
    ];
    const plan = makePlan(makeBuildPart(items, "IN_PROGRESS"));
    const out = renderPlanNote(plan);

    const implIdx = out.indexOf("#### impl-TASK-001-SPEC-003");
    const qaIdx = out.indexOf("#### qa-TASK-001-SPEC-003");
    const implBlock = out.slice(implIdx, qaIdx);

    expect(implBlock).toContain("- **Owning Session**: SESSION-2026-05-20_03");
    expect(implBlock).toContain("- **Transitioned At Event**: 7");
    expect(implBlock).toContain("- **Failed Iterations**: 2");
  });

  test("rendering the same plan twice produces byte-identical output", () => {
    const items: BuildWorkflowItem[] = [
      {
        id: "impl-TASK-001-SPEC-003",
        type: "impl",
        task_ref: "TASK-001-SPEC-003",
        status: "IN_PROGRESS",
        owning_session: "SESSION-2026-05-20_03",
        transitioned_at_event: 7,
        failed_iterations: 1,
      },
      {
        id: "qa-TASK-001-SPEC-003",
        type: "qa",
        task_ref: "TASK-001-SPEC-003",
        status: "PENDING",
        failed_iterations: 0,
      },
    ];
    const plan = makePlan(makeBuildPart(items, "IN_PROGRESS"));
    const out1 = renderPlanNote(plan);
    const out2 = renderPlanNote(plan);
    expect(out1).toBe(out2);
  });
});
