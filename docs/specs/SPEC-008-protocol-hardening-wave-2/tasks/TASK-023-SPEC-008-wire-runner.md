---
title: 'TASK-023-SPEC-008: Wire Adversarial-Claims Table-Driven Test Runner'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-023-spec-008-wire-runner
status: TODO
effort: S
estimate: 0.5d
tags:
- task
- spec-008
- track-3
- adversarial
- runner
---

# TASK-023-SPEC-008: Wire Adversarial-Claims Table-Driven Test Runner

## Description

Author the test runner at `shared/composition/tests/adversarial-claims.test.ts` that iterates a table of `AdversarialCase` entries over the initial fixture set (authored by TASK-022) and invokes `testAdversarial` per row. Add a coverage verification block that walks the on-disk fixture tree and asserts every fixture file is referenced in the table (no orphans) and every table row's `fixture` path resolves to an existing file on disk (no broken pointers).

## Definition of Done

- [ ] File `shared/composition/tests/adversarial-claims.test.ts` exists
- [ ] File imports `testAdversarial` from `./_helpers/adversarial.ts`
- [ ] File declares a `cases: AdversarialCase[]` array with at least ten entries covering Audit E top-10
- [ ] Loop over `cases` invokes `testAdversarial(label, c)` per entry where `label` is derived from the fixture filename stem
- [ ] Coverage block asserts that every file under `tests/fixtures/adversarial/<type>/` appears as a `cases` entry (no orphan fixtures)
- [ ] Coverage block asserts that every `cases[i].fixture` path exists on disk (no broken table rows)
- [ ] Each `expectedReject` regex is anchored on specific validator error wording (not a loose `/error/` match)
- [ ] `bun test shared/composition/tests/adversarial-claims.test.ts` runs all ten cases AND all pass
- [ ] `biome lint` and `tsc --noEmit` pass

## ADR Compliance

- [ ] Honors ADR-005 D-3: single test runner over fixture directory; per-validator adversarial test files NOT created
- [ ] Honors REQ-006 AC-5: `bun test` passes; no orphan fixture; no broken table-row pointers
- [ ] Honors REQ-006 AC-6: adding a new scenario requires exactly two file operations (one fixture file + one table row)

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/tests/adversarial-claims.test.ts` | NEW | Table-driven runner over the initial fixture set with coverage verification |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Authoring tight `expectedReject` regexes requires inspecting each validator's actual error messages |
| AI-Dominant | 0.5d | Runner is ~50 lines plus the cases table |
| AI-Assisted | 0.5d | Table content is derivable from TASK-022 fixture set |

## Observations

- [task] Coverage-verification block prevents the fixture-orphan and broken-pointer failure modes that table-driven runners are vulnerable to #coverage-block #orphan-detection
- [technique] Label derivation from fixture filename stem keeps test output traceable to fixture file via grep #traceability
- [constraint] `expectedReject` regex MUST anchor on specific error wording per DESIGN-003 contract; loose matchers defeat the lying-detection purpose #regex-tightness

## Relations

- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- implements [[REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set]]
- implements [[DESIGN-003-SPEC-008: Adversarial Test Fixture Layout and Harness Shape]]
- depends_on [[TASK-021-SPEC-008: Implement Adversarial-Claim Test Harness]]
- depends_on [[TASK-022-SPEC-008: Author Initial Adversarial Fixture Set for Five Existing Validators]]
