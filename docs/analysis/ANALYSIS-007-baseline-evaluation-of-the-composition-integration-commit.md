---
title: 'ANALYSIS-007: Baseline Evaluation of the Composition Integration Commit'
type: analysis
status: DRAFT
permalink: analysis/analysis-007-baseline-evaluation-of-the-composition-integration-commit
tags:
- composition-tooling
- brain-search
- impact-detection
- baseline-evaluation
- options
---

# ANALYSIS-007: Baseline Evaluation of the Composition Integration Commit

## Context

Commit `8aad9681c8d265fd0e9869e8b08c8fccde706c4b` on branch `feat/composition-tooling-for-fond` is the integration pass over the docs-tree verification tooling. The code baseline sits at this commit after a deliberate owner-locked reset, with one docs-only commit above it.

Purpose provenance frames every judgment below. The preceding sessions were spent repairing, by hand through the agent, the fallout of curating memory notes with the decompose, recompose and defrag skills: one-way inverse edges, stale citations into renumbered children, and section citations onto pre-split numbering. The owner's originating directive was that these skills should be able to see, before they change a note, every note that references it — because the two-way reference rule means those referencing notes must change too; that any limit on how many such references can be reported be removed and completeness insisted on; and that this specific hand-work is what had been taking so long via the agent. The orchestrator's reply added reconcile-by-diff as standing practice and a figure-staleness count re-derivation checker as its natural sibling.

The repair surface was then split into two classes, and that split governs this whole evaluation. Split-induced reference drift is mechanically enumerable at plan time, which produced the inbound-reference impact scanner. Correction-propagation failure is not enumerable that way, which produced reconcile-by-diff, with figure-staleness count re-derivation added alongside. The bi-directional rule became the scanner's formal GRAPH inbound index and every relation-count cap was ordered removed. The scanner was accepted after its parser consolidation fixed H3-grouped Relations parsing that had previously returned zero edges. This commit is the integration pass over that work plus a compile repair.

After the scanner landed, the Brain MCP search wrapper was expanded — keyword mode revived end to end, relation edges made directly queryable, permalink wildcard enumeration, filter-only queries, structured metadata filters, a strict-after date filter, and response-level provenance. That expansion was implemented but nobody returned to the skills codebase to ask how it should reshape this implementation. This note is that evaluation.

The central question per component: could the expanded search surface significantly reduce this implementation, possibly to a single module all three skills share; simplify specific modules; or something else. Four option classes are presented per component — consolidate, replace, update, keep — with pros and cons. Two further axes cut across every component: who invokes the search, and whether a deterministic repoint executor should consume the manifest. Nothing is locked here; the decisions phase adjudicates.

## Executive Summary

**The pipeline mechanizes the agent out of the impact-DISCOVERY loop completely and out of the impact-REPAIR loop not at all, because the commit ships no executor. Discovery is measured and complete; repair is one unbuilt module, and the manifest already carries every field that module would need. The expanded search surface does not reduce this implementation — the strongest single measurement against that hope is that the search leg contributed zero of the 497 findings in the real run.**

Answering the boundary hypothesis in its sharpened form. The hypothesis is that merging, splitting and recomposing notes stay AI-driven, and that the mechanization target is specifically identifying the OTHER notes those operations impact, and potentially updating those notes programmatically instead of an AI reading each one to work out what needs changing. Measured against the real fond manifest: identification is done, updating is not.

Identification is done, and the figures come from the artifact rather than an estimate. The manifest at `scratch/fond-impact-manifest.json` in the skills repo, generated 2026-07-26 against the fond docs root, records 497 findings over 41 scanned files against 28 targets. Re-derivation over that file shows `referencingFile`, `line`, `column`, `matchedText`, `class` and `target` present on 497 of 497 findings, with `sectionFragment` additionally present on all 59 section citations. The triple `referencingFile:line:column` is unique across all 497 with zero collisions, so every finding carries an exact address.

Updating is not done, and the gap is narrow. 494 of the 497 findings — 99.4 percent — fall in the four mechanical repoint classes: `entity-id` 299, `wikilink` 133, `entity-id-section` 59, `permalink` 3. The three-finding residue is bi-directional closure findings, equally determined but in a different operation mode: each names `relation.expectedInverse` and `relation.counterpartFile`, so its repair is inserting an edge rather than repointing a reference. Zero findings are search-advisory, zero are malformed-wikilink, zero are project-prefixed permalink, zero are index-stale. Yet no repoint or renumber-map machinery exists anywhere in the tree at this commit: the reference family's entire barrel surface is `buildImpactManifest`, `resolveTargets`, `scanReferences`, `summarize`, `applyGraphLeg` and `checkClosure` — six read-only report producers and no write entry point.

Two structural facts make an executor unusually cheap to add, and both are already in the commit. The write substrate exists: `atomic-write.ts`, `markdown-slices.ts` and `frontmatter-mutations.ts` are the primitives it would compose on. And the acceptance test exists: the closure report's status enum already carries `UPDATED`, and the current run at `scratch/fond-closure-report.json` reads 510 `OUTSTANDING`, 3 `RETAINED`, 0 `UPDATED`. The report is already shaped to grade an executor's work, and nothing currently produces the status it grades to.

So the honest boundary is not "the AI does splits and the tool does repairs." It is that the tool does discovery for both repair classes and repair for class one only; the AI authors the map that drives class-one repair, and does class-two repair by hand. Correction propagation is not repointable because its repair is prose rewriting against no map. The two-class split made at the outset predicts exactly this line.

On the reduction question the answer is no, and it is now measured rather than argued. The manifest's source breakdown is TEXT 366, BOTH 128, GRAPH 3, with the advisory count at zero — the search leg contributed nothing to the run that produced the evidence base. Any claim that the expanded surface improves recall therefore starts from a measured baseline of nothing, which argues for widening the leg but not for reducing the deterministic core. Four independent findings block consolidation onto search: the tooling must run offline from files while the expanded surface needs a running server; relation verbs on index rows are fabricated rather than merely stripped; enumeration returns exactly the requested limit with no more-results signal; and the identity leaf is compile-critical, since the parent commit does not compile and this commit is the repair.

On the invocation surface the finding that matters most is a sequencing one. CLI-to-MCP search parity is a committed owner requirement, so the question is what each component looks like once parity lands, not whether it will. Measured today: the installed binary reports Brain v1.0.0 and its `search` subcommand exposes six flags — depth, full-content, limit, mode, project, threshold — so none of the twelve expanded parameters is reachable. But parameter parity is not the binding precondition. A rebuilt CLI still talks to the port-8765 HTTP server, and on that server keyword mode returns zero rows for every query tried, including the single common word `composition`. Parameter parity comes from the rebuild; behavioural parity comes from the server restart, and it is the restart that governs whether keyword works at all.

Preference, offered as preference and not as a settled position: build the repoint executor as the pipeline's missing stage, in the hybrid shape where it proposes and an agent approves batch diffs; keep the deterministic core and its gating role; update the manifest schema's provenance fields; and treat the expanded surface as a strictly better advisory discovery leg, invoked from the scripts through the CLI once parity lands.

## Approach

Commit content was read via git only — `git show --stat`, `git show <sha> --text -- <path>`, `git grep <pattern> <rev> -- <path>`, `git log --first-parent`, `git merge-base`, `git cat-file -e`, `git ls-tree`. No search index was consulted to describe commit content. The owner's commit analysis document was read in full as primary input and git reading served as the verification layer over it.

Shape verification first. `git show --stat 8aad9681c8d265fd0e9869e8b08c8fccde706c4b` reports 17 files changed, 929 insertions, 172 deletions, matching the handoff figure exactly with no divergence.

Quantitative claims about the impact manifest were re-derived from the artifact, not carried from prose. The two files read are `scratch/fond-impact-manifest.json` and `scratch/fond-closure-report.json` in the skills repo — both gitignored by this same commit as derived output. Every figure names the file and the reduction that produced it. Every other enumeration states the command that produced it and the scope that command covered.

### Fond-manifest scope, stated rather than glossed

Run from the fond repo root, `find docs -type f -name '*.md' | wc -l` returns 69, and the same command without the name filter returns four further files, all `decompose-*-cluster-split-plan.yaml`. That 69-versus-73 pair is exactly the file-count parity discrepancy the skill wiring warns about, and 73 matches the entity count the tool-surface survey measured on this graph. The manifest's `filesScanned` of 41 reconciles precisely: 69 markdown files minus the 28 targets, which `reference-scan.ts:222` excludes from their own TEXT scan.

### Live probe conditions — two server generations are live at once

Search probes ran against project `skills` on 2026-07-26. Two surfaces were measured separately, and every claim below states which one it came from.

The plugin MCP surface is post-fix. A relation-edge query honouring `entity_types`, `mode` and `search_type` together returned a response carrying top-level `actual_source: "keyword"` alongside per-row `source: "keyword"`, so filter re-routing onto the honouring leg is live and self-reporting. No row carries a field literally named `actual_source`; the provenance is response-level only.

The port-8765 HTTP surface, which the CLI talks to, is pre-fix. `lsof -nP -iTCP:8765 -sTCP:LISTEN` shows the port held by a bun process running the Brain MCP app entry point, and `strings` over the installed binary shows `http://127.0.0.1:8765` compiled in — so the CLI is a thin HTTP client to that server rather than an offline tool. Its responses carry `mode`, per-row `source`, `total`, `query` and `depth`, and no `actual_source` at any level.

## The Boundary Hypothesis and Two Cross-Cutting Axes

The boundary hypothesis is the owner's, sharpened, and nothing here locks it. Merging, splitting and recomposing notes probably stay AI-driven. The mechanization target is narrower: identifying the OTHER notes those operations impact, and potentially updating those notes programmatically rather than having an AI read each one to determine what needs changing. Two axes follow from it and are evaluated per component below.

### Axis 1 — the mechanical repoint executor

The manifest is already a worklist with machine-precise addressing. Re-derivation over `scratch/fond-impact-manifest.json` gives per finding: `referencingFile`, `line`, `column`, `matchedText`, `class`, `target`, `viaAlias`, `source`, `advisory`, plus `sectionFragment` on section citations and a `relation` object on bi-directional findings. All 497 findings carry the full addressing set.

Executor-eligible fraction, derived not estimated. The four mechanical classes total 494 of 497 findings, 99.4 percent: `entity-id` 299, `wikilink` 133, `entity-id-section` 59, `permalink` 3. A repoint in each is a substitution driven by a caller-declared renumber or wikilink map. The residual three are bi-directional closure findings whose repair is an edge insertion, fully specified by `relation.expectedInverse` and `relation.counterpartFile`. The judgment classes the framing anticipates — search-advisory descriptive references, ambiguous targets, retain decisions — contribute nothing to this run: `advisory` is zero across all 497, and the only caller-judgment rows are the three `RETAINED` entries in the closure report.

Two design constraints fall straight out of the data. First, addressing must key on column, not on matched text: `referencingFile:line:column` is unique across all 497, but `referencingFile:line:matchedText` collides on 26 keys, so a find-and-replace on matched text within a line would be ambiguous wherever the same identifier appears more than once on one line. Second, line and column go stale the instant a file changes, so an executor must apply per file in descending line-and-column order and re-verify `matchedText` at the address before substituting.

The section-citation class carries a further remap requirement worth naming. The 59 `entity-id-section` findings span 32 distinct `sectionFragment` values, dominated by the `Section N` and `Section N.M` forms but also including ten distinct `D-N` decision designators, one `S-1`, and one plural `Sections 6.1`. An executor must remap the fragment as well as the target, and the schema's own documented examples do not anticipate the `D-N` form that split-induced drift produces most often.

**Option A — build the executor as a pipeline stage.** Pros: it closes precisely the loop the purpose statement describes, and the measured eligible fraction is 99.4 percent; the write substrate already exists in `atomic-write.ts`, `markdown-slices.ts` and `frontmatter-mutations.ts`; and the closure report is already the acceptance test, with an `UPDATED` status that nothing currently produces. Cons: it writes to the graph, which every tool in this family currently refuses to do by declaration — both companion checks are read-only over the tree with only `--out` written; and a wrong map corrupts 494 sites in one pass, concentrating all risk in the map rather than distributing it across per-site judgment.

**Option B — status quo, agent repointing off the worklist.** Pros: judgment available at every site; no new write surface; no map to get wrong. Cons: this is the hand-work the commit exists to eliminate, and 494 sites is the measured cost of one target set on one graph. The originating directive names this specific labour as what had been taking so long.

**Option C — hybrid: the executor proposes, an agent approves batch diffs.** Pros: removes the per-site reading, which is the expensive part, while keeping a review gate on the write path; batching granularity is available from the manifest itself, since findings group into 28 target scopes or four class scopes, turning 494 substitutions into a reviewable number of diffs. Cons: approval is only meaningful if the diff is genuinely reviewable, so batching granularity becomes the whole design; and it re-introduces an agent into the loop, though at review rather than at discovery.

### Axis 2 — the invocation surface

For each search-relevant component, who runs the search matters as much as what it returns. CLI-to-MCP search parity is a committed owner requirement, so option (b) is evaluated primarily against its post-parity state.

**(a) Agent-executed MCP search.** This is the current advisory-leg design. It has the full expanded surface today — the probes in this note exercised `entity_types`, `mode`, `search_type` and `limit` together against it. Against it: an agent sits in the loop for a step the purpose statement says should be mechanical, and the tool timeout bounds what a single call can do.

**(b) Script-executed brain CLI, called from inside the composition scripts.** This is the surface aligned with mechanization, and the committed parity requirement makes it the forward direction. Post-parity it is the natural home for a script-invoked advisory leg. Two operational preconditions are pending and both are owner actions: the CLI rebuild, and the port-8765 server restart. Measured today, as a current-operations caveat rather than a design property: the installed binary at `~/.local/bin/brain` reports Brain v1.0.0 and exposes six search flags (`--depth`, `--full-content`, `--limit`, `--mode`, `--project`, `--threshold`) plus a global `--json`, so none of `search_type`, `entity_types`, `note_types`, `categories`, `tags`, `status`, `metadata_filters`, `after_date`, `page` or `min_similarity` is reachable.

The sequencing finding is the important one, and it survives the rebuild. Parameter parity and behavioural parity are separate preconditions, and the restart governs the one that matters more. `brain search "composition" --project skills --mode keyword --json` returns zero rows; so does the same call for `note identity` and for `reference scan impact manifest`. Keyword mode returns nothing for every query tried on the 8765 server. Because `auto` is semantic-first with a keyword fallback, and the fallback is dead, `auto` degrades to semantic-only: `reference scan impact manifest` at the default 0.7 threshold returns zero, and the identical query at `--threshold 0.3` returns three rows whose top similarity is 0.661, every row reporting `source: "semantic"`. That fully accounts for the CLI-returns-zero-while-MCP-returns-rows discrepancy — it is the pre-expansion dead-keyword defect still live behind the CLI, plus `auto` ordering, plus the default threshold. A twelve-parameter CLI talking to an unrestarted server would still get nothing from its keyword leg. Live parity verification after both the rebuild and the restart is a named precondition owned outside this evaluation.

**(c) Direct index access.** The prior tool-surface survey establishes an inbound relation query as indexed, uncapped, direction-explicit and independent of both search-layer defects, with the honest coupling cost being a binding to the migration-managed schema, the index location, and sync timing. One property the invocation-surface framing surfaces that a capability survey would not: the index is a local database file, so this is the only search-shaped surface that works with no HTTP server running. It is therefore the only non-agent option compatible with the offline-against-a-docs-tree constraint, and the only one whose availability does not depend on the pending restart.

## Findings

### Component 1 — Shared identity leaf and the generic note index

Files: `shared/composition/src/core/note-identity.ts` (new, 142 lines), `shared/composition/src/core/note-index.ts` (+30 / −19), `shared/composition/src/core/correction-extract.ts` (+1 / −1).

What the change does. It extracts the identity primitives that three tool families had each grown independently — entity-ID derivation from a colon title, the canonical entity-prefix list, frontmatter reading, path location, and the filesystem seam — into one leaf module that imports nothing from its dependents. `NoteIndex` becomes generic over the note record type so the reference scanner's relation-carrying record and the correction and figure passes' content-carrying record share one index, and gains a `resolveNormalized` method kept deliberately separate from strict `resolve`.

Git evidence. `git show 8aad9681 --text -- shared/composition/src/core/note-index.ts` shows the class signature changing from `export class NoteIndex {` to `export class NoteIndex<T extends NoteIdentity = IndexedNote> {`, a new `byNormalizedTitle` map, and the removal of the local `locateNote` function. `git show 8aad9681 --text -- shared/composition/src/core/reference-matchers.ts` shows `normalizeReference`, `deriveEntityId` and a private fifteen-entry `ENTITY_PREFIXES` set all deleted, net +7 / −46.

This component is not optional, and the evidence is that its absence breaks the build. At the parent commit `efdbaf7`, `git ls-tree efdbaf7 -- shared/composition/src/core/note-identity.ts` returns empty — the file does not exist — while `git grep -n "note-identity" efdbaf7 -- shared/composition/` shows `note-index.ts:27` importing eight symbols from that absent module. Independently, `git grep -n "findEntityIds" efdbaf7 -- shared/composition/` shows `correction-extract.ts:41` importing `findEntityIds` from `./note-index.js`, and `git grep -n "^export" efdbaf7 -- shared/composition/src/core/note-index.ts` lists only `IndexedNote`, `NoteIndex`, `buildNoteIndex`, `locateNote` and `readNoteAt`. The symbol is exported nowhere in that tree. So `efdbaf7` fails to compile for two independent reasons, and this commit is the first resolving commit since `87b6ae4`.

Options.

**Keep.** Pros: it is the only thing making the tree compile, it is a genuine leaf with no cycle risk, and it is the single point where the canonical prefix list lives so a prefix added for one checker cannot silently fail to reach another. Cons: it is 142 lines of primitives that partly duplicate concepts the index server also models, so a reader may reasonably ask why both exist.

**Consolidate (fold identity into a search-backed module).** Pros: one identity notion across tools and index. Cons: the module would stop being a leaf and stop working offline; the compile-repair property is lost; and the index's own identity notions are the very thing the probes show to be unreliable. This option is available to state but the evidence against it is unusually direct.

**Replace (resolve identity by querying the index).** Pros: no local prefix list to drift. Cons: identity resolution becomes a network call per note — 69 markdown files on the fond tree this evidence base was measured against, 366 on the skills tree the same tooling is expected to serve — and a resolution failure becomes indistinguishable from a server problem. It also inherits the pending-restart dependency, since the CLI path reaches the index only through the port-8765 server. Permalink lookups do work well — an exact-identifier probe is precise — but throughput and offline operation both regress.

**Update (keep the leaf, add an optional index-backed alias resolver behind the existing seam).** Pros: the `NoteFileSystem` seam already exists for exactly this kind of substitution, and `resolveNormalized` is already the lenient path kept separate from the strict one, so an advisory resolver has a natural home. Cons: two resolution paths to reason about, and a reader must keep straight which one a given report line came from.

### Component 2 — Scanner legs: GRAPH, TEXT, and mode-aware SEARCH advisory

Files: `shared/composition/src/core/reference-scan.ts` (+15 / −54), `shared/composition/src/core/reference-graph.ts` (+27 / −30), `shared/composition/src/core/reference-matchers.ts` (+7 / −46).

What the change does. The scan pass stops carrying its own identity helpers and its own filesystem seam, and its `NoteRecord` becomes an extension of the shared `NoteIdentity`. In the graph leg the `TitleIndex` class is deleted and replaced by a `buildResolver` function that layers a scan-specific alias map over the shared `NoteIndex`; the replacement also removes an inner `[...notes].find(...)` scan from the alias loop, so alias resolution stops being quadratic in the note count.

Git evidence. `git show 8aad9681 --text -- shared/composition/src/core/reference-graph.ts` shows the class deleted and `buildResolver` added, with `checkOutward` and `applyGraphLeg` re-typed to take a `resolve: (reference: string) => NoteRecord | undefined` callback in place of a `TitleIndex` instance. The same diff shows `const byPath = new Map(notes.map((note) => [note.path, note]))` replacing the per-alias linear find.

Live probe bearing on this component, re-verified on the plugin MCP surface rather than carried forward. The GRAPH leg's job is to verify that a typed edge has its typed inverse. A relation-edge query — `entity_types: ["relation"]`, `mode: "keyword"`, `search_type: "text"`, query `ADR-002`, limit 60, project `skills` — returned exactly 60 rows with `actual_source: "keyword"`. Thirteen rows in that window had ADR-002 as source, and every one carried the verb `links-to`; not one carried a canonical verb. In the same result set, inbound edges from other notes were correctly typed: `extends` from ADR-004, `leads-to` from ADR-001, `pairs-with` from ADR-003, `part-of` from CRIT-002, `depends-on` from TASK-011-SPEC-004, and `implements` from many REQ and SPEC notes. Since the bi-directional rule requires ADR-002 to carry inverses of those edges and no inverse verb appears on any ADR-002 row, the verbs on that note's rows are not its authored verbs.

Verb fabrication is worse than stripping, and the sharpest instance was independently re-verified on its own probe. A relation query for `TASK-035` (limit 15, seven rows returned) contains both `spec-008-protocol-hardening-wave-2/x/…/task-035-…` and `spec-008-protocol-hardening-wave-2/contains/…/task-035-…` — the same note pair served twice, once under the canonical `contains` and once under a verb literally named `x`, which is a markdown checkbox parsed as an edge type. The same corpus yields the non-canonical `outcome` on a PLAN-001 row.

Duplication is both multi-verb and exact. `PLAN-001: Skills Ecosystem -> ADR-002` appeared three times in the 60-row window, under `outcome`, `implements` and `links-to`. Beyond that, two rows repeated byte-identically — same permalink, same verb: `analysis-006/relates-to/adr-002` twice and `analysis-007/depends-on/adr-002` twice. Exact-duplicate rows are a stronger defect than the same edge under different verbs, because deduplicating on the edge triple does not remove them.

Enumeration remains bounded and silent about it. The request for limit 60 returned `total: 60` with no more-results indicator, and the tool schema caps `limit` at 100, so a hub above the ceiling truncates with no way for a caller to know.

Repoint-executor dimension. The GRAPH leg produced 3 of the 497 findings, and those three are the only non-repoint findings in the manifest — the edge-insertion class. So the leg is small in volume and distinct in operation mode: an executor consuming this leg inserts a Relations entry using `relation.expectedInverse` and `relation.counterpartFile`, and does not touch reference text at all. That is a second executor mode, not an extension of the first.

Invocation-surface dimension. The SEARCH leg is the only part of this component with an invocation question, and the measurement is that it currently has no invocations to speak of: `advisory` is zero across all 497 manifest findings and `bySource` is TEXT 366, BOTH 128, GRAPH 3. Whatever surface is chosen, the leg is being switched on from nothing rather than improved from something.

Options.

**Keep.** Pros: the GRAPH leg parses note bodies directly and never consults the index, which is exactly why it can gate; every probe above is an argument for that design rather than against it. Cons: it re-derives edges the index already stores, so it looks redundant to anyone who has not measured the index.

**Replace the GRAPH leg with relation-edge queries.** Pros: the query surface is genuinely there now, returns edges directly, and would delete a body-parsing path. Cons: measured verb integrity makes typed inverse checking unsound; the same logical edge arrives two and three times including byte-identical repeats; and enumeration is bounded without signalling. This is the weakest of the four for this component on current evidence.

**Update (widen the SEARCH advisory leg; leave GRAPH and TEXT untouched).** Pros: keyword mode was dead when the leg was designed and is alive on the MCP surface, so recall improves with no gating change; permalink prefix enumeration and filter-only queries add precise candidate discovery. Cons: the advisory-versus-gating distinction becomes more important to communicate, not less, because the leg becomes good enough to be mistaken for authoritative; and the widening only reaches the scripts once CLI parity lands, so today it widens a leg only an agent can pull.

**Consolidate the three legs behind one resolver interface.** Pros: one call site for callers, and the existing `resolve` callback shows the seam already tolerates substitution. Cons: it risks blurring the property that makes the arrangement safe — that exactly one leg is deterministic enough to fail a step on.

### Component 3 — Closure gate and check mode

File: `shared/composition/src/core/reference-closure.ts`, reported by git as `Bin 6681 -> 6718 bytes`.

What the change does. The hidden hunk is only the filesystem-seam rename. `git show 8aad9681 --text -- shared/composition/src/core/reference-closure.ts` shows `import { type ScanFileSystem, scanReferences } from "./reference-scan.js"` becoming a type-only import of `NoteFileSystem` from `./note-identity.js` plus a value import of `scanReferences`, and the `fileSystem` field on `ClosureOptions` re-typed from `ScanFileSystem` to `NoteFileSystem`. Nothing else in the file changed.

The binary report is a literal NUL byte in a join separator, present from the file's creation. It is still present at the current HEAD: `od -c` on the working-tree file shows `"  \0   ")` at octal offset 0003360 in a 6718-byte file, and `git grep -n "join" 8aad9681 -- shared/composition/src/core/reference-closure.ts` answers only `Binary file 8aad9681:shared/composition/src/core/reference-closure.ts matches`. The one-byte fix landed in a descendant that was reverted, so the condition is live. Consequence for anyone auditing this file: piping a blob through `grep` is unreliable, and `git grep <pattern> <rev> -- <path>` or `sed` must be used instead.

Repoint-executor dimension, and it is the most consequential finding in this component. The closure report is already shaped to grade an executor's work, and nothing currently produces the status it grades to. Re-derivation over `scratch/fond-closure-report.json` gives 513 entries with a status distribution of 510 `OUTSTANDING` and 3 `RETAINED` — and zero `UPDATED`, a status the enum already carries. Each entry wraps the original finding and adds `status`, `currentLine` and a `detail` string of the form "stale form still present at `<file>:<line>`". That is a per-site verdict keyed to the same address the executor would write to. Build the executor and the closure check becomes its post-condition for free: entries flip `OUTSTANDING` to `UPDATED`, and any that do not flip are exactly the sites the executor failed to repair.

The check also supplies the executor's re-verification primitive. Because it re-locates each finding and reports `currentLine` alongside the manifest's original `line`, it already solves the address-staleness problem an executor must solve — proof that re-locating a recorded reference against a moved file is a solved problem inside this commit rather than new work.

Options.

**Keep the gate deterministic.** Pros: the closure check is the step that can fail an operation, and it currently rests entirely on legs that work offline from files; it is also the natural acceptance test for any executor built later, which is an argument for leaving it exactly where it is. Cons: it duplicates edge knowledge the index holds.

**Replace the gate's inbound leg with index relation queries.** Pros: would remove a full tree re-scan at check time. Cons: the limit behaviour is disqualifying for a completeness gate — a hub with more edges than the maximum limit returns exactly the limit with no signal that more exist, so the gate would silently pass on the largest notes, which are the ones most likely to be restructured.

**Update the ruling's rationale rather than its outcome.** The advisory-not-gating ruling was made when keyword mode was dead, cross-project leaks were live, and stale rows were being served. Two of those three conditions have changed. Pros: refreshing the stated reason keeps the constraint honest and prevents the next reader from dismissing it as stale. Cons: it invites re-litigation of a settled decision. This is prior art with rationale, not an immovable constraint, and adjudicating it is the decisions phase's call, not this note's.

**Consolidate closure into the scanner.** Pros: one pass, one report. Cons: baseline-then-recheck is inherently two invocations at two points in time; merging them removes the seam the diff-against-baseline pattern needs.

### Component 4 — Reconcile-by-diff correction discovery

Files: `shared/composition/src/core/correction-extract.ts` (+1 / −1 in this commit), with the whole correction family newly surfaced through the barrel.

What the change does. In this commit the correction family's only source change is the one-line import repoint from `./note-index.js` to `./note-identity.js`, which is half of the compile repair. Its `findCorrectionMarkers`, `extractObligations`, `reconcile` and `verifyObligation` entry points, and the `UNEXTRACTABLE_REASONS` enum, become reachable through the new barrels.

Why this is where the expansion pays best. The skill wiring added in this same commit already identifies it: an obligation whose target is named only in prose, with no entity ID anywhere, is already found — it simply cannot be aimed. The commit's own reason-targeted table (verified present at `skills/decompose/SKILL.md:254` via `git grep -n -i "UNEXTRACTABLE" 8aad9681 -- skills/decompose/SKILL.md`) says `no-resolvable-target` benefits from semantic discovery, `ambiguous-target` sometimes does, and `no-quoted-stale-text` does not.

Live probe bearing on this component. Two capabilities that did not exist when that table was written now do. A filter-only query with no query text at all — `note_types: ["analysis"]`, `after_date: "2026-07-01"`, project `skills` — returned three rows (ANALYSIS-004, ANALYSIS-005, ANALYSIS-006) out of the six analysis notes that exist, correctly excluding the three whose index timestamps predate the cutoff. That matches the modification dates `list_directory` reports for the same six files, so the date filter is accurate and not merely plausible. And an exact-identifier enumeration — `search_type: "permalink"`, query `analysis/analysis-00*` — returned exactly the six analysis notes with no text term at all.

Repoint-executor dimension, and this is where the boundary line falls. This component is the class-two half of the original two-class split, and it is not executor-eligible in any of its parts. A correction obligation's repair is prose rewriting: the stale assertion has to be restated, and there is no map from old text to new text the way a renumber map gives old identifier to new identifier. The manifest's mechanical classes all share the property that the replacement value is derivable from a caller-declared map; a correction's replacement value is authored. So the executor stops cleanly at the boundary the split predicted, and this component is precisely the residue that keeps the AI in the repair loop — not as an oversight but as a property of the work.

That has a corollary worth stating for the decisions phase: mechanizing repair does not shrink the agent's role here at all, so any expectation that an executor removes the agent from note repair generally has to be scoped to class one.

Invocation-surface dimension. This is the one component where a script-invoked search is clearly the right shape rather than an arguable one, because the discovery it needs runs inside a checker that already runs as a script and already writes a report. Under the committed parity requirement, the post-rebuild CLI is the natural invocation surface; before then, the same discovery can only be pulled by an agent, which is the mismatch this axis exists to name.

Options.

**Update (feed search-resolved candidates into the existing obligations channel).** Pros: this is the highest-value, lowest-risk use of the expansion in the whole commit; the wiring already describes the mechanism and the tool already accepts `--obligations` tuples, so the change is additive; recall improves on work already identified rather than hunting for new work. Cons: an advisory resolution must be marked as such in the report or a reader will treat a guessed aim as an authored one; and reaching it from the checker rather than from an agent carries the CLI-parity precondition.

**Keep.** Pros: zero risk, and the checker is already validated against a real corpus. Cons: leaves the un-aimable channel un-aimable when the means to aim it now exists, which is the specific gap this evaluation was commissioned to find.

**Replace prose-target resolution with search.** Pros: removes the need to report un-aimable obligations at all. Cons: makes a checker that currently declines to guess into one that guesses, which inverts its stated posture; the `no-quoted-stale-text` class gains nothing regardless.

**Consolidate with the figure checker.** Pros: both are read-only note-level audits with the same exit convention. Cons: they answer unrelated questions and share nothing but the identity leaf they already share.

### Component 5 — Figure-staleness count re-derivation

Files: no source change in this commit; `scanNote`, `derive`, `headingAt` and `runCheck` are newly surfaced through `shared/composition/src/core/index.ts`.

What the change does. Only barrel exposure and skill wiring. The checker re-derives a stated figure from the structure it summarises and reports MISMATCH when they disagree, with UNANCHORED reserved for the case where it declines to guess which structure a figure refers to.

Options.

**Keep.** Pros: derivation is arithmetic over local markdown structure, which the index does not model at all — there is no counterpart capability to migrate to. Cons: none identified on current evidence.

**Update (use search to anchor UNANCHORED findings).** Pros: the one place search could plausibly help is resolving a cross-note figure reference to its target note, which would convert some UNANCHORED reports into checkable ones. Cons: a wrong anchor produces a confident false MISMATCH, which is worse than an honest UNANCHORED; the existing checks-file mechanism already lets a human point the claim explicitly.

**Replace / Consolidate.** Both are stated for completeness and neither has a mechanism behind it: the index exposes no structural counts and no table model, so there is nothing to replace the derivation with and nothing to consolidate it into.

### Component 6 — Core and schema barrels with runtime tests

Files: `shared/composition/src/core/index.ts` (new, 133 lines), `shared/composition/src/schemas/index.ts` (+94 / −0), `shared/composition/tests/barrels.test.ts` (new, 132 lines).

What the change does. Named re-exports — no star exports — scoped deliberately to the three verification families and the primitives they share, leaving the older composition mechanics on their direct import paths. The schema barrel surfaces three families that had not been reachable through it. The new test imports both barrels as namespaces and asserts that no export resolves to `undefined`, on the reasoning that a barrel can typecheck and still be broken at runtime when a path goes stale or a symbol is renamed.

Git evidence. `git show 8aad9681 --text -- shared/composition/src/schemas/index.ts | grep -E "^\+"` lists the added re-exports across three groups, from `reference-manifest.js`, `correction-obligation.js` and `figure-check.js`.

Options.

**Keep.** Pros: this is internal module hygiene with no search dimension whatsoever; the runtime assertion catches a real failure mode that the type checker cannot. Cons: the deliberate partial scope means two import conventions coexist in one directory, which needs the header comment to stay legible.

**Update (extend the barrel to the rest of `src/core/`).** Pros: removes the two-conventions oddity. Cons: the file's own header argues the older modules have settled call sites and nothing is asking to reach them through a barrel, so widening adds surface without removing friction.

**Consolidate / Replace.** Not applicable — no search capability bears on a module barrel. Stated so the four-option frame is complete rather than silently truncated.

### Component 7 — Manifest schema and the `mode` field

File: `shared/composition/src/schemas/index.ts` (+94), surfacing `SearchModeSchema`, `SEARCH_MODES` and `ReferenceFindingSchema`.

What the change does in this commit is expose the schemas through the barrel. The evaluation findings concern the schema itself, and there are two: the `mode` field is under-specified, and the schema is — unexpectedly — already sufficient to drive a repoint executor without modification.

Repoint-executor dimension, verified field by field against `ReferenceFindingSchema` at `shared/composition/src/schemas/reference-manifest.ts:121-153`. The schema requires `referencingFile`, `line` (positive int), `column` (positive int, documented as a 1-indexed offset within the line), `matchedText` (min length 1), `class`, `target` and `viaAlias`, with `sectionFragment` optional and populated for the section class. Every field a deterministic repointer needs is therefore mandatory rather than optional, and re-derivation confirms all 497 findings populate them. This is the strongest single argument that the executor is a missing consumer rather than a missing data model: no schema change is required to build it.

Two precision points that only surface once the schema is read as an executor input. The `column` field is what makes addressing unambiguous — `referencingFile:line:column` is unique across all 497 findings while `referencingFile:line:matchedText` collides on 26 keys — so its mandatory status is load-bearing rather than incidental. And the `sectionFragment` doc comment gives its examples as "Section 6" or "Part C", whereas the real fond data carries ten distinct `D-N` decision designators and one `S-1` among its 32 distinct values; the field holds them correctly, but a reader calibrating an executor's remap logic from the comment alone would under-anticipate the forms split-induced drift actually produces.

On ranking: v1 of this note called the `mode` field the clearest single update candidate in the commit. That still holds among schema-level candidates, but it is no longer the clearest gap overall — the absence of an executor consuming this schema is a larger one, and it is a gap in the module inventory rather than in the schema.

Git evidence. `git grep -n -A6 "SEARCH_MODES = " 8aad9681 -- shared/composition/src/schemas/reference-manifest.ts` gives `export const SEARCH_MODES = ["auto", "semantic", "keyword", "hybrid"] as const;`. `git grep -n -B3 -A4 "mode:" 8aad9681 -- shared/composition/src/schemas/reference-manifest.ts` shows the field as `mode: SearchModeSchema.optional()` at line 145, documented so that a mode returning nothing stays distinguishable from a mode that ran and found nothing.

The field records only the requested mode, and post-expansion that is under-specified twice. First, `search_type` is an orthogonal retrieval dial — `text`, `title`, `permalink`, `vector`, `semantic`, `hybrid` — that the field cannot express at all, so two findings recorded as `mode: "keyword"` may have come from genuinely different retrievals; my own probes exercised `search_type: "text"` and `search_type: "permalink"` under the same `mode: "keyword"` and got categorically different result shapes. Second, the actual leg that served each row is absent, and the responses now carry that information: every row I received carried `source`, and every response a top-level `actual_source`, which repeatedly differed from the requested mode — a `mode: "semantic"` request came back `actual_source: "keyword"`, and `mode: "auto"` came back `actual_source: "keyword"` in every probe.

Options.

**Update (add `searchType` and a per-finding `actualSource`).** Pros: makes an advisory finding reproducible, which is the field's whole stated purpose; the data now exists in responses so nothing needs inventing; it directly records the requested-versus-served divergence I measured. Cons: schema churn touching the manifest, its barrel exposure, its fixtures and the two skills that read manifests.

**Keep.** Pros: no churn; the field is optional and advisory-only, so nothing downstream is currently wrong. Cons: the documented rationale is that a mode returning nothing must be distinguishable from a mode that ran and found nothing — and with routing overrides live, the recorded mode no longer establishes which happened.

**Replace the field with the raw response envelope.** Pros: nothing is lost to schema design choices. Cons: unbounded, un-versioned shape inside a validated manifest; defeats the point of a Zod boundary.

**Consolidate into one provenance object.** Pros: groups mode, search type, served leg and advisory flag where they belong together. Cons: a breaking shape change to a schema that is already surfaced through the barrel and consumed by fixtures.

### Component 8 — Skill wiring across the three SKILL.md files

Files: `skills/decompose/SKILL.md` (+135 / −0), `skills/recompose/SKILL.md` (+89 / −0), `skills/defrag/SKILL.md` (+39 / −0).

What the change does. Decompose gains a sample-wikilink warning, the traverse-on-existence rationale, the reason-targeted UNEXTRACTABLE table, two gating assertions, and companion checks both before and after execution. Recompose gains the symmetric content framed around merges, including the merge-specific failure in which concatenation reinstates text a correction had retired while the byte-preservation proof passes. Defrag gains a single "Correction and figure audit" section using its exit-2-means-work-found convention.

Commit-order finding. This wiring arrived in 8aad9681 itself, not in a descendant. `git grep -n -i "EXISTENCE" 8aad9681 -- skills/decompose/SKILL.md skills/recompose/SKILL.md` hits `decompose/SKILL.md:243` and `recompose/SKILL.md:151`, while `git grep -c -i "UNEXTRACTABLE" efdbaf7 -- skills/decompose/SKILL.md` returns nothing at the parent. The four reverted commits are descendants, not parents: `git merge-base <sha> 8aad9681` returns `8aad9681c8d265fd0e9869e8b08c8fccde706c4b` itself for each of `6ff9edc`, `c434301`, `2c87a78` and `a1f6509`. True first-parent order per `git log --first-parent` is `69c4999` → `4247a03` → `87b6ae4` → `82a3f6f` → `efdbaf7` → `8aad9681`, then the reverted four.

Overlap with the reverted descendants, which are legitimate prior art rather than territory to reinvent — and the overlap is narrower than its commit subject suggests. `6ff9edc` is titled "reason-targeted UNEXTRACTABLE discovery, traverse-on-existence rationale, gating assertions with baseline deltas, code-span trap guidance", which advertises the same four subjects this commit already contains. But `git show --stat 6ff9edc` reports only two files, `skills/defrag/SKILL.md` at +34 and `skills/recompose/SKILL.md` at +6, and does not touch `skills/decompose/SKILL.md` at all. Read together with the parent check above, the shape is unambiguous: decompose's full treatment landed in 8aad9681, and `6ff9edc` was back-filling the same four subjects into defrag and recompose. So it is a coverage-completion pass over wiring that already landed in its richest form, not a first delivery and not a re-authoring. `c434301` is titled "post-expansion alignment — keyword revival dated into the skill wiring, backlink and filter guidance added" and is therefore a draft of exactly the update option below.

Live probe bearing on this component. The wiring's central claim holds and is if anything understated: index traversal may ask whether an edge exists and must not ask what type it is. The probes recorded under Component 2 confirm the stripping and add fabrication — a verb literally named `x` alongside the canonical `contains` for the same note pair, the non-canonical `outcome`, and byte-identical duplicate rows.

The wiring's search-constraint prose is stale, but only against one of the two live surfaces, and that distinction now has to be written into the prose rather than assumed. Those lines were authored when keyword mode was dead everywhere. On the plugin MCP surface keyword mode is alive and self-reporting, returning `actual_source: "keyword"`. On the port-8765 server the CLI talks to, keyword mode still returns zero rows for every query tried, including a single common word. A skill document that says "keyword returns nothing" is now wrong for an agent reading it and right for a script invoking the CLI, until the pending restart. Dating the revival into the prose is therefore not enough on its own — the prose has to name which surface it describes.

Options.

**Update (date the keyword revival into the prose; add the new fabrication evidence; keep the gating posture).** Pros: the stale lines are the single most misleading content in the three files, since a reader who believes keyword is dead will not use the leg that is now most useful; `c434301` already drafted much of this. Cons: three files to keep synchronised, and the decompose/recompose pair must not drift apart.

**Consolidate the shared prose into one referenced block.** Pros: the traverse-on-existence paragraph, the gating assertions and the companion-check invocations are near-duplicated across decompose and recompose, which is where drift will start. Cons: skill content must read standalone, so a shared block is a real constraint rather than a preference; and defrag's framing genuinely differs from the other two.

**Keep.** Pros: the guidance is correct on its load-bearing claims and was validated against a real corpus. Cons: it carries pre-expansion constraint lines that are now false as stated.

**Replace the companion-check invocations with search-driven equivalents.** Pros: fewer moving parts for the skill to describe. Cons: the checks would stop working offline and would inherit the verb and enumeration problems; the exit-code contract the skills gate on has no search counterpart.

### Component 9 — Scaffold volume bound and the observations cap

Files: `shared/composition/schemas/base.ts` (+13 / −9), `shared/composition/tests/scaffold-hardening.test.ts` (+25 / −4).

What the change does. It deletes `SCAFFOLD_MAX_OBSERVATIONS = 15` and the `.max()` call on the observations array, leaving `.min(1)`, and rewrites the surrounding comment to say that neither observations nor relations carry a hard maximum — both thresholds are H3 sub-grouping formatting rules, and encoding a formatting rule as a `.max()` converts it into content loss. Tag maxima are explicitly retained as canonical bounds. The test suite flips the forty-observation fixture from expected-invalid to expected-valid and adds two tests: one asserting the minimum survives, one asserting both tag maxima still reject.

This is the direct schema-level discharge of the originating directive that caps on how many references can be reported be removed and completeness insisted on. The historical eight-relation cap had already been removed for the same reason.

Options.

**Keep.** Pros: it implements the originating requirement, and the added tests pin both the surviving minimum and the retained tag bounds so the removal cannot over-reach. Cons: none identified; the change is a correction of a prior mistake, not a trade-off.

**Update (add the ratio guard the comment gestures at).** Pros: the comment says a count cap was a poor proxy for the real concern, which is the ratio of rendered scaffold to preserved content; a ratio guard would address the actual concern the cap failed to address. Cons: out of scope for this commit and separately registered as follow-up work.

**Consolidate / Replace.** No search dimension — this is local schema validation over a scaffold object. Stated for frame completeness.

### Component 10 — Fixtures and tests

File: `shared/composition/tests/reference-scan.test.ts` (+18 / −6).

What the change does. Imports move to the new homes — `matchLine` still from `reference-matchers.js`, `entityIdOfTitle` and `normalizeReference` now from `note-identity.js` — every `deriveEntityId` call site is renamed, and the describe block is retitled to match. A doc comment records a ruling on the `await expect(...).rejects.toThrow(...)` form: the diagnostic that flags the `await` as ineffective is correct on Bun 1.3.14, the assertion nonetheless runs and fails correctly, and the form is left alone because it is the house form at five other call sites, making it an eight-site change or none.

Options.

**Keep.** Pros: the tests track the rename exactly, and the house-form ruling is the right call for consistency — two conventions for one thing is worse than a cosmetic hint. Cons: the retained form will keep drawing the diagnostic, so the comment is load-bearing documentation rather than decoration.

**Update (add coverage for the search-advisory merge path).** Pros: the merge path that forces advisory entries to `source: SEARCH` is the seam any expansion work will touch, and strengthening it first de-risks that work. Cons: additive test surface for a path that is advisory by construction.

**Consolidate / Replace.** No mechanism. Fixtures are a local tree the tests own; the expanded surface offers nothing here.

### Component 11 — Repository hygiene

File: `.gitignore` (+13 / −0).

What the change does. It adds a root-anchored `/scratch/` rule with a comment explaining that every file there is derived and cheap to regenerate, being the output of a read-only tool run against a graph that moves independently of this repo, and that committing them would freeze a point-in-time census next to the code that produces it — a stale manifest read as current being worse than no manifest. The root anchor is deliberate so a `skills/**/scratch/` source directory would not be caught.

Options. **Keep** is the only option with a mechanism behind it: the reasoning is sound and the anchoring is correct. Consolidate, replace and update have no search dimension and no defect to address; they are recorded as not-applicable rather than omitted.

## Component-by-Option Summary

Preference column reads as a preference only. Nothing here is locked; the decisions phase adjudicates each row.

| Component | Consolidate | Replace | Update | Keep | Executor and invocation bearing | Leaning |
|---|---|---|---|---|---|---|
| 1. Identity leaf + note index | Breaks leaf property and offline operation | Per-note network cost; masks failures | Optional index-backed alias resolver behind existing seam | Compile-critical; single prefix source | Executor resolves map targets through this index; no invocation question | Keep, optionally Update |
| 2. Scanner legs | Blurs the one-deterministic-gate property | Verb fabrication, exact-duplicate rows and limit cap disqualify | Widen SEARCH advisory on revived keyword | GRAPH parses bodies, never the index | GRAPH's 3 findings are the edge-insert executor mode; SEARCH leg contributed 0 of 497 | Keep + Update advisory |
| 3. Closure gate | Removes the baseline/recheck seam | Silent truncation on the largest notes | Refresh the ruling's stated rationale | Gate stays deterministic and offline | Already the executor's acceptance test — `UPDATED` status exists, nothing produces it | Keep, Update rationale |
| 4. Correction discovery | Unrelated questions, shared leaf only | Turns declining-to-guess into guessing | Feed search-resolved candidates into obligations | Zero risk, corpus-validated | NOT executor-eligible — repair is authored prose, no map; script invocation is the right shape | Update — best search payoff |
| 5. Figure check | No counterpart to consolidate into | No structural counts in the index | Anchor some UNANCHORED cross-note claims | Arithmetic over local structure | Not executor-eligible; no invocation question | Keep |
| 6. Barrels | Not applicable | Not applicable | Widen scope to all of src/core | Header argues the partial scope | Executor would need one new barrel entry | Keep |
| 7. Manifest schema and `mode` field | Breaking shape change | Raw envelope defeats the Zod boundary | Add searchType + per-finding actualSource | Optional and advisory today | Schema is ALREADY sufficient for an executor unmodified — mandatory addressing fields | Update — clearest schema candidate |
| 8. Skill wiring | Skill content must read standalone | Loses offline operation and exit contract | Name the surface, not just the date, for keyword claims | Load-bearing claims hold | Prose must state which of two live surfaces it describes | Update |
| 9. Observations cap | Not applicable | Not applicable | Ratio guard (registered separately) | Discharges the originating directive | No bearing | Keep |
| 10. Fixtures and tests | Not applicable | Not applicable | Cover the advisory merge path | Tracks the rename; house-form ruling sound | Executor needs its own fixture tree before it writes anywhere real | Keep + Update |
| 11. Repo hygiene | Not applicable | Not applicable | Not applicable | Sound reasoning, correct anchoring | Executor output is derived — same ignore rule applies | Keep |
| 12. Repoint executor (absent) | n/a — nothing to consolidate | n/a — nothing to replace | n/a — nothing to update | Keep means the agent stays in the repair loop | 494 of 497 findings eligible; write substrate and acceptance test both already present | Build, hybrid shape |

## Divergences from the Owner's Commit Analysis Document

The owner's commit analysis document is accurate on every point checked independently, including all seventeen file entries, both per-file line counts and the substance of every rationale it quotes. Four refinements rather than contradictions.

**The parent-state break is double, not single.** The document describes the parent-state problem as a single import-path change to `correction-extract.ts`. Git shows two independent failures at `efdbaf7`. First, `git cat-file -e efdbaf7:shared/composition/src/core/note-identity.ts` fails with "exists on disk, but not in 'efdbaf7'", while that revision's `note-index.ts` imports eight symbols from `./note-identity.js` across lines 18-27. Second, `git grep -n 'findEntityIds' efdbaf7 -- shared/composition/src/core/` shows `correction-extract.ts:41` importing `findEntityIds` from `./note-index.js`, and `git grep -n 'export function findEntityIds' efdbaf7 -- shared/composition/src/core/note-index.ts` returns nothing — the symbol is exported nowhere in that tree. The document's file-by-file framing is correct for this commit's diff; the double break is only visible from the parent tree.

**The NUL byte persists at HEAD.** The document reports `reference-closure.ts` as "git initially reported this file as binary but a forced text diff reveals it is small text changes to imports." That is right about the hunk and incomplete about the cause. `od -c` on the working-tree file shows `"  \0   ")` at octal offset 0003360 of a 6718-byte file, and `git grep -n 'join(' 8aad9681 -- shared/composition/src/core/reference-closure.ts` answers only "Binary file … matches". The one-byte fix landed in a reverted descendant, so the condition is live. Practical consequence for anyone auditing this file: piping the blob through `grep` is unreliable; use `git grep <pattern> <rev> -- <path>` or `sed`.

**The barrel test's coverage figures understate it, in two ways.** The document states "9 identity exports + 25 tool-family exports = 34 core symbols validated. 19 schema exports validated." Counting the literal arrays in `shared/composition/tests/barrels.test.ts` gives `identityExports` 9, `familyExports` 28 and `schemaExports` 21 — so 37 enumerated core symbols and 21 enumerated schema symbols, not 34 and 19. Separately, the "no export resolves to undefined" test in each suite iterates the whole imported namespace rather than the arrays, and importing both barrels reports 56 exports on `src/core` and 51 on `src/schemas`. The test's real coverage is therefore 107 symbols asserted non-undefined, with 58 of them additionally named explicitly. The document undercounts the enumerated lists and does not credit the namespace-wide assertion at all.

**The commit message's own 513 figure does not match the manifest.** The commit subject describes a "513-finding equivalence proof". The manifest on disk carries 497 findings, agreeing with its own `summary.totalFindings`. The reconciliation is in the next section; it is a two-artifact provenance difference rather than an error in either number.

The document's stated 15-observation removal rationale, the barrel scope decision, the house-form test ruling and the `/scratch/` reasoning all reproduce verbatim from the diffs read. No divergence found on any of them.

### Divergences from v1 of this note

v1's git and probe evidence is reused throughout and holds up under re-verification. Its framing is superseded by the boundary-hypothesis, executor and invocation-surface axes, and five specific points changed.

**The 513-versus-497 figure is a two-artifact provenance difference, with an explanatory delta.** v1 carried 513 without locating it. The two files disagree because they are different runs: `scratch/fond-closure-report.json` has `checkedAt` 2026-07-26T18:32:03Z with 513 entries, and `scratch/fond-impact-manifest.json` has `generatedAt` 2026-07-26T18:49:29Z with 497 findings. The seventeen-minute gap is legible in the class breakdown. Closure entries: `wikilink` 113, `entity-id-section` 59, `entity-id` 299, `bidirectional-missing-on-referencer` 22, `permalink` 3, `bidirectional-missing-on-target` 17. Manifest findings: the same `entity-id-section` 59, `entity-id` 299 and `permalink` 3, with `wikilink` risen to 133 and the two bi-directional classes collapsed to 2 and 1. So 33 missing-inverse findings were repaired between the runs, and the inverse edges added to repair them are themselves 20 new inbound wikilinks — which is why the wikilink count rose as the bi-directional count fell, and why the net is 513 minus 16. Two consequences: the manifest is a live census that moves as repairs land rather than a fixed score, and this delta is the only direct measurement in the evidence base of the repair loop actually closing.

**The offline-requirement denominator named the wrong tree.** v1 cited "a docs tree of 365 markdown files" for the offline constraint. That is the skills docs tree, which `find docs -type f -name '*.md' | wc -l` reports as 366 today. The manifest's `docsRoot` is the fond docs tree, which the same command reports as 69, with 41 scanned after target exclusion. Both figures are real; the one governing this evidence base is 69.

**Duplication includes byte-identical rows, not only multi-verb repeats.** v1 recorded the same logical edge served two and three times under different verbs, and corrected a briefed five-times figure down to two-to-three. Both hold. The addition is that two rows in a single 60-row window repeated with the same permalink and the same verb — `analysis-006/relates-to/adr-002` and `analysis-007/depends-on/adr-002` — so deduplicating on the edge triple would not remove them. That is a stronger defect than v1 recorded.

**Server generation is no longer ambiguous; it is two generations at once.** v1 recorded the detection heuristic as giving contradictory readings and left the ambiguity open. Probing the two surfaces separately resolves it: the plugin MCP path is post-fix and reports `actual_source` at response level, and the port-8765 HTTP path the CLI uses is pre-fix and reports no `actual_source` at any level. Both readings in v1 were correct about different surfaces.

**The CLI-returns-zero anomaly has a cause.** Carried forward as unexplained, it is now accounted for. `brain search "composition" --project skills --mode keyword --json` returns zero rows, as do the same call for `note identity` and for `reference scan impact manifest`: keyword mode returns nothing for every query tried on the 8765 server, which is the pre-expansion dead-keyword defect unrepaired on that generation. Because `auto` is semantic-first with a keyword fallback and the fallback is dead, `auto` degrades to semantic-only, and the default 0.7 threshold then decides the outcome — `reference scan impact manifest` returns zero at 0.7 and three rows at `--threshold 0.3`, top similarity 0.661, every row `source: "semantic"`. No CLI defect is implicated; the server generation behind it is.

### Divergences from the brief's carried constraints

**Stale orphan rows were not observed.** The brief states that the reverted ANALYSIS-007 and ANALYSIS-008 embeddings are new orphans still served by the index. A permalink prefix enumeration — `search_type: "permalink"`, query `analysis/analysis-00*`, project `skills`, limit 30 — returned exactly six rows, ANALYSIS-001 through ANALYSIS-006, with no 007 or 008; a filter-only analysis query returned three rows, likewise with neither. On these two enumerations the reverted notes are absent from the index. A differently-shaped query may still surface them, and that scope limit is stated rather than glossed.

**On the truncation cap.** Requesting limit 60 returned `total: 60` with no more-results indicator, and the tool schema caps `limit` at 100. The practical ceiling and the silent-truncation risk are both confirmed, expressed through the limit parameter rather than as a separate internal cap.

**The four reverted commits are descendants, and one is narrower than advertised.** `git merge-base --is-ancestor 8aad9681 <sha>` succeeds for all four of `6ff9edc`, `c434301`, `2c87a78` and `a1f6509`, confirming the true first-parent order `69c4999` → `4247a03` → `87b6ae4` → `82a3f6f` → `efdbaf7` → `8aad9681` → the reverted four. Decompose's UNEXTRACTABLE table and traverse-on-existence wiring are present at `skills/decompose/SKILL.md:254` and `:243` in this commit and absent at `efdbaf7`. The refinement on `6ff9edc` is recorded under Component 8: it touches only defrag and recompose, never decompose.

## Observations

### On the boundary hypothesis and the repair loop

- [outcome] The pipeline mechanizes the agent out of impact DISCOVERY completely and out of impact REPAIR not at all, because no repoint executor exists at this commit #boundary-hypothesis #headline
- [fact] 494 of 497 manifest findings, 99.4 percent, fall in the four mechanical repoint classes — entity-id 299, wikilink 133, entity-id-section 59, permalink 3 #executor-eligibility #derived
- [fact] All 497 findings carry referencingFile, line, column, matchedText, class and target, and the triple referencingFile:line:column is unique with zero collisions #addressability #manifest
- [problem] referencingFile:line:matchedText collides on 26 keys, so an executor keying on matched text within a line would be ambiguous — the column field is load-bearing #executor-design #precision
- [insight] The closure report already carries an UPDATED status nothing produces, currently reading 510 OUTSTANDING and 3 RETAINED and 0 UPDATED, so it is the executor's acceptance test pre-built #closure-gate #acceptance-test
- [fact] The reference family's whole barrel surface is six read-only report producers with no write entry point, while atomic-write and markdown-slices and frontmatter-mutations already supply the write substrate #no-executor #write-substrate
- [constraint] Correction propagation is not executor-eligible because its repair is authored prose against no map, so the original two-class split predicts exactly where mechanization stops #class-boundary #scope
- [fact] The 59 section-citation findings span 32 distinct sectionFragment values including ten D-N designators, one S-1 and one plural form, so an executor must remap the fragment as well as the target #section-citations #remap

### On the invocation surface

- [fact] The installed brain CLI reports v1.0.0 and exposes six search flags, so none of the twelve expanded parameters is reachable from a script today #cli-parity #deployment-lag
- [problem] Keyword mode returns zero rows for every query tried on the port-8765 server, including the single common word `composition` #dead-keyword #server-generation
- [insight] Parameter parity comes from the CLI rebuild and behavioural parity from the 8765 restart, and it is the restart that governs whether keyword works at all #sequencing #preconditions
- [fact] The CLI zero-result anomaly is accounted for — auto degrades to semantic-only because its keyword fallback is dead, and one query returns zero at threshold 0.7 and three rows at 0.3 #anomaly-resolved #threshold
- [fact] Two server generations are live at once: the plugin MCP path reports response-level actual_source, the port-8765 CLI path reports none at any level #server-generation #probe-conditions
- [insight] Direct index access is the only search-shaped surface needing no HTTP server, making it the only non-agent option compatible with the offline constraint #direct-index #offline
- [constraint] CLI-to-MCP search parity is a committed owner requirement, so post-rebuild live parity verification is a named precondition owned outside this evaluation #owner-requirement #precondition

### On the live search surface and index integrity

- [problem] Relation verbs on index rows are fabricated rather than merely stripped — the SPEC-008 to TASK-035 pair is served both as `contains` and under a verb literally named `x`, a markdown checkbox parsed as an edge #verb-fabrication #graph-integrity
- [fact] Thirteen ADR-002 outbound relation rows all carried `links-to` with not one canonical verb, while inbound edges from other notes were correctly typed #verb-stripping #measured
- [problem] Two rows in one 60-row window repeated with identical permalink and identical verb, so deduplicating on the edge triple would not remove them #exact-duplicates #enumeration
- [problem] Relation enumeration returned exactly the requested limit with no more-results signal, so a hub above the ceiling truncates silently #enumeration-cap #completeness
- [fact] The SEARCH advisory leg contributed zero of 497 findings — bySource reads TEXT 366, BOTH 128, GRAPH 3, with the advisory count at zero #dead-leg #measured

### On the commit's shape and provenance

- [fact] `git show --stat 8aad9681c8d265fd0e9869e8b08c8fccde706c4b` reports 17 files, 929 insertions, 172 deletions, matching the handoff figure with no divergence #commit-verification #baseline
- [problem] Parent `efdbaf7` fails to compile for two independent reasons: `note-identity.js` is absent from the tree yet imported by `note-index.ts` across lines 18-27, and `findEntityIds` is imported from a module that exports it nowhere #compile-repair #non-optional
- [fact] `reference-closure.ts` still contains a literal NUL byte at octal offset 0003360 at HEAD, so it diffs as binary and `grep` over the blob is unreliable #binary-blob #tooling-trap
- [fact] The commit message cites a 513-finding proof while the manifest carries 497 — two artifacts seventeen minutes apart, with 33 inverse-edge repairs and the 20 new wikilinks they created explaining the delta #provenance #live-census
- [fact] `6ff9edc` touches only defrag at +34 and recompose at +6 and never decompose, so it completes coverage of wiring that landed here rather than re-delivering it #prior-art #reverted-descendants
- [fact] The manifest ran against the fond docs tree — 69 markdown files, 41 scanned after excluding 28 targets — not the 366-file skills tree #scope #denominator

### On the evaluation itself

- [decision] Options are presented per component without locking; the decisions phase adjudicates each row of the summary table #options-only #no-locking
- [insight] The search-reduction opportunity is local rather than structural, and the larger gap is a missing writer rather than a missing searcher #reduction-question #reframing
- [risk] The manifest `mode` field records only the requested mode, so with routing overrides live it cannot distinguish a leg that ran and found nothing from one that never ran #under-specified #schema-update
- [outcome] Twelve components cover all seventeen changed files plus the absent executor, and the manifest schema needs no change to support that executor #coverage #component-count

## Relations

- relates_to [[ANALYSIS-006: Brain Search and Impact-Detection Tool Surface]]
- part_of [[PLAN-002: Composition Tooling Follow-Up Register]]
- depends_on [[ADR-002: Adapter Contract and Plan Schema]]
- relates_to [[QA-092: Pipeline Completion Build Validation]]
