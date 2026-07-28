import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseTaskNote } from "@acmelabs/models/parsers/task-note";

const fixtureDir = join(import.meta.dir, "..", "..", "fixtures");

async function loadFixture(): Promise<string> {
  return Bun.file(join(fixtureDir, "task-note-sample.md")).text();
}

describe("parseTaskNote — canonical fixture", () => {
  test("parses fixture without throwing", async () => {
    const md = await loadFixture();
    const task = parseTaskNote(md);
    expect(task.frontmatter.title).toBe("TASK-005-SPEC-007: Implement TaskNote Schema and Parser");
    expect(task.frontmatter.type).toBe("task");
    expect(task.frontmatter.status).toBe("IN_PROGRESS");
    expect(task.frontmatter.effort).toBe("M");
    expect(task.frontmatter.estimate).toBe("1d");
  });

  test("extracts objective and design context", async () => {
    const md = await loadFixture();
    const task = parseTaskNote(md);
    expect(task.objective.length).toBeGreaterThan(0);
    expect(task.design_context).toBeDefined();
    expect(task.design_context).toContain("REQ-005-SPEC-007");
  });

  test("splits Scope into in/out from strong markers", async () => {
    const md = await loadFixture();
    const task = parseTaskNote(md);
    expect(task.scope_in.length).toBeGreaterThan(0);
    expect(task.scope_out.length).toBeGreaterThan(0);
    expect(task.scope_in[0]).toContain("TaskNoteSchema");
    expect(task.scope_out.some((s) => s.includes("renderer"))).toBe(true);
  });

  test("parses Files Affected table into typed objects", async () => {
    const md = await loadFixture();
    const task = parseTaskNote(md);
    expect(task.files_affected.length).toBeGreaterThanOrEqual(6);
    const first = task.files_affected[0];
    expect(first).toBeDefined();
    if (!first) throw new Error("setup");
    expect(first.action).toBe("NEW");
    expect(first.file).toContain("task-note.ts");
    expect(first.purpose.length).toBeGreaterThan(0);
  });

  test("parses Testing Requirements as flat list", async () => {
    const md = await loadFixture();
    const task = parseTaskNote(md);
    expect(task.testing_requirements.length).toBeGreaterThanOrEqual(3);
  });

  test("parses Definition of Done checkboxes with done state", async () => {
    const md = await loadFixture();
    const task = parseTaskNote(md);
    expect(task.definition_of_done.length).toBe(6);
    for (const item of task.definition_of_done) {
      expect(item.done).toBe(false);
    }
  });

  test("parses ADR Compliance section when present", async () => {
    const md = await loadFixture();
    const task = parseTaskNote(md);
    expect(task.adr_compliance).toBeDefined();
    expect(task.adr_compliance?.length).toBe(2);
  });

  test("parses Effort Summary table", async () => {
    const md = await loadFixture();
    const task = parseTaskNote(md);
    expect(task.effort_summary).toBeDefined();
    expect(task.effort_summary?.length).toBe(3);
    expect(task.effort_summary?.[0]?.tier).toBe("Human");
  });

  test("parses Observations with category and tags", async () => {
    const md = await loadFixture();
    const task = parseTaskNote(md);
    expect(task.observations).toHaveLength(3);
    expect(task.observations[0]?.category).toBe("decision");
    expect(task.observations[0]?.tags.length).toBeGreaterThanOrEqual(1);
  });

  test("parses Relations with verb and target", async () => {
    const md = await loadFixture();
    const task = parseTaskNote(md);
    expect(task.relations).toHaveLength(2);
    expect(task.relations[0]?.verb).toBe("part_of");
    expect(task.relations[0]?.target).toBe("SPEC-007: Plan/Session Render Implementation");
  });
});

describe("parseTaskNote — scope variants", () => {
  test("looser Scope style (flat list, no In/Out markers) maps to scope_in", () => {
    const md = `---
title: 'TASK-009-SPEC-001: Looser Scope'
type: task
permalink: specs/spec-001-test/tasks/task-009-spec-001-looser-scope
status: TODO
tags:
  - task
  - spec-001
---

# TASK-009-SPEC-001: Looser Scope

## Objective

Demonstrate the looser scope form.

## Scope

- Bullet A
- Bullet B

## Definition of Done

- [ ] Done

## Observations

- [decision] one #a
- [fact] two #b
- [constraint] three #c

## Relations

- part_of [[SPEC-001: Test]]
- implements [[REQ-001-SPEC-001: Test]]
`;
    const task = parseTaskNote(md);
    expect(task.scope_in).toEqual(["Bullet A", "Bullet B"]);
    expect(task.scope_out).toEqual([]);
  });

  test("DoD with deferred rationale parses suffix", () => {
    const md = `---
title: 'TASK-002-SPEC-001: Deferred DoD'
type: task
permalink: specs/spec-001-test/tasks/task-002-spec-001-deferred-dod
status: TODO
tags:
  - task
  - spec-001
---

# TASK-002-SPEC-001: Deferred DoD

## Objective

Exercise deferred parsing.

## Scope

- one

## Definition of Done

- [ ] Item one (deferred: blocked on upstream)
- [x] Item two

## Observations

- [decision] one #a
- [fact] two #b
- [constraint] three #c

## Relations

- part_of [[SPEC-001: Test]]
- implements [[REQ-001-SPEC-001: Test]]
`;
    const task = parseTaskNote(md);
    expect(task.definition_of_done).toHaveLength(2);
    expect(task.definition_of_done[0]?.text).toBe("Item one");
    expect(task.definition_of_done[0]?.deferred_rationale).toBe("blocked on upstream");
    expect(task.definition_of_done[0]?.done).toBe(false);
    expect(task.definition_of_done[1]?.done).toBe(true);
  });
});
