---
title: 'REQ-002-SPEC-007: PlanNote Zod Schema'
type: requirement
permalink: specs/spec-007-plan-session-render/requirements/req-002-spec-007-plan-note-zod-schema
status: ACCEPTED
tags:
- requirement
- spec-007
- schema
- plan-note
---

# REQ-002-SPEC-007: PlanNote Zod Schema

## Requirement Statement

WHEN a plan note markdown file is parsed into a typed in-memory model
THE SYSTEM SHALL validate the parsed model against PlanNoteSchema at `_shared/composition/src/schemas/plan-note.ts`, enforcing frontmatter shape (title regex, type literal 'plan', status, complexity_tier, branches[1+], permalink regex, tags[2-5]), objectives[1+], parts[1+] with per-part refine (DONE part must have outcome), tasks with per-task refine (DONE task must reference resolving event), pending_decisions, editor_mirror, blockers, observations[3+], relations[2+], and superRefine cross-field invariants (task.part references valid part; part.depends_on references valid part; all-terminal parts implies plan status not IN_PROGRESS)
SO THAT structural integrity of plan notes is enforced at a known boundary before rendering.

## Pattern

Schema Validation Contract (Event-Driven: triggered on every parse and pre-write of a plan note).

## Priority

P0 -- the schema is the contract between LLM authoring and deterministic render.

## Category

Functional

## Context

ADR-003 D-4 locks Zod schema as validation contract. ANALYSIS-002 Appendix C provides the full PlanNoteSchema draft including PlanFrontmatterSchema, ObjectiveSchema, DodItemSchema, DecisionStateSchema, PartSchema, TaskSchema, PendingDecisionSchema, EditorMirrorEntrySchema, and the composed PlanNoteSchema with superRefine. 10 schema design decisions are baked in per ADR-003 D-4 listing.

## Acceptance Criteria

- [ ] GIVEN a valid plan note parsed model matching the trimmed PLAN template from ANALYSIS-002 Appendix A
      WHEN PlanNoteSchema.parse() is called
      THEN validation passes with no errors

- [ ] GIVEN a plan model where a part has substatus DONE but no outcome
      WHEN PlanNoteSchema.parse() is called
      THEN validation fails with message "DONE part must have an outcome"

- [ ] GIVEN a plan model where a task references part "build.SPEC-999" not in the parts array
      WHEN PlanNoteSchema.parse() is called
      THEN validation fails with message identifying the unknown part reference

- [ ] GIVEN a plan model where all parts are DONE/DEFERRED/ABANDONED but frontmatter status is IN_PROGRESS
      WHEN PlanNoteSchema.parse() is called
      THEN validation fails with message "All parts terminal but plan status is IN_PROGRESS"

- [ ] GIVEN a plan model where a task has status DONE but no resolved_at_event
      WHEN PlanNoteSchema.parse() is called
      THEN validation fails with message "DONE task must reference a resolving event"

- [ ] GIVEN PlanFrontmatterSchema
      WHEN validated against frontmatter with title not matching PLAN-NNN pattern
      THEN validation fails

- [ ] GIVEN tasks, pending_decisions, editor_mirror fields are absent
      WHEN PlanNoteSchema.parse() is called with those fields missing
      THEN they default to empty arrays (not validation errors)

## Implementation Notes

Full schema draft in ANALYSIS-002 Appendix C plan-note.ts section. All sub-schemas use .strict() per design decision 1. PUD options constrained to 2-4 per design decision 8.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/schemas/plan-note.ts` | NEW | PlanNote Zod schema with cross-field invariants |

## Observations

- [requirement] PlanNoteSchema validates the complete plan note structure including 5 cross-field invariants in superRefine #validation #plan-note
- [constraint] Strict objects (.strict()) reject unknown fields; schema is single source of truth for shape #strict #zod
- [decision] No decision_log or progress_log arrays; absence enforces the D-2 responsibility split #responsibility-split #enforcement

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
- depends_on [[REQ-001-SPEC-007: Schema Common Module]]
