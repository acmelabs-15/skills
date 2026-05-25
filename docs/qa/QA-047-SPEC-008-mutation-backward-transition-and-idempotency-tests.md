---
title: 'QA-047-SPEC-008: Mutation Backward Transition and Idempotency Tests'
type: qa
permalink: qa/qa-047-spec-008-mutation-backward-transition-and-idempotency-tests
tags:
- qa
- spec-008
- task-026
- mutation-invariants
- verdict-pass
---

# QA-047-SPEC-008: Mutation Backward Transition and Idempotency Tests

## Summary

Per-TASK QA gate for [[TASK-026-SPEC-008: Mutation Backward Transition and Idempotency Tests]] (Track 3: `tests/mutation-invariants.test.ts`, 230 lines, 6 tests). Independent re-validation by brain:🧠-qa against committed state (impl commit `6abc76c`; partial salvaged after agent return errored). Verdict: **PASS** — 7 DoD + 2 ADR/REQ compliance + the special source-traced backward-transition mechanism verification all pass.

## Verdict

**PASS** — every in-scope item validated independently. 6/6 tests pass; tsc exit 0; biome clean; suite 534/2/536; zero new failures. The implementer's salvaged work is sound — orchestrator-verification (DoD-from-source) at Event 51 was correct.

## DoD validation

| Item | Result | Evidence |
|---|---|---|
| 1 — file exists | PASS | `tests/mutation-invariants.test.ts`, 230 lines, 6 tests |
| 2 — backward-transition test rejects DONE→IN_PROGRESS with recognizable error | PASS | `:95-105` `.toThrow(/requires paired impl-TASK-001-SPEC-007 to be DONE/)`; real error from `plan-note.ts:176` cross-field invariant matches regex |
| 3 — forward IN_PROGRESS→DONE succeeds (direction-specific proof) | PASS | `:108-123` positive control: same item, opposite direction, `implStatus(out)` becomes DONE |
| 4 — idempotency: fresh fixture, apply once, hash, apply again, hash, assert equal | PASS | `:173-229` pattern: `Bun.hash()` equality witness + `expect(twice).toBe(once)` string identity |
| 5 — idempotency covers ≥3 mutation types | PASS | `flip-dod-item(done:true)` (`:173`); `lock-decision(same topic)` (`:191`); `set-part-substatus(DONE→DONE)` (`:209`) |
| 6 — `bun test` passes | PASS | 6/6 scoped; suite 534/2/536; zero new failures |
| 7 — `biome lint` + `tsc --noEmit` pass | PASS | biome "Checked 1 file. No fixes applied."; tsc exit 0 |

## ADR/REQ compliance

| Item | Result |
|---|---|
| ADR-005 D-3 Phase 3 critic P1.2 (backward-transition + idempotency) | PASS — both `describe` blocks present |
| REQ-007 AC-4 (both assertions present) | PASS |

## Special verification — backward-transition mechanism

Source-traced confirmation that the rejection fires via schema cross-field invariant, NOT a literal direction guard (as the implementer documented):

1. `transitionImplItem` at `plan-mutations.ts:289-328` only checks `item.status !== m.from` (optimistic concurrency); declaring `from: "DONE"` on a DONE item passes the guard.
2. Mutation proceeds to set impl status to `IN_PROGRESS` (`:318`).
3. `applyPlanMutation` then runs `PlanNoteSchema.parse(mutated)` (`:142`).
4. `superRefine` at `plan-note.ts:168-179` iterates qa items; finds qa-DONE with paired impl now IN_PROGRESS; fires invariant `"qa item qa-TASK-001-SPEC-007 status DONE requires paired impl-TASK-001-SPEC-007 to be DONE (currently IN_PROGRESS)"`.
5. Test regex matches.

Asymmetry test (`:125-143`) adds a forward+backward chain on the same item — proves the rejection is on the transition direction, not on the item.

## Special verification — idempotency choices

| Mutation | Source | Why genuinely idempotent |
|---|---|---|
| `flip-dod-item(done:true)` | `plan-mutations.ts:207-218` | Sets `done` at index; no precondition; re-apply re-sets same value |
| `lock-decision(same topic)` | `plan-mutations.ts:189-205` | Upsert by `d.id`; existing entry overwritten with identical fields |
| `set-part-substatus(DONE→DONE)` | `plan-mutations.ts:173-187` | From-guard passes; structural no-op when target equals current |

Documented exclusions (NOT idempotent by design): `transition-impl-item`/`transition-qa-item`/`transition-task` consume `from`; `add-task` throws on duplicate id; `add-blocker` appends unconditionally.

## Test execution

- tests_run: 536 · passed: 534 · failed: 2 · skipped: 0
- TASK-026-scoped file: 6 pass / 0 fail / 11 expect() / 268ms
- 2 failures pre-existing in `plan-001-migration.test.ts` (DEFERRED SPEC-007 work) — zero new failures from TASK-026.
- TASK-026-scoped verdict: PASS.

## Observations

- [outcome] TASK-026 mutation invariants validated PASS independently; 6/6 scoped tests green; source-traced mechanism confirmed #qa #mutation-invariants
- [fact] Backward-transition rejection fires via schema cross-field invariant (qa-DONE requires paired impl-DONE), NOT a literal direction guard — implementer correctly identified the real mechanism #api-discovery
- [insight] All 3 idempotent mutations are genuinely idempotent in source, not just per-test contract; documented exclusions cover the non-idempotent mutation set #idempotency
- [decision] Salvage-from-errored-return pattern proved sound: when implementer's RETURN tool surface errors but files are on disk and gates green, orchestrator-verifies DoD from source + dispatches QA fresh (works) #partial-recovery
- [risk] 2 pre-existing `plan-001-migration.test.ts` failures (DEFERRED SPEC-007 work) — unrelated #pre-existing-fail

## Relations

- relates_to [[TASK-026-SPEC-008: Mutation Backward Transition and Idempotency Tests]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[REQ-007-SPEC-008: Integration Tests and Mutation Tests and Drift Regression Markers]]