---
title: 'TASK-008-SPEC-003: Source-Coverage Integrity Floor and Max-10 Schema Guard'
type: task
permalink: specs/spec-003-plan-adapter/tasks/task-008-spec-003-source-coverage-integrity-floor-and-max-10-schema-guard
status: DRAFT
effort: S
estimate: 0.5d
tags:
- task
- spec-003
- gap-task
- integrity-floor
---

# TASK-008-SPEC-003: Source-Coverage Integrity Floor and Max-10 Schema Guard

## Design Context

Gap-TASK surfaced during SPEC-003 Wave 2 retro-validation (QA-011-SPEC-003). REQ-003-SPEC-003 mandates a 50% integrity floor measured as "regenerated_sections cover ≤50% of source content lines." Current `enforceIntegrityFloor` measures preservation ratio of recovered vs input, not section coverage. DESIGN-002 Component 2 also mandates a schema-level max-10 refinement which is absent. Both layers are missing.

## Objective

Add the source-coverage-ratio validator `validateIntegrityFloor(sourceContent, regeneratedSections)` per DESIGN-002 Component 3; add the schema-level `regeneratedSectionsFloor = z.array(z.string()).refine(s => s.length <= 10)` per DESIGN-002 Component 2; extend `findRegeneratedSpans` to match H2 OR H3 headings per REQ-002. Preserve the existing `enforceIntegrityFloor` as a separate safety net (different layer).

## Scope

In Scope: new `src/core/validate.ts` (or extension to validators.ts) with validateIntegrityFloor function returning {valid, coveragePercent, message}; update regenerated_sections schema in `schemas/base.ts` (or per-variant schemas) with max-10 refinement; widen findRegeneratedSpans regex to match `^(##|###)[ \t]+`; add unit tests covering 51% rejection 50% acceptance 10% acceptance.
Out of Scope: changes to preservation-ratio enforceIntegrityFloor (orthogonal safety net); dispatcher registration; frontmatter; fixtures.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| _shared/composition/src/core/validate.ts | NEW | validateIntegrityFloor function |
| _shared/composition/schemas/base.ts | MODIFY | Add regeneratedSectionsFloor refinement on mutationSpecSchema |
| _shared/composition/src/adapters/plan.ts | MODIFY | findRegeneratedSpans matches H2 and H3 |
| _shared/composition/tests/plan-integrity-floor.test.ts | MODIFY | Add coverage tests for 51% reject 50% accept |

## Definition of Done

- [x] src/core/validate.ts exports validateIntegrityFloor(sourceContent, sections) returning {valid, coveragePercent, message}
- [x] validateIntegrityFloor rejects plans where regen sections cover greater-than 50% of total source lines
- [x] validateIntegrityFloor accepts plans where regen sections cover exactly 50% of total source lines
- [x] validateIntegrityFloor accepts plans where regen sections cover less than 50% of total source lines
- [x] Zod schema rejects regenerated_sections arrays with greater-than 10 entries
- [x] findRegeneratedSpans regex matches H2 (##) and H3 (###) headings
- [x] Unit test: H3 regen section "### Progress Dashboard" correctly identified and stripped
- [x] All existing tests in plan-integrity-floor.test.ts and plan-round-trip.test.ts still pass


## ADR Compliance

- [x] Honors ADR-002 D-5: regenerated-sections integrity floor as Zod refinement plus runtime line-count check
- [x] Honors ADR-001 F-8: hash validation integrity preserved against bulk-bypass


## Observations

- [problem] enforceIntegrityFloor measures preservation ratio of recovered vs input; spec requires section coverage ratio against source #wrong-semantics
- [problem] No max-10 refinement on regenerated_sections schema field #defense-in-depth-missing
- [problem] findRegeneratedSpans regex `^##[ t]+` does not match H3 #heading-level-coverage
- [decision] Keep existing enforceIntegrityFloor as additional safety net rather than replacing it; spec calls for both layers but at different concerns #defense-in-depth

## Relations

- part_of [[SPEC-003: PLAN Adapter]]
- caused_by [[QA-011-SPEC-003: Regen Sections and Integrity Floor]]
- extends [[TASK-002-SPEC-003: Implement Regenerated Sections Handler and Integrity Floor]]
- implements [[REQ-002-SPEC-003: Regenerated Sections Field Handling]]
- implements [[REQ-003-SPEC-003: Fifty Percent Integrity Floor on Regenerated Sections]]
- implements [[DESIGN-002-SPEC-003: Regenerated Sections Mechanism]]