---
title: 'TASK-014-SPEC-007: Execute PLAN-001 Migration to Trimmed Template'
type: task
permalink: specs/spec-007-plan-session-render/tasks/task-014-spec-007-execute-plan-001-migration-to-trimmed-template
status: DONE
effort: M
estimate: 1d
tags:
- task
- spec-007
- gap
- dogfood
- migration
---

# TASK-014-SPEC-007: Execute PLAN-001 Migration to Trimmed Template

## Design Context

Gap-TASK filed by retro-validation QA against TASK-013-SPEC-007. The Wave 2 implementation merged the render pipeline (parser + renderer + mutations + round-trip tests on canonical fixtures) but did NOT execute the PLAN-001 migration to the trimmed template. Live `docs/planning/PLAN-001-skills-ecosystem.md` still contains all three forbidden sections (Workflow Plan / Decision Log / Progress Log).

See QA-022-SPEC-007 for the gap evidence.

## Objective

Apply the SPEC-007 render pipeline to `docs/planning/PLAN-001-skills-ecosystem.md` to produce a trimmed-template form that:

1. Drops forbidden sections per ADR-003 D-10 (Decision Log, Progress Log) and D-11 (Workflow Plan)
2. Consolidates per-part Tasks / Editor Mirror / PUD at the PLAN top level per D-6 / D-9
3. Passes `PlanNoteSchema.parse()` after migration
4. Satisfies SHA-256 round-trip identity: `render(parse(migrated)) === migrated`
5. Preserves all state data (part substatuses, task statuses, outcomes, DoD)

## Scope

**In Scope**:

- Parse current PLAN-001 (best-effort against the legacy template; expect divergence)
- Drop `## Workflow Plan`, `## Decision Log`, `## Progress Log`, and any per-part Tasks/Editor Mirror IDs/Pending User Decisions subgroups
- Consolidate Tasks at top level with Part column (Active / Backlog / Archive sub-tables)
- Consolidate Editor Mirror IDs + Pending User Decisions at top level
- Re-render via `renderPlanNote` and iterate parser/renderer adjustments if needed
- Verify SHA-256 round-trip on the migrated form
- git diff inspection for structural changes only

**Out of Scope**:

- Migrating other plan or session notes
- Changing parser/renderer behavior (use as-shipped from TASK-005 / TASK-007)

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `docs/planning/PLAN-001-skills-ecosystem.md` | MODIFY | Migrate to trimmed template |

## Definition of Done

- [x] `## Workflow Plan` absent from PLAN-001
- [x] `## Decision Log` absent from PLAN-001
- [x] `## Progress Log` absent from PLAN-001
- [x] No per-part Tasks subsection inside Parts; Tasks consolidated at top level with Part column
- [x] Top-level Editor Mirror IDs section present
- [x] Top-level Pending User Decisions section present
- [x] `PlanNoteSchema.parse(parsePlanNote(migrated))` succeeds
- [x] `sha256(renderPlanNote(parsePlanNote(migrated))) === sha256(migrated)` (round-trip)
- [x] All part substatuses preserved (verify by spot check against pre-migration content)
- [x] All task statuses preserved
- [x] All outcomes + DoD checkbox states preserved
- [x] git diff shows structural changes only — no data loss

## ADR Compliance

- [x] Honors ADR-003 D-6: consolidated tasks at top level
- [x] Honors ADR-003 D-9: PUD and Editor Mirror at top level
- [x] Honors ADR-003 D-10: no Decision Log or Progress Log
- [x] Honors ADR-003 D-11: no Workflow Plan prose

## Observations

- [problem] PLAN-001 retains 3 forbidden sections post-Wave 2; SPEC-007 dogfood proof not delivered on the live file #migration-pending
- [fact] PLAN-001 is 1513 lines; trimmed form expected to reduce ~70% per ADR-003 estimate #scale
- [constraint] Migration must preserve all state data (substatuses / statuses / outcomes / DoD) #data-integrity

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[REQ-012-SPEC-007: PLAN-001 Dogfood Migration]]
- extends [[TASK-013-SPEC-007: Dogfood PLAN-001 Migration]]
- caused_by [[QA-022-SPEC-007: Dogfood PLAN-001 Migration]]
- [decision] Supersedes TASK-013 which was BLOCKED by QA-022 FAIL; gap-TASK ready for build dispatch #supersedes #gap-task
- supersedes [[TASK-013-SPEC-007: Dogfood PLAN-001 Migration]]

- validated_by [[QA-021-SPEC-007: Implement Round-Trip Property Test]]
