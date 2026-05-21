---
title: 'TASK-006-SPEC-007: Implement SessionNote Parser'
type: task
permalink: specs/spec-007-plan-session-render/tasks/task-006-spec-007-implement-session-note-parser
status: DONE
effort: M
estimate: 1d
tags:
- task
- spec-007
- parser
- session-note
---

# TASK-006-SPEC-007: Implement SessionNote Parser

## Design Context

This TASK realizes REQ-005-SPEC-007 and the parsers/session-note.ts from ANALYSIS-002 Appendix D.

## Objective

Create `_shared/composition/src/parsers/session-note.ts` implementing parseSessionNote with section parsers: parseBoundPlans (wikilink ref + worked_parts), parseEvents (H3 "Event NN -- title" with bulletFieldMap for typed fields and discriminated union narrowing at Zod validation), parseObservations, parseRelations.

## Scope

**In Scope**:

- parseSessionNote main function with unified pipeline
- parseBoundPlans extracting wikilink ref and worked_parts
- parseEvents with per-field switch dispatch (Type, Part, Transition, Outcome, Decision IDs, Task, Agent, Verdict, Tally, P0/P1/P2)
- Event body extraction (paragraphs after bullet list)
- Both "Bound PLAN" and "Bound PLANs" heading acceptance

**Out of Scope**:

- Plan parser (TASK-005)
- Renderer implementation

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/parsers/session-note.ts` | NEW | SessionNote markdown parser |

## Testing Requirements

- parseSessionNote successfully parses SESSION-2026-05-19_01 fixture
- Event heading extraction: number and title from "Event NN -- title"
- Typed field parsing: all field types extracted correctly
- Bound PLAN wikilink ref and worked_parts extracted
- Body text separated from typed-field bullets
- Zod discriminated union narrowing produces correct event types

## Definition of Done

- [ ] parseSessionNote parses SESSION fixture without errors
- [ ] All event typed-fields parsed via bulletFieldMap and field switch
- [ ] BoundPlan wikilink ref and worked_parts extracted correctly
- [ ] SessionNoteSchema.parse() validates the output successfully
- [ ] Unit tests cover event types and edge cases
- [ ] Integration test with session fixture passes
- [ ] biome lint + tsc --noEmit pass

## ADR Compliance

- [ ] Honors ADR-003 D-3: parser feeds deterministic render pipeline
- [ ] Honors ADR-001 D-2: uses unified + remark-parse + remark-frontmatter

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1.5d | Event field dispatch logic requires testing per event type |
| AI-Dominant | 1d | Draft available; mechanical translation |
| AI-Assisted | 1d | Draft in ANALYSIS-002 |

## Observations

- [task] Session parser is simpler than plan parser; no derived sections to skip and fewer section types #simpler #session
- [technique] Event type dispatch by Type field bullet enables clean per-type field extraction #dispatch #event-types
- [constraint] Parser assumes bullets-first paragraphs-after in events; renderer enforces this ordering #ordering #contract

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[REQ-005-SPEC-007: SessionNote Markdown Parser]]
- depends_on [[TASK-004-SPEC-007: Implement AST Helpers]]
- depends_on [[TASK-003-SPEC-007: Implement SessionNote Zod Schema]]
- validated_by [[QA-015-SPEC-007: Implement SessionNote Parser]]
