---
title: 'REQ-032-SPEC-008: Stop Backstop Observability Contract'
type: requirement
permalink: specs/spec-008-protocol-hardening-wave-2/requirements/req-032-spec-008-stop-backstop
status: PROPOSED
tags: [drift-marker, phase-x-surface-ac-text-only-flip, requirement-validator]
---

<!-- drift-marker: drift-02-ac-text-only-flip; lying-behavior: QA claims the REQ satisfied while two Acceptance Criteria bullets remain unchecked and undeferred — the prose narrative claims completion but the checkboxes contradict it; the validator enumerates each unsatisfied AC; expected-reject: /file-changed observability event/ -->

# REQ-032-SPEC-008: Stop Backstop Observability Contract

## Requirement Statement

WHEN a Stop event fires after a build turn
THE SYSTEM SHALL record a file-changed observability event
SO THAT post-turn drift is detectable without re-reading every file.

## Pattern

Event-Driven Contract.

## Priority

P1 -- backstop for the per-TASK build cycle.

## Acceptance Criteria

- [ ] GIVEN a Stop event WHEN the backstop fires THEN it emits a file-changed observability event
- [x] GIVEN no file changes WHEN the backstop fires THEN it emits an empty changed-set
- [ ] GIVEN a changed file WHEN the event is read THEN the path and mtime are present

## Observations

- [requirement] Two AC bullets stay unchecked with no rationale while the narrative claims completion; the checkboxes contradict the prose, modelling a text-only-flip lie #drift #text-only
- [problem] The QA satisfied-claim is unsubstantiated for the unchecked ACs; the validator returns FAIL enumerating each #unsubstantiated
- [technique] Status PROPOSED keeps the schema satisfied; the validator fires independently of frontmatter status #schema-vs-validator

## Relations

- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- implements [[REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set]]
