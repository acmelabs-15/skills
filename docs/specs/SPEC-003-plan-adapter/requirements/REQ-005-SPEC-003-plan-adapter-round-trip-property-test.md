---
title: 'REQ-005-SPEC-003: PLAN Adapter Round-Trip Property Test'
type: requirement
status: ACCEPTED
permalink: specs/spec-003-plan-adapter/requirements/req-005-spec-003-plan-adapter-round-trip-property-test
tags:
- requirement
- spec-003
- round-trip
- property-test
---

# REQ-005-SPEC-003: PLAN Adapter Round-Trip Property Test

## Requirement Statement

WHEN a PLAN note is processed through the composition library via the PLAN adapter (decompose then recompose using a fixture plan YAML)
THE SYSTEM SHALL produce output where SHA-256(original non-regenerative content) === SHA-256(recomposed non-regenerative content), accounting for regenerated_sections exclusion from the hash scope
SO THAT zero content drift is mathematically proven for the PLAN adapter, extending the PROOF gate established by the ADR adapter in SPEC-001 to the PLAN source type.

## Pattern

State-Driven (property-based test validating the round-trip identity invariant).

## Priority

P0 -- the round-trip property test is the PROOF gate for each adapter type per KICKOFF-BRIEF.md and ADR-001 F-8.

## Category

Functional (Testing)

## Context

KICKOFF-BRIEF.md establishes the round-trip property test as the key architectural validation: for each adapter, SHA-256(original) === SHA-256(recomposed after decompose then recompose). SPEC-001 REQ-008-SPEC-001 implements this for the ADR adapter. This requirement extends the same test to the PLAN adapter with one adaptation: regenerated sections are excluded from the hash scope on both sides.

The PLAN round-trip test uses a fixture PLAN YAML plan (not an LLM-authored plan) to ensure deterministic test behavior. The fixture must exercise the PLAN-specific features: phase+part-id section extraction, regenerated_sections exclusion, and frontmatter_map mutations. The test proves that the PLAN adapter preserves all structural/narrative content char-identically while allowing regenerative sections to be regenerated.

## Acceptance Criteria

- [ ] GIVEN a real-world PLAN note fixture with phase sections, Progress Dashboard, and Mermaid graph
      WHEN the fixture is decomposed via a fixture distribution plan and then recomposed via the inverse composition plan
      THEN SHA-256 of the original non-regenerative content equals SHA-256 of the recomposed non-regenerative content

- [ ] GIVEN a PLAN fixture with regenerated_sections: ["Progress Dashboard", "Cross-Part Dependency Graph"]
      WHEN the round-trip test computes hashes
      THEN the hash scope excludes lines belonging to those sections on both the original and recomposed sides

- [ ] GIVEN a PLAN fixture with frontmatter_map mutations (title, permalink changes)
      WHEN the round-trip test processes the decompose then recompose cycle
      THEN frontmatter mutations are correctly applied and reversed such that the hash comparison passes

- [ ] GIVEN the PLAN adapter parse and serialize methods
      WHEN parse(content) followed by serialize(parse(content)) is called on the PLAN fixture
      THEN the output is character-identical to the input (parse/serialize round-trip identity precondition)

## Implementation Notes

The test fixture is a representative PLAN note placed at _shared/composition/tests/fixtures/plan-sample.md. It must contain realistic content: phase sections (research, decisions, spec, build phases), Progress Dashboard table, Cross-Part Dependency Graph Mermaid block, branches[] frontmatter, and inter-note wikilinks. The fixture plan YAMLs (distribution and composition) live alongside at_shared/composition/tests/fixtures/plan-distribution-plan.yaml and plan-composition-plan.yaml.

## Observations

- [requirement] Round-trip property test extends the SPEC-001 PROOF gate to the PLAN adapter with regenerated_sections exclusion #round-trip #proof
- [technique] Fixture-based test with deterministic plan YAML ensures reproducible test behavior #fixture #deterministic
- [constraint] Hash scope excludes regenerated sections on both original and recomposed sides for fair comparison #hash-scope #regenerative-exclusion
- [insight] Parse/serialize round-trip identity is a precondition that must pass before the full decompose/recompose cycle is tested #precondition #char-identity
- [fact] Accepted: implemented by TASK-004-SPEC-003 + TASK-005-SPEC-003 (DONE), validated by QA-043-SPEC-003 (PASS, 30/30 tests) #provenance #rollup

## Relations

- part_of [[SPEC-003: PLAN Adapter]]
- implements [[ADR-001: Composition Library Architecture]]
- depends_on [[REQ-001-SPEC-003: PLAN Adapter Implementation]]
- depends_on [[REQ-002-SPEC-003: Regenerated Sections Field Handling]]
- relates_to [[REQ-008-SPEC-001: Round-Trip Property Test for ADR Adapter]]
