---
title: 'TASK-006-SPEC-004: SPEC Subtree Test Fixtures'
type: task
status: DONE
effort: S
estimate: 1d
permalink: specs/spec-004-spec-subtree-adapter/tasks/task-006-spec-004-spec-subtree-test-fixtures
tags:
- task
- spec-004
- fixtures
- test-data
---

# TASK-006-SPEC-004: SPEC Subtree Test Fixtures

## Design Context

- DESIGN-001-SPEC-004 SPEC Subtree Adapter Architecture: test fixtures exercise the adapter's recursive multi-file operations

## Objective

Create realistic test fixtures for the SPEC subtree adapter round-trip property test. The fixtures include a sample SPEC subtree directory with a SPEC root note, REQ child, DESIGN child, and TASK child -- all with correct Brain knowledge-graph frontmatter, observations, relations, and wikilinks. Also create corresponding distribution and composition plan YAML fixtures that rename the SPEC from SPEC-001 to SPEC-003, renumber all entity identifiers, rewrite filenames, and update frontmatter.

## Scope

**In Scope**:

- Fixture SPEC root note (SPEC-001-test-project.md) with frontmatter, Phases section, Acceptance Criteria, wikilinks to children
- Fixture REQ note (REQ-001-SPEC-001-test-requirement.md) with EARS format, acceptance criteria, observations, relations
- Fixture DESIGN note (DESIGN-001-SPEC-001-test-design.md) with component architecture, interfaces, observations, relations
- Fixture TASK note (TASK-001-SPEC-001-test-task.md) with DoD checkboxes, effort, observations, relations
- Distribution plan YAML (spec-distribution.plan.yaml) with subtree_manifest renaming SPEC-001 to SPEC-003
- Composition plan YAML (spec-composition.plan.yaml) as the inverse of the distribution plan

**Out of Scope**:

- Test implementation code (TASK-007)
- Non-SPEC fixtures (ADR, ANALYSIS, SESSION fixtures covered by SPEC-001 and SPEC-002)

## Implementation Notes

Fixtures must be realistic Brain knowledge-graph notes following CONVENTIONS (16 canonical types, observation [category] prefix + tags, final-two-sections invariant, colon in title). The SPEC root's Phases section contains wikilinks to the child notes. All intra-spec wikilinks use the colon-title form (e.g., "REQ-001-SPEC-001: Test Requirement"). The plan YAML includes subtree_manifest with root and children entries, each with renumber_map, wikilink_map, frontmatter_map, and filename_rewrite_map.

## Files Affected

| File | Action | Purpose |
|---|---|---|
| _shared/composition/tests/fixtures/spec-subtree/SPEC-001-test-project.md | NEW | SPEC root fixture |
| _shared/composition/tests/fixtures/spec-subtree/requirements/REQ-001-SPEC-001-test-requirement.md | NEW | REQ child fixture |
| _shared/composition/tests/fixtures/spec-subtree/design/DESIGN-001-SPEC-001-test-design.md | NEW | DESIGN child fixture |
| _shared/composition/tests/fixtures/spec-subtree/tasks/TASK-001-SPEC-001-test-task.md | NEW | TASK child fixture |
| _shared/composition/tests/fixtures/spec-distribution.plan.yaml | NEW | Distribution plan fixture |
| _shared/composition/tests/fixtures/spec-composition.plan.yaml | NEW | Composition plan fixture |

## Definition of Done

- [ ] SPEC root fixture follows CONVENTIONS Section 4.7 (Context, Scope, Phases, Effort Summary, Observations, Relations)
- [ ] REQ fixture follows CONVENTIONS Section 4.9 (EARS format with Given/When/Then AC)
- [ ] DESIGN fixture follows CONVENTIONS Section 4.8 (Component Architecture, interfaces)
- [ ] TASK fixture follows CONVENTIONS Section 4.8 (DoD checkboxes, effort/estimate frontmatter, Files Affected)
- [ ] Distribution plan YAML validates against specSubtreeManifestSchema
- [ ] Composition plan YAML is the mathematical inverse of the distribution plan
- [ ] All fixtures pass biome lint

## Effort

| Tier | Human | AI-Dominant | AI-Assisted |
|---|---|---|---|
| S | 2d | 1d | 1.5d |

## Observations

- [fact] Status: DONE -- drift closed by gap-TASK 010; validated by QA-027 aggregate #status
- [fact] Size tier: S -- fixture creation with 4 markdown files and 2 YAML files; low complexity but attention to CONVENTIONS compliance #estimation
- [constraint] Fixtures must follow full Brain knowledge-graph CONVENTIONS to be realistic test data #conventions #compliance

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- implements [[REQ-006-SPEC-004: SPEC Subtree Adapter Round-Trip Property Test]]
- depends_on [[TASK-005-SPEC-004: Implement specSubtreeManifestSchema Zod Validator]]
- closed_by [[TASK-010-SPEC-004: Add DESIGN Fixture and Composition Plan YAML]]
- validated_by [[QA-027-SPEC-004: Spec-Aggregate Retro-Validation]]