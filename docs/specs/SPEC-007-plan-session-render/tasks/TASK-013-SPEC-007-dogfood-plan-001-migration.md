---
title: 'TASK-013-SPEC-007: Dogfood PLAN-001 Migration'
type: task
permalink: specs/spec-007-plan-session-render/tasks/task-013-spec-007-dogfood-plan-001-migration
status: TODO
effort: M
estimate: 1d
tags:
- task
- spec-007
- migration
- dogfood
---

# TASK-013-SPEC-007: Dogfood PLAN-001 Migration

## Design Context

This TASK realizes REQ-012-SPEC-007 and the migration plan from ADR-003 Implementation Notes and ANALYSIS-002 Appendix I.

## Objective

Migrate PLAN-001-skills-ecosystem.md from the original template to the trimmed template form. Parse current PLAN-001, drop removed sections (Workflow Plan prose, Decision Log, Progress Log, per-part Tasks/Editor Mirror IDs/Pending User Decisions/Intra-part Deps Graph), consolidate Tasks at top level with Part column, re-render via renderPlanNote, iterate until round-trip char-identity holds.

## Scope

**In Scope**:

- Parse current PLAN-001 (original template)
- Drop sections per ADR-003 Responsibility Audit "PLAN drops" list
- Consolidate per-part Tasks into top-level Active/Backlog/Archive with Part column
- Consolidate per-part Editor Mirror IDs and Pending User Decisions at top level
- Re-render via renderPlanNote
- Verify round-trip char-identity on migrated form
- Preserve all state data (part substatuses, task statuses, outcomes, DoD states)

**Out of Scope**:

- Migrating other plan or session notes (incremental per ADR-003 migration plan)
- Modifying SESSION notes

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `docs/planning/PLAN-001-skills-ecosystem.md` | MODIFY | Migrate to trimmed template |

## Testing Requirements

- Migrated PLAN-001 passes PlanNoteSchema validation
- Round-trip identity holds: render(parse(migrated)) === migrated (SHA-256)
- All part substatuses preserved from original
- All task statuses preserved
- All outcomes preserved
- Dropped sections absent in migrated form

## Definition of Done

- [ ] PLAN-001 migrated to trimmed template form
- [ ] PlanNoteSchema.parse() passes on migrated content
- [ ] Round-trip char-identity holds (SHA-256)
- [ ] All state data preserved (parts, tasks, outcomes, DoD)
- [ ] Dropped sections absent: Workflow Plan, Decision Log, Progress Log, per-part duplicates
- [ ] Consolidated sections present: Tasks at top level, Editor Mirror at top level, PUD at top level
- [ ] git diff shows structural changes only, no data loss

## ADR Compliance

- [ ] Honors ADR-003 D-6: consolidated tasks at top level
- [ ] Honors ADR-003 D-9: PUD and Editor Mirror at top level
- [ ] Honors ADR-003 D-10: no Decision Log or Progress Log
- [ ] Honors ADR-003 D-11: no Workflow Plan prose

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1.5d | Large file migration with data preservation verification |
| AI-Dominant | 1d | Automated via parser + renderer; manual verification |
| AI-Assisted | 1d | Script-assisted migration |

## Observations

- [task] PLAN-001 is 3000+ lines; migration proves the pipeline at realistic scale #scale #dogfood
- [insight] About 70% bulk reduction expected from consolidation and section removal #reduction #estimate
- [constraint] All state data must be preserved; only structural form changes #preservation #integrity

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[REQ-012-SPEC-007: PLAN-001 Dogfood Migration]]
- depends_on [[TASK-012-SPEC-007: Implement Round-Trip Property Test]]
- depends_on [[TASK-010-SPEC-007: Implement Plan Mutation API]]
