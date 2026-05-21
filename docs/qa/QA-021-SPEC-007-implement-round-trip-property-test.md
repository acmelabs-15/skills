---
title: 'QA-021-SPEC-007: Implement Round-Trip Property Test'
type: qa
permalink: qa/qa-021-spec-007-implement-round-trip-property-test
status: DONE
tags:
- qa
- spec-007
- round-trip
- task-012-spec-007
- retro-validation
---

# QA-021-SPEC-007: Implement Round-Trip Property Test

## Objective

Retro-validate TASK-012-SPEC-007 (round-trip property test) via `tests/plan-session-round-trip.test.ts` + companion fixtures `tests/fixtures/plan-note-sample.md` + `tests/fixtures/session-note-sample.md`.

- **Feature**: Round-Trip Property Test (TASK-012-SPEC-007)
- **Scope**: `_shared/composition/tests/plan-session-round-trip.test.ts` plus fixtures
- **Acceptance Criteria**: REQ-011-SPEC-007, ADR-003 D-8, ADR-001 F-8, F-6

## Approach

- **Test Types**: Property test (SHA-256 char-identity)
- **Environment**: Local (Bun 1.3.13)
- **Data Strategy**: Canonical fixtures in tests/fixtures/
- **Test File**: `_shared/composition/tests/plan-session-round-trip.test.ts`

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 4 | - | - |
| Passed | 4 | - | PASS |
| Failed | 0 | 0 | PASS |
| Skipped | 0 | - | - |
| Assertions | 4 | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| THE PROOF — Plan SHA-256 identity | Property | PASS | render(parse(plan-note-sample)) hash matches |
| THE PROOF — Session SHA-256 identity | Property | PASS | render(parse(session-note-sample)) hash matches |
| Plan mutation round-trip idempotence | Property | PASS | mutation output re-parses + re-renders to same hash |
| Session append-event round-trip | Property | PASS | mutation output preserves continuity hash |

## Discussion

### DoD Coverage

| DoD checkbox | Verdict | Evidence |
|---|---|---|
| Plan round-trip SHA-256 char-identity | PASS | THE PROOF — Plan test |
| Session round-trip SHA-256 char-identity | PASS | THE PROOF — Session test |
| Fixtures canonical form | PASS | tests/fixtures/plan-note-sample.md + session-note-sample.md |
| Bun.hash("sha256", ...) | PASS | uses `src/core/hash.ts` sha256 wrapper around Bun.hash |
| Tests run cleanly via bun test | PASS | 4/4 in 153ms |
| biome + tsc clean | PASS | clean |

### Note on Fixture Names

Spec text mentions `tests/round-trip.test.ts` + `tests/fixtures/plan-001-trimmed.md` + `tests/fixtures/session-fixture.md`. Actual canonical files are `tests/plan-session-round-trip.test.ts` + `tests/fixtures/plan-note-sample.md` + `tests/fixtures/session-note-sample.md`. The test contract (SHA-256 char-identity on canonical fixtures via Bun.hash) is satisfied; file names diverge from spec text but the round-trip cryptographic gate is functionally equivalent. No gap-TASK filed — naming is non-load-bearing.

## Verdict

**Status**: PASS
**Confidence**: High
**Rationale**: All 4 SHA-256 char-identity tests pass; this is the cryptographic correctness gate per ADR-003 D-8.

## Observations

- [outcome] round-trip property test 4/4 PASS — SHA-256 char-identity verified for plan + session + mutations #cryptographic-gate
- [fact] Test file at tests/plan-session-round-trip.test.ts not tests/round-trip.test.ts as in spec text; functional contract identical #naming-drift-non-blocking
- [insight] Round-trip cryptographic gate is the strongest correctness proof in the entire SPEC-007 stack #foundation-of-trust

## Relations

- validates [[TASK-012-SPEC-007: Implement Round-Trip Property Test]]
- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[REQ-011-SPEC-007: Round-Trip Property Test]]