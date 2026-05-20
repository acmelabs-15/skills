---
title: 'REQ-004-SPEC-002: Adapter Registry Extension'
type: requirement
status: DRAFT
permalink: specs/spec-002-simple-adapters/requirements/req-004-spec-002-adapter-registry-extension-1
tags:
- requirement
- spec-002
- registry
- dispatcher
---

# REQ-004-SPEC-002: Adapter Registry Extension

## Requirement Statement

WHEN the composition library initializes,
THE SYSTEM SHALL register ANALYSIS and SESSION adapters in the adapter dispatcher alongside the existing ADR adapter from SPEC-001,
SO THAT the CLI source_type discriminator resolves plan YAML source_type values "analysis" and "session" to their respective adapter instances.

## EARS Pattern: Ubiquitous

The requirement applies at composition library initialization time. Every invocation of /decompose or /recompose triggers dispatcher resolution.

## Context

SPEC-001 establishes the adapter dispatcher with the ADR adapter as the initial registration. ADR-002 D-3 specifies incremental adapter registration as new adapters are built. This requirement extends the dispatcher to include ANALYSIS and SESSION adapters, expanding the discriminated union's runtime coverage from 1 source_type to 3.

The dispatcher uses the source_type field from the plan YAML (per ADR-001 D-4 discriminated union) to resolve the correct adapter. Registration is static (compile-time imports) rather than dynamic discovery, keeping the dispatcher simple and type-safe.

## Acceptance Criteria

- [ ] GIVEN the adapter dispatcher module
      WHEN ANALYSIS and SESSION adapters are registered
      THEN the dispatcher resolves source_type "analysis" to AnalysisAdapter and source_type "session" to SessionAdapter

- [ ] GIVEN a plan YAML with source_type "analysis"
      WHEN the dispatcher resolves the adapter
      THEN it returns an instance of AnalysisAdapter that implements CompositionAdapter

- [ ] GIVEN a plan YAML with source_type "session"
      WHEN the dispatcher resolves the adapter
      THEN it returns an instance of SessionAdapter that implements CompositionAdapter

- [ ] GIVEN the Zod discriminated union schema (ADR-001 D-4)
      WHEN ANALYSIS and SESSION variants are added
      THEN the schema validates plan YAMLs with source_type "analysis" or "session" using their type-specific fields

## Priority

P0 -- without registry extension, the new adapters are unreachable from the CLI entry points.

## Category

Functional

## Implementation Notes

Registration involves: (1) importing AnalysisAdapter and SessionAdapter in the dispatcher module, (2) adding entries to the adapter map keyed by source_type string, (3) extending the Zod discriminated union schema with ANALYSIS and SESSION variants. The schema extension adds per-type fields to the existing union defined in SPEC-001 DESIGN-003.

## Observations

- [requirement] Dispatcher extended from 1 adapter (ADR) to 3 adapters (ADR + ANALYSIS + SESSION) via static registration #registry #extension
- [fact] Registration is compile-time static imports, not dynamic discovery, keeping dispatcher type-safe #type-safety #static
- [constraint] Zod discriminated union schema must be extended with ANALYSIS and SESSION variants per ADR-001 D-4 #schema #discriminated-union
- [decision] Static registration chosen over dynamic plugin discovery for simplicity and type safety #design #simplicity

## Relations

- part_of [[SPEC-002: Simple Adapters]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- implements [[ADR-001: Composition Library Architecture]]
- depends_on [[REQ-001-SPEC-002: ANALYSIS Adapter Implementation]]
- depends_on [[REQ-002-SPEC-002: SESSION Adapter Implementation]]