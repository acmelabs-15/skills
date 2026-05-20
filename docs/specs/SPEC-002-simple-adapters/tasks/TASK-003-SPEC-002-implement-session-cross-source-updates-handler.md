---
title: 'TASK-003-SPEC-002: Implement SESSION Cross-Source Updates Handler'
type: task
status: TODO
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

- [[DESIGN-002-SPEC-002: SESSION Cross-Source Coordination Protocol]]: implements CrossSourceCoordinator interface and GracefulDegradationHandler

## Objective

Implement the cross_source_updates handler including the CrossSourceUpdate Zod schema, the CrossSourceCoordinator interface, and the GracefulDegradationHandler fallback. This handler enables SESSION decomposition to emit structured updates targeting PLAN note parts (owning_session and completing_session fields) and coordinates with the PLAN adapter when available.

## Definition of Done

- [ ] CrossSourceUpdate Zod schema defined and exported from _shared/composition/src/core/cross-source.ts
- [ ] CrossSourceCoordinator interface defined with applyUpdates and reverseUpdates methods
- [ ] GracefulDegradationHandler class implements CrossSourceCoordinator with warning log and proceed behavior
- [ ] Coordinator resolves to GracefulDegradationHandler when PLAN adapter is not registered
- [ ] cross_source_updates array validated by Zod at plan load time
- [ ] Unit tests for CrossSourceUpdate schema validation (valid + invalid entries)
- [ ] Unit test for GracefulDegradationHandler (logs warning, returns true)
- [ ] TypeScript compiles without errors
- [ ] biome lint passes with no errors

## Scope

**In Scope**:
- _shared/composition/src/core/cross-source.ts (Create)
- Unit tests at _shared/composition/tests/cross-source.test.ts (Create)

**Out of Scope**:
- PLAN adapter implementation (SPEC-003)
- Full integration test with PLAN adapter (deferred to SPEC-003)

## Files Affected

| File | Action | Description |
|------|--------|-------------|
| _shared/composition/src/core/cross-source.ts | Create | CrossSourceUpdate schema, coordinator interface, degradation handler |
| _shared/composition/tests/cross-source.test.ts | Create | Unit tests for schema and degradation handler |

## Effort

| Tier | Human | AI-Dominant | AI-Assisted |
|------|-------|-------------|-------------|
| S | 2d | 0.5d | 1d |

## Observations

- [fact] Status: TODO #status
- [fact] Size tier: S -- schema definition + interface + fallback handler; approximately 80 LOC including tests #estimation
- [decision] GracefulDegradationHandler ensures SPEC-002 ships independently of SPEC-003 PLAN adapter #independence
- [constraint] cross_source_updates entries validated by Zod at plan load time per ADR-002 D-5 #validation

## Relations

- implements [[DESIGN-002-SPEC-002: SESSION Cross-Source Coordination Protocol]]
- implements [[REQ-003-SPEC-002: SESSION Cross-Source Updates Handling]]
- part_of [[SPEC-002: Simple Adapters]]
- depends_on [[TASK-002-SPEC-002: Implement SESSION Adapter]]