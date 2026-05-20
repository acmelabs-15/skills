---
title: 'TASK-003-SPEC-001: Implement SHA-256 Hash Utility'
type: task
permalink: specs/spec-001-composition-core-and-adr-adapter/tasks/task-003-spec-001-implement-sha-256-hash-utility
status: DONE
effort: S
estimate: 0.25d
tags:
- task
- spec-001
- hash
- utility
---

# TASK-003-SPEC-001: Implement SHA-256 Hash Utility

## Design Context

This TASK realizes DESIGN-002-SPEC-001 shared utilities -- the sha256 function at src/core/hash.ts.

## Objective

Implement the shared sha256(content: string): string utility that wraps Bun.hash("sha256", content) and returns hex-encoded output.

## Scope

**In Scope**: sha256 function implementation, hex encoding, unit tests
**Out of Scope**: Hash validation logic (that is in the script runner, not the utility)

## Implementation Notes

Use Bun.hash("sha256", content) which returns a Uint8Array. Convert to hex string via Buffer.from(hash).toString("hex") or equivalent Bun-native approach. Function is synchronous.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| _shared/composition/src/core/hash.ts | NEW | sha256 utility function |
| _shared/composition/tests/hash.test.ts | NEW | Unit tests for sha256 |

## Testing Requirements

- Known-input/known-output test (SHA-256 of "hello" matches expected hex)
- Identity test (same input produces same hash)
- Difference test (different input produces different hash)

## Definition of Done

- [ ] sha256 function exported from src/core/hash.ts
- [ ] Returns hex-encoded SHA-256 hash string
- [ ] Uses Bun.hash per ADR-001 F-6
- [ ] Unit tests pass with 3+ test cases

## ADR Compliance

- [ ] Honors ADR-001 F-6: Uses Bun.hash (Bun-native API)
- [ ] Honors ADR-001 F-8: SHA-256 as the hash algorithm

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.25d | Single function |
| AI-Dominant | 0.25d | Trivial implementation |
| AI-Assisted | 0.25d | Autocomplete |

## Observations

- [requirement] sha256 utility is shared across all adapters and round-trip tests providing single hash implementation #hash #utility
- [technique] Bun.hash returns Uint8Array; hex conversion needed for human-readable comparison #bun #encoding
- [constraint] Function must be synchronous as Bun.hash is sync #sync #performance

## Relations
- validated_by [[TEST-REPORT-003-SPEC-001: SHA-256 Hash Utility]]

- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[REQ-003-SPEC-001: SHA-256 Hash Utility]]
- implements [[DESIGN-002-SPEC-001: CompositionAdapter Interface and Type Hierarchy]]
- depends_on [[TASK-001-SPEC-001: Scaffold Composition Project]]