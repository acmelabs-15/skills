---
title: "SPEC-201: Drifted Cross-Note Fixture"
type: spec
permalink: specs/spec-201-drifted-cross-note/spec-201-drifted-cross-note
status: ACCEPTED
tags:
  - spec
  - integration-fixture
  - drifted-pair
---

# SPEC-201: Drifted Cross-Note Fixture

## Context

Drifted SPEC root fixture paired with TASK-001-SPEC-201. The SPEC's
artifact_status row for that TASK is [ ] (unchecked) BUT the child
TASK's frontmatter status is DONE — a rollup drift. The cross-note
consistency test MUST detect this and report FAIL.

SPEC status is ACCEPTED (not DONE) so the SpecRootNoteSchema does not
itself reject the unchecked artifact_status row at parse time; the
schema's DONE-gate only fires when status === DONE. This lets us
construct the drifted pair without triggering schema rejection.

## Scope

### In Scope

- Drive cross-note SPEC-vs-TASK consistency assertion to FAIL

### Out of Scope

- Renderer round-trip behavior

## Artifact Status

### Tasks

- [ ] TASK-001-SPEC-201: Drifted Task

## Observations

- [decision] Drifted fixture for SPEC-vs-TASK FAIL path #fixture #integration
- [fact] SPEC row [ ] but child TASK DONE #drift
- [constraint] SPEC status ACCEPTED keeps schema-DONE-gate dormant #invariant

## Relations

- contains [[TASK-001-SPEC-201: Drifted Task]]
- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
