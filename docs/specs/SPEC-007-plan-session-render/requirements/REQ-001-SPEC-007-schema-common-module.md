---
title: 'REQ-001-SPEC-007: Schema Common Module'
type: requirement
permalink: specs/spec-007-plan-session-render/requirements/req-001-spec-007-schema-common-module
status: ACCEPTED
tags:
- requirement
- spec-007
- schema
- common
---

# REQ-001-SPEC-007: Schema Common Module

## Requirement Statement

WHEN the plan-note or session-note schema imports shared type definitions
THE SYSTEM SHALL provide a common.ts module at `_shared/composition/src/schemas/common.ts` exporting shared enums (PartSubstatusEnum, TaskStatusEnum, PlanStatusEnum, SessionStatusEnum, DecisionStatusEnum, EffortEnum, ComplexityTierEnum, PhaseEnum, ObservationCategoryEnum, RelationVerbEnum), shared ID schemas (EntityIdSchema, PartIdSchema, TaskIdSchema, DecisionIdSchema, EventNumberSchema, SessionIdSchema), and shared structural schemas (WikilinkSchema, OutcomeSchema, ObservationSchema, RelationSchema)
SO THAT plan-note.ts and session-note.ts import from a single source of truth with zero duplication, and ADR-002's composition schemas can share the same common types.

## Pattern

Shared Module (always available; imported by plan-note.ts, session-note.ts, and ADR-002 composition schemas).

## Priority

P0 -- foundational; all other schema REQs depend on common types existing.

## Category

Functional

## Context

ADR-003 D-4 specifies three schema files: common.ts, plan-note.ts, session-note.ts. ADR-003 Implementation Notes detail common.ts as shared with ADR-002's composition schemas (per CRIT-003 F-1 resolution). ANALYSIS-002 Appendix C provides the full Zod schema draft for common.ts. The module defines 8 status/enum schemas, 6 ID regex schemas, and 4 structural schemas (WikilinkSchema, OutcomeSchema, ObservationSchema, RelationSchema).

## Acceptance Criteria

- [ ] GIVEN a TypeScript file at `_shared/composition/src/schemas/common.ts`
      WHEN compiled with tsc strict mode
      THEN all 8 enum schemas, 6 ID schemas, and 4 structural schemas export without errors

- [ ] GIVEN EntityIdSchema
      WHEN validated against a string matching any of the 16 canonical entity prefixes followed by a 3+ digit number
      THEN validation passes

- [ ] GIVEN PartIdSchema
      WHEN validated against strings like "research", "decisions.1", "spec.SPEC-001", "build.SPEC-003", "review", "end"
      THEN validation passes for all valid forms and rejects malformed part IDs

- [ ] GIVEN ObservationSchema
      WHEN validated against an object with category from the 10 valid categories, non-empty text, and 1-3 lowercase hyphenated tags
      THEN validation passes; objects with invalid category or 0 tags or 4+ tags are rejected

- [ ] GIVEN RelationSchema
      WHEN validated against an object with verb from the 16 valid relation verbs and non-empty target
      THEN validation passes; objects with invalid verb like "reviews" or "derives_from" are rejected

- [ ] GIVEN plan-note.ts and session-note.ts both import from common.ts
      WHEN compiled together
      THEN no duplicate type definitions exist across the three files

- [ ] GIVEN ADR-002 composition schemas import from common.ts
      WHEN both schema sets are compiled together
      THEN shared types resolve to the same definitions with no version skew

## Implementation Notes

The full Zod schema draft is in ANALYSIS-002 Appendix C. Key decisions baked in: strict objects throughout (.strict()), OutcomeSchema as discriminated union on kind (file vs wikilink), ObservationCategoryEnum covering 10 valid categories per CONVENTIONS Section 4.2, RelationVerbEnum covering 16 valid verbs (11 directional pairs + relates_to) per CONVENTIONS Section 4.4.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/schemas/common.ts` | NEW | Shared enums, IDs, structural schemas |

## Observations

- [requirement] Common schema module is the DRY foundation for both plan-note and session-note schemas, plus ADR-002 composition schemas #schema #single-source
- [constraint] 16 valid relation verbs enforced; forbidden verbs (reviews, derives_from, critiques, records_completion_of, references) rejected at schema level #validation #conventions
- [decision] Shared with ADR-002 per CRIT-003 F-1 resolution to avoid duplicate schema definitions for overlapping types #sharing #adr-002

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
