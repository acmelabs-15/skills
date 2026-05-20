---
title: 'TEST-REPORT-009-SPEC-001: Round-Trip Property Test'
type: test-report
permalink: qa/test-report-009-spec-001-round-trip-property-test-1
status: DONE
tags:
- test-report
- spec-001
- round-trip
- proof
- sha-256
---

# TEST-REPORT-009-SPEC-001: Round-Trip Property Test

## Scope

Validates the architectural PROOF gate for the composition library: that decomposing an ADR into per-decision fragments and recomposing them produces a bit-exact replica of the original. This is the correctness foundation every downstream consumer depends on.

**Files under test**:

- `tests/round-trip.test.ts` — 4 property tests using Bun.file() for fixture loading
- `tests/fixtures/adr-sample.md` — 170-line realistic ADR with frontmatter, D-1..D-4 H3 decision sections (prose, bullets, wikilinks, code block, nested bullets, table), Clarifications, Observations, Relations
- `tests/fixtures/adr-distribution.plan.yaml` — decomposition plan (D-1..D-4 mapped to D-100..D-201)
- `tests/fixtures/adr-composition.plan.yaml` — recomposition plan (inverse of distribution)

## Test Results

| # | Test Name | Category | Status | Notes |
|---|-----------|----------|--------|-------|
| 1 | precondition: parse then serialize is idempotent | Unit | [PASS] | remark-stringify second pass equals first pass |
| 2 | precondition: applyMutations then reverseMutations is identity | Unit | [PASS] | bit-exact content recovery after mutation round-trip |
| 3 | applyMutations renumbers D-1..D-4 to D-100..D-201 | Unit | [PASS] | verifies non-trivial renumber across fixture |
| 4 | THE PROOF: SHA-256(original) === SHA-256(decompose then recompose) | Integration | [PASS] | full decompose-recompose cycle produces identical bytes |

### Summary Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests run | 4 | 4 | [PASS] |
| Passed | 4 | 4 | [PASS] |
| Failed | 0 | 0 | [PASS] |
| Full suite (all files) | 47 pass, 0 fail | - | [PASS] |
| Total expect() calls | 99 across 8 files | - | - |

## THE PROOF Verdict

**[PASS]** SHA-256(original) === SHA-256(decompose then recompose).

The AdrAdapter's decompose-recompose cycle is bit-exact. The fixture exercises bullet lists, code fences, tables, wikilinks, nested bullets, and frontmatter to stress remark-stringify normalization. The renumber_map uses disjoint domains (D-1..D-4 keys vs D-100..D-201 values), satisfying the injectiveDisjointMap constraint.

## DoD Coverage

| Acceptance Criterion | Status | Evidence |
|----------------------|--------|----------|
| round-trip.test.ts implements full decompose-then-recompose cycle with SHA-256 assertion | [PASS] | Test 4 in round-trip.test.ts |
| ADR fixture is realistic (170+ lines with D-N sections, frontmatter, wikilinks, code blocks) | [PASS] | tests/fixtures/adr-sample.md: 170 lines |
| Fixture plans exercise non-trivial renumber_map with disjoint key-value domains | [PASS] | D-1..D-4 keys, D-100..D-201 values |
| parse/serialize idempotency precondition test passes | [PASS] | Test 1 |
| applyMutations/reverseMutations inverse precondition test passes | [PASS] | Test 2 |
| Full round-trip SHA-256 assertion passes | [PASS] | Test 4 — THE PROOF |

**Coverage**: 6/6 criteria covered (100%).

## Notable Implementation Choices

- **Bun-native file loading**: Tests use `Bun.file()` instead of Node.js `fs` imports, consistent with Bun-first project conventions.
- **Precondition tests isolate failure modes**: Tests 1 and 2 validate parse/serialize idempotency and mutation invertibility independently, so a failure in the full round-trip (Test 4) can be triaged to the specific subsystem.
- **Disjoint renumber domains**: The renumber_map maps D-1..D-4 to D-100..D-201 (no overlap between keys and values), which validates the injectiveDisjointMap type constraint and prevents accidental identity mappings from hiding bugs.
- **Fixture exercises remark edge cases**: Tables, code fences, nested bullets, and wikilinks stress the areas where remark-stringify normalization is most likely to diverge from the original.

## Observations

- [outcome] THE PROOF PASSES — SHA-256(original) === SHA-256(decompose then recompose) confirmed for AdrAdapter #proof #sha-256
- [fact] 4 round-trip tests all pass with 0 failures across precondition and integration categories #test-results #round-trip
- [technique] Precondition tests (parse/serialize idempotency, mutation invertibility) isolate failure modes before the full proof runs #test-design #isolation
- [fact] Fixture uses disjoint renumber domains (D-1..D-4 to D-100..D-201) satisfying injectiveDisjointMap constraint #fixture #type-safety
- [insight] Full suite stands at 47 tests, 99 expect() calls across 8 files with 0 failures — no regressions from round-trip additions #regression #suite-health

## Relations

- depends_on [[TASK-009-SPEC-001: Round-Trip Property Test]]
- part_of [[SPEC-001: Skills]]
