---
title: 'TASK-003-SPEC-004: Implement Filename Rewrite Handler'
type: task
status: TODO
effort: S
estimate: 1d
permalink: specs/spec-004-spec-subtree-adapter/tasks/task-003-spec-004-implement-filename-rewrite-handler
tags:
- task
- spec-004
- filename-rewrite
- filesystem
---

# TASK-003-SPEC-004: Implement Filename Rewrite Handler

## Design Context

- DESIGN-002-SPEC-004 Filename Rewrite Coordination: implements the FilenameRewriter and RewriteValidator components for post-hash-validation filename renaming

## Objective

Implement the filename rewrite logic that applies filename_rewrite_map entries from the subtree_manifest after content write and hash validation complete. This includes pre-flight validation (check for conflicts, injectivity, path containment), the rename execution, and rollback capability on mid-sequence failure.

## Scope

**In Scope**:
- applyFilenameRewrites(manifest, destDir) function
- validateFilenameRewrites(manifest, destDir) pre-flight check
- rollbackFilenameRewrites(completedRewrites) function
- Integration with SubtreeOrchestrator post-hash-validation phase
- Bun filesystem rename operations

**Out of Scope**:
- Content mutations (handled by TASK-001 and TASK-002)
- Hash validation (handled by TASK-004)

## Implementation Notes

Use Bun filesystem APIs for rename operations. The pre-flight validation checks three conditions before any rename executes: (1) no target filename already exists, (2) no two rewrites target the same filename (injectivity), (3) all target paths pass containment validation. The rollback tracks completed renames and reverses them in LIFO order on failure.

## Files Affected

| File | Action | Purpose |
|---|---|---|
| _shared/composition/src/adapters/spec-subtree.ts | MODIFY | Add filename rewrite functions |

## Definition of Done

- [ ] validateFilenameRewrites rejects duplicate target filenames
- [ ] validateFilenameRewrites rejects path traversal in target filenames
- [ ] applyFilenameRewrites renames all files per filename_rewrite_map
- [ ] rollbackFilenameRewrites reverses completed renames in LIFO order
- [ ] Child entries with no filename_rewrite_map are skipped
- [ ] Unit tests cover: successful rewrite, conflict detection, rollback on failure

## ADR Compliance

- [ ] Honors ADR-002 D-1: filename_rewrite_map from subtree_manifest
- [ ] Honors ADR-001 F-8: rollback on failure

## Effort

| Tier | Human | AI-Dominant | AI-Assisted |
|---|---|---|---|
| S | 2d | 1d | 1.5d |

## Observations

- [fact] Status: TODO #status
- [fact] Size tier: S -- focused filesystem rename with pre-flight validation and rollback #estimation
- [decision] Pre-flight validation before any rename prevents partial-rewrite states #technique

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- implements [[DESIGN-002-SPEC-004: Filename Rewrite Coordination]]
- implements [[REQ-003-SPEC-004: Filename Rewrite Per Child]]
- depends_on [[TASK-001-SPEC-004: Implement SPEC Subtree Adapter Recursive Base]]