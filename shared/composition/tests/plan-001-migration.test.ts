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
import { sha256 } from "../src/core/hash.js";
import { parsePlanNote } from "../src/parsers/plan-note.js";
import { renderPlanNote } from "../src/renderers/plan-note.js";

const PLAN_PATH = join(
  import.meta.dir,
  "..",
  "..",
  "..",
  "docs",
  "planning",
  "PLAN-001-skills-ecosystem.md",
);

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

  test("AC#3 — SHA-256 round-trip identity holds on migrated PLAN-001", async () => {
    const md = await Bun.file(PLAN_PATH).text();
    const parsed = parsePlanNote(md);
    const rendered = renderPlanNote(parsed);
    expect(sha256(rendered)).toBe(sha256(md));
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
