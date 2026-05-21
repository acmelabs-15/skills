---
title: 'QA-024-SPEC-004: Implement specSubtreeManifestSchema Zod Validator'
type: qa
permalink: qa/qa-024-spec-004-implement-spec-subtree-manifest-schema-zod-validator
status: DONE
tags:
- qa
- spec-004
- zod-schema
- task-005-spec-004
---

# QA-024-SPEC-004: Implement specSubtreeManifestSchema Zod Validator

## Objective

Verify TASK-005-SPEC-004 implements `specSubtreeManifestSchema` and distribution + composition variants per REQ-005-SPEC-004 and ADR-002 D-5.

- **Feature**: specSubtreeManifestSchema Zod Validator (TASK-005-SPEC-004)
- **Scope**:
  - `schemas/distribution/spec-subtree.plan.schema.ts` (64 lines)
  - `schemas/composition/spec-subtree.plan.schema.ts` (23 lines)
  - registration in `schemas/index.ts`
- **Acceptance Criteria**: TASK-005 DoD + REQ-005 AC + ADR-002 D-5

## Approach

- **Test Types**: Unit
- **Environment**: Local (Bun 1.3.13)
- **Data Strategy**: Hand-crafted valid + invalid manifests
- **Test File**: `_shared/composition/tests/spec-subtree-schema.test.ts`

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 8 | - | - |
| Passed | 8 | - | [PASS] |
| Failed | 0 | 0 | [PASS] |
| Skipped | 0 | - | - |
| Assertions | 10 | - | - |
| Execution Time | <50ms | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| accepts a valid manifest | Unit | PASS | spec-subtree-schema.test.ts:10 |
| rejects duplicate relative_path (non-injective) | Unit | PASS | spec-subtree-schema.test.ts:26 |
| rejects path traversal (..) in child paths | Unit | PASS | spec-subtree-schema.test.ts:42 |
| rejects absolute paths in child paths | Unit | PASS | spec-subtree-schema.test.ts:55 |
| rejects path traversal in root_path | Unit | PASS | spec-subtree-schema.test.ts:65 |
| accepts a valid distribution plan | Unit | PASS | spec-subtree-schema.test.ts:77 |
| planSchema discriminated union routes spec-subtree distribution | Unit | PASS | spec-subtree-schema.test.ts:101 |
| accepts a valid composition plan | Unit | PASS | spec-subtree-schema.test.ts:119 |

## Findings

### DoD Coverage Table

| DoD Item | Status | Evidence |
|----------|--------|----------|
| specSubtreeManifestSchema validates root + children structure per ADR-002 D-5 | PARTIAL | Schema validates `root_path`, `root_hash`, `children[]` (with `relative_path`, `hash`, `identifier`, optional `range`). ADR-002 D-5 also requires per-entry `mutations` (MutationSpec) AND optional `filename_rewrite_map` per child — NEITHER present in implementation. `mutations` is a top-level plan field, not per-child. |
| All renumber_map and wikilink_map entries validated by injectiveDisjointMap | FAIL | Schema uses `mutationSpecSchema` at top level (one MutationSpec for the entire plan), not per-entry. injectivity check is on `relative_path` strings, not on the maps themselves at this layer (relies on base.ts `mutationSpecSchema`). |
| All dest_path values validated by containedPathSchema | FAIL | `destinations[].root_path` and `destinations[].children[].relative_path` use only `z.string().min(1)`; no `containedPathSchema` integration. The `..` and absolute-path check is duplicated inline in `specSubtreeManifestSchema.superRefine` for `relative_path` on the source manifest side only — not for destinations. |
| Distribution variant registered in schemas/index.ts | PASS | `schemas/index.ts` line 11 imports + line 51-52 re-exports `SpecSubtreeDistributionPlan` |
| Composition variant registered in schemas/index.ts | PASS | `schemas/index.ts` line 6 imports + line 49 re-exports |
| Unit tests: valid manifest, non-injective rejected, path traversal rejected, missing subtree_manifest rejected | PARTIAL | Valid: PASS. Non-injective on relative_path: PASS. Path traversal: PASS. Missing required field "manifest": NO explicit test for missing `manifest` field. |

### REQ-005-SPEC-004 AC Coverage

| AC | Status | Evidence |
|----|--------|----------|
| Valid distribution plan with root + 3 children -> parses, returns typed Plan | PASS | spec-subtree-round-trip.test.ts:179 + spec-subtree-schema.test.ts:77 |
| Non-injective renumber_map -> PlanValidationError identifying field | FAIL | No per-entry renumber_map exists in current schema shape. base.ts `mutationSpecSchema` may carry injectiveDisjointMap on the top-level mutations but is not exercised in spec-004-specific tests. |
| dest_path with path traversal -> PlanValidationError | FAIL | Destinations use raw `z.string().min(1)` without containedPathSchema. Path traversal on dest_path is NOT rejected. |
| Missing subtree_manifest field -> Zod validation error | PARTIAL | The field is named `manifest` in implementation (not `subtree_manifest` per REQ-005 spec). `z.object` requires it but no explicit test asserts the missing-field rejection. |
| Empty children array (root only) -> validation succeeds | FAIL | Schema requires `z.array(...).min(1)` (distribution schema line 14) — empty children rejected. REQ-005 AC5 says empty children should succeed. **Direct contradiction.** |

### Verdict

**Status**: FAIL
**Confidence**: High
**Rationale**: While the 8 existing tests pass and core injectivity + source-side path-traversal protection works, the schema architecture diverges from ADR-002 D-5 (per-entry mutations + per-child filename_rewrite_map not in shape; top-level `mutations` instead). REQ-005 AC5 (empty children should validate successfully) is directly contradicted by `z.array(...).min(1)`. Destination paths lack `containedPathSchema`. The schema also renames `subtree_manifest` to `manifest` (REQ-005 says `subtree_manifest`).

## Observations

- [outcome] 8/8 schema tests pass with good coverage of source-side path traversal + injectivity on relative_path #test-results
- [problem] Schema shape diverges from ADR-002 D-5: no per-entry `mutations`, no per-child `filename_rewrite_map`, top-level `mutations` field instead #architectural-drift #adr-violation
- [problem] REQ-005 AC5 says empty children array should succeed; schema requires `min(1)` and rejects — direct contradiction #ac-violation
- [problem] Destination paths (root_path + children.relative_path under destinations) lack containedPathSchema validation #security-gap
- [fact] Field named `manifest` in plan schema, but REQ-005 + ADR-002 D-1 specify `subtree_manifest` #naming-drift

## Relations

- validates [[TASK-005-SPEC-004: Implement specSubtreeManifestSchema Zod Validator]]
- part_of [[SPEC-004: SPEC Subtree Adapter]]