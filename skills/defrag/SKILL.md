---
name: defrag
description: |
  Periodic curator skill for a Brain knowledge graph. Audits notes under docs/**
  against quality thresholds and scope-evaluation heuristics, classifies them into
  split / merge / stale / structural-fix candidates, then delegates restructuring
  to the decompose and recompose primitive skills (and to native delete for stale
  entries). Supports interactive mode (user confirms each candidate) and report-only
  mode for cron scheduling.
triggers:
  - defrag
  - defragment
  - curate memories
  - audit notes
  - knowledge-graph audit
---

# defrag

The defrag skill curates a Brain knowledge graph by auditing notes against
quality thresholds and surfacing candidates for restructuring. It never modifies
note content directly; restructuring is delegated to the decompose and recompose
primitive skills, which preserve content character-for-character via SHA-256
hash validation.

## Trigger phrases

`defrag`, `defragment`, `curate memories`, `audit notes`, `knowledge-graph audit`.

These names are distinct from the existing `memory-defrag` skill in
`~/Dev/basic-memory-skills`. Both can be installed simultaneously without
collision.

## CLI usage

```bash
bun skills/defrag/scripts/defrag.ts                  # interactive
bun skills/defrag/scripts/defrag.ts --report-only    # cron / non-interactive
bun skills/defrag/scripts/defrag.ts --staleness 90   # custom staleness threshold (days)
bun skills/defrag/scripts/defrag.ts --line-max 800   # custom split threshold (lines)
bun skills/defrag/scripts/defrag.ts --project-root /path/to/project
bun skills/defrag/scripts/defrag.ts --basic-memory   # treat as basic-memory context
```

Both numeric flags (`--staleness`, `--line-max`) require a positive integer. An
invalid or missing value prints the reason and exits 1 rather than falling back
to the default, so a mistyped threshold fails loudly instead of silently
disabling the check it was meant to tune.

## Operation modes

- **Interactive (default).** Runs the audit, prints the candidates report,
  then walks each candidate one at a time. The user confirms or skips. Confirmed
  candidates are delegated.
- **Report-only (`--report-only`).** Runs the audit and writes the report to
  `defrag/reports/defrag-YYYY-MM-DD.md`. Exits with code 2 if candidates were
  found, code 0 if the graph is clean. No delegation; safe for cron.

## Audit cycle

1. **Discovery.** Enumerate every markdown note under `docs/**`. Read each
   note's frontmatter and body.
2. **Evaluation.** Apply quality thresholds:
   - More than 15 observations without H3 sub-grouping → split-candidate
   - More than the line-count threshold (default 500 lines, set with
     `--line-max`) with multi-entity content → split-candidate
   - Fewer than 3 observations or fewer than 2 relations → merge-candidate
   - More than 12 relations without H3 type-grouping → structural-fix
   - Last-modified more than the staleness threshold (default 90 days) and
     status not `DONE` / `DEPRECATED` → stale-candidate
3. **Inbound-reference audit.** For every candidate, enumerate the notes that
   point AT it before proposing to move, merge or delete it. See the section
   below.
4. **Reporting and delegation.** Format the candidates as grouped markdown.
   In interactive mode, await user confirmation per candidate and delegate to
   decompose / recompose / Brain MCP delete / Brain MCP edit. In report-only
   mode, write to disk and exit.

## Inbound-reference audit

The quality thresholds above look at a note in isolation: how many observations
it carries, how long it is, when it was last touched. None of that sees the
edges. A note with two observations looks like a merge candidate whether it has
zero inbound references or forty, and the cost of restructuring it is almost
entirely a function of that number.

Run the scanner over the candidate set to supply the missing dimension:

```bash
bun run shared/composition/src/reference-scan.ts \
  --docs-root docs \
  --targets defrag/reports/defrag-candidates-targets.json \
  --out defrag/reports/defrag-YYYY-MM-DD-impact.json
```

The targets file is the candidate list, one entry per note. Candidates surfaced
by threshold alone have no retired identities, so no aliases are needed; supply
`aliasTitles` / `aliasPermalinks` / `aliasEntityIds` only where you already know
a note was renumbered or renamed. Where you do, each alias becomes a discovery
query of its own — no query on a note's current identity can reach a retired one,
which is what makes it retired.

`--project <name>` is optional and pins the graph the queries run against. Left
off, the CLI resolves one itself (`BM_PROJECT`, `BM_ACTIVE_PROJECT`,
`BRAIN_PROJECT`, then a match of the working directory against configured code
paths), and the project that answered is recorded on the impact manifest with
whether you named it or the CLI resolved it. For a cron-scheduled audit, name it:
a resolved project is an inference a changed working directory could redirect.

The scan reads each candidate's own Relations section as a formal inbound index
before scanning prose. Under the bi-directional rule — when note A carries a
`part_of` edge naming note B, B must carry the inverse `contains` edge naming A
— a candidate's Relations enumerate the notes that reference it, and one-way
edges surface as `bidirectional-missing-on-target` and
`bidirectional-missing-on-referencer` findings with the repair site named.

Those two classes are structural-fix candidates in their own right, independent
of any split or merge. A one-way edge is a defect whether or not the note is
ever restructured, and this audit is the only place defrag would notice it.

### How the audit finds referencing notes

The audit rides the same two-stage funnel the restructuring skills use. The
scanner no longer walks the docs tree to find referencing notes: that census was
removed rather than kept as a fallback, so a run cannot silently take a different
path to a different answer. (The audit cycle's own step 1 still enumerates notes
under `docs/**` — that walk feeds the quality thresholds, and is a different
mechanism from reference discovery.)

Stage one asks the brain CLI's complete-retrieval surface which notes could
possibly reference each candidate, running two arguments per target that between
them partition the reference space: `--references` returns every note holding a
wikilink EDGE to the candidate, read off the relation graph; `--exhaustive`
returns every note whose full content contains a literal, case-insensitively,
which is what catches permalink strings, section citations and bare prose
mentions. One exhaustive query on the entity ID already covers the candidate's
current title and permalink, since both embed the ID by convention; declared
aliases each get their own. Stage two then opens ONLY those notes, because no
search response carries a line or a column and an audit that cannot address a
finding cannot hand it to anyone.

Three properties matter to an audit nobody is watching:

- **Completeness is claimed per query and aggregated by AND.** Each query records
  whether the surface proved its own set complete and why not when it could not;
  the manifest is `provable: true` only when every query was. An unproven run
  warns on stderr naming the queries that could not vouch for themselves. Read
  `provable: false` as a candidate report that may be short.
- **An unreachable search FAILS the run.** It never degrades to an empty
  candidate set, which would read as "nothing references this note" and would
  turn an outage into a clean bill of health for a delete candidate.
- **A wrong graph is detected structurally.** It answers fluently — every query
  proves itself complete over notes that really exist, just not here — so when
  the queries return notes but essentially none exist under the docs root, the
  scan says so and names `--project` as the remedy. A handful of returned notes
  missing from disk is ordinary index staleness instead, reported separately as
  `missingOnDisk`: paths the index knows and stage two could not open. For a
  stale-delete audit that list is worth reading directly, since it is the index
  holding rows for notes the tree no longer has.

**Known boundary: batched candidates do not see each other.** Stage two excludes
every target FILE from its text scan, on the reasoning that a note citing itself
is not an inbound reference. Correct for one target; too wide for the batch a
defrag run naturally produces. A reference from one candidate to another sits
inside an excluded file, so the inbound count for both is under-reported by
exactly those edges. Measured on a live graph, batch-scanning 28 targets dropped
326 cross-target occurrences. A per-candidate filter is the queued fix. Until it
lands, scan candidates that cite one another individually before acting on either
— single-target scans have zero exposure — and read a batch report's inbound
counts as a floor rather than a total.

One class of reference the funnel cannot reach: prose that names a note without
naming any identifier ("the substrate analysis"). Literal containment needs a
literal to contain, so those references are found only by hand-run search. Widen
the audit with one where it is worth the time — search each candidate's title and
two or three descriptive descriptors, double-quoting hyphenated identifiers since
the tokenizer splits on hyphens — verify every hit against `list_directory`
ground truth, and pass the verified hits via `--merge`. Merged entries are forced
advisory and gate nothing; each must record how it was found (the mode requested,
the retrieval strategy requested alongside it, and which leg actually served the
row, or `unreported` when the surface did not say), because an advisory entry is
the one kind a reader has to confirm by reproducing the query.

An index-derived edge verb is never evidence, which is why the funnel's edge leg
asks only whether an edge EXISTS. Verbs are absent on type-grouped notes and on
probe have come back wrong outright. The audit's graph leg owns any typed finding,
and it earns that by parsing note bodies rather than consulting the index.

Fold the per-target totals into the candidates report so each candidate carries
its inbound-reference count. Two uses:

- **Prioritisation.** A stale-delete candidate with inbound references is not a
  delete — it is a delete plus a repointing pass, and the report should say so
  rather than presenting it as a one-step cleanup.
- **Malformed-reference detection.** The `wikilink-malformed` class flags
  colon-less and filename-stem wikilinks pointing at the candidate. Those are
  already broken, independently of any restructuring, and are worth fixing
  whether or not the candidate is ever touched. Surface them as their own
  structural-fix findings.

In report-only mode the audit is informational — it changes the report, never
the exit code, which continues to mean "candidates found". In interactive mode,
show the inbound count when asking the user to confirm a candidate: consent to
restructure a note is not informed consent if the blast radius is not on screen.

Carry the manifest's `discovery` block into the report alongside those counts,
because an inbound count is only as good as the scope that produced it. It is
required on every manifest and names the graph that answered, whether that
project was declared or resolved, whether every query proved its own set
complete, which returned paths were missing from disk, and which indexed files
were excluded as non-markdown. An inbound count of zero under `provable: false`
is not the same fact as an inbound count of zero under `provable: true`, and a
report that prints only the number loses the difference.

When a confirmed candidate is delegated, decompose and recompose run their own
plan-time impact scan and execution-time closure check. A stale-delete now has an
owner too: the repoint executor applies the mechanical citation repairs over the
same manifest, and emits everything it cannot repair as a work brief. That changes
what a delete candidate costs to schedule, so it is worth stating in the report:

```bash
# preview is the default and writes nothing; --apply is required to write
bun run shared/composition/src/repoint.ts \
  --manifest defrag/reports/defrag-YYYY-MM-DD-impact.json \
  --plan defrag/reports/defrag-YYYY-MM-DD-repoint.yaml \
  --docs-root docs --out defrag/reports/defrag-YYYY-MM-DD-repoint-preview.json
```

For a cron-scheduled audit the preview is the only form that should ever run
unattended: it performs the identical computation minus the rename, so its counts
are evidence about what an apply would do, and `--apply` stays a decision a human
makes. Re-runs are no-ops — an address already repointed is reported as such
rather than substituted twice — and a manifest that no longer satisfies the
current schema fails loudly with nothing written, the remedy being a re-scan
rather than a hand-migration.

Two figures from that preview belong in the candidates report. The applied count
is the part of a delete that is mechanical. The residual count, broken down by
reason, is the part that is not: closure findings, index staleness, malformed
references and every advisory entry are declined by construction, because their
repair is an edge insertion, a re-index or an authored correction rather than a
text substitution. A stale-delete whose residue is mostly judgment-class is a
graph pass wearing a cleanup's clothing, and the report should say so.

The residue arrives as a per-note work brief, which is the agent worklist for that
follow-up: each entry names the note and permalink to open, an anchor (real line
and column for prose, `whole note` where no position was ever measured), the class
and decline reason, the evidence, what the plan says happened to the target, and
a suggested repair shape. Note that a bi-directional entry's repair site is the
COUNTERPART note rather than the one holding the evidence. The suggested action
is a shape and not an instruction — every entry is in the brief precisely because
a machine could not decide it.

## Correction and figure audit

Two further audits run over the same candidate set, both read-only, both using
the defrag convention that exit 2 means the audit found work.

**Unlanded corrections.** A correction naming its target and quoting the text it
retires is a machine-checkable obligation:

```bash
bun run shared/composition/src/correction-reconcile.ts \
  --docs-root docs --source <candidate.md> [--source ...] \
  --out defrag/reports/defrag-YYYY-MM-DD-corrections.json
```

An OUTSTANDING obligation on a candidate changes what the candidate is. A note
carrying an unlanded correction is not a split candidate that happens to need
tidying — restructuring it moves the target assertion out from under a correction
nobody has applied yet, and the correction is then pointing into a child. Surface
it as a blocker on that candidate rather than a note beside it. `TARGET-NOT-FOUND`
is stronger still: the correction names a note that has moved or never existed.

**Derivable figures.** Stated figures that summarise structure can be re-derived
from it, and `--all` needs no configuration:

```bash
bun run shared/composition/src/figure-check.ts \
  --docs-root docs --all \
  --out defrag/reports/defrag-YYYY-MM-DD-figures.json
```

MISMATCH findings are structural-fix candidates in their own right — a stale
count is wrong whether or not the note is ever restructured, and this sweep is
the only place defrag would notice. `UNANCHORED` findings are the tool declining
to guess which structure a figure refers to; report them, do not action them.

Run the `--all` figure sweep even when the candidate list is short. It is the
cheapest audit in the cycle and the one whose findings are most likely to be
independent of the thresholds that produced the candidates.

## Delegation

- **Split** → invoke the decompose skill with the note path and detected
  source type. decompose enforces SHA-256 char-identity on extraction, so
  zero drift is mechanical.
- **Merge** → invoke the recompose skill with the candidate note paths.
- **Stale-delete** → call Brain MCP `delete_note` with audit logging. Where the
  candidate had inbound references, the repoint executor applies the mechanical
  citation repairs and its work brief carries the rest; neither is optional
  cleanup, because a deleted note's citations are broken links the moment the
  delete lands.
- **Structural-fix** → call Brain MCP `edit_note` to insert H3 grouping
  headers; content is otherwise untouched. Bi-directional findings belong here
  too, and the executor never repairs them — it routes them to the brief with the
  counterpart note named as the repair site.

If decompose or recompose fails for a candidate (hash mismatch, validation
error, user rejection at sub-prompt level), defrag logs the failure and
continues with the remaining candidates. The cycle never aborts on a single
candidate failure.

## Coexistence

defrag coexists with the basic-memory `memory-defrag` skill. They have
distinct names; Claude Code resolves them by name with no collision.
`install.sh` only creates symlinks for skills owned by this project and
never touches `~/Dev/basic-memory-skills/`.
