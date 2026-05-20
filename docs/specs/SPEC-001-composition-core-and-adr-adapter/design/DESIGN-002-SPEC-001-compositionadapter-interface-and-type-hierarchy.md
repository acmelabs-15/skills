---
title: 'DESIGN-002-SPEC-001: CompositionAdapter Interface and Type Hierarchy'
type: design
permalink: specs/spec-001-composition-core-and-adr-adapter/design/design-002-spec-001-compositionadapter-interface-and-type-hierarchy
status: DRAFT
tags:
- design
- spec-001
- types
- interface
---

# DESIGN-002-SPEC-001: CompositionAdapter Interface and Type Hierarchy

## Context

This design specifies the TypeScript type hierarchy for the CompositionAdapter interface, MutationSpec, and supporting types. It realizes ADR-002 D-2 (adapter interface contract) and ADR-002 D-1 (plan YAML schema shape). The types form the contract boundary between the plan YAML (validated by Zod schemas) and the adapter implementations (dispatched by source_type).

## Module Structure

```text
src/core/
  types.ts      # LineRange, RenumberMap, WikilinkMap, FrontmatterMap, MutationSpec
  adapter.ts    # CompositionAdapter interface (imports types.ts + mdast Root)
```

## Interfaces

```typescript
// types.ts
export interface LineRange {
  start: number;  // 1-indexed
  end: number;    // -1 means "to end of file"
}

export type RenumberMap = Record<string, string>;
export type WikilinkMap = Record<string, string>;
export type FrontmatterMap = Record<string, string>;

export interface MutationSpec {
  renumber_map: RenumberMap;
  wikilink_map: WikilinkMap;
  frontmatter_map?: FrontmatterMap;
  regenerated_sections?: string[];
}

// adapter.ts
import type { Root } from "mdast";
import type { LineRange, MutationSpec } from "./types";

export interface CompositionAdapter {
  readonly sourceType: string;
  parse(content: string): Root;
  extractByRange(content: string, range: LineRange): string;
  applyMutations(content: string, mutations: MutationSpec): string;
  reverseMutations(content: string, mutations: MutationSpec): string;
  serialize(ast: Root): string;
}
```

## Algorithms

The MutationSpec captures all permitted mutations for a single extraction unit. The renumber_map and wikilink_map are applied via single-pass string replacement (all keys replaced simultaneously, not sequentially). The frontmatter_map handles YAML frontmatter field mutations. The regenerated_sections lists heading names excluded from hash validation (used by PLAN adapter in SPEC-003; not used by ADR adapter but present in the type for schema consistency).

Single-pass replacement algorithm: build a regex alternation from all map keys (sorted by length descending for greedy matching), replace each match with its mapped value in one pass. This avoids cascading where replacing key A produces a new occurrence of key B.

## Data Flow

```text
Plan YAML -> Zod parse -> MutationSpec extracted per destination
  -> adapter.extractByRange(content, range)
  -> adapter.applyMutations(extracted, mutationSpec)
  -> sha256(result) compared to sha256(reverse-mutated destination)
  -> adapter.reverseMutations(destination, mutationSpec)
```

## Edge Cases

| Case | Behavior |
| --- | --- |
| Empty MutationSpec (all maps empty) | Identity operation; content unchanged |
| frontmatter_map absent (undefined) | No frontmatter mutations; only renumber + wikilink |
| regenerated_sections absent | All sections included in hash validation (default for ADR, ANALYSIS, SESSION) |
| LineRange with end=-1 | Extracts from start to end of file |
| LineRange where start > content line count | Error: invalid line range |

## Performance Considerations

Single-pass regex replacement is O(n) where n is content length. For note-sized files (1-100 KB), this is sub-millisecond. The regex is compiled once per applyMutations call from the map keys.

## Security Considerations

MutationSpec values come from user-adjudicated plan YAML. Zod validation ensures renumber_map and wikilink_map are injective with disjoint domains before MutationSpec reaches the adapter. No additional security validation needed at the type level.

## Observations

- [design] Type hierarchy separates pure data types (types.ts) from behavioral interface (adapter.ts) for clean import boundaries #type-hierarchy #separation
- [technique] Single-pass string replacement via regex alternation avoids cascading substitution bugs #single-pass #algorithm
- [constraint] MutationSpec includes regenerated_sections for PLAN adapter compatibility; ADR adapter ignores this field #forward-compatibility #schema
- [decision] CompositionAdapter uses mdast Root type from @types/mdast aligning with ADR-001 D-2 unified+remark selection #mdast #type-safety

## Relations

- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- implements [[ADR-001: Composition Library Architecture]]