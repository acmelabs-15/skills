---
title: "QA-094: ANALYSIS-008 Build Validation"
type: qa
status: DONE
permalink: qa/qa-094-analysis-008-build-validation
tags:
- qa
- reference-discovery
- currency-proof
- batching
- parity
---

# QA-094: ANALYSIS-008 Build Validation

## Scope

Validation of the completed performance-architecture build spanning two repos: the composition client in the skills repo (commits `eeae8b8` + `b3872e3`, plus docs erratum `f8d96f8`) and the brain server (deliberately uncommitted working tree — owner-ruled, not an anomaly).

The fond knowledge graph was opened READ-ONLY throughout. No `--apply`, no writes to fond, no git invocation in any repo. The only write performed by this validation is this note.

**Binary-currency precondition, established first.** The installed CLI at `~/.local/bin/brain` is a compiled Mach-O built Jul 26 23:02. `find apps/mcp/src -name "*.ts" -newer <binary>` returns zero files, so no server source is newer than the binary. The live probes below therefore exercise the same code as the source reads — without this check, every live result would be evidence about an unknown older build.

## Per-claim results

| # | Claim | Verdict |
|:--|:--|:--|
| 1 | Cross-target exclusion is per candidate, not per file | PASS |
| 2 | Currency proof is checksum-only against file bytes | PASS |
| 3 | Multi-literal surfaces + two-invocation batching | PASS |
| 4 | Trigram absence; `engine` only ever emits "scan" | PASS |
| 5 | Smalls — busy_timeout, feature-detection, dead code removed | PASS |
| 6 | End-to-end parity, zero deltas both directions | PASS |
| 7 | filesScanned re-baseline | PARTIAL |
| 8 | Test gates in both repos | PASS |

### Claim 1 — cross-target exclusion — PASS

`shared/composition/src/core/reference-scan.ts` `scanScope` reads every note in scope with no file-level skip: the loop at lines 312-340 reads and records each path unconditionally and increments `filesScanned` for all of them. Suppression is keyed on the candidate, not the file — an `ownEntityId` map built from targets at line 305, consulted at line 332, and applied per finding at line 336 as `if (finding.target === own) continue;`.

The load-bearing half is preserved and pinned by test: a note's own frontmatter title and permalink lines still produce nothing (`tests/reference-scan.test.ts:1136-1147`).

Absolute finding count re-measured under item 6 rather than inherited: 840, not the 838 stated in the brief. See claim 6 for the drift analysis. The mechanism is confirmed; the figure is re-baselined.

### Claim 2 — currency proof — PASS

`apps/mcp/src/db/corpus-pass.ts` computes `createHash("sha256")` over the file's own bytes (line 210) and compares against `entity.checksum` (line 230). That comparison — `const current = row.checksum === digest` — is the sole currency determination in the module.

Negative evidence for the "no stat/mtime/size gating" half, which matters more than the positive:

- `entity.size` appears exactly once in the whole `src/db/` tree, in the line 23 comment stating it is deliberately NOT used. There is no read of it.
- `mtimeMs` is carried on `CorpusFile` (line 204) but never consulted for a currency decision. Every other `mtime`/`lastModified` hit in the server is in unrelated subsystems — sync-file, the organizer's stale analyzer, and the config lock.

Test run: `bun run --bun vitest run src/db/__tests__/currency.test.ts` → **15 passed / 15**, 192ms. The size-preserving case is present and passing under its own name: `T2 — a SIZE-PRESERVING edit that removes a reference is honoured` (line 83). That is the case a stat-tuple proof fails and a checksum proof survives, so it is the one that makes the claim falsifiable rather than decorative.

### Claim 3 — multi-literal surfaces and batching — PASS

Three sub-claims, each probed live against the fond graph.

**Batched references returns per-target totals and per-note attribution.** `brain search --references "ADR-001,ANALYSIS-033,ANALYSIS-034" --project fond --json` returned a `per_target` array of three entries with independent totals (35 / 14 / 18), each carrying its own `completeness` block and `resolvedPermalink`. Top-level `total` is 43 — less than the 67 sum — confirming rows are deduplicated to notes. Each row carries `matched[]` naming which members it answers for; `ANALYSIS-002` matched all three, `ANALYSIS-004` matched only `ADR-001`.

**A mixed call keeps failure attributable.** `--references "ADR-001,ANALYSIS-999"` returned top-level `provable: false` with reason `ANALYSIS-999: target "ANALYSIS-999" matched no note in this project`, while `ADR-001` retained `provable: true` at total 35 and `ANALYSIS-999` carried its own reason at total 0. An unresolvable member taints the aggregate verdict without tainting its companions — which is the property that lets a caller act on the good half.

**Extra positionals are literals, not comma-split.** Two probes make this decisive rather than inferred:

- `brain search "ADR-001" "ANALYSIS-033" --exhaustive` → `per_token` with two entries (38 and 16), dedup total 41.
- `brain search "ADR-001,ANALYSIS-033" --exhaustive` → total **0**.

Had the surface comma-split, the second would have returned 41. It returned 0 because no note contains that literal string. Client-side this is `buildExhaustiveArgs` (`brain-cli.ts:340-349`) passing literals as separate positionals, against `buildReferencesArgs` (line 324-337) which does comma-join — the two legs differ deliberately because note titles contain commas.

**Two invocations, 58 planned queries recorded.** Verified empirically with a counting runner wrapping the real CLI over the same 28-target fond target set:

```
targetCount: 28
actualCliInvocations: 2
  references  — 28 literals, argv length 6   (one comma-joined flag value)
  exhaustive  — 30 literals, argv length 35  (30 positionals)
plannedQueriesRecorded: 58
provable: true, unprovable: []
candidates: 66
```

58 planned queries survive as provenance across 2 processes. The mapping back is `reference-funnel.ts:299-332`, which recovers each planned query's outcome from the batch's `per_target` block and falls back to the batch verdict when a surface reports no per-member outcomes — conservative in the direction of under-claiming.

### Claim 4 — trigram absence — PASS

`grep -rniE "trigram|fts5"` over `apps/mcp/src/` returns two hits, both comments, both asserting the opposite of an FTS5 addition: `parity/__fixtures__/recall.fixture.ts:122` ("The index is a plain table, not an FTS5 virtual table") and `db/__tests__/identifier-recall.test.ts:6` ("a plain table reproduces it exactly, with no FTS5 virtual table"). Nothing item-4-related shipped.

The `engine` field is a literal type — `readonly engine: "scan"` at `db/identifier-recall.ts:113` — so emitting anything else is a compile error, not a convention. All five assignment sites (lines 170, 188, 208, 264 and the type) are `"scan"`. It is also absent from the CLI JSON payload entirely: the exhaustive probe above returned no `engine` key. It cannot emit a wrong value because it does not reach the wire at all.

The docs erratum commit `f8d96f8` records the supersession, so the shipped state and the analysis note agree.

### Claim 5 — smalls — PASS

| Small | Evidence |
|:--|:--|
| `busy_timeout` on both legs | `db/identifier-recall.ts:155` and `db/reference-recall.ts:216`, both `PRAGMA busy_timeout = 5000`; a third at `reference-recall.ts:472` covers a probe connection |
| Feature-detection before first query | `db/corpus-pass.ts:150-162` `hasColumns` via `PRAGMA table_info`, called at line 172 before any `SELECT`, throwing a schema-specific error rather than a generic SQLITE_ERROR |
| `buildFilterSql` removed | `grep -rn "buildFilterSql" src/` → zero matches |
| Client `runQuery` seam removed | `grep -rn "runQuery"` over composition `src/` and `tests/` → zero matches |

The feature-detection ordering is the one worth calling out: catching the error after the fact collapses "schema predates the column" (recoverable) into "database is corrupt" (not), because reading an absent column raises a generic error indistinguishable from corruption.

### Claim 6 — end-to-end parity — PASS

Re-ran `scratch/funnel-vs-fulltree.ts` read-only against the fond graph (28 targets, `scratch/fond-targets.json`). Result:

```
verdict: identical: true, onlyInCensus: 0, onlyInFunnel: 0, recallAgainstCensus: 1
census: 840 findings, 69 notes read,  837ms
funnel: 840 findings, 66 notes read,  951ms, 58 queries, unprovableQueries: []
missingOnDisk: [], nonNoteCandidates: []
```

Both arms agree exactly, in both directions, with empty delta maps. Recall 1.0. Every one of 58 queries provable. Query phase 951ms against the ~1,001ms claimed — inside run-to-run variance and slightly faster.

**Drift is above the stated band and is benign.** The brief anticipated 837/838/839; this run measured 840 on both arms. The direction is consistent with the stated cause — the live fond session note is appended during measurement, so the count grows monotonically as events land. The gate is that the two arms agree with each other exactly, and they do. The alias residual also still resolves as designed: the retired permalink `analysis/analysis-028-independent-pass-reconciliation` returns 2 notes where the retired title returns 0, which is the fold that keeps `ANALYSIS-034` reachable.

The wrong-graph detector remains live: the auto-resolved-project arm answered from the `skills` graph with 326 findings, `provable: false`, and `projectMismatchSuspected: true`. A wrong graph answers fluently, so this arm is what proves the detector still fires.

### Claim 7 — filesScanned re-baseline — PARTIAL

**New baseline recorded, QA-093's figure not inherited.** Under the changed semantics `filesScanned` counts target notes too, because they are genuinely scanned:

| Arm | filesScanned | Composition |
|:--|:--|:--|
| Funnel (28 fond targets) | **66** | candidate set incl. targets |
| Whole-tree census | **69** | every `.md` in the fond docs tree |

The 66 figure is independently corroborated: the invocation probe under claim 3 reported `candidates: 66` from stage one, matching the scan arm exactly.

**Code and tests are consistent with the new semantics.** Both assertions were updated rather than left stale — `tests/reference-scan.test.ts:331` expects 4 under a test renamed to "a target note yields no findings that name itself, but is still scanned", and line 1152 expects 3 under a test named "every scanned note is counted, targets included". Under the old semantics those would be 2 and 1. No consumer in `src/` derives anything from the value beyond passing it through to `notesRead` and `notesConsidered`.

**Why PARTIAL — one stale documented figure survives, outside the code.** An exhaustive search of the skills graph for the literal `filesScanned` returns exactly one note (completeness provable), the baseline-evaluation analysis note ANALYSIS-007, which still reconciles the old semantics verbatim:

> The manifest's `filesScanned` of 41 reconciles precisely: 69 markdown files minus the 28 targets, which `reference-scan.ts:222` excludes from their own TEXT scan.

Both halves are now wrong: 41 was `69 − 28` under file-level exclusion, and the cited `reference-scan.ts:222` no longer holds that logic (the suppression now lives in `scanScope` around line 332). This is a dated historical measurement in a DRAFT analysis note, not a dependency — nothing reads it, and it cannot cause a wrong answer. It is recorded as documentation drift needing a dated erratum rather than a silent overwrite, on the principle that a stale stated value should be corrected against render truth with its provenance intact. It does not block the verdict.

### Claim 8 — gates — PASS

| Repo | Command | Expected | Observed |
|:--|:--|:--|:--|
| skills | `bun test` | 1760 / 0 | **1760 pass, 0 fail**, 3647 expect() calls, 147 files, 29.18s |
| brain | `bun run test` | 1542 / 6 skipped / 75 files | **1542 passed, 6 skipped**, 75 files, 9.60s |

Both hit their expected numbers exactly.

## Verdict

**PASS.** Seven of eight claims validate cleanly against live evidence; claim 7 is PARTIAL on a documentation artifact that sits outside the code and blocks nothing.

Two figures are re-baselined and should be carried forward rather than the values in the brief: findings **840** (both arms, was 838) and `filesScanned` **66** funnel / **69** whole-tree. One follow-up is owed — a dated erratum on the ANALYSIS-007 reconciliation paragraph.

## Observations

- [fact] The installed brain CLI binary (Jul 26 23:02) is newer than every server source file, so live probe results are evidence about the reviewed code rather than an unknown older build #binary-currency #evidence-validity
- [fact] Batching collapses a 28-target sweep to exactly 2 CLI invocations while retaining all 58 planned queries as per-query provenance, verified with a counting runner over the real CLI #batching #provenance
- [technique] Passing one comma-joined literal to the exhaustive leg returns 0 where two positionals return 41 — a decisive falsification test for comma-splitting, rather than an inference from argv shape #test-design #multi-literal
- [fact] The currency proof rests solely on `row.checksum === digest`; `entity.size` appears only in a comment stating it is unused, and carried `mtimeMs` is never consulted for a currency decision #currency-proof #checksum
- [insight] The size-preserving-edit test is what makes the currency claim falsifiable — it is precisely the case a stat-tuple proof passes wrongly and a checksum proof catches #test-coverage #falsifiability
- [fact] Funnel and whole-tree census agree at 840 findings with empty delta maps in both directions and recall 1.0, with all 58 queries provable #parity #recall
- [problem] The finding count drifted to 840, above the anticipated 837-839 band, because the live session note is appended during measurement; both arms still agree exactly, which is the actual gate #measurement-drift #tolerance
- [outcome] `filesScanned` re-baselined to 66 for the funnel arm and 69 whole-tree; corroborated independently by stage one reporting 66 candidates #re-baseline #metrics
- [problem] ANALYSIS-007 still documents the superseded `filesScanned` reconciliation (41 as 69 minus 28) and cites a line number that no longer holds the logic; exhaustive search proves it is the only note carrying the figure #documentation-drift #errata
- [decision] Claim 7 graded PARTIAL rather than PASS: the code and both tests moved to the new semantics, but a stale stated value survives in the graph and is owed a dated erratum #verdict-rationale #partial
- [fact] Nothing trigram or FTS5-related shipped; the two matching hits are comments asserting a plain table, and `engine` is a literal type that never reaches the CLI payload #trigram-absence #engine
- [outcome] Both test gates hit expected counts exactly — skills 1760/0 across 147 files, brain 1542 passed with 6 skipped across 75 files #gates #regression

## Relations

- relates_to [[ANALYSIS-008: Reference-Discovery Performance Architecture]]
- pairs_with [[QA-093: Funnel Wiring Validation]]
