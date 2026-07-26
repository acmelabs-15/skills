---
title: 'QA-064-SPEC-008: Validation Report for TASK-009 Epic Done Claim Validator'
type: qa
status: DONE
permalink: qa/qa-064-spec-008-validation-report-for-task-009-epic-done-claim-validator
tags:
- qa
- spec-008
- task-009
- epic-claim-validator
- wave-2
---

# QA-064-SPEC-008: Validation Report for TASK-009 Epic Done Claim Validator

## Scope

Validates TASK-009-SPEC-008 (`validateEpicDoneClaim`) -- the only Wave 2 validator with a cross-note dependency. Authority chain: ADR-005 D-2/D-5 (Phase 3 critic P1.1) -> REQ-003-SPEC-008 -> DESIGN-001-SPEC-008 -> TASK-009. Branch `feat/plan-001-protocol-hardening-wave-2-scope` at commit `ba0a7f3`.

## Verdict

**[PASS]** -- all 12 DoD items satisfied, both throw-path ACs verified with explicit error-message assertions, barrel exports complete, 10/0/10 tests, biome clean, tsc clean, no regressions.

## Per-DoD Evidence

| DoD Item | Status | Evidence |
| --- | --- | --- |
| 1. File exists, exports validateEpicDoneClaim + EpicClaimResult + SpecResolver | [PASS] | `epic-claim-validator.ts` L57 (SpecResolver), L59-61 (EpicClaimResult), L74 (validateEpicDoneClaim) |
| 2. Returns ok:true when status is not DONE | [PASS] | L78-79: early return on non-DONE; tests at L98-103 (DRAFT) and L106-111 (IN_PROGRESS) |
| 3. Returns ok:true when DONE + zero contains | [PASS] | L86-88: containsTargets.length===0 gate; test L113-119 |
| 4. Returns ok:false with one entry per non-DONE child SPEC | [PASS] | L97-108 loop + L113 return; tests at L131-147 (single) and L149-163 (multi) |
| 5. THROWS when DONE + contains + no resolver | [PASS] | L91-95: explicit throw naming deps.resolveSpec + unresolved targets; test L166-173 asserts /deps.resolveSpec/ |
| 6. THROWS when resolver returns undefined | [PASS] | L100-104: explicit throw naming the SPEC ref; test L175-182 asserts /SPEC-099: Missing/ |
| 7. Validator is pure given the resolver | [PASS] | No fs/mutation/logging in impl; test L184-191 (JSON snapshot before/after) |
| 8. Unit tests cover all 6 specified scenarios + extras | [PASS] | 10 tests total covering DRAFT-ok, IN_PROGRESS-ok, DONE-zero-ok, DONE-all-DONE-ok, single-fail, multi-fail, missing-resolver-throw, undefined-resolver-throw, purity, short-circuit |
| 9. bun test passes with at least 7 cases green | [PASS] | 10 pass / 0 fail / 14 expect() calls |
| 10. biome check passes | [PASS] | "Checked 3 files in 4ms. No fixes applied." |
| 11. tsc --noEmit passes | [PASS] | Exit 0, no output |
| 12. Barrel re-exports validateEpicDoneClaim + EpicClaimResult + SpecResolver | [PASS] | `index.ts` L18-22: all three exported from ./epic-claim-validator.js |

## Per-REQ-003-SPEC-008 AC Evidence

| AC | Status | Evidence |
| --- | --- | --- |
| EPIC DONE + contains pointing to non-DONE SPEC -> ok:false naming child | [PASS] | Test L131-147: resolver returns IN_PROGRESS for SPEC-008, result.unsatisfied names it with status |
| Any validator called with non-targeted status -> ok:true | [PASS] | Tests L98-111: DRAFT and IN_PROGRESS with contains relations both return ok:true without consulting resolver |
| validateEpicDoneClaim THROWS when no resolveSpec provided + contains exist | [PASS] | Test L166-173: both `validateEpicDoneClaim(epic)` and `validateEpicDoneClaim(epic, {})` throw matching /deps.resolveSpec/ |
| resolver returns undefined for a referenced SPEC -> THROWS naming the ref | [PASS] | Test L175-182: mapResolver maps only "SPEC-007: Present", so "SPEC-099: Missing" resolves undefined; throw matches /SPEC-099: Missing/ |

## No-Silent-Pass Verification (ADR-005 D-5 Phase 3 Critic P1.1)

The mandate: "when status is DONE and at least one contains relation exists, the cross-note resolver mechanism is mandatory; passing without a resolver or with an unresolvable reference must FAIL LOUDLY (throw), never degrade to a soft ok:true."

**Missing resolver path**: L91-95 throws `Error` with message including "no `deps.resolveSpec` resolver was provided" + "ADR-005 D-5 Phase 3 critic P1.1 -- no silent pass" + lists all unresolved targets. Test at L170: `expect(() => validateEpicDoneClaim(epic)).toThrow(/deps\.resolveSpec/)`. Both omitted-deps and explicit-undefined-resolveSpec branches hit this path (L172).

**Resolver-returns-undefined path**: L100-104 throws `Error` with message including the specific SPEC ref + "resolver-wiring defect" + "ADR-005 D-5 Phase 3 critic P1.1 -- no silent pass." Test at L179: `expect(() => validateEpicDoneClaim(epic, { resolveSpec: resolver })).toThrow(/SPEC-099: Missing/)`.

Both paths verified: throw (not soft-fail), error names the offending item, test assertions confirm error content.

## ADR Compliance

| Requirement | Status | Evidence |
| --- | --- | --- |
| ADR-005 D-5: EPIC P1 coverage with cross-note mechanism | [PASS] | Validator uses injected SpecResolver; throws on missing/undefined per critic P1.1 |
| ADR-005 D-2: Pure-function claim validators | [PASS] | No I/O, no mutation, no logging; purity test at L184-191 |
| ADR-001: Composition Library Architecture | [PASS] | Follows Wave 1 pattern (typed result, barrel export, co-located test) |

## Test Suite Regression Check

Full repo: 817 pass / 2 fail / 819 total. The 2 failures are in `shared/composition/tests/plan-001-migration.test.ts` (D-1 DEFERRED known issue from Wave 1 migration). No new regressions introduced by TASK-009.

## Observations

- [outcome] TASK-009 implementation is structurally complete: 110 lines of validator, 205 lines of tests, 10 cases covering all DoD scenarios plus short-circuit and multi-failure paths #epic-claim-validator #wave-2
- [fact] SpecRootNoteStatusEnum contains DRAFT/PROPOSED/ACCEPTED/DONE/DEPRECATED -- no DEFERRED or ABANDONED -- so the validator correctly reduces "satisfied child SPEC" to `status === "DONE"` #spec-status-enum #terminal-state
- [decision] Both throw paths name the offending item (resolver dependency / SPEC ref) and cite ADR-005 D-5 Phase 3 critic P1.1 in error messages; this is defense-in-depth traceability #no-silent-pass #traceability
- [technique] Validator accesses `epicNote.relations.filter(rel => rel.verb === "contains")` which correctly reads the Zod-inferred relations array from EpicNoteSchema rather than any derived property #relations-access #schema-aligned

## Relations

- relates_to [[TASK-009-SPEC-008: Implement validateEpicDoneClaim]]
- relates_to [[REQ-003-SPEC-008: New Claim Validator Suite]]
- relates_to [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]