import { describe, expect, test } from "bun:test";
import { type EpicNote, EpicNoteSchema } from "../../src/schemas/epic-note.js";

/**
 * Builds a minimal valid EPIC note with status DRAFT and zero `contains`
 * relations. Tests mutate a clone of this to exercise each rejection path
 * in isolation.
 */
function minimalEpic(): EpicNote {
  return {
    frontmatter: {
      title: "EPIC-001: Sample Product Initiative",
      type: "epic",
      status: "DRAFT",
      permalink: "roadmap/epic-001-sample-product-initiative",
      tags: ["epic", "roadmap"],
    },
    sections: {
      "Epic Statement": "As a team we want X so that Y.",
      "Vision Statement": "Concrete outcome description.",
      Scope: "What is in and out of scope.",
    },
    observations: [
      { category: "decision", text: "obs 1", tags: ["a"] },
      { category: "fact", text: "obs 2", tags: ["b"] },
      { category: "risk", text: "obs 3", tags: ["c"] },
    ],
    relations: [
      { verb: "implements", target: "ADR-001: Sample" },
      { verb: "relates_to", target: "PLAN-001: Sample" },
    ],
  };
}

/**
 * Builds a valid EPIC with `contains` relations and the matching Contained
 * Specs body section. Status DONE per the TASK DoD case list.
 */
function epicWithContainedSpecs(): EpicNote {
  const base = minimalEpic();
  base.frontmatter.status = "DONE";
  base.sections = {
    ...base.sections,
    "Contained Specs":
      "| # | Feature | Priority |\n| --- | --- | --- |\n| SPEC-001 | Alpha | P0 |\n| SPEC-002 | Beta | P1 |",
  };
  base.relations = [
    { verb: "implements", target: "ADR-001: Sample" },
    { verb: "contains", target: "SPEC-001: Alpha" },
    { verb: "contains", target: "SPEC-002: Beta" },
  ];
  return base;
}

describe("EpicNoteSchema", () => {
  test("accepts a minimal valid DRAFT epic (no contains relations)", () => {
    expect(() => EpicNoteSchema.parse(minimalEpic())).not.toThrow();
  });

  test("accepts a valid DONE epic with contains relations and Contained Specs section", () => {
    expect(() => EpicNoteSchema.parse(epicWithContainedSpecs())).not.toThrow();
  });

  test("rejects an epic with `contains` relations but no Contained Specs section", () => {
    const bad = epicWithContainedSpecs();
    // Strip the Contained Specs section while leaving contains relations intact.
    const { "Contained Specs": _omitted, ...rest } = bad.sections;
    bad.sections = rest;
    expect(() => EpicNoteSchema.parse(bad)).toThrow(/Contained Specs/);
  });

  test("accepts an epic with zero contains relations and no Contained Specs section (rule only fires when contains present)", () => {
    const good = minimalEpic();
    // Explicit: only non-contains relations
    good.relations = [
      { verb: "implements", target: "ADR-001: Sample" },
      { verb: "depends_on", target: "EPIC-000: Prior" },
    ];
    expect(() => EpicNoteSchema.parse(good)).not.toThrow();
  });

  test("accepts an epic where Contained Specs section presence is detected by exact key (not substring on prose)", () => {
    const good = epicWithContainedSpecs();
    // Add another section whose prose mentions "contained specs" inline; the
    // canonical "Contained Specs" key is what counts.
    good.sections = {
      ...good.sections,
      Notes: "Discussion mentioning contained specs in prose.",
    };
    expect(() => EpicNoteSchema.parse(good)).not.toThrow();
  });

  test("rejects when prose mentions 'contained specs' but the canonical section key is absent", () => {
    const bad = epicWithContainedSpecs();
    const { "Contained Specs": _omitted, ...rest } = bad.sections;
    bad.sections = {
      ...rest,
      Notes: "We have several contained specs to deliver this quarter.",
    };
    expect(() => EpicNoteSchema.parse(bad)).toThrow(/Contained Specs/);
  });

  describe("frontmatter shape failures", () => {
    test("rejects a title not matching ^EPIC-\\d{3}", () => {
      const bad = minimalEpic();
      bad.frontmatter.title = "EPIC-1: Too Few Digits";
      expect(() => EpicNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a non-epic type literal", () => {
      const bad = minimalEpic();
      // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
      bad.frontmatter.type = "decision" as any;
      expect(() => EpicNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a status outside the enum", () => {
      const bad = minimalEpic();
      // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
      bad.frontmatter.status = "BOGUS" as any;
      expect(() => EpicNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a permalink not matching ^roadmap/", () => {
      const bad = minimalEpic();
      bad.frontmatter.permalink = "epics/epic-001-sample";
      expect(() => EpicNoteSchema.parse(bad)).toThrow();
    });

    test("rejects fewer than 2 tags", () => {
      const bad = minimalEpic();
      bad.frontmatter.tags = ["epic"];
      expect(() => EpicNoteSchema.parse(bad)).toThrow();
    });

    test("rejects more than 5 tags", () => {
      const bad = minimalEpic();
      bad.frontmatter.tags = ["a", "b", "c", "d", "e", "f"];
      expect(() => EpicNoteSchema.parse(bad)).toThrow();
    });

    test("rejects an unknown frontmatter key (.strict)", () => {
      const bad = minimalEpic();
      // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
      (bad.frontmatter as any).owner = "someone";
      expect(() => EpicNoteSchema.parse(bad)).toThrow();
    });

    test("rejects an ADR-style `date` field (EPIC does not use date/updated)", () => {
      const bad = minimalEpic();
      // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
      (bad.frontmatter as any).date = "2026-05-24";
      expect(() => EpicNoteSchema.parse(bad)).toThrow();
    });
  });

  describe("final-two-sections invariant", () => {
    test("rejects fewer than 3 observations", () => {
      const bad = minimalEpic();
      bad.observations = bad.observations.slice(0, 2);
      expect(() => EpicNoteSchema.parse(bad)).toThrow();
    });

    test("rejects fewer than 2 relations", () => {
      const bad = minimalEpic();
      bad.relations = bad.relations.slice(0, 1);
      expect(() => EpicNoteSchema.parse(bad)).toThrow();
    });

    test("rejects an empty sections record (no prose H2 sections)", () => {
      const bad = minimalEpic();
      bad.sections = {};
      expect(() => EpicNoteSchema.parse(bad)).toThrow();
    });
  });

  describe("relation verb allowlist (from common.ts)", () => {
    test("rejects a forbidden relation verb", () => {
      const bad = minimalEpic();
      bad.relations = [
        // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
        { verb: "reviews" as any, target: "CRIT-001: Sample" },
        { verb: "implements", target: "ADR-001: Sample" },
      ];
      expect(() => EpicNoteSchema.parse(bad)).toThrow();
    });

    test("accepts all-allowlist relation verbs (including contains with matching section)", () => {
      const good = epicWithContainedSpecs();
      good.relations = [
        { verb: "implements", target: "ADR-001: Sample" },
        { verb: "contains", target: "SPEC-001: Alpha" },
        { verb: "depends_on", target: "EPIC-000: Prior" },
        { verb: "leads_to", target: "EPIC-002: Next" },
      ];
      expect(() => EpicNoteSchema.parse(good)).not.toThrow();
    });

    test("rejects an unknown key on a relation entry (.strict)", () => {
      const bad = minimalEpic();
      bad.relations = [
        // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
        { verb: "implements", target: "ADR-001: Sample", weight: 1 } as any,
        { verb: "relates_to", target: "PLAN-001: Sample" },
      ];
      expect(() => EpicNoteSchema.parse(bad)).toThrow();
    });
  });
});
