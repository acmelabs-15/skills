---
title: 'REQ-008-SPEC-008: Deferred Checkbox Notation and Validator Extension'
type: requirement
permalink: specs/spec-008-protocol-hardening-wave-2/requirements/req-008-spec-008-deferred-checkbox-notation-and-validator-extension
status: ACCEPTED
tags:
- requirement
- spec-008
- track-4
- deferred-notation
- validator-extension
---

# REQ-008-SPEC-008: Deferred Checkbox Notation and Validator Extension

## EARS

WHEN a SPEC root contains REQ, DESIGN, or TASK artifact rows whose linked notes carry `status: DEFERRED`, the SPEC root markdown SHALL use the canonical `[~]` deferred-notation checkbox in place of `[ ]`, AND the composition library `validateSpecDoneClaim` SHALL recognize `[~]` as a terminal marker alongside `[x]`, SO THAT a SPEC may legitimately reach `status: DONE` when all artifacts are either completed (`[x]`) or formally deferred (`[~]`) without violating the spec-done claim contract.

WHEN a SPEC root contains the deferred-notation legend block at the top of its `## Artifact Status` section, the markdown SHALL include a one-line legend definition explaining `[ ]` (TODO), `[x]` (DONE), and `[~]` (DEFERRED), SO THAT readers and tooling have an in-note reference for the notation without consulting external documentation.

WHEN the `KNOWLEDGE-GRAPH-CONVENTIONS.md` Section 4.6 (PLAN structure) and Section 4.7 (SPEC structure) are read, they SHALL document the `[~]` notation as the canonical marker for deferred items in SPEC root artifact lists, SO THAT future spec authors and validator implementers share one source of truth for the notation.

## Acceptance Criteria

- [x] GIVEN SPEC-007's REQ-012/TASK-013/TASK-014 drift (Audit D) WHEN Track 4 cleanup ran THEN it was resolved by COMPLETING the migration (REQ-012-SPEC-007 ACCEPTED, TASK-014 DONE, TASK-013 superseded by TASK-014) so all SPEC-007 `## Artifact Status` rows are terminal `[x]` — the `[~]` deferred-notation path was unnecessary because the work was finished, not deferred (amended 2026-05-24, Event 145, user-approved)
- [x] GIVEN SPEC-007 was resolved by completion (no `[~]` rows present) THEN no in-note `[~]` legend is required on SPEC-007; the canonical `[~]` legend convention is instead documented centrally in CONVENTIONS/STRUCTURES Section 4.7 for any future SPEC that genuinely defers an artifact (amended 2026-05-24, Event 145, user-approved)
- [x] GIVEN `validateSpecDoneClaim` source at `shared/composition/src/validators/spec-claim-validator.ts` WHEN the validator parses a SPEC root with `status: DONE` and any artifact-status row using `[~]` THEN the validator accepts the claim as valid and does not emit an `unsatisfied` entry for that row
- [x] GIVEN `validateSpecDoneClaim` WHEN parsing a TASK DoD checklist (not a SPEC root artifact list) THEN the validator continues to reject `[~]` as a non-terminal marker for TASK DoD items (`[~]` is SPEC-root scoped only, per D-6)
- [x] GIVEN `validateSpecDoneClaim` WHEN run against SPEC-007 root after Track 4 cleanup (completion-based — all rows `[x]`) THEN the validator returns `valid: true`, closing the SPEC-007 PARTIAL drift surfaced in Audit D
- [x] GIVEN updated CONVENTIONS Section 4.6 + 4.7 WHEN a future spec author reads either section THEN both sections document `[~]` as the canonical deferred-notation marker and reference REQ-008-SPEC-008 as the source decision
- [x] GIVEN composition library unit test suite WHEN `bun test` runs after validator extension THEN at least one test case asserts `[~]` acceptance on SPEC-root rows and at least one asserts `[~]` rejection on TASK DoD rows

## Observations

- [decision] `[~]` selected as canonical deferred-notation marker per ADR-005 D-6 verbatim user lock (Event 15) #deferred-notation #adr-005-d6
- [decision] Validator extension is SPEC-root-scoped; TASK DoD checkboxes remain binary `[ ]`/`[x]` per Phase X invariants #scope-boundary #validator
- [constraint] Without notation amendment, SPEC-007 marked DONE with REQ-012/TASK-013/TASK-014 `[ ]` keeps violating `validateSpecDoneClaim` (Audit D PARTIAL finding) #drift #spec-007
- [insight] Notation legend in-note prevents readers from having to consult CONVENTIONS for `[~]` semantics; lowers traversal cost #ux #self-documenting
- [risk] If validator extension fails to gate `[~]` to SPEC root only, agents could lie via `[~]` on TASK DoD rows; test coverage for that rejection is mandatory #risk #adversarial
- [outcome] Resolves SPEC-007 PARTIAL drift without forcing TASK-014 completion or downgrading SPEC-007 status #drift-cleanup #d-6

## Relations

- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[SPEC-007: Plan/Session Render Implementation]]
- relates_to [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]]
