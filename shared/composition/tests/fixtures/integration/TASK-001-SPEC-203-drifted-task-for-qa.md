---
title: "TASK-001-SPEC-203: Drifted Task for QA"
type: task
permalink: specs/spec-203-test-report-drifted/tasks/task-001-spec-203-drifted-task-for-qa
status: IN_PROGRESS
effort: S
tags:
  - task
  - integration-fixture
  - drifted-pair
---

# TASK-001-SPEC-203: Drifted Task for QA

## Objective

Drifted TASK paired with QA-001-SPEC-203. One DoD item remains [ ]
while the QA report declares verdict PASS. Status IN_PROGRESS keeps
the TASK schema-internally valid; the drift is cross-note only.

## Scope

**In Scope**:

- Inline test fixture content

**Out of Scope**:

- Real implementation behavior

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `fixture.ts` | NEW | inline test fixture only |

## Testing Requirements

- TEST-REPORT-vs-TASK FAIL path exercised

## Definition of Done

- [x] First DoD item complete
- [ ] Second DoD item still pending

## Observations

- [outcome] One DoD item still [ ] but QA verdict PASS #drift
- [decision] Status IN_PROGRESS keeps schema-DONE-gate dormant #invariant
- [fact] Paired with QA-001-SPEC-203 verdict PASS #consistency-drift

## Relations

- part_of [[SPEC-203: TEST-REPORT vs TASK Drifted Fixture]]
- relates_to [[QA-001-SPEC-203: Drifted Test Report]]
