---
title: 'QA-012-SPEC-003: PLAN Frontmatter Mutations'
type: qa
permalink: qa/qa-012-spec-003-plan-frontmatter-mutations
status: DONE
tags:
- qa
- spec-003
- frontmatter
- retro-validation
---

# QA-012-SPEC-003: PLAN Frontmatter Mutations

## Objective

Retro-validate TASK-003-SPEC-003 against REQ-004 (frontmatter mutations) and DESIGN-001 Component 3.

- **Feature**: applyFrontmatterMutations + reverseFrontmatterMutations + branches[] array handling (TASK-003-SPEC-003)
- **Scope**: `src/adapters/plan.ts` lines 159-217 (transformSegment + applyFrontmatterMutations); `tests/plan-frontmatter.test.ts` (8 tests, 17 expects)
- **Acceptance Criteria**: REQ-004 AC-1 to AC-5; TASK-003 DoD 1-7; ADR-002 D-2

## Approach

- **Test Types**: Retro-Unit, Code-Inspection
- **Environment**: Local (Bun 1.3.13)
- **Data Strategy**: Existing unit suite + ADR-002 D-2 contract inspection
- **Test File**: `tests/plan-frontmatter.test.ts`

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 8 | 8 | - |
| Passed | 8 | 8 | [PASS] |
| Failed | 0 | 0 | [FAIL] |
| Skipped | 0 | - | - |
| Assertions | 17 | - | - |
| Execution Time | 40ms | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| applyMutations rewrites title field via frontmatter_map | Retro-Unit | [PASS] | plan.ts:202-217 |
| applyMutations rewrites permalink field | Retro-Unit | [PASS] | scalar replacement |
| applyMutations rewrites branches single-line array literal | Retro-Unit | [PASS] | scalar string written verbatim — no JSON parse |
| applyMutations rewrites multiple frontmatter fields at once | Retro-Unit | [PASS] | iterative replacement |
| reverseMutations leaves forward-applied frontmatter fields intact field-name semantics | Retro-Unit | [PASS] | pins forward-only semantics |
| reverseMutations with explicit inverse frontmatter_map restores original values | Retro-Unit | [PASS] | inverse spec supplied by caller |
| frontmatter mutations only touch frontmatter not body | Retro-Unit | [PASS] | regex anchored to `^---\\n...---` block |
| frontmatter mutations skipped inside regenerated section that contains body-level frontmatter-like text | Retro-Unit | [PASS] | regen span exclusion intact |
| REQ-004 AC-1 frontmatter_map title equals new title AND permalink equals new permalink | Code-Inspection | [PASS] | plan.ts:202-217 |
| REQ-004 AC-2 reverseMutations recovers original frontmatter field values inverse mapping | Code-Inspection | [FAIL] | plan.ts:166-172 explicitly skips frontmatter on reverse; forward-only semantics; test 5 pins this contradiction with spec |
| REQ-004 AC-3 empty frontmatter_map results in no mutations | Code-Inspection | [PASS] | plan.ts:172 length check guard |
| REQ-004 AC-4 undefined frontmatter_map results in no mutations | Code-Inspection | [PASS] | guard on truthy fmMap |
| REQ-004 AC-5 branches array as JSON string value parsed and inserted as YAML array | Code-Inspection | [FAIL] | plan.ts:208-215 writes the value string verbatim; no JSON parse; no YAML array reserialization; test uses YAML literal `[feat/...]` not JSON |
| TASK-003 DoD 1 applyFrontmatterMap replaces fields per map | Code-Inspection | [PASS] | applyFrontmatterMutations works |
| TASK-003 DoD 2 reverseFrontmatterMap recovers original values via inverse mapping | Code-Inspection | [FAIL] | not implemented; caller must build inverse spec manually |
| TASK-003 DoD 3 branches array via JSON-serialized string values | Code-Inspection | [FAIL] | no JSON deserialize; raw string write |
| TASK-003 DoD 4 integration with PlanAdapter.applyMutations | Code-Inspection | [PASS] | plan.ts:172-174 integrated |
| TASK-003 DoD 5 integration with PlanAdapter.reverseMutations | Code-Inspection | [FAIL] | reverse path explicitly skips frontmatter |
| TASK-003 DoD 6 frontmatter inverse contract apply then reverse recovers original | Code-Inspection | [FAIL] | test 5 explicitly confirms reverse leaves forward values intact |
| TASK-003 DoD 7 unit tests pass for all scenarios | Test-Run | [PASS] | 8/8 pass but tests are aligned with implementation semantics not spec |
| ADR-002 D-2 MutationSpec frontmatter_map field AND inverse contract | Code-Inspection | [FAIL] | inverse contract broken |

## Findings

The unit tests pass but they pin a SEMANTIC CONTRADICTION with the spec. Per the test on line 78 of plan-frontmatter.test.ts: "frontmatter_map uses field-name semantics ... the map does not record the original values, so reverseMutations cannot algebraically restore them. Per the contract, frontmatter_map mutations are forward-only ..."

This contradicts:

- REQ-004 AC-2: "reverseMutations [...] THEN the original frontmatter field values are recovered (inverse mapping swaps keys and values)"
- TASK-003 DoD item 6: "Frontmatter inverse contract holds: apply then reverse recovers original"
- ADR-002 D-2 (as cited in REQ-004 Context): "applying frontmatter_map then its inverse (swapping keys and values) recovers the original frontmatter field values"

The implementation chose a different contract (field-name → new-value), which makes algebraic reversal impossible. The spec assumed a key-value swap inverse (old-value → new-value). Both designs are coherent; the implementation does not match the one the spec describes.

Separately, branches[] handling per REQ-004 AC-5 specifies "JSON-serialized string value [...] adapter parses and inserts as YAML array." Implementation writes whatever string the caller supplies into the YAML field — no parse, no array reserialization. Test 3 happens to pass because it supplies a string that is already a valid single-line YAML array literal.

The forward path (applyMutations) is correct and well-tested. The reverse path and array-field semantics are the gaps.

## Observations

- [outcome] 8/8 plan-frontmatter unit tests pass; tests pin forward-only semantics contradicting spec #test-pins-violation
- [problem] reverseMutations explicitly skips frontmatter; REQ-004 AC-2 and TASK-003 DoD-6 require inverse-recovery #req-004-ac-2 #task-003-dod-6
- [problem] branches array handling is verbatim string write; REQ-004 AC-5 mandates JSON parse plus YAML array serialization #req-004-ac-5
- [insight] Forward applyMutations frontmatter path is correct and aligned with spec; gap is purely the reverse direction and array semantics
- [decision] Implementer chose field-name to new-value semantic; spec assumed old-value to new-value swap; both coherent but only one matches spec

## Relations

- relates_to [[TASK-003-SPEC-003: Implement PLAN Frontmatter Mutations]]
- relates_to [[REQ-004-SPEC-003: PLAN Frontmatter Mutations]]
- relates_to [[DESIGN-001-SPEC-003: PLAN Adapter Architecture]]
- part_of [[SPEC-003: PLAN Adapter]]