---
title: 'TASK-024-SPEC-008: Author ADR ANALYSIS EPIC Adversarial Fixtures'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-024-spec-008-aae-fixtures
status: TODO
effort: S
estimate: 0.5d
tags:
- task
- spec-008
- track-3
- adversarial
- cross-track
---

# TASK-024-SPEC-008: Author ADR ANALYSIS EPIC Adversarial Fixtures

## Description

Once Track 1 lands the new claim validators (`validateAdrAcceptedClaim`, `validateAnalysisAcceptedClaim`, `validateEpicDoneClaim` per REQ-003-SPEC-008), add three new fixture subdirectories under `shared/composition/tests/fixtures/adversarial/` (one each for `adr/`, `analysis/`, `epic/`), author at least one drift fixture per new validator covering its highest-value rejection scenario, and add the corresponding rows to `tests/adversarial-claims.test.ts`. CRIT has no claim validator (per ADR-005 D-5 Implementation Notes) and so receives no adversarial fixture subdirectory.

## Cross-Track Dependency

This task depends on Track 1 (REQ-001-SPEC-008 schemas + REQ-002-SPEC-008 parsers + REQ-003-SPEC-008 claim validators) landing first. Do NOT start TASK-024 until `validateAdrAcceptedClaim`, `validateAnalysisAcceptedClaim`, and `validateEpicDoneClaim` are merged and importable from `shared/composition/src/validators/`.

## Definition of Done

- [ ] Subdirectories exist: `shared/composition/tests/fixtures/adversarial/adr/`, `analysis/`, `epic/`
- [ ] At least one fixture per new subdirectory exists, named `drift-NN-<slug>.md`
- [ ] Suggested high-value fixtures: `adr/drift-01-accepted-with-unchecked-clarification.md` (ADR validator rejects ACCEPTED with `[ ]` Clarifications item per REQ-001 AC-2); `analysis/drift-01-accepted-with-open-questions.md` (ANALYSIS validator rejects ACCEPTED with `## Open Questions` section per REQ-001 AC-3); `epic/drift-01-done-with-unfinished-contained-spec.md` (EPIC validator rejects DONE when a contained SPEC is not DONE per REQ-003-SPEC-008)
- [ ] Each fixture is structurally valid against its type's schema but encodes a lying-claim payload the new validator must reject
- [ ] Three new rows added to `cases` table in `tests/adversarial-claims.test.ts` with the new `validator` tags (`adr`, `analysis`, `epic`)
- [ ] `parseByValidatorType` and `invokeValidator` in `_helpers/adversarial.ts` updated to dispatch to the new parsers and validators
- [ ] `bun test` passes; new cases reject as expected; existing cases unaffected

## ADR Compliance

- [ ] Honors ADR-005 D-3 verbatim post-Wave-2 extension: `adr/`, `analysis/`, `epic/` subdirectories present
- [ ] Honors ADR-005 D-5 Implementation Notes: ANALYSIS, EPIC validators receive adversarial coverage; CRIT does not (no claim validator)
- [ ] Honors REQ-006: harness signature unchanged; only `validator` tag union expands

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/tests/fixtures/adversarial/adr/drift-01-accepted-with-unchecked-clarification.md` | NEW | ADR validator lying-claim fixture |
| `shared/composition/tests/fixtures/adversarial/analysis/drift-01-accepted-with-open-questions.md` | NEW | ANALYSIS validator lying-claim fixture |
| `shared/composition/tests/fixtures/adversarial/epic/drift-01-done-with-unfinished-spec.md` | NEW | EPIC validator lying-claim fixture |
| `shared/composition/tests/_helpers/adversarial.ts` | MODIFY | Extend `parseByValidatorType` and `invokeValidator` for new tags |
| `shared/composition/tests/adversarial-claims.test.ts` | MODIFY | Add three new table rows |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Fixture authoring + dispatch extension |
| AI-Dominant | 0.5d | Pattern-based; extension is mechanical |
| AI-Assisted | 0.5d | Three fixtures + two file modifications |

## Observations

- [task] Track-1 dependency makes this TASK a Wave-2-second-wave deliverable; cannot ship until validators land #cross-track #dependency
- [technique] Harness extension is purely additive: new union members on the `validator` tag, new switch cases in dispatch helpers, zero changes to `testAdversarial` signature #additive-extension
- [constraint] CRIT receives no fixture subdirectory because no claim validator exists for it per ADR-005 D-5 Implementation Notes; do not author a `crit/` subdirectory #explicit-non-coverage

## Relations

- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- implements [[REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set]]
- implements [[DESIGN-003-SPEC-008: Adversarial Test Fixture Layout and Harness Shape]]
- depends_on [[TASK-021-SPEC-008: Implement Adversarial-Claim Test Harness]]
- depends_on [[TASK-023-SPEC-008: Wire Adversarial-Claims Table-Driven Test Runner]]
- depends_on [[REQ-003-SPEC-008: New Claim Validator Suite]]
