---
title: 'TASK-004-SPEC-003: Create PLAN Adapter Test Fixtures'
type: task
status: TODO
effort: S
estimate: 0.5d
permalink: specs/spec-003-plan-adapter/tasks/task-004-spec-003-create-plan-adapter-test-fixtures
tags:
- task
- spec-003
- fixtures
- testing
---

# TASK-004-SPEC-003: Create PLAN Adapter Test Fixtures

## Design Context

This TASK provides the test fixtures required by TASK-005 (round-trip property test) and all unit tests in TASK-001 through TASK-003. Fixtures are realistic PLAN note samples with regenerative content.

## Objective

Create a representative PLAN note fixture and corresponding distribution/composition plan YAML fixtures that exercise all PLAN-specific features: phase+part-id sections, Progress Dashboard, Cross-Part Dependency Graph (Mermaid), branches[] frontmatter, inter-note wikilinks, and regenerated_sections.

## Scope

**In Scope**: plan-sample.md fixture (realistic PLAN note with all structural features), plan-distribution-plan.yaml fixture (decompose plan splitting the PLAN), plan-composition-plan.yaml fixture (recompose plan merging sub-plans), expected output files for hash comparison validation
**Out of Scope**: PLAN adapter implementation (TASK-001 through TASK-003), round-trip test logic (TASK-005)

## Implementation Notes

The plan-sample.md fixture must represent a realistic PLAN note with the following structural features:

1. YAML frontmatter with title, type, status, permalink, tags, branches[], complexity_tier
2. H1 matching frontmatter title
3. Scope and context sections
4. Workflow Plan section with multiple ### {phase}.{part-id} subsections (at least 4 phases)
5. Progress Dashboard section (H2) with a markdown table showing phase completion status
6. Cross-Part Dependency Graph section (H2) with a Mermaid diagram
7. Phase Progression section with phase status rows
8. Decision Log section
9. Observations section with category-prefixed entries and inline tags
10. Relations section with typed wikilinks

The distribution plan YAML splits the fixture into 2 destination plans, each receiving a subset of phases. The composition plan YAML merges 2 sub-plan fixtures back into one. Both plans include regenerated_sections: ["Progress Dashboard", "Cross-Part Dependency Graph"] and appropriate renumber_map/wikilink_map entries.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| _shared/composition/tests/fixtures/plan-sample.md | NEW | Representative PLAN note fixture |
| _shared/composition/tests/fixtures/plan-distribution-plan.yaml | NEW | Distribution plan YAML for decompose test |
| _shared/composition/tests/fixtures/plan-composition-plan.yaml | NEW | Composition plan YAML for recompose test |

## Testing Requirements

- Fixture PLAN note passes parse/serialize round-trip (char-identical output)
- Fixture plan YAMLs pass Zod schema validation
- Fixture includes all structural features needed to exercise PLAN-specific adapter behavior
- regenerated_sections in fixture plan YAMLs correctly list the derived-view sections

## Definition of Done

- [ ] plan-sample.md contains realistic PLAN note with all required structural features
- [ ] plan-distribution-plan.yaml passes Zod validation for source_type "plan" distribution variant
- [ ] plan-composition-plan.yaml passes Zod validation for source_type "plan" composition variant
- [ ] Fixtures include regenerated_sections listing "Progress Dashboard" and "Cross-Part Dependency Graph"
- [ ] Fixtures include frontmatter_map with title and permalink mutations
- [ ] Fixtures include branches[] in frontmatter and frontmatter_map

## ADR Compliance

- [ ] Honors ADR-002 D-1: Plan YAML schema shape for "plan" source_type
- [ ] Honors ADR-002 D-4: PLAN extraction strategy exercised by fixtures

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.5d | Authoring realistic fixture content |
| AI-Dominant | 0.5d | Well-specified fixture structure from ADR-002 |
| AI-Assisted | 0.5d | Similar to ADR fixture pattern from SPEC-001 |

## Observations

- [requirement] Fixtures exercise all PLAN-specific features: phase sections, regenerative content, branches[] frontmatter, inter-note wikilinks #fixtures #coverage
- [technique] Distribution plan splits fixture into 2 sub-plans by phase range; composition plan merges them back #distribution #composition
- [constraint] Fixture PLAN note must pass parse/serialize round-trip as a precondition for the round-trip property test #precondition #char-identity

## Relations

- part_of [[SPEC-003: PLAN Adapter]]
- implements [[REQ-005-SPEC-003: PLAN Adapter Round-Trip Property Test]]
- depends_on [[TASK-002-SPEC-003: Implement Regenerated Sections Handler and Integrity Floor]]