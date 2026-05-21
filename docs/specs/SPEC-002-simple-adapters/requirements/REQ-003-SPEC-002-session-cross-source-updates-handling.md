---
title: 'REQ-003-SPEC-002: SESSION Cross-Source Updates Handling'
type: requirement
status: ACCEPTED
permalink: specs/spec-002-simple-adapters/requirements/req-003-spec-002-session-cross-source-updates-handling
tags:
- requirement
- spec-002
- cross-source
- session-adapter
---

# REQ-003-SPEC-002: SESSION Cross-Source Updates Handling

## Requirement Statement
WHEN a SESSION distribution plan includes a cross_source_updates array specifying updates to sibling PLAN notes,
THE SYSTEM SHALL emit those updates via `SessionAdapter.getCrossSourceUpdates()` as typed `CrossSourceUpdate[]` without applying them,
SO THAT the orchestrator can dispatch application to the appropriate target adapter independently.
## EARS Pattern: Event-Driven
The requirement activates when a SESSION distribution plan YAML includes a cross_source_updates array. The SESSION adapter surfaces these updates via the getCrossSourceUpdates pass-through method. The orchestrator dispatches application to the target adapter.
## Context
ADR-002 D-1 locks the cross_source_updates field name and array position in the SESSION plan schema. ADR-004 D-2 supersedes the element shape: the implemented crossSourceUpdateSchema uses `{target_source_type, target_path, frontmatter_map, wikilink_map}` aligned with the distribution pipeline's map-based transform model.

The SESSION adapter does NOT directly mutate PLAN content. It emits cross_source_updates via the `getCrossSourceUpdates` pass-through method. The orchestrator dispatches application to the registered PLAN adapter when available. This separation ensures the SESSION adapter stays within BaseMarkdownAdapter scope.

Rollback semantics (PLAN adapter rejection triggers SESSION abort) and reversal protocol (recomposition restores original values) are displaced to SPEC-003 per ADR-004 C-7 tracked pre-constraints.
## Acceptance Criteria
- [ ] GIVEN a SESSION distribution plan with cross_source_updates array
      WHEN the SessionAdapter.getCrossSourceUpdates method is called
      THEN it returns the cross_source_updates entries as typed CrossSourceUpdate[] array

- [ ] GIVEN a CrossSourceUpdate entry
      WHEN validated by crossSourceUpdateSchema
      THEN it requires target_source_type (literal "plan"), target_path (non-empty string), and accepts optional frontmatter_map and wikilink_map records

- [ ] GIVEN a SESSION distribution plan without cross_source_updates
      WHEN the SessionAdapter.getCrossSourceUpdates method is called
      THEN it returns an empty array

- [ ] GIVEN a SESSION decompose round-trip test
      WHEN cross_source_updates are present in the plan
      THEN the emission path is exercised and the updates are accessible to the orchestrator for downstream dispatch
## Priority

P1 -- cross-source updates are required for correctness but the PLAN adapter (SPEC-003) must exist before this can be fully exercised. The SESSION adapter emission logic ships in SPEC-002; full integration testing requires SPEC-003.

## Category

Functional

## Implementation Notes
The crossSourceUpdateSchema is defined in `_shared/composition/schemas/distribution/session.plan.schema.ts`. Each entry specifies: target_source_type (literal "plan"), target_path (path to target PLAN note), and optional frontmatter_map and wikilink_map records for structural mapping transforms. The SessionAdapter surfaces these via `getCrossSourceUpdates(content, plan)` as a pass-through. The orchestrator dispatches application when a PLAN adapter is registered. If no PLAN adapter is registered (SPEC-003 not yet built), the orchestrator skips cross-source dispatch and proceeds with the SESSION operation.
## Observations
- [requirement] SESSION adapter emits cross_source_updates via pass-through method; does not directly mutate PLAN content #cross-source #separation
- [decision] Rollback and reversal protocols displaced to SPEC-003 per ADR-004 C-7 tracked pre-constraints #rollback #spec-003
- [decision] Graceful degradation handled by orchestrator skipping cross-source dispatch when PLAN adapter absent #incremental #independence
- [fact] REQ-003 ACs amended 2026-05-21 per ADR-004 D-2 to match pass-through semantics; original AC-3 (rollback) and AC-4 (reversal) displaced to SPEC-003 #amendment #adr-004
- [risk] Full integration testing requires SPEC-003 PLAN adapter; SPEC-002 tests cover emission logic only #testing #dependency
## Relations

- part_of [[SPEC-002: Simple Adapters]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- implements [[ADR-001: Composition Library Architecture]]
- depends_on [[REQ-002-SPEC-002: SESSION Adapter Implementation]]
- implements [[ADR-004: Cross-Source Coordinator Architecture]]
