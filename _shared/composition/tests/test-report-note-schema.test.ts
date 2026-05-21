import { describe, expect, test } from "bun:test";
import { type TestReportNote, TestReportNoteSchema } from "../src/schemas/test-report-note.js";

function makeMinimal(): TestReportNote {
  return {
    frontmatter: {
      title: "TEST-REPORT-001-SPEC-001: Sample",
      type: "test-report",
      permalink: "qa/test-report-001-spec-001-sample",
      status: "DONE",
      tags: ["test-report", "sample"],
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

describe("TestReportNoteSchema", () => {
  test("accepts minimal valid TestReportNote", () => {
    expect(() => TestReportNoteSchema.parse(makeMinimal())).not.toThrow();
  });

  test("rejects malformed title (missing SPEC segment)", () => {
    const bad = makeMinimal();
    bad.frontmatter.title = "TEST-REPORT-001: Sample";
    expect(() => TestReportNoteSchema.parse(bad)).toThrow();
  });

  test("rejects malformed permalink", () => {
    const bad = makeMinimal();
    bad.frontmatter.permalink = "test-report-001";
    expect(() => TestReportNoteSchema.parse(bad)).toThrow();
  });

  test("rejects ACCEPTED status (TEST-REPORT uses DRAFT/DONE only)", () => {
    const bad = makeMinimal();
    // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
    bad.frontmatter.status = "ACCEPTED" as any;
    expect(() => TestReportNoteSchema.parse(bad)).toThrow();
  });

  test("rejects empty objective", () => {
    const bad = makeMinimal();
    bad.objective = "";
    expect(() => TestReportNoteSchema.parse(bad)).toThrow();
  });

  test("rejects approach with empty test_types", () => {
    const bad = makeMinimal();
    bad.approach.test_types = [];
    expect(() => TestReportNoteSchema.parse(bad)).toThrow();
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
    expect(() => TestReportNoteSchema.parse(bad)).toThrow(/tests_run/);
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
    expect(() => TestReportNoteSchema.parse(bad)).toThrow(/PASS/);
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
    expect(() => TestReportNoteSchema.parse(bad)).toThrow(/tests_run/);
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
    expect(() => TestReportNoteSchema.parse(bad)).toThrow(/FAIL/);
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
    expect(() => TestReportNoteSchema.parse(bad)).toThrow(/FAIL/);
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
    expect(() => TestReportNoteSchema.parse(good)).not.toThrow();
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
    expect(() => TestReportNoteSchema.parse(good)).not.toThrow();
  });

  test("accepts optional execution_time_ms", () => {
    const good = makeMinimal();
    good.summary.execution_time_ms = 42;
    expect(() => TestReportNoteSchema.parse(good)).not.toThrow();
  });

  test("rejects fewer than 3 observations", () => {
    const bad = makeMinimal();
    bad.observations = bad.observations.slice(0, 2);
    expect(() => TestReportNoteSchema.parse(bad)).toThrow();
  });

  test("rejects fewer than 2 relations", () => {
    const bad = makeMinimal();
    bad.relations = bad.relations.slice(0, 1);
    expect(() => TestReportNoteSchema.parse(bad)).toThrow();
  });

  test("tags must have at least 2", () => {
    const bad = makeMinimal();
    bad.frontmatter.tags = ["test-report"];
    expect(() => TestReportNoteSchema.parse(bad)).toThrow();
  });

  test("accepts optional feature/scope/acceptance_criteria_refs", () => {
    const good = makeMinimal();
    good.feature = "Sample Feature (TASK-001-SPEC-001)";
    good.scope = "src/sample/*";
    good.acceptance_criteria_refs = ["ADR-001 F-1", "REQ-001-SPEC-001 AC-1"];
    expect(() => TestReportNoteSchema.parse(good)).not.toThrow();
  });

  // ---------------------------------------------------------------------
  // QA-NNN convention (post-2026-05-21 rename: test-report → qa)
  // Schema must accept the new canonical form while retaining backward
  // compatibility with legacy TEST-REPORT-NNN notes.
  // ---------------------------------------------------------------------

  test("accepts QA-NNN title prefix with type:qa and qa/ permalink", () => {
    const good = makeMinimal();
    good.frontmatter.title = "QA-041-SPEC-006: Fix Iter 1 Revalidation";
    good.frontmatter.type = "qa";
    good.frontmatter.permalink = "qa/qa-041-spec-006-fix-iter-1-revalidation";
    expect(() => TestReportNoteSchema.parse(good)).not.toThrow();
  });

  test("accepts QA-NNN permalink with basic-memory dedup suffix (-1)", () => {
    const good = makeMinimal();
    good.frontmatter.title = "QA-039-SPEC-005: Batched Build Revalidation";
    good.frontmatter.type = "qa";
    good.frontmatter.permalink = "qa/qa-039-spec-005-batched-build-revalidation-1";
    expect(() => TestReportNoteSchema.parse(good)).not.toThrow();
  });

  test("accepts mixed: QA title + legacy test-report type + qa permalink", () => {
    // Real-world migration scenario: title flipped to QA but type field
    // not yet updated — should pass since both type values are valid.
    const good = makeMinimal();
    good.frontmatter.title = "QA-100-SPEC-001: Migration Mix";
    good.frontmatter.type = "test-report";
    good.frontmatter.permalink = "qa/qa-100-spec-001-migration-mix";
    expect(() => TestReportNoteSchema.parse(good)).not.toThrow();
  });

  test("rejects title with invalid prefix (e.g. REPORT-NNN- only)", () => {
    const bad = makeMinimal();
    bad.frontmatter.title = "REPORT-001-SPEC-001: Bad";
    expect(() => TestReportNoteSchema.parse(bad)).toThrow();
  });

  test("rejects type field outside enum (e.g. 'test_report' with underscore)", () => {
    const bad = makeMinimal();
    // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
    bad.frontmatter.type = "test_report" as any;
    expect(() => TestReportNoteSchema.parse(bad)).toThrow();
  });

  test("rejects permalink outside qa/ folder", () => {
    const bad = makeMinimal();
    bad.frontmatter.title = "QA-001-SPEC-001: Sample";
    bad.frontmatter.type = "qa";
    bad.frontmatter.permalink = "test-report/qa-001-spec-001-sample";
    expect(() => TestReportNoteSchema.parse(bad)).toThrow();
  });
});
