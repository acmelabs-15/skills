import { describe, expect, test } from "bun:test";
import { reconcile, verifyObligation } from "@acmelabs/core/core/correction-verify";
import { type IndexedNote, NoteIndex } from "@acmelabs/core/core/note-index";
import type { CorrectionObligation } from "@acmelabs/core/schemas/correction-obligation";
import { ReconcileReportSchema } from "@acmelabs/core/schemas/correction-obligation";

function note(partial: Partial<IndexedNote> & { path: string; content: string }): IndexedNote {
  const title = partial.title ?? "ANALYSIS-902: Target";
  return {
    path: partial.path,
    title,
    entityId: partial.entityId ?? title.slice(0, title.indexOf(":")),
    permalink: partial.permalink ?? "",
    noteType: partial.noteType ?? "analysis",
    content: partial.content,
  };
}

function obligation(overrides: Partial<CorrectionObligation> = {}): CorrectionObligation {
  return {
    sourceNote: "analysis/ANALYSIS-901-adjudication.md",
    sourceAnchor: "3.7 Corrections — item 1",
    targetNote: "ANALYSIS-902 Section 5.4",
    targetEntityId: "ANALYSIS-902",
    targetSection: "Section 5.4",
    quotedStaleText: "reset to false three times as often",
    alternateQuotes: [],
    mandatedChange: "the ratio is 1:1 at runtime",
    origin: "correction-list",
    ...overrides,
  };
}

function indexOf(...notes: IndexedNote[]): NoteIndex {
  return new NoteIndex("/docs", notes);
}

const OUTSTANDING_TARGET = `---
title: "ANALYSIS-902: Target"
---

# ANALYSIS-902: Target

## 5.4 The flag

The flag is reset to false three times as often as it is set to true.
`;

const LANDED_TARGET = `---
title: "ANALYSIS-902: Target"
---

# ANALYSIS-902: Target

## 5.4 The flag

The flag is reset once per announcement cycle.

**CORRECTED 2026-07-26 — this paragraph previously read that the flag is "reset to false three times as often" as it is set, and the ratio is 1:1 at runtime.**
`;

const LANDED_UNMARKED_TARGET = `---
title: "ANALYSIS-902: Target"
---

# ANALYSIS-902: Target

## 5.4 The flag

The flag is reset once per announcement cycle.
`;

describe("verifyObligation", () => {
  test("OUTSTANDING when the retired text is still a live assertion", () => {
    const finding = verifyObligation(obligation(), {
      index: indexOf(note({ path: "analysis/a-902.md", content: OUTSTANDING_TARGET })),
    });
    expect(finding.verdict).toBe("OUTSTANDING");
    expect(finding.liveOccurrences).toHaveLength(1);
    expect(finding.liveOccurrences[0]?.line).toBe(9);
    expect(finding.detail).toContain("line 9");
  });

  test("LANDED when the only surviving copy sits inside a dated marker", () => {
    const finding = verifyObligation(obligation(), {
      index: indexOf(note({ path: "analysis/a-902.md", content: LANDED_TARGET })),
    });
    expect(finding.verdict).toBe("LANDED");
    expect(finding.liveOccurrences).toEqual([]);
    expect(finding.retiredOccurrences).toHaveLength(1);
    expect(finding.retiredOccurrences[0]?.insideMarker).toBe(true);
  });

  test("LANDED-UNMARKED when the text is gone and nothing records the change", () => {
    const finding = verifyObligation(obligation(), {
      index: indexOf(note({ path: "analysis/a-902.md", content: LANDED_UNMARKED_TARGET })),
    });
    expect(finding.verdict).toBe("LANDED-UNMARKED");
    expect(finding.markerEvidence).toBeUndefined();
    expect(finding.detail).toContain("nothing in the target records");
  });

  test("LANDED on marker evidence in the named section when no copy survives", () => {
    const withMarker = LANDED_UNMARKED_TARGET.replace(
      "The flag is reset once per announcement cycle.",
      "The flag is reset once per announcement cycle.\n\n**Corrected 2026-07-26 per the adjudication — the ratio claim was withdrawn.**",
    );
    const finding = verifyObligation(obligation(), {
      index: indexOf(note({ path: "analysis/a-902.md", content: withMarker })),
    });
    expect(finding.verdict).toBe("LANDED");
    expect(finding.markerEvidence?.scope).toBe("section");
  });

  test("TARGET-NOT-FOUND when no note carries the identity", () => {
    const finding = verifyObligation(obligation({ targetEntityId: "ANALYSIS-999" }), {
      index: indexOf(note({ path: "analysis/a-902.md", content: LANDED_TARGET })),
    });
    expect(finding.verdict).toBe("TARGET-NOT-FOUND");
    expect(finding.detail).toContain("ANALYSIS-999");
  });

  test("TARGET-NOT-FOUND rather than a guess when two notes claim the ID", () => {
    const duplicated = indexOf(
      note({ path: "analysis/a-902.md", content: LANDED_TARGET }),
      note({ path: "analysis/a-902-copy.md", content: LANDED_TARGET }),
    );
    const finding = verifyObligation(obligation({ targetNote: "ANALYSIS-902" }), {
      index: duplicated,
    });
    expect(finding.verdict).toBe("TARGET-NOT-FOUND");
    expect(finding.detail).toContain("refusing to guess");
  });

  test("resolves a target written as an entity ID plus a section", () => {
    const finding = verifyObligation(obligation(), {
      index: indexOf(note({ path: "analysis/a-902.md", content: LANDED_TARGET })),
    });
    expect(finding.targetPath).toBe("analysis/a-902.md");
  });

  test("every alternate quote is checked, not only the primary", () => {
    const target = LANDED_TARGET.replace(
      "The flag is reset once per announcement cycle.",
      "The flag is reset once per cycle, the exact shape the model has no answer for.",
    );
    const finding = verifyObligation(
      obligation({ alternateQuotes: ["the exact shape the model has no answer for"] }),
      { index: indexOf(note({ path: "analysis/a-902.md", content: target })) },
    );
    expect(finding.verdict).toBe("OUTSTANDING");
    expect(finding.liveOccurrences[0]?.quote).toBe("the exact shape the model has no answer for");
  });

  test("matches through emphasis the target added and the source did not quote", () => {
    const target = OUTSTANDING_TARGET.replace(
      "reset to false three times",
      "reset to `false` **three** times",
    );
    const finding = verifyObligation(obligation(), {
      index: indexOf(note({ path: "analysis/a-902.md", content: target })),
    });
    expect(finding.verdict).toBe("OUTSTANDING");
  });
});

describe("reconcile", () => {
  const index = indexOf(
    note({ path: "analysis/a-902.md", content: OUTSTANDING_TARGET }),
    note({
      path: "analysis/a-903.md",
      title: "ANALYSIS-903: Other",
      content: LANDED_TARGET.replace("ANALYSIS-902", "ANALYSIS-903"),
    }),
  );
  const report = reconcile({
    docsRoot: "/docs",
    sources: ["analysis/ANALYSIS-901-adjudication.md"],
    obligations: [
      obligation(),
      obligation({ targetEntityId: "ANALYSIS-903", targetNote: "ANALYSIS-903" }),
    ],
    unextractable: [
      {
        sourceNote: "analysis/ANALYSIS-901-adjudication.md",
        sourceAnchor: "3.7 Corrections — item 3",
        reason: "no-resolvable-target",
        rawText: "**Both notes** — no target named.",
      },
    ],
    index,
    now: "2026-07-26T00:00:00.000Z",
  });

  test("summary counts each verdict and closes only with nothing outstanding", () => {
    expect(report.summary).toEqual({
      total: 2,
      outstanding: 1,
      landed: 1,
      landedUnmarked: 0,
      targetNotFound: 0,
      unextractable: 1,
      closed: false,
    });
  });

  test("findings are ordered deterministically by target", () => {
    expect(report.findings.map((f) => f.obligation.targetEntityId)).toEqual([
      "ANALYSIS-902",
      "ANALYSIS-903",
    ]);
  });

  test("the report satisfies its own schema", () => {
    expect(() => ReconcileReportSchema.parse(report)).not.toThrow();
  });

  test("an injected clock makes the report byte-comparable", () => {
    expect(report.generatedAt).toBe("2026-07-26T00:00:00.000Z");
  });
});
