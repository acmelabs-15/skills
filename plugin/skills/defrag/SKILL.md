---
name: defrag
description: |
  Produces a candidates report for a Brain knowledge graph: reads every note
  under docs/**, measures each against structural thresholds, and groups what it
  finds into split, merge, stale and structural-fix candidates, then hands
  confirmed ones to the decompose and recompose skills. Use when the report or
  the resulting restructuring is the deliverable — to defrag or defragment a
  graph, to curate memories, to audit notes, to run a knowledge-graph audit, or
  to find which notes have outgrown themselves. Runs interactively, confirming
  each candidate, or writes the report and exits. Do not use when a specific
  note is already known to need splitting or merging: invoke decompose or
  recompose directly, since this skill only finds candidates and delegates. Do
  not use to check whether one note is well-formed, to write or edit a note's
  content, or to search the graph for information.
---

# defrag

The defrag skill curates a Brain knowledge graph by auditing notes against
quality thresholds and surfacing candidates for restructuring. It never modifies
note content directly; restructuring is delegated to the decompose and recompose
primitive skills, which preserve content character-for-character via SHA-256
hash validation.

## Trigger phrases

`defrag`, `defragment`, `curate memories`, `audit notes`, `knowledge-graph audit`.

## CLI usage

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/skills/defrag/scripts/defrag.js"                  # interactive
bun "${CLAUDE_PLUGIN_ROOT}/dist/skills/defrag/scripts/defrag.js" --report-only    # cron / non-interactive
bun "${CLAUDE_PLUGIN_ROOT}/dist/skills/defrag/scripts/defrag.js" --staleness 90   # custom staleness threshold (days)
bun "${CLAUDE_PLUGIN_ROOT}/dist/skills/defrag/scripts/defrag.js" --line-max 800   # custom split threshold (lines)
bun "${CLAUDE_PLUGIN_ROOT}/dist/skills/defrag/scripts/defrag.js" --project-root /path/to/project
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
     `--line-max`) → split-candidate
   - Fewer than 3 observations or fewer than 2 relations → merge-candidate
   - More than 12 relations without H3 type-grouping → structural-fix
   - Last-modified more than the staleness threshold (default 90 days) and
     status not `DONE` / `DEPRECATED` → stale-candidate

   Two properties of this list are easy to miss and both are deliberate:

   - **A note can match several rules and appear under each.** There is no
     early return, so one long, thinly-observed note is reported as both a
     split and a merge candidate. Read the report as a list of findings, not a
     list of notes.
   - **Staleness reads git history, not the filesystem.** A note's age is the
     date of its last commit, so a never-committed note has no age and can
     never be stale. That is what makes the check meaningful in a repo where
     checkouts and formatters rewrite file timestamps.

3. **Graph audits.** For every candidate, enumerate the notes that point AT it
   before proposing to move, merge or delete it — and where corrections or
   figures are in play, check those too. These are agent steps, not something
   `defrag.ts` performs: it classifies and reports. Procedure and commands in
   `graph-audits.md`.
4. **Reporting and delegation.** Report format is specified in
   `report-format.md` and pinned by tests — a heading, a scan summary, then one
   section per violation type, in a fixed order, empty sections included. In interactive mode, await
   user confirmation per candidate and delegate to decompose / recompose /
   Brain MCP delete / Brain MCP edit. In report-only mode, write to disk and
   exit: **exit code 2 when candidates were found, 0 when the graph is
   clean**, so a scheduled run surfaces work rather than passing silently.

## Delegation

- **Split** → invoke the decompose skill with the note path and detected
  source type. decompose enforces SHA-256 char-identity on extraction, so
  zero drift is mechanical.
- **Merge** → invoke the recompose skill with the candidate note paths.
- **Stale-delete** → call Brain MCP `delete_note` with audit logging. Where the
  candidate had inbound references, the repoint executor applies the mechanical
  citation repairs and its work brief carries the rest; neither is optional
  cleanup, because a deleted note's citations are broken links the moment the
  delete lands. The executor's plan shape, its four safety properties, its exit
  codes and the work-brief fields are in
  `../decompose/references/repoint.md` — read them there before running it, since
  a delete is the one delegation with nothing to roll back.
- **Structural-fix** → call Brain MCP `edit_note` to insert H3 grouping
  headers; content is otherwise untouched. Bi-directional findings belong here
  too, and the executor never repairs them — it routes them to the brief with the
  counterpart note named as the repair site.

If decompose or recompose fails for a candidate (hash mismatch, validation
error, user rejection at sub-prompt level), defrag logs the failure and
continues with the remaining candidates. The cycle never aborts on a single
candidate failure.

