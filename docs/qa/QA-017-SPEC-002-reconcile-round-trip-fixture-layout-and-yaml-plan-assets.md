---
title: 'QA-017-SPEC-002: Reconcile Round-Trip Fixture Layout and YAML Plan Assets'
type: qa
permalink: qa/qa-017-spec-002-reconcile-round-trip-fixture-layout-and-yaml-plan-assets
status: DONE
tags:
- qa
- spec-002
- gap-task
- fixtures
- yaml
---

# QA-017-SPEC-002: Reconcile Round-Trip Fixture Layout and YAML Plan Assets

## Objective

Validate Stream E's implementation of TASK-010-SPEC-002: reconcile fixture-layout and YAML-plan-asset drift across the ANALYSIS and SESSION round-trip property tests, discovered in QA-014 and QA-015.

- **Feature**: Gap-TASK reconciliation between TASK-005/TASK-006 prescriptions and actual flat-layout impl
- **Scope**: TASK-010-SPEC-002 only

## Approach

- **Test Types**: structural-conformance, file-existence, content-validation, regression-via-round-trip
- **Environment**: bun test v1.3.13; commit 3d74348 on branch feat/plan-001-wave-2-retro-validation
- **Data Strategy**: inspect 4 new YAML fixtures + inspect TASK-005/006 DoD amendments + re-run analysis-round-trip + session-round-trip test suites
- **Test File**: `_shared/composition/tests/analysis-round-trip.test.ts`, `_shared/composition/tests/session-round-trip.test.ts`

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 9 | - | - |
| Passed | 9 | - | [PASS] |
| Failed | 0 | 0 | [PASS] |
| Skipped | 0 | - | - |
| Assertions | 19 | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| DoD 1 — Decision locked: nested-folder vs flat layout | DoD | [PASS] | Flat layout sanctioned. TASK-005 line 27 + TASK-006 line 28 carry the explicit annotation "flat layout — sanctioned by TASK-010-SPEC-002" with `[x]` checked |
| DoD 2a — Fixtures moved to nested OR DoDs amended for flat | DoD | [PASS] | Flat path chosen: TASK-005 DoD amended (line 27-28 ticked); TASK-006 DoD amended (line 28-29 ticked); 4 YAML plan fixtures created at flat paths `_shared/composition/tests/fixtures/{analysis,session}-{composition,distribution}.plan.yaml` |
| DoD 2b — YAML plan fixtures created | DoD | [PASS] | analysis-composition.plan.yaml (528B), analysis-distribution.plan.yaml (865B), session-composition.plan.yaml (752B), session-distribution.plan.yaml (1266B) — all present and parseable YAML with correct `plan_type` + `source_type` + `renumber_map` + `wikilink_map` fields; session variants include `cross_source_updates` |
| DoD 3 — All round-trip tests still pass | DoD | [PASS] | `bun test _shared/composition/tests/analysis-round-trip.test.ts _shared/composition/tests/session-round-trip.test.ts` returns 9 pass / 0 fail / 19 expect() calls |
| DoD 4 — SPEC-001 fixture layout convention reviewed for consistency | DoD | [PASS] | SPEC-001 ADR fixtures use flat layout (`adr-sample.md`, `adr-composition.plan.yaml`, `adr-distribution.plan.yaml`); no nested folder. New ANALYSIS + SESSION YAMLs match this convention. Drift is uniform — no inconsistency between SPEC-001 and SPEC-002 fixture conventions |

### Structural validation of new YAML fixtures

| Fixture | Required fields present | Internal consistency |
|---------|-------------------------|----------------------|
| analysis-composition.plan.yaml | plan_type=composition, source_type=analysis, source_path, renumber_map, wikilink_map | [PASS] — renumber_map is inverse of analysis-distribution (item-100→item-1, etc.) |
| analysis-distribution.plan.yaml | plan_type=distribution, source_type=analysis, source_path, clusters, renumber_map, wikilink_map | [PASS] — renumber_map (item-1→item-100, etc.) matches inline TS literal in analysis-round-trip.test.ts:11-19 verbatim |
| session-composition.plan.yaml | plan_type=composition, source_type=session, source_path, renumber_map, wikilink_map, cross_source_updates | [PASS] — renumber_map is inverse (Event-100→Event-01); cross_source_updates reverts PLAN status to ACCEPTED (inverse of distribution's IN_PROGRESS) |
| session-distribution.plan.yaml | plan_type=distribution, source_type=session, source_path, clusters, renumber_map, wikilink_map, cross_source_updates | [PASS] — renumber_map (Event-01→Event-100, etc.) matches inline TS literal in session-round-trip.test.ts:15-23 verbatim; cross_source_updates targets PLAN with status=IN_PROGRESS matching schema test on session-round-trip.test.ts:55-78 |

## Findings

Stream E's implementation of TASK-010 cleanly resolves both gaps surfaced by QA-014 and QA-015:

1. **Decision adjudication**: chosen the flat-layout path (Option B from the TASK DoD's binary choice). Rationale captured inline in TASK-005/006 DoD amendments ("flat layout — sanctioned by TASK-010-SPEC-002"). Consistent with SPEC-001 fixture convention.

2. **YAML asset creation**: 4 hand-crafted YAML plan fixtures landed at `_shared/composition/tests/fixtures/{analysis,session}-{composition,distribution}.plan.yaml`. Each is a documentation fixture: the round-trip tests still use inline TS `MutationSpec` literals (matching the ADR convention), but the YAMLs are now durable reference artifacts mirroring the inline literals exactly. Round-trip tests confirm the renumber_maps stay in lockstep.

3. **SESSION cross-source coverage**: session-distribution.plan.yaml includes the `cross_source_updates` block (targeting `docs/planning/PLAN-001.md` with `status: IN_PROGRESS`) that mirrors the schema-conformance test at session-round-trip.test.ts:55-78. Inverse plan correctly carries `status: ACCEPTED` for round-trip restoration. This is a notable documentation improvement beyond the strict DoD.

4. **No regressions**: 9/9 round-trip tests pass with no source-code modifications to test files or adapters.

### Notes outside this TASK's scope

- **REQ-005 AC text drift**: REQ-005 acceptance criteria lines 33, 37 still reference `tests/fixtures/analysis/` and `tests/fixtures/session/` (nested). The TASK-010 DoD scoped REQ touch-up out (only TASK-005/006 DoDs in scope); the REQ text mismatch is a residual drift artifact that should be cleaned up in a follow-up REQ amendment but does NOT invalidate this TASK's DoD completion.
- **TASK-005/006 "Files Affected" tables**: still list nested paths (TASK-005 line 39-40, TASK-006 line 42-43). DoD line was amended to flat-with-annotation but Files Affected table was left at the pre-decision form. Cosmetic; does not affect TASK DoD verdict.
- **TASK-010 status field**: frontmatter still reads `status: DRAFT`. Stream E impl died at session limit before status flip. Orchestrator should propagate TASK-010 → DONE via composition-library `transition-impl-item` after this QA report lands.

## Verdict

**PASS** — All 4 TASK-010 DoD items satisfied. Decision locked to flat layout, TASK-005 + TASK-006 DoDs amended with explicit annotation, 4 YAML plan fixtures created with full structural integrity, all round-trip tests pass, and SPEC-001 consistency confirmed.

## Observations

- [outcome] TASK-010-SPEC-002 DoD fully satisfied: flat-layout decision locked + TASK-005/006 DoDs amended + 4 YAML plan fixtures present + 9/9 round-trip tests passing #verdict #pass
- [fact] 4 new YAML files at _shared/composition/tests/fixtures/{analysis,session}-{composition,distribution}.plan.yaml total ~3.4KB; landed in commit 3d74348 #fixtures
- [fact] YAML renumber_maps verified verbatim equivalent to inline TS MutationSpec literals in both round-trip tests #consistency
- [insight] SESSION YAMLs document the cross_source_updates round-trip pattern (distribution: status→IN_PROGRESS, composition: status→ACCEPTED) — exceeds strict DoD with explicit reversibility documentation #cross-source-updates #documentation
- [fact] SPEC-001 ADR fixtures use the same flat convention; no spec-vs-spec drift remains #consistency #spec-001
- [risk] TASK-010 frontmatter still status=DRAFT; orchestrator must run transition-impl-item to flip to DONE after this QA acceptance #state-sync #stream-e-died-at-session-limit
- [insight] REQ-005 AC text (lines 33, 37) still references nested fixture paths; out-of-scope for TASK-010 but follow-up REQ-text amendment recommended for full convention consistency #drift #out-of-scope

## Relations

- implements [[TASK-010-SPEC-002: Reconcile Round-Trip Fixture Layout and YAML Plan Assets]]
- relates_to [[QA-014-SPEC-002: Implement ANALYSIS Adapter Round-Trip Property Test]]
- relates_to [[QA-015-SPEC-002: Implement SESSION Adapter Round-Trip Property Test]]
- relates_to [[TASK-005-SPEC-002: Implement ANALYSIS Adapter Round-Trip Property Test]]
- relates_to [[TASK-006-SPEC-002: Implement SESSION Adapter Round-Trip Property Test]]
- relates_to [[REQ-005-SPEC-002: Round-Trip Property Tests for ANALYSIS and SESSION]]
- part_of [[SPEC-002: Simple Adapters]]