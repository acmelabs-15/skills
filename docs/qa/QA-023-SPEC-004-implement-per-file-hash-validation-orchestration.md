---
title: 'QA-023-SPEC-004: Implement Per-File Hash Validation Orchestration'
type: qa
permalink: qa/qa-023-spec-004-implement-per-file-hash-validation-orchestration
status: DONE
tags:
- qa
- spec-004
- hash-validation
- task-004-spec-004
---

# QA-023-SPEC-004: Implement Per-File Hash Validation Orchestration

## Objective

Verify TASK-004-SPEC-004 implements per-file SHA-256 validation with cluster rollback per REQ-004-SPEC-004 and DESIGN-003-SPEC-004.

- **Feature**: Per-File Hash Validation Orchestration (TASK-004-SPEC-004)
- **Scope**: `validateSubtreeRoundTrip` method (spec-subtree.ts:151-174), `SubtreeHashValidationError` class (spec-subtree.ts:41-52)
- **Acceptance Criteria**: TASK-004 DoD + REQ-004 AC + DESIGN-003 Components 1 + 2

## Approach

- **Test Types**: Unit, Integration (round-trip PROOF)
- **Environment**: Local (Bun 1.3.13)
- **Data Strategy**: Inline + on-disk fixtures with non-trivial renumber + wikilink maps; non-injective map for failure case
- **Test File**: `_shared/composition/tests/spec-subtree-round-trip.test.ts`

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 3 | - | - |
| Passed | 3 | - | [PASS] |
| Failed | 0 | 0 | [PASS] |
| Skipped | 0 | - | - |
| Assertions | 12 | - | - |
| Execution Time | <100ms | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| THE PROOF: per-file SHA-256 identity across full subtree decompose -> recompose | Integration | PASS | spec-subtree-round-trip.test.ts:108 — `validateSubtreeRoundTrip` does not throw |
| THE PROOF (explicit per-file hash assertion) | Integration | PASS | spec-subtree-round-trip.test.ts:115 — explicit `sha256(orig) === sha256(recovered)` for root + 3 children |
| SubtreeHashValidationError is thrown when round-trip fails | Unit | PASS | spec-subtree-round-trip.test.ts:128 — non-injective map produces validation error |

## Findings

### DoD Coverage Table

| DoD Item | Status | Evidence |
|----------|--------|----------|
| validateSubtreeHashes validates N+1 files (1 root + N children) independently | PARTIAL | `validateSubtreeRoundTrip` iterates root + all children with independent SHA-256 comparison (spec-subtree.ts:151). Function name and signature differ from DESIGN-003 (`validateSubtreeHashes(adapter, manifest, sourceContents, stagedContents)`). |
| Per-file hash comparison uses sha256() from core/hash.ts | PASS | `import { sha256 } from "../core/hash.js"` (spec-subtree.ts:8); used at lines 154/155/168/169 |
| Reverse mutations include inverse renumber_map + inverse wikilink_map + inverse frontmatter_map | PASS | `reverseMutations` (spec-subtree.ts:105) inverts all three maps |
| Single-file mismatch returns failure with file path + expected/actual hashes | PASS | `SubtreeHashValidationError` carries `failedFile`, `expected`, `actual` (spec-subtree.ts:41) |
| ClusterRollback removes all .tmp files on validation failure | FAIL | No `.tmp` file management exists in this adapter. Validation is in-memory only. DESIGN-003 Component 2 `rollbackCluster(stagedPaths, renamedPaths)` is not implemented. |
| Unit tests cover: all-pass scenario, single-file failure, empty children array | PARTIAL | All-pass: PASS. Single-file failure: PASS (via non-injective map). Empty children array: NO test exercises this. |

### REQ-004-SPEC-004 AC Coverage

| AC | Status | Evidence |
|----|--------|----------|
| N+1 independent SHA-256 comparisons | PASS | spec-subtree.ts:154-173 explicitly hashes root then iterates children |
| Reverse-mutated child matches original SHA-256 | PASS | spec-subtree-round-trip.test.ts:115-125 |
| Mismatch error identifies specific file path | PASS | `SubtreeHashValidationError.failedFile` carries path |
| Mismatch -> ALL .tmp files removed | FAIL | No .tmp file management. In-memory adapter. Cluster rollback at filesystem level is caller's responsibility but not coordinated by adapter. |
| All pass -> atomic rename phase executes | FAIL | No atomic rename phase exists in this adapter. Pure in-memory. |

### DESIGN-003-SPEC-004 Compliance

| Component | Status | Evidence |
|-----------|--------|----------|
| Component 1 PerFileHashValidator — `validateSubtreeHashes(adapter, manifest, sourceContents, stagedContents): HashValidationResult` | FAIL | Function name `validateSubtreeRoundTrip(manifest, mutations)`; signature differs. No `HashValidationResult`, `HashValidationEntry`, or per-file results aggregation — throws on first failure instead. |
| Component 2 ClusterRollback — `rollbackCluster(stagedPaths, renamedPaths)` | FAIL | Not implemented. No .tmp file cleanup. |
| 4-step protocol: extract source -> apply mutations -> reverse mutations -> compare hashes | PARTIAL | Implementation skips "extract source" (treats `originalManifest.rootContent` and child contents as already-extracted full file) and skips the staged-write step (operates on in-memory mutated content). Logical equivalence holds for hash math but the orchestration around it differs. |
| Short-circuit on first failure with full diagnostics aggregated | FAIL | Throws on first mismatch — no continue-and-aggregate per DESIGN-003 |
| Collect-then-validate pattern (stage all, then validate all) | FAIL | No staging phase. Apply + verify done together. |

### Verdict

**Status**: PARTIAL
**Confidence**: High
**Rationale**: The core cryptographic invariant (per-file SHA-256 identity across decompose-recompose) is proven by spec-subtree-round-trip.test.ts and PASSES. The non-injective failure case correctly raises `SubtreeHashValidationError` with the failing file. However, DESIGN-003's broader orchestration contract — filesystem-aware stage-all, validate-all, cluster .tmp rollback, structured `HashValidationResult` aggregation — is not implemented. The proof passes; the architecture does not match the design.

## Observations

- [outcome] THE PROOF PASSES — per-file SHA-256 identity proven across root + 3 children with non-trivial renumber + wikilink mutations #proof #sha-256
- [fact] `SubtreeHashValidationError` correctly identifies failing file + expected vs actual hash #error-reporting
- [problem] No `.tmp` file management or `ClusterRollback` per DESIGN-003 Component 2 — cluster-level filesystem rollback is caller's responsibility not adapter's #design-gap
- [problem] Function name + signature differ from DESIGN-003 Component 1 (`validateSubtreeRoundTrip` vs `validateSubtreeHashes`); no `HashValidationResult` aggregation #architectural-drift
- [insight] In-memory hash validation is sufficient for the PROOF property but pushes filesystem orchestration responsibility to a higher layer (decompose/recompose skill, not yet built) #scope #separation

## Relations

- validates [[TASK-004-SPEC-004: Implement Per-File Hash Validation Orchestration]]
- part_of [[SPEC-004: SPEC Subtree Adapter]]