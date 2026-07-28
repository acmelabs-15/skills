import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  type FlipCheckboxMutation,
  applyCheckboxMutation,
} from "@acmelabs/models/mutations/checkbox-mutations";
import { parseDesignNote } from "@acmelabs/models/parsers/design-note";
import { parseRequirementNote } from "@acmelabs/models/parsers/requirement-note";
import { parseTaskNote } from "@acmelabs/models/parsers/task-note";

const fixtureDir = join(import.meta.dir, "..", "..", "fixtures");

async function loadFixture(name: string): Promise<string> {
  return Bun.file(join(fixtureDir, name)).text();
}

/**
 * A minimal TaskNote markdown with three DoD items in mixed states. The
 * canonical fixture has every DoD item unchecked, so this inline fixture
 * exercises the [x] → [ ] flip path. Status stays IN_PROGRESS so the
 * status-DONE all-checked invariant does not fire.
 */
const MIXED_TASK_MD = `---
title: 'TASK-099-SPEC-007: Mixed DoD Fixture'
type: task
permalink: specs/spec-007-plan-session-render/tasks/task-099-spec-007-mixed-dod
status: IN_PROGRESS
tags:
  - task
  - spec-007
  - fixture
---

# TASK-099-SPEC-007: Mixed DoD Fixture

## Objective

Inline fixture exercising mixed [x]/[ ] DoD states for checkbox-mutation tests.

## Scope

- single in-scope item

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| \`fixture.ts\` | NEW | inline test fixture |

## Testing Requirements

- exercise mixed DoD states

## Definition of Done

- [x] first item already done
- [ ] second item pending
- [x] third item already done

## Observations

- [fact] inline fixture for [x] → [ ] flip path #fixture #testing
- [decision] status stays IN_PROGRESS to avoid all-done invariant #invariant
- [technique] three mixed states exercise flip in both directions #pattern

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
`;

/**
 * Minimal DESIGN note WITHOUT a Compliance / Architecture Compliance
 * section. Exercises the "absent section" error path.
 */
const DESIGN_NO_COMPLIANCE_MD = `---
title: 'DESIGN-099-SPEC-007: No Compliance Fixture'
type: design
permalink: specs/spec-007-plan-session-render/design/design-099-spec-007-no-compliance
status: DRAFT
tags:
  - design
  - spec-007
  - fixture
---

# DESIGN-099-SPEC-007: No Compliance Fixture

## Context

Inline fixture lacking a Compliance section to exercise the absent-section
error path in applyCheckboxMutation.

## Module Structure

n/a — fixture only.

## Observations

- [decision] no Compliance section so compliance_criteria is undefined #fixture
- [constraint] schema permits ACCEPTED unconditionally when section absent #optional
- [fact] used by checkbox-mutations test 6 #testing

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
`;

describe("applyCheckboxMutation — TaskNote DoD", () => {
  test("flips [ ] → [x] at index 0 and re-parses", async () => {
    const md = await loadFixture("task-note-sample.md");
    const before = parseTaskNote(md);
    expect(before.definition_of_done[0]?.done).toBe(false);

    const next = applyCheckboxMutation(md, {
      type: "flip-checkbox",
      target: "dod",
      index: 0,
      done: true,
    });

    expect(next).not.toBe(md);
    expect(next).toContain("- [x] TaskNoteSchema exported");

    const after = parseTaskNote(next);
    expect(after.definition_of_done[0]?.done).toBe(true);
    expect(after.definition_of_done[0]?.deferred_rationale).toBeUndefined();
    // Index 1 unchanged.
    expect(after.definition_of_done[1]?.done).toBe(false);
  });

  test("flips [x] → [ ] at index 2 on inline mixed fixture", () => {
    const before = parseTaskNote(MIXED_TASK_MD);
    expect(before.definition_of_done[2]?.done).toBe(true);

    const next = applyCheckboxMutation(MIXED_TASK_MD, {
      type: "flip-checkbox",
      target: "dod",
      index: 2,
      done: false,
    });

    const after = parseTaskNote(next);
    expect(after.definition_of_done[2]?.done).toBe(false);
    expect(after.definition_of_done[2]?.deferred_rationale).toBeUndefined();
    // Index 0 unchanged.
    expect(after.definition_of_done[0]?.done).toBe(true);
  });

  test("flips with deferred_rationale appends `(deferred: ...)` suffix", async () => {
    const md = await loadFixture("task-note-sample.md");
    const mutation: FlipCheckboxMutation = {
      type: "flip-checkbox",
      target: "dod",
      index: 1,
      done: false,
      deferred_rationale: "blocked on upstream dep",
    };

    const next = applyCheckboxMutation(md, mutation);
    expect(next).toContain("(deferred: blocked on upstream dep)");

    const after = parseTaskNote(next);
    expect(after.definition_of_done[1]?.done).toBe(false);
    expect(after.definition_of_done[1]?.deferred_rationale).toBe("blocked on upstream dep");
  });
});

describe("applyCheckboxMutation — RequirementNote acceptance criteria", () => {
  test("flips [ ] → [x] at index 1 and re-parses", async () => {
    const md = await loadFixture("requirement-note-sample.md");
    const before = parseRequirementNote(md);
    expect(before.acceptance_criteria[1]?.done).toBe(false);

    const next = applyCheckboxMutation(md, {
      type: "flip-checkbox",
      target: "acceptance_criteria",
      index: 1,
      done: true,
    });

    const after = parseRequirementNote(next);
    expect(after.acceptance_criteria[1]?.done).toBe(true);
    expect(after.acceptance_criteria[1]?.deferred_rationale).toBeUndefined();
    // Adjacent indices unchanged.
    expect(after.acceptance_criteria[0]?.done).toBe(false);
    expect(after.acceptance_criteria[2]?.done).toBe(false);
  });
});

describe("applyCheckboxMutation — DesignNote compliance criteria", () => {
  test("flips [ ] → [x] at index 0 when Compliance section present", async () => {
    const md = await loadFixture("design-note-sample.md");
    const before = parseDesignNote(md);
    expect(before.compliance_criteria?.[0]?.done).toBe(false);

    const next = applyCheckboxMutation(md, {
      type: "flip-checkbox",
      target: "compliance_criteria",
      index: 0,
      done: true,
    });

    const after = parseDesignNote(next);
    expect(after.compliance_criteria?.[0]?.done).toBe(true);
    expect(after.compliance_criteria?.[0]?.deferred_rationale).toBeUndefined();
  });

  test("throws when Compliance section is absent", () => {
    expect(() =>
      applyCheckboxMutation(DESIGN_NO_COMPLIANCE_MD, {
        type: "flip-checkbox",
        target: "compliance_criteria",
        index: 0,
        done: true,
      }),
    ).toThrow(/no Compliance/);
  });
});

describe("applyCheckboxMutation — error paths", () => {
  test("throws on index out of bounds (positive)", async () => {
    const md = await loadFixture("task-note-sample.md");
    expect(() =>
      applyCheckboxMutation(md, {
        type: "flip-checkbox",
        target: "dod",
        index: 999,
        done: true,
      }),
    ).toThrow(/out of bounds/);
  });

  test("throws on negative index", async () => {
    const md = await loadFixture("task-note-sample.md");
    expect(() =>
      applyCheckboxMutation(md, {
        type: "flip-checkbox",
        target: "dod",
        index: -1,
        done: true,
      }),
    ).toThrow(/negative index/);
  });
});

describe("applyCheckboxMutation — chained mutations", () => {
  test("three sequential flips each re-parse cleanly", async () => {
    let md = await loadFixture("task-note-sample.md");

    md = applyCheckboxMutation(md, {
      type: "flip-checkbox",
      target: "dod",
      index: 0,
      done: true,
    });
    md = applyCheckboxMutation(md, {
      type: "flip-checkbox",
      target: "dod",
      index: 1,
      done: false,
      deferred_rationale: "needs design review",
    });
    md = applyCheckboxMutation(md, {
      type: "flip-checkbox",
      target: "dod",
      index: 2,
      done: true,
    });

    const after = parseTaskNote(md);
    expect(after.definition_of_done[0]?.done).toBe(true);
    expect(after.definition_of_done[0]?.deferred_rationale).toBeUndefined();
    expect(after.definition_of_done[1]?.done).toBe(false);
    expect(after.definition_of_done[1]?.deferred_rationale).toBe("needs design review");
    expect(after.definition_of_done[2]?.done).toBe(true);
    expect(after.definition_of_done[2]?.deferred_rationale).toBeUndefined();
    // Indices not flipped remain unchanged.
    expect(after.definition_of_done[3]?.done).toBe(false);
  });
});
