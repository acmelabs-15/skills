---
title: 'QA-022-SPEC-004: Implement Filename Rewrite Handler'
type: qa
permalink: qa/qa-022-spec-004-implement-filename-rewrite-handler
status: DONE
tags:
- qa
- spec-004
- filename-rewrite
- task-003-spec-004
---

# QA-022-SPEC-004: Implement Filename Rewrite Handler

## Objective

Verify TASK-003-SPEC-004 implements filename rewrite (`applyFilenameRewrites`) with pre-flight validation and LIFO rollback per REQ-003-SPEC-004 and DESIGN-002-SPEC-004.

- **Feature**: Filename Rewrite Handler (TASK-003-SPEC-004)
- **Scope**: `applyFilenameRewrites` method (spec-subtree.ts:181-235)
- **Acceptance Criteria**: TASK-003 DoD + REQ-003-SPEC-004 AC + DESIGN-002 Components 1 + 2

## Approach

- **Test Types**: Unit (target — but none exist)
- **Environment**: Local (Bun 1.3.13)
- **Data Strategy**: Filesystem fixtures + invalid-path injection (NOT exercised in current test suite)
- **Test File**: NONE — no dedicated test file exists for filename rewrites

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 0 | 3+ | [FAIL] |
| Passed | 0 | - | - |
| Failed | 0 | - | - |
| Skipped | 0 | - | - |
| Assertions | 0 | - | - |
| Execution Time | n/a | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| (no tests authored) | Unit | SKIPPED | No file in `tests/` exercises `applyFilenameRewrites` |

## Findings

### DoD Coverage Table

| DoD Item | Status | Evidence |
|----------|--------|----------|
| validateFilenameRewrites rejects duplicate target filenames | FAIL | No `validateFilenameRewrites` exported function exists. `applyFilenameRewrites` (spec-subtree.ts:181) does pre-flight `dstExists` check, but no test exercises duplicate-target case. |
| validateFilenameRewrites rejects path traversal in target filenames | FAIL | No path-traversal check on `newRelativePath` in `applyFilenameRewrites`. The `join(rootDir, rw.newRelativePath)` resolution does NOT defend against `../escape.md` style paths. No test. |
| applyFilenameRewrites renames all files per filename_rewrite_map | PARTIAL | Implementation present (spec-subtree.ts:208-216) using Bun.file/Bun.write/delete + mkdir. No test exercises the happy path. |
| rollbackFilenameRewrites reverses completed renames in LIFO order | PARTIAL | LIFO rollback in catch block (spec-subtree.ts:217-234). No test exercises rollback. |
| Child entries with no filename_rewrite_map are skipped | PARTIAL | Function takes `rewrites: FilenameRewriteSpec[]` array directly — entries are only present if caller adds them. No test. |
| Unit tests cover: successful rewrite, conflict detection, rollback on failure | FAIL | NONE of these three test cases exist. |

### REQ-003-SPEC-004 AC Coverage

| AC | Status | Evidence |
|----|--------|----------|
| Child entry with filename_rewrite_map -> file renamed to target | FAIL | No test asserting filename change post-rewrite |
| All children with rewrite map -> all renamed | FAIL | No test exercises subtree-level rewrite |
| Rewrite fails (target exists) -> full cluster rollback | PARTIAL | Pre-flight does check dst exists (line 199); rollback path exists but no test triggers it |
| Child entry without filename_rewrite_map -> no rename | PASS (by construction) | Function only acts on entries passed in |

### DESIGN-002-SPEC-004 Compliance

| Component | Status | Evidence |
|-----------|--------|----------|
| Component 1 FilenameRewriter — `applyFilenameRewrites(manifest, destDir): RewriteResult` | PARTIAL | Implementation takes `(rootDir, rewrites[])` and returns `Promise<void>` (throws on failure). DESIGN-002 declares `RewriteResult` return with per-rewrite status array — not implemented. |
| Component 2 RewriteValidator — `validateFilenameRewrites(manifest, destDir): ValidationResult` | FAIL | No separate validator function. Pre-flight is inline within `applyFilenameRewrites`. |
| `rollbackFilenameRewrites(completedRewrites)` exported | FAIL | Inline LIFO in catch block, not exported function. |
| Pre-flight: no two rewrites target same filename (injectivity) | FAIL | Pre-flight only checks source-exists and dst-not-exists. Two rewrites targeting the same filename are not detected before execution. The dst-exists check would catch it on second iteration only AFTER first succeeded, triggering rollback rather than pre-flight rejection. |
| Pre-flight: target filenames pass path-containment validation | FAIL | No `containedPathSchema` use on `newRelativePath`. |

### Verdict

**Status**: FAIL
**Confidence**: High
**Rationale**: While core filename-rewrite mechanics (rename via Bun.write+delete, pre-flight src/dst check, LIFO rollback) are implemented in `applyFilenameRewrites`, ZERO unit tests exist (TASK-003 DoD explicitly requires "Unit tests cover: successful rewrite, conflict detection, rollback on failure"). Two REQ-003 AC items have no evidence. Pre-flight injectivity + path-containment checks are missing per DESIGN-002.

## Observations

- [problem] No test file exercises `applyFilenameRewrites` — TASK-003 DoD requires 3 specific test cases; zero exist #dod-gap #test-coverage
- [problem] Pre-flight lacks injectivity check (two rewrites targeting same filename) per DESIGN-002 Component 2 #design-gap
- [problem] Pre-flight lacks path-containment check on `newRelativePath` per DESIGN-002 + REQ-005 security model #security #design-gap
- [fact] `applyFilenameRewrites` signature is `(rootDir, rewrites[]): Promise<void>`; DESIGN-002 declared `(manifest, destDir): RewriteResult` #architectural-drift
- [insight] LIFO rollback logic exists and looks correct, but is dead until a test exercises mid-sequence failure #unverified

## Relations

- validates [[TASK-003-SPEC-004: Implement Filename Rewrite Handler]]
- part_of [[SPEC-004: SPEC Subtree Adapter]]
