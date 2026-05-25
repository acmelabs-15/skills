---
title: 'TASK-003-SPEC-007: Implement SessionNote Zod Schema'
type: task
permalink: specs/spec-007-plan-session-render/tasks/task-003-spec-007-implement-session-note-schema
status: DONE
effort: M
estimate: 1d
tags:
- task
- spec-007
- schema
- session-note
---

# TASK-003-SPEC-007: Implement SessionNote Zod Schema

## Design Context

This TASK realizes REQ-003-SPEC-007 and the session-note.ts schema from ANALYSIS-002 Appendix C.

## Objective

Create `shared/composition/src/schemas/session-note.ts` with SessionFrontmatterSchema, 10 event type schemas (SessionStartEvent, BootstrapEvent, PartTransitionEvent, DecisionLockEvent, TaskTransitionEvent, AgentDispatchEvent, DebateResultEvent, PendingDecisionSurfacedEvent, PendingDecisionResolvedEvent, StateChangeEvent), EventSchema discriminated union, BoundPlanRefSchema, and SessionNoteSchema with superRefine (event continuity, first event is session-start).

## Scope

**In Scope**:

- All 10 event type schemas with type-specific fields
- z.discriminatedUnion('type', [...]) for EventSchema
- SessionNoteSchema.superRefine: continuous event numbers from 1, first event is session-start
- BoundPlanRefSchema with ref and worked_parts[1+]
- Strict objects, default empty string for event body

**Out of Scope**:

- PlanNote schema (TASK-002)
- Parser implementation

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/src/schemas/session-note.ts` | NEW | SessionNote Zod schema |

## Testing Requirements

- Valid session model passes SessionNoteSchema.parse()
- Non-continuous event numbers fail
- First event not session-start fails
- Each of 10 event types validates with correct type-specific fields
- Invalid event type rejected by discriminated union

## Definition of Done

- [ ] All 10 event type schemas implemented with correct type-specific fields
- [ ] EventSchema discriminated union correctly narrows on type field
- [ ] SessionNoteSchema.superRefine enforces event continuity and first-event constraint
- [ ] BoundPlanRefSchema validates ref and worked_parts[1+]
- [ ] Unit tests cover all 10 event types plus cross-field invariants
- [ ] biome lint + tsc --noEmit pass

## ADR Compliance

- [ ] Honors ADR-003 D-4: discriminated union for events, strict objects, cross-field invariants
- [ ] Honors ADR-003 D-2: SESSION is append-only event ledger; no task/state arrays

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1.5d | 10 event types require individual test coverage |
| AI-Dominant | 1d | Draft exists; mechanical schema translation |
| AI-Assisted | 1d | Draft available from ANALYSIS-002 |

## Observations

- [task] 10 event types via discriminated union is the most structurally complex Zod pattern in the project #discriminated-union #complexity
- [constraint] Event numbers must be continuous from 1; enforced via superRefine on sorted event array #continuity #invariant
- [technique] Each event type has shared base fields (n, ts, title, body) plus type-specific extensions #shared-base #extension

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[REQ-003-SPEC-007: SessionNote Zod Schema]]
- depends_on [[TASK-001-SPEC-007: Implement Common Schema Module]]
- validated_by [[QA-012-SPEC-007: Implement SessionNote Zod Schema]]
