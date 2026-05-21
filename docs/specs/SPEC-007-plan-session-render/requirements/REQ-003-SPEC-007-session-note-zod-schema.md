---
title: 'REQ-003-SPEC-007: SessionNote Zod Schema'
type: requirement
permalink: specs/spec-007-plan-session-render/requirements/req-003-spec-007-session-note-zod-schema
status: ACCEPTED
tags:
- requirement
- spec-007
- schema
- session-note
---

# REQ-003-SPEC-007: SessionNote Zod Schema

## Requirement Statement

WHEN a session note markdown file is parsed into a typed in-memory model
THE SYSTEM SHALL validate the parsed model against SessionNoteSchema at `_shared/composition/src/schemas/session-note.ts`, enforcing frontmatter shape (title regex, type literal 'session', status, binds_to[1+], permalink regex, tags[2-5]), scope, bound_plans[1+] with ref and worked_parts[1+], events[1+] as a discriminated union on type field supporting 10 event types (session-start, bootstrap, part-transition, decision-lock, task-transition, agent-dispatch, debate-result, pending-decision-surfaced, pending-decision-resolved, state-change), observations[3+], relations[2+], and superRefine cross-field invariants (event numbers continuous from 1; first event must be session-start)
SO THAT structural integrity of session notes is enforced at a known boundary before rendering.

## Pattern

Schema Validation Contract (Event-Driven: triggered on every parse and pre-write of a session note).

## Priority

P0 -- foundational for session-note parser and renderer.

## Category

Functional

## Context

ADR-003 D-4 locks Zod schema as validation contract. ANALYSIS-002 Appendix C provides the full SessionNoteSchema draft including SessionFrontmatterSchema, 10 event type schemas via discriminated union, BoundPlanRefSchema, and the composed SessionNoteSchema with superRefine. Each event type has type-specific fields (e.g., part-transition has part/from/to/outcome; debate-result has target/verdict/tally/p0/p1/p2 counts).

## Acceptance Criteria

- [ ] GIVEN a valid session note parsed model matching the SESSION template from ANALYSIS-002 Appendix B
      WHEN SessionNoteSchema.parse() is called
      THEN validation passes with no errors

- [ ] GIVEN a session model where event numbers are [1, 2, 4] (gap at 3)
      WHEN SessionNoteSchema.parse() is called
      THEN validation fails with message about non-continuous event numbers

- [ ] GIVEN a session model where the first event has type "bootstrap" instead of "session-start"
      WHEN SessionNoteSchema.parse() is called
      THEN validation fails with message "First event must be type: session-start"

- [ ] GIVEN a part-transition event with from: "IN_PROGRESS" and to: "DONE" and outcome present
      WHEN EventSchema.parse() is called
      THEN validation passes

- [ ] GIVEN a debate-result event with verdict, tally object, and p0/p1/p2 counts
      WHEN EventSchema.parse() is called
      THEN validation passes with all debate-specific fields correctly typed

- [ ] GIVEN each of the 10 event types
      WHEN validated with correct type-specific fields
      THEN discriminated union correctly narrows to the specific event type

## Implementation Notes

Full schema draft in ANALYSIS-002 Appendix C session-note.ts section. Event discriminated union uses z.discriminatedUnion('type', [...]) for clean type narrowing. The ts field is optional ISO datetime. Body defaults to empty string.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/schemas/session-note.ts` | NEW | SessionNote Zod schema with discriminated event union |

## Observations

- [requirement] SessionNoteSchema validates 10 discriminated event types with type-specific fields per event #validation #session-note
- [constraint] Event numbers must be continuous from 1; first event must be session-start -- two structural invariants enforced via superRefine #invariant #event-continuity
- [decision] Strict objects throughout; unknown fields rejected at validation boundary #strict #zod

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
- depends_on [[REQ-001-SPEC-007: Schema Common Module]]
