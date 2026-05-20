---
title: 'DESIGN-001-SPEC-004: SPEC Subtree Adapter Architecture'
type: design
status: DRAFT
permalink: specs/spec-004-spec-subtree-adapter/design/design-001-spec-004-spec-subtree-adapter-architecture
tags:
- design
- spec-004
- architecture
- spec-subtree
---

# DESIGN-001-SPEC-004: SPEC Subtree Adapter Architecture

## Requirements Addressed

- REQ-001-SPEC-004 SPEC Subtree Adapter Implementation: defines the recursive multi-file orchestration pattern
- REQ-004-SPEC-004 Per-File Hash Validation: defines the per-file validation orchestration within the adapter

## Design Overview

The SpecSubtreeAdapter is a standalone class implementing CompositionAdapter (not extending BaseMarkdownAdapter). It accepts a subtree_manifest from the plan YAML and orchestrates per-file processing across the SPEC root and all child files. The adapter separates two concerns: (1) per-file content operations (parse, extract, mutate, reverse-mutate, serialize) which reuse the same string-level logic as BaseMarkdownAdapter, and (2) subtree orchestration (manifest iteration, per-file hash coordination, cluster-level atomic write, filename rewrite) which is unique to SPEC subtrees.

The adapter internally composes with the shared sha256() utility and the atomic write helpers (stage, rename, cleanup) from SPEC-001 core. It does NOT inherit from BaseMarkdownAdapter because the orchestration logic (iterate manifest, coordinate per-file hash, rollback cluster) is fundamentally different from single-file adapters.

## Component Architecture

### Component 1: SpecSubtreeAdapter

**Purpose**: Implements CompositionAdapter for source_type "spec" with recursive multi-file orchestration.

**Definition**:

```typescript
import type { CompositionAdapter, MutationSpec, LineRange } from "../core/types";
import type { Root } from "mdast";
import type { SpecSubtreeManifest } from "../../schemas/distribution/spec.plan.schema";

class SpecSubtreeAdapter implements CompositionAdapter {
  readonly sourceType = "spec";

  parse(content: string): Root { /* unified + remark pipeline */ }
  extractByRange(content: string, range: LineRange): string { /* line extraction */ }
  applyMutations(content: string, mutations: MutationSpec): string { /* forward mutations */ }
  reverseMutations(content: string, mutations: MutationSpec): string { /* inverse mutations */ }
  serialize(ast: Root): string { /* remark-stringify */ }

  /** Orchestrate full subtree decompose/recompose. */
  processSubtree(manifest: SpecSubtreeManifest): ProcessResult { /* coordination */ }
}
```

**Responsibilities**:
- Implements 5-method CompositionAdapter interface for per-file content operations
- Provides processSubtree() method for manifest-driven orchestration
- Coordinates per-file hash validation across all subtree files
- Manages cluster-level atomic write and rollback

**Interfaces**:
- Consumed by: composition script (decompose.ts / recompose.ts) via adapter dispatch
- Composes with: sha256() from core/hash.ts, stage/rename/cleanup from core/atomic-write.ts

### Component 2: SubtreeOrchestrator (internal)

**Purpose**: Manages the per-file iteration, hash coordination, and cluster-level atomicity.

**Definition**:

```typescript
interface ProcessResult {
  success: boolean;
  filesProcessed: number;
  errors: Array<{ filePath: string; expected: string; actual: string }>;
}

/** Internal orchestration — not part of the public CompositionAdapter interface. */
function orchestrateSubtree(
  adapter: SpecSubtreeAdapter,
  manifest: SpecSubtreeManifest,
  readFile: (path: string) => string,
  writeTemp: (path: string, content: string) => string,
): ProcessResult;
```

**Responsibilities**:
- Iterates manifest entries (root first, then children in order)
- For each entry: read source, extract, apply mutations, stage to .tmp
- After all files staged: run per-file hash validation
- On all-pass: rename all .tmp to destinations, apply filename rewrites
- On any-fail: cleanup all .tmp files, return error details

### Component 3: FrontmatterMutator (internal)

**Purpose**: Handles YAML frontmatter field-level mutations and their inverses.

**Definition**:

```typescript
function applyFrontmatterMap(content: string, map: Record<string, string>): string;
function reverseFrontmatterMap(content: string, map: Record<string, string>): string;
```

**Responsibilities**:
- Parses YAML frontmatter block (between --- delimiters)
- Replaces specified field values without disturbing other fields
- Computes inverse by swapping keys and values in the map
- Handles quoted and unquoted YAML string values

## Technology Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Inheritance | Composition over inheritance (no BaseMarkdownAdapter extension) | Multi-file orchestration is fundamentally different from single-file pattern |
| Frontmatter parsing | Line-level regex targeting specific YAML keys | Avoids full YAML parse/serialize round-trip that could alter whitespace |
| Orchestration pattern | Two-phase: stage-all then validate-all | Enables cluster-level rollback; validates after all files written |

## Security Considerations

- All dest_path values in subtree_manifest are validated by containedPathSchema before any file I/O
- Filename rewrite paths are similarly validated to prevent path traversal via crafted filename_rewrite_map entries
- Temporary files use unpredictable suffixes to prevent TOCTOU attacks

## Testing Strategy

- Unit tests for FrontmatterMutator (apply + reverse round-trip)
- Unit tests for SubtreeOrchestrator with mock filesystem
- Integration test via round-trip property test (REQ-006-SPEC-004)
- Edge case tests: empty children array, single-child subtree, child with no filename_rewrite_map

## Open Questions

None. All design choices locked by ADR-002 D-1 through D-5 and Considered Options Axis 2.

## Observations

- [design] SpecSubtreeAdapter uses composition over inheritance; does not extend BaseMarkdownAdapter due to fundamentally different multi-file orchestration pattern #architecture #composition
- [technique] Two-phase orchestration (stage-all then validate-all) enables cluster-level rollback on single-file hash mismatch #orchestration #atomicity
- [decision] Frontmatter mutation uses line-level regex targeting specific YAML keys to avoid full YAML parse/serialize whitespace alteration #frontmatter #char-identity
- [technique] SubtreeOrchestrator is an internal function, not part of the public CompositionAdapter interface; keeps the adapter interface clean while handling orchestration complexity #internal #separation

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- implements [[REQ-001-SPEC-004: SPEC Subtree Adapter Implementation]]
- implements [[REQ-004-SPEC-004: Per-File Hash Validation]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]