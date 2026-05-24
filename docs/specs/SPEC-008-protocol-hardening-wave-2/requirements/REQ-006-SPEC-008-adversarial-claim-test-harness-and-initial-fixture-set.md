---
title: 'REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set'
type: requirement
permalink: specs/spec-008-protocol-hardening-wave-2/requirements/req-006-spec-008-adversarial-claim-test-harness-and-initial-fixture-set
status: DRAFT
tags:
- requirement
- spec-008
- track-3
- adversarial
- harness
---

# REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set

## EARS

WHEN the composition library test suite at `shared/composition/tests/` is loaded
THE SYSTEM SHALL expose a shared adversarial-claim test harness `testAdversarial({fixture, validator, expectedReject})` at `shared/composition/tests/_helpers/adversarial.ts` AND a fixture directory at `shared/composition/tests/fixtures/adversarial/<type>/drift-NN-<slug>.md` (one subdirectory per validator type: `task/`, `spec/`, `requirement/`, `design/`, `test-report/`, and post-Track 1 additions `adr/`, `analysis/`, `epic/`)
SO THAT each agent-lying scenario is encoded as a named, citeable markdown fixture that maps one-to-one to a Phase X drift surface, and the mechanical-impossibility-of-lying claim of the rigid protocol is provable by parse-from-markdown-then-validate evidence rather than struct-arithmetic evidence.

WHEN the initial fixture set is authored
THE SYSTEM SHALL provide one markdown fixture per Audit E top-10 prioritized scenario across the five existing claim validators (task-claim, requirement-claim, design-claim, spec-claim, test-report-claim)
SO THAT every gap identified in ANALYSIS-004 Audit E has a corresponding regression-locked fixture.

## Pattern

Fixture-Driven Validator Contract (Behavior-Driven: each fixture file is one named lying scenario; harness runs parse then validate then assert rejection).

## Priority

P0 — the harness is the precondition for REQ-007 integration coverage and for cross-track REQ-001 schema adversarial coverage; without parse-then-validate fixtures, the rigid-protocol mechanical-impossibility-of-lying claim has no evidence.

## Category

Non-Functional (Test Contract).

## Context

[[ADR-005: Protocol Hardening Wave 2 Architecture]] D-3 locks the shared fixture-driven harness pattern verbatim (chosen over per-validator adversarial test files and extending existing per-validator files). [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]] Audit E surfaced that only 3 of 5 claim validators have any parse-from-markdown-then-validate test, and that 37 Phase X drift surfaces are NOT captured as regression tests. The five existing validators (`validateTaskDoneClaim`, `validateRequirementAcClaim`, `validateDesignComplianceClaim`, `validateSpecDoneClaim`, `validateTestReportPassClaim`) live at `shared/composition/src/validators/`. The new validators authored by Track 1 (REQ-003-SPEC-008) — `validateAdrAcceptedClaim`, `validatePlanDoneClaim`, `validateAnalysisAcceptedClaim`, `validateEpicDoneClaim` — extend the harness coverage to the `adr/`, `analysis/`, and `epic/` fixture subdirectories. Each fixture filename `drift-NN-<slug>.md` IS the drift regression marker (Audit E item 10): adding a regression test for a newly-discovered drift surface is a one-line table entry plus one fixture file.

## Acceptance Criteria

- [ ] GIVEN the file `shared/composition/tests/_helpers/adversarial.ts` WHEN it is imported THEN it exports a `testAdversarial` function whose signature is `({fixture: string, validator: (note: ParsedNote) => ValidationResult, expectedReject: RegExp | string})` and which parses the fixture markdown, invokes the validator, and asserts that the result is a rejection matching `expectedReject`
- [ ] GIVEN any fixture file under `shared/composition/tests/fixtures/adversarial/task/drift-NN-<slug>.md` WHEN `testAdversarial` invokes `validateTaskDoneClaim` on the parsed fixture THEN the validator returns a non-empty `unsatisfied` array AND the rejection message matches the fixture's `expectedReject`
- [ ] GIVEN a fixture file that is structurally malformed (e.g., missing the mandatory `## Observations` then `## Relations` invariant) WHEN `testAdversarial` runs THEN the harness surfaces the parse error distinctly from the validator rejection (parse errors fail the test with a "fixture malformed" message, not a "validator wrong-output" message)
- [ ] GIVEN the initial fixture set WHEN the test runner `tests/adversarial-claims.test.ts` executes THEN it iterates a table of fixture-validator pairs covering ALL TEN Audit E top-10 scenarios across the five existing validators, with at least the following named drift surfaces: `drift-01-all-deferred-bypass.md` (task validator: DoD marks all items deferred to bypass DONE check), `drift-02-checkbox-flip-without-evidence.md` (task validator: DoD flipped without commit/code-change evidence cited), `drift-03-ac-flip-without-evidence.md` (requirement validator: AC `[x]` without `**Evidence**:` line), `drift-04-design-compliance-flip-without-evidence.md` (design validator: compliance `[x]` without evidence section), `drift-05-spec-all-success-criteria-deferred.md` (spec validator: SPEC DONE with all success_criteria deferred), `drift-06-test-report-all-deferred-verdict.md` (test-report validator: PASS verdict with all rows DEFERRED), plus four additional scenarios drawn from the Audit E table rows (task all-DoD-deferred-bypass alternative phrasing; requirement AC text-only flip; design compliance silent flip; spec DONE with Artifact Status rows unchecked)
- [ ] GIVEN the initial fixture set WHEN `bun test shared/composition/tests/adversarial-claims.test.ts` runs THEN all ten cases pass the rejection assertion AND no fixture file is unused by any test row AND no test row references a fixture file that does not exist on disk
- [ ] GIVEN the harness signature WHEN a future Wave-2-or-later contributor adds a new lying scenario THEN the workflow is exactly two file operations: (1) add one fixture markdown file at `shared/composition/tests/fixtures/adversarial/<type>/drift-NN-<slug>.md`; (2) add one row to the table in `tests/adversarial-claims.test.ts`. No scaffolding code edits required.
- [ ] GIVEN each fixture file WHEN read by a human reviewer THEN the file is self-documenting: the markdown is a realistic note a lying agent would produce, and the lying behavior is identifiable from the fixture content alone (without consulting external documentation)

## Implementation Notes

The harness lives at `shared/composition/tests/_helpers/adversarial.ts` (matches the existing `tests/_helpers/` convention used by other shared test utilities in the suite). The harness is approximately 30 lines: load fixture via `Bun.file(path).text()`, parse via the appropriate parser for the validator type (selected via the fixture's parent directory: `task/` selects `parseTaskNote`, `spec/` selects `parseSpecRootNote`, etc.), invoke the validator, assert the result against `expectedReject`. The harness MUST NOT short-circuit on parse failure — parse failures surface as a distinct "fixture malformed" assertion to keep validator-behavior debugging separate from fixture-authorship debugging. Each fixture file conforms to the canonical Brain note structure for its type (frontmatter, H1, content sections, Observations, Relations) but encodes a lying claim per the file's `drift-NN-<slug>` descriptor. The test runner at `tests/adversarial-claims.test.ts` is table-driven: a single `describe.each([...fixtures])` block iterates fixture-validator-expectation tuples and invokes `testAdversarial` per row. The fixture directory subdirs map one-to-one to validator types; `adr/`, `analysis/`, `epic/` subdirs are created by TASK-024 once Track 1 validators land.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/tests/_helpers/adversarial.ts` | NEW | Shared harness implementation |
| `shared/composition/tests/fixtures/adversarial/task/` | NEW | Task-validator lying-claim fixtures |
| `shared/composition/tests/fixtures/adversarial/spec/` | NEW | Spec-validator lying-claim fixtures |
| `shared/composition/tests/fixtures/adversarial/requirement/` | NEW | Requirement-validator lying-claim fixtures |
| `shared/composition/tests/fixtures/adversarial/design/` | NEW | Design-validator lying-claim fixtures |
| `shared/composition/tests/fixtures/adversarial/test-report/` | NEW | Test-report-validator lying-claim fixtures |
| `shared/composition/tests/adversarial-claims.test.ts` | NEW | Table-driven runner over the initial fixture set |

## Observations

- [requirement] Shared harness plus fixture-directory pattern locks D-3 verbatim from ADR-005; chosen over per-validator test files and extending existing per-validator files #d-3 #harness
- [decision] Each fixture filename `drift-NN-<slug>.md` doubles as the drift regression marker per Audit E item 10; new regressions are one-line table additions #drift-marker #scalability
- [constraint] Fixture parse errors surface distinctly from validator rejections; the harness keeps fixture-malformation debugging separate from validator-behavior debugging #separation-of-concerns #debuggability
- [insight] The initial ten scenarios close Audit E's top-10 prioritized gaps across the five existing validators; Track 1 extensions cover ADR plus ANALYSIS plus EPIC via TASK-024 #coverage #ordering
- [risk] If the expected-reject regex is too loose, the harness may pass when the validator rejects for an unrelated reason; mitigated by encouraging specific regex anchors in the harness contract #regex-tightness
- [outcome] Mechanical-impossibility-of-lying claim becomes provable by parse-then-validate evidence across all five validators, closing the Audit E gap that only 3 of 5 had any such test #protocol-evidence

## Relations
- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]]
- relates_to [[REQ-007-SPEC-008: Integration Tests and Mutation Tests and Drift Regression Markers]]
- pairs_with [[DESIGN-003-SPEC-008: Adversarial Test Fixture Layout and Harness Shape]]
