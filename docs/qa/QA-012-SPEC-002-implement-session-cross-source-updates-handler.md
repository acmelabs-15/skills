---
title: 'QA-012-SPEC-002: Implement SESSION Cross-Source Updates Handler'
type: qa
permalink: qa/qa-012-spec-002-implement-session-cross-source-updates-handler
status: DONE
tags:
- qa
- spec-002
- cross-source
- retro
---

# QA-012-SPEC-002: Implement SESSION Cross-Source Updates Handler

## Objective

Retro-validate the SESSION cross-source updates handler against TASK-003-SPEC-002 DoD, REQ-003-SPEC-002 acceptance criteria, and DESIGN-002-SPEC-002 compliance points.

- **Feature**: cross-source updates handler — CrossSourceUpdate schema, CrossSourceCoordinator interface, GracefulDegradationHandler
- **Scope**: TASK-003-SPEC-002

## Approach

- **Test Types**: unit, schema-conformance, structural
- **Environment**: bun test v1.3.13; commit 2f049fd
- **Data Strategy**: inline fixtures in session-cross-source.test.ts (no fixture file dedicated to cross-source)
- **Test File**: `_shared/composition/tests/session-cross-source.test.ts`

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 14 | - | - |
| Passed | 5 | - | [FAIL] |
| Failed | 8 | 0 | [FAIL] |
| Skipped | 1 | - | - |
| Assertions | 8 | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| DoD 1 — CrossSourceUpdate Zod schema in src/core/cross-source.ts | DoD | [FAIL] | File _shared/composition/src/core/cross-source.ts does NOT exist; schema lives in schemas/distribution/session.plan.schema.ts instead |
| DoD 2 — CrossSourceCoordinator interface with applyUpdates and reverseUpdates | DoD | [FAIL] | Interface NOT defined anywhere in codebase (grep CrossSourceCoordinator returns 0 hits); SessionAdapter has getCrossSourceUpdates method only |
| DoD 3 — GracefulDegradationHandler class implements CrossSourceCoordinator with warning log | DoD | [FAIL] | Class NOT defined anywhere in codebase (grep GracefulDegradationHandler returns 0 hits) |
| DoD 4 — Coordinator resolves to GracefulDegradationHandler when PLAN adapter is not registered | DoD | [FAIL] | No coordinator resolution logic; PLAN adapter IS registered separately in the dispatcher (SPEC-003); fallback logic is absent |
| DoD 5 — cross_source_updates array validated by Zod at plan load time | DoD | [PASS] | crossSourceUpdateSchema in schemas/distribution/session.plan.schema.ts:11-16; sessionDistributionPlanSchema includes cross_source_updates: array().optional() at line 39 |
| DoD 6 — Unit tests for CrossSourceUpdate schema (valid + invalid) | DoD | [PASS] | session-cross-source.test.ts:25-47 validates positive and negative cases |
| DoD 7 — Unit test for GracefulDegradationHandler (logs warning, returns true) | DoD | [FAIL] | Handler does not exist so test cannot exist |
| DoD 8 — TypeScript compiles | DoD | [PASS] | bun test runs 0 fail across all suites |
| DoD 9 — biome lint passes | DoD | [SKIPPED] | biome not invoked in retro scope |
| REQ-003 AC-1 — SESSION adapter emits cross_source_updates in structured plan output with target_note, part_id, field_name, new_value | REQ | [FAIL] | Actual CrossSourceUpdate shape is {target_source_type, target_path, frontmatter_map?, wikilink_map?} — DOES NOT include part_id, field_name, old_value, new_value fields specified by REQ-003 and DESIGN-002 |
| REQ-003 AC-2 — execution engine coordinates with PLAN adapter | REQ | [FAIL] | No execution engine coordinator exists; method getCrossSourceUpdates surfaces the updates but no apply/reverse path coordinates with a PLAN adapter |
| REQ-003 AC-3 — PLAN adapter rejects update → SESSION decomposition aborts with no partial writes | REQ | [FAIL] | No rollback mechanism wired; getCrossSourceUpdates is read-only pass-through |
| REQ-003 AC-4 — recomposition reverses cross_source_updates restoring owning_session and completing_session | REQ | [FAIL] | No reverseUpdates method; CrossSourceUpdate schema lacks old_value field; reversal impossible against the current shape |
| DESIGN-002 C-1 — CrossSourceUpdate schema fields (target_note, part_id, field_name: enum[owning_session,completing_session], old_value, new_value) | DESIGN | [FAIL] | Actual schema shape diverges entirely: target_source_type literal "plan", target_path, frontmatter_map (record), wikilink_map (record). No part_id, no field_name enum, no old_value, no new_value |
| DESIGN-002 C-2 — CrossSourceCoordinator interface with applyUpdates and reverseUpdates returning Promise boolean | DESIGN | [FAIL] | Interface absent |
| DESIGN-002 C-3 — GracefulDegradationHandler implements CrossSourceCoordinator; logs warning; non-blocking | DESIGN | [FAIL] | Handler absent |

## Findings

TASK-003-SPEC-002 is the most severely drifted TASK in SPEC-002. Implementation departs from DESIGN-002 and REQ-003 on every architectural dimension:

1. **Wrong file location** — the cross-source schema is implemented inline inside `schemas/distribution/session.plan.schema.ts` instead of `src/core/cross-source.ts`.
2. **Schema shape entirely different** — DESIGN-002 prescribes `{target_note, part_id, field_name: enum, old_value, new_value}`; actual is `{target_source_type, target_path, frontmatter_map, wikilink_map}`. None of the DESIGN-002 fields are present.
3. **Coordinator interface absent** — `CrossSourceCoordinator` interface with `applyUpdates(Promise<boolean>)` and `reverseUpdates(Promise<boolean>)` does not exist. Coordination is replaced by a single method `SessionAdapter.getCrossSourceUpdates(content, plan)` returning the pass-through array.
4. **GracefulDegradationHandler absent** — the spec's central degradation mechanism (log warning when PLAN adapter is unavailable, proceed) is unimplemented.
5. **No rollback / atomicity** — REQ-003 AC-3 says PLAN adapter rejection triggers full SESSION decomposition abort with no partial writes. The current implementation has no apply path, so atomicity is moot but unimplemented.
6. **No reversal** — REQ-003 AC-4 demands cross_source_updates reversal during recomposition. The schema has no `old_value` so reversal is mechanically impossible.

REQ-003 acceptance criteria all FAIL. DESIGN-002 compliance all FAIL except the unit tests on the (different) schema shape that does exist.

The behavior provided by the current `cross_source_updates` field is real — it carries `frontmatter_map` and `wikilink_map` for the PLAN target — but this is a different abstraction than DESIGN-002 prescribes. Adopting it would require ADR amendment.

## Verdict

**FAIL** — TASK-003-SPEC-002 is structurally incomplete relative to its DoD, REQ, and DESIGN. The current code provides a partial cross-source emission surface with a different shape than specified. Gap-TASK required.

## Observations

- [outcome] TASK-003-SPEC-002 fails 9 of 13 evaluated criteria; the cross-source coordinator architecture (interface, GracefulDegradationHandler, file placement, schema shape) is essentially unimplemented #verdict #fail
- [fact] src/core/cross-source.ts does not exist; schema is inlined in schemas/distribution/session.plan.schema.ts #drift #file-location
- [fact] CrossSourceUpdate shape diverges entirely from DESIGN-002 — actual {target_source_type, target_path, frontmatter_map, wikilink_map} vs prescribed {target_note, part_id, field_name, old_value, new_value} #drift #schema-shape
- [problem] No CrossSourceCoordinator interface and no GracefulDegradationHandler class; coordination is reduced to a single SessionAdapter method returning the plan's array verbatim #missing #architecture
- [risk] Without old_value field in the schema, recomposition cannot reverse cross-source updates; REQ-003 AC-4 mechanically unsatisfiable against the current shape #blocker #recomposition

## Relations

- implements [[TASK-003-SPEC-002: Implement SESSION Cross-Source Updates Handler]]
- relates_to [[REQ-003-SPEC-002: SESSION Cross-Source Updates Handling]]
- relates_to [[DESIGN-002-SPEC-002: SESSION Cross-Source Coordination Protocol]]
- part_of [[SPEC-002: Simple Adapters]]