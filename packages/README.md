# @acmelabs/composition

Core composition library providing the `CompositionAdapter` interface and implementations for markdown-based knowledge artifacts (ADRs, PLANs, SPECs).

## Structure

```
src/
  core/          # types, adapter interface, base class, utilities
  adapters/      # per-artifact adapter implementations
schemas/
  distribution/  # Zod schemas for distribution plans
  composition/   # Zod schemas for composition plans
tests/
  fixtures/      # sample artifact files + plan YAML
```

## DoD gates

```bash
bun install
bun test
biome check .
```

## /decompose and /recompose skills (SPEC-005)

The composition library exposes two CLI entry points consumed by the `/decompose`
and `/recompose` Claude Code skills:

- `src/decompose.ts` — load + validate a distribution plan YAML, dispatch to the
  source-type adapter, write N destination files with SHA-256 round-trip
  validation per ADR-001 F-8.
- `src/recompose.ts` — load + validate a composition plan YAML, dispatch to the
  source-type adapter, write 1 merged destination file with the same SHA-256
  guarantee.

### Plan YAML format

Distribution (1-to-N):

```yaml
plan_type: distribution
source_type: adr            # adr | analysis | session | plan | spec
source_path: <relative-or-absolute-path>
renumber_map:               # injective (no duplicate values)
  D-1: D-100
  D-2: D-101
wikilink_map: {}            # optional
clusters:                   # optional partitioning declaration
  cluster_a:
    description: ...
    destination_path: <path>
```

Composition (N-to-1):

```yaml
plan_type: composition
source_type: adr
target_path: <relative-or-absolute-path>
sources:                    # optional; if omitted, target_path acts as sole source
  - <path-a>
  - <path-b>
renumber_map:
  D-100: D-1
wikilink_map: {}
```

All non-absolute paths in a plan YAML are resolved relative to the directory of
the plan YAML file itself.

### Usage

```bash
bun run src/decompose.ts --plan docs/_restructure/decompose-foo-plan.yaml
bun run src/recompose.ts --plan docs/_restructure/recompose-bar-plan.yaml
```

Exit codes: `0` success, `1` validation error (Zod / argv / missing file),
`2` SHA-256 hash mismatch (round-trip identity failed — investigate adapter).

## Inbound-reference impact scanning

`src/reference-scan.ts` answers the question decompose and recompose do not:
which notes POINT AT the notes an operation is about to move. The hash proofs
cover the bytes that move; this covers the edges left behind.

```bash
# Plan time — enumerate the blast radius.
bun run src/reference-scan.ts --docs-root <docs> --targets targets.json --out impact.json
bun run src/reference-scan.ts --docs-root <docs> --target analysis/ANALYSIS-034-x.md

# Execution time — prove the repointing landed.
bun run src/reference-scan.ts --check --manifest impact.json --retain retain.json
```

Three legs feed the manifest, tagged per entry via `source`:

- **TEXT** — prose scan. Classes: `wikilink`, `wikilink-malformed` (colon-less
  or filename-stem near-miss), `permalink`, `permalink-project-prefixed`,
  `entity-id-section` (with the cited fragment captured), `entity-id`.
  Overlapping forms are reported once — a bare ID nested in a wikilink is not
  counted twice.
- **GRAPH** — Relations traversal. Under the bi-directional rule a note's own
  Relations section is a formal index of what references it, so traversal finds
  inbound edges no text scan of the target could surface. One-way edges are
  reported as `bidirectional-missing-on-target` and
  `bidirectional-missing-on-referencer`, each carrying `relation.counterpartFile`
  naming where the missing inverse belongs. `BOTH` marks a text match that
  landed on the formal edge itself.
- **SEARCH** — supplied by the caller via `--merge` for descriptive prose that
  names a note without naming its identifier, plus `index-stale` rows. This
  library makes no search calls. Each entry may carry `mode`
  (`auto` | `semantic` | `keyword` | `hybrid`) recording how it was found, since
  the modes differ sharply in precision and in health. Merged entries are forced
  `source: SEARCH` and `advisory: true`; advisory entries never gate closure.

Relations parsing handles the H3-grouped form (`### contains` with bare entries
beneath it) as well as the flat `- verb [[Target]]` form. Relations carry no
hard maximum — the H3 requirement above twelve is a formatting rule, not a cap.

The `targets.json` shape carries the aliases the scanner will not infer:

```json
[
  {
    "path": "analysis/ANALYSIS-033-independent-pass-reconciliation.md",
    "aliasTitles": ["ANALYSIS-028: Independent Pass Reconciliation"],
    "aliasPermalinks": ["analysis/analysis-028-independent-pass-reconciliation"],
    "aliasEntityIds": []
  }
]
```

Closure checking reports each prior finding as `UPDATED`, `RETAINED` or
`OUTSTANDING`. Retention is caller-owned: `retain.json` is an array of partial
matchers over `referencingFile` / `target` / `class` / `matchedText`, and an
unconstrained rule is refused rather than retaining everything.

Exit codes: `0` success (in scan mode this includes finding references —
findings are the answer, not a failure), `1` validation error, `2` check mode
only, closure not reached.

The scan is read-only over the docs tree; the only file it writes is `--out`.

### Error format

`PlanValidationError` is emitted to stderr as a single JSON line:

```json
{"error":"PlanValidationError","message":"...","issues":[{"path":"renumber_map","message":"..."}]}
```

The skill orchestration layer (`/decompose`, `/recompose`) parses this output
and surfaces the structured issues back to the user.
