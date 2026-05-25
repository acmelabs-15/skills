import { describe, expect, test } from "bun:test";
import { type CritNote, CritNoteSchema } from "../../src/schemas/crit-note.js";

/**
 * Builds a minimal valid CRIT note (parent of ADR-001) with status DRAFT
 * and one P1 finding. Tests mutate a clone of this to exercise each
 * rejection path in isolation.
 */
function minimalCrit(): CritNote {
  return {
    frontmatter: {
      title: "CRIT-001-ADR-001: Composition Library Debate",
      type: "critique",
      status: "DRAFT",
      permalink: "critique/crit-001-adr-001-composition-library-debate",
      tags: ["critique", "adr-review"],
    },
    sections: {
      "Verdict Tally":
        "| Agent | Verdict | Confidence |\n| --- | --- | --- |\n| architect | PASS | high |\n| critic | PASS | medium |\n| **Consensus** | **PASS** | **high** |",
      Context: "Multi-agent review of ADR-001 composition library scope.",
      "P1 Issues": "- finding 1 (flagged by critic)",
    },
    findings: [
      {
        severity: "P1",
        description: "Bun.write requires explicit mkdir for nested paths",
        recommendation: "Document the no-mkdir contract in the parser README",
      },
    ],
    observations: [
      { category: "decision", text: "obs 1", tags: ["a"] },
      { category: "fact", text: "obs 2", tags: ["b"] },
      { category: "risk", text: "obs 3", tags: ["c"] },
    ],
    relations: [
      { verb: "relates_to", target: "ADR-001: Composition Library Architecture" },
      { verb: "part_of", target: "SPEC-008: Protocol Hardening Wave 2" },
    ],
  };
}

describe("CritNoteSchema", () => {
  test("accepts a minimal valid DRAFT crit (parent ADR, 1 finding)", () => {
    expect(() => CritNoteSchema.parse(minimalCrit())).not.toThrow();
  });

  test("accepts CRIT against each of the six parent entity types", () => {
    const parents: ReadonlyArray<"ADR" | "ANALYSIS" | "SPEC" | "REQ" | "DESIGN" | "TASK"> = [
      "ADR",
      "ANALYSIS",
      "SPEC",
      "REQ",
      "DESIGN",
      "TASK",
    ];
    for (const parent of parents) {
      const good = minimalCrit();
      good.frontmatter.title = `CRIT-001-${parent}-001: Sample ${parent} Critique`;
      expect(() => CritNoteSchema.parse(good)).not.toThrow();
    }
  });

  describe("parent-reference regex", () => {
    test("rejects un-parented form (just CRIT-NNN-...)", () => {
      const bad = minimalCrit();
      bad.frontmatter.title = "CRIT-001-Just-A-Title";
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a title missing PARENT-NNN segment", () => {
      const bad = minimalCrit();
      bad.frontmatter.title = "CRIT-001: No Parent At All";
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a PARENT-TYPE not in the six-allowlist (PLAN)", () => {
      const bad = minimalCrit();
      bad.frontmatter.title = "CRIT-001-PLAN-001: PLAN Is Not Parent-Referenceable";
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a PARENT-TYPE not in the six-allowlist (EPIC)", () => {
      const bad = minimalCrit();
      bad.frontmatter.title = "CRIT-001-EPIC-001: EPIC Is Not Parent-Referenceable";
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects CRIT-NNN with too few digits", () => {
      const bad = minimalCrit();
      bad.frontmatter.title = "CRIT-1-ADR-001: Too Few CRIT Digits";
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects PARENT-NNN with too few digits", () => {
      const bad = minimalCrit();
      bad.frontmatter.title = "CRIT-001-ADR-1: Too Few Parent Digits";
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects lowercase parent type", () => {
      const bad = minimalCrit();
      bad.frontmatter.title = "CRIT-001-adr-001: Lowercase Parent";
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });
  });

  describe("findings array", () => {
    test("rejects a crit with zero findings", () => {
      const bad = minimalCrit();
      bad.findings = [];
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a crit missing the findings field entirely", () => {
      // Build the object without `findings` rather than deleting it; biome's
      // noDelete rule forbids the delete operator.
      const { findings: _omitted, ...rest } = minimalCrit();
      expect(() => CritNoteSchema.parse(rest)).toThrow();
    });

    test("rejects a finding with an invalid severity", () => {
      const bad = minimalCrit();
      bad.findings = [
        // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
        { severity: "P3" as any, description: "x", recommendation: "y" },
      ];
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a finding with an empty description", () => {
      const bad = minimalCrit();
      bad.findings = [{ severity: "P1", description: "", recommendation: "y" }];
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a finding with an empty recommendation", () => {
      const bad = minimalCrit();
      bad.findings = [{ severity: "P1", description: "x", recommendation: "" }];
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects an unknown key on a finding entry (.strict)", () => {
      const bad = minimalCrit();
      bad.findings = [
        // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
        { severity: "P1", description: "x", recommendation: "y", reporter: "architect" } as any,
      ];
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("accepts multiple findings across severities", () => {
      const good = minimalCrit();
      good.findings = [
        { severity: "P0", description: "blocker", recommendation: "fix now" },
        { severity: "P1", description: "important", recommendation: "fix soon" },
        { severity: "P2", description: "polish", recommendation: "next sprint" },
      ];
      expect(() => CritNoteSchema.parse(good)).not.toThrow();
    });
  });

  describe("frontmatter shape failures", () => {
    test("rejects a non-critique type literal", () => {
      const bad = minimalCrit();
      // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
      bad.frontmatter.type = "decision" as any;
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a status outside the enum", () => {
      const bad = minimalCrit();
      // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
      bad.frontmatter.status = "BOGUS" as any;
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a permalink not matching ^critique/", () => {
      const bad = minimalCrit();
      bad.frontmatter.permalink = "decisions/crit-001-adr-001-debate";
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects fewer than 2 tags", () => {
      const bad = minimalCrit();
      bad.frontmatter.tags = ["critique"];
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects more than 5 tags", () => {
      const bad = minimalCrit();
      bad.frontmatter.tags = ["a", "b", "c", "d", "e", "f"];
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects an unknown frontmatter key (.strict)", () => {
      const bad = minimalCrit();
      // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
      (bad.frontmatter as any).reviewer = "architect";
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects an ADR-style `date` field (CRIT does not use date/updated)", () => {
      const bad = minimalCrit();
      // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
      (bad.frontmatter as any).date = "2026-05-24";
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });
  });

  describe("final-two-sections invariant", () => {
    test("rejects fewer than 3 observations", () => {
      const bad = minimalCrit();
      bad.observations = bad.observations.slice(0, 2);
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects fewer than 2 relations", () => {
      const bad = minimalCrit();
      bad.relations = bad.relations.slice(0, 1);
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects an empty sections record (no prose H2 sections)", () => {
      const bad = minimalCrit();
      bad.sections = {};
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });
  });

  describe("relation verb allowlist (from common.ts)", () => {
    test("rejects a forbidden relation verb (`reviews`)", () => {
      const bad = minimalCrit();
      bad.relations = [
        // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
        { verb: "reviews" as any, target: "ADR-001: Sample" },
        { verb: "part_of", target: "SPEC-008: Sample" },
      ];
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects a forbidden relation verb (`derives_from`)", () => {
      const bad = minimalCrit();
      bad.relations = [
        // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
        { verb: "derives_from" as any, target: "ADR-001: Sample" },
        { verb: "part_of", target: "SPEC-008: Sample" },
      ];
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });

    test("rejects an unknown key on a relation entry (.strict)", () => {
      const bad = minimalCrit();
      bad.relations = [
        // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
        { verb: "relates_to", target: "ADR-001: Sample", weight: 1 } as any,
        { verb: "part_of", target: "SPEC-008: Sample" },
      ];
      expect(() => CritNoteSchema.parse(bad)).toThrow();
    });
  });
});
