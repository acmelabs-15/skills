---
title: 'TASK-047-SPEC-008: Add H1-Drift Detection to CRIT Parser'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-047-spec-008-add-h1-drift-detection-to-crit-parser
status: DONE
effort: S
estimate: 0.25d
tags:
- spec-008
- parser
- crit
- h1-drift
- wave-1c
---

# TASK-047-SPEC-008: Add H1-Drift Detection to CRIT Parser

## Description

Follow-up TASK authored 2026-05-24 SESSION-2026-05-23_02 Event 77 to close the REQ-001 AC-5 coverage gap surfaced during Batch 5c closure (Event 76). REQ-001 AC-5 requires that a CRIT note whose H1 does not match its frontmatter title verbatim is rejected. The original AC text said `CritNoteSchema.parse()` would detect this, but the schema validates the parsed model which carries no raw H1 string by design (schemas validate intrinsic structure; AST extraction is parser-layer). QA-059 (CRIT schema) and QA-060 (CRIT parser) each deferred the AC to the other; neither implemented the check. AC-5 was reworded (Event 77 per D-4 LOCKED) to assert parser-layer detection.

This TASK adds the H1-vs-frontmatter-title verbatim comparison to `parseCritNote` at `shared/composition/src/parsers/crit-note.ts`. The `extractH1(ast)` helper already exists at `shared/composition/src/parsers/ast-helpers.ts:140`; the parser must call it, compare against `frontmatter.title` verbatim, and throw a clear error naming the drift when they differ.

Scope is intentionally minimal: ONE comparison + throw added to the existing `parseCritNote`, plus tests. Does NOT touch the schema, other parsers, or the wrapper-derived-property pattern.

## Definition of Done

- [x] `parseCritNote` in `shared/composition/src/parsers/crit-note.ts` calls `extractH1(ast)` and compares the result against `frontmatter.title` verbatim
- [x] When the H1 does not match the frontmatter title verbatim, `parseCritNote` throws an error whose message identifies the H1 drift (includes both the H1 text and the frontmatter title for diagnosis)
- [x] When the H1 matches the frontmatter title verbatim, parsing proceeds normally (no false positive)
- [x] When no H1 is present (extractH1 returns null), the error message names the missing H1 explicitly (a CRIT note with no H1 is also drift)
- [x] The check runs BEFORE the final `CritNoteSchema.parse()` (drift is a parser-layer concern surfaced with a clear message, not a Zod schema error)
- [x] Unit tests cover: H1 matches title (pass), H1 differs from title (reject with drift message), H1 absent (reject), H1 matches but with trailing whitespace (verify `.trim()` semantics match `extractH1`)
- [x] `bun test shared/composition/tests/parsers/crit-note.test.ts` passes with the new cases green (existing cases preserved)
- [x] `biome check` passes
- [x] `tsc --noEmit` passes (from `shared/composition/`)
- [x] No regression in suite-wide `bun test` (baseline 788/2/790; the 2 fails are SPEC-007 DEFERRED per D-1)

## ADR Compliance

- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-2 (additive change to existing flat-directory parser file)
- [x] Honors [[ADR-001: Composition Library Architecture]] (unified + remark AST pattern; uses existing extractH1 helper)

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/src/parsers/crit-note.ts` | MODIFY | Add H1-vs-title verbatim comparison + throw on drift |
| `shared/composition/tests/parsers/crit-note.test.ts` | MODIFY | Add H1-drift test cases |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.5d | One comparison + tests; extractH1 helper already exists |
| AI-Dominant | 0.25d | Minimal additive change; helper + pattern established |
| AI-Assisted | 0.25d | Trivial with reference |

## Observations

- [fact] Closes the REQ-001 AC-5 coverage gap that fell between TASK-004 (schema) and TASK-006 (parser) — neither owned the H1-drift mechanism #coverage-gap #req-001-ac-5
- [decision] H1-drift detection lives in parseCritNote, not CritNoteSchema, because the schema validates the parsed model which has no raw H1 string; the parser has the AST H1 via extractH1 #parser-layer #separation-of-concerns
- [constraint] Check runs before CritNoteSchema.parse() and throws a parser-layer error (not a Zod error) with both H1 and title text for diagnosis #clear-diagnostics
- [insight] extractH1 helper already exists at ast-helpers.ts:140 (returns trimmed H1 or null); this TASK only wires it into the CRIT parser's validation path #helper-reuse

## Relations

- implements [[REQ-001-SPEC-008: New Schema Suite]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[DESIGN-001-SPEC-008: Coverage Module Layout]]
- depends_on [[TASK-006-SPEC-008: Implement ANALYSIS EPIC and CRIT Parsers]]
- relates_to [[QA-060-SPEC-008: Validation Report for TASK-006 ANALYSIS EPIC CRIT Parsers]]
- relates_to [[QA-061-SPEC-008: Validation Report for TASK-047 CRIT H1-Drift Detection]]