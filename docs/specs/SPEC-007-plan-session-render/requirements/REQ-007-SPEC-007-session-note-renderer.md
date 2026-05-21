---
title: 'REQ-007-SPEC-007: SessionNote Markdown Renderer'
type: requirement
permalink: specs/spec-007-plan-session-render/requirements/req-007-spec-007-session-note-renderer
status: ACCEPTED
tags:
- requirement
- spec-007
- renderer
- session-note
---

# REQ-007-SPEC-007: SessionNote Markdown Renderer

## Requirement Statement

WHEN a typed SessionNote model is provided
THE SYSTEM SHALL render it to canonical markdown via `renderSessionNote(session: SessionNote): string` at `_shared/composition/src/renderers/session-note.ts` producing sections in canonical order (frontmatter, H1 title, Scope, Bound PLAN bullet list with wikilink ref and worked_parts, Events H3 sections with typed-field bullets first and prose body after, Observations, Relations) using unified + remark-stringify
SO THAT the typed model is deterministically serialized to markdown with event ordering and field formatting enforced.

## Pattern

Renderer (Stateless: receives typed model, returns markdown string).

## Priority

P0 -- one half of the session round-trip identity pair.

## Category

Functional

## Context

ADR-003 D-2 establishes SESSION as backward-looking append-only event ledger. ANALYSIS-002 Appendix E provides the renderer sketch. Each event is rendered with typed-field bullets at the start followed by free-text prose body. No derived views in SESSION (unlike PLAN which has Dashboard and Mermaid).

## Acceptance Criteria

- [ ] GIVEN a valid SessionNote model parsed from SESSION-2026-05-19_01 fixture
      WHEN renderSessionNote() is called
      THEN the output is valid markdown with all canonical sections in order

- [ ] GIVEN a SessionNote with multiple bound plans
      WHEN renderSessionNote() renders the Bound PLAN section
      THEN each plan is a bullet with wikilink ref and worked_parts list

- [ ] GIVEN an event of type "decision-lock" with part, decision_ids, title, and body
      WHEN renderSessionNote() renders that event
      THEN H3 heading is "Event NN -- title", typed-field bullets appear first, prose body follows

- [ ] GIVEN events numbered 1 through N
      WHEN renderSessionNote() renders the Events section
      THEN events appear in ascending order by event number

- [ ] GIVEN the renderer output
      WHEN inspected
      THEN Observations is second-to-last H2 and Relations is last H2

## Implementation Notes

Expected size 100-150 LOC. Simpler than plan renderer because SESSION has no derived views. Event rendering must enforce bullets-first paragraphs-after ordering per parser contract. Uses unified + remark-stringify.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/renderers/session-note.ts` | NEW | SessionNote markdown renderer |

## Observations

- [requirement] Session renderer serializes append-only event ledger with typed-field bullets before prose body per parser contract #renderer #session-note
- [constraint] No derived views in SESSION; simpler than plan renderer #simplicity #session
- [decision] Event ordering enforced by renderer; events always appear in ascending event-number order #ordering #determinism

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
- depends_on [[REQ-003-SPEC-007: SessionNote Zod Schema]]
