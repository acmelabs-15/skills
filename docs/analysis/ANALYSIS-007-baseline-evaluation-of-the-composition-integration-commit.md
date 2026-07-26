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

Commit `8aad9681c8d265fd0e9869e8b08c8fccde706c4b` on branch `feat/composition-tooling-for-fond` is the integration pass over the docs-tree verification tooling built to mechanize work that had been done by hand. The preceding sessions were spent repairing, by hand, the fallout of curating memory notes with the decompose, recompose and defrag skills: one-way inverse edges, stale citations into renumbered children, and section citations onto pre-split numbering. The originating directive was that these skills should be able to see every note that references a note they are about to change, before they change it, with any cap on how many such references can be reported removed.

Two repair classes were separated at that point. Split-induced reference drift is mechanically enumerable at plan time, which produced the inbound-reference impact scanner. Correction-propagation failure is not enumerable that way, which produced reconcile-by-diff, with figure-staleness count re-derivation added as a sibling. This commit integrates all of it.

After the scanner landed, the Brain MCP search wrapper was expanded — keyword mode revived end to end, relation edges made directly queryable, permalink wildcard enumeration, filter-only queries, structured metadata filters, and a strict-after date filter. That expansion was implemented but nobody returned to the skills codebase to ask how it should reshape this implementation. This note is that evaluation.

The central question per component: could the expanded search surface significantly reduce this implementation, possibly to a single module all three skills share; simplify specific modules; or something else, such as search-backed discovery legs layered over retained deterministic gating. Four option classes are presented per component — consolidate, replace, update, keep — with pros and cons. Nothing is locked here; the decisions phase adjudicates.

## Executive Summary

**The reduction is real but local. It lands on the advisory discovery legs and on the manifest schema, not on the deterministic core, and the honest expected net effect is slightly more code in exchange for materially better recall — not less code.**

A single shared search-backed module cannot replace the deterministic core, for four reasons that live probes and git reading establish rather than assume.

First, the tooling must run offline against a docs tree. Every deterministic leg works from files; the expanded surface requires a running index server. Any component whose gating moves onto search loses the ability to run at all when the server is down, which is precisely when a restructuring operation is most likely to be attempted from a checkout.

Second, relation verbs on index rows are not merely stripped — they are actively wrong, and worse than previously recorded. A live relation-edge query returned a verb literally named `x`, which is a markdown checkbox being read as an edge type, alongside `validated-by`, `closed-by`, `links-to`, and self-referential loops, plus the previously-measured `outcome`. None of `x`, `validated-by`, `closed-by` or `links-to` is a canonical relation verb. The GRAPH leg exists to verify typed inverse edges; an edge set whose types are fabricated cannot do that job at any confidence.

Third, the same query showed the same logical edge served two and three times under different verbs, and returned exactly as many rows as the requested limit at both 60 and 100 with no more-results signal in the response. A hub note with more inbound edges than the tool's maximum limit cannot be completely enumerated, and the response gives no way to know that truncation happened. Completeness was the originating requirement.

Fourth, the leaf dedupe is structurally load-bearing rather than stylistic. The commit's parent does not compile, and this commit is the repair. No search capability substitutes for it.

Against that, the expansion delivers three genuine improvements. The SEARCH advisory leg was written against a keyword mode that was dead; it is now alive, and permalink wildcard enumeration plus filter-only queries give the correction checker's un-aimable-obligation channel a precise, cheap discovery mechanism it did not have. The manifest's `mode` field is now under-specified in two ways and is the clearest single "update" candidate in the commit. And the parity gating assertion that the skill wiring mandates became cheap to actually run.

Preference, offered as a preference and not as a settled position: keep the deterministic core and its gating role, update the manifest schema and the skill wiring's search-constraint prose, and treat the expanded surface as a strictly better advisory discovery leg. The consolidate-to-one-module framing is attractive but the probes argue against it on completeness and verb-integrity grounds.

## Approach

Commit content was read via git only — `git show --stat`, `git show <sha> --text -- <path>`, `git grep <pattern> <rev> -- <path>`, `git log --first-parent`, `git merge-base`. No search index was consulted to describe commit content. The owner's commit analysis document was read as primary input and git reading served as the verification layer over it.

Shape verification first. `git show --stat 8aad9681c8d265fd0e9869e8b08c8fccde706c4b` reports 17 files changed, 929 insertions, 172 deletions, matching the handoff figure exactly with no divergence.

Every enumeration below states the command that produced it and the scope that command covered.

### Live probe conditions and server generation

All search probes ran against project `skills` on 2026-07-26. Server generation is ambiguous against the stated detection heuristic, and the ambiguity is recorded rather than resolved.

The filter re-routing half of the fix is demonstrably live. A query with `mode: "semantic"` and `note_types: ["analysis"]` returned four rows, every one of them an analysis note, and the response reported `actual_source: "keyword"` — the request was re-routed onto the leg that can honour the filter, and the response said so. A pre-fix server would have ridden the semantic leg and returned unfiltered results silently.

The per-row field half does not match the heuristic as stated. Every result row carries a field named `source` (value `keyword` in all probes), and every response carries a top-level field named `actual_source`. No row carries a field literally named `actual_source`. By the letter of the detection rule — absence of a per-row `actual_source` field means pre-fix — this reads as pre-fix; by behaviour it reads as post-fix. Both readings are recorded. Every probe below was paired with a deterministic mode or an exact-identifier retrieval so that no conclusion rests on the filter half alone.

## Findings

### Component 1 — Shared identity leaf and the generic note index

Files: `shared/composition/src/core/note-identity.ts` (new, 142 lines), `shared/composition/src/core/note-index.ts` (+30 / −19), `shared/composition/src/core/correction-extract.ts` (+1 / −1).

What the change does. It extracts the identity primitives that three tool families had each grown independently — entity-ID derivation from a colon title, the canonical entity-prefix list, frontmatter reading, path location, and the filesystem seam — into one leaf module that imports nothing from its dependents. `NoteIndex` becomes generic over the note record type so the reference scanner's relation-carrying record and the correction and figure passes' content-carrying record share one index, and gains a `resolveNormalized` method kept deliberately separate from strict `resolve`.

Git evidence. `git show 8aad9681 --text -- shared/composition/src/core/note-index.ts` shows the class signature changing from `export class NoteIndex {` to `export class NoteIndex<T extends NoteIdentity = IndexedNote> {`, a new `byNormalizedTitle` map, and the removal of the local `locateNote` function. `git show 8aad9681 --text -- shared/composition/src/core/reference-matchers.ts` shows `normalizeReference`, `deriveEntityId` and a private fifteen-entry `ENTITY_PREFIXES` set all deleted, net +7 / −46.

This component is not optional, and the evidence is that its absence breaks the build. At the parent commit `efdbaf7`, `git ls-tree efdbaf7 -- shared/composition/src/core/note-identity.ts` returns empty — the file does not exist — while `git grep -n "note-identity" efdbaf7 -- shared/composition/` shows `note-index.ts:27` importing eight symbols from that absent module. Independently, `git grep -n "findEntityIds" efdbaf7 -- shared/composition/` shows `correction-extract.ts:41` importing `findEntityIds` from `./note-index.js`, and `git grep -n "^export" efdbaf7 -- shared/composition/src/core/note-index.ts` lists only `IndexedNote`, `NoteIndex`, `buildNoteIndex`, `locateNote` and `readNoteAt`. The symbol is exported nowhere in that tree. So `efdbaf7` fails to compile for two independent reasons, and this commit is the first resolving commit since `87b6ae4`.

Options.

**Keep.** Pros: it is the only thing making the tree compile, it is a genuine leaf with no cycle risk, and it is the single point where the canonical prefix list lives so a prefix added for one checker cannot silently fail to reach another. Cons: it is 142 lines of primitives that partly duplicate concepts the index server also models, so a reader may reasonably ask why both exist.

**Consolidate (fold identity into a search-backed module).** Pros: one identity notion across tools and index. Cons: the module would stop being a leaf and stop working offline; the compile-repair property is lost; and the index's own identity notions are the very thing the probes show to be unreliable. This option is available to state but the evidence against it is unusually direct.

**Replace (resolve identity by querying the index).** Pros: no local prefix list to drift. Cons: identity resolution becomes a network call per note across a 365-file tree, and a resolution failure becomes indistinguishable from a server problem. Permalink lookups do work well — an exact-identifier probe is precise — but throughput and offline operation both regress.

**Update (keep the leaf, add an optional index-backed alias resolver behind the existing seam).** Pros: the `NoteFileSystem` seam already exists for exactly this kind of substitution, and `resolveNormalized` is already the lenient path kept separate from the strict one, so an advisory resolver has a natural home. Cons: two resolution paths to reason about, and a reader must keep straight which one a given report line came from.

### Component 2 — Scanner legs: GRAPH, TEXT, and mode-aware SEARCH advisory

Files: `shared/composition/src/core/reference-scan.ts` (+15 / −54), `shared/composition/src/core/reference-graph.ts` (+27 / −30), `shared/composition/src/core/reference-matchers.ts` (+7 / −46).

What the change does. The scan pass stops carrying its own identity helpers and its own filesystem seam, and its `NoteRecord` becomes an extension of the shared `NoteIdentity`. In the graph leg the `TitleIndex` class is deleted and replaced by a `buildResolver` function that layers a scan-specific alias map over the shared `NoteIndex`; the replacement also removes an inner `[...notes].find(...)` scan from the alias loop, so alias resolution stops being quadratic in the note count.

Git evidence. `git show 8aad9681 --text -- shared/composition/src/core/reference-graph.ts` shows the class deleted and `buildResolver` added, with `checkOutward` and `applyGraphLeg` re-typed to take a `resolve: (reference: string) => NoteRecord | undefined` callback in place of a `TitleIndex` instance. The same diff shows `const byPath = new Map(notes.map((note) => [note.path, note]))` replacing the per-alias linear find.

Live probe bearing on this component. The GRAPH leg's job is to verify that a typed edge has its typed inverse. A relation-edge query — `entity_types: ["relation"]`, `mode: "keyword"`, `search_type: "text"`, query `ADR-002`, limit 60, project `skills` — returned 60 rows. All fourteen rows whose source was ADR-002 carried the verb `links-to`; not one carried a canonical verb. In the same result set, inbound edges from other notes were correctly typed (`extends` from ADR-004, `leads-to` from ADR-001, `pairs-with` from ADR-003, `implements` from many REQ and SPEC notes). Since the bi-directional rule requires ADR-002 to carry inverses of those edges, and no inverse verb appears on any ADR-002 row, the verbs on that note's rows are not its authored verbs.

A second probe — same parameters, query `SPEC`, limit 100 — returned 100 rows and surfaced fabrications beyond the previously recorded `outcome` and `source-artifacts`. The row `specs/spec-008-protocol-hardening-wave-2/spec-008-protocol-hardening-wave-2/x/specs/spec-008-protocol-hardening-wave-2/tasks/task-035-...` carries a relation verb of `x`, which is a markdown checkbox item read as a graph edge. The same probe returned `validated-by` and `closed-by`, neither canonical, and two self-loops in which a note points at itself (`qa-042-.../links-to/qa-042-...`).

Options.

**Keep.** Pros: the GRAPH leg parses note bodies directly and never consults the index, which is exactly why it can gate; the probes above are an argument for that design rather than against it. Cons: it re-derives edges the index already stores, so it looks redundant to anyone who has not measured the index.

**Replace the GRAPH leg with relation-edge queries.** Pros: the query surface is now genuinely there, returns edges directly, and would delete a body-parsing path. Cons: the measured verb integrity makes typed inverse checking unsound, the same logical edge arrives two and three times, and enumeration is bounded — this is the weakest of the four for this component on current evidence.

**Update (widen the SEARCH advisory leg; leave GRAPH and TEXT untouched).** Pros: keyword mode was dead when the leg was designed and is now alive, so the leg's recall improves without any gating change; permalink prefix enumeration and filter-only queries add precise candidate discovery. Cons: the advisory-versus-gating distinction becomes more important to communicate, not less, because the leg is now good enough to be mistaken for authoritative.

**Consolidate the three legs behind one resolver interface.** Pros: one call site for callers, and the existing `resolve` callback shows the seam already tolerates substitution. Cons: it risks blurring the property that makes the arrangement safe — that exactly one leg is deterministic enough to fail a step on.

### Component 3 — Closure gate and check mode

File: `shared/composition/src/core/reference-closure.ts`, reported by git as `Bin 6681 -> 6718 bytes`.

What the change does. The hidden hunk is only the filesystem-seam rename. `git show 8aad9681 --text -- shared/composition/src/core/reference-closure.ts` shows `import { type ScanFileSystem, scanReferences } from "./reference-scan.js"` becoming a type-only import of `NoteFileSystem` from `./note-identity.js` plus a value import of `scanReferences`, and the `fileSystem` field on `ClosureOptions` re-typed from `ScanFileSystem` to `NoteFileSystem`. Nothing else in the file changed.

The binary report is a literal NUL byte in a join separator, present from the file's creation. It is still present at the current HEAD: `od -c` on the working-tree file shows `"  \0   ")` at octal offset 0003360 in a 6718-byte file, and `git grep -n "join" 8aad9681 -- shared/composition/src/core/reference-closure.ts` answers only `Binary file 8aad9681:shared/composition/src/core/reference-closure.ts matches`. The one-byte fix landed in a descendant that was reverted, so the condition is live. Consequence for anyone auditing this file: piping a blob through `grep` is unreliable, and `git grep <pattern> <rev> -- <path>` or `sed` must be used instead.

Options.

**Keep the gate deterministic.** Pros: the closure check is the step that can fail an operation, and it currently rests entirely on legs that work offline from files. Cons: it duplicates edge knowledge the index holds.

**Replace the gate's inbound leg with index relation queries.** Pros: would remove a full tree re-scan at check time. Cons: the limit behaviour is disqualifying for a completeness gate — a hub with more edges than the maximum limit returns exactly the limit with no signal that more exist, so the gate would silently pass on the largest notes, which are the ones most likely to be restructured.

**Update the ruling's rationale rather than its outcome.** The advisory-not-gating ruling was made when keyword mode was dead, cross-project leaks were live, and stale rows were being served. Two of those three conditions have changed. Pros: refreshing the stated reason keeps the constraint honest and prevents the next reader from dismissing it as stale. Cons: it invites re-litigation of a settled decision. This is prior art with rationale, not an immovable constraint, and adjudicating it is the decisions phase's call, not this note's.

**Consolidate closure into the scanner.** Pros: one pass, one report. Cons: baseline-then-recheck is inherently two invocations at two points in time; merging them removes the seam the diff-against-baseline pattern needs.

### Component 4 — Reconcile-by-diff correction discovery

Files: `shared/composition/src/core/correction-extract.ts` (+1 / −1 in this commit), with the whole correction family newly surfaced through the barrel.

What the change does. In this commit the correction family's only source change is the one-line import repoint from `./note-index.js` to `./note-identity.js`, which is half of the compile repair. Its `findCorrectionMarkers`, `extractObligations`, `reconcile` and `verifyObligation` entry points, and the `UNEXTRACTABLE_REASONS` enum, become reachable through the new barrels.

Why this is where the expansion pays best. The skill wiring added in this same commit already identifies it: an obligation whose target is named only in prose, with no entity ID anywhere, is already found — it simply cannot be aimed. The commit's own reason-targeted table (verified present at `skills/decompose/SKILL.md:254` via `git grep -n -i "UNEXTRACTABLE" 8aad9681 -- skills/decompose/SKILL.md`) says `no-resolvable-target` benefits from semantic discovery, `ambiguous-target` sometimes does, and `no-quoted-stale-text` does not.

Live probe bearing on this component. Two capabilities that did not exist when that table was written now do. A filter-only query with no query text at all — `note_types: ["analysis"]`, `after_date: "2026-07-01"`, project `skills` — returned three rows (ANALYSIS-004, ANALYSIS-005, ANALYSIS-006) out of the six analysis notes that exist, correctly excluding the three whose index timestamps predate the cutoff. That matches the modification dates `list_directory` reports for the same six files, so the date filter is accurate and not merely plausible. And an exact-identifier enumeration — `search_type: "permalink"`, query `analysis/analysis-00*` — returned exactly the six analysis notes with no text term at all.

Options.

**Update (feed search-resolved candidates into the existing obligations channel).** Pros: this is the highest-value, lowest-risk use of the expansion in the whole commit; the wiring already describes the mechanism and the tool already accepts `--obligations` tuples, so the change is additive; recall improves on work already identified rather than hunting for new work. Cons: an advisory resolution must be marked as such in the report or a reader will treat a guessed aim as an authored one.

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

What the change does in this commit is expose the schemas through the barrel. The evaluation finding concerns the schema itself, and it is the clearest single update candidate in the commit.

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

Overlap with the reverted descendants, which are legitimate prior art rather than territory to reinvent. `6ff9edc` is titled "reason-targeted UNEXTRACTABLE discovery, traverse-on-existence rationale, gating assertions with baseline deltas, code-span trap guidance" — advertising the same four subjects this commit already contains, so it is a refinement pass over wiring that already landed, not a first delivery. `c434301` is titled "post-expansion alignment — keyword revival dated into the skill wiring, backlink and filter guidance added" and is therefore a draft of exactly the update option below.

Live probe bearing on this component. The wiring's central claim holds and is if anything understated: index traversal may ask whether an edge exists and must not ask what type it is. My probes confirm the stripping and add fabrication — a verb of `x`, plus `validated-by`, `closed-by`, `links-to` and self-loops. Separately, the wiring's search-constraint lines were written when keyword mode was dead; keyword mode returned five substantive rows with `actual_source: "keyword"` on a plain text query, so those specific lines are now stale as written.

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

| Component | Consolidate | Replace | Update | Keep | Leaning |
|---|---|---|---|---|---|
| 1. Identity leaf + note index | Breaks leaf property and offline operation | Per-note network cost; masks failures | Optional index-backed alias resolver behind existing seam | Compile-critical; single prefix source | Keep, optionally Update |
| 2. Scanner legs | Blurs the one-deterministic-gate property | Verb fabrication and limit cap disqualify | Widen SEARCH advisory on revived keyword | GRAPH parses bodies, never the index | Keep + Update advisory |
| 3. Closure gate | Removes the baseline/recheck seam | Silent truncation on the largest notes | Refresh the ruling's stated rationale | Gate stays deterministic and offline | Keep, Update rationale |
| 4. Correction discovery | Unrelated questions, shared leaf only | Turns declining-to-guess into guessing | Feed search-resolved candidates into obligations | Zero risk, corpus-validated | Update — best payoff |
| 5. Figure check | No counterpart to consolidate into | No structural counts in the index | Anchor some UNANCHORED cross-note claims | Arithmetic over local structure | Keep |
| 6. Barrels | Not applicable | Not applicable | Widen scope to all of src/core | Header argues the partial scope | Keep |
| 7. Manifest `mode` field | Breaking shape change | Raw envelope defeats the Zod boundary | Add searchType + per-finding actualSource | Optional and advisory today | Update — clearest candidate |
| 8. Skill wiring | Skill content must read standalone | Loses offline operation and exit contract | Date keyword revival; add fabrication evidence | Load-bearing claims hold | Update |
| 9. Observations cap | Not applicable | Not applicable | Ratio guard (registered separately) | Discharges the originating directive | Keep |
| 10. Fixtures and tests | Not applicable | Not applicable | Cover the advisory merge path | Tracks the rename; house-form ruling sound | Keep |
| 11. Repo hygiene | Not applicable | Not applicable | Not applicable | Sound reasoning, correct anchoring | Keep |

## Divergences from the Owner's Commit Analysis Document

The owner's commit analysis document is accurate on every point I was able to check independently, including all seventeen file entries, both per-file line counts and the substance of every rationale it quotes. Three refinements rather than contradictions:

The document describes the parent-state problem as a single import-path change to `correction-extract.ts`. Git shows the breakage at `efdbaf7` is two independent failures, not one: `note-index.ts:27` also imports eight symbols from the absent `note-identity.js`. The document's file-by-file framing is correct for this commit's diff; the double break is only visible from the parent tree.

The document reports `reference-closure.ts` as "git initially reported this file as binary but a forced text diff reveals it is small text changes to imports." That is right about the hunk and incomplete about the cause. The binary report is a literal NUL byte still present at HEAD, confirmed by `od -c` showing `"  \0   ")` at octal offset 0003360. The file being text-diffable does not make it a text blob, and `grep` over the blob remains unreliable.

The document's stated 15-observation removal rationale, the barrel scope decision, the house-form test ruling and the `/scratch/` reasoning all reproduce verbatim from the diffs I read. No divergence found.

Two divergences from the dispatch brief's constraint list, both measured rather than inferred:

**Stale orphan rows were not observed.** The brief states that the reverted ANALYSIS-007 and ANALYSIS-008 embeddings are new orphans still served by the index. A permalink prefix enumeration — `search_type: "permalink"`, query `analysis/analysis-00*`, project `skills`, limit 30 — returned exactly six rows, ANALYSIS-001 through ANALYSIS-006, with no 007 or 008. The filter-only analysis query returned three rows, likewise with neither. `ls docs/analysis/` confirms six files on disk. On this enumeration the reverted notes are absent from both disk and index; a differently-shaped query may still surface them, and that scope limit is stated rather than glossed.

**Hub duplication measured at two to three times, not five.** Within the ADR-002 probe, `PLAN-001: Skills Ecosystem -> ADR-002` appeared three times under `outcome`, `implements` and `links-to`; several pairs appeared twice. In the 100-row SPEC probe, `QA-000-SPEC-001 -> QA-004-SPEC-001`, `-> QA-008`, `-> QA-001`, `-> QA-005` and `-> QA-007` each appeared twice, and `SPEC-008 -> TASK-035` twice under `x` and `contains`. The duplication is real and the qualitative concern stands; the multiplier I measured on this graph is lower than the figure carried in the brief, and the figure I state is the one my commands produced.

On the truncation cap: requesting limit 60 returned `total: 60` and requesting limit 100 returned `total: 100`, with no more-results indicator in either response. The tool's schema caps `limit` at 100, so the practical ceiling and the silent-truncation risk are both confirmed, expressed through the limit parameter rather than as a separate internal cap.

## Observations

### On the commit's shape and provenance

- [fact] `git show --stat 8aad9681c8d265fd0e9869e8b08c8fccde706c4b` reports 17 files, 929 insertions, 172 deletions, matching the handoff figure with no divergence #commit-verification #baseline
- [fact] `git merge-base <sha> 8aad9681` returns 8aad9681 itself for all four reverted SHAs, establishing them as descendants rather than parents #commit-order #git-evidence
- [fact] The traverse-on-existence block and the reason-targeted UNEXTRACTABLE table are present at `skills/decompose/SKILL.md:243` and `:254` in this commit and absent at parent `efdbaf7` #skill-wiring #commit-order
- [problem] Parent `efdbaf7` fails to compile for two independent reasons: `note-identity.js` is absent from the tree yet imported by `note-index.ts:27`, and `findEntityIds` is imported from a module that exports it nowhere #compile-repair #non-optional
- [fact] `reference-closure.ts` still contains a literal NUL byte at octal offset 0003360 at current HEAD, so the file diffs as binary and `grep` over the blob is unreliable #binary-blob #tooling-trap

### On the live search surface

- [fact] Keyword mode is alive: a plain text query returned five substantive rows with `actual_source: "keyword"`, so pre-expansion notes claiming keyword returns nothing are stale #keyword-revival #stale-context
- [problem] Relation verbs on index rows are fabricated, not merely stripped — a verb literally named `x` appeared, which is a markdown checkbox read as an edge type, alongside `validated-by`, `closed-by`, `links-to` and self-referential loops #verb-fabrication #graph-integrity
- [fact] All fourteen ADR-002 outbound relation rows carried `links-to` and none carried a canonical verb, while inbound edges from other notes were correctly typed #verb-stripping #measured
- [problem] Relation enumeration returned exactly the requested limit at both 60 and 100 with no more-results signal, so a hub above the ceiling truncates silently #enumeration-cap #completeness
- [fact] Filter-only queries work with no query text, and the strict-after date filter correctly returned three of six analysis notes, matching the dates `list_directory` reports #filter-only #after-date
- [fact] A permalink prefix enumeration returned exactly the six analysis notes that exist on disk, with no stale rows for the two reverted notes #permalink-wildcard #orphan-check
- [insight] Server generation is ambiguous against the stated detection rule: filter re-routing is demonstrably live, yet rows carry a field named `source` rather than one named `actual_source` #server-generation #probe-conditions

### On the evaluation itself

- [decision] Options are presented per component without locking; the decisions phase adjudicates each row of the summary table #options-only #no-locking
- [insight] The reduction opportunity is local rather than structural — it lands on the advisory discovery legs and the manifest schema, not on the deterministic core #reduction-question #scope
- [constraint] Any proposal moving a deterministic leg onto search must account for offline operation against a docs tree of 365 markdown files, counted by `find docs -type f -name '*.md' | wc -l` #offline-requirement #parity
- [insight] The correction checker's un-aimable-obligation channel is where the expansion pays best, because it improves recall on work already identified rather than hunting for new work #best-payoff #correction-discovery
- [risk] The manifest `mode` field records only the requested mode, so with routing overrides live it can no longer distinguish a leg that ran and found nothing from one that never ran #under-specified #schema-update
- [insight] The reverted descendants `6ff9edc` and `c434301` already draft much of the skill-wiring update option, so that work is a refinement of existing prior art rather than a first delivery #prior-art #reverted-descendants
- [outcome] Eleven components cover all seventeen changed files; four carry a substantive update candidate and seven lean keep on current evidence #coverage #component-count

## Relations

- relates_to [[ANALYSIS-006: Brain Search and Impact-Detection Tool Surface]]
- part_of [[PLAN-002: Composition Tooling Follow-Up Register]]
- depends_on [[ADR-002: Adapter Contract and Plan Schema]]