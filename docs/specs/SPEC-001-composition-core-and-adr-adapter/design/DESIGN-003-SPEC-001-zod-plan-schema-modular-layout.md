---
title: 'DESIGN-003-SPEC-001: Zod Plan Schema Modular Layout'
type: design
permalink: specs/spec-001-composition-core-and-adr-adapter/design/design-003-spec-001-zod-plan-schema-modular-layout
status: DRAFT
tags:
- design
- spec-001
- zod-schema
- validation
---

# DESIGN-003-SPEC-001: Zod Plan Schema Modular Layout

## Context

This design specifies the modular Zod schema layout for plan YAML validation. It realizes ADR-002 D-5 (Zod validator structure) and ADR-002 D-1 (plan YAML schema shape with nested discriminated union). SPEC-001 scaffolds the base schema plus ADR-specific schemas (2 of 10 variants). The schema directory structure mirrors the adapter directory to enable per-type extension.

## Module Structure

```text
schemas/
  base.ts                           # Common envelope, shared Zod types, error format
  distribution/
    adr.plan.schema.ts              # ADR distribution-specific Zod schema
  composition/
    adr.plan.schema.ts              # ADR composition-specific Zod schema
  index.ts                          # Nested discriminated union assembly + Plan type export
```

## Interfaces

```typescript
// base.ts exports
export const lineRangeSchema: z.ZodType<LineRange>;
export const renumberMapSchema: z.ZodType<RenumberMap>;
export const wikilinkMapSchema: z.ZodType<WikilinkMap>;
export const mutationSpecSchema: z.ZodType<MutationSpec>;
export const validationSchema: z.ZodObject<...>;
export const sourceEntrySchema: z.ZodObject<...>;
export const destinationEntrySchema: z.ZodObject<...>;
export const injectiveDisjointMap: (fieldName: string) => z.ZodType;
export const containedPathSchema: z.ZodString;

// index.ts exports
export const planSchema: z.ZodDiscriminatedUnion<...>;
export type Plan = z.infer<typeof planSchema>;

// Error reporting
export interface PlanValidationError {
  path: string[];
  message: string;
  severity: "error" | "warning";
}
```

## Algorithms

The nested discriminated union is assembled in index.ts. The outer discriminant is plan_type ("distribution" or "composition"). Each branch is an inner z.discriminatedUnion("source_type", [...]) selecting per-type extensions. For SPEC-001, only the ADR variants are registered. SPEC-002 and SPEC-003 add their variants by importing and registering in index.ts.

The injectiveDisjointMap validator uses Set operations: (1) check Set(values).size === values.length for injectivity, (2) check every value is absent from the key Set for disjointness. Both checks are O(n) where n is map size.

The containedPathSchema uses async realpath + path.sep suffix for symlink-aware containment, requiring planSchema.parseAsync() at the entry point.

## Data Flow

```text
YAML string -> js-yaml.load() -> raw object
  -> planSchema.parseAsync(raw) -> typed Plan object
  -> dispatch to adapter via Plan.source_type
```

## Edge Cases

| Case | Behavior |
| --- | --- |
| Unknown source_type in plan YAML | Zod discriminated union rejects with "invalid discriminator value" |
| Unknown plan_type | Outer discriminated union rejects |
| Empty renumber_map | Passes injectivity (trivially injective); passes disjointness (no overlap) |
| Non-string values in YAML map | Zod z.string() coercion or rejection depending on value type |

## Performance Considerations

Zod parse is negligible for plan-sized YAML (typically 50-200 lines). The async realpath call in containedPathSchema is the only I/O in the validation pipeline.

## Security Considerations

YAML parsing should use FAILSAFE_SCHEMA (or equivalent strict mode) with a 1 MB max file-size guard to mitigate CWE-502 (YAML deserialization) and CWE-400 (billion-laughs DoS). The containedPathSchema mitigates CWE-22 (path traversal) per ADR-001 Confirmation.

## Observations

- [design] Modular schema layout mirrors adapter directory enabling per-type extension at validation layer #schema-modularity #extensibility
- [technique] Nested discriminated union provides two-level type narrowing: plan_type then source_type #type-narrowing #zod
- [constraint] parseAsync required at entry point due to async containedPathSchema; all other validators are synchronous #async #validation
- [decision] Error reporting maps ZodError.issues to PlanValidationError interface for human-readable output per ADR-002 D-5 #error-reporting #ux

## Relations

- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- implements [[ADR-001: Composition Library Architecture]]
