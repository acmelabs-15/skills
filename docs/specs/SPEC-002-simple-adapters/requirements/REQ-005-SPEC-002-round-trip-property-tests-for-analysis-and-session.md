---
title: 'REQ-005-SPEC-002: Round-Trip Property Tests for ANALYSIS and SESSION'
type: requirement
status: DRAFT
permalink: specs/spec-002-simple-adapters/requirements/req-005-spec-002-round-trip-property-tests-for-analysis-and-session
tags:
- requirement
- spec-002
- round-trip
- property-test
---

# REQ-005-SPEC-002: Round-Trip Property Tests for ANALYSIS and SESSION

## Requirement Statement

WHEN the test suite runs,
THE SYSTEM SHALL execute round-trip property tests for both ANALYSIS and SESSION adapters proving SHA-256(original) === SHA-256(recomposed) for representative fixture notes of each type,
SO THAT zero-drift is mathematically guaranteed for ANALYSIS and SESSION adapters with the same rigor as the ADR PROOF in SPEC-001.

## EARS Pattern: Ubiquitous

The requirement applies at every test run. These tests are the PROOF gates for the ANALYSIS and SESSION adapters, analogous to REQ-008-SPEC-001 for the ADR adapter.

## Context

ADR-001 F-8 mandates the SHA-256 char-identity hash protocol. The round-trip property test is the definitive validation: parse an original note, generate a distribution plan (fixture in tests), decompose it, then recompose using the inverse plan. The SHA-256 hash of the original must equal the SHA-256 hash of the recomposed output. If this test passes, content drift is mathematically impossible for that adapter.

SPEC-001 REQ-008 established this pattern for the ADR adapter. This requirement extends it to ANALYSIS and SESSION adapters with type-appropriate fixtures.

## Acceptance Criteria

- [ ] GIVEN an ANALYSIS fixture note at _shared/composition/tests/fixtures/analysis/
      WHEN the round-trip property test runs (parse, decompose with fixture plan, recompose with inverse plan)
      THEN SHA-256(original) === SHA-256(recomposed)

- [ ] GIVEN a SESSION fixture note at _shared/composition/tests/fixtures/session/
      WHEN the round-trip property test runs (parse, decompose with fixture plan, recompose with inverse plan)
      THEN SHA-256(original) === SHA-256(recomposed)

- [ ] GIVEN a SESSION fixture note with cross_source_updates in the plan
      WHEN the round-trip property test runs
      THEN cross_source_updates are emitted in the decompose output and correctly reversed in the recompose output

- [ ] GIVEN any adapter's round-trip test failure
      WHEN bun test runs in CI
      THEN the test suite exits with non-zero status, gating the pipeline

## Priority

P0 -- round-trip property tests are the PROOF gate; without them the adapters have no validated zero-drift guarantee.

## Category

Non-Functional (Verification)

## Implementation Notes

Fixtures should represent realistic Brain ANALYSIS and SESSION notes following CONVENTIONS. The ANALYSIS fixture should include H3 findings with item-N identifiers. The SESSION fixture should include Event-NN entries with cross_source_updates. The fixture plan YAMLs are hand-crafted (not LLM-generated) to provide deterministic test inputs. Use bun test as the test runner per ADR-001 F-6.

## Observations

- [requirement] Round-trip property tests for ANALYSIS and SESSION adapters extend the PROOF gate pattern from SPEC-001 REQ-008 #proof #round-trip
- [constraint] SHA-256(original) === SHA-256(recomposed) must hold for both adapter types per ADR-001 F-8 #hash-validation #zero-drift
- [fact] Fixture notes follow CONVENTIONS for realistic test coverage; plan YAMLs are hand-crafted for deterministic testing #fixtures #testing
- [decision] SESSION round-trip test includes cross_source_updates emission and reversal verification #cross-source #testing

## Relations

- part_of [[SPEC-002: Simple Adapters]]
- implements [[ADR-001: Composition Library Architecture]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- depends_on [[REQ-001-SPEC-002: ANALYSIS Adapter Implementation]]
- depends_on [[REQ-002-SPEC-002: SESSION Adapter Implementation]]
- depends_on [[REQ-003-SPEC-002: SESSION Cross-Source Updates Handling]]