---
name: recompose
description: Merge (N-to-1) multiple Brain knowledge-graph notes into a single note using a composition plan. Triggers on phrases like "recompose these notes", "merge these ADRs", "combine these analyses". Authors a composition plan YAML, presents it for adjudication, then executes via the composition library with SHA-256 round-trip validation guaranteeing zero content drift.
---

# recompose

Merges N source Brain knowledge-graph notes into 1 destination note using a deterministic composition plan. Inverse of `/decompose`. The LLM authors the plan (cognitive work); the composition library executes it (mechanical work, hash-validated).

## When to use this skill

Use when the user asks to:

- Recompose notes (e.g., "recompose these ADRs", "merge these analyses")
- Consolidate per-decision ADR splits back into a multi-decision ADR
- Roll up per-finding analyses into a single index
- Any other N-to-1 restructuring

## Three-phase workflow

Identical to `/decompose` (LLM authoring → user adjudication → script execution). Never bypass adjudication.

## Step-by-step instructions

### Step 1: Read the sources

- Identify the N source note paths from the user's request
- Read each via Brain MCP `read_note`
- Confirm all sources share the same `source_type` (frontmatter `type` field). Cross-type recomposition is out of scope; reject if mixed.

### Step 2: Determine merge order, resolve collisions, author the plan

Determine the order in which sources are concatenated, then design a `renumber_map` that unifies identifiers across sources without collisions (the renumber map must be injective).

Write a YAML file to `docs/_restructure/recompose-{id}-plan.yaml`:

```yaml
plan_type: composition
source_type: adr
target_path: <path/to/merged.md relative to plan file>
sources:                    # ordered list of source paths to concatenate
  - <path/to/source-a.md>
  - <path/to/source-b.md>
renumber_map:
  D-100: D-1
  D-101: D-2
  # Must be injective.
wikilink_map: {}
```

If `sources` is omitted, the script treats `target_path` itself as the sole source (identity renumber).

### Step 3: Compute the inbound-reference impact manifest

A merge retires N-1 identities. Every note that wikilinks an absorbed source,
cites its permalink, names its entity ID, or cites one of its sections keeps
pointing at a note that will no longer be the authority for that content — and
the hash proofs say nothing about any of it. Compute the blast radius before
adjudication so the repointing worklist is part of what the user approves.

Author a targets file listing the merge target and every source being absorbed,
carrying the aliases the scanner cannot infer:

```json
[
  { "path": "decisions/ADR-042.md" },
  {
    "path": "decisions/ADR-042a.md",
    "aliasTitles": ["ADR-042a: Cluster A"],
    "aliasPermalinks": ["decisions/adr-042a-cluster-a"]
  }
]
```

The absorbed sources are the interesting targets: after the merge their titles,
permalinks and entity IDs stop resolving to live notes, so inbound references to
them are the breakage. Aliases come from the plan you just authored —
`renumber_map` supplies retired identifiers. Each declared alias becomes a
discovery query of its own, and no query on a source's current identity can reach
one — that is what makes an identity retired. The scanner never guesses history;
an alias you omit is a class of stale reference nothing downstream can see.

```bash
bun run shared/composition/src/reference-scan.ts \
  --docs-root docs \
  --targets docs/_restructure/recompose-{id}-targets.json \
  --out docs/_restructure/recompose-{id}-impact.json
```

`--project <name>` is optional and pins the graph the queries run against. Left
off, the CLI resolves one itself (`BM_PROJECT`, `BM_ACTIVE_PROJECT`,
`BRAIN_PROJECT`, then a match of the working directory against configured code
paths), and the project that answered is read back off the response and recorded
on the manifest along with whether you named it or the CLI resolved it — so an
unnamed project is never an unknown one.

#### How discovery works: the two-stage funnel

The scan does not walk the docs tree. Stage one asks the search surface which
notes could possibly reference the sources; stage two opens only those and finds
the exact `line:column` of each reference, since no search response carries a
line or a column. The targets are always in that set whatever the queries
returned, because each source's own Relations section is a formal index of what
points at it.

Stage one runs two arguments of the brain CLI's complete-retrieval surface per
target, and they partition the reference space: `--references <entity-id>`
returns every note holding a wikilink EDGE to it, in both directions, read off
the relation graph rather than note text; `--exhaustive <literal>` returns every
note whose FULL CONTENT contains the literal, case-insensitively, which is what
catches permalink strings, section citations and bare prose mentions — including
any past the 6000-character offset where ranked keyword search silently stops
seeing them. Neither ranks, limits or pages, and each states in-band whether its
set is provably complete.

One exhaustive query on the entity ID already covers a source's current title and
permalink, because the canonical title is `{ENTITY-ID}: {Descriptor}` and the
permalink embeds the same ID; those forms are queried separately only where a
note breaks that convention. Every declared ALIAS gets its own exhaustive query,
which is the whole reason the targets file accepts aliases: a retired permalink
contains no trace of the current entity ID, so nothing about the current identity
reaches it. Measured on a live graph, one analysis note referenced another ONLY
through a retired permalink — the entity-ID query returned sixteen notes without
it, the alias query returned it. Aliases get no `--references` query, since that
leg resolves through the canonical title form a retired identity no longer
answers to, while an alias's wikilink edges are literal text the exhaustive query
already returns. A planned literal that contains another is dropped before
anything runs (containment makes the shorter one's result set a superset), and
the survivors run one at a time — a concurrent pool was measured and rejected,
because both surfaces sit on one server over one SQLite store and concurrent
invocations hung rather than helping.

**Honesty is per query and aggregated by AND.** Each query records its total,
whether the surface proved that set complete, the scope claimed, and the reason
when it could not prove itself; the manifest's `provable` is false the moment any
one query is. That matters because a query for a target the index does not know
returns zero results and exit 0, indistinguishable from "no references" unless
the completeness claim is read — so an unproven scan warns, naming the queries
that could not vouch for themselves. Read `provable: false` as a worklist that
may be short.

**An unreachable search FAILS the run** rather than degrading to an empty
candidate set, which would be indistinguishable from "nothing references these
sources" and would hand you a clean bill of health produced by an outage. Queries
inside one scan resolving to different projects stop the run for the same reason.
And when the queries return notes but essentially none exist under the
docs root — the structural signature of the wrong graph, which answers fluently
and provably — the scan says so and names `--project` as the remedy. A handful of
returned notes missing from disk is ordinary index staleness instead, reported
separately as paths stage two could not open.

**GRAPH — read each source's own Relations first.** The conventions enforce
bi-directional relations: when note A carries a `part_of` edge naming note B, B
must carry the inverse `contains` edge naming A. Each absorbed source's
Relations section is therefore a FORMAL INDEX of the notes referencing it, and
those edges are what a merge silently strands — the referencing notes keep
pointing at a source that is no longer the authority. The scanner traverses in
both directions and reports one-way edges as `bidirectional-missing-on-target`
(repair on the target) and `bidirectional-missing-on-referencer` (repair on the
referencer), with `relation.counterpartFile` naming where the missing inverse
belongs.

Merges make this acute: every edge pointing at an absorbed source has to be
re-verbed onto the merge target, and its inverse has to move with it. Repointing
one end and leaving the other is the defect this leg exists to catch.

**TEXT — the informal references.** Six classes: `wikilink`,
`wikilink-malformed` (a colon-less or filename-stem near-miss, already broken
before the merge), `permalink`, `permalink-project-prefixed`,
`entity-id-section` (with the cited fragment captured, so repointing can check
the section survived the merge), and `entity-id` — each with the referencing
file, line, and matched text. Each entry carries a `source` tag of `GRAPH`,
`TEXT`, or `BOTH` when a text match landed on the formal edge itself. Both legs
run over the candidate set stage one selected, and over nothing else.

**Known boundary: batched targets do not see each other.** Stage two excludes
every target FILE from the text scan, on the reasoning that a note citing itself
is not an inbound reference. With one target that is right; with several scanned
together it is too wide, and a merge scans the whole absorbed set at once. A
reference from one source to another sits inside an excluded file, so it is
neither reported nor repaired — and because closure diffs the prior manifest, it
is not reported there either. Measured on a live graph, batch-scanning 28 targets
dropped 326 cross-target occurrences. A per-candidate filter is the queued fix.
Until it lands, treat references BETWEEN the sources you are merging as a hand
pass, or scan them one at a time; single-target scans have zero exposure.

#### The advisory channel: hand-run search via `--merge`

Literal containment cannot enumerate prose that names a source without naming any
identifier ("the substrate analysis"). Those references go stale exactly like an
explicit citation, and no argument of the complete-retrieval surface reaches them
— containment needs a literal to contain. That boundary is why `--merge` exists,
and hand-run search is the documented route across it.

Run those searches yourself against the same graph, double-quoting hyphenated
identifiers (`"ANALYSIS-034"`) since the tokenizer splits on hyphens. The
library's own queries need no such quoting: they reach the CLI as an argv array
with no shell in the path, where added quotes would become part of the literal.
Verify every hit against `list_directory` ground truth before using it — search
can return rows from other projects, and the index can serve rows for notes that
have moved or been renumbered — then pass the verified hits via `--merge`:

```bash
bun run shared/composition/src/reference-scan.ts \
  --docs-root docs \
  --targets docs/_restructure/recompose-{id}-targets.json \
  --merge docs/_restructure/recompose-{id}-advisory.json \
  --out docs/_restructure/recompose-{id}-impact.json
```

Merged entries are forced to `source: SEARCH` and `advisory: true` whatever the
file claims: the advisory channel widens the worklist and never gates it. Each
entry must state how it was found — the mode requested, the retrieval strategy
requested alongside it, and which leg actually served the row (`unreported` when
the surface did not say) — all three required rather than defaulted, and kept
separate because they routinely disagree. An advisory entry is the one kind a
reader must confirm by hand, and confirming it means reproducing the query.
Deterministic findings carry none of the three and are rejected if they do.

**Nothing typed is read out of the index.** Stage one's `--references` leg is
existence-only by construction — deduplicated to notes, with a direction marker
and no verb — and that restraint is deliberate. The index strips relation verbs
from H3-grouped Relations entries, reading a verb only when it shares a line with
its target while the grouped form puts it in the sub-header. Measured at fifteen
of fifteen untyped on one ADR. Nor is a verb that IS present trustworthy: a live
probe returned an edge whose verb was literally `x`, and another returned the
same note pair twice under two different verbs, one absent from the conventions'
allowlist entirely. A query through the index may ask "is there an edge?" and
must not ask "is it a `contains` edge?"; typed steps read the note body, which is
what the GRAPH leg does — it parses bodies directly and never consults the index,
which is why it gates.

**The highest-value use of hand-run search is the UNEXTRACTABLE channel** of the
correction check below. An obligation whose target is named only in prose is
already found and merely un-aimable; a descriptive search turns the prose name
into a candidate note and makes it checkable. Target it by reason —
`no-resolvable-target` benefits, `ambiguous-target` sometimes, and
`no-quoted-stale-text` does not (with no quote there is nothing to verify, so a
candidate note adds nothing). Feed resolved candidates back as `--obligations`
tuples and record that the aim came from an advisory resolution.

#### Gating assertions: read the discovery block, then check the index

A scan that found nothing and one that silently did not run can no longer produce
the same manifest — an unreachable search fails the run. What remains is a scan
that RAN, proved nothing, and produced a short worklist reading like a finished
one. Read the manifest's `discovery` block before believing a low count: it is
required on every manifest and carries `provable` (false when any query could not
vouch for its own set, with the per-query `reason` naming which), `project` and
`projectSource` (which graph answered, and whether you asserted it or the CLI
inferred it), `missingOnDisk` (paths the index returned that stage two could not
open — index staleness, reported rather than dropped), `nonNoteCandidates`
(indexed files that matched but are not markdown notes, excluded so closure can
re-derive the same set), and `projectMismatchSuspected`. Per-query wall-clock is
deliberately absent: two scans of an unchanged graph must produce byte-identical
manifests, so timing goes to stderr instead.

Then assert file-count parity, because index coverage is the one input discovery
cannot self-check: markdown files on disk under the docs root against indexed
entities carrying a permalink, taken over the same extension set (a mismatched
filter has already produced a false 69-vs-73 discrepancy). A note the index does
not know cannot be returned by any query and no completeness claim covers it, so
a shortfall is the size of the funnel's blind spot and a re-index is the remedy.
Read null-target relation counts as a DELTA across the operation rather than an
absolute: a rise means the merge created unresolvable edges, while the absolute
is project-specific and carries no signal, with one graph here at 0 and another
at 97.

Findings are the answer, not a failure: the scan exits 0 whatever it finds.
Carry the per-class, per-target and per-source counts into the Step 4 summary.

#### Companion checks: unlanded corrections and derivable figures

A merge invalidates two more classes, both cheap to baseline now and
uncheckable afterwards without a baseline.

**Unlanded corrections.** A correction naming its target and quoting the text it
retires is a machine-checkable obligation. Merging a note that is the target of
an OUTSTANDING obligation buries the target assertion inside a larger note, and
concatenation can also resurrect a quote a correction had retired — the retired
text arrives from one source while another source's correction claims it is
gone. Baseline every source before merging:

```bash
bun run shared/composition/src/correction-reconcile.ts \
  --docs-root docs --source <source-a.md> --source <source-b.md> \
  --out docs/_restructure/recompose-{id}-corrections-before.json
```

Exit 2 means an obligation is OUTSTANDING or its target was not found. Resolve
first or record that you are merging over it deliberately. `LANDED-UNMARKED` is
a discipline signal, not a factual defect.

**Derivable figures.** Figures that summarise structure go wrong on a merge in
the opposite direction from a split: two sources each claiming "8 rows" become
one note whose table has sixteen, and both claims survive into it. Baseline:

```bash
bun run shared/composition/src/figure-check.ts \
  --docs-root docs --note <source-a.md> --note <source-b.md> \
  --out docs/_restructure/recompose-{id}-figures-before.json
```

`UNANCHORED` findings do not fail a run — that is the tool declining to guess.
Both tools are read-only; the only file either writes is `--out`.

### Step 4: Adjudicate via AskUserQuestion

Same three-option flow as `/decompose`: approve, reject with feedback (rename to `recompose-{id}-plan-rejected-{N}.yaml`, refine), or abort.

Author the repoint plan and run its dry-run preview BEFORE adjudicating, and
present the preview as part of what is being approved. A merge and the repointing
that follows it are one operation to the user, and merges make this sharper than
splits do: every edge pointing at an absorbed source has to be re-verbed onto the
target, and those are judgment-class entries the executor declines. A preview
showing few mechanical repairs and a large residue is telling you this merge is
mostly a graph pass. On reject, re-author the repoint plan too — its identifier
maps were written against the merge the rejected plan proposed.

Summary format:

```markdown
**Sources** (N): `<path-a>`, `<path-b>`, ...
**Target**: `<path>` (source_type: `<adr|analysis|...>`)
**Merge order**: as listed above
**Renumber map** (M entries): D-100→D-1, D-101→D-2, ...
**Wikilink map**: <count> entries
**Inbound-reference impact**: <N> references across <M> files — <per-class counts>
**Repoint preview**: <A> applied, <B> already repointed, <C> residual by reason
**Repointing worklist**: `docs/_restructure/recompose-{id}-impact.json`
**Repoint plan**: `docs/_restructure/recompose-{id}-repoint.yaml`
**Raw plan**: `docs/_restructure/recompose-{id}-plan.yaml`
```

### Step 5: Execute on approval

```bash
# SKILLS_DOCS_ROOT activates the realpath containment check (CWE-22).
# Without it the lexical guard still runs, but symlink escapes are not caught.
export SKILLS_DOCS_ROOT="$(pwd)/docs"
bun run shared/composition/src/recompose.ts \
  --plan docs/_restructure/recompose-{id}-plan.yaml --root docs
```

The script:

- Loads with FAILSAFE_SCHEMA
- Validates via `CompositionPlanSchema.parseAsync` (bijection check on `renumber_map`)
- Dispatches via `getAdapter(source_type)`
- Reads each source in declared order, concatenates, applies mutations
- SHA-256-validates the round trip via `reverseMutations`
- Writes the target via temp-then-rename atomic write
- Emits a single JSON-lines audit entry to stdout

Exit codes match `/decompose`: `0` success, `1` validation error, `2` hash mismatch.

### Step 6: Repoint the mechanical references

The merge moved the content; every note that cited an absorbed source still points
at it. The executor applies the mechanical subset of the Step 3 worklist and emits
the rest as a worklist rather than a silence.

Author a repoint plan naming what moved. Every value is an identifier, and at
least one of the three identifier maps must be declared — a repoint with no
mapping would downgrade every finding to residual, so the schema refuses it:

```yaml
plan_type: repoint
renumber_map:  { "ANALYSIS-034": "ANALYSIS-041" }
wikilink_map:  { "ANALYSIS-034: Absorbed": "ANALYSIS-041: Merged Target" }
permalink_map: { "analysis/analysis-034-old": "analysis/analysis-041-merged" }
section_map:   { "ANALYSIS-034": { "Section 6": "Section 3" } }
```

Preview first — the default, which writes nothing — then apply:

```bash
bun run shared/composition/src/repoint.ts \
  --manifest docs/_restructure/recompose-{id}-impact.json \
  --plan docs/_restructure/recompose-{id}-repoint.yaml \
  --docs-root docs --out docs/_restructure/recompose-{id}-repoint-preview.json

bun run shared/composition/src/repoint.ts \
  --manifest docs/_restructure/recompose-{id}-impact.json \
  --plan docs/_restructure/recompose-{id}-repoint.yaml \
  --apply --docs-root docs --out docs/_restructure/recompose-{id}-repoint.json
```

Four properties make it safe to run and to re-run. Preview is the DEFAULT and
`--apply` is required to write, with the preview running the identical computation
minus the rename, so it is evidence rather than an approximation. Nothing is
written until everything verifies: files are staged, each file's edits are proven
reversible byte-for-byte against what was read, and only then is anything renamed,
so a failure anywhere leaves the tree as found. A second run is a no-op, since an
address already holding its repointed form is reported as already-repointed rather
than substituted again. And the write set is the mechanical set ONLY — closure
findings, index staleness, malformed references and every advisory entry are
declined before any file is opened, because their repair is an edge insertion, a
re-index or an authored correction, and a map cannot express those.

A stale manifest is REGENERATED, never migrated: the executor reads it as
untrusted input, so one that does not satisfy the current schema fails validation
loudly and writes nothing instead of being coerced into something it then edits
from. A manifest predating the funnel is refused on that ground — the `discovery`
block is required, and one written without it cannot say whether its scope was a
whole tree or a search-scoped subset — and the refusal names the remedy rather
than emitting a union error. Re-run the scan. The same holds when the tree moves
under a valid manifest, which surfaces per finding as `address-drift`.

Exit codes: `0` when every repairable finding was applied or already applied and
no residue remains; `1` validation error with nothing written; `2` the run
completed and work remains — an EXPECTED outcome, since a manifest carrying
judgment-class or unmapped findings exits 2 by design, matching the closure
checker's convention; `3` integrity failure where the pass could not be proven
reversible and nothing was renamed, which unlike 2 is a bug.

#### The work brief: everything the executor declined

The report's `workBrief` is what replaces read-everything discovery. It groups
residue by the note needing the edit, heaviest note first so partial work makes
maximum progress, entries ordered top-to-bottom within each note so one pass down
an open file closes all of them. Each entry carries the note path and permalink,
an `anchor` (real line and column for prose, plus any cited fragment), the class
and decline reason, the evidence with the matched text and where it was seen, the
`causingOperation` read off the plan's declared maps, and a `suggestedAction`.

Three details matter for merges especially. The repair site for a bi-directional
finding is the COUNTERPART note, not the note holding the evidence — which is
exactly the re-verbing a merge strands, so expect the brief to aim you at notes
the merge never touched. An entry whose address was never measured from text reads
`whole note` rather than a fabricated `line 1, col 1`. And `causingOperation` is
read off the plan rather than inferred, so it says plainly when the plan declared
no change to that target.

`suggestedAction` is a SHAPE, not an instruction to follow blindly: every entry
is there because a machine could not decide it. For an index-edge entry it says
so outright — open both notes, confirm their Relations sections carry the typed
pair in both directions, and do not copy the index's verb, which is not evidence.

### Step 7: Report

Summarize: target file path, list of source paths consumed, target SHA-256, and confirm sources remain unchanged (recompose does not delete sources; that is a follow-up the user can request).

### Step 8: Verify reference closure

Step 6 repointed the mechanical references and handed you a brief for the rest.
Work the brief first, then run the check — a closure run against an unworked brief
only re-reports what the brief already said:

```bash
bun run shared/composition/src/reference-scan.ts \
  --check --manifest docs/_restructure/recompose-{id}-impact.json \
  --docs-root docs \
  --retain docs/_restructure/recompose-{id}-retain.json \
  --out docs/_restructure/recompose-{id}-closure.json
```

Every finding from Step 3 comes back as `UPDATED` (the stale form is gone),
`RETAINED` (you allow-listed it) or `OUTSTANDING` (still present, nothing said
to keep it). Exit code 2 means closure was not reached. The report also lists
`newFindings` — references present now but absent at plan time, which catches a
repointing pass that introduced a fresh stale form.

This is the executor's acceptance test, and the pairing is exact: a finding it
applied is a finding whose stale form is gone, which is what `UPDATED` describes.
Expect one `UPDATED` per applied repair, and treat a shortfall as the interesting
result — a repair the executor believed it made is not visible to a fresh scan.

The check re-runs both deterministic legs, so every formal edge repointed onto
the merge target is re-traversed and its inverse verified. An edge moved at one
end only comes back as a bi-directional violation rather than passing.

It re-runs them through the SAME funnel, pinned to the project the manifest
recorded, so a check cannot take a different path to a different answer than the
scan did. One addition: every file the prior manifest named is folded into the
scope unconditionally. After a successful repoint those references are gone, so
the index legitimately stops returning their notes, and re-deriving scope from a
fresh query alone would drop exactly the files being verified — reporting every
repaired reference as UPDATED without opening one of them.

The summary splits `outstanding` (deterministic — what `closed` is computed
from) from `outstandingAdvisory` (the merged advisory entries). Advisory entries
cannot be re-derived deterministically, so they are carried forward marked
unverified — with their query provenance named in the detail — rather than
silently reported as UPDATED. `closed` also requires no introduced asymmetry: a
pass that repaired every stale reference while leaving an edge one-way has not
finished.

#### Companion re-checks

Re-run both Step 3 companions against the merged target and diff the baselines:

```bash
bun run shared/composition/src/correction-reconcile.ts \
  --docs-root docs --source <merged-target.md> \
  --out docs/_restructure/recompose-{id}-corrections-after.json

bun run shared/composition/src/figure-check.ts \
  --docs-root docs --note <merged-target.md> \
  --out docs/_restructure/recompose-{id}-figures-after.json
```

The merge-specific failure to look for: an obligation that was LANDED in its
source and is OUTSTANDING in the target. That means the concatenation reinstated
text a correction had retired — the correction's quote is findable again in the
merged note. Byte-preservation and correctness pull in opposite directions here,
and the SHA-256 proof will happily confirm the wrong one. Any figure that matched
per-source and mismatches merged is a count now summarising a bigger structure
than it was written for.

Report both diffs with the closure summary.

#### Index staleness

Half of this arrives on its own: a candidate the queries returned that is not on
disk lands in the discovery block's `missingOnDisk`, the index knowing a path
the tree no longer holds. The other half — a retired permalink still served
for a note that moved — is a hand check. Search for each retired title and
permalink of the absorbed sources. Any hit still served that `list_directory`
does not corroborate is an `index-stale` finding — record it in the merge file,
and when any exists, recommend a re-index in the closure report. Repointing every
citing note does not clear a stale index row, because no citing note is what
serves it. Evidence for this failure mode on
the current build is mixed: it is recorded as encountered in this project, while
a later index audit found no orphans. Run the check as cheap insurance, not as a
condition known to be live.

The retain file is yours to author and is never inferred: a surviving reference
is either a deliberate historical citation or an unrepaired break, and only you
know which. An unconstrained rule is refused rather than retaining everything.

Because recompose leaves its sources on disk, a reference to an absorbed source
still resolves to a file — which is precisely why the check matters. Resolving
is not the same as being current, and nothing but this scan distinguishes a
citation that was repointed from one that merely still opens.

Report the closure summary alongside the audit entry. Failure to reach closure is
a surfaced finding, never a silent pass: state how many references remain
OUTSTANDING and where they are.

## Error handling

Identical to `/decompose`. `PlanValidationError` → parse issues, re-author. `HashMismatch` → surface loudly. Unknown source_type → report verbatim.

## Constraints

- Same as `/decompose`: no direct content writes by the LLM, mandatory adjudication, no source-type mixing, all paths relative to the plan YAML.
- The composition plan does NOT delete sources after merge. Cleanup is a separate explicit step.


## Scaffolded sources

A shard written by a scaffolded `/decompose` is `prologue + content slice +
epilogue` — the prologue and epilogue are rendered content, not preserved
source. To merge such shards, declare the same scaffold per source so the merge
strips it before joining:

```yaml
sources:
  - path: decisions/ADR-042a.md
    scaffold:
      frontmatter:
        title: "ADR-042a: Cluster A"
        type: decision
        status: ACCEPTED
        permalink: decisions/adr-042a-cluster-a
        tags: [decision]
      observations:
        - category: decision
          text: Cluster A carries the first decision body
          tags: [split]
      relations:
        - verb: part_of
          target: "ADR-042: Parent"
```

A bare path string is still accepted and means "no scaffolding to strip".

The declared scaffold must match the shard's bytes exactly; if it does not, the
merge exits 2 and writes nothing rather than silently folding rendered content
into the merged note. The `/decompose` audit log records the scaffold it applied
for each destination, so a composition plan can be reconstructed from it instead
of re-authored by hand.

**Reversibility.** Scaffolded shards round-trip byte-identically given the same
scaffold. Shards from a plan that used `disposition: retain` do not: retained
content stays in the source and appears in no shard, so a merge over shards
alone cannot reproduce the original.

## Path resolution

Same as `/decompose`: plan paths are relative, `..` is rejected, and `--root`
supplies the base. Pass `--root docs` when the plan sits at
`docs/_restructure/` and its sources live in sibling directories.
