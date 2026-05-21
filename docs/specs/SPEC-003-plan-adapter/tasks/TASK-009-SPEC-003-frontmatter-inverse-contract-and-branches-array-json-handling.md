---
title: 'TASK-009-SPEC-003: Frontmatter Inverse Contract and Branches Array JSON Handling'
type: task
permalink: specs/spec-003-plan-adapter/tasks/task-009-spec-003-frontmatter-inverse-contract-and-branches-array-json-handling
status: DONE
effort: S
estimate: 0.5d
tags:
- task
- spec-003
- gap-task
- frontmatter
---

# TASK-009-SPEC-003: Frontmatter Inverse Contract and Branches Array JSON Handling

## Design Context

Gap-TASK surfaced during SPEC-003 Wave 2 retro-validation (QA-012-SPEC-003). REQ-004 AC-2 mandates inverse-recovery semantics: "reverseMutations [...] inverse mapping swaps keys and values" and DoD-6 mandates "apply then reverse recovers original." Current implementation explicitly chose forward-only semantics, contradicting the spec. Additionally REQ-004 AC-5 mandates JSON-serialized string parsing for branches[] arrays; current impl writes the raw string verbatim.

## Objective

Align frontmatter handling with REQ-004: implement algebraic inverse (swap keys-and-values in frontmatter_map during reverseMutations) so apply-then-reverse recovers original frontmatter values; implement JSON-parse of branches[] array values so the YAML output is a proper YAML array (not a verbatim string).

## Scope

In Scope: change `frontmatter_map` semantic from field-name->new-value to old-value->new-value; rewrite applyFrontmatterMutations and add reverseFrontmatterMutations; add JSON.parse with fallback for array-valued frontmatter fields; update existing tests to reflect new semantics; add round-trip frontmatter test in plan-frontmatter.test.ts that exercises apply-then-reverse identity; add frontmatter_map to the round-trip fixture spec (round-trip test).
Out of Scope: dispatcher; integrity floor; extractByRange; fixture YAML files (covered by TASK-010).

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| _shared/composition/src/adapters/plan.ts | MODIFY | applyFrontmatterMutations swap-key-value semantics plus reverseFrontmatterMutations plus JSON branches parsing |
| _shared/composition/tests/plan-frontmatter.test.ts | MODIFY | Update existing tests to new semantics plus add inverse-identity round-trip test |
| _shared/composition/tests/plan-round-trip.test.ts | MODIFY | Add frontmatter_map to distributionSpec and assert AC-3 |

## Definition of Done

- [x] frontmatter_map semantic switched from field-name->new-value to old-value->new-value
- [x] applyFrontmatterMutations replaces frontmatter values per the new semantic
- [x] reverseFrontmatterMutations restores original values by inverting the map
- [x] Test: apply(content, fmMap) then reverse(result, fmMap) === content for scalar fields
- [x] branches[] array value is JSON-parsed then YAML-serialized as proper array literal
- [x] Test: branches frontmatter_map value `'["a","b"]'` produces `branches: [a, b]` in YAML
- [x] plan-round-trip.test.ts distributionSpec includes frontmatter_map; SHA-256 identity still holds
- [x] REQ-004 AC-1 through AC-5 all pass


## ADR Compliance

- [x] Honors ADR-002 D-2: MutationSpec frontmatter_map field plus inverse contract


## Observations

- [problem] frontmatter_map current semantics chosen as field-name->new-value; spec assumes old-value->new-value swap inverse #semantic-mismatch
- [problem] Test pinning forward-only semantics at plan-frontmatter.test.ts:78-100 contradicts REQ-004 AC-2 and TASK-003 DoD-6 #test-pins-violation
- [problem] branches array written verbatim from map value string; no JSON parse; no YAML array serialization #req-004-ac-5
- [decision] Spec-aligned semantic requires changing test 5 expectations; intentional contract change captured in this gap-task #intentional-contract-change

## Relations

- part_of [[SPEC-003: PLAN Adapter]]
- caused_by [[QA-012-SPEC-003: PLAN Frontmatter Mutations]]
- extends [[TASK-003-SPEC-003: Implement PLAN Frontmatter Mutations]]
- implements [[REQ-004-SPEC-003: PLAN Frontmatter Mutations]]

- validated_by [[QA-032-SPEC-003: Batched plan.ts TASKs-007-008-009]]
