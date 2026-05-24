---
title: 'TASK-009-SPEC-008: Implement validateEpicDoneClaim'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-009-spec-008-implement-validate-epic-done-claim
status: DONE
effort: M
estimate: 1d
tags:
- spec-008
- claim-validator
- epic
- cross-note
- wave-2
---

# TASK-009-SPEC-008: Implement validateEpicDoneClaim

## Description

Implement `validateEpicDoneClaim(epicNote: EpicNote, deps: { resolveSpec: SpecResolver }): EpicClaimResult` at `shared/composition/src/validators/epic-claim-validator.ts` per [[REQ-003-SPEC-008: New Claim Validator Suite]] and [[DESIGN-001-SPEC-008: Coverage Module Layout]]. This is the only Wave 2 validator with a cross-note dependency. The validator fires only when `epicNote.frontmatter.status === 'DONE'`. When firing, it iterates the EPIC's `contains` relations and invokes `deps.resolveSpec(specRef)` for each entry; if any resolved SPEC has status other than DONE (or DEFERRED/ABANDONED if those are project-canonical terminal substatuses for SPECs), the validator records an unsatisfied entry. If the EPIC has at least one contains relation but `deps.resolveSpec` is missing or the resolver returns undefined for a referenced SPEC, the validator throws explicitly per ADR-005 D-5 Phase 3 critic P1.1 resolution (no silent pass).

This TASK depends on TASK-003 (EPIC schema), TASK-006 (EPIC parser), and Track 4 renaming `_shared/` to `shared/`.

## Definition of Done

- [x] File `shared/composition/src/validators/epic-claim-validator.ts` exists and exports `validateEpicDoneClaim`, `type EpicClaimResult`, and `type SpecResolver`
- [x] Validator returns `{ ok: true }` when input status is not DONE
- [x] Validator returns `{ ok: true }` when status is DONE plus zero contains relations (no resolver invocation)
- [x] Validator returns `{ ok: false }` with one unsatisfied entry per non-DONE child SPEC when DONE plus contains entries
- [x] Validator THROWS explicitly when status is DONE plus at least one contains entry AND `deps.resolveSpec` is undefined; error message names the missing dependency
- [x] Validator THROWS explicitly when `deps.resolveSpec` returns undefined for any referenced SPEC; error message names the missing SPEC reference
- [x] Validator is pure given the resolver callback (no internal I/O)
- [x] Unit tests cover: status DRAFT ok, status DONE plus zero contains ok, status DONE plus all-DONE child SPECs ok, status DONE plus one non-DONE child SPEC failure, missing resolver throw, resolver-returns-undefined throw
- [x] `bun test shared/composition/tests/validators/epic-claim-validator.test.ts` passes with at least 7 cases green
- [x] `biome check` passes
- [x] `tsc --noEmit` passes
- [x] `shared/composition/src/validators/index.ts` re-exports `validateEpicDoneClaim`, `EpicClaimResult`, and `SpecResolver` (orchestrator coordinated barrel pass Event 81 per R3 barrel-serialization; tsc + biome clean post-edit)

## ADR Compliance

- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-5 (EPIC P1 coverage; cross-note mechanism explicit per Phase 3 critic P1.1)
- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-2
- [x] Honors [[ADR-001: Composition Library Architecture]]

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/src/validators/epic-claim-validator.ts` | NEW | validateEpicDoneClaim with resolveSpec dependency |
| `shared/composition/src/validators/index.ts` | MODIFY | Re-export validator, types, and SpecResolver |
| `shared/composition/tests/validators/epic-claim-validator.test.ts` | NEW | Unit tests including resolver injection |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1.5d | Cross-note resolver injection plus error-throwing-vs-soft-fail policy require care |
| AI-Dominant | 1d | Pattern is novel for Wave 2 (no Wave 1 cross-note validator) |
| AI-Assisted | 1d | Resolver pattern from common cross-note testing practice |

## Observations

- [fact] Only Wave 2 validator with a cross-note dependency; resolver injection is the critical design move #epic #cross-note #claim-validator
- [decision] Validator THROWS when resolver is missing or returns undefined; no silent pass per ADR-005 D-5 Phase 3 critic P1.1 #explicit-failure #critic-p1-1
- [constraint] Resolver is injected via deps parameter; validator never reads filesystem directly; hook handler in Track 5 supplies the resolver #injected-dependency #pure-validator
- [risk] Path uses `shared/`; depends on Track 4 rename plus TASK-003 plus TASK-006 #rename-dependency #chain-dependency

## Relations

- implements [[REQ-003-SPEC-008: New Claim Validator Suite]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[DESIGN-001-SPEC-008: Coverage Module Layout]]
- depends_on [[TASK-003-SPEC-008: Implement EPIC Schema]]
- depends_on [[TASK-006-SPEC-008: Implement ANALYSIS, EPIC, and CRIT Parsers]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
- relates_to [[QA-064-SPEC-008: Validation Report for TASK-009 Epic Done Claim Validator]]
