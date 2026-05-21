---
title: 'QA-010-SPEC-003: PLAN Adapter Base'
type: qa
permalink: qa/qa-010-spec-003-plan-adapter-base
status: DONE
tags:
- qa
- spec-003
- plan-adapter
- retro-validation
---

# QA-010-SPEC-003: PLAN Adapter Base

## Objective

Retro-validate TASK-001-SPEC-003 (Implement PLAN Adapter Base) against its DoD, REQ-001-SPEC-003 acceptance criteria, and DESIGN-001-SPEC-003 component design. The code under retro-validation is on `main` (Wave 2 integration commit `5299aea` + PR #6 commit `2f049fd`); Brain note status pre-revert; checkboxes verified against current code with no prior-state trust.

- **Feature**: PlanAdapter base class with CompositionAdapter interface (TASK-001-SPEC-003)
- **Scope**: `_shared/composition/src/adapters/plan.ts` (lines 1-273) and `_shared/composition/tests/plan-adapter.test.ts` (6 tests, 14 expects)
- **Acceptance Criteria**: REQ-001-SPEC-003 AC-1 through AC-6; TASK-001 DoD 1-8; ADR Compliance ADR-002 D-2/D-3/D-4

## Approach

- **Test Types**: Retro-Unit, Code-Inspection
- **Environment**: Local (Bun 1.3.13)
- **Data Strategy**: Inline fixture in plan-adapter.test.ts plus code inspection against REQ AC and TASK DoD
- **Test File**: `tests/plan-adapter.test.ts`

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 6 | 6 | - |
| Passed | 6 | 6 | [PASS] |
| Failed | 0 | 0 | [FAIL] |
| Skipped | 0 | - | - |
| Assertions | 14 | - | - |
| Execution Time | 58ms | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| sourceType is plan | Retro-Unit | [PASS] | plan.ts:52 |
| parse to serialize is idempotent re-parse produces same output | Retro-Unit | [PASS] | plan.ts:66-72 via unified+remark |
| extractByRange slices 1-indexed inclusive line range | Retro-Unit | [PASS] | plan.ts:74-79; line-range only, NOT section-aware |
| applyMutations skips content inside regenerated_sections | Retro-Unit | [PASS] | plan.ts:81-83 + transformExcludingRegenerated |
| applyMutations with no regenerated_sections behaves like a standard rewrite | Retro-Unit | [PASS] | plan.ts:140-141 fast path |
| reverseMutations restores non-regenerated content exactly | Retro-Unit | [PASS] | plan.ts:85-89 inverse map |
| TASK-001 DoD 1 PlanAdapter class exported from src/adapters/plan.ts | Code-Inspection | [PASS] | plan.ts:51 export class PlanAdapter |
| TASK-001 DoD 2 Implements CompositionAdapter directly NOT extends BaseMarkdownAdapter | Code-Inspection | [PASS] | plan.ts:51 implements CompositionAdapter |
| TASK-001 DoD 3 sourceType equals plan | Code-Inspection | [PASS] | plan.ts:52 readonly sourceType = plan |
| TASK-001 DoD 4 Phase section extraction under Workflow Plan with hash-hash-hash delimiter works | Code-Inspection | [FAIL] | plan.ts:74-79 extractByRange uses raw 1-indexed line range; no section-aware extraction; no Workflow Plan boundary detection; no section_delimiter field exposed |
| TASK-001 DoD 5 renumber_map mutations for phase.part-id identifiers via single-pass replacement | Code-Inspection | [PASS] | plan.ts:178-186 applySinglePassReplace; longest-first key sort prevents prefix collision |
| TASK-001 DoD 6 wikilink_map mutations work correctly | Code-Inspection | [PASS] | plan.ts:164 same applySinglePassReplace mechanism |
| TASK-001 DoD 7 parse-serialize round-trip identity holds | Code-Inspection | [PASS] | plan-adapter.test.ts:59-65 |
| TASK-001 DoD 8 Unit tests pass for all 5 interface methods | Code-Inspection | [PASS] | 6 tests cover sourceType + parse + serialize + extractByRange + applyMutations + reverseMutations |
| ADR Compliance ADR-002 D-2 CompositionAdapter 5-method interface | Code-Inspection | [PASS] | plan.ts:51-72 all 5 methods present |
| ADR Compliance ADR-002 D-3 PLAN adapter is distinct implementation | Code-Inspection | [PASS] | plan.ts:51 NOT extends BaseMarkdownAdapter |
| ADR Compliance ADR-002 D-3 PLAN registers as source_type plan in dispatcher | Code-Inspection | [FAIL] | dispatcher.ts:6-10 registry only has adr+analysis+session; no plan entry; PlanAdapter not importable through getAdapter |
| ADR Compliance ADR-002 D-4 PLAN hash extraction strategy phase section line ranges | Code-Inspection | [PARTIAL] | line range extraction works but no section-boundary helper; caller must supply correct line range manually |
| REQ-001 AC-1 sourceType plan AND section_delimiter hash-hash-hash AND identifier_pattern phase.part-id | Code-Inspection | [FAIL] | section_delimiter and identifier_pattern are private fields (plan.ts:59-60) not exposed on interface; identifier_pattern regex /(w+).(w[w-]*)/ never used in any method |
| REQ-001 AC-2 extractByRange inclusive-of-own-heading exclusive-of-next-heading | Code-Inspection | [FAIL] | extractByRange takes a numeric LineRange and slices lines; no heading-aware boundary semantics; caller must compute the boundaries |
| REQ-001 AC-3 applyMutations renumbers phase.part-id in single pass | Code-Inspection | [PASS] | single-pass via regex alternation plan.ts:178-186 |
| REQ-001 AC-4 reverseMutations recovers original | Code-Inspection | [PASS] | invertMap on renumber and wikilink plan.ts:160-161 |
| REQ-001 AC-5 parse then serialize equals input round-trip identity | Code-Inspection | [PASS] | plan-adapter.test.ts:59-65 |
| REQ-001 AC-6 regenerated_sections SKIPPED from extraction and hash-comparison scope | Code-Inspection | [PARTIAL] | applyMutations SKIPS the regenerated spans (plan.ts:140-156); extractByRange does NOT skip regenerated content within its returned line range |

## Findings

The implementation satisfies the unit-test contract (6 tests pass) and the broad architectural intent (PlanAdapter is distinct, not extending BaseMarkdownAdapter; renumber/wikilink/regen-skip work). However, three concrete gaps remain that block DoD/REQ AC PASS:

1. **Dispatcher not registered**. `src/core/dispatcher.ts:6-10` does not include a `plan` entry. `getAdapter("plan")` throws. DESIGN-001 Component 1 Responsibilities lists "Registers as source_type plan in the adapter dispatcher" — not done. This is the ADR-002 D-3 integration point.

2. **Section-aware extractByRange not implemented**. REQ-001 AC-2 specifies "inclusive-of-own-heading, exclusive-of-next-heading" boundary semantics — current `extractByRange` is a raw line-slice (`lines.slice(start-1, end)`). The plan-adapter.test.ts test computes the line indices manually before calling. The {phase}.{part-id} `identifier_pattern` regex declared on line 60 is dead code.

3. **section_delimiter and identifier_pattern fields are private**. REQ-001 AC-1 requires `section_delimiter === "### "` and an `identifier_pattern matching {phase}.{part-id}` as observable properties of the adapter. Both exist as private readonly fields (plan.ts:59-60) and are not exposed on the public interface or used inside any method.

The renumber_map / wikilink_map / regenerated_sections core behaviour is correct and the unit tests do meaningfully exercise it. The round-trip property (REQ-005) covered in QA-014 confirms the practical correctness of the apply/reverse cycle, so the underlying transform is sound.

## Observations

- [outcome] 6/6 plan-adapter unit tests pass but 3 DoD/AC checkboxes fail on retro-inspection #test-pass-implementation-gap
- [problem] Dispatcher registry missing plan entry; getAdapter plan throws #integration-gap #dispatcher
- [problem] extractByRange has no section-boundary semantics; identifier_pattern regex is dead code #req-001-ac-2 #req-001-ac-1
- [insight] Tests pass because they pre-compute line indices manually; the production caller would need identical pre-compute logic #test-coverage-gap

## Relations

- relates_to [[TASK-001-SPEC-003: Implement PLAN Adapter Base]]
- relates_to [[REQ-001-SPEC-003: PLAN Adapter Implementation]]
- relates_to [[DESIGN-001-SPEC-003: PLAN Adapter Architecture]]
- part_of [[SPEC-003: PLAN Adapter]]