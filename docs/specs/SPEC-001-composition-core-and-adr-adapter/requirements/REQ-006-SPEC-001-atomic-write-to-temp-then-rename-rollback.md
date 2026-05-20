---
title: 'REQ-006-SPEC-001: Atomic Write-to-Temp-Then-Rename Rollback'
type: requirement
permalink: specs/spec-001-composition-core-and-adr-adapter/requirements/req-006-spec-001-atomic-write-to-temp-then-rename-rollback
status: DRAFT
tags:
- requirement
- spec-001
- atomicity
- rollback
---

# REQ-006-SPEC-001: Atomic Write-to-Temp-Then-Rename Rollback

## Requirement Statement

WHEN the deterministic script writes destination files after hash validation
THE SYSTEM SHALL use write-to-temp-then-rename atomicity where content is staged to a .tmp sibling file, hash-validated, and only renamed to the final path after all destinations in the cluster pass validation
SO THAT a crash or hash mismatch at any point leaves the filesystem in a recoverable state with source files untouched.

## Pattern

Event-Driven (triggered during script execution of a validated plan).

## Priority

P0 — the rollback mechanism is the safety net for the hash validation invariant per ADR-001 F-8.

## Category

Functional

## Context

ADR-001 F-8 specifies the rollback mechanism formally. For each destination file: (1) Stage content to dest-path.tmp. (2) Hash-validate the staged content against source extraction. (3) Per-cluster all-or-nothing: only after ALL destinations pass, atomically rename each .tmp to final path (POSIX rename is atomic). If any destination fails, remove ALL .tmp files; source files remain untouched. A crash mid-rename leaves .tmp files present with source intact; rerunning the plan recovers.

## Acceptance Criteria

- [ ] GIVEN a plan with 3 destination files where all pass hash validation
      WHEN the script executes
      THEN all 3 .tmp files are created first, then all 3 are renamed atomically to final paths

- [ ] GIVEN a plan with 3 destination files where the 2nd fails hash validation
      WHEN the hash mismatch is detected
      THEN all .tmp files (including the 1st that passed) are removed and source files remain untouched

- [ ] GIVEN a plan execution that crashes after creating .tmp files but before rename
      WHEN the plan is rerun
      THEN the .tmp files from the previous run are cleaned up and execution proceeds normally

- [ ] GIVEN the atomic write utility at _shared/composition/src/core/atomic-write.ts
      WHEN called with content and a destination path
      THEN it writes to dest-path.tmp using Bun.write and returns a handle for later rename or cleanup

- [ ] GIVEN the all-or-nothing rename phase
      WHEN rename is called for all staged files
      THEN it uses POSIX-compatible fs rename (not copy-then-delete) for atomicity

## Implementation Notes

The atomic write module exports functions for stage (write .tmp), rename (move .tmp to final), and cleanup (remove .tmp). The all-or-nothing coordination lives in the script runner, not in the atomic write module. Bun.write is used for the staging step per ADR-001 F-6. The rename uses fs.renameSync (or Bun equivalent) which is atomic on POSIX filesystems.

## Observations

- [requirement] Write-to-temp-then-rename provides atomic rollback guaranteeing no partial write state on hash mismatch or crash #atomicity #rollback
- [constraint] POSIX rename atomicity assumed per macOS Darwin target; non-POSIX filesystems would need a different strategy #filesystem #posix
- [decision] Per-cluster all-or-nothing means one failed destination aborts the entire cluster not just that file #cluster-atomicity #safety
- [technique] .tmp sibling files enable crash recovery by rerunning the plan which cleans up stale .tmp files #crash-recovery #idempotent

## Relations

- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[ADR-001: Composition Library Architecture]]