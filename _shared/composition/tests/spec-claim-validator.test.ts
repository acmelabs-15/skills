import { describe, expect, test } from "bun:test";
import type { SpecRootNote } from "../src/schemas/spec-root-note.js";
import { validateSpecDoneClaim } from "../src/validators/spec-claim-validator.js";

function makeSpec(
  options: {
    success_criteria?: Array<{ text: string; done: boolean; deferred_rationale?: string }>;
    artifact_status?: Array<{ text: string; done: boolean; deferred_rationale?: string }>;
  } = {},
): SpecRootNote {
  const base: SpecRootNote = {
    frontmatter: {
      title: "SPEC-001: Validator Fixture",
      type: "spec",
      permalink: "specs/spec-001-test/spec-001-test",
      status: "DRAFT",
      tags: ["spec", "test"],
    },
    context: "Some context",
    scope_in: [],
    scope_out: [],
    sections: {},
    observations: [
      { category: "decision", text: "o1", tags: ["a"] },
      { category: "fact", text: "o2", tags: ["b"] },
      { category: "constraint", text: "o3", tags: ["c"] },
    ],
    relations: [
      { verb: "part_of", target: "PLAN-001: Test" },
      { verb: "implements", target: "ADR-001: Test" },
    ],
  };
  if (options.success_criteria !== undefined) base.success_criteria = options.success_criteria;
  if (options.artifact_status !== undefined) base.artifact_status = options.artifact_status;
  return base;
}

describe("validateSpecDoneClaim", () => {
  test("PASS with total 0 when both gate sections absent", () => {
    const result = validateSpecDoneClaim(makeSpec());
    expect(result.verdict).toBe("PASS");
    expect(result.total).toBe(0);
  });

  test("PASS when all success_criteria items checked (artifact_status absent)", () => {
    const result = validateSpecDoneClaim(
      makeSpec({
        success_criteria: [
          { text: "All REQs ACCEPTED", done: true },
          { text: "All TASKs DONE", done: true },
        ],
      }),
    );
    expect(result.verdict).toBe("PASS");
    expect(result.total).toBe(2);
  });

  test("PASS when all items across both gate sections satisfied", () => {
    const result = validateSpecDoneClaim(
      makeSpec({
        success_criteria: [{ text: "SC 1", done: true }],
        artifact_status: [
          { text: "AS 1", done: true },
          { text: "AS 2", done: false, deferred_rationale: "follow-up" },
        ],
      }),
    );
    expect(result.verdict).toBe("PASS");
    expect(result.total).toBe(3);
  });

  test("FAIL cites section for unsatisfied items", () => {
    const result = validateSpecDoneClaim(
      makeSpec({
        success_criteria: [
          { text: "SC 1", done: true },
          { text: "SC 2", done: false },
        ],
        artifact_status: [{ text: "AS 1", done: false }],
      }),
    );
    if (result.verdict !== "FAIL") throw new Error("setup");
    expect(result.unsatisfied).toHaveLength(2);
    expect(result.unsatisfied[0]?.section).toBe("success_criteria");
    expect(result.unsatisfied[0]?.text).toBe("SC 2");
    expect(result.unsatisfied[1]?.section).toBe("artifact_status");
    expect(result.unsatisfied[1]?.text).toBe("AS 1");
    expect(result.total).toBe(3);
  });

  test("FAIL indices are zero-based with artifact_status offset by success_criteria length", () => {
    const result = validateSpecDoneClaim(
      makeSpec({
        success_criteria: [
          { text: "SC 1", done: false },
          { text: "SC 2", done: true },
        ],
        artifact_status: [{ text: "AS 1", done: false }],
      }),
    );
    if (result.verdict !== "FAIL") throw new Error("setup");
    expect(result.unsatisfied[0]?.index).toBe(0); // SC index 0
    expect(result.unsatisfied[1]?.index).toBe(2); // AS index 0 + 2 SC items = 2
  });

  test("deferred-with-rationale counts as satisfied", () => {
    const result = validateSpecDoneClaim(
      makeSpec({
        success_criteria: [{ text: "SC 1", done: false, deferred_rationale: "out of scope" }],
      }),
    );
    expect(result.verdict).toBe("PASS");
  });

  test("deferred with empty rationale is not satisfied", () => {
    const result = validateSpecDoneClaim(
      makeSpec({
        success_criteria: [{ text: "SC 1", done: false, deferred_rationale: "" }],
      }),
    );
    expect(result.verdict).toBe("FAIL");
  });

  test("artifact_status only (no success_criteria) still validates", () => {
    const result = validateSpecDoneClaim(
      makeSpec({
        artifact_status: [
          { text: "AS 1", done: true },
          { text: "AS 2", done: false },
        ],
      }),
    );
    if (result.verdict !== "FAIL") throw new Error("setup");
    expect(result.unsatisfied[0]?.section).toBe("artifact_status");
    expect(result.unsatisfied[0]?.index).toBe(1);
  });
});
