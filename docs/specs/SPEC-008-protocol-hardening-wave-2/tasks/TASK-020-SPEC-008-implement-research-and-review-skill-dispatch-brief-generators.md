---
title: 'TASK-020-SPEC-008: Implement research-Skill and review-Skill Dispatch-Brief
  Generators'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-020-spec-008-implement-research-and-review-skill-dispatch-brief-generators-1
status: TODO
effort: M
estimate: 2d
tags:
- task
- spec-008
- track-2
- research-skill
- review-skill
- dispatch-brief
---

# TASK-020-SPEC-008: Implement research-Skill and review-Skill Dispatch-Brief Generators

## Design Context

Implements the `skills/research/scripts/dispatch-analyst.ts` and `skills/review/scripts/dispatch-reviewer.ts` rows of [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]] Module Structure.

## Objective

Create the analyst and reviewer dispatch-brief generator scripts so the research skill's per-requirement analyst dispatches and the review skill's multi-axis reviewer dispatches receive briefs that import cross-cutting constants and embed the no-open-questions, rubric-as-floor, and reviewer-asymmetry mandates programmatically.

## Scope

In Scope:

- `skills/research/scripts/dispatch-analyst.ts` plus `.test.ts`
- `skills/review/scripts/dispatch-reviewer.ts` plus `.test.ts`

Out of Scope:

- Build / decisions brief generators (TASK-018, TASK-019)

## Files Affected

| File | Action | Description |
| --- | --- | --- |
| `skills/research/scripts/dispatch-analyst.ts` | Create | Analyst brief generator; embeds no-open-questions and rubric-as-floor mandates |
| `skills/research/scripts/dispatch-analyst.test.ts` | Create | Asserts mandate presence and determinism |
| `skills/review/scripts/dispatch-reviewer.ts` | Create | Reviewer brief generator; emits axis-selection logic per PR type |
| `skills/review/scripts/dispatch-reviewer.test.ts` | Create | Asserts axis-selection branching and reviewer-asymmetry mandate presence |

## Definition of Done

- [ ] dispatch-analyst accepts a per-requirement scope, emits analyst brief embedding the no-open-questions, rubric-as-floor, and analysis-surfaces-options mandates as inline prose
- [ ] dispatch-reviewer accepts a PR-type classification (CODE, DOCS, CONFIG, TEST), emits reviewer brief listing the relevant review axes for that PR type plus the reviewer-asymmetry mandate
- [ ] Both scripts include the `if (import.meta.main)` CLI guard
- [ ] Colocated tests assert determinism and structural-mandate presence
- [ ] dispatch-reviewer test asserts the emitted axis list matches the PR-type-to-axes mapping for each of the four PR types
- [ ] Scripts import only from `shared/composition/src/` plus Node and Bun standard runtime
- [ ] biome lint plus tsc --noEmit pass on the new files

## ADR Compliance

- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-4 programmatic per-skill brief-generator pattern
- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-4 brief-generator trust-boundary section

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 5d | Two generators plus per-PR-type axis-mapping table |
| AI-Dominant | 2d | Pattern replication; bulk of work is mandate-content authoring |
| AI-Assisted | 3d | Axis-mapping testing |

## Observations

- [task] Two brief generators close the dispatch-brief layer for research analyst and review reviewer agent dispatches #research-skill #review-skill
- [decision] dispatch-reviewer encodes the PR-type-to-axes mapping CODE-plus-DOCS-plus-CONFIG-plus-TEST as a switch so adding a new axis or PR type is a single-place change #single-source-of-truth
- [constraint] dispatch-analyst mandates inlined as prose because they are principle-level not constant-level #prose-mandates

## Relations

- implements [[REQ-005-SPEC-008: Per-Skill Dispatch-Brief Generator Scripts]]
- implements [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]