---
title: 'SPEC-004: SPEC Subtree Adapter'
type: spec
status: DONE
date: 2026-05-19
permalink: specs/spec-004-spec-subtree-adapter/spec-004-spec-subtree-adapter
tags:
- spec
- spec-subtree
- adapter
- composition
- hardest
---

# SPEC-004: SPEC Subtree Adapter

## Context

This SPEC implements the SPEC subtree adapter for the composition library. The SPEC subtree adapter is the HARDEST adapter (~500 LOC delta per KICKOFF-BRIEF.md) because it operates on an entire subtree (root note + child directories containing REQ, DESIGN, and TASK notes) rather than a single file. It realizes the SPEC-specific decisions from ADR-002: D-1 (subtree_manifest in plan YAML), D-2 (MutationSpec frontmatter_map), D-3 (SPEC subtree distinct implementation in capability matrix), and D-4 (per-file hash validation strategy). The adapter does NOT extend BaseMarkdownAdapter (per ADR-002 D-3) due to its fundamentally different multi-file orchestration pattern.

Complexity is driven by: recursive file enumeration via subtree_manifest, per-child entity identifier renumber, filename rewrite via filesystem rename, frontmatter mutations (title + permalink) with inverse for hash validation, intra-spec relation preservation, cross-spec relation rewriting, and per-file SHA-256 hash validation with full-cluster rollback on any single-file mismatch. SPEC clustering source is ANALYSIS-001 Finding 4 (split from original SPEC-003 Complex Adapters per user adjudication).

## Scope

### In Scope

The following requirements are addressed by this SPEC:

- SPEC subtree adapter implementing CompositionAdapter 5-method interface with recursive multi-file orchestration (REQ-001)
- Frontmatter map mutations (title + permalink) with inverse for hash validation (REQ-002)
- Filename rewrite per child via filesystem rename after hash-validated atomic write (REQ-003)
- Per-file hash validation across all subtree files with cluster-level rollback (REQ-004)
- specSubtreeManifestSchema Zod validator with root/children structure (REQ-005)
- Round-trip property test proving zero drift across full SPEC subtree decompose-recompose cycle (REQ-006)

### Out of Scope

- Core composition library (SPEC-001)
- ANALYSIS and SESSION adapters (SPEC-002)
- PLAN adapter (SPEC-003)
- /decompose and /recompose skill entry points (SPEC-005)
- /defrag and /ingest higher-level skills (SPEC-006)

## Acceptance Criteria

- [ ] SpecSubtreeAdapter compiles with tsc strict mode implementing CompositionAdapter interface
- [ ] Per-file hash validation passes for all files in test fixture subtree (4+ files)
- [ ] Frontmatter mutations (title, permalink) are reversible for hash comparison
- [ ] Filename rewrites execute after hash validation with rollback on failure
- [ ] specSubtreeManifestSchema validates valid manifests and rejects non-injective maps + path traversal
- [ ] Round-trip property test passes: per-file SHA-256(original) === SHA-256(recomposed) for entire subtree
- [ ] All 7 TASKs reach DONE via /build per-TASK cycle

## Phases

### Phase 1: Adapter Core and Schemas

Establishes the adapter skeleton and Zod validation.

#### Requirements

- [ ] REQ-001-SPEC-004: SPEC Subtree Adapter Implementation
- [ ] REQ-005-SPEC-004: SPEC Subtree Manifest Zod Schema

#### Design

- [ ] DESIGN-001-SPEC-004: SPEC Subtree Adapter Architecture

#### Tasks

- [ ] TASK-001-SPEC-004: Implement SPEC Subtree Adapter Recursive Base (M, 2d)
- [ ] TASK-005-SPEC-004: Implement specSubtreeManifestSchema Zod Validator (S, 1d)

### Phase 2: Mutation Handlers

Implements frontmatter and filename mutation capabilities.

#### Requirements

- [ ] REQ-002-SPEC-004: Frontmatter Map Mutations
- [ ] REQ-003-SPEC-004: Filename Rewrite Per Child

#### Design

- [ ] DESIGN-002-SPEC-004: Filename Rewrite Coordination

#### Tasks

- [ ] TASK-002-SPEC-004: Implement Frontmatter Map Handler (S, 1d)
- [ ] TASK-003-SPEC-004: Implement Filename Rewrite Handler (S, 1d)

### Phase 3: Hash Validation and PROOF

Implements per-file hash validation and the round-trip property test that proves zero drift.

#### Requirements

- [ ] REQ-004-SPEC-004: Per-File Hash Validation
- [ ] REQ-006-SPEC-004: SPEC Subtree Adapter Round-Trip Property Test

#### Design

- [ ] DESIGN-003-SPEC-004: Per-File Hash Validation Strategy

#### Tasks

- [ ] TASK-004-SPEC-004: Implement Per-File Hash Validation Orchestration (M, 2d)
- [ ] TASK-006-SPEC-004: SPEC Subtree Test Fixtures (S, 1d)
- [ ] TASK-007-SPEC-004: SPEC Adapter Round-Trip Property Test (M, 2d)

## Effort Summary

| Phase | Tasks | Size (S / M / L) | AI-Dominant |
|:--|:--|:--|:--|
| Phase 1: Adapter Core and Schemas | 2 | 1 / 1 / 0 | 3d |
| Phase 2: Mutation Handlers | 2 | 2 / 0 / 0 | 2d |
| Phase 3: Hash Validation and PROOF | 3 | 1 / 2 / 0 | 5d |
| **Total** | **7** | **4 / 3 / 0** | **10d** |

## Estimate Summary

| Phase | Human | AI-Dominant | AI-Assisted |
|:--|:--|:--|:--|
| Phase 1: Adapter Core and Schemas | 8d | 3d | 4.5d |
| Phase 2: Mutation Handlers | 4d | 2d | 3d |
| Phase 3: Hash Validation and PROOF | 18d | 5d | 8.5d |
| **Total** | **30d** | **10d** | **16d** |

## Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Frontmatter YAML quoting variations break char-identity | Medium | High | Line-level regex targeting specific keys avoids full YAML round-trip |
| Large SPEC subtrees (30+ files) cause slow test execution | Low | Low | SHA-256 is sub-millisecond per file; 30 files under 50ms total |
| Filename rewrite mid-sequence failure leaves partial state | Medium | High | Pre-flight validation + LIFO rollback per DESIGN-002-SPEC-004 |
| remark-stringify whitespace normalization breaks round-trip | Medium | High | Configure remark to preserve formatting; caught by round-trip property test |

## ADR Cross-cutting Constraints

| ADR | Constraint | How honored in this SPEC |
|---|---|---|
| ADR-001 F-6 | Bun + TS runtime with Bun-native APIs | All source files use Bun.file/Bun.write/Bun.hash; biome for lint |
| ADR-001 F-8 | SHA-256 char-identity hash check is BLOCKING | REQ-004 (per-file hash), REQ-006 (round-trip test), all TASKs validate |
| ADR-001 D-1 | Zod for plan validation | REQ-005 (specSubtreeManifestSchema), TASK-005 |
| ADR-001 D-2 | unified + remark for markdown AST | TASK-001 (adapter parse/serialize uses unified pipeline) |
| ADR-002 D-1 | Plan YAML schema with subtree_manifest | REQ-005, TASK-005 (schema), TASK-006 (fixtures) |
| ADR-002 D-2 | CompositionAdapter 5-method interface + frontmatter_map | REQ-001 (interface), REQ-002 (frontmatter_map), TASK-001/TASK-002 |
| ADR-002 D-3 | SPEC subtree distinct implementation | REQ-001 (not BaseMarkdownAdapter), DESIGN-001 (architecture) |
| ADR-002 D-4 | Per-file hash extraction for SPEC subtree | REQ-004, DESIGN-003, TASK-004 |
| ADR-002 D-5 | Modular Zod validator with specSubtreeManifestSchema | REQ-005, TASK-005 |

## Progress Log

| Date | Update | TASK | Session |
|---|---|---|---|

## Observations

- [outcome] SPEC-004 DONE as of 2026-05-21: all 12 TASKs (7 original + 5 gap) DONE, 6 REQs ACCEPTED, 3 DESIGNs ACCEPTED #spec #closure
- [decision] SPEC-004 authored on 2026-05-19 covering 6 REQs + 3 DESIGNs + 7 TASKs; 5 gap-TASKs (008-012) added post retro-validation #spec #provenance
- [decision] Cluster source from ANALYSIS-001 Finding 4 (split from SPEC-003 per user adjudication) #provenance #clustering
- [constraint] This is the HARDEST adapter (~500 LOC delta) with recursive multi-file scope, frontmatter mutations, filename rewrites, and per-file hash validation #complexity #hardest
- [constraint] SpecSubtreeAdapter does NOT extend BaseMarkdownAdapter per ADR-002 D-3; distinct implementation due to multi-file orchestration #architecture #distinct
- [insight] Estimated 10d AI-Dominant effort for ~500 LOC including adapter, schemas, fixtures, and round-trip test #effort #estimation
- [risk] Frontmatter YAML quoting variations and remark whitespace normalization are the two primary char-identity risk vectors; mitigated by line-level regex and round-trip test #risk #char-identity

## Relations

- implements [[ADR-001: Composition Library Architecture]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- relates_to [[ANALYSIS-001: SPEC Clustering]]
- relates_to [[SPEC-001: Composition Core and ADR Adapter]]
- part_of [[PLAN-001: Skills Ecosystem]]
- contains [[REQ-001-SPEC-004: SPEC Subtree Adapter Implementation]]
- contains [[REQ-002-SPEC-004: Frontmatter Map Mutations]]
- contains [[REQ-003-SPEC-004: Filename Rewrite Per Child]]
- contains [[REQ-004-SPEC-004: Per-File Hash Validation]]
- contains [[REQ-005-SPEC-004: SPEC Subtree Manifest Zod Schema]]
- contains [[REQ-006-SPEC-004: SPEC Subtree Adapter Round-Trip Property Test]]
- contains [[DESIGN-001-SPEC-004: SPEC Subtree Adapter Architecture]]
- contains [[DESIGN-002-SPEC-004: Filename Rewrite Coordination]]
- contains [[DESIGN-003-SPEC-004: Per-File Hash Validation Strategy]]
- contains [[TASK-001-SPEC-004: Implement SPEC Subtree Adapter Recursive Base]]
- contains [[TASK-002-SPEC-004: Implement Frontmatter Map Handler]]
- contains [[TASK-003-SPEC-004: Implement Filename Rewrite Handler]]
- contains [[TASK-004-SPEC-004: Implement Per-File Hash Validation Orchestration]]
- contains [[TASK-005-SPEC-004: Implement specSubtreeManifestSchema Zod Validator]]
- contains [[TASK-006-SPEC-004: SPEC Subtree Test Fixtures]]
- contains [[TASK-007-SPEC-004: SPEC Adapter Round-Trip Property Test]]
- contains [[TASK-008-SPEC-004: Add Adapters Barrel and Align sourceType to spec]]
- contains [[TASK-009-SPEC-004: Implement Filename Rewrite Unit Tests and Path Containment]]
- contains [[TASK-010-SPEC-004: Add DESIGN Fixture and Composition Plan YAML]]
- contains [[TASK-011-SPEC-004: Align Schema Shape to ADR-002 D-5 and REQ-005 AC]]
- contains [[TASK-012-SPEC-004: Align Adapter Orchestration to DESIGN-001 and DESIGN-003]]
- validated_by [[QA-027-SPEC-004: Spec-Aggregate Retro-Validation]]
- validated_by [[QA-034-SPEC-004: Task 009 Filename Rewrite Tests Revalidation]]
- validated_by [[QA-035-SPEC-004: Task 010 Design Fixture Revalidation]]
- validated_by [[QA-036-SPEC-004: TASK-008 Barrel and sourceType Alignment Revalidation]]
- validated_by [[QA-037-SPEC-004: TASK-011 Schema Shape Revalidation]]
- validated_by [[QA-038-SPEC-004: TASK-012 Orchestrator Revalidation]]
