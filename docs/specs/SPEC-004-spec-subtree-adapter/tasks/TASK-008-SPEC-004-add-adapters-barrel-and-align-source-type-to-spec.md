---
title: 'TASK-008-SPEC-004: Add Adapters Barrel and Align sourceType to spec'
type: task
permalink: specs/spec-004-spec-subtree-adapter/tasks/task-008-spec-004-add-adapters-barrel-and-align-source-type-to-spec
status: DONE
effort: S
estimate: 0.5d
tags:
- task
- spec-004
- gap-task
- barrel
- naming
---

# TASK-008-SPEC-004: Add Adapters Barrel and Align sourceType to spec

## Design Context

Gap from QA-020-SPEC-004 retro-validation: TASK-001 DoD requires barrel export + REQ-001 AC1 + DESIGN-001 Component 1 require `sourceType = "spec"`, but implementation has `sourceType = "spec-subtree"` and no barrel file.

## Objective

Create `shared/composition/src/adapters/index.ts` barrel that re-exports `SpecSubtreeAdapter` + sibling adapters, AND adjudicate the `sourceType` value. Two options:

1. Align implementation to REQ-001 AC1 + DESIGN-001 by changing `sourceType` to `"spec"` (and `source_type: z.literal("spec")` in distribution + composition schemas). Update planSchema discriminated union.
2. Amend REQ-001 + DESIGN-001 + ADR-002 D-3 to declare `"spec-subtree"` as canonical. Update referenced ADR.

User adjudication required before code changes.

## Files Affected

| File | Action | Purpose |
|---|---|---|
| shared/composition/src/adapters/index.ts | NEW | Barrel re-exporting all adapters |
| shared/composition/src/adapters/spec-subtree.ts | MODIFY (option 1) | Change sourceType literal |
| shared/composition/schemas/distribution/spec-subtree.plan.schema.ts | MODIFY (option 1) | source_type literal |
| shared/composition/schemas/composition/spec-subtree.plan.schema.ts | MODIFY (option 1) | source_type literal |
| shared/composition/schemas/index.ts | MODIFY (option 1) | Discriminator value in union |

## Definition of Done

- [x] `src/adapters/index.ts` exists exporting `SpecSubtreeAdapter`, `AdrAdapter`, `AnalysisAdapter`, `PlanAdapter`, `SessionAdapter`
- [x] User has adjudicated sourceType choice ("spec" vs "spec-subtree") — locked: "spec" (canonical authority)
- [x] Implementation + schema + tests aligned to adjudicated value
- [x] All existing 27 SPEC-004 tests pass (full suite: 468/468 pass)
- [x] `bunx tsc --noEmit -p tsconfig.json` clean; `bunx biome check` clean

## Observations

- [problem] No barrel file at `src/adapters/index.ts` despite TASK-001 DoD line "Exported from adapters barrel file" #dod-gap
- [problem] `sourceType` is `"spec-subtree"` in impl + schema, but REQ-001 AC1 + DESIGN-001 Component 1 say `"spec"` #naming-drift
- [decision] User adjudication required: align impl to design vs amend design to match impl #pending-decision

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- caused_by [[QA-020-SPEC-004: Implement SPEC Subtree Adapter Recursive Base]]
- extends [[TASK-001-SPEC-004: Implement SPEC Subtree Adapter Recursive Base]]

- validated_by [[QA-036-SPEC-004: TASK-008 Barrel and sourceType Alignment Revalidation]]
