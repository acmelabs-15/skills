---
title: 'REQ-001-SPEC-008: New Schema Suite'
type: requirement
permalink: specs/spec-008-protocol-hardening-wave-2/requirements/req-001-spec-008-new-schema-suite
status: DRAFT
tags:
- requirement
- spec-008
- schema
- wave-2
- coverage
---

# REQ-001-SPEC-008: New Schema Suite

## EARS

WHEN the composition library at `shared/composition/src/schemas/` is loaded
THE SYSTEM SHALL expose five new Zod schemas (`adr-note.ts`, `analysis-note.ts`, `epic-note.ts`, `crit-note.ts`, and extend `plan-note.ts` with a done-claim refinement) following the existing `<type>-note.ts` flat-directory naming pattern
SO THAT every P0 and P1 Brain note type from Audit A has a structural validation contract enforceable at write time.

## Pattern

Schema Validation Contract (Event-Driven: triggered on every parse and pre-write of a Brain note via the hook layer authored by Track 5).

## Priority

P0 — schemas are the precondition for parsers (REQ-002) and claim validators (REQ-003).

## Category

Functional.

## Context

[[ADR-005: Protocol Hardening Wave 2 Architecture]] D-2 locks the directory layout (extend existing flat dirs). D-5 locks the scope (include all three P1 schemas: ANALYSIS, EPIC, CRIT, plus the P0 ADR schema and PLAN-done-claim refinement). [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]] Audit A identified the coverage matrix: 9 of 16 canonical Brain note types have no schema. ADR is the highest-consequence gap because the PROPOSED to ACCEPTED transition is the architectural decision gate. ANALYSIS lacks rejection for the Open-Questions-in-ACCEPTED-status exploit. EPIC and CRIT have zero current schema coverage. PLAN has a schema but no done-claim refinement.

## Acceptance Criteria

- [ ] GIVEN a markdown file with valid ADR frontmatter, status PROPOSED, and one Considered Option with rationale WHEN `AdrNoteSchema.parse()` is called THEN validation passes
- [ ] GIVEN an ADR with status ACCEPTED and a Clarifications item with an unchecked `[ ]` checkbox WHEN `AdrNoteSchema.parse()` is called THEN validation fails with a message identifying the unchecked clarification
- [ ] GIVEN an ANALYSIS with status ACCEPTED and a `## Open Questions` section present WHEN `AnalysisNoteSchema.parse()` is called THEN validation fails with a message naming the forbidden section
- [ ] GIVEN an EPIC frontmatter shape (title regex, type literal `epic`, status, permalink regex, tags 2-5) WHEN `EpicNoteSchema.parse()` is called against valid input THEN validation passes
- [ ] GIVEN a CRIT note with the H1 not matching frontmatter title verbatim WHEN `CritNoteSchema.parse()` is called THEN validation fails with a message identifying the H1 drift
- [ ] GIVEN a PLAN note with frontmatter status DONE but one or more parts in non-terminal status WHEN the extended `PlanNoteSchema.parse()` is called THEN validation fails with a message naming the non-terminal parts
- [ ] GIVEN any of the five schemas WHEN it parses an input missing the mandatory `## Observations` then `## Relations` final-two-sections invariant THEN validation fails
- [ ] GIVEN any of the five schemas WHEN it parses an input whose Relations section uses a verb outside the 11-verb allowlist from `shared/composition/src/schemas/common.ts` THEN validation fails

## Implementation Notes

Each schema mirrors the existing Zod plus superRefine pattern at `shared/composition/src/schemas/plan-note.ts`. Each schema imports cross-cutting constants from `shared/composition/src/schemas/common.ts` (status enums, frontmatter title regex builder, valid relation verbs, observation category set). Sub-schemas use `.strict()` to reject unknown frontmatter keys. The PLAN done-claim refinement extends the existing PlanNoteSchema via superRefine; the new check rejects `status: DONE` when any part is not in a terminal substatus (`DONE`, `DEFERRED`, or `ABANDONED`).

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/src/schemas/adr-note.ts` | NEW | ADR schema with PROPOSED-to-ACCEPTED gate refinement |
| `shared/composition/src/schemas/analysis-note.ts` | NEW | ANALYSIS schema rejecting ACCEPTED plus Open Questions |
| `shared/composition/src/schemas/epic-note.ts` | NEW | EPIC schema (frontmatter plus structural sections) |
| `shared/composition/src/schemas/crit-note.ts` | NEW | CRIT schema for adr-review structural support |
| `shared/composition/src/schemas/plan-note.ts` | MODIFY | Extend superRefine with done-claim check (all parts terminal) |

## Observations

- [requirement] Five new Zod schemas close the P0 and P1 coverage gaps from ANALYSIS-004 Audit A; the four NEW schemas land in `shared/composition/src/schemas/` while plan-note.ts gets an additive refinement #schema #wave-2 #coverage
- [constraint] All schemas import cross-cutting constants from common.ts; no duplication of relation-verb or status enums permitted #single-source-of-truth #drift-prevention
- [decision] ANALYSIS schema rejects the Open-Questions-at-ACCEPTED pattern that 41 Brain v2 Wave 7 analyses exhibited; this is the highest-value P1 rule #open-questions #wave-7
- [constraint] CRIT receives a schema but no claim validator per D-5; structural read-time validation only #crit #no-claim-validator

## Relations

- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[ADR-001: Composition Library Architecture]]
- depends_on [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]]