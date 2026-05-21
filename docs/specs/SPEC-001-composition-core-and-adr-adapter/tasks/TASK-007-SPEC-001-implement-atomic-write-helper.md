---
title: 'TASK-007-SPEC-001: Implement Atomic Write Helper'
type: task
permalink: specs/spec-001-composition-core-and-adr-adapter/tasks/task-007-spec-001-implement-atomic-write-helper
status: DONE
effort: S
estimate: 0.25d
tags:
- task
- spec-001
- atomicity
- file-io
---

# TASK-007-SPEC-001: Implement Atomic Write Helper

## Design Context

This TASK realizes DESIGN-001-SPEC-001 module "atomic-write.ts" -- the write-to-temp-then-rename atomicity mechanism from ADR-001 F-8.

## Objective

Implement stage(), rename(), and cleanup() functions at src/core/atomic-write.ts that provide write-to-temp-then-rename atomicity for destination files.

## Scope

**In Scope**: stage(destPath, content) writes to destPath.tmp via Bun.write, rename(destPath) renames .tmp to final, cleanup(destPath) removes .tmp, all-or-nothing coordination helper for cluster operations
**Out of Scope**: Hash validation logic (script runner responsibility)

## Implementation Notes

Uses Bun.write for staging (ADR-001 F-6). Uses fs.renameSync for POSIX atomic rename. Cleanup removes .tmp files. The clusterAtomicRename function takes an array of dest paths and renames all atomically; on any failure, cleans all .tmp files.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| _shared/composition/src/core/atomic-write.ts | NEW | Atomic write helpers |
| _shared/composition/tests/atomic-write.test.ts | NEW | Atomicity tests |

## Testing Requirements

- stage creates .tmp file with correct content
- rename moves .tmp to final path
- cleanup removes .tmp file
- Cluster rename: all succeed or all cleaned up

## Definition of Done

- [x] stage, rename, cleanup exported from src/core/atomic-write.ts
- [x] Uses Bun.write for staging per ADR-001 F-6
- [x] POSIX rename for atomicity
- [x] Cluster all-or-nothing helper function works correctly
- [x] Unit tests pass

## ADR Compliance

- [x] Honors ADR-001 F-8: Write-to-temp-then-rename rollback mechanism
- [x] Honors ADR-001 F-6: Bun.write for file I/O

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.5d | File I/O with error handling |
| AI-Dominant | 0.25d | Standard pattern |
| AI-Assisted | 0.25d | Autocomplete |

## Observations

- [requirement] Atomic write helper ensures no partial write state on hash mismatch or crash #atomicity #safety
- [technique] POSIX rename is atomic on same filesystem; .tmp sibling ensures same filesystem #posix #atomic
- [constraint] Must handle stale .tmp files from previous crashed runs #crash-recovery #cleanup

## Relations

- validated_by [[TEST-REPORT-007-SPEC-001: Atomic Write Helper]]

- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[REQ-006-SPEC-001: Atomic Write-to-Temp-Then-Rename Rollback]]
- implements [[DESIGN-001-SPEC-001: Composition Library Module Structure]]
- depends_on [[TASK-001-SPEC-001: Scaffold Composition Project]]
