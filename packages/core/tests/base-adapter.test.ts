import { describe, expect, test } from "bun:test";
import { BaseMarkdownAdapter } from "@acmelabs/core/core/base-markdown-adapter";
import type { MutationSpec } from "@acmelabs/core/core/types";

class TestAdapter extends BaseMarkdownAdapter {
  readonly sourceType = "test";
  protected readonly sectionDelimiter = "## ";
  protected readonly identifierPrefix = "test-";
  protected readonly identifierPattern = /D-(\d+)/;
}

const adapter = new TestAdapter();

describe("parse", () => {
  test("returns Root AST with children", () => {
    const content = "# Hello\n\nA paragraph.\n";
    const ast = adapter.parse(content);
    expect(ast.type).toBe("root");
    expect(Array.isArray(ast.children)).toBe(true);
    expect(ast.children.length).toBeGreaterThan(0);
  });
});

describe("extractByRange", () => {
  const fiveLine = "line1\nline2\nline3\nline4\nline5";

  test("extracts middle range (1-indexed, inclusive)", () => {
    const result = adapter.extractByRange(fiveLine, { start: 2, end: 4 });
    expect(result).toBe("line2\nline3\nline4");
  });

  test("end=-1 extracts to end of file", () => {
    const result = adapter.extractByRange(fiveLine, { start: 3, end: -1 });
    expect(result).toBe("line3\nline4\nline5");
  });
});

describe("applyMutations", () => {
  test("single-pass renumber_map does not cascade", () => {
    const content = "D-1 and D-2";
    const mutations: MutationSpec = {
      renumber_map: { "D-1": "D-2", "D-2": "D-3" },
      wikilink_map: {},
    };
    const result = adapter.applyMutations(content, mutations);
    // Must produce "D-2 and D-3", NOT "D-3 and D-3" (cascade)
    expect(result).toBe("D-2 and D-3");
  });

  test("frontmatter_map updates frontmatter only, not body", () => {
    // Value-keyed per REQ-004 AC-2, now the semantics on every adapter: the key
    // is the EXISTING value, not the field name. Field-keyed was retired because
    // it could not be inverted, so it failed the F-8 comparison on every plan.
    const content = "---\ntitle: old\nstatus: DRAFT\n---\n# Body\n\ntitle: old in body\n";
    const mutations: MutationSpec = {
      renumber_map: {},
      wikilink_map: {},
      frontmatter_map: { old: "new" },
    };
    const result = adapter.applyMutations(content, mutations);
    expect(result).toContain("title: new");
    expect(result).toContain("status: DRAFT");
    // Body text is never considered — only the frontmatter block is rewritten.
    expect(result).toContain("title: old in body");
    expect(result).not.toMatch(/^title: old$/m);
  });

  test("frontmatter_map round-trips (apply then reverse is identity)", () => {
    const content = "---\ntitle: old\nstatus: DRAFT\n---\n# Body\n\ntitle: old in body\n";
    const mutations: MutationSpec = {
      renumber_map: {},
      wikilink_map: {},
      frontmatter_map: { old: "new" },
    };
    const forward = adapter.applyMutations(content, mutations);
    expect(adapter.reverseMutations(forward, mutations)).toBe(content);
  });

  test("applies wikilink_map", () => {
    const content = "See [[OldNote]] for details.";
    const mutations: MutationSpec = {
      renumber_map: {},
      wikilink_map: { "[[OldNote]]": "[[NewNote]]" },
    };
    expect(adapter.applyMutations(content, mutations)).toBe("See [[NewNote]] for details.");
  });
});

describe("reverseMutations", () => {
  test("inverse property: reverse(apply(c, m), m) === c", () => {
    const content = "D-1 references D-2 and links to [[OldNote]].";
    const mutations: MutationSpec = {
      renumber_map: { "D-1": "D-5", "D-2": "D-6" },
      wikilink_map: { "[[OldNote]]": "[[NewNote]]" },
    };
    const mutated = adapter.applyMutations(content, mutations);
    const restored = adapter.reverseMutations(mutated, mutations);
    expect(restored).toBe(content);
  });

  test("inverse property covers identifier and wikilink mutations across markdown body", () => {
    const content =
      "# Heading\n\nParagraph references D-1 and D-2.\n\n- See [[OldNote]]\n- And [[OtherNote]]\n";
    const mutations: MutationSpec = {
      renumber_map: { "D-1": "D-10", "D-2": "D-20" },
      wikilink_map: { "[[OldNote]]": "[[RenamedNote]]", "[[OtherNote]]": "[[AnotherNote]]" },
    };
    const mutated = adapter.applyMutations(content, mutations);
    expect(mutated).not.toBe(content);
    const restored = adapter.reverseMutations(mutated, mutations);
    expect(restored).toBe(content);
  });
});

describe("serialize", () => {
  test("parse → serialize returns a string", () => {
    const content = "# Hello\n\nWorld.\n";
    const ast = adapter.parse(content);
    const result = adapter.serialize(ast);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("Hello");
    expect(result).toContain("World");
  });
});
