---
title: 'TASK-043-SPEC-008: Implement pre-commit, pre-push, and pre-pr-create Handlers (Layers 3-5)'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-043-spec-008-implement-pre-commit-push-and-pr-create-handlers-layers-3-to-5
status: DONE
effort: M
estimate: 1d
tags:
- spec-008
- hooks
- pre-tool-use
- layers-3-5
- git
---

# TASK-043-SPEC-008: Implement pre-commit, pre-push, and pre-pr-create Handlers (Layers 3-5)

## Objective

Implement three `PreToolUse` `Bash` handlers per [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]] and [[REQ-011-SPEC-008: PreToolUse Blocking Gates]]:

- `hooks/scripts/pre-commit-validate.ts` — Layer 3 (`Bash` + `if: "Bash(git commit *)"`). Reads staged Brain notes via `readStagedBrainNotes(repoRoot)`, dispatches each through the validator, denies the commit if ANY note fails.
- `hooks/scripts/pre-push-validate.ts` — Layer 4 (`Bash` + `if: "Bash(git push *)"`). Parses the push command arguments to identify `<remote>` and `<branch>`; reads Brain notes from the push diff via `readPushDiffBrainNotes`; dispatches each through the validator; denies the push if ANY note fails.
- `hooks/scripts/pre-pr-create-validate.ts` — Layer 5 (`Bash` + `if: "Bash(gh pr create *)"`). Parses `gh pr create` arguments to identify the `--base` branch (defaulting to the repo default branch); reads Brain notes from the PR diff via `readPrDiffBrainNotes`; dispatches each through the validator; denies the PR open if ANY note fails.

All three handlers share the same scaffold: parse hook input, validate path/command containment, enumerate Brain notes from the appropriate git source, dispatch each, aggregate the failing set, emit `permissionDecision: "deny"` with a reason listing every failing note if any fail (`allow` otherwise).

## Definition of Done

- [x] `hooks/scripts/pre-commit-validate.ts` exists; binds Layer 3 matcher and `if` filter
- [x] pre-commit-validate calls `readStagedBrainNotes(repoRoot)` and dispatches each to the validator
- [x] pre-commit-validate emits `permissionDecision: "deny"` with reason naming every failing staged note when ANY fail
- [x] `hooks/scripts/pre-push-validate.ts` exists; binds Layer 4 matcher and `if` filter
- [x] pre-push-validate parses `git push [-u] [remote] [branch]` argument forms to identify the upstream target
- [x] pre-push-validate calls `readPushDiffBrainNotes(repoRoot, remote, branch)` and dispatches each note
- [x] pre-push-validate emits `permissionDecision: "deny"` with reason naming every failing pushed note when ANY fail
- [x] `hooks/scripts/pre-pr-create-validate.ts` exists; binds Layer 5 matcher and `if` filter
- [x] pre-pr-create-validate parses `gh pr create [--base BRANCH]` argument forms; defaults to `origin/HEAD` when `--base` is absent
- [x] pre-pr-create-validate calls `readPrDiffBrainNotes(repoRoot, baseBranch)` and dispatches each note
- [x] pre-pr-create-validate emits `permissionDecision: "deny"` with reason naming every failing PR-diff note when ANY fail
- [x] All three handlers validate path containment for `repoRoot` and any path passed to git subprocesses
- [x] All three handlers wrap validator invocation in try/catch and exit non-zero with structured stderr error on exception (fail-open)
- [x] Unit tests cover deny path (one failing staged/pushed/PR note), allow path (clean set), argument parsing edge cases (no upstream, no `--base`), and traversal rejection
- [x] Per-commit hook latency stays within ~500ms-2s for typical 5-10 file commit
- [x] biome lint passes
- [x] `bun tsc --noEmit` passes

## ADR Compliance

- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 Layer 3-5 declarations (`Bash` matcher with the three `if` filters verbatim)
- [x] Honors Phase 3 security P1 — argument parsing rejects traversal in any path argument before invoking git subprocesses
- [x] Honors hybrid failure semantics — commit/push/PR gates deny on ANY failing note (the more conservative per-batch semantics from ADR-005)

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `hooks/scripts/pre-commit-validate.ts` | NEW | Layer 3 hook handler |
| `hooks/scripts/pre-push-validate.ts` | NEW | Layer 4 hook handler |
| `hooks/scripts/pre-pr-create-validate.ts` | NEW | Layer 5 hook handler |
| `hooks/scripts/__tests__/pre-commit-validate.test.ts` | NEW | Unit tests |
| `hooks/scripts/__tests__/pre-push-validate.test.ts` | NEW | Unit tests |
| `hooks/scripts/__tests__/pre-pr-create-validate.test.ts` | NEW | Unit tests |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Three handlers sharing a scaffold plus argument parsing |
| AI-Dominant | 0.75d | Shared scaffold reduces incremental cost |
| AI-Assisted | 1d | Argument parsing edge cases and fixture testing |

## Observations

- [fact] Layers 3-5 are the outbound gates; if Layers 1-2 miss something the agent's commit/push/PR open still catches it #defense-in-depth
- [decision] All three layers deny on ANY failing note (not per-note allow-with-warning) because once a batch reaches the commit boundary the hybrid semantics no longer apply — the batch must be clean #batch-semantics
- [constraint] All `Bash` matcher handlers MUST parse the actual command arguments rather than trusting `tool_input` shape; the `Bash` tool's `command` is a single string per Claude Code's hook contract #command-parsing

## Relations

- implements [[REQ-011-SPEC-008: PreToolUse Blocking Gates]]
- implements [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[REQ-003-SPEC-008: New Claim Validator Suite]]
- relates_to [[QA-082-SPEC-008: Validation Report for TASK-043 Layers 3-5 Handlers]]
