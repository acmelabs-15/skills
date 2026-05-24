---
title: 'QA-045-SPEC-008: Implement ADR Schema'
type: qa
permalink: qa/qa-045-spec-008-implement-adr-schema-1
tags:
- qa
- spec-008
- task-001
- adr-schema
- verdict-pass
---

# QA-045-SPEC-008: Implement ADR Schema

## Summary

Per-TASK QA gate for [[TASK-001-SPEC-008: Implement ADR Schema]] (Track 1: `AdrNoteSchema` at `shared/composition/src/schemas/adr-note.ts`). Independent re-validation by brain:🧠-qa against committed state (impl commit `63fea62`; qa-IN_PROGRESS commit `a06477c`). Verdict: **PASS** — all 12 DoD items + 3 ADR Compliance items + 4 in-scope REQ-001 ACs + 5 DESIGN-001 compliance points validated with source-line and command evidence. First PoC Track-1 schema→(parser→validator) pattern; sign-off unit.

## Verdict

**PASS** — every in-scope checkbox validated independently. 22/22 TASK-scoped tests green; tsc exit 0; biome clean; zero new suite failures (2 pre-existing `plan-001-migration.test.ts` failures are DEFERRED SPEC-007 work, unrelated to TASK-001).

## DoD validation

| Item | Result | Evidence |
|---|---|---|
| 1 — file + exports `AdrNoteSchema`/`AdrNote` | PASS | `adr-note.ts:84` schema; `:148` type export |
| 2 — frontmatter sub-schema (title/type/status/permalink/tags/date/updated) | PASS | `:51` title `/^ADR-\d{3}.*/`; `:52` `z.literal("decision")`; `:41` status enum (4 values); `:56` permalink regex; `:57` tags min2 max5; `:54-55` date+updated IsoDate |
| 3 — superRefine rejects ACCEPTED + unchecked Clarification | PASS | `:119` guard `status === "ACCEPTED" && clarifications !== undefined`; PROPOSED-with-unchecked still parses (test `adr-note.test.ts:81`); rejection test `:59` |
| 4 — superRefine rejects ACCEPTED + option missing rationale | PASS | `:134` guard ACCEPTED; `:135-145` filter `rationale.trim().length === 0` (catches whitespace beyond field `min(1)`); test `:69` |
| 5 — final-two-sections invariant | PASS | `observations` min(3) `:94`, `relations` min(2) `:95` mandatory trailing fields; min-count tests `:155-171` (parser owns ordering per REQ-002) |
| 6 — relation verb allowlist from `common.ts` (not duplicated) | PASS | `:2` imports `RelationSchema` from `./common.js`; `:95` uses it; zero verb defs in adr-note.ts; forbidden-verb test `:175` |
| 7 — all sub-schemas `.strict()` | PASS | `.strict()` ×4 (`:59`,`:70`,`:82`,`:97`) + ObservationSchema/RelationSchema strict in common.ts; unknown-key tests `:146`,`:195` |
| 8 — unit tests cover 6 required cases | PASS | valid PROPOSED `:38`; valid ACCEPTED `:42`; unchecked-Clarification `:59`; option-no-rationale `:69`; frontmatter failures `:94-152` (8); forbidden verb `:175` |
| 9 — `bun test … adr-note.test.ts` ≥8 green | PASS | `22 pass / 0 fail / 22 expect()` (re-run by QA) |
| 10 — `biome check` clean | PASS | `Checked 1 file. No fixes applied.` |
| 11 — `tsc --noEmit` workspace exit 0 | PASS | exit 0 (re-run by QA from `shared/composition/`) |
| 12 — `index.ts` re-exports `AdrNoteSchema`/`AdrNote` | PASS | `index.ts:9` `export { AdrNoteSchema, type AdrNote } from "./adr-note.js";` |

## ADR Compliance

| Item | Result | Evidence |
|---|---|---|
| ADR-005 D-2 (flat `schemas/` dir, `<type>-note.ts`) | PASS | file at `shared/composition/src/schemas/adr-note.ts`; no wave subdir |
| ADR-005 D-5 (closes P0 gap; PROPOSED→ACCEPTED gate) | PASS | two superRefine gates fire at ACCEPTED (`:119`, `:134`) |
| ADR-001 Zod + superRefine invariant | PASS | Zod schema + superRefine `:98-146` |

## REQ-001 acceptance criteria (ADR-scoped slice)

| AC | Result | Evidence |
|---|---|---|
| valid PROPOSED + 1 option w/ rationale → passes | PASS | test `:38` via `minimalAdr()` factory |
| ACCEPTED + unchecked Clarification → fails naming the item | PASS | test `:59`; message includes unchecked item text (`:124-125`) |
| missing Observations→Relations final-two-sections → fails | PASS | min(3)/min(2) mandatory fields; tests `:155-171` |
| Relations verb outside 11-verb allowlist → fails | PASS | test `:175` (verb `reviews` rejected) |

(Out-of-scope for TASK-001: ANALYSIS Open-Questions / EPIC frontmatter / CRIT H1 / PLAN done-claim ACs — TASK-002/003/004/010.)

## DESIGN-001 compliance (Track-1 ADR slice)

| Item | Result |
|---|---|
| file at flat `schemas/adr-note.ts` | PASS |
| constant `AdrNoteSchema`; type `AdrNote` | PASS |
| imports cross-cutting constants from `common.ts`, no duplication | PASS |
| barrel `schemas/index.ts` adds the export | PASS |
| all paths `shared/` (post-rename), never `_shared/` | PASS (`grep -c _shared` = 0 across 3 files) |

## Test execution

- tests_run: 530 · passed: 528 · failed: 2 · skipped: 0 (full `bun test shared/composition/`)
- TASK-001-scoped file `tests/schemas/adr-note.test.ts`: 22 pass / 0 fail / 22 expect()
- The 2 failures are PRE-EXISTING in `plan-001-migration.test.ts` (`TASK-014-SPEC-007` AC#1 no-forbidden-sections + AC#3 SHA-256 round-trip) — DEFERRED SPEC-007 work (REQ-012 status DEFERRED per ADR-005 D-6); not introduced by TASK-001. Zero new failures.
- TASK-001-scoped verdict: PASS.

## Observations

- [outcome] TASK-001 `AdrNoteSchema` validated PASS independently; 22/22 scoped tests green, no regression #qa #adr-schema
- [fact] superRefine implements two PROPOSED→ACCEPTED gates: unchecked-Clarification rejection + option-missing-rationale rejection (both key on `status === ACCEPTED`) #superrefine #adr-gate
- [insight] schema enforces structural presence of Observations(min3)/Relations(min2); section-ordering invariant is the parser's responsibility (REQ-002), consistent with all Wave 1 schemas #final-two-sections #layering
- [decision] relation-verb allowlist imported from `common.ts` (single source); forbidden verb `reviews` rejected — closes the Audit C `validates`-relation drift shape at the schema layer #single-source-of-truth #drift-prevention
- [risk] 2 pre-existing `plan-001-migration.test.ts` failures (deferred SPEC-007 work) remain in the suite — unrelated to TASK-001; tracked as a marathon open-item #pre-existing-fail

## Relations

- relates_to [[TASK-001-SPEC-008: Implement ADR Schema]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[REQ-001-SPEC-008: New Schema Suite]]
- relates_to [[DESIGN-001-SPEC-008: Coverage Module Layout]]