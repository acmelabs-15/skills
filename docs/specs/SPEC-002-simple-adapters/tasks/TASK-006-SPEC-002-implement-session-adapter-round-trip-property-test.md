---
title: 'TASK-006-SPEC-002: Implement SESSION Adapter Round-Trip Property Test'
type: task
status: DONE
effort: S
estimate: 1d
permalink: specs/spec-002-simple-adapters/tasks/task-006-spec-002-implement-session-adapter-round-trip-property-test
tags:
- task
- spec-002
- round-trip
- session-adapter
---

# TASK-006-SPEC-002: Implement SESSION Adapter Round-Trip Property Test

## Design Context

- [[DESIGN-001-SPEC-002: BaseMarkdownAdapter Configuration Pattern]]: SessionAdapter config drives the fixture design
- [[DESIGN-002-SPEC-002: SESSION Cross-Source Coordination Protocol]]: cross_source_updates emission verified in test

## Objective

Create the round-trip property test and fixtures for the SESSION adapter. The test proves SHA-256(original) === SHA-256(recomposed) for a representative SESSION fixture note. Additionally, the test verifies that cross_source_updates are correctly emitted during decomposition and correctly reversed during recomposition.

## Definition of Done

- [x] SESSION fixture note at shared/composition/tests/fixtures/session-sample.md following CONVENTIONS with Event-NN entries (flat layout — sanctioned by TASK-010-SPEC-002)
- [x] SESSION fixture plan YAMLs at shared/composition/tests/fixtures/session-{distribution,composition}.plan.yaml (hand-crafted distribution plan with cross_source_updates + inverse composition plan; documentation fixtures — round-trip test reads renumber_map + cross_source_updates as inline TS literal, mirroring the ADR convention)
- [x] Round-trip property test: parse fixture, decompose with plan, recompose with inverse plan
- [x] Assertion: SHA-256(original) === SHA-256(recomposed)
- [x] Assertion: decompose output includes cross_source_updates array with correct target_note, part_id, field_name, new_value
- [x] Assertion: recompose reverses cross_source_updates (old_value and new_value swapped)
- [x] Test passes via bun test
- [x] Fixture note includes Event-NN entries with zero-padded sequential numbering
- [x] biome lint passes with no errors

## Scope

**In Scope**:

- shared/composition/tests/fixtures/session/sample-session.md (Create)
- shared/composition/tests/fixtures/session/sample-session-plan.yaml (Create)
- shared/composition/tests/session-round-trip.test.ts (Create)

**Out of Scope**:

- ANALYSIS round-trip test (TASK-005-SPEC-002)
- Full PLAN adapter integration test (deferred to SPEC-003)

## Files Affected

| File | Action | Description |
|------|--------|-------------|
| shared/composition/tests/fixtures/session/sample-session.md | Create | SESSION fixture note with Event-NN entries |
| shared/composition/tests/fixtures/session/sample-session-plan.yaml | Create | Hand-crafted distribution plan with cross_source_updates |
| shared/composition/tests/session-round-trip.test.ts | Create | Round-trip property test for SESSION adapter |

## Effort

| Tier | Human | AI-Dominant | AI-Assisted |
|------|-------|-------------|-------------|
| S | 2d | 1d | 1.5d |

## Observations

- [fact] Status: TODO #status
- [fact] Size tier: S -- fixture creation + test file with cross_source_updates assertions; slightly more complex than ANALYSIS test #estimation
- [constraint] SHA-256(original) === SHA-256(recomposed) must hold per ADR-001 F-8 #hash-validation
- [decision] Test verifies both round-trip property and cross_source_updates emission/reversal in a single test file #testing #comprehensive

## Relations

- validated_by [[QA-042-SPEC-002: Spec Aggregate Retro-Validation]]
- implements [[REQ-005-SPEC-002: Round-Trip Property Tests for ANALYSIS and SESSION]]
- implements [[REQ-002-SPEC-002: SESSION Adapter Implementation]]
- implements [[REQ-003-SPEC-002: SESSION Cross-Source Updates Handling]]
- part_of [[SPEC-002: Simple Adapters]]
- depends_on [[TASK-002-SPEC-002: Implement SESSION Adapter]]
- depends_on [[TASK-003-SPEC-002: Implement SESSION Cross-Source Updates Handler]]
- depends_on [[TASK-004-SPEC-002: Register ANALYSIS and SESSION Adapters in Dispatcher]]
