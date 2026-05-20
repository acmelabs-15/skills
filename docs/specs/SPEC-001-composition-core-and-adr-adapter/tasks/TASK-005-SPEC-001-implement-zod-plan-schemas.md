---
title: 'TASK-005-SPEC-001: Implement Zod Plan Schemas'
type: task
permalink: specs/spec-001-composition-core-and-adr-adapter/tasks/task-005-spec-001-implement-zod-plan-schemas
status: DONE
effort: S
estimate: 0.5d
tags:
- task
- spec-001
- zod
- schema
---

# TASK-005-SPEC-001: Implement Zod Plan Schemas

## Design Context

This TASK realizes DESIGN-003-SPEC-001 -- the modular Zod schema layout including base.ts, ADR distribution/composition schemas, and index.ts assembly.

## Objective

Implement the Zod plan validation schemas: base.ts with common envelope and shared types, ADR-specific distribution and composition schemas, and index.ts with nested discriminated union assembly (ADR-only for SPEC-001; extensible by SPEC-002/003).

## Scope

**In Scope**: schemas/base.ts, schemas/distribution/adr.plan.schema.ts, schemas/composition/adr.plan.schema.ts, schemas/index.ts, PlanValidationError interface, error reporting mapping
**Out of Scope**: Non-ADR source_type schemas (SPEC-002 and SPEC-003)

## Implementation Notes

The nested discriminated union assembles plan_type (outer) x source_type (inner). For SPEC-001, only ADR variants are registered. The index.ts must be designed for easy extension (import + add to union array). The D-N pattern validation on renumber_map keys uses a regex refine. Error reporting maps ZodError.issues to PlanValidationError array.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| _shared/composition/schemas/base.ts | NEW | Common envelope, shared Zod types |
| _shared/composition/schemas/distribution/adr.plan.schema.ts | NEW | ADR distribution schema |
| _shared/composition/schemas/composition/adr.plan.schema.ts | NEW | ADR composition schema |
| _shared/composition/schemas/index.ts | NEW | Union assembly + exports |
| _shared/composition/tests/schemas.test.ts | NEW | Schema validation tests |

## Testing Requirements

- Valid ADR distribution plan YAML parses successfully
- Valid ADR composition plan YAML parses successfully
- Invalid plan (missing fields) rejected with structured errors
- D-N pattern validation catches non-matching keys

## Definition of Done

- [ ] base.ts exports all shared Zod types per ADR-002 D-5
- [ ] ADR distribution schema validates section_delimiter and D-N renumber keys
- [ ] ADR composition schema validates plural sources and singular destination
- [ ] index.ts exports planSchema and Plan type
- [ ] PlanValidationError interface exported with error mapping function
- [ ] Tests pass with valid and invalid fixture YAMLs

## ADR Compliance

- [ ] Honors ADR-001 D-1: Zod for plan validation
- [ ] Honors ADR-002 D-1: Nested discriminated union shape
- [ ] Honors ADR-002 D-5: Modular per-type schema files

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Schema definitions from spec |
| AI-Dominant | 0.5d | Direct transcription from ADR-002 |
| AI-Assisted | 0.5d | Autocomplete from spec |

## Observations

- [requirement] Zod schemas are the first validation gate catching malformed plans before any file I/O #zod #validation
- [technique] Nested discriminated union enables two-level type narrowing at compile time #type-narrowing #zod
- [constraint] Schema must use parseAsync due to async containedPathSchema validator #async #schema

## Relations

- validated_by [[TEST-REPORT-005-SPEC-001: Zod Plan Schemas]]
- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[DESIGN-003-SPEC-001: Zod Plan Schema Modular Layout]]
- implements [[REQ-004-SPEC-001: Zod Plan Validator Base]]
- depends_on [[TASK-002-SPEC-001: Define Core Types and Adapter Interface]]