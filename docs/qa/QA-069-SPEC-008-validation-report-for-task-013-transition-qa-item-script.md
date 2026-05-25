---
title: 'QA-069-SPEC-008: Validation Report for TASK-013 Transition QA Item Script'
status: DONE
type: qa
permalink: qa/qa-069-spec-008-validation-report-for-task-013-transition-qa-item-script
tags:
- qa
- spec-008
- task-013
- build-skill
- wave-2
---

# QA-069-SPEC-008: Validation Report for TASK-013 Transition QA Item Script

## Scope

Validates [[TASK-013-SPEC-008: Implement transition-qa-item Script]] — the build-skill mutation wrapper invoking `applyPlanMutation` with `transition-qa-item`, enforcing cross-field invariants (paired impl DONE; qa_ref when DONE/FAILED). Authority: ADR-005 D-1/D-8 → [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]] → [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]] → TASK-013. Independent QA (tests re-run).

## Verdict

**[PASS]** — all 7 DoD items satisfied; 10/10 tests pass; tsc + biome clean; import boundary clean; path-containment exact rule.

## Per-DoD Evidence

| DoD Item | Status | Evidence |
| --- | --- | --- |
| 1. Accepts plan-path, item-id, target-status, owning-session, at-event, optional qa-ref + fix_brief_for_event | [PASS] | `transition-qa-item.ts:44-60` (used real schema field `fix_brief_for_event`, not the non-existent `failed_iterations`) |
| 2. Path-containment, applyPlanMutation, write back, exits 0/1/2 | [PASS] | `:136` containment, mutation, Bun.write |
| 3. Test exit 1 DONE without qa_ref | [PASS] | test passes |
| 4. Test exit 1 paired impl not DONE | [PASS] | test passes |
| 5. Test exit 0 IN_PROGRESS→DONE invariants met | [PASS] | test passes |
| 6. Imports only shared/composition + node/bun | [PASS] | `:24-26` |
| 7. biome + tsc pass | [PASS] | clean |

## REQ-004 AC + DESIGN-002 Compliance

- Mutation: `type:"transition-qa-item"` + partId/taskRef/from/to/owning_session/at_event/qa_ref/fix_brief_for_event — all match `TransitionQaItem` (plan-mutations.ts:114-124). [PASS]
- Path-containment exact rule (`:136`). `../` + absolute-outside tested; prefix-collision code-correct, explicit test not present (REQ-004 AC-9 open item). [PARTIAL-test-coverage]
- Line count 192 (over soft ceiling; non-blocking). #design-002

## Observations

- [outcome] transition-qa-item.ts enforces qa cross-field invariants centrally via applyPlanMutation; 10/10 tests green #build-skill #wave-2
- [decision] qa items carry `fix_brief_for_event` (impl items carry `failed_iterations`); DoD#1's "failed-iterations" wording reconciled to the real qa-item schema field #mutation-api #spec-reconciliation
- [constraint] qa_ref mandatory when target DONE/FAILED; paired impl must be DONE before qa advances — both enforced + tested #cross-field-invariant

## Relations

- relates_to [[TASK-013-SPEC-008: Implement transition-qa-item Script]]
- relates_to [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]]
- relates_to [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
