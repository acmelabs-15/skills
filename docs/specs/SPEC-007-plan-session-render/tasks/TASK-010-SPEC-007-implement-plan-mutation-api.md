---
title: 'TASK-010-SPEC-007: Implement Plan Mutation API'
type: task
permalink: specs/spec-007-plan-session-render/tasks/task-010-spec-007-implement-plan-mutation-api
status: TODO
effort: L
estimate: 1.5d
tags:
- task
- spec-007
- mutation-api
- plan-note
---

# TASK-010-SPEC-007: Implement Plan Mutation API

## Design Context

This TASK realizes REQ-009-SPEC-007 and DESIGN-003-SPEC-007 mutation API design.

## Objective

Create `_shared/composition/src/plan-mutations.ts` implementing applyPlanMutation with 9 typed mutation handlers following the read-parse-mutate-validate-render-write pipeline. Each mutation reads markdown via Bun.file().text(), parses via parsePlanNote, applies the typed mutation to the in-memory model, validates via PlanNoteSchema.parse(), re-renders via renderPlanNote, and writes via Bun.write().

## Scope

**In Scope**:

- PlanMutation discriminated union type with 9 variants
- Per-mutation Zod schemas for input validation
- applyPlanMutation function with pipeline orchestration
- 9 mutation handlers: set-part-substatus, lock-decision, flip-dod-item, add-task, transition-task, surface-pending-decision, resolve-pending-decision, add-blocker, clear-blockers
- Automatic side-channel propagation via full re-render

**Out of Scope**:

- Session mutation API (TASK-011)
- CLI entry points or skill integration

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/plan-mutations.ts` | NEW | Plan mutation API with 9 typed mutations |

## Testing Requirements

- set-part-substatus changes substatus and triggers Dashboard + Mermaid regeneration
- lock-decision adds row to part decisions table
- flip-dod-item toggles checkbox
- add-task adds to Backlog; transition-task moves between sub-tables
- surface-pending-decision adds PUD; resolve-pending-decision removes PUD
- Schema validation rejects invalid post-mutation state (no partial write)
- Single Bun.write call per mutation (verified via spy/mock)

## Definition of Done

- [ ] All 9 mutation types implemented with correct in-memory transformations
- [ ] Pipeline: read-parse-mutate-validate-render-write for each mutation
- [ ] Schema validation gates every write; invalid mutations rejected
- [ ] Side-channel propagation verified (Dashboard + Mermaid update on substatus change)
- [ ] Unit tests for each mutation type including rejection cases
- [ ] Integration test: apply mutation to fixture, re-parse, verify model change
- [ ] biome lint + tsc --noEmit pass

## ADR Compliance

- [ ] Honors ADR-003 D-3: typed mutations replace edit_note
- [ ] Honors ADR-003 D-4: Zod validation on every write
- [ ] Honors ADR-003 D-7: Mermaid auto-regenerated on substatus change

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 2d | 9 mutation handlers with validation testing |
| AI-Dominant | 1.5d | Sketch available; each handler is small |
| AI-Assisted | 1.5d | Pattern is consistent across mutations |

## Observations

- [task] 9 mutation handlers follow a consistent pattern; per-handler logic is 10-30 lines each #pattern #consistent
- [insight] Side-channel propagation is free because full re-render regenerates all derived views #implicit-propagation
- [constraint] Single disk write per mutation; atomic with schema validation as pre-write gate #atomicity

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[REQ-009-SPEC-007: Plan Mutation API]]
- implements [[DESIGN-003-SPEC-007: Mutation API and Invariant Enforcement]]
- depends_on [[TASK-005-SPEC-007: Implement PlanNote Parser]]
- depends_on [[TASK-007-SPEC-007: Implement PlanNote Renderer]]
