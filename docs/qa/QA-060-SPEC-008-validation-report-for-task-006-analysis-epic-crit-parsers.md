---
title: 'QA-060-SPEC-008: Validation Report for TASK-006 ANALYSIS EPIC CRIT Parsers'
type: qa
status: DONE
permalink: qa/qa-060-spec-008-validation-report-for-task-006-analysis-epic-crit-parsers
tags:
- qa
- spec-008
- task-006
- parser
- validation
---

# QA-060-SPEC-008 Validation Report for TASK-006 ANALYSIS EPIC CRIT Parsers

## Scope

Validates TASK-006-SPEC-008 (Implement ANALYSIS, EPIC, and CRIT parsers) against its 15 DoD items, 3 ADR-Compliance items, REQ-002-SPEC-008 Acceptance Criteria, REQ-001-SPEC-008 AC-5 H1-drift closure check, and DESIGN-001-SPEC-008 Compliance checklist. Authority chain: ADR-005 D-2/D-5 + ADR-001 -> REQ-002-SPEC-008 -> DESIGN-001-SPEC-008 -> TASK-006-SPEC-008.

## Verdict

**PASS** -- all 15 DoD items satisfied, all 3 ADR-Compliance items met, REQ-002 ACs relevant to this TASK satisfied, DESIGN-001 compliance satisfied. Tests 25/0/25. Biome clean. tsc clean. No regressions (788/2/790 suite-wide; 2 known-deferred SPEC-007 failures unrelated).

## Per-DoD Evidence Table

| # | DoD Item | Status | Evidence |
| --- | --- | --- | --- |
| 1 | File `shared/composition/src/parsers/analysis-note.ts` exists and exports `parseAnalysisNote` | [PASS] | File exists (186L); line 151: `export function parseAnalysisNote` |
| 2 | File `shared/composition/src/parsers/epic-note.ts` exists and exports `parseEpicNote` | [PASS] | File exists (244L); line 209: `export function parseEpicNote` |
| 3 | File `shared/composition/src/parsers/crit-note.ts` exists and exports `parseCritNote` | [PASS] | File exists (209L); line 182: `export function parseCritNote` |
| 4 | `parseAnalysisNote` detects Open Questions section and sets hasOpenQuestions on parsed model | [PASS] | analysis-note.ts:180 `const hasOpenQuestions = sections.has(OPEN_QUESTIONS_SECTION)`; line 182 `return { ...validated, hasOpenQuestions }`. Type `ParsedAnalysisNote = AnalysisNote & { hasOpenQuestions: boolean }` (line 56). Tests: analysis-note.test.ts lines 103-112 verify both true/false paths |
| 5 | `parseEpicNote` parses Contained Specs into containedSpecs mirroring contains relations | [PASS] | epic-note.ts:238 `const containedSpecs = parseContainedSpecs(...)`; line 240 `return { ...validated, containedSpecs }`. Type `ParsedEpicNote = EpicNote & { containedSpecs: string[] }` (line 67). Tests: epic-note.test.ts lines 90-99 verify list-form mirrors relations; lines 102-104 verify table-form |
| 6 | `parseCritNote` parses Findings table into findings with severity, description, recommendation | [PASS] | crit-note.ts:98-121 `parseFindings()` returns `CritFinding[]`; line 200 `findings: parseFindings(...)` fed directly into model. Tests: crit-note.test.ts lines 55-65 verify 3 findings with all fields |
| 7 | Each parser throws Zod error on wrong type field | [PASS] | Tests: analysis-note.test.ts:149-158 (type:decision), epic-note.test.ts:146-155 (type:analysis), crit-note.test.ts:109-118 (type:decision). All throw ZodError with `type` in path |
| 8 | Each parser validates via *NoteSchema.parse() | [PASS] | analysis-note.ts:175, epic-note.ts:234, crit-note.ts:205 -- each calls its schema's `.parse()` |
| 9 | Unit tests cover happy-path parse for each type | [PASS] | analysis-note.test.ts: 6 tests in "happy path" describe; epic-note.test.ts: 4 tests; crit-note.test.ts: 4 tests |
| 10 | Unit tests cover: ANALYSIS ACCEPTED+OQ rejection, EPIC contains-no-section, CRIT malformed parent-ref | [PASS] | analysis-note.test.ts:134-140, epic-note.test.ts:124-144, crit-note.test.ts:83-98 |
| 11 | Render-then-parse round-trip or fixture-based integration test | [PASS] | analysis-note.test.ts:122-130, epic-note.test.ts:115-119, crit-note.test.ts:75-79 -- all re-parse validated model through schema without error |
| 12 | bun test on three files passes with at least 12 cases total green | [PASS] | 25/0/25 (exceeds 12 minimum) |
| 13 | biome check passes on all three files | [PASS] | `Checked 7 files in 27ms. No fixes applied.` |
| 14 | tsc --noEmit passes | [PASS] | `cd shared/composition && bunx tsc --noEmit` exit 0 (no output = clean) |
| 15 | parsers/index.ts re-exports all three parsers | [PASS] | index.ts line 20: `export { parseAnalysisNote }`, line 26: `export { parseEpicNote }`, line 28: `export { parseCritNote }` |

## Per-REQ-AC Evidence Table

### REQ-002-SPEC-008 Acceptance Criteria

| AC | Text | Status | Evidence |
| --- | --- | --- | --- |
| AC-2 | GIVEN ANALYSIS with Open Questions + ACCEPTED WHEN parseAnalysisNote called THEN throws Zod error | [PASS] | analysis-note.test.ts:134-140 -- replaces DRAFT with ACCEPTED, asserts ZodError thrown with "Open Questions" in path |
| AC-3 | GIVEN EPIC WHEN parseEpicNote called THEN returns EpicNote with contains relation array from Relations section | [PASS] | epic-note.test.ts:90-99 -- verifies containedSpecs equals contains-relation targets |
| AC-4 | GIVEN CRIT WHEN parseCritNote called THEN returns CritNote with findings from Findings table rows | [PASS] | crit-note.test.ts:55-65 -- verifies 3 findings with severity/description/recommendation |
| AC-6 | GIVEN wrong type WHEN parser called THEN throws Zod error identifying type mismatch | [PASS] | All three test files verify ZodError with type in path |
| AC-7 | GIVEN successful parse THEN model survives render-then-parse round-trip | [PASS] | All three test files re-parse validated model through schema |

**CRITICAL JUDGMENT -- wrapper-vs-schema-field resolution**:

REQ-002 AC-3 states: "THEN it returns an `EpicNote` typed model with a `contains` relation array populated from the Relations section". AC-2 references "throws a Zod validation error referencing the forbidden section". Neither AC-3 nor AC-4 mandate that `hasOpenQuestions` or `containedSpecs` be schema-validated `body.*` fields. The ACs require:
1. The parser RETURNS a model (it does -- `ParsedEpicNote` / `ParsedAnalysisNote`)
2. The returned model carries the derived data as accessible properties (it does -- intersection type)
3. The schema rejection (ACCEPTED+OQ, contains-without-section) is enforced (it is -- via `superRefine` on the sections Record)

The DoD says "sets `body.hasOpenQuestions`/`body.containedSpecs` on the parsed model" -- the impl attaches these at the top level of the returned type, not nested under a `.body` property (there is no `.body` property in the note schema shape). The schema shape is `{ frontmatter, sections, observations, relations }`. The derived values are attached as `& { hasOpenQuestions }` and `& { containedSpecs }` directly on the returned object. This satisfies the DoD's intent (accessible on the parsed model) while preserving `.strict()` schema integrity. The structural rejections that REQ-002 requires are enforced by the schema superRefine, not by the wrapper flags.

**Verdict on wrapper approach**: SATISFIES REQ-002. The ACs require accessible derived data on the return value and schema-level structural rejection. Both are delivered. No AC explicitly requires these as `body.*` schema-validated fields.

### REQ-001-SPEC-008 AC-5 (H1-drift detection)

| AC | Text | Status | Evidence |
| --- | --- | --- | --- |
| AC-5 | GIVEN CRIT with H1 not matching frontmatter title WHEN CritNoteSchema.parse() called THEN fails | [PASS - schema layer, not parser TASK] | This AC targets the CritNoteSchema (TASK-004), not the parser (TASK-006). The parser at crit-note.ts does NOT implement H1-drift detection itself -- it delegates to the schema. H1-drift is a cross-cutting schema concern. TASK-006 does not claim to close AC-5; it was closed by TASK-004. |

## Per-DESIGN-Compliance Evidence Table

| # | DESIGN-001 Compliance Item | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Every NEW file at documented Module Structure path | [PASS] | analysis-note.ts at parsers/, epic-note.ts at parsers/, crit-note.ts at parsers/ -- matches DESIGN-001 layout |
| 2 | Parser function named parse<Type>Note | [PASS] | parseAnalysisNote, parseEpicNote, parseCritNote |
| 3 | Exported from parsers/index.ts | [PASS] | index.ts lines 20, 26, 28 |
| 4 | Imports from schemas/common.ts not duplicated | [PASS] | All three import `Observation`, `Relation` from `../schemas/common.js` |
| 5 | All paths use shared/ not _shared/ | [PASS] | All import paths use relative `../schemas/` within the shared/composition tree |
| 6 | CRIT has NO claim validator | [N/A] | Not relevant to parser TASK; CRIT parser exists without validator |
| 7 | Uses ast-helpers.ts shared helpers | [PASS] | All three import extractFrontmatter, sectionizeH2, proseFromChildren from `./ast-helpers.js`; epic and crit additionally import findTable, tableRows, stripWikilink |

## Per-ADR Compliance Evidence Table

| # | ADR Compliance Item | Status | Evidence |
| --- | --- | --- | --- |
| 1 | ADR-005 D-2 (flat directory; one file per type) | [PASS] | Three files in flat parsers/ directory; no wave-specific subdirectory |
| 2 | ADR-005 D-5 (close P0/P1 coverage gaps) | [PASS] | ANALYSIS, EPIC, CRIT parsers now exist with full schema validation |
| 3 | ADR-001 (unified+remark AST pattern; TASK-005 reference) | [PASS] | All three parsers use identical pattern: unified().use(remarkParse).use(remarkFrontmatter).use(remarkGfm), extractFrontmatter, sectionizeH2, *NoteSchema.parse(). Mirrors TASK-005 adr-note.ts exactly |

## Independent Gate Verification

| Gate | Command | Result | Status |
| --- | --- | --- | --- |
| Tests | `bun test` (3 parser files) | 25 pass / 0 fail / 25 total | [PASS] |
| Biome lint | `bunx biome check` (7 files) | No fixes applied | [PASS] |
| TypeScript | `cd shared/composition && bunx tsc --noEmit` | Exit 0 | [PASS] |
| Suite-wide regression | `bun test` (repo root) | 788/2/790; 2 fails in SPEC-007 PLAN-001 migration (known-deferred D-1) | [PASS] |

## Observations

- [outcome] All 25 tests pass covering 3 parser types with happy-path, rejection, and round-trip categories; test count exceeds the 12-case minimum by 108% #test-coverage #pass
- [technique] Wrapper-type pattern (TypeScript intersection `& { derivedProp }`) cleanly separates schema-validated model from parser-computed derived values while preserving `.strict()` round-trip integrity #design-pattern #strict-schema
- [decision] CRIT findings are a first-class schema field (unlike ANALYSIS hasOpenQuestions and EPIC containedSpecs which are wrapper props) because findings are structurally required by CritNoteSchema.findings.min(1) invariant -- the schema NEEDS to validate them, not just detect their source section #schema-design #asymmetry

## Relations

- relates_to [[TASK-006-SPEC-008: Implement ANALYSIS, EPIC, and CRIT Parsers]]
- relates_to [[REQ-002-SPEC-008: New Parser Suite]]
- relates_to [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[QA-055-SPEC-008: Validation Report for TASK-005 ADR Parser]]