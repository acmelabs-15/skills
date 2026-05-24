---
title: 'REQ-003-SPEC-008: New Claim Validator Suite'
type: requirement
permalink: specs/spec-008-protocol-hardening-wave-2/requirements/req-003-spec-008-new-claim-validator-suite
status: DRAFT
tags:
- requirement
- spec-008
- claim-validator
- wave-2
- coverage
---

# REQ-003-SPEC-008: New Claim Validator Suite

## EARS

WHEN an agent claims a Brain note has reached a terminal status (ADR ACCEPTED, ANALYSIS ACCEPTED, EPIC DONE, or PLAN DONE)
THE SYSTEM SHALL expose four new claim validator functions (`validateAdrAcceptedClaim`, `validateAnalysisAcceptedClaim`, `validateEpicDoneClaim`, `validatePlanDoneClaim`) at `shared/composition/src/validators/` that re-parse the claimed note, run the structural checks documented in ADR-005 D-5, and return a rich `unsatisfied` array enumerating any failing items
SO THAT the hook layer (Track 5) and per-skill scripts (Track 2) can reject lying claims at write-time without depending on the orchestrator to remember to invoke the check.

## Pattern

Claim Validator (Pure Function: parsed note in, structured findings out; never mutates).

## Priority

P0 — claim validators are the runtime enforcement surface for the rigid per-TASK build plus QA protocol; without them the schemas remain documentation.

## Category

Functional plus Quality (enforcement of structural claims is both feature and reliability concern).

## Context

[[ADR-005: Protocol Hardening Wave 2 Architecture]] D-5 names the four claim validators in scope and documents their structural checks. CRIT explicitly has NO claim validator per D-5 ("P1; structural support for adr-review convergence"); the CRIT schema (REQ-001) and parser (REQ-002) cover its read-time validation, but no terminal-status claim exists for CRIT. [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]] Audit A flagged `validatePlanDoneClaim` as the only mechanical-check gap among the Wave 1 schemas (PLAN had schema plus 11 mutations plus renderer plus parser but no done-claim validator). The four validators follow the Wave 1 pattern at `shared/composition/src/validators/task-claim-validator.ts` — pure functions returning `{ ok: boolean, unsatisfied: Array<{ path, reason }> }`.

## Acceptance Criteria

- [ ] GIVEN an ADR note with status ACCEPTED and one Clarifications item with an unchecked `[ ]` checkbox WHEN `validateAdrAcceptedClaim(adrNote)` is called THEN it returns `{ ok: false, unsatisfied: [...] }` with at least one entry naming the unchecked clarification
- [ ] GIVEN an ADR note with status ACCEPTED and a Considered Options section where one option lacks a rationale field WHEN `validateAdrAcceptedClaim(adrNote)` is called THEN it returns `{ ok: false }` naming the option without rationale
- [ ] GIVEN an ANALYSIS note with status ACCEPTED and a `## Open Questions` section present WHEN `validateAnalysisAcceptedClaim(analysisNote)` is called THEN it returns `{ ok: false }` identifying the forbidden section
- [ ] GIVEN an EPIC note with status DONE and a `contains` relation pointing to a SPEC whose status is not DONE WHEN `validateEpicDoneClaim(epicNote, { resolveSpec })` is called with a resolver that reads contained SPEC notes THEN it returns `{ ok: false }` naming the non-DONE child SPEC
- [x] GIVEN a PLAN note with status DONE and one part whose substatus is `IN_PROGRESS` WHEN `validatePlanDoneClaim(planNote)` is called THEN it returns `{ ok: false }` naming the non-terminal part (closed by TASK-010-SPEC-008 2026-05-24 SESSION-2026-05-23_02 Event 70; QA-058 PASS)
- [x] GIVEN a PLAN note with status DONE and every part in a terminal substatus (DONE, DEFERRED, or ABANDONED) WHEN `validatePlanDoneClaim(planNote)` is called THEN it returns `{ ok: true, unsatisfied: [] }` (closed by TASK-010-SPEC-008 2026-05-24 SESSION-2026-05-23_02 Event 70; QA-058 PASS)
- [ ] GIVEN any of the four validators WHEN it is called with a note whose status is NOT the targeted terminal status (e.g., calling `validateAdrAcceptedClaim` on an ADR with status PROPOSED) THEN it returns `{ ok: true }` (the validator only fires at terminal transitions)
- [ ] GIVEN `validateEpicDoneClaim` WHEN no `resolveSpec` resolver is provided and the EPIC has at least one `contains` relation THEN the validator throws an explicit error naming the missing resolver dependency (no silent pass)

## Implementation Notes

Each validator lives at `shared/composition/src/validators/<verb>-claim-validator.ts` mirroring the Wave 1 pattern. The validators are pure with one exception: `validateEpicDoneClaim` requires a `resolveSpec: (id) => SpecRootNote` callback because it must inspect the status of every SPEC in the `contains` relation. Per ADR-005 D-5 Phase 3 resolution (critic P1.1), the cross-note resolver mechanism is explicit and required; passing `validateEpicDoneClaim` without a resolver when relations exist must fail loudly. The PLAN done-claim check reads the `parts` array from the parsed PlanNote (per REQ-002 PLAN parser verification) and scans for any substatus not in `{ DONE, DEFERRED, ABANDONED }`. The ADR validator checks: (a) status field is ACCEPTED; (b) Clarifications section has no unchecked `[ ]` items; (c) every Considered Option entry has a non-empty rationale field. The ANALYSIS validator checks: status is ACCEPTED AND no `## Open Questions` section is present (per the no-open-questions-in-planning-artifacts inline principle).

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/src/validators/adr-claim-validator.ts` | NEW | validateAdrAcceptedClaim |
| `shared/composition/src/validators/analysis-claim-validator.ts` | NEW | validateAnalysisAcceptedClaim |
| `shared/composition/src/validators/epic-claim-validator.ts` | NEW | validateEpicDoneClaim with resolveSpec dependency |
| `shared/composition/src/validators/plan-claim-validator.ts` | NEW | validatePlanDoneClaim (parts all terminal) |
| `shared/composition/src/validators/index.ts` | MODIFY | Re-export the four new validators from the barrel module |

## Observations

- [requirement] Four new claim validators close the runtime-enforcement coverage gap; CRIT is excluded per D-5 because no terminal-status claim exists for CRIT #claim-validator #wave-2 #d-5
- [decision] `validateEpicDoneClaim` is the only validator with a cross-note dependency; the resolveSpec callback is mandatory whenever the EPIC has contains relations #cross-note-resolver #critic-p1-1
- [constraint] Validators are pure functions returning `{ ok, unsatisfied }`; no mutation, no I/O, no logging side effects #pure-function #wave-1-parity
- [technique] `validatePlanDoneClaim` reuses the `parts` array exposed by the existing PLAN parser; no schema change beyond the REQ-001 superRefine extension #parser-reuse

## Relations

- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[REQ-001-SPEC-008: New Schema Suite]]
- depends_on [[REQ-002-SPEC-008: New Parser Suite]]
