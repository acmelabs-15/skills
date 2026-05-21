---
title: 'TASK-007-SPEC-002: Reconcile ANALYSIS Adapter DESIGN-001 Drift'
type: task
permalink: specs/spec-002-simple-adapters/tasks/task-007-spec-002-reconcile-analysis-adapter-design-001-drift
status: DRAFT
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

- [ ] DESIGN-001-SPEC-002 vs code drift documented in decision ledger
- [ ] Either DESIGN-001 amended OR base class + AnalysisAdapter updated to honor `identifierPrefix`
- [ ] Either DESIGN-001 amended OR `/i` flag removed from `identifierPattern`
- [ ] All ANALYSIS adapter tests still pass after reconciliation
- [ ] DESIGN-001 status flipped to ACCEPTED once reconciled

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

## Relations

- caused_by [[QA-010-SPEC-002: Implement ANALYSIS Adapter]]
- extends [[TASK-001-SPEC-002: Implement ANALYSIS Adapter]]
- part_of [[SPEC-002: Simple Adapters]]