---
title: 'TASK-002-SPEC-005: Implement Recompose CLI Entry Point and Skill Structure'
type: task
status: DONE
effort: S
estimate: 1d
permalink: specs/spec-005-decompose-and-recompose-skills/tasks/task-002-spec-005-implement-recompose-cli-entry-point-and-skill-structure
tags:
- task
- recompose
- cli
- skill
- spec-005
---

# TASK-002-SPEC-005: Implement Recompose CLI Entry Point and Skill Structure

## Design Context

- DESIGN-001-SPEC-005: Skill Architecture -- implements Component 2 (/recompose SKILL.md) and Component 4 (recompose.ts CLI entry point)

## Objective

Create the /recompose skill definition (SKILL.md) and the recompose.ts CLI entry point that bridges from an adjudicated composition plan YAML to the composition library's adapter dispatch pipeline. Mirrors the /decompose structure but operates on plural sources and singular destination per ADR-002 D-1 composition plan schema.

## Definition of Done

- [x] recompose/SKILL.md created with trigger phrases, LLM instructions for composition plan authoring, AskUserQuestion integration, and execution command
- [x] _shared/composition/src/recompose.ts created with: CLI arg parsing (--plan), YAML loading with FAILSAFE_SCHEMA, Zod validation via planSchema.parseAsync(), adapter dispatch via getAdapter(), multi-source extract/concatenate/mutate/hash-validate/write pipeline, audit log emission, structured error reporting
- [x] recompose.ts exits with code 0 on success, code 1 on validation error, code 2 on hash mismatch
- [x] Unit test: recompose.ts rejects invalid --plan argument with usage message
- [x] Unit test: recompose.ts rejects plan YAML that fails Zod validation with structured PlanValidationError


## Scope

**In Scope**:

- recompose/SKILL.md
- _shared/composition/src/recompose.ts
- Unit tests for recompose.ts

**Out of Scope**:

- decompose.ts (TASK-001-SPEC-005)
- Adapter implementations (SPEC-001 through SPEC-004)

## Files Affected

| File | Action | Description |
|---|---|---|
| recompose/SKILL.md | Create | Claude Code skill definition for /recompose |
| _shared/composition/src/recompose.ts | Create | CLI entry point for composition plan execution |
| _shared/composition/src/recompose.test.ts | Create | Unit tests for CLI entry point |

## Effort

| Tier | Human | AI-Dominant | AI-Assisted |
|---|---|---|---|
| S | 3d | 1d | 1.5d |

## Observations

- [fact] Status: TODO #status
- [fact] Size tier: S -- mirrors decompose.ts structure (~80 LOC) with composition-specific logic (multi-source reading, merge order) #estimation
- [decision] Structural symmetry with /decompose maintained; both use identical pipeline stages with plan_type-specific branching #symmetry

## Relations

- implements [[DESIGN-001-SPEC-005: Skill Architecture]]
- implements [[REQ-002-SPEC-005: Recompose Skill Implementation]]
- part_of [[SPEC-005: Decompose and Recompose Skills]]
- leads_to [[TASK-003-SPEC-005: Implement Plan YAML Adjudication Step]]
