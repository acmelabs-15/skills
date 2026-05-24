---
title: 'TASK-046-SPEC-008: Author Hook Smoke Tests and Adversarial Fixture Reuse'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-046-spec-008-author-hook-smoke-tests-and-adversarial-fixture-reuse
status: TODO
effort: M
estimate: 1d
tags:
- task
- spec-008
- hooks
- smoke-tests
- adversarial
- wave-2
---

# TASK-046-SPEC-008: Author Hook Smoke Tests and Adversarial Fixture Reuse

## Description

Author end-to-end smoke tests that wire the hook layer (TASK-037 through TASK-045) against the adversarial fixture set authored by Track 3 ([[REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set]]). Per [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 Cross-D-N Implications: "D-3 adversarial fixtures can be reused as hook smoke tests (the fixture *is* the lying claim the hook should deny)." Each fixture under `tests/fixtures/adversarial/<type>/drift-NN-<slug>.md` becomes both a validator-level test (Track 3) and a hook-level smoke test (this TASK).

Smoke tests run the actual hook handler scripts via `bun run` against simulated hook input (constructed JSON on stdin) and assert the emitted JSON response. They cover the four matcher-risk and behavioral assertions from [[REQ-011-SPEC-008: PreToolUse Blocking Gates]] and [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]]:

1. MCP write triggers Layer 2 deny (matcher-risk mitigation).
2. Layers 1-5 deny on lying-claim fixtures.
3. Layer 6 (Stop) blocks turn completion on unvalidated docs/** modification (simulated by bypassing Layer 1/2 for an adversarial edit).
4. Layer 7 (FileChanged) emits additionalContext summary on simulated post-commit fixture.

## Definition of Done

- [ ] `hooks/__tests__/smoke/` directory exists with per-layer smoke test files
- [ ] Smoke test 1: invoking the Layer 2 handler against a simulated `mcp__plugin_brain_brain__edit_note` tool_input that flips a TASK to DONE with an unsatisfied DoD checkbox emits `permissionDecision: "deny"` with reason naming the failing DoD item
- [ ] Smoke tests 2-6: each of Layers 1, 2, 3, 4, 5 invoked against the canonical adversarial fixture for its expected failure mode emits `permissionDecision: "deny"` with reason
- [ ] Smoke test 7: Layer 6 handler invoked with a transcript fixture in which Layer 1/2 were bypassed for an adversarial edit emits `{ decision: "block", reason: "Turn-end backstop: ..." }`
- [ ] Smoke test 8: Layer 7 handler invoked against a fixture where the post-commit HEAD touches `docs/**` emits `{ hookSpecificOutput: { hookEventName: "FileChanged", additionalContext: "Post-commit state: ..." } }`
- [ ] Smoke test 9: clean-edit happy path for Layer 1 emits `permissionDecision: "allow"` (no warning) so non-violating edits proceed
- [ ] Smoke test 10: low-severity schema issue (missing tag on observation) on Layer 1 emits `permissionDecision: "allow"` with `additionalContext` warning
- [ ] All smoke tests invoke the actual handler scripts via `bun run`, not via in-process import (asserts the hook wiring works end-to-end)
- [ ] Smoke tests run as part of `bun test` and complete within ~10s total
- [ ] biome lint passes
- [ ] `bun tsc --noEmit` passes

## ADR Compliance

- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 Cross-D-N Implications — D-3 adversarial fixtures reused as hook smoke tests
- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 Failure Modes — smoke test asserts MCP write triggers Layer 2 (matcher-risk mitigation)
- [ ] Honors [[REQ-011-SPEC-008: PreToolUse Blocking Gates]] AC — every Layer 1-5 deny path covered
- [ ] Honors [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]] AC — Layer 6 and Layer 7 behaviors covered

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `hooks/__tests__/smoke/layer-1.smoke.test.ts` | NEW | Layer 1 end-to-end smoke |
| `hooks/__tests__/smoke/layer-2-mcp.smoke.test.ts` | NEW | Layer 2 MCP matcher mitigation |
| `hooks/__tests__/smoke/layer-3-commit.smoke.test.ts` | NEW | Layer 3 commit gate |
| `hooks/__tests__/smoke/layer-4-push.smoke.test.ts` | NEW | Layer 4 push gate |
| `hooks/__tests__/smoke/layer-5-pr.smoke.test.ts` | NEW | Layer 5 PR-create gate |
| `hooks/__tests__/smoke/layer-6-stop.smoke.test.ts` | NEW | Layer 6 backstop |
| `hooks/__tests__/smoke/layer-7-observer.smoke.test.ts` | NEW | Layer 7 observability |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Smoke test scaffolding plus fixture wiring |
| AI-Dominant | 0.75d | Reuses Track 3 fixtures |
| AI-Assisted | 1d | End-to-end harness setup |

## Observations

- [task] Smoke tests close the per-TASK validation loop — every hook handler from TASK-037 through TASK-045 has at least one fixture-driven end-to-end assertion #end-to-end-coverage
- [technique] Reusing adversarial fixtures from Track 3 as smoke tests doubles the value of each fixture without doubling authoring cost #fixture-reuse
- [constraint] Smoke tests MUST invoke handler scripts via `bun run`, not via in-process import, so the test surface includes the JSON-on-stdin/stdout wiring not just the inner logic #wire-coverage

## Relations

- implements [[REQ-011-SPEC-008: PreToolUse Blocking Gates]]
- implements [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set]]
- depends_on [[REQ-003-SPEC-008: New Claim Validator Suite]]