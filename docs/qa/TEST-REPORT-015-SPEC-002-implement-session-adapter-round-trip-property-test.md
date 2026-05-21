---
title: 'TEST-REPORT-015-SPEC-002: Implement SESSION Adapter Round-Trip Property Test'
type: test-report
permalink: qa/test-report-015-spec-002-implement-session-adapter-round-trip-property-test-1
status: DONE
tags:
- test-report
- spec-002
- round-trip
- retro
---

# TEST-REPORT-015-SPEC-002: Implement SESSION Adapter Round-Trip Property Test

## Objective

Retro-validate the SESSION round-trip property test against TASK-006-SPEC-002 DoD and REQ-005-SPEC-002 AC items 2, 3, and 4.

- **Feature**: SESSION round-trip SHA-256 char-identity proof plus cross_source_updates emission/reversal verification
- **Scope**: TASK-006-SPEC-002

## Approach

- **Test Types**: property, unit, hash-identity, schema-conformance
- **Environment**: bun test v1.3.13; commit 2f049fd
- **Data Strategy**: shared fixture tests/fixtures/session-sample.md plus inline MutationSpec literal in the test file
- **Test File**: `_shared/composition/tests/session-round-trip.test.ts`

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 13 | - | - |
| Passed | 8 | - | [FAIL] |
| Failed | 4 | 0 | [FAIL] |
| Skipped | 1 | - | - |
| Assertions | 18 | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| DoD 1 — SESSION fixture at tests/fixtures/session/ with Event-NN entries | DoD | [FAIL] | Fixture exists at tests/fixtures/session-sample.md (flat) NOT tests/fixtures/session/sample-session.md; fixture uses ## Event 01 (space separator) but observations carry Event-NN (hyphen separator) — internally inconsistent vs TASK prescription of Event-NN throughout |
| DoD 2 — SESSION fixture plan YAML with cross_source_updates entries | DoD | [FAIL] | No YAML plan fixture exists; round-trip test uses inline MutationSpec literal (session-round-trip.test.ts:15-23); cross_source_updates is exercised only via TS literal in :55-78 |
| DoD 3 — Round-trip property test: parse, decompose with plan, recompose with inverse plan | DoD | [PASS] | session-round-trip.test.ts:48-53 applyMutations then reverseMutations |
| DoD 4 — Assertion: SHA-256(original) === SHA-256(recomposed) | DoD | [PASS] | session-round-trip.test.ts:51 expect(sha256(recomposed)).toBe(sha256(originalContent)) |
| DoD 5 — Assertion: decompose output includes cross_source_updates with correct target_note, part_id, field_name, new_value | DoD | [FAIL] | Test asserts target_source_type (literal "plan") not target_note; the schema has no part_id, field_name, or new_value fields — schema shape differs from TASK prescription (see TEST-REPORT-012 for full divergence) |
| DoD 6 — Assertion: recompose reverses cross_source_updates (old_value and new_value swapped) | DoD | [FAIL] | No reversal test exists; schema has no old_value field; reversal mechanically impossible against current shape |
| DoD 7 — Test passes via bun test | DoD | [PASS] | suite returns 0 fail |
| DoD 8 — Fixture includes Event-NN entries with zero-padded sequential numbering | DoD | [PARTIAL] | Fixture section headings are "## Event 01..05" (space, zero-padded, correct); observations and prose use "Event-01..05" (hyphen). The renumber_map in the test targets the hyphen form (Event-01 → Event-100) so section headings are unaffected. Mixed convention. |
| DoD 9 — biome lint passes | DoD | [SKIPPED] | biome not invoked in retro scope |
| REQ-005 AC-2 — SESSION fixture round-trip: SHA-256(original) === SHA-256(recomposed) | REQ | [PASS] | session-round-trip.test.ts:48-53 PROOF |
| REQ-005 AC-3 — cross_source_updates emitted in decompose output, reversed in recompose output | REQ | [FAIL] | Emission is verified via schema validation only (session-round-trip.test.ts:55-78); reversal is NOT tested anywhere; getCrossSourceUpdates is a pass-through with no inverse |
| REQ-005 AC-4 — round-trip test failure → bun test exits non-zero | REQ | [PASS] | standard bun:test runner behavior |

## Findings

The SESSION SHA-256 round-trip PROOF passes (REQ-005 AC-2 PASS). Three significant DoD failures:

1. **Fixture path divergence** — same pattern as TASK-005: flat `tests/fixtures/session-sample.md` instead of nested `tests/fixtures/session/sample-session.md`.
2. **Missing YAML plan fixture** — same pattern as TASK-005.
3. **cross_source_updates emission/reversal not properly tested** — DoD items 5 and 6 fail because the underlying CrossSourceUpdate schema shape (TASK-003 gap) lacks the prescribed fields. AC-3 from REQ-005 fails because no reversal logic exists.
4. **Mixed Event-NN convention in fixture** — section delimiters use space (`## Event 01`) while embedded tokens use hyphen (`Event-01`). Round-trip works because renumber_map targets the hyphen form only, but the fixture should pick one convention to match REQ-002's "Event-NN identifiers".

## Verdict

**FAIL** — REQ-005 AC-3 FAILS because cross_source_updates reversal is impossible against the current schema shape; multiple DoD items FAIL on fixture layout and cross-source assertions. The SHA-256 PROOF for SESSION round-trip on the renumber surface PASSES. Gap-TASK required.

## Observations

- [outcome] SESSION round-trip SHA-256 PROOF passes on the renumber surface; cross_source_updates emission/reversal layer is incomplete #verdict #mixed
- [fact] Fixture path is flat (tests/fixtures/session-sample.md) instead of TASK-prescribed nested (tests/fixtures/session/sample-session.md) #drift #file-layout
- [fact] No YAML plan fixture; test uses inline TS literal #drift #yaml-asset
- [problem] cross_source_updates reversal cannot be tested because the schema has no old_value field and no reverseUpdates method exists; REQ-005 AC-3 mechanically unsatisfiable #blocker #recomposition
- [risk] Fixture mixes "## Event 01" (space-delimited section heading) with "Event-01" (hyphen-delimited identifier); renumber_map works only because it targets the hyphen form #risk #convention

## Relations

- implements [[TASK-006-SPEC-002: Implement SESSION Adapter Round-Trip Property Test]]
- relates_to [[REQ-005-SPEC-002: Round-Trip Property Tests for ANALYSIS and SESSION]]
- relates_to [[REQ-002-SPEC-002: SESSION Adapter Implementation]]
- relates_to [[REQ-003-SPEC-002: SESSION Cross-Source Updates Handling]]
- part_of [[SPEC-002: Simple Adapters]]