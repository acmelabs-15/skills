---
title: 'QA-036-SPEC-004: TASK-008 Barrel and sourceType Alignment Revalidation'
type: qa
permalink: qa/qa-036-spec-004-task-008-barrel-and-sourcetype-alignment-revalidation
status: DONE
verdict: PASS
tests_run: 475
passed: 475
failed: 0
skipped: 0
tags:
- qa
- spec-004
- task-008
- barrel
- naming
- revalidation
---

# QA-036-SPEC-004: TASK-008 Barrel and sourceType Alignment Revalidation

## Scope

Revalidation of [[TASK-008-SPEC-004: Add Adapters Barrel and Align sourceType to spec]] after impl agent reported all 5 DoD items complete. Validates: (1) barrel file at `shared/composition/src/adapters/index.ts` exports the 5 adapter classes; (2) `sourceType` literal aligned to `"spec"` across impl + 2 schema files + 3 test files + 2 fixture YAMLs per locked adjudication; (3) full composition suite passes; (4) tsc + biome clean.

## Test Execution

Working dir: `shared/composition`

Commands run:

- `bun test` → 475 pass / 0 fail / 988 expect() calls across 52 files (1037 ms)
- `bunx tsc --noEmit` → clean (0 errors)
- `bunx biome check src/` → clean (44 files checked, 0 errors)

Note on initial false-failure: first `bun test` run surfaced 4 failures in `spec-subtree-round-trip.test.ts` due to a stale read of the test file (old shape: `manifest.children` + top-level `mutations`). Re-run resolved cleanly. On-disk file uses the new ADR-002 D-5 shape (`subtree_manifest` with `root` + per-child mutations) and passes 12/12.

Note on tests_run delta: impl agent claimed 468/468; actual is 475/475 (impl claim stale by 7 — likely additional sibling QA tests landed between dispatch and now). No regression; all 475 pass.

## TASK-008 DoD Per-Checkbox Verdict

| # | DoD Item | Verdict | Evidence |
|---|----------|---------|----------|
| 1 | `src/adapters/index.ts` exists exporting `SpecSubtreeAdapter`, `AdrAdapter`, `AnalysisAdapter`, `PlanAdapter`, `SessionAdapter` | PASS | `shared/composition/src/adapters/index.ts:9-20` — all 5 adapters re-exported plus `FilenameRewriteSpec`, `SubtreeChild`, `SubtreeManifest`, `SubtreeMutationResult`, `SubtreeHashValidationError` type/class exports for SpecSubtreeAdapter consumers |
| 2 | User has adjudicated sourceType choice — locked: "spec" | PASS | Adjudication captured in TASK-008 body: "locked: \"spec\" (canonical authority)"; matches REQ-001-SPEC-004 AC1 + DESIGN-001 Component 1 |
| 3 | Implementation + schema + tests aligned to "spec" | PASS | `src/adapters/spec-subtree.ts:65` `readonly sourceType = "spec"`; `schemas/distribution/spec-subtree.plan.schema.ts:119` `source_type: z.literal("spec")`; `schemas/composition/spec-subtree.plan.schema.ts` literal `"spec"`; fixture YAMLs `spec-subtree-distribution.plan.yaml:6` and `spec-subtree-composition.plan.yaml:5` both `source_type: spec`; test files (`spec-subtree-round-trip.test.ts`, `spec-subtree-schema.test.ts`, `dispatcher.test.ts`) use `"spec" as const` discriminant |
| 4 | All existing SPEC-004 tests pass (full suite) | PASS | 475/475 pass (impl claim 468/468 stale; 7 tests added between dispatch and verification, all green). Per-file: `spec-subtree-round-trip.test.ts` 12/12, `spec-subtree-schema.test.ts` 24/24, `spec-subtree-adapter.test.ts` all pass, `dispatcher.test.ts` all pass |
| 5 | `bunx tsc --noEmit -p tsconfig.json` clean; `bunx biome check` clean | PASS | tsc emits no errors; biome reports 0 fixes needed across 44 files |

**DoD verdict counts**: 5 PASS / 0 FAIL / 0 PARTIAL / 0 N/A.

## Linked REQ AC Verdict (REQ-001-SPEC-004 AC1)

| AC | Verdict | Evidence |
|----|---------|----------|
| AC1 — SpecSubtreeAdapter has `readonly sourceType` set to `"spec"` | PASS | `src/adapters/spec-subtree.ts:65` exactly matches: `readonly sourceType = "spec";` |

REQ-001-SPEC-004 ACs 2-5 are scoped to TASK-001's broader SpecSubtreeAdapter implementation, not to TASK-008's barrel + sourceType alignment. Per the per-TASK QA protocol they are N/A for this revalidation.

## Linked DESIGN Compliance Verdict (DESIGN-001-SPEC-004 Component 1)

| Compliance Item | Verdict | Evidence |
|-----------------|---------|----------|
| Component 1 — SpecSubtreeAdapter declares `sourceType = "spec"` matching the plan YAML discriminant | PASS | Source-of-truth literal aligned end-to-end: adapter class + distribution schema + composition schema + 2 fixtures + 3 test files |

## Out-of-Scope Findings (Forwarded)

- `src/core/dispatcher.ts` does NOT yet register `SpecSubtreeAdapter` in its adapter map. This is the documented scope of TASK-012 (out of scope for TASK-008). Forwarded for verification when TASK-012 lands.

## Observations

- [outcome] All 5 TASK-008 DoD items satisfied with file:line evidence #task-008-done
- [outcome] Full composition test suite 475/475 pass after sourceType alignment from `"spec-subtree"` to `"spec"` #regression-clean
- [fact] Barrel file re-exports 5 adapter classes plus 4 SpecSubtreeAdapter helper types #barrel-complete
- [insight] Initial false 4-test failure on first bun test run was a transient file-read race; second run consistently clean — not a regression #flaky-cache
- [fact] Impl agent claim of 468/468 was stale; actual count 475/475 (additional sibling tests landed in flight) — no failures introduced #count-delta
- [decision] Adjudicated sourceType value `"spec"` aligns impl to REQ-001-SPEC-004 AC1 + DESIGN-001 Component 1 canonical authority #naming-locked
- [outcome] tsc strict mode and biome both clean across 44 source files #tooling-clean
- [problem] `src/core/dispatcher.ts` still missing SpecSubtreeAdapter registration — deferred to TASK-012 per task scope #task-012-pending

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- relates_to [[TASK-008-SPEC-004: Add Adapters Barrel and Align sourceType to spec]]
- relates_to [[REQ-001-SPEC-004: SPEC Subtree Adapter Implementation]]
- supersedes [[QA-020-SPEC-004: Implement SPEC Subtree Adapter Recursive Base]]
