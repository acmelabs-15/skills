---
title: 'TASK-009-SPEC-002: Implement Cross-Source Coordinator Architecture per DESIGN-002'
type: task
permalink: specs/spec-002-simple-adapters/tasks/task-009-spec-002-implement-cross-source-coordinator-architecture-per-design-002
status: ABANDONED
effort: M
estimate: 1.5d
tags:
- task
- spec-002
- gap-task
- cross-source
---

# TASK-009-SPEC-002: Implement Cross-Source Coordinator Architecture per DESIGN-002

## Objective

Resolve the largest drift in SPEC-002: TASK-003 produced a cross-source update mechanism that diverges from DESIGN-002 and REQ-003 on every axis. Either implement DESIGN-002 as specified, or amend DESIGN-002 plus REQ-003 to match the simpler `getCrossSourceUpdates` pass-through that exists in code.

Evidence: QA-012-SPEC-002 (TASK-003 FAIL on 9 of 13 criteria).

Concrete gaps:

1. **File location**: code is in `schemas/distribution/session.plan.schema.ts`; DESIGN-002 mandates `shared/composition/src/core/cross-source.ts`.
2. **Schema shape**: actual `{target_source_type, target_path, frontmatter_map, wikilink_map}` vs DESIGN-002 `{target_note, part_id, field_name: enum, old_value, new_value}`. Entirely different abstraction.
3. **`CrossSourceCoordinator` interface absent** (`applyUpdates`, `reverseUpdates` returning `Promise<boolean>`).
4. **`GracefulDegradationHandler` class absent** (logs warning when PLAN adapter unavailable, returns true, non-blocking).
5. **Rollback / atomicity unimplemented** — REQ-003 AC-3 requires PLAN adapter rejection to trigger full SESSION decomposition abort with no partial writes.
6. **Reversal unimplemented** — REQ-003 AC-4 requires recomposition to restore `owning_session` and `completing_session` original values. Current schema lacks `old_value` so reversal is mechanically impossible.

## Definition of Done

- [ ] Decision locked (decisions phase): implement DESIGN-002 as-spec vs amend DESIGN-002 + REQ-003 to match current `getCrossSourceUpdates`
- [ ] If implement-as-spec path chosen:
  - [ ] `shared/composition/src/core/cross-source.ts` created with `CrossSourceUpdate` Zod schema matching DESIGN-002 C-1 shape
  - [ ] `CrossSourceCoordinator` interface defined with `applyUpdates` and `reverseUpdates`
  - [ ] `GracefulDegradationHandler` class implements `CrossSourceCoordinator` with warning-log and non-blocking proceed
  - [ ] Coordinator resolution wired: GracefulDegradationHandler when PLAN adapter is not registered
  - [ ] Unit tests at `shared/composition/tests/cross-source.test.ts`
  - [ ] All-or-nothing rollback on PLAN adapter rejection
  - [ ] Reversal path validates `old_value` restoration
- [ ] If amend-spec path chosen:
  - [ ] DESIGN-002 rewritten to describe `getCrossSourceUpdates` pass-through with `{target_source_type, target_path, frontmatter_map, wikilink_map}` shape
  - [ ] REQ-003 ACs rewritten to match the simpler abstraction; AC-3 / AC-4 either dropped or restated
  - [ ] TASK-003 DoD rewritten to match
- [ ] All existing tests pass; new tests added per chosen path
- [ ] DESIGN-002 status flipped to ACCEPTED

## Scope

In Scope:

- `shared/composition/src/core/cross-source.ts` (Create if as-spec path)
- `shared/composition/src/adapters/session.ts` (Modify to use coordinator)
- `shared/composition/tests/cross-source.test.ts` (Create if as-spec path)
- `docs/specs/SPEC-002-simple-adapters/design/DESIGN-002-SPEC-002-session-cross-source-coordination-protocol.md` (amend if amend-spec path)
- `docs/specs/SPEC-002-simple-adapters/requirements/REQ-003-SPEC-002-session-cross-source-updates-handling.md` (amend if amend-spec path)

Out of Scope:

- Full PLAN-adapter integration (SPEC-003)
- Renaming `tests/session-cross-source.test.ts` (test stays as-is until coordinator architecture lands)

## Observations

- [fact] Gap discovered by Wave 2 retro-validation; evidence in QA-012-SPEC-002 #gap #retro
- [problem] TASK-003 DoD prescribes architecture (interface, handler, file location) that is entirely unimplemented; current code is a different, simpler abstraction #scope #drift
- [decision] Status: ABANDONED — resolved-by-amendment per ADR-004 D-2; coordinator architecture deferred to SPEC-003 per C-7 tracked pre-constraints. Recorded as CANCELLED until 2026-07-29; renamed to the canonical terminal atom, which carries the same meaning of stopped-deliberately-with-a-rationale #status #abandoned
- [outcome] No code was written; decision locked as D-2 (amend-spec) making this task unnecessary #resolved
- [risk] Decision blocks SPEC-003 PLAN-adapter integration design which assumes DESIGN-002 coordinator architecture #downstream

## Relations

- caused_by [[QA-012-SPEC-002: Implement SESSION Cross-Source Updates Handler]]
- extends [[TASK-003-SPEC-002: Implement SESSION Cross-Source Updates Handler]]
- part_of [[SPEC-002: Simple Adapters]]
- depends_on [[DESIGN-002-SPEC-002: SESSION Cross-Source Coordination Protocol]]
- caused_by [[ADR-004: Cross-Source Coordinator Architecture]]
