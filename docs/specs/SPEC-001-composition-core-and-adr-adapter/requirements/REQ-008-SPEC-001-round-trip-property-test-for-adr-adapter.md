---
title: 'REQ-008-SPEC-001: Round-Trip Property Test for ADR Adapter'
type: requirement
permalink: specs/spec-001-composition-core-and-adr-adapter/requirements/req-008-spec-001-round-trip-property-test-for-adr-adapter
status: ACCEPTED
tags:
- requirement
- spec-001
- round-trip
- proof
---

# REQ-008-SPEC-001: Round-Trip Property Test for ADR Adapter

## Requirement Statement

WHEN the ADR adapter is tested
THE SYSTEM SHALL execute a round-trip property test asserting SHA-256(original) === SHA-256(decompose then recompose(original)) using real ADR fixtures and fixture plan YAMLs
SO THAT content drift is proven mathematically impossible for the ADR adapter, validating the core architecture before other adapters are built.

## Pattern

Ubiquitous (the PROOF gate that validates the entire composition library architecture).

## Priority

P0 — this is THE architectural validation. Failure means the core design is flawed.

## Category

Functional

## Context

KICKOFF-BRIEF.md specifies the round-trip property test as the key architectural validation. For each adapter: read original, generate/use a fixture plan, decompose, recompose with inverse plan, assert SHA-256(original) === SHA-256(recomposed). If this passes, drift is mathematically impossible. The test runs in CI and gates protocol changes. For SPEC-001, this test covers the ADR adapter only. Subsequent SPECs add tests for their adapters.

The test framework uses bun test (ADR-001 F-6). Test fixtures include a real-world ADR sample and a corresponding fixture plan YAML that exercises D-N renumber, wikilink substitution, and multi-destination distribution.

## Acceptance Criteria

- [x] GIVEN a test file at shared/composition/tests/round-trip.test.ts
      WHEN bun test is run
      THEN the round-trip property test executes for the ADR adapter

- [x] GIVEN a real-world ADR fixture at tests/fixtures/adr-sample.md
      WHEN the round-trip test reads it, decomposes via a fixture plan, and recomposes via the inverse plan
      THEN SHA-256(original) === SHA-256(recomposed)

- [x] GIVEN the parse/serialize round-trip precondition
      WHEN serialize(parse(adr-sample.md)) is computed
      THEN the output is character-identical to the input (no whitespace normalization drift)

- [x] GIVEN the applyMutations/reverseMutations inverse precondition
      WHEN reverseMutations(applyMutations(content, spec), spec) is computed
      THEN the output is character-identical to the input

- [x] GIVEN a fixture plan YAML that exercises D-N renumber with disjoint key-value domains
      WHEN the full decompose-then-recompose cycle completes
      THEN every intermediate hash check passes (per-destination S_hash === D'_hash)

- [x] GIVEN a fixture plan YAML with deliberately non-identity renumber (e.g., D-3 to D-100 to D-1)
      WHEN the round-trip completes
      THEN the final recomposed content is char-identical to the original despite identifier renumbering

## Implementation Notes

The test framework is a bun test file that takes an adapter instance, a fixture markdown file, and a fixture plan YAML. It executes the full decompose-then-recompose cycle and asserts char-identity via SHA-256 comparison. The ADR test fixture should be a realistic ADR note (~200-500 lines) with multiple D-N sections, wikilinks, and YAML frontmatter. The fixture plan should exercise at least 2 destination clusters with non-trivial renumber_map entries.

## Observations

- [requirement] Round-trip property test is the PROOF gate: SHA-256(original) === SHA-256(recomposed) makes drift mathematically impossible for the ADR adapter #proof #round-trip
- [constraint] Test must exercise both parse/serialize identity AND applyMutations/reverseMutations identity as preconditions #preconditions #char-identity
- [technique] Fixture-based testing with realistic ADR notes ensures the test exercises real-world edge cases (frontmatter, code blocks, wikilinks) #fixtures #realistic
- [risk] remark-stringify whitespace normalization could break parse/serialize identity; test catches this regression immediately #remark #whitespace

## Relations

- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[ADR-001: Composition Library Architecture]]
- depends_on [[REQ-007-SPEC-001: ADR Adapter Implementation]]
- depends_on [[REQ-003-SPEC-001: SHA-256 Hash Utility]]
