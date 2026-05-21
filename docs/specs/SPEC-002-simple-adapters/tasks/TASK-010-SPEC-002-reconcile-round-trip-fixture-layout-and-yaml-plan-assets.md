---
title: 'TASK-010-SPEC-002: Reconcile Round-Trip Fixture Layout and YAML Plan Assets'
type: task
permalink: specs/spec-002-simple-adapters/tasks/task-010-spec-002-reconcile-round-trip-fixture-layout-and-yaml-plan-assets
status: DRAFT
effort: S
estimate: 0.5d
tags:
- task
- spec-002
- gap-task
- fixtures
---

# TASK-010-SPEC-002: Reconcile Round-Trip Fixture Layout and YAML Plan Assets

## Objective

Reconcile fixture-layout and YAML-plan-asset drift across the ANALYSIS and SESSION round-trip property tests, discovered in QA-014 and QA-015.

Gaps:

1. **Fixture path layout**: TASK-005 mandates `tests/fixtures/analysis/sample-analysis.md`; actual is `tests/fixtures/analysis-sample.md` (flat). TASK-006 mandates `tests/fixtures/session/sample-session.md`; actual is `tests/fixtures/session-sample.md` (flat). The flat layout is consistent across all SPEC-002 fixtures.

2. **YAML plan fixtures absent**: TASK-005 prescribes `sample-analysis-plan.yaml`; TASK-006 prescribes `sample-session-plan.yaml`. Neither exists. Both round-trip tests use inline TypeScript `MutationSpec` literals.

## Definition of Done

- [ ] Decision locked: nested-folder layout (move fixtures + add YAMLs) vs flat layout (amend TASK-005, TASK-006 DoDs)
- [ ] Either fixtures moved to `tests/fixtures/{analysis,session}/sample-{analysis,session}.md` and YAML plans created with hand-crafted distribution specs, OR TASK-005 + TASK-006 DoDs amended to match flat layout + inline-TS-literal convention
- [ ] All round-trip tests still pass
- [ ] SPEC-001 fixture layout convention reviewed for consistency (the same drift may be present there)

## Scope

In Scope:
- `_shared/composition/tests/fixtures/{analysis-sample.md,session-sample.md}` (move if nested-path chosen)
- `_shared/composition/tests/{analysis-round-trip,session-round-trip}.test.ts` (modify if YAML loader added)
- TASK-005-SPEC-002, TASK-006-SPEC-002 DoDs (amend if flat-path sanctioned)

Out of Scope:
- Cross-source schema/coordinator gaps (handled by TASK-009)

## Observations

- [fact] Gap discovered by Wave 2 retro-validation; evidence in QA-014 and QA-015 #gap #retro
- [decision] Status: DRAFT pending fixture-layout decision #status
- [insight] All SPEC-002 fixtures use the flat layout; nested-folder layout would be a one-time restructure #scope

## Relations

- caused_by [[QA-014-SPEC-002: Implement ANALYSIS Adapter Round-Trip Property Test]]
- caused_by [[QA-015-SPEC-002: Implement SESSION Adapter Round-Trip Property Test]]
- extends [[TASK-005-SPEC-002: Implement ANALYSIS Adapter Round-Trip Property Test]]
- extends [[TASK-006-SPEC-002: Implement SESSION Adapter Round-Trip Property Test]]
- part_of [[SPEC-002: Simple Adapters]]