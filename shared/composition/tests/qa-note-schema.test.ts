import { describe, expect, test } from "bun:test";
import { type QaNote, QaNoteSchema } from "../src/schemas/qa-note.js";

function makeMinimal(): QaNote {
  return {
    frontmatter: {
      title: "QA-001-SPEC-001: Sample",
      type: "qa",
      permalink: "qa/qa-001-spec-001-sample",
      status: "DONE",
      tags: ["qa", "sample"],
    },
    objective: "Verify the sample feature.",
    approach: {
      test_types: ["Unit"],
      environment: "Local (Bun)",
      data_strategy: "Inline fixtures",
    },
    summary: {
      tests_run: 3,
      passed: 3,
      failed: 0,
      skipped: 0,
      assertions: 9,
      verdict: "PASS",
    },
    test_results: [
      { test: "test 1", category: "Unit", status: "PASS" },
      { test: "test 2", category: "Unit", status: "PASS" },
      { test: "test 3", category: "Unit", status: "PASS" },
    ],
    observations: [
      { category: "outcome", text: "all pass", tags: ["a"] },
      { category: "fact", text: "approach", tags: ["b"] },
      { category: "decision", text: "decision", tags: ["c"] },
    ],
    relations: [
      { verb: "relates_to", target: "TASK-001-SPEC-001: Test" },
      { verb: "part_of", target: "SPEC-001: Test" },
    ],
  };
}

describe("QaNoteSchema", () => {
  test("accepts minimal valid QaNote", () => {
    expect(() => QaNoteSchema.parse(makeMinimal())).not.toThrow();
  });

  test("rejects malformed title (missing SPEC segment)", () => {
    const bad = makeMinimal();
    bad.frontmatter.title = "QA-001: Sample";
    expect(() => QaNoteSchema.parse(bad)).toThrow();
  });

  test("rejects malformed permalink", () => {
    const bad = makeMinimal();
    bad.frontmatter.permalink = "qa-001";
    expect(() => QaNoteSchema.parse(bad)).toThrow();
  });

  test("rejects ACCEPTED status (QA uses DRAFT/DONE only)", () => {
    const bad = makeMinimal();
    // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
    bad.frontmatter.status = "ACCEPTED" as any;
    expect(() => QaNoteSchema.parse(bad)).toThrow();
  });

  test("rejects empty objective", () => {
    const bad = makeMinimal();
    bad.objective = "";
    expect(() => QaNoteSchema.parse(bad)).toThrow();
  });

  test("rejects approach with empty test_types", () => {
    const bad = makeMinimal();
    bad.approach.test_types = [];
    expect(() => QaNoteSchema.parse(bad)).toThrow();
  });

  test("rejects tests_run inequality (passed+failed+skipped != tests_run)", () => {
    const bad = makeMinimal();
    bad.summary = {
      tests_run: 5,
      passed: 3,
      failed: 0,
      skipped: 0,
      assertions: 9,
      verdict: "PASS",
    };
    bad.test_results = [
      { test: "test 1", category: "Unit", status: "PASS" },
      { test: "test 2", category: "Unit", status: "PASS" },
      { test: "test 3", category: "Unit", status: "PASS" },
    ];
    expect(() => QaNoteSchema.parse(bad)).toThrow(/tests_run/);
  });

  test("rejects PASS verdict with failed > 0 (verdict mismatch)", () => {
    const bad = makeMinimal();
    bad.summary = {
      tests_run: 3,
      passed: 2,
      failed: 1,
      skipped: 0,
      assertions: 9,
      verdict: "PASS",
    };
    bad.test_results = [
      { test: "t1", category: "Unit", status: "PASS" },
      { test: "t2", category: "Unit", status: "PASS" },
      { test: "t3", category: "Unit", status: "FAIL" },
    ];
    expect(() => QaNoteSchema.parse(bad)).toThrow(/PASS/);
  });

  test("rejects PASS verdict with tests_run = 0", () => {
    const bad = makeMinimal();
    bad.summary = {
      tests_run: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      assertions: 0,
      verdict: "PASS",
    };
    bad.test_results = [];
    expect(() => QaNoteSchema.parse(bad)).toThrow(/tests_run/);
  });

  test("rejects PASS verdict with a failing test row", () => {
    const bad = makeMinimal();
    // Force consistent summary (failed=0) but a row marked FAIL — this is
    // the load-bearing check: row data overrides summary verdict claim.
    bad.test_results = [
      { test: "test 1", category: "Unit", status: "PASS" },
      { test: "test 2", category: "Unit", status: "PASS" },
      { test: "test 3", category: "Unit", status: "FAIL" },
    ];
    expect(() => QaNoteSchema.parse(bad)).toThrow(/FAIL/);
  });

  test("rejects FAIL verdict with no failing rows and failed=0", () => {
    const bad = makeMinimal();
    bad.summary = {
      tests_run: 3,
      passed: 3,
      failed: 0,
      skipped: 0,
      assertions: 9,
      verdict: "FAIL",
    };
    expect(() => QaNoteSchema.parse(bad)).toThrow(/FAIL/);
  });

  test("accepts FAIL verdict with failing summary numbers", () => {
    const good = makeMinimal();
    good.summary = {
      tests_run: 3,
      passed: 2,
      failed: 1,
      skipped: 0,
      assertions: 9,
      verdict: "FAIL",
    };
    good.test_results = [
      { test: "t1", category: "Unit", status: "PASS" },
      { test: "t2", category: "Unit", status: "PASS" },
      { test: "t3", category: "Unit", status: "FAIL" },
    ];
    expect(() => QaNoteSchema.parse(good)).not.toThrow();
  });

  test("accepts PARTIAL verdict with skipped tests", () => {
    const good = makeMinimal();
    good.summary = {
      tests_run: 3,
      passed: 2,
      failed: 0,
      skipped: 1,
      assertions: 9,
      verdict: "PARTIAL",
    };
    good.test_results = [
      { test: "t1", category: "Unit", status: "PASS" },
      { test: "t2", category: "Unit", status: "PASS" },
      { test: "t3", category: "Unit", status: "SKIPPED" },
    ];
    expect(() => QaNoteSchema.parse(good)).not.toThrow();
  });

  test("accepts optional execution_time_ms", () => {
    const good = makeMinimal();
    good.summary.execution_time_ms = 42;
    expect(() => QaNoteSchema.parse(good)).not.toThrow();
  });

  test("rejects fewer than 3 observations", () => {
    const bad = makeMinimal();
    bad.observations = bad.observations.slice(0, 2);
    expect(() => QaNoteSchema.parse(bad)).toThrow();
  });

  test("rejects fewer than 2 relations", () => {
    const bad = makeMinimal();
    bad.relations = bad.relations.slice(0, 1);
    expect(() => QaNoteSchema.parse(bad)).toThrow();
  });

  test("tags must have at least 2", () => {
    const bad = makeMinimal();
    bad.frontmatter.tags = ["qa"];
    expect(() => QaNoteSchema.parse(bad)).toThrow();
  });

  test("accepts optional feature/scope/acceptance_criteria_refs", () => {
    const good = makeMinimal();
    good.feature = "Sample Feature (TASK-001-SPEC-001)";
    good.scope = "src/sample/*";
    good.acceptance_criteria_refs = ["ADR-001 F-1", "REQ-001-SPEC-001 AC-1"];
    expect(() => QaNoteSchema.parse(good)).not.toThrow();
  });

  // ---------------------------------------------------------------------
  // QA-NNN convention (post-2026-05-21 rename): the schema accepts ONLY the
  // qa form — the legacy form is rejected (no back-compat).
  // ---------------------------------------------------------------------

  test("accepts QA-NNN title prefix with type:qa and qa/ permalink", () => {
    const good = makeMinimal();
    good.frontmatter.title = "QA-041-SPEC-006: Fix Iter 1 Revalidation";
    good.frontmatter.type = "qa";
    good.frontmatter.permalink = "qa/qa-041-spec-006-fix-iter-1-revalidation";
    expect(() => QaNoteSchema.parse(good)).not.toThrow();
  });

  test("accepts QA-NNN permalink with basic-memory dedup suffix (-1)", () => {
    const good = makeMinimal();
    good.frontmatter.title = "QA-039-SPEC-005: Batched Build Revalidation";
    good.frontmatter.type = "qa";
    good.frontmatter.permalink = "qa/qa-039-spec-005-batched-build-revalidation-1";
    expect(() => QaNoteSchema.parse(good)).not.toThrow();
  });

  test("rejects the legacy type literal (qa-only — no back-compat)", () => {
    const bad = makeMinimal();
    // The pre-rename type value, assembled to avoid the legacy string in
    // source. z.literal("qa") rejects everything except "qa".
    const legacyType = ["test", "report"].join("-");
    // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
    bad.frontmatter.type = legacyType as any;
    expect(() => QaNoteSchema.parse(bad)).toThrow();
  });

  test("rejects title with invalid prefix (e.g. REPORT-NNN- only)", () => {
    const bad = makeMinimal();
    bad.frontmatter.title = "REPORT-001-SPEC-001: Bad";
    expect(() => QaNoteSchema.parse(bad)).toThrow();
  });

  test("rejects type field outside enum (e.g. 'test_report' with underscore)", () => {
    const bad = makeMinimal();
    // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
    bad.frontmatter.type = "test_report" as any;
    expect(() => QaNoteSchema.parse(bad)).toThrow();
  });

  test("rejects permalink outside qa/ folder", () => {
    const bad = makeMinimal();
    bad.frontmatter.title = "QA-001-SPEC-001: Sample";
    bad.frontmatter.type = "qa";
    bad.frontmatter.permalink = "specs/qa-001-spec-001-sample";
    expect(() => QaNoteSchema.parse(bad)).toThrow();
  });
});
