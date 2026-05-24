---
title: 'TASK-045-SPEC-008: Implement git-state-observer Handler (Layer 7)'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-045-spec-008-implement-git-state-observer-handler-layer-7
status: TODO
effort: S
estimate: 0.5d
tags:
- task
- spec-008
- hooks
- file-changed
- layer-7
- observability
- wave-2
---

# TASK-045-SPEC-008: Implement git-state-observer Handler (Layer 7)

## Description

Implement `hooks/scripts/git-state-observer.ts` per [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]] and [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]]. The script binds to the `FileChanged` event with matcher `.git/HEAD|.git/index|.git/logs/HEAD`. Triggered when a commit lands. The handler:

1. Reads hook input.
2. Resolves repo root.
3. Identifies the new commit SHA (via `git rev-parse HEAD`).
4. Enumerates Brain notes touched by that commit (`git diff-tree --no-commit-id --name-only -r HEAD` filtered to `docs/**/*.md`).
5. Dispatches each through `dispatchValidator` to compute a PASS/FAIL summary.
6. Emits `{ hookSpecificOutput: { hookEventName: "FileChanged", additionalContext: "Post-commit state: commit <sha> landed; full graph validation: <summary>" } }`.

The handler cannot block (FileChanged is observe-only). Its purpose is to make the post-commit graph state explicit in the transcript ledger so the agent and operator both see what was just enforced.

## Definition of Done

- [ ] `hooks/scripts/git-state-observer.ts` exists; binds Layer 7 matcher
- [ ] Handler resolves repo root and reads `HEAD` SHA via `git rev-parse HEAD`
- [ ] Handler enumerates `docs/**/*.md` files touched by the new commit via `git diff-tree`
- [ ] Handler reads each touched file's post-commit content (current on-disk state) and dispatches through `dispatchValidator`
- [ ] Handler aggregates PASS/FAIL counts and the failing-file list into a summary string
- [ ] Handler emits `{ hookSpecificOutput: { hookEventName: "FileChanged", additionalContext: "Post-commit state: commit <sha> landed; full graph validation: <summary>" } }`
- [ ] Handler does NOT emit any `permissionDecision` or `decision` field; Layer 7 is observe-only
- [ ] Handler wraps validator invocation in try/catch and emits a degraded `additionalContext` ("Post-commit state: validation infrastructure error; manual inspection required") on exception (fail-open observe-only)
- [ ] Handler does NOT fire on external editor edits that do not touch `.git/HEAD`/`.git/index`/`.git/logs/HEAD` (verified by integration test)
- [ ] Unit tests cover happy path, all-passing summary, mixed-pass-fail summary, infrastructure error
- [ ] biome lint passes
- [ ] `bun tsc --noEmit` passes

## ADR Compliance

- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 Layer 7 declaration (FileChanged matcher with literal filenames; observe-only)
- [ ] Honors [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]] AC — handler emits additionalContext only; external editor edits out of scope

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `hooks/scripts/git-state-observer.ts` | NEW | Layer 7 FileChanged observability |
| `hooks/scripts/__tests__/git-state-observer.test.ts` | NEW | Unit and integration tests |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.5d | Observability handler is the simplest of the seven |
| AI-Dominant | 0.25d | Re-uses dispatch-validator and git helpers |
| AI-Assisted | 0.5d | Integration test for external-editor scope verification |

## Observations

- [task] Layer 7 cannot block; it is the transcript ledger of post-commit graph state, surfacing the enforcement outcome to the agent and operator #observe-only #transcript-ledger
- [constraint] FileChanged matcher uses literal filenames (`.git/HEAD|.git/index|.git/logs/HEAD`), not globs; cannot watch `docs/**/*.md` for external edits — out of scope per ADR-005 D-8 threat model #literal-matcher #threat-model
- [technique] additionalContext is the FileChanged response field; emitting a structured summary makes the post-commit state machine-readable from later turns #structured-summary

## Relations

- implements [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]]
- implements [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[REQ-003-SPEC-008: New Claim Validator Suite]]