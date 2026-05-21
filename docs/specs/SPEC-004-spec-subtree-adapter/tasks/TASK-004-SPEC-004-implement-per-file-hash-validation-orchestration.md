---
title: 'TASK-004-SPEC-004: Implement Per-File Hash Validation Orchestration'
type: task
status: TODO
effort: M
estimate: 2d
permalink: specs/spec-004-spec-subtree-adapter/tasks/task-004-spec-004-implement-per-file-hash-validation-orchestration
tags:
- task
- spec-004
- hash-validation
- orchestration
---

# TASK-004-SPEC-004: Implement Per-File Hash Validation Orchestration

## Design Context

- DESIGN-003-SPEC-004 Per-File Hash Validation Strategy: implements PerFileHashValidator and ClusterRollback components for the collect-then-validate pattern

## Objective

Implement the per-file hash validation orchestration that validates SHA-256 char-identity for each file in the SPEC subtree after mutations. This includes the 4-step hash protocol per file (extract source, extract staged, reverse-mutate staged, compare hashes), cluster-level rollback on any single-file mismatch, and structured error reporting identifying the failing file.

## Scope

**In Scope**:

- validateSubtreeHashes(adapter, manifest, sourceContents, stagedContents) function
- Per-file 4-step hash protocol implementation
- ClusterRollback function (remove all .tmp files on failure)
- Structured error reporting with file path, expected hash, actual hash
- Integration with SubtreeOrchestrator validation phase

**Out of Scope**:

- Content mutation logic (handled by TASK-001 and TASK-002)
- Filename rewrite (handled by TASK-003)
- The sha256() utility itself (from SPEC-001 REQ-003-SPEC-001)

## Implementation Notes

The validation iterates manifest entries in order (root first, then children). For each entry, it reads the source content from sourceContents map, reads the staged (mutated) content from stagedContents map, calls adapter.reverseMutations() on the staged content with the entry's mutations, and compares sha256(sourceContent) against sha256(reverseMutatedContent). On first mismatch, it short-circuits but continues collecting results for all entries to provide comprehensive error reporting.

## Files Affected

| File | Action | Purpose |
|---|---|---|
| _shared/composition/src/adapters/spec-subtree.ts | MODIFY | Add hash validation orchestration |

## Definition of Done

- [ ] validateSubtreeHashes validates N+1 files (1 root + N children) independently
- [ ] Per-file hash comparison uses sha256() from core/hash.ts
- [ ] Reverse mutations include inverse renumber_map + inverse wikilink_map + inverse frontmatter_map
- [ ] Single-file mismatch returns failure with file path + expected/actual hashes
- [ ] ClusterRollback removes all .tmp files on validation failure
- [ ] Unit tests cover: all-pass scenario, single-file failure, empty children array

## ADR Compliance

- [ ] Honors ADR-002 D-4: SPEC subtree per-file extraction strategy
- [ ] Honors ADR-001 F-8: SHA-256 char-identity with cluster rollback

## Effort

| Tier | Human | AI-Dominant | AI-Assisted |
|---|---|---|---|
| M | 6d | 2d | 3d |

## Observations

- [fact] Status: TODO #status
- [fact] Size tier: M -- hash validation orchestration with cluster rollback and error reporting; integrates with frontmatter reversal #estimation
- [decision] Collect-then-validate pattern per DESIGN-003-SPEC-004 enables cluster-level rollback #orchestration

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- implements [[DESIGN-003-SPEC-004: Per-File Hash Validation Strategy]]
- implements [[REQ-004-SPEC-004: Per-File Hash Validation]]
- depends_on [[TASK-001-SPEC-004: Implement SPEC Subtree Adapter Recursive Base]]
- depends_on [[TASK-002-SPEC-004: Implement Frontmatter Map Handler]]
