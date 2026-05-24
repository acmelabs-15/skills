---
title: "DESIGN-001-SPEC-001: Adapter Architecture"
type: design
status: ACCEPTED
permalink: specs/spec-001-composition-core/design/design-001-spec-001-adapter-architecture
tags:
  - design
  - spec-001
  - adapter
  - architecture
---

# DESIGN-001-SPEC-001: Adapter Architecture

## Context

This design defines the module structure and interfaces for the
SpecSubtreeAdapter described in [[REQ-001-SPEC-001: Adapter Interface]].
The adapter composes per-file parse / serialize / mutation operations
across a SPEC subtree (root note plus REQ / DESIGN / TASK children) while
preserving the bit-exact SHA-256 round-trip invariant required by
[[SPEC-001: Composition Core]].

## Module Structure

```text
_shared/composition/src/
  adapters/
    spec-subtree.ts          # SpecSubtreeAdapter class
  core/
    hash.ts                  # sha256 helper used by validateSubtreeRoundTrip
    types.ts                 # MutationSpec, SubtreeManifest interfaces
```

## Interfaces

```typescript
export interface SubtreeManifest {
  rootPath: string;
  rootContent: string;
  children: Array<{
    relativePath: string;
    content: string;
    identifier: string;
  }>;
}

export class SpecSubtreeAdapter {
  readonly sourceType: "spec-subtree";
  applyMutations(content: string, spec: MutationSpec): string;
  reverseMutations(content: string, spec: MutationSpec): string;
  applySubtreeMutations(m: SubtreeManifest, spec: MutationSpec): SubtreeManifest;
  reverseSubtreeMutations(m: SubtreeManifest, spec: MutationSpec): SubtreeManifest;
  validateSubtreeRoundTrip(m: SubtreeManifest, spec: MutationSpec): void;
}
```

## Algorithms

`applySubtreeMutations` applies the mutation spec to the root content and
to every child content independently, returning a new manifest with the
same shape. `reverseSubtreeMutations` inverts the mutation spec via
`invertMap` and re-applies. `validateSubtreeRoundTrip` runs apply then
reverse and asserts per-file SHA-256 equality with the originals; any
mismatch throws `SubtreeHashValidationError` with the offending path.

## Compliance

- [ ] Honors REQ-001-SPEC-001: parse / serialize / extractByRange /
      applyMutations / reverseMutations all implemented
- [ ] Honors REQ-002-SPEC-001: sha256 utility used for per-file hash
      validation
- [ ] Per-file SHA-256 identity asserted in validateSubtreeRoundTrip

## Observations

- [decision] Adapter composes per-file operations; no cross-file state #design #composition
- [constraint] Per-file SHA-256 identity is the correctness invariant #correctness
- [insight] invertMap is lossy on non-injective renumber maps; surfaced as round-trip failure #edge-case

## Relations

- part_of [[SPEC-001: Composition Core]]
- implements [[REQ-001-SPEC-001: Adapter Interface]]
- depends_on [[REQ-002-SPEC-001: Hash Utility]]
