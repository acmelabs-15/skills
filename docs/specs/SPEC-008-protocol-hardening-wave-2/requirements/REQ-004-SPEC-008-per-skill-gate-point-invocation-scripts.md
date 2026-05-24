---
title: 'REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts'
type: requirement
permalink: specs/spec-008-protocol-hardening-wave-2/requirements/req-004-spec-008-per-skill-gate-point-invocation-scripts
status: DRAFT
tags:
- requirement
- spec-008
- track-2
- per-skill-scripts
- gate-point-invocation
---

# REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts

## EARS

WHEN a lifecycle skill (build, end, spec, decisions, plan) reaches a Brain-note state-transition gate point
THE SYSTEM SHALL invoke the corresponding composition-library validator or mutation via a per-skill script located at `skills/<skill-name>/scripts/<verb>.ts` that imports its logic from `shared/composition/src/` and exits non-zero on validation failure
SO THAT every gate point in every lifecycle skill is enforced by a colocated shell-composable mechanically-verifiable script.

## Pattern

Gate-Point Invocation (Event-Driven, triggered at each skill's gate point in the per-TASK build+qa cycle).

## Priority

P0 — without per-skill scripts the lifecycle skills regress to Wave 1 prose-only enforcement.

## Category

Functional.

## Context

[[ADR-005: Protocol Hardening Wave 2 Architecture]] D-1 locks the per-skill scripts pattern as the canonical invocation surface. [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]] Audit B found all seven lifecycle SKILL.md files describe the composition-library validators in prose but no skill prescribes the actual invocation at the gate point. The composition skills decompose, recompose, defrag, and ingest audited FULL because they actually invoke their CLI scripts. Wave 2 extends that pattern to the lifecycle skills so every gate point is a script invocation, not a prose suggestion.

Wave 2 coverage:

- build: `validate-task-done.ts`, `transition-impl-item.ts`, `transition-qa-item.ts`
- end: `validate-spec-done.ts`, `run-pre-flight.ts`
- spec: `validate-task-schema.ts`, `validate-req-schema.ts`, `validate-design-schema.ts`
- decisions: `lock-decision-mutation.ts`
- plan: `render-plan-note.ts`, `set-part-done.ts`

## Acceptance Criteria

- [ ] GIVEN a TASK with status DONE and one unchecked DoD checkbox WHEN running `validate-task-done.ts` THEN script exits non-zero and stderr names the unsatisfied DoD item
- [ ] GIVEN a TASK with all DoD items checked or deferred WHEN running `validate-task-done.ts` THEN script exits zero with no error output
- [ ] GIVEN a PLAN with an impl-item in PENDING WHEN running `transition-impl-item.ts` with target IN_PROGRESS THEN PLAN markdown is updated via applyPlanMutation and script exits zero
- [ ] GIVEN a PLAN qa-item transitioning to DONE without test_report_ref WHEN running `transition-qa-item.ts` THEN script exits non-zero and stderr names the missing invariant
- [ ] GIVEN a SPEC root with status DONE and any Success Criteria checkbox unchecked WHEN running `validate-spec-done.ts` THEN script exits non-zero and stderr names the unsatisfied row
- [ ] GIVEN a TASK note WHEN running `validate-task-schema.ts` THEN script parses via TaskNoteSchema exits zero on valid input non-zero with Zod issues on invalid input
- [ ] GIVEN every per-skill script under `skills/<name>/scripts/` WHEN inspected THEN it includes the import.meta.main CLI guard and exits non-zero on validation failure
- [ ] GIVEN every per-skill script WHEN tested via its colocated test file THEN the test asserts both the success path and the failure path
- [ ] GIVEN any per-skill script accepting a file path argument WHEN the resolved absolute path is not equal to projectRoot AND does not start with `projectRoot + path.sep` THEN script exits non-zero with a stderr message naming the rejected path. Three adversarial cases MUST be verified:
  - `../outside.md` (relative traversal) is rejected
  - an absolute path outside projectRoot is rejected
  - a prefix-collision sibling `<projectroot>-sibling/x.md` is rejected (the bare `.startsWith(projectRoot)` form would false-negative this)

## Implementation Notes

Scripts are thin wrappers fewer than 60 lines each. The CLI guard pattern matches existing `skills/defrag/scripts/defrag.ts` and `skills/ingest/scripts/ingest.ts`. Each script parses CLI args, reads the target file via `Bun.file().text()`, calls the validator or mutation from `shared/composition/src/`, prints structured stdout on success and structured stderr on failure, and exits zero or non-zero accordingly. Scripts that mutate read the markdown, apply the composition-library mutation, and write the result back. Path-containment validation rejects traversal by computing `const resolved = path.resolve(projectRoot, userPath)` and accepting only when `resolved === projectRoot || resolved.startsWith(projectRoot + path.sep)`; the bare `.startsWith(projectRoot)` form is insufficient (trailing-slash and prefix-collision false-negatives) and MUST NOT be used. This matches the D-8 hook-handler boundary.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `skills/build/scripts/validate-task-done.ts` | NEW | TASK DoD claim validation gate |
| `skills/build/scripts/transition-impl-item.ts` | NEW | PLAN impl-item state-transition mutation |
| `skills/build/scripts/transition-qa-item.ts` | NEW | PLAN qa-item state-transition mutation |
| `skills/end/scripts/validate-spec-done.ts` | NEW | SPEC done-claim validation gate |
| `skills/end/scripts/run-pre-flight.ts` | NEW | Pre-flight checklist runner |
| `skills/spec/scripts/validate-task-schema.ts` | NEW | TASK schema-only validation |
| `skills/spec/scripts/validate-req-schema.ts` | NEW | REQ schema-only validation |
| `skills/spec/scripts/validate-design-schema.ts` | NEW | DESIGN schema-only validation |
| `skills/decisions/scripts/lock-decision-mutation.ts` | NEW | Decision-lock mutation runner |
| `skills/plan/scripts/render-plan-note.ts` | NEW | PLAN render-and-write driver |
| `skills/plan/scripts/set-part-done.ts` | NEW | PLAN part substatus DONE mutation |

## Observations

- [requirement] Eleven new per-skill scripts close the Audit B prose-only gate-point gap across the five lifecycle skills #per-skill-scripts #audit-b
- [constraint] Every script imports validator or mutation logic from `shared/composition/src/` only #thin-wrapper #single-source-of-truth
- [decision] CLI entry shape uses `if (import.meta.main)` guard plus non-zero exit matching the `skills/defrag/scripts/defrag.ts` precedent #cli-pattern #shell-composable
- [constraint] Path-containment validation rejects dot-dot traversal per [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 security boundary #security #path-containment
- [risk] Without the colocated test file per script a regression in `shared/composition/` may break the gate point silently #test-coverage #regression-risk

## Relations

- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[REQ-001-SPEC-008: New Schema Suite]]
- relates_to [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]]
- relates_to [[SPEC-006: Defrag and Ingest Skills]]
