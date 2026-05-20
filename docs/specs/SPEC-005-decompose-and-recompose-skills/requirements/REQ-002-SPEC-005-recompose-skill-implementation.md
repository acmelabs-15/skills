---
title: 'REQ-002-SPEC-005: Recompose Skill Implementation'
type: requirement
status: DRAFT
permalink: specs/spec-005-decompose-and-recompose-skills/requirements/req-002-spec-005-recompose-skill-implementation
tags:
- requirement
- recompose
- skill
- spec-005
- pipeline
---

# REQ-002-SPEC-005: Recompose Skill Implementation

## Requirement Statement

WHEN a user invokes /recompose on N Brain knowledge-graph notes,
THE SYSTEM SHALL read the source notes, have the LLM author a composition plan YAML, present the plan to the user via AskUserQuestion for adjudication, and on approval execute the plan via the adapter dispatcher to produce a single merged destination note with SHA-256 hash validation,
SO THAT multiple notes are merged into one note with zero content drift guaranteed by the composition library.

## EARS Pattern: Event-Driven

The /recompose skill is triggered by explicit user invocation. The skill orchestrates the full inverse pipeline of /decompose: multi-source reading, LLM composition plan authoring, user adjudication, and deterministic script execution via adapter dispatch.

## Context

The /recompose skill is the inverse of /decompose. Where /decompose performs 1-to-N split (distribution plan), /recompose performs N-to-1 merge (composition plan). Per ADR-002 D-1, composition plans use plural sources and singular destination, the structural inverse of distribution plans. The LLM's cognitive work includes determining merge order, resolving identifier collisions across sources, and authoring renumber/wikilink maps that unify the merged content. The script's mechanical work is identical to /decompose: parse by ranges, apply mutations, hash-validate, write atomically.

At SPEC-005 ship time, /recompose works for the ADR adapter only. Broader coverage is incremental per the same P1 amendment that applies to /decompose.

## Acceptance Criteria

- [ ] Given N Brain ADR notes and a valid composition plan YAML, when /recompose is invoked, then the script produces a single merged destination file that passes SHA-256 hash validation per ADR-001 F-8
- [ ] Given source notes, when the LLM authors a composition plan YAML, then the plan is written to docs/_restructure/recompose-{id}-plan.yaml per ADR-001 F-7
- [ ] Given a composition plan YAML, when the user rejects it via AskUserQuestion, then no file I/O occurs and the user may request refinements
- [ ] Given an invalid composition plan YAML, when the script attempts validation, then Zod rejects the plan with structured PlanValidationError before any file I/O

## Priority

P0 -- /recompose is the second core primitive. Without it, /defrag cannot delegate merge operations and the round-trip property test (decompose then recompose equals identity) cannot be exercised at the skill level.

## Category

Functional

## Observations

- [requirement] /recompose orchestrates N-to-1 merge via LLM composition plan then deterministic script execution #recompose #pipeline
- [fact] Composition plans use plural sources and singular destination per ADR-002 D-1 schema shape #plan-schema #composition
- [decision] CLI entry point at _shared/composition/src/recompose.ts mirrors decompose.ts structure #entry-point #symmetry
- [constraint] Round-trip identity test requires both /decompose and /recompose to validate zero drift end-to-end #round-trip #proof

## Relations

- part_of [[SPEC-005: Decompose and Recompose Skills]]
- implements [[ADR-001: Composition Library Architecture]]
- depends_on [[REQ-004-SPEC-005: Adapter Registry Dispatcher]]
- depends_on [[REQ-003-SPEC-005: Plan YAML Adjudication via AskUserQuestion]]