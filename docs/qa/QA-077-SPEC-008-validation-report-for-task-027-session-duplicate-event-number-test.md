---
title: 'QA-077-SPEC-008: Validation Report for TASK-027 Session Duplicate Event Number Test'
type: qa
permalink: qa/qa-077-spec-008-validation-report-for-task-027-session-duplicate-event-number-test
tags:
- qa
- spec-008
- task-027
- session
- mutation
---

# QA-077-SPEC-008: Validation Report for TASK-027 Session Duplicate Event Number Test

## Objective

Validate TASK-027-SPEC-008 (Session Mutation Duplicate Event Number Test) against the AMENDED Definition of Done and REQ-007-SPEC-008 AC-5 (amended) + AC-6. The DoD was amended 2026-05-24 (SESSION-2026-05-23_02 Event 99, user-approved Option A) to match the as-built behavior: the session API auto-assigns event numbers, so duplicates manifest as continuity violations rather than literal "duplicate"/"already exists" strings.

## Approach

- Read TASK-027 AMENDED DoD + REQ-007 AC-5/AC-6
- Read implementation: `shared/composition/tests/mutation-invariants.test.ts` (new describe block), `shared/composition/src/schemas/session-note.ts` (continuity superRefine), `shared/composition/src/mutations/session-mutations.ts`
- Execute `bun test`, `biome check`, `tsc --noEmit`
- Manually probe the rejection path to confirm the assertion is not a false positive

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests run | 9 (full file) | - | - |
| Passed | 9 | 9 | PASS |
| Failed | 0 | 0 | PASS |
| Execution time | 325ms | - | PASS |
| Biome lint | Clean | Clean | PASS |
| tsc --noEmit | Clean | Clean | PASS |

### AMENDED DoD Checkbox Validation

| # | DoD Item | Status | Evidence |
|---|----------|--------|----------|
| 1 | New describe block "session mutation duplicate-event-number rejection" | PASS | `mutation-invariants.test.ts:237` |
| 2 | Fixture containing Event 01-10 | PASS | `buildSessionModel(10)` at line 261-294; test "synthesized clean note parses with a continuous Event 01-10 ledger" (line 322) confirms 10-event parse with `[1,2,3,4,5,6,7,8,9,10]` |
| 3 | Feeds pre-duplicated Event 05 (append API auto-assigns n, so duplicate realized via pre-duplicated note) | PASS | `withDuplicateEvent05()` at line 306-319 injects a second `## Event 05` heading with distinct title between Event 05 and Event 06, producing `[1,2,3,4,5,5,6,7,8,9,10]` |
| 4 | Assertion: throws matching `/expected n=\d+/` identifying conflicting number | PASS | Lines 340-341: `.toThrow(/expected n=\d+/)` and `.toThrow(/n=5/)`; manual probe confirms message `Event n=5 at index 5: expected n=6` |
| 5 | Positive control: Event 11 appends OK | PASS | Lines 351-368: appends to clean ledger, asserts `events.length === 11` and `events.at(-1).n === 11` and output contains `## Event 11` |
| 6 | Drift-marker comment present | PASS | Line 236: `// drift-marker: SESSION-2026-05-21_01-duplicate-events — killed-agent re-entry produced Event 36/37/38 duplicates` |
| 7 | `bun test` passes | PASS | 9 pass, 0 fail across file |
| 8 | `biome lint` and `tsc --noEmit` pass | PASS | biome: "Checked 1 file, No fixes applied"; tsc: clean (no output) |

### REQ-007 AC Validation

| AC | Status | Evidence |
|----|--------|----------|
| AC-5 (amended): continuity-violation rejection asserted | PASS | Lines 329-349: `applySessionMutation` on pre-duplicated note throws; `.toThrow(/expected n=\d+/)` + `.toThrow(/n=5/)` match the `SessionNoteSchema` continuity superRefine at `session-note.ts:184-194`. Direct `parseSessionNote` also asserted at line 348. Manual probe confirmed: message is `Event n=5 at index 5: expected n=6` |
| AC-6: drift-marker comment of canonical form | PASS | Line 236: `// drift-marker: SESSION-2026-05-21_01-duplicate-events — killed-agent re-entry produced Event 36/37/38 duplicates`. Format matches `// drift-marker: <id> — <desc>` canonical form |

## Discussion

### Test Design Quality

The test uses a three-tier structure: (1) synthesize a clean 10-event session note via `buildSessionModel` + `renderSessionNote`, proving the fixture is schema-valid; (2) inject a duplicate via string manipulation (`withDuplicateEvent05`), simulating the killed-agent re-entry failure mode; (3) assert rejection at the mutation layer via `applySessionMutation` and independently at the parser layer via `parseSessionNote`. The positive control (Event 11 on clean note) proves the rejection is duplicate-specific, not a general append failure. This is well-designed adversarial coverage.

### False-Positive Risk Assessment

The assertion `/.toThrow(/expected n=\d+/)` could theoretically match a different continuity violation. The second assertion `.toThrow(/n=5/)` narrows it to the specific conflicting number. Manual probing confirmed the actual message is `Event n=5 at index 5: expected n=6`, which matches both patterns. The test is not a false positive.

### Coverage Gaps

None identified for this task scope. The three tests in the describe block (clean parse, duplicate rejection, positive control) cover the complete behavior surface of the duplicate-event regression.

## Verdict

**Status**: PASS
**Confidence**: High
**Rationale**: All 8 AMENDED DoD checkboxes satisfied with file:line evidence. REQ-007 AC-5 (amended) and AC-6 both pass. Tests run green. Lint and type-check clean. Manual probe confirms the rejection message matches the asserted patterns and identifies the conflicting number. The regression-lock for the Phase X SESSION-2026-05-21_01 duplicate-event drift surface is mechanically enforced.

## Observations

- [outcome] All 8 AMENDED DoD items for TASK-027 pass with concrete evidence: test file at `mutation-invariants.test.ts:237-369`, rejection confirmed via manual probe #qa-pass #task-027
- [fact] The continuity superRefine at `session-note.ts:184-194` fires `Event n=5 at index 5: expected n=6` on a pre-duplicated note with two `## Event 05` headings, matching the asserted regex patterns `/expected n=\d+/` and `/n=5/` #continuity-check #schema
- [technique] Three-tier test design (clean fixture, string-injected duplicate, positive control) prevents false positives by proving rejection is duplicate-specific not a general append failure #test-design #adversarial
- [insight] The amended DoD correctly reflects the as-built behavior: duplicates are not rejected by name ("duplicate"/"already exists") but by the continuity invariant detecting out-of-sequence event numbers in the parsed array #amendment-alignment

## Relations

- relates_to [[TASK-027-SPEC-008: Session Mutation Duplicate Event Number Test]]
- relates_to [[REQ-007-SPEC-008: Integration Tests and Mutation Tests and Drift Regression Markers]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]