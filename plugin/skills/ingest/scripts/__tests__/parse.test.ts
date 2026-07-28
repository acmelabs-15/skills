import { describe, expect, test } from "bun:test";
import { extractH1, parseSource, stripFrontmatter } from "../parse.ts";

const WITH_FM = `---
title: Foo Bar
type: analysis
status: DRAFT
---

# Foo Bar

Some body content.

## Observations

- [fact] something #tag
`;

const NO_FM = `# Plain Note

This is just markdown.
`;

describe("parseSource", () => {
  test("parses frontmatter when present", () => {
    const p = parseSource(WITH_FM);
    expect(p.frontmatter).not.toBeNull();
    expect(p.frontmatter?.["type"]).toBe("analysis");
    expect(p.h1).toBe("Foo Bar");
    expect(p.hasObservations).toBe(true);
    expect(p.hasRelations).toBe(false);
  });

  test("handles source with no frontmatter", () => {
    const p = parseSource(NO_FM);
    expect(p.frontmatter).toBeNull();
    expect(p.body).toBe(NO_FM);
    expect(p.h1).toBe("Plain Note");
    expect(p.hasObservations).toBe(false);
  });

  test("detects relations section", () => {
    const text = "# H\n\n## Relations\n- relates_to [[X]]\n";
    const p = parseSource(text);
    expect(p.hasRelations).toBe(true);
  });
});

describe("stripFrontmatter", () => {
  test("removes frontmatter block", () => {
    const body = stripFrontmatter(WITH_FM);
    expect(body).toContain("# Foo Bar");
    expect(body).not.toContain("type: analysis");
  });
  test("returns text unchanged when no frontmatter", () => {
    expect(stripFrontmatter(NO_FM)).toBe(NO_FM);
  });
});

describe("extractH1", () => {
  test("extracts first heading", () => {
    expect(extractH1("# Foo\n\n## Sub")).toBe("Foo");
  });
  test("returns null when no H1", () => {
    expect(extractH1("## Sub only")).toBeNull();
  });
});
