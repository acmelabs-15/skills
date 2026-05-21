---
title: 'TASK-009-SPEC-001: Implement Round-Trip Property Test and ADR Fixtures'
type: task
permalink: specs/spec-001-composition-core-and-adr-adapter/tasks/task-009-spec-001-implement-round-trip-property-test-and-adr-fixtures
status: DONE
effort: S
estimate: 0.5d
tags:
- task
- spec-001
- round-trip
- testing
---

# TASK-009-SPEC-001: Implement Round-Trip Property Test and ADR Fixtures

## Design Context

This TASK realizes the round-trip property test from KICKOFF-BRIEF.md "Round-trip property test" section, exercising the ADR adapter.

## Objective

Implement the round-trip property test framework at tests/round-trip.test.ts and create ADR test fixtures (realistic ADR sample markdown + fixture distribution and composition plan YAMLs) that prove SHA-256(original) === SHA-256(decompose then recompose(original)) for the ADR adapter.

## Scope

**In Scope**: round-trip.test.ts test framework, tests/fixtures/adr-sample.md realistic fixture, tests/fixtures/adr-distribution.plan.yaml and adr-composition.plan.yaml fixture plans, parse/serialize identity precondition test, applyMutations/reverseMutations inverse precondition test, full decompose-then-recompose round-trip SHA-256 assertion
**Out of Scope**: Non-ADR adapter round-trip tests (SPEC-002 and SPEC-003)

## Implementation Notes

The ADR fixture should be 200-500 lines with multiple D-N sections, wikilinks, YAML frontmatter, code blocks, and markdown edge cases (indented content, bullet lists with inline formatting). The fixture distribution plan should split the ADR into 2+ clusters with non-trivial renumber_map (e.g., D-3 to D-100 to guarantee disjoint domains). The composition plan should merge the clusters back. The test uses bun test per ADR-001 F-6.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| _shared/composition/tests/round-trip.test.ts | NEW | Round-trip property test framework |
| _shared/composition/tests/fixtures/adr-sample.md | NEW | Realistic ADR fixture |
| _shared/composition/tests/fixtures/adr-distribution.plan.yaml | NEW | ADR decompose fixture plan |
| _shared/composition/tests/fixtures/adr-composition.plan.yaml | NEW | ADR recompose fixture plan |

## Testing Requirements

- serialize(parse(fixture)) === fixture (parse/serialize precondition)
- reverseMutations(applyMutations(content, spec), spec) === content (mutation inverse precondition)
- Full round-trip: SHA-256(original) === SHA-256(recomposed) after decompose then recompose
- Fixture plan exercises non-identity renumber (D-3 to D-100 etc.)

## Definition of Done
- [x] round-trip.test.ts implements full decompose-then-recompose cycle with SHA-256 assertion
- [x] ADR fixture is realistic (200+ lines with D-N sections, frontmatter, wikilinks, code blocks)
- [x] Fixture plans exercise non-trivial renumber_map with disjoint key-value domains
- [x] parse/serialize identity precondition test passes
- [x] applyMutations/reverseMutations inverse precondition test passes
- [x] Full round-trip SHA-256 assertion passes (THE PROOF)
- [x] bun test runs all tests successfully
## ADR Compliance
- [x] Honors ADR-001 F-8: SHA-256(original) === SHA-256(recomposed) is the PROOF gate
- [x] Honors ADR-001 F-6: Uses bun test runner
## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Fixture authoring + test logic |
| AI-Dominant | 0.5d | Test framework + fixture generation |
| AI-Assisted | 0.5d | Test framework from spec |

## Observations

- [requirement] Round-trip property test is THE architectural PROOF gate for the entire composition library #proof #round-trip
- [technique] Fixture-based testing with realistic ADR notes exercises real-world markdown edge cases #fixtures #realistic
- [risk] remark-stringify whitespace normalization is the most likely failure mode; test catches it immediately #remark #regression
- [constraint] Fixture plan must use disjoint key-value domains in renumber_map per ADR-002 D-4 #disjointness #fixture

## Relations

- validated_by [[TEST-REPORT-009-SPEC-001: Round-Trip Property Test]]
- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[REQ-008-SPEC-001: Round-Trip Property Test for ADR Adapter]]
- implements [[REQ-003-SPEC-001: SHA-256 Hash Utility]]
- depends_on [[TASK-008-SPEC-001: Implement ADR Adapter]]
- depends_on [[TASK-003-SPEC-001: Implement SHA-256 Hash Utility]]
