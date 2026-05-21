import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { applyPlanMutation } from "../src/mutations/plan-mutations.js";
import { parsePlanNote } from "../src/parsers/plan-note.js";

const fixturePath = join(import.meta.dir, "fixtures", "plan-note-sample.md");

async function loadFixture(): Promise<string> {
  return Bun.file(fixturePath).text();
}

describe("applyPlanMutation", () => {
  test("set-part-substatus transitions IN_PROGRESS → DONE with outcome", async () => {
    const md = await loadFixture();
    const out = applyPlanMutation(md, {
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
