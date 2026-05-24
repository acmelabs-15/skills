---
title: 'TASK-003-SPEC-003: Implement PLAN Frontmatter Mutations'
type: task
status: DONE
effort: S
estimate: 0.5d
permalink: specs/spec-003-plan-adapter/tasks/task-003-spec-003-implement-plan-frontmatter-mutations
tags:
- task
- spec-003
- frontmatter
- mutations
---

# TASK-003-SPEC-003: Implement PLAN Frontmatter Mutations

## Design Context

This TASK realizes DESIGN-001-SPEC-003 "Component 3: PLAN Frontmatter Handler" -- the apply and reverse frontmatter mutation logic within the PlanAdapter.

## Objective

Implement frontmatter_map handling in the PlanAdapter: apply frontmatter field replacements during applyMutations, apply the inverse mapping during reverseMutations, handle array-valued fields (branches[]) via JSON-serialized string values, and ensure the frontmatter inverse contract holds (apply then inverse recovers original values).

## Scope

**In Scope**: applyFrontmatterMap and reverseFrontmatterMap internal functions in plan.ts, integration with PlanAdapter.applyMutations and PlanAdapter.reverseMutations, branches[] array handling via JSON-serialized string values, unit tests for frontmatter mutation and reversal
**Out of Scope**: PLAN adapter base methods (TASK-001), regenerated sections (TASK-002), test fixtures (TASK-004), round-trip test (TASK-005)

## Implementation Notes

The frontmatter handler operates on the YAML frontmatter block (between the opening and closing --- delimiters). It parses the block, applies the field replacements from frontmatter_map, and serializes back. For array-valued fields like branches[], the frontmatter_map value is a JSON-serialized string (e.g., '["feature/sub-plan-alpha", "feature/sub-plan-beta"]') that the handler parses and inserts as a YAML array.

The reverse operation swaps keys and values in the frontmatter_map and applies the inverse replacements. The frontmatter inverse contract from ADR-002 D-2: applying frontmatter_map then its inverse (swapping keys and values) recovers the original frontmatter field values.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| _shared/composition/src/adapters/plan.ts | MODIFY | Add frontmatter handler functions, integrate with applyMutations/reverseMutations |
| _shared/composition/tests/plan-frontmatter.test.ts | NEW | Frontmatter mutation and reversal tests |

## Testing Requirements

- applyFrontmatterMap correctly replaces title and permalink fields
- applyFrontmatterMap correctly handles branches[] array via JSON string
- reverseFrontmatterMap recovers original field values
- Empty frontmatter_map results in no mutations
- Undefined frontmatter_map results in no mutations
- Inverse contract: reverseFrontmatterMap(applyFrontmatterMap(content, map), map) === content

## Definition of Done

- [x] applyFrontmatterMap function replaces frontmatter fields per frontmatter_map
- [x] reverseFrontmatterMap function recovers original values via inverse mapping
- [x] branches[] array handling via JSON-serialized string values works correctly
- [x] Integration with PlanAdapter.applyMutations applies frontmatter mutations
- [x] Integration with PlanAdapter.reverseMutations applies inverse frontmatter mutations
- [x] Frontmatter inverse contract holds: apply then reverse recovers original
- [x] Unit tests pass for all frontmatter mutation scenarios

## ADR Compliance

- [ ] Honors ADR-002 D-2: MutationSpec frontmatter_map field and inverse contract

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Frontmatter parsing and array handling |
| AI-Dominant | 0.5d | Well-defined inverse contract |
| AI-Assisted | 0.5d | Pattern from SPEC subtree frontmatter handling |

## Observations

- [requirement] Frontmatter mutations enable PLAN decompose/recompose where destination PLANs have different metadata #frontmatter #plan
- [technique] JSON-serialized string values in frontmatter_map handle array fields (branches[]) that YAML cannot represent as a simple string mapping #json-serialization #array-fields
- [constraint] Frontmatter inverse contract: apply then inverse must recover original values exactly for hash validation to pass #inverse-contract #deterministic

## Relations

- validated_by [[QA-043-SPEC-003: Spec Aggregate Retro-Validation]]
- part_of [[SPEC-003: PLAN Adapter]]
- implements [[REQ-004-SPEC-003: PLAN Frontmatter Mutations]]
- implements [[DESIGN-001-SPEC-003: PLAN Adapter Architecture]]
- depends_on [[TASK-001-SPEC-003: Implement PLAN Adapter Base]]
