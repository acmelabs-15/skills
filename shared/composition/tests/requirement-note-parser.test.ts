import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseRequirementNote } from "../src/parsers/requirement-note.js";

const fixtureDir = join(import.meta.dir, "fixtures");

async function loadFixture(): Promise<string> {
  return Bun.file(join(fixtureDir, "requirement-note-sample.md")).text();
}

describe("parseRequirementNote — canonical fixture", () => {
  test("parses fixture without throwing", async () => {
    const md = await loadFixture();
    const req = parseRequirementNote(md);
    expect(req.frontmatter.title).toBe("REQ-006-SPEC-007: RequirementNote Schema and Parser");
    expect(req.frontmatter.type).toBe("requirement");
    expect(req.frontmatter.status).toBe("DRAFT");
  });

  test("extracts requirement_statement as opaque prose", async () => {
    const md = await loadFixture();
    const req = parseRequirementNote(md);
    expect(req.requirement_statement.length).toBeGreaterThan(0);
    expect(req.requirement_statement).toContain("WHEN");
    expect(req.requirement_statement).toContain("THE SYSTEM SHALL");
    expect(req.requirement_statement).toContain("SO THAT");
  });

  test("extracts pattern, priority, category, context when present", async () => {
    const md = await loadFixture();
    const req = parseRequirementNote(md);
    expect(req.pattern).toBeDefined();
    expect(req.pattern).toContain("Shared Schema");
    expect(req.priority).toBeDefined();
    expect(req.priority).toContain("P0");
    expect(req.category).toBe("Functional");
    expect(req.context).toBeDefined();
    expect(req.context).toContain("ADR-003");
  });

  test("parses Acceptance Criteria checkboxes with done state", async () => {
    const md = await loadFixture();
    const req = parseRequirementNote(md);
    expect(req.acceptance_criteria.length).toBe(6);
    for (const ac of req.acceptance_criteria) {
      expect(ac.done).toBe(false);
    }
    expect(req.acceptance_criteria[0]?.text).toContain("GIVEN");
  });

  test("parses Observations with category and tags", async () => {
    const md = await loadFixture();
    const req = parseRequirementNote(md);
    expect(req.observations).toHaveLength(3);
    expect(req.observations[0]?.category).toBe("requirement");
    expect(req.observations[0]?.tags.length).toBeGreaterThanOrEqual(1);
  });

  test("parses Relations with verb and target", async () => {
    const md = await loadFixture();
    const req = parseRequirementNote(md);
    expect(req.relations).toHaveLength(2);
    expect(req.relations[0]?.verb).toBe("part_of");
    expect(req.relations[0]?.target).toBe("SPEC-007: Plan/Session Render Implementation");
  });
});

describe("parseRequirementNote — variants", () => {
  test("AC with deferred rationale parses suffix", () => {
    const md = `---
title: 'REQ-002-SPEC-001: Deferred AC'
type: requirement
permalink: specs/spec-001-test/requirements/req-002-spec-001-deferred-ac
status: DRAFT
tags:
  - requirement
  - spec-001
---

# REQ-002-SPEC-001: Deferred AC

## Requirement Statement

WHEN x THE SYSTEM SHALL y SO THAT z.

## Acceptance Criteria

- [ ] GIVEN a thing WHEN it happens THEN result (deferred: blocked on upstream)
- [x] GIVEN another thing WHEN it happens THEN result

## Observations

- [requirement] one #a
- [fact] two #b
- [constraint] three #c

## Relations

- part_of [[SPEC-001: Test]]
- implements [[ADR-001: Test]]
`;
    const req = parseRequirementNote(md);
    expect(req.acceptance_criteria).toHaveLength(2);
    expect(req.acceptance_criteria[0]?.text).toContain("GIVEN a thing");
    expect(req.acceptance_criteria[0]?.text).not.toContain("deferred");
    expect(req.acceptance_criteria[0]?.deferred_rationale).toBe("blocked on upstream");
    expect(req.acceptance_criteria[0]?.done).toBe(false);
    expect(req.acceptance_criteria[1]?.done).toBe(true);
  });

  test("omits optional fields when sections absent", () => {
    const md = `---
title: 'REQ-003-SPEC-001: Minimal'
type: requirement
permalink: specs/spec-001-test/requirements/req-003-spec-001-minimal
status: DRAFT
tags:
  - requirement
  - spec-001
---

# REQ-003-SPEC-001: Minimal

## Requirement Statement

WHEN x THE SYSTEM SHALL y SO THAT z.

## Acceptance Criteria

- [ ] GIVEN x WHEN y THEN z

## Observations

- [requirement] one #a
- [fact] two #b
- [constraint] three #c

## Relations

- part_of [[SPEC-001: Test]]
- implements [[ADR-001: Test]]
`;
    const req = parseRequirementNote(md);
    expect(req.pattern).toBeUndefined();
    expect(req.priority).toBeUndefined();
    expect(req.category).toBeUndefined();
    expect(req.context).toBeUndefined();
  });

  test("ID derived from title matches REQ regex", async () => {
    const md = await loadFixture();
    const req = parseRequirementNote(md);
    const idMatch = req.frontmatter.title.match(/^(REQ-\d{3,}-SPEC-\d{3,}):/);
    expect(idMatch?.[1]).toBe("REQ-006-SPEC-007");
  });
});
