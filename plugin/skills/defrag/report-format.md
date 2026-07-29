# The defrag report format

The shape of the markdown a defrag run writes. Read this when parsing a report, when diffing two runs, or before changing anything that emits one — the format is pinned by tests, so a change here is a change to those.

Written because the format was previously described only as "grouped markdown", which is true and tells a reader nothing they can rely on.

## The document

Four parts, always in this order, always all present.

**A heading carrying the run date**, as `YYYY-MM-DD`:

```markdown
# defrag report — 2026-07-28
```

**A preamble of three facts**, each on its own line: the project root in backticks, how many notes were read, and how many findings came out of them.

```markdown
Project root: `/Users/you/project`
Notes scanned: 142
Candidates: 7
```

**A summary table**, one row per violation type, in the fixed order below. Every type gets a row whether or not it has findings, so the table's shape does not change between runs and a zero is stated rather than implied by absence.

```markdown
## Summary

| Action | Count |
|:--|:--|
| Split candidates | 3 |
| Merge candidates | 4 |
| Stale candidates | 0 |
| Structural fixes | 0 |
```

**One section per violation type**, in that same fixed order — `split`, `merge`, `stale`, `structural-fix`. Each carries its heading, a sentence describing what the type means and which skill resolves it, then either its findings or `_None._`.

```markdown
## Split candidates

Notes that exceed structural thresholds; recommend invoking decompose to split into smaller notes.

- `docs/analysis/ANALYSIS-004-audit.md` (analysis) — lineCount=982 exceeds 500
- `docs/decisions/ADR-002-adapter.md` (decision) — 21 observations without H3 sub-grouping

## Stale candidates

Notes that have not been touched for longer than the staleness threshold and whose status is not terminal.

_None._
```

## The finding line

Every finding is one bullet in one shape:

```text
- `<path>` (<entityType>) — <violationDetail>
```

The path is repo-relative and backticked. The entity type comes from the note's frontmatter, or reads `unknown` when the note has none. The detail is written by whichever check produced the finding, so it names the measurement and the threshold it crossed rather than restating the rule.

## Two things a parser must expect

**A note can appear in more than one section.** The checks do not stop at the first match, so a long note with two observations is a split candidate *and* a merge candidate, listed under both. `Candidates:` counts findings, not notes, and will exceed the number of distinct paths whenever that happens.

**Section order is fixed and independent of counts.** Sections are never sorted by size, never omitted when empty, and never reordered. Anything reading the report positionally can rely on that.

## Where it goes

Interactive mode prints the report and then walks each candidate. Report-only mode writes it to `defrag/reports/defrag-YYYY-MM-DD.md` and exits — **code 2 when there were candidates, code 0 when the graph was clean.** That inverts the usual shell convention deliberately: a scheduled run should exit non-zero when it found work, so the run surfaces instead of passing silently.
