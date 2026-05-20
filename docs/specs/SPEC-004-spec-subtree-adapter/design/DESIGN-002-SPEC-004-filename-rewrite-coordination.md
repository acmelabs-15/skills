---
title: 'DESIGN-002-SPEC-004: Filename Rewrite Coordination'
type: design
status: DRAFT
permalink: specs/spec-004-spec-subtree-adapter/design/design-002-spec-004-filename-rewrite-coordination
tags:
- design
- spec-004
- filename-rewrite
- coordination
---

# DESIGN-002-SPEC-004: Filename Rewrite Coordination

## Requirements Addressed

- REQ-003-SPEC-004 Filename Rewrite Per Child: defines how filename_rewrite_map entries are executed after hash-validated atomic write

## Design Overview

Filename rewrite is a post-validation filesystem operation that runs after all SPEC subtree files have been written to their destination paths via the atomic write protocol. The rewrite coordinates with the hash validation phase by executing strictly AFTER all per-file hashes pass and all .tmp files have been renamed to their destination paths. This ordering ensures that filename rewrite never interferes with content integrity validation.

The design handles the failure mode where a filename rewrite fails mid-sequence (e.g., target filename already exists). In this case, a secondary rollback reverses any already-completed renames and removes all destination files, restoring the filesystem to pre-operation state.

## Component Architecture

### Component 1: FilenameRewriter

**Purpose**: Applies filename_rewrite_map entries from the subtree_manifest after content write completes.

**Definition**:

```typescript
interface RewriteResult {
  success: boolean;
  rewrites: Array<{ from: string; to: string; status: "ok" | "failed" }>;
}

function applyFilenameRewrites(
  manifest: SpecSubtreeManifest,
  destDir: string,
): RewriteResult;

function rollbackFilenameRewrites(
  completedRewrites: Array<{ from: string; to: string }>,
): void;
```

**Responsibilities**:
- Iterates children entries with non-empty filename_rewrite_map
- Renames each file from source name to target name within the destination directory
- Tracks completed rewrites for rollback capability
- On failure: rolls back all completed rewrites in reverse order

**Interfaces**:
- Consumed by: SubtreeOrchestrator (DESIGN-001-SPEC-004) after hash validation pass
- Composes with: Bun filesystem APIs (fs.rename or equivalent)

### Component 2: RewriteValidator (pre-flight)

**Purpose**: Pre-validates all filename rewrites before executing any of them.

**Definition**:

```typescript
function validateFilenameRewrites(
  manifest: SpecSubtreeManifest,
  destDir: string,
): ValidationResult;
```

**Responsibilities**:
- Checks that no target filename already exists at the destination
- Checks that no two rewrites target the same filename (injectivity)
- Checks that target filenames pass path containment validation
- Returns all violations before any rename executes

## Data Flow

```text
SubtreeOrchestrator
  -> all files written to dest paths (atomic write complete)
  -> all per-file hashes PASS
  -> RewriteValidator.validateFilenameRewrites(manifest, destDir)
  -> if validation fails: abort (no rewrites needed; files already at dest paths)
  -> FilenameRewriter.applyFilenameRewrites(manifest, destDir)
  -> if rewrite fails mid-sequence: rollbackFilenameRewrites(completed)
  -> SUCCESS: all files at final filenames
```

## Edge Cases

| Case | Behavior |
|---|---|
| Child entry has no filename_rewrite_map | Skip; file retains its dest_path name |
| Target filename already exists | Pre-flight validation catches; entire operation aborted before any rename |
| Two children target the same filename | Injectivity check in pre-flight catches |
| Filesystem rename fails (permissions) | Rollback completed rewrites in reverse order |

## Security Considerations

- Target filenames validated by path containment (no escape from SPEC directory)
- Pre-flight validation prevents TOCTOU by checking all targets before executing any rename

## Testing Strategy

- Unit test: pre-flight validation rejects duplicate target filenames
- Unit test: pre-flight validation rejects path traversal in target filenames
- Unit test: rollback reverses completed renames on mid-sequence failure
- Integration test: full subtree with 3+ filename rewrites

## Open Questions

None. Ordering (post-hash-validation) and rollback strategy locked by ADR-001 F-8.

## Observations

- [design] Filename rewrite executes strictly after hash validation and atomic write; never interferes with content integrity #ordering #separation
- [technique] Pre-flight validation of all target filenames before executing any rename prevents partial-rewrite states #pre-flight #atomicity
- [decision] Rollback of filename rewrites reverses completed renames in reverse order on mid-sequence failure #rollback #reverse-order
- [constraint] Target filenames validated by path containment to prevent escape from SPEC directory #security #path-containment

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- implements [[REQ-003-SPEC-004: Filename Rewrite Per Child]]
- depends_on [[DESIGN-001-SPEC-004: SPEC Subtree Adapter Architecture]]