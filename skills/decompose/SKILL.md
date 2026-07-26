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

- **Ranges must exactly partition the source.** Every line from 1 to `end: -1` belongs to exactly one cluster. Gaps, overlaps, and a final range short of end-of-file all abort with exit 2 before anything is written. `identifiers` alone is not extractable — every cluster needs a `range`.
- **`disposition: retain`** covers a range for the partition proof without writing a file, so the source's own frontmatter, H1 and trailing Observations/Relations need not be forced verbatim into a child. A retained cluster must not declare `destination_path` or `scaffold`.
- **`scaffold`** wraps the destination's content slice in a prologue (frontmatter + H1) and epilogue (Observations + Relations), so each written note stands alone. The H1 is derived from `frontmatter.title`, so the two cannot drift. Scaffolding is excluded from the SHA-256 proofs, which stay exactly as strong over the preserved content slice.

Keep the YAML under 1 MB; the loader enforces this guard.

### Step 4: Adjudicate via AskUserQuestion

Present the plan to the user with a markdown summary AND the path to the raw YAML for deep inspection. Use AskUserQuestion with exactly these three options:

- approve — execute the plan as-is
- reject — provide feedback; you re-author and re-adjudicate
- abort — cancel; do not execute, do not retain the plan

On reject, rename the rejected plan file to `decompose-{id}-plan-rejected-{N}.yaml` (incrementing `N` per rejection) so the rejection history is auditable, then re-enter Step 3 with the feedback incorporated.

On abort, optionally delete the plan file and stop. No further action.

Summary format:

```markdown
**Source**: `<path>` (source_type: `<adr|analysis|...>`)
**Destinations** (N):
- `<dest-path-1>` — <description>
- `<dest-path-2>` — <description>
**Renumber map** (M entries): D-1→D-100, D-2→D-101, ...
**Wikilink map**: <count> entries (or "empty")
**Raw plan**: `docs/_restructure/decompose-{id}-plan.yaml`
```

### Step 5: Execute on approval

Run the CLI entry point via Bun.$:

```bash
bun run shared/composition/src/decompose.ts --plan docs/_restructure/decompose-{id}-plan.yaml
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

### Step 6: Report

Summarize the audit log: number of destination files written, their paths, and the SHA-256 of each. The log carries one entry per cluster, each with its `disposition` and `range`, so the full byte accounting is visible — retained clusters appear with no destination. Confirm the source file remains unchanged.

Note on reversibility: a plan that retains ranges cannot be reversed from its destinations alone, because retained content exists only in the source and appears in no destination. Recompose recovers the concatenation of the written content slices; the source note itself — untouched by the split — is the record for retained ranges. Plans with no scaffolding and no retention keep the full byte-identical decompose-then-recompose round trip.

## Error handling

- `PlanValidationError` — Zod rejection. Parse the `issues` array (`{path, message}`), display each, and offer to re-author the plan with corrections.
- `HashMismatch` (exit 2) — two distinct causes, both blocking and both halting before any write. (a) The adapter's `applyMutations`/`reverseMutations` pair is not bijective on this content — extraordinarily rare; do NOT retry, surface with the source path so the adapter can be investigated. (b) The cluster ranges do not exactly partition the source, so the split would drop or duplicate content; the message names the offending clusters and expected line. Cause (b) is a plan defect — re-author the ranges into a contiguous cover from line 1 to `end: -1` and re-adjudicate.
- Missing adapter — if `getAdapter` throws "Unknown source_type", the user picked a source_type that has no shipped adapter. Surface the message verbatim and ask the user how to proceed.

## Constraints

- The LLM never touches content bytes. Only the plan YAML.
- Never skip adjudication. AskUserQuestion approval is mandatory before execution.
- Never write destination files directly. Always go through the CLI entry point.
- All file paths in the plan are relative to the plan YAML's directory (unless absolute).
