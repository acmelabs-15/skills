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
