---
title: 'TASK-001-SPEC-005: Implement Decompose CLI Entry Point and Skill Structure'
type: task
status: DONE
effort: S
estimate: 1d
permalink: specs/spec-005-decompose-and-recompose-skills/tasks/task-001-spec-005-implement-decompose-cli-entry-point-and-skill-structure
tags:
- task
- decompose
- cli
- skill
- spec-005
---

# TASK-001-SPEC-005: Implement Decompose CLI Entry Point and Skill Structure

## Design Context

- DESIGN-001-SPEC-005: Skill Architecture -- implements Component 1 (/decompose SKILL.md) and Component 3 (decompose.ts CLI entry point)

## Objective

Create the /decompose skill definition (SKILL.md) and the decompose.ts CLI entry point that bridges from an adjudicated distribution plan YAML to the composition library's adapter dispatch pipeline. The SKILL.md instructs the LLM on the cognitive workflow (read source, classify type, author plan, present via AskUserQuestion). The CLI entry point handles the mechanical workflow (load plan, validate via Zod, dispatch to adapter, execute hash-validated writes).

## Definition of Done

- [x] decompose/SKILL.md created with trigger phrases, LLM instructions for plan authoring, AskUserQuestion integration, and execution command
- [x] _shared/composition/src/decompose.ts created with: CLI arg parsing (--plan), YAML loading with FAILSAFE_SCHEMA, Zod validation via planSchema.parseAsync(), adapter dispatch via getAdapter(), per-destination extract/mutate/hash-validate/write pipeline, audit log emission, structured error reporting
- [x] decompose.ts exits with code 0 on success, code 1 on validation error, code 2 on hash mismatch
- [x] Unit test: decompose.ts rejects invalid --plan argument with usage message
- [x] Unit test: decompose.ts rejects plan YAML that fails Zod validation with structured PlanValidationError

## Scope

**In Scope**:

- decompose/SKILL.md
- _shared/composition/src/decompose.ts
- Unit tests for decompose.ts

**Out of Scope**:

- recompose.ts (TASK-002-SPEC-005)
- AskUserQuestion implementation within SKILL.md (the SKILL.md describes it; Claude Code runtime provides it)
- Adapter implementations (SPEC-001 through SPEC-004)

## Files Affected

| File | Action | Description |
|---|---|---|
| decompose/SKILL.md | Create | Claude Code skill definition for /decompose |
| _shared/composition/src/decompose.ts | Create | CLI entry point for distribution plan execution |
| _shared/composition/src/decompose.test.ts | Create | Unit tests for CLI entry point |

## Effort

| Tier | Human | AI-Dominant | AI-Assisted |
|---|---|---|---|
| S | 3d | 1d | 1.5d |

## Observations

- [fact] Status: TODO #status
- [fact] Size tier: S -- single CLI entry point (~80 LOC) plus SKILL.md (~40 lines); narrow scope, single file each #estimation
- [decision] SKILL.md instructs LLM behavior; decompose.ts handles script execution; clean separation #separation

## Relations

- implements [[DESIGN-001-SPEC-005: Skill Architecture]]
- implements [[REQ-001-SPEC-005: Decompose Skill Implementation]]
- part_of [[SPEC-005: Decompose and Recompose Skills]]
- leads_to [[TASK-003-SPEC-005: Implement Plan YAML Adjudication Step]]
- validated_by [[QA-039-SPEC-005: Batched Build Revalidation]]
