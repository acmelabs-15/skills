---
title: 'DESIGN-003-SPEC-004: Per-File Hash Validation Strategy'
type: design
status: ACCEPTED
permalink: specs/spec-004-spec-subtree-adapter/design/design-003-spec-004-per-file-hash-validation-strategy
tags:
- design
- spec-004
- hash-validation
- strategy
---

# DESIGN-003-SPEC-004: Per-File Hash Validation Strategy

## Requirements Addressed

- REQ-004-SPEC-004 Per-File Hash Validation: defines the per-file SHA-256 validation orchestration with cluster-level rollback

## Design Overview

The per-file hash validation strategy implements ADR-002 D-4 SPEC subtree extraction approach. Each file in the subtree (root + children) is independently hash-validated using the same 4-step protocol used by single-file adapters, but coordinated at the cluster level with atomic rollback semantics.

The validation runs in a collect-then-validate pattern: all files are first staged to .tmp paths with mutations applied, then a validation pass iterates all staged files computing reverse-mutation hashes. This separation enables the cluster-level rollback invariant (single failure removes ALL .tmp files) without requiring filesystem transactions.

## Component Architecture

### Component 1: PerFileHashValidator

**Purpose**: Validates SHA-256 char-identity for each file in the subtree after mutations.

**Definition**:

```typescript
interface HashValidationEntry {
  filePath: string;
  sourceHash: string;       // SHA-256 of original source extraction
  reversedHash: string;     // SHA-256 of reverse-mutated destination content
  match: boolean;
}

interface HashValidationResult {
  allPass: boolean;
  entries: HashValidationEntry[];
  firstFailure: HashValidationEntry | null;
}

function validateSubtreeHashes(
  adapter: SpecSubtreeAdapter,
  manifest: SpecSubtreeManifest,
  sourceContents: Map<string, string>,    // original file contents by path
  stagedContents: Map<string, string>,    // mutated file contents by .tmp path
): HashValidationResult;
```

**Responsibilities**:

- Iterates manifest entries (root + children)
- For each entry: extract source content, extract staged (mutated) content
- Apply reverseMutations (inverse renumber_map + inverse wikilink_map + inverse frontmatter_map) to staged content
- Compute SHA-256 of source extraction and SHA-256 of reverse-mutated staged content
- Compare hashes; record per-file result
- Short-circuit on first failure (optimization; all entries still reported for diagnostics)

### Component 2: ClusterRollback

**Purpose**: Removes all .tmp files and any partially-written destination files on validation failure.

**Definition**:

```typescript
function rollbackCluster(
  stagedPaths: string[],         // .tmp file paths to remove
  renamedPaths: string[],        // destination paths already renamed (empty if validation fails before rename phase)
): void;
```

**Responsibilities**:

- Removes all .tmp files unconditionally
- If any destination files were already renamed (failure during rename phase), removes those too
- Logs each cleanup action for audit trail
- Never throws; swallows filesystem errors during cleanup (best-effort)

## Algorithms

The 4-step hash protocol per file:

```text
Step 1: S = sourceContents.get(entry.source_path)
Step 2: D = stagedContents.get(entry.tmp_path)   // content after applyMutations
Step 3: D' = adapter.reverseMutations(D, entry.mutations)  // inverse maps applied
Step 4: compare sha256(S) === sha256(D')
```

For frontmatter_map reversal (Step 3), the inverse is computed by swapping keys and values of the frontmatter_map record. This ensures that title "SPEC-003: Brain Reorg" maps back to "SPEC-001: Brain" before hash comparison.

## Data Flow

```text
Source files (read at plan execution start)
  -> sourceContents Map
  -> per-file: extractByRange + applyMutations -> staged content
  -> stagedContents Map (written to .tmp files)
  -> validateSubtreeHashes(adapter, manifest, sourceContents, stagedContents)
  -> if allPass: rename all .tmp to destinations -> applyFilenameRewrites
  -> if !allPass: rollbackCluster(stagedPaths, []) -> abort with error details
```

## Edge Cases

| Case | Behavior |
|---|---|
| Empty children array (SPEC root only) | Single file validated; cluster size = 1 |
| Very large subtree (30+ children) | Iteration completes; SHA-256 is sub-millisecond per file; no performance concern |
| Source file changed between plan creation and execution | source.sha256 in plan YAML pre-check catches this before adapter runs |
| Frontmatter_map has no entries | No frontmatter reversal needed; hash compares content as-is |

## Performance Considerations

SHA-256 on note-sized files (1-100 KB each) is sub-millisecond. For a typical SPEC subtree of 20 files, total hash validation time is under 20 milliseconds. The collect-then-validate pattern adds one full iteration over staged files but eliminates the need for per-file rollback checkpoints.

## Security Considerations

- Source hashes in the plan YAML are pre-validated before any mutations (guards against source modification between plan creation and execution)
- Cleanup never exposes partial state; either all files land or none do

## Testing Strategy

- Unit test: per-file hash validation with mock source and staged contents
- Unit test: cluster rollback removes all .tmp files on failure
- Unit test: frontmatter_map reversal produces correct inverse
- Integration test: SPEC subtree round-trip via REQ-006-SPEC-004

## Open Questions

None. Per-file validation selected per ADR-002 Axis 2; cluster rollback per ADR-001 F-8.

## Observations

- [design] Collect-then-validate pattern stages all files before running hash validation; enables cluster-level rollback without filesystem transactions #orchestration #pattern
- [technique] Per-file hash validation reuses the same 4-step protocol as single-file adapters with frontmatter_map inverse as the SPEC-specific addition #reuse #consistency
- [decision] Short-circuit on first failure with all entries still reported provides both fast feedback and full diagnostics #error-reporting #optimization
- [constraint] Cluster rollback is best-effort cleanup; never throws during cleanup to avoid masking the original validation error #rollback #resilience

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- implements [[REQ-004-SPEC-004: Per-File Hash Validation]]
- depends_on [[DESIGN-001-SPEC-004: SPEC Subtree Adapter Architecture]]
- implements [[ADR-001: Composition Library Architecture]]
