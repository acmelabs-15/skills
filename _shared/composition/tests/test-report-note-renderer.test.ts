import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseTestReportNote } from "../src/parsers/test-report-note.js";
import { renderTestReportNote } from "../src/renderers/test-report-note.js";
import type { TestReportNote } from "../src/schemas/test-report-note.js";

const fixtureDir = join(import.meta.dir, "fixtures");

async function loadFixture(): Promise<string> {
  return Bun.file(join(fixtureDir, "test-report-note-sample.md")).text();
}

function makeNote(): TestReportNote {
  return {
    frontmatter: {
      title: "TEST-REPORT-001-SPEC-001: Renderer Fixture",
      type: "test-report",
      permalink: "qa/test-report-001-spec-001-renderer-fixture",
      status: "DONE",
      tags: ["test-report", "renderer"],
    },
    objective: "Sample objective.",
    feature: "Sample Feature",
    scope: "src/sample",
    acceptance_criteria_refs: ["ADR-001 F-1"],
    approach: {
      test_types: ["Unit", "Integration"],
      environment: "Local",
      data_strategy: "Inline",
      test_file: "tests/sample.test.ts",
    },
    summary: {
      tests_run: 3,
      passed: 3,
      failed: 0,
      skipped: 0,
      assertions: 9,
      execution_time_ms: 12,
      verdict: "PASS",
    },
    test_results: [
      { test: "t1", category: "Unit", status: "PASS", notes: "happy" },
      { test: "t2", category: "Unit", status: "PASS" },
      { test: "t3", category: "Integration", status: "PASS" },
    ],
    findings: "All compliance honored.",
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

function normalizeNote(note: TestReportNote): unknown {
  // Strip optional empty differences for semantic comparison: just JSON-compare.
  return JSON.parse(JSON.stringify(note));
}

describe("renderTestReportNote", () => {
  test("renders frontmatter + H1 + canonical section order", () => {
    const md = renderTestReportNote(makeNote());
    expect(md).toMatch(/^---\ntitle:/);
    expect(md).toMatch(/^# TEST-REPORT-001-SPEC-001: Renderer Fixture$/m);
    // Sections must appear in order: Objective → Approach → Results → Findings → Observations → Relations
    const idxObjective = md.indexOf("## Objective");
    const idxApproach = md.indexOf("## Approach");
    const idxResults = md.indexOf("## Results");
    const idxFindings = md.indexOf("## Findings");
    const idxObs = md.indexOf("## Observations");
    const idxRel = md.indexOf("## Relations");
    expect(idxObjective).toBeGreaterThan(0);
    expect(idxApproach).toBeGreaterThan(idxObjective);
    expect(idxResults).toBeGreaterThan(idxApproach);
    expect(idxFindings).toBeGreaterThan(idxResults);
    expect(idxObs).toBeGreaterThan(idxFindings);
    expect(idxRel).toBeGreaterThan(idxObs);
  });

  test("omits Findings section when absent", () => {
    const base = makeNote();
    const { findings: _unused, ...rest } = base;
    void _unused;
    const md = renderTestReportNote(rest as TestReportNote);
    expect(md).not.toMatch(/## Findings/);
  });

  test("includes Test File bullet when present", () => {
    const md = renderTestReportNote(makeNote());
    expect(md).toMatch(/\*\*Test File\*\*: `tests\/sample.test.ts`/);
  });

  test("omits Execution Time row when absent", () => {
    const base = makeNote();
    const { execution_time_ms: _u, ...summaryRest } = base.summary;
    void _u;
    const note: TestReportNote = { ...base, summary: summaryRest as TestReportNote["summary"] };
    const md = renderTestReportNote(note);
    expect(md).not.toMatch(/Execution Time/);
  });

  test("renders Status column markers in test_results", () => {
    const md = renderTestReportNote(makeNote());
    expect(md).toMatch(/\| t1 \| Unit \| \[PASS\] \| happy \|/);
    expect(md).toMatch(/\| t2 \| Unit \| \[PASS\] \| - \|/);
  });
});

describe("renderTestReportNote round-trip — semantic equality", () => {
  test("render(parse(fixture)) re-parses to equivalent model", async () => {
    const md = await loadFixture();
    const parsed1 = parseTestReportNote(md);
    const rendered = renderTestReportNote(parsed1);
    const parsed2 = parseTestReportNote(rendered);
    expect(normalizeNote(parsed2)).toEqual(normalizeNote(parsed1));
  });

  test("synthetic note survives render→parse round-trip", () => {
    const note = makeNote();
    const rendered = renderTestReportNote(note);
    const reparsed = parseTestReportNote(rendered);
    expect(normalizeNote(reparsed)).toEqual(normalizeNote(note));
  });

  test("note without optional fields survives round-trip", () => {
    const base = makeNote();
    const { feature: _f, scope: _s, acceptance_criteria_refs: _ac, findings: _fi, ...rest } = base;
    void _f;
    void _s;
    void _ac;
    void _fi;
    const { test_file: _tf, ...approachRest } = rest.approach;
    void _tf;
    const { execution_time_ms: _e, ...summaryRest } = rest.summary;
    void _e;
    const note: TestReportNote = {
      ...rest,
      approach: approachRest as TestReportNote["approach"],
      summary: summaryRest as TestReportNote["summary"],
    };
    const rendered = renderTestReportNote(note);
    const reparsed = parseTestReportNote(rendered);
    expect(normalizeNote(reparsed)).toEqual(normalizeNote(note));
  });
});
