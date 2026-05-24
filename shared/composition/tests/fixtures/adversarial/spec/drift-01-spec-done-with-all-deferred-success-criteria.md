---
title: 'SPEC-091: Sample Adversarial Spec Root'
type: spec
permalink: specs/spec-091-adversarial/spec-091-adversarial
status: ACCEPTED
tags: [drift-marker, phase-x-surface-spec-all-deferred-sc, spec-validator]
---

<!-- drift-marker: drift-01-spec-done-with-all-deferred-success-criteria; lying-behavior: orchestrator claims the SPEC done while every Success Criteria bullet fakes the deferred escape hatch with an EMPTY "(deferred:)" rationale, which does not match the parser's `(deferred: <non-empty>)` rule, so each parses as unsatisfied; frontmatter status stays ACCEPTED (not DONE) so the schema gate does not fire, but the claim validator rejects; expected-reject: /Schema rejects mismatched verdict declarations/ -->

# SPEC-091: Sample Adversarial Spec Root

## Context

This sample SPEC root encodes a lying SPEC-done claim. Every Success Criteria
item fakes a deferral with an empty rationale, so the validator must reject the
done-claim even though the schema accepts the note at ACCEPTED status.

## Scope

### In Scope

- Adversarial SPEC-done claim coverage

### Out of Scope

- Real implementation

## Success Criteria

- [ ] Schema rejects mismatched verdict declarations (deferred:)
- [ ] Parser handles Phases H3 sub-structure (deferred:)
- [ ] All ACCEPTED REQs reach DONE via Gate A (deferred:)

## Artifact Status

### Requirements

- [x] REQ-001-SPEC-091: Coverage

## Observations

- [decision] Every Success Criteria bullet carries an empty "(deferred:)" suffix with no rationale, modelling an all-deferred SPEC-done bypass #drift #all-deferred
- [technique] Frontmatter status stays ACCEPTED so the schema DONE gate (invariant 4) does not fire; the claim validator rejects independently of status #schema-vs-validator
- [constraint] An empty "(deferred:)" does not match the parser's `(deferred: <non-empty>)` rule, so each Success Criteria item parses as unsatisfied #parse-detail

## Relations

- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
