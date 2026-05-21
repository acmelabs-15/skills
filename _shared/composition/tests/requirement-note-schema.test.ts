import { describe, expect, test } from "bun:test";
import { type RequirementNote, RequirementNoteSchema } from "../src/schemas/requirement-note.js";

function minimalReq(): RequirementNote {
  return {
    frontmatter: {
      title: "REQ-001-SPEC-007: Sample",
      type: "requirement",
      permalink: "specs/spec-007-plan-session-render/requirements/req-001-spec-007-sample",
      status: "DRAFT",
      tags: ["requirement", "spec-007"],
    },
    requirement_statement:
      "WHEN something happens THE SYSTEM SHALL respond SO THAT the user benefits.",
    acceptance_criteria: [{ text: "GIVEN x WHEN y THEN z", done: false }],
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

describe("RequirementNoteSchema", () => {
  test("accepts a minimal valid RequirementNote", () => {
    expect(() => RequirementNoteSchema.parse(minimalReq())).not.toThrow();
  });

  test("rejects malformed title (missing SPEC segment)", () => {
    const bad = minimalReq();
    bad.frontmatter.title = "REQ-001: Sample";
    expect(() => RequirementNoteSchema.parse(bad)).toThrow();
  });

  test("rejects malformed title (kebab descriptor)", () => {
    const bad = minimalReq();
    bad.frontmatter.title = "REQ-001-SPEC-007 sample";
    expect(() => RequirementNoteSchema.parse(bad)).toThrow();
  });

  test("rejects malformed permalink", () => {
    const bad = minimalReq();
    bad.frontmatter.permalink = "req/sample";
    expect(() => RequirementNoteSchema.parse(bad)).toThrow();
  });

  test("rejects TODO status (REQ uses DRAFT/PROPOSED/ACCEPTED/DEPRECATED)", () => {
    const bad = minimalReq();
    // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
    bad.frontmatter.status = "TODO" as any;
    expect(() => RequirementNoteSchema.parse(bad)).toThrow();
  });

  test("rejects fewer than 3 observations", () => {
    const bad = minimalReq();
    bad.observations = bad.observations.slice(0, 2);
    expect(() => RequirementNoteSchema.parse(bad)).toThrow();
  });

  test("rejects fewer than 2 relations", () => {
    const bad = minimalReq();
    bad.relations = bad.relations.slice(0, 1);
    expect(() => RequirementNoteSchema.parse(bad)).toThrow();
  });

  test("rejects empty acceptance_criteria", () => {
    const bad = minimalReq();
    bad.acceptance_criteria = [];
    expect(() => RequirementNoteSchema.parse(bad)).toThrow();
  });

  test("rejects empty requirement_statement", () => {
    const bad = minimalReq();
    bad.requirement_statement = "";
    expect(() => RequirementNoteSchema.parse(bad)).toThrow();
  });

  test("status ACCEPTED with unchecked AC item is rejected", () => {
    const bad = minimalReq();
    bad.frontmatter.status = "ACCEPTED";
    bad.acceptance_criteria = [
      { text: "AC 1", done: true },
      { text: "AC 2", done: false },
    ];
    expect(() => RequirementNoteSchema.parse(bad)).toThrow(/Acceptance Criteria/);
  });

  test("status ACCEPTED with all-checked AC passes", () => {
    const good = minimalReq();
    good.frontmatter.status = "ACCEPTED";
    good.acceptance_criteria = [
      { text: "AC 1", done: true },
      { text: "AC 2", done: true },
    ];
    expect(() => RequirementNoteSchema.parse(good)).not.toThrow();
  });

  test("status ACCEPTED with deferred-with-rationale AC item passes", () => {
    const good = minimalReq();
    good.frontmatter.status = "ACCEPTED";
    good.acceptance_criteria = [
      { text: "AC 1", done: true },
      { text: "AC 2", done: false, deferred_rationale: "blocked on upstream" },
    ];
    expect(() => RequirementNoteSchema.parse(good)).not.toThrow();
  });

  test("status ACCEPTED with unchecked-and-empty-deferred is rejected", () => {
    const bad = minimalReq();
    bad.frontmatter.status = "ACCEPTED";
    bad.acceptance_criteria = [{ text: "AC 1", done: false }];
    expect(() => RequirementNoteSchema.parse(bad)).toThrow();
  });

  test("status DRAFT with unchecked AC is permitted", () => {
    const good = minimalReq();
    good.frontmatter.status = "DRAFT";
    good.acceptance_criteria = [
      { text: "AC 1", done: false },
      { text: "AC 2", done: false },
    ];
    expect(() => RequirementNoteSchema.parse(good)).not.toThrow();
  });

  test("tags must have at least 2", () => {
    const bad = minimalReq();
    bad.frontmatter.tags = ["requirement"];
    expect(() => RequirementNoteSchema.parse(bad)).toThrow();
  });

  test("tags max 5 enforced", () => {
    const bad = minimalReq();
    bad.frontmatter.tags = ["a", "b", "c", "d", "e", "f"];
    expect(() => RequirementNoteSchema.parse(bad)).toThrow();
  });

  test("accepts optional fields populated", () => {
    const good = minimalReq();
    good.pattern = "Shared Module";
    good.priority = "P0 -- foundational; all other schema REQs depend on this";
    good.category = "Functional";
    good.context = "Some context paragraph";
    expect(() => RequirementNoteSchema.parse(good)).not.toThrow();
  });

  test("accepts category as free-form string", () => {
    const good = minimalReq();
    good.category = "Functional / Quality Hybrid";
    expect(() => RequirementNoteSchema.parse(good)).not.toThrow();
  });

  test("rejects priority exceeding 200 chars", () => {
    const bad = minimalReq();
    bad.priority = "P0 ".repeat(100);
    expect(() => RequirementNoteSchema.parse(bad)).toThrow();
  });
});
