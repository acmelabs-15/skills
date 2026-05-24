---
title: 'TASK-015-SPEC-008: Implement spec-Skill Schema Validator Scripts'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-015-spec-008-implement-spec-skill-schema-validator-scripts-1
status: TODO
effort: S
estimate: 1d
tags:
- task
- spec-008
- track-2
- spec-skill
- validator-script
---

# TASK-015-SPEC-008: Implement spec-Skill Schema Validator Scripts

## Design Context

Implements the `skills/spec/scripts/validate-task-schema.ts`, `validate-req-schema.ts`, and `validate-design-schema.ts` rows of [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]] Module Structure.

## Objective

Create three schema-only validator scripts so the spec skill can mechanically check that TASK, REQ, and DESIGN notes parse against their schemas, separate from terminal-status claim checks.

## Scope

In Scope:

- `skills/spec/scripts/validate-task-schema.ts` plus `.test.ts`
- `skills/spec/scripts/validate-req-schema.ts` plus `.test.ts`
- `skills/spec/scripts/validate-design-schema.ts` plus `.test.ts`

Out of Scope:

- Schemas themselves (Track 1)
- Claim validators (validate-task-done.ts, etc.)

## Files Affected

| File | Action | Description |
| --- | --- | --- |
| `skills/spec/scripts/validate-task-schema.ts` | Create | CLI wrapper invoking TaskNoteSchema.parse |
| `skills/spec/scripts/validate-task-schema.test.ts` | Create | Asserts schema parse success and failure paths |
| `skills/spec/scripts/validate-req-schema.ts` | Create | CLI wrapper invoking RequirementNoteSchema.parse |
| `skills/spec/scripts/validate-req-schema.test.ts` | Create | Asserts schema parse success and failure paths |
| `skills/spec/scripts/validate-design-schema.ts` | Create | CLI wrapper invoking DesignNoteSchema.parse |
| `skills/spec/scripts/validate-design-schema.test.ts` | Create | Asserts schema parse success and failure paths |

## Definition of Done

- [ ] Each script reads a note path, validates path-containment, calls the matching schema parser, exits 0 on valid input, exit 2 with Zod issues on invalid input
- [ ] Each script includes the `if (import.meta.main)` CLI guard
- [ ] Colocated tests assert exit 0 on a conformant note and exit 2 with Zod issue payload on malformed input
- [ ] Scripts import only from `shared/composition/src/` plus Node and Bun standard runtime
- [ ] biome lint plus tsc --noEmit pass on the new files

## ADR Compliance

- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-1 per-skill scripts pattern
- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 security boundary path-containment requirement

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 3d | Three near-identical scripts plus tests |
| AI-Dominant | 1d | Trivial schema-parse wrappers; bulk of work is fixture authoring for tests |
| AI-Assisted | 1.5d | Pattern-replication after the first one |

## Observations

- [task] Three schema-only validators serve the spec authoring phase before TASK or REQ reach DoD-complete state #spec-skill
- [decision] Schema-only validation distinct from claim validation; schema failure means malformed structure, claim failure means premature terminal status #separation-of-concerns
- [constraint] Failure surfaces the Zod issue tree to stderr so spec authors see exactly which field is malformed #traceability

## Relations

- implements [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]]
- implements [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
