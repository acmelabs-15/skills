import { describe, expect, test } from "bun:test";
import type { DesignNote } from "@acmelabs/models/schemas/design-note";
import { validateDesignComplianceClaim } from "@acmelabs/models/validators/design-claim-validator";

function designWithCompliance(
  compliance?: Array<{ text: string; done: boolean; deferred_rationale?: string }>,
): DesignNote {
  const base: DesignNote = {
    frontmatter: {
      title: "DESIGN-001-SPEC-001: Validator Fixture",
      type: "design",
      permalink: "specs/spec-001-test/design/design-001-spec-001-validator-fixture",
      status: "DRAFT",
      tags: ["design", "spec-001"],
    },
    sections: {
      Context: "Some context",
    },
    observations: [
      { category: "decision", text: "o1", tags: ["a"] },
      { category: "fact", text: "o2", tags: ["b"] },
      { category: "constraint", text: "o3", tags: ["c"] },
    ],
    relations: [
      { verb: "part_of", target: "SPEC-001: Test" },
      { verb: "implements", target: "ADR-001: Test" },
    ],
  };
  if (compliance !== undefined) base.compliance_criteria = compliance;
  return base;
}

describe("validateDesignComplianceClaim", () => {
  test("PASS with total 0 when compliance section absent", () => {
    const design = designWithCompliance();
    const result = validateDesignComplianceClaim(design);
    expect(result.verdict).toBe("PASS");
    expect(result.total).toBe(0);
  });

  test("PASS when all compliance items checked", () => {
    const design = designWithCompliance([
      { text: "Honors ADR-001", done: true },
      { text: "Honors ADR-002", done: true },
    ]);
    const result = validateDesignComplianceClaim(design);
    expect(result.verdict).toBe("PASS");
    expect(result.total).toBe(2);
  });

  test("FAIL with unchecked compliance items", () => {
    const design = designWithCompliance([
      { text: "Honors ADR-001", done: true },
      { text: "Honors ADR-002", done: false },
    ]);
    const result = validateDesignComplianceClaim(design);
    if (result.verdict !== "FAIL") throw new Error("setup");
    expect(result.unsatisfied).toEqual([{ index: 1, text: "Honors ADR-002" }]);
  });

  test("FAIL lists every unsatisfied item with zero-based index", () => {
    const design = designWithCompliance([
      { text: "Item 1", done: false },
      { text: "Item 2", done: true },
      { text: "Item 3", done: false },
    ]);
    const result = validateDesignComplianceClaim(design);
    if (result.verdict !== "FAIL") throw new Error("setup");
    expect(result.unsatisfied).toEqual([
      { index: 0, text: "Item 1" },
      { index: 2, text: "Item 3" },
    ]);
  });

  test("deferred compliance item counts as satisfied", () => {
    const design = designWithCompliance([
      { text: "Honors ADR-003", done: false, deferred_rationale: "spec excludes scope" },
    ]);
    const result = validateDesignComplianceClaim(design);
    expect(result.verdict).toBe("PASS");
  });

  test("deferred-with-empty-rationale is not satisfied", () => {
    const design = designWithCompliance([
      { text: "Honors ADR-004", done: false, deferred_rationale: "" },
    ]);
    const result = validateDesignComplianceClaim(design);
    expect(result.verdict).toBe("FAIL");
  });

  test("round-trips through parser produces FAIL when fixture has unchecked items", async () => {
    const { parseDesignNote } = await import("@acmelabs/models/parsers/design-note");
    const md = await Bun.file(
      new URL("../../fixtures/design-note-sample.md", import.meta.url),
    ).text();
    const design = parseDesignNote(md);
    const result = validateDesignComplianceClaim(design);
    expect(result.verdict).toBe("FAIL");
    expect(result.total).toBe(3);
  });
});
