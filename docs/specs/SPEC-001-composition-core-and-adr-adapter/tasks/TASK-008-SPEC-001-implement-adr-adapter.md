---
title: 'TASK-008-SPEC-001: Implement ADR Adapter'
type: task
permalink: specs/spec-001-composition-core-and-adr-adapter/tasks/task-008-spec-001-implement-adr-adapter
status: DONE
effort: S
estimate: 0.5d
tags:
- task
- spec-001
- adr-adapter
- proof
---

# TASK-008-SPEC-001: Implement ADR Adapter

## Design Context

This TASK realizes DESIGN-002-SPEC-001 "Interfaces" -- the concrete AdrAdapter class extending BaseMarkdownAdapter.

## Objective

Implement the ADR adapter at src/adapters/adr.ts that extends BaseMarkdownAdapter with section_delimiter="### " and identifier_pattern=/D-(\d+)/, providing H3 line range extraction under the Decision section.

## Scope

**In Scope**: AdrAdapter class extending BaseMarkdownAdapter, sourceType="adr", section_delimiter and identifier_pattern config, H3 extraction logic for D-N sections, unit tests
**Out of Scope**: Round-trip property test (TASK-009), other adapter types

## Implementation Notes

The ADR adapter overrides only configuration properties per ADR-002 D-3. The H3 extraction logic scans content for lines starting with "### " that occur under the "## Decision" section. Line ranges span from one H3 heading to the next (exclusive) or to the start of the next H2 section. The adapter inherits all 5 CompositionAdapter methods from BaseMarkdownAdapter.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| _shared/composition/src/adapters/adr.ts | NEW | ADR adapter implementation |
| _shared/composition/tests/adr-adapter.test.ts | NEW | ADR adapter unit tests |

## Testing Requirements

- sourceType returns "adr"
- extractByRange extracts correct H3 section content from sample ADR
- applyMutations renumbers D-N identifiers correctly
- reverseMutations recovers original content
- parse/serialize round-trip on ADR markdown

## Definition of Done
- [x] AdrAdapter class exported from src/adapters/adr.ts
- [x] Extends BaseMarkdownAdapter with section_delimiter="### " and identifier_pattern=/D-(\d+)/
- [x] sourceType === "adr"
- [x] H3 extraction under ## Decision works correctly
- [x] Unit tests pass for all 5 inherited methods
- [x] D-N renumber via applyMutations works with single-pass replacement
## ADR Compliance
- [x] Honors ADR-002 D-3: ADR adapter capability matrix
- [x] Honors ADR-002 D-4: ADR hash extraction strategy
## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Core adapter logic with H3 parsing |
| AI-Dominant | 0.5d | Config override is straightforward |
| AI-Assisted | 0.5d | Autocomplete from base class |

## Observations

- [requirement] ADR adapter is the PROOF that validates composition library architecture #proof #adr
- [decision] Extends BaseMarkdownAdapter with config-only overrides per ADR-002 D-3 #base-class #config
- [technique] H3 line range extraction scans between "### " delimiters under "## Decision" #extraction #h3

## Relations

- validated_by [[TEST-REPORT-008-SPEC-001: ADR Adapter]]
- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[REQ-007-SPEC-001: ADR Adapter Implementation]]
- implements [[DESIGN-002-SPEC-001: CompositionAdapter Interface and Type Hierarchy]]
- depends_on [[TASK-004-SPEC-001: Implement BaseMarkdownAdapter]]
