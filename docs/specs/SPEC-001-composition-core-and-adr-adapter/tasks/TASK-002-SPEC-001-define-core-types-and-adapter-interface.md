---
title: 'TASK-002-SPEC-001: Define Core Types and Adapter Interface'
type: task
permalink: specs/spec-001-composition-core-and-adr-adapter/tasks/task-002-spec-001-define-core-types-and-adapter-interface
status: TODO
effort: S
estimate: 0.5d
tags:
- task
- spec-001
- types
- interface
---

# TASK-002-SPEC-001: Define Core Types and Adapter Interface

## Design Context

This TASK realizes DESIGN-002-SPEC-001 section "Interfaces" -- the complete TypeScript type hierarchy.

## Objective

Define CompositionAdapter interface, LineRange, RenumberMap, WikilinkMap, FrontmatterMap, and MutationSpec types in src/core/types.ts and src/core/adapter.ts.

## Scope

**In Scope**:
- types.ts with all 5 shared types (LineRange, RenumberMap, WikilinkMap, FrontmatterMap, MutationSpec)
- adapter.ts with CompositionAdapter interface (5 methods + sourceType property)
- JSDoc comments on all types and methods matching ADR-002 D-2 specification

**Out of Scope**:
- Implementation of the interface (handled by TASK-004 BaseMarkdownAdapter and TASK-008 ADR adapter)

## Implementation Notes

Types must exactly match the signatures in ADR-002 D-2. The Root type import comes from mdast package. All methods synchronous. JSDoc must document the canonical call sequence (parse, extractByRange, applyMutations, reverseMutations, serialize) and the round-trip / inverse contracts.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| _shared/composition/src/core/types.ts | NEW | Shared type definitions |
| _shared/composition/src/core/adapter.ts | NEW | CompositionAdapter interface |

## Testing Requirements

- tsc --noEmit passes with no type errors
- A stub class implementing CompositionAdapter compiles successfully

## Definition of Done

- [ ] types.ts exports LineRange, RenumberMap, WikilinkMap, FrontmatterMap, MutationSpec matching ADR-002 D-2
- [ ] adapter.ts exports CompositionAdapter interface with all 5 methods + sourceType
- [ ] JSDoc on all types and methods per ADR-002 D-2 specification
- [ ] tsc --noEmit passes

## ADR Compliance

- [ ] Honors ADR-002 D-2: interface matches specification exactly
- [ ] Honors ADR-001 D-2: Root type from mdast

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.5d | Type definitions from spec |
| AI-Dominant | 0.5d | Direct transcription from ADR-002 |
| AI-Assisted | 0.5d | Autocomplete from spec |

## Observations

- [requirement] Core types and interface form the contract boundary between Zod schemas and adapter implementations #types #contract
- [technique] JSDoc on interface methods documents call sequence and contracts for implementors #documentation #jsdoc
- [constraint] All methods synchronous per ADR-002 Axis 1 decision #sync #interface

## Relations

- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[DESIGN-002-SPEC-001: CompositionAdapter Interface and Type Hierarchy]]
- implements [[REQ-001-SPEC-001: CompositionAdapter Interface Contract]]
- depends_on [[TASK-001-SPEC-001: Scaffold Composition Project]]