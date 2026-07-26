import { describe, expect, test } from "bun:test";
import { extractObligations, resolveItemTarget } from "../src/core/correction-extract.js";
import { findCorrectionMarkers } from "../src/core/correction-markers.js";

/**
 * Inline fixture modelled on the shape a correction list actually takes: a
 * plural-headed section whose items lead with a bold target designation, name a
 * section, and quote the assertion they retire. Items 3 and 4 exercise the two
 * extraction refusals.
 */
const CORRECTION_LIST_SOURCE = `---
title: "ANALYSIS-901: Adjudication"
type: analysis
---

# ANALYSIS-901: Adjudication

## 3.3 Correction one — a prose argument, not a list

- **Line 214, the arm case.** The else is reached when the end instant is falsy.
- **Line 212, stop while running.** The flag is already false here.

## 3.7 Corrections a correction pass must land

1. **State analysis, ANALYSIS-902 Section 5.4** — the claim that the flag "is reset to false three times as often as it is set to true" should be corrected. The ratio is 1:1 at runtime.
2. **Substrate analysis, ANALYSIS-903 Section 4.10** — "the per-field provenance rule again rather than a new constraint" needs qualifying.
3. **Both notes and the D-5 amendment** — the amendment calls the flag non-monotonic without naming its key.
4. **State analysis, ANALYSIS-902** — the ownership model needs restating; no wording is quoted here.

## Observations

### Second-pass corrections

- [problem] The first pass recorded the store as failing the filter, and "the verdict is withdrawn" #storage
`;

describe("extractObligations — correction lists", () => {
  const result = extractObligations({
    sourceNote: "analysis/ANALYSIS-901-adjudication.md",
    content: CORRECTION_LIST_SOURCE,
    sourceEntityId: "ANALYSIS-901",
    noteType: "analysis",
  });

  test("extracts one tuple per checkable item", () => {
    expect(result.obligations).toHaveLength(2);
  });

  test("carries target, section and the quoted stale text", () => {
    const first = result.obligations.find((o) => o.targetEntityId === "ANALYSIS-902");
    expect(first?.targetNote).toBe("ANALYSIS-902 Section 5.4");
    expect(first?.targetSection).toBe("Section 5.4");
    expect(first?.quotedStaleText).toBe(
      "is reset to false three times as often as it is set to true",
    );
    expect(first?.origin).toBe("correction-list");
  });

  test("records the mandated change verbatim", () => {
    const first = result.obligations.find((o) => o.targetEntityId === "ANALYSIS-903");
    expect(first?.mandatedChange).toContain("needs qualifying");
  });

  test("an item naming no entity ID is UNEXTRACTABLE, never guessed", () => {
    const item = result.unextractable.find((u) => u.sourceAnchor.endsWith("item 3"));
    expect(item?.reason).toBe("no-resolvable-target");
  });

  test("an item quoting nothing is UNEXTRACTABLE", () => {
    const item = result.unextractable.find((u) => u.sourceAnchor.endsWith("item 4"));
    expect(item?.reason).toBe("no-quoted-stale-text");
  });

  test("a singular prose section arguing one correction is not a correction list", () => {
    const anchors = [...result.obligations, ...result.unextractable].map((i) => i.sourceAnchor);
    expect(anchors.some((anchor) => anchor.startsWith("3.3"))).toBe(false);
  });

  test("observation bullets under a corrections sub-heading are not obligations", () => {
    const anchors = [...result.obligations, ...result.unextractable].map((i) => i.sourceAnchor);
    expect(anchors.some((anchor) => anchor.startsWith("Second-pass"))).toBe(false);
  });
});

describe("resolveItemTarget", () => {
  test("prefers the bold lead over IDs cited later in the item", () => {
    const target = resolveItemTarget(
      "1. **Analysis, ANALYSIS-902 Section 4** — see also ANALYSIS-903 and ANALYSIS-904.",
    );
    expect(target.targetEntityId).toBe("ANALYSIS-902");
  });

  test("two IDs in the lead is ambiguous rather than first-wins", () => {
    expect(resolveItemTarget("**ANALYSIS-902 and ANALYSIS-903** — both wrong.").reason).toBe(
      "ambiguous-target",
    );
  });

  test("falls back to the item body when the lead names no entity", () => {
    expect(resolveItemTarget("**New for the register** — see ADR-001 D-5.").targetEntityId).toBe(
      "ADR-001",
    );
  });
});

const MARKER_SOURCE = `---
title: "ADR-901: Stack"
type: decision
---

# ADR-901: Stack

**CORRECTED 2026-07-26 — this Consequence originally ended "and the separately-billed model calls behind them", and that half is wrong.**

**Adjudicated 2026-07-26 — the claim it supports is narrower than it read.** Retrieved that day from the vendor announcement, which states "the release candidate is locked as of May 21, 2026" and supersedes the earlier reading.

Corrected 2026-07-26: the Totals row previously stated 192 / 60 / 76 / 56, and the mechanical count establishes 197.

An undated paragraph that previously read "something retired" and carries no date.
`;

describe("extractObligations — dated markers", () => {
  const result = extractObligations({
    sourceNote: "decisions/ADR-901-stack.md",
    content: MARKER_SOURCE,
    sourceEntityId: "ADR-901",
    noteType: "decision",
  });

  test("a marker quoting its retired text yields a self-targeted obligation", () => {
    const marker = result.obligations.find((o) => o.origin === "dated-marker");
    expect(marker?.targetEntityId).toBe("ADR-901");
    expect(marker?.quotedStaleText).toBe("and the separately-billed model calls behind them");
  });

  test("a marker quoting its NEW sources yields no obligation about them", () => {
    const quotes = result.obligations.map((o) => o.quotedStaleText);
    expect(quotes).not.toContain("the release candidate is locked as of May 21, 2026");
    expect(result.unextractable.some((u) => u.reason === "no-quoted-stale-text")).toBe(true);
  });

  test("a marker that retires text without quoting it is UNEXTRACTABLE", () => {
    const anchors = result.unextractable.map((u) => u.sourceAnchor);
    expect(anchors.some((anchor) => anchor.includes("corrected 2026-07-26"))).toBe(true);
  });

  test("an undated retirement is not a marker", () => {
    const quotes = result.obligations.map((o) => o.quotedStaleText);
    expect(quotes).not.toContain("something retired");
  });
});

describe("findCorrectionMarkers", () => {
  test("requires a date alongside the correction verb", () => {
    expect(findCorrectionMarkers("Corrected: something changed.")).toEqual([]);
    expect(findCorrectionMarkers("Corrected 2026-07-26: something changed.")).toHaveLength(1);
  });

  test("admits a dated block on a retirement phrase alone", () => {
    const [marker] = findCorrectionMarkers(
      'Identifier added 2026-07-26: the member was carried as "the old phrasing" in prose.',
    );
    expect(marker?.keyword).toBe("was carried as");
  });

  test("each table row is its own marker span", () => {
    const table = "| a |\n| :-- |\n| Corrected 2026-07-26 |\n| ordinary row |";
    const [marker] = findCorrectionMarkers(table);
    expect(marker?.startLine).toBe(3);
    expect(marker?.endLine).toBe(3);
  });

  test("session notes are exempt from correction-list scanning", () => {
    const ledger = `---
title: "SESSION-2026-07-26_01: Bootstrap"
type: session
---

## Event 156 — the plan corrections land mid-wave

- Changed: PLAN-001 Progress Log — stale 89 corrected to 97 rows
- Next: the loop verifier
`;
    const result = extractObligations({
      sourceNote: "sessions/SESSION-2026-07-26_01-bootstrap.md",
      content: ledger,
      sourceEntityId: "SESSION-2026-07-26_01",
      noteType: "session",
    });
    expect(result.obligations).toEqual([]);
    expect(result.unextractable).toEqual([]);
  });
});
