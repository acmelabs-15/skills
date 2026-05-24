---
title: 'TASK-007-SPEC-008: Implement validateAdrAcceptedClaim'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-007-spec-008-implement-validate-adr-accepted-claim
status: TODO
effort: M
estimate: 1d
tags:
- task
- spec-008
- claim-validator
- adr
- wave-2
---

# TASK-007-SPEC-008: Implement validateAdrAcceptedClaim

## Description

Implement `validateAdrAcceptedClaim(adrNote: AdrNote): AdrClaimResult` at `shared/composition/src/validators/adr-claim-validator.ts` per [[REQ-003-SPEC-008: New Claim Validator Suite]] and [[DESIGN-001-SPEC-008: Coverage Module Layout]]. The validator is a pure function that takes an already-parsed AdrNote (produced by TASK-005's `parseAdrNote`) and returns `{ ok: boolean, unsatisfied: Array<{ path, reason }> }`. The validator fires only when `adrNote.frontmatter.status === 'ACCEPTED'`; for any other status it returns `{ ok: true, unsatisfied: [] }` without inspecting body fields. When firing, it checks: (1) every Clarifications item has a checked `[x]` checkbox; (2) every Considered Option entry has a non-empty rationale field. Each failing item contributes an entry to the `unsatisfied` array with a structured `path` (e.g., `clarifications[2].checkbox`) and a human-readable `reason`.

This TASK depends on TASK-001 (ADR schema), TASK-005 (ADR parser), and Track 4 renaming `_shared/` to `shared/`.

## Definition of Done

- [x] File `shared/composition/src/validators/adr-claim-validator.ts` exists and exports `validateAdrAcceptedClaim` and `type AdrClaimResult`
- [x] Validator returns `{ ok: true, unsatisfied: [] }` when input status is not ACCEPTED
- [x] Validator returns `{ ok: false }` with an entry per unchecked Clarifications item when ACCEPTED
- [x] Validator returns `{ ok: false }` with an entry per Considered Option lacking rationale when ACCEPTED
- [x] Validator is pure (no I/O, no mutation, no console output)
- [x] `path` field in unsatisfied entries follows the dotted-bracket form used by Wave 1 validators
- [x] Unit tests cover: status PROPOSED returns ok, status ACCEPTED with all clarifications checked returns ok, status ACCEPTED with one unchecked clarification returns failure with correct path, status ACCEPTED with option lacking rationale returns failure
- [x] `bun test shared/composition/tests/validators/adr-claim-validator.test.ts` passes with at least 6 cases green
- [x] `biome check` passes
- [x] `tsc --noEmit` passes
- [x] `shared/composition/src/validators/index.ts` re-exports `validateAdrAcceptedClaim` and `AdrClaimResult` (orchestrator coordinated barrel pass Event 81 per R3 barrel-serialization; tsc + biome clean post-edit)

## ADR Compliance

- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-5 (P0 ADR claim validator closes the highest-consequence gap)
- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-2 (flat directory placement)
- [x] Honors [[ADR-001: Composition Library Architecture]] (pure-function validator pattern from Wave 1)

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/src/validators/adr-claim-validator.ts` | NEW | validateAdrAcceptedClaim |
| `shared/composition/src/validators/index.ts` | MODIFY | Re-export validateAdrAcceptedClaim and AdrClaimResult |
| `shared/composition/tests/validators/adr-claim-validator.test.ts` | NEW | Unit tests |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Two independent checks combined; path-string construction is detail-oriented |
| AI-Dominant | 0.5d | Wave 1 task-claim-validator establishes pattern |
| AI-Assisted | 0.5d | Pattern reuse |

## Observations

- [task] ADR claim validator is the runtime enforcement for the PROPOSED-to-ACCEPTED gate; the schema and parser are preconditions #adr #claim-validator #p0
- [constraint] Validator is pure; cross-note resolution is out of scope for ADR (no contains relations to resolve) #pure-function
- [decision] Validator fires only at status ACCEPTED; non-targeted statuses return ok without inspecting body fields #status-gated
- [risk] Path uses `shared/`; depends on Track 4 rename plus TASK-001 plus TASK-005 #rename-dependency #chain-dependency

## Relations

- implements [[REQ-003-SPEC-008: New Claim Validator Suite]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[DESIGN-001-SPEC-008: Coverage Module Layout]]
- depends_on [[TASK-001-SPEC-008: Implement ADR Schema]]
- depends_on [[TASK-005-SPEC-008: Implement ADR Parser]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
