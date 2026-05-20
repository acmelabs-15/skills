---
title: 'REQ-001-SPEC-003: PLAN Adapter Implementation'
type: requirement
status: DRAFT
permalink: specs/spec-003-plan-adapter/requirements/req-001-spec-003-plan-adapter-implementation-1
tags:
- requirement
- spec-003
- plan-adapter
- composition
---

# REQ-001-SPEC-003: PLAN Adapter Implementation

## Requirement Statement

WHEN the composition library processes a plan YAML with source_type "plan"
THE SYSTEM SHALL dispatch to a PLAN adapter that is a distinct implementation of CompositionAdapter (NOT extending BaseMarkdownAdapter) with section_delimiter="### " for phase section boundaries, identifier_pattern matching {phase}.{part-id} format, and regenerated_sections support for declarative exclusion of derived-view content from hash validation
SO THAT PLAN notes can be decomposed and recomposed with zero content drift on structural/narrative content while allowing regenerative sections (Progress Dashboard, Mermaid graph) to be regenerated from structural content rather than hash-validated against source.

## Pattern

Event-Driven (triggered by plan YAML source_type discriminant at "plan").

## Priority

P0 -- PLAN adapter is the 4th adapter in the locked build order and the first "complex" adapter requiring a distinct implementation rather than BaseMarkdownAdapter extension.

## Category

Functional

## Context

ADR-002 D-3 specifies the PLAN adapter as a distinct implementation (~250 LOC delta, build order 4). Unlike ADR, ANALYSIS, and SESSION adapters which extend BaseMarkdownAdapter with config-only overrides, the PLAN adapter requires a distinct implementation because of regenerative content handling. The Progress Dashboard table and Cross-Part Dependency Graph (Mermaid) are Information Model Category 2 derived views (per CONVENTIONS) that are regenerated from structural content rather than hash-validated against source.

ADR-002 D-2 specifies the MutationSpec with regenerated_sections field: sections listed in regenerated_sections are SKIPPED from both extraction and hash-comparison. ADR-002 D-4 specifies the PLAN hash extraction strategy: extract S by phase section line range for structural/narrative content; regenerative sections excluded from extraction; mutations include phase+part-id renumber and wikilink substitution; reverse-mutate strips regenerative sections from both S and D' before comparison.

The PLAN adapter implements all 5 methods of the CompositionAdapter interface from SPEC-001 REQ-001-SPEC-001. Both Distribution (split one PLAN into multiple) and Composition (merge multiple PLANs into one) are supported.

## Acceptance Criteria

- [ ] GIVEN a PlanAdapter class implementing CompositionAdapter
      WHEN instantiated
      THEN sourceType === "plan" and section_delimiter === "### " and identifier_pattern matches {phase}.{part-id} format (e.g., research.1, decisions.2, spec.SPEC-001)

- [ ] GIVEN a valid PLAN markdown file with phase sections under the Workflow Plan heading
      WHEN extractByRange is called with a line range spanning one phase section
      THEN the extracted content INCLUDES the section heading line at the start AND EXCLUDES the next section heading line at the end (boundary convention matching SPEC-001 ADR adapter: inclusive-of-own-heading, exclusive-of-next-heading)

- [ ] GIVEN extracted PLAN content with phase+part-id identifiers
      WHEN applyMutations is called with renumber_map (e.g., {"research.1": "research.100", "decisions.1": "decisions.100"})
      THEN all occurrences of the source identifiers become the target identifiers in a single pass

- [ ] GIVEN mutated content
      WHEN reverseMutations is called with the same MutationSpec
      THEN the original content is recovered (reverseMutations(applyMutations(content, spec), spec) === content)

- [ ] GIVEN the PLAN adapter
      WHEN parse followed by serialize is called on PLAN markdown
      THEN the output is character-identical to the input (round-trip identity)

- [ ] GIVEN a MutationSpec with regenerated_sections listing "Progress Dashboard" and "Cross-Part Dependency Graph"
      WHEN extractByRange or reverseMutations processes content containing those sections
      THEN lines belonging to the listed sections are SKIPPED from extraction and hash-comparison scope

## Implementation Notes

The PLAN adapter lives at _shared/composition/src/adapters/plan.ts. It is a distinct implementation of CompositionAdapter (does NOT extend BaseMarkdownAdapter) because regenerative content handling requires custom extraction and reverse-mutation logic that the base class does not accommodate. The adapter uses unified + remark per ADR-001 D-2 for parse/serialize. The section_delimiter "### " applies to phase section boundaries within the Workflow Plan. The identifier_pattern matches {phase}.{part-id} format used in PLAN notes per CONVENTIONS Section 4.6.

## Observations

- [requirement] PLAN adapter is a distinct CompositionAdapter implementation due to regenerative content carve-out that BaseMarkdownAdapter does not support #distinct-implementation #plan-adapter
- [decision] section_delimiter "### " matches PLAN phase section boundaries (### {phase}.{part-id}) per ADR-002 D-3 #section-delimiter #plan
- [constraint] Regenerated sections (Progress Dashboard, Mermaid graph) are Information Model Category 2 derived views excluded from hash validation #regenerative-content #hash-exclusion
- [technique] Phase+part-id identifier format (research.1, decisions.2) requires custom identifier_pattern distinct from D-N or Event NN patterns #identifier #phase-part

## Relations

- part_of [[SPEC-003: PLAN Adapter]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- implements [[ADR-001: Composition Library Architecture]]
- depends_on [[REQ-001-SPEC-001: CompositionAdapter Interface Contract]]