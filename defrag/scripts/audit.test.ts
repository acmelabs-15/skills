import { describe, expect, test } from "bun:test";
import {
  type MemoryAdapter,
  audit,
  countObservations,
  countRelations,
  extractSection,
  hasH3InSection,
} from "./audit.ts";

function makeAdapter(
  files: Record<string, string>,
  modified: Record<string, string | null> = {},
): MemoryAdapter {
  return {
    async *listNotes(_docsPath: string) {
      for (const k of Object.keys(files)) yield k;
    },
    async readNote(absPath: string) {
      // absPath ends with the relative key.
      for (const k of Object.keys(files)) {
        if (absPath.endsWith(k)) return files[k] ?? "";
      }
      throw new Error(`unknown ${absPath}`);
    },
    async lastModified(absPath: string) {
      for (const k of Object.keys(modified)) {
        if (absPath.endsWith(k)) return modified[k] ?? null;
      }
      return null;
    },
  };
}

const FM_TASK = `---
title: 'TASK-001: Foo'
type: task
status: TODO
---

# TASK-001: Foo

`;

describe("countObservations", () => {
  test("counts category-prefixed lines in Observations section", () => {
    const body = `${FM_TASK}## Observations\n\n- [decision] Foo #tag\n- [fact] Bar #tag\n- [constraint] Baz #tag\n\n## Relations\n- relates_to [[X]]\n`;
    expect(countObservations(body)).toBe(3);
  });

  test("returns 0 when no Observations section", () => {
    expect(countObservations("# H1\n\nnothing here")).toBe(0);
  });
});

describe("countRelations", () => {
  test("counts list items in Relations section", () => {
    const body = `${FM_TASK}## Observations\n- [fact] x #y\n\n## Relations\n- implements [[A]]\n- depends_on [[B]]\n- relates_to [[C]]\n`;
    expect(countRelations(body)).toBe(3);
  });
});

describe("hasH3InSection", () => {
  test("detects H3 in Observations", () => {
    const body =
      "## Observations\n\n### Group A\n\n- [fact] a #t\n\n## Relations\n- relates_to [[X]]\n";
    expect(hasH3InSection(body, "Observations")).toBe(true);
  });
  test("false when no H3", () => {
    const body = "## Observations\n\n- [fact] a #t\n\n## Relations\n- relates_to [[X]]\n";
    expect(hasH3InSection(body, "Observations")).toBe(false);
  });
});

describe("extractSection", () => {
  test("extracts section content between H2s", () => {
    const body = "## A\nhello\n## B\nworld\n";
    expect(extractSection(body, "A")?.trim()).toBe("hello");
  });
  test("returns null when section absent", () => {
    expect(extractSection("# H1\n", "Missing")).toBeNull();
  });
});

describe("audit classification", () => {
  test("flags split candidate when observations > 15 without H3 grouping", async () => {
    const obs = Array.from({ length: 17 }, (_, i) => `- [fact] item ${i} #tag`).join("\n");
    const body = `${FM_TASK}## Observations\n\n${obs}\n\n## Relations\n- relates_to [[A]]\n- depends_on [[B]]\n`;
    const r = await audit({
      projectRoot: "/x",
      adapter: makeAdapter({ "n.md": body }),
    });
    expect(r.by.split.length).toBeGreaterThan(0);
    expect(r.by.split[0]?.violationDetail).toContain("observations=17");
  });

  test("flags merge candidate when observations < 3", async () => {
    const body = `${FM_TASK}## Observations\n\n- [fact] only #t\n\n## Relations\n- relates_to [[A]]\n- depends_on [[B]]\n`;
    const r = await audit({
      projectRoot: "/x",
      adapter: makeAdapter({ "n.md": body }),
    });
    expect(r.by.merge.length).toBeGreaterThan(0);
  });

  test("flags merge candidate when relations < 2", async () => {
    const body = `${FM_TASK}## Observations\n\n- [fact] a #t\n- [fact] b #t\n- [fact] c #t\n- [fact] d #t\n\n## Relations\n- relates_to [[A]]\n`;
    const r = await audit({
      projectRoot: "/x",
      adapter: makeAdapter({ "n.md": body }),
    });
    expect(r.by.merge.length).toBeGreaterThan(0);
  });

  test("flags structural-fix when relations > 12 without H3 grouping", async () => {
    const rels = Array.from({ length: 13 }, (_, i) => `- relates_to [[N${i}]]`).join("\n");
    const body = `${FM_TASK}## Observations\n\n- [fact] a #t\n- [fact] b #t\n- [fact] c #t\n\n## Relations\n${rels}\n`;
    const r = await audit({
      projectRoot: "/x",
      adapter: makeAdapter({ "n.md": body }),
    });
    expect(r.by["structural-fix"].length).toBeGreaterThan(0);
  });

  test("flags split candidate when lineCount > 500", async () => {
    const padding = Array.from({ length: 510 }, () => "padding line").join("\n");
    const body = `${FM_TASK}## Observations\n\n- [fact] a #t\n- [fact] b #t\n- [fact] c #t\n\n${padding}\n## Relations\n- relates_to [[A]]\n- depends_on [[B]]\n`;
    const r = await audit({
      projectRoot: "/x",
      adapter: makeAdapter({ "n.md": body }),
    });
    expect(r.by.split.some((c) => c.violationDetail.includes("lineCount"))).toBe(true);
  });

  test("flags stale candidate when last-modified exceeds staleness AND status non-terminal", async () => {
    const oldDate = new Date(Date.now() - 365 * 86400000).toISOString();
    const body = `${FM_TASK}## Observations\n\n- [fact] a #t\n- [fact] b #t\n- [fact] c #t\n\n## Relations\n- relates_to [[A]]\n- depends_on [[B]]\n`;
    const r = await audit({
      projectRoot: "/x",
      stalenessDays: 90,
      adapter: makeAdapter({ "n.md": body }, { "n.md": oldDate }),
    });
    expect(r.by.stale.length).toBe(1);
  });

  test("does NOT flag stale when status is DONE", async () => {
    const oldDate = new Date(Date.now() - 365 * 86400000).toISOString();
    const body =
      "---\ntitle: 'TASK-001: Foo'\ntype: task\nstatus: DONE\n---\n\n# H\n## Observations\n- [fact] a #t\n- [fact] b #t\n- [fact] c #t\n\n## Relations\n- relates_to [[A]]\n- depends_on [[B]]\n";
    const r = await audit({
      projectRoot: "/x",
      stalenessDays: 90,
      adapter: makeAdapter({ "n.md": body }, { "n.md": oldDate }),
    });
    expect(r.by.stale.length).toBe(0);
  });

  test("clean note produces no candidates", async () => {
    const body = `${FM_TASK}## Observations\n\n- [fact] a #t\n- [fact] b #t\n- [fact] c #t\n- [fact] d #t\n\n## Relations\n- relates_to [[A]]\n- depends_on [[B]]\n`;
    const r = await audit({
      projectRoot: "/x",
      adapter: makeAdapter({ "n.md": body }, { "n.md": new Date().toISOString() }),
    });
    expect(r.candidates.length).toBe(0);
    expect(r.notesScanned).toBe(1);
  });
});
