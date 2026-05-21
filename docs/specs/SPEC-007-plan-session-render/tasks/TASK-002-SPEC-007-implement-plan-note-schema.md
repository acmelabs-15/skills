---
title: 'TASK-002-SPEC-007: Implement PlanNote Zod Schema'
type: task
permalink: specs/spec-007-plan-session-render/tasks/task-002-spec-007-implement-plan-note-schema
status: DONE
effort: M
estimate: 1d
tags:
- task
- spec-007
- schema
- plan-note
---

# TASK-002-SPEC-007: Implement PlanNote Zod Schema

## Design Context

This TASK realizes REQ-002-SPEC-007 and the plan-note.ts schema from ANALYSIS-002 Appendix C.

## Objective

Create `_shared/composition/src/schemas/plan-note.ts` with PlanFrontmatterSchema, ObjectiveSchema, DodItemSchema, DecisionStateSchema, PartSchema (with DONE-must-have-outcome refine), TaskSchema (with DONE-must-have-resolved-event refine), PendingDecisionSchema, EditorMirrorEntrySchema, and PlanNoteSchema with superRefine cross-field invariants.

## Scope

**In Scope**:

- All sub-schemas importing from common.ts
- PartSchema refine: DONE part must have outcome
- TaskSchema refine: DONE task must reference resolving event
- PlanNoteSchema superRefine: task.part valid, part.depends_on valid, all-terminal consistency
- Strict objects, default empty arrays for tasks/pending_decisions/editor_mirror/blockers

**Out of Scope**:

- SessionNote schema (TASK-003)
- Parser implementation

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/schemas/plan-note.ts` | NEW | PlanNote Zod schema |

## Testing Requirements

- Valid plan model passes PlanNoteSchema.parse()
- DONE part without outcome fails
- Task referencing unknown part fails
- All-terminal parts with IN_PROGRESS status fails
- DONE task without resolved_at_event fails
- Empty tasks/pending_decisions default correctly

## Definition of Done

- [ ] PlanFrontmatterSchema validates title regex, type literal, status, complexity_tier, branches, permalink, tags
- [ ] PartSchema.refine enforces DONE-must-have-outcome
- [ ] TaskSchema.refine enforces DONE-must-have-resolved-event
- [ ] PlanNoteSchema.superRefine enforces 3 cross-field invariants
- [ ] All sub-schemas use .strict()
- [ ] Unit tests cover all validation rules including edge cases
- [ ] biome lint + tsc --noEmit pass

## ADR Compliance

- [ ] Honors ADR-003 D-4: 10 schema design decisions baked in
- [ ] Honors ADR-003 D-2: no decision_log or progress_log arrays (responsibility split enforcement)
- [ ] Honors ADR-003 D-6: consolidated tasks schema with Part column

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1.5d | Complex cross-field invariants require careful testing |
| AI-Dominant | 1d | Draft exists; superRefine logic needs careful implementation |
| AI-Assisted | 1d | Draft available from ANALYSIS-002 |

## Observations

- [task] PlanNote schema is the most complex schema with 5 cross-field invariants across 8 sub-schemas #complexity #validation
- [constraint] No decision_log or progress_log arrays; absence is the enforcement mechanism for D-2 responsibility split #absence-enforcement
- [technique] superRefine provides cross-field validation that individual field validators cannot express #cross-field #zod

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[REQ-002-SPEC-007: PlanNote Zod Schema]]
- depends_on [[TASK-001-SPEC-007: Implement Common Schema Module]]
- validated_by [[QA-011-SPEC-007: Implement PlanNote Zod Schema]]
