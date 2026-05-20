---
title: 'REQ-007-SPEC-001: ADR Adapter Implementation'
type: requirement
permalink: specs/spec-001-composition-core-and-adr-adapter/requirements/req-007-spec-001-adr-adapter-implementation
status: DRAFT
tags:
- requirement
- spec-001
- adr-adapter
- proof
---

# REQ-007-SPEC-001: ADR Adapter Implementation

## Requirement Statement

WHEN the composition library processes a plan YAML with source_type "adr"
THE SYSTEM SHALL dispatch to an ADR adapter that extends BaseMarkdownAdapter with section_delimiter="### " and identifier_pattern matching D-N, extracting by H3 line range under the Decision section and applying D-N renumber plus wikilink substitution
SO THAT ADR notes can be decomposed and recomposed with zero content drift as the architectural PROOF of the composition library.

## Pattern

Event-Driven (triggered by plan YAML source_type discriminant at "adr").

## Priority

P0 — the ADR adapter is the architectural PROOF; all other adapters depend on this validating the core.

## Category

Functional

## Context

ADR-002 D-3 specifies the ADR adapter as the first adapter built (~250 LOC, build order 1, PROOF). Sections are delimited by H3 headings (### D-N: Title) nested under the Decision section. The adapter validates the core architecture: extract by H3 range, apply D-N renumber plus cross-cluster wikilink substitution, hash-validate, write via temp-then-rename. Both Distribution (split one ADR into multiple) and Composition (merge multiple ADRs into one) are supported. The ADR adapter extends BaseMarkdownAdapter with config-only overrides on section_delimiter and identifier_pattern per ADR-002 D-3.

ADR-002 D-4 specifies the ADR hash extraction strategy: extract S by H3 line range, apply D-N identifier renumber via single-pass string replacement scoped to extracted content plus cross-cluster wikilink substitution applied globally, reverse-mutate D to D' by inverse maps, compare S_hash === D'_hash.

## Acceptance Criteria

- [ ] GIVEN an ADR adapter class extending BaseMarkdownAdapter
      WHEN instantiated
      THEN sourceType === "adr" and section_delimiter === "### " and identifier_pattern matches /D-(\d+)/

- [ ] GIVEN a valid ADR markdown file with multiple D-N sections under ## Decision
      WHEN extractByRange is called with a line range spanning one D-N section
      THEN the extracted content INCLUDES the section heading line (e.g., `### D-N: Title`) at the start AND EXCLUDES the next section heading line at the end (boundary convention: inclusive-of-own-heading, exclusive-of-next-heading; the trailing newline before the next heading IS included in the extracted content. Clarified per Gate A semantic gap finding 2026-05-19)

- [ ] GIVEN extracted ADR content with D-N identifiers
      WHEN applyMutations is called with renumber_map {"D-3": "D-100", "D-4": "D-101"}
      THEN all occurrences of D-3 become D-100 and D-4 become D-101 in a single pass

- [ ] GIVEN mutated content
      WHEN reverseMutations is called with the same MutationSpec
      THEN the original content is recovered (reverseMutations(applyMutations(content, spec), spec) === content)

- [ ] GIVEN the ADR adapter
      WHEN parse followed by serialize is called on ADR markdown
      THEN the output is character-identical to the input (round-trip identity)

- [ ] GIVEN a full decompose operation on an ADR file via the ADR adapter
      WHEN hash validation runs on all destination files
      THEN S_hash === D'_hash for every destination

## Implementation Notes

The ADR adapter lives at _shared/composition/src/adapters/adr.ts. It extends BaseMarkdownAdapter and overrides only the configuration properties. The H3 extraction logic scans for lines starting with "### " under the "## Decision" section and computes line ranges. The renumber_map keys are validated at Zod schema level to match the D-N pattern. The adapter handles both distribution (1 ADR to N sub-ADRs) and composition (N sub-ADRs to 1 merged ADR).

## Observations

- [requirement] ADR adapter is the PROOF that validates the composition library architecture via round-trip property test #proof #adr-adapter
- [decision] ADR adapter extends BaseMarkdownAdapter with config-only overrides per ADR-002 D-3 capability matrix #base-class #config-override
- [constraint] Section delimiter "### " and D-N identifier pattern are fixed for the ADR source type #adr #section-structure
- [technique] H3 line range extraction scans between section delimiters to produce precise extraction boundaries #extraction #line-range

## Relations

- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- implements [[ADR-001: Composition Library Architecture]]
- depends_on [[REQ-002-SPEC-001: BaseMarkdownAdapter Base Class]]
- depends_on [[REQ-001-SPEC-001: CompositionAdapter Interface Contract]]
