---
title: 'DESIGN-003-SPEC-007: Mutation API and Invariant Enforcement'
type: design
permalink: specs/spec-007-plan-session-render/design/design-003-spec-007-mutation-api-design
status: DRAFT
tags:
- design
- spec-007
- mutation-api
- invariants
---

# DESIGN-003-SPEC-007: Mutation API and Invariant Enforcement

## Context

ADR-003 D-3 replaces LLM-authored edit_note cycles with a typed mutation API. This design specifies the mutation type system, the read-parse-mutate-validate-render-write pipeline, invariant enforcement at each stage, and how side-channel propagation (Progress Dashboard, Mermaid, status consistency) happens implicitly through full re-render.

## Mutation Type System

Plan mutations are a discriminated union on a `type` field:

```typescript
type PlanMutation =
  | { type: 'set-part-substatus'; partId: string; from: string; to: string; completing_session?: string; outcome?: Outcome }
  | { type: 'lock-decision'; partId: string; decisionId: string; topic: string }
  | { type: 'flip-dod-item'; partId: string; dodIndex: number; done: boolean }
  | { type: 'add-task'; task: Omit<Task, 'resolved_at_event'> }
  | { type: 'transition-task'; taskId: string; from: string; to: string; atEvent?: number }
  | { type: 'surface-pending-decision'; pud: PendingDecision }
  | { type: 'resolve-pending-decision'; pudId: string; selectedOption: string }
  | { type: 'add-blocker'; text: string }
  | { type: 'clear-blockers' };
```

Session mutations:

```typescript
type SessionMutation =
  | { type: 'append-event'; event: Event };
```

Each mutation type is validated by a dedicated Zod schema before application.

## Pipeline

```text
applyPlanMutation(planPath, mutation):
  1. Read:      md = await Bun.file(planPath).text()
  2. Parse:     model = parsePlanNote(md)
  3. Mutate:    model = applyMutationToModel(model, mutation)
  4. Validate:  PlanNoteSchema.parse(model)  // throws on invariant violation
  5. Render:    newMd = renderPlanNote(model)  // regenerates Dashboard + Mermaid
  6. Write:     await Bun.write(planPath, newMd)
```

If step 4 (validation) fails, steps 5-6 are skipped. The file remains unchanged. No partial state is possible.

## Invariant Enforcement

| Invariant | Enforcement Point | Mechanism |
| --- | --- | --- |
| DONE part must have outcome | Step 4 (PlanNoteSchema) | PartSchema.refine() |
| DONE task must have resolved_at_event | Step 4 (PlanNoteSchema) | TaskSchema.refine() |
| task.part references valid part | Step 4 (PlanNoteSchema) | superRefine cross-field check |
| part.depends_on references valid part | Step 4 (PlanNoteSchema) | superRefine cross-field check |
| All-terminal parts implies plan not IN_PROGRESS | Step 4 (PlanNoteSchema) | superRefine cross-field check |
| Event numbers continuous from 1 | Step 4 (SessionNoteSchema) | superRefine cross-field check |
| First event is session-start | Step 4 (SessionNoteSchema) | superRefine cross-field check |
| Progress Dashboard matches actual substatus counts | Step 5 (renderPlanNote) | Dashboard regenerated from parts |
| Mermaid graph matches substatus and depends_on | Step 5 (renderPlanNote) | Mermaid regenerated from parts |

## Side-Channel Propagation

The key insight: side-channel propagation is free because it happens during render, not as separate mutation steps.

When `set-part-substatus` changes a part from IN_PROGRESS to DONE:

1. The in-memory model's part.substatus changes
2. renderPlanNote regenerates Progress Dashboard from ALL parts' substatuses (automatic count update)
3. renderPlanNote calls renderMermaid which reads ALL parts' substatuses (automatic class reassignment)
4. The entire document is re-rendered with consistent state

No separate "update dashboard" or "update mermaid" step is needed. This eliminates the 30+ sequential edit_note calls that caused the original drift.

## Error Handling

Mutations that would violate schema invariants are rejected before writing:

- `set-part-substatus` to DONE without outcome: PlanNoteSchema.parse() throws
- `transition-task` to DONE without atEvent: TaskSchema.refine() throws
- `add-task` referencing non-existent part: superRefine throws
- `append-event` with non-continuous number: SessionNoteSchema superRefine throws

Error messages include Zod issue paths for debugging.

## Observations

- [design] Mutation pipeline follows read-parse-mutate-validate-render-write with schema validation as the gate before writing #pipeline #validation-gate
- [insight] Side-channel propagation (Dashboard, Mermaid) is free because it happens during render not as separate steps #propagation #implicit
- [decision] 9 plan mutations + 1 session mutation cover all state transitions identified in ADR-003 #mutation-types #complete
- [technique] Zod cross-field invariants in superRefine catch violations that incremental edit_note silently accepted #invariant-enforcement #zod

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
- relates_to [[DESIGN-001-SPEC-007: Composition Layer Architecture]]
