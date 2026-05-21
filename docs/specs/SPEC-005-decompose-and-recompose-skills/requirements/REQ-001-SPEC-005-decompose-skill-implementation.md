---
title: 'REQ-001-SPEC-005: Decompose Skill Implementation'
type: requirement
status: ACCEPTED
permalink: specs/spec-005-decompose-and-recompose-skills/requirements/req-001-spec-005-decompose-skill-implementation
tags:
- requirement
- decompose
- skill
- spec-005
- pipeline
---

# REQ-001-SPEC-005: Decompose Skill Implementation

## Requirement Statement

WHEN a user invokes /decompose on a Brain knowledge-graph note,
THE SYSTEM SHALL read the source note, have the LLM author a distribution plan YAML, present the plan to the user via AskUserQuestion for adjudication, and on approval execute the plan via the adapter dispatcher to produce N destination notes with SHA-256 hash validation,
SO THAT the source note is split into multiple notes with zero content drift guaranteed by the composition library.

## EARS Pattern: Event-Driven

The /decompose skill is triggered by explicit user invocation. The skill orchestrates the full pipeline: source classification, LLM plan authoring, user adjudication, and deterministic script execution via adapter dispatch.

## Context

The /decompose skill is one of two primitive skills (alongside /recompose) that expose the composition library to users. Per the KICKOFF-BRIEF.md LLM-script division of labor, the LLM performs cognitive work (reading the source, classifying its type, identifying cluster seams, authoring a distribution plan YAML) while the deterministic script performs mechanical work (parsing by line ranges, applying mutations, hash-validating, writing via temp-then-rename). The skill SKILL.md file defines the Claude Code skill interface; the CLI entry point at _shared/composition/src/decompose.ts bridges from plan YAML to adapter dispatch.

At SPEC-005 ship time, /decompose works for the ADR adapter only (per SPEC-001 PROOF). Broader source_type coverage is incremental as SPEC-002, SPEC-003, and SPEC-004 complete their respective adapter implementations. The adapter registry dispatcher (REQ-004-SPEC-005) routes by source_type to whichever adapters are registered.

## Acceptance Criteria

- [ ] Given a Brain ADR note and a valid distribution plan YAML, when /decompose is invoked, then the script produces N destination files that pass SHA-256 hash validation per ADR-001 F-8
- [ ] Given a source note, when the LLM authors a distribution plan YAML, then the plan is written to docs/_restructure/decompose-{id}-plan.yaml per ADR-001 F-7
- [ ] Given a plan YAML, when the user rejects it via AskUserQuestion, then no file I/O occurs and the user may request refinements
- [ ] Given an invalid plan YAML (e.g., non-injective renumber_map), when the script attempts validation, then Zod rejects the plan with structured PlanValidationError before any file I/O

## Priority

P0 -- /decompose is one of the two core primitives that the entire skills ecosystem composes upon. Without it, /defrag cannot delegate split operations.

## Category

Functional

## Observations

- [requirement] /decompose orchestrates LLM plan authoring then deterministic script execution with hash validation #decompose #pipeline
- [fact] At SPEC-005 ship, only ADR adapter registered; broader coverage incremental per P1 amendment from ANALYSIS-001 #incremental #adapter-coverage
- [decision] CLI entry point at _shared/composition/src/decompose.ts bridges plan YAML to adapter dispatch #entry-point #architecture
- [constraint] LLM never touches content bytes; only authors plan YAML per KICKOFF-BRIEF.md division of labor #llm-script-separation

## Relations

- part_of [[SPEC-005: Decompose and Recompose Skills]]
- implements [[ADR-001: Composition Library Architecture]]
- depends_on [[REQ-004-SPEC-005: Adapter Registry Dispatcher]]
- depends_on [[REQ-003-SPEC-005: Plan YAML Adjudication via AskUserQuestion]]
