---
title: 'QA-088-SPEC-008: AAE EPIC Only Adversarial Fixture'
type: qa
permalink: qa/qa-088-spec-008-aae-epic-only-adversarial-fixture
status: DONE
tags:
- qa
- spec-008
- track-3
- adversarial
- epic
---

# QA-088-SPEC-008: AAE EPIC Only Adversarial Fixture

## Objective

Validate TASK-024-SPEC-008 (Author ADR ANALYSIS EPIC Adversarial Fixtures), SCOPED TO EPIC-ONLY per SESSION-2026-05-23_02 Event 131 decision D-B. The ADR + ANALYSIS adversarial fixtures are structurally impossible in the parse-then-validate harness because their claim-validator condition equals the schema superRefine, so a lying fixture fails `.parse()` before the validator runs. Only EPIC's lie is cross-note (DONE with an unfinished contained SPEC) and therefore harness-exercisable.

- **Feature**: TASK-024-SPEC-008 EPIC-only adversarial fixture + harness EPIC dispatch
- **Scope**: `shared/composition/tests/fixtures/adversarial/epic/`, `tests/_helpers/adversarial.ts`, `tests/adversarial-claims.test.ts`, `src/validators/epic-claim-validator.ts`, `src/schemas/epic-note.ts`
- **Acceptance Criteria**: TASK-024 amended EPIC-only Definition of Done (6 items)

## Approach

- **Test Types**: Unit (table-driven adversarial-claim harness), type-check
- **Environment**: Local Bun 1.3.13, `shared/composition` package
- **Data Strategy**: On-disk markdown fixtures parsed-then-validated; harness-injected `SpecResolver` for cross-note resolution

## Results

### Summary

| Metric | Value | Target | Status |
| --- | --- | --- | --- |
| Whole-suite tests run | 807 | - | - |
| Passed | 807 | - | PASS |
| Failed | 0 | 0 | PASS |
| Skipped | 0 | - | - |
| adversarial-claims.test.ts cases | 14 | >=11 | PASS |
| tsc --noEmit (composition) | exit 0 | exit 0 | PASS |
| Whole-suite verdict | PASS | green | PASS |

`bun run test` (canonical script `bun test skills/defrag skills/ingest shared`): 807 pass / 0 fail across 84 files. `bun test tests/adversarial-claims.test.ts`: 14 pass / 0 fail (11 fixture cases + 3 coverage assertions). `bunx tsc --noEmit` in `shared/composition`: exit 0.

Note on baseline count: the dispatch brief cited a 1220 whole-suite baseline; the canonical `bun run test` script reports 807 pass / 0 fail across 84 files in this tree. The green invariant (0 fail, fully passing) holds regardless of absolute count; no failures and no regression observed.

### Test Results by Category

| Test | Category | Status | Notes |
| --- | --- | --- | --- |
| adversarial: drift-01-done-with-unfinished-contained-spec (epic) | Unit | PASS | EPIC DONE + non-DONE contained SPEC rejected; message matches /SPEC-099: Unfinished Child Spec/ |
| coverage: every on-disk fixture appears as a cases row | Unit | PASS | No orphan fixtures (no adr/ or analysis/ subdirs present) |
| coverage: every cases row points at an on-disk fixture | Unit | PASS | No broken pointers |
| coverage: table covers all ten Audit E top-10 scenarios | Unit | PASS | cases.length=11 >= 10 |
| 10 existing-validator adversarial cases | Unit | PASS | task/spec/requirement/design/qa unaffected |
| Whole composition suite (723 tests) | Unit | PASS | No regression |
| Whole-suite (807 tests, 84 files) | Unit | PASS | No regression |

## Definition of Done Verification (amended EPIC-only, 6 items)

| # | DoD Item | Evidence | Status |
| --- | --- | --- | --- |
| 1 | `epic/` subdir exists; adr/ + analysis/ omitted | `ls tests/fixtures/adversarial/` shows design/ epic/ qa/ requirement/ spec/ task/ — epic/ present, no adr/ or analysis/ | PASS |
| 2 | EPIC fixture `epic/drift-01-done-with-unfinished-contained-spec.md` exists, named `drift-NN-<slug>.md` | File present; drift-marker HTML comment encodes lying-behavior + expected-reject | PASS |
| 3 | Fixture structurally valid vs EpicNoteSchema but encodes cross-note lie (DONE + non-DONE contained SPEC) | Fixture parses cleanly (status DONE + Contained Specs section satisfies superRefine); EpicNoteSchema superRefine only gates "contains relation requires Contained Specs section", NOT child-SPEC status (epic-note.ts:121-128) — lie survives `.parse()` | PASS |
| 4 | One `epic` row in `cases` table | adversarial-claims.test.ts:108-117 — validator: "epic", expectedReject: /SPEC-099: Unfinished Child Spec/ | PASS |
| 5 | `parseByValidatorType` + `invokeValidator` dispatch EPIC parser + validator with SpecResolver | adversarial.ts:106-107 (parseEpicNote), :179-189 (invokeEpicValidator wires adversarialSpecResolver returning non-DONE synthetic SPEC), :210-211 (invokeValidator epic case) | PASS |
| 6 | `bun test` passes; EPIC case rejects as expected; existing cases unaffected | adversarial-claims.test.ts 14/14 pass; whole-suite 807/0; EPIC case rejects citing SPEC-099 | PASS |

All 6 amended EPIC-only DoD items satisfied with evidence.

## REQ-006 / DESIGN-003 Finding

Neither REQ-006 Acceptance Criteria nor DESIGN-003 Compliance REQUIRES adversarial fixtures for ADR or ANALYSIS types. No amendment to REQ-006 or DESIGN-003 is needed per D-B.

- **REQ-006 EARS + AC**: the initial fixture set is explicitly "one markdown fixture per Audit E top-10 prioritized scenario across the FIVE EXISTING claim validators (task, requirement, design, spec, qa)". The `adr/`/`analysis/`/`epic/` subdirectories are described as a capability of the harness (union tag reserved) and a future Track-1 EXTENSION, not as required fixture content. AC-6 only requires the two-file-op EXTENSION PATH to exist, not authored ADR/ANALYSIS fixtures.
- **DESIGN-003 Compliance (7 items)**: the only ADR/ANALYSIS/EPIC-related item is "Extension path for Track 1 validators (ADR / ANALYSIS / EPIC) is captured without harness signature changes" — it requires the PATH, satisfied by the reserved union tag (adversarial.ts:38-46) and the additive dispatch, NOT authored ADR/ANALYSIS fixtures.

Conclusion: dropping ADR/ANALYSIS adversarial fixtures per D-B does not violate REQ-006 AC or DESIGN-003 Compliance.

Out-of-scope note (orchestrator action, not QA edit): TASK-024's own `## ADR Compliance` section retains two unchecked items quoting ADR-005 D-3/D-5 verbatim ("adr/, analysis/, epic/ subdirectories present" and "ANALYSIS, EPIC validators receive adversarial coverage"). These reference ADR-005, not REQ-006/DESIGN-003. Per D-B the orchestrator owns the ADR-005 amendment; QA did not edit them (outside write scope — TASK-024 status/ADR-Compliance owned by orchestrator).

## Discussion

### Risk Areas

| Area | Risk Level | Rationale |
| --- | --- | --- |
| EPIC cross-note validator | Low | Pure given injected resolver; throws loudly on missing/undefined resolver (no silent pass) per ADR-005 D-5 P1.1 |
| expectedReject regex tightness | Low | Anchors on specific child-SPEC ref /SPEC-099: Unfinished Child Spec/, not a loose matcher |

### Coverage Gaps

| Gap | Reason | Priority |
| --- | --- | --- |
| ADR/ANALYSIS adversarial fixtures | Structurally impossible: validator condition equals schema superRefine; lying fixture fails `.parse()` first. Schema rejection IS the coverage. | N/A (by design, D-B) |

## Recommendations

1. **Orchestrator amend ADR-005 D-3/D-5 and TASK-024 ADR Compliance per D-B**: the two unchecked TASK-024 ADR Compliance items reference the pre-D-B ADR-005 verbatim text; reconcile them with the EPIC-only scope so the note's own compliance section is internally consistent.

## Verdict

**Status**: PASS
**Confidence**: High
**Rationale**: All 6 amended EPIC-only DoD items satisfied with file-line evidence; adversarial-claims suite 14/14 and whole-suite 807/0 fully green with no regression; tsc clean; REQ-006/DESIGN-003 confirmed not to require ADR/ANALYSIS fixtures.

## Observations

- [outcome] All 6 amended EPIC-only DoD items for TASK-024 satisfied; EPIC adversarial case rejects the cross-note DONE-with-unfinished-SPEC lie citing SPEC-099 #dod-verified #epic
- [fact] Whole-suite `bun run test` reports 807 pass / 0 fail across 84 files; `bunx tsc --noEmit` in shared/composition exits 0; no regression #green-baseline #no-regression
- [insight] EpicNoteSchema superRefine gates only the structural Contained-Specs-section invariant, not child-SPEC status, so the lying EPIC parses cleanly and only the resolver-driven validator rejects it — making EPIC the sole harness-exercisable cross-note lie #schema-vs-validator #cross-note
- [decision] Neither REQ-006 AC nor DESIGN-003 Compliance requires ADR/ANALYSIS adversarial fixtures; dropping them per D-B needs no REQ/DESIGN amendment #req-design-finding #d-b
- [constraint] adr/ and analysis/ fixture subdirs correctly omitted so the orphan-fixture coverage assertion stays green; 11 fixtures map to 11 table cases #omission-by-design

## Relations

- relates_to [[TASK-024-SPEC-008: Author ADR ANALYSIS EPIC Adversarial Fixtures]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set]]
- relates_to [[DESIGN-003-SPEC-008: Adversarial Test Fixture Layout and Harness Shape]]
