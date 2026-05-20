---
title: 'REQ-004-SPEC-001: Zod Plan Validator Base'
type: requirement
permalink: specs/spec-001-composition-core-and-adr-adapter/requirements/req-004-spec-001-zod-plan-validator-base
status: DRAFT
tags:
- requirement
- spec-001
- zod
- validation
---

# REQ-004-SPEC-001: Zod Plan Validator Base

## Requirement Statement

WHEN the deterministic script loads a plan YAML file
THE SYSTEM SHALL validate it against a Zod schema using a nested discriminatedUnion on plan_type (distribution vs composition) and source_type per ADR-002 D-5
SO THAT malformed plans are rejected at script entry before any file I/O occurs.

## Pattern

Event-Driven (triggered at script entry when plan YAML is loaded and parsed).

## Priority

P0 — Zod validation is the first gate before any content modification per ADR-001 D-1.

## Category

Functional

## Context

ADR-002 D-1 specifies the plan YAML schema shape with a nested discriminated union. ADR-002 D-5 specifies the modular Zod validator structure: base.ts defines common envelope fields and shared types; per-type schemas in distribution/ and composition/ subdirectories extend the base; index.ts assembles the nested discriminated union. The outer discriminant is plan_type (distribution vs composition). Each branch contains an inner z.discriminatedUnion("source_type", [...]) selecting per-type extensions. SPEC-001 scaffolds the base schema plus the ADR-specific extension (2 of 10 variants); SPEC-002 and SPEC-003 extend with additional source_type variants.

## Acceptance Criteria

- [ ] GIVEN a base Zod schema at _shared/composition/schemas/base.ts
      WHEN compiled
      THEN it exports lineRangeSchema, renumberMapSchema, wikilinkMapSchema, frontmatterMapSchema, mutationSpecSchema, validationSchema, sourceEntrySchema, and destinationEntrySchema

- [ ] GIVEN ADR-specific distribution schema at schemas/distribution/adr.plan.schema.ts
      WHEN a valid ADR distribution plan YAML is parsed
      THEN the schema validates successfully with section_delimiter: "### " and D-N pattern renumber_map keys

- [ ] GIVEN ADR-specific composition schema at schemas/composition/adr.plan.schema.ts
      WHEN a valid ADR composition plan YAML is parsed
      THEN the schema validates successfully with plural sources and singular destination

- [ ] GIVEN index.ts assembling the nested discriminated union
      WHEN a plan YAML with plan_type "distribution" and source_type "adr" is parsed via planSchema.parseAsync()
      THEN TypeScript narrows the type to the ADR distribution variant

- [ ] GIVEN a malformed plan YAML (missing required fields, wrong types)
      WHEN parsed via planSchema.parseAsync()
      THEN it throws ZodError with structured PlanValidationError array output

- [ ] GIVEN a plan YAML with non-injective renumber_map
      WHEN parsed
      THEN the injectivity validator rejects it with a descriptive error message

## Implementation Notes

The schema uses parseAsync() due to the async path containment validator (realpath-based). All other validators are synchronous. The error reporting maps ZodError.issues to the PlanValidationError interface (path, message, severity) per ADR-002 D-5. SPEC-001 scaffolds index.ts with only the ADR variants; other source_type variants are added by SPEC-002 and SPEC-003.

## Observations

- [requirement] Zod base schema provides common envelope and shared types for the nested discriminated union plan validation #zod #schema
- [decision] Nested discriminatedUnion (plan_type x source_type) replaces flat 10-variant union per ADR-002 D-5 #schema-design #type-narrowing
- [constraint] parseAsync required due to async path containment validator; all other validators synchronous #async #validation
- [technique] SPEC-001 scaffolds ADR-only variants in the union; extensible by adding variants in SPEC-002 and SPEC-003 #incremental #extensibility

## Relations

- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- implements [[ADR-001: Composition Library Architecture]]
