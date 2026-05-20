---
title: 'TASK-002-SPEC-003: Implement Regenerated Sections Handler and Integrity Floor'
type: task
status: TODO
effort: M
estimate: 1d
permalink: specs/spec-003-plan-adapter/tasks/task-002-spec-003-implement-regen-sections-and-integrity-floor
tags:
- task
- spec-003
- regenerated-sections
- integrity-floor
---

# TASK-002-SPEC-003: Implement Regenerated Sections Handler and Integrity Floor

## Design Context

This TASK realizes DESIGN-002-SPEC-003 "Component 2: Regenerative Section Handler" and "Component 3: Runtime 50% Line-Count Validator" plus the PLAN-specific Zod schema extension with regenerated_sections.

## Objective

Implement the regenerated sections handling within the PlanAdapter: section identification by heading text match, line range computation, content stripping for hash comparison, and the 50% integrity floor validator (both Zod schema-level max 10 guard and runtime line-count check). Also implement the PLAN-specific Zod plan schemas (distribution + composition variants) with regenerated_sections field.

## Scope

**In Scope**: Regenerative section identification and stripping logic in plan.ts, Zod schema files at schemas/distribution/plan.plan.schema.ts and schemas/composition/plan.plan.schema.ts, regeneratedSectionsFloor Zod refinement (max 10 entries), runtime validateIntegrityFloor function, schema index.ts extension to include PLAN variants, unit tests
**Out of Scope**: PLAN adapter base methods (TASK-001), frontmatter mutations (TASK-003), test fixtures (TASK-004), round-trip test (TASK-005)

## Implementation Notes

The regenerative section handler is internal to plan.ts (not exported). It scans content for H2/H3 headings matching regenerated_sections entries and computes the line range from each heading to the next heading of equal or higher level. The stripRegenerativeSections function removes those line ranges from content for hash comparison.

The Zod schema adds regenerated_sections to the PLAN variant's MutationSpec. The schema-level guard limits the array to 10 entries. The runtime validator (validateIntegrityFloor) checks actual line coverage against the loaded source file and rejects plans where regen sections cover more than 50% of total lines.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| _shared/composition/src/adapters/plan.ts | MODIFY | Add regenerative section handler functions |
| _shared/composition/schemas/distribution/plan.plan.schema.ts | NEW | PLAN distribution Zod schema |
| _shared/composition/schemas/composition/plan.plan.schema.ts | NEW | PLAN composition Zod schema |
| _shared/composition/schemas/index.ts | MODIFY | Add PLAN variants to discriminated union |
| _shared/composition/src/core/validate.ts | MODIFY | Add validateIntegrityFloor function |
| _shared/composition/tests/plan-regen-sections.test.ts | NEW | Regen sections and integrity floor tests |

## Testing Requirements

- identifyRegenerativeSections correctly finds sections by heading text match
- stripRegenerativeSections removes correct line ranges
- Zod schema rejects regenerated_sections with >10 entries
- Runtime validator rejects >50% line coverage
- Runtime validator accepts exactly 50% line coverage
- Empty or undefined regenerated_sections results in full hash validation

## Definition of Done

- [ ] identifyRegenerativeSections function identifies sections by heading text match
- [ ] stripRegenerativeSections removes identified section line ranges from content
- [ ] PLAN distribution Zod schema validates regenerated_sections field
- [ ] PLAN composition Zod schema validates regenerated_sections field
- [ ] Schema index.ts includes PLAN variants in discriminated union
- [ ] Zod schema rejects regenerated_sections arrays with >10 entries
- [ ] validateIntegrityFloor rejects plans where regen sections cover >50% of lines
- [ ] Unit tests pass for all regen section and integrity floor scenarios

## ADR Compliance

- [ ] Honors ADR-002 D-2: MutationSpec regenerated_sections field
- [ ] Honors ADR-002 D-4: PLAN extraction strategy -- regenerative sections excluded
- [ ] Honors ADR-002 D-5: Regenerated-sections integrity floor (50%)

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1.5d | Regen section logic + Zod schema + runtime validator |
| AI-Dominant | 1d | Well-specified behavior from ADR-002 |
| AI-Assisted | 1d | Schema patterns established in SPEC-001 |

## Observations

- [requirement] Regenerated sections handler enables declarative exclusion of derived-view content from hash validation #regenerated-sections #handler
- [technique] Section identification by exact heading text match with line range spanning to next equal-or-higher-level heading #heading-match #line-range
- [constraint] Two-layer enforcement: Zod max 10 entries plus runtime 50% line-count check #defense-in-depth #integrity

## Relations

- part_of [[SPEC-003: PLAN Adapter]]
- implements [[REQ-002-SPEC-003: Regenerated Sections Field Handling]]
- implements [[REQ-003-SPEC-003: Fifty Percent Integrity Floor on Regenerated Sections]]
- implements [[DESIGN-002-SPEC-003: Regenerated Sections Mechanism]]
- depends_on [[TASK-001-SPEC-003: Implement PLAN Adapter Base]]
- depends_on [[TASK-005-SPEC-001: Implement Zod Plan Schemas]]