---
title: 'TASK-026-SPEC-008: Mutation Backward Transition and Idempotency Tests'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-026-spec-008-mutation-invariants
status: DONE
effort: S
estimate: 0.5d
tags:
- task
- spec-008
- track-3
- mutation
---

# TASK-026-SPEC-008: Mutation Backward Transition and Idempotency Tests

## Objective

Author the mutation-invariant test file at `shared/composition/tests/mutation-invariants.test.ts` (or extend an existing structure if one exists) with two top-level `describe` blocks: (1) backward-transition rejection — `applyPlanMutation({type: "transition-impl-item", from: "DONE", to: "IN_PROGRESS"})` is rejected with an explicit backward-transition error; (2) double-apply idempotency — applying the same mutation twice in sequence on a fresh fixture yields a final state byte-identical to a single-apply result (idempotency invariant). These tests close two of the three gaps surfaced in ADR-005 D-3 Phase 3 critic P1.2.

## Definition of Done


- [x] File `shared/composition/tests/mutation-invariants.test.ts` exists (or new `describe` blocks added to an existing mutation test file)
- [x] Backward-transition test: assert `applyPlanMutation({type: "transition-impl-item", ...DONE→IN_PROGRESS})` throws or returns a rejection with a recognizable backward-transition error message
- [x] Backward-transition test: assert a forward transition (`IN_PROGRESS → DONE`) succeeds, proving the rejection is direction-specific not absolute
- [x] Idempotency test: load fresh fixture; apply mutation once; capture state hash; apply the same mutation again on the once-mutated state; capture state hash; assert hashes are equal
- [x] Idempotency test: cover at least three mutation types where idempotency is meaningful (e.g., `set-part-substatus`, `flip-dod-item`, `lock-decision`)
- [x] `bun test` passes with the new tests
- [x] `biome lint` and `tsc --noEmit` pass


## ADR Compliance


- [x] Honors ADR-005 D-3 Phase 3 critic P1.2 verbatim: backward-transition rejection test exists; double-apply idempotency test exists
- [x] Honors REQ-007 AC-4: backward-transition AND idempotency assertions present


## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/tests/mutation-invariants.test.ts` | NEW | Backward-transition rejection and idempotency tests |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Idempotency tests require careful state-hash construction |
| AI-Dominant | 0.5d | Both invariants are mechanical to assert |
| AI-Assisted | 0.5d | Test patterns mirror existing mutation test files |

## Observations

- [fact] Two invariant blocks close two of three Phase 3 critic P1.2 gaps; duplicate-event-number rejection is the third gap and lives in TASK-027 #scope-split
- [technique] State-hash comparison via Bun.hash on rendered output is the simplest idempotency assertion; structural comparison via parser-output equality is equivalent but heavier #hash-vs-structural
- [constraint] Backward-transition test MUST include a positive control (forward transition succeeds) to prove the rejection is direction-specific not a general error #positive-control

## Relations

- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- implements [[REQ-007-SPEC-008: Integration Tests and Mutation Tests and Drift Regression Markers]]
- depends_on [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- relates_to [[QA-047-SPEC-008: Mutation Backward Transition and Idempotency Tests]]
