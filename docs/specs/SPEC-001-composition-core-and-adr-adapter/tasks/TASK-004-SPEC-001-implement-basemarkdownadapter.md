---
title: 'TASK-004-SPEC-001: Implement BaseMarkdownAdapter'
type: task
permalink: specs/spec-001-composition-core-and-adr-adapter/tasks/task-004-spec-001-implement-basemarkdownadapter
status: DONE
effort: M
estimate: 1d
tags:
- task
- spec-001
- base-adapter
- implementation
---

# TASK-004-SPEC-001: Implement BaseMarkdownAdapter

## Design Context

This TASK realizes DESIGN-002-SPEC-001 section "Algorithms" -- the single-pass replacement algorithm and unified/remark pipeline in an abstract base class.

## Objective

Implement the BaseMarkdownAdapter abstract class at src/core/base-markdown-adapter.ts that provides concrete implementations of all 5 CompositionAdapter methods using unified/remark for parse/serialize and string-based line operations for extractByRange/applyMutations/reverseMutations.

## Scope

**In Scope**: BaseMarkdownAdapter class, unified/remark pipeline config, parse/serialize round-trip, extractByRange line-based extraction, applyMutations/reverseMutations single-pass replacement, config properties (section_delimiter, identifier_pattern)
**Out of Scope**: Per-type adapter subclasses (TASK-008 ADR adapter)

## Implementation Notes

Configure unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).use(remarkStringify) to preserve original formatting. Single-pass replacement builds a regex alternation from map keys sorted by length descending. The inverse map for reverseMutations swaps keys and values. frontmatter_map applies to YAML frontmatter block between --- delimiters. regenerated_sections skips lines belonging to listed headings.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| shared/composition/src/core/base-markdown-adapter.ts | NEW | Abstract base class |
| shared/composition/tests/base-adapter.test.ts | NEW | Base class unit tests |

## Testing Requirements

- parse/serialize round-trip: serialize(parse(content)) === content for sample markdown with frontmatter
- extractByRange returns correct lines for given start/end
- applyMutations/reverseMutations inverse property holds
- Single-pass replacement does not cascade

## Definition of Done

- [x] BaseMarkdownAdapter exported from src/core/base-markdown-adapter.ts
- [x] parse returns Root AST from unified/remark pipeline
- [x] serialize produces char-identical output (round-trip identity)
- [x] extractByRange operates on raw lines correctly for all LineRange forms including end=-1
- [x] applyMutations uses single-pass replacement with regex alternation
- [x] reverseMutations(applyMutations(c, m), m) === c for all injective MutationSpecs
- [x] Unit tests pass covering all 5 methods

## ADR Compliance

- [x] Honors ADR-001 D-2: Uses unified + remark pipeline
- [x] Honors ADR-002 D-2: Implements CompositionAdapter contract
- [x] Honors ADR-002 D-3: Config-only override pattern for simple adapters

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1.5d | Core logic with remark config tuning |
| AI-Dominant | 1d | remark config is well-documented |
| AI-Assisted | 1d | Human validates round-trip property |

## Observations

- [requirement] BaseMarkdownAdapter provides the core implementation that 3 of 5 adapters reuse via config-only overrides #base-class #code-reuse
- [technique] Single-pass regex alternation sorted by key length prevents cascading substitution #single-pass #algorithm
- [risk] remark-stringify may normalize whitespace; must configure to preserve original formatting for char-identity #remark #whitespace

## Relations

- validated_by [[QA-004-SPEC-001: BaseMarkdownAdapter]]
- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[DESIGN-002-SPEC-001: CompositionAdapter Interface and Type Hierarchy]]
- implements [[REQ-002-SPEC-001: BaseMarkdownAdapter Base Class]]
- implements [[REQ-001-SPEC-001: CompositionAdapter Interface Contract]]
- depends_on [[TASK-002-SPEC-001: Define Core Types and Adapter Interface]]
