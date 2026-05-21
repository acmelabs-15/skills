---
title: 'QA-032-SPEC-003: Batched Plan.ts TASKs 007 008 009'
type: test-report
permalink: qa/qa-032-spec-003-batched-plan-ts-tasks-007-008-009
status: ACCEPTED
verdict: PASS
validates:
- 'TASK-007-SPEC-003: Section-Aware extractByRange and Public Adapter Surface'
- 'TASK-008-SPEC-003: Source-Coverage Integrity Floor and Max-10 Schema Guard'
- 'TASK-009-SPEC-003: Frontmatter Inverse Contract and Branches Array JSON Handling'
tests_run: 460
passed: 460
failed: 0
skipped: 0
owning_session: 'SESSION-2026-05-21_01: Skills Phase X Wave 3 Stream Dprime Batched
  Plan Ts'
tags:
- qa
- spec-003
- task-007
- task-008
- task-009
- batched-validation
---

# QA-032-SPEC-003: Batched Plan.ts TASKs 007 008 009

## Scope

Aggregate QA evaluation of three independently-evaluated SPEC-003 gap-TASKs landed via batched dispatch in Wave 3 Stream D'. Each TASK gets its own per-checkbox finding table against its DoD plus linked REQ AC plus linked DESIGN compliance per the per-TASK build+QA cycle protocol.

| TASK | DoD checkboxes | ADR Compliance | Per-TASK verdict |
| --- | --- | --- | --- |
| TASK-007-SPEC-003 | 7 / 7 PASS | 2 / 2 PASS | PASS |
| TASK-008-SPEC-003 | 8 / 8 PASS | 2 / 2 PASS | PASS |
| TASK-009-SPEC-003 | 8 / 8 PASS | 1 / 1 PASS | PASS |

Aggregate verdict: PASS (all 3 TASKs individually PASS).

## Test Environment

- Working tree: feat/plan-001-wave-2-retro-validation @ commit 036f249
- Runtime: bun test (1.3.13)
- Scoped suite: `bun test tests/plan-adapter.test.ts tests/plan-integrity-floor.test.ts tests/plan-frontmatter.test.ts tests/plan-round-trip.test.ts` — 44 pass / 0 fail / 96 expect() calls / 180 ms
- Full composition suite: `bun test` (51 files) — 460 pass / 0 fail / 940 expect() calls / 1046 ms

## Per-TASK Findings — TASK-007-SPEC-003

Implements [[REQ-001-SPEC-003: PLAN Adapter Implementation]] AC-1, AC-2, AC-6.

### Definition of Done

| # | Item | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | PlanAdapter exposes readonly section_delimiter === "### " | PASS | `_shared/composition/src/adapters/plan.ts:58` declares `readonly section_delimiter = "### "`; test `_shared/composition/tests/plan-adapter.test.ts:122` asserts equality |
| 2 | PlanAdapter exposes readonly identifier_pattern matching {phase}.{part-id} | PASS | `plan.ts:66` declares regex `/^[a-z][a-z-]*\.(?:[A-Z][A-Z]+-\d+|\d+)$/`; tests at`plan-adapter.test.ts:125-134`cover positive (`research.1`,`decisions.2`,`spec.SPEC-001`,`build.SPEC-003`) and negative (`Research.1`,`spec.spec-001`,`noPhase`) cases |
| 3 | extractByRange returns content including own heading and excluding next heading at same delimiter level | PASS | `plan.ts:126-143` (`extractBySectionName`) finds startIdx by H3 text match, scans for next `^#{1,3}` boundary; test `plan-adapter.test.ts:155-161` asserts `### build.SPEC-001` returns with body and excludes `### build.SPEC-002` |
| 4 | extractByRange excludes regenerated_sections lines when mutation spec supplied | PASS | `plan.ts:113-115` strips spans when `regeneratedSections.length > 0`; empty-array short-circuits correctly per REQ-002 AC-3; test `plan-adapter.test.ts:170-192` asserts Progress Dashboard removed while body lines preserved |
| 5 | Test: extracting `### build.SPEC-001` returns from line through next `###` | PASS | `plan-adapter.test.ts:155` covers; second test at line 163 covers section closure on next H2 (higher level) |
| 6 | Test: identifier_pattern matches "research.1" and "spec.SPEC-001" | PASS | `plan-adapter.test.ts:126-128` |
| 7 | All existing plan-adapter.test.ts and plan-round-trip.test.ts pass | PASS | scoped run: 44/44 pass; full composition run: 460/460 pass |

### ADR Compliance

| # | Item | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | Honors ADR-002 D-3 (PLAN distinct impl observable contract) | PASS | `section_delimiter` and `identifier_pattern` now public readonly observable fields (previously private dead code per the gap-TASK Observations) |
| 2 | Honors ADR-002 D-4 (PLAN hash extraction strategy section boundary semantics) | PASS | section-aware overload matches ADR adapter's inclusive-of-own / exclusive-of-next convention at `plan.ts:130-142` |

TASK-007 verdict: PASS (7/7 DoD, 2/2 ADR)

## Per-TASK Findings — TASK-008-SPEC-003

Implements [[REQ-002-SPEC-003: Regenerated Sections Field Handling]] AC-1, [[REQ-003-SPEC-003: Fifty Percent Integrity Floor on Regenerated Sections]] AC-1, AC-3, AC-4, and [[DESIGN-002-SPEC-003: Regenerated Sections Mechanism]] Components 2 and 3.

### Definition of Done

| # | Item | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | `src/core/validate.ts` exports `validateIntegrityFloor(sourceContent, sections) -> {valid, coveragePercent, message}` | PASS | `_shared/composition/src/core/validate.ts:32-66` declares the function with the documented signature; `IntegrityFloorResult` interface at lines 14-18 |
| 2 | Rejects plans where regen sections cover greater-than 50% of source lines | PASS | `validate.ts:57-63` checks `if (coverageRatio > 0.5)` and returns `valid: false` with descriptive message; test `plan-integrity-floor.test.ts:191-210` (12 lines total, 7-line dashboard → 58%) asserts rejection |
| 3 | Accepts plans where regen sections cover exactly 50% of source lines | PASS | strict `>` comparison at `validate.ts:57` so equality passes; test `plan-integrity-floor.test.ts:231-246` (10 lines / 5-line dashboard) asserts `valid: true` |
| 4 | Accepts plans where regen sections cover less than 50% of source lines | PASS | test `plan-integrity-floor.test.ts:212-229` asserts `valid: true` with coveragePercent < 50 |
| 5 | Zod schema rejects regenerated_sections arrays with greater-than 10 entries | PASS | `_shared/composition/schemas/base.ts:19-25` exports `regeneratedSectionsFloor` refinement (`sections.length <= 10`), wired into `mutationSpecSchema` at line 36; test `plan-integrity-floor.test.ts:140-154` asserts 11-entry array rejected, line 156-170 asserts 10-entry array accepted |
| 6 | findRegeneratedSpans regex matches H2 and H3 headings | PASS | `plan.ts:170` regex `^[##|###]( \t)+[.+?]( \t)*$` matches both levels; level captured for equal-or-higher-level boundary detection at lines 186-201 |
| 7 | Unit test: H3 regen section "### Progress Dashboard" correctly identified and stripped | PASS | `plan-integrity-floor.test.ts:276-303` asserts single span returned, slice contains `### Progress Dashboard` and table content, excludes following H2 `## After` (equal-or-higher closure) |
| 8 | All existing tests in plan-integrity-floor.test.ts and plan-round-trip.test.ts still pass | PASS | scoped 44/44, full suite 460/460 |

### ADR Compliance

| # | Item | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | Honors ADR-002 D-5 (regenerated-sections integrity floor as Zod refinement + runtime line-count check) | PASS | Both layers present: schema-level (base.ts:19-25) and runtime (validate.ts:32-66); existing preservation-ratio `enforceIntegrityFloor` retained as orthogonal safety net per TASK-008 Observations |
| 2 | Honors ADR-001 F-8 (hash validation integrity preserved against bulk-bypass) | PASS | Two-layer defense-in-depth blocks regen-section abuse: schema catches obvious overuse (>10 entries) without source file; runtime measures actual line coverage against loaded source |

TASK-008 verdict: PASS (8/8 DoD, 2/2 ADR)

## Per-TASK Findings — TASK-009-SPEC-003

Implements [[REQ-004-SPEC-003: PLAN Frontmatter Mutations]] AC-1 through AC-5.

### Definition of Done

| # | Item | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | frontmatter_map semantic switched from field-name to old-value plus new-value | PASS | `plan.ts:287-316` `applyFrontmatterMutations` matches the existing trimmed VALUE of each YAML row (`Object.hasOwn(frontmatterMap, existing)` at line 306) rather than the field name; doc comment at lines 277-285 makes the contract explicit |
| 2 | applyFrontmatterMutations replaces frontmatter values per the new semantic | PASS | line 307 fetches replacement and emits `${field}: ${replacement}` at line 308; test `plan-frontmatter.test.ts:23-35` asserts title-value replacement |
| 3 | reverseFrontmatterMutations restores original values by inverting the map | PASS | `plan.ts:252` inverts the map (`reverse ? this.invertMap(fmMap) : fmMap`) and re-applies the same `applyFrontmatterMutations`; mathematically equivalent to a separate reverse function. Symmetric inversion validated by DoD-4 round-trip identity test |
| 4 | Test: apply(content, fmMap) then reverse(result, fmMap) === content for scalar fields | PASS | `plan-frontmatter.test.ts:81-96` asserts `reverseMutations(applyMutations(content, m), m) === content` across title, permalink, and status fields |
| 5 | branches[] array value is JSON-parsed then YAML-serialized as proper array literal | PASS | `plan.ts:324-337` `renderFrontmatterValue` detects `[…]` shape, `JSON.parse`s, emits `[a, b, c]` inline YAML; falls through to verbatim on parse error |
| 6 | Test: branches frontmatter_map value `'["a","b"]'` produces `branches: [a, b]` in YAML | PASS | `plan-frontmatter.test.ts:50-63` asserts `'[]' -> '["feat/plan-001-build-spec-003"]'` yields `branches: [feat/plan-001-build-spec-003]` and asserts the original `branches: []` line is gone |
| 7 | plan-round-trip.test.ts distributionSpec includes frontmatter_map and SHA-256 identity still holds | PASS | `plan-round-trip.test.ts:22-28` distributionSpec now includes `frontmatter_map` with two entries (title + permalink); the THE PROOF test at line 100-119 asserts `sha256(recomposed) === sha256(originalContent)` and `recomposed === originalContent` |
| 8 | REQ-004 AC-1 through AC-5 all pass | PASS | AC-1 (title/permalink replacement) covered by frontmatter test 1+2; AC-2 (inverse contract) covered by test 5; AC-3 (empty map no-op): empty `Object.keys(fmMap).length > 0` guard at plan.ts:251 short-circuits; AC-4 (undefined map no-op): truthy check at plan.ts:251 covers; AC-5 (branches[] JSON-array shape): test 3 covers |

### ADR Compliance

| # | Item | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | Honors ADR-002 D-2 (MutationSpec frontmatter_map field + inverse contract) | PASS | applyFrontmatterMutations + map-inversion-on-reverse together implement the algebraic inverse contract; integrated into the wider transformSegment pipeline at plan.ts:239-256 |

TASK-009 verdict: PASS (8/8 DoD, 1/1 ADR)

## Aggregate Verdict

PASS — all three TASKs satisfied independently. No re-engagement brief required.

Mechanical claim validation: schemas/validators trip if these notes claim DONE with any unsatisfied `[ ]` checkbox. All TASKs hold `[x]` across DoD plus ADR Compliance sections in their respective TASK notes.

## State Changes

- TASK-007-SPEC-003: DRAFT → DONE
- TASK-008-SPEC-003: DRAFT → DONE
- TASK-009-SPEC-003: DRAFT → DONE

## Observations

- [outcome] Scoped plan suite 44/44 pass; full composition suite 460/460 pass at commit 036f249 #task-007 #task-008 #task-009 #pass
- [fact] TASK-007 exposes section_delimiter plus identifier_pattern as public readonly observable fields; section-aware extractByRange honours inclusive-of-own / exclusive-of-next boundary per ADR-002 D-4 #task-007 #public-surface
- [fact] TASK-008 lands two-layer defense-in-depth: schema-level max-10 refinement in `schemas/base.ts:19-25` plus runtime source-coverage validator in `src/core/validate.ts` #task-008 #defense-in-depth
- [fact] TASK-008 widens findRegeneratedSpans regex to match H2 OR H3 (`^(##|###)`) with equal-or-higher-level span closure logic; PLAN regenerative sections may be authored at either level #task-008 #heading-level-coverage
- [fact] TASK-009 implements algebraic inverse contract via map inversion at plan.ts:252; apply-then-reverse identity holds for scalar fields and JSON-array fields alike; branches[] JSON-array literal correctly emits YAML inline array #task-009 #inverse-contract
- [decision] Existing enforceIntegrityFloor retained as orthogonal safety net (preservation-ratio of recovered vs input) separate from the source-coverage validateIntegrityFloor (regen lines / total source lines) #defense-in-depth #two-validators
- [insight] plan-round-trip distributionSpec now exercises full mutation surface: renumber_map plus frontmatter_map plus regenerated_sections; SHA-256 char-identity preserved through apply-then-reverse round trip #round-trip #the-proof

## Relations

- validates [[TASK-007-SPEC-003: Section-Aware extractByRange and Public Adapter Surface]]
- validates [[TASK-008-SPEC-003: Source-Coverage Integrity Floor and Max-10 Schema Guard]]
- validates [[TASK-009-SPEC-003: Frontmatter Inverse Contract and Branches Array JSON Handling]]
- part_of [[SPEC-003: PLAN Adapter]]
- implements [[REQ-001-SPEC-003: PLAN Adapter Implementation]]
- implements [[REQ-002-SPEC-003: Regenerated Sections Field Handling]]
- implements [[REQ-003-SPEC-003: Fifty Percent Integrity Floor on Regenerated Sections]]
- implements [[REQ-004-SPEC-003: PLAN Frontmatter Mutations]]
- caused_by [[QA-010-SPEC-003: PLAN Adapter Base]]
- caused_by [[QA-011-SPEC-003: Regen Sections and Integrity Floor]]
- caused_by [[QA-012-SPEC-003: PLAN Frontmatter Mutations]]
