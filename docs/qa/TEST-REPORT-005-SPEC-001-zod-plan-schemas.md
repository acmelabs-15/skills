---
title: 'TEST-REPORT-005-SPEC-001: Zod Plan Schemas'
type: test-report
permalink: qa/test-report-005-spec-001-zod-plan-schemas-1
status: DONE
tags:
- test-report
- spec-001
- zod
- schemas
---

# TEST-REPORT-005-SPEC-001: Zod Plan Schemas

## Scope

Verification of TASK-005-SPEC-001 (Zod Plan Schemas) implementation. Validates runtime schema definitions for composition plan types using Zod, covering base schemas (lineRangeSchema, renumberMapSchema, wikilinkMapSchema, frontmatterMapSchema, mutationSpecSchema) and composite schemas (distributionPlanSchema, compositionPlanSchema, planSchema).

### Files Under Test

- `_shared/composition/schemas/base.ts` — base schema definitions with injectiveDisjointMap refinement
- `_shared/composition/schemas/index.ts` — composite plan schemas with z.union discriminant
- `_shared/composition/tests/schemas.test.ts` — 8 test cases

## Test Results

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 38 | - | - |
| Schema Tests | 8 | 8 | [PASS] |
| Failed | 0 | 0 | [PASS] |
| Test Files | 6 | - | - |

All 8 schema-specific tests pass. Full suite (38 tests across 6 files) green.

## DoD Criteria Coverage

| Criterion | Test Coverage | Status |
|-----------|--------------|--------|
| lineRangeSchema, mutationSpecSchema, renumberMapSchema, wikilinkMapSchema exported from schemas/base.ts | Import verification + runtime validation | [PASS] |
| planSchema exported from schemas/index.ts | Import verification + parse tests | [PASS] |
| Zod discriminated union by plan_type + source_type | z.union with nested discriminant validated | [PASS] |
| injectiveDisjointMap refinement on renumber_map + wikilink_map | Refinement rejects non-injective maps | [PASS] |
| 8 tests pass | 8/8 green | [PASS] |

## Notable Implementation Details

### z.union vs z.discriminatedUnion

The implementation uses `z.union([distributionPlanSchema, compositionPlanSchema])` instead of `z.discriminatedUnion`. This is a deliberate choice due to a Zod limitation: `z.discriminatedUnion` does not support nested discriminated unions. The outer discriminant is `plan_type` ("distribution" | "composition"), while the inner discriminant on compositionPlanSchema is `source_type` ("adr"). Using z.union works correctly but produces less precise error messages on validation failure.

### satisfies z.ZodType Limitation

lineRangeSchema uses `satisfies z.ZodType<LineRange>` for compile-time type compatibility checking. mutationSpecSchema does NOT use `satisfies` because `exactOptionalPropertyTypes` in tsconfig conflicts with Zod's `optional()` method (Zod produces `T | undefined` which does not satisfy exact optional property types). This is a known Zod ergonomic limitation, not a bug.

## Observations

- [fact] All 8 schema tests pass with 0 failures across the full 38-test suite #test-results #zod
- [decision] z.union used instead of z.discriminatedUnion due to Zod nested discriminant limitation #zod #architecture
- [constraint] mutationSpecSchema cannot use satisfies due to exactOptionalPropertyTypes conflict with Zod optional() #zod #typescript
- [fact] injectiveDisjointMap refinement correctly validates renumber_map and wikilink_map for injectivity and disjointness #validation #schemas
- [outcome] TASK-005-SPEC-001 DoD fully satisfied with all 5 acceptance criteria verified #task-completion

## Relations

- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[TASK-005-SPEC-001: Implement Zod Plan Schemas]]
