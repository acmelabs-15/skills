---
title: 'TASK-005-SPEC-007: Implement TaskNote Schema and Parser'
type: task
permalink: specs/spec-007-plan-session-render/tasks/task-005-spec-007-implement-task-note
status: IN_PROGRESS
effort: M
estimate: 1d
tags:
  - task
  - spec-007
  - schema
  - parser
---

# TASK-005-SPEC-007: Implement TaskNote Schema and Parser

## Design Context

This TASK realizes REQ-005-SPEC-007 and the task-note.ts schema in support of
the per-TASK build+qa protocol. The schema is the load-bearing mechanical
contract that converts implementer "done" claims into pass/fail outcomes.

## Objective

Create `_shared/composition/src/schemas/task-note.ts`, the matching parser at
`_shared/composition/src/parsers/task-note.ts`, and a DoD claim validator at
`_shared/composition/src/validators/task-claim-validator.ts`. Together they
enforce that a TASK claim done requires every Definition of Done item checked
or deferred-with-rationale.

## Scope

**In Scope**:

- TaskNoteSchema mirroring CONVENTIONS Section 4.8 (TASK structure)
- Parser extracting every H2 section via unified+remark+ast-helpers
- DoD claim validator returning PASS or FAIL with per-item findings
- ADR-compliance symmetric variant

**Out of Scope**:

- TaskNote renderer (current write-path stays through opaque mutations)
- RequirementNote / DesignNote / SpecRootNote / QaNote schemas (X.D.6, X.D.7)
- Adapter or mutation layer changes

## Implementation Notes

Parser mirrors plan-note parser structure. Section detection uses top-level
H2s. Scope section walks for strong-text markers "**In Scope**:" and
"**Out of Scope**:" then finds the next list. Files Affected is a GFM table.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/schemas/task-note.ts` | NEW | TaskNote Zod schema |
| `_shared/composition/src/parsers/task-note.ts` | NEW | Markdown to TaskNote parser |
| `_shared/composition/src/validators/task-claim-validator.ts` | NEW | DoD claim validator function |
| `_shared/composition/tests/task-note-schema.test.ts` | NEW | Schema validation tests |
| `_shared/composition/tests/task-note-parser.test.ts` | NEW | Parser round-trip tests |
| `_shared/composition/tests/task-claim-validator.test.ts` | NEW | Validator behavior tests |

## Testing Requirements

- Valid TaskNote parses cleanly through schema
- Status DONE with any unchecked-and-non-deferred DoD item rejected
- Files Affected table parses to typed objects
- Validator returns PASS for all-checked or all-deferred lists
- Validator returns FAIL with per-item index and text for unchecked items

## Definition of Done

- [ ] TaskNoteSchema exported with strict objects and superRefine invariants
- [ ] parseTaskNote function exported and round-trips the fixture
- [ ] validateTaskDoneClaim returns expected verdict shape
- [ ] validateTaskAdrComplianceClaim handles missing section as PASS total 0
- [ ] biome check passes
- [ ] tsc --noEmit passes

## ADR Compliance

- [ ] Honors ADR-003 D-4: Zod schema as validation contract
- [ ] Honors CRIT-003 F-1: common.ts shared primitives reused

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Schema + parser + validator authoring |
| AI-Dominant | 0.5d | Pattern mirrors existing plan-note implementation |
| AI-Assisted | 0.75d | Tests and fixture content require careful crafting |

## Observations

- [decision] DoD checklist is the mechanical contract; schema rejection makes silent skip impossible #protocol #enforcement
- [technique] Parser mirrors plan-note.ts structure for consistency across the composition library #consistency #pattern
- [constraint] TaskNote frontmatter status uses TODO not PENDING per CONVENTIONS Section 4.8 #enum #convention

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[REQ-005-SPEC-007: TaskNote Schema and Parser]]
