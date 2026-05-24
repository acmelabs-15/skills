---
title: 'TASK-033-SPEC-008: Document Deferred Notation in CONVENTIONS Sections 4.6 and 4.7'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-033-spec-008-document-deferred-notation-in-conventions-sections-4-6-and-4-7-1
status: DONE
tags:
- spec-008
- track-4
- conventions-amendment
- documentation
- atomic
---

# TASK-033-SPEC-008: Document Deferred Notation in CONVENTIONS Sections 4.6 and 4.7

## Description

Amend `KNOWLEDGE-GRAPH-STRUCTURES.md` (the progressive-disclosure breakout that holds Section 4.5-Section 4.12 per-note-type structures) to document the `[~]` deferred-notation marker as canonical for PLAN parts (Section 4.6) and SPEC root artifact rows (Section 4.7). This closes the documentation gap so future spec/plan authors and validator implementers share one source of truth. Per REQ-008-SPEC-008 EARS clause 3.

Note: STRUCTURES is not a Brain note (`docs/**`) but a user-home-root canonical spec file (`~/KNOWLEDGE-GRAPH-STRUCTURES.md`). Per CONVENTIONS Section 1.7.1 binary tool rule, edit via `Edit` / `Write` tools (not Brain MCP).

Steps:

1. Locate Section 4.6 (PLAN structure) and Section 4.7 (SPEC structure) in `~/KNOWLEDGE-GRAPH-STRUCTURES.md`
2. Add a "Deferred notation" subsection (or paragraph) to Section 4.7 documenting `[~]` for SPEC root `## Artifact Status` rows
3. Add a parallel paragraph to Section 4.6 (PLAN parts) IF PLAN parts also support a deferred terminal state — verify via reading current Section 4.6; if PLAN parts only use the build-workflow item statuses (DONE/FAILED/SKIPPED), document that PLAN does NOT use `[~]` and that `[~]` is SPEC-root-scoped only
4. Both sections reference REQ-008-SPEC-008 and ADR-005 D-6 as the source decisions
5. CONVENTIONS Section 4.6/4.7 entries in `~/KNOWLEDGE-GRAPH-CONVENTIONS.md` (the auto-imported core spec) get a one-line pointer to STRUCTURES if they do not already
6. Verify by grep: `grep -n "\\[~\\]" ~/KNOWLEDGE-GRAPH-STRUCTURES.md` returns the new content

## Definition of Done


- [x] `~/KNOWLEDGE-GRAPH-STRUCTURES.md` Section 4.7 (SPEC structure) documents `[~]` as canonical deferred-notation marker for SPEC root `## Artifact Status` rows
- [x] `~/KNOWLEDGE-GRAPH-STRUCTURES.md` Section 4.6 (PLAN structure) either documents PLAN parity support for `[~]` OR explicitly clarifies `[~]` is SPEC-root-scoped only and PLAN parts use distinct build-workflow statuses
- [x] Both Section 4.6 and Section 4.7 reference REQ-008-SPEC-008 and ADR-005 D-6 as source decisions
- [x] `~/KNOWLEDGE-GRAPH-CONVENTIONS.md` Section 4.5-4.12 pointer block (if not already present) directs readers to STRUCTURES for `[~]` semantics
- [x] `grep -n "\\[~\\]" ~/KNOWLEDGE-GRAPH-STRUCTURES.md` returns the new content lines
- [x] No raw `Edit` / `Write` was used on `docs/**` (correctly used Edit/Write on user-home `~/KNOWLEDGE-GRAPH-*.md` per Section 1.7.1)


## ADR Compliance

- ADR-005 D-6: notation amendment + canonical CONVENTIONS documentation per REQ-008-SPEC-008 EARS clause 3

## Files Affected

- `~/KNOWLEDGE-GRAPH-STRUCTURES.md` (Section 4.6 + Section 4.7 amendments)
- `~/KNOWLEDGE-GRAPH-CONVENTIONS.md` (pointer block update if needed)

## Effort Summary

| Tier | Estimate | Notes |
|---|---|---|
| Human | 1h | Read + write two section amendments + verify grep |
| AI-Dominant | 30min | Mechanical Edit calls + verification (CANONICAL) |
| AI-Assisted | 45min | Pair-driven with review |

## Observations

- [decision] STRUCTURES is the on-demand progressive-disclosure breakout; per-note-type structure detail lives there, not in the auto-imported CONVENTIONS core #where-detail-lives
- [constraint] CONVENTIONS Section 1.7.1 binary tool rule: STRUCTURES is a user-home root file, NOT a Brain note — use Edit/Write tools, NOT Brain MCP #binary-tool-rule
- [insight] PLAN parts and SPEC root artifact lists may have different terminal vocabularies; clarifying explicitly avoids future ambiguity at validator-extension time #clarity
- [outcome] Closes documentation gap so REQ-008-SPEC-008 + TASK-032 validator extension have a stable, citable spec to point to #documentation-loop-closure

## Relations

- implements [[REQ-008-SPEC-008: Deferred Checkbox Notation and Validator Extension]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- pairs_with [[TASK-031-SPEC-008: Amend SPEC-007 Root with Deferred Notation and Legend]]
- relates_to [[QA-049-SPEC-008: Document Deferred Notation]]
- pairs_with [[TASK-032-SPEC-008: Extend validateSpecDoneClaim for Deferred Notation]]
