import { describe, expect, test } from "bun:test";
import { type AnalysisNote, AnalysisNoteSchema } from "../../src/schemas/analysis-note.js";

/**
 * Builds a minimal valid ANALYSIS note with status DRAFT. Tests mutate a clone
 * of this to exercise each rejection path in isolation.
 */
function minimalAnalysis(): AnalysisNote {
  return {
    frontmatter: {
      title: "ANALYSIS-001: Sample Investigation",
      type: "analysis",
      status: "DRAFT",
      permalink: "analysis/analysis-001-sample-investigation",
      tags: ["analysis", "investigation"],
    },
    sections: {
      Background: "The context for the analysis.",
      Findings: "What we learned.",
      Recommendations: "What we propose.",
    },
    observations: [
      { category: "fact", text: "obs 1", tags: ["a"] },
      { category: "insight", text: "obs 2", tags: ["b"] },
      { category: "decision", text: "obs 3", tags: ["c"] },
    ],
    relations: [
      { verb: "part_of", target: "PLAN-001: Sample" },
      { verb: "relates_to", target: "SPEC-001: Sample" },
    ],
  };
}

describe("AnalysisNoteSchema", () => {
  test("accepts a minimal valid DRAFT analysis", () => {
    expect(() => AnalysisNoteSchema.parse(minimalAnalysis())).not.toThrow();
  });

  test("accepts a valid ACCEPTED analysis (no Open Questions section)", () => {
    const good = minimalAnalysis();
    good.frontmatter.status = "ACCEPTED";
    expect(() => AnalysisNoteSchema.parse(good)).not.toThrow();
  });

  test("rejects ACCEPTED when an `## Open Questions` section is present", () => {
    const bad = minimalAnalysis();
    bad.frontmatter.status = "ACCEPTED";
    bad.sections = {
      ...bad.sections,
      "Open Questions": "1. Is X true? 2. Is Y true?",
    };
    expect(() => AnalysisNoteSchema.parse(bad)).toThrow(/Open Questions/);
  });

  test("accepts DRAFT with `## Open Questions` present (rule only fires at ACCEPTED)", () => {
    const good = minimalAnalysis();
    good.frontmatter.status = "DRAFT";
    good.sections = {
      ...good.sections,
      "Open Questions": "What about Z?",
    };
    expect(() => AnalysisNoteSchema.parse(good)).not.toThrow();
  });

  test("accepts IN_PROGRESS with `## Open Questions` present (rule only fires at ACCEPTED)", () => {
    const good = minimalAnalysis();
    good.frontmatter.status = "IN_PROGRESS";
    good.sections = {
      ...good.sections,
      "Open Questions": "Mid-analysis questions.",
    };
    expect(() => AnalysisNoteSchema.parse(good)).not.toThrow();
  });

  test("accepts ACCEPTED with prose mentioning open questions in another section (substring is NOT detection)", () => {
    const good = minimalAnalysis();
    good.frontmatter.status = "ACCEPTED";
    good.sections = {
      ...good.sections,
      // The substring "open questions" appears in Findings prose, but no
      // section is keyed "Open Questions" — must pass.
      Findings: "Several open questions were resolved during the analysis.",
    };
    expect(() => AnalysisNoteSchema.parse(good)).not.toThrow();
  });

  describe("frontmatter shape failures", () => {
    test("rejects a title not matching ^ANALYSIS-\\d{3}", () => {
      const bad = minimalAnalysis();
      bad.frontmatter.title = "ANALYSIS-1: Too Few Digits";
      expect(() => AnalysisNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a non-analysis type literal", () => {
      const bad = minimalAnalysis();
      // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
      bad.frontmatter.type = "decision" as any;
      expect(() => AnalysisNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a status outside the enum", () => {
      const bad = minimalAnalysis();
      // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
      bad.frontmatter.status = "BOGUS" as any;
      expect(() => AnalysisNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a permalink not matching ^analysis/", () => {
      const bad = minimalAnalysis();
      bad.frontmatter.permalink = "analyses/analysis-001-sample";
      expect(() => AnalysisNoteSchema.parse(bad)).toThrow();
    });

    test("rejects fewer than 2 tags", () => {
      const bad = minimalAnalysis();
      bad.frontmatter.tags = ["analysis"];
      expect(() => AnalysisNoteSchema.parse(bad)).toThrow();
    });

    test("rejects more than 5 tags", () => {
      const bad = minimalAnalysis();
      bad.frontmatter.tags = ["a", "b", "c", "d", "e", "f"];
      expect(() => AnalysisNoteSchema.parse(bad)).toThrow();
    });

    test("rejects an unknown frontmatter key (.strict)", () => {
      const bad = minimalAnalysis();
      // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
      (bad.frontmatter as any).author = "someone";
      expect(() => AnalysisNoteSchema.parse(bad)).toThrow();
    });

    test("rejects an ADR-style `date` field (ANALYSIS does not use date/updated)", () => {
      const bad = minimalAnalysis();
      // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
      (bad.frontmatter as any).date = "2026-05-24";
      expect(() => AnalysisNoteSchema.parse(bad)).toThrow();
    });
  });

  describe("final-two-sections invariant", () => {
    test("rejects fewer than 3 observations", () => {
      const bad = minimalAnalysis();
      bad.observations = bad.observations.slice(0, 2);
      expect(() => AnalysisNoteSchema.parse(bad)).toThrow();
    });

    test("rejects fewer than 2 relations", () => {
      const bad = minimalAnalysis();
      bad.relations = bad.relations.slice(0, 1);
      expect(() => AnalysisNoteSchema.parse(bad)).toThrow();
    });

    test("rejects an empty sections record (no prose H2 sections)", () => {
      const bad = minimalAnalysis();
      bad.sections = {};
      expect(() => AnalysisNoteSchema.parse(bad)).toThrow();
    });
  });

  describe("relation verb allowlist (from common.ts)", () => {
    test("rejects a forbidden relation verb", () => {
      const bad = minimalAnalysis();
      bad.relations = [
        // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
        { verb: "reviews" as any, target: "CRIT-001: Sample" },
        { verb: "part_of", target: "PLAN-001: Sample" },
      ];
      expect(() => AnalysisNoteSchema.parse(bad)).toThrow();
    });

    test("accepts all-allowlist relation verbs", () => {
      const good = minimalAnalysis();
      good.relations = [
        { verb: "implemented_by", target: "SPEC-001: Sample" },
        { verb: "leads_to", target: "ADR-002: Next" },
        { verb: "supersedes", target: "ANALYSIS-000: Prior" },
      ];
      expect(() => AnalysisNoteSchema.parse(good)).not.toThrow();
    });

    test("rejects an unknown key on a relation entry (.strict)", () => {
      const bad = minimalAnalysis();
      bad.relations = [
        // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
        { verb: "part_of", target: "PLAN-001: Sample", weight: 1 } as any,
        { verb: "relates_to", target: "SPEC-001: Sample" },
      ];
      expect(() => AnalysisNoteSchema.parse(bad)).toThrow();
    });
  });
});
