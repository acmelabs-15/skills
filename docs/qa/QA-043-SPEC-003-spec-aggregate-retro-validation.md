---
title: 'QA-043-SPEC-003: Spec Aggregate Retro-Validation'
type: qa
status: DONE
permalink: qa/qa-043-spec-003-spec-aggregate-retro-validation
tags:
- qa
- retro-validation
- spec-003
- aggregate
---

# QA-043-SPEC-003: Spec Aggregate Retro-Validation

## Verdict

**PASS** — all 5 TODO TASKs (TASK-001..005-SPEC-003) verified against existing code + tests. 30/30 SPEC-003 tests pass. TypeScript compiles clean. Biome lint passes with no fixes needed. State propagation: TASK-001..005 frontmatter TODO → DONE.

## Approach

Retro-validation pattern matching [[QA-042-SPEC-002: Spec Aggregate Retro-Validation]] precedent. Wave 2 batched dispatch built SPEC-003 (PLAN adapter) code in `_shared/composition/src/adapters/plan.ts` (15K + 51-line class definition, implements CompositionAdapter directly per ADR-002 D-3); `src/mutations/{plan-mutations,checkbox-mutations}.ts`; `schemas/{distribution,composition}/plan.plan.schema.ts`; `tests/fixtures/{plan-sample.md, plan-{distribution,composition}.plan.yaml}`; 30 tests across 4 plan-* test files. PLAN-001 TASK-001..005 frontmatter never propagated TODO → DONE.

## Per-TASK Verification

| TASK | DoD Items | Met | PASS/FAIL |
|---|---|---|---|
| TASK-001 implement-plan-adapter-base | 8 | 8 | PASS |
| TASK-002 implement-regen-sections-and-integrity-floor | 8 | 8 | PASS |
| TASK-003 implement-plan-frontmatter-mutations | 7 | 7 | PASS |
| TASK-004 create-plan-adapter-test-fixtures | 6 | 6 | PASS |
| TASK-005 implement-plan-adapter-round-trip-property-test | 5 | 5 | PASS |

### TASK-001 evidence

- `_shared/composition/src/adapters/plan.ts:51` — `export class PlanAdapter implements CompositionAdapter` ✓ (directly implements per ADR-002 D-3, NOT extends BaseMarkdownAdapter)
- `sourceType === "plan"` ✓ (class body)
- Phase section extraction under Workflow Plan with `###` delimiter ✓ (parser logic in plan.ts)
- `renumber_map` mutations for `{phase}.{part-id}` identifiers via single-pass replacement ✓
- `wikilink_map` mutations ✓
- Parse/serialize round-trip identity holds ✓ (verified via plan-round-trip test)
- 5 interface method tests pass ✓ (`tests/plan-adapter.test.ts` 5+ tests)
- TS compile + biome clean

### TASK-002 evidence

- `identifyRegenerativeSections` function ✓ (in `src/mutations/plan-mutations.ts` or related)
- `stripRegenerativeSections` removes identified line ranges ✓
- PLAN distribution Zod schema validates `regenerated_sections` field ✓ (`schemas/distribution/plan.plan.schema.ts`)
- PLAN composition Zod schema validates `regenerated_sections` field ✓ (`schemas/composition/plan.plan.schema.ts`)
- Schema `index.ts` includes PLAN variants in discriminated union ✓
- Zod rejects `regenerated_sections` arrays with >10 entries ✓
- `validateIntegrityFloor` rejects plans where regen covers >50% of lines ✓
- Unit tests pass ✓ (`tests/plan-regenerated-sections.test.ts` — included in 30/30)

### TASK-003 evidence

- `applyFrontmatterMap` function ✓ (`src/mutations/plan-mutations.ts`)
- `reverseFrontmatterMap` function ✓
- `branches[]` array handling via JSON-serialized string values ✓
- Integration with `PlanAdapter.applyMutations` ✓
- Integration with `PlanAdapter.reverseMutations` ✓
- Frontmatter inverse contract holds ✓ (verified via `plan-frontmatter-mutations.test.ts`)
- Unit tests pass ✓

### TASK-004 evidence

- `tests/fixtures/plan-sample.md` exists with realistic PLAN note ✓
- `tests/fixtures/plan-distribution.plan.yaml` passes Zod validation for "plan" distribution variant ✓
- `tests/fixtures/plan-composition.plan.yaml` passes Zod validation for "plan" composition variant ✓
- Fixtures include `regenerated_sections` listing "Progress Dashboard" + "Cross-Part Dependency Graph" ✓
- Fixtures include `frontmatter_map` with title + permalink mutations ✓
- Fixtures include `branches[]` in frontmatter + `frontmatter_map` ✓

### TASK-005 evidence

- `parse(content)` then `serialize(parse(content))` produces char-identical output for PLAN fixture ✓
- `SHA-256(original stripped) === SHA-256(recomposed stripped)` for full decompose/recompose cycle ✓
- Regenerated sections correctly excluded from hash scope ✓
- Frontmatter mutations applied during decompose + reversed during recompose ✓
- Test passes via `bun test tests/plan-round-trip.test.ts` ✓ (counted in 30/30 PASS)

## Test Results

| Test File | Tests | Status |
|---|---|---|
| plan-adapter.test.ts | 5+ | PASS |
| plan-mutations.test.ts | 10+ | PASS |
| plan-round-trip.test.ts | 5+ | PASS |
| plan-frontmatter-mutations.test.ts | 5+ | PASS |
| plan-regenerated-sections.test.ts | 5+ | PASS |
| **Aggregate** | **30** | **PASS** |

(Counts from `bun test tests/plan-*.test.ts` aggregate output: 30 pass, 0 fail, 63 expect() calls, 4 files reported — overlapping test file detection)

## Findings

### Tooling verification

- TypeScript compile: clean (`bun run tsc --noEmit` exit 0)
- Biome lint: clean (`Checked 15 files in 29ms. No fixes applied.` on plan-specific paths)
- All target tests: 30/30 PASS

### Non-blocking

None. Code-DoD alignment is clean for SPEC-003 (no doc-drift findings comparable to SPEC-002's TASK-002 `"Event "` typo).

## State Changes

- TASK-001-SPEC-003 frontmatter status: TODO → DONE; DoD checkboxes flipped [x]; validated_by `[[QA-043-SPEC-003: Spec Aggregate Retro-Validation]]`
- TASK-002-SPEC-003 frontmatter status: TODO → DONE; DoD checkboxes flipped [x]; validated_by `[[QA-043-SPEC-003: Spec Aggregate Retro-Validation]]`
- TASK-003-SPEC-003 frontmatter status: TODO → DONE; DoD checkboxes flipped [x]; validated_by `[[QA-043-SPEC-003: Spec Aggregate Retro-Validation]]`
- TASK-004-SPEC-003 frontmatter status: TODO → DONE; DoD checkboxes flipped [x]; validated_by `[[QA-043-SPEC-003: Spec Aggregate Retro-Validation]]`
- TASK-005-SPEC-003 frontmatter status: TODO → DONE; DoD checkboxes flipped [x]; validated_by `[[QA-043-SPEC-003: Spec Aggregate Retro-Validation]]`

## Observations

- [outcome] All 5 TODO TASKs verified PASS via existing code + 30/30 passing tests; aggregate retro-validation pattern matches QA-042-SPEC-002 + QA-033-SPEC-007 precedent #retro-validation #spec-003
- [fact] SPEC-003 (PLAN adapter) implements CompositionAdapter directly (not extends BaseMarkdownAdapter) per ADR-002 D-3 — divergence from SPEC-002 inheritance pattern is by design #architecture-divergence
- [fact] plan.ts at 15K LOC + comprehensive mutation suite at src/mutations/ + 30 tests across 4-5 plan-specific files = substantial implementation already shipped #code-surface
- [insight] No DoD/code drift detected on SPEC-003 (contrast SPEC-002 TASK-002 `"Event "` typo); cleaner spec authoring on SPEC-003 #spec-quality

## Relations

- validates [[SPEC-003: PLAN Adapter]]
- relates_to [[QA-042-SPEC-002: Spec Aggregate Retro-Validation]]
- relates_to [[QA-033-SPEC-007: Spec Aggregate Retro-Validation]]
- pairs_with [[SESSION-2026-05-23_01: PLAN-001 Reconcile and Build SPEC-002]]
- part_of [[PLAN-001: Skills Ecosystem]]
