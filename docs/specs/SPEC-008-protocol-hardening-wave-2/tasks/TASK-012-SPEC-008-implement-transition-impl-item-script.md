---
title: 'TASK-012-SPEC-008: Implement transition-impl-item Script'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-012-spec-008-implement-transition-impl-item-script-1
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

# TASK-012-SPEC-008: Implement transition-impl-item Script

## Design Context

Implements the `skills/build/scripts/transition-impl-item.ts` row of [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]] Module Structure.

## Objective

Create the mutation-script wrapper that invokes `applyPlanMutation` with the `transition-impl-item` mutation on a PLAN note, so the build skill's PLAN state transitions for impl items are shell-composable and schema-validated post-flip.

## Scope

In Scope:

- `skills/build/scripts/transition-impl-item.ts`
- `skills/build/scripts/transition-impl-item.test.ts`

Out of Scope:

- The applyPlanMutation library code (Wave 1)
- QA-item transition (TASK-013)

## Files Affected

| File | Action | Description |
| --- | --- | --- |
| `skills/build/scripts/transition-impl-item.ts` | Create | CLI wrapper invoking applyPlanMutation with transition-impl-item |
| `skills/build/scripts/transition-impl-item.test.ts` | Create | Asserts mutation success, post-flip schema validation, and required-arg errors |

## Definition of Done

- [ ] Script accepts plan-path, item-id, target-status, owning-session, at-event flags from `Bun.argv`
- [ ] Script reads the PLAN, validates path-containment, invokes `applyPlanMutation` with the transition-impl-item mutation, writes the result back, and exits 0/1/2 per the contract
- [ ] Required-arg validation rejects missing owning-session or at-event with exit 2
- [ ] Colocated test asserts exit 0 on a successful PENDING-to-IN_PROGRESS transition with all required args
- [ ] Colocated test asserts exit 1 on attempted transition that violates PLAN schema cross-field invariants
- [ ] Colocated test asserts exit 2 on missing required-args
- [ ] Script imports only from `shared/composition/src/` plus Node and Bun standard runtime
- [ ] biome lint plus tsc --noEmit pass on the new files

## ADR Compliance

- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-1 per-skill scripts pattern
- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 security boundary path-containment requirement

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 2d | Multi-flag CLI plus mutation plumbing |
| AI-Dominant | 0.5d | applyPlanMutation API is mechanical |
| AI-Assisted | 1d | Required-arg invariants need careful enumeration |

## Observations

- [task] Script wraps applyPlanMutation no business logic in the script itself #thin-wrapper
- [constraint] Mutations transition-impl-item mandates owning-session and at-event context per Wave 1 schema #required-args
- [decision] Post-mutation file write uses Bun.write to atomically replace the PLAN markdown #atomic-write

## Relations

- implements [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]]
- implements [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
