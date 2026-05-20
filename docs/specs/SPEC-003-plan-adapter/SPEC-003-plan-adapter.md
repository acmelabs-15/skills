---
title: 'SPEC-003: PLAN Adapter'
type: spec
status: ACCEPTED
permalink: specs/spec-003-plan-adapter/spec-003-plan-adapter
tags:
- spec
- plan-adapter
- composition
- regenerative-content
---

# SPEC-003: PLAN Adapter

## Context

This SPEC implements the PLAN adapter for the composition library. The PLAN adapter is the 4th adapter in the locked build order (per KICKOFF-BRIEF.md) and the first "complex" adapter requiring a distinct implementation rather than a BaseMarkdownAdapter extension. The complexity arises from regenerative content handling: PLAN notes contain derived-view sections (Progress Dashboard, Cross-Part Dependency Graph) that are regenerated from structural content rather than preserved char-identically.

SPEC-003 was split from the original "Complex Adapters" bundle (PLAN + SPEC subtree) per ANALYSIS-001 adjudication outcome on 2026-05-19. The split was recommended because: (a) PLAN and SPEC subtree adapters share zero implementation code (both are distinct implementations per ADR-002 D-3 -- only the CompositionAdapter interface in common), (b) splitting produces two independently-reviewable M-sized SPECs, and (c) they have no dependency between them. SPEC-004 covers the SPEC subtree adapter separately.

This SPEC realizes ADR-002 D-2 (MutationSpec regenerated_sections and frontmatter_map), D-3 (PLAN distinct implementation in the capability matrix), D-4 (PLAN hash extraction strategy with regenerative-section carve-out), and D-5 (PLAN-specific Zod schemas with 50% integrity floor). It also honors ADR-001 F-8 (SHA-256 hash protocol) for all non-regenerative content.

## Scope

### In Scope

The following requirements are addressed by this SPEC:

- PLAN adapter distinct implementation with phase+part-id section extraction (REQ-001)
- Regenerated sections field handling and declarative exclusion from hash validation (REQ-002)
- 50% integrity floor on regenerated sections via Zod refinement and runtime check (REQ-003)
- PLAN frontmatter mutations (branches[], title, permalink) via frontmatter_map (REQ-004)
- PLAN adapter round-trip property test proving zero drift on structural/narrative content (REQ-005)

### Out of Scope

- Composition core library and CompositionAdapter interface (SPEC-001)
- BaseMarkdownAdapter and simple adapters -- ADR, ANALYSIS, SESSION (SPEC-001, SPEC-002)
- SPEC subtree adapter (SPEC-004)
- /decompose and /recompose skill CLI entry points (SPEC-005)
- /defrag and /ingest higher-level skills (SPEC-006)

## Phases

### Phase 1: PLAN Adapter Core (Foundation)

- REQ-001 -- PLAN adapter distinct implementation with 5-method CompositionAdapter interface
- DESIGN-001 -- PLAN adapter architecture
- TASK-001 (implement PLAN adapter base)

### Phase 2: Regenerative Content and Frontmatter

- REQ-002, REQ-003, REQ-004 -- regenerated sections handling, integrity floor, frontmatter mutations
- DESIGN-002 -- regenerated sections mechanism
- TASK-002 (regen sections handler + integrity floor + Zod schemas), TASK-003 (frontmatter mutations)

### Phase 3: PROOF Test

- REQ-005 -- round-trip property test
- TASK-004 (test fixtures), TASK-005 (round-trip property test)

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 5.5d | Sum of TASK Human estimates |
| AI-Dominant | 3.5d | Sum of TASK AI-Dominant estimates (CANONICAL for rollup) |
| AI-Assisted | 3d | Sum of TASK AI-Assisted estimates |

## Success Criteria

- [ ] All 5 REQs reach ACCEPTED via Gate A + Gate B
- [ ] All 5 TASKs reach DONE via /build per-TASK cycle
- [ ] Spec-level QA sweep passes (per /build Stage B)
- [ ] All 4 mandatory exit gates pass (per /build Step 7)
- [ ] Round-trip property test passes: SHA-256(original stripped) === SHA-256(recomposed stripped) with regenerated_sections excluded

## Artifact Status

### Requirements

- [ ] REQ-001-SPEC-003: PLAN Adapter Implementation
- [ ] REQ-002-SPEC-003: Regenerated Sections Field Handling
- [ ] REQ-003-SPEC-003: Fifty Percent Integrity Floor on Regenerated Sections
- [ ] REQ-004-SPEC-003: PLAN Frontmatter Mutations
- [ ] REQ-005-SPEC-003: PLAN Adapter Round-Trip Property Test

### Designs

- [ ] DESIGN-001-SPEC-003: PLAN Adapter Architecture
- [ ] DESIGN-002-SPEC-003: Regenerated Sections Mechanism

### Tasks

- [ ] TASK-001-SPEC-003: Implement PLAN Adapter Base
- [ ] TASK-002-SPEC-003: Implement Regenerated Sections Handler and Integrity Floor
- [ ] TASK-003-SPEC-003: Implement PLAN Frontmatter Mutations
- [ ] TASK-004-SPEC-003: Create PLAN Adapter Test Fixtures
- [ ] TASK-005-SPEC-003: Implement PLAN Adapter Round-Trip Property Test

## ADR Cross-cutting Constraints

| ADR | Constraint | How honored in this SPEC |
| --- | --- | --- |
| ADR-001 F-6 | Bun + TS runtime with Bun-native APIs | All src files use Bun.file/Bun.write/Bun.hash; biome for lint |
| ADR-001 F-8 | SHA-256 char-identity hash check is BLOCKING | REQ-005 round-trip test; hash applies to all non-regenerative content |
| ADR-001 D-1 | Zod for plan validation | TASK-002 implements PLAN-specific Zod schemas with integrity floor |
| ADR-001 D-2 | unified + remark for markdown AST | REQ-001 PlanAdapter uses unified+remark pipeline for parse/serialize |
| ADR-001 D-4 | Discriminated union on source_type | TASK-002 extends schema index.ts with PLAN variant |
| ADR-002 D-2 | CompositionAdapter 5-method interface + MutationSpec | REQ-001 PlanAdapter implements all 5 methods; REQ-002/REQ-004 use MutationSpec extensions |
| ADR-002 D-3 | Per-type capability matrix; PLAN distinct implementation | REQ-001 PlanAdapter is distinct (not BaseMarkdownAdapter extension) |
| ADR-002 D-4 | PLAN hash extraction strategy with regenerative carve-out | REQ-002 regenerated_sections exclusion; REQ-005 round-trip test validates |
| ADR-002 D-5 | Modular Zod validator + integrity floor | TASK-002 implements PLAN schema files + 50% floor (REQ-003) |

## Progress Log

| Date | Update | TASK | Session |
| --- | --- | --- | --- |

## Observations

- [decision] SPEC-003 authored on 2026-05-19 covering 5 REQs + 2 DESIGNs + 5 TASKs for PLAN adapter #spec #status
- [decision] Split from original Complex Adapters bundle per ANALYSIS-001 adjudication; PLAN and SPEC subtree have zero shared implementation #split #provenance
- [constraint] PLAN adapter is a distinct CompositionAdapter implementation due to regenerative content carve-out #distinct-implementation #architecture
- [constraint] Regenerated sections (Progress Dashboard, Mermaid graph) excluded from hash validation; 50% integrity floor prevents abuse #regenerative #integrity-floor
- [insight] Estimated 3.5d AI-Dominant effort for ~250 LOC delta including PLAN adapter, regen handler, Zod schemas, and round-trip test #effort #estimation

## Relations

- implements [[ADR-001: Composition Library Architecture]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- relates_to [[ANALYSIS-001: SPEC Clustering]]
- relates_to [[SPEC-001: Composition Core and ADR Adapter]]
- part_of [[PLAN-001: Skills Ecosystem]]
- contains [[REQ-001-SPEC-003: PLAN Adapter Implementation]]
- contains [[REQ-002-SPEC-003: Regenerated Sections Field Handling]]
- contains [[REQ-003-SPEC-003: Fifty Percent Integrity Floor on Regenerated Sections]]
- contains [[REQ-004-SPEC-003: PLAN Frontmatter Mutations]]
- contains [[REQ-005-SPEC-003: PLAN Adapter Round-Trip Property Test]]
- contains [[DESIGN-001-SPEC-003: PLAN Adapter Architecture]]
- contains [[DESIGN-002-SPEC-003: Regenerated Sections Mechanism]]
- contains [[TASK-001-SPEC-003: Implement PLAN Adapter Base]]
- contains [[TASK-002-SPEC-003: Implement Regenerated Sections Handler and Integrity Floor]]
- contains [[TASK-003-SPEC-003: Implement PLAN Frontmatter Mutations]]
- contains [[TASK-004-SPEC-003: Create PLAN Adapter Test Fixtures]]
- contains [[TASK-005-SPEC-003: Implement PLAN Adapter Round-Trip Property Test]]