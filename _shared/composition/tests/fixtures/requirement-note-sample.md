---
title: 'REQ-006-SPEC-007: RequirementNote Schema and Parser'
type: requirement
permalink: specs/spec-007-plan-session-render/requirements/req-006-spec-007-requirement-note
status: DRAFT
tags:
  - requirement
  - spec-007
  - schema
  - parser
---

# REQ-006-SPEC-007: RequirementNote Schema and Parser

## Requirement Statement

WHEN an orchestrator or QA agent needs to validate that an implementation
satisfies a REQ's acceptance criteria
THE SYSTEM SHALL provide a RequirementNoteSchema, parseRequirementNote
function, and validateRequirementAcClaim validator at
`_shared/composition/src/{schemas,parsers,validators}/requirement-note.ts`
SO THAT a REQ claim "ACCEPTED" mechanically requires every Acceptance Criteria
item to be [x] OR deferred-with-rationale, making silent skip impossible.

## Pattern

Shared Schema (imported by orchestrator QA aggregation and adapter layer).

## Priority

P0 -- foundational; downstream QA loops depend on REQ-level claim validation.

## Category

Functional

## Context

ADR-003 D-4 specifies that REQ notes carry the QA contract via their
Acceptance Criteria checkbox list. The X.D.5 round delivered the equivalent
contract for TASK notes (Definition of Done). This REQ extends the pattern
to the REQ layer so QA can iterate uniformly across both TASK and REQ
claim shapes via the shared `ClaimResult` type.

## Acceptance Criteria

- [ ] GIVEN a markdown file with a valid REQ frontmatter
      WHEN parsed via parseRequirementNote
      THEN the resulting RequirementNote object validates against RequirementNoteSchema with no errors

- [ ] GIVEN a RequirementNote with status ACCEPTED and one unchecked
      acceptance_criteria item lacking deferred_rationale
      WHEN parsed against RequirementNoteSchema
      THEN validation FAILS with a message citing the unsatisfied items

- [ ] GIVEN a RequirementNote with status ACCEPTED and every acceptance_criteria
      item checked or deferred
      WHEN parsed against RequirementNoteSchema
      THEN validation PASSES

- [ ] GIVEN a RequirementNote with status DRAFT and unchecked acceptance_criteria
      WHEN parsed against RequirementNoteSchema
      THEN validation PASSES (mechanical contract only fires at ACCEPTED)

- [ ] GIVEN validateRequirementAcClaim called on a RequirementNote with all AC checked
      WHEN evaluated
      THEN it returns { verdict: "PASS", total: N }

- [ ] GIVEN validateRequirementAcClaim called on a RequirementNote with mixed checked/unchecked AC
      WHEN evaluated
      THEN it returns { verdict: "FAIL", total: N, unsatisfied: [{ index, text }, ...] } citing each failing item

## Implementation Notes

Parser mirrors TaskNote parser structure. Acceptance Criteria is a GFM
checkbox list parsed identically to Definition of Done — including the
`(deferred: ...)` suffix convention for deferred items. The EARS body of each
AC bullet is preserved verbatim as the `text` field; this schema does not
parse WHEN/SHALL/SO THAT into typed sub-fields.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/schemas/requirement-note.ts` | NEW | RequirementNote Zod schema |
| `_shared/composition/src/parsers/requirement-note.ts` | NEW | Markdown to RequirementNote parser |
| `_shared/composition/src/validators/requirement-claim-validator.ts` | NEW | AC claim validator function |

## Observations

- [requirement] Acceptance Criteria is the mechanical QA contract at the REQ layer #protocol #enforcement
- [technique] Parser mirrors TaskNote parser structure for consistency across the composition library #consistency #pattern
- [decision] ClaimResult lifted to validators/types.ts for shared shape across TASK/REQ/DESIGN validators #shared-type #dry

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
