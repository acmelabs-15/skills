import { describe, expect, test } from "bun:test";
import { type SpecRootNote, SpecRootNoteSchema } from "../src/schemas/spec-root-note.js";

function makeMinimal(): SpecRootNote {
  return {
    frontmatter: {
      title: "SPEC-001: Sample",
      type: "spec",
      permalink: "specs/spec-001-sample/spec-001-sample",
      status: "DRAFT",
      tags: ["spec", "sample"],
    },
    context: "Context paragraph.",
    scope_in: ["Item A"],
    scope_out: ["Item B"],
    sections: {},
    observations: [
      { category: "decision", text: "obs 1", tags: ["a"] },
      { category: "fact", text: "obs 2", tags: ["b"] },
      { category: "constraint", text: "obs 3", tags: ["c"] },
    ],
    relations: [
      { verb: "part_of", target: "PLAN-001: Test" },
      { verb: "implements", target: "ADR-001: Test" },
    ],
  };
}

describe("SpecRootNoteSchema", () => {
  test("accepts a minimal valid SpecRootNote", () => {
    expect(() => SpecRootNoteSchema.parse(makeMinimal())).not.toThrow();
  });

  test("rejects malformed title (missing SPEC prefix)", () => {
    const bad = makeMinimal();
    bad.frontmatter.title = "REQ-001: Sample";
    expect(() => SpecRootNoteSchema.parse(bad)).toThrow();
  });

  test("rejects malformed permalink", () => {
    const bad = makeMinimal();
    bad.frontmatter.permalink = "decisions/adr-001";
    expect(() => SpecRootNoteSchema.parse(bad)).toThrow();
  });

  test("rejects empty context", () => {
    const bad = makeMinimal();
    bad.context = "";
    expect(() => SpecRootNoteSchema.parse(bad)).toThrow();
  });

  test("rejects fewer than 3 observations", () => {
    const bad = makeMinimal();
    bad.observations = bad.observations.slice(0, 2);
    expect(() => SpecRootNoteSchema.parse(bad)).toThrow();
  });

  test("rejects fewer than 2 relations", () => {
    const bad = makeMinimal();
    bad.relations = bad.relations.slice(0, 1);
    expect(() => SpecRootNoteSchema.parse(bad)).toThrow();
  });

  test("rejects empty success_criteria array", () => {
    const bad = makeMinimal();
    bad.success_criteria = [];
    expect(() => SpecRootNoteSchema.parse(bad)).toThrow();
  });

  test("rejects empty artifact_status array", () => {
    const bad = makeMinimal();
    bad.artifact_status = [];
    expect(() => SpecRootNoteSchema.parse(bad)).toThrow();
  });

  test("status DONE with both gate sections absent is allowed", () => {
    const good = makeMinimal();
    good.frontmatter.status = "DONE";
    expect(() => SpecRootNoteSchema.parse(good)).not.toThrow();
  });

  test("status DONE with all-checked success_criteria passes", () => {
    const good = makeMinimal();
    good.frontmatter.status = "DONE";
    good.success_criteria = [
      { text: "All REQs ACCEPTED", done: true },
      { text: "All TASKs DONE", done: true },
    ];
    expect(() => SpecRootNoteSchema.parse(good)).not.toThrow();
  });

  test("status DONE with unchecked success_criteria item is rejected", () => {
    const bad = makeMinimal();
    bad.frontmatter.status = "DONE";
    bad.success_criteria = [
      { text: "All REQs ACCEPTED", done: true },
      { text: "All TASKs DONE", done: false },
    ];
    expect(() => SpecRootNoteSchema.parse(bad)).toThrow(/DONE/);
  });

  test("status DONE with unchecked artifact_status item is rejected", () => {
    const bad = makeMinimal();
    bad.frontmatter.status = "DONE";
    bad.artifact_status = [{ text: "REQ-001-SPEC-001", done: false }];
    expect(() => SpecRootNoteSchema.parse(bad)).toThrow(/DONE/);
  });

  test("status DONE with unchecked items across BOTH sections cites both", () => {
    const bad = makeMinimal();
    bad.frontmatter.status = "DONE";
    bad.success_criteria = [{ text: "SC Item", done: false }];
    bad.artifact_status = [{ text: "AS Item", done: false }];
    expect(() => SpecRootNoteSchema.parse(bad)).toThrow(/success_criteria.*artifact_status/);
  });

  test("status DONE with deferred-rationale gate item passes", () => {
    const good = makeMinimal();
    good.frontmatter.status = "DONE";
    good.success_criteria = [
      { text: "Item 1", done: true },
      { text: "Item 2", done: false, deferred_rationale: "out of scope" },
    ];
    expect(() => SpecRootNoteSchema.parse(good)).not.toThrow();
  });

  test("status DRAFT with unchecked items is permitted", () => {
    const good = makeMinimal();
    good.frontmatter.status = "DRAFT";
    good.success_criteria = [{ text: "Item 1", done: false }];
    good.artifact_status = [{ text: "AS 1", done: false }];
    expect(() => SpecRootNoteSchema.parse(good)).not.toThrow();
  });

  test("status ACCEPTED does not trigger DONE gate (intermediate state)", () => {
    const good = makeMinimal();
    good.frontmatter.status = "ACCEPTED";
    good.success_criteria = [{ text: "Item 1", done: false }];
    expect(() => SpecRootNoteSchema.parse(good)).not.toThrow();
  });

  test("tags must have at least 2", () => {
    const bad = makeMinimal();
    bad.frontmatter.tags = ["spec"];
    expect(() => SpecRootNoteSchema.parse(bad)).toThrow();
  });

  test("tags max 5 enforced", () => {
    const bad = makeMinimal();
    bad.frontmatter.tags = ["a", "b", "c", "d", "e", "f"];
    expect(() => SpecRootNoteSchema.parse(bad)).toThrow();
  });

  test("accepts opaque sections Record", () => {
    const good = makeMinimal();
    good.sections = {
      "Decomposition Methodology": "Standard analyst clustering",
      Risks: "None known",
    };
    expect(() => SpecRootNoteSchema.parse(good)).not.toThrow();
  });

  test("accepts phases array with req_refs", () => {
    const good = makeMinimal();
    good.phases = [
      { name: "Phase 1", req_refs: ["REQ-001-SPEC-001: Foo", "REQ-002-SPEC-001: Bar"] },
      { name: "Phase 2", req_refs: [] },
    ];
    expect(() => SpecRootNoteSchema.parse(good)).not.toThrow();
  });
});
