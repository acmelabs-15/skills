---
title: 'TASK-001-SPEC-003: Implement PLAN Adapter Base'
type: task
status: DONE
effort: M
estimate: 1d
permalink: specs/spec-003-plan-adapter/tasks/task-001-spec-003-implement-plan-adapter-base
tags:
- task
- spec-003
- plan-adapter
- implementation
---

# TASK-001-SPEC-003: Implement PLAN Adapter Base

## Design Context

This TASK realizes DESIGN-001-SPEC-003 "Component 1: PlanAdapter Class" -- the distinct PlanAdapter implementing CompositionAdapter with phase section extraction and the unified + remark parse/serialize pipeline.

## Objective

Implement the PlanAdapter class at src/adapters/plan.ts that directly implements CompositionAdapter (not extending BaseMarkdownAdapter) with sourceType="plan", section_delimiter="### ", identifier_pattern matching {phase}.{part-id} format, and all 5 interface methods (parse, extractByRange, applyMutations, reverseMutations, serialize).

## Scope

**In Scope**: PlanAdapter class implementing CompositionAdapter, sourceType="plan", phase section extraction by H3 line range under Workflow Plan, renumber_map and wikilink_map mutations for phase+part-id identifiers, parse/serialize via unified+remark pipeline, unit tests for all 5 methods
**Out of Scope**: Regenerated sections handling (TASK-002), frontmatter mutations (TASK-003), test fixtures (TASK-004), round-trip property test (TASK-005)

## Implementation Notes

The PlanAdapter lives at shared/composition/src/adapters/plan.ts. It implements CompositionAdapter directly rather than extending BaseMarkdownAdapter because regenerative content handling (added in TASK-002) requires custom extraction and reverse-mutation logic. The initial implementation in this task handles the base case (no regenerated_sections, no frontmatter_map) with the core section extraction and mutation logic. TASK-002 and TASK-003 layer on the regenerative and frontmatter capabilities.

Phase section boundaries use "### " as the delimiter. The identifier_pattern matches the {phase}.{part-id} format (e.g., research.1, decisions.2, spec.SPEC-001). The renumber_map keys and values follow this format. Extraction scans from one "### {phase}.{part-id}" heading to the next (exclusive).

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| shared/composition/src/adapters/plan.ts | NEW | PLAN adapter implementation |
| shared/composition/tests/plan-adapter.test.ts | NEW | PLAN adapter unit tests |

## Testing Requirements

- sourceType returns "plan"
- extractByRange extracts correct phase section content from sample PLAN
- applyMutations renumbers phase+part-id identifiers correctly via single-pass replacement
- reverseMutations recovers original content
- parse/serialize round-trip on PLAN markdown produces char-identical output

## Definition of Done

- [x] PlanAdapter class exported from src/adapters/plan.ts
- [x] Implements CompositionAdapter directly (NOT extends BaseMarkdownAdapter)
- [x] sourceType === "plan"
- [x] Phase section extraction under Workflow Plan works correctly with ### delimiter
- [x] renumber_map mutations for {phase}.{part-id} identifiers work via single-pass replacement
- [x] wikilink_map mutations work correctly
- [x] parse/serialize round-trip identity holds
- [x] Unit tests pass for all 5 interface methods

## ADR Compliance

- [ ] Honors ADR-002 D-2: CompositionAdapter 5-method interface
- [ ] Honors ADR-002 D-3: PLAN adapter is distinct implementation (not BaseMarkdownAdapter)
- [ ] Honors ADR-002 D-4: PLAN hash extraction strategy (phase section line ranges)

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1.5d | Core adapter logic with phase parsing and mutation |
| AI-Dominant | 1d | Distinct implementation requires full method bodies |
| AI-Assisted | 1d | Similar patterns to ADR adapter but distinct |

## Observations

- [requirement] PlanAdapter implements CompositionAdapter directly; does NOT extend BaseMarkdownAdapter #distinct-implementation #plan
- [decision] Phase section extraction uses ### delimiter matching {phase}.{part-id} format under Workflow Plan heading #extraction #phase-section
- [technique] Single-pass replacement for renumber_map on phase+part-id identifiers requires disjoint key-value domains per ADR-001 F-8 #single-pass #disjoint

## Relations

- validated_by [[QA-043-SPEC-003: Spec Aggregate Retro-Validation]]
- part_of [[SPEC-003: PLAN Adapter]]
- implements [[REQ-001-SPEC-003: PLAN Adapter Implementation]]
- implements [[DESIGN-001-SPEC-003: PLAN Adapter Architecture]]
- depends_on [[TASK-002-SPEC-001: Define Core Types and Adapter Interface]]
