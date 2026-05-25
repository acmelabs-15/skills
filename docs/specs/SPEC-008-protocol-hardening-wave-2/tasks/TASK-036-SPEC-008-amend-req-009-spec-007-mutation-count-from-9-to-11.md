---
title: 'TASK-036-SPEC-008: Amend REQ-009-SPEC-007 Mutation Count from 9 to 11'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-036-spec-008-amend-req-009-spec-007-mutation-count-from-9-to-11-1
status: TODO
tags:
- spec-008
- track-4
- req-amendment
- audit-d
- atomic
---

# TASK-036-SPEC-008: Amend REQ-009-SPEC-007 Mutation Count from 9 to 11

## Objective

ANALYSIS-004 Audit D identified REQ-009-SPEC-007 body text "9 mutation types" as stale — the composition library now ships 11 mutation types (added `transition-impl-item` and `transition-qa-item` via PR #14 during Phase X Wave 1). Amend the requirement body to read "11 mutation types" and add a provenance line citing the PR. Use Brain MCP `edit_note` per binary tool rule.

Steps:

1. Read REQ-009-SPEC-007 via Brain MCP
2. Locate the "9 mutation types" text (likely in EARS, Acceptance Criteria, or Description)
3. `edit_note` find_replace: `9 mutation types` → `11 mutation types`
4. Append an Observation entry citing the PR #14 expansion as provenance: `- [fact] Mutation count expanded from 9 to 11 via PR #14 (added transition-impl-item + transition-qa-item) #provenance #pr-14`
5. Verify by re-reading note

## Definition of Done

- [x] REQ-009-SPEC-007 body contains zero occurrences of "9 mutation types"
- [x] REQ-009-SPEC-007 body contains at least one occurrence of "11 mutation types"
- [x] REQ-009-SPEC-007 `## Observations` section contains a `[fact]` entry citing PR #14 as the expansion provenance
- [x] Brain MCP `read_note REQ-009-SPEC-007: Plan Mutation API` returns the amended content
- [x] No raw Edit/Write was used on `docs/**` (binary tool rule honored)

## ADR Compliance

- ADR-005 D-7 tactical-cleanup notation: spec-vs-code drift fix per Audit D inline finding

## Files Affected

- `docs/specs/SPEC-007-plan-session-render/requirements/REQ-009-SPEC-007-plan-mutation-api.md` (via Brain MCP)

## Effort Summary

| Tier | Estimate | Notes |
|---|---|---|
| Human | 15min | 2 Brain MCP edit_note calls + read verification |
| AI-Dominant | 5min | Mechanical find_replace + observation append (CANONICAL) |
| AI-Assisted | 10min | Pair-driven |

## Observations

- [decision] Single find_replace edit; smallest blast-radius drift fix in Track 4 #scoped
- [constraint] Brain MCP only; per binary tool rule #binary-tool-rule
- [insight] Provenance Observation (PR #14 citation) provides archaeological context so future readers do not re-introduce the same drift #archaeology

## Relations

- implements [[REQ-010-SPEC-008: Brain Note Hygiene and Code-vs-Spec Drift Cleanup]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
