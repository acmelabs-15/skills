---
title: 'TASK-031-SPEC-008: Amend SPEC-007 Root with Deferred Notation and Legend'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-031-spec-008-amend-spec-007-root-with-deferred-notation-and-legend-1
status: TODO
tags:
- spec-008
- track-4
- spec-007-amendment
- deferred-notation
- atomic
---

# TASK-031-SPEC-008: Amend SPEC-007 Root with Deferred Notation and Legend

## Objective

Apply the `[~]` deferred-notation amendment to the SPEC-007 root note per REQ-008-SPEC-008 + ADR-005 D-6. Three artifact rows (REQ-012, TASK-013, TASK-014) currently show `[ ]` despite their notes carrying `status: DEFERRED`. Flip each to `[~]` and prepend a one-line notation legend to the `## Artifact Status` section. Use Brain MCP `edit_note` (NEVER raw Edit on `docs/**` per binary tool rule).

Steps:

1. Read SPEC-007 root via `mcp__plugin_brain_brain__read_note`
2. `edit_note` find_replace: `- [ ] REQ-012-SPEC-007: PLAN-001 Dogfood Migration` → `- [~] REQ-012-SPEC-007: PLAN-001 Dogfood Migration`
3. `edit_note` find_replace: `- [ ] TASK-013-SPEC-007: Dogfood PLAN-001 Migration (BLOCKED; superseded by TASK-014)` → `- [~] TASK-013-SPEC-007: Dogfood PLAN-001 Migration (BLOCKED; superseded by TASK-014)`
4. `edit_note` find_replace: `- [ ] TASK-014-SPEC-007: Execute PLAN-001 Migration to Trimmed Template (TODO; gap-TASK)` → `- [~] TASK-014-SPEC-007: Execute PLAN-001 Migration to Trimmed Template (TODO; gap-TASK)`
5. `edit_note` prepend a notation legend line before the `### Requirements` subheading inside `## Artifact Status`, reading: `> **Legend**:`[ ]` = TODO, `[x]` = DONE, `[~]`= DEFERRED (status terminal but artifact intentionally not completed; see REQ-008-SPEC-008).`
6. Verify SPEC-007 status remains DONE (no status change)

## Definition of Done

> Amended 2026-05-24 (SESSION-2026-05-23_02 Event 136, decision D-A): the original "`[~]` deferred notation + legend" premise is OBSOLETE. The D-A investigation (analyst, Event 135) established that SPEC-007 plan-001-migration is genuinely DONE — the formerly-deferred `plan-001-migration` tests now PASS (5/0) and the live PLAN-001 conforms to the trimmed template. So the correct reconciliation marks SPEC-007 truly complete (`[x]`), NOT deferred (`[~]`); no `[~]` legend is needed (no deferred items). DoD reframed to the actual reconciliation performed.

- [x] SPEC-007 root `## Artifact Status`: REQ-012 / TASK-013 / TASK-014 rows flipped `[ ]` → `[x]` (migration done; TASK-013 resolved-via-supersession by TASK-014; row labels sharpened to match)
- [x] SPEC-007 root `## Success Criteria`: all 8 rows `[ ]` → `[x]` (satisfied — all REQs/DESIGNs/TASKs terminal; plan/session round-trip property tests pass)
- [x] SPEC-007 root + TASK-013 + TASK-014 Relations: invalid `validated_by` verb (not in the 11-verb allowlist) replaced with `relates_to` — was blocking `validateSpecDoneClaim` parse
- [x] REQ-012-SPEC-007: 4 `## Acceptance Criteria` rows `[x]` + stale "deferred" outcome observation rewritten to reflect the executed migration (validated by passing tests)
- [x] `validateSpecDoneClaim(SPEC-007)` returns `ok` (exit 0) — verified post-reconciliation
- [x] SPEC-007 frontmatter `status: DONE` unchanged
- [x] All edits via Brain MCP `edit_note` (no raw Edit/Write on `docs/**`)

## ADR Compliance

- ADR-005 D-6: "Amend SPEC root checkbox notation for deferred items (Recommended)" — verbatim user lock per SESSION-2026-05-23_02 Event 15

## Files Affected

- `docs/specs/SPEC-007-plan-session-render/SPEC-007-plan-session-render.md` (via Brain MCP)

## Effort Summary

| Tier | Estimate | Notes |
|---|---|---|
| Human | 20min | 4 Brain MCP edit_note calls + read verification |
| AI-Dominant | 10min | Mechanical edits via Brain MCP (CANONICAL) |
| AI-Assisted | 15min | Pair-driven with verification |

## Observations

- [decision] Brain MCP `edit_note` is mandatory tool per `feedback_memory_updates_via_memory_agent` HARD-LOCK; raw Edit on `docs/**` is forbidden #brain-mcp #binary-tool-rule
- [constraint] Legend wording must reference REQ-008-SPEC-008 as the source decision so future readers can trace notation provenance #provenance
- [insight] This TASK is the demonstration case for the notation — TASK-032 (validator extension) then makes the notation programmatically enforced #demonstration #pair-task
- [outcome] Closes SPEC-007 PARTIAL drift from Audit D without status downgrade or forced TASK-014 completion #drift-cleanup #d-6

## Relations

- implements [[REQ-008-SPEC-008: Deferred Checkbox Notation and Validator Extension]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
- pairs_with [[TASK-032-SPEC-008: Extend validateSpecDoneClaim for Deferred Notation]]
