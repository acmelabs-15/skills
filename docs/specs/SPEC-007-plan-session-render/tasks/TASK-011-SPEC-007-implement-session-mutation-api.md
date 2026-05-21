---
title: 'TASK-011-SPEC-007: Implement Session Mutation API'
type: task
permalink: specs/spec-007-plan-session-render/tasks/task-011-spec-007-implement-session-mutation-api
status: DONE
effort: S
estimate: 0.5d
tags:
- task
- spec-007
- mutation-api
- session-note
---

# TASK-011-SPEC-007: Implement Session Mutation API

## Design Context

This TASK realizes REQ-010-SPEC-007 and DESIGN-003-SPEC-007.

## Objective

Create `_shared/composition/src/session-mutations.ts` implementing applySessionMutation with the append-event mutation following the same read-parse-mutate-validate-render-write pipeline as plan mutations. Event-number continuity is enforced both by the mutation function (new n must equal max existing + 1) and by SessionNoteSchema superRefine.

## Scope

**In Scope**:

- SessionMutation type with append-event variant
- applySessionMutation function with pipeline orchestration
- Event continuity pre-check (max existing event + 1)
- Full re-render via renderSessionNote

**Out of Scope**:

- Plan mutation API (TASK-010)
- Future session mutation types (update-observation, etc.)

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/session-mutations.ts` | NEW | Session mutation API |

## Testing Requirements

- append-event with correct event number succeeds
- append-event with non-continuous number rejected before write
- Appended event appears in rendered output with correct typed-field bullets
- Single Bun.write call per mutation

## Definition of Done

- [ ] append-event mutation implemented with continuity pre-check
- [ ] Pipeline: read-parse-mutate-validate-render-write
- [ ] Non-continuous event numbers rejected
- [ ] Unit tests for append-event including rejection cases
- [ ] biome lint + tsc --noEmit pass

## ADR Compliance

- [ ] Honors ADR-003 D-2: SESSION is append-only
- [ ] Honors ADR-003 D-3: typed mutations replace edit_note
- [ ] Honors ADR-003 D-4: Zod validation on every write

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.5d | Single mutation type, straightforward |
| AI-Dominant | 0.5d | Follows plan mutation pattern |
| AI-Assisted | 0.5d | Pattern established by TASK-010 |

## Observations

- [task] Session mutation API supports only append-event; simpler than plan mutation API #simple #single-mutation
- [constraint] Append-only: no delete or update mutations for events #immutability #append-only
- [technique] Same pipeline pattern as plan mutations ensures consistency across both APIs #pattern-reuse

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[REQ-010-SPEC-007: Session Mutation API]]
- implements [[DESIGN-003-SPEC-007: Mutation API and Invariant Enforcement]]
- depends_on [[TASK-006-SPEC-007: Implement SessionNote Parser]]
- depends_on [[TASK-008-SPEC-007: Implement SessionNote Renderer]]
- validated_by [[QA-020-SPEC-007: Implement Session Mutation API]]
