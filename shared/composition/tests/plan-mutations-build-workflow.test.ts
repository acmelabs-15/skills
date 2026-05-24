import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { sha256 } from "../src/core/hash.js";
import { type PlanMutation, applyPlanMutation } from "../src/mutations/plan-mutations.js";
import { parsePlanNote } from "../src/parsers/plan-note.js";
import { renderPlanNote } from "../src/renderers/plan-note.js";

const fixturePath = join(import.meta.dir, "fixtures", "plan-note-sample.md");

async function loadFixture(): Promise<string> {
  return Bun.file(fixturePath).text();
}

function applyChain(md: string, mutations: PlanMutation[]): string {
  return mutations.reduce((acc, m) => applyPlanMutation(acc, m), md);
}

const SESSION = "SESSION-2026-05-20_04";
const TASK_REF = "TASK-001-SPEC-007";
const PART = "build.SPEC-007";
const TEST_REPORT = "TEST-REPORT-001-SPEC-007";

describe("transition-impl-item", () => {
  test("advances impl IN_PROGRESS → DONE and stamps session context", async () => {
    const md = await loadFixture();
    const out = applyPlanMutation(md, {
      type: "transition-impl-item",
      partId: PART,
      taskRef: TASK_REF,
      from: "IN_PROGRESS",
      to: "DONE",
      owning_session: SESSION,
      at_event: 5,
    });
    const next = parsePlanNote(out);
    const part = next.parts.find((p) => p.id === PART);
    const impl = part?.build_workflow_items?.find(
      (i) => i.type === "impl" && i.task_ref === TASK_REF,
    );
    expect(impl?.status).toBe("DONE");
    expect(impl?.owning_session).toBe(SESSION);
    expect(impl?.transitioned_at_event).toBe(5);
  });

  test("rejects mismatched 'from' status", async () => {
    const md = await loadFixture();
    expect(() =>
      applyPlanMutation(md, {
        type: "transition-impl-item",
        partId: PART,
        taskRef: TASK_REF,
        from: "PENDING",
        to: "DONE",
        owning_session: SESSION,
        at_event: 5,
      }),
    ).toThrow(/expected status PENDING/);
  });

  test("rejects missing part", async () => {
    const md = await loadFixture();
    expect(() =>
      applyPlanMutation(md, {
        type: "transition-impl-item",
        partId: "build.SPEC-999",
        taskRef: TASK_REF,
        from: "IN_PROGRESS",
        to: "DONE",
        owning_session: SESSION,
        at_event: 5,
      }),
    ).toThrow(/part build\.SPEC-999 not found/);
  });

  test("rejects missing task ref", async () => {
    const md = await loadFixture();
    expect(() =>
      applyPlanMutation(md, {
        type: "transition-impl-item",
        partId: PART,
        taskRef: "TASK-099-SPEC-007",
        from: "IN_PROGRESS",
        to: "DONE",
        owning_session: SESSION,
        at_event: 5,
      }),
    ).toThrow(/impl item for task TASK-099-SPEC-007 not found/);
  });

  test("throws when owning_session is empty (context mandate)", async () => {
    const md = await loadFixture();
    expect(() =>
      applyPlanMutation(md, {
        type: "transition-impl-item",
        partId: PART,
        taskRef: TASK_REF,
        from: "IN_PROGRESS",
        to: "DONE",
        owning_session: "",
        at_event: 5,
      }),
    ).toThrow(/owning_session is required/);
  });

  test("throws when at_event is 0 (context mandate)", async () => {
    const md = await loadFixture();
    expect(() =>
      applyPlanMutation(md, {
        type: "transition-impl-item",
        partId: PART,
        taskRef: TASK_REF,
        from: "IN_PROGRESS",
        to: "DONE",
        owning_session: SESSION,
        at_event: 0,
      }),
    ).toThrow(/at_event must be a positive integer/);
  });

  test("bumps failed_iterations on FAILED retry and clamps at 3", async () => {
    const md = await loadFixture();
    // Three sequential FAILED bumps then verify clamp on the fourth.
    const after1 = applyPlanMutation(md, {
      type: "transition-impl-item",
      partId: PART,
      taskRef: TASK_REF,
      from: "IN_PROGRESS",
      to: "FAILED",
      owning_session: SESSION,
      at_event: 5,
      failed_iterations_delta: 1,
    });
    const after2 = applyPlanMutation(after1, {
      type: "transition-impl-item",
      partId: PART,
      taskRef: TASK_REF,
      from: "FAILED",
      to: "IN_PROGRESS",
      owning_session: SESSION,
      at_event: 6,
    });
    const after3 = applyPlanMutation(after2, {
      type: "transition-impl-item",
      partId: PART,
      taskRef: TASK_REF,
      from: "IN_PROGRESS",
      to: "FAILED",
      owning_session: SESSION,
      at_event: 7,
      failed_iterations_delta: 5, // attempt to overflow
    });
    const part = parsePlanNote(after3).parts.find((p) => p.id === PART);
    const impl = part?.build_workflow_items?.find(
      (i) => i.type === "impl" && i.task_ref === TASK_REF,
    );
    expect(impl?.failed_iterations).toBe(3); // clamped
    expect(impl?.status).toBe("FAILED");
  });
});

describe("transition-qa-item", () => {
  function implDonePrelude(md: string): string {
    return applyPlanMutation(md, {
      type: "transition-impl-item",
      partId: PART,
      taskRef: TASK_REF,
      from: "IN_PROGRESS",
      to: "DONE",
      owning_session: SESSION,
      at_event: 5,
    });
  }

  test("advances PENDING → IN_PROGRESS once impl is DONE", async () => {
    const md = await loadFixture();
    const ready = implDonePrelude(md);
    const out = applyPlanMutation(ready, {
      type: "transition-qa-item",
      partId: PART,
      taskRef: TASK_REF,
      from: "PENDING",
      to: "IN_PROGRESS",
      owning_session: SESSION,
      at_event: 6,
    });
    const part = parsePlanNote(out).parts.find((p) => p.id === PART);
    const qa = part?.build_workflow_items?.find((i) => i.type === "qa" && i.task_ref === TASK_REF);
    expect(qa?.status).toBe("IN_PROGRESS");
    expect(qa?.owning_session).toBe(SESSION);
    expect(qa?.transitioned_at_event).toBe(6);
  });

  test("rejects IN_PROGRESS transition when impl is not DONE", async () => {
    const md = await loadFixture();
    // impl is still IN_PROGRESS in the fixture; qa cannot advance.
    expect(() =>
      applyPlanMutation(md, {
        type: "transition-qa-item",
        partId: PART,
        taskRef: TASK_REF,
        from: "PENDING",
        to: "IN_PROGRESS",
        owning_session: SESSION,
        at_event: 6,
      }),
    ).toThrow(/requires paired impl-TASK-001-SPEC-007 to be DONE/);
  });

  test("rejects DONE transition when test_report_ref is missing", async () => {
    const md = await loadFixture();
    const ready = applyChain(md, [
      {
        type: "transition-impl-item",
        partId: PART,
        taskRef: TASK_REF,
        from: "IN_PROGRESS",
        to: "DONE",
        owning_session: SESSION,
        at_event: 5,
      },
      {
        type: "transition-qa-item",
        partId: PART,
        taskRef: TASK_REF,
        from: "PENDING",
        to: "IN_PROGRESS",
        owning_session: SESSION,
        at_event: 6,
      },
    ]);
    expect(() =>
      applyPlanMutation(ready, {
        type: "transition-qa-item",
        partId: PART,
        taskRef: TASK_REF,
        from: "IN_PROGRESS",
        to: "DONE",
        owning_session: SESSION,
        at_event: 7,
        // no test_report_ref
      }),
    ).toThrow(/requires test_report_ref/);
  });

  test("rejects FAILED transition when test_report_ref is missing", async () => {
    const md = await loadFixture();
    const ready = implDonePrelude(md);
    const inProgress = applyPlanMutation(ready, {
      type: "transition-qa-item",
      partId: PART,
      taskRef: TASK_REF,
      from: "PENDING",
      to: "IN_PROGRESS",
      owning_session: SESSION,
      at_event: 6,
    });
    expect(() =>
      applyPlanMutation(inProgress, {
        type: "transition-qa-item",
        partId: PART,
        taskRef: TASK_REF,
        from: "IN_PROGRESS",
        to: "FAILED",
        owning_session: SESSION,
        at_event: 7,
      }),
    ).toThrow(/requires test_report_ref/);
  });

  test("DONE with test_report_ref + fix_brief_for_event records both", async () => {
    const md = await loadFixture();
    const out = applyChain(md, [
      {
        type: "transition-impl-item",
        partId: PART,
        taskRef: TASK_REF,
        from: "IN_PROGRESS",
        to: "DONE",
        owning_session: SESSION,
        at_event: 5,
      },
      {
        type: "transition-qa-item",
        partId: PART,
        taskRef: TASK_REF,
        from: "PENDING",
        to: "IN_PROGRESS",
        owning_session: SESSION,
        at_event: 6,
      },
      {
        type: "transition-qa-item",
        partId: PART,
        taskRef: TASK_REF,
        from: "IN_PROGRESS",
        to: "DONE",
        owning_session: SESSION,
        at_event: 7,
        test_report_ref: TEST_REPORT,
        fix_brief_for_event: 6,
      },
    ]);
    const part = parsePlanNote(out).parts.find((p) => p.id === PART);
    const qa = part?.build_workflow_items?.find((i) => i.type === "qa" && i.task_ref === TASK_REF);
    expect(qa?.status).toBe("DONE");
    expect(qa?.test_report_ref).toBe(TEST_REPORT);
    expect(qa?.fix_brief_for_event).toBe(6);
  });

  test("throws when owning_session is empty (context mandate)", async () => {
    const md = await loadFixture();
    expect(() =>
      applyPlanMutation(md, {
        type: "transition-qa-item",
        partId: PART,
        taskRef: TASK_REF,
        from: "PENDING",
        to: "IN_PROGRESS",
        owning_session: "   ",
        at_event: 6,
      }),
    ).toThrow(/owning_session is required/);
  });

  test("throws when at_event is negative (context mandate)", async () => {
    const md = await loadFixture();
    expect(() =>
      applyPlanMutation(md, {
        type: "transition-qa-item",
        partId: PART,
        taskRef: TASK_REF,
        from: "PENDING",
        to: "IN_PROGRESS",
        owning_session: SESSION,
        at_event: -1,
      }),
    ).toThrow(/at_event must be a positive integer/);
  });
});

describe("build_workflow_items full-cycle round-trip", () => {
  test("complete impl + qa → DONE chain renders identically on re-parse", async () => {
    const md = await loadFixture();
    const out = applyChain(md, [
      {
        type: "transition-impl-item",
        partId: PART,
        taskRef: TASK_REF,
        from: "IN_PROGRESS",
        to: "DONE",
        owning_session: SESSION,
        at_event: 5,
      },
      {
        type: "transition-qa-item",
        partId: PART,
        taskRef: TASK_REF,
        from: "PENDING",
        to: "IN_PROGRESS",
        owning_session: SESSION,
        at_event: 6,
      },
      {
        type: "transition-qa-item",
        partId: PART,
        taskRef: TASK_REF,
        from: "IN_PROGRESS",
        to: "DONE",
        owning_session: SESSION,
        at_event: 7,
        test_report_ref: TEST_REPORT,
      },
    ]);
    const reparsed = parsePlanNote(out);
    const rerendered = renderPlanNote(reparsed);
    expect(sha256(rerendered)).toBe(sha256(out));
  });
});
