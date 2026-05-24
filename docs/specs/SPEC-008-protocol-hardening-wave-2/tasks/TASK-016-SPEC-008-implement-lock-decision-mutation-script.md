---
title: 'TASK-016-SPEC-008: Implement lock-decision-mutation Script'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-016-spec-008-implement-lock-decision-mutation-script-1
status: TODO
effort: S
estimate: 0.5d
tags:
- task
- spec-008
- track-2
- decisions-skill
- mutation-script
---

# TASK-016-SPEC-008: Implement lock-decision-mutation Script

## Design Context

Implements the `skills/decisions/scripts/lock-decision-mutation.ts` row of [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]] Module Structure.

## Objective

Create the mutation-script wrapper that invokes `applyPlanMutation` with the `lock-decision` mutation, so the decisions skill's per-D-N decision-lock turn flips the matching PLAN decisions-part substatus and decision-list entry deterministically.

## Scope

In Scope:

- `skills/decisions/scripts/lock-decision-mutation.ts`
- `skills/decisions/scripts/lock-decision-mutation.test.ts`

Out of Scope:

- The applyPlanMutation lock-decision implementation (Wave 1)

## Files Affected

| File | Action | Description |
| --- | --- | --- |
| `skills/decisions/scripts/lock-decision-mutation.ts` | Create | CLI wrapper invoking applyPlanMutation with lock-decision |
| `skills/decisions/scripts/lock-decision-mutation.test.ts` | Create | Asserts lock-decision flip and idempotency |

## Definition of Done

- [x] Script accepts plan-path, decision-id, option-text, owning-session, at-event flags
- [x] Script validates path-containment, invokes applyPlanMutation with the lock-decision mutation, writes the result back, exits 0/1/2 per the contract
- [x] Colocated test asserts the matching `decisions.N` part substatus flips from IN_PROGRESS to DONE when the decision is locked
- [x] Colocated test asserts idempotency: re-running the same lock with identical args is a no-op (exit 0, no rewrite)
- [x] Script imports only from `shared/composition/src/` plus Node and Bun standard runtime
- [x] biome lint plus tsc --noEmit pass on the new files

## ADR Compliance

- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-1 per-skill scripts pattern
- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 security boundary path-containment requirement

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 2d | Multi-flag CLI plus idempotency tests |
| AI-Dominant | 0.5d | applyPlanMutation handles the structural flip |
| AI-Assisted | 1d | Idempotency test coverage |

## Observations

- [task] Wraps applyPlanMutation lock-decision for the decisions skill D-N micro-cycle #decisions-skill
- [decision] Idempotency mandatory; re-running a lock that already happened is a no-op not an error #idempotency
- [constraint] Path-containment per D-8 security boundary same rule as build-skill scripts #d-8

## Relations

- implements [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]]
- implements [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
