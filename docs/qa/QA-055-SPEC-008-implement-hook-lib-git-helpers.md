---
title: 'QA-055-SPEC-008: Implement Hook Lib Git Helpers'
type: qa
permalink: qa/qa-055-spec-008-implement-hook-lib-git-helpers-1
tags:
- qa
- spec-008
- task-040
- hook-lib
- git-helpers
- verdict-pass
---

# QA-055-SPEC-008: Implement Hook Lib Git Helpers

## Summary
Per-TASK QA gate for [[TASK-040-SPEC-008: Implement Git Helpers for Staged and Diff Content]]. brain:🧠-qa (`a3f81104c662f2caa`) independent re-validation against impl commit `c4efe1e`. **PASS** — 16 DoD all green; DESIGN-004 `DiffNote.sha` deviation correctly followed TASK brief (`StagedNote[]` return); same pre-existing config gaps tracked.

## DoD validation (16/16 PASS)
- `git-staged-files.ts` exports `readStagedBrainNotes(repoRoot)` with `docs/**/*.md` filter + `git show :<file>` + empty-set handling
- `git-diff-commits.ts` exports `readPushDiffBrainNotes` + `readPrDiffBrainNotes` with no-upstream fallback (walks `@{u}` or returns `[]` + warning)
- All git subprocesses use `Bun.spawn` with explicit `cwd: repoRoot`
- 13 tests across hermetic fixture repos (mkdtemp + git init) covering happy paths + empty-set + no-upstream + non-docs filtering
- biome lint clean (0 errors); tsc exit 0 (workspace canonical gate); ADR-005 D-8 lib/ placement honored

## Verified spec-vs-task deviation
DESIGN-004 §spec ts header defines `DiffNote` interface with `sha: string` field. TASK-040 DoD specifies `StagedNote[]` for diff helpers (re-uses `StagedNote` type from sibling). Impl correctly followed TASK brief (binding contract). No downstream handler code references `sha`. DESIGN-004 amendment candidate; not a TASK-040 defect.

## Pre-existing latent gaps (same as TASK-039; tracked)
- `hooks/**` outside root tsconfig + biome includes; workspace tsc exit 0; style manually conformant
- 2 biome line-break suggestions in array literals (P2 style; non-blocking)

## REQ coverage (TASK-040 alone — utilities only)
| AC | Contribution |
|---|---|
| REQ-011 AC-3 (Layer 3 staged-files) | prerequisite utility provided; handler in TASK-043 |
| REQ-011 AC-4 (Layer 4 push-diff) | prerequisite utility provided with no-upstream fallback; handler in TASK-043 |
| REQ-011 AC-5 (Layer 5 PR-diff) | prerequisite utility provided; handler in TASK-043 |
| REQ-011 AC-7 (fail-open on infra error) | both modules throw on non-zero git exit; fail-open/closed semantics in handler |

No REQ AC fully satisfiable by TASK-040 alone. Same pattern as TASK-039 — utilities layer; handler scripts wire to full satisfaction.

## Test execution
- Scoped: 13/0/19 (3.18s)
- Full suite: 705/2/707 (zero new failures)

## Observations
- [outcome] Git helpers validated PASS; 13 hermetic-fixture tests; no-upstream fallback correctly returns [] + logged warning #qa #git-helpers
- [fact] All git subprocesses set `cwd: repoRoot` explicitly per Phase 3 security P1 (cwd-isolation; never rely on process cwd) #cwd-isolation
- [insight] Hermetic fixture-repo pattern (`mkdtemp` + `git init`) makes tests deterministic and CI-portable; bare origin used for push-diff fixture #hermetic-tests
- [decision] StagedNote re-used across staged + diff helpers per TASK brief; DESIGN-004's `DiffNote.sha` deferred to potential future amendment if Layer 4/5 handlers need it #design-amendment-candidate
- [risk] If a future Layer 4/5 handler needs per-commit SHA (e.g., for transcript-correlation), DESIGN-004 amendment + StagedNote→DiffNote migration becomes a follow-up TASK #sha-field-deferral

## Relations
- relates_to [[TASK-040-SPEC-008: Implement Git Helpers for Staged and Diff Content]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[REQ-011-SPEC-008: PreToolUse Blocking Gates]]
- relates_to [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]]