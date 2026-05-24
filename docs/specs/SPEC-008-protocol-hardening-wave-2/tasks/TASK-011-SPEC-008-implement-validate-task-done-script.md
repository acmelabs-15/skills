---
title: 'TASK-011-SPEC-008: Implement validate-task-done Script'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-011-spec-008-implement-validate-task-done-script-1
status: DONE
effort: S
estimate: 0.5d
tags:
- task
- spec-008
- track-2
- build-skill
- validator-script
---

# TASK-011-SPEC-008: Implement validate-task-done Script

## Design Context

Implements the `skills/build/scripts/validate-task-done.ts` row of [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]] Module Structure.

## Objective

Create the gate-point invocation script that wraps `validateTaskDoneClaim` from `shared/composition/src/validators/task-claim-validator.ts` so the build skill's per-TASK DoD check is shell-composable and exits non-zero on unsatisfied DoD items.

## Scope

In Scope:

- `skills/build/scripts/validate-task-done.ts` (the script)
- `skills/build/scripts/validate-task-done.test.ts` (colocated test)

Out of Scope:

- The TaskNoteSchema parser or claim validator (Track 1)
- PLAN state-transition mutations (TASK-012, TASK-013)

## Files Affected

| File | Action | Description |
| --- | --- | --- |
| `skills/build/scripts/validate-task-done.ts` | Create | CLI wrapper invoking validateTaskDoneClaim |
| `skills/build/scripts/validate-task-done.test.ts` | Create | Asserts exit 0 on satisfied DoD, exit 1 on unsatisfied, exit 2 on path-containment violation |

## Definition of Done

- [x] Script reads a TASK note path from `Bun.argv`, validates path-containment against `process.cwd()`, parses via `TaskNoteSchema`, invokes `validateTaskDoneClaim`, and exits 0/1/2 per the contract
- [x] Script includes the `if (import.meta.main)` CLI guard and exports `main` for programmatic invocation
- [x] Colocated test asserts exit 0 on a fixture TASK with all DoD checked
- [x] Colocated test asserts exit 1 on a fixture TASK with an unchecked DoD and `status: DONE`
- [x] Colocated test asserts exit 2 on a path containing `..` segments
- [x] Script imports only from `shared/composition/src/` plus Node and Bun standard runtime
- [x] biome lint plus tsc --noEmit pass on the new files

## ADR Compliance

- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-1 per-skill scripts pattern
- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 security boundary path-containment requirement

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 2d | CLI plus tests plus path-containment plumbing |
| AI-Dominant | 0.5d | Pattern matches `skills/defrag/scripts/defrag.ts` |
| AI-Assisted | 1d | Path-containment subtlety on Windows path separators |

## Observations

- [task] Script is a thin CLI wrapper around validateTaskDoneClaim no business logic lives here #thin-wrapper
- [decision] Path-containment uses `path.resolve(projectRoot, userPath).startsWith(projectRoot + sep)` matching the hook layer rule #d-8 #path-containment
- [constraint] Exit code 0 on success 1 on validation failure 2 on usage or containment violation #exit-code-contract

## Relations

- implements [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]]
- implements [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
- relates_to [[QA-065-SPEC-008: Validation Report for TASK-011 Validate Task Done Script]]
