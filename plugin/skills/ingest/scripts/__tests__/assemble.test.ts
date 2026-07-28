import { describe, expect, test } from "bun:test";
import { assembleNote, buildPermalink, buildTitle } from "../assemble.ts";
import { parseSource } from "../parse.ts";

const SOURCE = `# My Topic

This paragraph is long enough to qualify as an observation candidate and exceeds twenty chars.

Another paragraph that is also long enough for the heuristic to pick.

A third standalone paragraph for the heuristic to pick from the source content nicely.
`;

describe("assembleNote (brain path)", () => {
  test("produces frontmatter with title + type + status + permalink", () => {
    const parsed = parseSource(SOURCE);
    const note = assembleNote(parsed, {
      type: "analysis",
      counter: 12,
      descriptor: "My Topic",
      folder: "docs/analysis",
      filename: "ANALYSIS-012-my-topic.md",
    });
    expect(note.title).toBe("ANALYSIS-012: My Topic");
    expect(note.text).toContain("title: 'ANALYSIS-012: My Topic'");
    expect(note.text).toContain("type: analysis");
    expect(note.text).toContain("status: DRAFT");
    expect(note.text).toContain("permalink: analysis/analysis-012-my-topic");
  });

  test("emits H1 matching frontmatter title", () => {
    const parsed = parseSource(SOURCE);
    const note = assembleNote(parsed, {
      type: "analysis",
      counter: 1,
      descriptor: "Foo",
      folder: "docs/analysis",
      filename: "ANALYSIS-001-foo.md",
    });
    expect(note.text).toContain("# ANALYSIS-001: Foo");
  });

  test("preserves source body content verbatim", () => {
    const parsed = parseSource(SOURCE);
    const note = assembleNote(parsed, {
      type: "analysis",
      counter: 1,
      descriptor: "Foo",
      folder: "docs/analysis",
      filename: "ANALYSIS-001-foo.md",
    });
    expect(note.text).toContain(
      "This paragraph is long enough to qualify as an observation candidate",
    );
  });

  test("generates at least 3 observations when source has none", () => {
    const parsed = parseSource(SOURCE);
    const note = assembleNote(parsed, {
      type: "analysis",
      counter: 1,
      descriptor: "Foo",
      folder: "docs/analysis",
      filename: "ANALYSIS-001-foo.md",
    });
    const obs = note.text.match(/^- \[[a-z-]+\]/gim) ?? [];
    expect(obs.length).toBeGreaterThanOrEqual(3);
  });

  test("generates at least 2 relations when source has none", () => {
    const parsed = parseSource(SOURCE);
    const note = assembleNote(parsed, {
      type: "analysis",
      counter: 1,
      descriptor: "Foo",
      folder: "docs/analysis",
      filename: "ANALYSIS-001-foo.md",
    });
    const relSec = note.text.split("## Relations")[1] ?? "";
    const rels = relSec.match(/^- \S/gm) ?? [];
    expect(rels.length).toBeGreaterThanOrEqual(2);
  });

  test("Observations and Relations are the final two sections", () => {
    const parsed = parseSource(SOURCE);
    const note = assembleNote(parsed, {
      type: "analysis",
      counter: 1,
      descriptor: "Foo",
      folder: "docs/analysis",
      filename: "ANALYSIS-001-foo.md",
    });
    const obsIdx = note.text.indexOf("## Observations");
    const relIdx = note.text.indexOf("## Relations");
    expect(obsIdx).toBeGreaterThan(0);
    expect(relIdx).toBeGreaterThan(obsIdx);
    const afterRel = note.text.slice(relIdx + "## Relations".length);
    expect(/^## /m.test(afterRel)).toBe(false);
  });

  test("emits part_of relation when parentSpec supplied", () => {
    const parsed = parseSource("# Task X\n\nbody\n");
    const note = assembleNote(parsed, {
      type: "task",
      counter: 5,
      descriptor: "Task X",
      parentSpec: "SPEC-001-foo",
      folder: "docs/specs/SPEC-001-foo/tasks",
      filename: "TASK-005-SPEC-001-task-x.md",
    });
    expect(note.text).toContain("part_of [[SPEC-001: foo]]");
    expect(note.text).toContain("# TASK-005-SPEC-001: Task X");
  });
});

describe("assembleNote (basic-memory path)", () => {
  test("emits minimal frontmatter without observations/relations requirement", () => {
    const parsed = parseSource("# Hi\n\nbody\n");
    const note = assembleNote(parsed, {
      type: "analysis",
      counter: 1,
      descriptor: "Hi",
      folder: "docs/analysis",
      filename: "ANALYSIS-001-hi.md",
      basicMemory: true,
    });
    expect(note.text).toContain("# ANALYSIS-001: Hi");
    expect(note.text).not.toContain("## Observations");
    expect(note.text).not.toContain("## Relations");
  });
});

describe("buildTitle / buildPermalink", () => {
  test("buildTitle top-level", () => {
    expect(buildTitle({ type: "decision", counter: 1, descriptor: "Foo" })).toBe("ADR-001: Foo");
  });
  test("buildPermalink lowercases", () => {
    expect(buildPermalink({ folder: "docs/decisions", filename: "ADR-001-foo.md" })).toBe(
      "decisions/adr-001-foo",
    );
  });
});
