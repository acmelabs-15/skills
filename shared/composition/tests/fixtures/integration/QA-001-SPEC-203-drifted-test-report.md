---
title: "QA-001-SPEC-203: Drifted Test Report"
type: qa
permalink: qa/qa-001-spec-203-drifted-test-report
status: DONE
tags:
  - qa
  - integration-fixture
  - drifted-pair
---

# QA-001-SPEC-203: Drifted Test Report

## Objective

Verify TASK-001-SPEC-203 — declares PASS verdict but linked TASK DoD
includes an unchecked item. The QA note itself is schema-valid in
isolation; the drift is cross-note.

- **Feature**: Drifted Fixture Behavior (TASK-001-SPEC-203)
- **Scope**: shared/composition/tests/fixtures/integration/drifted.ts
- **Acceptance Criteria**: TASK-001-SPEC-203 DoD items 1-2

## Approach

- **Test Types**: Unit
- **Environment**: Local (Bun 1.3.13)
- **Data Strategy**: Inline fixtures
- **Test File**: `tests/drifted.test.ts`

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 2 | - | - |
| Passed | 2 | - | [PASS] |
| Failed | 0 | 0 | [PASS] |
| Skipped | 0 | - | - |
| Assertions | 4 | - | - |
| Execution Time | 5ms | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| first dod item satisfied | Unit | [PASS] | drifted-pair fixture |
| second dod item satisfied | Unit | [PASS] | drifted-pair fixture |

## Findings

QA declares PASS but the linked TASK-001-SPEC-203 DoD includes an
unchecked item — drift to be caught by cross-note consistency test.

## Observations

- [outcome] 2/2 tests pass per QA but TASK DoD remains incomplete #test-results #drift
- [decision] Paired with TASK-001-SPEC-203 with one DoD item [ ] #drift
- [fact] Verdict PASS but cross-note state inconsistent #drift

## Relations

- relates_to [[TASK-001-SPEC-203: Drifted Task for QA]]
- part_of [[SPEC-203: TEST-REPORT vs TASK Drifted Fixture]]
