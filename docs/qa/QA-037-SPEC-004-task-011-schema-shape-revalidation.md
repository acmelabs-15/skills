---
title: 'QA-037-SPEC-004: TASK-011 Schema Shape Revalidation'
type: test-report
permalink: qa/qa-037-spec-004-task-011-schema-shape-revalidation
status: ACCEPTED
verdict: PASS
tags:
- test-report
- spec-004
- task-011
- schema
- adr-002-d-5
---

# QA-037-SPEC-004: TASK-011 Schema Shape Revalidation

QA revalidation of TASK-011-SPEC-004 (Align Schema Shape to ADR-002 D-5 and REQ-005 AC). Verdict: **PASS**.

## Scope

Schema reshape per ADR-002 D-5 canonical authority (Option A — user adjudication recorded in TASK-011 DoD-1):

- `_shared/composition/schemas/distribution/spec-subtree.plan.schema.ts` (reshaped per ADR-002 D-5)
- `_shared/composition/schemas/composition/spec-subtree.plan.schema.ts` (reshaped; reuses distribution manifest schema)
- `_shared/composition/schemas/index.ts` (exports SubtreeManifestRoot + SubtreeManifestChild)
- `_shared/composition/tests/spec-subtree-schema.test.ts` (rewritten for new shape; per-AC coverage)
- `_shared/composition/tests/spec-subtree-round-trip.test.ts` (schema tests migrated to new shape; YAML fixture validation)
- `_shared/composition/tests/fixtures/spec-subtree-distribution.plan.yaml` (rewritten to ADR-002 D-5 shape)
- `_shared/composition/tests/fixtures/spec-subtree-composition.plan.yaml` (rewritten to ADR-002 D-5 inverse shape)

## TASK-011 DoD checklist

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | User adjudication on shape direction logged in PLAN-001 (Option A: refactor schema to ADR-002 D-5) | PASS | TASK-011 DoD-1 marked `[x]` referencing PLAN-001 event log; impl matches Option A |
| 2 | Schema empty-children case behaves per adjudication (children allows length 0; AC5 satisfied) | PASS | `schemas/distribution/spec-subtree.plan.schema.ts:61` — `z.array(subtreeManifestChildSchema)` no `.min(1)`; test `tests/spec-subtree-schema.test.ts:43-47` "AC5: accepts a manifest with an empty children array" passes |
| 3 | Destinations (root.source_path + children.source_path + children.dest_path) validated by sync path-traversal guard | PASS | `schemas/distribution/spec-subtree.plan.schema.ts:14-29` rejectPathTraversal; superRefine `:89-109` applies to all 3 surfaces; tests `tests/spec-subtree-schema.test.ts:77-132` cover all 3 path-traversal cases plus absolute-path rejection |
| 4 | Missing required field rejection covered by explicit unit tests (missing root, missing children, missing dest_path, missing subtree_manifest) | PASS | Tests at `tests/spec-subtree-schema.test.ts:50-74` (missing root, missing children, missing dest_path) + `:202-209` (missing subtree_manifest on plan) |
| 5 | Field name renamed `manifest` → `subtree_manifest` per ADR-002 D-5; per-entry mutations migrated to root + each child; per-child optional `filename_rewrite_map` added; top-level plan `mutations` + `destinations` removed | PASS | `schemas/distribution/spec-subtree.plan.schema.ts:111-115` distribution plan shape; `:113-115` composition variant; root has mutations `:36-39`; children carry mutations + optional filename_rewrite_map `:49-54`; no top-level `mutations` or `destinations`; fixtures and ADR-002 D-5 sample (lines 266-298) match verbatim |
| 6 | Round-trip + schema tests pass (`bun test`) | PASS | `bun test` in `_shared/composition` reports **484 pass / 0 fail / 1035 expect() calls** across 53 files (count grew from impl-reported 475 → 484 due to added per-AC + path-traversal tests); subset run on `tests/spec-subtree-schema.test.ts` + `tests/spec-subtree-round-trip.test.ts` = 28 pass / 0 fail / 59 expect() calls |

All 6 DoD items **PASS**.

## REQ-005-SPEC-004 AC checklist

| AC | Statement | Verdict | Evidence |
|----|-----------|---------|----------|
| AC1 | Valid SPEC distribution plan with root + 3 children parses successfully | PASS | `tests/spec-subtree-schema.test.ts:167-190` "AC1: accepts a valid distribution plan (root + 3 children)"; also `tests/spec-subtree-round-trip.test.ts:213-228` (distribution YAML fixture: 4 children — superset of AC1) |
| AC2 | Non-injective renumber_map in a child raises PlanValidationError | PASS (by architectural decoupling per ADR-002 D-5) | ADR-002 D-5 line 88 explicitly defers injectivity/disjointness of renumber_map + wikilink_map to the runtime injectiveDisjointMap validator (`src/core/validators.ts`), not the schema's superRefine. Schema correctly only enforces dest_path injectivity at parse time (`schemas/distribution/spec-subtree.plan.schema.ts:101-108`); per-call runtime check covers AC2. This matches the design intent in REQ-005 Implementation Notes ("reuses injectiveDisjointMap … from SPEC-001"). |
| AC3 | Child dest_path path-traversal raises PlanValidationError | PASS | `tests/spec-subtree-schema.test.ts:77-92` "AC3: rejects path traversal (..) in child dest_path"; `:94-106` absolute path; `:108-120` source_path; `:122-132` root.source_path |
| AC4 | Plan missing subtree_manifest raises Zod validation error | PASS | `tests/spec-subtree-schema.test.ts:202-209` "AC4: rejects a SPEC plan missing the subtree_manifest field" |
| AC5 | Empty children array validates (SPEC with no REQ/DESIGN/TASK notes) | PASS | `tests/spec-subtree-schema.test.ts:43-47` "AC5: accepts a manifest with an empty children array"; composition parity at `:223-231` |

All 5 ACs **PASS** (AC2 by architectural decoupling consistent with ADR-002 D-5 + REQ-005 Implementation Notes).

## DESIGN compliance

DESIGN-001-SPEC-004 (SPEC Subtree Adapter Architecture) delegates schema-shape concerns to ADR-002 D-5; the schema is consumed by processSubtreeMutations. The reshape preserves the consumer contract — `SpecSubtreeDistributionPlan.subtree_manifest` typed as `SpecSubtreeManifest` and exported from `schemas/index.ts`. Architecture compliance: **PASS** (consumer contract preserved; per-entry mutation propagation enabled, which DESIGN-001 requires for per-child renumber/wikilink/frontmatter pipelining).

## ADR-002 D-5 verbatim shape verification

ADR-002 lines 266-298 specify the canonical shape. Field-by-field cross-check:

| ADR-002 D-5 field | Implementation | Match |
|-------------------|----------------|-------|
| `subtree_manifest` (not `manifest`) | `specSubtreeDistributionPlanSchema.subtree_manifest` and composition variant | ✓ |
| `root.source_path: string` | `subtreeManifestRootSchema.source_path` z.string().min(1) | ✓ |
| `root.mutations: MutationSpec` | `subtreeManifestRootSchema.mutations` mutationSpecSchema | ✓ |
| `children[].source_path: string` | `subtreeManifestChildSchema.source_path` | ✓ |
| `children[].dest_path: string` | `subtreeManifestChildSchema.dest_path` | ✓ |
| `children[].mutations: MutationSpec` | `subtreeManifestChildSchema.mutations` | ✓ |
| `children[].filename_rewrite_map: optional Record<string,string>` | `subtreeManifestChildSchema.filename_rewrite_map.optional()` | ✓ |
| Top-level `destinations` array | **removed** (subtree_manifest replaces it) | ✓ |
| Top-level `mutations` | **removed** (per-entry mutations replace it) | ✓ |
| Path containment on all path fields | rejectPathTraversal applied on root.source_path + children[i].source_path + children[i].dest_path | ✓ |

Shape verification: **VERBATIM MATCH**.

## Build verification

| Check | Result |
|-------|--------|
| `bun test` (full composition library) | 484 pass / 0 fail / 1035 expect() / 53 files |
| `bun test tests/spec-subtree-schema.test.ts tests/spec-subtree-round-trip.test.ts` | 28 pass / 0 fail / 59 expect() / 2 files |
| `bunx tsc --noEmit` | clean (no output) |
| `bunx biome check` on TASK-011 touched files | clean (5 files checked, no fixes applied) |
| `bunx biome check` on full composition library | 10 pre-existing errors in untouched files (schemas/base.ts format, src/core/cluster-rollback.ts imports, src/core/subtree-orchestrator.ts imports, src/adapters/spec-subtree.ts imports, tests/plan-adapter.test.ts format, tests/plan-integrity-floor.test.ts imports+format, tests/plan-round-trip.test.ts format, tests/spec-subtree-orchestration.test.ts imports) — **not introduced by TASK-011**; recommend remediation TASK |

## Test results

| Run | Tests | Passed | Failed | Skipped | Verdict |
|-----|-------|--------|--------|---------|---------|
| `bun test` (full library) | 484 | 484 | 0 | 0 | PASS |
| Subset (`tests/spec-subtree-schema.test.ts` + `tests/spec-subtree-round-trip.test.ts`) | 28 | 28 | 0 | 0 | PASS |

`tests_run = passed + failed + skipped` invariant holds: 484 = 484 + 0 + 0; 28 = 28 + 0 + 0.

## Aggregate verdict

| Surface | Count PASS | Count FAIL | Count PARTIAL | Count N/A |
|---------|------------|------------|---------------|-----------|
| TASK-011 DoD | 6 | 0 | 0 | 0 |
| REQ-005 AC | 5 | 0 | 0 | 0 |
| DESIGN-001 compliance | 1 | 0 | 0 | 0 |
| Build checks | 4 | 0 | 0 | 0 (biome library-wide failures pre-existing, not in scope) |

**Aggregate: PASS** — all in-scope items pass; out-of-scope biome warnings in untouched files surfaced for future remediation but do not block TASK-011 closure.

## Recommendations

- File a follow-up TASK (or `Wave 3` remediation item) to fix the 10 pre-existing biome violations in `_shared/composition/schemas/base.ts`, `src/core/cluster-rollback.ts`, `src/core/subtree-orchestrator.ts`, `src/adapters/spec-subtree.ts`, and 4 test files. None of these were introduced by TASK-011 but they fail the library-wide biome gate.

## Observations

- [outcome] All 6 TASK-011 DoD items pass with file:line evidence and the reshape matches ADR-002 D-5 verbatim shape lines 266-298 #task-done #adr-canonical
- [outcome] All 5 REQ-005 AC pass; AC2 satisfied by architectural decoupling (runtime injectiveDisjointMap validator) consistent with ADR-002 D-5 design intent #req-accepted #injectivity
- [fact] Test count grew from impl-reported 475 to 484 (9 new tests) due to added per-AC + path-traversal coverage in spec-subtree-schema.test.ts and spec-subtree-round-trip.test.ts #test-coverage
- [fact] Path-traversal guard applies to all 3 surfaces (root.source_path + child.source_path + child.dest_path) with both `..` segment and absolute-path rejection #security
- [fact] 10 pre-existing biome errors in untouched composition library files (base.ts, cluster-rollback.ts, subtree-orchestrator.ts, spec-subtree adapter, plan tests, subtree-orchestration test) are out of scope for TASK-011 and surfaced as a remediation recommendation #biome-debt
- [insight] Empty-children array is validated (no `.min(1)`) per REQ-005 AC5 plus composition-variant parity ensures both distribution and composition shapes treat empty subtree manifests identically #design-symmetry

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- implements [[TASK-011-SPEC-004: Align Schema Shape to ADR-002 D-5 and REQ-005 AC]]
- depends_on [[ADR-002: Adapter Contract and Plan Schema]]
- depends_on [[REQ-005-SPEC-004: SPEC Subtree Manifest Zod Schema]]
- supersedes [[QA-024-SPEC-004: Implement specSubtreeManifestSchema Zod Validator]]
- pairs_with [[QA-027-SPEC-004-spec-aggregate-retro-validation]]
