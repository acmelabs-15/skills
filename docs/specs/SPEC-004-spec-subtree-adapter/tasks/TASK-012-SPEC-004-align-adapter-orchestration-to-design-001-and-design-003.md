---
title: 'TASK-012-SPEC-004: Align Adapter Orchestration to DESIGN-001 and DESIGN-003'
type: task
permalink: specs/spec-004-spec-subtree-adapter/tasks/task-012-spec-004-align-adapter-orchestration-to-design-001-and-design-003-1
status: DRAFT
effort: M
estimate: 2d
tags:
- task
- spec-004
- gap-task
- orchestration
---

# TASK-012-SPEC-004: Align Adapter Orchestration to DESIGN-001 and DESIGN-003

## Design Context

Gap from TEST-REPORT-020 + TEST-REPORT-023: implementation provides `applySubtreeMutations` / `reverseSubtreeMutations` / `validateSubtreeRoundTrip` (in-memory) while DESIGN-001 calls for a single `processSubtree(): ProcessResult` entry point coordinated by `SubtreeOrchestrator` with two-phase stage-all then validate-all, and DESIGN-003 calls for `validateSubtreeHashes(adapter, manifest, sourceContents, stagedContents): HashValidationResult` + `rollbackCluster(stagedPaths, renamedPaths)` for filesystem-aware cluster rollback.

The PROOF passes for in-memory mutation round-trip, but the orchestration around it (filesystem stage-all, then validate-all, then atomic-rename, with cluster .tmp rollback on any failure) is not implemented in the adapter.

## Objective

User adjudication required FIRST: is in-memory adapter + caller-provided filesystem orchestration acceptable (defer DESIGN-001/003 filesystem layer to a higher decompose/recompose skill), or must the adapter implement the full filesystem orchestration per DESIGN-001/003? Once adjudicated, either (a) amend DESIGN-001 + DESIGN-003 to declare the caller-orchestration boundary, or (b) implement `processSubtree`, `validateSubtreeHashes` collect-then-validate, `rollbackCluster`, and `HashValidationResult` aggregation in the adapter.

## Files Affected

| File | Action | Purpose |
|---|---|---|
| _shared/composition/src/adapters/spec-subtree.ts | MODIFY (option B) | Add processSubtree + collect-then-validate + cluster rollback |
| docs/specs/SPEC-004-spec-subtree-adapter/design/DESIGN-001-*.md | MODIFY (option A) | Amend Component 1/2 boundary |
| docs/specs/SPEC-004-spec-subtree-adapter/design/DESIGN-003-*.md | MODIFY (option A) | Amend Component 1/2 boundary |
| _shared/composition/tests/spec-subtree-orchestration.test.ts | NEW (option B) | Tests for staged-file rollback + HashValidationResult aggregation |

## Definition of Done

- [ ] User adjudication on architectural boundary logged
- [ ] Either design amended to match implementation OR implementation extended to match design
- [ ] If option B: filesystem stage-all + validate-all + cluster .tmp rollback verified by test
- [ ] All existing SPEC-004 tests still pass
- [ ] No silent assumptions or TODOs

## Observations

- [problem] DESIGN-001 Component 1 declares `processSubtree(): ProcessResult` — neither method nor type exists #architectural-drift
- [problem] DESIGN-003 Component 1 declares `validateSubtreeHashes(adapter, manifest, sourceContents, stagedContents): HashValidationResult` with collect-then-validate — implementation throws on first failure with no aggregation #architectural-drift
- [problem] DESIGN-003 Component 2 declares `rollbackCluster(stagedPaths, renamedPaths)` for `.tmp` filesystem cleanup — not implemented #architectural-drift
- [decision] User adjudication required: amend design vs extend implementation #pending-decision

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- caused_by [[TEST-REPORT-020-SPEC-004: Implement SPEC Subtree Adapter Recursive Base]]
- caused_by [[TEST-REPORT-023-SPEC-004: Implement Per-File Hash Validation Orchestration]]
- extends [[TASK-001-SPEC-004: Implement SPEC Subtree Adapter Recursive Base]]
- extends [[TASK-004-SPEC-004: Implement Per-File Hash Validation Orchestration]]