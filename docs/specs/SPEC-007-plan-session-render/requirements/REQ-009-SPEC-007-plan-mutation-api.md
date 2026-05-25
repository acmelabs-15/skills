---
title: 'REQ-009-SPEC-007: Plan Mutation API'
type: requirement
permalink: specs/spec-007-plan-session-render/requirements/req-009-spec-007-plan-mutation-api
status: ACCEPTED
tags:
- requirement
- spec-007
- mutation-api
- plan-note
---

# REQ-009-SPEC-007: Plan Mutation API

## Requirement Statement

WHEN an LLM or script needs to modify plan note state
THE SYSTEM SHALL provide a typed mutation API at `_shared/composition/src/plan-mutations.ts` supporting 11 mutation types (set-part-substatus, lock-decision, flip-dod-item, add-task, transition-task, surface-pending-decision, resolve-pending-decision, add-blocker, clear-blockers, transition-impl-item, transition-qa-item) where each mutation reads existing markdown, parses to typed model via parsePlanNote, applies the typed mutation in-memory, validates via PlanNoteSchema, re-renders the entire document via renderPlanNote, and writes atomically
SO THAT plan note mutations go through a narrow typed interface with automatic side-channel propagation (Progress Dashboard rollup, Cross-Part Deps Graph regeneration, status consistency checks) on every mutation.

## Pattern

Command Pattern (each mutation is a typed command; single disk write per mutation; full re-render on every mutation).

## Priority

P0 -- the mutation API is how LLMs interface with plan notes after D-3 replaces edit_note.

## Category

Functional

## Context

ADR-003 D-3 locks deterministic render scripts replacing LLM-authored find_replace. ANALYSIS-002 Appendix F provides the full mutation API sketch with 11 plan mutations and 1 session mutation. Each mutation triggers full re-render which automatically propagates derived views. The mutation function signature is `applyPlanMutation(planPath: string, mutation: PlanMutation): Promise<void>`.

## Acceptance Criteria

- [ ] GIVEN a set-part-substatus mutation with partId, from, to, optional completing_session and outcome
      WHEN applyPlanMutation is called
      THEN the part's substatus changes AND Progress Dashboard is regenerated AND Mermaid graph class assignments update

- [ ] GIVEN a lock-decision mutation with partId, decisionId, and topic
      WHEN applyPlanMutation is called
      THEN the part's decisions table gains a new row with the locked decision

- [ ] GIVEN a flip-dod-item mutation with partId and dodIndex
      WHEN applyPlanMutation is called
      THEN the specified DoD checkbox toggles its done state

- [ ] GIVEN an add-task mutation with a task object
      WHEN applyPlanMutation is called
      THEN the task appears in the appropriate sub-table (Backlog for PENDING status)

- [ ] GIVEN a transition-task mutation from PENDING to IN_PROGRESS
      WHEN applyPlanMutation is called
      THEN the task moves from Backlog to Active sub-table

- [ ] GIVEN any mutation
      WHEN the post-mutation model fails PlanNoteSchema validation
      THEN the mutation is rejected and the file is not written (atomic: no partial state)

- [ ] GIVEN any successful mutation
      WHEN the file is written
      THEN exactly one disk write occurs (no intermediate edit_note calls)

- [ ] GIVEN a surface-pending-decision mutation
      WHEN applyPlanMutation is called
      THEN the PUD appears in the Pending User Decisions section with 2-4 options

- [ ] GIVEN a resolve-pending-decision mutation
      WHEN applyPlanMutation is called
      THEN the PUD is removed from the Pending User Decisions section

## Implementation Notes

Full mutation API sketch in ANALYSIS-002 Appendix F. Each mutation type is a Zod-validated discriminated union member. The function reads markdown via Bun.file().text(), parses, mutates in-memory, validates, renders, writes via Bun.write(). Side-channel propagation is implicit: re-rendering regenerates all derived views.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/plan-mutations.ts` | NEW | Plan mutation API with 11 typed mutations |

## Observations

- [requirement] 11 typed plan mutations replace 30+ sequential edit_note calls per state propagation cycle #mutation-api #efficiency
- [decision] Full re-render on every mutation ensures derived views are always consistent #full-render #anti-drift
- [constraint] Atomic write: no partial state possible; schema validation gates every write #atomicity #validation
- [fact] Mutation count expanded from 9 to 11 via PR #14 (added transition-impl-item + transition-qa-item) #provenance #pr-14

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
- depends_on [[REQ-004-SPEC-007: PlanNote Markdown Parser]]
- depends_on [[REQ-006-SPEC-007: PlanNote Markdown Renderer]]
- depends_on [[REQ-002-SPEC-007: PlanNote Zod Schema]]
