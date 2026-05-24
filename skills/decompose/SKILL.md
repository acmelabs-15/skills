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
3. Script execution — on approval, you invoke `bun run _shared/composition/src/decompose.ts --plan <path>` and report the audit log

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
clusters:                   # optional — declare the partitioning
  cluster_a:
    description: ...
    destination_path: <path/to/dest-a.md>
    identifiers: [D-100, D-101]
```

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
bun run _shared/composition/src/decompose.ts --plan docs/_restructure/decompose-{id}-plan.yaml
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
- `2` — hash mismatch (the script halted before any destructive write; this is a guarantee violation — surface it loudly)

### Step 6: Report

Summarize the audit log: number of destination files written, their paths, and the SHA-256 of each. Confirm the source file remains unchanged.

## Error handling

- `PlanValidationError` — Zod rejection. Parse the `issues` array (`{path, message}`), display each, and offer to re-author the plan with corrections.
- `HashMismatch` (exit 2) — extraordinarily rare; means the adapter's `applyMutations`/`reverseMutations` pair is not bijective on this content. Do NOT retry; surface to user with the source path so the adapter implementation can be investigated.
- Missing adapter — if `getAdapter` throws "Unknown source_type", the user picked a source_type that has no shipped adapter. Surface the message verbatim and ask the user how to proceed.

## Constraints

- The LLM never touches content bytes. Only the plan YAML.
- Never skip adjudication. AskUserQuestion approval is mandatory before execution.
- Never write destination files directly. Always go through the CLI entry point.
- All file paths in the plan are relative to the plan YAML's directory (unless absolute).
