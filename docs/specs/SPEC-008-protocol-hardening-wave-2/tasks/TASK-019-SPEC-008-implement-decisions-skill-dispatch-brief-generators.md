---
title: 'TASK-019-SPEC-008: Implement decisions-Skill Dispatch-Brief Generators'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-019-spec-008-implement-decisions-skill-dispatch-brief-generators-1
status: DONE
effort: M
estimate: 2d
tags:
- task
- spec-008
- track-2
- decisions-skill
- dispatch-brief
---

# TASK-019-SPEC-008: Implement decisions-Skill Dispatch-Brief Generators

## Design Context

Implements the `skills/decisions/scripts/dispatch-architect.ts` and `skills/decisions/scripts/dispatch-decision-critic.ts` rows of [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]] Module Structure.

## Objective

Create two programmatic dispatch-brief generator scripts so the decisions skill's architect and decision-critic dispatches receive briefs that import cross-cutting constants and the structural ADR requirements that validateAdrAcceptedClaim enforces.

## Scope

In Scope:

- `skills/decisions/scripts/dispatch-architect.ts` plus `.test.ts`
- `skills/decisions/scripts/dispatch-decision-critic.ts` plus `.test.ts`

Out of Scope:

- The validateAdrAcceptedClaim implementation (Track 1)
- Build / research / review brief generators

## Files Affected

| File | Action | Description |
| --- | --- | --- |
| `skills/decisions/scripts/dispatch-architect.ts` | Create | Architect brief generator; includes ADR structural requirements |
| `skills/decisions/scripts/dispatch-architect.test.ts` | Create | Asserts structural mandate presence and determinism |
| `skills/decisions/scripts/dispatch-decision-critic.ts` | Create | Decision-critic brief generator; includes adversarial-reviewer mandate |
| `skills/decisions/scripts/dispatch-decision-critic.test.ts` | Create | Asserts reviewer-asymmetry mandate presence and determinism |

## Definition of Done

- [x] dispatch-architect accepts ADR scope args, emits architect brief including structural ADR requirements (Considered Options with rationale, Clarifications section, etc.) imported from the AdrNoteSchema requirements
- [x] dispatch-decision-critic accepts analysis-option set args, emits decision-critic brief including the adversarial-reviewer asymmetry mandate verbatim
- [x] Both scripts include the `if (import.meta.main)` CLI guard
- [x] Colocated tests assert determinism and structural-mandate presence
- [x] Scripts import only from `shared/composition/src/` plus Node and Bun standard runtime
- [x] biome lint plus tsc --noEmit pass on the new files

## ADR Compliance

- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-4 programmatic per-skill brief-generator pattern
- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-4 brief-generator trust-boundary section

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 5d | Two generators plus mandate-content drafting |
| AI-Dominant | 2d | Reuses pattern from TASK-018 |
| AI-Assisted | 3d | Reviewer-asymmetry mandate authoring |

## Observations

- [task] Two brief generators for the decisions skill architect for ADR authoring decision-critic for adversarial stress-test #decisions-skill
- [decision] Architect brief imports the structural ADR requirements that AdrNoteSchema enforces so brief stays in sync with the schema #single-source-of-truth
- [constraint] Decision-critic brief includes the reviewer-asymmetry mandate verbatim so the critic's role boundary is unambiguous #reviewer-asymmetry

## Relations

- implements [[REQ-005-SPEC-008: Per-Skill Dispatch-Brief Generator Scripts]]
- implements [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[TASK-007-SPEC-008: Implement validateAdrAcceptedClaim]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
- relates_to [[QA-072-SPEC-008: Validation Report for TASK-019 Decisions Dispatch-Brief Generators]]
