---
title: 'TASK-002-SPEC-008: Implement ANALYSIS Schema'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-002-spec-008-implement-analysis-schema
status: DONE
effort: M
estimate: 1d
tags:
- task
- spec-008
- schema
- analysis
- wave-2
---

# TASK-002-SPEC-008: Implement ANALYSIS Schema

## Objective

Implement `AnalysisNoteSchema` at `shared/composition/src/schemas/analysis-note.ts` per [[REQ-001-SPEC-008: New Schema Suite]] and [[DESIGN-001-SPEC-008: Coverage Module Layout]]. The schema validates frontmatter (title regex `^ANALYSIS-\d{3}.*`, type literal `analysis`, status enum including ACCEPTED, permalink regex `^analysis/`, tags 2-5), body sections, Observations, and Relations. The most important rule is a superRefine pass that REJECTS the combination of `status: ACCEPTED` AND the presence of a `## Open Questions` section in the body. This rule encodes the no-open-questions-in-planning-artifacts inline principle that 41 Brain v2 Wave 7 analyses violated.

This TASK depends on Track 4 renaming `_shared/` to `shared/`; orchestrator rewires once that TASK exists.

## Definition of Done
- [x] File `shared/composition/src/schemas/analysis-note.ts` exists and exports `AnalysisNoteSchema` plus `type AnalysisNote`
- [x] Frontmatter sub-schema enforces title regex, type literal `analysis`, status enum, permalink regex, tags 2-5
- [x] superRefine rejects `status: ACCEPTED` plus presence of `## Open Questions` section in body sections list with a message naming the forbidden section
- [x] Schema accepts `status: ACCEPTED` plus `## Open Questions` ABSENT
- [x] Schema accepts `status: DRAFT` plus `## Open Questions` PRESENT (rule only fires at ACCEPTED)
- [x] Final-two-sections invariant is enforced
- [x] Relations verb allowlist enforced from `schemas/common.ts`
- [x] All sub-schemas use `.strict()`
- [x] Unit tests cover: valid DRAFT, valid ACCEPTED without Open Questions, ACCEPTED plus Open Questions rejection, DRAFT plus Open Questions accepted, frontmatter shape failures
- [x] `bun test shared/composition/tests/schemas/analysis-note.test.ts` passes with at least 6 cases green
- [x] `biome check` passes on the new file
- [x] `tsc --noEmit` passes
- [x] `shared/composition/src/schemas/index.ts` re-exports `AnalysisNoteSchema` and `AnalysisNote`
## ADR Compliance
- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-2 (flat directory placement)
- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-5 (P1 ANALYSIS coverage closes Wave 7 exploit)
- [x] Honors [[ADR-001: Composition Library Architecture]]
## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/src/schemas/analysis-note.ts` | NEW | AnalysisNoteSchema implementation |
| `shared/composition/src/schemas/index.ts` | MODIFY | Re-export AnalysisNoteSchema and AnalysisNote |
| `shared/composition/tests/schemas/analysis-note.test.ts` | NEW | Unit tests for AnalysisNoteSchema |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Single conditional refinement (status plus section presence) |
| AI-Dominant | 0.5d | Schema is the simplest of the four new schemas |
| AI-Assisted | 0.5d | Pattern fully established by TASK-001 |

## Observations

- [fact] Closes the highest-impact P1 coverage gap; the Open-Questions-at-ACCEPTED rule prevents the Wave 7 exploit pattern from recurring #analysis #p1 #wave-7
- [decision] The superRefine rule is conditional on status; ACCEPTED triggers the check, DRAFT does not #conditional-refinement
- [risk] Schema must distinguish section presence from heading text; AST-based section detection avoids false positives from prose mentioning Open Questions #ast-section-detection
- [constraint] Path uses `shared/`; orchestrator must order Track 4 rename first #rename-dependency

## Relations

- implements [[REQ-001-SPEC-008: New Schema Suite]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[DESIGN-001-SPEC-008: Coverage Module Layout]]
- depends_on [[TASK-001-SPEC-008: Implement ADR Schema]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
- relates_to [[QA-052-SPEC-008: Implement ANALYSIS Schema]]
