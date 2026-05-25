import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseQaNote } from "../src/parsers/qa-note.js";
import { renderQaNote } from "../src/renderers/qa-note.js";
import type { QaNote } from "../src/schemas/qa-note.js";

const fixtureDir = join(import.meta.dir, "fixtures");

async function loadFixture(): Promise<string> {
  return Bun.file(join(fixtureDir, "qa-note-sample.md")).text();
}

function makeNote(): QaNote {
  return {
    frontmatter: {
      title: "QA-001-SPEC-001: Renderer Fixture",
      type: "qa",
      permalink: "qa/qa-001-spec-001-renderer-fixture",
      status: "DONE",
      tags: ["qa", "renderer"],
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

function normalizeNote(note: QaNote): unknown {
  // Strip optional empty differences for semantic comparison: just JSON-compare.
  return JSON.parse(JSON.stringify(note));
}

describe("renderQaNote", () => {
  test("renders frontmatter + H1 + canonical section order", () => {
    const md = renderQaNote(makeNote());
    expect(md).toMatch(/^---\ntitle:/);
    expect(md).toMatch(/^# QA-001-SPEC-001: Renderer Fixture$/m);
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
    const md = renderQaNote(rest as QaNote);
    expect(md).not.toMatch(/## Findings/);
  });

  test("includes Test File bullet when present", () => {
    const md = renderQaNote(makeNote());
    expect(md).toMatch(/\*\*Test File\*\*: `tests\/sample.test.ts`/);
  });

  test("omits Execution Time row when absent", () => {
    const base = makeNote();
    const { execution_time_ms: _u, ...summaryRest } = base.summary;
    void _u;
    const note: QaNote = { ...base, summary: summaryRest as QaNote["summary"] };
    const md = renderQaNote(note);
    expect(md).not.toMatch(/Execution Time/);
  });

  test("renders Status column markers in test_results", () => {
    const md = renderQaNote(makeNote());
    expect(md).toMatch(/\| t1 \| Unit \| \[PASS\] \| happy \|/);
    expect(md).toMatch(/\| t2 \| Unit \| \[PASS\] \| - \|/);
  });
});

describe("renderQaNote round-trip — byte-identical", () => {
  test("parse(fixture) → render === fixture (byte-identical)", async () => {
    const fixture = await loadFixture();
    const parsed = parseQaNote(fixture);
    const rendered = renderQaNote(parsed);
    expect(rendered).toBe(fixture);
  });
});

describe("renderQaNote round-trip — semantic equality", () => {
  test("render(parse(fixture)) re-parses to equivalent model", async () => {
    const md = await loadFixture();
    const parsed1 = parseQaNote(md);
    const rendered = renderQaNote(parsed1);
    const parsed2 = parseQaNote(rendered);
    expect(normalizeNote(parsed2)).toEqual(normalizeNote(parsed1));
  });

  test("synthetic note survives render→parse round-trip", () => {
    const note = makeNote();
    const rendered = renderQaNote(note);
    const reparsed = parseQaNote(rendered);
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
    const note: QaNote = {
      ...rest,
      approach: approachRest as QaNote["approach"],
      summary: summaryRest as QaNote["summary"],
    };
    const rendered = renderQaNote(note);
    const reparsed = parseQaNote(rendered);
    expect(normalizeNote(reparsed)).toEqual(normalizeNote(note));
  });
});
