---
title: 'TASK-003-SPEC-005: Implement Plan YAML Adjudication Step'
type: task
status: TODO
effort: S
estimate: 0.5d
permalink: specs/spec-005-decompose-and-recompose-skills/tasks/task-003-spec-005-implement-plan-yaml-adjudication-step
tags:
- task
- adjudication
- ask-user-question
- plan-yaml
- spec-005
---

# TASK-003-SPEC-005: Implement Plan YAML Adjudication Step

## Design Context

- DESIGN-002-SPEC-005: Plan YAML Lifecycle -- implements Component 2 (User Adjudication Phase)

## Objective

Implement the AskUserQuestion integration within the /decompose and /recompose SKILL.md files. This includes the human-readable plan summary formatting, the three-option presentation (approve, reject with feedback, abort), and the refinement loop mechanism that re-invokes LLM plan authoring on rejection. Also implement the rejected plan file renaming convention.

## Definition of Done

- [ ] Both SKILL.md files include AskUserQuestion section with approve/reject-with-feedback/abort options
- [ ] Plan summary formatter produces human-readable markdown showing source paths, destination paths, renumber map, wikilink map, and type-specific fields
- [ ] Rejection handler renames current plan to {name}-rejected-{N}.yaml and passes feedback to LLM re-authoring step
- [ ] Abort handler exits cleanly with no file I/O
- [ ] Integration test: fixture plan presented via summary formatter produces expected markdown output

## Scope

**In Scope**:

- AskUserQuestion integration in decompose/SKILL.md and recompose/SKILL.md
- Plan summary formatter (can be a shared utility or inline in SKILL.md instructions)
- Rejected plan file rename logic

**Out of Scope**:

- AskUserQuestion runtime implementation (provided by Claude Code)
- CLI entry point modifications (TASK-001, TASK-002 handle those)

## Files Affected

| File | Action | Description |
|---|---|---|
| decompose/SKILL.md | Modify | Add AskUserQuestion adjudication section |
| recompose/SKILL.md | Modify | Add AskUserQuestion adjudication section |

## Effort

| Tier | Human | AI-Dominant | AI-Assisted |
|---|---|---|---|
| S | 2d | 0.5d | 1d |

## Observations

- [fact] Status: TODO #status
- [fact] Size tier: S -- SKILL.md instruction additions plus plan summary formatting logic; no new TypeScript files #estimation
- [decision] Rejected plans renamed with -rejected-{N} suffix per DESIGN-002 lifecycle pattern #rejection-handling

## Relations

- implements [[DESIGN-002-SPEC-005: Plan YAML Lifecycle]]
- implements [[REQ-003-SPEC-005: Plan YAML Adjudication via AskUserQuestion]]
- part_of [[SPEC-005: Decompose and Recompose Skills]]
- depends_on [[TASK-001-SPEC-005: Implement Decompose CLI Entry Point and Skill Structure]]
- depends_on [[TASK-002-SPEC-005: Implement Recompose CLI Entry Point and Skill Structure]]
