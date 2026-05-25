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

### Error format

`PlanValidationError` is emitted to stderr as a single JSON line:

```json
{"error":"PlanValidationError","message":"...","issues":[{"path":"renumber_map","message":"..."}]}
```

The skill orchestration layer (`/decompose`, `/recompose`) parses this output
and surfaces the structured issues back to the user.
