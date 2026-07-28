import { describe, expect, test } from "bun:test";
import { type AdrNote, AdrNoteSchema } from "@acmelabs/models/schemas/adr-note";

/**
 * Builds a minimal valid ADR note with status PROPOSED. Tests mutate a clone
 * of this to exercise each rejection path in isolation.
 */
function minimalAdr(): AdrNote {
  return {
    frontmatter: {
      title: "ADR-001: Sample Decision",
      type: "decision",
      status: "PROPOSED",
      date: "2026-05-23",
      updated: "2026-05-23",
      permalink: "decisions/adr-001-sample-decision",
      tags: ["decision", "architecture"],
    },
    sections: {
      Context: "The problem statement and forces at play.",
      Decision: "We will do the thing.",
      Consequences: "The thing has tradeoffs.",
    },
    considered_options: [{ name: "Option A", rationale: "Selected because it is simplest." }],
    observations: [
      { category: "decision", text: "obs 1", tags: ["a"] },
      { category: "constraint", text: "obs 2", tags: ["b"] },
      { category: "risk", text: "obs 3", tags: ["c"] },
    ],
    relations: [
      { verb: "part_of", target: "PLAN-001: Sample" },
      { verb: "implemented_by", target: "SPEC-001: Sample" },
    ],
  };
}

describe("AdrNoteSchema", () => {
  test("accepts a minimal valid PROPOSED ADR", () => {
    expect(() => AdrNoteSchema.parse(minimalAdr())).not.toThrow();
  });

  test("accepts a valid ACCEPTED ADR (all clarifications checked, options have rationale)", () => {
    const good = minimalAdr();
    good.frontmatter.status = "ACCEPTED";
    good.clarifications = [
      { text: "Phase 4 convergence PASS", done: true },
      { text: "Security hardening resolved", done: true },
    ];
    expect(() => AdrNoteSchema.parse(good)).not.toThrow();
  });

  test("accepts ACCEPTED ADR with no Clarifications section", () => {
    const good = minimalAdr();
    good.frontmatter.status = "ACCEPTED";
    // clarifications omitted entirely — edge case: validator skips the check
    expect(() => AdrNoteSchema.parse(good)).not.toThrow();
  });

  test("rejects ACCEPTED when a Clarifications item is unchecked", () => {
    const bad = minimalAdr();
    bad.frontmatter.status = "ACCEPTED";
    bad.clarifications = [
      { text: "Resolved item", done: true },
      { text: "Still open item", done: false },
    ];
    expect(() => AdrNoteSchema.parse(bad)).toThrow(/Clarifications item checked/);
  });

  test("rejects ACCEPTED when a Considered Option has empty rationale", () => {
    const bad = minimalAdr();
    bad.frontmatter.status = "ACCEPTED";
    // min(1) on the field allows a single space; the ACCEPTED gate rejects
    // whitespace-only rationale via trim().
    bad.considered_options = [
      { name: "Option A", rationale: "Good reason." },
      { name: "Option B", rationale: " " },
    ];
    expect(() => AdrNoteSchema.parse(bad)).toThrow(/non-empty rationale/);
  });

  test("permits unchecked Clarifications when status is PROPOSED (gate only fires at ACCEPTED)", () => {
    const good = minimalAdr();
    good.frontmatter.status = "PROPOSED";
    good.clarifications = [{ text: "Open item", done: false }];
    expect(() => AdrNoteSchema.parse(good)).not.toThrow();
  });

  test("rejects an empty-string rationale at the field level (min 1)", () => {
    const bad = minimalAdr();
    bad.considered_options = [{ name: "Option A", rationale: "" }];
    expect(() => AdrNoteSchema.parse(bad)).toThrow();
  });

  describe("frontmatter shape failures", () => {
    test("rejects a title not matching ^ADR-\\d{3}", () => {
      const bad = minimalAdr();
      bad.frontmatter.title = "ADR-1: Too Few Digits";
      expect(() => AdrNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a non-decision type literal", () => {
      const bad = minimalAdr();
      // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
      bad.frontmatter.type = "design" as any;
      expect(() => AdrNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a status outside the enum", () => {
      const bad = minimalAdr();
      // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
      bad.frontmatter.status = "DRAFT" as any;
      expect(() => AdrNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a permalink not matching ^decisions/adr-\\d{3}-", () => {
      const bad = minimalAdr();
      bad.frontmatter.permalink = "decision/adr-001-sample";
      expect(() => AdrNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a malformed date field", () => {
      const bad = minimalAdr();
      bad.frontmatter.date = "May 23 2026";
      expect(() => AdrNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a missing updated field", () => {
      const bad = minimalAdr();
      const { updated: _omit, ...frontmatterWithoutUpdated } = bad.frontmatter;
      const withoutUpdated = { ...bad, frontmatter: frontmatterWithoutUpdated };
      expect(() => AdrNoteSchema.parse(withoutUpdated)).toThrow();
    });

    test("rejects fewer than 2 tags", () => {
      const bad = minimalAdr();
      bad.frontmatter.tags = ["decision"];
      expect(() => AdrNoteSchema.parse(bad)).toThrow();
    });

    test("rejects more than 5 tags", () => {
      const bad = minimalAdr();
      bad.frontmatter.tags = ["a", "b", "c", "d", "e", "f"];
      expect(() => AdrNoteSchema.parse(bad)).toThrow();
    });

    test("rejects an unknown frontmatter key (.strict)", () => {
      const bad = minimalAdr();
      // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
      (bad.frontmatter as any).author = "someone";
      expect(() => AdrNoteSchema.parse(bad)).toThrow();
    });
  });

  describe("final-two-sections invariant", () => {
    test("rejects fewer than 3 observations", () => {
      const bad = minimalAdr();
      bad.observations = bad.observations.slice(0, 2);
      expect(() => AdrNoteSchema.parse(bad)).toThrow();
    });

    test("rejects fewer than 2 relations", () => {
      const bad = minimalAdr();
      bad.relations = bad.relations.slice(0, 1);
      expect(() => AdrNoteSchema.parse(bad)).toThrow();
    });

    test("rejects an empty sections record (no prose H2 sections)", () => {
      const bad = minimalAdr();
      bad.sections = {};
      expect(() => AdrNoteSchema.parse(bad)).toThrow();
    });
  });

  describe("relation verb allowlist (from common.ts)", () => {
    test("rejects a forbidden relation verb", () => {
      const bad = minimalAdr();
      bad.relations = [
        // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
        { verb: "reviews" as any, target: "CRIT-001: Sample" },
        { verb: "part_of", target: "PLAN-001: Sample" },
      ];
      expect(() => AdrNoteSchema.parse(bad)).toThrow();
    });

    test("accepts all-allowlist relation verbs", () => {
      const good = minimalAdr();
      good.relations = [
        { verb: "implemented_by", target: "SPEC-001: Sample" },
        { verb: "leads_to", target: "ADR-002: Next" },
        { verb: "supersedes", target: "ADR-000: Prior" },
      ];
      expect(() => AdrNoteSchema.parse(good)).not.toThrow();
    });

    test("rejects an unknown key on a relation entry (.strict)", () => {
      const bad = minimalAdr();
      bad.relations = [
        // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
        { verb: "part_of", target: "PLAN-001: Sample", weight: 1 } as any,
        { verb: "implemented_by", target: "SPEC-001: Sample" },
      ];
      expect(() => AdrNoteSchema.parse(bad)).toThrow();
    });
  });
});
