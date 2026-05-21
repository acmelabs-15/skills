---
title: 'QA-026-SPEC-004: SPEC Adapter Round-Trip Property Test'
type: qa
permalink: qa/qa-026-spec-004-spec-adapter-round-trip-property-test
status: DONE
tags:
- qa
- spec-004
- round-trip
- proof
- task-007-spec-004
---

# QA-026-SPEC-004: SPEC Adapter Round-Trip Property Test

## Objective

Verify TASK-007-SPEC-004 ships the SPEC subtree round-trip property test that proves per-file SHA-256 identity across decompose -> recompose per REQ-006-SPEC-004.

- **Feature**: SPEC subtree round-trip property test (TASK-007-SPEC-004)
- **Scope**: `_shared/composition/tests/spec-subtree-round-trip.test.ts` (206 lines)
- **Acceptance Criteria**: TASK-007 DoD + REQ-006-SPEC-004 AC

## Approach

- **Test Types**: Integration (property test)
- **Environment**: Local (Bun 1.3.13)
- **Data Strategy**: On-disk fixtures (`tests/fixtures/spec-subtree/`) + in-memory non-trivial mutation maps
- **Test File**: `_shared/composition/tests/spec-subtree-round-trip.test.ts`

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 11 | - | - |
| Passed | 11 | - | [PASS] |
| Failed | 0 | 0 | [PASS] |
| Skipped | 0 | - | - |
| Assertions | 27 | - | - |
| Execution Time | <100ms | <5s | [PASS] |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| sourceType is 'spec-subtree' | Unit | PASS | line 67 |
| single-file applyMutations + reverseMutations is identity | Unit | PASS | line 71 |
| applySubtreeMutations applies mutations to root + all children | Integration | PASS | line 78 |
| applySubtreeMutations + reverseSubtreeMutations is identity for all files | Integration | PASS | line 90 |
| THE PROOF: per-file SHA-256 identity across full subtree decompose -> recompose | Integration | PASS | line 108 |
| THE PROOF (explicit per-file hash assertion) | Integration | PASS | line 115 |
| SubtreeHashValidationError is thrown when round-trip fails | Unit | PASS | line 128 (non-injective map) |
| schema validates a valid spec-subtree manifest derived from fixture content | Integration | PASS | line 142 |
| schema rejects non-injective relative_path entries (duplicates) | Unit | PASS | line 156 |
| schema rejects path traversal (..) | Unit | PASS | line 169 |
| schema validates a full distribution plan derived from fixture content | Integration | PASS | line 179 |

## Findings

### DoD Coverage Table

| DoD Item | Status | Evidence |
|----------|--------|----------|
| Test reads fixture SPEC subtree (4 files: root + REQ + DESIGN + TASK) | PARTIAL | Test reads 4 files but they are root + 2 REQs + 1 TASK (no DESIGN). 4-file count met; child-type distribution differs from DoD. |
| Decompose (distribution plan) produces correctly renumbered destination files | PASS | line 78 — `applySubtreeMutations` confirms `SPEC-100`, `REQ-100`, `TASK-100` present and `SPEC-001` absent in all mutated files |
| Recompose (inverse plan) produces files byte-identical to originals | PASS | line 90 + line 115 — every recovered child equals original; per-file SHA-256 confirmed |
| Per-file SHA-256 comparison: sha256(original) === sha256(recomposed) for all 4 files | PASS | line 115-125 — explicit assertion for root + 3 children |
| Inverse plan generated programmatically (not hand-crafted) | PARTIAL | The test uses the SAME `distributionSpec` MutationSpec for both apply and reverse (via `reverseMutations`/`reverseSubtreeMutations`), which internally inverts the maps via `invertMap`. DoD asks for "programmatically generated inverse plan" — strictly speaking the adapter does the inversion, not the test, but the property holds either way. |
| Test completes in under 5 seconds | PASS | Full SPEC-004 test suite (3 files, 27 tests) ran in 94ms — well under 5s |
| bun test passes with this test included | PASS | `bun test tests/spec-subtree-round-trip.test.ts` -> 11 pass, 0 fail |

### REQ-006-SPEC-004 AC Coverage

| AC | Status | Evidence |
|----|--------|----------|
| Fixture has 1 root + at least 3 children (1 REQ + 1 DESIGN + 1 TASK minimum) | PARTIAL | 4-file count met (root + 2 REQ + 1 TASK); DESIGN child missing |
| SHA-256(recomposed) === SHA-256(original) for each file | PASS | line 115 explicit per-file assertion |
| Distribution plan renames SPEC-001 -> SPEC-003 with entity renumber + filename rewrite + frontmatter mutation | PARTIAL | Test renames SPEC-001 -> SPEC-100 (not SPEC-003 per AC literal) — semantically equivalent (any non-overlapping renumber). NO filename rewrite exercised (test operates in memory, not filesystem). NO frontmatter mutation exercised (no frontmatter_map in `distributionSpec`). |
| Composition plan is mathematical inverse of distribution plan | PARTIAL | Achieved via `reverseSubtreeMutations` using same MutationSpec + adapter-internal `invertMap`. No separate composition plan YAML fixture (see QA-025-SPEC-004). |
| Intra-spec wikilinks restored to original form | PASS | line 90 confirms full content recovery; wikilinks are in test wikilink_map |
| Test completes in under 5 seconds in CI via bun test | PASS | 94ms wall time |

### Verdict

**Status**: PARTIAL
**Confidence**: High
**Rationale**: The PROOF — per-file SHA-256 identity across decompose -> recompose — passes for all 4 fixture files with non-trivial renumber + wikilink mutations. However, three areas are uncovered by the existing test: (a) no DESIGN-type child mutation exercised (DoD + REQ-006 AC1); (b) no filename_rewrite_map exercised in the round-trip (DESIGN-001/002 capability not validated end-to-end); (c) no frontmatter_map exercised in the round-trip distributionSpec (frontmatter mutation tested only in spec-subtree-adapter.test.ts:151, not in this PROOF). The cryptographic invariant holds for the cases exercised.

## Observations

- [outcome] THE PROOF PASSES — per-file SHA-256 identity proven across decompose -> recompose for 4-file fixture #proof #sha-256
- [problem] Test does not exercise DESIGN-type child mutation (fixture has 2 REQs + 1 TASK + 0 DESIGN) #coverage-gap #fixture-dependency
- [problem] Test distributionSpec has no `frontmatter_map` field; THE PROOF does not exercise frontmatter mutation round-trip #coverage-gap
- [problem] Test does not exercise filename_rewrite_map in round-trip cycle; filesystem rename capability untested in PROOF context #coverage-gap
- [insight] Inverse plan is not programmatically generated at test-level — the adapter `reverseMutations` does the inversion internally via `invertMap` #design

## Relations

- validates [[TASK-007-SPEC-004: SPEC Adapter Round-Trip Property Test]]
- part_of [[SPEC-004: SPEC Subtree Adapter]]
