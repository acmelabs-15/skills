---
title: 'QA-029-SPEC-003: Composition Plan YAML and Frontmatter Map in Fixtures'
type: test_report
permalink: qa/qa-029-spec-003-composition-plan-yaml-and-frontmatter-map-in-fixtures-1
tags:
- test-report
- spec-003
- qa
- task-010
- fail
---

# QA-029-SPEC-003: Composition Plan YAML and Frontmatter Map in Fixtures

## Context

- Task under test: TASK-010-SPEC-003 (Composition Plan YAML and Frontmatter Map in Fixtures)
- Spec: SPEC-003 PLAN Adapter
- Wave: Wave 3 Gap-TASK Build (Stream F)
- Owning session: SESSION-2026-05-21_01 D2 Lock and Wave 2 Retro Validation Kickoff
- Impl commit: `3d74348` chore(plan-001) Wave 3 session-limit triage + state transitions (impl agent landed fixtures pre-commit)
- HEAD at QA: `e8a898a`
- Verdict: **FAIL**
- Tests run: 6
- Passed: 3
- Failed: 3
- Skipped: 0

## Files Inspected

- `_shared/composition/tests/fixtures/plan-composition.plan.yaml` (NEW, 37 lines)
- `_shared/composition/tests/fixtures/plan-distribution.plan.yaml` (MODIFIED, 34 lines)
- `_shared/composition/tests/plan-integrity-floor.test.ts` (UNCHANGED — see DoD-6 below)
- `_shared/composition/schemas/composition/plan.plan.schema.ts` (reference)
- `_shared/composition/schemas/distribution/plan.plan.schema.ts` (reference)
- `_shared/composition/schemas/base.ts` (`mutationSpecSchema` confirms `frontmatter_map` optional support)

## Per-Checkbox DoD Validation

| # | DoD checkbox | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | tests/fixtures/plan-composition.plan.yaml exists | PASS | File present at `_shared/composition/tests/fixtures/plan-composition.plan.yaml`, 1356 bytes |
| 2 | plan-composition.plan.yaml parses via planCompositionPlanSchema.safeParse with success true | **FAIL** | safeParse returned success false. Two issues both for unquoted hex hash `0000…` being parsed as YAML number not string. Paths `source.hash` and `destinations[0].content_hash`. Zod expected string received number |
| 3 | plan-distribution.plan.yaml includes mutations.frontmatter_map with title plus permalink plus branches keys | PASS | `mutations.frontmatter_map` block present lines 27 to 30 with keys `title`, `permalink`, `branches`. Branches is a stringified array `"[SPEC-100, SPEC-101, SPEC-102, SPEC-103, SPEC-104]"` per the schema record string string contract |
| 4 | plan-distribution.plan.yaml parses via planDistributionPlanSchema.safeParse with success true | **FAIL** | Same unquoted-hash defect as DoD-2. `source.hash` and `destinations[0].content_hash` parse as number 0 not string. Schema requires `z.string().min(1)` |
| 5 | Round-trip semantics preserved distribution renumber_map values equal composition renumber_map keys inverse | PASS | Distribution `renumber_map = SPEC-001 to SPEC-100 ... SPEC-005 to SPEC-104`. Composition `source.mutations.renumber_map = SPEC-100 to SPEC-001 ... SPEC-104 to SPEC-005`. Sorted distribution-values equal sorted composition-keys and sorted distribution-keys equal sorted composition-values |
| 6 | Test asserts both fixtures parse | **FAIL** | `_shared/composition/tests/plan-integrity-floor.test.ts` was not modified by Stream F. Grep for `plan-composition.plan.yaml` and `plan-distribution.plan.yaml` across `_shared/composition/tests/` returns only the fixture files themselves no test file. The Files Affected table on TASK-010 lists `plan-integrity-floor.test.ts MODIFY Add tests asserting both fixture YAMLs parse` — that modification did not land |

## ADR Compliance

| # | Claim | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | Honors ADR-002 D-1 plan YAML schema shape exercised by valid fixtures | **FAIL** | Fixtures do not pass schema validation due to unquoted hex hashes parsing as numbers. The plan YAML schema shape is therefore NOT exercised by valid fixtures. Trivially fixable by quoting the hash values once and DoD-2 plus DoD-4 also pass |

## Reproduction

Verification script run from `_shared/composition/` with imports of `planCompositionPlanSchema` and `planDistributionPlanSchema`, loading both YAML fixtures via `js-yaml.load` then `safeParse`. Output:

```
composition parse: false
  source.hash: Expected string received number
  destinations.0.content_hash: Expected string received number
distribution parse: false
  source.hash: Expected string received number
  destinations.0.content_hash: Expected string received number
inverse k/v: true
inverse v/k: true
dist fm has all keys: true
comp fm has all keys: true
```

## Existing Suite Health

`bun test _shared/composition/tests/plan-integrity-floor.test.ts` — 10 pass, 0 fail, 14 expect calls, 55 ms. Existing inline-object schema tests are healthy; failure is isolated to the new fixture files which the suite does not yet load.

## Root Cause

YAML 1.1 treats unquoted strings of all digits as numbers. The hash value `0000000000000000000000000000000000000000000000000000000000000000` parses as `0` (number) — Zod rejects with `Expected string received number`. Sibling fixtures avoid the issue by using shorter alphanumeric hashes like `abc123` (mixed letters force string interpretation) or by quoting.

## Required Remediation

1. Quote `hash` and `content_hash` values in `plan-composition.plan.yaml` (2 occurrences) and `plan-distribution.plan.yaml` (2 occurrences). Use double quotes per YAML convention `hash: "0000000000000000000000000000000000000000000000000000000000000000"`. Schema then accepts.
2. Add tests to `plan-integrity-floor.test.ts` that load both fixture files via `js-yaml.load`, parse each via the respective schema, and assert `safeParse(...).success === true`. This satisfies DoD-6 and is the load-bearing test that would have caught the unquoted-hash defect at impl time.
3. Re-run `bun test _shared/composition/tests/plan-integrity-floor.test.ts` and confirm all assertions pass.

## Orchestrator Note

A scratch verification script `_shared/composition/tests/_qa-verify-fixtures.ts` was created during QA to confirm the schema parse failures (path-prefixed with `_` to avoid bun-test pickup). Permission to `rm` it was denied mid-run; orchestrator should remove it before the next commit. Not committed by this QA pass.

## Observations

- [problem] Both fixture YAMLs fail Zod schema validation due to unquoted 64-character hex hashes parsing as YAML numbers not strings #yaml-quoting #schema-failure
- [problem] `plan-integrity-floor.test.ts` was not updated to load and assert on the new fixtures DoD-6 unsatisfied and file-affected entry uncovered #missing-test #dod-gap
- [fact] Composition YAML inverse semantic vs distribution YAML is mathematically correct sorted distribution values equal sorted composition keys #round-trip-correctness
- [fact] frontmatter_map blocks present in both fixtures with required keys title plus permalink plus branches schema accepts the shape modulo the hash bug #frontmatter-coverage
- [decision] FAIL verdict required by validateTestReportPassClaim — 3 of 6 DoD items unsatisfied plus ADR compliance FAIL #qa-verdict
- [insight] Sibling distribution fixtures `abc123` style mixed-character hashes avoid the YAML number coercion trap entirely all-digit hashes must always be quoted #yaml-gotcha
- [outcome] Re-engagement brief returned to orchestrator with two-item remediation plus scratch-file cleanup #re-engagement

## Relations

- part_of [[SPEC-003: PLAN Adapter]]
- caused_by [[TASK-010-SPEC-003: Composition Plan YAML and Frontmatter Map in Fixtures]]
- relates_to [[QA-013-SPEC-003: PLAN Adapter Test Fixtures]]
- relates_to [[QA-014-SPEC-003: PLAN Adapter Round-Trip Property Test]]
- depends_on [[REQ-005-SPEC-003: PLAN Adapter Round-Trip Property Test]]
- depends_on [[ADR-002: Adapter Stack and Property Tests]]