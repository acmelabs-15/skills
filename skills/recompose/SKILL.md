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

Determine the order in which sources are concatenated, then design a `renumber_map` that unifies identifiers across sources without collisions (per ADR-002 D-1 bijection requirement).

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
`renumber_map` supplies retired identifiers. The scanner never guesses history;
an alias you omit is a class of stale reference it cannot see.

```bash
bun run shared/composition/src/reference-scan.ts \
  --docs-root docs \
  --targets docs/_restructure/recompose-{id}-targets.json \
  --out docs/_restructure/recompose-{id}-impact.json
```

#### The three legs

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
`TEXT`, or `BOTH` when a text match landed on the formal edge itself.

**SEARCH — recall the deterministic legs cannot reach, advisory.** Prose that
names a source without naming its identifier ("the substrate analysis") is
invisible to both deterministic legs and goes stale exactly like an explicit
citation. Run Brain MCP search over each source's title, aliases, and two or
three descriptive descriptors, choosing the mode per query and recording it on
each entry:

| Query kind | Mode |
|---|---|
| Exact identifiers, aliases, permalinks | `keyword` + `search_type: "text"` |
| Descriptive references | `semantic` |
| Mixed or uncertain | `hybrid`, at your judgement |

Double-quote hyphenated identifiers (`"ANALYSIS-034"`) whichever mode you are in;
the tokenizer splits on hyphens.

`keyword` returned zero results for every query on the build this section was
first written against, which also made `auto` effectively semantic-only and left
`hybrid` with a dead leg. That leg has since been revived end-to-end, and as
measured on the MCP surface 2026-07-26 an empty keyword result is now evidence of
no match. `mode` and `search_type` are different dials: `mode` picks which leg
runs, `search_type` picks how the proxied leg retrieves, and left unset it
defaults to hybrid — so `mode: "keyword"` alone is not keyword retrieval. Pass
`search_type: "text"` for genuine full-text matching, or
`search_type: "permalink"` with a `*` to prefix-match the FULL path
(`analysis/analysis-00*`, not `analysis-00*`) and enumerate a note family
server-side. Structured filters other than `after_date` ride the proxied leg, and
a filter the running leg cannot evaluate re-routes the request there rather than
being dropped — measured 2026-07-26, a decision-only `note_types` filter under
`mode: "semantic"` came back served by the keyword leg and carrying only
decisions. Read `actual_source` on the response to see which leg served.

**Two generations of the search surface are live at once.** The plugin MCP path
carries those repairs; the HTTP server behind the `brain` CLI is still on the
pre-repair build pending a restart, where keyword returns zero for every query
and a filter the running leg cannot honour is dropped silently, leaving an
unfiltered result that looks filtered. The detection rule is the response itself:
**no `actual_source` field means a pre-fix surface** — fall back to reading an
empty keyword result as no signal and any filtered result as unfiltered.

`entity_types: ["relation"]` returns inbound edges directly: one row per edge,
titled `Source Title -> Target Title`, permalinked as a synthetic edge path, with
the title rather than the snippet carrying the payload (no snippet text is stored
for relations). That makes the backlink question portable without moving the gate.
`depth` above 0 is still outbound-only — it follows links FROM a hit, never TO it
— and still resolves through the proxied leg, so prefer the GRAPH leg for blast
radius. Also available to this leg: `note_types`, `categories` paired with
`entity_types: ["observation"]`, and `after_date` (strictly after, on the
index-modified UTC timestamp, so a bare date means that date's midnight UTC;
relative strings are rejected) — and `query` may be omitted entirely to enumerate
on filters alone. For the full tool surface behind this guidance, see the search
and impact-detection tool-surface analysis in the project's analysis folder.

Verify every hit against `list_directory` ground truth before using it — semantic
mode can still return rows from other projects, the fix for that leak existing but
not deployed everywhere, and the index can still serve rows for notes that have
moved or been renumbered — then pass the verified hits, each carrying its `mode`,
via `--merge`:

```bash
bun run shared/composition/src/reference-scan.ts \
  --docs-root docs \
  --targets docs/_restructure/recompose-{id}-targets.json \
  --merge docs/_restructure/recompose-{id}-semantic.json \
  --out docs/_restructure/recompose-{id}-impact.json
```

Merged entries are forced to `source: SEARCH` and `advisory: true` whatever the
file claims; the declared `mode` is preserved. The search leg widens the
worklist and never gates it.

**Index traversal selects on EXISTENCE, never on edge type.** The index strips
relation verbs from H3-grouped Relations entries — it reads a verb only when the
verb shares a line with its target, and the grouped form puts the verb in the
sub-header. Measured at fifteen of fifteen untyped on one ADR. Nor is a verb that
IS present trustworthy: a live probe returned an edge whose verb was literally
`x`, and another returned the same note pair twice under two different verbs, one
of them absent from the conventions' allowlist entirely. Any query through the
index — this leg, or the relation rows above — may ask "is there an edge?" and
must not ask "is it a `contains` edge?", including when the synthetic edge
permalink appears to name one; typed steps read the note body. The GRAPH leg
parses bodies directly and never consults the index, which is why it gates and
this leg does not.

**The highest-value use of this leg is the UNEXTRACTABLE channel** of the
correction check below. An obligation whose target is named only in prose is
already found and merely un-aimable; semantic search turns the prose name into a
candidate note and makes it checkable. Target it by reason —
`no-resolvable-target` benefits, `ambiguous-target` sometimes, and
`no-quoted-stale-text` does not (with no quote there is nothing to verify, so a
candidate note adds nothing). Feed resolved candidates back as `--obligations`
tuples and record that the aim came from an advisory resolution.

#### Gating assertions: prove the scan actually ran

A scan that found nothing is indistinguishable from a scan that silently did not
run, and both read as no-impact. Before believing a low count, assert file-count
parity (markdown files on disk under the docs root against indexed entities
carrying a permalink — taken over the same extension set, since a mismatched
filter has already produced a false 69-vs-73 discrepancy), and read null-target
relation counts as a DELTA across the operation rather than an absolute. A rise
means the merge created unresolvable edges; the absolute is project-specific and
carries no signal, with one graph here at 0 and another at 97.

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

Summary format:

```markdown
**Sources** (N): `<path-a>`, `<path-b>`, ...
**Target**: `<path>` (source_type: `<adr|analysis|...>`)
**Merge order**: as listed above
**Renumber map** (M entries): D-100→D-1, D-101→D-2, ...
**Wikilink map**: <count> entries
**Inbound-reference impact**: <N> references across <M> files — <per-class counts>
**Repointing worklist**: `docs/_restructure/recompose-{id}-impact.json`
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

### Step 6: Report

Summarize: target file path, list of source paths consumed, target SHA-256, and confirm sources remain unchanged (recompose does not delete sources; that is a follow-up the user can request).

### Step 7: Verify reference closure

Repoint the references on the Step 3 worklist, then prove it:

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

The check re-runs both deterministic legs, so every formal edge repointed onto
the merge target is re-traversed and its inverse verified. An edge moved at one
end only comes back as a bi-directional violation rather than passing.

The summary splits `outstanding` (deterministic — what `closed` is computed
from) from `outstandingAdvisory` (search). Advisory entries cannot be re-derived
deterministically, so they are carried forward marked unverified — with their
mode named in the detail — rather than silently reported as UPDATED.

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

Search for each retired title and permalink of the absorbed sources. Any hit
still served that `list_directory` does not corroborate is an `index-stale`
finding — record it in the merge file, and when any exists, recommend a re-index
in the closure report. Repointing every citing note does not clear a stale index
row, because no citing note is what serves it. Evidence for this failure mode on
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
