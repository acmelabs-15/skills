---
name: decompose
description: Split (1-to-N) a Brain knowledge-graph note into multiple notes using a distribution plan. Triggers on phrases like "decompose this note", "split this ADR into per-decision notes", "break this analysis into clusters". Authors a distribution plan YAML, presents it for adjudication, then executes via the composition library with SHA-256 round-trip validation guaranteeing zero content drift.
---

# decompose

Splits a single Brain knowledge-graph note into N destination notes using a deterministic distribution plan. The LLM authors the plan (cognitive work); the composition library executes it (mechanical work, hash-validated).

## When to use this skill

Use when the user asks to:

- Decompose a note (e.g., "decompose this ADR", "split this analysis")
- Break a multi-decision ADR into per-decision notes
- Partition an aggregating ANALYSIS index into per-finding child notes
- Split a long SESSION note into focused session-fragment notes
- Any other 1-to-N restructuring of a single source note

## Three-phase workflow

This skill follows the locked three-phase workflow from `KICKOFF-BRIEF.md`:

1. LLM authoring — you read the source, classify its `source_type`, identify cluster seams, and author a distribution plan YAML
2. User adjudication — you present the plan via AskUserQuestion; the user approves, rejects with feedback (refinement loop), or aborts
3. Script execution — on approval, you invoke `bun run shared/composition/src/decompose.ts --plan <path>` and report the audit log

Never write to destination files directly. Never bypass the adjudication step.

## Step-by-step instructions

### Step 1: Read the source

- Identify the source note path from the user's request (resolve wikilinks via Brain MCP if needed)
- Read the source content via Brain MCP `read_note` (Brain notes under `docs/**`)
- Parse the frontmatter to extract `type` — this becomes the plan's `source_type` field (e.g., `decision` → `adr`, `analysis` → `analysis`, `session` → `session`, `plan` → `plan`, `spec` → `spec`)

### Step 2: Classify and identify cluster seams

Examine the source's structure for natural split boundaries. For an ADR, the seams are usually the `### D-N` decision headings. For an ANALYSIS index, the seams are the findings or sub-analysis sections. Decide on the partition shape: how many destinations, which identifiers belong to each cluster, and any cross-cluster wikilink remapping required.

### Step 3: Author the distribution plan YAML

Write a YAML file to `docs/_restructure/decompose-{id}-plan.yaml` where `{id}` is a short kebab-case slug describing the operation (e.g., `adr-042-split`, `analysis-012-findings`). The required shape:

```yaml
plan_type: distribution
source_type: adr            # frontmatter type, mapped to a registered adapter source_type
source_path: <path/to/source.md relative to plan file>
renumber_map:
  D-1: D-100
  D-2: D-101
  # Must be injective (no duplicate values).
wikilink_map: {}            # optional inbound-link substitutions
clusters:                   # declare the partitioning
  head:
    description: frontmatter + H1 + preamble — stays in the source
    disposition: retain     # counted for coverage, no file written
    range: { start: 1, end: 24 }
  cluster_a:
    description: ...
    destination_path: <path/to/dest-a.md>
    range: { start: 25, end: 40 }
    scaffold:               # optional — makes the destination a standalone note
      frontmatter:
        title: "ADR-042a: Cluster A"
        type: decision
        status: ACCEPTED
        permalink: decisions/adr-042a-cluster-a
        tags: [decision, cluster-a]
      observations:
        - category: decision
          text: Cluster A carries the first decision body
          tags: [split]
      relations:
        - verb: part_of
          target: "ADR-042: Parent"
  tail:
    description: the source's own Observations + Relations — stays in the source
    disposition: retain
    range: { start: 41, end: -1 }
```

Rules the executor enforces:

- **Ranges must exactly partition the source.** Every line from 1 to `end: -1` belongs to exactly one cluster. Gaps, overlaps, and a final range short of end-of-file all abort with exit 2 before anything is written.
- **`range` is what extracts; `identifiers` / `decisions` / `renumbered_to` are annotation.** The adapter contract exposes extraction by line range only, so a cluster without a `range` is refused. When `identifiers` are supplied they are used as a post-extraction cross-check — if a declared identifier does not appear in the extracted slice, the plan is rejected before anything is written, which catches ranges that drifted off their intended section.
- **`disposition: retain`** covers a range for the partition proof without writing a file, so the source's own frontmatter, H1 and trailing Observations/Relations need not be forced verbatim into a child. A retained cluster must not declare `destination_path` or `scaffold`.
- **`scaffold`** wraps the destination's content slice in a prologue (frontmatter + H1) and epilogue (Observations + Relations), so each written note stands alone. The H1 is derived from `frontmatter.title`, so the two cannot drift. Scaffolding is excluded from the SHA-256 proofs, which stay exactly as strong over the preserved content slice.

Keep the YAML under 1 MB; the loader enforces this guard.

**Never put a sample wikilink in a generated note body, not even in backticks.**
A scaffold's `relations` are rendered into the destination note, and the parser
that indexes that note treats a wikilink inside a code span as a real edge — a
backticked example becomes a genuine unresolved relation pointing at a note that
was never meant to exist. Code-span quoting is not an escape here. When a
generated body needs to talk about the wikilink form, DESCRIBE it: write "a
wikilink naming the parent by its full colon title" rather than showing the
brackets. This applies to any content the scaffold renders, not only the
relations block.

**Path resolution.** Plan paths are relative and must not contain `..` — the
CWE-22 guard rejects traversal in plan content. Since the plan lives at
`docs/_restructure/` while destinations live in sibling directories such as
`docs/decisions/`, pass the graph root explicitly and write every path relative
to it:

```bash
bun run shared/composition/src/decompose.ts \
  --plan docs/_restructure/decompose-{id}-plan.yaml --root docs
```

With `--root docs`, `source_path: decisions/ADR-042.md` and
`destination_path: decisions/ADR-042a.md` both resolve correctly and no `../`
is needed. Omitting `--root` resolves paths against the plan file's own
directory, which only works when the plan sits beside its targets. The base is
supplied by you, not by the plan, so an authored plan can never redirect its own
resolution.

### Step 4: Compute the inbound-reference impact manifest

The plan guarantees the content of the notes it moves. It says nothing about the
notes that POINT AT them. Wikilinks, permalink strings, bare entity IDs and
section citations all keep naming identifiers the split is about to retire, and
a hash-clean decompose leaves every one of them dangling. Compute that blast
radius before adjudication, so the repointing worklist is part of what the user
approves rather than something review discovers later.

Author a targets file listing the source note and every destination, carrying
the aliases the scanner cannot infer:

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

Aliases come from the plan you just authored: `renumber_map` supplies retired
identifiers, and any title or permalink change supplies the rest. The scanner
never guesses history — an alias you omit is a whole class of stale reference it
cannot see.

```bash
bun run shared/composition/src/reference-scan.ts \
  --docs-root docs \
  --targets docs/_restructure/decompose-{id}-targets.json \
  --out docs/_restructure/decompose-{id}-impact.json
```

#### The three legs

The scan runs two legs itself and accepts a third from you.

**GRAPH — read the target's own Relations first.** The conventions enforce
bi-directional relations: when note A carries a `part_of` edge naming note B, B
must carry the inverse `contains` edge naming A. That makes the target's own
Relations section a FORMAL INDEX of the notes that reference it — an inbound
index no text scan of the target could ever reconstruct, because the evidence
lives in the other note. The scanner traverses it automatically, in both
directions, and reports one-way edges as two classes:

- `bidirectional-missing-on-target` — a note carries a formal edge at the
  target, but the target carries no inverse. Repair goes on the TARGET.
- `bidirectional-missing-on-referencer` — the target's Relations name a note
  that carries no matching outbound edge. Repair goes on the REFERENCER.

For both, `referencingFile` and `line` point at the edge that DOES exist and
`relation.counterpartFile` names where the missing inverse belongs, so a finding
tells you where to look and where to write. Fix these BEFORE the split: a split
that inherits a one-way edge multiplies it across the children.

**TEXT — the informal references.** Six classes: `wikilink`,
`wikilink-malformed` (a colon-less or filename-stem near-miss, already broken
before the split), `permalink`, `permalink-project-prefixed`,
`entity-id-section` (with the cited fragment captured, so repointing can check
the section still exists in whichever child inherited it), and `entity-id` —
each with the referencing file, line, and matched text. Overlapping forms are
reported once, so the counts are a worklist length rather than an overcount.

Each entry carries a `source` tag: `GRAPH`, `TEXT`, or `BOTH` when a text match
landed on the formal edge itself and the two legs corroborate.

**SEARCH — recall the deterministic legs cannot reach, advisory.** Neither
deterministic leg sees prose that names a note without naming its identifier:
"the substrate analysis", "the eviction adjudication". Those go stale exactly
like an explicit citation and are invisible to both scans.

The scanner can now run this leg itself. Pass `--search-project <name>` and it
queries the Brain CLI per target, with `--search-mode` and `--search-type`
selecting the dials described below. Two probes run per target:

- **Descriptive** — queries the target's TITLE, not its identifier. An identifier
  query returns what the text scan already has; the title is what prose
  paraphrases when it names a note without citing it.
- **Relations** — queries the entity ID with `entity_types: ["relation"]`, fixed
  to keyword plus `search_type: "text"` because an existence probe wants
  exact-identifier retrieval whatever the descriptive probe was set to. It asks
  whether the index holds an edge the tree shows no textual link for.

Hits you find by hand still merge in through `--merge`. Both paths land as
advisory entries, and choosing the mode per query still matters — a keyword hit
and a threshold-gated semantic hit do not warrant the same confidence, which is
why the mode is recorded on every entry rather than assumed.

| Query kind | Mode |
|---|---|
| Exact identifiers, aliases, permalinks | `keyword` + `search_type: "text"` |
| Descriptive references | `semantic` |
| Mixed or uncertain | `hybrid`, at your judgement |

Double-quote hyphenated identifiers (`"ANALYSIS-034"`) whichever mode you are
in: the tokenizer splits on hyphens, so an unquoted multi-term query is narrower
than it looks.

Keyword mode returned zero results for every query on the build this section was
first written against, which also made `auto` effectively semantic-only and left
`hybrid` with a dead leg. That leg has since been revived end-to-end, and as
measured on the MCP surface 2026-07-26 an empty keyword result is now evidence of
no match rather than a dead leg to route around. Four mechanics of the current
surface matter more than the repair itself:

- **`mode` and `search_type` are different dials.** `mode` selects which leg
  runs; `search_type` selects how the proxied leg retrieves. Left unset, the
  proxied leg applies its own default, which is hybrid whenever semantic search
  is enabled — so `mode: "keyword"` alone is not keyword retrieval. Pass
  `search_type: "text"` for genuine full-text matching.
- **`search_type: "permalink"` with a `*` enumerates a note family
  server-side**, prefix-matching the FULL path: `analysis/analysis-00*`, not
  `analysis-00*`. When you need every sibling of a numbered series, that is
  cheaper and more complete than guessing identifiers one at a time.
- **A filter the running leg cannot evaluate re-routes rather than dropping.**
  Every structured filter except `after_date` rides the proxied leg, so passing
  one under `mode: "semantic"` moves the whole request there. Measured
  2026-07-26, a decision-only `note_types` filter under `mode: "semantic"` came
  back served by the keyword leg and carrying only decisions. You therefore do
  not have to pair filters with `keyword` by hand — but you do have to read
  `actual_source` on the response, which names the leg that actually served.
- **`depth` above 0 is unchanged and still the wrong instrument.** It resolves
  wikilinks through the proxied leg and is outbound-only — it follows links FROM
  a hit, never TO it. Prefer the GRAPH leg for blast radius, and do not treat a
  thin `depth` result as evidence of a small one.

**Two generations of the search surface are live at once, so establish which one
answered you.** The plugin MCP path carries the repairs above. The HTTP server
behind the `brain` CLI is still on the pre-repair build pending a restart, and on
that generation keyword returns zero for every query and a filter the vector leg
cannot honour is dropped silently — leaving an unfiltered result that looks
filtered. The detection rule is the response itself: **a response carrying no
`actual_source` field is a pre-fix surface.** On seeing one, fall back to the
older discipline — read an empty keyword result as no signal rather than no
references, and read any filtered result as unfiltered.

Inbound references are reachable directly. `entity_types: ["relation"]` returns
graph edges as rows — one per edge, titled `Source Title -> Target Title`, with
a synthetic edge path (`source/verb/target`) as its permalink. The title is the
payload: under text retrieval an edge row's snippet comes back empty, because no
snippet text is stored for relations. Measured 2026-07-26, a quoted entity-ID
query in this shape returned that note's inbound edges immediately, where `depth`
expansion had previously exceeded the tool timeout. Three more filters earn their
place in this step: `note_types` to scope a sweep to one class of note,
`categories` paired with `entity_types: ["observation"]` to hit decision or
requirement bullets exactly, and `after_date` for a staleness sweep (strictly
after, on the index-modified UTC timestamp, so a bare date means that date's
midnight UTC; relative strings such as "1 week" are rejected outright). A request
may also omit `query` altogether and enumerate on filters alone.

That makes the backlink question portable; it does not move the gate. The GRAPH
leg still parses note bodies and still owns the closure check — see the
traverse-on-existence rule below, which relation rows sharpen rather than retire.

For the full tool surface behind this guidance, see the search and
impact-detection tool-surface analysis in the project's analysis folder.

Verify every hit before you use it. Semantic mode can still return rows from
other projects — the fix for that leak exists but is not deployed everywhere —
and the index can still serve rows for notes that have moved or been renumbered.
Check each returned permalink against `list_directory` ground truth and drop
anything that does not resolve. Write the verified hits to a JSON file shaped
like the manifest's `findings` entries, each carrying its `mode`, and pass it in:

```bash
bun run shared/composition/src/reference-scan.ts \
  --docs-root docs \
  --targets docs/_restructure/decompose-{id}-targets.json \
  --search-project <brain-project> \
  --merge docs/_restructure/decompose-{id}-semantic.json \
  --out docs/_restructure/decompose-{id}-impact.json
```

Both search paths are forced to `source: SEARCH` and `advisory: true` whatever
the input claims, so nothing from the index or from a hand-authored file can
promote itself into the closure gate. The search leg WIDENS the worklist; it
never gates it — a recall aid running over an index with known live defects is
not reproducible enough to fail a step on. Every SEARCH entry carries the
provenance of the query that produced it: the mode that was REQUESTED, the
retrieval strategy asked for alongside it, and which leg actually answered.
Those three are recorded separately because they routinely disagree, and none
substitutes for another. Deterministic entries carry none of them, having no
query behind them.

Three properties of the automated leg are worth knowing before you read its
output as a worklist:

- **It never duplicates a deterministic finding.** Only notes absent from the
  deterministic set produce entries, so a hit on a note the text scan already
  matched is dropped rather than double-counting that note's impact.
- **It never invents an address.** When a hit's snippet cannot be located in the
  note body the hit is DROPPED rather than emitted at line 1 — a confident wrong
  line costs an agent more than a missing suggestion does. A located line must
  also share a distinctive word from the target's title, because a semantic hit's
  snippet is usually the note's opening rather than the sentence naming the
  target. Measured on a live graph, the ungated probe produced 120 entries for
  three targets, nearly all the same opening line repeated per target.
- **Incomplete enumeration is reported, never assumed.** The leg pages until a
  page comes back SHORTER than the limit, because the response `total` is capped
  at the limit and would silently truncate every enumeration. If any query hits
  a page boundary with every page full, the leg reports `complete: false`. Read
  that as a worklist that may be short, not a finished one.

**Index traversal selects on EXISTENCE, never on edge type.** The index strips
relation verbs from H3-grouped Relations entries — it keeps the edge but loses
whether it was `contains` or `depends_on`, because it reads a verb only when the
verb shares a line with its target and the grouped form puts the verb in the
sub-header. Measured at fifteen of fifteen untyped on one ADR. Nor is a verb that
IS present trustworthy: a live probe returned an edge whose verb was literally
`x`, and another returned the same note pair twice under two different verbs, one
of them absent from the conventions' allowlist entirely. So any query that goes
through the index — this SEARCH leg, or the relation rows above — may ask "is
there an edge here?" and must not ask "is it a `part_of` edge?", including when
the synthetic edge permalink appears to name one. Every typed step reads the note
body. The GRAPH leg is already immune: it parses bodies directly and never
consults the index, which is why it is the gate and this leg is not.

**The highest-value use of this leg is the UNEXTRACTABLE channel** of the
correction check below, not the reference scan. An obligation whose target is
named only in prose — "the substrate analysis", no entity ID anywhere — is
already found; it simply cannot be aimed. Semantic search turns that prose name
into a candidate note and makes the obligation checkable, which is a recall gain
on work already identified rather than a hunt for new work.

Target it by reason, because only one of the three benefits:

| `reason` | Semantic discovery |
|---|---|
| `no-resolvable-target` | YES — the prose names a note; resolve it to a candidate |
| `ambiguous-target` | Sometimes — may narrow which of several notes was meant |
| `no-quoted-stale-text` | NO — there is no quote to verify against, so a candidate note does not help |

Running the search over all three wastes most of the effort. Feed the resolved
candidates back as `--obligations` tuples, and record that they came from an
advisory resolution rather than from the note's own text.

Findings are the answer here, not a failure: the scan exits 0 whether it finds
one reference or four hundred. Carry the per-class, per-target and per-source
counts into the Step 5 summary.

#### Gating assertions: prove the scan actually ran

A scan that found nothing and a scan that silently did not run produce the same
manifest. Both read as "no impact", and the second is the one that lets a split
proceed blind. Assert two things before you believe a low count.

**Parity.** Compare the count of markdown files on disk under the docs root
against the count of indexed entities carrying a permalink. They should match.
A shortfall means the index does not know about notes that exist, so any
index-derived leg is under-reporting by exactly that gap. Note the file-count
must be taken over the same extension set the index covers — an earlier audit
reported a 69-vs-73 discrepancy that turned out to be the auditor's own `*.md`
filter excluding four `.yaml` files, not an index defect.

**Null-target relations as a DELTA, never an absolute.** Count relations whose
target did not resolve. Read the change across the operation, not the number: a
rise means the split created unresolvable edges. The absolute value carries no
signal because a healthy baseline is project-specific — one graph in this
ecosystem sits at 0 and another at 97. A wiring that failed on "null-targets > 0"
would pass the first graph while permanently failing the second, and would tell
you nothing about either.

Record both with the manifest so the closure step can compare like with like.

#### Companion checks: unlanded corrections and derivable figures

Two more things a split can invalidate, both cheap to baseline now and
meaningless to check afterwards without a baseline.

**Unlanded corrections.** A correction that names its target and quotes the text
it retires is a machine-checkable obligation. Splitting a note that is the target
of an OUTSTANDING obligation moves the target assertion out from under the
correction — the obligation then points into a child, or into content that stayed
behind, and nobody finds out. Check before you split:

```bash
bun run shared/composition/src/correction-reconcile.ts \
  --docs-root docs --source <source-note.md> \
  --out docs/_restructure/decompose-{id}-corrections-before.json
```

Exit 2 means at least one obligation is OUTSTANDING or its target was not found.
Resolve those first, or record in the plan summary that you are splitting over
them deliberately. `LANDED-UNMARKED` findings do not fail the run — they are a
discipline signal, not a factual defect. The tool performs no discovery, so
`--source` is repeatable and naming the source plus any note that files
corrections against it is your job.

**Derivable figures.** A stated figure that summarises a structure — a totals
row, an "N of M" tally, an "N rows" claim — is re-derivable from that structure,
and a split is exactly what makes it wrong: the source keeps the claim while the
table moves to a child, or a child inherits half a table and the whole count.
Baseline before:

```bash
bun run shared/composition/src/figure-check.ts \
  --docs-root docs --note <source-note.md> \
  --out docs/_restructure/decompose-{id}-figures-before.json
```

Exit 2 means a figure already mismatches its structure; fix or record it now,
because after the split you cannot tell an inherited mismatch from one the split
caused. `UNANCHORED` findings do not fail a run — that is the tool declining to
guess which structure a figure refers to, which is a report line rather than a
defect. For claims that need pointing at explicitly, including cross-note ones,
use a checks file instead of `--note`.

Both are read-only over the tree; the only file either writes is `--out`.

### Step 5: Adjudicate via AskUserQuestion

Present the plan to the user with a markdown summary AND the path to the raw YAML for deep inspection. Use AskUserQuestion with exactly these three options:

- approve — execute the plan as-is
- reject — provide feedback; you re-author and re-adjudicate
- abort — cancel; do not execute, do not retain the plan

**Author the repoint plan and run its dry-run preview BEFORE adjudicating, and
present that preview as part of what is being approved.** The split and the
repointing that follows it are one operation from the user's point of view: a
split whose citation repairs turn out to be mostly unapplicable is a different
proposal from one that repoints cleanly, and the user cannot weigh that after the
notes have already been written. Preview is the executor's default, so this costs
one extra command and no risk. Carry its applied / already-repointed / residual
counts into the summary below, and name the residual reasons — a preview showing
forty repairs and two hundred judgment-class entries is telling you the split
needs a graph pass more than it needs a text pass.

On reject, rename the rejected plan file to `decompose-{id}-plan-rejected-{N}.yaml` (incrementing `N` per rejection) so the rejection history is auditable, then re-enter Step 3 with the feedback incorporated. Re-run Step 4 as well — a revised plan changes the destinations and the renumbering, so the previous impact manifest no longer describes it. Re-author the repoint plan and re-run its preview for the same reason: its identifier maps were written against the destinations the rejected plan proposed.

On abort, optionally delete the plan file and stop. No further action.

Summary format:

```markdown
**Source**: `<path>` (source_type: `<adr|analysis|...>`)
**Destinations** (N):
- `<dest-path-1>` — <description>
- `<dest-path-2>` — <description>
**Renumber map** (M entries): D-1→D-100, D-2→D-101, ...
**Wikilink map**: <count> entries (or "empty")
**Inbound-reference impact**: <N> references across <M> files — <per-class counts>
**Repoint preview**: <A> applied, <B> already repointed, <C> residual by reason
**Repointing worklist**: `docs/_restructure/decompose-{id}-impact.json`
**Repoint plan**: `docs/_restructure/decompose-{id}-repoint.yaml`
**Raw plan**: `docs/_restructure/decompose-{id}-plan.yaml`
```

### Step 6: Execute on approval

Run the CLI entry point via Bun.$:

```bash
# SKILLS_DOCS_ROOT activates the realpath containment check (CWE-22).
# Without it the lexical guard still runs, but symlink escapes are not caught.
export SKILLS_DOCS_ROOT="$(pwd)/docs"
bun run shared/composition/src/decompose.ts \
  --plan docs/_restructure/decompose-{id}-plan.yaml --root docs
```

The script:

- Loads the YAML with `js-yaml` FAILSAFE_SCHEMA (CWE-502 mitigation)
- Validates via Zod (`DistributionPlanSchema.parseAsync`), including bijection of `renumber_map`
- Resolves the adapter via `getAdapter(source_type)`
- Applies `applyMutations` then `reverseMutations` and SHA-256-compares the round trip (ADR-001 F-8 invariant — blocking)
- Writes each destination via temp-then-rename atomic write
- Emits a JSON-lines audit log to stdout, one line per destination

Exit codes:

- `0` — success
- `1` — validation error (parse the structured `PlanValidationError` from stderr and report to the user)
- `2` — integrity failure: either a per-cluster hash mismatch, or a coverage failure where the cluster ranges do not exactly partition the source (a gap, an overlap, or a range not reaching end-of-file). In both cases the script halted before any destructive write; surface it loudly

### Step 7: Repoint the mechanical references

The split moved the content; every note that cited it still points at where it
used to be. The executor applies the mechanical subset of the Step 4 worklist,
and the residue it declines becomes an agent worklist rather than a silence.

Author a repoint plan naming what moved. Every value is an identifier, and the
plan must declare at least one of the three identifier maps — a repoint with no
mapping would downgrade every finding to residual, so the schema refuses it:

```yaml
plan_type: repoint
renumber_map:  { "ANALYSIS-034": "ANALYSIS-041" }
wikilink_map:  { "ANALYSIS-034: Old Title": "ANALYSIS-041: New Title" }
permalink_map: { "analysis/analysis-034-old": "analysis/analysis-041-new" }
section_map:   { "ANALYSIS-034": { "Section 6": "Section 3" } }
```

Preview first — this is the default and writes nothing — then apply:

```bash
bun run shared/composition/src/repoint.ts \
  --manifest docs/_restructure/decompose-{id}-impact.json \
  --plan docs/_restructure/decompose-{id}-repoint.yaml \
  --docs-root docs --out docs/_restructure/decompose-{id}-repoint-preview.json

bun run shared/composition/src/repoint.ts \
  --manifest docs/_restructure/decompose-{id}-impact.json \
  --plan docs/_restructure/decompose-{id}-repoint.yaml \
  --apply --docs-root docs --out docs/_restructure/decompose-{id}-repoint.json
```

Four properties make this safe to run and safe to re-run:

- **Preview is the default; `--apply` is required to write.** A preview runs the
  identical computation — resolution, the section-existence check, address
  verification, the reversibility proof — and stops before the rename. It is
  evidence about what the apply will do, not a cheaper approximation of it.
- **Nothing is written until everything verifies.** Every file is staged, each
  file's edit set is proven reversible byte-for-byte against what was read, and
  only then is anything renamed. A failure anywhere leaves the tree exactly as
  found.
- **A second run is a no-op.** An address already holding its repointed form is
  reported as already-repointed rather than substituted again, so re-running
  after a partial failure is safe and re-running after success changes nothing.
- **The write set is the mechanical set only.** Bi-directional closure findings,
  index staleness, malformed references and every advisory entry are declined by
  construction — before any file is opened — because their repair is an edge
  insertion, a re-index or an authored correction, none of which a map can
  express. Automating them would mean guessing.

**The manifest must be current, and a stale one is regenerated rather than
migrated.** The executor treats the manifest as untrusted input in the same sense
a plan YAML is — it is read back from disk and may have been hand-edited — so a
manifest that does not satisfy the current schema fails validation loudly and
writes nothing, rather than being coerced into something the executor then edits
from. Re-running the scan is the remedy in every such case, and it is the only
one: a hand-migrated manifest would carry addresses measured against a tree that
has since moved. The same applies when the tree shifts under a valid manifest,
which surfaces per finding as `address-drift` — the recorded position no longer
holds the stale text, so re-scan and re-run.

Exit codes:

- `0` — every mechanically repairable finding was applied or was already applied,
  and the residual worklist is empty.
- `1` — validation error (argv, missing file, malformed JSON or YAML, Zod
  rejection, unsafe path). Nothing was written.
- `2` — the run completed and work remains. This is an EXPECTED outcome, not a
  failure: a manifest carrying judgment-class or unmapped findings exits 2 by
  design, and those are worklist items. Same convention as the closure checker.
- `3` — integrity failure: the pass could not be proven reversible. Nothing was
  renamed. Distinguished from 2 because 2 is expected and this is a bug.

#### The work brief: everything the executor declined

The report's `workBrief` is the deliverable of a residual, and it is what
replaces read-everything discovery. It is grouped by the note needing the edit,
heaviest note first so a partially-worked brief has made the most progress, with
entries inside each note ordered top-to-bottom so one pass down an open file
closes everything in it. Each entry answers four questions an agent would
otherwise re-derive:

- `path` and `permalink` — which note to open.
- `anchor` — where to look: a real `line` and `col` for prose, plus the cited
  fragment where one exists.
- `class` and `reason` — why it was declined.
- `evidence` — the matched text, and the file and line it was seen in, plus the
  expected inverse edge and its counterpart on a bi-directional entry.
- `causingOperation` — what the plan says happened to the target.
- `suggestedAction` — the shape of the repair.

Three details in there are load-bearing. The repair site for a bi-directional
finding is the COUNTERPART note, not the note carrying the evidence — the missing
inverse edge belongs there and the note holding the evidence needs no change at
all. An entry whose address was never measured from a line of text reads `whole
note` rather than `line 1, col 1`, because printing a position that was never
taken sends an agent to the frontmatter. And `causingOperation` is read off the
plan's declared maps rather than inferred, so it says plainly when the plan
declared no change to that target instead of asserting a restructuring nobody
requested.

`suggestedAction` is a SHAPE, not an instruction to follow blindly. Every entry
in the brief exists precisely because a machine could not decide it, so each one
names the edit and leaves the judgment where it belongs. For an index-edge entry
it says so explicitly: open both notes, check their Relations sections carry the
typed pair in both directions, and do not copy the index's verb — it is not
evidence.

### Step 8: Report

Summarize the audit log: number of destination files written, their paths, and the SHA-256 of each. The log carries one entry per cluster, each with its `disposition` and `range`, so the full byte accounting is visible — retained clusters appear with no destination. Confirm the source file remains unchanged.

Note on reversibility: a plan that retains ranges cannot be reversed from its destinations alone, because retained content exists only in the source and appears in no destination. Recompose recovers the concatenation of the written content slices; the source note itself — untouched by the split — is the record for retained ranges. Plans with no scaffolding and no retention keep the full byte-identical decompose-then-recompose round trip.

### Step 9: Verify reference closure

Step 7 repointed the mechanical references and handed you a brief for the rest.
This step proves both: that the applied repairs actually landed, and that nothing
new broke on the way. Work the brief first, then run the check — a closure run
against an unworked brief just re-reports what the brief already told you.

```bash
bun run shared/composition/src/reference-scan.ts \
  --check --manifest docs/_restructure/decompose-{id}-impact.json \
  --docs-root docs \
  --retain docs/_restructure/decompose-{id}-retain.json \
  --out docs/_restructure/decompose-{id}-closure.json
```

Every finding from Step 4 comes back as one of:

- `UPDATED` — the stale form is gone.
- `RETAINED` — you allow-listed it.
- `OUTSTANDING` — still present, and nothing said to keep it.

This is the executor's acceptance test, and the pairing is exact: a finding the
executor applied is a finding whose stale form is gone from the tree, which is
precisely what `UPDATED` describes. So expect one `UPDATED` per repair the report
counted as applied, and treat any shortfall as the interesting result — a repair
the executor believed it made is not visible to a fresh scan.

Exit code 2 means closure was not reached. The report also lists `newFindings`:
references that exist now but were absent at plan time, which is how a
repointing pass that introduced a fresh stale form gets caught.

The check re-runs BOTH deterministic legs, so it verifies more than text
repointing. Every formal edge you repointed is re-traversed, and an edge whose
inverse did not travel with it comes back as a bi-directional violation — a
repoint that updated one end and orphaned the other does not pass.

The summary splits `outstanding` (deterministic — this is what `closed` is
computed from) and `outstandingAdvisory` (semantic). Advisory entries cannot be
re-derived by a deterministic scan, so they are carried forward with their prior
status and marked unverified rather than being silently reported as UPDATED.
Confirm those by hand or re-run the search.

#### Companion re-checks

Re-run both Step 4 companions across the source AND every destination, and diff
against the baselines:

```bash
bun run shared/composition/src/correction-reconcile.ts \
  --docs-root docs --source <source-note.md> --source <dest-a.md> --source <dest-b.md> \
  --out docs/_restructure/decompose-{id}-corrections-after.json

bun run shared/composition/src/figure-check.ts \
  --docs-root docs --note <source-note.md> --note <dest-a.md> --note <dest-b.md> \
  --out docs/_restructure/decompose-{id}-figures-after.json
```

An obligation that was LANDED before and is TARGET-NOT-FOUND after means the
split moved a corrected assertion out from under its correction — repoint the
obligation at whichever child inherited it. A figure that matched before and
mismatches after is a count the split invalidated: the source kept a claim about
a table that left, or a child inherited a claim wider than the rows it received.

Report both diffs alongside the closure summary. A destination whose figures no
longer derive is not a clean split even when every SHA-256 proof passed — the
hashes guarantee the bytes moved intact, not that the sentences about them are
still true.

#### Index staleness

A split can also impact the search index, which is a surface the file tree does
not cover. The failure mode is a stale row for a retired permalink that keeps
resolving in search after the note has moved, while reading it by that permalink
returns nothing — a phantom that survives repointing every citing note, because
no citing note is what is serving it.

Evidence on this build is mixed and worth stating plainly: notes in this project
record encountering exactly that phantom for a retired permalink, but a later
index audit found no orphans in either direction (files on disk and indexed
entities matched exactly). Treat the check as cheap insurance against a
documented failure mode, not as a condition known to be live right now.

Search for each retired title and permalink. Any hit still served that
`list_directory` does not corroborate is an `index-stale` finding: record it in
the merge file alongside the other search entries, or let the automated relation
probe surface it. When any `index-stale` finding exists, recommend a re-index in
the closure report — repointing every citing note does not clear a stale index
row, and the next agent to run a search will find the phantom again. The executor
declines this class by construction and routes it to the work brief, so the
re-index recommendation is the action; there is no text edit that would help.

The retain file is yours to author and is never inferred. A surviving reference
is either a deliberate historical citation or an unrepaired break, and only you
know which — a checker that guessed would quietly convert real breakage into a
pass. An unconstrained rule is refused rather than retaining everything, because
that is exactly the shape a typo produces:

```json
[{ "referencingFile": "sessions/SESSION-2026-07-26_01-bootstrap.md" }]
```

Report the closure summary alongside the audit log. Failure to reach closure is
a surfaced finding, never a silent pass: state how many references remain
OUTSTANDING and where they are. Do not report a decompose as complete on the
strength of the hash proofs alone — those cover the bytes that moved, not the
notes still pointing at where they used to be.

## Error handling

- `PlanValidationError` — Zod rejection. Parse the `issues` array (`{path, message}`), display each, and offer to re-author the plan with corrections.
- `HashMismatch` (exit 2) — two distinct causes, both blocking and both halting before any write. (a) The adapter's `applyMutations`/`reverseMutations` pair is not bijective on this content — extraordinarily rare; do NOT retry, surface with the source path so the adapter can be investigated. (b) The cluster ranges do not exactly partition the source, so the split would drop or duplicate content; the message names the offending clusters and expected line. Cause (b) is a plan defect — re-author the ranges into a contiguous cover from line 1 to `end: -1` and re-adjudicate.
- Missing adapter — if `getAdapter` throws "Unknown source_type", the user picked a source_type that has no shipped adapter. Surface the message verbatim and ask the user how to proceed.

## Constraints

- The LLM never touches content bytes. Only the plan YAML.
- Never skip adjudication. AskUserQuestion approval is mandatory before execution.
- Never write destination files directly. Always go through the CLI entry point.
- All file paths in the plan are relative to the plan YAML's directory (unless absolute).
