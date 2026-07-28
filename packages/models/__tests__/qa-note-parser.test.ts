import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseQaNote } from "@acmelabs/models/parsers/qa-note";

const fixtureDir = join(import.meta.dir, "..", "..", "fixtures");

async function loadFixture(): Promise<string> {
  return Bun.file(join(fixtureDir, "qa-note-sample.md")).text();
}

describe("parseQaNote — canonical fixture", () => {
  test("parses fixture without throwing", async () => {
    const md = await loadFixture();
    const note = parseQaNote(md);
    expect(note.frontmatter.title).toBe("QA-099-SPEC-099: Sample QA Report");
    expect(note.frontmatter.type).toBe("qa");
    expect(note.frontmatter.status).toBe("DONE");
  });

  test("parses Objective prose and structured bullets", async () => {
    const md = await loadFixture();
    const note = parseQaNote(md);
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
    const note = parseQaNote(md);
    expect(note.approach.test_types).toEqual(["Unit", "Integration"]);
    expect(note.approach.environment).toMatch(/Bun/);
    expect(note.approach.data_strategy).toMatch(/Inline fixtures/);
    expect(note.approach.test_file).toBe("tests/sample.test.ts");
  });

  test("parses Summary table", async () => {
    const md = await loadFixture();
    const note = parseQaNote(md);
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
    const note = parseQaNote(md);
    expect(note.test_results).toHaveLength(5);
    expect(note.test_results[0]?.status).toBe("PASS");
    expect(note.test_results[3]?.category).toBe("Integration");
  });

  test("parses Findings section when present", async () => {
    const md = await loadFixture();
    const note = parseQaNote(md);
    expect(note.findings).toBeDefined();
    expect(note.findings).toMatch(/ADR-001 F-1/);
  });

  test("parses Observations and Relations", async () => {
    const md = await loadFixture();
    const note = parseQaNote(md);
    expect(note.observations.length).toBeGreaterThanOrEqual(3);
    expect(note.relations.length).toBeGreaterThanOrEqual(2);
  });
});

describe("parseQaNote — variants", () => {
  test("QA note without Findings section omits findings field", () => {
    const md = `---
title: "QA-100-SPEC-001: No Findings"
type: qa
permalink: qa/qa-100-spec-001-no-findings
status: DONE
tags:
  - qa
  - spec-001
---

# QA-100-SPEC-001: No Findings

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
    const note = parseQaNote(md);
    expect(note.findings).toBeUndefined();
    expect(note.summary.execution_time_ms).toBeUndefined();
  });

  test("derives FAIL verdict when summary.failed > 0", () => {
    const md = `---
title: "QA-101-SPEC-001: Failing"
type: qa
permalink: qa/qa-101-spec-001-failing
status: DONE
tags:
  - qa
  - spec-001
---

# QA-101-SPEC-001: Failing

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
    const note = parseQaNote(md);
    expect(note.summary.verdict).toBe("FAIL");
    expect(note.summary.failed).toBe(1);
    expect(note.test_results.filter((r) => r.status === "FAIL")).toHaveLength(1);
  });

  test("ID derived from title matches QA regex", async () => {
    const md = await loadFixture();
    const note = parseQaNote(md);
    const m = note.frontmatter.title.match(/^(QA-\d{3,}-SPEC-\d{3,}):/);
    expect(m?.[1]).toBe("QA-099-SPEC-099");
  });

  // QA-NNN convention (post-2026-05-21 rename)
  test("parses QA-NNN convention note (type:qa, qa/qa-NNN permalink)", () => {
    const md = `---
title: "QA-200-SPEC-006: Post Rename Sample"
type: qa
permalink: qa/qa-200-spec-006-post-rename-sample
status: DONE
tags:
  - qa
  - spec-006
  - post-rename
---

# QA-200-SPEC-006: Post Rename Sample

## Objective

Sample objective for QA-NNN convention.

## Approach

- **Test Types**: Unit
- **Environment**: Local
- **Data Strategy**: Inline

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 2 | - | - |
| Passed | 2 | - | [PASS] |
| Failed | 0 | 0 | [PASS] |
| Skipped | 0 | - | - |
| Assertions | 2 | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| t1 | Unit | [PASS] | - |
| t2 | Unit | [PASS] | - |

## Observations

- [outcome] all pass #qa
- [fact] qa convention #rename
- [decision] post-rename note #convention

## Relations

- relates_to [[TASK-001-SPEC-006: Test]]
- part_of [[SPEC-006: Test]]
`;
    const note = parseQaNote(md);
    expect(note.frontmatter.title).toBe("QA-200-SPEC-006: Post Rename Sample");
    expect(note.frontmatter.type).toBe("qa");
    expect(note.frontmatter.permalink).toBe("qa/qa-200-spec-006-post-rename-sample");
    expect(note.summary.verdict).toBe("PASS");
  });
});
