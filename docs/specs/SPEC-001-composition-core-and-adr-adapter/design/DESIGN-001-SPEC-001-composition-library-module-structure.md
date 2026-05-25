---
title: 'DESIGN-001-SPEC-001: Composition Library Module Structure'
type: design
permalink: specs/spec-001-composition-core-and-adr-adapter/design/design-001-spec-001-composition-library-module-structure
status: ACCEPTED
tags:
- design
- spec-001
- module-structure
- composition
---

# DESIGN-001-SPEC-001: Composition Library Module Structure

## Context

This design defines the module layout for the composition library at shared/composition/. It realizes the project structure from KICKOFF-BRIEF.md and the technology stack from ADR-001 (F-6 Bun+TS, D-1 Zod, D-2 unified+remark). The module structure must support incremental adapter addition (SPEC-002 and SPEC-003 add adapters without modifying core modules) and the modular Zod schema layout from ADR-002 D-5.

## Module Structure

```text
shared/composition/
  package.json                 # Bun workspace; deps: zod, unified, remark-parse, remark-stringify, remark-frontmatter, js-yaml
  tsconfig.json                # strict mode; target ES2022; moduleResolution bundler
  biome.json                   # lint + format config
  bunfig.toml                  # Bun config (test runner, etc.)
  src/
    core/
      types.ts                 # LineRange, RenumberMap, WikilinkMap, FrontmatterMap, MutationSpec
      adapter.ts               # CompositionAdapter interface
      base-markdown-adapter.ts # BaseMarkdownAdapter abstract class
      hash.ts                  # sha256(content: string): string via Bun.hash
      atomic-write.ts          # stage(), rename(), cleanup() for write-to-temp-then-rename
      validators.ts            # injectiveDisjointMap(), containedPathSchema()
    adapters/
      adr.ts                   # AdrAdapter extends BaseMarkdownAdapter
  schemas/
    base.ts                    # Common envelope, shared Zod types, composed union export
    distribution/
      adr.plan.schema.ts       # ADR distribution-specific Zod schema
    composition/
      adr.plan.schema.ts       # ADR composition-specific Zod schema
    index.ts                   # Nested discriminated union assembly + re-exports
  tests/
    round-trip.test.ts         # Round-trip property test framework
    adr-adapter.test.ts        # ADR adapter unit + integration tests
    validators.test.ts         # Injectivity + path containment validator tests
    fixtures/
      adr-sample.md            # Realistic ADR fixture for round-trip test
      adr-distribution.plan.yaml  # Fixture plan for ADR decompose
      adr-composition.plan.yaml   # Fixture plan for ADR recompose
```

## Interfaces

```typescript
// Core exports from shared/composition/src/core/
export type { CompositionAdapter } from "./core/adapter";
export type { LineRange, RenumberMap, WikilinkMap, FrontmatterMap, MutationSpec } from "./core/types";
export { sha256 } from "./core/hash";
export { stage, rename, cleanup } from "./core/atomic-write";
export { injectiveDisjointMap, containedPathSchema } from "./core/validators";
export { BaseMarkdownAdapter } from "./core/base-markdown-adapter";

// Adapter exports
export { AdrAdapter } from "./adapters/adr";

// Schema exports
export { planSchema, type Plan } from "./schemas/index";
```

## Algorithms

The module follows a layered architecture. The core/ layer defines the interface contract, shared utilities, and base class. The adapters/ layer provides per-type implementations. The schemas/ layer defines Zod validation schemas. The tests/ layer exercises round-trip properties and unit behavior. Each layer depends only on layers below it (core has no internal deps; adapters depend on core; schemas depend on core types; tests depend on all).

## Data Flow

```text
plan.yaml (input)
  -> schemas/index.ts (Zod parse + validate)
  -> adapters/adr.ts (dispatch via source_type)
  -> core/base-markdown-adapter.ts (parse, extract, mutate)
  -> core/hash.ts (SHA-256 validation)
  -> core/atomic-write.ts (stage .tmp, validate, rename)
  -> destination files (output)
```

## Edge Cases

| Case | Behavior |
| --- | --- |
| Empty renumber_map | No mutations applied; hash should pass trivially (identity) |
| Source file exceeds 1 MB | Rejected at Zod schema level (max_file_size_bytes validation) |
| .tmp file exists from previous crash | Cleaned up before staging new content |
| remark-stringify alters whitespace | Round-trip test fails immediately; must configure remark to preserve formatting |

## Performance Considerations

SHA-256 on note-sized files (typically 1-100 KB) is sub-millisecond. No performance concern for the expected workload. The 1 MB file-size guard prevents degenerate cases.

## Security Considerations

Path containment validator (containedPathSchema) mitigates CWE-22. YAML hardening via FAILSAFE_SCHEMA (or equivalent) with 1 MB max file-size guard mitigates CWE-502 and CWE-400. All validators run before any file I/O.

## Observations

- [design] Layered module structure with core/adapters/schemas/tests supports incremental adapter addition without modifying core #module-structure #layered
- [decision] Single package.json at shared/composition/ root per project layout from KICKOFF-BRIEF.md #project-structure #bun
- [technique] Schema files mirror adapter files enabling per-type extension at both validation and implementation layers #schema-mirroring #extensibility
- [constraint] All dependencies are dev/runtime split: zod + unified + remark + js-yaml are runtime; biome + bun test are dev #dependencies #bun

## Relations

- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[ADR-001: Composition Library Architecture]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
