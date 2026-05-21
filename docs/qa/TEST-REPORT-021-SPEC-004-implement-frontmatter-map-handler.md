---
title: 'TEST-REPORT-021-SPEC-004: Implement Frontmatter Map Handler'
type: test-report
permalink: qa/test-report-021-spec-004-implement-frontmatter-map-handler-1
status: DONE
tags:
- test-report
- spec-004
- frontmatter
- mutations
- task-002-spec-004
---

# TEST-REPORT-021-SPEC-004: Implement Frontmatter Map Handler

## Objective

Verify TASK-002-SPEC-004 implements `applyFrontmatterMap` / `reverseFrontmatterMap` handling per REQ-002-SPEC-004 and DESIGN-001-SPEC-004 Component 3 (FrontmatterMutator).

- **Feature**: Frontmatter Map Handler (TASK-002-SPEC-004)
- **Scope**: `applyFrontmatterMutations` method on `SpecSubtreeAdapter` (spec-subtree.ts:256-271)
- **Acceptance Criteria**: TASK-002 DoD + REQ-002-SPEC-004 AC + ADR-002 D-2 frontmatter_map

## Approach

- **Test Types**: Unit, Integration (round-trip)
- **Environment**: Local (Bun 1.3.13)
- **Data Strategy**: Inline + on-disk fixtures with frontmatter blocks
- **Test File**: `_shared/composition/tests/spec-subtree-adapter.test.ts`, `tests/spec-subtree-round-trip.test.ts`

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 2 | - | - |
| Passed | 2 | - | [PASS] |
| Failed | 0 | 0 | [PASS] |
| Skipped | 0 | - | - |
| Assertions | 6 | - | - |
| Execution Time | <100ms | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| applySubtreeMutations with frontmatter_map updates title in all files | Unit | PASS | spec-subtree-adapter.test.ts:151 — quoted form `"REPLACED: Title"` |
| reverseMutations round-trips a renumber+wikilink combination (frontmatter unaffected) | Unit | PASS | spec-subtree-adapter.test.ts:166 — non-targeted fields preserved |

## Findings

### DoD Coverage Table

| DoD Item | Status | Evidence |
|----------|--------|----------|
| applyFrontmatterMap replaces targeted field values in YAML frontmatter block | PASS | spec-subtree.ts:256 `applyFrontmatterMutations`; test confirms title replacement (spec-subtree-adapter.test.ts:151) |
| reverseFrontmatterMap applies inverse mapping (swapped keys/values) | PASS | spec-subtree.ts:110 calls `applyFrontmatterMutations(result, this.invertMap(mutations.frontmatter_map))` |
| Round-trip property: reverseFrontmatterMap(applyFrontmatterMap(content, map), map) === content | PASS | spec-subtree-round-trip.test.ts THE PROOF tests preserve frontmatter via inverse |
| Handles both quoted ('value') and unquoted (value) YAML string formats | PARTIAL | Regex `^(${key}:\s*)(.+)$` is value-agnostic and works on both, but no explicit test asserts unquoted form. |
| Non-targeted frontmatter fields remain byte-identical after mutation | PASS | Round-trip SHA-256 identity in spec-subtree-round-trip.test.ts proves all non-targeted fields preserved |
| Unit tests cover: title mutation, permalink mutation, quoted values, multi-field map | PARTIAL | Title mutation: covered. Quoted: covered. Permalink mutation: NOT explicitly covered in dedicated test. Multi-field map: NOT explicitly covered (existing test uses 1 entry only). |

### REQ-002-SPEC-004 AC Coverage

| AC | Status | Evidence |
|----|--------|----------|
| Root note title "SPEC-001: Brain" -> frontmatter_map title -> replaced | PASS | spec-subtree-adapter.test.ts:151 replaces title across all files |
| Child REQ permalink updated via frontmatter_map | PARTIAL | Same mechanism handles permalink; no dedicated permalink test |
| reverseMutations with same frontmatter_map restores original | PASS | invertMap on frontmatter_map + applyFrontmatterMutations roundtrips; SHA-256 PROOF in round-trip test |
| Reverse-mutated SHA-256 matches original source SHA-256 | PASS | spec-subtree-round-trip.test.ts:115 explicit per-file SHA-256 assertion |
| frontmatter_map targeting only title+permalink -> other fields unchanged | PASS | line-level regex per key only touches matching lines; round-trip SHA-256 proves |

### DESIGN-001-SPEC-004 Component 3 Compliance

| Item | Status | Evidence |
|------|--------|----------|
| `applyFrontmatterMap(content, map)` exported function | FAIL | Implemented as private method `applyFrontmatterMutations`; not exported as standalone helper per DESIGN-001 Component 3 signature |
| `reverseFrontmatterMap(content, map)` exported function | FAIL | Not exported; reversal flows through `reverseMutations` which calls private `applyFrontmatterMutations` with inverted map |
| Field-level replacement (not line-level mutating comments / multi-line values) | PARTIAL | Regex is line-level on `key:\s*(.+)$`. YAML comments (`# foo`) on the same line as a value would be partially overwritten — no test exercises this edge case. Multi-line YAML values (e.g., `|` block scalars) would only have the first line replaced — no test exercises this. |

### Verdict

**Status**: PARTIAL
**Confidence**: Medium
**Rationale**: Core frontmatter mutation + reversal works and is proven via the SHA-256 round-trip. However, two DoD items only have partial coverage (no explicit unquoted-form test, no explicit permalink test, no explicit multi-field map test), and the DESIGN-001 Component 3 signature divergence (private method vs exported helpers) is unadjudicated.

## Observations

- [outcome] Frontmatter mutation + reversal works end-to-end; SHA-256 round-trip confirms char-identity preservation #test-results
- [fact] Implementation uses private method `applyFrontmatterMutations`, not the exported helper pair DESIGN-001 Component 3 declares #architectural-drift
- [problem] No explicit unit test for unquoted YAML form, permalink-only mutation, or multi-field frontmatter_map #dod-gap #coverage
- [risk] Line-level regex would mishandle YAML comments-on-value-line or block scalar values; no test asserts behavior #edge-case

## Relations

- validates [[TASK-002-SPEC-004: Implement Frontmatter Map Handler]]
- part_of [[SPEC-004: SPEC Subtree Adapter]]