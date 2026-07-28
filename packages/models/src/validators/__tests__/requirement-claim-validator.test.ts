import { describe, expect, test } from "bun:test";
import type { RequirementNote } from "@acmelabs/models/schemas/requirement-note";
import { validateRequirementAcClaim } from "@acmelabs/models/validators/requirement-claim-validator";

function reqWithAc(
  ac: Array<{ text: string; done: boolean; deferred_rationale?: string }>,
): RequirementNote {
  return {
    frontmatter: {
      title: "REQ-001-SPEC-001: Validator Fixture",
      type: "requirement",
      permalink: "specs/spec-001-test/requirements/req-001-spec-001-validator-fixture",
      status: "DRAFT",
      tags: ["requirement", "spec-001"],
    },
    requirement_statement: "WHEN x THE SYSTEM SHALL y SO THAT z.",
    acceptance_criteria: ac,
    observations: [
      { category: "requirement", text: "o1", tags: ["a"] },
      { category: "fact", text: "o2", tags: ["b"] },
      { category: "constraint", text: "o3", tags: ["c"] },
    ],
    relations: [
      { verb: "part_of", target: "SPEC-001: Test" },
      { verb: "implements", target: "ADR-001: Test" },
    ],
  };
}

describe("validateRequirementAcClaim", () => {
  test("PASS when all items done", () => {
    const req = reqWithAc([
      { text: "AC 1", done: true },
      { text: "AC 2", done: true },
    ]);
    const result = validateRequirementAcClaim(req);
    expect(result.verdict).toBe("PASS");
    expect(result.total).toBe(2);
  });

  test("FAIL with single unsatisfied item", () => {
    const req = reqWithAc([
      { text: "AC 1", done: true },
      { text: "AC 2", done: false },
    ]);
    const result = validateRequirementAcClaim(req);
    expect(result.verdict).toBe("FAIL");
    expect(result.total).toBe(2);
    if (result.verdict !== "FAIL") throw new Error("setup");
    expect(result.unsatisfied).toEqual([{ index: 1, text: "AC 2" }]);
  });

  test("FAIL lists every unsatisfied item with zero-based index", () => {
    const req = reqWithAc([
      { text: "AC 1", done: false },
      { text: "AC 2", done: true },
      { text: "AC 3", done: false },
      { text: "AC 4", done: false },
    ]);
    const result = validateRequirementAcClaim(req);
    if (result.verdict !== "FAIL") throw new Error("setup");
    expect(result.unsatisfied).toEqual([
      { index: 0, text: "AC 1" },
      { index: 2, text: "AC 3" },
      { index: 3, text: "AC 4" },
    ]);
  });

  test("deferred-with-rationale counts as satisfied", () => {
    const req = reqWithAc([
      { text: "AC 1", done: true },
      { text: "AC 2", done: false, deferred_rationale: "blocked upstream" },
    ]);
    const result = validateRequirementAcClaim(req);
    expect(result.verdict).toBe("PASS");
  });

  test("deferred-with-empty-rationale is not satisfied", () => {
    const req = reqWithAc([{ text: "AC 1", done: false, deferred_rationale: "" }]);
    const result = validateRequirementAcClaim(req);
    expect(result.verdict).toBe("FAIL");
  });

  test("single unsatisfied item yields total=1", () => {
    const req = reqWithAc([{ text: "Lone AC", done: false }]);
    const result = validateRequirementAcClaim(req);
    expect(result.total).toBe(1);
    if (result.verdict !== "FAIL") throw new Error("setup");
    expect(result.unsatisfied).toHaveLength(1);
  });

  test("round-trips through parser produces PASS when all checked", async () => {
    const { parseRequirementNote } = await import("@acmelabs/models/parsers/requirement-note");
    const md = await Bun.file(
      new URL("../../../../fixtures/requirement-note-sample.md", import.meta.url),
    ).text();
    const req = parseRequirementNote(md);
    const result = validateRequirementAcClaim(req);
    // Fixture has all unchecked, so FAIL is expected.
    expect(result.verdict).toBe("FAIL");
    expect(result.total).toBe(6);
  });
});
