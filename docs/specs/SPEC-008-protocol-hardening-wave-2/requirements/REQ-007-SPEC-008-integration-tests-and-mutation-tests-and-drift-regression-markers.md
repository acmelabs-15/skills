---
title: 'REQ-007-SPEC-008: Integration Tests and Mutation Tests and Drift Regression Markers'
type: requirement
permalink: specs/spec-008-protocol-hardening-wave-2/requirements/req-007-spec-008-integration-tests-and-mutation-tests-and-drift-regression-markers-1
status: DRAFT
tags:
- requirement
- spec-008
- track-3
- integration
- mutation
- regression
---

# REQ-007-SPEC-008: Integration Tests and Mutation Tests and Drift Regression Markers

## EARS

WHEN the composition library test suite is run via `bun test`
THE SYSTEM SHALL include a dedicated integration-test layer that exercises the full parse-then-mutate-then-validate-then-render path on representative fixtures, AND cross-note consistency tests that detect SPEC-vs-child-TASK status mismatches, AND cross-note TEST-REPORT-vs-TASK-DoD validation
SO THAT the rigid protocol's end-to-end contract (note authored → mutation applied → validator approves → renderer re-emits) is gated by automated regression coverage rather than ad-hoc unit-test composition.

WHEN the composition library mutation surface is exercised
THE SYSTEM SHALL include mutation tests that reject backward status transitions (`DONE` → `IN_PROGRESS`), assert double-apply idempotency (applying the same mutation twice yields the same end state with no schema violation on the second application), AND reject session mutations that introduce a duplicate `Event NN` number
SO THAT the mutation API's invariants (no time-reversal, deterministic re-application, monotonic event numbering) are mechanically enforced by tests rather than documented as prose-only contracts.

WHEN existing tests in the composition library suite are read
THE SYSTEM SHALL include drift-regression markers in the form of source-code comments tagging at least five existing test cases with their corresponding Phase X drift surface IDs (from the 37 drift surfaces captured at Phase X close)
SO THAT a future contributor reading a test understands which historical drift it regression-locks, and the test-to-drift-surface mapping is greppable in source.

## Pattern

Integration Test Layer (Behavior-Driven: end-to-end pipeline coverage with cross-note consistency assertions) + Mutation Invariant Tests (Contract: monotonicity + idempotency + uniqueness) + Source-Code Regression Markers (Documentation-In-Code: tag comments mapping tests to drift surfaces).

## Priority

P0 — integration coverage closes the ZERO-dedicated-integration-tests finding from Audit E; mutation invariant tests close the no-backward-transition / no-idempotency / no-duplicate-event coverage gap explicitly called out in ADR-005 D-3 Phase 3 expansion (critic P1.2 / P1.3).

## Category

Non-Functional (Test Coverage).

## Context
[[ADR-005: Protocol Hardening Wave 2 Architecture]] D-3 was scope-expanded in Phase 3 per critic findings P1.2 and P1.3: integration tests covering parse-mutate-validate-render full path, cross-note SPEC-vs-TASK consistency, and TEST-REPORT-vs-TASK-DoD cross-validation; mutation tests covering `DONE` → `IN_PROGRESS` backward transition rejection, double-apply idempotency, and session-mutation duplicate-event-number rejection. [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]] Audit E surfaced ZERO dedicated integration tests across 508 passing tests, AND the absence of any backward-transition / idempotency / duplicate-event coverage, AND 37 Phase X drift surfaces NOT captured as regression tests. The five Phase X drift surfaces selected for regression markers in this REQ are drawn from the Phase X retro: (1) SESSION-2026-05-21_01 duplicate event-number drift after killed-agent re-entry (covered by the new duplicate-event-number mutation test); (2) SPEC-002 / SPEC-003 SPEC-vs-TASK rollup drift (covered by the new cross-note consistency test); (3) QA-027 / QA-030 duplicate-frontmatter-block drift (covered by an existing schema parser test); (4) QA-027 forbidden `validates` relation type drift (covered by an existing relation-verb validator test); (5) PLAN-001 trimmed-template canonical-form drift (covered by an existing round-trip test).

## Acceptance Criteria
- [ ] GIVEN the integration-test file `shared/composition/tests/integration/parse-mutate-validate-render.test.ts` WHEN it runs THEN it exercises the full pipeline (`parsePlanNote` → `applyPlanMutation` → `validatePlanDoneClaim` or equivalent claim validator for the touched note → `renderPlanNote`) on at least three representative fixtures covering PLAN, SPEC, and TASK note types
- [ ] GIVEN the integration-test file `shared/composition/tests/integration/cross-note-spec-task-consistency.test.ts` WHEN it runs THEN it asserts the rule: for every TASK note with `status: DONE`, the parent SPEC's `## Artifact Status` row for that TASK MUST be `[x]` or `[~]` (terminal markers per REQ-008); the test fails when given a fixture with a DONE TASK and an unchecked SPEC-root row
- [ ] GIVEN the integration-test file `shared/composition/tests/integration/test-report-vs-task-dod.test.ts` WHEN it runs THEN it asserts the rule: every TEST-REPORT row marked PASS MUST correspond to a TASK DoD line marked `[x]`; the test fails when given a fixture pair where a TEST-REPORT claims PASS but the linked TASK DoD line is still `[ ]`
- [ ] GIVEN the mutation-invariant test file `shared/composition/tests/mutation-invariants.test.ts` WHEN it runs THEN it asserts (a) `applyPlanMutation({type: "transition-impl-item", from: "DONE", to: "IN_PROGRESS"})` is rejected with a backward-transition error AND (b) applying the same mutation twice in sequence on a fresh fixture yields a final state byte-identical to a single-apply result (idempotency)
- [ ] GIVEN the mutation-invariant test file WHEN session-mutation tests run THEN appending an `Event NN` whose `NN` already exists in the note is rejected with a duplicate-event-number error
- [ ] GIVEN the existing test files in `shared/composition/tests/` WHEN a contributor greps for `// drift-marker:` THEN at least five existing tests carry a comment of the form `// drift-marker: <drift-surface-id> — <one-line-description>` mapping the test to its Phase X drift surface
- [ ] GIVEN the five marked tests WHEN each marker comment is inspected THEN the drift-surface-id matches a documented Phase X drift surface (from the 37 captured at Phase X close in [[RETRO-003: Phase X Execution and Composition Library Completion]]) and the description identifies the lying behavior the test prevents

- [ ] GIVEN the five Phase X drift surfaces enumerated in this REQ's Context WHEN each marker is placed THEN the marker lands on a test whose subject matches that surface (NOT an arbitrary unrelated test), per the binding surface-to-test mapping:
  - SESSION duplicate-event drift → marker on the session-note duplicate-event-number mutation test in `mutation-invariants.test.ts`
  - SPEC-002/003 SPEC-vs-TASK rollup drift → marker on the cross-note consistency test in `integration/cross-note-spec-task-consistency.test.ts`
  - QA-027/030 duplicate-frontmatter-block drift → marker on the existing schema-parser test that rejects duplicate frontmatter blocks
  - QA-027 forbidden `validates` relation drift → marker on the existing relation-verb validator test asserting the 11-type allowlist
  - PLAN-001 trimmed-template canonical-form drift → marker on the existing PLAN round-trip render test
  - If a natural matching test does not exist for any of the five surfaces, that gap MUST be surfaced before /build (raised as a clarification) rather than satisfied by placing the marker on an arbitrary unrelated test
- [ ] GIVEN the new integration plus mutation tests WHEN `bun test` runs THEN total test count increases by at least eight tests over the pre-Track-3 baseline AND all new tests pass on first run

## Implementation Notes
Integration tests live in a new `tests/integration/` subdirectory to keep them visually separate from per-component unit tests; this also makes future CI segmentation (run unit tests on every commit; run integration tests on PRs) mechanically simple. The cross-note tests synthesize fixture pairs (a SPEC root + a child TASK; a TEST-REPORT + a TASK) inline in the test file or load them from `tests/fixtures/integration/`. The mutation-invariant test file is single-purpose: backward-transition rejection, idempotency, duplicate-event rejection are three top-level `describe` blocks. The drift-regression-marker comment format is canonicalized: `// drift-marker: <PHASE-X-DRIFT-SURFACE-ID> — <one-line>`. The five marker insertions are surgical edits — one comment line per file — and do not change test behavior. Phase X drift surfaces are enumerated in [[RETRO-003: Phase X Execution and Composition Library Completion]] (37 surfaces); the five selected for this REQ are listed in the Context section of this REQ.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/tests/integration/parse-mutate-validate-render.test.ts` | NEW | Full-pipeline integration coverage |
| `shared/composition/tests/integration/cross-note-spec-task-consistency.test.ts` | NEW | SPEC-vs-TASK rollup consistency assertion |
| `shared/composition/tests/integration/test-report-vs-task-dod.test.ts` | NEW | TEST-REPORT-vs-TASK DoD cross-validation |
| `shared/composition/tests/mutation-invariants.test.ts` | NEW | Backward-transition rejection, idempotency, duplicate-event rejection |
| `shared/composition/tests/fixtures/integration/` | NEW | Cross-note fixture pairs for integration tests |
| Five existing test files in `shared/composition/tests/` | MODIFY | Add one-line `// drift-marker:` comment each, identifying the Phase X drift surface the test regression-locks |

## Observations

- [requirement] Integration tests close the ZERO-dedicated-integration-tests finding from Audit E by exercising the full parse-mutate-validate-render pipeline on representative fixtures #integration #audit-e
- [requirement] Mutation invariant tests close ADR-005 D-3 Phase 3 critic P1.2 / P1.3 scope additions: backward-transition rejection, double-apply idempotency, duplicate-event-number rejection #mutation-invariants #critic-p1
- [decision] Drift-regression markers are source-code comments in canonical `// drift-marker: <id> — <desc>` form on existing test files; chosen over a separate registry to keep markers greppable from any test entry-point #marker-format #greppability
- [constraint] Cross-note consistency tests require fixture pairs (SPEC root + child TASK; TEST-REPORT + TASK); fixture-pair construction adds to test-authoring cost but is bounded to ~5 pairs #fixture-pairs
- [insight] Backward-transition rejection plus idempotency together formalize the monotonic-state-machine contract the mutation API claims in prose; without these tests the contract is unenforced #state-machine-contract
- [outcome] Audit E's three top-priority integration gaps (full pipeline, SPEC-vs-TASK, TEST-REPORT-vs-TASK) become regression-locked; the protocol's end-to-end correctness moves from prose to runtime #end-to-end-contract

## Relations
- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]]
- depends_on [[RETRO-003: Phase X Execution and Composition Library Completion]]
- relates_to [[REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set]]
- pairs_with [[DESIGN-003-SPEC-008: Adversarial Test Fixture Layout and Harness Shape]]
