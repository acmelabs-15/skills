---
title: 'QA-061-SPEC-008: Validation Report for TASK-047 CRIT H1-Drift Detection'
type: qa
permalink: qa/qa-061-spec-008-validation-report-for-task-047-crit-h1-drift-detection-1
status: DONE
tags:
- qa
- spec-008
- task-047
- crit
- h1-drift
- parser
- validation
---

# QA-061-SPEC-008: Validation Report for TASK-047 CRIT H1-Drift Detection

## Scope

Validates TASK-047-SPEC-008 (Add H1-Drift Detection to CRIT Parser) against its 10 DoD items, 2 ADR Compliance items, and closure of REQ-001-SPEC-008 AC-5. Authority chain: ADR-005 D-2 + ADR-001 -> REQ-001-SPEC-008 AC-5 -> DESIGN-001-SPEC-008 -> TASK-047-SPEC-008.

Branch: `feat/plan-001-protocol-hardening-wave-2-scope` at commit `1c5d59c`.

## Verdict

**PASS** - All 10 DoD items verified with file:line evidence. Both ADR compliance items satisfied. REQ-001 AC-5 is closeable.

## Per-DoD Evidence Table

| # | DoD Item | Status | Evidence |
| --- | --- | --- | --- |
| 1 | parseCritNote calls extractH1(ast) and compares against frontmatter.title verbatim | [PASS] | `crit-note.ts:195` calls `extractH1(ast)`; line 200 compares `h1 !== frontmatter.title` |
| 2 | When H1 does not match, throws error identifying drift (includes both H1 text and title) | [PASS] | `crit-note.ts:201-203`: message template `'CRIT H1 drift: H1 "${h1}" does not match frontmatter title "${frontmatter.title}"'` |
| 3 | When H1 matches, parsing proceeds normally (no false positive) | [PASS] | Test `crit-note.test.ts:144-148`: parses CRIT_VALID successfully; test at line 185-194 confirms trailing-whitespace H1 also passes |
| 4 | When no H1 present (extractH1 returns null), error names missing H1 explicitly | [PASS] | `crit-note.ts:196-198`: `'CRIT H1 drift: no H1 heading present; expected an H1 matching frontmatter title "${frontmatter.title}"'`; test at line 176-183 verifies |
| 5 | Check runs BEFORE CritNoteSchema.parse() (parser-layer, plain Error not ZodError) | [PASS] | H1-drift block at lines 194-204; CritNoteSchema.parse() at line 224. Test at line 161-174 asserts `Error` and `not ZodError` |
| 6 | Unit tests: H1 matches (pass), H1 differs (reject+message), H1 absent (reject), trailing-ws semantics | [PASS] | Tests at `crit-note.test.ts:143-195` (5 cases in describe block "H1-drift detection") |
| 7 | bun test crit-note.test.ts passes with new cases green, existing preserved | [PASS] | Run result: 13 pass, 0 fail (8 existing + 5 new) |
| 8 | biome check passes | [PASS] | `bunx biome check` on both files: "Checked 2 files in 4ms. No fixes applied." |
| 9 | tsc --noEmit passes | [PASS] | Exit 0, no output (clean) |
| 10 | No regression in suite-wide bun test (baseline 788/2/790; 2 fails SPEC-007 DEFERRED) | [PASS] | Suite: 793 pass, 2 fail, 795 total. 2 fails are plan-001-migration.test.ts (SPEC-007 DEFERRED per D-1). No new failures. Note: baseline improved from 788 to 793 since TASK-047 was authored (other batch completions), but no regressions introduced |

## REQ-001 AC-5 Closure Verdict

**YES - AC-5 is closeable.**

AC-5 (reworded Event 77): "GIVEN a CRIT note with the H1 not matching frontmatter title verbatim WHEN `parseCritNote(markdown)` is called THEN parsing fails with an error identifying the H1 drift."

Evidence:
1. `parseCritNote` at `crit-note.ts:186-225` detects H1 != title at line 200 and throws Error with diagnostic at lines 201-203
2. Missing H1 (null from extractH1) also throws at lines 196-198
3. The error is a plain Error (not ZodError), surfaced before schema validation (line 194-204 vs schema at line 224)
4. The error message includes both the actual H1 and the expected frontmatter title
5. Five dedicated tests at `crit-note.test.ts:143-195` verify all four sub-conditions (match/mismatch/absent/trailing-ws)

All sub-conditions of AC-5 are mechanically satisfied. AC-5 checkbox can be flipped to `[x]`.

## HALT-Resolution Verification

### Resolution 1: replaceAll lockstep mutation (2 existing rejection tests)

**Verified correct.** Tests at lines 83-98 ("unparented") and 101-110 ("wrongParent") use `.replaceAll()` to mutate BOTH the frontmatter title AND the H1 heading simultaneously. This ensures the new H1-drift check passes (H1 matches title), and the tests still reach the schema layer where:
- "unparented" fails because `CRIT-901: Wave 2...` does not match regex `^CRIT-\d{3}-(ADR|ANALYSIS|SPEC|REQ|DESIGN|TASK)-\d{3}.*` -> ZodError on path "title"
- "wrongParent" fails because `CRIT-901-PLAN-005: ...` has "PLAN" not in the 6-type allowlist -> ZodError

Both tests still exercise their original schema-layer intent. The lockstep mutation is the correct approach -- it prevents the tests from being neutered by the new H1-drift check while preserving their original assertion targets.

### Resolution 2: Test file at flat path (not __tests__/)

**Verified correct.** File exists at `shared/composition/tests/parsers/crit-note.test.ts`. No `__tests__/` directory contains any crit-note test file. `find` across the composition package returned no results matching `*__tests__*crit*`.

## Per-ADR Compliance Evidence

| # | ADR Item | Status | Evidence |
| --- | --- | --- | --- |
| 1 | ADR-005 D-2: additive change to existing flat-directory parser file | [PASS] | Modified `src/parsers/crit-note.ts` (existing file, flat dir) and `tests/parsers/crit-note.test.ts` (existing file, flat dir). No new files created. |
| 2 | ADR-001: unified + remark AST pattern; uses existing extractH1 helper | [PASS] | `crit-note.ts:12` imports `extractH1` from `./ast-helpers.js`; `ast-helpers.ts:140-144` provides `extractH1(ast: Root): string | null` using `mdToString(heading).trim()`. Parser uses same unified/remark AST pattern as all other parsers. |

## Observations

- [outcome] TASK-047 closes the REQ-001 AC-5 coverage gap that fell between TASK-004 (schema) and TASK-006 (parser) during Batch 5c; 5 new test cases provide mechanical evidence #coverage-gap-closed #req-001-ac-5
- [technique] replaceAll lockstep mutation in existing rejection tests is the correct pattern when a new pre-schema check (H1-drift) would intercept tests targeting schema-layer rejections #test-design #lockstep-mutation
- [fact] Suite-wide run shows 793/2/795 with zero regressions; the 5-test delta from 788 baseline reflects other batch completions, not TASK-047 scope creep #regression-free #suite-health
- [insight] H1-drift detection at parser layer (plain Error before ZodError) provides clearer diagnostics than schema-layer detection would, validating the AC-5 reword decision #parser-layer #separation-of-concerns

## Relations

- relates_to [[QA-055-SPEC-008: Validation Report for TASK-002 Common Module]]
- relates_to [[QA-056-SPEC-008: Validation Report for TASK-005 ADR Parser]]
- relates_to [[QA-057-SPEC-008: Validation Report for TASK-003 EPIC Schema]]
- relates_to [[QA-058-SPEC-008: Validation Report for TASK-010 PLAN Done Claim]]
- relates_to [[QA-059-SPEC-008: Validation Report for TASK-004 ADR ANALYSIS CRIT Schemas]]
- relates_to [[QA-060-SPEC-008: Validation Report for TASK-006 ANALYSIS EPIC CRIT Parsers]]
- implements [[TASK-047-SPEC-008: Add H1-Drift Detection to CRIT Parser]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]