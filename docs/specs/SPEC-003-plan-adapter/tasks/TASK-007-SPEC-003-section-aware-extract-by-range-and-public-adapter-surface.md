---
title: 'TASK-007-SPEC-003: Section-Aware extractByRange and Public Adapter Surface'
type: task
permalink: specs/spec-003-plan-adapter/tasks/task-007-spec-003-section-aware-extract-by-range-and-public-adapter-surface
status: DONE
effort: S
estimate: 0.5d
tags:
- task
- spec-003
- gap-task
- extract-by-range
---

# TASK-007-SPEC-003: Section-Aware extractByRange and Public Adapter Surface

## Design Context

Gap-TASK surfaced during SPEC-003 Wave 2 retro-validation (QA-010-SPEC-003). REQ-001-SPEC-003 AC-1 mandates section_delimiter and identifier_pattern as observable adapter properties; AC-2 mandates extractByRange use inclusive-of-own-heading exclusive-of-next-heading semantics for phase sections. Current impl keeps these as dead private fields and uses a raw line slice.

## Objective

Expose section_delimiter and identifier_pattern on the PlanAdapter public surface; add a section-aware extractByRange behavior that honours boundary semantics for `### {phase}.{part-id}` sections under the Workflow Plan heading; also exclude regen-section lines from extractByRange output when regenerated_sections is supplied.

## Scope

In Scope: expose section_delimiter and identifier_pattern as readonly public fields on PlanAdapter; add section-extraction overload or helper that computes the line range for a phase identifier; update extractByRange to respect regenerated_sections when given; add unit tests in plan-adapter.test.ts; ensure no regressions in plan-round-trip.test.ts.
Out of Scope: dispatcher registration (TASK-006); integrity-floor semantics (TASK-008); frontmatter inverse (TASK-009); fixture additions (TASK-010).

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| shared/composition/src/adapters/plan.ts | MODIFY | Expose section_delimiter and identifier_pattern; section-aware extractByRange |
| shared/composition/tests/plan-adapter.test.ts | MODIFY | Add tests for AC-1 AC-2 AC-6 |

## Definition of Done

- [x] PlanAdapter exposes readonly section_delimiter === "### "
- [x] PlanAdapter exposes readonly identifier_pattern matching {phase}.{part-id} format
- [x] extractByRange returns content including own heading and excluding next heading at same delimiter level
- [x] extractByRange excludes lines belonging to regenerated_sections when mutation spec supplied
- [x] Test: extracting a `### build.SPEC-001` section returns from that line up to but not including the next `###`
- [x] Test: identifier_pattern matches "research.1" and "spec.SPEC-001"
- [x] All existing plan-adapter.test.ts and plan-round-trip.test.ts pass

## ADR Compliance

- [x] Honors ADR-002 D-3: PLAN distinct implementation observable contract
- [x] Honors ADR-002 D-4: PLAN hash extraction strategy section boundary semantics

## Observations

- [problem] section_delimiter and identifier_pattern are private dead code at plan.ts:59-60 #req-001-ac-1
- [problem] extractByRange uses raw 1-indexed line slice; no section-boundary detection #req-001-ac-2
- [problem] extractByRange does not respect regenerated_sections #req-002-ac-1

## Relations

- part_of [[SPEC-003: PLAN Adapter]]
- caused_by [[QA-010-SPEC-003: PLAN Adapter Base]]
- caused_by [[QA-011-SPEC-003: Regen Sections and Integrity Floor]]
- extends [[TASK-001-SPEC-003: Implement PLAN Adapter Base]]
- implements [[REQ-001-SPEC-003: PLAN Adapter Implementation]]

- validated_by [[QA-032-SPEC-003: Batched plan.ts TASKs-007-008-009]]
