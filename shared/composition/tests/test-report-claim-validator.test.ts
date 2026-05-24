import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseTestReportNote } from "../src/parsers/test-report-note.js";
import type { TestReportNote, TestReportVerdict } from "../src/schemas/test-report-note.js";
import { validateTestReportPassClaim } from "../src/validators/test-report-claim-validator.js";

const fixtureDir = join(import.meta.dir, "fixtures");

function makeReport(
  overrides: {
    verdict?: TestReportVerdict;
    failed?: number;
    skipped?: number;
    tests_run?: number;
    passed?: number;
    failingRows?: number;
  } = {},
): TestReportNote {
  const failed = overrides.failed ?? 0;
  const skipped = overrides.skipped ?? 0;
  const passed = overrides.passed ?? 3;
  const tests_run = overrides.tests_run ?? passed + failed + skipped;
  const verdict = overrides.verdict ?? (failed === 0 && tests_run > 0 ? "PASS" : "FAIL");
  const failingRows = overrides.failingRows ?? failed;

  const test_results: TestReportNote["test_results"] = [];
  for (let i = 0; i < passed; i++) {
    test_results.push({ test: `pass-${i}`, category: "Unit", status: "PASS" });
  }
  for (let i = 0; i < failingRows; i++) {
    test_results.push({ test: `fail-${i}`, category: "Unit", status: "FAIL" });
  }
  for (let i = 0; i < skipped; i++) {
    test_results.push({ test: `skip-${i}`, category: "Unit", status: "SKIPPED" });
  }

  return {
    frontmatter: {
      title: "TEST-REPORT-001-SPEC-001: Validator Fixture",
      type: "test-report",
      permalink: "qa/test-report-001-spec-001-validator-fixture",
      status: "DONE",
      tags: ["test-report", "validator"],
    },
    objective: "Sample.",
    approach: {
      test_types: ["Unit"],
      environment: "Local",
      data_strategy: "Inline",
    },
    summary: {
      tests_run,
      passed,
      failed,
      skipped,
      assertions: tests_run * 2,
      verdict,
    },
    test_results,
    observations: [
      { category: "outcome", text: "o1", tags: ["a"] },
      { category: "fact", text: "o2", tags: ["b"] },
      { category: "decision", text: "o3", tags: ["c"] },
    ],
    relations: [
      { verb: "relates_to", target: "TASK-001-SPEC-001: Test" },
      { verb: "part_of", target: "SPEC-001: Test" },
    ],
  };
}

describe("validateTestReportPassClaim", () => {
  test("PASS when declared PASS and data matches", () => {
    const report = makeReport({ verdict: "PASS", passed: 3, failed: 0 });
    const result = validateTestReportPassClaim(report);
    expect(result.verdict).toBe("PASS");
    expect(result.total).toBe(3);
  });

  test("FAIL when declared FAIL with failing rows", () => {
    const report = makeReport({ verdict: "FAIL", passed: 2, failed: 1, failingRows: 1 });
    const result = validateTestReportPassClaim(report);
    if (result.verdict !== "FAIL") throw new Error("setup");
    expect(result.unsatisfied).toHaveLength(1);
    expect(result.unsatisfied[0]?.text).toMatch(/fail-0/);
  });

  test("FAIL when verdict declared PARTIAL", () => {
    const report = makeReport({ verdict: "PARTIAL", passed: 2, skipped: 1 });
    const result = validateTestReportPassClaim(report);
    if (result.verdict !== "FAIL") throw new Error("setup");
    expect(result.unsatisfied[0]?.text).toMatch(/PARTIAL/);
  });

  test("round-trips through parser on canonical fixture (PASS)", async () => {
    const md = await Bun.file(join(fixtureDir, "test-report-note-sample.md")).text();
    const note = parseTestReportNote(md);
    const result = validateTestReportPassClaim(note);
    expect(result.verdict).toBe("PASS");
    expect(result.total).toBe(5);
  });

  test("total reflects tests_run", () => {
    const report = makeReport({ verdict: "FAIL", passed: 5, failed: 2, failingRows: 2 });
    const result = validateTestReportPassClaim(report);
    expect(result.total).toBe(7);
  });

  test("multiple failing rows enumerated", () => {
    const report = makeReport({ verdict: "FAIL", passed: 1, failed: 3, failingRows: 3 });
    const result = validateTestReportPassClaim(report);
    if (result.verdict !== "FAIL") throw new Error("setup");
    expect(result.unsatisfied).toHaveLength(3);
    expect(result.unsatisfied[0]?.text).toMatch(/fail-0/);
    expect(result.unsatisfied[2]?.text).toMatch(/fail-2/);
  });
});
