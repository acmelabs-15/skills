---
title: "TASK-001-SPEC-201: Drifted Task"
type: task
permalink: specs/spec-201-drifted-cross-note/tasks/task-001-spec-201-drifted-task
status: DONE
effort: S
tags:
  - task
  - integration-fixture
  - drifted-pair
---

# TASK-001-SPEC-201: Drifted Task

## Objective

Drifted TASK paired with SPEC-201. Status DONE with every DoD item
checked — schema-internally valid — but the parent SPEC's
artifact_status row remains [ ]. Cross-note consistency must FAIL.

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

- Cross-note consistency FAIL path exercised

## Definition of Done

- [x] First DoD item complete
- [x] Second DoD item complete

## Observations

- [outcome] All DoD items checked; status DONE permitted at TASK layer #aligned
- [decision] Schema-valid TASK in isolation; the drift is cross-note only #fixture
- [fact] Paired with SPEC-201 artifact_status row [ ] #drift

## Relations

- part_of [[SPEC-201: Drifted Cross-Note Fixture]]
- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
