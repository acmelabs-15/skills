import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { type PlanMutation, applyPlanMutation } from "@acmelabs/models/mutations/plan-mutations";
import { parsePlanNote } from "@acmelabs/models/parsers/plan-note";

const fixturePath = join(import.meta.dir, "..", "..", "fixtures", "plan-note-sample.md");

async function loadFixture(): Promise<string> {
  return Bun.file(fixturePath).text();
}

function applyChain(md: string, mutations: PlanMutation[]): string {
  return mutations.reduce((acc, m) => applyPlanMutation(acc, m), md);
}

/**
 * Drive build.SPEC-007 build_workflow_items to all-DONE via the rigid
 * per-TASK build+qa cycle. Required precondition for transitioning the
 * part itself to DONE (per the schema invariant that every workflow item
 * must be DONE before the parent build.SPEC-NNN part flips DONE).
 */
function driveBuildWorkflowItemsToDone(md: string): string {
  return applyChain(md, [
    {
      type: "transition-impl-item",
      partId: "build.SPEC-007",
      taskRef: "TASK-001-SPEC-007",
      from: "IN_PROGRESS",
      to: "DONE",
      owning_session: "SESSION-2026-05-20_04",
      at_event: 5,
    },
    {
      type: "transition-qa-item",
      partId: "build.SPEC-007",
      taskRef: "TASK-001-SPEC-007",
      from: "PENDING",
      to: "IN_PROGRESS",
      owning_session: "SESSION-2026-05-20_04",
      at_event: 6,
    },
    {
      type: "transition-qa-item",
      partId: "build.SPEC-007",
      taskRef: "TASK-001-SPEC-007",
      from: "IN_PROGRESS",
      to: "DONE",
      owning_session: "SESSION-2026-05-20_04",
      at_event: 7,
      qa_ref: "QA-001-SPEC-007",
    },
  ]);
}

describe("applyPlanMutation", () => {
  test("set-part-substatus transitions IN_PROGRESS → DONE with outcome", async () => {
    const md = await loadFixture();
    // Precondition: build.SPEC-NNN parts cannot flip DONE while any
    // build_workflow_item is non-DONE. Drive impl + qa to DONE first.
    const ready = driveBuildWorkflowItemsToDone(md);
    const out = applyPlanMutation(ready, {
      type: "set-part-substatus",
      partId: "build.SPEC-007",
      from: "IN_PROGRESS",
      to: "DONE",
      completing_session: "SESSION-2026-05-20_04",
      outcome: "[[SPEC-007: Sample]]",
    });
    const next = parsePlanNote(out);
    const part = next.parts.find((p) => p.id === "build.SPEC-007");
    expect(part?.substatus).toBe("DONE");
    expect(part?.outcome).toBe("[[SPEC-007: Sample]]");
  });

  test("set-part-substatus rejects transition when 'from' mismatches", async () => {
    const md = await loadFixture();
    expect(() =>
      applyPlanMutation(md, {
        type: "set-part-substatus",
        partId: "build.SPEC-007",
        from: "READY",
        to: "DONE",
        outcome: "x",
      }),
    ).toThrow(/expected substatus READY/);
  });

  test("add-task appends a new task referencing an existing part", async () => {
    const md = await loadFixture();
    const out = applyPlanMutation(md, {
      type: "add-task",
      task: {
        id: "T-03",
        subject: "New work",
        part: "build.SPEC-007",
        files: ["src/new.ts"],
        status: "PENDING",
      },
    });
    const next = parsePlanNote(out);
    expect(next.tasks.some((t) => t.id === "T-03")).toBe(true);
  });

  test("add-task rejects duplicate task ID", async () => {
    const md = await loadFixture();
    expect(() =>
      applyPlanMutation(md, {
        type: "add-task",
        task: {
          id: "T-01",
          subject: "Dup",
          part: "build.SPEC-007",
          files: [],
          status: "PENDING",
        },
      }),
    ).toThrow(/already exists/);
  });

  test("transition-task IN_PROGRESS → DONE records resolving event", async () => {
    const md = await loadFixture();
    const out = applyPlanMutation(md, {
      type: "transition-task",
      taskId: "T-01",
      from: "IN_PROGRESS",
      to: "DONE",
      atEvent: 9,
    });
    const next = parsePlanNote(out);
    const t = next.tasks.find((t) => t.id === "T-01");
    expect(t?.status).toBe("DONE");
    expect(t?.resolved_at_event).toBe(9);
  });

  test("flip-dod-item updates DoD checkbox state", async () => {
    const md = await loadFixture();
    const out = applyPlanMutation(md, {
      type: "flip-dod-item",
      partId: "build.SPEC-007",
      dodIndex: 0,
      done: true,
    });
    const next = parsePlanNote(out);
    const part = next.parts.find((p) => p.id === "build.SPEC-007");
    expect(part?.dod[0]?.done).toBe(true);
  });

  test("add-blocker appends blocker text", async () => {
    const md = await loadFixture();
    const out = applyPlanMutation(md, { type: "add-blocker", text: "Awaiting review" });
    const next = parsePlanNote(out);
    expect(next.blockers).toContain("Awaiting review");
  });

  test("resolve-pending-decision removes the PUD", async () => {
    const md = await loadFixture();
    const out = applyPlanMutation(md, {
      type: "resolve-pending-decision",
      pudId: "PUD-001",
      selectedOption: "Yes",
    });
    const next = parsePlanNote(out);
    expect(next.pending_decisions.length).toBe(0);
  });
});
