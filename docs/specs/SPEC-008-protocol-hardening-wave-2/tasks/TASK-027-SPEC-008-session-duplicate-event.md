---
title: 'TASK-027-SPEC-008: Session Mutation Duplicate Event Number Test'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-027-spec-008-session-duplicate-event
status: TODO
effort: S
estimate: 0.25d
tags:
- task
- spec-008
- track-3
- mutation
- session
---

# TASK-027-SPEC-008: Session Mutation Duplicate Event Number Test

## Description

Add a test to `shared/composition/tests/mutation-invariants.test.ts` (the file authored by TASK-026) asserting that a session mutation that attempts to append an `Event NN` whose `NN` is already present in the note is rejected with a recognizable duplicate-event-number error. The test regression-locks Phase X drift surface where SESSION-2026-05-21_01 acquired duplicate Event 36 / 37 / 38 after killed-agent re-entry — exactly the failure mode this test prevents.

## Definition of Done

- [ ] New `describe` block "session mutation duplicate-event-number rejection" added to `shared/composition/tests/mutation-invariants.test.ts`
- [ ] Test loads or synthesizes a session-note fixture containing `## Event 01` through `## Event 10`
- [ ] Test attempts to append an `## Event 05` (number already present) via the session mutation API
- [ ] Assertion: mutation throws or returns a rejection whose message contains "duplicate" or "already exists" with the conflicting number identified
- [ ] Positive control: appending `## Event 11` (next sequential number) succeeds
- [ ] Source-code comment `// drift-marker: SESSION-2026-05-21_01-duplicate-events — killed-agent re-entry produced Event 36/37/38 duplicates` annotates the new `describe` block
- [ ] `bun test` passes
- [ ] `biome lint` and `tsc --noEmit` pass

## ADR Compliance

- [ ] Honors ADR-005 D-3 Phase 3 critic P1.2 verbatim: duplicate-event-number rejection test exists
- [ ] Honors REQ-007 AC-5: duplicate-event-number rejection assertion present
- [ ] Honors REQ-007 AC-6: drift-marker comment of form `// drift-marker: <id> — <desc>` present on the new test block

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/tests/mutation-invariants.test.ts` | MODIFY | Add duplicate-event-number rejection test block (plus drift-marker comment) |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.5d | Single test block plus positive control |
| AI-Dominant | 0.25d | Test pattern mirrors backward-transition test from TASK-026 |
| AI-Assisted | 0.25d | Test is ~20 lines |

## Observations

- [task] Test closes the third Phase 3 critic P1.2 gap (duplicate-event-number rejection) and regression-locks a real Phase X drift surface #closure #regression
- [technique] Drift-marker comment on the new block doubles as one of the five regression markers required by REQ-007 AC-6 #dual-purpose
- [constraint] Positive control (Event NN+1 succeeds) MUST accompany the rejection assertion to prove the rejection is duplicate-specific, not a general append failure #positive-control

## Relations

- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- implements [[REQ-007-SPEC-008: Integration Tests and Mutation Tests and Drift Regression Markers]]
- depends_on [[TASK-026-SPEC-008: Mutation Backward Transition and Idempotency Tests]]