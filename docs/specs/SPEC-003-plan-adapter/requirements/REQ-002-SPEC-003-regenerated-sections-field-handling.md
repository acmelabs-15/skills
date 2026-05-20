---
title: 'REQ-002-SPEC-003: Regenerated Sections Field Handling'
type: requirement
status: DRAFT
permalink: specs/spec-003-plan-adapter/requirements/req-002-spec-003-regenerated-sections-field-handling-1
tags:
- requirement
- spec-003
- regenerated-sections
- hash-validation
---

# REQ-002-SPEC-003: Regenerated Sections Field Handling

## Requirement Statement

WHEN a plan YAML with source_type "plan" includes a MutationSpec with regenerated_sections listing section heading names (e.g., "Progress Dashboard", "Cross-Part Dependency Graph")
THE SYSTEM SHALL exclude lines belonging to those sections from both source extraction hash computation and destination reverse-mutation hash computation, matching sections by H2/H3 heading text
SO THAT regenerative content (Information Model Category 2 derived views) does not trigger hash mismatches when it is regenerated from structural content rather than preserved char-identically.

## Pattern

Behavioural (modifier on extractByRange and reverseMutations behavior when regenerated_sections is present on MutationSpec).

## Priority

P0 -- regenerated_sections is the core differentiator that makes the PLAN adapter a distinct implementation rather than a BaseMarkdownAdapter extension.

## Category

Functional

## Context

ADR-002 D-2 extends MutationSpec with a regenerated_sections field (string array, optional). ADR-002 D-4 specifies the PLAN hash extraction strategy: regenerative sections are excluded from extraction via the declarative regenerated_sections field on MutationSpec. The adapter applies this in extractByRange and reverseMutations -- lines belonging to listed sections (matched by H2/H3 heading) are SKIPPED from extraction and hash-comparison.

The specific regenerative sections in PLAN notes are the Progress Dashboard (a table derived from phase/task status) and the Cross-Part Dependency Graph (a Mermaid diagram regenerated from the structural dependency data). Both are Information Model Category 2 (derived views) per CONVENTIONS -- they show the same state at a higher level of aggregation and must stay in sync with source, but their exact content is generated rather than authored.

The hash protocol from ADR-001 F-8 still applies to ALL non-regenerative content. Only sections explicitly listed in regenerated_sections are excluded. This preserves the zero-drift guarantee on structural/narrative PLAN content.

## Acceptance Criteria

- [ ] GIVEN a MutationSpec with regenerated_sections: ["Progress Dashboard", "Cross-Part Dependency Graph"]
      WHEN extractByRange processes PLAN content
      THEN lines from the start of "## Progress Dashboard" (or "### Progress Dashboard") through the start of the next heading of equal or higher level are excluded from the extracted output

- [ ] GIVEN a MutationSpec with regenerated_sections: ["Progress Dashboard"]
      WHEN reverseMutations processes destination content
      THEN lines belonging to the "Progress Dashboard" section are excluded from the reverse-mutated output before hash comparison

- [ ] GIVEN a MutationSpec with regenerated_sections: []  (empty array)
      WHEN extractByRange and reverseMutations process PLAN content
      THEN all content is included in extraction and hash-comparison (no exclusion behavior)

- [ ] GIVEN a MutationSpec with no regenerated_sections field (undefined)
      WHEN extractByRange and reverseMutations process PLAN content
      THEN all content is included in extraction and hash-comparison (fallback to full hash validation)

- [ ] GIVEN regenerated_sections listing a heading that does not exist in the source content
      WHEN extractByRange processes the content
      THEN the non-existent heading is silently ignored (no error; no content excluded for that entry)

## Implementation Notes

Section matching uses the heading text after the markdown heading prefix (## or ###). The match is exact string equality after stripping the heading prefix and trimming whitespace. A section spans from its heading line to the line before the next heading of equal or higher level (H2 matches H2 or H1; H3 matches H3, H2, or H1). The implementation must handle both H2 and H3 regenerative sections since PLAN notes may use either heading level for dashboard content.

## Observations

- [requirement] Regenerated sections field enables declarative exclusion of derived-view content from hash validation scope #regenerated-sections #declarative
- [constraint] Only sections explicitly listed in regenerated_sections are excluded; all other content is fully hash-validated per ADR-001 F-8 #hash-validation #selective-exclusion
- [technique] Section matching uses exact heading text equality after stripping markdown prefix; section spans to next heading of equal or higher level #heading-match #section-span
- [fact] Progress Dashboard and Cross-Part Dependency Graph are the two known regenerative sections in PLAN notes per CONVENTIONS Information Model Category 2 #plan #derived-views

## Relations

- part_of [[SPEC-003: PLAN Adapter]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- implements [[ADR-001: Composition Library Architecture]]
- depends_on [[REQ-001-SPEC-003: PLAN Adapter Implementation]]