---
title: 'TASK-005-SPEC-004: Implement specSubtreeManifestSchema Zod Validator'
type: task
status: TODO
effort: S
estimate: 1d
permalink: specs/spec-004-spec-subtree-adapter/tasks/task-005-spec-004-implement-spec-subtree-manifest-schema-zod-validator-1
tags:
- task
- spec-004
- zod-schema
- validator
---

# TASK-005-SPEC-004: Implement specSubtreeManifestSchema Zod Validator

## Design Context

- DESIGN-001-SPEC-004 SPEC Subtree Adapter Architecture: the schema is consumed by the adapter's processSubtree() method to validate manifest structure before processing

## Objective

Implement the Zod schema for the SPEC subtree manifest (specSubtreeManifestSchema) and the SPEC-specific plan schemas (distribution and composition variants). The schema validates the root/children structure, per-entry mutation specs with injectivity constraints, optional filename_rewrite_map per child, and path containment on all dest_path values. Register the SPEC schemas in the discriminated union assembly at schemas/index.ts.

## Scope

**In Scope**:
- specSubtreeManifestSchema Zod type at _shared/composition/schemas/
- _shared/composition/schemas/distribution/spec.plan.schema.ts
- _shared/composition/schemas/composition/spec.plan.schema.ts
- Registration in schemas/index.ts discriminated union
- Reuse of injectiveDisjointMap and containedPathSchema from base.ts

**Out of Scope**:
- Adapter implementation (TASK-001 through TASK-004)
- Other per-type schemas (ADR, ANALYSIS, SESSION, PLAN already covered by SPEC-001/002/003)

## Implementation Notes

The specSubtreeManifestSchema follows the concrete Zod shape from ADR-002 D-5. Root entry has source_path (string) and mutations (mutationSpecSchema). Children array contains entries with source_path, dest_path, mutations, and optional filename_rewrite_map. All renumber_map and wikilink_map fields use the injectiveDisjointMap validator. All dest_path fields use containedPathSchema. The schema is async due to containedPathSchema using realpath.

## Files Affected

| File | Action | Purpose |
|---|---|---|
| _shared/composition/schemas/distribution/spec.plan.schema.ts | NEW | SPEC distribution plan schema |
| _shared/composition/schemas/composition/spec.plan.schema.ts | NEW | SPEC composition plan schema |
| _shared/composition/schemas/index.ts | MODIFY | Add SPEC variants to discriminated union |

## Definition of Done

- [ ] specSubtreeManifestSchema validates root + children structure per ADR-002 D-5
- [ ] All renumber_map and wikilink_map entries validated by injectiveDisjointMap
- [ ] All dest_path values validated by containedPathSchema
- [ ] Distribution variant registered in schemas/index.ts
- [ ] Composition variant registered in schemas/index.ts
- [ ] Unit tests: valid manifest passes, non-injective map rejected, path traversal rejected, missing subtree_manifest rejected

## ADR Compliance

- [ ] Honors ADR-002 D-1: SPEC plan YAML schema shape with subtree_manifest
- [ ] Honors ADR-002 D-5: modular per-type schema file + registration in union

## Effort

| Tier | Human | AI-Dominant | AI-Assisted |
|---|---|---|---|
| S | 2d | 1d | 1.5d |

## Observations

- [fact] Status: TODO #status
- [fact] Size tier: S -- Zod schema definition reusing existing validators; two schema files plus index.ts registration #estimation
- [decision] Reuse injectiveDisjointMap and containedPathSchema from SPEC-001 base.ts to avoid validator duplication #reuse

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- implements [[REQ-005-SPEC-004: SPEC Subtree Manifest Zod Schema]]
- depends_on [[TASK-005-SPEC-001: Implement Zod Plan Schemas]]