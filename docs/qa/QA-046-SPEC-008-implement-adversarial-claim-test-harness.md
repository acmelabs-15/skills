---
title: 'QA-046-SPEC-008: Implement Adversarial Claim Test Harness'
type: qa
permalink: qa/qa-046-spec-008-implement-adversarial-claim-test-harness-1
tags:
- qa
- spec-008
- task-021
- adversarial-harness
- verdict-pass
---

# QA-046-SPEC-008: Implement Adversarial Claim Test Harness

## Summary

Per-TASK QA gate for [[TASK-021-SPEC-008: Implement Adversarial-Claim Test Harness]] (Track 3: `testAdversarial` runner at `shared/composition/tests/_helpers/adversarial.ts`). Independent re-validation by brain:🧠-qa against committed state (impl commit `08f7bd0`). Verdict: **PASS** — 10 DoD + 4 ADR/REQ compliance items + the post-impl API-drift verification all pass.

## Verdict

**PASS** — every in-scope item validated independently. Harness compiles, lints clean, tsc green, full suite 534/2/536 (the 2 fails are pre-existing `plan-001-migration.test.ts` failures from DEFERRED SPEC-007 work — unrelated). The harness has no tests of its own per spec (exercised in TASK-023).

## DoD validation

| Item | Result | Evidence |
|---|---|---|
| 1 — file exists | PASS | `tests/_helpers/adversarial.ts`, 7191 bytes |
| 2 — `testAdversarial(label, c)` signature matches DESIGN-003 | PASS | `:154` `export function testAdversarial(label: string, c: AdversarialCase): void` |
| 3 — `AdversarialCase` includes `{fixture, validator, expectedReject}` | PASS | `:45-52`; `ValidatorType` union `:30-38` |
| 4 — `parseByValidatorType(type, md)` dispatches; throws malformed | PASS | `:85-105` switch + `FixtureMalformedError` catch wrap (`:103`); default branch for unregistered types (adr/analysis/epic) throws same error |
| 5 — `invokeValidator(type, parsed)` selects from `src/validators/` | PASS | `:112-131` dispatches to 5 validators with `Parameters<typeof ...>[0]` casts; returns real `ClaimResult` |
| 6 — parse-failure distinct from validator-rejection | PASS | `FixtureMalformedError` (`:59-65`) "fixture malformed (<type>): <detail>", thrown pre-validation; validator-rejection returns `{verdict: "FAIL", unsatisfied: [...]}` |
| 7 — JSDoc regex-anchoring contract (loose matchers FORBIDDEN) | PASS | `:130-153` "NON-NEGOTIABLE: `expectedReject` MUST anchor on a SPECIFIC fragment… `/./`, `/fail/i`, or `/error/` is FORBIDDEN" |
| 8 — `bun test` passes with harness in place | PASS | 534 pass / 2 fail / 536; zero new failures |
| 9 — `biome check` clean | PASS | "Checked 1 file. No fixes applied." |
| 10 — `tsc --noEmit` exit 0 | PASS | exit 0 |

## ADR/REQ compliance

| Item | Result |
|---|---|
| ADR-005 D-3 shared fixture-driven harness (NOT per-validator files) | PASS — single `testAdversarial` + dispatch by `ValidatorType` |
| ADR-005 D-3 Implementation Notes verbatim (location + signature) | PASS — `tests/_helpers/adversarial.ts` + `{fixture, validator, expectedReject}` |
| REQ-006 AC-1 (signature exported) | PASS |
| REQ-006 AC-3 (parse-failure distinct from validator-rejection) | PASS — distinct error type, distinct shape |

## API-drift verification (post-impl)

DESIGN-003's illustrative code block sketched `result.valid` / `u.message`. The real validator API in `src/validators/types.ts` is `{verdict, total, unsatisfied: [{index, text, section?}]}`. Implementer adapted internal dispatch to real API while keeping exported contract verbatim per DESIGN-003.

| Check | Result |
|---|---|
| Zero `.valid` references in harness | PASS — grep returns 0 matches |
| Zero `u.message` references | PASS — only `Error.message` in `FixtureMalformedError` ctor (`:61`) |
| Uses real `ClaimResult` (verdict/unsatisfied/text) | PASS — `:13` import; `:160` `result.verdict`; `:164` `u.text` |
| `invokeValidator` return type is `ClaimResult` | PASS — `:112` signature |

Track 4 follow-up captured: DESIGN-003 sketch can be aligned to the real `ClaimResult` shape via doc-sync (no code change needed).

## Test execution

- tests_run: 536 · passed: 534 · failed: 2 · skipped: 0
- Harness adds 0 tests of its own per spec (exercised by TASK-023).
- 2 failures pre-existing in `plan-001-migration.test.ts` (`TASK-014-SPEC-007` AC#1 + AC#3) — DEFERRED SPEC-007 work, unrelated. Zero new failures.

## Observations

- [outcome] TASK-021 adversarial harness validated PASS independently; tsc/biome/suite all green #qa #harness
- [fact] Real validator API uses `{verdict, total, unsatisfied: [{index, text, section?}]}` (per `src/validators/types.ts`); DESIGN-003's sketch shows `.valid`/`.message` — harness correctly tracks REAL API, exported contract preserved verbatim #api-drift-resolved
- [insight] `FixtureMalformedError` keeps fixture-authorship debugging separate from validator-behavior debugging — the regex-anchoring JSDoc closes the loose-matcher loophole that would let a validator-behavior regression silently pass #separation-of-concerns
- [decision] Track 4 doc-sync follow-up: align DESIGN-003 illustrative code to real `ClaimResult` shape (no code change required) #doc-sync
- [risk] 2 pre-existing `plan-001-migration.test.ts` failures (DEFERRED SPEC-007 work) — unrelated to TASK-021; tracked as marathon open-item #pre-existing-fail

## Relations

- relates_to [[TASK-021-SPEC-008: Implement Adversarial-Claim Test Harness]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set]]
- relates_to [[DESIGN-003-SPEC-008: Adversarial Test Fixture Layout and Harness Shape]]]]