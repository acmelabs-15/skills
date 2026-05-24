---
title: 'TASK-014-SPEC-008: Implement validate-spec-done and run-pre-flight Scripts'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-014-spec-008-implement-validate-spec-done-and-run-pre-flight-scripts-1
status: TODO
effort: S
estimate: 1d
tags:
- task
- spec-008
- track-2
- end-skill
- validator-script
---

# TASK-014-SPEC-008: Implement validate-spec-done and run-pre-flight Scripts

## Design Context

Implements the `skills/end/scripts/validate-spec-done.ts` and `skills/end/scripts/run-pre-flight.ts` rows of [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]] Module Structure.

## Objective

Create two end-skill gate-point scripts: the SPEC done-claim validator wrapping `validateSpecDoneClaim`, and the pre-flight checklist runner that exercises CONVENTIONS Section 8.1 against a target note.

## Scope

In Scope:

- `skills/end/scripts/validate-spec-done.ts` plus `.test.ts`
- `skills/end/scripts/run-pre-flight.ts` plus `.test.ts`

Out of Scope:

- The validateSpecDoneClaim core logic (Wave 1) and its deferred-notation extension (REQ-008 via TASK-032)
- The hook layer (Track 5)

## Files Affected

| File | Action | Description |
| --- | --- | --- |
| `skills/end/scripts/validate-spec-done.ts` | Create | CLI wrapper invoking validateSpecDoneClaim |
| `skills/end/scripts/validate-spec-done.test.ts` | Create | Asserts exit codes for satisfied and unsatisfied SPEC root |
| `skills/end/scripts/run-pre-flight.ts` | Create | Pre-flight checklist runner for CONVENTIONS Section 8.1 |
| `skills/end/scripts/run-pre-flight.test.ts` | Create | Asserts pass on conformant note, fail on each checklist item |

## Definition of Done

- [ ] validate-spec-done reads a SPEC path, validates path-containment, parses via SpecRootNoteSchema, invokes validateSpecDoneClaim, exits 0/1/2 per the contract
- [ ] run-pre-flight reads any Brain note, enumerates the 11 pre-flight checklist items, surfaces each violation to stderr with the item number from CONVENTIONS Section 8.1
- [ ] Both scripts include the `if (import.meta.main)` CLI guard
- [ ] Colocated tests assert success and failure paths for each script
- [ ] Scripts import only from `shared/composition/src/` plus Node and Bun standard runtime
- [ ] biome lint plus tsc --noEmit pass on the new files

## ADR Compliance

- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-1 per-skill scripts pattern
- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 security boundary path-containment requirement

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 3d | Two scripts plus pre-flight enumeration |
| AI-Dominant | 1d | validateSpecDoneClaim is straightforward; pre-flight needs careful CONVENTIONS Section 8.1 mapping |
| AI-Assisted | 1.5d | Pre-flight item-to-error-message mapping |

## Observations

- [task] Two scripts for the end skill validate-spec-done is the spec done-claim gate run-pre-flight is the CONVENTIONS Section 8.1 enumeration #end-skill
- [decision] run-pre-flight surfaces each failing checklist item with its CONVENTIONS Section 8.1 number not just a generic error #traceability
- [constraint] Both scripts apply path-containment per D-8 security boundary #d-8 #path-containment

## Relations

- implements [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]]
- implements [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
- depends_on [[TASK-032-SPEC-008: Extend validateSpecDoneClaim for Deferred Notation]]
