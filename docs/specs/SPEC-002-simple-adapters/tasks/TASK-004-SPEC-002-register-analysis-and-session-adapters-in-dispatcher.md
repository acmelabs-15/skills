---
title: 'TASK-004-SPEC-002: Register ANALYSIS and SESSION Adapters in Dispatcher'
type: task
status: DONE
effort: S
estimate: 1d
permalink: specs/spec-002-simple-adapters/tasks/task-004-spec-002-register-analysis-and-session-adapters-in-dispatcher
tags:
- task
- spec-002
- registry
- dispatcher
---

# TASK-004-SPEC-002: Register ANALYSIS and SESSION Adapters in Dispatcher

## Design Context

- [[DESIGN-001-SPEC-002: BaseMarkdownAdapter Configuration Pattern]]: both adapters are registered as static imports in the dispatcher

## Objective

Extend the adapter dispatcher established in SPEC-001 to register AnalysisAdapter and SessionAdapter. Extend the Zod discriminated union schema to include "analysis" and "session" source_type variants with their type-specific fields. After this task, the CLI entry points (decompose.ts and recompose.ts) can resolve plan YAMLs with source_type "analysis" or "session" to the correct adapter.

## Definition of Done

- [x] Adapter dispatcher imports and registers AnalysisAdapter for source_type "analysis"
- [x] Adapter dispatcher imports and registers SessionAdapter for source_type "session"
- [x] Zod discriminated union extended with ANALYSIS variant (analysis-specific plan fields)
- [x] Zod discriminated union extended with SESSION variant (session-specific plan fields including cross_source_updates)
- [x] Dispatcher resolves source_type "analysis" to AnalysisAdapter instance
- [x] Dispatcher resolves source_type "session" to SessionAdapter instance
- [x] Existing ADR adapter registration unchanged (regression safe)
- [x] TypeScript compiles without errors
- [x] biome lint passes with no errors

## Scope

**In Scope**:

- _shared/composition/src/core/dispatcher.ts (Modify -- add registrations)
- _shared/composition/schemas/distribution/analysis.plan.schema.ts (Create)
- _shared/composition/schemas/distribution/session.plan.schema.ts (Create)
- _shared/composition/schemas/composition/analysis.plan.schema.ts (Create)
- _shared/composition/schemas/composition/session.plan.schema.ts (Create)
- _shared/composition/schemas/index.ts (Modify -- extend discriminated union)

**Out of Scope**:

- Adapter implementation (TASK-001, TASK-002)
- Round-trip tests (TASK-005, TASK-006)

## Files Affected

| File | Action | Description |
|------|--------|-------------|
| _shared/composition/src/core/dispatcher.ts | Modify | Add ANALYSIS + SESSION adapter registrations |
| _shared/composition/schemas/distribution/analysis.plan.schema.ts | Create | ANALYSIS distribution plan Zod schema |
| _shared/composition/schemas/distribution/session.plan.schema.ts | Create | SESSION distribution plan Zod schema |
| _shared/composition/schemas/composition/analysis.plan.schema.ts | Create | ANALYSIS composition plan Zod schema |
| _shared/composition/schemas/composition/session.plan.schema.ts | Create | SESSION composition plan Zod schema |
| _shared/composition/schemas/index.ts | Modify | Extend discriminated union with ANALYSIS + SESSION variants |

## Effort

| Tier | Human | AI-Dominant | AI-Assisted |
|------|-------|-------------|-------------|
| S | 2d | 1d | 1d |

## Observations

- [fact] Status: TODO #status
- [fact] Size tier: S -- 4 schema files (approximately 30 LOC each) + 2 dispatcher modifications; total approximately 150 LOC #estimation
- [decision] Schema files follow SPEC-001 DESIGN-003 modular layout: distribution/ and composition/ subdirectories per source type #schema-layout
- [constraint] Existing ADR adapter registration must remain unchanged; regression safety required #regression

## Relations

- validated_by [[QA-042-SPEC-002: Spec Aggregate Retro-Validation]]
- implements [[REQ-004-SPEC-002: Adapter Registry Extension]]
- implements [[DESIGN-001-SPEC-002: BaseMarkdownAdapter Configuration Pattern]]
- part_of [[SPEC-002: Simple Adapters]]
- depends_on [[TASK-001-SPEC-002: Implement ANALYSIS Adapter]]
- depends_on [[TASK-002-SPEC-002: Implement SESSION Adapter]]
