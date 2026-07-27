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
a note was renumbered or renamed.

The scan reads each candidate's own Relations section as a formal inbound index
before scanning prose. Under the bi-directional rule — when note A carries a
`part_of` edge naming note B, B must carry the inverse `contains` edge naming A
— a candidate's Relations enumerate the notes that reference it, and one-way
edges surface as `bidirectional-missing-on-target` and
`bidirectional-missing-on-referencer` findings with the repair site named.

Those two classes are structural-fix candidates in their own right, independent
of any split or merge. A one-way edge is a defect whether or not the note is
ever restructured, and this audit is the only place defrag would notice it.

Optionally widen the scan with a search leg: run Brain MCP search over each
candidate's title and two or three descriptive descriptors, using `keyword` mode
plus `search_type: "text"` for exact identifiers and permalinks (double-quoting
hyphenated identifiers, since the tokenizer splits on hyphens), `semantic` for
descriptive references, and `hybrid` where you judge it useful. Record the mode
on each entry. `keyword` returned zero results for every query on the build this
paragraph was first written against and has since been revived end-to-end, so as
measured on the MCP surface 2026-07-26 an empty keyword result is now evidence of
no match rather than a dead leg. Two mechanics of the current surface matter here:
`mode: "keyword"` alone leaves retrieval at the proxied leg's hybrid default, so
pass `search_type: "text"` for genuine full-text matching; and a structured filter
the running leg cannot evaluate re-routes the request onto the leg that can rather
than being dropped, with `actual_source` on the response naming the leg that
actually served. Verify every hit against `list_directory` ground truth — semantic
mode can still return cross-project rows, the fix for that leak existing but not
deployed everywhere, and the index can still serve rows for notes that have moved
— then pass the verified hits via `--merge`. Those entries are advisory and never
gate anything; they exist to catch prose that names a note without naming its
identifier. For the full tool surface behind this guidance, see the search and
impact-detection tool-surface analysis in the project's analysis folder.

**Two generations of the search surface are live at once, which matters most to
a cron-scheduled audit that nobody watches.** The plugin MCP path carries the
repairs above; the HTTP server behind the `brain` CLI is still on the pre-repair
build pending a restart, where keyword returns zero for every query and a filter
the running leg cannot honour is dropped silently, leaving an unfiltered result
that looks filtered. The detection rule is the response itself: **no
`actual_source` field means a pre-fix surface** — fall back to reading an empty
keyword result as no signal and any filtered result as unfiltered.

Two expansion filters are worth knowing here even though neither replaces a
deterministic leg. `entity_types: ["relation"]` returns inbound edges directly
over MCP, titled `Source Title -> Target Title` with the title rather than the
snippet carrying the payload — a portable corroboration of the audit's graph leg,
which still owns the finding because index-derived edge verbs are unreliable:
absent on type-grouped notes, and on probe sometimes wrong outright. Traverse on
existence, never on verb. And `after_date` returns notes whose index timestamp is
strictly after a given date, so its complement is an index-side view of the stale
set: a cross-check on the staleness classifier above, not a substitute, because
the timestamp is the index's and lags a just-written note.

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

Also widen the scan itself where the CLI can do it for you: passing
`--search-project <name>` runs the advisory leg in-library, two probes per
candidate — a descriptive probe on the candidate's title and a relation probe on
its entity ID — instead of your running those searches by hand. It only reports
notes the deterministic legs did not already match, drops any hit whose snippet
it cannot locate in a note body rather than guessing a line, and reports
`complete: false` when a query hit a page boundary with every page full. Read that
last one as a worklist that may be short.

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
