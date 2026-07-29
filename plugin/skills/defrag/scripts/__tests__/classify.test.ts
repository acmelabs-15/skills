import { describe, expect, test } from "bun:test";
import { type AuditEvidence, DEFAULT_THRESHOLDS, classify, evaluateDraft } from "../audit.ts";

/**
 * Direct tests for `classify` and `evaluateDraft`.
 *
 * `classify` was previously reachable only through `audit()`, which walks a
 * filesystem — so every assertion about which bucket a note lands in had to be
 * made through a directory fixture, and the boundaries themselves were never
 * pinned. These tests exercise the decision directly, one threshold at a time,
 * so a change to a boundary fails here rather than in a consumer.
 */

/** Evidence for a note that violates nothing. Override one field per test. */
function clean(over: Partial<AuditEvidence> = {}): AuditEvidence {
  return {
    observationCount: 8,
    relationCount: 5,
    lineCount: 200,
    hasObservationH3Grouping: false,
    hasRelationH3Grouping: false,
    lastModifiedISO: new Date().toISOString(),
    status: "IN_PROGRESS",
    ...over,
  };
}

const types = (cs: { violationType: string }[]) => cs.map((c) => c.violationType).sort();

describe("classify — a note in good standing", () => {
  test("produces no candidates", () => {
    expect(classify("docs/a.md", "analysis", clean(), DEFAULT_THRESHOLDS)).toEqual([]);
  });
});

describe("classify — split", () => {
  test("observations past the cap without H3 grouping split", () => {
    const cs = classify(
      "docs/a.md",
      "analysis",
      clean({ observationCount: 16 }),
      DEFAULT_THRESHOLDS,
    );
    expect(types(cs)).toContain("split");
  });

  test("H3 grouping is the sanctioned escape from the observation cap", () => {
    const cs = classify(
      "docs/a.md",
      "analysis",
      clean({ observationCount: 16, hasObservationH3Grouping: true }),
      DEFAULT_THRESHOLDS,
    );
    expect(types(cs)).not.toContain("split");
  });

  test("the cap is exclusive — exactly at the limit is not a violation", () => {
    const cs = classify(
      "docs/a.md",
      "analysis",
      clean({ observationCount: 15 }),
      DEFAULT_THRESHOLDS,
    );
    expect(cs).toEqual([]);
  });

  test("line count past the threshold splits", () => {
    const cs = classify("docs/a.md", "analysis", clean({ lineCount: 501 }), DEFAULT_THRESHOLDS);
    expect(types(cs)).toContain("split");
  });

  test("a caller-supplied lineMax is honoured over the default", () => {
    const cs = classify("docs/a.md", "analysis", clean({ lineCount: 250 }), {
      ...DEFAULT_THRESHOLDS,
      lineMax: 200,
    });
    expect(types(cs)).toContain("split");
  });
});

describe("classify — structural-fix", () => {
  test("relations past the cap without H3 grouping need a structural fix", () => {
    const cs = classify("docs/a.md", "analysis", clean({ relationCount: 13 }), DEFAULT_THRESHOLDS);
    expect(types(cs)).toContain("structural-fix");
  });

  test("H3 grouping is the sanctioned escape from the relation cap", () => {
    const cs = classify(
      "docs/a.md",
      "analysis",
      clean({ relationCount: 13, hasRelationH3Grouping: true }),
      DEFAULT_THRESHOLDS,
    );
    expect(types(cs)).not.toContain("structural-fix");
  });
});

describe("classify — merge", () => {
  /**
   * Under-minimum counts mean the note is too thin to stand alone, so the
   * remedy is folding it into a fuller one — not restructuring it in place.
   * Worth pinning: "below a minimum" reads like a structural defect, and the
   * classifier deliberately treats it as a merge candidate instead.
   */
  test("too few observations makes a note a merge candidate", () => {
    const cs = classify(
      "docs/a.md",
      "analysis",
      clean({ observationCount: 2 }),
      DEFAULT_THRESHOLDS,
    );
    expect(types(cs)).toContain("merge");
  });

  test("too few relations makes a note a merge candidate", () => {
    const cs = classify("docs/a.md", "analysis", clean({ relationCount: 1 }), DEFAULT_THRESHOLDS);
    expect(types(cs)).toContain("merge");
  });
});

describe("classify — stale", () => {
  const longAgo = new Date(Date.now() - 200 * 86400000).toISOString();

  test("an untouched note past the window is stale", () => {
    const cs = classify(
      "docs/a.md",
      "analysis",
      clean({ status: "IN_PROGRESS", lastModifiedISO: longAgo }),
      DEFAULT_THRESHOLDS,
    );
    expect(types(cs)).toContain("stale");
  });

  test("a finished note is exempt — DONE and DEPRECATED are terminal, not neglected", () => {
    for (const status of ["DONE", "DEPRECATED"]) {
      const cs = classify(
        "docs/a.md",
        "analysis",
        clean({ status, lastModifiedISO: longAgo }),
        DEFAULT_THRESHOLDS,
      );
      expect(types(cs)).not.toContain("stale");
    }
  });

  test("a note with no recorded modification time is never stale", () => {
    const cs = classify(
      "docs/a.md",
      "analysis",
      clean({ status: "IN_PROGRESS", lastModifiedISO: null }),
      DEFAULT_THRESHOLDS,
    );
    expect(types(cs)).not.toContain("stale");
  });
});

describe("classify — one note can land in several buckets", () => {
  test("there is no early return, so violations accumulate", () => {
    const cs = classify(
      "docs/a.md",
      "analysis",
      clean({ observationCount: 20, relationCount: 20, lineCount: 900 }),
      DEFAULT_THRESHOLDS,
    );
    expect(cs.length).toBeGreaterThan(1);
    expect(new Set(types(cs)).size).toBeGreaterThan(1);
  });
});

describe("evaluateDraft", () => {
  const bigDraft = [
    "---",
    "type: analysis",
    "status: DRAFT",
    "---",
    "# A",
    "## Observations",
    ...Array.from({ length: 20 }, (_, i) => `- [fact] observation ${i} #tag`),
    "## Relations",
    "- relates_to [[B]]",
    "- relates_to [[C]]",
  ].join("\n");

  test("classifies text that is not on disk", () => {
    expect(types(evaluateDraft(bigDraft, "analysis"))).toContain("split");
  });

  test("reaches the same verdict as the written-note path", () => {
    const viaDraft = types(evaluateDraft(bigDraft, "analysis"));
    const viaClassify = types(
      classify(
        "<draft>",
        "analysis",
        {
          observationCount: 20,
          relationCount: 2,
          lineCount: bigDraft.split("\n").length,
          hasObservationH3Grouping: false,
          hasRelationH3Grouping: false,
          lastModifiedISO: null,
          status: "DRAFT",
        },
        DEFAULT_THRESHOLDS,
      ),
    );
    expect(viaDraft).toEqual(viaClassify);
  });

  test("the stale bucket is unreachable for a draft — it has no git history", () => {
    expect(types(evaluateDraft(bigDraft, "analysis"))).not.toContain("stale");
  });

  test("honours a partial threshold override", () => {
    const small = ["---", "type: analysis", "---", "# A", "line", "line"].join("\n");
    expect(types(evaluateDraft(small, "analysis", "<draft>", { lineMax: 3 }))).toContain("split");
  });

  test("labels candidates with the supplied path", () => {
    const cs = evaluateDraft(bigDraft, "analysis", "docs/analysis/pending.md");
    expect(cs.every((c) => c.path === "docs/analysis/pending.md")).toBe(true);
  });
});
