import { describe, expect, test } from "bun:test";
import { ZodError } from "zod";
import { parseEpicNote } from "../../src/parsers/epic-note.js";

/**
 * Inline fixture: a valid EPIC with `contains` relations and a matching
 * Contained Specs section authored as a bullet list of wikilinks.
 */
const EPIC_LIST_FORM = `---
title: 'EPIC-901: Protocol Hardening'
type: epic
status: IN_PROGRESS
permalink: roadmap/epic-901-protocol-hardening
tags:
  - epic
  - hardening
  - roadmap
---

# EPIC-901: Protocol Hardening

## Epic Statement

Harden the protocol surface across two waves of coverage work.

## Contained Specs

- [[SPEC-007: Plan/Session Render Implementation]]
- [[SPEC-008: Protocol Hardening Wave 2]]

## Observations

- [decision] Two-wave delivery locked #roadmap #decision
- [fact] Wave 1 shipped 2026-05-21 #milestone
- [insight] Coverage gaps tracked in ANALYSIS-004 #coverage

## Relations

- contains [[SPEC-007: Plan/Session Render Implementation]]
- contains [[SPEC-008: Protocol Hardening Wave 2]]
`;

/**
 * Inline fixture: a valid EPIC whose Contained Specs section is a GFM table.
 */
const EPIC_TABLE_FORM = `---
title: 'EPIC-902: Search Platform'
type: epic
status: DRAFT
permalink: roadmap/epic-902-search-platform
tags:
  - epic
  - search
---

# EPIC-902: Search Platform

## Vision

Deliver a unified hybrid search platform.

## Contained Specs

| Spec | Priority |
| ---- | -------- |
| [[SPEC-911: Lexical Index]] | P0 |
| [[SPEC-912: Vector Store]] | P1 |

## Observations

- [decision] Hybrid-first sequencing #search #decision
- [fact] Two SPECs in scope #scope
- [risk] Vector store cost unbounded #cost #risk

## Relations

- contains [[SPEC-911: Lexical Index]]
- contains [[SPEC-912: Vector Store]]
`;

describe("parseEpicNote — happy path", () => {
  test("parses a valid EPIC (list-form Contained Specs) without throwing", () => {
    const note = parseEpicNote(EPIC_LIST_FORM);
    expect(note.frontmatter.title).toBe("EPIC-901: Protocol Hardening");
    expect(note.frontmatter.type).toBe("epic");
    expect(note.frontmatter.status).toBe("IN_PROGRESS");
    expect(note.frontmatter.permalink).toBe("roadmap/epic-901-protocol-hardening");
  });

  test("derives containedSpecs from the list-form section, mirroring contains relations", () => {
    const note = parseEpicNote(EPIC_LIST_FORM);
    expect(note.containedSpecs).toEqual([
      "SPEC-007: Plan/Session Render Implementation",
      "SPEC-008: Protocol Hardening Wave 2",
    ]);
    const containsTargets = note.relations
      .filter((r) => r.verb === "contains")
      .map((r) => r.target);
    expect(note.containedSpecs).toEqual(containsTargets);
  });

  test("derives containedSpecs from the table-form section", () => {
    const note = parseEpicNote(EPIC_TABLE_FORM);
    expect(note.containedSpecs).toEqual(["SPEC-911: Lexical Index", "SPEC-912: Vector Store"]);
  });

  test("collects non-special H2 sections into the opaque sections Record", () => {
    const note = parseEpicNote(EPIC_LIST_FORM);
    expect(note.sections["Epic Statement"]).toBeDefined();
    expect(note.sections["Contained Specs"]).toBeDefined();
    expect(note.sections["Observations"]).toBeUndefined();
    expect(note.sections["Relations"]).toBeUndefined();
  });

  test("round-trip: validated model re-parses cleanly via the schema", async () => {
    const { EpicNoteSchema } = await import("../../src/schemas/epic-note.js");
    const note = parseEpicNote(EPIC_LIST_FORM);
    const { containedSpecs: _drop, ...model } = note;
    expect(() => EpicNoteSchema.parse(model)).not.toThrow();
  });
});

describe("parseEpicNote — rejection paths", () => {
  test("rejects EPIC with contains relations but no Contained Specs section", () => {
    // Drop the Contained Specs H2 (and its body) while keeping the contains
    // relations. The schema superRefine rejects this mismatch.
    const noSection = EPIC_LIST_FORM.replace(
      `## Contained Specs

- [[SPEC-007: Plan/Session Render Implementation]]
- [[SPEC-008: Protocol Hardening Wave 2]]

`,
      "",
    );
    expect(() => parseEpicNote(noSection)).toThrow(ZodError);
    try {
      parseEpicNote(noSection);
    } catch (err) {
      expect(err).toBeInstanceOf(ZodError);
      const zerr = err as ZodError;
      expect(zerr.issues.some((i) => i.path.includes("Contained Specs"))).toBe(true);
    }
  });

  test("rejects a note with type !== epic (frontmatter type-guard)", () => {
    const wrongType = EPIC_LIST_FORM.replace("type: epic", "type: analysis");
    expect(() => parseEpicNote(wrongType)).toThrow(ZodError);
    try {
      parseEpicNote(wrongType);
    } catch (err) {
      const zerr = err as ZodError;
      expect(zerr.issues.some((i) => i.path.includes("type"))).toBe(true);
    }
  });

  test("rejects malformed frontmatter (missing permalink)", () => {
    const noPermalink = EPIC_LIST_FORM.replace(
      "permalink: roadmap/epic-901-protocol-hardening\n",
      "",
    );
    expect(() => parseEpicNote(noPermalink)).toThrow(ZodError);
  });
});
