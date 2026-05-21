---
title: 'TEST-REPORT-014-SPEC-003: PLAN Adapter Round-Trip Property Test'
type: test-report
permalink: qa/test-report-014-spec-003-plan-adapter-round-trip-property-test-1
status: DONE
tags:
- test-report
- spec-003
- round-trip
- retro-validation
---

# TEST-REPORT-014-SPEC-003: PLAN Adapter Round-Trip Property Test

## Objective

Retro-validate TASK-005-SPEC-003 (round-trip property test) against REQ-005, TASK-005 DoD, ADR-001 F-8, and ADR-002 D-4.

- **Feature**: PLAN adapter round-trip property test — THE PROOF for the PLAN source_type (TASK-005-SPEC-003)
- **Scope**: `tests/plan-round-trip.test.ts` (7 tests, 16 expects)
- **Acceptance Criteria**: REQ-005 AC-1 to AC-4; TASK-005 DoD 1-5; ADR-001 F-8; ADR-002 D-4

## Approach

- **Test Types**: Retro-Unit, Retro-Property, Code-Inspection
- **Environment**: Local (Bun 1.3.13)
- **Data Strategy**: Loads tests/fixtures/plan-sample.md via Bun.file; inlines MutationSpec in TypeScript
- **Test File**: `tests/plan-round-trip.test.ts`

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 7 | 7 | - |
| Passed | 7 | 7 | [PASS] |
| Failed | 0 | 0 | [FAIL] |
| Skipped | 0 | - | - |
| Assertions | 16 | - | - |
| Execution Time | 58ms | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| precondition parse then serialize idempotent normalized | Retro-Unit | [PASS] | plan-round-trip.test.ts:51-58 |
| applyMutations then reverseMutations is identity excluding regenerated sections | Retro-Property | [PASS] | plan-round-trip.test.ts:60-64 |
| regenerated sections pass through unchanged during applyMutations | Retro-Unit | [PASS] | plan-round-trip.test.ts:66-80 |
| applyMutations rewrites identifiers OUTSIDE regenerated sections | Retro-Unit | [PASS] | plan-round-trip.test.ts:82-91 |
| THE PROOF SHA-256 original stripped equals SHA-256 decompose then recompose stripped | Retro-Property | [PASS] | plan-round-trip.test.ts:93-112 |
| integrity floor at 0.99 raises IntegrityFloorError | Retro-Unit | [PASS] | plan-round-trip.test.ts:114-136 |
| integrity floor at default 0.5 succeeds for standard distribution spec | Retro-Unit | [PASS] | plan-round-trip.test.ts:138-146 |
| REQ-005 AC-1 SHA-256 original non-regenerative equals SHA-256 recomposed non-regenerative | Code-Inspection | [PASS] | THE PROOF test plan-round-trip.test.ts:99,111 |
| REQ-005 AC-2 hash scope excludes lines belonging to regenerated sections on both sides | Code-Inspection | [PASS] | stripSections helper lines 37-48 + line 103-110 |
| REQ-005 AC-3 PLAN fixture with frontmatter_map mutations applied during decompose and reversed during recompose | Code-Inspection | [FAIL] | distributionSpec at line 11-21 has NO frontmatter_map field; AC-3 contract not exercised by any test |
| REQ-005 AC-4 parse-serialize round-trip identity precondition | Code-Inspection | [PASS] | test at line 51-58 |
| TASK-005 DoD 1 parse then serialize char-identical for PLAN fixture | Code-Inspection | [PASS] | precondition test |
| TASK-005 DoD 2 SHA-256 original stripped equals SHA-256 recomposed stripped | Code-Inspection | [PASS] | THE PROOF test |
| TASK-005 DoD 3 regenerated sections correctly excluded from hash scope | Code-Inspection | [PASS] | stripSections invocation |
| TASK-005 DoD 4 frontmatter mutations applied during decompose and reversed during recompose | Code-Inspection | [FAIL] | distributionSpec carries no frontmatter_map; the round-trip cycle never exercises frontmatter mutations |
| TASK-005 DoD 5 test passes via bun test with deterministic fixture inputs | Code-Inspection | [PASS] | 7/7 pass |
| ADR-001 F-8 SHA-256 char-identity hash check is BLOCKING invariant | Code-Inspection | [PASS] | hash.ts via Bun.hash; sha256 imported and asserted |
| ADR-002 D-4 PLAN extraction strategy with regenerative-section carve-out | Code-Inspection | [PASS] | regen spans pass through |
| REQ-005 fixture is plan-distribution-plan.yaml and plan-composition-plan.yaml | Code-Inspection | [PARTIAL] | test inlines MutationSpec in TS at lines 11-21; YAML files declared but not parsed; plan-composition-plan.yaml does not exist (see TEST-REPORT-013) |

## Findings

THE PROOF (the core REQ-005 deliverable) passes: SHA-256(original stripped of regen sections) === SHA-256(recomposed stripped of regen sections). The hash-identity invariant from ADR-001 F-8 is satisfied for the structural/narrative content of the PLAN fixture.

Two gaps:

1. **REQ-005 AC-3 + TASK-005 DoD-4 not exercised**. The `distributionSpec` in plan-round-trip.test.ts (lines 11-21) only contains `renumber_map`, `wikilink_map`, `regenerated_sections` — no `frontmatter_map`. Neither AC-3 ("frontmatter_map mutations are correctly applied and reversed such that the hash comparison passes") nor DoD-4 ("Frontmatter mutations applied during decompose and reversed during recompose") is validated. This compounds the TASK-003 reverse-frontmatter gap: even if the spec semantics were fixed, the round-trip test wouldn't catch a regression.

2. **YAML fixture parsing absent**. Implementation Notes for REQ-005 sketch loading via `loadAndValidatePlan(distributionPlanPath)`. The actual test inlines the MutationSpec. Reasonable engineering decision but means the fixture YAMLs and the round-trip path are decoupled — they could drift apart.

Despite these gaps, the core PROOF passes and the regen-section carve-out is rigorously validated. This is the most important deliverable in SPEC-003.

## Observations

- [outcome] THE PROOF PASSES SHA-256 original stripped equals SHA-256 recomposed stripped on plan-sample.md #proof-passes
- [problem] REQ-005 AC-3 and TASK-005 DoD-4 not validated by any test; frontmatter_map never appears in distributionSpec #frontmatter-coverage-gap
- [problem] Round-trip test inlines MutationSpec in TS; YAML fixtures not loaded; plan-composition.plan.yaml does not exist
- [insight] Test isolates the core PROOF cleanly precondition tests at lines 51-58 then full proof at 93-112
- [fact] 7/7 plan-round-trip tests pass with 16 expect calls #test-results

## Relations

- relates_to [[TASK-005-SPEC-003: Implement PLAN Adapter Round-Trip Property Test]]
- relates_to [[REQ-005-SPEC-003: PLAN Adapter Round-Trip Property Test]]
- part_of [[SPEC-003: PLAN Adapter]]