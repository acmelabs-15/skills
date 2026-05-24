---
title: 'TASK-013-SPEC-008: Implement transition-qa-item Script'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-013-spec-008-implement-transition-qa-item-script-1
status: TODO
effort: S
estimate: 0.5d
tags:
- task
- spec-008
- track-2
- build-skill
- mutation-script
---

# TASK-013-SPEC-008: Implement transition-qa-item Script

## Design Context

Implements the `skills/build/scripts/transition-qa-item.ts` row of [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]] Module Structure.

## Objective

Create the mutation-script wrapper that invokes `applyPlanMutation` with the `transition-qa-item` mutation, enforcing the cross-field invariants (paired impl item DONE, test_report_ref required when DONE or FAILED).

## Scope

In Scope:

- `skills/build/scripts/transition-qa-item.ts`
- `skills/build/scripts/transition-qa-item.test.ts`

Out of Scope:

- The applyPlanMutation library code
- Impl-item transitions (TASK-012)

## Files Affected

| File | Action | Description |
| --- | --- | --- |
| `skills/build/scripts/transition-qa-item.ts` | Create | CLI wrapper invoking applyPlanMutation with transition-qa-item |
| `skills/build/scripts/transition-qa-item.test.ts` | Create | Asserts cross-field invariants and required-arg validation |

## Definition of Done

- [ ] Script accepts plan-path, item-id, target-status, owning-session, at-event, optional test-report-ref, optional failed-iterations flags
- [ ] Script reads PLAN, validates path-containment, invokes applyPlanMutation, writes the result back, exits 0/1/2 per the contract
- [ ] Colocated test asserts exit 1 when transitioning to DONE without test_report_ref
- [ ] Colocated test asserts exit 1 when the paired impl-item is not yet DONE
- [ ] Colocated test asserts exit 0 on a successful IN_PROGRESS-to-DONE transition with all invariants met
- [ ] Script imports only from `shared/composition/src/` plus Node and Bun standard runtime
- [ ] biome lint plus tsc --noEmit pass on the new files

## ADR Compliance

- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-1 per-skill scripts pattern
- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 security boundary path-containment requirement

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 2d | Cross-field invariant enumeration plus CLI |
| AI-Dominant | 0.5d | applyPlanMutation handles invariants centrally |
| AI-Assisted | 1d | Edge cases (paired impl not DONE etc.) |

## Observations

- [task] Wraps applyPlanMutation transition-qa-item enforcing cross-field invariants centrally #thin-wrapper
- [constraint] test_report_ref MUST be supplied when target status is DONE or FAILED per Wave 1 PlanNoteSchema superRefine #required-args
- [decision] Cross-field invariants enforced by composition library; script only assembles args and surfaces error #single-source-of-truth

## Relations

- implements [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]]
- implements [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
