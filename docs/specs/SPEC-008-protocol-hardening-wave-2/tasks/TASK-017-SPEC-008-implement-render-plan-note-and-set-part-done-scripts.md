---
title: 'TASK-017-SPEC-008: Implement render-plan-note and set-part-done Scripts'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-017-spec-008-implement-render-plan-note-and-set-part-done-scripts
status: DONE
effort: M
estimate: 1d
tags:
- spec-008
- track-2
- plan-skill
- render-script
- mutation-script
---

# TASK-017-SPEC-008: Implement render-plan-note and set-part-done Scripts

## Design Context

Implements the `skills/plan/scripts/render-plan-note.ts` and `skills/plan/scripts/set-part-done.ts` rows of [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]] Module Structure. These are the two plan-skill gate-point scripts named in [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]] Files Affected.

## Objective

Create the two plan-skill scripts: (1) `render-plan-note.ts` drives the PLAN deterministic renderer (the X.D.2 PlanNote renderer that emits per-TASK impl + qa dispatch-instruction blocks) and writes the rendered PLAN markdown back; (2) `set-part-done.ts` invokes `applyPlanMutation` with the `set-part-substatus` / `set-part-done` mutation so a phase skill's Contract-1 completion signal flips the matching PLAN part substatus to DONE (or DEFERRED/ABANDONED with rationale) deterministically.

## Scope

In Scope:

- `skills/plan/scripts/render-plan-note.ts`
- `skills/plan/scripts/render-plan-note.test.ts`
- `skills/plan/scripts/set-part-done.ts`
- `skills/plan/scripts/set-part-done.test.ts`

Out of Scope:

- The `applyPlanMutation` implementation and the PlanNote renderer themselves (Wave 1 + Phase X.D.2; this TASK wraps them)
- Other plan-skill scripts not named in REQ-004

## Files Affected

| File | Action | Description |
| --- | --- | --- |
| `skills/plan/scripts/render-plan-note.ts` | Create | CLI wrapper invoking the PlanNote renderer; reads PLAN, renders, writes back |
| `skills/plan/scripts/render-plan-note.test.ts` | Create | Asserts render is deterministic (same input = same output) and round-trips |
| `skills/plan/scripts/set-part-done.ts` | Create | CLI wrapper invoking applyPlanMutation set-part-substatus to DONE/DEFERRED/ABANDONED |
| `skills/plan/scripts/set-part-done.test.ts` | Create | Asserts part substatus flip + rationale requirement for non-DONE terminal states |

## Definition of Done

- [x] `render-plan-note.ts` accepts a plan-path flag, reads the PLAN via `Bun.file().text()`, invokes the PlanNote renderer from `shared/composition/src/`, writes the rendered markdown back, exits 0 on success / non-zero on render error
- [x] `render-plan-note.test.ts` asserts determinism: rendering the same PLAN twice produces byte-identical output
- [x] `set-part-done.ts` accepts plan-path, part-id, status (DONE|DEFERRED|ABANDONED), outcome-wikilink, owning-session, at-event, and optional rationale flags
- [x] `set-part-done.ts` invokes `applyPlanMutation` with the part-substatus mutation, writes the result back, exits 0/1/2 per the DESIGN-002 CLI contract
- [x] `set-part-done.ts` exits non-zero with a stderr message when status is DEFERRED or ABANDONED and no rationale flag is supplied
- [x] `set-part-done.test.ts` asserts the part substatus flips to the target status and that the rationale-required invariant holds for non-DONE terminal states
- [x] Both scripts include the `if (import.meta.main)` CLI guard and validate path-containment before reading the PLAN file
- [x] Both scripts import only from `shared/composition/src/` plus Node and Bun standard runtime
- [x] biome lint plus `tsc --noEmit` pass on all four new files

## ADR Compliance

- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-1 per-skill scripts pattern (thin wrappers importing from shared/composition)
- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-4 deterministic-output requirement (render-plan-note is a generator; same args = same output)
- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 security boundary path-containment requirement

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 4d | Two CLI scripts + renderer driver + mutation wrapper + determinism tests |
| AI-Dominant | 1d | Renderer + applyPlanMutation handle the structural work; scripts are thin |
| AI-Assisted | 2d | Determinism + rationale-requirement test coverage |

## Observations

- [fact] Two plan-skill scripts close the Audit B gate-point gap for the plan lifecycle skill #plan-skill #audit-b
- [decision] render-plan-note is the dispatch-brief source for the per-TASK build cycle; it must be deterministic so dispatch briefs are reproducible #determinism #dispatch-brief
- [constraint] set-part-done enforces rationale-required for DEFERRED/ABANDONED per PLAN-part substatus enum (Contract 7) #status-enum #rationale
- [constraint] Path-containment per D-8 security boundary; same rule as build-skill and decisions-skill scripts #security #path-containment

## Relations

- implements [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]]
- implements [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]]]
- relates_to [[QA-070-SPEC-008: Validation Report for TASK-017 Render Plan Note and Set Part Done Scripts]]
