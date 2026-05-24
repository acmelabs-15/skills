---
title: 'REQ-002-SPEC-008: New Parser Suite'
type: requirement
permalink: specs/spec-008-protocol-hardening-wave-2/requirements/req-002-spec-008-new-parser-suite
status: DRAFT
tags:
- requirement
- spec-008
- parser
- wave-2
- coverage
---

# REQ-002-SPEC-008: New Parser Suite

## EARS

WHEN markdown content for an ADR, ANALYSIS, EPIC, or CRIT note is loaded by the composition library
THE SYSTEM SHALL parse the markdown via unified plus remark AST into a typed in-memory model and validate it against the corresponding Zod schema authored under REQ-001, exposing the parsed model through `shared/composition/src/parsers/<type>-note.ts` modules
SO THAT downstream claim validators (REQ-003) and the hook layer (Track 5) operate on structurally valid typed data, not raw text.

## Pattern

Parser Pipeline (Synchronous: markdown text in, validated typed model out, throws on schema rejection).

## Priority

P0 — parsers gate the claim validators authored in REQ-003 and the hook handlers in Track 5.

## Category

Functional.

## Context

[[ADR-005: Protocol Hardening Wave 2 Architecture]] D-5 locks the requirement to ship four new parsers (ADR, ANALYSIS, EPIC, CRIT) plus an extension to the existing PLAN parser to expose the done-claim shape. [[ADR-001: Composition Library Architecture]] established the unified plus remark parsing pattern Wave 1 mandated. [[SPEC-007: Plan/Session Render Implementation]] DESIGN-001 documents the four-layer schema-parser-renderer-mutation contract. The new parsers follow the same shape: frontmatter via js-yaml, body via unified, section headings keyed against the schema's structural section set, observation and relation entries parsed via the existing AST helpers at `shared/composition/src/parsers/ast-helpers.ts`.

## Acceptance Criteria

- [ ] GIVEN an ADR markdown fixture WHEN `parseAdrNote(markdown)` is called THEN it returns an `AdrNote` typed model that re-parses via `AdrNoteSchema.parse()` without error
- [ ] GIVEN an ANALYSIS markdown fixture with `## Open Questions` section present and status ACCEPTED WHEN `parseAnalysisNote(markdown)` is called THEN it throws a Zod validation error referencing the forbidden section
- [ ] GIVEN an EPIC markdown fixture WHEN `parseEpicNote(markdown)` is called THEN it returns an `EpicNote` typed model with a `contains` relation array populated from the Relations section
- [ ] GIVEN a CRIT markdown fixture WHEN `parseCritNote(markdown)` is called THEN it returns a `CritNote` typed model with findings parsed from `## Findings` section table rows
- [ ] GIVEN the existing PLAN parser at `shared/composition/src/parsers/plan-note.ts` WHEN parsing a PLAN note whose status is DONE THEN the parsed model exposes a `parts` array suitable for `validatePlanDoneClaim` (REQ-003) to scan for non-terminal substatuses
- [ ] GIVEN any of the four new parsers WHEN the input markdown frontmatter does not match the expected `type` literal (e.g., feeding an ANALYSIS to `parseAdrNote`) THEN the parser throws a Zod validation error identifying the type mismatch
- [ ] GIVEN any of the four new parsers WHEN parsing succeeds THEN the returned model survives a render-then-parse round-trip with identical structural fields (no information loss in the parser layer)

## Implementation Notes

Each parser is colocated with its schema by name: `shared/composition/src/parsers/adr-note.ts`, `analysis-note.ts`, `epic-note.ts`, `crit-note.ts`. Each parser imports the schema from `shared/composition/src/schemas/<type>-note.ts` and the shared AST helpers. Frontmatter parsing uses js-yaml; body parsing uses unified plus remark-parse plus remark-frontmatter; section dispatch follows the SPEC-007 DESIGN-002 `bulletFieldMap` pattern. The PLAN parser extension is a non-breaking field addition: the existing `parsePlanNote` already returns the `parts` array; this REQ confirms the shape is sufficient for REQ-003's `validatePlanDoneClaim`.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/src/parsers/adr-note.ts` | NEW | parseAdrNote: markdown to AdrNote |
| `shared/composition/src/parsers/analysis-note.ts` | NEW | parseAnalysisNote: markdown to AnalysisNote |
| `shared/composition/src/parsers/epic-note.ts` | NEW | parseEpicNote: markdown to EpicNote |
| `shared/composition/src/parsers/crit-note.ts` | NEW | parseCritNote: markdown to CritNote |
| `shared/composition/src/parsers/plan-note.ts` | VERIFY | Confirm existing parser exposes parts shape; no code change expected |

## Observations

- [requirement] Four new parsers plus a verify-existing-PLAN parser deliver the parse layer for the new schemas; each parser is a thin AST plus schema-parse adapter #parser #wave-2 #coverage
- [decision] Parsers throw Zod errors on validation failure rather than returning Result types; matches the Wave 1 convention at parsers/plan-note.ts #throw-on-error #wave-1-parity
- [constraint] Parsers reject mismatched `type` literals at the frontmatter layer; misrouted markdown cannot silently succeed #type-guard #strict
- [technique] Section dispatch reuses the SPEC-007 bulletFieldMap pattern; new parsers stay structurally aligned with existing PLAN and SESSION parsers #pattern-reuse #consistency

## Relations

- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- implements [[ADR-001: Composition Library Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[REQ-001-SPEC-008: New Schema Suite]]
