---
title: 'TASK-021-SPEC-008: Implement Adversarial-Claim Test Harness'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-021-spec-008-implement-adversarial-claim-test-harness-1
status: TODO
effort: S
estimate: 0.5d
tags:
- task
- spec-008
- track-3
- adversarial
- harness
---

# TASK-021-SPEC-008: Implement Adversarial-Claim Test Harness

## Description

Implement the shared adversarial-claim test harness at `shared/composition/tests/_helpers/adversarial.ts` per DESIGN-003-SPEC-008. The harness exports `testAdversarial(label, {fixture, validator, expectedReject})` and two internal helpers (`parseByValidatorType`, `invokeValidator`). The harness loads a markdown fixture, parses it via the validator-appropriate parser, invokes the matching claim validator, and asserts that the result is a rejection matching `expectedReject`. Parse failures surface as a distinct "fixture malformed" assertion. The harness signature MUST match the DESIGN verbatim; no API drift permitted.

## Definition of Done


- [x] File `shared/composition/tests/_helpers/adversarial.ts` exists
- [x] Exported function `testAdversarial(label: string, c: AdversarialCase)` signature matches DESIGN-003 verbatim
- [x] Exported type `AdversarialCase` includes `{fixture: string, validator: ValidatorType, expectedReject: RegExp}`
- [x] Internal helper `parseByValidatorType(type, md)` selects the correct parser per validator type and throws on malformed fixture
- [x] Internal helper `invokeValidator(type, parsed)` selects the correct validator from `shared/composition/src/validators/` per validator type
- [x] Parse failure path produces a distinct assertion message ("fixture malformed") separate from validator rejection
- [x] JSDoc on `testAdversarial` documents the regex-anchoring contract (specific anchors required, not loose matchers)
- [x] `bun test` passes with the harness in place (harness compiles and is callable; first invocations happen in TASK-023)
- [x] `biome lint` passes on the new file
- [x] `tsc --noEmit` passes (no type errors)


## ADR Compliance


- [x] Honors ADR-005 D-3: shared fixture-driven harness pattern (single test runner plus fixture directory; per-validator test files NOT used)
- [x] Honors ADR-005 D-3 Implementation Notes verbatim: `tests/_helpers/adversarial.ts` location; signature `{fixture, validator, expectedReject}`
- [x] Honors REQ-006 AC-1: signature `({fixture: string, validator, expectedReject})` exported
- [x] Honors REQ-006 AC-3: parse-failure path surfaces distinctly from validator-rejection path


## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/tests/_helpers/adversarial.ts` | NEW | Shared harness implementation |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Type plumbing for parser-selection union plus regex contract docs |
| AI-Dominant | 0.5d | Roughly 30-line implementation per DESIGN; type plumbing is mechanical |
| AI-Assisted | 0.5d | DESIGN-003 supplies signature verbatim; no design judgment needed |

## Observations

- [task] Implementation is approximately 30 lines plus type definitions; design risk is zero because DESIGN-003 fixes the signature #lines #risk
- [technique] Parser-selection dispatch via discriminated union on `validator` tag keeps callers parser-agnostic and harness centrally maintainable #dispatch #encapsulation
- [constraint] Harness MUST NOT short-circuit parse failures into validator output; the test distinction between "fixture malformed" and "validator returned valid on a lying claim" is the core protocol-evidence rule #separation-of-concerns

## Relations

- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- implements [[REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set]]
- implements [[DESIGN-003-SPEC-008: Adversarial Test Fixture Layout and Harness Shape]]
- depends_on [[ADR-005: Protocol Hardening Wave 2 Architecture]]
