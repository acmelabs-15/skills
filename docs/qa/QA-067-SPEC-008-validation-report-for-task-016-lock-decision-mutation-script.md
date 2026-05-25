---
title: 'QA-067-SPEC-008: Validation Report for TASK-016 Lock Decision Mutation Script'
status: DONE
type: qa
permalink: qa/qa-067-spec-008-validation-report-for-task-016-lock-decision-mutation-script-1
tags:
- qa
- spec-008
- task-016
- decisions-skill
- wave-2
---

# QA-067-SPEC-008: Validation Report for TASK-016 Lock Decision Mutation Script

## Scope

Validates [[TASK-016-SPEC-008: Implement lock-decision-mutation Script]] — the decisions-skill mutation wrapper invoking `applyPlanMutation` with the `lock-decision` mutation. Authority chain: ADR-005 D-1/D-8 → [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]] → [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]] → TASK-016. Branch `feat/plan-001-protocol-hardening-wave-2-scope`. Independent QA (tests re-run by QA).

## Verdict

**[PASS]** — all 6 DoD items satisfied; 7/7 colocated tests pass; tsc + biome clean; import boundary clean; path-containment prefix-collision case correctly rejected; no new regressions. One non-blocking DESIGN-002 line-count finding (below).

## Per-DoD Evidence

| DoD Item | Status | Evidence |
| --- | --- | --- |
| 1. Accepts plan-path, decision-id, option-text, owning-session, at-event flags | [PASS] | `FLAG_MAP` L39-47; `parseArgs` required-flag validation L63-73 |
| 2. Path-containment, applyPlanMutation, writes back, exits 0/1/2 | [PASS] | `isContained` L95-99; `lockedMarkdown`→`applyPlanMutation` L103; `Bun.write` L164 |
| 3. Test asserts decisions.N substatus IN_PROGRESS→DONE on lock | [PASS] | test "locking the final pending decision flips decisions.1 substatus IN_PROGRESS → DONE" |
| 4. Test asserts idempotency (re-run byte-identical, exit 0) | [PASS] | test "idempotency: re-running the same lock is a byte-identical no-op" (`afterSecond === afterFirst`) |
| 5. Imports only shared/composition + node/bun | [PASS] | L25-27 (`node:path` + mutation + parser) |
| 6. biome + tsc pass | [PASS] | tsc exit 0; biome clean |

## REQ-004 AC + DESIGN-002 Compliance

- Path-containment EXACT form `resolved === root || resolved.startsWith(root + path.sep)` (L98) — rejects `../`, absolute-outside, AND prefix-collision sibling. [PASS]
- import.meta.main guard (L169) + colocated test both paths (7 tests: success, idempotency, partial-lock, missing-flag exit 2, containment exit 2, traversal exit 2, mutation-failure exit 1). [PASS]

## Findings (non-blocking)

- [finding] `lock-decision-mutation.ts` is 171 lines, exceeding the DESIGN-002 SOFT "80-line ceiling for mutation scripts." Driven by DoD#3's two-phase mutation (lock-decision + set-part-substatus auto-advance), multi-flag parsing, and idempotency logic. TASK-016 DoD has NO line-count item → does NOT block per-TASK closure. DISPOSITION: adjudicate at DESIGN-002 acceptance (totality-gated) — trim vs amend ceiling vs accept-as-soft. #design-002 #open-item

## Observations

- [outcome] lock-decision-mutation.ts wires the decisions-skill D-N micro-cycle to the canonical `applyPlanMutation`; 7/7 colocated tests green #decisions-skill #wave-2
- [decision] Real `lock-decision` mutation discriminant flips a decision-list entry to LOCKED (fields partId/decisionId/topic); DoD#3 substatus flip satisfied by a second `set-part-substatus` mutation when all decisions in the part are LOCKED — matches decisions-skill semantics #mutation-api #spec-reconciliation
- [constraint] Mutation script is not concurrency-safe by design (last-writer-wins); concurrent-write protection is the hook-layer's responsibility per DESIGN-002 #concurrency

## Relations

- relates_to [[TASK-016-SPEC-008: Implement lock-decision-mutation Script]]
- relates_to [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]]
- relates_to [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]