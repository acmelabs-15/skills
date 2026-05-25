---
title: 'SPEC-092: Sample Adversarial Spec Root Artifact'
type: spec
permalink: specs/spec-092-adversarial/spec-092-adversarial
status: ACCEPTED
tags: [drift-marker, phase-x-surface-spec-artifact-unchecked, spec-validator]
---

<!-- drift-marker: drift-02-artifact-status-unchecked; lying-behavior: orchestrator claims the SPEC done with every Success Criteria checked but the Artifact Status rows (the per-artifact completion gate) left unchecked and undeferred; the SpecRoot validator gates DONE on BOTH lists, so it returns FAIL citing the unchecked artifact rows; expected-reject: /DESIGN-001-SPEC-092: Coverage Design/ -->

# SPEC-092: Sample Adversarial Spec Root Artifact

## Context

This sample SPEC root encodes a lying SPEC-done claim where the Success Criteria
are all checked but the Artifact Status rows are left unchecked. The validator
gates the done-claim on both lists, so it must reject.

## Scope

### In Scope

- Adversarial SPEC-done artifact-status coverage

### Out of Scope

- Real implementation

## Success Criteria

- [x] Coverage matrix aggregates per-TASK verdicts
- [x] Drift surfaces are regression-locked

## Artifact Status

### Requirements

- [x] REQ-001-SPEC-092: Coverage Requirement

### Designs

- [ ] DESIGN-001-SPEC-092: Coverage Design

### Tasks

- [ ] TASK-001-SPEC-092: Coverage Task

## Observations

- [decision] Success Criteria are all checked but two Artifact Status rows stay unchecked with no rationale, modelling an artifact-status bypass #drift #artifact-status
- [technique] Frontmatter status stays ACCEPTED so the schema DONE gate does not fire; the validator gates on both lists and rejects independently of status #schema-vs-validator
- [constraint] The SpecRoot validator checks Success Criteria AND Artifact Status; the unchecked Design and Task rows make the done-claim fail #both-lists

## Relations

- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
