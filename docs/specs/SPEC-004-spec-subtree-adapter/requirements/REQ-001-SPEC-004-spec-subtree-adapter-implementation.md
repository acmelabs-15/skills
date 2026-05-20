---
title: 'REQ-001-SPEC-004: SPEC Subtree Adapter Implementation'
type: requirement
status: DRAFT
permalink: specs/spec-004-spec-subtree-adapter/requirements/req-001-spec-004-spec-subtree-adapter-implementation
tags:
- requirement
- spec-004
- spec-subtree
- adapter
---

# REQ-001-SPEC-004: SPEC Subtree Adapter Implementation

## Requirement Statement

WHEN the composition library receives a plan YAML with source_type "spec",
THE SYSTEM SHALL dispatch to a SpecSubtreeAdapter that implements the CompositionAdapter 5-method interface and orchestrates recursive multi-file operations across the SPEC root note and all child notes in requirements/, design/, and tasks/ subdirectories,
SO THAT SPEC subtree restructuring (decompose and recompose) achieves zero content drift with per-file hash validation across the entire subtree.

## Pattern

Interface Contract (Event-Driven: triggered when the deterministic script dispatches to SpecSubtreeAdapter via plan YAML source_type "spec" discriminant).

## Priority

P0 -- foundational; defines the adapter that all other SPEC-004 REQs depend on.

## Category

Functional

## Context

ADR-002 D-3 establishes that the SPEC subtree adapter is a distinct implementation (not extending BaseMarkdownAdapter) due to its recursive multi-file scope. Unlike ADR/ANALYSIS/SESSION adapters that operate on a single file, the SPEC adapter operates on an entire subtree: the SPEC root note plus child directories (requirements/, design/, tasks/) containing REQ, DESIGN, and TASK notes. The adapter implements the same CompositionAdapter 5-method interface (parse, extractByRange, applyMutations, reverseMutations, serialize) per ADR-002 D-2, but the orchestration logic wraps these methods around a per-file iteration driven by the subtree_manifest from the plan YAML (ADR-002 D-1).

The SPEC subtree adapter is the HARDEST adapter in the composition library (~500 LOC delta per KICKOFF-BRIEF.md), with complexity driven by: recursive file enumeration, per-child renumber maps, filename rewrites via move_note coordination, frontmatter mutations (title + permalink), intra-spec relation preservation, cross-spec relation rewriting, and per-file hash validation with full-cluster rollback on any single-file mismatch.

## Acceptance Criteria

- [ ] Given a TypeScript file at _shared/composition/src/adapters/spec-subtree.ts, when compiled with tsc strict mode, then the SpecSubtreeAdapter class implements CompositionAdapter with all 5 methods plus readonly sourceType property set to "spec"

- [ ] Given a plan YAML with source_type "spec" and a subtree_manifest containing root and children entries, when the adapter processes the manifest, then it iterates over each file (root + all children) applying per-file mutations independently

- [ ] Given any child file in a SPEC subtree (REQ, DESIGN, or TASK), when the adapter applies mutations, then entity identifier renumber (e.g., REQ-001-SPEC-001 to REQ-001-SPEC-003) is applied via single-pass replacement scoped to that child's content

- [ ] Given the adapter processes a SPEC subtree with N child files, when any single child file fails hash validation, then the entire cluster is rolled back (all .tmp files removed) per ADR-001 F-8 rollback protocol

- [ ] Given a SPEC root note with a Phases section containing wikilinks to child notes, when intra-spec relations are processed, then wikilinks within the same SPEC subtree are rewritten using the wikilink_map from the subtree_manifest while preserving the structural relationship

## Implementation Notes

The SpecSubtreeAdapter lives at _shared/composition/src/adapters/spec-subtree.ts. It does NOT extend BaseMarkdownAdapter because the multi-file orchestration pattern is fundamentally different from single-file adapters. The adapter consumes the subtree_manifest field from the plan YAML (validated by specSubtreeManifestSchema per ADR-002 D-5). Each file in the manifest is processed independently through the 5-method interface, but the orchestration layer coordinates hash validation and atomic write across all files as a single transaction.

## Observations

- [requirement] SpecSubtreeAdapter implements CompositionAdapter 5-method interface with recursive multi-file orchestration across SPEC root + child directories #adapter-contract #spec-subtree
- [decision] Distinct implementation (not extending BaseMarkdownAdapter) per ADR-002 D-3 capability matrix due to recursive subtree scope #architecture #distinct-implementation
- [constraint] Per-file hash validation with full-cluster rollback on single-file mismatch per ADR-001 F-8 + ADR-002 D-4 #hash-validation #rollback
- [fact] Estimated ~500 LOC delta making this the hardest adapter in the composition library per KICKOFF-BRIEF.md #complexity #estimation

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- implements [[ADR-001: Composition Library Architecture]]
- depends_on [[REQ-001-SPEC-001: CompositionAdapter Interface Contract]]
