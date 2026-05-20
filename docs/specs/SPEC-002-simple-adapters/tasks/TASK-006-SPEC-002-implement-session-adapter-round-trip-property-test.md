---
title: 'TASK-006-SPEC-002: Implement SESSION Adapter Round-Trip Property Test'
type: task
status: TODO
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

- [ ] SESSION fixture note at _shared/composition/tests/fixtures/session/ following CONVENTIONS with Event-NN entries
- [ ] SESSION fixture plan YAML (hand-crafted distribution plan with cross_source_updates entries)
- [ ] Round-trip property test: parse fixture, decompose with plan, recompose with inverse plan
- [ ] Assertion: SHA-256(original) === SHA-256(recomposed)
- [ ] Assertion: decompose output includes cross_source_updates array with correct target_note, part_id, field_name, new_value
- [ ] Assertion: recompose reverses cross_source_updates (old_value and new_value swapped)
- [ ] Test passes via bun test
- [ ] Fixture note includes Event-NN entries with zero-padded sequential numbering
- [ ] biome lint passes with no errors

## Scope

**In Scope**:

- _shared/composition/tests/fixtures/session/sample-session.md (Create)
- _shared/composition/tests/fixtures/session/sample-session-plan.yaml (Create)
- _shared/composition/tests/session-round-trip.test.ts (Create)

**Out of Scope**:

- ANALYSIS round-trip test (TASK-005-SPEC-002)
- Full PLAN adapter integration test (deferred to SPEC-003)

## Files Affected

| File | Action | Description |
|------|--------|-------------|
| _shared/composition/tests/fixtures/session/sample-session.md | Create | SESSION fixture note with Event-NN entries |
| _shared/composition/tests/fixtures/session/sample-session-plan.yaml | Create | Hand-crafted distribution plan with cross_source_updates |
| _shared/composition/tests/session-round-trip.test.ts | Create | Round-trip property test for SESSION adapter |

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

- implements [[REQ-005-SPEC-002: Round-Trip Property Tests for ANALYSIS and SESSION]]
- implements [[REQ-002-SPEC-002: SESSION Adapter Implementation]]
- implements [[REQ-003-SPEC-002: SESSION Cross-Source Updates Handling]]
- part_of [[SPEC-002: Simple Adapters]]
- depends_on [[TASK-002-SPEC-002: Implement SESSION Adapter]]
- depends_on [[TASK-003-SPEC-002: Implement SESSION Cross-Source Updates Handler]]
- depends_on [[TASK-004-SPEC-002: Register ANALYSIS and SESSION Adapters in Dispatcher]]
