---
title: 'TASK-040-SPEC-008: Implement Git Helpers for Staged and Diff Content'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-040-spec-008-implement-git-helpers-for-staged-and-diff-content
status: DONE
effort: M
estimate: 1d
tags:
- task
- spec-008
- hooks
- git
- staged-files
- diff-commits
- wave-2
---

# TASK-040-SPEC-008: Implement Git Helpers for Staged and Diff Content

## Description

Implement two shared hook utilities under `hooks/lib/` per [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]]:

1. `git-staged-files.ts` — enumerates staged Brain notes (`docs/**/*.md`) and reads their post-image content via `git show :<file>`. Used by Layer 3 (`pre-commit-validate.ts`). Filters to `docs/**/*.md` so non-Brain files do not invoke validators. Each returned record carries `filePath` (relative to repo root) and `content` (the staged blob).
2. `git-diff-commits.ts` — for Layer 4 (pre-push) and Layer 5 (pre-PR-create) returns the set of Brain notes whose content differs in the range being pushed or PR'd. Functions: `readPushDiffBrainNotes(repoRoot, remote, branch)` walks `git diff <remote>/<branch>...HEAD --name-only` filtered to `docs/**/*.md` and reads each post-image; `readPrDiffBrainNotes(repoRoot, baseBranch)` walks `git diff <baseBranch>...HEAD --name-only` with the same filter.

Both modules MUST resolve the repo root via `git rev-parse --show-toplevel` and pass that as the `cwd` to every git subprocess. Path containment validation runs in the per-handler entry scripts before these utilities are invoked.

## Definition of Done

- [ ] `hooks/lib/git-staged-files.ts` exists with `readStagedBrainNotes(repoRoot: string): Promise<StagedNote[]>`
- [ ] readStagedBrainNotes invokes `git diff --cached --name-only --diff-filter=ACM` filtered to `docs/**/*.md`
- [ ] readStagedBrainNotes invokes `git show :<file>` per result and returns `{ filePath, content }`
- [ ] readStagedBrainNotes handles the empty-staged-set case (returns `[]`)
- [ ] `hooks/lib/git-diff-commits.ts` exists with `readPushDiffBrainNotes(repoRoot, remote, branch)` and `readPrDiffBrainNotes(repoRoot, baseBranch)`
- [ ] readPushDiffBrainNotes invokes `git diff <remote>/<branch>...HEAD --name-only` filtered to `docs/**/*.md`
- [ ] readPushDiffBrainNotes handles the no-upstream case by falling back to walking commits ahead of `@{u}` if reachable, otherwise returns `[]` with a logged warning
- [ ] readPrDiffBrainNotes invokes `git diff <baseBranch>...HEAD --name-only` filtered to `docs/**/*.md`
- [ ] All git subprocess calls use Bun.spawn or equivalent with `cwd` set to repo root
- [ ] Unit tests cover the staged, push-diff, and PR-diff happy paths against a fixture repo
- [ ] Unit tests cover empty-set, no-upstream, and non-`docs/**` file path filtering
- [ ] biome lint passes
- [ ] `bun tsc --noEmit` passes

## ADR Compliance

- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 Implementation Notes (git-staged-files and git-diff-commits listed in lib/)
- [ ] Honors Phase 3 security P1 — modules accept already-validated paths; path containment is the entry-script responsibility

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `hooks/lib/git-staged-files.ts` | NEW | Enumerate staged Brain notes via `git show :<file>` |
| `hooks/lib/git-diff-commits.ts` | NEW | Enumerate Brain notes in push or PR diff |
| `hooks/lib/__tests__/git-staged-files.test.ts` | NEW | Unit tests against fixture repo |
| `hooks/lib/__tests__/git-diff-commits.test.ts` | NEW | Unit tests for push and PR diff helpers |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Two utilities with fixture-repo unit tests |
| AI-Dominant | 0.5d | Mechanical git plumbing |
| AI-Assisted | 1d | Fixture repo plus subprocess handling |

## Observations

- [task] git-staged-files and git-diff-commits are the read paths for Layers 3-5; they isolate every git subprocess invocation in one place #git-subprocess #isolation
- [constraint] All subprocesses MUST set `cwd` to the resolved repo root; relying on process `cwd` opens a non-validated path surface #cwd-isolation
- [risk] No-upstream case at pre-push must not silently no-op the handler. Falling back to walking ahead-of-`@{u}` or returning empty with a logged warning is the safe behavior #no-upstream

## Relations

- implements [[REQ-011-SPEC-008: PreToolUse Blocking Gates]]
- implements [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[QA-055-SPEC-008: Implement Hook Lib Git Helpers]]
