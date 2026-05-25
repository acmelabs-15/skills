---
title: 'REQ-004-SPEC-004: Per-File Hash Validation'
type: requirement
status: ACCEPTED
permalink: specs/spec-004-spec-subtree-adapter/requirements/req-004-spec-004-per-file-hash-validation
tags:
- requirement
- spec-004
- hash-validation
- per-file
---

# REQ-004-SPEC-004: Per-File Hash Validation

## Requirement Statement

WHEN the SPEC subtree adapter has written all destination files (root + children) to temporary paths and applied all mutations,
THE SYSTEM SHALL compute SHA-256 hashes independently for each file by extracting destination content, applying reverseMutations (inverse renumber_map + inverse wikilink_map + inverse frontmatter_map), and comparing the resulting hash against the source extraction hash,
SO THAT content drift is detected at per-file granularity and a single-file mismatch triggers full-cluster rollback.

## Pattern

Event-Driven (triggered after all files in the SPEC subtree have been written to .tmp paths).

## Priority

P0 -- per-file hash validation is the BLOCKING integrity invariant per ADR-001 F-8.

## Category

Non-Functional (Integrity)

## Context

ADR-002 Considered Options Axis 2 selected per-file hash validation over per-subtree hash validation for the SPEC adapter. Per-file validation pinpoints exactly which file has drift, aligns with the per-file write-to-temp-then-rename rollback mechanism from ADR-001 F-8, and composes naturally: the same hash protocol that works for ADR/ANALYSIS/SESSION (single-file) works for each file in the SPEC subtree.

The hash protocol for each file follows ADR-002 D-4 SPEC subtree extraction strategy: (1) extract source content S (full file, line_range start=1 end=-1), (2) extract destination content D after mutations, (3) apply reverseMutations to D producing D-prime (inverse renumber + inverse wikilink + inverse frontmatter_map), (4) compare SHA-256(S) === SHA-256(D-prime). A mismatch on ANY file triggers ROLLBACK of the ENTIRE cluster (all .tmp files removed).

The frontmatter_map inverse is critical: without reversing frontmatter mutations before hash comparison, every file with a changed title or permalink would fail validation.

## Acceptance Criteria

- [ ] Given a SPEC subtree with 1 root + N children (total N+1 files), when hash validation runs, then N+1 independent SHA-256 comparisons are performed (one per file)

- [ ] Given a child REQ file where reverseMutations correctly inverts all renumber_map + wikilink_map + frontmatter_map mutations, when SHA-256 is computed on the reverse-mutated content, then it matches the SHA-256 of the original source extraction

- [ ] Given a child TASK file where applyMutations introduced a non-reversible change (content drift), when SHA-256 comparison fails, then the error message identifies the specific file path that failed

- [ ] Given a SHA-256 mismatch on any single file in the subtree, when the rollback is triggered, then ALL .tmp files for the entire cluster are removed and no destination files are written

- [ ] Given all N+1 files pass hash validation, when the atomic rename phase executes, then all .tmp files are renamed to their destination paths in sequence

## Implementation Notes

The per-file hash validation reuses the shared sha256() utility from shared/composition/src/core/hash.ts (established in SPEC-001 REQ-003-SPEC-001). The validation orchestration iterates the subtree_manifest entries (root first, then children), computing and comparing hashes. If any comparison fails, the iteration short-circuits and triggers cleanup of all .tmp files. Error reporting includes the file path, expected hash, actual hash, and a diff hint (first N characters where content diverges).

## Observations

- [requirement] Per-file hash validation provides granular drift detection across all files in a SPEC subtree #hash-validation #per-file
- [decision] Per-file selected over per-subtree per ADR-002 Axis 2; pinpoints drifting file and aligns with per-file atomic write #architecture #granularity
- [constraint] Single-file mismatch triggers full-cluster rollback per ADR-001 F-8; no partial writes permitted #rollback #blocking
- [technique] Reuses shared sha256() utility from SPEC-001 REQ-003-SPEC-001; consistent hash implementation across all adapters #reuse #consistency

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- implements [[ADR-001: Composition Library Architecture]]
- depends_on [[REQ-001-SPEC-004: SPEC Subtree Adapter Implementation]]
- depends_on [[REQ-002-SPEC-004: Frontmatter Map Mutations]]
- depends_on [[REQ-003-SPEC-001: SHA-256 Hash Utility]]
