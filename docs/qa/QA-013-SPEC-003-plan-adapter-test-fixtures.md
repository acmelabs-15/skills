---
title: 'QA-013-SPEC-003: PLAN Adapter Test Fixtures'
type: qa
permalink: qa/qa-013-spec-003-plan-adapter-test-fixtures
status: DONE
tags:
- qa
- spec-003
- fixtures
- retro-validation
---

# QA-013-SPEC-003: PLAN Adapter Test Fixtures

## Objective

Retro-validate TASK-004-SPEC-003 fixtures (plan-sample.md, plan-distribution-plan.yaml, plan-composition-plan.yaml) against DoD and REQ-005 fixture preconditions.

- **Feature**: PLAN adapter test fixtures (TASK-004-SPEC-003)
- **Scope**: `tests/fixtures/plan-sample.md`, `tests/fixtures/plan-distribution.plan.yaml`, expected `plan-composition.plan.yaml`
- **Acceptance Criteria**: TASK-004 DoD 1-6; REQ-005 fixture precondition

## Approach

- **Test Types**: Code-Inspection, Schema-Validation
- **Environment**: Local (Bun 1.3.13)
- **Data Strategy**: Direct fixture file inspection plus schema parse against planDistributionPlanSchema/planCompositionPlanSchema
- **Test File**: n/a — fixtures are declarative

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 6 | 6 | - |
| Passed | 4 | - | - |
| Failed | 2 | 0 | [FAIL] |
| Skipped | 0 | - | - |
| Assertions | 6 | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| TASK-004 DoD 1 plan-sample.md contains realistic PLAN note with required structural features | Code-Inspection | [PASS] | tests/fixtures/plan-sample.md has frontmatter+title+H1+Scope+Phase Progression+Progress Dashboard+Cross-Part Dependency Graph+Build Parts+Observations+Relations |
| TASK-004 DoD 2 plan-distribution-plan.yaml passes Zod validation for source_type plan distribution | Schema-Validation | [PARTIAL] | YAML file exists at tests/fixtures/plan-distribution.plan.yaml; never parsed/validated programmatically; header comment states "round-trip test reads mutations directly as TypeScript object, not by parsing this YAML"; manual inspection shows shape matches planDistributionPlanSchema |
| TASK-004 DoD 3 plan-composition-plan.yaml passes Zod validation for source_type plan composition | Schema-Validation | [FAIL] | tests/fixtures/plan-composition.plan.yaml DOES NOT EXIST; only plan-distribution.plan.yaml is present |
| TASK-004 DoD 4 fixtures include regenerated_sections listing Progress Dashboard and Cross-Part Dependency Graph | Code-Inspection | [PASS] | plan-distribution.plan.yaml lines 24-26 |
| TASK-004 DoD 5 fixtures include frontmatter_map with title and permalink mutations | Code-Inspection | [FAIL] | plan-distribution.plan.yaml has no frontmatter_map field; REQ-005 AC-3 requires it for round-trip frontmatter coverage |
| TASK-004 DoD 6 fixtures include branches[] in frontmatter and frontmatter_map | Code-Inspection | [PARTIAL] | branches in plan-sample.md frontmatter (line 5) present; branches NOT referenced in any frontmatter_map (no frontmatter_map at all) |
| REQ-005 precondition fixture PLAN passes parse/serialize round-trip | Code-Inspection | [PASS] | plan-round-trip.test.ts:51-58 confirms |
| REQ-005 fixture has phase sections | Code-Inspection | [PASS] | plan-sample.md lines 50-72 four ### build.SPEC-NNN sections |
| REQ-005 fixture has Mermaid + Progress Dashboard | Code-Inspection | [PASS] | plan-sample.md lines 30-48 |
| REQ-005 fixture has inter-note wikilinks | Code-Inspection | [PASS] | plan-sample.md lines 85-90 |
| ADR-002 D-1 plan YAML schema shape for plan source_type | Code-Inspection | [PASS] | distribution.plan.yaml matches planDistributionPlanSchema |
| ADR-002 D-4 PLAN extraction strategy exercised by fixtures | Code-Inspection | [PASS] | renumber_map exercises SPEC-001..005 across phase sections |

## Findings

Two concrete gaps:

1. **`plan-composition.plan.yaml` missing**. TASK-004 DoD-3 + REQ-005 Implementation Notes both call for a separate composition-side plan YAML at `tests/fixtures/plan-composition.plan.yaml`. Only the distribution-side YAML exists. The round-trip test inlines an inverted MutationSpec instead — works for the unit suite but the fixture deliverable is incomplete.

2. **No `frontmatter_map` in any fixture plan**. TASK-004 DoD-5 + DoD-6 + REQ-005 AC-3 all require the fixture to include `frontmatter_map` mutations (title + permalink + branches[]) so the round-trip property can validate the frontmatter mutation reversal. The fixture omits frontmatter_map entirely. Combined with the TASK-003 frontmatter reverse-gap (QA-012), the round-trip never exercises the frontmatter_map mutation path.

The fixture also notes "the round-trip test reads the mutations directly as a TypeScript object, not by parsing this YAML." This is acceptable for unit-testing convenience but means the YAML serves only as documentation; the actual MutationSpec used in tests is a different value defined in TS. The spec did not strictly require YAML-driven loading but it did require the YAMLs to pass Zod validation — DoD-2 and DoD-3 phrased as "passes Zod validation". The distribution YAML's shape would parse if loaded; the composition YAML cannot parse because it doesn't exist.

## Observations

- [outcome] plan-sample.md fixture is rich and exercises most REQ-005 preconditions
- [problem] tests/fixtures/plan-composition.plan.yaml does not exist; TASK-004 DoD-3 unsatisfied #missing-fixture
- [problem] No frontmatter_map in any fixture; TASK-004 DoD-5/DoD-6 unsatisfied; REQ-005 AC-3 cannot be tested #frontmatter-coverage-gap
- [insight] Round-trip test inlines MutationSpec in TS rather than loading the YAML fixture; YAML is documentation only
- [decision] Implementer chose TS-inline mutations over YAML loading; reduces test coupling but bypasses TASK-004 deliverable

## Relations

- relates_to [[TASK-004-SPEC-003: Create PLAN Adapter Test Fixtures]]
- relates_to [[REQ-005-SPEC-003: PLAN Adapter Round-Trip Property Test]]
- part_of [[SPEC-003: PLAN Adapter]]
