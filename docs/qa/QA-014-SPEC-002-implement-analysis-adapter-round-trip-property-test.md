---
title: 'QA-014-SPEC-002: Implement ANALYSIS Adapter Round-Trip Property Test'
type: qa
permalink: qa/qa-014-spec-002-implement-analysis-adapter-round-trip-property-test
status: DONE
tags:
- qa
- spec-002
- round-trip
- retro
---

# QA-014-SPEC-002: Implement ANALYSIS Adapter Round-Trip Property Test

## Objective

Retro-validate the ANALYSIS adapter round-trip property test against TASK-005-SPEC-002 DoD and REQ-005-SPEC-002 AC items 1 and 4.

- **Feature**: ANALYSIS round-trip SHA-256 char-identity proof
- **Scope**: TASK-005-SPEC-002

## Approach

- **Test Types**: property, unit, hash-identity
- **Environment**: bun test v1.3.13; commit 2f049fd
- **Data Strategy**: shared fixture tests/fixtures/analysis-sample.md plus inline MutationSpec literal in the test file
- **Test File**: `_shared/composition/tests/analysis-round-trip.test.ts`

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 11 | - | - |
| Passed | 8 | - | [PARTIAL] |
| Failed | 1 | 0 | [FAIL] |
| Skipped | 2 | - | - |
| Assertions | 14 | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| DoD 1 — ANALYSIS fixture note at tests/fixtures/analysis/ following CONVENTIONS | DoD | [FAIL] | Fixture exists at tests/fixtures/analysis-sample.md (flat, hyphen-named), NOT tests/fixtures/analysis/sample-analysis.md (nested-folder, sample-prefixed). Path-prescription violated though content exists |
| DoD 2 — ANALYSIS fixture plan YAML (hand-crafted distribution plan) | DoD | [FAIL] | No YAML plan fixture exists; the round-trip test uses an inline MutationSpec TypeScript literal (analysis-round-trip.test.ts:11-19). TASK-005 prescribed a sample-analysis-plan.yaml file |
| DoD 3 — Round-trip property test: parse, decompose with plan, recompose with inverse plan | DoD | [PASS] | analysis-round-trip.test.ts:47-55 applyMutations then reverseMutations |
| DoD 4 — Assertion: SHA-256(original) === SHA-256(recomposed) | DoD | [PASS] | analysis-round-trip.test.ts:53 expect(sha256(recomposed)).toBe(sha256(originalContent)); test passes |
| DoD 5 — Test passes via bun test | DoD | [PASS] | bun test passes; suite returns 0 fail |
| DoD 6 — Fixture includes H3 findings with item-N identifiers | DoD | [PASS] | tests/fixtures/analysis-sample.md:29,46,67,80 — item-1 through item-4 in ### headings |
| DoD 7 — biome lint passes | DoD | [SKIPPED] | biome not invoked in retro scope |
| REQ-005 AC-1 — ANALYSIS fixture round-trip: SHA-256(original) === SHA-256(recomposed) | REQ | [PASS] | analysis-round-trip.test.ts:47-55 PROOF |
| REQ-005 AC-4 — round-trip test failure → bun test exits non-zero, gates pipeline | REQ | [PASS] | bun test runner enforces non-zero exit on assert failure (standard bun:test behavior) |

## Findings

The round-trip PROOF for ANALYSIS works: SHA-256 char-identity holds and the test passes. Two file-layout DoD items fail:

1. **Fixture path divergence** — TASK-005 mandates `tests/fixtures/analysis/sample-analysis.md`; actual is `tests/fixtures/analysis-sample.md`. The flat layout is consistent across all SPEC-002 fixtures and matches the existing SPEC-001 convention; however the TASK was explicit. Either TASK gets amended to match the actual flat layout, or the file should be moved into a subdirectory.
2. **Missing YAML plan fixture** — TASK-005 prescribes `tests/fixtures/analysis/sample-analysis-plan.yaml`. Actual test uses an inline TypeScript MutationSpec literal. The behavioral contract (renumber, then prove SHA-256 identity) is satisfied without a YAML, but the spec-prescribed test asset is absent.

Behaviorally the PROOF gate holds. Spec-vs-impl drift on file layout / YAML asset.

## Verdict

**PARTIAL** — REQ-005 AC-1 and AC-4 PASS (the proof works); two TASK-005 DoD items FAIL (file path, YAML fixture). Gap-TASK required.

## Observations

- [outcome] ANALYSIS round-trip SHA-256 PROOF passes: sha256(recomposed) === sha256(original) for the canonical fixture #verdict #proof-passes
- [fact] Fixture path is tests/fixtures/analysis-sample.md (flat) instead of TASK-prescribed tests/fixtures/analysis/sample-analysis.md (nested) #drift #file-layout
- [fact] No YAML plan fixture exists; test uses inline TypeScript MutationSpec literal; TASK-005 prescribed sample-analysis-plan.yaml #drift #yaml-asset
- [insight] All SPEC-002 round-trip tests use inline TS literals over YAML fixtures; either TASK DoDs need amendment or YAMLs need creation across the board #pattern-vs-spec

## Relations

- implements [[TASK-005-SPEC-002: Implement ANALYSIS Adapter Round-Trip Property Test]]
- relates_to [[REQ-005-SPEC-002: Round-Trip Property Tests for ANALYSIS and SESSION]]
- relates_to [[REQ-001-SPEC-002: ANALYSIS Adapter Implementation]]
- part_of [[SPEC-002: Simple Adapters]]
