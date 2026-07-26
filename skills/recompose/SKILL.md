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

Identical to `/decompose` (LLM authoring → user adjudication → script execution). Never bypass adjudication.

## Step-by-step instructions

### Step 1: Read the sources

- Identify the N source note paths from the user's request
- Read each via Brain MCP `read_note`
- Confirm all sources share the same `source_type` (frontmatter `type` field). Cross-type recomposition is out of scope; reject if mixed.

### Step 2: Determine merge order, resolve collisions, author the plan

Determine the order in which sources are concatenated, then design a `renumber_map` that unifies identifiers across sources without collisions (per ADR-002 D-1 bijection requirement).

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

### Step 3: Adjudicate via AskUserQuestion

Same three-option flow as `/decompose`: approve, reject with feedback (rename to `recompose-{id}-plan-rejected-{N}.yaml`, refine), or abort.

Summary format:

```markdown
**Sources** (N): `<path-a>`, `<path-b>`, ...
**Target**: `<path>` (source_type: `<adr|analysis|...>`)
**Merge order**: as listed above
**Renumber map** (M entries): D-100→D-1, D-101→D-2, ...
**Wikilink map**: <count> entries
**Raw plan**: `docs/_restructure/recompose-{id}-plan.yaml`
```

### Step 4: Execute on approval

```bash
# SKILLS_DOCS_ROOT activates the realpath containment check (CWE-22).
# Without it the lexical guard still runs, but symlink escapes are not caught.
export SKILLS_DOCS_ROOT="$(pwd)/docs"
bun run shared/composition/src/recompose.ts \
  --plan docs/_restructure/recompose-{id}-plan.yaml --root docs
```

The script:

- Loads with FAILSAFE_SCHEMA
- Validates via `CompositionPlanSchema.parseAsync` (bijection check on `renumber_map`)
- Dispatches via `getAdapter(source_type)`
- Reads each source in declared order, concatenates, applies mutations
- SHA-256-validates the round trip via `reverseMutations`
- Writes the target via temp-then-rename atomic write
- Emits a single JSON-lines audit entry to stdout

Exit codes match `/decompose`: `0` success, `1` validation error, `2` hash mismatch.

### Step 5: Report

Summarize: target file path, list of source paths consumed, target SHA-256, and confirm sources remain unchanged (recompose does not delete sources; that is a follow-up the user can request).

## Error handling

Identical to `/decompose`. `PlanValidationError` → parse issues, re-author. `HashMismatch` → surface loudly. Unknown source_type → report verbatim.

## Constraints

- Same as `/decompose`: no direct content writes by the LLM, mandatory adjudication, no source-type mixing, all paths relative to the plan YAML.
- The composition plan does NOT delete sources after merge. Cleanup is a separate explicit step.


## Scaffolded sources

A shard written by a scaffolded `/decompose` is `prologue + content slice +
epilogue` — the prologue and epilogue are rendered content, not preserved
source. To merge such shards, declare the same scaffold per source so the merge
strips it before joining:

```yaml
sources:
  - path: decisions/ADR-042a.md
    scaffold:
      frontmatter:
        title: "ADR-042a: Cluster A"
        type: decision
        status: ACCEPTED
        permalink: decisions/adr-042a-cluster-a
        tags: [decision]
      observations:
        - category: decision
          text: Cluster A carries the first decision body
          tags: [split]
      relations:
        - verb: part_of
          target: "ADR-042: Parent"
```

A bare path string is still accepted and means "no scaffolding to strip".

The declared scaffold must match the shard's bytes exactly; if it does not, the
merge exits 2 and writes nothing rather than silently folding rendered content
into the merged note. The `/decompose` audit log records the scaffold it applied
for each destination, so a composition plan can be reconstructed from it instead
of re-authored by hand.

**Reversibility.** Scaffolded shards round-trip byte-identically given the same
scaffold. Shards from a plan that used `disposition: retain` do not: retained
content stays in the source and appears in no shard, so a merge over shards
alone cannot reproduce the original.

## Path resolution

Same as `/decompose`: plan paths are relative, `..` is rejected, and `--root`
supplies the base. Pass `--root docs` when the plan sits at
`docs/_restructure/` and its sources live in sibling directories.
