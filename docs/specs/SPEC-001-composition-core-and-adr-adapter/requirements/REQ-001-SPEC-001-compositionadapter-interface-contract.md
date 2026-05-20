---
title: 'REQ-001-SPEC-001: CompositionAdapter Interface Contract'
type: requirement
permalink: specs/spec-001-composition-core-and-adr-adapter/requirements/req-001-spec-001-compositionadapter-interface-contract
status: DRAFT
tags:
- requirement
- spec-001
- adapter-contract
- composition
---

# REQ-001-SPEC-001: CompositionAdapter Interface Contract

## Requirement Statement

WHEN a per-type adapter is registered with the composition library
THE SYSTEM SHALL enforce that the adapter implements the CompositionAdapter interface with 5 synchronous methods (parse, extractByRange, applyMutations, reverseMutations, serialize) plus a readonly sourceType property
SO THAT every adapter satisfies a uniform contract enabling type-safe dispatch via the plan YAML's source_type discriminant.

## Pattern

Interface Contract (Event-Driven: triggered when adapter is invoked by the deterministic script via plan YAML source_type discriminant).

## Priority

P0 — foundational; every other REQ depends on the adapter interface existing.

## Category

Functional

## Context

ADR-002 D-2 specifies the CompositionAdapter interface as a 5-method synchronous TypeScript interface. The interface is the public contract that every per-type adapter must implement. The parse/serialize pair provides round-trip char-identity validation (remark AST). The extractByRange/applyMutations/reverseMutations trio provides the production hash-validation path (string-based). The sha256() hash utility is a shared import at _shared/composition/src/core/hash.ts, not part of the adapter interface (per ADR-002 D-2 P1-I resolution).

ADR-001 D-4 locks the discriminated union on source_type, meaning the script dispatches to the correct adapter based on plan YAML source_type field. The CompositionAdapter interface is the mechanism by which this dispatch produces uniform behavior across all 5 source types.

## Acceptance Criteria

- [ ] GIVEN a TypeScript file at _shared/composition/src/core/adapter.ts
      WHEN compiled with tsc strict mode
      THEN the CompositionAdapter interface exports all 5 methods plus sourceType property with correct signatures matching ADR-002 D-2

- [ ] GIVEN any class implementing CompositionAdapter
      WHEN the class omits or mis-types any of the 5 methods
      THEN tsc produces a compile-time error identifying the missing or incorrect method

- [ ] GIVEN the parse method receives valid markdown content
      WHEN parse is called
      THEN it returns a remark Root AST node (from @types/mdast)

- [ ] GIVEN the extractByRange method receives content and a LineRange
      WHEN the range specifies start and end lines (1-indexed, inclusive)
      THEN it returns the raw string content within those lines

- [ ] GIVEN applyMutations receives content and a MutationSpec
      WHEN called with an injective renumber_map and wikilink_map
      THEN it returns content with all specified substitutions applied via single-pass replacement

- [ ] GIVEN reverseMutations receives mutated content and the same MutationSpec
      WHEN called
      THEN it returns content with inverse substitutions applied such that reverseMutations(applyMutations(content, spec), spec) === content

- [ ] GIVEN the serialize method receives a remark Root AST
      WHEN called
      THEN it returns markdown string identical to the original content that produced the AST (serialize(parse(content)) === content)

## Implementation Notes

The interface lives at _shared/composition/src/core/adapter.ts. Supporting types (LineRange, RenumberMap, WikilinkMap, FrontmatterMap, MutationSpec) live at _shared/composition/src/core/types.ts per ADR-002 D-2. The Root type is imported from mdast. All methods are synchronous per ADR-002 Considered Options Axis 1 (markdown parsing is CPU-bound with no I/O).

## Consumer Implementation Pattern

```typescript
import type { CompositionAdapter, MutationSpec, LineRange } from "./core/types";
import type { Root } from "mdast";

class AdrAdapter implements CompositionAdapter {
  readonly sourceType = "adr";
  parse(content: string): Root { /* ... */ }
  extractByRange(content: string, range: LineRange): string { /* ... */ }
  applyMutations(content: string, mutations: MutationSpec): string { /* ... */ }
  reverseMutations(content: string, mutations: MutationSpec): string { /* ... */ }
  serialize(ast: Root): string { /* ... */ }
}
```

## Observations

- [requirement] CompositionAdapter interface defines the 5-method synchronous contract that every per-type adapter must implement for uniform dispatch via source_type discriminant #adapter-contract #interface
- [decision] sha256() hash utility is a shared import not part of the adapter interface per ADR-002 D-2 P1-I resolution #hash #separation-of-concerns
- [constraint] All methods synchronous per ADR-002 Axis 1 decision; markdown parsing is CPU-bound with no I/O #sync #performance
- [decision] parse/serialize pair enforces round-trip char-identity (AST path); extractByRange/applyMutations/reverseMutations enforces production hash-validation (string path) #dual-path #validation

## Relations

- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- implements [[ADR-001: Composition Library Architecture]]