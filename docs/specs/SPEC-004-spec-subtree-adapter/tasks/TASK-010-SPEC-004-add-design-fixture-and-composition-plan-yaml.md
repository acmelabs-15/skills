---
title: 'TASK-010-SPEC-004: Add DESIGN Fixture and Composition Plan YAML'
type: task
permalink: specs/spec-004-spec-subtree-adapter/tasks/task-010-spec-004-add-design-fixture-and-composition-plan-yaml
status: DONE
effort: S
estimate: 0.5d
tags:
- task
- spec-004
- gap-task
- fixtures
---

# TASK-010-SPEC-004: Add DESIGN Fixture and Composition Plan YAML

## Design Context

Gap from QA-025-SPEC-004: fixture has 2 REQs + 1 TASK + 0 DESIGN but DoD + REQ-006 AC1 require 1 REQ + 1 DESIGN + 1 TASK minimum. No composition plan YAML exists either.

## Objective

Add `tests/fixtures/spec-subtree/design/DESIGN-001-SPEC-001-adapter-architecture.md` per CONVENTIONS Section 4.8 + `tests/fixtures/spec-subtree-composition.plan.yaml` as the mathematical inverse of the existing distribution YAML. Update `spec-subtree-round-trip.test.ts` to include the DESIGN child in its manifest so the PROOF exercises a DESIGN-type child.

## Files Affected

| File | Action | Purpose |
|---|---|---|
| tests/fixtures/spec-subtree/design/DESIGN-001-SPEC-001-adapter-architecture.md | NEW | DESIGN child fixture |
| tests/fixtures/spec-subtree-composition.plan.yaml | NEW | Composition plan (inverse of distribution) |
| tests/spec-subtree-round-trip.test.ts | MODIFY | Add DESIGN to manifest + update wikilink_map |

## Definition of Done

- [x] DESIGN fixture present with Component Architecture, interfaces, Observations, Relations
- [x] Composition plan YAML inversion of distribution plan validated by `specSubtreeCompositionPlanSchema`
- [x] Round-trip test includes DESIGN child; per-file SHA-256 PROOF passes for all 5 files (root + 2 REQ + 1 DESIGN + 1 TASK)
- [x] biome check clean on fixtures
- [x] All SPEC-004 tests pass

## Observations

- [problem] No DESIGN fixture; child-type distribution wrong (2 REQs + 1 TASK instead of 1 REQ + 1 DESIGN + 1 TASK) #dod-gap #req-006-ac1
- [problem] No composition plan YAML; mathematical-inverse pair incomplete #dod-gap

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- caused_by [[QA-025-SPEC-004: SPEC Subtree Test Fixtures]]
- extends [[TASK-006-SPEC-004: SPEC Subtree Test Fixtures]]

- validated_by [[QA-035-SPEC-004: Task 010 Design Fixture Revalidation]]