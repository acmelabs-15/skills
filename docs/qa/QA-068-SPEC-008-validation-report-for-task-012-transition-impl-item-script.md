---
title: 'QA-068-SPEC-008: Validation Report for TASK-012 Transition Impl Item Script'
status: DONE
type: qa
permalink: qa/qa-068-spec-008-validation-report-for-task-012-transition-impl-item-script-1
tags:
- qa
- spec-008
- task-012
- build-skill
- wave-2
---

# QA-068-SPEC-008: Validation Report for TASK-012 Transition Impl Item Script

## Scope

Validates [[TASK-012-SPEC-008: Implement transition-impl-item Script]] — the build-skill mutation wrapper invoking `applyPlanMutation` with `transition-impl-item`. Authority: ADR-005 D-1/D-8 → [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]] → [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]] → TASK-012. Independent QA (tests re-run).

## Verdict

**[PASS]** — all 8 DoD items satisfied; 9/9 tests pass; tsc + biome clean; import boundary clean; path-containment exact rule (`resolved === root || startsWith(root + sep)`).

## Per-DoD Evidence

| DoD Item | Status | Evidence |
| --- | --- | --- |
| 1. Accepts plan-path, item-id (part-id+task-ref), target-status, owning-session, at-event | [PASS] | `transition-impl-item.ts:40-49` FLAG_MAP |
| 2. Path-containment, applyPlanMutation, write back, exits 0/1/2 | [PASS] | `:120` containment, `:147` mutation, `:163` Bun.write |
| 3. Required-arg validation (owning-session, at-event) → exit 2 | [PASS] | `:86-87` + tests |
| 4. Test exit 0 PENDING→IN_PROGRESS | [PASS] | test "exit 0 on successful PENDING → IN_PROGRESS" |
| 5. Test exit 1 on cross-field-invariant violation | [PASS] | test "qa IN_PROGRESS needs impl DONE" |
| 6. Test exit 2 missing required-args | [PASS] | 2 tests |
| 7. Imports only shared/composition + node/bun | [PASS] | `:25-27` |
| 8. biome + tsc pass | [PASS] | clean |

## REQ-004 AC + DESIGN-002 Compliance

- Mutation: `type:"transition-impl-item"` + partId/taskRef/from/to/owning_session/at_event — all match `TransitionImplItem` (plan-mutations.ts:94-103). [PASS]
- Path-containment exact rule (`:120`). Tests cover `../` + absolute-outside. Prefix-collision sibling: code correct (`+sep`), explicit TEST not present (REQ-004 AC-9 open item, tracked for REQ-004 acceptance). [PARTIAL-test-coverage]
- Line count 170 (over DESIGN-002 80 soft ceiling; non-blocking — no DoD line-count item). #design-002

## Observations

- [outcome] transition-impl-item.ts wraps applyPlanMutation; 9/9 tests green covering exit 0/1/2 + cross-field invariant #build-skill #wave-2
- [decision] item identity via partId + taskRef (the workflow-item id `impl-TASK-NNN` is derived, not an input) — matches the real TransitionImplItem mutation shape #mutation-api #spec-reconciliation
- [constraint] owning_session + at_event mandated by the mutation schema; missing → surfaced as usage error exit 2 #required-args

## Relations

- relates_to [[TASK-012-SPEC-008: Implement transition-impl-item Script]]
- relates_to [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]]
- relates_to [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]