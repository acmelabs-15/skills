import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseDesignNote } from "@acmelabs/models/parsers/design-note";

const fixtureDir = join(import.meta.dir, "..", "..", "fixtures");

async function loadFixture(): Promise<string> {
  return Bun.file(join(fixtureDir, "design-note-sample.md")).text();
}

describe("parseDesignNote — canonical fixture", () => {
  test("parses fixture without throwing", async () => {
    const md = await loadFixture();
    const design = parseDesignNote(md);
    expect(design.frontmatter.title).toBe(
      "DESIGN-006-SPEC-007: RequirementNote and DesignNote Schema Layer",
    );
    expect(design.frontmatter.type).toBe("design");
    expect(design.frontmatter.status).toBe("DRAFT");
  });

  test("collects H2 sections into opaque sections Record", async () => {
    const md = await loadFixture();
    const design = parseDesignNote(md);
    expect(Object.keys(design.sections).length).toBeGreaterThanOrEqual(3);
    expect(design.sections["Context"]).toBeDefined();
    expect(design.sections["Module Structure"]).toBeDefined();
    expect(design.sections["Interfaces"]).toBeDefined();
    expect(design.sections["Algorithms"]).toBeDefined();
  });

  test("excludes Observations, Relations, and Compliance from sections Record", async () => {
    const md = await loadFixture();
    const design = parseDesignNote(md);
    expect(design.sections["Observations"]).toBeUndefined();
    expect(design.sections["Relations"]).toBeUndefined();
    expect(design.sections["Compliance"]).toBeUndefined();
    expect(design.sections["Architecture Compliance"]).toBeUndefined();
  });

  test("parses Compliance section into compliance_criteria when present", async () => {
    const md = await loadFixture();
    const design = parseDesignNote(md);
    expect(design.compliance_criteria).toBeDefined();
    expect(design.compliance_criteria?.length).toBe(3);
    for (const item of design.compliance_criteria ?? []) {
      expect(item.done).toBe(false);
    }
  });

  test("parses Observations with category and tags", async () => {
    const md = await loadFixture();
    const design = parseDesignNote(md);
    expect(design.observations).toHaveLength(3);
    expect(design.observations[0]?.tags.length).toBeGreaterThanOrEqual(1);
  });

  test("parses Relations with verb and target", async () => {
    const md = await loadFixture();
    const design = parseDesignNote(md);
    expect(design.relations).toHaveLength(2);
    expect(design.relations[0]?.verb).toBe("part_of");
  });
});

describe("parseDesignNote — variants", () => {
  test("DesignNote without Compliance section omits compliance_criteria", () => {
    const md = `---
title: 'DESIGN-002-SPEC-001: No Compliance'
type: design
permalink: specs/spec-001-test/design/design-002-spec-001-no-compliance
status: DRAFT
tags:
  - design
  - spec-001
---

# DESIGN-002-SPEC-001: No Compliance

## Context

Some context.

## Module Structure

Some module structure.

## Observations

- [decision] one #a
- [decision] two #b
- [constraint] three #c

## Relations

- part_of [[SPEC-001: Test]]
- implements [[ADR-001: Test]]
`;
    const design = parseDesignNote(md);
    expect(design.compliance_criteria).toBeUndefined();
    expect(Object.keys(design.sections)).toContain("Context");
    expect(Object.keys(design.sections)).toContain("Module Structure");
  });

  test("Architecture Compliance section also parses into compliance_criteria", () => {
    const md = `---
title: 'DESIGN-003-SPEC-001: Arch Compliance'
type: design
permalink: specs/spec-001-test/design/design-003-spec-001-arch-compliance
status: DRAFT
tags:
  - design
  - spec-001
---

# DESIGN-003-SPEC-001: Arch Compliance

## Context

Context paragraph.

## Architecture Compliance

- [x] Honors ADR-001
- [ ] Honors ADR-002

## Observations

- [decision] one #a
- [decision] two #b
- [constraint] three #c

## Relations

- part_of [[SPEC-001: Test]]
- implements [[ADR-001: Test]]
`;
    const design = parseDesignNote(md);
    expect(design.compliance_criteria).toBeDefined();
    expect(design.compliance_criteria).toHaveLength(2);
    expect(design.compliance_criteria?.[0]?.done).toBe(true);
    expect(design.compliance_criteria?.[1]?.done).toBe(false);
  });

  test("Compliance items with deferred suffix parse rationale", () => {
    const md = `---
title: 'DESIGN-004-SPEC-001: Deferred Compliance'
type: design
permalink: specs/spec-001-test/design/design-004-spec-001-deferred-compliance
status: DRAFT
tags:
  - design
  - spec-001
---

# DESIGN-004-SPEC-001: Deferred Compliance

## Context

Context.

## Compliance

- [ ] Honors ADR-005 (deferred: out of scope)
- [x] Honors ADR-006

## Observations

- [decision] one #a
- [decision] two #b
- [constraint] three #c

## Relations

- part_of [[SPEC-001: Test]]
- implements [[ADR-001: Test]]
`;
    const design = parseDesignNote(md);
    expect(design.compliance_criteria).toHaveLength(2);
    expect(design.compliance_criteria?.[0]?.deferred_rationale).toBe("out of scope");
    expect(design.compliance_criteria?.[0]?.done).toBe(false);
    expect(design.compliance_criteria?.[1]?.done).toBe(true);
  });

  test("Compliance section ordering before Observations works", () => {
    const md = `---
title: 'DESIGN-005-SPEC-001: Compliance Mid'
type: design
permalink: specs/spec-001-test/design/design-005-spec-001-compliance-mid
status: DRAFT
tags:
  - design
  - spec-001
---

# DESIGN-005-SPEC-001: Compliance Mid

## Context

Context.

## Module Structure

Structure.

## Compliance

- [x] Item 1

## Observations

- [decision] one #a
- [decision] two #b
- [constraint] three #c

## Relations

- part_of [[SPEC-001: Test]]
- implements [[ADR-001: Test]]
`;
    const design = parseDesignNote(md);
    expect(design.compliance_criteria).toHaveLength(1);
    expect(Object.keys(design.sections)).toEqual(
      expect.arrayContaining(["Context", "Module Structure"]),
    );
  });

  test("ID derived from title matches DESIGN regex", async () => {
    const md = await loadFixture();
    const design = parseDesignNote(md);
    const idMatch = design.frontmatter.title.match(/^(DESIGN-\d{3,}-SPEC-\d{3,}):/);
    expect(idMatch?.[1]).toBe("DESIGN-006-SPEC-007");
  });
});
