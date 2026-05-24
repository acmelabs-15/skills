---
title: 'TASK-004-SPEC-008: Implement CRIT Schema'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-004-spec-008-implement-crit-schema
status: DONE
effort: S
estimate: 0.5d
tags:
- task
- spec-008
- schema
- crit
- wave-2
---

# TASK-004-SPEC-008: Implement CRIT Schema

## Description

Implement `CritNoteSchema` at `shared/composition/src/schemas/crit-note.ts` per [[REQ-001-SPEC-008: New Schema Suite]] and [[DESIGN-001-SPEC-008: Coverage Module Layout]]. The schema validates frontmatter (title regex `^CRIT-\d{3}-(ADR|ANALYSIS|SPEC|REQ|DESIGN|TASK)-\d{3}.*` for parent-referenced form, type literal `critique`, status enum, permalink regex `^critique/`, tags 2-5), body sections (Findings table with per-finding fields, Recommendations), Observations, Relations. Per [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-5, CRIT receives a schema and parser but NO claim validator. The schema provides read-time structural validation in support of adr-review convergence.

This TASK depends on Track 4 renaming `_shared/` to `shared/`.

## Definition of Done

- [x] File `shared/composition/src/schemas/crit-note.ts` exists and exports `CritNoteSchema` plus `type CritNote`
- [x] Frontmatter title regex matches parent-referenced form (CRIT-NNN-PARENT-NNN)
- [x] Body sub-schema includes a Findings array with per-finding fields (severity enum, description, recommendation)
- [x] Final-two-sections invariant is enforced
- [x] Relations verb allowlist enforced from `schemas/common.ts`
- [x] All sub-schemas use `.strict()`
- [x] No claim validator file is authored under this TASK (CRIT has no terminal-status claim per D-5)
- [x] Unit tests cover: valid CRIT note, malformed parent-reference regex rejection, missing Findings rejection, forbidden relation verb rejection
- [x] `bun test shared/composition/tests/schemas/crit-note.test.ts` passes with at least 5 cases green
- [x] `biome check` passes
- [x] `tsc --noEmit` passes
- [x] `shared/composition/src/schemas/index.ts` re-exports `CritNoteSchema` and `CritNote`

## ADR Compliance

- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-2
- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-5 (P1 CRIT coverage; no claim validator per spec)
- [x] Honors [[ADR-001: Composition Library Architecture]]

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/src/schemas/crit-note.ts` | NEW | CritNoteSchema implementation |
| `shared/composition/src/schemas/index.ts` | MODIFY | Re-export CritNoteSchema and CritNote |
| `shared/composition/tests/schemas/crit-note.test.ts` | NEW | Unit tests for CritNoteSchema |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.75d | Parent-reference regex requires care |
| AI-Dominant | 0.5d | Smallest of the four new schemas |
| AI-Assisted | 0.5d | Pattern established |

## Observations

- [task] CRIT schema closes the structural gap supporting adr-review convergence; no claim validator per D-5 #crit #p1 #no-claim-validator
- [constraint] Parent-reference regex is required at the frontmatter layer; un-parented CRIT notes are invalid #parent-reference
- [decision] No claim validator authored; D-5 documents CRIT has no terminal-status claim that warrants mechanical check #d-5 #no-validator
- [risk] Path uses `shared/`; depends on Track 4 rename #rename-dependency

## Relations

- implements [[REQ-001-SPEC-008: New Schema Suite]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[DESIGN-001-SPEC-008: Coverage Module Layout]]
- depends_on [[TASK-001-SPEC-008: Implement ADR Schema]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
