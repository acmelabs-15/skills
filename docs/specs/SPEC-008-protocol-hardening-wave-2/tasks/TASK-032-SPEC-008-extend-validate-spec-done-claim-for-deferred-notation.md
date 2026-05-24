---
title: 'TASK-032-SPEC-008: Extend validateSpecDoneClaim for Deferred Notation'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-032-spec-008-extend-validate-spec-done-claim-for-deferred-notation-2
status: DONE
tags:
- spec-008
- track-4
- validator-extension
- spec-done-claim
- atomic
---

# TASK-032-SPEC-008: Extend validateSpecDoneClaim for Deferred Notation

## Description

Extend the composition library `validateSpecDoneClaim` validator at `shared/composition/src/validators/spec-claim-validator.ts` to recognize `[~]` (deferred marker) as a terminal artifact-status indicator alongside `[x]` (done) when validating SPEC root `## Artifact Status` sections. Scope the extension to SPEC root rows only — TASK DoD checkboxes remain binary `[ ]` / `[x]` per Phase X invariants and per REQ-008-SPEC-008 AC-4.

Steps:

1. Read existing `spec-claim-validator.ts` to locate the terminal-check predicate
2. Extend the predicate: where current code matches `/^- \[x\]/` for "terminal", change to match `/^- \[(x|~)\]/`
3. Ensure the extension applies only to the SPEC root `## Artifact Status` parsing path; if the same predicate is reused in TASK DoD parsing, factor it into two named predicates (`isSpecRootTerminal` accepts `[x]` or `[~]`; `isTaskDoDTerminal` accepts `[x]` only)
4. Update the SpecRootNoteSchema (if it uses Zod `regex` validation on checkbox markers) to permit `[~]` in artifact-status rows
5. Add unit tests: one asserting `[~]` acceptance on SPEC-root row; one asserting `[~]` rejection on TASK DoD row; one asserting `validateSpecDoneClaim(SPEC-007-after-TASK-031)` returns `valid: true`
6. Run `bun test`; verify pass

## Definition of Done
- [x] `shared/composition/src/validators/spec-claim-validator.ts` accepts `[~]` markers in SPEC root `## Artifact Status` rows as terminal
- [x] Code path for TASK DoD parsing (if shared) is scoped or split to continue rejecting `[~]` on TASK DoD checkboxes
- [x] `SpecRootNoteSchema` (if applicable) regex allows `[~]` in artifact-status entries
- [x] Unit test asserting `[~]` SPEC-root acceptance present and passing
- [x] Unit test asserting `[~]` TASK DoD rejection present and passing
- [x] Unit test asserting `validateSpecDoneClaim` returns `valid: true` for a SPEC-007-shaped fixture (post-TASK-031 layout) present and passing
- [x] `bun test` exits 0; net test count increase of at least 3 cases
- [x] No regression in existing spec-claim-validator tests

## ADR Compliance

- ADR-005 D-6: validator extension to recognize `[~]` as terminal alongside `[x]` — verbatim per Event 15 lock

## Files Affected

- `shared/composition/src/validators/spec-claim-validator.ts` (extended)
- `shared/composition/src/schemas/spec-root-note.ts` (regex may need update)
- `shared/composition/src/validators/spec-claim-validator.test.ts` (new test cases)
- `shared/composition/src/tests/fixtures/spec-root-with-deferred.md` (new fixture)

## Effort Summary

| Tier | Estimate | Notes |
|---|---|---|
| Human | 2h | Validator extension + scope split + 3 new tests + fixture authoring |
| AI-Dominant | 1h | Mechanical predicate split + test scaffold (CANONICAL) |
| AI-Assisted | 1.5h | Pair-driven with TDD cycle |

## Observations

- [decision] Extension is SPEC-root-scoped per REQ-008-SPEC-008 AC-4 to prevent agents lying via `[~]` on TASK DoD rows #scope-boundary
- [constraint] Existing 508/508 test baseline must hold; new tests are additive, not replacements #regression-floor
- [insight] If the predicate is currently shared between SPEC root and TASK DoD parsing, this TASK forces a clean separation that improves future maintainability #refactor-as-side-benefit
- [risk] Schema regex change (if needed) could ripple to fixture validation tests — run full suite before/after to catch implicit dependencies #regression-risk

## Relations

- implements [[REQ-008-SPEC-008: Deferred Checkbox Notation and Validator Extension]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
- pairs_with [[TASK-031-SPEC-008: Amend SPEC-007 Root with Deferred Notation and Legend]]
- relates_to [[QA-074-SPEC-008: Validation Report for TASK-032 validateSpecDoneClaim Deferred Notation]]