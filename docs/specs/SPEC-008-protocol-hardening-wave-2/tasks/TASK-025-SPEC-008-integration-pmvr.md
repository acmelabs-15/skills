---
title: 'TASK-025-SPEC-008: Integration Test Parse Mutate Validate Render'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-025-spec-008-integration-pmvr
status: DONE
effort: M
estimate: 1d
tags:
- task
- spec-008
- track-3
- integration
---

# TASK-025-SPEC-008: Integration Test Parse Mutate Validate Render

## Description

Author the full-pipeline integration test at `shared/composition/tests/integration/parse-mutate-validate-render.test.ts`. The test exercises the composition library's end-to-end contract on at least three representative fixtures (one PLAN, one SPEC, one TASK): load fixture markdown → parse via the type's parser → apply a representative mutation via `applyPlanMutation` (or equivalent) → invoke the claim validator on the mutated note → render via the type's renderer → assert the final rendered output is byte-equivalent to the expected post-mutation state. Also author the two cross-note consistency tests: `cross-note-spec-task-consistency.test.ts` (SPEC root rollup vs child TASK status) and `test-report-vs-task-dod.test.ts` (TEST-REPORT row PASS vs TASK DoD `[x]`).

## Definition of Done


- [x] File `shared/composition/tests/integration/parse-mutate-validate-render.test.ts` exists
- [x] At least three top-level `describe` blocks cover PLAN, SPEC, TASK pipeline end-to-end
- [x] Each pipeline test asserts: parse succeeds → mutation applies → validator accepts → renderer emits expected output
- [x] File `shared/composition/tests/integration/cross-note-spec-task-consistency.test.ts` exists
- [x] Cross-note SPEC-TASK test fails on a fixture pair with DONE TASK and unchecked SPEC root row
- [x] Cross-note SPEC-TASK test passes on a fixture pair with DONE TASK and `[x]` SPEC root row
- [x] File `shared/composition/tests/integration/test-report-vs-task-dod.test.ts` exists
- [x] TEST-REPORT-vs-TASK-DoD test fails on a fixture pair where TEST-REPORT claims PASS but the linked TASK DoD line is `[ ]`
- [x] Subdirectory `shared/composition/tests/fixtures/integration/` exists with cross-note fixture pairs as needed
- [x] `bun test shared/composition/tests/integration/` runs all three integration files; all pass
- [x] `biome lint` and `tsc --noEmit` pass


## ADR Compliance


- [x] Honors ADR-005 D-3 Phase 3 critic P1.2 / P1.3 verbatim: parse-mutate-validate-render full path; cross-note SPEC-vs-TASK consistency; TEST-REPORT-vs-TASK-DoD cross-validation
- [x] Honors REQ-007 AC-1: pipeline coverage of PLAN, SPEC, TASK note types
- [x] Honors REQ-007 AC-2: cross-note SPEC-TASK consistency test exists and fails on intentional drift
- [x] Honors REQ-007 AC-3: TEST-REPORT-vs-TASK-DoD cross-validation test exists and fails on intentional drift


## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/tests/integration/parse-mutate-validate-render.test.ts` | NEW | Full-pipeline integration coverage |
| `shared/composition/tests/integration/cross-note-spec-task-consistency.test.ts` | NEW | SPEC-vs-TASK rollup consistency assertion |
| `shared/composition/tests/integration/test-report-vs-task-dod.test.ts` | NEW | TEST-REPORT-vs-TASK DoD cross-validation |
| `shared/composition/tests/fixtures/integration/` | NEW | Cross-note fixture pairs |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 2d | Fixture-pair construction plus pipeline plumbing |
| AI-Dominant | 1d | Pipeline composition is mechanical; cross-note fixture pairs require care |
| AI-Assisted | 1d | Three test files plus fixture pairs |

## Observations

- [task] Three test files plus a fixtures subdirectory close the ZERO-dedicated-integration-tests finding from Audit E #closure #audit-e
- [technique] Cross-note tests synthesize fixture pairs (SPEC root + child TASK; TEST-REPORT + TASK) and assert the consistency rule across the pair rather than within a single note #cross-note-pattern
- [constraint] Pipeline tests MUST run all four stages (parse, mutate, validate, render); skipping any stage defeats the end-to-end contract #end-to-end

## Relations

- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- implements [[REQ-007-SPEC-008: Integration Tests and Mutation Tests and Drift Regression Markers]]
- depends_on [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- relates_to [[QA-048-SPEC-008: Integration Test Parse Mutate Validate Render]]
