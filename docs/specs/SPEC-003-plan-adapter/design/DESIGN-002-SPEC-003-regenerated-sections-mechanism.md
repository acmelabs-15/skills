---
title: 'DESIGN-002-SPEC-003: Regenerated Sections Mechanism'
type: design
status: DRAFT
permalink: specs/spec-003-plan-adapter/design/design-002-spec-003-regenerated-sections-mechanism
tags:
- design
- spec-003
- regenerated-sections
- zod
---

# DESIGN-002-SPEC-003: Regenerated Sections Mechanism

## Requirements Addressed

- REQ-002-SPEC-003: Regenerated Sections Field Handling -- defines the declarative field and runtime behavior
- REQ-003-SPEC-003: Fifty Percent Integrity Floor on Regenerated Sections -- defines the Zod refinement for the integrity floor

## Design Overview

The regenerated sections mechanism has two layers: a declarative field on MutationSpec that tells the adapter which sections to exclude from hash validation, and a Zod validator refinement that enforces the 50% integrity floor to prevent abuse. The field is consumed by the PLAN adapter during extractByRange and reverseMutations; the validator runs at plan load time before any file I/O occurs.

This design realizes ADR-002 D-2 (MutationSpec regenerated_sections field), ADR-002 D-4 (PLAN extraction strategy -- regenerative sections excluded), and ADR-002 D-5 (regenerated-sections integrity floor as Zod refinement).

## Component Architecture

### Component 1: MutationSpec regenerated_sections Field

**Purpose**: Declarative field on MutationSpec listing H2/H3 heading names whose content is excluded from hash validation.

**Definition**:

Already defined in _shared/composition/src/core/types.ts (SPEC-001):

```typescript
interface MutationSpec {
  renumber_map: RenumberMap;
  wikilink_map: WikilinkMap;
  frontmatter_map?: FrontmatterMap;
  regenerated_sections?: string[];
}
```

**Responsibilities**:
- Lists section heading names (e.g., "Progress Dashboard", "Cross-Part Dependency Graph") whose content is derived and should be excluded from hash scope
- Consumed by the PLAN adapter's extractByRange and reverseMutations methods
- Empty array or undefined means no exclusions (full hash validation)

**Interfaces**:
- Defined in: core/types.ts (already exists from SPEC-001)
- Consumed by: PlanAdapter, Zod validator

### Component 2: PLAN-Specific Zod Schema Extension

**Purpose**: Adds regenerated_sections to the PLAN distribution and composition plan schemas with the 50% integrity floor refinement.

**Definition**:

```typescript
// At _shared/composition/schemas/distribution/plan.plan.schema.ts

import { z } from "zod";
import { basePlanSchema, mutationSpecSchema } from "../base";

const regeneratedSectionsFloor = z.array(z.string()).refine(
  (sections) => sections.length <= 10,
  {
    message:
      "regenerated_sections declares more than 10 sections; likely integrity bypass. Maximum 10 sections (enforced at schema level); runtime validates <50% of source lines.",
  }
);

export const planDistributionSchema = basePlanSchema.extend({
  plan_type: z.literal("distribution"),
  source_type: z.literal("plan"),
  section_delimiter: z.literal("### "),
  source: sourceSchema,
  destinations: z.array(
    destinationEntrySchema.extend({
      mutations: mutationSpecSchema.extend({
        regenerated_sections: regeneratedSectionsFloor.optional(),
      }),
    })
  ),
});
```

**Responsibilities**:
- Validates regenerated_sections at schema level (max 10 entries heuristic)
- Provides plan_type + source_type discriminant for the PLAN variant
- Extends the base plan schema with PLAN-specific fields

**Interfaces**:
- Consumed by: schema index.ts discriminated union
- Depends on: base.ts (basePlanSchema, mutationSpecSchema)

### Component 3: Runtime 50% Line-Count Validator

**Purpose**: Runtime check that regenerated_sections do not cover more than 50% of source content lines.

**Definition**:

```typescript
function validateIntegrityFloor(
  sourceContent: string,
  regeneratedSections: string[]
): { valid: boolean; coveragePercent: number; message?: string };
```

**Responsibilities**:
- Measures the line count of each regenerated section in the source content
- Computes total regenerated line count as a percentage of total source lines
- Returns validation result with coverage percentage for error reporting
- Called at script execution time after source file loading but before extraction

**Interfaces**:
- Consumed by: decompose.ts and recompose.ts script entry points (for PLAN source_type only)
- Internal to the composition library

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------:|
| Schema-level vs runtime-only floor | Both (defense in depth) | Schema catches obviously excessive declarations without source file; runtime measures actual coverage |
| Max 10 schema guard | Heuristic | Known PLAN regenerative sections are 2; 10 provides headroom for future additions while catching bulk abuse |
| 50% runtime threshold | Greater-than triggers rejection | 50% is the boundary value; exactly 50% passes; 51% fails; documented in ADR-002 D-5 |

## Security Considerations

The integrity floor prevents plan injection attacks where an LLM-authored plan declares all sections as regenerated to bypass hash validation. Without this floor, the zero-drift guarantee from ADR-001 F-8 could be circumvented by a sufficiently adversarial plan YAML.

## Testing Strategy

- Unit test: Zod schema rejects regenerated_sections with >10 entries
- Unit test: runtime validator rejects plans where regen sections cover >50% of lines
- Unit test: runtime validator accepts plans where regen sections cover exactly 50% of lines
- Unit test: runtime validator accepts plans where regen sections cover typical 10-20% of lines
- Integration: round-trip property test (REQ-005-SPEC-003) exercises the full regen exclusion path

## Open Questions

None. The integrity floor value (50%) and enforcement layers (schema + runtime) are locked by ADR-002 D-5.

## Observations

- [decision] Two-layer enforcement: Zod schema max 10 entries plus runtime 50% line-count check provides defense in depth #defense-in-depth #integrity-floor
- [technique] Schema-level guard operates without source file; runtime check measures actual line coverage against loaded source #validation #two-phase
- [constraint] 50% is the boundary: exactly 50% passes, greater-than 50% triggers rejection per ADR-002 D-5 #threshold #boundary
- [fact] Known PLAN regenerative sections (Progress Dashboard, Mermaid graph) typically cover 10-20% of lines; 50% floor provides 30+ percentage points of headroom #sizing #normal-usage

## Relations

- implements [[REQ-002-SPEC-003: Regenerated Sections Field Handling]]
- implements [[REQ-003-SPEC-003: Fifty Percent Integrity Floor on Regenerated Sections]]
- part_of [[SPEC-003: PLAN Adapter]]
- depends_on [[DESIGN-003-SPEC-001: Zod Plan Schema Modular Layout]]