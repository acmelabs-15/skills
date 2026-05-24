---
title: 'TASK-008-SPEC-008: Implement validateAnalysisAcceptedClaim'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-008-spec-008-implement-validate-analysis-accepted-claim
status: DONE
effort: S
estimate: 0.5d
tags:
- task
- spec-008
- claim-validator
- analysis
- wave-2
---

# TASK-008-SPEC-008: Implement validateAnalysisAcceptedClaim

## Objective

Implement `validateAnalysisAcceptedClaim(analysisNote: AnalysisNote): AnalysisClaimResult` at `shared/composition/src/validators/analysis-claim-validator.ts` per [[REQ-003-SPEC-008: New Claim Validator Suite]] and [[DESIGN-001-SPEC-008: Coverage Module Layout]]. The validator fires only when `analysisNote.frontmatter.status === 'ACCEPTED'`. When firing, it rejects the presence of any `## Open Questions` section detected by the ANALYSIS parser (TASK-006). This is the single highest-value P1 enforcement because it prevents the Wave 7 pattern (41 analyses with Open Questions sections in ACCEPTED status) from recurring.

This TASK depends on TASK-002 (ANALYSIS schema), TASK-006 (ANALYSIS parser), and Track 4 renaming `_shared/` to `shared/`.

## Definition of Done

- [x] File `shared/composition/src/validators/analysis-claim-validator.ts` exists and exports `validateAnalysisAcceptedClaim` and `type AnalysisClaimResult`
- [x] Validator returns `{ ok: true }` when input status is not ACCEPTED
- [x] Validator returns `{ ok: false }` with one unsatisfied entry when ACCEPTED plus Open Questions present; `path` field is `body.hasOpenQuestions`
- [x] Validator returns `{ ok: true }` when ACCEPTED plus Open Questions absent
- [x] Validator is pure (no I/O, no mutation)
- [x] Unit tests cover: status DRAFT plus Open Questions ok, status ACCEPTED without Open Questions ok, status ACCEPTED plus Open Questions rejection
- [x] `bun test shared/composition/tests/validators/analysis-claim-validator.test.ts` passes with at least 4 cases green
- [x] `biome check` passes
- [x] `tsc --noEmit` passes
- [x] `shared/composition/src/validators/index.ts` re-exports `validateAnalysisAcceptedClaim` and `AnalysisClaimResult` (orchestrator coordinated barrel pass Event 81 per R3 barrel-serialization; tsc + biome clean post-edit)

## ADR Compliance

- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-5 (closes Wave 7 exploit)
- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-2
- [x] Honors [[ADR-001: Composition Library Architecture]]

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/src/validators/analysis-claim-validator.ts` | NEW | validateAnalysisAcceptedClaim |
| `shared/composition/src/validators/index.ts` | MODIFY | Re-export validateAnalysisAcceptedClaim and AnalysisClaimResult |
| `shared/composition/tests/validators/analysis-claim-validator.test.ts` | NEW | Unit tests |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.75d | Simplest claim validator; single conditional |
| AI-Dominant | 0.5d | One conditional plus result construction |
| AI-Assisted | 0.5d | Pattern fully established |

## Observations

- [fact] Validator closes the Wave 7 Open Questions exploit at runtime; highest-value P1 enforcement #analysis #claim-validator #wave-7
- [decision] Single check (Open Questions presence) keeps the validator minimal and unambiguous #minimal-validator
- [constraint] Parser exposes `body.hasOpenQuestions` boolean; validator reads it directly without re-parsing #parser-contract
- [risk] Path uses `shared/`; depends on Track 4 rename plus TASK-002 plus TASK-006 #rename-dependency #chain-dependency

## Relations

- implements [[REQ-003-SPEC-008: New Claim Validator Suite]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[DESIGN-001-SPEC-008: Coverage Module Layout]]
- depends_on [[TASK-002-SPEC-008: Implement ANALYSIS Schema]]
- depends_on [[TASK-006-SPEC-008: Implement ANALYSIS, EPIC, and CRIT Parsers]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
- relates_to [[QA-063-SPEC-008: Validation Report for TASK-008 Analysis Accepted Claim Validator]]
