---
title: 'QA-011-SPEC-003: Regen Sections and Integrity Floor'
type: qa
permalink: qa/qa-011-spec-003-regen-sections-and-integrity-floor
status: DONE
tags:
- qa
- spec-003
- regenerated-sections
- integrity-floor
---

# QA-011-SPEC-003: Regen Sections and Integrity Floor

## Objective

Retro-validate TASK-002-SPEC-003 against REQ-002 (regenerated_sections handling), REQ-003 (50% integrity floor), DESIGN-002 (mechanism), and TASK-002 DoD.

- **Feature**: Regenerated section handler + 50% integrity floor (TASK-002-SPEC-003)
- **Scope**: `src/adapters/plan.ts` (findRegeneratedSpans, stripRegeneratedSections, enforceIntegrityFloor, IntegrityFloorError); `schemas/distribution/plan.plan.schema.ts`; `schemas/composition/plan.plan.schema.ts`; `schemas/index.ts`; `tests/plan-integrity-floor.test.ts`
- **Acceptance Criteria**: REQ-002 AC-1 to AC-5; REQ-003 AC-1 to AC-4; TASK-002 DoD 1-8; ADR-002 D-2/D-4/D-5

## Approach

- **Test Types**: Retro-Unit, Code-Inspection, Schema-Inspection
- **Environment**: Local (Bun 1.3.13)
- **Data Strategy**: Existing plan-integrity-floor.test.ts unit suite + inline schema parse against ADR-002 D-5 spec
- **Test File**: `tests/plan-integrity-floor.test.ts`

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 10 | 10 | - |
| Passed | 10 | 10 | [PASS] |
| Failed | 0 | 0 | [FAIL] |
| Skipped | 0 | - | - |
| Assertions | 14 | - | - |
| Execution Time | 47ms | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| default integrity floor is 0.5 | Retro-Unit | [PASS] | plan.ts:62-64 |
| custom integrity floor is preserved | Retro-Unit | [PASS] | plan.ts:62-64 constructor arg |
| reverseMutations succeeds when preservation greater-equal floor | Retro-Unit | [PASS] | plan.ts:230-258 enforceIntegrityFloor |
| integrity floor at 0.99 with substantial rewrite throws IntegrityFloorError | Retro-Unit | [PASS] | plan.ts:255-257 throw |
| IntegrityFloorError exposes preservedRatio and floor | Retro-Unit | [PASS] | plan.ts:25-35 class |
| valid distribution plan passes | Retro-Unit | [PASS] | schemas/distribution/plan.plan.schema.ts:16-26 |
| distribution plan defaults integrity_floor to 0.5 | Retro-Unit | [PASS] | schema default(0.5) |
| distribution plan rejects non-injective renumber_map | Retro-Unit | [PASS] | injectiveDisjointMap refinement |
| valid composition plan passes | Retro-Unit | [PASS] | schemas/composition/plan.plan.schema.ts:20-26 |
| composition plan rejects integrity_floor outside 0 to 1 | Retro-Unit | [PASS] | z.number.min(0).max(1) |
| REQ-002 AC-1 extractByRange excludes lines from Progress Dashboard heading through next equal-or-higher heading | Code-Inspection | [FAIL] | extractByRange (plan.ts:74-79) does NOT consult regenerated_sections; only applyMutations/reverseMutations do |
| REQ-002 AC-2 reverseMutations excludes Progress Dashboard section lines from reverse-mutated output before hash comparison | Code-Inspection | [PARTIAL] | regen spans pass-through unchanged in reverseMutations (plan.ts:146-152); hash comparison itself happens in tests, not in adapter |
| REQ-002 AC-3 empty regenerated_sections array results in full hash validation | Code-Inspection | [PASS] | plan.ts:137 default to empty; plan.ts:140-141 fast path |
| REQ-002 AC-4 undefined regenerated_sections results in full hash validation | Code-Inspection | [PASS] | mutations.regenerated_sections ?? [] (plan.ts:137) |
| REQ-002 AC-5 non-existent heading silently ignored | Code-Inspection | [PASS] | wanted Set membership check (plan.ts:97,119); no error path |
| REQ-002 H2/H3 heading matching | Code-Inspection | [FAIL] | headingRe `^##[ t]+(.+?)` matches H2 only; H3 sections `### Heading` NOT matched; DESIGN-002 and REQ-002 both call for H2/H3 support |
| REQ-003 AC-1 Zod validator rejects regenerated_sections with greater-than 10 entries | Schema-Inspection | [FAIL] | base.ts:22 z.array(z.string()).optional() has NO max-length refinement; max-10 schema-level guard absent |
| REQ-003 AC-2 runtime line-count check verifies regen sections less-than-equal 50% of total source content lines | Code-Inspection | [FAIL] | enforceIntegrityFloor (plan.ts:230-258) measures line-overlap ratio between input and recovered, NOT regen-section-coverage ratio against source; semantics differ from spec |
| REQ-003 AC-3 plan where regen sections cover exactly 51% of source lines REJECTED | Code-Inspection | [FAIL] | not implementable with current enforceIntegrityFloor semantics |
| REQ-003 AC-4 50% is the boundary; exactly 50% passes | Code-Inspection | [FAIL] | per AC-2/AC-3 — wrong semantics; no source-coverage measure |
| TASK-002 DoD 1 identifyRegenerativeSections by heading text match | Code-Inspection | [PASS] | findRegeneratedSpans (plan.ts:95-126) |
| TASK-002 DoD 2 stripRegenerativeSections removes section line ranges | Code-Inspection | [PASS] | stripRegeneratedSections (plan.ts:261-272) |
| TASK-002 DoD 3 PLAN distribution Zod schema validates regenerated_sections | Schema-Inspection | [PASS] | mutationSpecSchema includes regenerated_sections optional |
| TASK-002 DoD 4 PLAN composition Zod schema validates regenerated_sections | Schema-Inspection | [PASS] | composition schema inherits mutationSpecSchema |
| TASK-002 DoD 5 schema index.ts includes PLAN variants in discriminated union | Schema-Inspection | [PASS] | schemas/index.ts:9,18 |
| TASK-002 DoD 6 Zod schema rejects regenerated_sections arrays greater-than 10 entries | Schema-Inspection | [FAIL] | no max(10) refinement anywhere |
| TASK-002 DoD 7 validateIntegrityFloor rejects plans where regen sections cover greater-than 50% of lines | Code-Inspection | [FAIL] | no validateIntegrityFloor function in src/core/validate.ts (file does not exist) |
| TASK-002 DoD 8 unit tests pass for all regen section and integrity floor scenarios | Test-Run | [PASS] | 10/10 pass on existing semantics |
| ADR-002 D-2 MutationSpec regenerated_sections field | Schema-Inspection | [PASS] | base.ts:22 |
| ADR-002 D-4 PLAN extraction strategy regenerative sections excluded | Code-Inspection | [PARTIAL] | excluded from applyMutations/reverseMutations; NOT excluded from extractByRange |
| ADR-002 D-5 regenerated-sections integrity floor 50 percent | Code-Inspection | [FAIL] | implemented semantics is preservation-ratio, NOT source-coverage-ratio of regen sections |

## Findings

The implementation passes 10/10 of its own unit tests but the unit tests do NOT validate the spec's intended semantics. Critical findings:

1. **Wrong integrity-floor semantics**. REQ-003 + DESIGN-002 + ADR-002 D-5 all describe the floor as "regenerated_sections cover ≤50% of source content lines" — a measure of how much the spec lets you exclude. The implementation in `enforceIntegrityFloor` (plan.ts:230-258) measures something different: it counts how many lines of the *recovered* (reverse-mutated) text appear *anywhere* in the *non-regenerated portion of the input*. This is a line-overlap ratio, not a section-coverage ratio. A pathological plan declaring 90% of the source as regenerated would not be rejected by the current implementation.

2. **No schema-level max(10) guard**. DESIGN-002 Component 2 explicitly specifies `regeneratedSectionsFloor = z.array(z.string()).refine(s => s.length <= 10, ...)`. `base.ts:22` has only `z.array(z.string()).optional()` — no refinement.

3. **No `validateIntegrityFloor` runtime function**. DESIGN-002 Component 3 specifies `function validateIntegrityFloor(sourceContent, regeneratedSections): {valid, coveragePercent, message}`. There is no `src/core/validate.ts`; the integrity logic lives inside `enforceIntegrityFloor` (different signature, different intent).

4. **H3 sections not matched**. DESIGN-002 and REQ-002 both require H2 OR H3 heading matching. `findRegeneratedSpans` regex `^##[ \t]+` is H2-only.

5. **extractByRange does not consult regenerated_sections**. REQ-002 AC-1 says extractByRange must exclude regen-section lines. Current extractByRange is a raw line slice. The regen exclusion only fires in applyMutations/reverseMutations.

Crucially, the existing `enforceIntegrityFloor` IS a useful safety mechanism — it catches aggressive rewrites where the mutation map alters most of the content. But it is NOT the floor described by REQ-003. The two should coexist; right now only one exists, and it's labelled inconsistently.

## Observations

- [outcome] 10/10 plan-integrity-floor unit tests pass but tests validate the wrong semantics #test-vs-spec-drift
- [problem] enforceIntegrityFloor measures preservation ratio not section coverage; semantics differ from REQ-003 #wrong-semantics #integrity-floor
- [problem] No max-10 schema refinement on regenerated_sections; bulk-bypass attack possible #defense-in-depth-missing
- [problem] H3 regen sections not detectable findRegeneratedSpans uses H2-only regex #heading-level-coverage
- [insight] enforceIntegrityFloor IS useful but should coexist with the source-coverage floor not replace it #safety-net

## Relations

- relates_to [[TASK-002-SPEC-003: Implement Regenerated Sections Handler and Integrity Floor]]
- relates_to [[REQ-002-SPEC-003: Regenerated Sections Field Handling]]
- relates_to [[REQ-003-SPEC-003: Fifty Percent Integrity Floor on Regenerated Sections]]
- relates_to [[DESIGN-002-SPEC-003: Regenerated Sections Mechanism]]
- part_of [[SPEC-003: PLAN Adapter]]
