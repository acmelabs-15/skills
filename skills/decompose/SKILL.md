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

Run Brain MCP search yourself, and choose the mode per query rather than
defaulting to one. Record the mode on each entry — a keyword hit and a
threshold-gated semantic hit do not warrant the same confidence.

| Query kind | Mode |
|---|---|
| Exact identifiers, aliases, permalinks | `keyword` — when functional; fall back to `semantic` |
| Descriptive references | `semantic` |
| Mixed or uncertain | `hybrid`, at your judgement |

Two live constraints on this build, so plan around them rather than trusting a
clean result:

- **`keyword` currently returns zero results for every query.** Until that is
  fixed, treat an empty keyword result as *no signal*, not as *no references*,
  and fall back to `semantic`. The same defect makes `auto` effectively
  semantic-only and contributes nothing to `hybrid`.
- **`depth` above 0 resolves wikilinks through the keyword leg**, so relation
  expansion is affected by the same defect. The GRAPH leg already traverses
  relations deterministically and does not depend on the index — prefer it, and
  do not treat a thin `depth` result as evidence of a small blast radius.

When querying an entity ID in keyword mode, double-quote it (`"ANALYSIS-034"`);
unquoted multi-term queries are narrower than they look.

For current mode-by-mode behaviour and defect status, see
`scratch/brain-search-capability-survey.md`.

Verify every hit before you use it: semantic mode can return rows from other
projects, so check each returned permalink against `list_directory` ground truth
and drop anything that does not resolve. Write the verified hits to a JSON file
shaped like the manifest's `findings` entries, each carrying its `mode`, and
pass it in:

```bash
bun run shared/composition/src/reference-scan.ts \
  --docs-root docs \
  --targets docs/_restructure/decompose-{id}-targets.json \
  --merge docs/_restructure/decompose-{id}-semantic.json \
  --out docs/_restructure/decompose-{id}-impact.json
```

Merged entries are forced to `source: SEARCH` and `advisory: true` whatever the
file claims, so nothing supplied from outside can promote itself into the
closure gate. The declared `mode` is preserved. The search leg WIDENS the
worklist; it never gates it — a recall aid running over an index with known live
defects is not reproducible enough to fail a step on.

Findings are the answer here, not a failure: the scan exits 0 whether it finds
one reference or four hundred. Carry the per-class, per-target and per-source
counts into the Step 5 summary.

### Step 5: Adjudicate via AskUserQuestion

Present the plan to the user with a markdown summary AND the path to the raw YAML for deep inspection. Use AskUserQuestion with exactly these three options:

- approve — execute the plan as-is
- reject — provide feedback; you re-author and re-adjudicate
- abort — cancel; do not execute, do not retain the plan

On reject, rename the rejected plan file to `decompose-{id}-plan-rejected-{N}.yaml` (incrementing `N` per rejection) so the rejection history is auditable, then re-enter Step 3 with the feedback incorporated. Re-run Step 4 as well — a revised plan changes the destinations and the renumbering, so the previous impact manifest no longer describes it.

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
**Repointing worklist**: `docs/_restructure/decompose-{id}-impact.json`
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

### Step 7: Report

Summarize the audit log: number of destination files written, their paths, and the SHA-256 of each. The log carries one entry per cluster, each with its `disposition` and `range`, so the full byte accounting is visible — retained clusters appear with no destination. Confirm the source file remains unchanged.

Note on reversibility: a plan that retains ranges cannot be reversed from its destinations alone, because retained content exists only in the source and appears in no destination. Recompose recovers the concatenation of the written content slices; the source note itself — untouched by the split — is the record for retained ranges. Plans with no scaffolding and no retention keep the full byte-identical decompose-then-recompose round trip.

### Step 8: Verify reference closure

Repoint the references on the Step 4 worklist, then prove it:

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
the merge file alongside the other search entries. When any `index-stale`
finding exists, recommend a re-index in the closure report — repointing every
citing note does not clear a stale index row, and the next agent to run a search
will find the phantom again.

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
