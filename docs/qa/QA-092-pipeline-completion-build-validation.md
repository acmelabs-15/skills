---
title: "QA-092: Pipeline Completion Build Validation"
type: qa
permalink: qa/qa-092-pipeline-completion-build-validation
tags:
- qa
- composition-tooling
- repoint-executor
- brain-search
- validation
---

# QA-092: Pipeline Completion Build Validation

## Objective

Independent validation of the pipeline-completion delivery at commit `d19085b` on branch `feat/composition-tooling-for-fond` — 30 files, 5132 insertions — validated as a stranger to the work, with the implementer's claims treated as inputs to verify rather than facts.

**Feature**: the repair stage that closes the composition tooling's reference pipeline. The scanner already answered "who points at this note" and the closure checker already answered "did anyone fix them"; the executor is the stage between them, plus an AI-ready work brief for what it declines and a CLI-backed advisory search leg.

**Scope**:

- Repoint executor family — seven core modules, the CLI entry, and the plan and residue schemas.
- AI-ready work brief replacing the flat residue list, grouped by repair site.
- CLI-backed search leg as a manifest augmentation layer over the installed brain CLI.
- Manifest schema gaining optional `searchType` and per-row `actualSource`, back-compatible by absence.
- NUL-byte fix restoring the closure module to text.

**Acceptance criteria verified**:

- Baseline suite passes at the stated count with a clean typecheck at package and repo root.
- The executor loop runs end to end on fixtures: scan, dry-run that writes nothing, apply that repairs the mechanical classes, closure re-scan producing the previously unproduced UPDATED status, and a second apply that is a no-op.
- The reversibility claim holds by its documented mechanism.
- The work brief groups by repair site, anchors entries with line, column and cited section, and orders notes heaviest-first.
- The two advisory probes get different repair shapes: an index edge-existence entry names both notes' Relations sections and warns the index's verb is not evidence, and anchors as whole-note with no column; a prose entry keeps its real located line anchor and gets the prose action.
- The search leg pages to a short page, reports unproven exhaustion as incomplete, fails loudly when unreachable, and treats relation rows as existence only.
- An old-shape manifest predating the new fields still loads and validates unchanged.
- TEXT and GRAPH scan internals are functionally unchanged.
- A live run against the fond graph is strictly read-only and changes nothing.

## Approach

**Test types**: independent execution of the shipped suite and typecheck; black-box end-to-end CLI driving of the scan, repoint and closure stages; white-box verification of the reversibility mechanism by importing the edit primitives and inverting a real applied edit set; live integration probing of the installed brain CLI including a deliberate unreachable-endpoint case; schema round-trip validation against a pre-existing artifact; static diff review for containment; and a read-only production-graph run with hash-level before and after integrity checks.

**Environment**: macOS, Bun 1.3.14, biome 1.9.4 as pinned by the package. The installed brain CLI reported version 1.0.0 and served searches from the already-running local server, which was left untouched throughout — the same server process was listening before and after the whole validation.

**Data strategy**: three tiers, deliberately separated so nothing under validation could reach a real note. Tier one is the shipped fixture tree, copied to a private scratch directory before any write so the committed fixtures were never mutated. Tier two is a scratch-authored scenario adding two referrer notes to exercise the cited-section anchor and the ordering rules, which the shipped fixtures do not reach. Tier three is the live fond graph, run strictly in scan and dry-run modes only, bracketed by a full-tree hash census. Every output artifact was written to the skills repository scratch directory, which is git-ignored at the repository root.

**Test files and artifacts**: the shipped suites under `shared/composition/tests/`; the fixture tree at `shared/composition/tests/fixtures/repoint-tree/`; and scratch harnesses driving `shared/composition/src/reference-scan.ts` and `shared/composition/src/repoint.ts` plus direct imports of `shared/composition/src/core/repoint-edits.ts` and `shared/composition/src/core/brain-cli.ts`.

## Results

### Summary

| Metric | Value |
| --- | --- |
| Tests Run | 38 |
| Passed | 38 |
| Failed | 0 |
| Skipped | 0 |
| Verdict | PASS |

Arithmetic reconciles: 38 run equals 38 passed plus 0 failed plus 0 skipped.

### By category

| Category | Run | Passed | Failed | Skipped | Verdict |
| --- | --- | --- | --- | --- | --- |
| Baseline gates | 4 | 4 | 0 | 0 | PASS |
| Executor end-to-end on fixtures | 8 | 8 | 0 | 0 | PASS |
| AI-ready work brief | 9 | 9 | 0 | 0 | PASS |
| CLI-backed search leg | 5 | 5 | 0 | 0 | PASS |
| Manifest schema back-compatibility | 2 | 2 | 0 | 0 | PASS |
| Containment and hygiene | 4 | 4 | 0 | 0 | PASS |
| Live fond-graph run, read-only | 6 | 6 | 0 | 0 | PASS |
| **Total** | **38** | **38** | **0** | **0** | **PASS** |

### Per-check results

| Check | Category | Status | Evidence |
| --- | --- | --- | --- |
| Suite passes from the repository root | Baseline gates | PASS | 1728 pass, 0 fail, 3502 expect calls across 146 files — the acceptance figure at HEAD `9483c5c` |
| Committed-state count reconciles to the claimed figure | Baseline gates | PASS | Working tree carried two uncommitted tests in the work-brief suite; 1728 minus 2 equals the claimed 1726, and both extra tests pass |
| Typecheck clean at package root | Baseline gates | PASS | Exit 0, zero output lines |
| Typecheck clean at repository root | Baseline gates | PASS | Exit 0, zero output lines |
| Scan produces the expected manifest | Executor end-to-end | PASS | 9 findings; classes 3 wikilink, 1 permalink, 1 project-prefixed permalink, 2 entity-id, 2 entity-id-section; sources TEXT 7, BOTH 2 |
| Dry-run writes nothing | Executor end-to-end | PASS | All four fixture hashes, modification times and sizes identical before and after; no staging residue left behind |
| Dry-run preview is byte-accurate about the apply | Executor end-to-end | PASS | The two predicted after-hashes matched the post-apply on-disk hashes exactly |
| Apply repairs all four mechanical classes | Executor end-to-end | PASS | 9 edits across 2 files; wikilink, permalink, project-prefixed permalink and entity-id all substituted; the section citation remapped while the designator citation kept its anchor |
| Multi-reference lines are addressed correctly | Executor end-to-end | PASS | Two edits on one line at columns 25 and 70, and two more at columns 28 and 71 on another, all correct — the right-to-left column arithmetic holds |
| Closure re-scan yields UPDATED | Executor end-to-end | PASS | 9 of 9 entries UPDATED, closed true — the status the checker carried but nothing previously produced |
| A second apply is a no-op | Executor end-to-end | PASS | Applied 0, already-repointed 9, files changed 0, and all four hashes unchanged from the first apply |
| Reversibility holds by its documented mechanism | Executor end-to-end | PASS | Inverting the recorded edit set against the real post-apply files restored both pre-apply hashes exactly |
| Residue replaces the flat list | Work brief | PASS | Report carries no residue, residual or worklist key; the schema documents the work brief as deliberately the only representation |
| Grouping is by repair site, not evidence site | Work brief | PASS | Two real bi-directional findings whose evidence sits at lines 30 and 31 of the source note were filed under their two counterpart files instead |
| Anchors carry line, column and cited section | Work brief | PASS | Entries read as line 15, col 22, cites "Section 9", with the fragment also exposed as its own field |
| Synthetic addresses print no fabricated column | Work brief | PASS | Graph-derived entries read as line 30 with the column field absent, rather than as a measured position |
| Entries are ordered by line then column | Work brief | PASS | Verified ascending across a three-entry note including two entries sharing a line |
| Notes are ordered heaviest-first | Work brief | PASS | 3 before 1 on the scratch scenario; 85, 77, 50, 44, 29, 20 on the live graph |
| Index edge entries anchor as whole-note with no column | Work brief | PASS | All 185 live edge entries anchor exactly "whole note" with the column field absent; the only distinct anchor value across the set is "whole note", so none prints a fabricated line 1, col 1 |
| Index edge entries carry the edge action, not the prose action | Work brief | PASS | All 185 name the Relations sections of both notes, require the typed pair in both directions, and warn the index's verb is not evidence and must not be copied; none carries the prose action |
| Prose advisory entries keep real located line anchors | Work brief | PASS | All 80 sit at a line above 1, carry a column, anchor as "line N, col M", and receive the prose action rather than the edge action |
| Paging runs to a short page | Search leg | PASS | A bounded enumeration returned 99 rows on one short page at limit 100, and the same 99 unique rows across 50 pages at limit 2 |
| Unproven exhaustion is reported as incomplete | Search leg | PASS | A full page at the page bound yielded exhausted false rather than a completeness claim |
| The stated reason for the short-page rule is real | Search leg | PASS | A live query at limit 2 reported total 2, confirming total mirrors rows returned and cannot prove exhaustion |
| Unreachable search fails loudly and names the probe | Search leg | PASS | Pointing the endpoint override at a dead ephemeral port raised the dedicated unavailable error carrying the reproduction command and the failing endpoint; the live server was never touched |
| Relation rows are existence-only | Search leg | PASS | Live rows carried verbs in both the edge permalink and the arrow-joined title; the code splits on the title arrow and reads only the endpoints |
| An old-shape manifest still validates | Back-compatibility | PASS | The 497-finding manifest predating both new fields parses under the current schema |
| Parsing injects no defaults and changes no values | Back-compatibility | PASS | Structurally identical to the input ignoring key order; no finding gained a source field and no top-level search-type key appeared |
| Scan internals are functionally unchanged | Containment | PASS | The scanner diff is one import, three argument fields, three argument cases, a usage string and a post-manifest augmentation branch behind an early return; the module holding the TEXT and GRAPH logic is absent from the commit entirely |
| The NUL fix restored the file to text | Containment | PASS | The delivered blob is 7636 bytes with no NUL byte and decodes as UTF-8; the parent blob was 6718 bytes and did contain NUL |
| Lint failures on owned files are inherited, not introduced | Containment | PASS | 3 errors across 2 of the 26 owned files; the closure module's import block is byte-identical to its parent, and neither failing location appears in the commit's added lines |
| New files are lint-clean | Containment | PASS | None of the 20 newly added files produced a lint or format error |
| Live scan completes and drift is characterised | Live fond run | PASS | 506 findings against 41 files scanned and 28 targets, versus 497 historically; 43 added and 34 removed |
| Executor dry-run reconciles at real scale | Live fond run | PASS | 129 applied, 0 already-repointed, 377 residual, summing exactly to 506, across 31 files previewed |
| The destination check refuses unverifiable repoints | Live fond run | PASS | 7 declined as destination-unresolved and 8 as section-absent, so 15 citations that would have read correctly while pointing at nothing were declined |
| No fond file changed | Live fond run | PASS | Porcelain status byte-identical before and after, all 69 document hashes unchanged, and no staging residue anywhere under the docs root |
| The live search server was left alone | Live fond run | PASS | The same listening process was present before and after the entire validation, including the deliberate unreachable-endpoint case |
| Address verification declines a reference that moved mid-run | Live fond run | PASS | The session note was committed between the augmented scan and the dry-run; the executor found neither the old nor the new form at the recorded line 2323 column 14, declined it as address-drift, and told the reader to re-scan rather than substituting blind |

### Live fond-graph drift characterisation

Drift against the historical 497-finding manifest is expected from continued authoring and is characterised rather than treated as a fault. All three historical bi-directional findings are now closed: the two one-way edges from the offline-boundary analysis and the sync-and-migration decision toward the product requirements note, and the missing inverse on the monorepo plan. The 43 added findings concentrate in exactly the notes under active edit — 28 in the monorepo plan, 9 in the product requirements note, 6 in the bootstrap session note — and the 34 removals are dominated by the same plan's references shifting line as the file grew. Net movement of plus 9 accounts precisely for 497 becoming 506.

## Findings

- **SCOPE BOUNDARY — this verdict describes two specific commits, not the working tree.** Every result here was measured against the delivery commit `d19085b`, with the suite figure taken at `9483c5c`. After validation completed, the working tree diverged: the manifest back-compatibility this note verifies as passing was deliberately dropped in favour of a discriminated schema, and the scan, search, closure, graph and manifest-schema modules plus the three skill documents all carry further uncommitted edits. Anyone reading this note as evidence about current code should re-measure. The back-compatibility check in particular is now a record of behaviour that was intentionally removed, not a claim about today.

- **LOW — pre-existing lint debt in the package, not a regression.** The package-wide check reports 58 errors across files this delivery never touched, including three parsers and two other core modules. Three of those errors fall on two of the 26 files this delivery owns, and both are inherited: the closure module's import block is byte-identical to its parent, so the NUL repair carried the existing ordering through verbatim, and neither failing location in the scanner test file appears among the commit's added lines. No new lint debt was introduced, and the 20 new files are clean.
- **LOW — a closure check stays green after the repoint breaks back-edges.** Repointing the fixture referrers left the source note's own two outbound edges without inverses, and the closure re-scan reported both as new findings while still returning closed true and exit 0. The information is in the report body, but a gate reading only the exit code would pass a graph the repoint had just made one-way. This is pre-existing closure behaviour rather than a change in this delivery; the executor existing is what makes the state reachable. Worth deciding whether new findings of a judgment class should influence the exit code.
- **INFO — this note does not fit the QA schema's title contract.** The schema requires a parent-referenced form naming a governing spec, and all 111 existing notes in the directory follow it. This delivery is registry-task work with no governing spec, so the title assigned to it carries no parent segment and the schema would reject the note as authored. Either the schema needs to model unparented build-validation QA or this note needs retro-parenting.
- **INFO — the advisory volume does not reproduce the figures it was to be sanity-checked against, though every behaviour does.** The expected live shape was 51 edge entries and 2 prose entries. This run measured 185 edge and 80 prose from 28 targets, and no natural cut of the data yields the expected figures: all 185 edge findings are already distinct unordered pairs, so there is no de-duplication left to apply, and the alternative cuts give 65 distinct counterparts and 28 distinct edge repair sites rather than 51. The prose side is the same story at 19 distinct locations rather than 2. The behavioural requirements all hold on every one of the 265 entries, so this is a volume difference and not a correctness one. The most likely cause is that the reference figures were taken against a materially smaller index: the graph gained 43 text findings and closed 3 bi-directional gaps within hours during this same session, and every note written re-indexes and adds edges. Worth re-measuring before either figure is treated as a baseline.
- **INFO — the prose advisory probe returns 4 entries per place to look.** The 80 prose entries resolve to only 19 distinct file-and-line locations, because the probe emits one entry per target that matched a line and an omnibus note's summary line matches many targets at once — one line drew 13 entries. The located lines are also mostly section boilerplate of the "Objective:" and "Omnibus note" kind, which pass the precision gate because they legitimately contain the target's title words. Grouping by repair site keeps this from misleading a reader, and the entries are advisory so nothing gates on them, but the signal-to-effort ratio of that probe is roughly one useful location per four entries.
- **INFO — the package's lint config declares a schema two majors ahead of its pinned tool.** The configuration names a 2.3.13 schema while the package pins and resolves biome 1.9.4, so the config is being interpreted by a tool that predates the schema it claims.
- **INFO — two work-brief tests landed mid-validation and reconcile the suite count.** The working tree carried 47 uncommitted added lines forming two tests when validation began, which is the entire difference between the 1728 observed from the repository root and the 1726 claimed for the delivery commit. They were committed during this validation as `9483c5c`, pinning the advisory edge-action and whole-note-anchor behaviours the delivery already implements, so both figures are correct at their respective commits: 1726 with 0 failures at `d19085b`, and 1728 with 0 failures at `9483c5c`. Characterisation, not an unmet gap.

## Observations

- [outcome] The full pipeline loop closes on fixtures: a scan of 9 findings, a dry-run proven to write nothing, an apply whose result matched the preview's predicted hashes exactly, a closure re-scan returning 9 of 9 UPDATED, and a second apply reporting 0 applied and 0 files changed #executor #closure
- [fact] UPDATED is now actually produced — the closure checker carried that status with nothing in the pipeline able to reach it until this delivery #closure #status
- [technique] Reversibility was verified independently of the implementation's own proof by importing the edit primitives and inverting the recorded edit set against the real post-apply files, restoring both pre-apply hashes #reversibility #integrity
- [insight] The dry-run's predicted after-hashes matched the post-apply files byte-for-byte, which makes the preview evidence about the execution rather than a separate cheaper computation #dry-run #preview
- [insight] Grouping the work brief by repair site rather than evidence site is what makes it actionable: two bi-directional findings whose evidence sat in one note were filed under the two different counterpart notes that actually need the edit #work-brief #repair-site
- [outcome] On the live graph the destination check declined 15 citations that would have repointed to sections that do not exist — 7 with no resolving note and 8 with no such anchor — each of which would have read correctly and passed the closure gate while pointing at nothing #destination-check #silent-failure
- [fact] The advisory search leg treats relation rows as existence only, which live rows justify: verbs arrive both inside the synthetic edge permalink and in the arrow-joined title, and one live row carried a project prefix inside the edge path #search-leg #relations
- [fact] A live query at limit 2 reported total 2, independently confirming that the surface's total mirrors rows returned and cannot prove exhaustion — the premise the short-page paging rule rests on #pagination #exhaustion
- [technique] Two page sizes were made to agree as the exhaustion proof: 99 rows on a single short page at limit 100, and the same 99 unique rows across 50 pages at limit 2 #pagination #verification
- [decision] The unreachable-search path was exercised by pointing the endpoint override at a dead ephemeral port rather than by disturbing the running server, so the failure mode was proven without touching live infrastructure #test-isolation #search-leg
- [constraint] The scan core is absent from the commit entirely, so the containment claim that TEXT and GRAPH internals are functionally unchanged holds by construction rather than by inspection of a risky diff #containment #scan
- [fact] The live run left the graph provably untouched: porcelain status byte-identical, all 69 document hashes unchanged, and no staging residue under the docs root #read-only #integrity
- [problem] A closure check returns exit 0 and closed true even when the repoint has just left the source note's own edges one-way, so a gate reading only the exit code would pass a graph it had itself made asymmetric #closure #exit-code
- [risk] The package carries 58 pre-existing lint errors across files this delivery never touched, which makes lint useless as a regression signal here and required per-file attribution to clear the delivery #lint-debt #hygiene
- [outcome] The two advisory probes are correctly given different repair shapes on all 265 live entries: an index edge row is told to check both notes' Relations sections in both directions and warned never to copy the index's verb, while a prose row is told to read its located line and judge whether the wording names the target #advisory #precision
- [decision] An address that was never measured is printed as "whole note" with no column rather than as line 1 col 1, so an agent is never sent to a note's frontmatter by a coordinate the scan never took #anchors #honest-output
- [insight] Advisory volume is not a stable quantity to gate on: the same probe set measured 265 entries where 53 were expected, entirely from index growth during the session, while every per-entry behavioural rule held — which is the argument for asserting shapes rather than counts #advisory #verification
- [outcome] The address-verification guard fired on live data unprompted: the session note was committed between the scan and the dry-run, and the executor declined the moved reference as address-drift instead of substituting at a stale coordinate #address-drift #safety
- [problem] The prose advisory probe emits one entry per matching target rather than per location, so 80 entries resolve to 19 places to look and a single omnibus summary line drew 13 of them #advisory #signal-density

## Relations

- relates_to [[ANALYSIS-007: Baseline Evaluation of the Composition Integration Commit]]
- relates_to [[PLAN-002: Composition Tooling Follow-Up Register]]