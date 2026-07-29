---
name: recompose
description: Merge (N-to-1) multiple Brain knowledge-graph notes into a single note using a composition plan. Triggers on phrases like "recompose these notes", "merge these ADRs", "combine these analyses". Authors a composition plan YAML, presents it for adjudication, then executes via the composition library with SHA-256 round-trip validation guaranteeing zero content drift.
---

# recompose

Merges N source Brain knowledge-graph notes into 1 destination note using a deterministic composition plan. Inverse of `/decompose`. The LLM authors the plan (cognitive work); the composition library executes it (mechanical work, hash-validated).

## When to use this skill

Use when the user asks to:

- Recompose notes (e.g., "recompose these ADRs", "merge these analyses")
- Consolidate per-decision ADR splits back into a multi-decision ADR
- Roll up per-finding analyses into a single index
- Any other N-to-1 restructuring

## Three-phase workflow

Identical to `/decompose` (LLM authoring → user adjudication → script execution). **Never bypass adjudication.**

## Step 1: Read the sources

- Identify the N source note paths from the user's request
- Read each via Brain MCP `read_note`
- Confirm all sources share the same `source_type` (frontmatter `type` field). Cross-type recomposition is out of scope; reject if mixed.

## Step 2: Determine merge order, resolve collisions, author the plan

Determine the order in which sources are concatenated, then design a `renumber_map` that unifies identifiers across sources without collisions (the renumber map must be injective).

Write a YAML file to `docs/_restructure/recompose-{id}-plan.yaml`:

```yaml
plan_type: composition
source_type: adr
target_path: <path/to/merged.md relative to plan file>
sources:                    # ordered list of source paths to concatenate
  - <path/to/source-a.md>
  - <path/to/source-b.md>
renumber_map:
  D-100: D-1
  D-101: D-2
  # Must be injective.
wikilink_map: {}
```

If `sources` is omitted, the script treats `target_path` itself as the sole source (identity renumber).

Where the sources were written by a scaffolded `/decompose`, the scaffold must be declared per source so the merge strips it before joining — see `references/scaffolded-sources.md`.

## Step 3: Compute the inbound-reference impact manifest

The plan guarantees the content of the notes it merges. It says nothing about the notes that POINT AT them, and a hash-clean recompose leaves every one of those citations aimed at an absorbed source. **Compute that blast radius before adjudication, so the repointing worklist is part of what the user approves** rather than something review discovers later.

Author a targets file naming every source and the target, then scan:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/reference-scan.js" \
  --docs-root docs \
  --targets docs/_restructure/recompose-{id}-targets.json \
  --out docs/_restructure/recompose-{id}-impact.json
```

The mechanism is defined once, in `../decompose/references/impact-manifest.md` — the targets-file shape, the two-stage funnel, the GRAPH and TEXT legs, the advisory channel, the gating assertions to run before believing a low count, and the two companion baselines. Read it there; it is not restated here.

Two things bind before you proceed, and both are merge-specific:

- **Every absorbed source's identity becomes an alias.** N-1 titles, permalinks and entity IDs stop being the current name of anything, and no query on the surviving identity reaches them.
- **A reference to an absorbed source still resolves**, because recompose leaves its sources on disk. Resolving is not the same as being current. What that costs, along with figure inflation, correction resurrection and the edge-verb workload, is in `references/merge-divergences.md`.

## Step 4: Adjudicate via AskUserQuestion

Three authored options plus the automatic "Other": approve, reject with feedback (rename to `recompose-{id}-plan-rejected-{N}.yaml`, refine), or abort.

**Author the repoint plan and run its dry-run preview BEFORE adjudicating, and present the preview as part of what is being approved.** A merge and the repointing that follows it are one operation to the user, and merges make this sharper than splits do: every edge pointing at an absorbed source has to be re-verbed onto the target, and those are judgment-class entries the executor declines. A preview showing few mechanical repairs and a large residue is telling you this merge is mostly a graph pass. On reject, re-author the repoint plan too — its identifier maps were written against the merge the rejected plan proposed.

Summary format:

```markdown
**Sources** (N, in merge order):
- `<source-a>` — <description>
**Target**: `<path>` (source_type: `<adr|analysis|...>`)
**Renumber map** (M entries): D-100→D-1, ...
**Wikilink map**: <count> entries (or "empty")
**Inbound-reference impact**: <N> references across <M> files — <per-class counts>
**Repoint preview**: <A> applied, <B> already repointed, <C> residual by reason
**Repointing worklist**: `docs/_restructure/recompose-{id}-impact.json`
**Raw plan**: `docs/_restructure/recompose-{id}-plan.yaml`
```

## Step 5: Execute on approval

```bash
# SKILLS_DOCS_ROOT activates the realpath containment check (CWE-22).
# Without it the lexical guard still runs, but symlink escapes are not caught.
export SKILLS_DOCS_ROOT="$(pwd)/docs"
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/recompose.js" \
  --plan docs/_restructure/recompose-{id}-plan.yaml --root docs
```

The script loads with FAILSAFE_SCHEMA, validates via `CompositionPlanSchema.parseAsync` (bijection check on `renumber_map`), dispatches via `getAdapter(source_type)`, reads each source in declared order, concatenates, applies mutations, **SHA-256-validates the round trip via `reverseMutations`**, writes the target via temp-then-rename atomic write, and emits a single JSON-lines audit entry to stdout.

Exit codes match `/decompose`: `0` success, `1` validation error, `2` hash mismatch. A scaffold declaration that does not match the shard's bytes also exits 2 and writes nothing.

## Step 6: Repoint the mechanical references

The merge moved the content; every note that cited a source still points at it. The executor applies the mechanical subset of the Step 3 worklist, and the residue it declines becomes an agent worklist rather than a silence.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/repoint.js" \
  --manifest docs/_restructure/recompose-{id}-impact.json \
  --plan docs/_restructure/recompose-{id}-repoint.yaml \
  --apply --docs-root docs --out docs/_restructure/recompose-{id}-repoint.json
```

Preview is the default and `--apply` is required to write. The plan shape, the four safety properties, the stale-manifest rule and the work-brief fields are in `../decompose/references/repoint.md`.

Exit codes: `0` nothing left; `1` validation error, nothing written; `2` **expected** — the run completed and judgment-class work remains, which on a merge is the common case; `3` integrity failure, the pass could not be proven reversible and nothing was renamed.

## Step 7: Report

Summarize the audit entry: the target written, its SHA-256, and the sources consumed in order. Confirm the source files remain unchanged on disk.

## Step 8: Verify reference closure

Step 6 repointed the mechanical references and handed you a brief for the rest. This step proves both: that the applied repairs landed, and that nothing new broke. Work the brief first.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/reference-scan.js" \
  --check --manifest docs/_restructure/recompose-{id}-impact.json \
  --docs-root docs \
  --retain docs/_restructure/recompose-{id}-retain.json \
  --out docs/_restructure/recompose-{id}-closure.json
```

Every finding returns as `UPDATED`, `RETAINED` or `OUTSTANDING`. Exit 2 means closure was not reached. The full contract — the executor-pairing expectation, `newFindings`, the deterministic-vs-advisory split, the retain file's authoring rule, index staleness — is in `../decompose/references/closure.md`, and the companion re-checks are there too.

This check earns its keep on a merge more than anywhere else, for the reason in `references/merge-divergences.md`: an absorbed source is still a file, so a stale citation to it opens cleanly and nothing but this scan tells you it is stale.

Failure to reach closure is a surfaced finding, never a silent pass: state how many references remain OUTSTANDING and where. **Do not report a recompose as complete on the strength of the hash proofs alone** — the hashes guarantee the bytes moved intact, not that the sentences about them are still true.

## Error handling

Identical to `/decompose`. `PlanValidationError` → parse issues, re-author. `HashMismatch` → surface loudly, do not retry. Unknown source_type → report verbatim.

## Constraints

- Same as `/decompose`: no direct content writes by the LLM, mandatory adjudication, no source-type mixing, all paths relative to the plan YAML.
- Never skip adjudication. AskUserQuestion approval is mandatory before execution.

## Path resolution

Same as `/decompose`: plan paths are relative, `..` is rejected, and `--root` supplies the base. Pass `--root docs` when the plan sits at `docs/_restructure/` and its sources live in sibling directories.

## References

Three files are owned by `decompose` and shared with this skill and `defrag`; they are read there, not copied here:

- `../decompose/references/impact-manifest.md` — the reference scanner: targets file, two-stage funnel, GRAPH/TEXT legs, advisory channel, gating assertions, companion baselines.
- `../decompose/references/repoint.md` — the repoint executor: plan shape, safety properties, exit codes, work brief.
- `../decompose/references/closure.md` — closure verification, companion re-checks, index staleness.

Two are merge-only:

- `references/merge-divergences.md` — what goes wrong on a merge specifically: what retires, figure inflation, correction resurrection, edge under-repair, batch stakes, reversibility.
- `references/scaffolded-sources.md` — merging shards a scaffolded split wrote.
