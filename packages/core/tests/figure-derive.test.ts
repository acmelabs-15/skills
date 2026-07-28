import { describe, expect, test } from "bun:test";
import { headingAt, runCheck } from "@acmelabs/core/core/figure-derive";
import { type IndexedNote, NoteIndex } from "@acmelabs/core/core/note-index";
import { type FigureCheck, FigureCheckSchema } from "@acmelabs/core/schemas/figure-check";

const AGENDA = `---
title: "ANALYSIS-934: Agenda"
type: analysis
---

# ANALYSIS-934: Agenda

## 5. Part C — The open agenda

### Tier 0

| ID | Blocking |
| :-- | :-- |
| AG-01 | **Yes** |
| AG-02 | No |

### Tier 1

| ID | Blocking |
| :-- | :-- |
| AG-03 | **Yes** |
| AG-04 | **Yes** |

## 8. Part F — Measurements

| Measurement | Gates |
| :-- | :-- |
| **PRE-BUILD** — duration ceiling | AG-01 |
| **BUILD-DEFERRED** — audio matrix | AG-03 |

## 11. Results

The table holds **four rows** in total, and **three** rows carry a blocking mark.

Two bounded measurements gate named items.

## Progress

- [x] one
- [ ] two
`;

const INVENTORY = `---
title: "ANALYSIS-901: Inventory"
type: analysis
---

# ANALYSIS-901: Inventory

## 4. Inventory

| Surface | Cut line |
| :-- | :-- |
| Shell | IN. Needed |
| Scrim | OUT. Convenience |
| Search | ARGUABLE. Borderline |

## 5. Totals

| Measure | Count |
| :-- | :-- |
| Surfaces enumerated | 3 |
| Verdict IN | 2 |
`;

function noteOf(content: string, path: string, title: string): IndexedNote {
  return {
    path,
    title,
    entityId: title.slice(0, title.indexOf(":")),
    permalink: "",
    noteType: "analysis",
    content,
  };
}

const index = new NoteIndex("/docs", [
  noteOf(AGENDA, "analysis/a-934.md", "ANALYSIS-934: Agenda"),
  noteOf(INVENTORY, "analysis/a-901.md", "ANALYSIS-901: Inventory"),
]);

function check(
  overrides: Partial<FigureCheck> & Pick<FigureCheck, "figureLocation" | "derivation">,
): FigureCheck {
  return { id: overrides.id ?? "t", note: overrides.note ?? "ANALYSIS-934", ...overrides };
}

describe("runCheck — countTableRows", () => {
  test("MATCH counting rows across a section's subsections", () => {
    const finding = runCheck(
      check({
        figureLocation: {
          section: { startsWith: "11. Results" },
          pattern: "\\*\\*([a-z ]+?) rows\\*\\* in total",
          flags: "i",
        },
        derivation: { kind: "countTableRows", section: { startsWith: "5. Part C" } },
      }),
      index,
    );
    expect(finding.verdict).toBe("MATCH");
    expect(finding.statedFigure).toBe(4);
    expect(finding.derivedFigure).toBe(4);
    expect(finding.section).toBe("11. Results");
  });

  test("MISMATCH when the stated figure has drifted from the table", () => {
    const finding = runCheck(
      check({
        figureLocation: {
          section: { startsWith: "11. Results" },
          pattern: "(Two) bounded measurements",
        },
        derivation: { kind: "countTableRows", section: { startsWith: "5. Part C" } },
      }),
      index,
    );
    expect(finding.verdict).toBe("MISMATCH");
    expect(finding.statedFigure).toBe(2);
    expect(finding.derivedFigure).toBe(4);
  });

  test("a column filter counts only matching rows", () => {
    const finding = runCheck(
      check({
        figureLocation: {
          section: { startsWith: "11. Results" },
          pattern: "\\*\\*(\\w+)\\*\\* rows carry a blocking mark",
        },
        derivation: {
          kind: "countTableRows",
          section: { startsWith: "5. Part C" },
          column: "Blocking",
          matching: "^\\*\\*Yes\\*\\*$",
        },
      }),
      index,
    );
    expect(finding.verdict).toBe("MATCH");
    expect(finding.derivedFigure).toBe(3);
  });

  test("a first-cell prefix filter separates two row kinds", () => {
    const finding = runCheck(
      check({
        figureLocation: { section: { startsWith: "11. Results" }, pattern: "(Two) bounded" },
        derivation: {
          kind: "countTableRows",
          section: { startsWith: "8. Part F" },
        },
      }),
      index,
    );
    expect(finding.verdict).toBe("MATCH");
    expect(finding.derivedFigure).toBe(2);
  });
});

describe("runCheck — cross-note derivation", () => {
  test("derives a figure stated in one note from a table in another", () => {
    const finding = runCheck(
      check({
        note: "ANALYSIS-901",
        figureLocation: {
          section: { startsWith: "5. Totals" },
          pattern: "\\| Surfaces enumerated \\| (\\d+) \\|",
        },
        derivation: {
          kind: "countTableRows",
          note: "ANALYSIS-901",
          section: { startsWith: "4. Inventory" },
        },
      }),
      index,
    );
    expect(finding.verdict).toBe("MATCH");
    expect(finding.derivedFigure).toBe(3);
    expect(finding.detail).not.toContain("in ANALYSIS-901");
  });

  test("names the source note in the detail when it differs", () => {
    const finding = runCheck(
      check({
        note: "ANALYSIS-934",
        figureLocation: { section: { startsWith: "11. Results" }, pattern: "(Two) bounded" },
        derivation: {
          kind: "countTableRows",
          note: "ANALYSIS-901",
          section: { startsWith: "4. Inventory" },
          column: "Cut line",
          matching: "^(?:IN|ARGUABLE)\\b",
        },
      }),
      index,
    );
    expect(finding.verdict).toBe("MATCH");
    expect(finding.detail).toContain("in ANALYSIS-901");
  });
});

describe("runCheck — other derivations", () => {
  test("countCheckboxes with a state filter", () => {
    const finding = runCheck(
      check({
        figureLocation: { section: { startsWith: "11. Results" }, pattern: "(Two) bounded" },
        derivation: {
          kind: "countCheckboxes",
          section: { startsWith: "Progress" },
        },
      }),
      index,
    );
    expect(finding.derivedFigure).toBe(2);
  });

  test("countRegexMatches counts hits in scope", () => {
    const finding = runCheck(
      check({
        figureLocation: {
          section: { startsWith: "11. Results" },
          pattern: "\\*\\*(\\w+)\\*\\* rows carry",
        },
        derivation: {
          kind: "countRegexMatches",
          section: { startsWith: "5. Part C" },
          pattern: "\\*\\*Yes\\*\\*",
        },
      }),
      index,
    );
    expect(finding.verdict).toBe("MATCH");
    expect(finding.derivedFigure).toBe(3);
  });

  test("sumTableColumn adds the numeric cells", () => {
    const finding = runCheck(
      check({
        note: "ANALYSIS-901",
        figureLocation: { section: { startsWith: "5. Totals" }, pattern: "Verdict IN \\| (\\d+)" },
        derivation: {
          kind: "sumTableColumn",
          note: "ANALYSIS-901",
          section: { startsWith: "5. Totals" },
          column: "Count",
        },
      }),
      index,
    );
    expect(finding.derivedFigure).toBe(5);
    expect(finding.verdict).toBe("MISMATCH");
  });
});

describe("runCheck — UNANCHORED refusals", () => {
  const base = {
    figureLocation: { section: { startsWith: "11. Results" }, pattern: "(Two) bounded" },
    derivation: { kind: "countTableRows" as const, section: { startsWith: "5. Part C" } },
  };

  test("an unresolvable note", () => {
    const finding = runCheck(check({ ...base, note: "ANALYSIS-999" }), index);
    expect(finding.verdict).toBe("UNANCHORED");
    expect(finding.detail).toContain("no note in the tree");
  });

  test("a figure pattern that matches nothing", () => {
    const finding = runCheck(
      check({
        ...base,
        figureLocation: { section: { startsWith: "11. Results" }, pattern: "(absent)" },
      }),
      index,
    );
    expect(finding.verdict).toBe("UNANCHORED");
    expect(finding.detail).toContain("matched nothing");
  });

  test("a derivation section that does not resolve", () => {
    const finding = runCheck(
      check({ ...base, derivation: { kind: "countTableRows", section: { startsWith: "Part Z" } } }),
      index,
    );
    expect(finding.verdict).toBe("UNANCHORED");
    expect(finding.detail).toContain("no section matched");
  });

  test("a section matcher loose enough to hit several sections", () => {
    const finding = runCheck(
      check({ ...base, derivation: { kind: "countTableRows", section: { startsWith: "Tier" } } }),
      index,
    );
    expect(finding.verdict).toBe("UNANCHORED");
    expect(finding.detail).toContain("too loose");
  });

  test("a captured group that is not a number", () => {
    const finding = runCheck(
      check({
        ...base,
        figureLocation: {
          section: { startsWith: "11. Results" },
          pattern: "(bounded) measurements",
        },
      }),
      index,
    );
    expect(finding.verdict).toBe("UNANCHORED");
    expect(finding.detail).toContain("not a parseable figure");
    expect(finding.line).toBeGreaterThan(0);
  });

  test("a column the tables in scope do not carry", () => {
    const finding = runCheck(
      check({
        ...base,
        derivation: {
          kind: "countTableRows",
          section: { startsWith: "5. Part C" },
          column: "Owner",
        },
      }),
      index,
    );
    expect(finding.verdict).toBe("UNANCHORED");
    expect(finding.detail).toContain('"Owner" column');
  });
});

describe("FigureCheckSchema", () => {
  test("rejects a section matcher that constrains nothing", () => {
    expect(() =>
      FigureCheckSchema.parse({
        id: "x",
        note: "ANALYSIS-934",
        figureLocation: { section: {}, pattern: "(\\d+)" },
        derivation: { kind: "countTableRows" },
      }),
    ).toThrow();
  });

  test("rejects an unknown derivation kind", () => {
    expect(() =>
      FigureCheckSchema.parse({
        id: "x",
        note: "ANALYSIS-934",
        figureLocation: { pattern: "(\\d+)" },
        derivation: { kind: "countVibes" },
      }),
    ).toThrow();
  });
});

describe("headingAt", () => {
  test("names the heading a line sits under", () => {
    expect(headingAt(AGENDA, 16)).toBe("Tier 0");
  });
});
