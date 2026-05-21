---
title: 'TASK-005-SPEC-002: Implement ANALYSIS Adapter Round-Trip Property Test'
type: task
status: TODO
effort: S
estimate: 0.5d
permalink: specs/spec-002-simple-adapters/tasks/task-005-spec-002-implement-analysis-adapter-round-trip-property-test
tags:
- task
- spec-002
- round-trip
- analysis-adapter
---

# TASK-005-SPEC-002: Implement ANALYSIS Adapter Round-Trip Property Test

## Design Context

- [[DESIGN-001-SPEC-002: BaseMarkdownAdapter Configuration Pattern]]: AnalysisAdapter config drives the fixture design

## Objective

Create the round-trip property test and fixtures for the ANALYSIS adapter. The test proves SHA-256(original) === SHA-256(recomposed) for a representative ANALYSIS fixture note. This is the PROOF gate for the ANALYSIS adapter, analogous to SPEC-001 TASK-009 for the ADR adapter.

## Definition of Done

- [ ] ANALYSIS fixture note at _shared/composition/tests/fixtures/analysis/ following CONVENTIONS
- [ ] ANALYSIS fixture plan YAML (hand-crafted distribution plan for the fixture note)
- [ ] Round-trip property test: parse fixture, decompose with plan, recompose with inverse plan
- [ ] Assertion: SHA-256(original) === SHA-256(recomposed)
- [ ] Test passes via bun test
- [ ] Fixture note includes H3 findings with item-N identifiers to exercise identifier_pattern
- [ ] biome lint passes with no errors

## Scope

**In Scope**:

- _shared/composition/tests/fixtures/analysis/sample-analysis.md (Create)
- _shared/composition/tests/fixtures/analysis/sample-analysis-plan.yaml (Create)
- _shared/composition/tests/analysis-round-trip.test.ts (Create)

**Out of Scope**:

- SESSION round-trip test (TASK-006-SPEC-002)
- ANALYSIS adapter implementation (TASK-001-SPEC-002)

## Files Affected

| File | Action | Description |
|------|--------|-------------|
| _shared/composition/tests/fixtures/analysis/sample-analysis.md | Create | ANALYSIS fixture note with H3 findings |
| _shared/composition/tests/fixtures/analysis/sample-analysis-plan.yaml | Create | Hand-crafted distribution plan for ANALYSIS fixture |
| _shared/composition/tests/analysis-round-trip.test.ts | Create | Round-trip property test for ANALYSIS adapter |

## Effort

| Tier | Human | AI-Dominant | AI-Assisted |
|------|-------|-------------|-------------|
| S | 1.5d | 0.5d | 1d |

## Observations

- [fact] Status: TODO #status
- [fact] Size tier: S -- fixture creation + test file; follows established pattern from SPEC-001 TASK-009 #estimation
- [constraint] SHA-256(original) === SHA-256(recomposed) must hold per ADR-001 F-8 #hash-validation
- [decision] Fixture note follows CONVENTIONS with H3 findings and item-N identifiers for realistic coverage #fixtures

## Relations

- implements [[REQ-005-SPEC-002: Round-Trip Property Tests for ANALYSIS and SESSION]]
- implements [[REQ-001-SPEC-002: ANALYSIS Adapter Implementation]]
- part_of [[SPEC-002: Simple Adapters]]
- depends_on [[TASK-001-SPEC-002: Implement ANALYSIS Adapter]]
- depends_on [[TASK-004-SPEC-002: Register ANALYSIS and SESSION Adapters in Dispatcher]]
