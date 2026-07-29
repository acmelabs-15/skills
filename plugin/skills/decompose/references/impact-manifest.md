# The inbound-reference impact manifest

How the reference scanner finds every note that points at a note you are about to restructure, and how to read what it gives back. Read this before adjudicating any restructuring: the manifest is the blast radius, and it is only useful computed beforehand.

**This file is direction-neutral.** It describes the mechanism for splitting, merging and auditing alike. What differs between those is which failure to expect, and that lives with the caller: `decompose` carries the split-side risks, `recompose/references/merge-divergences.md` the merge-side ones, and `defrag/graph-audits.md` the audit framing. Nothing here assumes what you are doing to the notes.

## Why it must come first

A restructuring plan guarantees the content of the notes it moves. It says nothing about the notes that POINT AT them. Wikilinks, permalink strings, bare entity IDs and section citations all keep naming identities the operation is about to retire, and a hash-clean run leaves every one of them dangling.

Compute the blast radius before adjudication, so the repointing worklist is part of what the user approves rather than something review discovers later.

## The targets file

List every note the operation touches, carrying the aliases the scanner cannot infer:

```json
[
  {
    "path": "decisions/ADR-042.md",
    "aliasTitles": ["ADR-042: Former Title"],
    "aliasPermalinks": ["decisions/adr-042-former-title"],
    "aliasEntityIds": ["ADR-041"]
  },
  { "path": "decisions/ADR-042a.md" }
]
```

Aliases come from the plan you just authored: `renumber_map` supplies retired identifiers, and any title or permalink change supplies the rest. Each declared alias becomes a discovery query of its own, and no query on a target's current identity can reach one — that is what makes an identity retired. The scanner never guesses history, so an alias you omit is a whole class of stale reference nothing downstream can see.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/reference-scan.js" \
  --docs-root docs \
  --targets docs/_restructure/<id>-targets.json \
  --out docs/_restructure/<id>-impact.json
```

`--project <name>` is optional and pins the graph the queries run against. Left off, the CLI resolves one itself — `BM_PROJECT`, `BM_ACTIVE_PROJECT`, `BRAIN_PROJECT`, then a match of the working directory against configured code paths — and the project that actually answered is read back off the response and recorded on the manifest, together with whether you named it or the CLI resolved it. An unnamed project is therefore never an unknown one.

## How discovery works: the two-stage funnel

The scan does not walk the docs tree. It asks the search surface which notes could possibly reference the targets, then opens only those.

**Stage one — the candidate set, with a completeness contract.** Two arguments of the brain CLI's complete-retrieval surface run per target, and between them they partition the reference space:

- `--references <entity-id>` returns every note holding a wikilink EDGE to the target, in both directions. It reads the relation graph, not note text.
- `--exhaustive <literal>` returns every note whose FULL CONTENT contains the literal, case-insensitively. That is what catches permalink strings, section citations and bare prose mentions — including any past the 6000-character offset where ranked keyword search silently stops seeing them.

Neither ranks, limits or pages. Each states in-band whether its set is provably complete.

One `--exhaustive` query on the entity ID already covers the target's current title and permalink: a convention-following title is `{ENTITY-ID}: {Descriptor}` and the permalink embeds the same ID, so literal containment reaches both. Those forms are queried separately only on the defensive branch where a note breaks that convention. Every declared ALIAS, by contrast, gets its own `--exhaustive` query, and that is the whole reason the targets file accepts aliases: a retired permalink contains no trace of the current entity ID, so nothing about the current identity can reach it. Measured on a live graph, one analysis note referenced another ONLY through a retired permalink — the entity-ID query returned sixteen notes and not that one; the alias query returned it. Aliases get no `--references` query, because that leg resolves its target through the canonical title form which a retired identity no longer answers to, while an alias's wikilink edges are literal text the exhaustive query already returns.

Redundant queries are dropped before anything runs: when one planned literal contains another — an alias entity ID and the alias title that embeds it — only the shorter one runs, since literal containment makes its result set a superset. The survivors then run one at a time. A concurrent pool was built, measured and rejected: both surfaces sit on one server over one SQLite store, and concurrent invocations hung rather than helping.

**Stage two — the addresses.** No search response carries a line or a column, so search can say WHICH notes are implicated and never WHERE. Stage two opens each candidate and produces the exact `line:column` findings the repoint executor edits by. Both deterministic legs below run here, over the candidate set only. The targets are always part of that set whatever the queries returned, because a target's own Relations section is the formal index of what points at it.

**Honesty, per query and in aggregate.** Every query records its own total, whether the surface proved that set complete, the scope it claims to cover, and the reason when it could not prove itself. The manifest keeps all of them, and its own `provable` is the AND over them: one unproven query makes the whole worklist unproven whatever the others said. This matters because a query for a target the index does not know returns zero results and exit 0 — indistinguishable from "this note genuinely has no references" unless the completeness claim is read. An unproven scan therefore prints a warning naming the queries that could not vouch for themselves. Read `provable: false` as a worklist that may be short, and say so when you carry the counts into the adjudication summary.

**An unreachable search FAILS the run.** It is never degraded into an empty candidate set, because an empty set is indistinguishable from "nothing references these targets" and would hand you a clean bill of health produced by an outage. The same holds when queries inside one scan come back from different projects: the union of two graphs' answers is a worklist for neither, so the run stops rather than blending them.

**The mismatch guard.** A wrong graph answers fluently — every query proves itself complete over notes that really exist, just not here — so the finding count looks plausible and only disk correspondence gives it away. When the queries return notes but essentially none of them exist under the docs root, the scan says so and names the likely cause, which is usually a CLI-resolved project pointing at another repo; passing `--project` explicitly is the remedy. A handful of returned notes missing from disk is the ordinary case instead, and is reported separately as index staleness — a path the index knows and stage two cannot open.

### GRAPH — read the target's own Relations first

The conventions enforce bi-directional relations: when note A carries a `part_of` edge naming note B, B must carry the inverse `contains` edge naming A. That makes the target's own Relations section a FORMAL INDEX of the notes that reference it — an inbound index no text scan of the target could ever reconstruct, because the evidence lives in the other note. The scanner traverses it automatically, in both directions, and reports one-way edges as two classes:

- `bidirectional-missing-on-target` — a note carries a formal edge at the target, but the target carries no inverse. Repair goes on the TARGET.
- `bidirectional-missing-on-referencer` — the target's Relations name a note that carries no matching outbound edge. Repair goes on the REFERENCER.

For both, `referencingFile` and `line` point at the edge that DOES exist and `relation.counterpartFile` names where the missing inverse belongs, so a finding tells you where to look and where to write. Fix these BEFORE the operation: a one-way edge carried through a restructuring is multiplied by it.

### TEXT — the informal references

Six classes: `wikilink`, `wikilink-malformed` (a colon-less or filename-stem near-miss, already broken beforehand), `permalink`, `permalink-project-prefixed`, `entity-id-section` (with the cited fragment captured, so repointing can check the section still exists wherever it ended up), and `entity-id` — each with the referencing file, line, and matched text. Overlapping forms are reported once, so the counts are a worklist length rather than an overcount.

Each entry carries a `source` tag: `GRAPH`, `TEXT`, or `BOTH` when a text match landed on the formal edge itself and the two legs corroborate.

### Known boundary: batched targets do not see each other

Stage two excludes every target FILE from the text scan, on the reasoning that a note citing itself is not an inbound reference. For a single target that is exactly right. For several scanned together it is too wide: a reference from one target to another sits inside an excluded file, so it is neither reported nor repaired — and because closure diffs the prior manifest, it is not reported there either. Measured on a live graph, batch-scanning 28 targets dropped 326 cross-target occurrences. A per-candidate filter is the queued fix. Until it lands, scan targets that cite one another one at a time — single-target operations have zero exposure — or work the cross-target edges by hand.

The stakes of that gap differ by operation, so the callers' riders say which way it cuts.

## Nothing typed is read out of the index

Stage one's `--references` leg is existence-only by construction — deduplicated to notes, with a direction marker and no verb — and that restraint is deliberate rather than a gap. The index strips relation verbs from H3-grouped Relations entries: it keeps the edge but loses whether it was `contains` or `depends_on`, because it reads a verb only when the verb shares a line with its target and the grouped form puts the verb in the sub-header. Measured at fifteen of fifteen untyped on one ADR. Nor is a verb that IS present trustworthy: a live probe returned an edge whose verb was literally `x`, and another returned the same note pair twice under two different verbs, one absent from the conventions' allowlist entirely.

So a query through the index may ask "is there an edge here?" and must not ask "is it a `part_of` edge?". Every typed step reads the note body, which is what the GRAPH leg does — it parses bodies directly and never consults the index, and that is why it gates.

## The advisory channel: hand-run search via `--merge`

Literal containment cannot enumerate prose that names a note without naming any identifier — "the substrate analysis", "the eviction adjudication". Those references go stale exactly like an explicit citation, and no argument of the complete-retrieval surface reaches them, because containment needs a literal to contain. That boundary is why `--merge` exists, and hand-run search is the documented route across it.

Run those searches yourself against the same graph: the ranked search surface is the right instrument here precisely because the question is paraphrase rather than containment. Double-quote hyphenated identifiers (`"ANALYSIS-034"`) when you do — the tokenizer splits on hyphens, so an unquoted multi-term query is narrower than it looks. The library's own queries need no such quoting: they go to the CLI as an argv array with no shell in the path, and quotes added there would become part of the literal being searched for.

Verify every hit before you use it. Search can return rows from other projects, and the index can serve rows for notes that have moved or been renumbered. Check each returned permalink against `list_directory` ground truth and drop anything that does not resolve. Write the verified hits to a JSON file shaped like the manifest's `findings` entries and pass it in:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/reference-scan.js" \
  --docs-root docs \
  --targets docs/_restructure/<id>-targets.json \
  --merge docs/_restructure/<id>-advisory.json \
  --out docs/_restructure/<id>-impact.json
```

Merged entries are forced to `source: SEARCH` and `advisory: true` whatever the file claims, so nothing hand-authored can promote itself into the closure gate. The advisory channel WIDENS the worklist; it never gates it. Each entry must also state how it was found — the mode requested, the retrieval strategy requested alongside it, and which leg actually served the row (or `unreported` when the surface did not say). All three are required rather than defaulted, and kept as separate facts because they routinely disagree: an advisory entry is the one kind a reader has to confirm by hand, and confirming it means reproducing the query. Deterministic findings carry none of the three and are rejected if they do.

**The highest-value use of hand-run search is the UNEXTRACTABLE channel** of the correction check, not the reference scan. An obligation whose target is named only in prose — "the substrate analysis", no entity ID anywhere — is already found; it simply cannot be aimed. A descriptive search turns that prose name into a candidate note and makes the obligation checkable, which is a recall gain on work already identified rather than a hunt for new work.

Target it by reason, because only one of the three benefits:

| `reason` | Descriptive search |
| --- | --- |
| `no-resolvable-target` | YES — the prose names a note; resolve it |
| `ambiguous-target` | Sometimes — may narrow which note was meant |
| `no-quoted-stale-text` | NO — no quote to verify, so a candidate is no help |

Running the search over all three wastes most of the effort. Feed the resolved candidates back as `--obligations` tuples, and record that they came from an advisory resolution rather than from the note's own text.

Findings are the answer here, not a failure: the scan exits 0 whether it finds one reference or four hundred. Carry the per-class, per-target and per-source counts into the adjudication summary.

## Gating assertions: read the discovery block, then check the index

A scan that found nothing and a scan that silently did not run used to produce the same manifest. They no longer can — an unreachable search fails the run loudly. What is still possible is a scan that RAN, proved nothing, and produced a short worklist that reads like a finished one. Assert two things before you believe a low count.

**Read the `discovery` block.** It is the manifest's scope-honesty record and it is required on every manifest, so there is always one to read:

- `provable` — false means at least one query could not vouch for its own set. Each query keeps its own `reason`, so the block names which and why.
- `project` and `projectSource` — which graph answered, and whether you asserted it or the CLI inferred it. An inference a changed working directory could have redirected is worth a second look.
- `missingOnDisk` — paths the index returned that stage two could not open. That is index staleness, reported rather than dropped.
- `nonNoteCandidates` — indexed files that matched but are not markdown notes, such as a distribution plan YAML naming the same identifiers. They are excluded deliberately: closure re-scans the same markdown-scoped set, and a finding recorded outside it could never be re-derived, so the next check would call a reference nobody touched repaired.
- `projectMismatchSuspected` — the wrong-graph signal described above.

Per-query wall-clock is deliberately NOT in the manifest. Two scans of an unchanged graph must produce byte-identical manifests, which is what makes one diffable; timing is a property of the run rather than of the graph, so it is written to stderr instead.

**Parity, because index coverage is the one input discovery cannot self-check.** Compare the count of markdown files on disk under the docs root against the count of indexed entities carrying a permalink. They should match. A note the index does not know about cannot be returned by any query, and no completeness claim covers it — the surface proves its set complete over the index, not over the disk — so a shortfall is exactly the size of the funnel's blind spot, and the remedy is a re-index rather than anything in this pipeline. Take the file count over the same extension set the index covers: an earlier audit reported a 69-vs-73 discrepancy that turned out to be the auditor's own `*.md` filter excluding four `.yaml` files, not an index defect.

**Null-target relations as a DELTA, never an absolute.** Count relations whose target did not resolve. Read the change across the operation, not the number: a rise means the operation created unresolvable edges. The absolute value carries no signal because a healthy baseline is project-specific — one graph in this ecosystem sits at 0 and another at 97. A wiring that failed on "null-targets > 0" would pass the first graph while permanently failing the second, and would tell you nothing about either.

Record both with the manifest so the closure step can compare like with like.

## Companion checks: unlanded corrections and derivable figures

Two more things a restructuring can invalidate, both cheap to baseline beforehand and meaningless to check afterwards without a baseline. Both are read-only over the tree; the only file either writes is `--out`.

**Unlanded corrections.** A correction that names its target and quotes the text it retires is a machine-checkable obligation. Restructuring a note that is the target of an OUTSTANDING obligation moves the target assertion out from under the correction, and nobody finds out.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/correction-reconcile.js" \
  --docs-root docs --source <note.md> \
  --out docs/_restructure/<id>-corrections-before.json
```

Exit 2 means at least one obligation is OUTSTANDING or its target was not found. Resolve those first, or record in the plan summary that you are proceeding over them deliberately. `LANDED-UNMARKED` findings do not fail the run — they are a discipline signal, not a factual defect. The tool performs no discovery, so `--source` is repeatable and naming every relevant note is your job.

**Derivable figures.** A stated figure that summarises a structure — a totals row, an "N of M" tally, an "N rows" claim — is re-derivable from that structure, and restructuring is exactly what makes it wrong.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/figure-check.js" \
  --docs-root docs --note <note.md> \
  --out docs/_restructure/<id>-figures-before.json
```

Exit 2 means a figure already mismatches its structure; fix or record it now, because afterwards you cannot tell an inherited mismatch from one the operation caused. `UNANCHORED` findings do not fail a run — that is the tool declining to guess which structure a figure refers to, which is a report line rather than a defect. For claims that need pointing at explicitly, including cross-note ones, use a checks file instead of `--note`.

**Which failure to expect is direction-specific**, and it inverts: a split loses figures and orphans corrections, a merge inflates figures and resurrects corrections. The callers' riders carry that; do not infer it from this file.
