import { describe, expect, test } from "bun:test";
import { scanNote } from "../src/core/figure-scan.js";
import type { IndexedNote } from "../src/core/note-index.js";

function noteOf(content: string): IndexedNote {
  return {
    path: "analysis/ANALYSIS-940-fixture.md",
    title: "ANALYSIS-940: Fixture",
    entityId: "ANALYSIS-940",
    permalink: "",
    noteType: "analysis",
    content,
  };
}

describe("totals-row built-in", () => {
  test("MATCH when the Totals row equals its column sums", () => {
    const findings = scanNote(
      noteOf(`# T

## Counts

| Area | Count | Owned |
| :-- | :-- | :-- |
| Shell | 10 | 4 |
| Cook | 7 | 3 |
| **Total** | **17** | **7** |
`),
    );
    expect(findings).toHaveLength(2);
    expect(findings.every((finding) => finding.verdict === "MATCH")).toBe(true);
    expect(findings[0]?.kind).toBe("totals-row");
  });

  test("MISMATCH names both figures", () => {
    const [finding] = scanNote(
      noteOf(`# T

## Counts

| Area | Count |
| :-- | :-- |
| Shell | 10 |
| Cook | 7 |
| Total | 89 |
`),
    );
    expect(finding?.verdict).toBe("MISMATCH");
    expect(finding?.statedFigure).toBe(89);
    expect(finding?.derivedFigure).toBe(17);
    expect(finding?.line).toBe(9);
  });

  test("a prose column is skipped rather than half-summed", () => {
    const findings = scanNote(
      noteOf(`# T

## Counts

| Area | Note | Count |
| :-- | :-- | :-- |
| Shell | 3 paths | 10 |
| Cook | see above | 7 |
| Total | — | 17 |
`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.detail).toContain('"Count"');
  });

  test("a table with no Totals row produces nothing", () => {
    expect(scanNote(noteOf("# T\n\n## C\n\n| A | B |\n| :-- | :-- |\n| 1 | 2 |\n"))).toEqual([]);
  });
});

describe("checkbox-tally built-in", () => {
  test("MATCH against the ticked items", () => {
    const findings = scanNote(
      noteOf(`# T

## Exit criteria

Progress: 2 of 3 complete.

- [x] one
- [x] two
- [ ] three
`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe("checkbox-tally");
    expect(findings[0]?.verdict).toBe("MATCH");
  });

  test("a stale denominator is reported alongside the numerator", () => {
    const findings = scanNote(
      noteOf(`# T

## Exit criteria

Progress: 2 of 2 complete.

- [x] one
- [x] two
- [ ] three
`),
    );
    expect(findings).toHaveLength(2);
    const total = findings.find((finding) => finding.id.endsWith(":total"));
    expect(total?.verdict).toBe("MISMATCH");
    expect(total?.statedFigure).toBe(2);
    expect(total?.derivedFigure).toBe(3);
  });

  test("counts a deferred marker toward the total but not the ticked", () => {
    const findings = scanNote(
      noteOf(`# T

## Exit criteria

1 of 3 done.

- [x] one
- [~] two
- [ ] three
`),
    );
    expect(findings.find((finding) => !finding.id.endsWith(":total"))?.verdict).toBe("MATCH");
  });
});

describe("stated-count built-in", () => {
  test("MATCH when a deictic claim names the table beside it", () => {
    const findings = scanNote(
      noteOf(`# T

## Agenda

The table below holds three rows.

| ID | X |
| :-- | :-- |
| a | 1 |
| b | 2 |
| c | 3 |
`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.verdict).toBe("MATCH");
    expect(findings[0]?.kind).toBe("stated-count");
  });

  test("MISMATCH when the claim has drifted", () => {
    const [finding] = scanNote(
      noteOf(`# T

## Agenda

The table below holds eight rows.

| ID |
| :-- |
| a |
| b |
`),
    );
    expect(finding?.verdict).toBe("MISMATCH");
    expect(finding?.statedFigure).toBe(8);
    expect(finding?.derivedFigure).toBe(2);
  });

  test("UNANCHORED when the section holds several tables", () => {
    const [finding] = scanNote(
      noteOf(`# T

## Agenda

The table below holds three rows.

| A |
| :-- |
| 1 |

| B |
| :-- |
| 2 |
`),
    );
    expect(finding?.verdict).toBe("UNANCHORED");
    expect(finding?.detail).toContain("no unambiguous anchor");
  });

  test("a claim without a deictic anchor is left to config mode", () => {
    expect(
      scanNote(
        noteOf(`# T

## Agenda

The inventory counts 197 rows across fifteen areas.

| ID |
| :-- |
| a |
`),
      ),
    ).toEqual([]);
  });

  test("a deictic far from the count does not anchor it", () => {
    const long =
      "The instruction identified three rows as un-enumerated and mapped them to the third, sixth and seventh candidates, none of which changes what this table records about custody.";
    expect(scanNote(noteOf(`# T\n\n## Agenda\n\n${long}\n\n| ID |\n| :-- |\n| a |\n`))).toEqual([]);
  });

  test("a designator is not a count", () => {
    expect(
      scanNote(
        noteOf(`# T

## Agenda

Per CRIT-004 P0-2 rows in the table below, nothing changed.

| ID |
| :-- |
| a |
`),
      ),
    ).toEqual([]);
  });

  test("a claim inside a table cell is about some other structure", () => {
    expect(
      scanNote(
        noteOf(`# T

## Agenda

| ID | Note |
| :-- | :-- |
| a | Replaced by the three rows below |
`),
      ),
    ).toEqual([]);
  });

  test("a stated one is prose, not a summary count", () => {
    expect(
      scanNote(
        noteOf(`# T

## Agenda

The table below holds one row per surface.

| ID |
| :-- |
| a |
| b |
`),
      ),
    ).toEqual([]);
  });

  test("word-form counts are read the same as digits", () => {
    const [finding] = scanNote(
      noteOf(`# T

## Agenda

These items number twenty-two entries.

${Array.from({ length: 22 }, (_, i) => `- item ${i}`).join("\n")}
`),
    );
    expect(finding?.statedFigure).toBe(22);
    expect(finding?.verdict).toBe("MATCH");
  });

  test("Observations and Relations are not scanned", () => {
    expect(
      scanNote(
        noteOf(`# T

## Observations

The table below holds nine rows.

| ID |
| :-- |
| a |
`),
      ),
    ).toEqual([]);
  });
});
