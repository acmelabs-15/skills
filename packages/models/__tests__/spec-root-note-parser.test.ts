import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseSpecRootNote } from "@acmelabs/models/parsers/spec-root-note";

const fixtureDir = join(import.meta.dir, "..", "..", "fixtures");

async function loadFixture(): Promise<string> {
  return Bun.file(join(fixtureDir, "spec-root-note-sample.md")).text();
}

describe("parseSpecRootNote — canonical fixture", () => {
  test("parses fixture without throwing", async () => {
    const md = await loadFixture();
    const spec = parseSpecRootNote(md);
    expect(spec.frontmatter.title).toBe("SPEC-099: Sample Spec Root Note");
    expect(spec.frontmatter.type).toBe("spec");
    expect(spec.frontmatter.status).toBe("ACCEPTED");
  });

  test("parses Context as prose", async () => {
    const md = await loadFixture();
    const spec = parseSpecRootNote(md);
    expect(spec.context.length).toBeGreaterThan(20);
    expect(spec.context).toMatch(/sample fixture/i);
  });

  test("parses In Scope and Out of Scope sub-lists", async () => {
    const md = await loadFixture();
    const spec = parseSpecRootNote(md);
    expect(spec.scope_in.length).toBeGreaterThanOrEqual(3);
    expect(spec.scope_out.length).toBeGreaterThanOrEqual(2);
    expect(spec.scope_in[0]).toMatch(/Schema/);
    expect(spec.scope_out[0]).toMatch(/renderer/i);
  });

  test("parses Phases H3 sub-sections with req_refs", async () => {
    const md = await loadFixture();
    const spec = parseSpecRootNote(md);
    expect(spec.phases).toBeDefined();
    expect(spec.phases?.length).toBe(2);
    expect(spec.phases?.[0]?.name).toMatch(/Phase 1/);
    expect(spec.phases?.[0]?.req_refs.length).toBeGreaterThanOrEqual(2);
  });

  test("parses Success Criteria as checkbox list", async () => {
    const md = await loadFixture();
    const spec = parseSpecRootNote(md);
    expect(spec.success_criteria).toBeDefined();
    expect(spec.success_criteria?.length).toBe(4);
    expect(spec.success_criteria?.[0]?.done).toBe(true);
    expect(spec.success_criteria?.[3]?.done).toBe(false);
    expect(spec.success_criteria?.[3]?.deferred_rationale).toMatch(/SPEC schema invariant/);
  });

  test("parses Artifact Status flattening H3 sub-sections", async () => {
    const md = await loadFixture();
    const spec = parseSpecRootNote(md);
    expect(spec.artifact_status).toBeDefined();
    expect(spec.artifact_status?.length).toBe(4);
    for (const item of spec.artifact_status ?? []) {
      expect(item.done).toBe(false);
    }
  });

  test("excludes special sections from opaque sections Record", async () => {
    const md = await loadFixture();
    const spec = parseSpecRootNote(md);
    expect(spec.sections["Context"]).toBeUndefined();
    expect(spec.sections["Scope"]).toBeUndefined();
    expect(spec.sections["Phases"]).toBeUndefined();
    expect(spec.sections["Success Criteria"]).toBeUndefined();
    expect(spec.sections["Artifact Status"]).toBeUndefined();
    expect(spec.sections["Observations"]).toBeUndefined();
    expect(spec.sections["Relations"]).toBeUndefined();
  });

  test("captures non-special sections in opaque Record", async () => {
    const md = await loadFixture();
    const spec = parseSpecRootNote(md);
    expect(spec.sections["Decomposition Methodology"]).toBeDefined();
    expect(spec.sections["ADR Cross-cutting Constraints"]).toBeDefined();
    expect(spec.sections["Risks"]).toBeDefined();
  });

  test("parses Observations with categories and tags", async () => {
    const md = await loadFixture();
    const spec = parseSpecRootNote(md);
    expect(spec.observations.length).toBeGreaterThanOrEqual(3);
    expect(spec.observations[0]?.category).toBeDefined();
  });

  test("parses Relations with verbs and targets", async () => {
    const md = await loadFixture();
    const spec = parseSpecRootNote(md);
    expect(spec.relations.length).toBeGreaterThanOrEqual(2);
    expect(spec.relations[0]?.verb).toBeDefined();
  });
});

describe("parseSpecRootNote — variants", () => {
  test("SPEC without Phases section omits phases field", () => {
    const md = `---
title: "SPEC-100: No Phases"
type: spec
permalink: specs/spec-100-test/spec-100-test
status: DRAFT
tags:
  - spec
  - test
---

# SPEC-100: No Phases

## Context

Just context.

## Observations

- [decision] one #a
- [fact] two #b
- [constraint] three #c

## Relations

- part_of [[PLAN-001: Test]]
- implements [[ADR-001: Test]]
`;
    const spec = parseSpecRootNote(md);
    expect(spec.phases).toBeUndefined();
    expect(spec.success_criteria).toBeUndefined();
    expect(spec.artifact_status).toBeUndefined();
  });

  test("SPEC with flat Scope list (no H3 sub-headings) goes to scope_in", () => {
    const md = `---
title: "SPEC-101: Flat Scope"
type: spec
permalink: specs/spec-101-test/spec-101-test
status: DRAFT
tags:
  - spec
  - test
---

# SPEC-101: Flat Scope

## Context

Context.

## Scope

- Item A
- Item B

## Observations

- [decision] one #a
- [fact] two #b
- [constraint] three #c

## Relations

- part_of [[PLAN-001: Test]]
- implements [[ADR-001: Test]]
`;
    const spec = parseSpecRootNote(md);
    expect(spec.scope_in).toEqual(["Item A", "Item B"]);
    expect(spec.scope_out).toEqual([]);
  });

  test("SPEC id derived from title is valid", async () => {
    const md = await loadFixture();
    const spec = parseSpecRootNote(md);
    const m = spec.frontmatter.title.match(/^(SPEC-\d{3,}):/);
    expect(m?.[1]).toBe("SPEC-099");
  });
});
