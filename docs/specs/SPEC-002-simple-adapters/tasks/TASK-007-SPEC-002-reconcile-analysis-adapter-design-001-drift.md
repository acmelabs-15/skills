---
title: 'TASK-007-SPEC-002: Reconcile ANALYSIS Adapter DESIGN-001 Drift'
type: task
permalink: specs/spec-002-simple-adapters/tasks/task-007-spec-002-reconcile-analysis-adapter-design-001-drift
status: DONE
effort: XS
estimate: 0.25d
tags:
- task
- spec-002
- gap-task
- analysis-adapter
---

# TASK-007-SPEC-002: Reconcile ANALYSIS Adapter DESIGN-001 Drift

## Objective

Reconcile two pieces of DESIGN-001-SPEC-002 vs code drift for the ANALYSIS adapter discovered in Wave 2 retro-validation (QA-010-SPEC-002):

1. `identifierPrefix` property declared in DESIGN-001 Component 1 + Component 3 AdapterConfig is absent in `_shared/composition/src/adapters/analysis.ts`. The base class `BaseMarkdownAdapter` also lacks the abstract slot.
2. `identifierPattern` in code is `/item-(\\d+)/i` (case-insensitive flag); DESIGN-001 specifies `/item-(\\d+)/` (no flag).

Reconciliation paths (decide via decisions phase):

- Amend DESIGN-001 to drop `identifierPrefix` and add `/i` flag, or
- Add `identifierPrefix` to base class plus subclasses; remove `/i` flag from code

## Definition of Done

- [x] DESIGN-001-SPEC-002 vs code drift documented in decision ledger
- [x] Either DESIGN-001 amended OR base class + AnalysisAdapter updated to honor `identifierPrefix` — code amended: `identifierPrefix = "item-"` added to AnalysisAdapter
- [x] Either DESIGN-001 amended OR `/i` flag removed from `identifierPattern` — DESIGN-001 amended: `/i` flag added to documented pattern (matches code intent of case-insensitive prefix matching)
- [x] All ANALYSIS adapter tests still pass after reconciliation — `bun test tests/analysis-adapter.test.ts tests/analysis-round-trip.test.ts`: 8 pass / 0 fail
- [ ] DESIGN-001 status flipped to ACCEPTED once reconciled — DEFERRED to TASK-008 completion (DESIGN-001 covers both ANALYSIS and SESSION; status flip gated on SESSION drift reconciliation in TASK-008)

## Scope

In Scope:

- `_shared/composition/src/adapters/analysis.ts` (modify)
- `_shared/composition/src/core/base-markdown-adapter.ts` (modify if abstract slot is added)
- `docs/specs/SPEC-002-simple-adapters/design/DESIGN-001-SPEC-002-basemarkdownadapter-configuration-pattern.md` (amend if spec-amendment path chosen)

Out of Scope:

- Reconciling SESSION adapter DESIGN-001 drift (separate gap-TASK)
- DESIGN-002 cross-source coordinator drift (separate gap-TASK)

## Observations

- [fact] Gap discovered by Wave 2 retro-validation; evidence in QA-010-SPEC-002 #gap #retro
- [decision] Status: DRAFT pending reconciliation decision (amend spec vs amend code) #status
- [outcome] Reconciled 2026-05-21 via hybrid path: code added `identifierPrefix = "item-"`; DESIGN-001 amended to add `/i` flag #reconciled #hybrid-path
- [fact] `bun test tests/analysis-adapter.test.ts tests/analysis-round-trip.test.ts`: 8 pass / 0 fail post-change #verification #tests

## Relations

- caused_by [[QA-010-SPEC-002: Implement ANALYSIS Adapter]]
- extends [[TASK-001-SPEC-002: Implement ANALYSIS Adapter]]
- part_of [[SPEC-002: Simple Adapters]]

- validated_by [[QA-031-SPEC-002: TASK-007 Fix Iter-1 Revalidation]]
