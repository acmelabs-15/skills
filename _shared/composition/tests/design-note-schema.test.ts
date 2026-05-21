import { describe, expect, test } from "bun:test";
import { type DesignNote, DesignNoteSchema } from "../src/schemas/design-note.js";

function makeMinimal(): DesignNote {
  return {
    frontmatter: {
      title: "DESIGN-001-SPEC-007: Sample",
      type: "design",
      permalink: "specs/spec-007-plan-session-render/design/design-001-spec-007-sample",
      status: "DRAFT",
      tags: ["design", "spec-007"],
    },
    sections: {
      Context: "This is the context paragraph.",
    },
    observations: [
      { category: "decision", text: "obs 1", tags: ["a"] },
      { category: "fact", text: "obs 2", tags: ["b"] },
      { category: "constraint", text: "obs 3", tags: ["c"] },
    ],
    relations: [
      { verb: "part_of", target: "SPEC-007: Test" },
      { verb: "implements", target: "ADR-003: Test" },
    ],
  };
}

describe("DesignNoteSchema", () => {
  test("accepts a minimal valid DesignNote", () => {
    expect(() => DesignNoteSchema.parse(makeMinimal())).not.toThrow();
  });

  test("rejects malformed title (missing SPEC segment)", () => {
    const bad = makeMinimal();
    bad.frontmatter.title = "DESIGN-001: Sample";
    expect(() => DesignNoteSchema.parse(bad)).toThrow();
  });

  test("rejects malformed permalink", () => {
    const bad = makeMinimal();
    bad.frontmatter.permalink = "design/sample";
    expect(() => DesignNoteSchema.parse(bad)).toThrow();
  });

  test("rejects TODO status (DESIGN uses DRAFT/PROPOSED/ACCEPTED/DEPRECATED)", () => {
    const bad = makeMinimal();
    // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
    bad.frontmatter.status = "TODO" as any;
    expect(() => DesignNoteSchema.parse(bad)).toThrow();
  });

  test("rejects empty sections Record", () => {
    const bad = makeMinimal();
    bad.sections = {};
    expect(() => DesignNoteSchema.parse(bad)).toThrow();
  });

  test("rejects empty section value", () => {
    const bad = makeMinimal();
    bad.sections = { Context: "" };
    expect(() => DesignNoteSchema.parse(bad)).toThrow();
  });

  test("rejects fewer than 3 observations", () => {
    const bad = makeMinimal();
    bad.observations = bad.observations.slice(0, 2);
    expect(() => DesignNoteSchema.parse(bad)).toThrow();
  });

  test("rejects fewer than 2 relations", () => {
    const bad = makeMinimal();
    bad.relations = bad.relations.slice(0, 1);
    expect(() => DesignNoteSchema.parse(bad)).toThrow();
  });

  test("rejects empty compliance_criteria section", () => {
    const bad = makeMinimal();
    bad.compliance_criteria = [];
    expect(() => DesignNoteSchema.parse(bad)).toThrow();
  });

  test("status ACCEPTED with no compliance section is allowed", () => {
    const good = makeMinimal();
    good.frontmatter.status = "ACCEPTED";
    // No compliance_criteria field set — author opted out.
    expect(() => DesignNoteSchema.parse(good)).not.toThrow();
  });

  test("status ACCEPTED with all-checked compliance passes", () => {
    const good = makeMinimal();
    good.frontmatter.status = "ACCEPTED";
    good.compliance_criteria = [
      { text: "Item 1", done: true },
      { text: "Item 2", done: true },
    ];
    expect(() => DesignNoteSchema.parse(good)).not.toThrow();
  });

  test("status ACCEPTED with unchecked compliance item is rejected", () => {
    const bad = makeMinimal();
    bad.frontmatter.status = "ACCEPTED";
    bad.compliance_criteria = [
      { text: "Item 1", done: true },
      { text: "Item 2", done: false },
    ];
    expect(() => DesignNoteSchema.parse(bad)).toThrow(/Compliance/);
  });

  test("status ACCEPTED with deferred-with-rationale compliance item passes", () => {
    const good = makeMinimal();
    good.frontmatter.status = "ACCEPTED";
    good.compliance_criteria = [
      { text: "Item 1", done: true },
      { text: "Item 2", done: false, deferred_rationale: "out of scope" },
    ];
    expect(() => DesignNoteSchema.parse(good)).not.toThrow();
  });

  test("status DRAFT with unchecked compliance is permitted", () => {
    const good = makeMinimal();
    good.frontmatter.status = "DRAFT";
    good.compliance_criteria = [{ text: "Item 1", done: false }];
    expect(() => DesignNoteSchema.parse(good)).not.toThrow();
  });

  test("tags must have at least 2", () => {
    const bad = makeMinimal();
    bad.frontmatter.tags = ["design"];
    expect(() => DesignNoteSchema.parse(bad)).toThrow();
  });

  test("tags max 5 enforced", () => {
    const bad = makeMinimal();
    bad.frontmatter.tags = ["a", "b", "c", "d", "e", "f"];
    expect(() => DesignNoteSchema.parse(bad)).toThrow();
  });

  test("accepts multiple sections in opaque Record", () => {
    const good = makeMinimal();
    good.sections = {
      Context: "Context prose",
      "Module Structure": "Module prose",
      Interfaces: "Interface prose",
      "Data Flow": "Data flow prose",
    };
    expect(() => DesignNoteSchema.parse(good)).not.toThrow();
  });
});
