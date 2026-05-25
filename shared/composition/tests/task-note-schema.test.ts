import { describe, expect, test } from "bun:test";
import { type TaskNote, TaskNoteSchema } from "../src/schemas/task-note.js";

function minimalTask(): TaskNote {
  return {
    frontmatter: {
      title: "TASK-001-SPEC-007: Sample",
      type: "task",
      permalink: "specs/spec-007-plan-session-render/tasks/task-001-spec-007-sample",
      status: "TODO",
      tags: ["task", "spec-007"],
    },
    objective: "Build the thing.",
    scope_in: ["Schema authoring"],
    scope_out: ["Renderer"],
    files_affected: [{ file: "src/foo.ts", action: "NEW", purpose: "the thing" }],
    testing_requirements: ["happy path"],
    definition_of_done: [{ text: "Schema exported", done: false }],
    observations: [
      { category: "decision", text: "obs 1", tags: ["a"] },
      { category: "fact", text: "obs 2", tags: ["b"] },
      { category: "constraint", text: "obs 3", tags: ["c"] },
    ],
    relations: [
      { verb: "part_of", target: "SPEC-007: Test" },
      { verb: "implements", target: "REQ-001-SPEC-007: Test" },
    ],
  };
}

describe("TaskNoteSchema", () => {
  test("accepts a minimal valid TaskNote", () => {
    expect(() => TaskNoteSchema.parse(minimalTask())).not.toThrow();
  });

  test("rejects malformed title (kebab descriptor)", () => {
    const bad = minimalTask();
    bad.frontmatter.title = "TASK-001-SPEC-007 sample";
    expect(() => TaskNoteSchema.parse(bad)).toThrow();
  });

  test("rejects malformed title (missing SPEC segment)", () => {
    const bad = minimalTask();
    bad.frontmatter.title = "TASK-001: Sample";
    expect(() => TaskNoteSchema.parse(bad)).toThrow();
  });

  test("rejects malformed permalink", () => {
    const bad = minimalTask();
    bad.frontmatter.permalink = "task/sample";
    expect(() => TaskNoteSchema.parse(bad)).toThrow();
  });

  test("rejects PENDING status (TaskNote uses TODO)", () => {
    const bad = minimalTask();
    // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
    bad.frontmatter.status = "PENDING" as any;
    expect(() => TaskNoteSchema.parse(bad)).toThrow();
  });

  test("rejects fewer than 3 observations", () => {
    const bad = minimalTask();
    bad.observations = bad.observations.slice(0, 2);
    expect(() => TaskNoteSchema.parse(bad)).toThrow();
  });

  test("rejects fewer than 2 relations", () => {
    const bad = minimalTask();
    bad.relations = bad.relations.slice(0, 1);
    expect(() => TaskNoteSchema.parse(bad)).toThrow();
  });

  test("rejects empty definition_of_done", () => {
    const bad = minimalTask();
    bad.definition_of_done = [];
    expect(() => TaskNoteSchema.parse(bad)).toThrow();
  });

  test("status DONE with unchecked DoD item is rejected", () => {
    const bad = minimalTask();
    bad.frontmatter.status = "DONE";
    bad.definition_of_done = [
      { text: "Item 1", done: true },
      { text: "Item 2", done: false },
    ];
    expect(() => TaskNoteSchema.parse(bad)).toThrow(/Definition of Done/);
  });

  test("status DONE with all-checked DoD passes", () => {
    const good = minimalTask();
    good.frontmatter.status = "DONE";
    good.definition_of_done = [
      { text: "Item 1", done: true },
      { text: "Item 2", done: true },
    ];
    expect(() => TaskNoteSchema.parse(good)).not.toThrow();
  });

  test("status DONE with deferred-with-rationale DoD item passes", () => {
    const good = minimalTask();
    good.frontmatter.status = "DONE";
    good.definition_of_done = [
      { text: "Item 1", done: true },
      { text: "Item 2", done: false, deferred_rationale: "blocked on upstream" },
    ];
    expect(() => TaskNoteSchema.parse(good)).not.toThrow();
  });

  test("status DONE with unchecked-and-empty-deferred is rejected", () => {
    const bad = minimalTask();
    bad.frontmatter.status = "DONE";
    bad.definition_of_done = [{ text: "Item 1", done: false }];
    expect(() => TaskNoteSchema.parse(bad)).toThrow();
  });

  test("status IN_PROGRESS with unchecked DoD is permitted", () => {
    const good = minimalTask();
    good.frontmatter.status = "IN_PROGRESS";
    good.definition_of_done = [
      { text: "Item 1", done: false },
      { text: "Item 2", done: false },
    ];
    expect(() => TaskNoteSchema.parse(good)).not.toThrow();
  });

  test("tags must have at least 2", () => {
    const bad = minimalTask();
    bad.frontmatter.tags = ["task"];
    expect(() => TaskNoteSchema.parse(bad)).toThrow();
  });

  test("tags max 5 enforced", () => {
    const bad = minimalTask();
    bad.frontmatter.tags = ["a", "b", "c", "d", "e", "f"];
    expect(() => TaskNoteSchema.parse(bad)).toThrow();
  });

  test("rejects unknown file action", () => {
    const bad = minimalTask();
    // biome-ignore lint/suspicious/noExplicitAny: deliberate negative test
    bad.files_affected = [{ file: "x.ts", action: "RENAME" as any, purpose: "p" }];
    expect(() => TaskNoteSchema.parse(bad)).toThrow();
  });

  test("rejects empty adr_compliance section", () => {
    const bad = minimalTask();
    bad.adr_compliance = [];
    expect(() => TaskNoteSchema.parse(bad)).toThrow();
  });

  test("accepts optional fields populated", () => {
    const good = minimalTask();
    good.frontmatter.effort = "M";
    good.frontmatter.estimate = "1d";
    good.design_context = "ctx";
    good.implementation_notes = "notes";
    good.adr_compliance = [{ text: "Honors ADR-001", done: false }];
    good.effort_summary = [
      { tier: "Human", estimate: "1d", notes: "manual" },
      { tier: "AI-Dominant", estimate: "0.5d", notes: "auto" },
    ];
    expect(() => TaskNoteSchema.parse(good)).not.toThrow();
  });
});
