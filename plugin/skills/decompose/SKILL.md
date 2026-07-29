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

1. LLM authoring — read the source, classify its `source_type`, identify cluster seams, author a distribution plan YAML
2. User adjudication — present the plan via AskUserQuestion; the user approves, rejects with feedback (refinement loop), or aborts
3. Script execution — on approval, invoke the CLI and report the audit log

Never write to destination files directly. **Never skip adjudication.**

## Step 1: Read the source

- Identify the source note path from the user's request (resolve wikilinks via Brain MCP if needed)
- Read the source content via Brain MCP `read_note` (Brain notes under `docs/**`)
- Parse the frontmatter to extract `type` — this becomes the plan's `source_type` (e.g., `decision` → `adr`, `analysis` → `analysis`, `session` → `session`, `plan` → `plan`, `spec` → `spec`)

## Step 2: Classify and identify cluster seams

Examine the source's structure for natural split boundaries. For an ADR, the seams are usually the `### D-N` decision headings. For an ANALYSIS index, the findings or sub-analysis sections. Decide the partition shape: how many destinations, which identifiers belong to each cluster, and any cross-cluster wikilink remapping required.

## Step 3: Author the distribution plan YAML

Write a YAML file to `docs/_restructure/decompose-{id}-plan.yaml` where `{id}` is a short kebab-case slug (e.g., `adr-042-split`). The required shape:

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

Four rules the executor enforces:

- **Ranges must exactly partition the source.** Every line from 1 to `end: -1` belongs to exactly one cluster. Gaps, overlaps, and a final range short of end-of-file all abort with exit 2 before anything is written.
- **`range` is what extracts; `identifiers` / `decisions` / `renumbered_to` are annotation.** The adapter contract exposes extraction by line range only, so a cluster without a `range` is refused. Supplied `identifiers` are a post-extraction cross-check — a declared identifier absent from the extracted slice rejects the plan, which catches ranges that drifted off their intended section.
- **`disposition: retain`** covers a range for the partition proof without writing a file, so the source's own frontmatter, H1 and trailing sections need not be forced verbatim into a child. A retained cluster must not declare `destination_path` or `scaffold`.
- **`scaffold`** wraps the destination's content slice in a prologue (frontmatter + H1) and epilogue (Observations + Relations) so each written note stands alone. The H1 derives from `frontmatter.title`, so the two cannot drift. Scaffolding is excluded from the SHA-256 proofs, which stay exactly as strong over the preserved content slice.

Keep the YAML under 1 MB; the loader enforces this guard.

**Never put a sample wikilink in a generated note body, not even in backticks.** A scaffold's `relations` are rendered into the destination note, and the parser that indexes that note treats a wikilink inside a code span as a real edge — a backticked example becomes a genuine unresolved relation pointing at a note that was never meant to exist. Code-span quoting is not an escape here. When a generated body needs to talk about the wikilink form, DESCRIBE it: write "a wikilink naming the parent by its full colon title" rather than showing the brackets. This applies to any content the scaffold renders, not only the relations block.

**Path resolution.** Plan paths are relative and must not contain `..` — the CWE-22 guard rejects traversal in plan content. Since the plan lives at `docs/_restructure/` while destinations live in sibling directories, pass the graph root explicitly and write every path relative to it:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/decompose.js" \
  --plan docs/_restructure/decompose-{id}-plan.yaml --root docs
```

With `--root docs`, `source_path: decisions/ADR-042.md` and `destination_path: decisions/ADR-042a.md` both resolve and no `../` is needed. Omitting `--root` resolves against the plan file's own directory, which only works when the plan sits beside its targets. The base is supplied by you, not by the plan, so an authored plan can never redirect its own resolution.

## Step 4: Compute the inbound-reference impact manifest

The plan guarantees the content of the notes it moves. It says nothing about the notes that POINT AT them, and a hash-clean decompose leaves every one of those citations dangling. **Compute that blast radius before adjudication, so the repointing worklist is part of what the user approves** rather than something review discovers later.

Author a targets file naming the source and every destination, then scan:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/reference-scan.js" \
  --docs-root docs \
  --targets docs/_restructure/decompose-{id}-targets.json \
  --out docs/_restructure/decompose-{id}-impact.json
```

The mechanism is defined once, in `references/impact-manifest.md` — the targets-file shape, the two-stage funnel, the GRAPH and TEXT legs, the advisory channel, the gating assertions to run before believing a low count, and the two companion baselines. Read it there; it is not restated here.

Two things bind before you proceed:

- **A low finding count is a claim, not a result.** Read the manifest's `discovery` block: `provable: false` means at least one query could not vouch for its own set, and the worklist may be short.
- **Aliases are yours to declare.** Every identifier `renumber_map` retires is a literal no query on the current identity can reach. What a split retires, and the failures to expect from it, are in `references/split-divergences.md`.

## Step 5: Adjudicate via AskUserQuestion

Present the plan with a markdown summary AND the path to the raw YAML for deep inspection. Use AskUserQuestion with three authored options plus the automatic "Other":

- approve — execute the plan as-is
- reject — provide feedback; you re-author and re-adjudicate
- abort — cancel; do not execute, do not retain the plan

**Author the repoint plan and run its dry-run preview BEFORE adjudicating, and present that preview as part of what is being approved.** The split and the repointing that follows it are one operation from the user's point of view: a split whose citation repairs turn out to be mostly unapplicable is a different proposal from one that repoints cleanly, and the user cannot weigh that after the notes have already been written. Preview is the executor's default, so this costs one extra command and no risk. A preview showing forty repairs and two hundred judgment-class entries is telling you the split needs a graph pass more than a text pass.

On reject, rename the plan to `decompose-{id}-plan-rejected-{N}.yaml` (incrementing `N`) so the rejection history is auditable, then re-enter Step 3 with the feedback incorporated. Re-run Step 4 as well — a revised plan changes the destinations and the renumbering, so the previous impact manifest no longer describes it. Re-author the repoint plan and re-run its preview for the same reason.

On abort, optionally delete the plan file and stop.

Summary format:

```markdown
**Source**: `<path>` (source_type: `<adr|analysis|...>`)
**Destinations** (N):
- `<dest-path-1>` — <description>
**Renumber map** (M entries): D-1→D-100, D-2→D-101, ...
**Wikilink map**: <count> entries (or "empty")
**Inbound-reference impact**: <N> references across <M> files — <per-class counts>
**Repoint preview**: <A> applied, <B> already repointed, <C> residual by reason
**Repointing worklist**: `docs/_restructure/decompose-{id}-impact.json`
**Repoint plan**: `docs/_restructure/decompose-{id}-repoint.yaml`
**Raw plan**: `docs/_restructure/decompose-{id}-plan.yaml`
```

## Step 6: Execute on approval

```bash
# SKILLS_DOCS_ROOT activates the realpath containment check (CWE-22).
# Without it the lexical guard still runs, but symlink escapes are not caught.
export SKILLS_DOCS_ROOT="$(pwd)/docs"
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/decompose.js" \
  --plan docs/_restructure/decompose-{id}-plan.yaml --root docs
```

The script loads the YAML with `js-yaml` FAILSAFE_SCHEMA (CWE-502 mitigation), validates via Zod including bijection of `renumber_map`, resolves the adapter via `getAdapter(source_type)`, **applies `applyMutations` then `reverseMutations` and SHA-256-compares the round trip** (blocking round-trip invariant), writes each destination via temp-then-rename atomic write, and emits a JSON-lines audit log to stdout, one line per destination.

Exit codes:

- `0` — success
- `1` — validation error (parse the structured `PlanValidationError` from stderr and report it)
- `2` — integrity failure: either a per-cluster hash mismatch, or a coverage failure where the cluster ranges do not exactly partition the source. In both cases the script halted before any destructive write; surface it loudly

## Step 7: Repoint the mechanical references

The split moved the content; every note that cited it still points at where it used to be. The executor applies the mechanical subset of the Step 4 worklist, and the residue it declines becomes an agent worklist rather than a silence.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/repoint.js" \
  --manifest docs/_restructure/decompose-{id}-impact.json \
  --plan docs/_restructure/decompose-{id}-repoint.yaml \
  --apply --docs-root docs --out docs/_restructure/decompose-{id}-repoint.json
```

Preview is the default and `--apply` is required to write. The plan shape, the four safety properties, the stale-manifest rule and the work-brief fields are in `references/repoint.md`.

Exit codes: `0` nothing left; `1` validation error, nothing written; `2` **expected** — the run completed and judgment-class work remains; `3` integrity failure, the pass could not be proven reversible and nothing was renamed.

## Step 8: Report

Summarize the audit log: destination files written, their paths, and the SHA-256 of each. The log carries one entry per cluster with its `disposition` and `range`, so the full byte accounting is visible — retained clusters appear with no destination. Confirm the source file remains unchanged.

Reversibility depends on the plan shape; `references/split-divergences.md` covers what a retained range costs.

## Step 9: Verify reference closure

Step 7 repointed the mechanical references and handed you a brief for the rest. This step proves both: that the applied repairs landed, and that nothing new broke. Work the brief first.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/reference-scan.js" \
  --check --manifest docs/_restructure/decompose-{id}-impact.json \
  --docs-root docs \
  --retain docs/_restructure/decompose-{id}-retain.json \
  --out docs/_restructure/decompose-{id}-closure.json
```

Every finding returns as `UPDATED`, `RETAINED` or `OUTSTANDING`. Exit 2 means closure was not reached. The full contract — the executor-pairing expectation, `newFindings`, the deterministic-vs-advisory split, the retain file's authoring rule, index staleness — is in `references/closure.md`, and the companion re-checks are there too.

Failure to reach closure is a surfaced finding, never a silent pass: state how many references remain OUTSTANDING and where. **Do not report a decompose as complete on the strength of the hash proofs alone** — the hashes guarantee the bytes moved intact, not that the sentences about them are still true.

## Error handling

- `PlanValidationError` — Zod rejection. Parse the `issues` array (`{path, message}`), display each, offer to re-author.
- `HashMismatch` (exit 2) — two causes, both blocking, both halting before any write. (a) The adapter's `applyMutations`/`reverseMutations` pair is not bijective on this content — extraordinarily rare; do NOT retry, surface with the source path so the adapter can be investigated. (b) The cluster ranges do not exactly partition the source; the message names the offending clusters and expected line. Cause (b) is a plan defect — re-author the ranges into a contiguous cover from line 1 to `end: -1` and re-adjudicate.
- Missing adapter — `getAdapter` throwing "Unknown source_type" means the source_type has no shipped adapter. Surface the message verbatim and ask how to proceed.

## Constraints

- The LLM never touches content bytes. Only the plan YAML.
- Never skip adjudication. AskUserQuestion approval is mandatory before execution.
- Never write destination files directly. Always go through the CLI entry point.
- All file paths in the plan are relative to the plan YAML's directory (unless absolute).

## References

- `references/impact-manifest.md` — the reference scanner: targets file, two-stage funnel, GRAPH/TEXT legs, advisory channel, gating assertions, companion baselines. Shared with `recompose` and `defrag`.
- `references/repoint.md` — the repoint executor: plan shape, safety properties, exit codes, work brief. Shared.
- `references/closure.md` — closure verification, companion re-checks, index staleness. Shared.
- `references/split-divergences.md` — what goes wrong on a split specifically: what retires, figure loss, correction orphaning, edge mis-assignment, batch stakes, reversibility.
