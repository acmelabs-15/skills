import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseTestReportNote } from "../src/parsers/test-report-note.js";

const fixtureDir = join(import.meta.dir, "fixtures");

async function loadFixture(): Promise<string> {
  return Bun.file(join(fixtureDir, "test-report-note-sample.md")).text();
}

describe("parseTestReportNote — canonical fixture", () => {
  test("parses fixture without throwing", async () => {
    const md = await loadFixture();
    const note = parseTestReportNote(md);
    expect(note.frontmatter.title).toBe("TEST-REPORT-099-SPEC-099: Sample Test Report");
    expect(note.frontmatter.type).toBe("test-report");
    expect(note.frontmatter.status).toBe("DONE");
  });

  test("parses Objective prose and structured bullets", async () => {
    const md = await loadFixture();
    const note = parseTestReportNote(md);
    expect(note.objective).toMatch(/Verify TASK-099-SPEC-099/);
    expect(note.feature).toMatch(/Sample Feature/);
    expect(note.scope).toMatch(/src\/sample/);
    expect(note.acceptance_criteria_refs).toEqual([
      "ADR-001 F-1",
      "REQ-001-SPEC-099 AC-1",
      "REQ-002-SPEC-099 AC-2",
    ]);
  });

  test("parses Approach bullets into typed fields", async () => {
    const md = await loadFixture();
    const note = parseTestReportNote(md);
    expect(note.approach.test_types).toEqual(["Unit", "Integration"]);
    expect(note.approach.environment).toMatch(/Bun/);
    expect(note.approach.data_strategy).toMatch(/Inline fixtures/);
    expect(note.approach.test_file).toBe("tests/sample.test.ts");
  });

  test("parses Summary table", async () => {
    const md = await loadFixture();
    const note = parseTestReportNote(md);
    expect(note.summary.tests_run).toBe(5);
    expect(note.summary.passed).toBe(5);
    expect(note.summary.failed).toBe(0);
    expect(note.summary.skipped).toBe(0);
    expect(note.summary.assertions).toBe(14);
    expect(note.summary.execution_time_ms).toBe(18);
    expect(note.summary.verdict).toBe("PASS");
  });

  test("parses Test Results by Category table", async () => {
    const md = await loadFixture();
    const note = parseTestReportNote(md);
    expect(note.test_results).toHaveLength(5);
    expect(note.test_results[0]?.status).toBe("PASS");
    expect(note.test_results[3]?.category).toBe("Integration");
  });

  test("parses Findings section when present", async () => {
    const md = await loadFixture();
    const note = parseTestReportNote(md);
    expect(note.findings).toBeDefined();
    expect(note.findings).toMatch(/ADR-001 F-1/);
  });

  test("parses Observations and Relations", async () => {
    const md = await loadFixture();
    const note = parseTestReportNote(md);
    expect(note.observations.length).toBeGreaterThanOrEqual(3);
    expect(note.relations.length).toBeGreaterThanOrEqual(2);
  });
});

describe("parseTestReportNote — variants", () => {
  test("TEST-REPORT without Findings section omits findings field", () => {
    const md = `---
title: "TEST-REPORT-100-SPEC-001: No Findings"
type: test-report
permalink: qa/test-report-100-spec-001-no-findings
status: DONE
tags:
  - test-report
  - spec-001
---

# TEST-REPORT-100-SPEC-001: No Findings

## Objective

Sample objective.

## Approach

- **Test Types**: Unit
- **Environment**: Local
- **Data Strategy**: Inline

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 1 | - | - |
| Passed | 1 | - | [PASS] |
| Failed | 0 | 0 | [PASS] |
| Skipped | 0 | - | - |
| Assertions | 1 | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| t1 | Unit | [PASS] | - |

## Observations

- [outcome] one #a
- [fact] two #b
- [decision] three #c

## Relations

- relates_to [[TASK-001-SPEC-001: Test]]
- part_of [[SPEC-001: Test]]
`;
    const note = parseTestReportNote(md);
    expect(note.findings).toBeUndefined();
    expect(note.summary.execution_time_ms).toBeUndefined();
  });

  test("derives FAIL verdict when summary.failed > 0", () => {
    const md = `---
title: "TEST-REPORT-101-SPEC-001: Failing"
type: test-report
permalink: qa/test-report-101-spec-001-failing
status: DONE
tags:
  - test-report
  - spec-001
---

# TEST-REPORT-101-SPEC-001: Failing

## Objective

Sample.

## Approach

- **Test Types**: Unit
- **Environment**: Local
- **Data Strategy**: Inline

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 3 | - | - |
| Passed | 2 | - | [FAIL] |
| Failed | 1 | 0 | [FAIL] |
| Skipped | 0 | - | - |
| Assertions | 5 | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| t1 | Unit | [PASS] | - |
| t2 | Unit | [PASS] | - |
| t3 | Unit | [FAIL] | broke |

## Observations

- [outcome] one #a
- [fact] two #b
- [decision] three #c

## Relations

- relates_to [[TASK-001-SPEC-001: Test]]
- part_of [[SPEC-001: Test]]
`;
    const note = parseTestReportNote(md);
    expect(note.summary.verdict).toBe("FAIL");
    expect(note.summary.failed).toBe(1);
    expect(note.test_results.filter((r) => r.status === "FAIL")).toHaveLength(1);
  });

  test("ID derived from title matches TEST-REPORT regex", async () => {
    const md = await loadFixture();
    const note = parseTestReportNote(md);
    const m = note.frontmatter.title.match(/^(TEST-REPORT-\d{3,}-SPEC-\d{3,}):/);
    expect(m?.[1]).toBe("TEST-REPORT-099-SPEC-099");
  });
});
