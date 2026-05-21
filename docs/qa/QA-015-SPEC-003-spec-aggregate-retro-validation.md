---
title: 'QA-015-SPEC-003: SPEC Aggregate Retro Validation'
type: qa
permalink: qa/qa-015-spec-003-spec-aggregate-retro-validation
status: DONE
tags:
- qa
- spec-003
- aggregate
- retro-validation
---

# QA-015-SPEC-003: SPEC Aggregate Retro Validation

## Objective

Aggregate retro-validation across SPEC-003 (PLAN Adapter) covering all 5 TASKs, 5 REQs, and 2 DESIGNs. Validates the Wave 2 integration (commits 5299aea + 2f049fd) against the surgically-reverted Brain notes.

- **Feature**: SPEC-003 PLAN Adapter — all TASKs, REQs, DESIGNs aggregate verdict
- **Scope**: `_shared/composition/src/adapters/plan.ts` + `schemas/distribution/plan.plan.schema.ts` + `schemas/composition/plan.plan.schema.ts` + `schemas/index.ts` + `tests/plan-adapter.test.ts` + `tests/plan-round-trip.test.ts` + `tests/plan-frontmatter.test.ts` + `tests/plan-integrity-floor.test.ts` + `tests/fixtures/plan-sample.md` + `tests/fixtures/plan-distribution.plan.yaml`
- **Acceptance Criteria**: 5 REQ ACs + 2 DESIGN compliance + 5 TASK DoDs + ADR-001 F-8 + ADR-002 D-2/D-3/D-4/D-5

## Approach

- **Test Types**: Aggregate-Roll-Up, Code-Inspection
- **Environment**: Local (Bun 1.3.13)
- **Data Strategy**: Aggregates findings from per-TASK reports QA-010 to QA-014
- **Test File**: per-TASK reports

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 31 | 31 | - |
| Passed | 31 | 31 | [PASS] |
| Failed | 0 | 0 | [FAIL] |
| Skipped | 0 | - | - |
| Assertions | 61 | - | - |
| Execution Time | 86ms | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| TASK-001 Implement PLAN Adapter Base | Aggregate-Roll-Up | [PARTIAL] | See QA-010-SPEC-003; 6/6 unit tests pass; 3 DoD/AC gaps surfaced (dispatcher registration, extractByRange section-awareness, identifier_pattern dead code) |
| TASK-002 Regenerated Sections and Integrity Floor | Aggregate-Roll-Up | [FAIL] | See QA-011-SPEC-003; 10/10 unit tests pass but tests pin wrong semantics; missing source-coverage validateIntegrityFloor; missing max-10 schema refinement; H3 not matched |
| TASK-003 PLAN Frontmatter Mutations | Aggregate-Roll-Up | [FAIL] | See QA-012-SPEC-003; 8/8 unit tests pass but pin forward-only semantics contradicting REQ-004 AC-2 and DoD-6; branches array not JSON-parsed |
| TASK-004 PLAN Adapter Test Fixtures | Aggregate-Roll-Up | [FAIL] | See QA-013-SPEC-003; plan-composition.plan.yaml missing; no frontmatter_map in any fixture |
| TASK-005 PLAN Adapter Round-Trip Property Test | Aggregate-Roll-Up | [PARTIAL] | See QA-014-SPEC-003; 7/7 tests pass and THE PROOF passes; AC-3 frontmatter round-trip not exercised; YAML fixtures not loaded |
| REQ-001 PLAN Adapter Implementation | REQ-AC-Roll-Up | [PARTIAL] | AC-3/AC-4/AC-5 PASS; AC-1 FAIL (private dead fields); AC-2 FAIL (no section-aware extract); AC-6 PARTIAL (extractByRange does not exclude regen) |
| REQ-002 Regenerated Sections Field Handling | REQ-AC-Roll-Up | [FAIL] | AC-1 FAIL (extractByRange ignores regen); AC-2 PARTIAL; AC-3/AC-4/AC-5 PASS; H2/H3 only-H2 implemented |
| REQ-003 Fifty Percent Integrity Floor | REQ-AC-Roll-Up | [FAIL] | AC-1/AC-2/AC-3/AC-4 all FAIL: no max-10 schema refinement, wrong runtime semantics (preservation ratio not section coverage) |
| REQ-004 PLAN Frontmatter Mutations | REQ-AC-Roll-Up | [FAIL] | AC-1/AC-3/AC-4 PASS; AC-2 FAIL (reverse skips frontmatter); AC-5 FAIL (no JSON parse on branches) |
| REQ-005 PLAN Adapter Round-Trip Property Test | REQ-AC-Roll-Up | [PARTIAL] | AC-1/AC-2/AC-4 PASS (THE PROOF holds); AC-3 FAIL (frontmatter_map never exercised in round trip) |
| DESIGN-001 PLAN Adapter Architecture | DESIGN-Compliance | [PARTIAL] | Component 1 PlanAdapter exists and is distinct; section_delimiter and identifier_pattern are dead private fields; dispatcher registration missing |
| DESIGN-002 Regenerated Sections Mechanism | DESIGN-Compliance | [FAIL] | Component 1 MutationSpec field PASS; Component 2 regeneratedSectionsFloor max-10 refinement ABSENT; Component 3 validateIntegrityFloor function ABSENT (different function exists with different semantics) |
| ADR-001 F-8 SHA-256 char-identity hash check BLOCKING | ADR-Compliance | [PASS] | THE PROOF passes for plan-sample.md round-trip; sha256 from hash.ts via Bun.hash |
| ADR-002 D-2 CompositionAdapter interface and MutationSpec | ADR-Compliance | [PARTIAL] | Interface implemented; frontmatter_map inverse contract broken |
| ADR-002 D-3 PLAN distinct implementation and dispatcher registration | ADR-Compliance | [FAIL] | Distinct PASS; dispatcher registration ABSENT |
| ADR-002 D-4 PLAN hash extraction strategy regenerative carve-out | ADR-Compliance | [PARTIAL] | Carve-out works in apply/reverse paths; absent from extractByRange |
| ADR-002 D-5 Regenerated-sections integrity floor 50 percent | ADR-Compliance | [FAIL] | Wrong semantics: preservation-ratio not section-coverage-ratio; no max-10 guard |

### Summary by per-test-file (raw bun test counts)

| File | Tests | Passed | Failed | Assertions |
|------|-------|--------|--------|------------|
| plan-adapter.test.ts | 6 | 6 | 0 | 14 |
| plan-round-trip.test.ts | 7 | 7 | 0 | 16 |
| plan-frontmatter.test.ts | 8 | 8 | 0 | 17 |
| plan-integrity-floor.test.ts | 10 | 10 | 0 | 14 |
| TOTAL | 31 | 31 | 0 | 61 |

## Findings

The implementation passes 31/31 of its own unit tests but the retro-validation against the spec reveals SEVEN concrete gaps that prevent SPEC-003 from being declared DONE. They split into two classes:

**Class A: Missing implementation surface**

1. Dispatcher does not register PlanAdapter (TASK-006 gap-task)
2. extractByRange is not section-aware; identifier_pattern + section_delimiter are dead private fields (TASK-007 gap-task)
3. No source-coverage validateIntegrityFloor; no max-10 schema refinement; H3 headings not matched (TASK-008 gap-task)
4. Frontmatter inverse contract not implemented; branches[] not JSON-parsed (TASK-009 gap-task)
5. plan-composition.plan.yaml fixture absent; no frontmatter_map in fixtures (TASK-010 gap-task)

**Class B: Test/spec misalignment**

The unit tests pin some semantics that contradict the spec — most notably:

- `plan-frontmatter.test.ts:78-100` explicitly pins forward-only frontmatter semantics, contradicting REQ-004 AC-2 and TASK-003 DoD-6.
- `plan-integrity-floor.test.ts` validates the preservation-ratio enforceIntegrityFloor rather than the source-coverage validateIntegrityFloor that the spec actually requires.

This is the more dangerous failure mode. The tests provide false confidence by passing against the wrong contract.

**What works**

THE PROOF (the core REQ-005 deliverable) passes: SHA-256(original stripped) === SHA-256(recomposed stripped) for the plan-sample.md fixture. The regen-section carve-out works for apply/reverse paths. The renumber_map + wikilink_map single-pass replacement with longest-first sorting is correct. The Zod distribution and composition schemas validate plan YAMLs. The plan-sample.md fixture is rich and realistic.

**Aggregate verdict: FAIL**. The PROOF passes but multiple TASK DoDs, REQ ACs, and DESIGN compliance points fail. SPEC root status should remain DRAFT until the 5 gap-TASKs (TASK-006 through TASK-010) execute through the rigid build+QA cycle.

## Observations

- [outcome] Aggregate verdict FAIL: 5 gap-TASKs filed (TASK-006 through TASK-010); 31 of 31 unit tests pass but 7 concrete DoD/AC gaps surfaced #retro-validation-fail
- [outcome] THE PROOF passes SHA-256 identity holds on plan-sample.md round-trip excluding regen sections #proof-passes
- [problem] Class A gaps: dispatcher registration, section-aware extractByRange, source-coverage integrity floor, frontmatter inverse, fixture YAML #implementation-gaps
- [problem] Class B gaps: unit tests pin contracts that contradict spec semantics; false-confidence regressions baked in #test-spec-misalignment
- [insight] Wave 2 integration committed a working but incomplete implementation; gap-TASKs scope is roughly 2 person-days to close to spec
- [decision] Existing enforceIntegrityFloor is useful but should not be removed; spec calls for source-coverage validateIntegrityFloor as a separate layer #defense-in-depth

## Relations

- validates [[SPEC-003: PLAN Adapter]]
- caused_by [[QA-010-SPEC-003: PLAN Adapter Base]]
- caused_by [[QA-011-SPEC-003: Regen Sections and Integrity Floor]]
- caused_by [[QA-012-SPEC-003: PLAN Frontmatter Mutations]]
- caused_by [[QA-013-SPEC-003: PLAN Adapter Test Fixtures]]
- caused_by [[QA-014-SPEC-003: PLAN Adapter Round-Trip Property Test]]
- leads_to [[TASK-006-SPEC-003: Register PlanAdapter in Dispatcher]]
- leads_to [[TASK-007-SPEC-003: Section-Aware extractByRange and Public Adapter Surface]]
- leads_to [[TASK-008-SPEC-003: Source-Coverage Integrity Floor and Max-10 Schema Guard]]
- leads_to [[TASK-009-SPEC-003: Frontmatter Inverse Contract and Branches Array JSON Handling]]
- leads_to [[TASK-010-SPEC-003: Composition Plan YAML and Frontmatter Map in Fixtures]]
- part_of [[SPEC-003: PLAN Adapter]]