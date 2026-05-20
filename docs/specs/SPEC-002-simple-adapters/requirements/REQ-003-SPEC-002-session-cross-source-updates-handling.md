---
title: 'REQ-003-SPEC-002: SESSION Cross-Source Updates Handling'
type: requirement
status: DRAFT
permalink: specs/spec-002-simple-adapters/requirements/req-003-spec-002-session-cross-source-updates-handling
tags:
- requirement
- spec-002
- cross-source
- session-adapter
---

# REQ-003-SPEC-002: SESSION Cross-Source Updates Handling

## Requirement Statement

WHEN a SESSION decomposition or recomposition plan includes cross_source_updates that affect PLAN note parts (owning_session and completing_session fields),
THE SYSTEM SHALL emit a cross_source_updates field in the plan output specifying the target PLAN note, the affected part identifiers, and the new field values,
SO THAT the PLAN adapter (when available in SPEC-003) can apply coordinated updates atomically and the SESSION adapter aborts if the PLAN adapter rejects the update.

## EARS Pattern: Event-Driven

The requirement activates when a SESSION decomposition plan YAML includes a cross_source_updates array. The SESSION adapter emits these updates as structured data in the plan output. The execution engine coordinates with the PLAN adapter for application.

## Context

ADR-002 D-3 specifies that SESSION decomposition may require updates to PLAN parts. When a SESSION note is split, the owning_session and completing_session fields on PLAN parts must be updated to reference the correct destination SESSION note. ADR-002 D-1 defines the cross_source_updates schema shape within the plan YAML.

The SESSION adapter does NOT directly mutate PLAN content. Instead, it emits cross_source_updates as structured data in the plan output. The execution engine (decompose.ts or recompose.ts from SPEC-005) coordinates with the PLAN adapter to apply these updates. If the PLAN adapter rejects an update (e.g., target PLAN part not found, validation failure), the entire SESSION decomposition operation aborts per the all-or-nothing rollback protocol from ADR-001 F-8.

This separation ensures the SESSION adapter stays within BaseMarkdownAdapter scope while the cross-source coordination protocol handles the PLAN interaction.

## Acceptance Criteria

- [ ] GIVEN a SESSION decomposition plan with cross_source_updates array
      WHEN the SESSION adapter processes the plan
      THEN it includes the cross_source_updates field in the structured plan output with target_note, part_id, field_name, and new_value for each update

- [ ] GIVEN cross_source_updates targeting a PLAN note
      WHEN the execution engine coordinates with the PLAN adapter
      THEN the PLAN adapter validates and applies each update atomically

- [ ] GIVEN a cross_source_updates entry where the target PLAN part does not exist
      WHEN the PLAN adapter rejects the update
      THEN the entire SESSION decomposition operation aborts with no partial writes per ADR-001 F-8 rollback protocol

- [ ] GIVEN a SESSION recomposition that reverses a prior decomposition
      WHEN cross_source_updates are present in the inverse plan
      THEN the owning_session and completing_session fields are restored to their original values

## Priority

P1 -- cross-source updates are required for correctness but the PLAN adapter (SPEC-003) must exist before this can be fully exercised. The SESSION adapter emission logic ships in SPEC-002; full integration testing requires SPEC-003.

## Category

Functional

## Implementation Notes

The cross_source_updates schema is defined in ADR-002 D-1. Each entry specifies: target_note (PLAN note permalink), part_id (the phase/part identifier within the PLAN), field_name (owning_session or completing_session), and new_value (the destination SESSION note identifier). The SESSION adapter populates this array during plan processing. The execution engine dispatches updates to the registered PLAN adapter. If no PLAN adapter is registered (SPEC-003 not yet built), the execution engine logs a warning and proceeds without cross-source updates, allowing the SESSION adapter to ship independently.

## Observations

- [requirement] SESSION adapter emits cross_source_updates as structured data; does not directly mutate PLAN content #cross-source #separation
- [constraint] PLAN adapter rejection triggers full SESSION operation abort per ADR-001 F-8 all-or-nothing rollback #rollback #atomicity
- [decision] Graceful degradation when PLAN adapter is not registered: log warning and proceed without cross-source updates #incremental #independence
- [risk] Full integration testing requires SPEC-003 PLAN adapter; SPEC-002 tests cover emission logic only #testing #dependency

## Relations

- part_of [[SPEC-002: Simple Adapters]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- implements [[ADR-001: Composition Library Architecture]]
- depends_on [[REQ-002-SPEC-002: SESSION Adapter Implementation]]