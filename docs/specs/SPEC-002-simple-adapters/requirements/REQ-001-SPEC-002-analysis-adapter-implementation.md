---
title: 'REQ-001-SPEC-002: ANALYSIS Adapter Implementation'
type: requirement
status: DRAFT
permalink: specs/spec-002-simple-adapters/requirements/req-001-spec-002-analysis-adapter-implementation
tags:
- requirement
- spec-002
- analysis-adapter
- composition
---

# REQ-001-SPEC-002: ANALYSIS Adapter Implementation

## Requirement Statement

WHEN a user invokes /decompose or /recompose on a Brain ANALYSIS note,
THE SYSTEM SHALL provide an ANALYSIS adapter that extends BaseMarkdownAdapter with section_delimiter set to H3 headings under the Findings section and identifier_pattern set to item-N or none,
SO THAT ANALYSIS notes can be decomposed and recomposed with the same SHA-256 char-identity guarantee as the ADR adapter.

## EARS Pattern: Event-Driven

The requirement activates when the composition library dispatcher receives a plan YAML with source_type "analysis". The dispatcher resolves to the ANALYSIS adapter, which handles parse, extractByRange, applyMutations, reverseMutations, and serialize for ANALYSIS-type notes.

## Context

ADR-002 D-3 specifies the per-type capability matrix. ANALYSIS adapters extend BaseMarkdownAdapter from SPEC-001 with config-only overrides. The ANALYSIS note structure uses H3 headings under a Findings H2 section as section boundaries. Finding items may use item-N identifiers or have no identifiers (free-form findings). The adapter is the simplest in the project at approximately 50 LOC delta over the base class, making it the first adapter to build in SPEC-002.

ADR-001 F-8 SHA-256 hash protocol applies: the round-trip property test must pass for ANALYSIS notes with the same char-identity guarantee as the ADR adapter proven in SPEC-001.

## Acceptance Criteria

- [ ] GIVEN an ANALYSIS adapter class at _shared/composition/src/adapters/analysis.ts
      WHEN imported
      THEN it extends BaseMarkdownAdapter and is a valid CompositionAdapter implementation

- [ ] GIVEN the ANALYSIS adapter
      WHEN its section_delimiter config is inspected
      THEN it returns "### " (H3 prefix) matching ANALYSIS note Findings sub-section structure

- [ ] GIVEN the ANALYSIS adapter
      WHEN its identifier_pattern config is inspected
      THEN it returns a regex matching item-N format (e.g., item-1, item-2) with an optional fallback for findings with no identifier

- [ ] GIVEN the ANALYSIS adapter registered in the dispatcher
      WHEN a plan YAML with source_type "analysis" is loaded
      THEN the dispatcher resolves to the ANALYSIS adapter instance

## Priority

P0 -- ANALYSIS is the simplest adapter and validates the BaseMarkdownAdapter extension pattern before SESSION adapter.

## Category

Functional

## Implementation Notes

The ANALYSIS adapter should require approximately 50 lines of code delta over BaseMarkdownAdapter. The primary configuration overrides are section_delimiter and identifier_pattern. No cross-source updates or regenerative content handling is needed for ANALYSIS notes. The adapter reuses the unified/remark pipeline from BaseMarkdownAdapter unchanged.

## Observations

- [requirement] ANALYSIS adapter extends BaseMarkdownAdapter with config-only overrides per ADR-002 D-3 capability matrix #adapter #config-override
- [fact] Estimated 50 LOC delta over BaseMarkdownAdapter; simplest adapter in SPEC-002 #estimation #loc
- [constraint] SHA-256 char-identity hash validation applies per ADR-001 F-8; round-trip property test must pass #hash-validation #zero-drift
- [decision] section_delimiter is H3 ("### ") for ANALYSIS Findings sub-sections; identifier_pattern matches item-N format #structure #analysis

## Relations

- part_of [[SPEC-002: Simple Adapters]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- implements [[ADR-001: Composition Library Architecture]]
- depends_on [[REQ-002-SPEC-001: BaseMarkdownAdapter Base Class]]