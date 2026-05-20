---
title: 'REQ-002-SPEC-002: SESSION Adapter Implementation'
type: requirement
status: DRAFT
permalink: specs/spec-002-simple-adapters/requirements/req-002-spec-002-session-adapter-implementation-1
tags:
- requirement
- spec-002
- session-adapter
- composition
---

# REQ-002-SPEC-002: SESSION Adapter Implementation

## Requirement Statement

WHEN a user invokes /decompose or /recompose on a Brain SESSION note,
THE SYSTEM SHALL provide a SESSION adapter that extends BaseMarkdownAdapter with section_delimiter set to "## Event " for Event-NN entries and identifier_pattern matching Event-NN format,
SO THAT SESSION notes can be decomposed and recomposed with SHA-256 char-identity guarantee and Event-NN identifiers restart per destination session note.

## EARS Pattern: Event-Driven

The requirement activates when the composition library dispatcher receives a plan YAML with source_type "session". The dispatcher resolves to the SESSION adapter, which handles parse, extractByRange, applyMutations, reverseMutations, and serialize for SESSION-type notes.

## Context

ADR-002 D-3 specifies the per-type capability matrix. SESSION adapters extend BaseMarkdownAdapter from SPEC-001 with config-only overrides plus the cross_source_updates field (handled by REQ-003-SPEC-002 separately). This requirement covers the core adapter implementation: section_delimiter, identifier_pattern, and basic parse/serialize behavior.

SESSION notes use "## Event " as the section delimiter, with Event-NN identifiers that restart numbering per destination session note during decomposition. The adapter is approximately 100 LOC delta over the base class, making it more complex than ANALYSIS but still a BaseMarkdownAdapter extension.

ADR-001 F-8 SHA-256 hash protocol applies: the round-trip property test must pass for SESSION notes.

## Acceptance Criteria

- [ ] GIVEN a SESSION adapter class at _shared/composition/src/adapters/session.ts
      WHEN imported
      THEN it extends BaseMarkdownAdapter and is a valid CompositionAdapter implementation

- [ ] GIVEN the SESSION adapter
      WHEN its section_delimiter config is inspected
      THEN it returns "## Event " matching SESSION note Event-NN entry structure

- [ ] GIVEN the SESSION adapter
      WHEN its identifier_pattern config is inspected
      THEN it returns a regex matching Event-NN format (e.g., Event 01, Event 02, Event 24)

- [ ] GIVEN a decomposition plan that splits a SESSION note into two destination SESSION notes
      WHEN applyMutations applies the renumber_map
      THEN Event-NN identifiers restart at 01 in each destination note per the plan's renumber_map

- [ ] GIVEN the SESSION adapter registered in the dispatcher
      WHEN a plan YAML with source_type "session" is loaded
      THEN the dispatcher resolves to the SESSION adapter instance

## Priority

P0 -- SESSION adapter validates the BaseMarkdownAdapter extension pattern with more structural complexity than ANALYSIS.

## Category

Functional

## Implementation Notes

The SESSION adapter overrides section_delimiter and identifier_pattern on BaseMarkdownAdapter. Event-NN renumbering is handled by the standard applyMutations path with the renumber_map from the plan YAML. The base class single-pass string replacement handles Event-NN rewrites. Cross-source updates (updating PLAN parts with owning_session and completing_session) are a separate concern handled by REQ-003-SPEC-002.

## Observations

- [requirement] SESSION adapter extends BaseMarkdownAdapter with section_delimiter "## Event " and Event-NN identifier pattern #adapter #session
- [fact] Estimated 100 LOC delta over BaseMarkdownAdapter; more complex than ANALYSIS due to Event-NN renumbering #estimation #loc
- [constraint] Event-NN identifiers restart per destination note during decomposition per ADR-002 D-3 #renumbering #session
- [decision] Cross-source updates separated into REQ-003-SPEC-002 for clean concern separation #separation #design

## Relations

- part_of [[SPEC-002: Simple Adapters]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- implements [[ADR-001: Composition Library Architecture]]
- depends_on [[REQ-002-SPEC-001: BaseMarkdownAdapter Base Class]]
- relates_to [[REQ-003-SPEC-002: SESSION Cross-Source Updates Handling]]