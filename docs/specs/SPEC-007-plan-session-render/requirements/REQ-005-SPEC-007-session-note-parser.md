---
title: 'REQ-005-SPEC-007: SessionNote Markdown Parser'
type: requirement
permalink: specs/spec-007-plan-session-render/requirements/req-005-spec-007-session-note-parser
status: ACCEPTED
tags:
- requirement
- spec-007
- parser
- session-note
---

# REQ-005-SPEC-007: SessionNote Markdown Parser

## Requirement Statement

WHEN a session note markdown file is provided as a string
THE SYSTEM SHALL parse it via `parseSessionNote(markdown: string): SessionNote` at `_shared/composition/src/parsers/session-note.ts` using unified + remark-parse + remark-frontmatter into an AST, extract frontmatter, sectionize by H2 (Scope, Bound PLAN, Events, Observations, Relations), parse Bound PLAN as wikilink ref + worked_parts list, parse Events via H3 sectionization ("Event NN -- title") with bulletFieldMap for typed fields and discriminated union narrowing at Zod validation, and validate the complete model via SessionNoteSchema.parse()
SO THAT session note markdown is transformed into a typed in-memory model suitable for mutation and rendering.

## Pattern

Parser (Stateless: called with markdown string, returns typed model or throws ParseError).

## Priority

P0 -- required before session mutation API or renderer can operate.

## Category

Functional

## Context

ADR-003 D-3 locks deterministic render scripts. ANALYSIS-002 Appendix D provides the full parser draft for session-note.ts including parseSessionNote, parseBoundPlans, parseEvents with EVENT_HEADING_RE, per-field switch dispatch (Part, Type, Transition, Outcome, Decision IDs, Task, Agent, Verdict, Tally, P0/P1/P2), and EventSchema.parse() for discriminated union narrowing. The parser accepts both "Bound PLAN" and "Bound PLANs" as H2 heading text.

## Acceptance Criteria

- [ ] GIVEN the SESSION-2026-05-19_01 fixture markdown
      WHEN parseSessionNote() is called
      THEN it returns a SessionNote object that passes SessionNoteSchema validation

- [ ] GIVEN an event heading "Event 08 -- 5 decisions LOCKED via AskUserQuestion"
      WHEN parseEvents processes it
      THEN event number 8 and title are extracted correctly

- [ ] GIVEN event typed-field bullets including "- Type: decision-lock" and "- Decision IDs: D-1, D-2, D-3"
      WHEN bulletFieldMap and field switch process them
      THEN type is "decision-lock" and decision_ids is ["D-1", "D-2", "D-3"]

- [ ] GIVEN a Bound PLAN entry "[[PLAN-001: Skills Ecosystem]] -- worked parts: research, decisions.1"
      WHEN parseBoundPlans processes it
      THEN ref is "PLAN-001: Skills Ecosystem" and worked_parts is ["research", "decisions.1"]

- [ ] GIVEN event body paragraphs following the typed-field bullet list
      WHEN parseEvents processes the event
      THEN body text is extracted as a string separate from the typed fields

- [ ] GIVEN the H2 heading is "Bound PLANs" (plural) instead of "Bound PLAN"
      WHEN parseSessionNote looks for the section
      THEN it finds and parses it correctly

## Implementation Notes

Full parser draft in ANALYSIS-002 Appendix D parsers/session-note.ts section. Reuses ast-helpers.ts from REQ-004. Event types dispatch by Type field bullet; discriminated union narrowing happens at Zod validation, not at parse time. Bullet field map is forgiving: unknown bullets are ignored; Zod catches schema gaps.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/parsers/session-note.ts` | NEW | SessionNote markdown parser |

## Observations

- [requirement] Session parser handles 10 event types via discriminated union narrowing at Zod validation boundary #parser #session-note
- [technique] Bullet field map is forgiving of unknown fields; Zod catches schema gaps at validation #forgiving-parse #zod
- [constraint] Parser assumes bullets-first paragraphs-after ordering in events; renderer enforces this order #ordering #contract

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
- depends_on [[REQ-003-SPEC-007: SessionNote Zod Schema]]
- depends_on [[REQ-004-SPEC-007: PlanNote Markdown Parser]]
