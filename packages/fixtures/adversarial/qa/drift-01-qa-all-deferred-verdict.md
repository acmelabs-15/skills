---
title: 'QA-091-SPEC-008: Adversarial QA All Deferred Verdict'
type: qa
permalink: qa/qa-091-spec-008-adversarial-all-deferred-verdict
status: DRAFT
tags: [drift-marker, phase-x-surface-qa-deferred-verdict, qa-validator]
---

<!-- drift-marker: drift-01-qa-all-deferred-verdict; lying-behavior: QA declares an unconditional PASS verdict while a portion of the suite was skipped (deferred/unrun) — failed=0 and tests_run>0 but skipped>0, so the validator DERIVES a PARTIAL verdict and reports a mismatch against the declared PASS; the summary numbers stay self-consistent (tests_run = passed+failed+skipped) so the schema accepts the note; expected-reject: /verdict mismatch: declared PASS vs derived PARTIAL/ -->

# QA-091-SPEC-008: Adversarial QA All Deferred Verdict

## Objective

Verify the coverage-matrix aggregator against its acceptance criteria. This
fixture encodes a lying QA claim: an unconditional PASS verdict declared while
a portion of the suite was skipped (deferred), which the validator catches as a
PASS-vs-PARTIAL verdict mismatch.

- **Feature**: Coverage Matrix Aggregator (TASK-031-SPEC-008)
- **Scope**: shared/composition/src/coverage/matrix.ts
- **Acceptance Criteria**: REQ-031-SPEC-008 AC-1, AC-3

## Approach

- **Test Types**: Unit
- **Environment**: Local (Bun 1.3.13)
- **Data Strategy**: Inline fixtures
- **Test File**: `tests/coverage-matrix.test.ts`

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 6 | - | - |
| Passed | 4 | - | [PASS] |
| Failed | 0 | 0 | [PASS] |
| Skipped | 2 | - | - |
| Assertions | 11 | - | - |
| Execution Time | 22ms | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| aggregates per-TASK verdicts | Unit | [PASS] | Happy path |
| flags uncovered rows | Unit | [PASS] | - |
| handles empty verdict set | Unit | [PASS] | - |
| evidence line present per row | Unit | [PASS] | - |
| cross-spec aggregation | Unit | [SKIPPED] | Deferred to next wave |
| stress: 1000 verdicts | Unit | [SKIPPED] | Deferred to next wave |

## Findings

Two cases were skipped (deferred) yet the verdict was declared PASS. A skipped
case is not a pass; the validator derives PARTIAL and reports the mismatch.

## Observations

- [outcome] 4 passed, 0 failed, 2 skipped; declared verdict PASS contradicts the derived PARTIAL #drift #verdict-mismatch
- [problem] A skipped/deferred test is not a pass; declaring unconditional PASS masks the deferred coverage gap #masked-gap
- [technique] Summary numbers stay self-consistent (6 = 4 + 0 + 2) so the schema accepts the note; the validator re-derives the verdict and rejects #schema-vs-validator

## Relations

- relates_to [[TASK-031-SPEC-008: Implement Coverage Matrix Aggregator]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
