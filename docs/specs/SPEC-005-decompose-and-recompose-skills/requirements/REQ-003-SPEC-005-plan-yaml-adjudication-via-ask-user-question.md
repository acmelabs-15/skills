---
title: 'REQ-003-SPEC-005: Plan YAML Adjudication via AskUserQuestion'
type: requirement
status: DRAFT
permalink: specs/spec-005-decompose-and-recompose-skills/requirements/req-003-spec-005-plan-yaml-adjudication-via-ask-user-question-1
tags:
- requirement
- adjudication
- ask-user-question
- spec-005
- human-in-the-loop
---

# REQ-003-SPEC-005: Plan YAML Adjudication via AskUserQuestion

## Requirement Statement

WHEN the LLM has authored a distribution or composition plan YAML,
THE SYSTEM SHALL present the plan to the user via AskUserQuestion with a human-readable summary and options to approve, reject with feedback, or abort,
SO THAT no deterministic script execution occurs without explicit user consent and the user can refine the plan through iterative feedback loops.

## EARS Pattern: Event-Driven

Plan adjudication fires after LLM plan authoring completes and before script execution begins. The adjudication step is mandatory; there is no silent execution path per KICKOFF-BRIEF.md constraints.

## Context

The three-phase workflow (LLM authors plan, user adjudicates, script executes) is a locked design pattern from KICKOFF-BRIEF.md. AskUserQuestion is the Claude Code mechanism for presenting structured choices to the user. The adjudication step serves as the human-in-the-loop gate that prevents the LLM from silently restructuring notes. If the user rejects the plan, the skill loops back to the LLM for refinement based on user feedback. If the user aborts, no plan file is written and no script execution occurs.

The human-readable summary presented via AskUserQuestion includes: source note path(s), destination note path(s), the renumber map, the wikilink substitution map, and any type-specific fields (cross_source_updates for SESSION, regenerated_sections for PLAN, subtree_manifest summary for SPEC). The raw YAML plan file at docs/_restructure/ is also referenced for users who want full detail.

## Acceptance Criteria

- [ ] Given a completed plan YAML, when AskUserQuestion presents the plan, then the user sees source paths, destination paths, renumber map, wikilink map, and type-specific fields in a readable format
- [ ] Given the user selects "approve," when the adjudication step completes, then the script proceeds to execute the plan
- [ ] Given the user selects "reject with feedback," when the adjudication step completes, then the LLM receives the feedback and re-authors the plan without any file I/O having occurred
- [ ] Given the user selects "abort," when the adjudication step completes, then no plan file is persisted and no script execution occurs
- [ ] Given a refinement loop, when the user rejects and provides feedback multiple times, then each iteration produces a new plan YAML that incorporates prior feedback

## Priority

P0 -- The adjudication step is the human-in-the-loop gate. Without it, the system violates the "no silent execution" constraint from KICKOFF-BRIEF.md.

## Category

Functional

## Observations

- [requirement] AskUserQuestion presents plan with approve/reject-with-feedback/abort options #adjudication #human-in-the-loop
- [constraint] No script execution without explicit user approval per KICKOFF-BRIEF.md locked constraint #no-silent-execution
- [decision] Refinement loops re-invoke LLM with user feedback to iterate on plan before execution #iterative-refinement
- [fact] Human-readable summary includes source paths, destination paths, renumber map, wikilink map, and type-specific fields #ux #readability

## Relations

- part_of [[SPEC-005: Decompose and Recompose Skills]]
- implements [[ADR-001: Composition Library Architecture]]
- required_by [[REQ-001-SPEC-005: Decompose Skill Implementation]]
- required_by [[REQ-002-SPEC-005: Recompose Skill Implementation]]