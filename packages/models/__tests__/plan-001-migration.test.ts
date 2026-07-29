/**
 * TASK-014-SPEC-007 migration acceptance tests.
 *
 * Verifies that the migrated PLAN-001 file satisfies the DoD per REQ-012-SPEC-007 AC:
 * - PlanNoteSchema.parse() passes
 * - SHA-256 round-trip identity holds: sha256(render(parse(migrated))) === sha256(migrated)
 * - Forbidden sections (## Workflow Plan / ## Decision Log / ## Progress Log) absent
 * - Consolidated sections (## Tasks / ## Editor Mirror IDs / ## Pending User Decisions) at top level
 */

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { sha256 } from "@acmelabs/core/core/hash";
import { parsePlanNote } from "@acmelabs/models/parsers/plan-note";
import { renderPlanNote } from "@acmelabs/models/renderers/plan-note";
import { DROPPED_H2_HEADINGS } from "@acmelabs/models/schemas/plan-note";

const PLAN_PATH = join(
  import.meta.dir,
  "..",
  "..",
  "..",
  "docs",
  "planning",
  "PLAN-001-skills-ecosystem.md",
);

// drift-marker: plan-001-trimmed-template-canonical-form — PLAN-001 trimmed-template canonical-form drift
describe("TASK-014-SPEC-007: PLAN-001 trimmed-template migration", () => {
  test("AC#1 — PLAN-001 matches trimmed template structure (no forbidden sections)", async () => {
    const md = await Bun.file(PLAN_PATH).text();
    expect(md).not.toMatch(/^## Workflow Plan$/m);
    expect(md).not.toMatch(/^## Decision Log$/m);
    expect(md).not.toMatch(/^## Progress Log$/m);
    expect(md).not.toMatch(/^## Phase-X/m);
    expect(md).not.toMatch(/^## Risks$/m);
  });

  test("AC#1b — Consolidated sections present at top level", async () => {
    const md = await Bun.file(PLAN_PATH).text();
    expect(md).toMatch(/^## Tasks$/m);
    expect(md).toMatch(/^## Editor Mirror IDs$/m);
    expect(md).toMatch(/^## Pending User Decisions$/m);
    // Tasks table includes Part column per ADR-003 D-6
    expect(md).toMatch(/\| ID \| Subject \| Part \|/);
  });

  test("AC#2 — PlanNoteSchema.parse() passes on migrated PLAN-001", async () => {
    const md = await Bun.file(PLAN_PATH).text();
    const parsed = parsePlanNote(md);
    expect(parsed.frontmatter.title).toBe("PLAN-001: Skills Ecosystem");
    expect(parsed.frontmatter.type).toBe("plan");
  });

  /**
   * Strip an H2 section and its body, so the expectation below can be stated
   * against the source minus exactly what the renderer no longer emits.
   */
  function stripH2(markdown: string, heading: string): string {
    const lines = markdown.split("\n");
    const start = lines.findIndex((line) => line === `## ${heading}`);
    if (start < 0) return markdown;
    let end = start + 1;
    while (end < lines.length && !lines[end]?.startsWith("## ")) end++;
    lines.splice(start, end - start);
    return lines.join("\n");
  }

  test("AC#3 — round-trip identity holds, modulo the two deliberately dropped sections", async () => {
    // AMENDED with owner approval 2026-07-29. Progress Dashboard and Cross-Part
    // Dependency Graph are no longer part of a plan note (DROPPED_H2_HEADINGS), so
    // byte-identity against the raw source can no longer hold — this file still
    // carries both. The check is not weakened: it is stated against the source
    // minus precisely those two sections, so any OTHER difference still fails.
    // Measured at the time of amendment: the sole delta was those two sections,
    // 89 lines, with no reordering or reformatting anywhere else.
    const md = await Bun.file(PLAN_PATH).text();
    const parsed = parsePlanNote(md);
    const rendered = renderPlanNote(parsed);

    let expected = md;
    for (const heading of DROPPED_H2_HEADINGS) expected = stripH2(expected, heading);

    expect(sha256(rendered)).toBe(sha256(expected));
  });

  test("AC#3b — the two dropped sections are absent from rendered output", async () => {
    // The drop is a decision, so it gets an assertion of its own rather than
    // riding on AC#3's hash. Without this, re-adding either section to the
    // renderer would only surface as an opaque hash mismatch.
    const md = await Bun.file(PLAN_PATH).text();
    const rendered = renderPlanNote(parsePlanNote(md));
    expect(rendered).not.toMatch(/^## Progress Dashboard$/m);
    expect(rendered).not.toMatch(/^## Cross-Part Dependency Graph$/m);
    // Both are present in the source, so this proves removal rather than absence.
    expect(md).toMatch(/^## Progress Dashboard$/m);
    expect(md).toMatch(/^## Cross-Part Dependency Graph$/m);
  });

  test("AC#4 — Critical state preserved: build.SPEC-001 DONE; build_workflow_items present", async () => {
    const md = await Bun.file(PLAN_PATH).text();
    const parsed = parsePlanNote(md);
    const buildSpec001 = parsed.parts.find((p) => p.id === "build.SPEC-001");
    expect(buildSpec001).toBeDefined();
    expect(buildSpec001?.substatus).toBe("DONE");
    expect(buildSpec001?.build_workflow_items?.length).toBeGreaterThanOrEqual(18);
    // Earlier-phase parts are DONE
    const research = parsed.parts.find((p) => p.id === "research");
    expect(research?.substatus).toBe("DONE");
    const decisions1 = parsed.parts.find((p) => p.id === "decisions.1");
    expect(decisions1?.substatus).toBe("DONE");
  });
});
