---
title: 'REQ-002-SPEC-001: BaseMarkdownAdapter Base Class'
type: requirement
permalink: specs/spec-001-composition-core-and-adr-adapter/requirements/req-002-spec-001-basemarkdownadapter-base-class
status: ACCEPTED
tags:
- requirement
- spec-001
- base-adapter
- composition
---

# REQ-002-SPEC-001: BaseMarkdownAdapter Base Class

## Requirement Statement

WHEN a simple adapter (ADR, ANALYSIS, or SESSION) is implemented
THE SYSTEM SHALL provide a BaseMarkdownAdapter abstract class that implements CompositionAdapter with config-only overrides for section_delimiter and identifier_pattern parameters
SO THAT simple adapters reduce to configuration rather than reimplementation of the 5-method contract.

## Pattern

Ubiquitous (applies to every simple adapter implementation).

## Priority

P0 — reduces LOC duplication across 3 of 5 adapters per ADR-002 D-3 capability matrix.

## Category

Functional

## Context

ADR-002 D-3 documents that ADR, ANALYSIS, and SESSION adapters extend a shared BaseMarkdownAdapter class with config-only overrides on section_delimiter, identifier_pattern, and related structural parameters. PLAN and SPEC adapters are distinct implementations due to regenerative content handling (PLAN) and recursive subtree mutations (SPEC). The BaseMarkdownAdapter is an internal implementation detail that reduces LOC duplication without changing the public CompositionAdapter contract.

The base class implements all 5 CompositionAdapter methods using unified/remark for parse/serialize and string-based line operations for extractByRange/applyMutations/reverseMutations. Subclasses override only the configuration properties that differ per source type.

## Acceptance Criteria

- [x] GIVEN a TypeScript abstract class BaseMarkdownAdapter at shared/composition/src/core/base-markdown-adapter.ts
      WHEN compiled
      THEN it implements CompositionAdapter interface with concrete implementations of all 5 methods

- [x] GIVEN BaseMarkdownAdapter
      WHEN a subclass provides section_delimiter and identifier_pattern
      THEN extractByRange returns raw line slices (line-number-bounded; the base class extractByRange is purely line-number-based per Implementation Notes -- subclasses that need section-aware extraction implement that logic via overridden methods or external dispatchers, NOT via the base class extractByRange. Clarified per Gate A semantic gap finding 2026-05-19)

- [x] GIVEN BaseMarkdownAdapter with unified/remark pipeline
      WHEN parse is called with valid markdown including YAML frontmatter
      THEN it returns a Root AST with frontmatter node preserved

- [x] GIVEN BaseMarkdownAdapter serialize method
      WHEN called with a Root AST produced by parse
      THEN serialize(parse(content)) === content holds (round-trip char-identity)

- [x] GIVEN applyMutations with single-pass replacement semantics
      WHEN called with an injective renumber_map
      THEN all occurrences of each key are replaced with its value in one pass without cascading substitutions

## Implementation Notes

The base class uses unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).use(remarkStringify) as its processing pipeline per ADR-001 D-2. The remark-stringify configuration must preserve original formatting to maintain the char-identity contract. The extractByRange method operates on raw string lines (split by newline), not on the AST. The applyMutations and reverseMutations methods use single-pass string replacement with the key-value domain disjointness guarantee enforced by Zod validators at plan load time per ADR-002 D-5.

## Observations

- [requirement] BaseMarkdownAdapter provides config-only override pattern for simple adapters reducing 3 implementations to configuration #base-class #code-reuse
- [decision] Base class is internal implementation detail; public contract remains CompositionAdapter interface per ADR-002 D-3 #encapsulation #interface
- [technique] Single-pass string replacement with disjoint key-value domains enables deterministic reversible mutations #mutation #single-pass
- [constraint] remark-stringify must preserve original formatting for char-identity round-trip per ADR-001 D-2 + F-8 #formatting #round-trip

## Relations

- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- depends_on [[REQ-001-SPEC-001: CompositionAdapter Interface Contract]]
