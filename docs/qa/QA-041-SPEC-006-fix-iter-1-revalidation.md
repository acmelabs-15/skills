---
title: 'QA-041-SPEC-006: Fix Iter 1 Revalidation'
type: qa
permalink: qa/qa-041-spec-006-fix-iter-1-revalidation-1
tags:
- qa
- spec-006
- fix-iter-1
- revalidation
---

# QA-041-SPEC-006: Fix Iter 1 Revalidation

## Verdict

**PASS — all 3 QA-040 blocking findings resolved; no regressions detected.**

The SPEC-006 fix-iter-1 commit (impl agent return, working tree on top of `72ffced`) addresses every blocking item from [[QA-040-SPEC-006: Batched Build Revalidation]]:

1. `install.sh` SKILLS array extended with `defrag` + `ingest` — all 4 skills land
2. `biome.json` auto-formatted via `biome check --write` — 0 errors at repo-root scope
3. Staleness default unified at 90 days across all 4 source/doc locations (was split 90/180 per REQ-002 AC-5)

Aggregate suite holds at 585/585 PASS, `bunx tsc --noEmit` clean. SPEC-006 is DONE-eligible.

## Objective

Re-verify the 3 QA-040 blocking findings against the impl agent's fix-iter-1 deliverable, confirm no regressions across SPEC-005 + SPEC-006 + sibling SPEC-007 composition tests, and clear SPEC-006 for ACCEPTED → DONE.

## Scope

In-scope: the 3 QA-040 blocking items + repo-wide `bun test` + `bunx tsc --noEmit` + install.sh end-to-end smoke test.

Out-of-scope: the 4 non-blocking observations from QA-040 (DESIGN-001 design-vs-impl deviation; `test-report` vs `qa` canonical-key drift; generated placeholder relation `[[Ingested Source Content]]`; `defrag.ts` node:fs use). These are deferred follow-ups, not gating items.

## Acceptance Criteria Refs

- [[REQ-002-SPEC-006: Memory Audit]] AC-5 (staleness default 90 days)
- [[REQ-006-SPEC-006: Coexistence with Memory-Defrag and Memory-Ingest]] AC-5 (install.sh symlinks all 4 skills)
- TASK-001 / TASK-002 / TASK-003 / TASK-004 / TASK-005 / TASK-006 DoD biome-lint lines
- TASK-001 DoD item 5 (install.sh defrag entry); TASK-004 DoD item 8 (install.sh ingest entry)

## Approach

- **test_types**: unit, integration, install-script smoke (end-to-end)
- **environment**: bun 1.x on macOS Darwin; repo-local `bun test` + `bunx biome check` + `bunx tsc --noEmit`; `install.sh --copy` smoke run with synthetic HOME under `mktemp -d`
- **data_strategy**: live working-tree against post-fix commit; no fixtures regenerated
- **test_file**: orchestrated shell verification — `bun test`, `bunx tsc --noEmit`, `bunx biome check`, `HOME=<tmp> ./install.sh --copy`

## Per-Blocking-Finding Verification

### Finding 1 — install.sh missing defrag + ingest symlinks

**PASS.** `install.sh:30-35` SKILLS array contains all 4 entries (`decompose`, `recompose`, `defrag`, `ingest`). Header comment lines 7-11 list all 4 skills with SPEC attribution. End-to-end smoke test under `HOME=$(mktemp -d) ./install.sh --copy` produced `~/.claude/skills/{decompose,defrag,ingest,recompose}` — confirmed via `ls -la`. Idempotency loop (lines 47-69) untouched; `--copy` rsync fallback (lines 63-68) reaches all 4 entries.

| Evidence | Location |
|:--|:--|
| SKILLS array body | install.sh:30-35 |
| Header skill list | install.sh:7-11 |
| Smoke test result | 4 directories created under tmp HOME |

### Finding 2 — biome check fails on biome.json self-format

**PASS at SPEC-006 scope.** Repo-root `bunx biome check` reports `Checked 17 files in 32ms. No fixes applied.` — zero errors. The auto-format wrapped the `files.include` + `files.ignore` arrays into per-entry lines (biome.json:33-48), satisfying biome's own formatter.

**Composition-lib scope (orthogonal)**: `cd _shared/composition && bunx biome check` reports 1 formatter error in `tests/plan-001-migration.test.ts:17` (the SPEC-007 PLAN-001 migration test file, last touched at commit `9da19d5` — pre-existing, untouched by SPEC-006 fix-iter-1). Per `git log --oneline --all -- _shared/composition/tests/plan-001-migration.test.ts` this file has a single commit at SPEC-007 territory; the SPEC-006 fix did not change it. Flagged here as a sibling-scope finding for the SPEC-007 owner; **not a SPEC-006 blocking regression**.

| Evidence | Location |
|:--|:--|
| biome.json formatter compliance | biome.json:33-48 (line-wrapped arrays) |
| Repo-root biome verdict | `Checked 17 files… No fixes applied.` |
| Composition-lib pre-existing finding | `_shared/composition/tests/plan-001-migration.test.ts:17` (SPEC-007 territory, commit 9da19d5) |

### Finding 3 — Staleness default mismatch (180 vs 90)

**PASS.** All 4 cited locations now show 90 days, and zero `180` references remain in the targeted files.

| Location | Verification |
|:--|:--|
| `defrag/scripts/audit.ts:48` | `/** Staleness threshold in days (default 90, per REQ-002-SPEC-006 AC-5). */` — citation present |
| `defrag/scripts/audit.ts:87` | `const DEFAULT_STALENESS_DAYS = 90;` |
| `defrag/scripts/defrag.ts:76` | `stalenessDays: 90,` in parseArgs defaults |
| `defrag/scripts/defrag.ts:107` | `"  --staleness <days>    Staleness threshold in days (default: 90)",` (usage text) |
| `defrag/SKILL.md:62` | `Last-modified more than the staleness threshold (default 90 days)` |
| `defrag/SKILL.md:39` | Example: `--staleness 90` |
| `README.md:43` | `\| --staleness <days> \| Staleness threshold in days (default: 90) \|` |
| `README.md:68` | Example block: `defrag.ts --report-only --staleness 90` |

`grep -rn "180" defrag/scripts/audit.ts defrag/scripts/defrag.ts defrag/SKILL.md README.md` returns zero matches. Impl + REQ-002 AC-5 + docs now aligned at 90.

## Regression Spot-Checks

### Full repo test suite

`bun test` → **585 pass / 0 fail / 1225 expect() calls across 66 files** in 1337ms. Matches QA-040 baseline aggregate (585) — no test added, no test broken.

### TypeScript

`bunx tsc --noEmit` → clean (zero output). Matches QA-040 baseline.

### install.sh end-to-end smoke

Under `HOME=$(mktemp -d) ./install.sh --copy`, all 4 skill directories landed:

```
copied: <repo>/decompose/ -> <tmp>/.claude/skills/decompose/
copied: <repo>/recompose/ -> <tmp>/.claude/skills/recompose/
copied: <repo>/defrag/   -> <tmp>/.claude/skills/defrag/
copied: <repo>/ingest/   -> <tmp>/.claude/skills/ingest/
install: complete (copy mode)
```

`ls -la <tmp>/.claude/skills/` confirms 4 directories (`decompose`, `defrag`, `ingest`, `recompose`).

### Per-TASK DoD spot-checks (SPEC-006)

| TASK | DoD item under scrutiny | Verdict |
|:--|:--|:--|
| TASK-001 | install.sh defrag entry; biome lint | PASS (both) |
| TASK-002 | biome lint; audit defaults | PASS (90-day default now matches AC-5) |
| TASK-003 | biome lint; delegation summary | PASS |
| TASK-004 | install.sh ingest entry; biome lint | PASS (both) |
| TASK-005 | biome lint; Pattern 2 seam | PASS (seam unchanged) |
| TASK-006 | 84 SPEC-006 tests; biome lint | PASS (tests still 84; biome at repo-root scope clean) |
| TASK-007 | README install section accurate (4 symlinks); biome lint | PASS (README + install.sh now consistent) |

## Test Results

| Suite | Tests Run | Passed | Failed | Skipped | Notes |
|:--|:--|:--|:--|:--|:--|
| Aggregate repo (`bun test`) | 585 | 585 | 0 | 0 | Same fileset (66 files) as QA-040; no regression |
| SPEC-006 sub-suite (defrag + ingest + detect-context) | 84 | 84 | 0 | 0 | Matches QA-040 sub-count |
| install.sh --copy smoke (end-to-end) | 1 | 1 | 0 | 0 | 4 skills land under tmp HOME |
| bunx tsc --noEmit | 1 | 1 | 0 | 0 | Clean; no diagnostics |
| bunx biome check (repo root) | 1 | 1 | 0 | 0 | 17 files checked, 0 errors |

tests_run = 672 (585 + 84 + 1 + 1 + 1) but the 84 are a subset of the 585; canonical aggregate summary uses non-overlapping rows:

- Aggregate test run: 585 passed
- Smoke: 1 passed
- tsc: 1 passed
- biome (repo-root): 1 passed

For schema cross-field invariant (`tests_run === passed + failed + skipped`), the headline summary holds the aggregate 585/0/0 form.

## Summary

tests_run: 585, passed: 585, failed: 0, skipped: 0, verdict: PASS, assertions: 1225

## Findings

Zero blocking findings. The 4 QA-040 non-blocking observations are explicitly out-of-scope and remain open for follow-up (none gating SPEC-006 DONE).

Two **meta-findings** worth flagging for the orchestrator (also non-blocking):

- **Sibling-scope biome failure in `_shared/composition/tests/plan-001-migration.test.ts:17`** — pre-existing from SPEC-007 territory (commit `9da19d5`), unchanged by SPEC-006 fix-iter-1. Should be tracked separately under SPEC-007 follow-up; mentioning here so it is not lost.
- **TestReportNoteSchema is stale vs the 2026-05-21 `test-report` → `qa` rename** — the schema enforces `^TEST-REPORT-\d{3,}-SPEC-\d{3,}:` title regex and `type: test-report` literal, conflicting with current CONVENTIONS Section 3 (canonical type `qa`, file prefix `QA-NNN`). This QA-041 note follows project convention (matching QA-040 precedent) over the stale schema; `validateTestReportPassClaim` rejects this note on schema fields, but cross-field invariants (tests_run = passed + failed + skipped; PASS implies failed=0 and tests_run>0; no row-level FAIL) hold. Composition-library schema needs an update to track the rename — sibling SPEC-007 / Phase X follow-up.

## Observations

- [outcome] All 3 QA-040 blocking findings PASS verified against post-fix-iter-1 working tree #revalidation #spec-006
- [fact] install.sh SKILLS array includes all 4 skills (decompose, recompose, defrag, ingest) at install.sh:30-35 #install #fix
- [fact] install.sh --copy end-to-end smoke produces all 4 skill directories under tmp HOME #install #smoke-test
- [fact] biome.json auto-formatted with line-wrapped files.include + files.ignore arrays at biome.json:33-48; repo-root bunx biome check reports zero errors across 17 files #biome #formatter
- [fact] Staleness default unified at 90 days in 4 source-of-truth locations + 4 doc/example references; zero residual 180 references in audit.ts / defrag.ts / defrag/SKILL.md / README.md #staleness #req-002
- [fact] audit.ts:48 jsdoc cites REQ-002-SPEC-006 AC-5 inline alongside the 90-day default constant #conventions #citation
- [fact] bun test full suite holds at 585 pass / 0 fail / 1225 expects across 66 files in 1337ms — no regression vs QA-040 baseline #tests #stable
- [fact] bunx tsc --noEmit clean post-fix — no TypeScript diagnostics introduced #typescript #clean
- [insight] Sibling-scope biome failure in _shared/composition/tests/plan-001-migration.test.ts:17 is pre-existing SPEC-007 territory (commit 9da19d5) and not a SPEC-006 fix-iter-1 regression #sibling-scope #spec-007
- [insight] TestReportNoteSchema enforces TEST-REPORT prefix and type: test-report — stale vs 2026-05-21 canonical rename to qa / QA prefix; this note follows project-convention precedent set by QA-040 over the stale schema #schema-drift #convention-rename
- [decision] SPEC-006 cleared for ACCEPTED → DONE transition pending orchestrator state-sync; QA-040 blocking items resolved, 4 non-blocking items deferred as follow-ups #spec-006-done #ready

## Relations

- part_of [[SPEC-006: Defrag and Ingest Skills]]
- pairs_with [[QA-040-SPEC-006: Batched Build Revalidation]]
- relates_to [[REQ-002-SPEC-006: Memory Audit]]
- relates_to [[REQ-006-SPEC-006: Coexistence with Memory-Defrag and Memory-Ingest]]
- relates_to [[TASK-001-SPEC-006: Implement Defrag CLI and Skill Structure]]
- relates_to [[TASK-004-SPEC-006: Implement Ingest CLI and Skill Structure]]
- relates_to [[TASK-007-SPEC-006: Document Defrag and Ingest Skill UX in README]]
