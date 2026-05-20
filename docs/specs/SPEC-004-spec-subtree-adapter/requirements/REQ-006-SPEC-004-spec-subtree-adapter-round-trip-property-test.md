---
title: 'REQ-006-SPEC-004: SPEC Subtree Adapter Round-Trip Property Test'
type: requirement
status: DRAFT
permalink: specs/spec-004-spec-subtree-adapter/requirements/req-006-spec-004-spec-subtree-adapter-round-trip-property-test
tags:
- requirement
- spec-004
- round-trip
- property-test
---

# REQ-006-SPEC-004: SPEC Subtree Adapter Round-Trip Property Test

## Requirement Statement

WHEN the round-trip property test executes against the SPEC subtree adapter with a realistic fixture containing a SPEC root + REQ + DESIGN + TASK child files,
THE SYSTEM SHALL verify that decompose(original_subtree, plan) followed by recompose(decomposed_subtree, inverse_plan) produces per-file SHA-256 identity with the original subtree (SHA-256(original_file) === SHA-256(recomposed_file) for every file in the subtree),
SO THAT zero content drift is mathematically proven for the SPEC subtree adapter across the full decompose-recompose cycle.

## Pattern

Ubiquitous (applies to every test run; the round-trip property test is the PROOF gate for the adapter).

## Priority

P0 -- the round-trip property test is the architectural validation gate per KICKOFF-BRIEF.md.

## Category

Non-Functional (Verification)

## Context

KICKOFF-BRIEF.md specifies the round-trip property test as the key architectural validation: "If this passes for every adapter, drift is mathematically impossible." For the SPEC subtree adapter, this test is more complex than single-file adapters because it must verify per-file SHA-256 identity across the entire subtree (root + all children).

The test uses realistic fixtures that include a SPEC root note with frontmatter, Phases section, Acceptance Criteria, and wikilinks to children; plus REQ, DESIGN, and TASK child notes with their own frontmatter, content, observations, and relations sections. The distribution plan (decompose) renames the SPEC from SPEC-001 to SPEC-003, renumbers all child entity identifiers, rewrites filenames, updates frontmatter, and rewrites intra-spec wikilinks. The composition plan (recompose) is the inverse of the distribution plan. After decompose then recompose, every file must be byte-identical to the original.

## Acceptance Criteria

- [ ] Given a fixture SPEC subtree with 1 root + at least 3 children (1 REQ + 1 DESIGN + 1 TASK minimum), when the round-trip test executes decompose then recompose, then SHA-256 of each recomposed file matches SHA-256 of the corresponding original file

- [ ] Given the distribution plan renames SPEC-001 to SPEC-003 with entity renumber, filename rewrite, and frontmatter mutation, when decompose is applied, then all destination files contain correctly renumbered identifiers, updated frontmatter, and rewritten wikilinks

- [ ] Given the composition plan is the mathematical inverse of the distribution plan, when recompose is applied to the decomposed output, then every file is byte-identical to its original source

- [ ] Given a fixture with intra-spec wikilinks (e.g., SPEC root referencing its child REQs and TASKs), when the round-trip completes, then all wikilinks are restored to their original form

- [ ] Given the test runs in CI via bun test, when executed, then the test completes in under 5 seconds for a 5-file fixture subtree

## Implementation Notes

The test fixture lives at _shared/composition/tests/fixtures/ and includes a realistic SPEC subtree directory. The test file lives at _shared/composition/tests/spec-subtree-adapter.test.ts. The test generates the inverse plan programmatically by swapping source/destination paths and inverting all mutation maps (renumber_map, wikilink_map, frontmatter_map, filename_rewrite_map). This ensures the test does not depend on hand-crafted inverse plans that could themselves contain errors.

## Observations

- [requirement] Round-trip property test verifies per-file SHA-256 identity across the full SPEC subtree decompose-recompose cycle #round-trip #proof
- [technique] Inverse plan generated programmatically by swapping and inverting all maps to avoid hand-crafted inverse errors #test-design #automation
- [constraint] Test must complete in under 5 seconds for CI viability; SHA-256 on note-sized files is sub-millisecond so this is achievable #performance #ci
- [fact] Fixture must include at least 1 SPEC root + 1 REQ + 1 DESIGN + 1 TASK (4 files minimum) to exercise all child types #fixtures #coverage

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- implements [[ADR-001: Composition Library Architecture]]
- depends_on [[REQ-001-SPEC-004: SPEC Subtree Adapter Implementation]]
- depends_on [[REQ-004-SPEC-004: Per-File Hash Validation]]
- depends_on [[REQ-008-SPEC-001: Round-Trip Property Test for ADR Adapter]]