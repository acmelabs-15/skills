---
title: 'REQ-005-SPEC-004: SPEC Subtree Manifest Zod Schema'
type: requirement
status: DRAFT
permalink: specs/spec-004-spec-subtree-adapter/requirements/req-005-spec-004-spec-subtree-manifest-zod-schema-1
tags:
- requirement
- spec-004
- zod-schema
- subtree-manifest
---

# REQ-005-SPEC-004: SPEC Subtree Manifest Zod Schema

## Requirement Statement

WHEN a plan YAML with source_type "spec" is loaded by the composition library,
THE SYSTEM SHALL validate the subtree_manifest field using the specSubtreeManifestSchema Zod validator that enforces root/children structure, per-entry mutation specs, optional filename_rewrite_map per child, and injectivity constraints on all renumber_map and wikilink_map entries,
SO THAT malformed SPEC subtree plans are rejected at load time before any file I/O occurs.

## Pattern

Ubiquitous (applies to every plan YAML with source_type "spec" regardless of plan_type).

## Priority

P0 -- schema validation is the entry gate; all adapter operations depend on validated input.

## Category

Functional

## Context

ADR-002 D-1 specifies the SPEC extension to the plan YAML schema, adding a subtree_manifest field with a structured manifest of root and child files. ADR-002 D-5 specifies the Zod shape for specSubtreeManifestSchema with root (source_path + mutations) and children (array of source_path + dest_path + mutations + optional filename_rewrite_map).

The schema must validate:
- Root entry has source_path (string) and mutations (MutationSpec with renumber_map, wikilink_map, optional frontmatter_map)
- Children array contains entries with source_path, dest_path, mutations, and optional filename_rewrite_map
- All renumber_map entries across root and children are injective with disjoint key-value domains (reusing the injectiveDisjointMap validator from SPEC-001 REQ-005-SPEC-001)
- All wikilink_map entries across root and children are injective with disjoint key-value domains
- All output paths (dest_path in children) pass path containment validation (reusing containedPathSchema from SPEC-001 REQ-005-SPEC-001)

Both distribution and composition plan variants for source_type "spec" use the subtree_manifest. The distribution variant decomposes one SPEC into multiple SPECs. The composition variant merges multiple SPECs into one.

## Acceptance Criteria

- [ ] Given a valid SPEC distribution plan YAML with subtree_manifest containing root + 3 children, when parsed via planSchema.parseAsync(), then validation succeeds and returns a typed Plan object with source_type "spec"

- [ ] Given a SPEC plan YAML where a child entry's renumber_map has duplicate values (non-injective), when parsed via planSchema.parseAsync(), then a PlanValidationError is raised identifying the child entry and the non-injective field

- [ ] Given a SPEC plan YAML where a child entry's dest_path escapes the docs/ root via path traversal, when parsed via planSchema.parseAsync(), then a PlanValidationError is raised identifying the path containment violation

- [ ] Given a SPEC plan YAML missing the subtree_manifest field, when parsed via planSchema.parseAsync(), then a Zod validation error is raised for the missing required field

- [ ] Given a SPEC plan YAML with an empty children array (root only, no child files), when parsed, then validation succeeds (empty children is valid for a SPEC with no REQ/DESIGN/TASK notes)

## Implementation Notes

The specSubtreeManifestSchema extends the SPEC-specific plan schema files at _shared/composition/schemas/distribution/spec.plan.schema.ts and _shared/composition/schemas/composition/spec.plan.schema.ts. It is registered in the discriminated union assembly at schemas/index.ts. The schema reuses existing validators (injectiveDisjointMap, containedPathSchema) from SPEC-001 to avoid duplication.

## Observations

- [requirement] specSubtreeManifestSchema validates root/children structure with per-entry mutation specs and injectivity constraints at plan load time #schema #validation
- [constraint] All renumber_map and wikilink_map entries must be injective with disjoint key-value domains per ADR-001 F-8 + ADR-002 D-5 #injectivity #blocking
- [technique] Reuses injectiveDisjointMap and containedPathSchema validators from SPEC-001 REQ-005-SPEC-001 #reuse #validators
- [decision] Both distribution and composition variants use subtree_manifest; the manifest structure is plan_type-agnostic #schema #unified

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- depends_on [[REQ-005-SPEC-001: Injectivity and Path Containment Validators]]
- depends_on [[REQ-004-SPEC-001: Zod Plan Validator Base]]