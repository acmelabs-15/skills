---
title: 'QA-048-SPEC-008: Integration Test Parse Mutate Validate Render'
type: qa
permalink: qa/qa-048-spec-008-integration-test-parse-mutate-validate-render-1
tags:
- qa
- spec-008
- task-025
- integration-tests
- verdict-pass
---

# QA-048-SPEC-008: Integration Test Parse Mutate Validate Render

## Summary

Per-TASK QA gate for [[TASK-025-SPEC-008: Integration Test Parse Mutate Validate Render]] (Track 3: parse→mutate→validate→render integration suite + cross-note SPEC-TASK + TEST-REPORT-vs-TASK-DoD). Independent re-validation by brain:🧠-qa (`ace36d4179c3784c3`) against committed state (impl commit `30a3c98`). Verdict: **PASS** — 11 DoD + REQ-007 AC-1/2/3 + DESIGN-003 Track-3 compliance + 3 API-gap adaptations verified principled.

## Verdict

**PASS** — every in-scope item validated independently. 8 new integration tests pass; tsc/biome clean; suite 542/2/544; zero new failures (the 2 fails are pre-existing `plan-001-migration.test.ts` deferred SPEC-007 work).

## DoD validation

| Item | Result | Evidence |
|---|---|---|
| 1 — `tests/integration/parse-mutate-validate-render.test.ts` exists | PASS | 201 lines, 3 describe blocks |
| 2 — three describe blocks cover PLAN/SPEC/TASK end-to-end | PASS | `:49` PLAN; `:87` SPEC; `:134` TASK |
| 3 — each pipeline asserts parse→mutate→validate→render | PASS | PLAN `:50-84` `parsePlanNote`→`applyPlanMutation`→`PlanNoteSchema.safeParse`→`renderPlanNote` byte-identity; SPEC `:88-131` `parseSpecRootNote`→model edit→`SpecRootNoteSchema.safeParse`+`validateSpecDoneClaim`→`renderSpecRootNote`+re-parse semantic equality; TASK `:134-199` `parseTaskNote`→`applyCheckboxMutation`→`validateTaskDoneClaim` PASS→re-parse confirms DoD done |
| 4 — `tests/integration/cross-note-spec-task-consistency.test.ts` exists | PASS | 125 lines, 2 cases |
| 5 — drifted pair (DONE TASK + unchecked SPEC row) fails | PASS | `:108-123` SPEC-201 + TASK-001-SPEC-201 → verdict FAIL; reason names task ID + "unchecked" |
| 6 — aligned pair (DONE TASK + `[x]` SPEC row) passes | PASS | `:95-106` SPEC-200 + TASK-001-SPEC-200 → verdict PASS |
| 7 — `tests/integration/test-report-vs-task-dod.test.ts` exists | PASS | 105 lines, 2 cases |
| 8 — drifted pair (PASS verdict + `[ ]` DoD) fails | PASS | `:85-103` QA-001-SPEC-203 + TASK-001-SPEC-203 → verdict FAIL; `unsatisfied.length >= 1` |
| 9 — `tests/fixtures/integration/` exists with cross-note pairs | PASS | 8 files: 2 SPEC-TASK pairs (clean+drifted) + 2 QA-TASK pairs (clean+drifted) |
| 10 — `bun test tests/integration/` all pass | PASS | 8 pass / 0 fail / 37 expect() / 316ms / 3 files |
| 11 — `biome lint` + `tsc --noEmit` pass | PASS | scoped biome `tests/integration/ tests/fixtures/integration/` clean; tsc exit 0 |

## API-gap adaptations (3 verified principled, not invented)

| # | Adaptation | Verified absent from src | Assessment |
|---|---|---|---|
| 1 | `PlanNoteSchema.safeParse` in place of `validatePlanDoneClaim` (still pending TASK-010) | `grep -rn validatePlanDoneClaim src/` → empty | REQ-007 AC-1 wording allows "equivalent claim validator for the touched note"; safeParse is the same contract `applyPlanMutation` enforces internally |
| 2 | `applyCheckboxMutation` re-parser-validated round-trip in place of TASK renderer | `grep -rn renderTaskNote src/` → empty | The mutation's contract IS string-in/string-out re-parser-validated; the post-state re-parse confirms the render path |
| 3 | In-model `success_criteria[].done` edit in place of SPEC mutation API | `grep -rn applySpecMutation src/` → empty | Pipeline stages (parse / mutate / validate / render) all exercised; semantic equality via re-parse |

## REQ-007 ACs (in-scope slice)

| AC | Result |
|---|---|
| AC-1 integration PMVR for PLAN/SPEC/TASK | PASS |
| AC-2 cross-note SPEC-TASK consistency (PASS clean / FAIL drifted) | PASS |
| AC-3 TEST-REPORT-vs-TASK-DoD (FAIL on PASS+unchecked-DoD) | PASS |

(AC-4 covered by TASK-026 [CLOSED]. AC-5/6/7/8/9 out of TASK-025 scope.)

## DESIGN-003 compliance (Track-3 integration slice)

| Item | Result |
|---|---|
| Tests under `tests/integration/` subdir | PASS |
| Fixtures under `tests/fixtures/integration/` | PASS |
| No library source modified | PASS — `git show --stat 30a3c98 -- shared/composition/src/` empty |

## Test execution

- tests_run: 544 · passed: 542 · failed: 2 · skipped: 0
- TASK-025-scoped (`tests/integration/`): 8 pass / 0 fail / 37 expect()
- 2 failures pre-existing in `plan-001-migration.test.ts` (DEFERRED SPEC-007 work). Zero new failures from TASK-025.

## Observations

- [outcome] TASK-025 integration tests validated PASS; ZERO-dedicated-integration-tests Audit E finding closed; 8 new tests + 8 fixtures land #qa #integration #audit-e
- [fact] Three API-gap adaptations were verified absent from src and substituted with equivalent contracts: `PlanNoteSchema.safeParse` (TASK-010 not yet landed), `applyCheckboxMutation` re-parser round-trip (no TASK renderer exists), in-model SPEC mutation (no `applySpecMutation` exists) #api-gap-adaptations
- [insight] The implementer honestly reported each adaptation rather than inventing missing APIs — verified against `grep -rn` on `src/` for each missing symbol returning empty; correct application of the no-guessing rule #honest-implementation
- [decision] TASK-025 closure pattern: when DoD assertions reference an API that hasn't landed yet, equivalent-contract substitution via `safeParse` / re-parser-round-trip is principled if the missing API's contract is identical #equivalent-contract-pattern
- [risk] 2 pre-existing `plan-001-migration.test.ts` failures (DEFERRED SPEC-007 work) — unrelated; tracked as marathon open-item #pre-existing-fail

## Relations

- relates_to [[TASK-025-SPEC-008: Integration Test Parse Mutate Validate Render]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[REQ-007-SPEC-008: Integration Tests and Mutation Tests and Drift Regression Markers]]
- relates_to [[DESIGN-003-SPEC-008: Adversarial Test Fixture Layout and Harness Shape]]