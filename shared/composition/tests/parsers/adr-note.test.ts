import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { ZodError } from "zod";
import { parseAdrNote } from "../../src/parsers/adr-note.js";

const fixtureDir = join(import.meta.dir, "..", "fixtures");

/**
 * Inline fixture: a minimal valid PROPOSED ADR. Considered Options use the
 * H3-axis / H4-option subsection shape (matches docs/decisions/ADR-001).
 */
const PROPOSED_FIXTURE = `---
title: 'ADR-901: Test Proposed ADR'
type: decision
status: PROPOSED
date: 2026-05-24
updated: 2026-05-24
permalink: decisions/adr-901-test-proposed-adr
tags:
  - decision
  - test
  - fixture
---

# ADR-901: Test Proposed ADR

## Context

A minimal ADR fixture for parser validation in PROPOSED status. Body content
is deliberately thin because the schema does not require prose richness on
non-ACCEPTED notes.

## Considered Options

### Axis 1: Storage Backend

#### Option A: Postgres

Postgres provides ACID guarantees and battle-tested replication. Rationale
intentionally non-empty so the ACCEPTED gate (when applied) does not reject
this option.

#### Option B: SQLite

SQLite has zero operational overhead and ships with the runtime.

## Consequences

### Positive

- Pluggable backend per environment

### Negative

- Schema migration cost across backends

## Observations

- [decision] Backend choice deferred pending PROPOSED review #storage #decision
- [risk] Cross-backend migration cost is non-trivial #migration #risk
- [constraint] Local-only deployment for now #scope

## Relations

- relates_to [[ANALYSIS-901: Backend Tradeoffs]]
- part_of [[SPEC-901: Storage Layer]]
`;

/**
 * Inline fixture: a valid ACCEPTED ADR. Every Considered Option has a
 * non-empty rationale and every Clarification is checked, so the ACCEPTED
 * superRefine gate passes.
 */
const ACCEPTED_FIXTURE = `---
title: 'ADR-902: Test Accepted ADR'
type: decision
status: ACCEPTED
date: 2026-05-24
updated: 2026-05-24
permalink: decisions/adr-902-test-accepted-adr
tags:
  - decision
  - test
  - accepted
---

# ADR-902: Test Accepted ADR

## Context

ACCEPTED ADR fixture with all gate invariants satisfied: every Considered
Option carries non-empty rationale and every Clarification is checked.

## Decision

Selected Option B from Axis 1.

## Considered Options

### Axis 1: Storage Backend

#### Option A: Postgres

Postgres provides ACID and replication; rejected because operational overhead
exceeds the value for local-only deployment.

#### Option B: SQLite

SQLite has zero operational overhead and is selected for the local-only scope.

## Clarifications

- [x] 2026-05-24: Confirmed SQLite WAL mode is enabled per F-6.
- [x] 2026-05-24: Migration to Postgres documented as a Tier-2 follow-up.

## Observations

- [decision] SQLite selected for local-only scope #storage #selected
- [constraint] Postgres path documented but deferred #future-work
- [outcome] Backend invariant locked at ACCEPTED #lock

## Relations

- relates_to [[ANALYSIS-902: Backend Final]]
- part_of [[SPEC-902: Storage Layer Final]]
`;

describe("parseAdrNote — PROPOSED round-trip", () => {
  test("parses a valid PROPOSED ADR without throwing", () => {
    const adr = parseAdrNote(PROPOSED_FIXTURE);
    expect(adr.frontmatter.title).toBe("ADR-901: Test Proposed ADR");
    expect(adr.frontmatter.type).toBe("decision");
    expect(adr.frontmatter.status).toBe("PROPOSED");
    expect(adr.frontmatter.permalink).toBe("decisions/adr-901-test-proposed-adr");
    expect(adr.frontmatter.tags).toHaveLength(3);
  });

  test("collects non-special H2 sections into the opaque sections Record", () => {
    const adr = parseAdrNote(PROPOSED_FIXTURE);
    expect(adr.sections["Context"]).toBeDefined();
    expect(adr.sections["Consequences"]).toBeDefined();
    expect(adr.sections["Considered Options"]).toBeUndefined();
    expect(adr.sections["Observations"]).toBeUndefined();
    expect(adr.sections["Relations"]).toBeUndefined();
  });

  test("parses Considered Options from H3/H4 subsection form", () => {
    const adr = parseAdrNote(PROPOSED_FIXTURE);
    expect(adr.considered_options).toHaveLength(2);
    expect(adr.considered_options[0]?.name).toBe("Postgres");
    expect(adr.considered_options[1]?.name).toBe("SQLite");
    expect(adr.considered_options[0]?.rationale.length).toBeGreaterThan(0);
    expect(adr.considered_options[1]?.rationale.length).toBeGreaterThan(0);
  });

  test("PROPOSED ADR without a Clarifications section omits the field", () => {
    const adr = parseAdrNote(PROPOSED_FIXTURE);
    expect(adr.clarifications).toBeUndefined();
  });

  test("parses Observations with category and tags", () => {
    const adr = parseAdrNote(PROPOSED_FIXTURE);
    expect(adr.observations).toHaveLength(3);
    expect(adr.observations[0]?.category).toBe("decision");
    expect(adr.observations[0]?.tags.length).toBeGreaterThanOrEqual(1);
  });

  test("parses Relations with verb and target", () => {
    const adr = parseAdrNote(PROPOSED_FIXTURE);
    expect(adr.relations).toHaveLength(2);
    expect(adr.relations[0]?.verb).toBe("relates_to");
    expect(adr.relations[1]?.target).toBe("SPEC-901: Storage Layer");
  });
});

describe("parseAdrNote — ACCEPTED round-trip", () => {
  test("parses a valid ACCEPTED ADR without throwing", () => {
    const adr = parseAdrNote(ACCEPTED_FIXTURE);
    expect(adr.frontmatter.status).toBe("ACCEPTED");
    expect(adr.considered_options).toHaveLength(2);
    for (const opt of adr.considered_options) {
      expect(opt.rationale.length).toBeGreaterThan(0);
    }
  });

  test("parses Clarifications including checkbox state", () => {
    const adr = parseAdrNote(ACCEPTED_FIXTURE);
    expect(adr.clarifications).toBeDefined();
    expect(adr.clarifications).toHaveLength(2);
    for (const item of adr.clarifications ?? []) {
      expect(item.done).toBe(true);
    }
  });
});

describe("parseAdrNote — rejection paths", () => {
  test("rejects a note with type !== decision (frontmatter type-guard)", () => {
    const wrongType = PROPOSED_FIXTURE.replace("type: decision", "type: task");
    expect(() => parseAdrNote(wrongType)).toThrow(ZodError);
    try {
      parseAdrNote(wrongType);
    } catch (err) {
      expect(err).toBeInstanceOf(ZodError);
      const zerr = err as ZodError;
      // The failure path is on frontmatter.type because z.literal("decision")
      // rejects "task" at the frontmatter sub-schema layer.
      expect(zerr.issues.some((i) => i.path.includes("type"))).toBe(true);
    }
  });

  test("rejects malformed frontmatter (missing required field)", () => {
    const noPermalink = PROPOSED_FIXTURE.replace(
      "permalink: decisions/adr-901-test-proposed-adr\n",
      "",
    );
    expect(() => parseAdrNote(noPermalink)).toThrow(ZodError);
  });

  test("rejects malformed frontmatter (missing date field)", () => {
    const noDate = PROPOSED_FIXTURE.replace("date: 2026-05-24\n", "");
    expect(() => parseAdrNote(noDate)).toThrow(ZodError);
  });

  test("rejects an ADR with no opaque H2 sections (sections >=1 invariant)", () => {
    // Only typed sections present: Considered Options + Observations + Relations.
    // Schema requires sections Record to have >=1 entry.
    const noOpaque = `---
title: 'ADR-903: Bare ADR'
type: decision
status: PROPOSED
date: 2026-05-24
updated: 2026-05-24
permalink: decisions/adr-903-bare-adr
tags:
  - decision
  - bare
---

# ADR-903: Bare ADR

## Considered Options

### Option A: A

A rationale.

## Observations

- [decision] one #a
- [decision] two #b
- [constraint] three #c

## Relations

- relates_to [[X]]
- part_of [[Y]]
`;
    expect(() => parseAdrNote(noOpaque)).toThrow(ZodError);
  });

  test("ACCEPTED + unchecked Clarification triggers schema superRefine gate", () => {
    const uncheckedClarification = ACCEPTED_FIXTURE.replace(
      "- [x] 2026-05-24: Migration to Postgres documented as a Tier-2 follow-up.",
      "- [ ] 2026-05-24: Migration to Postgres documented as a Tier-2 follow-up.",
    );
    expect(() => parseAdrNote(uncheckedClarification)).toThrow(ZodError);
    try {
      parseAdrNote(uncheckedClarification);
    } catch (err) {
      const zerr = err as ZodError;
      expect(
        zerr.issues.some((i) => i.path.includes("clarifications") && /unchecked/i.test(i.message)),
      ).toBe(true);
    }
  });

  test("ACCEPTED + Considered Option with empty rationale triggers schema gate", () => {
    // Use a table-form ACCEPTED ADR with an empty rationale cell to trigger
    // the superRefine "every Considered Option must have non-empty rationale"
    // rule. Inline schema gate path: considered_options.
    const emptyRationale = `---
title: 'ADR-904: Empty Rationale'
type: decision
status: ACCEPTED
date: 2026-05-24
updated: 2026-05-24
permalink: decisions/adr-904-empty-rationale
tags:
  - decision
  - test
---

# ADR-904: Empty Rationale

## Context

ACCEPTED ADR where one option has whitespace-only rationale, triggering the
schema superRefine ACCEPTED gate.

## Considered Options

| Option | Rationale |
| ------ | --------- |
| A | Real rationale here. |
| B |    |
`;
    // This fixture also lacks Observations and Relations so the schema will
    // reject — but the per-option min(1) check on rationale fires earlier on
    // the empty cell. Add the required tail sections so the failure is
    // unambiguously the ACCEPTED-gate.
    const withTail = `${emptyRationale}\n## Observations\n\n- [decision] one #a\n- [decision] two #b\n- [constraint] three #c\n\n## Relations\n\n- relates_to [[X]]\n- part_of [[Y]]\n`;
    expect(() => parseAdrNote(withTail)).toThrow(ZodError);
  });
});

describe("parseAdrNote — Considered Options table form", () => {
  const TABLE_FIXTURE = `---
title: 'ADR-905: Table Considered Options'
type: decision
status: PROPOSED
date: 2026-05-24
updated: 2026-05-24
permalink: decisions/adr-905-table-considered-options
tags:
  - decision
  - test
  - table-form
---

# ADR-905: Table Considered Options

## Context

Verifies the table-form parse path (TASK DoD literal wording: "Considered
Options table rows").

## Considered Options

| Option | Rationale |
| ------ | --------- |
| Postgres | ACID and replication. |
| SQLite | Zero ops overhead. |

## Observations

- [decision] one #a
- [decision] two #b
- [constraint] three #c

## Relations

- relates_to [[X]]
- part_of [[Y]]
`;

  test("parses Considered Options from GFM table when present", () => {
    const adr = parseAdrNote(TABLE_FIXTURE);
    expect(adr.considered_options).toHaveLength(2);
    expect(adr.considered_options[0]?.name).toBe("Postgres");
    expect(adr.considered_options[0]?.rationale).toBe("ACID and replication.");
    expect(adr.considered_options[1]?.name).toBe("SQLite");
  });
});

describe("parseAdrNote — fixture parse-stability (no renderer available)", () => {
  /**
   * No `renderAdrNote` ships in TASK-005 (TASK contract is parser only).
   * Per TASK DoD: "if no renderer exists, integration test uses a fixture".
   * This test parses the existing tests/fixtures/adr-sample.md and asserts
   * structural fields exist. The fixture predates TASK-001 and lacks some
   * fields the schema now requires (permalink), so it is patched inline to
   * satisfy the schema while preserving the body shape under test.
   */
  test("parses a patched copy of the existing adr-sample fixture", async () => {
    const raw = await Bun.file(join(fixtureDir, "adr-sample.md")).text();
    // The shipped fixture lacks `permalink` (schema requires it as of TASK-001)
    // and uses `## Decision` H3-D-N shape rather than `## Considered Options`.
    // Patch: inject permalink. The schema considers Considered Options optional
    // structurally (empty array is allowed), and the H3 D-N sections fold
    // into opaque sections, so the parse should succeed on a permalink patch.
    const patched = raw.replace(
      /^---\n/,
      "---\npermalink: decisions/adr-042-composition-library-architecture\n",
    );
    const adr = parseAdrNote(patched);
    expect(adr.frontmatter.title).toBe("ADR-042: Composition Library Architecture");
    expect(adr.frontmatter.type).toBe("decision");
    expect(adr.frontmatter.status).toBe("ACCEPTED");
    // Decision body folds into opaque sections; verify a representative one.
    expect(adr.sections["Overview"]).toBeDefined();
    expect(adr.sections["Decision"]).toBeDefined();
    expect(adr.observations.length).toBeGreaterThanOrEqual(3);
    expect(adr.relations.length).toBeGreaterThanOrEqual(2);
  });
});
