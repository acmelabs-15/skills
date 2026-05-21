---
title: 'REQ-012-SPEC-007: PLAN-001 Dogfood Migration'
type: requirement
permalink: specs/spec-007-plan-session-render/requirements/req-012-spec-007-plan-001-dogfood-migration
status: ACCEPTED
tags:
- requirement
- spec-007
- migration
- dogfood
---

# REQ-012-SPEC-007: PLAN-001 Dogfood Migration

## Requirement Statement

WHEN the plan-note parser, renderer, and mutation API are functional
THE SYSTEM SHALL migrate PLAN-001-skills-ecosystem.md from the original template to the trimmed template form by parsing the current PLAN-001, dropping removed sections (Workflow Plan prose, Decision Log, Progress Log, per-part Tasks/Editor Mirror IDs/Pending User Decisions/Intra-part Deps Graph), consolidating Tasks at top level with Part column, re-rendering via renderPlanNote, and iterating until round-trip char-identity holds against the new trimmed canonical form
SO THAT the migration plan from ADR-003 is proven against the project's own plan note, validating the full pipeline end-to-end.

## Pattern

Migration (one-time transformation of existing artifact to new template; dogfood validation).

## Priority

P1 -- migration follows after core pipeline is proven via round-trip test.

## Category

Functional

## Context

ADR-003 Implementation Notes Migration plan specifies: parse current PLAN-001, drop the dropped sections, consolidate Tasks, render, diff, iterate until char-identity holds. ANALYSIS-002 Appendix I describes the dogfooding sequence. This REQ is the proof that the trimmed template works on a real 3000+ line plan note.

## Acceptance Criteria

- [ ] GIVEN the current PLAN-001-skills-ecosystem.md
      WHEN the migration script or manual process applies the template transformation
      THEN the output matches the trimmed PLAN template structure from ANALYSIS-002 Appendix A

- [ ] GIVEN the migrated PLAN-001
      WHEN parsePlanNote is called
      THEN PlanNoteSchema validation passes with no errors

- [ ] GIVEN the migrated PLAN-001
      WHEN render(parse(migrated)) is applied
      THEN SHA-256 char-identity holds (round-trip passes)

- [ ] GIVEN the migrated PLAN-001
      WHEN compared to the original via git diff
      THEN dropped sections (Workflow Plan, Decision Log, Progress Log, per-part duplicates) are absent
      AND consolidated sections (Tasks, Editor Mirror IDs, Pending User Decisions) are at top level
      AND all state data (part substatuses, task statuses, outcomes) is preserved

## Implementation Notes

The migration can be done via a one-time script or a manual parse-transform-render cycle. The critical gate is round-trip char-identity on the migrated form. Historical task data from per-part tables must be consolidated into the top-level three-table split with Part column added.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `docs/planning/PLAN-001-skills-ecosystem.md` | MODIFY | Migrate to trimmed template |

## Observations

- [requirement] PLAN-001 dogfood migration proves the trimmed template against a real 3000+ line plan note #dogfood #migration
- [constraint] All state data must be preserved through migration; only structural form changes #data-preservation #migration
- [insight] About 70% bulk reduction expected from consolidation and responsibility-split enforcement #bloat-reduction #estimate

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
- depends_on [[REQ-011-SPEC-007: Round-Trip Property Test]]
- depends_on [[REQ-009-SPEC-007: Plan Mutation API]]
- [outcome] AC validation deferred: TASK-013 FAIL (QA-022); gap-TASK TASK-014 filed and ready for build #blocked #deferred
