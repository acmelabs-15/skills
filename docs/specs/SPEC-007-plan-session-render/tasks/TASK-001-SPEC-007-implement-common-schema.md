---
title: 'TASK-001-SPEC-007: Implement Common Schema Module'
type: task
permalink: specs/spec-007-plan-session-render/tasks/task-001-spec-007-implement-common-schema
status: DONE
effort: S
estimate: 0.5d
tags:
- task
- spec-007
- schema
- common
---

# TASK-001-SPEC-007: Implement Common Schema Module

## Design Context

This TASK realizes REQ-001-SPEC-007 and the common.ts schema from ANALYSIS-002 Appendix C.

## Objective

Create `shared/composition/src/schemas/common.ts` with all shared Zod schemas: 8 enum schemas (PartSubstatusEnum, TaskStatusEnum, PlanStatusEnum, SessionStatusEnum, DecisionStatusEnum, EffortEnum, ComplexityTierEnum, PhaseEnum), ObservationCategoryEnum, RelationVerbEnum, 6 ID regex schemas (EntityIdSchema, PartIdSchema, TaskIdSchema, DecisionIdSchema, EventNumberSchema, SessionIdSchema), and 4 structural schemas (WikilinkSchema, OutcomeSchema, ObservationSchema, RelationSchema).

## Scope

**In Scope**:

- All enum schemas with values matching CONVENTIONS and ADR-003 D-4
- All ID regex schemas with patterns from ANALYSIS-002 Appendix C
- WikilinkSchema, OutcomeSchema (discriminated union on kind), ObservationSchema, RelationSchema
- Strict objects throughout (.strict())
- TypeScript type exports via z.infer

**Out of Scope**:

- PlanNote and SessionNote schemas (TASK-002, TASK-003)
- Parser or renderer code

## Implementation Notes

Full Zod schema draft in ANALYSIS-002 Appendix C common.ts section. ObservationCategoryEnum has 10 valid categories. RelationVerbEnum has 16 valid verbs (11 directional pairs plus relates_to). OutcomeSchema uses z.discriminatedUnion on kind field.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/src/schemas/common.ts` | NEW | Shared Zod schemas |

## Testing Requirements

- All enum schemas accept valid values and reject invalid values
- ID regex schemas match expected patterns and reject malformed IDs
- ObservationSchema enforces 1-3 tags with lowercase-hyphenated format
- RelationSchema rejects forbidden verbs (reviews, derives_from, etc.)
- tsc --noEmit passes

## Definition of Done

- [ ] All 8 status/enum schemas exported and passing validation tests
- [ ] All 6 ID regex schemas exported and passing pattern tests
- [ ] WikilinkSchema, OutcomeSchema, ObservationSchema, RelationSchema exported
- [ ] .strict() applied to all object schemas
- [ ] TypeScript types exported via z.infer for each schema
- [ ] biome lint passes
- [ ] tsc --noEmit passes

## ADR Compliance

- [ ] Honors ADR-003 D-4: Zod schema as validation contract
- [ ] Honors ADR-001 D-1: Zod for plan validation
- [ ] Honors CRIT-003 F-1: common.ts shared with ADR-002 composition schemas

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.5d | Schema definitions from ANALYSIS-002 draft |
| AI-Dominant | 0.5d | Straightforward Zod schema authoring |
| AI-Assisted | 0.5d | Draft exists; translate to code |

## Observations

- [task] Common schema module is the first implementation task; all other schema/parser/renderer tasks depend on it #foundation #dependency
- [technique] Schema draft from ANALYSIS-002 Appendix C minimizes design decisions during implementation #draft-available #efficiency
- [constraint] Must be importable by both ADR-003 note schemas and ADR-002 composition schemas #shared #compatibility

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[REQ-001-SPEC-007: Schema Common Module]]
- implements [[DESIGN-001-SPEC-007: Composition Layer Architecture]]
- validated_by [[QA-010-SPEC-007: Implement Common Schema Module]]
