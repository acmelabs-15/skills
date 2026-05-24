---
title: 'TASK-010-SPEC-008: Extend PLAN Schema and Implement validatePlanDoneClaim'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-010-spec-008-extend-plan-schema-and-implement-validate-plan-done-claim
status: TODO
effort: M
estimate: 1d
tags:
- task
- spec-008
- claim-validator
- plan
- wave-2
---

# TASK-010-SPEC-008: Extend PLAN Schema and Implement validatePlanDoneClaim

## Description

Two paired changes delivered as one TASK because they form a single logical unit (the superRefine and the claim validator both enforce the same all-parts-terminal invariant; splitting them risks one landing without the other):

1. Extend the existing `PlanNoteSchema` at `shared/composition/src/schemas/plan-note.ts` with an additive `superRefine` rule rejecting `frontmatter.status === 'DONE'` when any part in `parts[]` has a non-terminal substatus. Terminal substatuses are `DONE`, `DEFERRED`, and `ABANDONED`. The rule per REQ-001 closes the documented Wave 1 gap (PLAN had schema plus mutations plus renderer plus parser but no done-claim enforcement).

2. Implement `validatePlanDoneClaim(planNote: PlanNote): PlanClaimResult` at `shared/composition/src/validators/plan-claim-validator.ts` per REQ-003. The validator is the mechanical-check equivalent that operates on an already-parsed PlanNote; the superRefine is the parse-time guard and the claim validator is the runtime-callable equivalent for the hook layer.

This TASK depends on Track 4 renaming `_shared/` to `shared/`. The existing PLAN parser exposes the `parts` array sufficiently for the validator per REQ-002 verify-only acceptance.

## Definition of Done

- [ ] `PlanNoteSchema` at `shared/composition/src/schemas/plan-note.ts` includes a new `superRefine` arm rejecting status DONE plus any part substatus not in `{ DONE, DEFERRED, ABANDONED }`
- [ ] The existing PlanNoteSchema cross-field invariants are preserved (no regressions; existing tests still pass)
- [ ] File `shared/composition/src/validators/plan-claim-validator.ts` exists and exports `validatePlanDoneClaim` and `type PlanClaimResult`
- [ ] Validator returns `{ ok: true }` when input status is not DONE
- [ ] Validator returns `{ ok: false }` with one unsatisfied entry per non-terminal part when status is DONE
- [ ] Validator returns `{ ok: true }` when status is DONE plus every part substatus is terminal
- [ ] Validator is pure (no I/O, no mutation)
- [ ] Unit tests for the superRefine: valid DONE plus all-terminal parts passes, DONE plus one IN_PROGRESS part rejected, IN_PROGRESS plus mixed parts unaffected, existing Wave 1 PlanNoteSchema tests still pass
- [ ] Unit tests for the validator: DRAFT ok, DONE plus all-terminal ok, DONE plus one non-terminal failure naming the offending part
- [ ] `bun test shared/composition/tests/schemas/plan-note.test.ts shared/composition/tests/validators/plan-claim-validator.test.ts` passes; existing Wave 1 case count plus at least 6 new cases
- [ ] `biome check` passes
- [ ] `tsc --noEmit` passes
- [ ] `shared/composition/src/validators/index.ts` re-exports `validatePlanDoneClaim` and `PlanClaimResult`
- [ ] `shared/composition/src/schemas/index.ts` PlanNoteSchema export is unchanged in name (no API break)

## ADR Compliance

- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-5 (closes the Wave 1 PLAN done-claim gap)
- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-2 (additive extension to existing flat-directory file)
- [ ] Honors [[ADR-001: Composition Library Architecture]] (Zod plus superRefine pattern)
- [ ] Does not regress [[ADR-003: Plan Session Render Architecture]] D-4 (10 schema design decisions preserved)

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/src/schemas/plan-note.ts` | MODIFY | Additive superRefine arm for DONE plus all-terminal parts |
| `shared/composition/src/validators/plan-claim-validator.ts` | NEW | validatePlanDoneClaim |
| `shared/composition/src/validators/index.ts` | MODIFY | Re-export validatePlanDoneClaim and PlanClaimResult |
| `shared/composition/tests/schemas/plan-note.test.ts` | MODIFY | Add cases for the new superRefine rule |
| `shared/composition/tests/validators/plan-claim-validator.test.ts` | NEW | Unit tests for the validator |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1.5d | Two paired changes; care to avoid regressing existing superRefine arms |
| AI-Dominant | 1d | Additive superRefine plus pure validator; pattern fully established |
| AI-Assisted | 1d | Wave 1 reference is complete |

## Observations

- [task] Paired delivery (schema superRefine plus claim validator) closes the Wave 1 PLAN done-claim gap at both parse-time and call-time #plan #claim-validator #paired-delivery
- [decision] Terminal substatuses are DONE, DEFERRED, and ABANDONED; mirrors the existing Wave 1 part-substatus enum #terminal-set
- [constraint] superRefine arm is additive; existing PlanNoteSchema tests must still pass without modification #non-breaking
- [risk] Path uses `shared/`; depends on Track 4 rename #rename-dependency

## Relations

- implements [[REQ-001-SPEC-008: New Schema Suite]]
- implements [[REQ-003-SPEC-008: New Claim Validator Suite]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[DESIGN-001-SPEC-008: Coverage Module Layout]]