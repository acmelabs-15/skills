import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parsePlanNote } from "@acmelabs/models/parsers/plan-note";

const fixtureDir = join(import.meta.dir, "..", "..", "fixtures");

describe("parsePlanNote — fixture-based", () => {
  test("parses the canonical sample fixture without throwing", async () => {
    const md = await Bun.file(join(fixtureDir, "plan-note-sample.md")).text();
    const plan = parsePlanNote(md);
    expect(plan.frontmatter.title).toBe("PLAN-001: Sample Render Fixture");
    expect(plan.frontmatter.type).toBe("plan");
    expect(plan.frontmatter.status).toBe("IN_PROGRESS");
  });

  test("parses 3 parts and 2 tasks", async () => {
    const md = await Bun.file(join(fixtureDir, "plan-note-sample.md")).text();
    const plan = parsePlanNote(md);
    expect(plan.parts).toHaveLength(3);
    expect(plan.parts.map((p) => p.id)).toEqual(["research", "decisions.1", "build.SPEC-007"]);
    expect(plan.tasks).toHaveLength(2);
  });

  test("preserves DoD checkbox state", async () => {
    const md = await Bun.file(join(fixtureDir, "plan-note-sample.md")).text();
    const plan = parsePlanNote(md);
    const buildPart = plan.parts.find((p) => p.id === "build.SPEC-007");
    expect(buildPart).toBeDefined();
    if (!buildPart) throw new Error("setup");
    expect(buildPart.dod).toHaveLength(2);
    expect(buildPart.dod[0]?.done).toBe(false);
  });

  test("preserves decisions table on decisions.1 part", async () => {
    const md = await Bun.file(join(fixtureDir, "plan-note-sample.md")).text();
    const plan = parsePlanNote(md);
    const dec = plan.parts.find((p) => p.id === "decisions.1");
    if (!dec) throw new Error("setup");
    expect(dec.decisions).toBeDefined();
    expect(dec.decisions).toHaveLength(2);
    expect(dec.decisions?.[0]?.id).toBe("D-1");
  });

  test("preserves pending decisions and editor mirror IDs", async () => {
    const md = await Bun.file(join(fixtureDir, "plan-note-sample.md")).text();
    const plan = parsePlanNote(md);
    expect(plan.pending_decisions).toHaveLength(1);
    expect(plan.pending_decisions[0]?.id).toBe("PUD-001");
    expect(plan.editor_mirror).toHaveLength(2);
    expect(plan.editor_mirror[0]?.task_id).toBe("T-01");
    expect(plan.editor_mirror[0]?.cc_id).toBe("cc-123");
  });

  test("observations and relations parse with expected counts", async () => {
    const md = await Bun.file(join(fixtureDir, "plan-note-sample.md")).text();
    const plan = parsePlanNote(md);
    expect(plan.observations).toHaveLength(3);
    expect(plan.relations).toHaveLength(3);
    expect(plan.observations[0]?.category).toBe("decision");
  });
});
