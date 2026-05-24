---
title: 'TASK-003-SPEC-008: Implement EPIC Schema'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-003-spec-008-implement-epic-schema
status: DONE
effort: M
estimate: 1d
tags:
- task
- spec-008
- schema
- epic
- wave-2
---

# TASK-003-SPEC-008: Implement EPIC Schema

## Description

Implement `EpicNoteSchema` at `shared/composition/src/schemas/epic-note.ts` per [[REQ-001-SPEC-008: New Schema Suite]] and [[DESIGN-001-SPEC-008: Coverage Module Layout]]. The schema validates frontmatter (title regex `^EPIC-\d{3}.*`, type literal `epic`, status enum, permalink regex `^roadmap/`, tags 2-5), body sections (Context, Scope, Contained Specs section that mirrors the `contains` Relations entries), Observations, Relations (with at least one `contains` relation when the EPIC contains any SPEC). The schema does NOT include a done-claim refinement at the schema layer; the cross-note done-claim check lives in `validateEpicDoneClaim` (TASK-009) because it requires resolving SPEC files outside the EPIC itself.

This TASK depends on Track 4 renaming `_shared/` to `shared/`.

## Definition of Done

- [x] File `shared/composition/src/schemas/epic-note.ts` exists and exports `EpicNoteSchema` plus `type EpicNote`
- [x] Frontmatter sub-schema enforces title regex, type literal `epic`, status enum, permalink regex `^roadmap/`, tags 2-5
- [x] Schema requires a Contained Specs body section when the Relations section has any `contains` entry
- [x] Final-two-sections invariant is enforced
- [x] Relations verb allowlist enforced from `schemas/common.ts`
- [x] All sub-schemas use `.strict()`
- [x] No cross-note resolution in the schema itself (deferred to claim validator in TASK-009)
- [x] Unit tests cover: valid DRAFT, valid DONE with contains entries, missing Contained Specs section when contains present, frontmatter shape failures, forbidden relation verb rejection
- [x] `bun test shared/composition/tests/schemas/epic-note.test.ts` passes with at least 6 cases green
- [x] `biome check` passes
- [x] `tsc --noEmit` passes
- [x] `shared/composition/src/schemas/index.ts` re-exports `EpicNoteSchema` and `EpicNote`

## ADR Compliance

- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-2
- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-5 (P1 EPIC coverage)
- [x] Honors [[ADR-001: Composition Library Architecture]]

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/src/schemas/epic-note.ts` | NEW | EpicNoteSchema implementation |
| `shared/composition/src/schemas/index.ts` | MODIFY | Re-export EpicNoteSchema and EpicNote |
| `shared/composition/tests/schemas/epic-note.test.ts` | NEW | Unit tests for EpicNoteSchema |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | EPIC has no current consumers; representative fixture needs authoring |
| AI-Dominant | 0.5d | Straightforward frontmatter plus structural schema |
| AI-Assisted | 0.5d | Pattern established |

## Observations

- [fact] EPIC schema closes a P1 coverage gap; no current consumers exist but the schema is ready when the first EPIC note is authored #epic #p1 #ahead-of-need
- [decision] Cross-note done-claim check lives in the validator (TASK-009), not the schema; schema only validates intrinsic structure #separation-of-concerns
- [constraint] Schema requires Contained Specs section when contains relations exist; rejects the implicit-only-relations pattern #explicit-structure
- [risk] Path uses `shared/`; depends on Track 4 rename completing first #rename-dependency

## Relations

- implements [[REQ-001-SPEC-008: New Schema Suite]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[DESIGN-001-SPEC-008: Coverage Module Layout]]
- depends_on [[TASK-001-SPEC-008: Implement ADR Schema]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
- relates_to [[QA-057-SPEC-008: Validation Report for TASK-003 EPIC Schema]]
