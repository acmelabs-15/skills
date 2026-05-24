---
title: 'TASK-001-SPEC-008: Implement ADR Schema'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-001-spec-008-implement-adr-schema
status: DONE
effort: M
estimate: 1d
tags:
- task
- spec-008
- schema
- adr
- wave-2
---

# TASK-001-SPEC-008: Implement ADR Schema

## Description

Implement `AdrNoteSchema` at `shared/composition/src/schemas/adr-note.ts` per the structural contract documented in [[REQ-001-SPEC-008: New Schema Suite]] and [[DESIGN-001-SPEC-008: Coverage Module Layout]]. The schema validates frontmatter (title regex, type literal `decision`, status enum including PROPOSED and ACCEPTED, permalink regex, tags 2-5, ADR-specific date and updated fields per CONVENTIONS Section 3.1), body sections (Context, Decision, Considered Options with non-empty rationale per option, Consequences, Clarifications), Observations (3+ with `[category]` plus inline tags), Relations (2+ using only the 11 verb allowlist), and the final-two-sections invariant. A superRefine pass rejects ACCEPTED status when any Clarifications item has an unchecked `[ ]` checkbox or any Considered Option lacks a rationale field. The file ships with full Zod type inference and a `type AdrNote = z.infer<typeof AdrNoteSchema>` export.

This TASK depends on Track 4 of SPEC-008 renaming `_shared/` to `shared/` at the repo root; the orchestrator will rewire this dependency as `depends_on` once the Track 4 TASK exists.

## Definition of Done


- [x] File `shared/composition/src/schemas/adr-note.ts` exists and exports `AdrNoteSchema` plus `type AdrNote`
- [x] Frontmatter sub-schema validates title regex `^ADR-\d{3}.*`, type literal `decision`, status enum `PROPOSED|ACCEPTED|DEPRECATED|SUPERSEDED`, permalink regex `^decisions/adr-\d{3}-`, tags array length 2-5, date and updated date fields
- [x] superRefine rejects ACCEPTED status when any Clarifications item checkbox is `[ ]`
- [x] superRefine rejects ACCEPTED status when any Considered Option lacks a non-empty rationale
- [x] Final-two-sections invariant is enforced (last two sections are `## Observations` then `## Relations`)
- [x] Relations verb allowlist enforced from `schemas/common.ts` (never duplicated)
- [x] All sub-schemas use `.strict()` to reject unknown keys
- [x] Unit tests cover: valid PROPOSED, valid ACCEPTED, ACCEPTED plus unchecked Clarification rejection, ACCEPTED plus option without rationale rejection, frontmatter shape failures, forbidden relation verb rejection
- [x] `bun test shared/composition/tests/schemas/adr-note.test.ts` passes with at least 8 cases green
- [x] `biome check` passes on the new file
- [x] `tsc --noEmit` passes for the workspace
- [x] `shared/composition/src/schemas/index.ts` re-exports `AdrNoteSchema` and `AdrNote`


## ADR Compliance


- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-2 (file lands in existing flat `schemas/` directory, named `<type>-note.ts`)
- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-5 (ADR schema closes the highest-consequence P0 coverage gap)
- [x] Honors [[ADR-001: Composition Library Architecture]] Zod plus superRefine invariant


## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/src/schemas/adr-note.ts` | NEW | AdrNoteSchema implementation |
| `shared/composition/src/schemas/index.ts` | MODIFY | Re-export AdrNoteSchema and AdrNote |
| `shared/composition/tests/schemas/adr-note.test.ts` | NEW | Unit tests for AdrNoteSchema |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1.5d | Clarifications checkbox parsing requires careful regex |
| AI-Dominant | 1d | Pattern closely mirrors plan-note.ts; AI authors superRefine in one pass |
| AI-Assisted | 1d | Schema reference from existing Wave 1 schemas |

## Observations

- [task] Implements the ADR P0 coverage gap; the schema is the precondition for the parser (TASK-005) and claim validator (TASK-007) #adr #schema #p0
- [constraint] superRefine rejects ACCEPTED when Clarifications has unchecked items OR Considered Options lack rationale; both rules must coexist in one superRefine pass #superrefine #adr-gate
- [technique] Final-two-sections invariant enforced via shared structural helper from common.ts; rule centralized to prevent drift #shared-invariant #drift-prevention
- [risk] Path `shared/composition/` assumes Track 4 rename completed; orchestrator must order Track 4 rename before this TASK starts #rename-dependency #orchestrator-wiring

## Relations

- implements [[REQ-001-SPEC-008: New Schema Suite]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[DESIGN-001-SPEC-008: Coverage Module Layout]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
- relates_to [[QA-045-SPEC-008: Implement ADR Schema]]
