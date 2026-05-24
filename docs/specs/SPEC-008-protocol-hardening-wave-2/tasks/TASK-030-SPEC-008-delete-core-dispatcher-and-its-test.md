---
title: 'TASK-030-SPEC-008: Delete Core Dispatcher and Its Test'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-030-spec-008-delete-core-dispatcher-and-its-test-1
status: DONE
tags:
- spec-008
- track-4
- deletion
- dispatcher
- atomic
---

# TASK-030-SPEC-008: Delete Core Dispatcher and Its Test

## Description

Delete the prototype dispatcher `shared/composition/src/core/dispatcher.ts` (33 lines; registers only 4 of 5 source_types — missing `spec`; superseded by SPEC-005 `registry.ts`) and its paired test file per ADR-005 D-7. Evidence captured pre-lock: zero production imports of `core/dispatcher`; only `core/adapter.ts` interface is consumed by adapters. Deletion is over fix because keeping a duplicate dispatcher creates ambiguity about which is authoritative.

Steps:

1. `git rm shared/composition/src/core/dispatcher.ts`
2. `git rm shared/composition/src/core/dispatcher.test.ts` (or its actual path; verify via `find`)
3. Verify `shared/composition/src/core/adapter.ts` is untouched (interface preservation)
4. Run `bun test` from repo root
5. Test count: equals pre-deletion count minus the dispatcher.test.ts case count; verdict: pass
6. If any test breaks, investigation reveals a hidden dependency to be fixed (per D-7 verbatim)

## Definition of Done
- [x] `git rm shared/composition/src/core/dispatcher.ts` executed
- [x] Dispatcher test file removed (path verified by `find shared/composition -name 'dispatcher.test.ts'` returning zero results post-removal)
- [x] `shared/composition/src/core/adapter.ts` is unchanged (`git diff shared/composition/src/core/adapter.ts` shows no changes)
- [x] `rg "from ['\"].*core/dispatcher" -t ts` returns zero matches across `src/`, `skills/`, `tests/`
- [x] `bun test` exits 0; test count equals pre-deletion count minus dispatcher.test.ts case count (707 → 701; delta 6 = dispatcher.test.ts case count)
- [x] No regression in any adapter test (`shared/composition/src/adapters/*.test.ts` all pass)
- [x] Commit message references ADR-005 D-7 in body for archaeological provenance (commit 64dd1ca)


## ADR Compliance

- ADR-005 D-7: "Delete `core/dispatcher.ts` + its test (Recommended; evidence-confirmed safe)" — verbatim user lock per SESSION-2026-05-23_02 Event 16

## Files Affected

- `shared/composition/src/core/dispatcher.ts` (DELETED)
- `shared/composition/src/core/dispatcher.test.ts` or wherever it lives (DELETED)
- `shared/composition/src/core/adapter.ts` (PRESERVED — interface)

## Effort Summary

| Tier | Estimate | Notes |
|---|---|---|
| Human | 30min | git rm + test verification |
| AI-Dominant | 15min | Mechanical deletion + bun test gate (CANONICAL) |
| AI-Assisted | 20min | Pair-driven with verification |

## Observations

- [decision] Delete over fix per ADR-005 D-7 evidence: zero production imports; registry.ts is single source of truth #d-7 #single-source-of-truth
- [constraint] Depends on TASK-029 (rename) completing first; this TASK operates on `shared/composition/src/core/dispatcher.ts` (renamed path) #ordering-dependency
- [constraint] `core/adapter.ts` is the CompositionAdapter interface; deletion scope is dispatcher.ts + its test ONLY #preservation
- [insight] If `bun test` fails post-deletion, the failure surfaces a hidden dependency that should be fixed — net positive learning per D-7 acceptance criteria #failure-as-signal

## Relations
- implements [[REQ-009-SPEC-008: Structural Cleanup Dispatcher Deletion and Shared Rename]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
- relates_to [[QA-056-SPEC-008: Task 030 Inline Deletion Verification]]
