import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseSessionNote } from "../src/parsers/session-note.js";

const fixtureDir = join(import.meta.dir, "fixtures");

describe("parseSessionNote — fixture-based", () => {
  test("parses the canonical session fixture without throwing", async () => {
    const md = await Bun.file(join(fixtureDir, "session-note-sample.md")).text();
    const s = parseSessionNote(md);
    expect(s.frontmatter.title).toBe("SESSION-2026-05-20_05: Sample Session Fixture");
    expect(s.frontmatter.type).toBe("session");
  });

  test("parses 5 events with continuous numbering and correct types", async () => {
    const md = await Bun.file(join(fixtureDir, "session-note-sample.md")).text();
    const s = parseSessionNote(md);
    expect(s.events).toHaveLength(5);
    expect(s.events.map((e) => e.n)).toEqual([1, 2, 3, 4, 5]);
    expect(s.events.map((e) => e.type)).toEqual([
      "session-start",
      "part-transition",
      "agent-dispatch",
      "task-transition",
      "debate-result",
    ]);
  });

  test("parses session-start event fields", async () => {
    const md = await Bun.file(join(fixtureDir, "session-note-sample.md")).text();
    const s = parseSessionNote(md);
    const first = s.events[0];
    if (!first || first.type !== "session-start") throw new Error("setup");
    expect(first.project).toBe("skills");
    expect(first.branch).toBe("feat/plan-001-build-spec-007");
    expect(first.starting_sha).toBe("abc1234");
  });

  test("parses debate-result tally", async () => {
    const md = await Bun.file(join(fixtureDir, "session-note-sample.md")).text();
    const s = parseSessionNote(md);
    const last = s.events[4];
    if (!last || last.type !== "debate-result") throw new Error("setup");
    expect(last.verdict).toBe("PASS");
    expect(last.tally).toEqual({ accept: 5, concerns: 1, block: 0 });
  });

  test("parses bound_plans with worked_parts", async () => {
    const md = await Bun.file(join(fixtureDir, "session-note-sample.md")).text();
    const s = parseSessionNote(md);
    expect(s.bound_plans).toHaveLength(1);
    expect(s.bound_plans[0]?.worked_parts).toEqual(["build.SPEC-007", "decisions.1"]);
  });

  test("observations + relations parse to expected counts", async () => {
    const md = await Bun.file(join(fixtureDir, "session-note-sample.md")).text();
    const s = parseSessionNote(md);
    expect(s.observations).toHaveLength(3);
    expect(s.relations).toHaveLength(2);
  });
});
