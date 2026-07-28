---
title: 'REQ-031-SPEC-008: Coverage Matrix Aggregation Contract'
type: requirement
permalink: specs/spec-008-protocol-hardening-wave-2/requirements/req-031-spec-008-coverage-matrix
status: PROPOSED
tags: [drift-marker, phase-x-surface-ac-flip-no-evidence, requirement-validator]
---

<!-- drift-marker: drift-01-ac-flip-without-evidence; lying-behavior: QA claims the REQ satisfied while an Acceptance Criteria bullet that demands an "**Evidence**:" line is left unchecked with no deferred rationale; the validator returns FAIL on the unsatisfied AC; expected-reject: /Evidence/ -->

# REQ-031-SPEC-008: Coverage Matrix Aggregation Contract

## Requirement Statement

WHEN a spec-level QA sweep aggregates per-TASK verdicts
THE SYSTEM SHALL expose a coverage-matrix aggregator
SO THAT spec completion is provable from per-TASK QA evidence.

## Pattern

Shared Contract (imported by QA aggregation).

## Priority

P1 -- supports the spec-level QA sweep.

## Acceptance Criteria

- [x] GIVEN a set of per-TASK verdicts WHEN aggregated THEN the matrix reports one row per TASK
- [ ] GIVEN an aggregated row WHEN inspected THEN it carries an **Evidence** line citing the QA note
- [x] GIVEN a missing per-TASK verdict WHEN aggregated THEN the row is flagged uncovered

## Observations

- [requirement] The second AC bullet demands an "**Evidence**:" line but is left unchecked with no deferred rationale, modelling an AC-flip-without-evidence lie #drift #ac-flip
- [technique] Status PROPOSED keeps the schema satisfied (the ACCEPTED superRefine does not fire); the claim validator rejects the unsatisfied AC independently of status #schema-vs-validator
- [constraint] The unsatisfied AC names the missing "Evidence line", keeping the lying behavior identifiable from the markdown alone #self-documenting

## Relations

- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- implements [[REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set]]
