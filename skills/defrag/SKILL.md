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
3. **Reporting and delegation.** Format the candidates as grouped markdown.
   In interactive mode, await user confirmation per candidate and delegate to
   decompose / recompose / Brain MCP delete / Brain MCP edit. In report-only
   mode, write to disk and exit.

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
