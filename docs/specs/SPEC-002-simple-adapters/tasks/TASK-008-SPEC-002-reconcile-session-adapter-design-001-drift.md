---
title: 'TASK-008-SPEC-002: Reconcile SESSION Adapter DESIGN-001 Drift'
type: task
permalink: specs/spec-002-simple-adapters/tasks/task-008-spec-002-reconcile-session-adapter-design-001-drift
status: DRAFT
effort: S
estimate: 0.5d
tags:
- task
- spec-002
- gap-task
- session-adapter
---

# TASK-008-SPEC-002: Reconcile SESSION Adapter DESIGN-001 Drift

## Objective

Reconcile four pieces of DESIGN-001-SPEC-002 vs code drift for the SESSION adapter discovered in Wave 2 retro-validation (QA-011-SPEC-002):

1. `identifierPrefix = "Event "` declared in DESIGN-001 Component 2 is absent in `_shared/composition/src/adapters/session.ts`.
2. `supportsCrossSourceUpdates = true` declared in DESIGN-001 Component 2 is absent. Cross-source emission is exposed via a `getCrossSourceUpdates(content, plan)` method instead. TASK-002 DoD item 7 explicitly demands the boolean property.
3. `identifierPattern` is `/Event-(\\d+)/i` (hyphen separator, /i flag); DESIGN-001 specifies `/Event (\\d+)/` (space separator, no flag). REQ-002 AC-3 says "Event-NN format" so REQ-002 wins; DESIGN-001 needs amendment.
4. Fixture `tests/fixtures/session-sample.md` uses mixed `## Event 01` section headings (space-separated, no hyphen) and `Event-01` body tokens (hyphenated). Renumbering targets only the hyphen form. Convention must be unified.

## Definition of Done

- [ ] DESIGN-001 amended to align with REQ-002 (Event-NN hyphenated identifier) OR REQ-002 amended to align with DESIGN-001 (Event space-separated)
- [ ] `identifierPrefix` either added to base class + subclasses OR dropped from DESIGN-001
- [ ] `supportsCrossSourceUpdates` either added to SessionAdapter OR dropped from DESIGN-001 and TASK-002 DoD
- [ ] `/i` flag either sanctioned in DESIGN-001 or removed from code
- [ ] Fixture convention unified (section delimiter + body token use same form)
- [ ] All SESSION adapter and round-trip tests pass after reconciliation
- [ ] DESIGN-001 status flipped to ACCEPTED

## Scope

In Scope:
- `_shared/composition/src/adapters/session.ts` (modify)
- `_shared/composition/src/core/base-markdown-adapter.ts` (modify if abstract slots added)
- `docs/specs/SPEC-002-simple-adapters/design/DESIGN-001-SPEC-002-basemarkdownadapter-configuration-pattern.md` (amend if spec-amendment path chosen)
- `_shared/composition/tests/fixtures/session-sample.md` (revise convention)

Out of Scope:
- Cross-source coordinator architecture (handled by TASK-009)
- Round-trip fixture file layout (handled by TASK-011)

## Observations

- [fact] Gap discovered by Wave 2 retro-validation; evidence in QA-011-SPEC-002 #gap #retro
- [decision] Status: DRAFT pending reconciliation decisions across four drift dimensions #status
- [risk] Fixture convention mix (space vs hyphen) is latent: round-trip works only because renumber_map targets the hyphen form; future fixture additions could expose this #convention

## Relations

- caused_by [[QA-011-SPEC-002: Implement SESSION Adapter]]
- extends [[TASK-002-SPEC-002: Implement SESSION Adapter]]
- part_of [[SPEC-002: Simple Adapters]]