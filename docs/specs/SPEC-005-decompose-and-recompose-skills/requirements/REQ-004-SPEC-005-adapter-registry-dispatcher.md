---
title: 'REQ-004-SPEC-005: Adapter Registry Dispatcher'
type: requirement
status: DRAFT
permalink: specs/spec-005-decompose-and-recompose-skills/requirements/req-004-spec-005-adapter-registry-dispatcher
tags:
- requirement
- adapter-registry
- dispatcher
- spec-005
- incremental
---

# REQ-004-SPEC-005: Adapter Registry Dispatcher

## Requirement Statement

WHEN the deterministic script receives a validated plan YAML with a source_type field,
THE SYSTEM SHALL resolve the source_type to a registered CompositionAdapter implementation via the adapter registry and dispatch the plan execution to that adapter,
SO THAT the script is decoupled from specific adapter implementations and new adapters can be registered incrementally as their SPECs complete.

## EARS Pattern: Event-Driven

The dispatcher fires when a validated plan YAML enters the script execution phase. The source_type discriminant from the plan YAML selects the adapter.

## Context

Per ADR-001 D-4 (discriminated union on source_type) and ADR-002 D-2 (CompositionAdapter interface), the composition library uses a registry pattern to map source_type strings to adapter instances. At SPEC-005 ship time, only the ADR adapter (from SPEC-001) is registered. As SPEC-002 (ANALYSIS, SESSION), SPEC-003 (PLAN), and SPEC-004 (SPEC subtree) complete, their adapters register incrementally. The dispatcher throws a clear error if an unregistered source_type is requested, directing the user to which SPEC must complete for that adapter.

The registry is a simple Record mapping source_type strings to CompositionAdapter instances, populated at module initialization. The dispatcher function accepts a validated plan and returns the matching adapter, or throws with a structured error. This is not a plugin system or dynamic loader; it is a static registry populated by imports at build time.

Per the P1 amendment from ANALYSIS-001 critic: SPEC-005 explicitly documents that /decompose and /recompose work for ADR adapter ONLY at SPEC-005 ship time. Broader coverage is incremental and depends on the completion status of adapter SPECs (SPEC-002, SPEC-003, SPEC-004).

## Acceptance Criteria

- [ ] Given a plan YAML with source_type "adr" and the ADR adapter registered, when the dispatcher resolves the adapter, then the ADR CompositionAdapter instance is returned
- [ ] Given a plan YAML with source_type "analysis" and no ANALYSIS adapter registered, when the dispatcher attempts resolution, then it throws a structured error naming SPEC-002 as the required SPEC
- [ ] Given a new adapter registered via import, when the registry is queried, then the new adapter is available without changes to the dispatcher logic
- [ ] Given the adapter registry, when all 5 source_type adapters are registered, then the registry contains exactly 5 entries with no duplicates

## Priority

P0 -- The dispatcher is the bridge between plan validation and adapter execution. Without it, neither /decompose nor /recompose can route plans to adapters.

## Category

Functional

## Observations

- [requirement] Adapter registry maps source_type strings to CompositionAdapter instances via static Record #dispatcher #registry
- [decision] Static import-based registration at build time; not a dynamic plugin loader #static-registry #simplicity
- [constraint] At SPEC-005 ship, only ADR adapter registered; dispatcher provides clear error messages for unregistered types #incremental #p1-amendment
- [fact] Registry pattern honors ADR-001 D-4 discriminated union and ADR-002 D-2 interface contract #adr-alignment

## Relations

- part_of [[SPEC-005: Decompose and Recompose Skills]]
- implements [[ADR-001: Composition Library Architecture]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- required_by [[REQ-001-SPEC-005: Decompose Skill Implementation]]
- required_by [[REQ-002-SPEC-005: Recompose Skill Implementation]]