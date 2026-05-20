---
title: 'DESIGN-001-SPEC-003: PLAN Adapter Architecture'
type: design
status: DRAFT
permalink: specs/spec-003-plan-adapter/design/design-001-spec-003-plan-adapter-architecture
tags:
- design
- spec-003
- plan-adapter
- architecture
---

# DESIGN-001-SPEC-003: PLAN Adapter Architecture

## Requirements Addressed

- REQ-001-SPEC-003: PLAN Adapter Implementation -- defines the distinct implementation architecture
- REQ-002-SPEC-003: Regenerated Sections Field Handling -- defines how regenerative content carve-out is architecturally implemented
- REQ-004-SPEC-003: PLAN Frontmatter Mutations -- defines frontmatter_map handling in the adapter

## Design Overview

The PLAN adapter is a distinct implementation of the CompositionAdapter interface (from SPEC-001 REQ-001-SPEC-001). Unlike the ADR, ANALYSIS, and SESSION adapters which extend BaseMarkdownAdapter with config-only overrides, the PLAN adapter implements all 5 interface methods directly because the regenerative content carve-out requires custom extraction and reverse-mutation logic that the BaseMarkdownAdapter base class does not accommodate.

This design realizes ADR-002 D-3's specification: "PLAN and SPEC adapters are distinct implementations due to regenerative content handling (PLAN) and recursive subtree mutations (SPEC). The ADR-002 interface contract (D-2 CompositionAdapter) is the public surface; BaseMarkdownAdapter is an internal implementation detail that reduces LOC duplication across the 3 simple adapters without changing the public contract."

## Component Architecture

### Component 1: PlanAdapter Class

**Purpose**: Implements CompositionAdapter for source_type "plan" with regenerative content support.

**Definition**:

```typescript
import type { Root } from "mdast";
import type { CompositionAdapter, LineRange, MutationSpec } from "../core/types";

export class PlanAdapter implements CompositionAdapter {
  readonly sourceType = "plan" as const;

  private readonly sectionDelimiter = "### ";
  private readonly identifierPattern = /(\w+)\.(\w[\w-]*)/;

  parse(content: string): Root { /* unified + remark pipeline */ }
  extractByRange(content: string, range: LineRange): string { /* with regen exclusion */ }
  applyMutations(content: string, mutations: MutationSpec): string { /* renumber + wikilink + frontmatter + regen skip */ }
  reverseMutations(content: string, mutations: MutationSpec): string { /* inverse of above */ }
  serialize(ast: Root): string { /* remark-stringify */ }
}
```

**Responsibilities**:
- Implements all 5 CompositionAdapter methods directly (no base class inheritance)
- Handles regenerated_sections exclusion in extractByRange and reverseMutations
- Handles frontmatter_map mutations in applyMutations and reverseMutations
- Registers as source_type "plan" in the adapter dispatcher

**Interfaces**:
- Consumed by: adapter dispatcher (source_type resolution), decompose.ts, recompose.ts
- Implements: CompositionAdapter from _shared/composition/src/core/adapter.ts

### Component 2: Regenerative Section Handler

**Purpose**: Identifies and excludes regenerated sections from content during extraction and hash comparison.

**Definition**:

```typescript
interface RegenerativeSectionRange {
  headingLine: number;
  endLine: number;
  headingText: string;
}

function identifyRegenerativeSections(
  content: string,
  sectionNames: string[]
): RegenerativeSectionRange[];

function stripRegenerativeSections(
  content: string,
  ranges: RegenerativeSectionRange[]
): string;
```

**Responsibilities**:
- Scans content for headings matching regenerated_sections names
- Computes the line range of each regenerative section (from heading to next heading of equal or higher level)
- Strips regenerative sections from content for hash comparison

**Interfaces**:
- Consumed by: PlanAdapter.extractByRange, PlanAdapter.reverseMutations
- Internal helper (not exported from the adapter module)

### Component 3: PLAN Frontmatter Handler

**Purpose**: Applies and reverses frontmatter field mutations per the frontmatter_map on MutationSpec.

**Definition**:

```typescript
function applyFrontmatterMap(
  content: string,
  frontmatterMap: Record<string, string>
): string;

function reverseFrontmatterMap(
  content: string,
  frontmatterMap: Record<string, string>
): string;
```

**Responsibilities**:
- Parses YAML frontmatter block from content
- Applies field replacements from frontmatter_map
- Reverses field replacements by swapping keys and values
- Handles array-valued fields (branches[]) via JSON-serialized string values
- Serializes updated frontmatter back into the content

**Interfaces**:
- Consumed by: PlanAdapter.applyMutations, PlanAdapter.reverseMutations
- Internal helper (not exported from the adapter module)

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------:|
| Distinct class vs BaseMarkdownAdapter | Distinct implementation | ADR-002 D-3: regenerative content handling is not accommodated by BaseMarkdownAdapter config-only overrides |
| Regen section matching | Exact heading text match | Simplest correct approach; heading text is deterministic in PLAN notes |
| Frontmatter parsing | String-level YAML block extraction | Avoids full remark-frontmatter re-parse for mutation; consistent with string-level applyMutations approach from ADR-002 D-2 |
| Internal helpers vs separate modules | Module-internal functions | Regenerative section handler and frontmatter handler are PLAN-specific; no reuse expected outside plan.ts |

## Security Considerations

No additional security surface beyond the core library. All input validation (path containment, injectivity checks) is handled by the Zod validators from SPEC-001. The 50% integrity floor on regenerated_sections is enforced at the schema level (REQ-003-SPEC-003) before the adapter runs.

## Testing Strategy

- Unit tests for PlanAdapter: verify sourceType, section extraction, mutation/reverse-mutation round-trip
- Unit tests for regenerative section handler: verify correct section identification and stripping
- Unit tests for frontmatter handler: verify apply/reverse symmetry including array fields
- Integration: round-trip property test (REQ-005-SPEC-003) validates the full decompose/recompose cycle

## Open Questions

None. All design decisions are locked by ADR-002 D-2 (interface), D-3 (PLAN distinct implementation), and D-4 (PLAN hash extraction strategy).

## Observations

- [decision] PLAN adapter is a distinct implementation of CompositionAdapter; does NOT extend BaseMarkdownAdapter #distinct-implementation #plan
- [technique] Regenerative section handler identifies sections by heading text match and computes line ranges for exclusion #regenerative #heading-match
- [technique] Frontmatter handler operates at string level on YAML block; avoids remark-frontmatter re-parse overhead #frontmatter #string-level
- [constraint] Internal helpers (regenerative section handler, frontmatter handler) are PLAN-specific and not exported #encapsulation #plan-specific

## Relations

- implements [[REQ-001-SPEC-003: PLAN Adapter Implementation]]
- implements [[REQ-002-SPEC-003: Regenerated Sections Field Handling]]
- implements [[REQ-004-SPEC-003: PLAN Frontmatter Mutations]]
- part_of [[SPEC-003: PLAN Adapter]]
- depends_on [[DESIGN-002-SPEC-001: CompositionAdapter Interface and Type Hierarchy]]