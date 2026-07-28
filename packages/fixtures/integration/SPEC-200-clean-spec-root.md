---
title: "SPEC-200: Clean Cross-Note Fixture"
type: spec
permalink: specs/spec-200-clean-cross-note/spec-200-clean-cross-note
status: DONE
tags:
  - spec
  - integration-fixture
  - clean-pair
---

# SPEC-200: Clean Cross-Note Fixture

## Context

Clean SPEC root fixture paired with TASK-001-SPEC-200. Both the SPEC's
artifact_status row for that TASK and the TASK's status are aligned:
SPEC row is checked AND TASK status is DONE. Cross-note consistency
test must report PASS for this pair.

## Scope

### In Scope

- Drive cross-note SPEC-vs-TASK consistency assertion

### Out of Scope

- Renderer round-trip behavior

## Success Criteria

- [x] Cross-note consistency holds when SPEC row matches TASK status

## Artifact Status

### Tasks

- [x] TASK-001-SPEC-200: Aligned Task

## Observations

- [decision] Clean fixture for SPEC-vs-TASK consistency PASS path #fixture #integration
- [fact] SPEC row checked AND child TASK DONE #aligned
- [constraint] Both gates DONE-aligned so SPEC status DONE permitted #invariant

## Relations

- contains [[TASK-001-SPEC-200: Aligned Task]]
- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
