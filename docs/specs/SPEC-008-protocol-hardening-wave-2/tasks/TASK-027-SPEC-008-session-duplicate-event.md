---
title: 'TASK-027-SPEC-008: Session Mutation Duplicate Event Number Test'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-027-spec-008-session-duplicate-event
status: DONE
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

## Objective

Add a test to `shared/composition/tests/mutation-invariants.test.ts` (the file authored by TASK-026) asserting that a session mutation that attempts to append an `Event NN` whose `NN` is already present in the note is rejected with a recognizable duplicate-event-number error. The test regression-locks Phase X drift surface where SESSION-2026-05-21_01 acquired duplicate Event 36 / 37 / 38 after killed-agent re-entry — exactly the failure mode this test prevents.

## Definition of Done
> Amended 2026-05-24 (SESSION-2026-05-23_02 Event 99, user-approved Option A): the session mutation API auto-assigns event numbers (`nextN = events.length + 1`; caller `n` stripped), and duplicate rejection is a `SessionNoteSchema` continuity check emitting `Event n=N at index I: expected n=M` — NOT a literal "duplicate"/"already exists" message. DoD#3/#4 amended to match the as-built behavior; the regression-lock intent (catch the Event 36/37/38 duplicate drift) is preserved.

- [x] New `describe` block "session mutation duplicate-event-number rejection" added to `shared/composition/tests/mutation-invariants.test.ts`
- [x] Test loads or synthesizes a session-note fixture containing `## Event 01` through `## Event 10`
- [x] Test feeds the mutation (or parser) a session note ALREADY containing a duplicate `## Event 05` (the append API auto-assigns `n`, so a duplicate is realized via a pre-duplicated note; rejection fires at the parse/continuity step)
- [x] Assertion: the operation throws/rejects with a message matching `/expected n=\d+/` (the continuity-violation check) that identifies the conflicting number (e.g., `n=5`)
- [x] Positive control: appending `## Event 11` (next sequential number) succeeds
- [x] Source-code comment `// drift-marker: SESSION-2026-05-21_01-duplicate-events — killed-agent re-entry produced Event 36/37/38 duplicates` annotates the new `describe` block
- [x] `bun test` passes
- [x] `biome lint` and `tsc --noEmit` pass

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

- [fact] Test closes the third Phase 3 critic P1.2 gap (duplicate-event-number rejection) and regression-locks a real Phase X drift surface #closure #regression
- [technique] Drift-marker comment on the new block doubles as one of the five regression markers required by REQ-007 AC-6 #dual-purpose
- [constraint] Positive control (Event NN+1 succeeds) MUST accompany the rejection assertion to prove the rejection is duplicate-specific, not a general append failure #positive-control

## Relations

- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- implements [[REQ-007-SPEC-008: Integration Tests and Mutation Tests and Drift Regression Markers]]
- depends_on [[TASK-026-SPEC-008: Mutation Backward Transition and Idempotency Tests]]
- relates_to [[QA-077-SPEC-008: Validation Report for TASK-027 Session Duplicate Event Number Test]]