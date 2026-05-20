---
title: 'REQ-003-SPEC-004: Filename Rewrite Per Child'
type: requirement
status: DRAFT
permalink: specs/spec-004-spec-subtree-adapter/requirements/req-003-spec-004-filename-rewrite-per-child
tags:
- requirement
- spec-004
- filename-rewrite
- filesystem
---

# REQ-003-SPEC-004: Filename Rewrite Per Child

## Requirement Statement

WHEN the SPEC subtree adapter processes a child entry from the subtree_manifest that includes a filename_rewrite_map,
THE SYSTEM SHALL rename the destination file from its source filename to the target filename specified in the map after content has been written and hash-validated,
SO THAT child files in the restructured SPEC subtree have filenames consistent with the new SPEC numbering (e.g., REQ-001-SPEC-001-topic.md renamed to REQ-001-SPEC-003-topic.md).

## Pattern

Event-Driven (triggered per child entry in subtree_manifest that contains a non-empty filename_rewrite_map).

## Priority

P1 -- filename rewrite occurs after content write and hash validation; depends on content operations completing first.

## Category

Functional

## Context

ADR-002 D-1 specifies that each child entry in the subtree_manifest may include a filename_rewrite_map (Record of string to string, optional). When a SPEC is renumbered, the filenames of child notes must change to reflect the new SPEC number (e.g., TASK-001-SPEC-001-create-datasource-interface.md to TASK-001-SPEC-003-create-datasource-interface.md).

Filename rewrite is NOT part of content hash validation. The hash protocol (ADR-001 F-8) validates content char-identity. Filename rewrite happens at the filesystem level after content has been written to a temp file, hash-validated, and renamed to the destination path. The filename_rewrite_map provides the final rename step that moves the file from its source-named path to its destination-named path.

The ordering is critical: (1) write content to .tmp file, (2) hash-validate content, (3) rename .tmp to destination path (atomic write per ADR-001 F-8), (4) apply filename_rewrite_map to rename destination to final name. Steps 1-3 are the standard atomic write protocol. Step 4 is SPEC-subtree-specific.

## Acceptance Criteria

- [ ] Given a child entry with filename_rewrite_map {"REQ-001-SPEC-001-injectable-data-source.md": "REQ-001-SPEC-003-injectable-data-source.md"}, when the adapter completes content write and hash validation for that child, then the file is renamed to the target filename

- [ ] Given all files in a SPEC subtree pass hash validation, when filename rewrites are applied, then every child file whose subtree_manifest entry includes a filename_rewrite_map is renamed to its target filename

- [ ] Given a filename rewrite that fails (e.g., target path already exists), when the error is detected, then the entire cluster rollback is triggered per ADR-001 F-8 (all .tmp files and any already-renamed files are reverted)

- [ ] Given a subtree_manifest child entry with no filename_rewrite_map field, when the adapter processes that child, then no filename rename is performed (the file retains its source filename at the destination path)

## Implementation Notes

Filename rewrite is a filesystem rename operation (Bun.file + move or fs.rename). It is separate from the content mutation path to maintain clean separation between content integrity (hash-validated) and filesystem organization (filename convention). The dest_path field in the subtree_manifest child entry already contains the final destination path including the new filename; the filename_rewrite_map provides the explicit old-to-new mapping for audit and reversibility purposes.

## Observations

- [requirement] Filename rewrite via filename_rewrite_map enables child files to match new SPEC numbering convention after restructuring #filename #rewrite
- [constraint] Filename rewrite is NOT part of content hash validation; it occurs after hash-validated atomic write completes #separation #hash-scope
- [decision] Four-step ordering: write .tmp, hash-validate, rename .tmp to dest, apply filename_rewrite_map to final name #ordering #atomicity
- [risk] Filename rewrite failure after content write requires full-cluster rollback including reverting already-renamed files #rollback #complexity

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- depends_on [[REQ-001-SPEC-004: SPEC Subtree Adapter Implementation]]
- depends_on [[REQ-006-SPEC-001: Atomic Write-to-Temp-Then-Rename Rollback]]
