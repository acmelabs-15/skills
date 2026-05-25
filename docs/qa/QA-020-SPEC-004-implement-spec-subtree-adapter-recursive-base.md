---
title: 'QA-020-SPEC-004: Implement SPEC Subtree Adapter Recursive Base'
type: qa
permalink: qa/qa-020-spec-004-implement-spec-subtree-adapter-recursive-base
status: DONE
tags:
- qa
- spec-004
- adapter
- recursive
- task-001-spec-004
---

# QA-020-SPEC-004: Implement SPEC Subtree Adapter Recursive Base

## Objective

Verify TASK-001-SPEC-004 establishes the `SpecSubtreeAdapter` class implementing the `CompositionAdapter` 5-method interface plus subtree orchestration entry points, per REQ-001-SPEC-004 and DESIGN-001-SPEC-004.

- **Feature**: SPEC Subtree Adapter recursive base (TASK-001-SPEC-004)
- **Scope**: `shared/composition/src/adapters/spec-subtree.ts` (272 lines)
- **Acceptance Criteria**: TASK-001 DoD + REQ-001-SPEC-004 AC + DESIGN-001-SPEC-004 Component 1 interface

## Approach

- **Test Types**: Unit, Integration (round-trip)
- **Environment**: Local (Bun 1.3.13, biome, tsc strict via project tsconfig)
- **Data Strategy**: Inline fixtures + on-disk SPEC subtree fixtures (`tests/fixtures/spec-subtree/`)
- **Test File**: `shared/composition/tests/spec-subtree-adapter.test.ts`

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 8 | - | - |
| Passed | 8 | - | [PASS] |
| Failed | 0 | 0 | [PASS] |
| Skipped | 0 | - | - |
| Assertions | 27 | - | - |
| Execution Time | <100ms | <5s | [PASS] |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| sourceType is 'spec-subtree' | Unit | PASS | spec-subtree-adapter.test.ts:101 — but REQ-001 AC says "spec" (drift) |
| parse + serialize is structure-preserving and idempotent | Unit | PASS | spec-subtree-adapter.test.ts:105 |
| extractByRange returns lines [start, end] | Unit | PASS | spec-subtree-adapter.test.ts:115 |
| applyMutations on single file rewrites identifiers (root only) | Unit | PASS | spec-subtree-adapter.test.ts:126 |
| applySubtreeMutations applies mutations to root and every child | Unit | PASS | spec-subtree-adapter.test.ts:137 |
| applySubtreeMutations with frontmatter_map updates title in all files | Unit | PASS | spec-subtree-adapter.test.ts:151 |
| reverseMutations round-trips a renumber+wikilink combination | Unit | PASS | spec-subtree-adapter.test.ts:166 |
| reverseSubtreeMutations recovers original content for all files | Unit | PASS | spec-subtree-adapter.test.ts:179 |

## Findings

### DoD Coverage Table

| DoD Item | Status | Evidence |
|----------|--------|----------|
| SpecSubtreeAdapter class at `src/adapters/spec-subtree.ts` implements CompositionAdapter | PASS | `class SpecSubtreeAdapter implements CompositionAdapter` (spec-subtree.ts:64) |
| All 5 methods compile with correct signatures under tsc strict mode | PASS | `bunx tsc --noEmit -p tsconfig.json` clean; biome clean |
| processSubtree() accepts SpecSubtreeManifest and returns ProcessResult | FAIL | No `processSubtree` method exists. Implementation provides `applySubtreeMutations`, `reverseSubtreeMutations`, `validateSubtreeRoundTrip`, `applyFilenameRewrites` instead. No `ProcessResult` type exists. |
| parse/serialize round-trip test passes on sample SPEC content | PASS | spec-subtree-adapter.test.ts:105 |
| applyMutations/reverseMutations inverse property holds for test renumber_map | PASS | spec-subtree-adapter.test.ts:166 |
| Exported from adapters barrel file | FAIL | No `src/adapters/index.ts` barrel exists. Tests import directly from `../src/adapters/spec-subtree.js`. |

### REQ-001-SPEC-004 AC Coverage

| AC | Status | Evidence |
|----|--------|----------|
| tsc strict compile with SpecSubtreeAdapter implementing CompositionAdapter + readonly sourceType "spec" | FAIL | tsc passes, but `sourceType = "spec-subtree"` (spec-subtree.ts:65), not `"spec"` as REQ-001 AC requires. Schema also uses `"spec-subtree"` (distribution schema line 57). Naming drift between REQ-001-SPEC-004 AC1 (and DESIGN-001 Component 1 declared `readonly sourceType = "spec"`) and implementation. |
| Plan YAML source_type "spec" + subtree_manifest -> adapter iterates root + children | PARTIAL | `applySubtreeMutations` iterates root + children, but discriminant value is `"spec-subtree"` not `"spec"`. |
| Per-child renumber via single-pass replacement | PASS | `applySinglePassReplace` (spec-subtree.ts:239) using regex alternation, sorted by length desc for greedy-longest-first match. |
| Any single child fails hash validation -> entire cluster rolled back | PARTIAL | `validateSubtreeRoundTrip` throws `SubtreeHashValidationError` on first mismatch; in-memory only. No `.tmp` file rollback (no filesystem staging in this adapter — staging is the caller's job, but DESIGN-001 places orchestration responsibility on adapter via `processSubtree`). |
| Intra-spec wikilinks rewritten via wikilink_map preserving structural relationship | PASS | `applyMutations` calls `applySinglePassReplace` over `wikilink_map`; round-trip test (spec-subtree-round-trip.test.ts) confirms wikilinks preserved across decompose-recompose. |

### DESIGN-001-SPEC-004 Compliance

| Component | Status | Evidence |
|-----------|--------|----------|
| Component 1 SpecSubtreeAdapter — `readonly sourceType = "spec"` + `processSubtree(): ProcessResult` | FAIL | sourceType is `"spec-subtree"`; no `processSubtree`; no `ProcessResult` type. |
| Component 2 SubtreeOrchestrator — `orchestrateSubtree(adapter, manifest, readFile, writeTemp): ProcessResult` | FAIL | No standalone orchestrator function. Two-phase stage-all then validate-all pattern not implemented as filesystem-aware orchestration; only in-memory `applySubtreeMutations` exists. |
| Component 3 FrontmatterMutator — `applyFrontmatterMap` / `reverseFrontmatterMap` exported helpers | PARTIAL | Functionality present as private method `applyFrontmatterMutations` on the adapter (spec-subtree.ts:256) — not exported helpers. |

### Verdict

**Status**: PARTIAL
**Confidence**: High
**Rationale**: The 8 existing tests pass and the core 5-method interface compiles + works (parse, serialize, extractByRange, applyMutations, reverseMutations). However, three DoD items fail evidence: (1) no `processSubtree()` method or `ProcessResult` type; (2) no adapters barrel; (3) sourceType is `"spec-subtree"` instead of `"spec"` per REQ-001 AC1 + DESIGN-001 Component 1 type signature. The implementation deliberately diverges from DESIGN-001 (composing adapter + free functions vs single `processSubtree()` entrypoint), which is a substantive architectural drift not yet adjudicated.

## Observations

- [outcome] 8/8 tests pass with 27 expect calls; core 5-method interface works correctly #test-results
- [fact] sourceType is "spec-subtree" in implementation + schema, but REQ-001-SPEC-004 AC and DESIGN-001 Component 1 say "spec" — naming drift #drift #naming
- [problem] No `processSubtree()` method or `ProcessResult` type per DESIGN-001 Component 1 + TASK-001 DoD #dod-gap
- [problem] No `src/adapters/index.ts` barrel file per TASK-001 DoD; tests import directly #dod-gap #barrel
- [insight] In-memory orchestration via `applySubtreeMutations` + `validateSubtreeRoundTrip` works for the round-trip proof, but DESIGN-001 calls for filesystem-aware orchestration with stage-all then validate-all and cluster .tmp rollback — pushed to caller in current implementation #architectural-drift

## Relations

- depends_on [[TASK-001-SPEC-004: Implement SPEC Subtree Adapter Recursive Base]]
- part_of [[SPEC-004: SPEC Subtree Adapter]]
