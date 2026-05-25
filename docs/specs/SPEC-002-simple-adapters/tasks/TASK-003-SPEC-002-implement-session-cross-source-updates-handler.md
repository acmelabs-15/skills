---
title: 'TASK-003-SPEC-002: Implement SESSION Cross-Source Updates Handler'
type: task
status: DONE
effort: S
estimate: 0.5d
permalink: specs/spec-002-simple-adapters/tasks/task-003-spec-002-implement-session-cross-source-updates-handler
tags:
- task
- spec-002
- cross-source
- coordination
---

# TASK-003-SPEC-002: Implement SESSION Cross-Source Updates Handler

## Design Context

- [[DESIGN-002-SPEC-002: SESSION Cross-Source Coordination Protocol]]: implements getCrossSourceUpdates pass-through method and crossSourceUpdateSchema (amended per ADR-004 D-2)

## Objective

Implement the cross_source_updates handler: the CrossSourceUpdate Zod schema and the SessionAdapter.getCrossSourceUpdates pass-through method. This handler enables SESSION decomposition to emit structured updates targeting sibling PLAN notes via the distribution pipeline's map-based transform model. The orchestrator dispatches application; the adapter only emits.

## Definition of Done

- [x] crossSourceUpdateSchema defined and exported from shared/composition/schemas/distribution/session.plan.schema.ts with shape: target_source_type (literal "plan"), target_path (string min 1), optional frontmatter_map, optional wikilink_map
- [x] CrossSourceUpdate type exported from the same file
- [x] SessionAdapter.getCrossSourceUpdates method implemented as pass-through returning distributionPlan.cross_source_updates or empty array
- [x] SessionAdapter.supportsCrossSourceUpdates flag set to true
- [x] cross_source_updates array validated by Zod at plan load time as optional array of crossSourceUpdateSchema
- [x] Unit tests for crossSourceUpdateSchema validation (valid + invalid entries)
- [x] Unit test for getCrossSourceUpdates returning plan entries when present
- [x] Unit test for getCrossSourceUpdates returning empty array when cross_source_updates absent
- [x] TypeScript compiles without errors
- [x] biome lint passes with no errors

## Scope

**In Scope**:

- shared/composition/schemas/distribution/session.plan.schema.ts (crossSourceUpdateSchema and type)
- shared/composition/src/adapters/session.ts (getCrossSourceUpdates method)
- Unit tests at shared/composition/tests/session-cross-source.test.ts

**Out of Scope**:

- PLAN adapter implementation (SPEC-003)
- CrossSourceCoordinator interface (deferred to SPEC-003 per ADR-004 D-2)
- GracefulDegradationHandler class (deferred to SPEC-003 per ADR-004 D-2)
- Rollback/reversal protocols (deferred to SPEC-003 per ADR-004 C-7)
- Full integration test with PLAN adapter (deferred to SPEC-003)

## Files Affected

| File | Action | Description |
|------|--------|-------------|
| shared/composition/schemas/distribution/session.plan.schema.ts | Modify | crossSourceUpdateSchema and CrossSourceUpdate type |
| shared/composition/src/adapters/session.ts | Modify | getCrossSourceUpdates pass-through method |
| shared/composition/tests/session-cross-source.test.ts | Create/Modify | Unit tests for schema and pass-through method |

## Effort

| Tier | Human | AI-Dominant | AI-Assisted |
|------|-------|-------------|-------------|
| S | 2d | 0.5d | 1d |

## Observations

- [fact] Status: TODO #status
- [fact] Size tier: S -- schema definition + pass-through method; approximately 50 LOC including tests #estimation
- [decision] Pass-through model per ADR-004 D-2; no coordinator interface or handler class in SPEC-002 scope #pass-through #yagni
- [constraint] cross_source_updates entries validated by Zod at plan load time per ADR-002 D-5 #validation
- [fact] DoD amended 2026-05-21 per ADR-004 D-2 to match pass-through architecture; removed coordinator/handler DoD items #amendment
- [fact] C-8 duplicate reconciliation: only one TASK-003-SPEC-002 file exists on disk; Brain MCP search duplicate hits were relation-edge entries not separate note files #reconciled

## Relations

- validated_by [[QA-042-SPEC-002: Spec Aggregate Retro-Validation]]
- implements [[DESIGN-002-SPEC-002: SESSION Cross-Source Coordination Protocol]]
- implements [[REQ-003-SPEC-002: SESSION Cross-Source Updates Handling]]
- part_of [[SPEC-002: Simple Adapters]]
- depends_on [[TASK-002-SPEC-002: Implement SESSION Adapter]]
