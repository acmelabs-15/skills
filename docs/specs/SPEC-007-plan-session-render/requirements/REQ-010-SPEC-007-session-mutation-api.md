---
title: 'REQ-010-SPEC-007: Session Mutation API'
type: requirement
permalink: specs/spec-007-plan-session-render/requirements/req-010-spec-007-session-mutation-api
status: ACCEPTED
tags:
- requirement
- spec-007
- mutation-api
- session-note
---

# REQ-010-SPEC-007: Session Mutation API

## Requirement Statement

WHEN an LLM or script needs to append an event to a session note
THE SYSTEM SHALL provide a typed mutation API at `shared/composition/src/session-mutations.ts` supporting an append-event mutation that reads existing session markdown, parses to typed model via parseSessionNote, appends the new event to the events array with continuity validation (new event number must equal max existing + 1), validates via SessionNoteSchema, re-renders the entire document via renderSessionNote, and writes atomically
SO THAT session note events are appended through a typed interface with event-number continuity enforced.

## Pattern

Command Pattern (append-event is a typed command; single disk write; full re-render).

## Priority

P1 -- session mutations are simpler than plan mutations but required for the full pipeline.

## Category

Functional

## Context

ADR-003 D-2 establishes SESSION as append-only event ledger. ANALYSIS-002 Appendix F includes the session-side mutation sketch: append-event. The session mutation API is simpler than the plan mutation API because SESSION has no derived views and supports only one mutation type (append-event). Future mutation types (e.g., update-observation) can be added incrementally.

## Acceptance Criteria

- [ ] GIVEN a session note with events numbered 1 through 5
      WHEN append-event is called with event number 6
      THEN the event is appended and the file is re-rendered with 6 events

- [ ] GIVEN a session note with events numbered 1 through 5
      WHEN append-event is called with event number 8 (non-continuous)
      THEN validation fails and the file is not written

- [ ] GIVEN an append-event mutation with a valid typed event (e.g., part-transition)
      WHEN applySessionMutation is called
      THEN the event appears in the Events section with correct typed-field bullets and prose body

- [ ] GIVEN any successful mutation
      WHEN the file is written
      THEN exactly one disk write occurs

## Implementation Notes

Expected size 50-80 LOC. Follows the same read-parse-mutate-validate-render-write pattern as plan mutations. Event continuity is enforced both by the mutation function (checking max existing event number) and by SessionNoteSchema superRefine.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/src/session-mutations.ts` | NEW | Session mutation API with append-event |

## Observations

- [requirement] Session mutation API supports append-event with event-number continuity validation #mutation-api #session
- [constraint] Append-only: events cannot be modified or deleted via the mutation API; only appended #append-only #immutability
- [decision] Same read-parse-mutate-validate-render-write pattern as plan mutations for consistency #pattern-consistency

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
- depends_on [[REQ-005-SPEC-007: SessionNote Markdown Parser]]
- depends_on [[REQ-007-SPEC-007: SessionNote Markdown Renderer]]
- depends_on [[REQ-003-SPEC-007: SessionNote Zod Schema]]
