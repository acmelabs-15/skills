import { describe, expect, test } from "bun:test";
import type { SpecRootCheckboxMarker, SpecRootNote } from "@acmelabs/models/schemas/spec-root-note";
import type { TaskNote } from "@acmelabs/models/schemas/task-note";
import { validateSpecDoneClaim } from "@acmelabs/models/validators/spec-claim-validator";
import { validateTaskDoneClaim } from "@acmelabs/models/validators/task-claim-validator";

type CheckboxOpt = {
  text: string;
  done: boolean;
  deferred_rationale?: string;
  marker?: SpecRootCheckboxMarker;
};

function makeSpec(
  options: {
    success_criteria?: CheckboxOpt[];
    artifact_status?: CheckboxOpt[];
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

// drift-marker: spec-002-spec-003-rollup-drift — SPEC-002/003 SPEC-vs-TASK rollup drift
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

/**
 * X.E (ADR-005 D-6, TASK-032-SPEC-008): `[~]` deferred-notation marker is
 * terminal at the SPEC-root layer ONLY. These cases lock the scope boundary:
 * SPEC-root rows accept `[~]`; TASK DoD rows continue to reject it.
 */

function taskWithDod(
  dod: Array<{ text: string; done: boolean; deferred_rationale?: string }>,
): TaskNote {
  return {
    frontmatter: {
      title: "TASK-001-SPEC-001: Deferred Marker Boundary",
      type: "task",
      permalink: "specs/spec-001-test/tasks/task-001-spec-001-deferred-marker-boundary",
      status: "IN_PROGRESS",
      tags: ["task", "spec-001"],
    },
    objective: "Exercise the TASK DoD terminal predicate.",
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
}

describe("validateSpecDoneClaim — deferred-notation marker (ADR-005 D-6)", () => {
  test("accepts `[~]` deferred marker on a SPEC-root artifact-status row as terminal", () => {
    const result = validateSpecDoneClaim(
      makeSpec({
        artifact_status: [
          { text: "REQ-001: done", done: true, marker: "x" },
          { text: "REQ-012: deferred migration", done: false, marker: "~" },
        ],
      }),
    );
    expect(result.verdict).toBe("PASS");
    expect(result.total).toBe(2);
  });

  test("rejects an equivalent deferred item on a TASK DoD checklist (`[~]` is SPEC-root-scoped)", () => {
    // A `[~]` TASK DoD line parses to done:false with no rationale (the
    // TaskNote schema carries no `marker` field). The TASK validator — a
    // distinct module from the SPEC-root validator — must reject it.
    const result = validateTaskDoneClaim(
      taskWithDod([
        { text: "DoD item 1", done: true },
        { text: "DoD item 2 (would-be `[~]`)", done: false },
      ]),
    );
    expect(result.verdict).toBe("FAIL");
    expect(result.total).toBe(2);
    if (result.verdict !== "FAIL") throw new Error("setup");
    expect(result.unsatisfied).toEqual([{ index: 1, text: "DoD item 2 (would-be `[~]`)" }]);
  });

  test("returns valid (PASS) for a SPEC-007-shaped fixture (post-TASK-031 deferred layout)", async () => {
    // The structured SPEC-007-shaped note mirrors the fixture at
    // tests/fixtures/spec-root-with-deferred.md after the Track 4 amendment:
    // REQ-012, TASK-013, TASK-014 deferred via `[~]`; remainder `[x]`. The
    // .md fixture is the canonical reference; structural assertions below
    // confirm correspondence without depending on the (sibling-owned) parser.
    const spec007Shaped = makeSpec({
      success_criteria: [
        { text: "All schemas implemented", done: true, marker: "x" },
        { text: "Round-trip property test passes", done: true, marker: "x" },
      ],
      artifact_status: [
        { text: "REQ-001-SPEC-007: Schema Common Module", done: true, marker: "x" },
        { text: "REQ-011-SPEC-007: Round-Trip Property Test", done: true, marker: "x" },
        { text: "REQ-012-SPEC-007: PLAN-001 Dogfood Migration", done: false, marker: "~" },
        { text: "TASK-001-SPEC-007: Implement Common Schema Module", done: true, marker: "x" },
        { text: "TASK-013-SPEC-007: Dogfood PLAN-001 Migration", done: false, marker: "~" },
        { text: "TASK-014-SPEC-007: Execute PLAN-001 Migration", done: false, marker: "~" },
      ],
    });
    spec007Shaped.frontmatter.status = "DONE";

    const result = validateSpecDoneClaim(spec007Shaped);
    expect(result.verdict).toBe("PASS");
    expect(result.total).toBe(8);

    // Canonical reference fixture is shaped as expected: legend + `[~]` rows.
    const fixture = await Bun.file(
      new URL("../../../../fixtures/spec-root-with-deferred.md", import.meta.url),
    ).text();
    expect(fixture).toContain("`[~]` = DEFERRED");
    expect(fixture).toContain("- [~] REQ-012-SPEC-007");
    expect(fixture).toContain("- [~] TASK-013-SPEC-007");
    expect(fixture).toContain("- [~] TASK-014-SPEC-007");
  });
});
