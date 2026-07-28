import { describe, expect, test } from "bun:test";
import {
  atomizeBlocks,
  cellOf,
  findCheckboxes,
  findTables,
  lineOfOffset,
  listHeadings,
  sliceSections,
  splitBlocks,
  splitLines,
} from "../src/core/markdown-slices.js";

const NOTE = `# Title

## 5. Part C

Lead paragraph.

### Tier 0

| ID | Blocking |
| :-- | :-- |
| AG-01 | **Yes** |
| AG-02 | No |

### Tier 1

| ID | Blocking |
| :-- | :-- |
| AG-03 | **Yes** |

## 6. Part D

Not part of Part C.
`;

describe("listHeadings", () => {
  test("returns depth, text and 1-indexed line for every heading", () => {
    expect(listHeadings(NOTE)).toEqual([
      { depth: 1, text: "Title", line: 1 },
      { depth: 2, text: "5. Part C", line: 3 },
      { depth: 3, text: "Tier 0", line: 7 },
      { depth: 3, text: "Tier 1", line: 14 },
      { depth: 2, text: "6. Part D", line: 20 },
    ]);
  });

  test("ignores a hash inside a fenced code block", () => {
    expect(listHeadings("```sh\n# not a heading\n```\n")).toEqual([]);
  });
});

describe("sliceSections", () => {
  test("a section carries its descendants", () => {
    const [partC] = sliceSections(NOTE, { startsWith: "5. Part C" });
    expect(partC?.startLine).toBe(3);
    expect(partC?.endLine).toBe(19);
    expect(partC?.lines.join("\n")).toContain("Tier 1");
    expect(partC?.lines.join("\n")).not.toContain("Part D");
  });

  test("matches by regex with caller-supplied flags", () => {
    expect(sliceSections(NOTE, { matches: "part c", flags: "i" })).toHaveLength(1);
    expect(sliceSections(NOTE, { matches: "part c" })).toHaveLength(0);
  });

  test("returns every match rather than resolving ambiguity silently", () => {
    expect(sliceSections(NOTE, { startsWith: "Tier" })).toHaveLength(2);
  });

  test("an unmatched heading yields no sections", () => {
    expect(sliceSections(NOTE, { equals: "Part Z" })).toEqual([]);
  });
});

describe("findTables", () => {
  test("parses headers and body rows with file-absolute line numbers", () => {
    const [partC] = sliceSections(NOTE, { startsWith: "5. Part C" });
    const tables = findTables(partC?.lines ?? [], partC?.startLine ?? 1);
    expect(tables).toHaveLength(2);
    expect(tables[0]?.headers).toEqual(["ID", "Blocking"]);
    expect(tables[0]?.rows.map((row) => row.line)).toEqual([11, 12]);
    expect(tables[1]?.rows).toHaveLength(1);
  });

  test("a pipe run without a delimiter row is not a table", () => {
    expect(findTables(splitLines("| a | b |\n| c | d |"))).toEqual([]);
  });

  test("a table inside a fence is documentation, not data", () => {
    expect(findTables(splitLines("```\n| a |\n| :-- |\n| b |\n```"))).toEqual([]);
  });

  test("cellOf resolves a named column and reports an absent one", () => {
    const [table] = findTables(splitLines("| ID | Blocking |\n| :-- | :-- |\n| AG-01 | Yes |"));
    const row = table?.rows[0];
    expect(table && row && cellOf(table, row, "Blocking")).toBe("Yes");
    expect(table && row && cellOf(table, row, "Missing")).toBeUndefined();
  });
});

describe("splitBlocks and atomizeBlocks", () => {
  test("splitBlocks keeps a table whole", () => {
    const blocks = splitBlocks("para\n\n| a |\n| :-- |\n| b |\n| c |\n");
    expect(blocks).toHaveLength(2);
    expect(blocks[1]?.startLine).toBe(3);
    expect(blocks[1]?.endLine).toBe(6);
  });

  test("atomizeBlocks gives each table row its own span", () => {
    const atoms = atomizeBlocks("| a |\n| :-- |\n| b |\n| c |\n");
    expect(atoms.map((atom) => atom.startLine)).toEqual([1, 2, 3, 4]);
  });

  test("atomizeBlocks gives each list item its own span", () => {
    const atoms = atomizeBlocks("- one\n  continued\n- two\n");
    expect(atoms).toHaveLength(2);
    expect(atoms[0]?.text).toBe("- one\n  continued");
  });

  test("atomizeBlocks leaves a plain paragraph whole", () => {
    expect(atomizeBlocks("a sentence\nwrapped over lines\n")).toHaveLength(1);
  });
});

describe("findCheckboxes", () => {
  test("counts open, done and deferred markers with line numbers", () => {
    const items = findCheckboxes(splitLines("- [ ] a\n- [x] b\n- [~] c\n- plain"));
    expect(items.map((item) => item.state)).toEqual(["open", "done", "deferred"]);
    expect(items.map((item) => item.line)).toEqual([1, 2, 3]);
  });
});

describe("lineOfOffset", () => {
  test("converts a character offset to a 1-indexed line", () => {
    expect(lineOfOffset("a\nb\nc", 0)).toBe(1);
    expect(lineOfOffset("a\nb\nc", 4)).toBe(3);
  });
});
