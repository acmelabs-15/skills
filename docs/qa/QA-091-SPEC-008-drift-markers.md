---
title: 'QA-091-SPEC-008: Drift Markers'
type: qa
permalink: qa/qa-091-spec-008-drift-markers
status: DONE
tags:
- qa
- spec-008
- track-3
- regression
- drift-markers
---

# QA-091-SPEC-008: Drift Markers

## Objective

Validate TASK-028-SPEC-008: annotation of existing composition-library tests with `// drift-marker:` comments mapping each test to its Phase X drift surface (RETRO-003). Verifies REQ-007 AC-6 (>=5 markers in canonical format) and AC-7 (each maps to a documented Phase X surface). Implementation done; QA gate verdict.

## Approach

- **Test types**: source-grep evidence (marker presence + format), comment-only diff inspection (behavior preservation), full test-suite regression, type-check, lint.
- **Environment**: local — `feat/plan-001-protocol-hardening-wave-2-scope` at HEAD `71b8dad`.
- **Data strategy**: real source files; no fixtures synthesized.

## Results

### Summary

| Metric | Value | Target | Status |
| --- | --- | --- | --- |
| Tests run (whole suite) | 1234 | - | - |
| Passed | 1234 | - | PASS |
| Failed | 0 | 0 | PASS |
| Skipped | 0 | - | - |
| Drift markers found | 6 | >=5 | PASS |
| Canonical format | 6/6 | 6/6 | PASS |
| Surfaces mapped | 5/5 | 5/5 | PASS |
| tsc --noEmit (composition) | exit 0 | exit 0 | PASS |
| biome check (6 files) | clean | clean | PASS |

`tests_run (1234) == passed (1234) + failed (0) + skipped (0)`.

### Per-DoD-item verification

| DoD item | Evidence | Status |
| --- | --- | --- |
| >=5 test files/blocks carry one `// drift-marker:` each | `git grep` returns 6 matches across 6 files | PASS |
| Each marker matches canonical `// drift-marker: <id> — <one-line>` | All 6 lines conform: `<id> — <desc>` | PASS |
| Each maps to a documented Phase X drift surface (RETRO-003) | 5 surfaces from REQ-007 Context all covered (2 by DoD-authorized substitution) | PASS |
| No test behavior changed (comments only) | TASK-028 commit `71b8dad` shows 4 single-line `+` insertions, no logic deltas; suite 1234/0 green | PASS |
| `biome lint` + `tsc --noEmit` pass | tsc exit 0; biome clean on all 6 files | PASS |
| REQ-007 AC-6 (>=5 canonical markers) | 6 canonical markers | PASS |
| REQ-007 AC-7 (each maps to documented surface) | all 5 surfaces mapped to subject-matching tests | PASS |

### Marker grep evidence

`git grep "// drift-marker:" shared/composition/tests/` returns 6:

| File | Marker id | Surface match |
| --- | --- | --- |
| `mutation-invariants.test.ts` | `SESSION-2026-05-21_01-duplicate-events` | SESSION duplicate-event (pre-existing, TASK-027) |
| `integration/cross-note-spec-task-consistency.test.ts` | `SPEC-002/003-rollup-drift` | SPEC-vs-TASK rollup (bonus, RETRO-003) |
| `ast-helpers.test.ts` | `qa-027-qa-030-duplicate-frontmatter` | duplicate-frontmatter-block (substitution) |
| `common-schema.test.ts` | `qa-027-validates-relation-verb` | forbidden relation-verb (substitution) |
| `plan-001-migration.test.ts` | `plan-001-trimmed-template-canonical-form` | PLAN-001 trimmed-template (TASK-028) |
| `spec-claim-validator.test.ts` | `spec-002-spec-003-rollup-drift` | SPEC-002/003 rollup (TASK-028) |

### Substitution assessment

The TASK-028 DoD authorizes substituting equivalent existing blocks where exact match unavailable. Two substitutions made, both verified equivalent drift-locking tests:

- **ast-helpers.test.ts** (substitutes `schemas.test.ts`): marker on the `extractFrontmatter` describe block. This test exercises frontmatter parse + the `throws ParseError when no frontmatter present` path — the parser surface for the duplicate-frontmatter-block drift. `schemas.test.ts` has no frontmatter test, so the substitution lands on the correct subject surface.
- **common-schema.test.ts** (substitutes `validators.test.ts`): marker on `RelationSchema accepts valid verbs and rejects unknown`, which asserts the verb allowlist rejects forbidden verbs (`reviews` -> false). This is exactly the relation-verb drift surface. `validators.test.ts` has no relation test, so the substitution lands on the correct subject surface.

## Discussion

### Risk areas

| Area | Risk Level | Rationale |
| --- | --- | --- |
| Marker id casing vs REQ-007 wording | Low | mutation-invariants marker reads `SESSION-2026-05-21_01-duplicate-events`; REQ-007 / TASK-028 DoD suggested `session-2026-05-21-01-duplicate-events`. Same drift surface, cosmetic id-format difference; pre-existing from TASK-027 and not in TASK-028 scope to change. |

### Coverage gaps

None for TASK-028 scope. The two REQ-007 AC checkboxes (AC-6, AC-7) are satisfied. Note: REQ-007 frontmatter `status: DRAFT` and several REQ-007 AC `[ ]` are orchestrator/SPEC-level rollup state, outside this TASK's write scope.

## Recommendations

1. **Accept TASK-028**: all DoD items satisfied with evidence; orchestrator may flip impl/qa items DONE.
2. **Optional future tidy**: normalize the pre-existing `SESSION-2026-05-21_01-duplicate-events` marker id to lowercase-kebab form if a marker-id style convention is later adopted — not blocking.

## Verdict

**Status**: PASS
**Confidence**: High
**Rationale**: 6 canonical `// drift-marker:` comments map to the 5 documented Phase X surfaces (2 via DoD-authorized equivalent substitutions verified subject-matching), no test behavior changed (suite 1234/0 green), tsc exit 0 and biome clean.

## Observations

- [outcome] TASK-028 PASS — 6 canonical drift markers across 6 files, suite 1234/0, tsc/biome clean #drift-markers #pass
- [fact] `git grep "// drift-marker:" shared/composition/tests/` returns 6 matches; TASK-028 commit added 4 single-line comment insertions with no logic deltas #grep-evidence #behavior-preservation
- [decision] Two substitutions (ast-helpers for the duplicate-frontmatter surface, common-schema for the relation-verb surface) accepted as equivalent drift-locking tests per the DoD-authorized substitute clause #substitution #dod
- [insight] Marker on `RelationSchema accepts valid verbs and rejects unknown` directly regression-locks the forbidden-relation-verb drift by asserting `reviews` is rejected; marker on `extractFrontmatter` describe locks the frontmatter-parse surface #relation-verb #frontmatter
- [risk] Pre-existing mutation-invariants marker id uses CAPS/underscore form vs the DoD-suggested kebab form; cosmetic only, same surface, out of TASK-028 scope #marker-id #cosmetic

## Relations

- relates_to [[TASK-028-SPEC-008: Annotate Existing Tests with Phase X Drift Markers]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[REQ-007-SPEC-008: Integration Tests and Mutation Tests and Drift Regression Markers]]
- depends_on [[RETRO-003: Phase X Execution and Composition Library Completion]]