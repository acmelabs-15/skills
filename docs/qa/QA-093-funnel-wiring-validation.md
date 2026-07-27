---
title: "QA-093: Funnel Wiring Validation"
type: qa
status: DONE
permalink: qa/qa-093-funnel-wiring-validation
tags:
- qa
- reference-funnel
- completeness
- validation
---

# QA-093: Funnel Wiring Validation

## Objective

- **Feature under validation**: the two-stage reference-discovery funnel wired into the composition core, replacing the full-tree census walk. Stage one asks the complete-retrieval search surface which notes could reference a target (`--references` for wikilink edges, `--exhaustive` for bare-text containment, one exhaustive query per declared retired identity); stage two opens only those notes to produce exact `line:column` findings.
- **Scope**: commit `7081a45` on branch `feat/composition-tooling-for-fond` in the skills repo. Nine acceptance items covering suite health, type/lint gates, funnel-versus-census equivalence, exhaustion honesty, the alias fold, optional project resolution, reduction completeness, the manifest contract, and a live read-only pass against the fond graph.
- **Acceptance**: every item individually evidenced. Two defects adjudicated by the deep-research synthesis are explicitly OUT OF SCOPE and do not gate this validation: the cross-target file-level exclusion (queued follow-up with a validated fix) and the server-side stale-index currency hole (lands in the brain server). The matcher ships as-is per the red-team ruling that rejected the case-insensitive bare-ID and permalink knobs on real-corpus evidence.

## Approach

- **Test types**: full automated suite; static type and lint gates; source-shape inspection and symbol-absence greps; artifact cross-checks against committed code; live read-only integration probes against the real fond knowledge graph through the installed brain CLI.
- **Environment**: Bun 1.3.14 on macOS arm64; brain CLI v1.0.0 at the user-local bin; skills repo working tree clean at `7081a45`; the fond graph opened for READING only.
- **Commands**: `bun test` at the skills repo root; `bunx tsc --noEmit` and `bunx biome check .` in `shared/composition`; `bun run src/reference-scan.ts` in scan mode against `<fond repo>/docs` both with and without an explicit project, and in `--check` mode against a pre-discovery manifest; a per-file `Bun.hash` census of `<fond repo>/docs` taken before and after the whole validation run.
- **Write discipline**: no writes to the fond repository at any point, and no invocation of the repoint executor. Every artifact produced by this validation was written under the skills repo scratch tree.

## Results

### Summary

| Metric | Value |
|---|---|
| Tests Run | 1758 |
| Passed | 1758 |
| Failed | 0 |
| Skipped | 0 |
| Verdict | PASS |

Arithmetic reconciles: 1758 run = 1758 passed + 0 failed + 0 skipped. All nine acceptance items satisfied; three non-blocking findings recorded below.

### Test Results by Category

- [x] **1. Suite** — raw `bun test` at the skills repo root returns 1758 pass / 0 fail across 147 files with 3644 expect() calls, in 26.78s. The stated basis reconciles exactly: 1745 prior − 24 deleted ranked-surface tests + 37 new = 1758. Run independently for this validation, not taken from the delivery claim.
- [x] **2. Types and lint** — `bunx tsc --noEmit` in `shared/composition` exits 0 with no diagnostics. `bunx biome check .` checks 217 files in 88ms with zero errors and no fixes applied. FU-21 closure confirmed.
- [x] **3. Funnel equivalence** — the committed comparison artifact records 511 findings from both arms with `onlyInCensus: 0`, `onlyInFunnel: 0`, `recallAgainstCensus: 1` over 28 targets, comparing on a full finding identity (file, line, column, class, target, source, matchedText) rather than counts. Its claims spot-verify as consistent with the committed code shape on every checkable number: 58 queries equals 28 targets times two legs plus the two ANALYSIS-033 alias queries, exactly what the query planner emits; the census figure of 41 notes read equals the 69 markdown files in the tree minus the 28 targets excluded from their own scan; the four non-note candidates are the `decompose-*.yaml` distribution plans the markdown filter drops. The comparison driver reconstructs the whole-tree scope in the driver itself and says so, which is consistent with the walk having been removed from the library. Independently reproduced live: a fresh scan of the same targets returned 511 findings, 58 queries, zero unprovable.
- [x] **4. Exhaustion honesty** — every named mutation case is present in the funnel test file and passing. Covered: an absent completeness block is not read as complete; an empty completeness block is not read as complete; a non-boolean (string-true) provable is not read as complete; explicit provable false; an empty scope demotes a query even when it claims provable; one unproven query among several makes the whole union unproven; a CLI failure throws SearchUnavailableError rather than degrading to an empty set; a malformed envelope throws rather than reporting zero references. The funnel and scan test files run 108 tests with 0 failures. The propagation is verified in source as well: the funnel result's `provable` is the AND over every query, and the unavailable error is deliberately not caught in the discovery path.
- [x] **5. Alias fold** — the query planner pushes each declared `aliasEntityIds`, `aliasTitles` and `aliasPermalinks` entry as its own exhaustive query marked `viaAlias`, plans no references query for an alias (that leg resolves through the canonical title form a retired permalink no longer answers to), and drops any alias literal subsumed by a shorter planned literal. Confirmed live on the known case: the retired permalink query for ANALYSIS-033 returns 2 notes and produces 3 `viaAlias` permalink-class findings, including the ANALYSIS-034 reference that carries zero literal ANALYSIS-033 occurrences and is unreachable from any current-identity query. The alias title query returns 0, correctly, and costs nothing.
- [x] **6. Optional project** — with `--project` omitted the flag is left off the query entirely and the CLI resolves a project itself; the project that ANSWERED is read back off the response and recorded with `projectSource: "cli"`. Verified live: run from the skills working tree without a project, resolution picked "skills", and the run reported `projectMismatchSuspected: true` with 290 candidate paths absent from the fond docs root, a named remedy telling the caller to pin `--project`, and `provable: false` with a per-query reason for each unresolvable target. It returned an honest empty finding set with loud warnings rather than a silent clean bill of health. The explicit-project run records `projectSource: "caller"`. One-project-per-scan is asserted in source by throwing when more than one project answers inside a single run, and is unit-tested.
- [x] **7. Reduction completeness** — `reference-search.ts` does not exist at either candidate path. Greps across the package for the removed surface (`reference-search`, `referenceSearch`, `searchRanked`, `rankedSearch`, `searchNotes`) and for the census walk (`walkDocsTree`, `censusWalk`, `buildCensus`, `walkNotes`, `collectNoteFiles`) return zero matches in TypeScript, JSON and markdown. The core barrel exports only the funnel and the scanner. No dangling imports or exports: `tsc --noEmit` is clean and the barrel test passes. No back-compat shim and no duplicate discovery path survives; the scanner's own header states the funnel is the only discovery mechanism with no tree-walking fallback.
- [x] **8. Manifest contract** — the discovery block is REQUIRED on the manifest schema, not optional, with the rationale that an optional field would collapse "discovery proved itself exhaustive" into "nobody recorded whether it did". The legacy detector refuses a pre-discovery manifest with a named remedy; verified live by running `--check` against the repository's own pre-funnel scratch manifest, which exited 1 with the message that the manifest carries no discovery block and must be regenerated by re-running the scan. Non-markdown candidates are excluded and recorded: the live run reported the four `decompose-*.yaml` files under `nonNoteCandidates`, and the code documents the D-6 reason — closure re-scans with a markdown-only enumeration, so a finding recorded outside that class could never be re-derived and would be miscounted as repaired. Per-query `elapsedMs` is present on the funnel result API and populated per round trip; see F-1 for its deliberate exclusion from the persisted manifest.
- [x] **9. Live read-only fond pass** — a per-file hash census of the fond docs tree taken before and after the entire validation run is byte-identical: 73 files both times, zero added, zero removed, zero changed in hash or size. `repoint --apply` was never invoked and nothing was written to the fond repository. The funnel-scoped scan completed against the live graph with `provable: true` across all 58 queries, zero unprovable, zero missing on disk, `projectMismatchSuspected: false`, 38 notes considered, and 511 findings across 28 targets. A repeat scan produced a byte-identical manifest modulo the `generatedAt` stamp, confirming discovery is deterministic across runs.

## Findings

- **F-1 (minor, non-blocking, scratch artifact only)**: the comparison driver reads `discovery.elapsedMs` when composing its performance block, but the discovery schema carries no such field — per-query timings are deliberately stripped when the funnel result is written to the manifest so repeat scans stay byte-identical, and that stripping is test-enforced. JSON serialization drops the resulting undefined silently, so the committed comparison artifact is simply missing its `funnelQueryMs` keys. No library impact; the timing data exists on the in-memory funnel result where attribution needs it. Worth a one-line fix in the scratch driver, or dropping the key.
- **F-2 (scope caveat, not a defect)**: the 511/511 zero-delta is an EQUIVALENCE result — funnel scope versus whole-tree scope under one shared matcher and the same file-level target exclusion on both arms — and not a measurement of absolute reference recall. This matches the deep-research synthesis, which found end-to-end pattern-enumeration recall structurally unmeasured by every circulating figure and called for an adversarial corpus. The item as specified is satisfied; the claim should keep its scope when quoted.
- **F-3 (known, explicitly out of scope, recorded for traceability)**: the file-level target exclusion is confirmed present in the scanner, where targets are collected into an excluded set and skipped whole rather than filtered per candidate. Its arithmetic signature is visible in the census figure (69 markdown files minus 28 targets equals the 41 reported). Out of scope for this validation per the queued follow-up with a validated per-candidate fix; noted only so the census count in the comparison artifact is not later mistaken for a discrepancy.
- **Housekeeping observation**: the repository's committed scratch impact manifest predates the discovery-provenance shape and is now refused by the current schema. It served here as a live legacy-refusal fixture, but any future closure check against it will fail until it is regenerated.

## Observations

- [outcome] All nine acceptance items pass with independent evidence, on a suite of 1758 tests with zero failures, clean type checking, and zero lint errors across 217 files #validation #verdict
- [fact] A live read-only scan of the fond graph returned 511 findings across 28 targets with every one of its 58 queries proving its own completeness, reproducing the committed comparison artifact exactly #live-probe #provability
- [fact] The before-and-after per-file hash census of the fond docs tree is byte-identical across 73 files, so the validation left the graph untouched #read-only #safety
- [insight] The funnel fails honestly under a wrong-graph condition: an omitted project resolved to the wrong graph and produced a loud mismatch warning with a named remedy and provable-false rather than a silent empty result that would read as no references found #honesty #project-resolution
- [fact] The alias fold closes the known retired-identity residual live, producing three via-alias permalink findings that no query on the current identity could reach #alias-fold #recall
- [decision] Per-query timings are deliberately excluded from the persisted manifest so repeat scans are byte-identical, a property verified by producing two manifests that differ only in their generated-at stamp #determinism #manifest
- [fact] The reduction is complete: the ranked-reference surface file is gone, all ten removed symbols return zero grep matches across the package, and the core barrel exports only the funnel and the scanner with no dangling references #reduction #no-backcompat
- [constraint] The zero-delta equivalence result compares two scopes under one shared matcher and the same target exclusion, so it measures funnel-versus-census equivalence rather than absolute reference recall #epistemics #scope
- [risk] The committed scratch impact manifest predates the discovery-provenance shape and is refused by the current schema, so any closure check against it fails until it is regenerated #housekeeping #manifest

## Relations

- relates_to [[ANALYSIS-008: Reference-Discovery Performance Architecture]]
- part_of [[PLAN-002: Composition Tooling Follow-Up Register]]
- relates_to [[QA-092: Pipeline Completion Build Validation]]
