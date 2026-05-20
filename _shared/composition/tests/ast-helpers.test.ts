import { describe, expect, test } from "bun:test";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import {
  ParseError,
  bulletFieldMap,
  checkboxItems,
  extractFrontmatter,
  extractH1,
  findTable,
  proseFromChildren,
  sectionizeH2,
  sectionizeH3,
  stripWikilink,
  tableRows,
} from "../src/parsers/ast-helpers.js";

function parse(md: string) {
  return unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkGfm).parse(md);
}

describe("extractFrontmatter", () => {
  test("returns parsed YAML mapping", () => {
    const ast = parse("---\ntitle: foo\ntype: plan\n---\n\n# Body\n");
    const fm = extractFrontmatter(ast);
    expect(fm["title"]).toBe("foo");
    expect(fm["type"]).toBe("plan");
  });

  test("throws ParseError when no frontmatter present", () => {
    const ast = parse("# Body\n");
    expect(() => extractFrontmatter(ast)).toThrow(ParseError);
  });
});

describe("sectionizeH2 and sectionizeH3", () => {
  test("sectionizeH2 returns H2 buckets in order", () => {
    const ast = parse("# Title\n\n## A\n\npara A\n\n## B\n\npara B\n");
    const sections = sectionizeH2(ast);
    expect(Array.from(sections.keys())).toEqual(["A", "B"]);
  });

  test("sectionizeH3 partitions a children list", () => {
    const ast = parse("## Top\n\n### Sub1\n\nx\n\n### Sub2\n\ny\n");
    const top = sectionizeH2(ast).get("Top");
    expect(top).toBeDefined();
    if (!top) throw new Error("setup");
    const subs = sectionizeH3(top);
    expect(Array.from(subs.keys())).toEqual(["Sub1", "Sub2"]);
  });
});

describe("proseFromChildren", () => {
  test("joins paragraph children with double newline", () => {
    const ast = parse("## S\n\nfirst para\n\nsecond para\n");
    const children = sectionizeH2(ast).get("S");
    if (!children) throw new Error("setup");
    expect(proseFromChildren(children)).toBe("first para\n\nsecond para");
  });
});

describe("findTable and tableRows", () => {
  test("parses a GFM table into header-keyed rows", () => {
    const md = "## T\n\n| Phase | Status |\n|--|--|\n| build | DONE |\n| review | PENDING |\n";
    const children = sectionizeH2(parse(md)).get("T");
    if (!children) throw new Error("setup");
    const table = findTable(children);
    if (!table) throw new Error("table not found");
    const rows = tableRows(table);
    expect(rows).toEqual([
      { Phase: "build", Status: "DONE" },
      { Phase: "review", Status: "PENDING" },
    ]);
  });
});

describe("checkboxItems", () => {
  test("parses GFM task list items with done state", () => {
    const md = "## L\n\n- [x] one\n- [ ] two\n";
    const children = sectionizeH2(parse(md)).get("L");
    if (!children) throw new Error("setup");
    const items = checkboxItems(children);
    expect(items).toEqual([
      { text: "one", done: true },
      { text: "two", done: false },
    ]);
  });
});

describe("bulletFieldMap", () => {
  test("parses bold and plain key:value bullets", () => {
    const md = "## F\n\n- **Type**: session-start\n- Branch: feat/test\n";
    const children = sectionizeH2(parse(md)).get("F");
    if (!children) throw new Error("setup");
    const map = bulletFieldMap(children);
    expect(map.get("Type")).toBe("session-start");
    expect(map.get("Branch")).toBe("feat/test");
  });
});

describe("stripWikilink", () => {
  test("extracts inner ref from a wikilink", () => {
    expect(stripWikilink("[[PLAN-001: Test]]")?.ref).toBe("PLAN-001: Test");
  });

  test("returns null for plain text", () => {
    expect(stripWikilink("not a link")).toBeNull();
  });
});

describe("extractH1", () => {
  test("returns the H1 title", () => {
    const ast = parse("# My Title\n\nbody\n");
    expect(extractH1(ast)).toBe("My Title");
  });
});
