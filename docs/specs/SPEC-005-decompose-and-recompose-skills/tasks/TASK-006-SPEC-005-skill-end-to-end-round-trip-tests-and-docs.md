---
title: 'TASK-006-SPEC-005: Skill End-to-End Round-Trip Tests and Docs'
type: task
status: DONE
effort: M
estimate: 2d
permalink: specs/spec-005-decompose-and-recompose-skills/tasks/task-006-spec-005-skill-end-to-end-round-trip-tests-and-docs
tags:
- task
- round-trip
- testing
- end-to-end
- spec-005
---

# TASK-006-SPEC-005: Skill End-to-End Round-Trip Tests and Docs

## Design Context

- DESIGN-001-SPEC-005: Skill Architecture -- validates the end-to-end pipeline through CLI entry points
- DESIGN-002-SPEC-005: Plan YAML Lifecycle -- validates the plan loading and Zod validation path
- DESIGN-003-SPEC-005: Adapter Registry and Dispatcher -- validates adapter dispatch in the round-trip flow

## Objective

Create end-to-end round-trip tests that exercise /decompose followed by /recompose through the CLI entry points (decompose.ts and recompose.ts) using fixture plan YAMLs and fixture ADR notes. Validate that SHA-256(original) === SHA-256(recomposed) at the skill orchestration level. Also create README documentation for the /decompose and /recompose skills covering usage, plan format, and error handling.

## Definition of Done

- [x] Fixture ADR note created at _shared/composition/tests/fixtures/adr-round-trip.md
- [x] Fixture distribution plan YAML created at _shared/composition/tests/fixtures/adr-decompose-plan.yaml
- [x] Fixture composition plan YAML created (inverse of distribution plan) at _shared/composition/tests/fixtures/adr-recompose-plan.yaml
- [x] End-to-end test: decompose.ts with distribution plan produces N destination files
- [x] End-to-end test: recompose.ts with composition plan on decomposed files produces file SHA-256 identical to original fixture
- [x] End-to-end test: decompose.ts with invalid plan exits code 1 with PlanValidationError
- [x] End-to-end test: decompose.ts with non-injective renumber_map exits code 1 with injectivity error
- [x] README.md updated with /decompose and /recompose usage documentation


## Scope

**In Scope**:

- Fixture files (ADR note, distribution plan YAML, composition plan YAML)
- End-to-end test file
- README.md documentation updates

**Out of Scope**:

- Adapter-level unit tests (covered in SPEC-001)
- LLM integration tests (manual verification via Claude Code)

## Files Affected

| File | Action | Description |
|---|---|---|
| _shared/composition/tests/fixtures/adr-round-trip.md | Create | Fixture ADR note for round-trip test |
| _shared/composition/tests/fixtures/adr-decompose-plan.yaml | Create | Distribution plan fixture |
| _shared/composition/tests/fixtures/adr-recompose-plan.yaml | Create | Composition plan fixture (inverse) |
| _shared/composition/tests/round-trip.test.ts | Create | End-to-end round-trip tests |
| README.md | Modify | Add /decompose and /recompose usage docs |

## Effort

| Tier | Human | AI-Dominant | AI-Assisted |
|---|---|---|---|
| M | 5d | 2d | 3d |

## Observations

- [fact] Status: TODO #status
- [fact] Size tier: M -- fixture creation plus end-to-end test plus documentation; multiple files across test and docs directories #estimation
- [decision] Fixture-based testing ensures deterministic execution without LLM dependency #fixtures #deterministic
- [constraint] Round-trip identity must hold at skill level, not just adapter level, to validate full pipeline #end-to-end

## Relations

- implements [[REQ-006-SPEC-005: Skill Round-Trip Tests]]
- implements [[DESIGN-001-SPEC-005: Skill Architecture]]
- part_of [[SPEC-005: Decompose and Recompose Skills]]
- depends_on [[TASK-001-SPEC-005: Implement Decompose CLI Entry Point and Skill Structure]]
- depends_on [[TASK-002-SPEC-005: Implement Recompose CLI Entry Point and Skill Structure]]
- depends_on [[TASK-004-SPEC-005: Implement Adapter Dispatcher with Incremental Registration]]
