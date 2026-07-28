import { describe, expect, test } from "bun:test";
import { parseAdrNote } from "@acmelabs/models/parsers/adr-note";
import { sectionizeH2 } from "@acmelabs/models/parsers/ast-helpers";
import { inverseVerb, isSymmetricVerb, parseRelationEntries } from "@acmelabs/models/relations";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ["yaml"]);

function relationsOf(markdown: string) {
  const children = sectionizeH2(processor.parse(markdown)).get("Relations") ?? [];
  return parseRelationEntries(children);
}

describe("inverse verb table", () => {
  test("directional pairs invert both ways", () => {
    const pairs: ReadonlyArray<readonly [string, string]> = [
      ["implements", "implemented_by"],
      ["depends_on", "required_by"],
      ["extends", "extended_by"],
      ["part_of", "contains"],
      ["inspired_by", "inspires"],
      ["supersedes", "superseded_by"],
      ["leads_to", "caused_by"],
    ];
    for (const [outbound, inverse] of pairs) {
      expect(inverseVerb(outbound)).toBe(inverse);
      expect(inverseVerb(inverse)).toBe(outbound);
    }
  });

  test("symmetric verbs are their own inverse", () => {
    expect(inverseVerb("pairs_with")).toBe("pairs_with");
    expect(inverseVerb("relates_to")).toBe("relates_to");
    expect(isSymmetricVerb("relates_to")).toBe(true);
    expect(isSymmetricVerb("part_of")).toBe(false);
  });

  test("an unknown verb has no inverse rather than a guessed one", () => {
    expect(inverseVerb("invented_verb")).toBeNull();
  });
});

describe("parseRelationEntries — flat form", () => {
  test("reads verb-prefixed entries", () => {
    const entries = relationsOf(
      "# N\n\n## Relations\n\n- part_of [[A: One]]\n- implements [[B: Two]]\n",
    );
    expect(entries.map((e) => [e.verb, e.target])).toEqual([
      ["part_of", "A: One"],
      ["implements", "B: Two"],
    ]);
    expect(entries.every((e) => e.grouped === false)).toBe(true);
  });

  test("records the source line of each entry", () => {
    const entries = relationsOf("# N\n\n## Relations\n\n- part_of [[A: One]]\n");
    expect(entries[0]?.line).toBe(5);
  });
});

describe("parseRelationEntries — H3-grouped form", () => {
  const grouped = `# N

## Relations

### contains

- [[REQ-001: One]]
- [[REQ-002: Two]]

### implements

- [[ADR-001: Decision]]

### depends_on

- [[ANALYSIS-001: Input]]
`;

  test("every group is read, not just the first", () => {
    const entries = relationsOf(grouped);
    expect(entries).toHaveLength(4);
    expect(entries.map((e) => e.verb)).toEqual([
      "contains",
      "contains",
      "implements",
      "depends_on",
    ]);
  });

  test("the H3 header supplies the verb for bare entries", () => {
    const entries = relationsOf(grouped);
    expect(entries[0]).toMatchObject({ verb: "contains", target: "REQ-001: One", grouped: true });
    expect(entries[3]).toMatchObject({ verb: "depends_on", target: "ANALYSIS-001: Input" });
  });

  test("an explicit verb wins over the enclosing group", () => {
    const entries = relationsOf(
      "# N\n\n## Relations\n\n### contains\n\n- [[A: One]]\n- supersedes [[B: Two]]\n",
    );
    expect(entries.map((e) => [e.verb, e.grouped])).toEqual([
      ["contains", true],
      ["supersedes", false],
    ]);
  });

  test("an H3 that is not a relation verb does not type the entries beneath it", () => {
    const entries = relationsOf("# N\n\n## Relations\n\n### By category\n\n- [[A: One]]\n");
    expect(entries).toEqual([]);
  });

  test("H3 headers are matched case- and space-insensitively", () => {
    const entries = relationsOf("# N\n\n## Relations\n\n### Depends On\n\n- [[A: One]]\n");
    expect(entries[0]?.verb).toBe("depends_on");
  });

  test("a flat section following a group still parses", () => {
    const entries = relationsOf(
      "# N\n\n## Relations\n\n### contains\n\n- [[A: One]]\n\n## Observations\n\n- [fact] x #t\n",
    );
    expect(entries).toHaveLength(1);
  });
});

/**
 * The regression that motivated consolidating eleven private copies: every note
 * parser dropped H3-grouped relations entirely, so a note using the form the
 * conventions REQUIRE above twelve relations parsed as zero relations.
 */
describe("note parsers read H3-grouped relations", () => {
  const adr = `---
title: "ADR-900: Grouped Relations"
type: decision
status: PROPOSED
date: 2026-01-01
updated: 2026-01-01
permalink: decisions/adr-900-grouped-relations
tags:
  - decision
  - fixture
---

# ADR-900: Grouped Relations

## Status

PROPOSED

## Context and Problem Statement

Context.

## Decision

### D-1: Something — LOCKED

Body.

## Consequences

Consequences.

## Observations

- [decision] grouped relations must survive parsing #fixture
- [fact] eleven parsers previously dropped them #fixture
- [constraint] no hard maximum on relation count #fixture

## Relations

### contains

- [[SPEC-001: One]]
- [[SPEC-002: Two]]

### implements

- [[PRD-001: Product]]
`;

  test("parseAdrNote reads every grouped entry with its group verb", () => {
    const note = parseAdrNote(adr);
    expect(note.relations).toEqual([
      { verb: "contains", target: "SPEC-001: One" },
      { verb: "contains", target: "SPEC-002: Two" },
      { verb: "implements", target: "PRD-001: Product" },
    ]);
  });

  test("a grouped section well past twelve relations parses in full — no cap", () => {
    const many = Array.from({ length: 30 }, (_, i) => `- [[SPEC-${i}: Child]]`).join("\n");
    const note = parseAdrNote(adr.replace("- [[SPEC-001: One]]\n- [[SPEC-002: Two]]", many));
    expect(note.relations.filter((r) => r.verb === "contains")).toHaveLength(30);
  });
});
