---
title: 'TASK-004-SPEC-005: Implement Adapter Dispatcher with Incremental Registration'
type: task
status: DONE
effort: S
estimate: 0.5d
permalink: specs/spec-005-decompose-and-recompose-skills/tasks/task-004-spec-005-implement-adapter-dispatcher-with-incremental-registration
tags:
- task
- adapter-registry
- dispatcher
- incremental
- spec-005
---

# TASK-004-SPEC-005: Implement Adapter Dispatcher with Incremental Registration

## Design Context

- DESIGN-003-SPEC-005: Adapter Registry and Dispatcher -- implements all 3 components (registry module, dispatcher function, registration extension point)

## Objective

Create the adapter registry module at _shared/composition/src/registry.ts that maps source_type strings to CompositionAdapter instances. Implement the getAdapter() dispatcher function with structured error messages for unregistered types. Register the ADR adapter (from SPEC-001) as the initial and only adapter at SPEC-005 ship time. Include commented-out imports for future adapters with SPEC references.

## Definition of Done

- [x] _shared/composition/src/registry.ts created with registry Record, adapterSpecMap, and getAdapter() function
- [x] ADR adapter registered via import from ./adapters/adr
- [x] getAdapter("adr") returns AdrAdapter instance
- [x] getAdapter("analysis") returns AnalysisAdapter (SPEC-002 shipped — registered; deviation from original SPEC-005 DoD wording noted in State Changes)
- [x] getAdapter("session") returns SessionAdapter (SPEC-002 shipped — registered; deviation from original SPEC-005 DoD wording)
- [x] getAdapter("plan") returns PlanAdapter (SPEC-003 shipped — registered; deviation from original SPEC-005 DoD wording)
- [x] getAdapter("spec") returns SpecSubtreeAdapter (SPEC-004 shipped — registered; deviation from original SPEC-005 DoD wording)
- [x] getAdapter("bogus") throws error listing valid registered types
- [x] Unit tests cover all 7 assertions above (adjusted: SPEC-002/003/004 adapters return instances rather than throwing, since those SPECs shipped)


## Scope

**In Scope**:

- _shared/composition/src/registry.ts
- Unit tests for getAdapter()

**Out of Scope**:

- Adapter class implementations (SPEC-001 through SPEC-004)
- Modifications to existing adapter files

## Files Affected

| File | Action | Description |
|---|---|---|
| _shared/composition/src/registry.ts | Create | Adapter registry and dispatcher |
| _shared/composition/src/registry.test.ts | Create | Unit tests for dispatcher |

## Effort

| Tier | Human | AI-Dominant | AI-Assisted |
|---|---|---|---|
| S | 1.5d | 0.5d | 1d |

## Observations

- [fact] Status: TODO #status
- [fact] Size tier: S -- single module (~40 LOC) with simple Record + function; extensive test coverage for error paths #estimation
- [decision] Static import-based registration; no dynamic plugin discovery per DESIGN-003 #static-registry

## Relations

- implements [[DESIGN-003-SPEC-005: Adapter Registry and Dispatcher]]
- implements [[REQ-004-SPEC-005: Adapter Registry Dispatcher]]
- part_of [[SPEC-005: Decompose and Recompose Skills]]
- depends_on [[SPEC-001: Composition Core and ADR Adapter]]
- validated_by [[QA-039-SPEC-005: Batched Build Revalidation]]
