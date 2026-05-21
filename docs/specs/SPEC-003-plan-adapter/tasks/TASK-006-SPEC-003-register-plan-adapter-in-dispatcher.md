---
title: 'TASK-006-SPEC-003: Register PlanAdapter in Dispatcher'
type: task
permalink: specs/spec-003-plan-adapter/tasks/task-006-spec-003-register-plan-adapter-in-dispatcher-1
status: DRAFT
effort: XS
estimate: 0.25d
tags:
- task
- spec-003
- gap-task
- dispatcher
---

# TASK-006-SPEC-003: Register PlanAdapter in Dispatcher

## Design Context

Gap-TASK surfaced during SPEC-003 Wave 2 retro-validation (TEST-REPORT-010-SPEC-003). DESIGN-001-SPEC-003 Component 1 Responsibilities lists "Registers as source_type 'plan' in the adapter dispatcher" but `src/core/dispatcher.ts` only registers adr/analysis/session.

## Objective

Add `PlanAdapter` to the adapter registry in `src/core/dispatcher.ts` so `getAdapter("plan")` returns a `PlanAdapter` instance instead of throwing.

## Scope

In Scope: import PlanAdapter; add `["plan", new PlanAdapter()]` to the registry; add a dispatcher test asserting `getAdapter("plan").sourceType === "plan"`.
Out of Scope: PlanAdapter implementation changes; SPEC-002/004/007 dispatcher entries (those are sibling agent scope).

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| _shared/composition/src/core/dispatcher.ts | MODIFY | Register PlanAdapter under source_type "plan" |
| _shared/composition/tests/dispatcher.test.ts | MODIFY | Add coverage that getAdapter("plan") returns a PlanAdapter |

## Definition of Done

- [ ] dispatcher.ts imports PlanAdapter
- [ ] dispatcher.ts registry contains ["plan", new PlanAdapter()]
- [ ] dispatcher.test.ts asserts getAdapter("plan") returns instance whose sourceType === "plan"
- [ ] All existing dispatcher.test.ts cases still pass
- [ ] listAdapters() includes "plan"

## ADR Compliance

- [ ] Honors ADR-002 D-3: PLAN registers as source_type "plan" in dispatcher

## Observations

- [problem] dispatcher.ts:6-10 does not include "plan" entry; getAdapter("plan") throws #integration-gap
- [decision] Gap surfaced during 2026-05-21 retro-validation; original TASK-001 did not include this responsibility despite DESIGN-001 listing it #scope-gap

## Relations

- part_of [[SPEC-003: PLAN Adapter]]
- caused_by [[TEST-REPORT-010-SPEC-003: PLAN Adapter Base]]
- extends [[TASK-001-SPEC-003: Implement PLAN Adapter Base]]
- implements [[DESIGN-001-SPEC-003: PLAN Adapter Architecture]]