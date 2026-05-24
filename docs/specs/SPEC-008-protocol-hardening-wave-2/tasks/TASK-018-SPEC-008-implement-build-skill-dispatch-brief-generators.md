---
title: 'TASK-018-SPEC-008: Implement build-Skill Dispatch-Brief Generators'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-018-spec-008-implement-build-skill-dispatch-brief-generators-2
status: TODO
effort: M
estimate: 2d
tags:
- task
- spec-008
- track-2
- build-skill
- dispatch-brief
---

# TASK-018-SPEC-008: Implement build-Skill Dispatch-Brief Generators

## Design Context

Implements the `skills/build/scripts/dispatch-implementer.ts` and `skills/build/scripts/dispatch-qa.ts` rows of [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]] Module Structure.

## Objective

Create two programmatic dispatch-brief generator scripts so the build skill's per-TASK implementer and QA dispatches receive their brief markdown from a single source of truth that imports cross-cutting constants such as the valid relation-type allowlist from `shared/composition/src/schemas/common.ts`.

## Scope

In Scope:

- `skills/build/scripts/dispatch-implementer.ts` plus `.test.ts`
- `skills/build/scripts/dispatch-qa.ts` plus `.test.ts`

Out of Scope:

- Adding new exports to `shared/composition/src/schemas/common.ts` (separate Track 1 work)
- Decisions / research / review brief generators (TASK-019, TASK-020)

## Files Affected

| File | Action | Description |
| --- | --- | --- |
| `skills/build/scripts/dispatch-implementer.ts` | Create | Implementer brief generator; emits markdown via stdout |
| `skills/build/scripts/dispatch-implementer.test.ts` | Create | Asserts determinism plus structural presence of mandates |
| `skills/build/scripts/dispatch-qa.ts` | Create | QA brief generator; imports validRelationTypes from common.ts |
| `skills/build/scripts/dispatch-qa.test.ts` | Create | Asserts the emitted brief includes the full 11-verb relation allowlist verbatim |

## Definition of Done

- [x] dispatch-implementer accepts TASK ref plus rendered TASK content as args, emits full implementer brief to stdout
- [x] dispatch-qa accepts TASK ref plus REQ refs as args, emits full QA brief including the 11 valid relation verbs imported from `shared/composition/src/schemas/common.ts`
- [x] Both scripts include the `if (import.meta.main)` CLI guard
- [x] Colocated test asserts determinism (same args yield byte-identical stdout)
- [x] Colocated test asserts the dispatch-qa brief contains every entry in validRelationTypes verbatim
- [x] Scripts import only from `shared/composition/src/` plus Node and Bun standard runtime
- [x] biome lint plus tsc --noEmit pass on the new files

## ADR Compliance

- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-4 programmatic per-skill brief-generator pattern
- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-4 brief-generator trust-boundary section (no path resolution against external input)

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 5d | Two brief generators plus determinism plus mandate-content authoring |
| AI-Dominant | 2d | Template-literal authoring dominates work |
| AI-Assisted | 3d | Brief content drafting plus determinism testing |

## Observations

- [task] Two brief generators replace inline SKILL.md prose with programmatic emission importing cross-cutting constants #drift-prevention
- [decision] dispatch-qa imports validRelationTypes from common.ts so the brief always reflects the schema's current allowlist #single-source-of-truth #audit-c
- [constraint] Determinism mandatory same args yield byte-identical stdout enabling diff-based brief reviews #determinism

## Relations

- implements [[REQ-005-SPEC-008: Per-Skill Dispatch-Brief Generator Scripts]]
- implements [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
