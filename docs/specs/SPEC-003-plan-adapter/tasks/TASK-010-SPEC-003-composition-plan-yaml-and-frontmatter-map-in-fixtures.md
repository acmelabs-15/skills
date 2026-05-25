---
title: 'TASK-010-SPEC-003: Composition Plan YAML and Frontmatter Map in Fixtures'
type: task
permalink: specs/spec-003-plan-adapter/tasks/task-010-spec-003-composition-plan-yaml-and-frontmatter-map-in-fixtures
status: DONE
effort: XS
estimate: 0.25d
tags:
- task
- spec-003
- gap-task
- fixtures
---

# TASK-010-SPEC-003: Composition Plan YAML and Frontmatter Map in Fixtures

## Design Context

Gap-TASK surfaced during SPEC-003 Wave 2 retro-validation (QA-013-SPEC-003 and QA-014-SPEC-003). TASK-004 DoD-3 calls for `plan-composition.plan.yaml` which is absent; DoD-5 and DoD-6 call for frontmatter_map (with title plus permalink plus branches[]) in fixtures which is absent. The round-trip test (TASK-005) consequently cannot exercise REQ-005 AC-3 frontmatter coverage.

## Objective

Add the missing composition-side plan YAML fixture and add frontmatter_map entries to both distribution and composition fixtures so the round-trip test can validate AC-3.

## Scope

In Scope: create `tests/fixtures/plan-composition.plan.yaml` modelled inverse of plan-distribution.plan.yaml; add frontmatter_map to both fixture plans with at least title plus permalink plus branches[] mutations; validate both fixtures parse via planDistributionPlanSchema and planCompositionPlanSchema.
Out of Scope: changing the round-trip test to load YAML (still inline MutationSpec); frontmatter inverse semantic fix (TASK-009 prerequisite); integrity floor (TASK-008).

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| shared/composition/tests/fixtures/plan-composition.plan.yaml | NEW | Composition-side plan YAML |
| shared/composition/tests/fixtures/plan-distribution.plan.yaml | MODIFY | Add frontmatter_map with title plus permalink plus branches |
| shared/composition/tests/plan-integrity-floor.test.ts | MODIFY | Add tests asserting both fixture YAMLs parse |

## Definition of Done

- [ ] tests/fixtures/plan-composition.plan.yaml exists
- [x] plan-composition.plan.yaml parses via planCompositionPlanSchema.safeParse with success: true
- [ ] plan-distribution.plan.yaml includes mutations.frontmatter_map with title plus permalink plus branches keys
- [x] plan-distribution.plan.yaml parses via planDistributionPlanSchema.safeParse with success: true
- [ ] Round-trip semantics preserved: distribution renumber_map values equal composition renumber_map keys (inverse)
- [x] Test asserts both fixtures parse

## ADR Compliance

- [ ] Honors ADR-002 D-1: plan YAML schema shape exercised by valid fixtures

## Observations

- [problem] tests/fixtures/plan-composition.plan.yaml does not exist; TASK-004 DoD-3 unsatisfied #missing-fixture
- [problem] No frontmatter_map in any fixture; TASK-004 DoD-5 and DoD-6 unsatisfied; REQ-005 AC-3 cannot be tested without it #frontmatter-coverage-gap
- [decision] Keep round-trip test inline MutationSpec; YAMLs exist as schema-conformant documentation #scope-limit

## Relations

- part_of [[SPEC-003: PLAN Adapter]]
- caused_by [[QA-013-SPEC-003: PLAN Adapter Test Fixtures]]
- caused_by [[QA-014-SPEC-003: PLAN Adapter Round-Trip Property Test]]
- extends [[TASK-004-SPEC-003: Create PLAN Adapter Test Fixtures]]
- implements [[REQ-005-SPEC-003: PLAN Adapter Round-Trip Property Test]]

- validated_by [[QA-031-SPEC-003: TASK-010 Fix Iter-1 Revalidation]]
