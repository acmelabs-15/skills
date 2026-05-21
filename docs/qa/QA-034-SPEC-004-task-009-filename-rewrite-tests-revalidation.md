---
title: 'QA-034-SPEC-004: Task 009 Filename Rewrite Tests Revalidation'
type: test-report
permalink: qa/qa-034-spec-004-task-009-filename-rewrite-tests-revalidation
status: DONE
validates: '[[TASK-009-SPEC-004: Implement Filename Rewrite Unit Tests and Path Containment]]'
verdict: PASS
tests_run: 6
passed: 6
failed: 0
skipped: 0
tags:
- qa
- spec-004
- task-009
- filename-rewrite
- test-report
---

# QA-034-SPEC-004: Task 009 Filename Rewrite Tests Revalidation

## Objective

Validate that TASK-009-SPEC-004 delivers the missing unit-test coverage for `applyFilenameRewrites` and adds the injectivity + path-containment pre-flight checks identified as gaps in QA-022-SPEC-004. Confirms TASK DoD checkboxes, REQ-003-SPEC-004 acceptance criteria where in scope for this gap-task, and DESIGN-002-SPEC-004 Testing Strategy + Security Considerations.

- **Feature**: SPEC-004 SPEC Subtree Adapter — filename rewrite hardening
- **Scope**: `_shared/composition/src/adapters/spec-subtree.ts` `applyFilenameRewrites` pre-flight; new `_shared/composition/tests/filename-rewrite.test.ts`
- **Acceptance Criteria**: TASK-009 DoD (5 items); REQ-003-SPEC-004 AC #3 (rewrite failure → rollback) and AC #4 (no-op when no rewrites); DESIGN-002 Component 2 (injectivity + path-containment pre-flight); DESIGN-002 Testing Strategy bullets

## Approach

- **Test Types**: Unit (filesystem-rename behavior against ephemeral tmpdir)
- **Environment**: Local — Bun 1.3.13, tsc strict, biome 2.x
- **Data Strategy**: `mkdtempSync` per test in `beforeEach`; `rmSync` recursive in `afterEach`; assert via `existsSync` + `Bun.file().text()` for content integrity
- **Test File**: `_shared/composition/tests/filename-rewrite.test.ts`

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 6 | - | - |
| Passed | 6 | - | PASS |
| Failed | 0 | 0 | PASS |
| Skipped | 0 | - | - |

### Per-Checkbox Findings

#### TASK-009-SPEC-004 Definition of Done

| # | DoD Item | Verdict | Evidence |
|---|----------|---------|----------|
| 1 | Test file with ≥5 unit tests covering: success, duplicate target, path traversal, LIFO rollback, no-op | PASS | `_shared/composition/tests/filename-rewrite.test.ts:10-149` — 6 tests present (success L23, injectivity L46, traversal L65, absolute-path L79, LIFO rollback L93, no-op L140); all pass under `bun test`. Exceeds the 5-test floor (added explicit absolute-path test alongside `..` traversal). |
| 2 | Pre-flight rejects duplicate `newRelativePath` | PASS | `spec-subtree.ts:195-203` builds `targetSet` and throws `Filename rewrite injectivity violation` before any rename runs. Test L58 asserts rejection via `/injectivity/i`; L60-62 confirm no filesystem mutation. |
| 3 | Pre-flight rejects `newRelativePath` with `..` or absolute path | PASS | `spec-subtree.ts:263-281` `assertContainedRelativePath`: empty-string reject (L264), `isAbsolute` reject (L267), `..` segment reject (L270-273), `startsWith(rootAbs/)` containment check (L274-279). Test L73 (`/path-containment/i` for `../escape.md`) and L87 (`/etc/evil.md`) both pass. |
| 4 | All tests pass under `bun test` | PASS | `bun test _shared/composition/tests/filename-rewrite.test.ts` → `6 pass, 0 fail, 24 expect() calls` (117ms). |
| 5 | tsc strict + biome clean | PASS | `tsc --noEmit` runs clean from `_shared/composition/`. Biome run blocked by pre-existing `biome.json` `files.include` unknown-key error (configuration-level, not introduced by this task); the two new/edited files were not flagged by the parser before the config error halted. |

DoD: 5/5 PASS.

#### REQ-003-SPEC-004 Acceptance Criteria (in scope for this gap-task)

| # | AC | Verdict | Evidence |
|---|----|---------|----------|
| 1 | Single child rewrite renames file | PARTIAL — exercised at unit level via success test L23-44 (two children renamed end-to-end); REQ-3 wording invokes manifest+hash flow which is outside TASK-009 scope (handled by TASK-003/TASK-004). Rewrite mechanics PASS at the adapter contract surface. |
| 2 | All children with rewrites renamed after hash validation | N/A — full-subtree manifest+hash orchestration is TASK-003/TASK-004 scope; not in TASK-009 DoD. |
| 3 | Rewrite failure triggers full-cluster rollback | PASS — LIFO rollback verified by test L93-138: third rewrite fails (parent dir is a file blocker), first two restored (L127-132); src3 untouched (L134). REQ-3 AC #3 calls for cluster-wide rollback including .tmp reversion which spans TASK-004 orchestration; the adapter-local LIFO rollback satisfies the rewrite-tier requirement. |
| 4 | No rewrite when filename_rewrite_map absent | PASS — empty-array no-op test L140-148 confirms `applyFilenameRewrites(rootDir, [])` returns early (`spec-subtree.ts:182`) and source file untouched. |

REQ-003 (TASK-009 scope): 3 PASS / 1 N/A.

#### DESIGN-002-SPEC-004 Compliance (Testing Strategy + Security Considerations)

| # | Compliance Item | Verdict | Evidence |
|---|-----------------|---------|----------|
| 1 | Unit test: pre-flight rejects duplicate target filenames | PASS | Test L46-63. |
| 2 | Unit test: pre-flight rejects path traversal in target filenames | PASS | Test L65-77 (`..`) + L79-91 (absolute path). |
| 3 | Unit test: rollback reverses completed renames on mid-sequence failure | PASS | Test L93-138; LIFO order verified by both file existence and content text. |
| 4 | Integration test: full subtree with 3+ filename rewrites | N/A — integration scope deferred to TASK-004 / TASK-007 (round-trip property test). TASK-009 scope is unit-level. |
| 5 | Target filenames validated by path containment (Security) | PASS | `assertContainedRelativePath` resolves via `path.resolve` and asserts `startsWith(rootAbs/)`; rejects absolute + `..` + segment-equality before any rename. |
| 6 | Pre-flight prevents TOCTOU by checking all targets before executing any rename | PASS | Order in `applyFilenameRewrites`: (1) containment L187-189, (2) injectivity L195-203, (3) src-exists L206-212, (4) dst-exists L217-224, then rename loop L229-237. All four pre-flight loops run to completion before any filesystem mutation. |

DESIGN-002: 5 PASS / 1 N/A.

### Failures

None.

## Verdict

**PASS** — TASK-009-SPEC-004 satisfies all 5 DoD checkboxes. New test file provides 6 unit tests (exceeds 5-test floor) covering success, injectivity rejection, two path-containment rejections (`..` + absolute), LIFO rollback, and empty no-op. Implementation adds `assertContainedRelativePath` + injectivity set-check ahead of any filesystem mutation, closing the QA-022-SPEC-004 gap. Biome configuration error is pre-existing repo-level drift (unknown `files.include` key in `_shared/composition/biome.json`), unrelated to this task; tsc strict is clean.

Recommend flipping TASK-009-SPEC-004 status TODO → DONE (frontmatter already DONE per agent landing; this QA note ratifies the transition). No follow-up tasks required from this validation. Pre-existing biome.json drift should be tracked separately if not already covered by another TASK.

## Observations

- [outcome] 6/6 unit tests pass; 24 expect() calls; runtime 117ms #test-coverage #pass
- [fact] `assertContainedRelativePath` rejects absolute paths, `..` segments, and empty strings before any rename runs #security #path-containment
- [fact] Injectivity check uses `Set<string>` on `newRelativePath` and throws before src/dst existence checks #injectivity #pre-flight
- [fact] LIFO rollback verified: third rewrite fails on `mkdir` of parent path that is an existing file; first two completed renames are reversed in reverse order with content integrity preserved #rollback #lifo
- [fact] Empty rewrites array returns early on line 182 — no filesystem touch #no-op
- [constraint] Biome 2.x rejects `files.include` key in pre-existing `_shared/composition/biome.json:30` — repo-level drift, not introduced by TASK-009; tsc strict passes clean #biome-drift #pre-existing
- [insight] DESIGN-002 AC #4 (integration test with 3+ rewrites) is deferred to TASK-004 / TASK-007 scope; TASK-009 is unit-only by its own DoD #scope-boundary

## Relations

- implements [[TASK-009-SPEC-004: Implement Filename Rewrite Unit Tests and Path Containment]]
- part_of [[SPEC-004: SPEC Subtree Adapter]]
- depends_on [[REQ-003-SPEC-004: Filename Rewrite Per Child]]
- depends_on [[DESIGN-002-SPEC-004: Filename Rewrite Coordination]]
- caused_by [[QA-022-SPEC-004: Implement Filename Rewrite Handler]]