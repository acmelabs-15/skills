import { describe, expect, test } from "bun:test";
import type { TaskNote } from "@acmelabs/models/schemas/task-note";
import {
  validateTaskAdrComplianceClaim,
  validateTaskDoneClaim,
} from "@acmelabs/models/validators/task-claim-validator";

function taskWithDod(
  dod: Array<{ text: string; done: boolean; deferred_rationale?: string }>,
  adr?: Array<{ text: string; done: boolean; deferred_rationale?: string }>,
): TaskNote {
  const base: TaskNote = {
    frontmatter: {
      title: "TASK-001-SPEC-001: Validator Fixture",
      type: "task",
      permalink: "specs/spec-001-test/tasks/task-001-spec-001-validator-fixture",
      status: "IN_PROGRESS",
      tags: ["task", "spec-001"],
    },
    objective: "Exercise validator.",
    scope_in: [],
    scope_out: [],
    files_affected: [],
    testing_requirements: [],
    definition_of_done: dod,
    observations: [
      { category: "decision", text: "o1", tags: ["a"] },
      { category: "fact", text: "o2", tags: ["b"] },
      { category: "constraint", text: "o3", tags: ["c"] },
    ],
    relations: [
      { verb: "part_of", target: "SPEC-001: Test" },
      { verb: "implements", target: "REQ-001-SPEC-001: Test" },
    ],
  };
  if (adr !== undefined) base.adr_compliance = adr;
  return base;
}

describe("validateTaskDoneClaim", () => {
  test("PASS when all items done", () => {
    const task = taskWithDod([
      { text: "Item 1", done: true },
      { text: "Item 2", done: true },
    ]);
    const result = validateTaskDoneClaim(task);
    expect(result.verdict).toBe("PASS");
    expect(result.total).toBe(2);
  });

  test("FAIL with single unsatisfied item", () => {
    const task = taskWithDod([
      { text: "Item 1", done: true },
      { text: "Item 2", done: false },
    ]);
    const result = validateTaskDoneClaim(task);
    expect(result.verdict).toBe("FAIL");
    expect(result.total).toBe(2);
    if (result.verdict !== "FAIL") throw new Error("setup");
    expect(result.unsatisfied).toEqual([{ index: 1, text: "Item 2" }]);
  });

  test("FAIL lists every unsatisfied item with zero-based index", () => {
    const task = taskWithDod([
      { text: "Item 1", done: false },
      { text: "Item 2", done: true },
      { text: "Item 3", done: false },
      { text: "Item 4", done: false },
    ]);
    const result = validateTaskDoneClaim(task);
    if (result.verdict !== "FAIL") throw new Error("setup");
    expect(result.unsatisfied).toEqual([
      { index: 0, text: "Item 1" },
      { index: 2, text: "Item 3" },
      { index: 3, text: "Item 4" },
    ]);
  });

  test("deferred-with-rationale counts as satisfied", () => {
    const task = taskWithDod([
      { text: "Item 1", done: true },
      { text: "Item 2", done: false, deferred_rationale: "blocked upstream" },
    ]);
    const result = validateTaskDoneClaim(task);
    expect(result.verdict).toBe("PASS");
  });

  test("deferred-with-empty-rationale is not satisfied", () => {
    const task = taskWithDod([{ text: "Item 1", done: false, deferred_rationale: "" }]);
    const result = validateTaskDoneClaim(task);
    expect(result.verdict).toBe("FAIL");
  });

  test("single unsatisfied item yields total=1", () => {
    const task = taskWithDod([{ text: "Lone item", done: false }]);
    const result = validateTaskDoneClaim(task);
    expect(result.total).toBe(1);
    if (result.verdict !== "FAIL") throw new Error("setup");
    expect(result.unsatisfied).toHaveLength(1);
  });
});

describe("validateTaskAdrComplianceClaim", () => {
  test("PASS with total 0 when adr_compliance section absent", () => {
    const task = taskWithDod([{ text: "Item 1", done: true }]);
    const result = validateTaskAdrComplianceClaim(task);
    expect(result.verdict).toBe("PASS");
    expect(result.total).toBe(0);
  });

  test("PASS when all ADR items checked", () => {
    const task = taskWithDod(
      [{ text: "Item 1", done: true }],
      [
        { text: "Honors ADR-001", done: true },
        { text: "Honors ADR-002", done: true },
      ],
    );
    const result = validateTaskAdrComplianceClaim(task);
    expect(result.verdict).toBe("PASS");
    expect(result.total).toBe(2);
  });

  test("FAIL with unchecked ADR items", () => {
    const task = taskWithDod(
      [{ text: "Item 1", done: true }],
      [
        { text: "Honors ADR-001", done: true },
        { text: "Honors ADR-002", done: false },
      ],
    );
    const result = validateTaskAdrComplianceClaim(task);
    if (result.verdict !== "FAIL") throw new Error("setup");
    expect(result.unsatisfied).toEqual([{ index: 1, text: "Honors ADR-002" }]);
  });

  test("deferred ADR item counts as satisfied", () => {
    const task = taskWithDod(
      [{ text: "Item 1", done: true }],
      [{ text: "Honors ADR-003", done: false, deferred_rationale: "spec excludes scope" }],
    );
    const result = validateTaskAdrComplianceClaim(task);
    expect(result.verdict).toBe("PASS");
  });
});
