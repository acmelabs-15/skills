import { describe, expect, test } from "bun:test";
import { ZodError } from "zod";
import { parseCritNote } from "../../src/parsers/crit-note.js";

/**
 * Inline fixture: a valid CRIT of an ADR with a Findings table carrying three
 * severities (P0/P1/P2), each with a description and recommendation.
 */
const CRIT_VALID = `---
title: 'CRIT-901-ADR-005: Wave 2 Architecture Review'
type: critique
status: ACCEPTED
permalink: critique/crit-901-adr-005-wave-2-architecture-review
tags:
  - critique
  - adr-005
  - review
---

# CRIT-901-ADR-005: Wave 2 Architecture Review

## Verdict Tally

3 findings: 1 P0, 1 P1, 1 P2. Converged after one round.

## Findings

| Severity | Description | Recommendation |
| -------- | ----------- | -------------- |
| P0 | Resolver callback is optional in the type | Make resolveSpec mandatory when contains relations exist |
| P1 | Open Questions detection is substring-based | Switch to exact section-key lookup |
| P2 | Findings table column order undocumented | Document the canonical column order in DESIGN |

## Observations

- [problem] Resolver optionality risks silent skips #cross-note #problem
- [insight] Exact-key detection avoids prose false positives #detection
- [decision] Column order documented in DESIGN-001 #docs #decision

## Relations

- relates_to [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
`;

describe("parseCritNote — happy path", () => {
  test("parses a valid CRIT without throwing", () => {
    const note = parseCritNote(CRIT_VALID);
    expect(note.frontmatter.title).toBe("CRIT-901-ADR-005: Wave 2 Architecture Review");
    expect(note.frontmatter.type).toBe("critique");
    expect(note.frontmatter.status).toBe("ACCEPTED");
    expect(note.frontmatter.permalink).toBe("critique/crit-901-adr-005-wave-2-architecture-review");
  });

  test("parses the Findings table into typed findings with severity/description/recommendation", () => {
    const note = parseCritNote(CRIT_VALID);
    expect(note.findings).toHaveLength(3);
    expect(note.findings[0]?.severity).toBe("P0");
    expect(note.findings[0]?.description).toBe("Resolver callback is optional in the type");
    expect(note.findings[0]?.recommendation).toBe(
      "Make resolveSpec mandatory when contains relations exist",
    );
    expect(note.findings[1]?.severity).toBe("P1");
    expect(note.findings[2]?.severity).toBe("P2");
  });

  test("collects non-special H2 sections into the opaque sections Record", () => {
    const note = parseCritNote(CRIT_VALID);
    expect(note.sections["Verdict Tally"]).toBeDefined();
    expect(note.sections["Findings"]).toBeUndefined();
    expect(note.sections["Observations"]).toBeUndefined();
    expect(note.sections["Relations"]).toBeUndefined();
  });

  test("round-trip: validated model re-parses cleanly via the schema", async () => {
    const { CritNoteSchema } = await import("../../src/schemas/crit-note.js");
    const note = parseCritNote(CRIT_VALID);
    expect(() => CritNoteSchema.parse(note)).not.toThrow();
  });
});

describe("parseCritNote — rejection paths", () => {
  test("rejects a malformed parent-reference title (un-parented CRIT)", () => {
    // Un-parented form `CRIT-NNN-...` (no PARENT-TYPE-NNN) fails the
    // frontmatter title regex.
    const unparented = CRIT_VALID.replace(
      "title: 'CRIT-901-ADR-005: Wave 2 Architecture Review'",
      "title: 'CRIT-901: Wave 2 Architecture Review'",
    );
    expect(() => parseCritNote(unparented)).toThrow(ZodError);
    try {
      parseCritNote(unparented);
    } catch (err) {
      expect(err).toBeInstanceOf(ZodError);
      const zerr = err as ZodError;
      expect(zerr.issues.some((i) => i.path.includes("title"))).toBe(true);
    }
  });

  test("rejects a parent-reference with an out-of-allowlist PARENT-TYPE", () => {
    // PLAN is not in the six-type allowlist (ADR|ANALYSIS|SPEC|REQ|DESIGN|TASK).
    const wrongParent = CRIT_VALID.replace(
      "title: 'CRIT-901-ADR-005: Wave 2 Architecture Review'",
      "title: 'CRIT-901-PLAN-005: Wave 2 Architecture Review'",
    );
    expect(() => parseCritNote(wrongParent)).toThrow(ZodError);
  });

  test("rejects a note with type !== critique (frontmatter type-guard)", () => {
    const wrongType = CRIT_VALID.replace("type: critique", "type: decision");
    expect(() => parseCritNote(wrongType)).toThrow(ZodError);
    try {
      parseCritNote(wrongType);
    } catch (err) {
      const zerr = err as ZodError;
      expect(zerr.issues.some((i) => i.path.includes("type"))).toBe(true);
    }
  });

  test("rejects a CRIT whose Findings table yields zero valid rows (findings.min(1))", () => {
    // Replace the Findings table body with rows whose severity cells are not
    // P0/P1/P2, so parseFindings yields an empty array and the schema's
    // findings.min(1) invariant rejects.
    const noValidFindings = CRIT_VALID.replace(
      `| P0 | Resolver callback is optional in the type | Make resolveSpec mandatory when contains relations exist |
| P1 | Open Questions detection is substring-based | Switch to exact section-key lookup |
| P2 | Findings table column order undocumented | Document the canonical column order in DESIGN |`,
      "| Low | Some note | Some fix |",
    );
    expect(() => parseCritNote(noValidFindings)).toThrow(ZodError);
    try {
      parseCritNote(noValidFindings);
    } catch (err) {
      const zerr = err as ZodError;
      expect(zerr.issues.some((i) => i.path.includes("findings"))).toBe(true);
    }
  });
});
