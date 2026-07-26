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
for exact identifiers and permalinks, `semantic` for descriptive references, and
`hybrid` where you judge it useful. Record the mode on each entry. On the
current build `keyword` returns zero results for every query, so treat an empty
keyword result as no signal rather than no references and fall back to
`semantic`; see `scratch/brain-search-capability-survey.md` for current
mode-by-mode status. Verify every hit against `list_directory` ground truth
(semantic mode can return cross-project rows), then pass the verified hits via
`--merge`. Those entries are advisory and never gate anything; they exist to
catch prose that names a note without naming its identifier.

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

When a confirmed candidate is delegated, decompose and recompose run their own
plan-time impact scan and execution-time closure check. Deletes have no such
owner, so a stale-delete with a non-zero inbound count needs its repointing
tracked here or it will not be tracked at all.

## Delegation

- **Split** → invoke the decompose skill with the note path and detected
  source type. decompose enforces SHA-256 char-identity on extraction, so
  zero drift is mechanical.
- **Merge** → invoke the recompose skill with the candidate note paths.
- **Stale-delete** → call Brain MCP `delete_note` with audit logging.
- **Structural-fix** → call Brain MCP `edit_note` to insert H3 grouping
  headers; content is otherwise untouched.

If decompose or recompose fails for a candidate (hash mismatch, validation
error, user rejection at sub-prompt level), defrag logs the failure and
continues with the remaining candidates. The cycle never aborts on a single
candidate failure.

## Coexistence

defrag coexists with the basic-memory `memory-defrag` skill. They have
distinct names; Claude Code resolves them by name with no collision.
`install.sh` only creates symlinks for skills owned by this project and
never touches `~/Dev/basic-memory-skills/`.
