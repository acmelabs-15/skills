---
title: 'ANALYSIS-001: SPEC Clustering'
type: analysis
status: ACCEPTED
permalink: analysis/analysis-001-spec-clustering
tags:
- analysis
- skills-ecosystem
- spec-clustering
- stage-1
---

# ANALYSIS-001: SPEC Clustering

## Context

This analysis was dispatched by /spec Stage 1 Step 1 for the skills-ecosystem project. The goal is to propose a SPEC decomposition from 2 ACCEPTED ADRs (ADR-001 Composition Library Architecture and ADR-002 Adapter Contract and Plan Schema) plus the KICKOFF-BRIEF.md project brief. The analysis reads the build order, LOC estimates, adapter complexity tiers, and cross-cutting constraints from those three sources to produce a feature-themed SPEC clustering with 4-7 SPECs and ordering rationale.

PLAN-001 complexity_tier is TIER_4. Per /spec skill rules, Tier 3+ makes CVA conditional MANDATORY if 2+ similar SPECs are proposed. This analysis explicitly assesses CVA triggering conditions.

## Executive Summary

This analysis proposes 5 feature-themed SPECs for the skills-ecosystem project. SPEC-001 covers the composition core library plus ADR adapter as the architectural PROOF (~450 LOC). SPEC-002 bundles the two simple adapters (ANALYSIS + SESSION) that extend BaseMarkdownAdapter (~200 LOC delta). SPEC-003 covers the two complex adapters (PLAN + SPEC subtree) that require distinct implementations (~800 LOC delta). SPEC-004 delivers the /decompose and /recompose primitive skills (~200 LOC skill layer). SPEC-005 delivers the /defrag and /ingest higher-level skills (~300 LOC skill layer). Build order is sequential (SPEC-001 through SPEC-005) honoring the KICKOFF-BRIEF.md "simplest first; ADR adapter is PROOF" principle. CVA Step 3 is recommended: SPEC-001, SPEC-002, and SPEC-003 share the CompositionAdapter interface (ADR-002 D-2), and SPEC-002 specifically shares the BaseMarkdownAdapter implementation pattern (ADR-002 D-3) across 3 adapter types (ADR, ANALYSIS, SESSION -- where ADR is in SPEC-001).

## Approach

The clustering was derived through three analysis passes.

**Pass 1 -- Build order analysis.** KICKOFF-BRIEF.md locked design decision 6 (Bun + TS) and specifies an explicit build order from simplest to hardest: ADR (~250 LOC), ANALYSIS (~50 LOC delta), SESSION (~100 LOC delta), PLAN (~250 LOC delta), SPEC subtree (~500 LOC delta). The brief also groups /defrag and /ingest as "higher-level skills built on /decompose + /recompose primitives." This ordering provides the primary clustering signal.

**Pass 2 -- ADR cross-cutting identification.** ADR-001 contains 8 foundational decisions (F-1 through F-8) and 5 architectural decisions (D-1 through D-5). ADR-002 contains 5 design decisions (D-1 through D-5). Several F-N and D-N decisions are cross-cutting (they apply to 3+ SPECs): F-6 Bun + TS runtime, F-8 SHA-256 hash protocol, ADR-001 D-1 Zod, ADR-001 D-2 unified+remark, ADR-002 D-2 CompositionAdapter interface. These become "ADR Cross-cutting Constraints" applied to every SPEC they touch rather than being duplicated.

**Pass 3 -- LOC and complexity bundling.** The 5 adapters split into 3 natural tiers: (a) the ADR adapter as architectural PROOF bundled with the core library it validates, (b) the two simple adapters (ANALYSIS and SESSION) sharing BaseMarkdownAdapter, (c) the two complex adapters (PLAN and SPEC subtree) each requiring distinct implementations. The /decompose + /recompose primitives form a natural skill-layer bundle. The /defrag + /ingest higher-level skills form a second skill-layer bundle.

## Findings

### Finding 1 -- SPEC-001 Composition Core and ADR Adapter

**Feature-themed slug**: `SPEC-001: Composition Core and ADR Adapter`

**Scope (in)**:
- Core library at `_shared/composition/src/core/` (types.ts, adapter.ts, hash.ts, parse.ts, validate.ts, write.ts)
- Zod base schema at `_shared/composition/schemas/base.ts` (common envelope, shared types, injectivity validators, path containment validator)
- ADR-specific Zod schemas (distribution + composition variants) at `_shared/composition/schemas/distribution/adr.plan.schema.ts` and `_shared/composition/schemas/composition/adr.plan.schema.ts`
- Schema index.ts (nested discriminated union assembly -- initial scaffold with ADR variant only; extended by SPEC-002 and SPEC-003)
- ADR adapter at `_shared/composition/src/adapters/adr.ts` implementing CompositionAdapter (parse, extractByRange, applyMutations, reverseMutations, serialize)
- BaseMarkdownAdapter base class at `_shared/composition/src/adapters/base.ts` (config-only overrides pattern for section_delimiter, identifier_pattern)
- Round-trip property test for ADR adapter (the key architectural validation from KICKOFF-BRIEF.md)
- Write-to-temp-then-rename atomicity implementation
- Project scaffolding: package.json, tsconfig.json, biome.json, install.sh

**Scope (out)**: ANALYSIS, SESSION, PLAN, SPEC subtree adapters. /decompose and /recompose skill SKILL.md files. /defrag and /ingest skills.

**LOC estimate**: ~450 (core library ~200 + ADR adapter ~150 + base adapter ~50 + project scaffolding ~50)

**Source ADRs**:
- ADR-001 F-1 (symlinks), F-4 (local-only git), F-5 (naming), F-6 (Bun+TS), F-7 (YAML plans), F-8 (SHA-256 hash protocol + rollback), D-1 (Zod), D-2 (unified+remark), D-3 (YAML plan files), D-4 (discriminated union)
- ADR-002 D-1 (plan YAML schema -- ADR variant), D-2 (CompositionAdapter interface), D-3 (ADR adapter capability), D-4 (ADR hash extraction strategy), D-5 (Zod validator structure -- base + ADR modules)

**Dependencies**: None (first SPEC; foundational)

**Effort tier**: M (2-5d AI-Dominant) -- core library + first adapter + property test + project setup

### Finding 2 -- SPEC-002 Simple Adapters (ANALYSIS and SESSION)

**Feature-themed slug**: `SPEC-002: Simple Adapters`

**Scope (in)**:
- ANALYSIS adapter at `_shared/composition/src/adapters/analysis.ts` extending BaseMarkdownAdapter
- SESSION adapter at `_shared/composition/src/adapters/session.ts` extending BaseMarkdownAdapter
- ANALYSIS-specific Zod schemas (distribution + composition)
- SESSION-specific Zod schemas (distribution + composition) including cross_source_updates shape
- Schema index.ts extension (add ANALYSIS + SESSION variants to discriminated union)
- Round-trip property tests for ANALYSIS and SESSION adapters
- SESSION cross-source update emission logic (plan YAML cross_source_updates field; does NOT mutate PLAN content -- see ADR-002 D-3 capability matrix)

**Scope (out)**: PLAN and SPEC subtree adapters. Core library changes (stable from SPEC-001). /decompose and /recompose skills.

**LOC estimate**: ~200 delta (ANALYSIS ~50 + SESSION ~100 + schemas ~50)

**Source ADRs**:
- ADR-001 F-6 (Bun+TS), F-8 (hash protocol)
- ADR-002 D-1 (plan YAML schema -- ANALYSIS + SESSION variants + cross_source_updates), D-2 (CompositionAdapter interface), D-3 (ANALYSIS + SESSION capability, BaseMarkdownAdapter pattern), D-4 (ANALYSIS + SESSION hash extraction strategies), D-5 (per-type schema modules for ANALYSIS + SESSION)

**Dependencies**: SPEC-001 (core library, BaseMarkdownAdapter base class, schema index.ts scaffold)

**Effort tier**: S (0.5-2d AI-Dominant) -- two simple adapters with config-only overrides on BaseMarkdownAdapter

### Finding 3 -- SPEC-003 Complex Adapters (PLAN and SPEC Subtree)

**Feature-themed slug**: `SPEC-003: Complex Adapters`

**Scope (in)**:
- PLAN adapter at `_shared/composition/src/adapters/plan.ts` (distinct implementation; regenerative content handling)
- SPEC subtree adapter at `_shared/composition/src/adapters/spec.ts` (distinct implementation; recursive subtree mutations, per-file hash validation, frontmatter_map reversal)
- PLAN-specific Zod schemas (distribution + composition) including regenerated_sections with 50% integrity floor
- SPEC-specific Zod schemas (distribution + composition) including subtree_manifest with root/children distinction
- Schema index.ts extension (add PLAN + SPEC variants to complete the 5x2 = 10-variant nested discriminated union)
- Round-trip property tests for PLAN and SPEC subtree adapters
- PLAN regenerative-section exclusion from hash validation (Progress Dashboard, Mermaid graph)
- SPEC subtree per-file hash validation + per-file write-to-temp-then-rename + full-cluster ROLLBACK on single-file mismatch

**Scope (out)**: Core library changes (stable from SPEC-001). /decompose and /recompose skills. /defrag and /ingest skills.

**LOC estimate**: ~800 delta (PLAN ~250 + SPEC subtree ~500 + schemas ~50)

**Source ADRs**:
- ADR-001 F-6 (Bun+TS), F-8 (hash protocol + rollback)
- ADR-002 D-1 (plan YAML schema -- PLAN + SPEC variants + subtree_manifest + regenerated_sections), D-2 (CompositionAdapter interface + MutationSpec frontmatter_map + regenerated_sections), D-3 (PLAN + SPEC capability; PLAN regenerative content; SPEC recursive subtree; both distinct implementations), D-4 (PLAN + SPEC hash extraction strategies; PLAN regenerative-section carve-out; SPEC per-file validation), D-5 (per-type schema modules for PLAN + SPEC + integrity floor)

**Dependencies**: SPEC-001 (core library, CompositionAdapter interface, hash utility, write-to-temp-then-rename). Does NOT depend on SPEC-002 (simple adapters are independent).

**Effort tier**: L (5-10d AI-Dominant) -- SPEC subtree alone is ~500 LOC with recursive filename/relation rewrite + per-file hash validation

### Finding 4 -- SPEC-004 Decompose and Recompose Skills

**Feature-themed slug**: `SPEC-004: Decompose and Recompose Skills`

**Scope (in)**:
- /decompose skill: `decompose/SKILL.md` (Claude Code skill definition)
- /recompose skill: `recompose/SKILL.md` (Claude Code skill definition)
- CLI entry points: `_shared/composition/src/decompose.ts` and `_shared/composition/src/recompose.ts` (script runner that loads plan YAML, validates via Zod, dispatches to adapter, executes hash-validated write)
- Plan YAML orchestration: LLM authors plan, user adjudicates via AskUserQuestion, script consumes
- Audit log emission per output file
- Error reporting: structured PlanValidationError array (ADR-002 D-5)
- Install.sh updates for /decompose and /recompose symlinks

**Scope (out)**: Adapter implementations (stable from SPEC-001/002/003). /defrag and /ingest skills.

**LOC estimate**: ~200 (decompose.ts ~80 + recompose.ts ~80 + SKILL.md x2 ~40)

**Source ADRs**:
- ADR-001 F-1 (symlink install), F-3 (coexistence), F-5 (naming: decompose/recompose), F-7 (plan artifacts at docs/_restructure/), D-5 (adr-review gate on architecture changes detected by /decompose)
- ADR-002 D-1 (plan YAML schema consumed by entry points), D-5 (error reporting format)

**Dependencies**: SPEC-001 (core library for plan validation, hash utility, write atomicity). Functionally complete with only SPEC-001; SPEC-002 and SPEC-003 add adapter coverage but the /decompose and /recompose CLI entry points work with any registered adapter.

**Effort tier**: S (0.5-2d AI-Dominant) -- thin CLI layer + skill definitions

### Finding 5 -- SPEC-005 Defrag and Ingest Skills

**Feature-themed slug**: `SPEC-005: Defrag and Ingest Skills`

**Scope (in)**:
- /defrag skill: `defrag/SKILL.md` (periodic curator; cron-runnable)
- /ingest skill: `ingest/SKILL.md` (outside-to-graph; verbatim source preservation)
- /defrag heuristics engine: audits memory state per CONVENTIONS Section 6 thresholds; identifies split candidates (delegates to /decompose), merge candidates (delegates to /recompose), stale entries (native delete after confirmation)
- /ingest Brain-awareness: CONVENTIONS compliance, Pattern 2 three-phase write, 16 canonical entity types, observation category prefix + tags, final-two-sections invariant
- Coexistence with existing ~/Dev/basic-memory-skills/memory-ingest and memory-defrag (per ADR-001 F-3)
- Install.sh updates for /defrag and /ingest symlinks

**Scope (out)**: Composition library internals (stable). /decompose and /recompose skill internals (consumed as primitives).

**LOC estimate**: ~300 (defrag SKILL.md ~80 + defrag heuristics ~120 + ingest SKILL.md ~60 + ingest Brain-awareness ~40)

**Source ADRs**:
- ADR-001 F-1 (symlink install), F-2 (Brain-first with Basic Memory subset), F-3 (coexistence with existing skills)

**Dependencies**: SPEC-004 (/defrag delegates to /decompose and /recompose primitives). SPEC-001 (library utilities for heuristic evaluation). /ingest is semi-independent (uses Brain MCP directly for note creation, not the composition library), but shares the install infrastructure.

**Effort tier**: M (2-5d AI-Dominant) -- /defrag heuristics engine has moderate complexity; /ingest is simpler but requires Brain-awareness compliance

## ADR-to-SPEC Mapping Table

### ADR-001 Foundational Decisions (F-N)

| Decision | Description | SPEC(s) | Cross-cutting? |
|:--|:--|:--|:--|
| F-1 | Symlink install | SPEC-001, SPEC-004, SPEC-005 | YES (3 SPECs) |
| F-2 | Brain-first, Basic Memory subset | SPEC-001, SPEC-005 | No |
| F-3 | Coexist with existing skills | SPEC-005 | No |
| F-4 | Local-only git repo | SPEC-001 | No |
| F-5 | Naming (composition, decompose, recompose) | SPEC-001, SPEC-004 | No |
| F-6 | Bun + TS runtime | SPEC-001, SPEC-002, SPEC-003, SPEC-004, SPEC-005 | YES (all 5) |
| F-7 | YAML plan artifacts | SPEC-001, SPEC-004 | No |
| F-8 | SHA-256 hash protocol + rollback | SPEC-001, SPEC-002, SPEC-003 | YES (3 SPECs) |

### ADR-001 Architectural Decisions (D-N)

| Decision | Description | SPEC(s) | Cross-cutting? |
|:--|:--|:--|:--|
| D-1 | Zod for plan validation | SPEC-001, SPEC-002, SPEC-003 | YES (3 SPECs) |
| D-2 | unified + remark for AST | SPEC-001, SPEC-002, SPEC-003 | YES (3 SPECs) |
| D-3 | YAML plan files | SPEC-001, SPEC-004 | No |
| D-4 | Discriminated union on source_type | SPEC-001, SPEC-002, SPEC-003 | YES (3 SPECs) |
| D-5 | adr-review BLOCKING gate | SPEC-001, SPEC-004 | No |

### ADR-002 Design Decisions (D-N)

| Decision | Description | SPEC(s) | Cross-cutting? |
|:--|:--|:--|:--|
| D-1 | Plan YAML schema shape | SPEC-001, SPEC-002, SPEC-003 | YES (3 SPECs) |
| D-2 | CompositionAdapter interface | SPEC-001, SPEC-002, SPEC-003 | YES (3 SPECs) |
| D-3 | Per-type capability matrix | SPEC-001, SPEC-002, SPEC-003 | YES (3 SPECs) |
| D-4 | Per-type hash extraction strategies | SPEC-001, SPEC-002, SPEC-003 | YES (3 SPECs) |
| D-5 | Zod validator structure | SPEC-001, SPEC-002, SPEC-003 | YES (3 SPECs) |

### Coverage Summary

All 18 ADR decisions (8 F-N + 5 ADR-001 D-N + 5 ADR-002 D-N) are mapped to at least one SPEC. No uncovered decisions.

## Cross-Cutting Constraints

The following ADR decisions span 3+ SPECs and become "ADR Cross-cutting Constraints" applied to each SPEC root:

1. **F-6 Bun + TS runtime** -- applies to all 5 SPECs. Every source file uses Bun-native APIs (Bun.file, Bun.write, Bun.hash, Bun.$, Bun.glob) and TypeScript with biome lint/format.

2. **F-8 SHA-256 hash protocol + rollback** -- applies to SPEC-001, SPEC-002, SPEC-003. The write-to-temp-then-rename atomicity pattern and SHA-256 char-identity invariant govern every adapter. Implementation lives in SPEC-001 core; SPEC-002 and SPEC-003 exercise it via their adapters.

3. **ADR-001 D-1 Zod** -- applies to SPEC-001, SPEC-002, SPEC-003. Zod schemas are authored per-type; base schema + ADR schemas in SPEC-001; ANALYSIS + SESSION schemas in SPEC-002; PLAN + SPEC schemas in SPEC-003.

4. **ADR-001 D-2 unified + remark** -- applies to SPEC-001, SPEC-002, SPEC-003. All adapters use the same unified/remark pipeline for parse/serialize.

5. **ADR-001 D-4 discriminated union** -- applies to SPEC-001, SPEC-002, SPEC-003. The nested discriminated union (plan_type x source_type) is scaffolded in SPEC-001 and extended incrementally.

6. **ADR-002 D-1 through D-5** -- all 5 ADR-002 design decisions apply to SPEC-001, SPEC-002, and SPEC-003 because they define the adapter contract, plan schema, capability matrix, hash strategies, and validator structure that every adapter must satisfy.

7. **F-1 symlink install** -- applies to SPEC-001, SPEC-004, SPEC-005. Install.sh creates symlinks for each skill directory.

## Ordering and Phasing

| Phase | SPEC | Rationale |
|:--|:--|:--|
| 1 | SPEC-001: Composition Core and ADR Adapter | Foundation. Validates the entire architecture via round-trip property test on ADR adapter (PROOF). All other SPECs depend on this. Honors KICKOFF-BRIEF.md "simplest first; ADR adapter is PROOF." |
| 2 | SPEC-002: Simple Adapters | Extends proven core with two simple adapters. BaseMarkdownAdapter pattern reuse from SPEC-001. Low risk given architecture validated in Phase 1. |
| 3a | SPEC-003: Complex Adapters | Hardest implementation work. PLAN + SPEC subtree require distinct adapter implementations. Can start once SPEC-001 core is stable; does NOT depend on SPEC-002. |
| 3b | SPEC-004: Decompose and Recompose Skills | Thin CLI + skill layer on top of SPEC-001 core. Can start in parallel with SPEC-003 since it only depends on SPEC-001. Fully functional with just ADR adapter; additional adapters from SPEC-002/003 extend coverage. |
| 4 | SPEC-005: Defrag and Ingest Skills | Depends on /decompose and /recompose from SPEC-004. /defrag also benefits from all adapters being available. /ingest is semi-independent but shares install infrastructure. |

Note: SPEC-003 and SPEC-004 can execute in parallel (Phase 3a and 3b) since they depend only on SPEC-001, not on each other. This parallelism reduces the critical path by the duration of the shorter SPEC (SPEC-004 at S effort).

## Effort Rollup

| SPEC | Feature | LOC Estimate | AI-Dominant Effort | Cumulative LOC |
|:--|:--|:--|:--|:--|
| SPEC-001 | Composition Core and ADR Adapter | ~450 | M (3-4d) | ~450 |
| SPEC-002 | Simple Adapters | ~200 | S (1-2d) | ~650 |
| SPEC-003 | Complex Adapters | ~800 | L (6-8d) | ~1,450 |
| SPEC-004 | Decompose and Recompose Skills | ~200 | S (1-2d) | ~1,650 |
| SPEC-005 | Defrag and Ingest Skills | ~300 | M (2-3d) | ~1,950 |
| **Total** | | **~1,950** | **13-19d AI-Dominant** | |

Note: The KICKOFF-BRIEF.md estimated ~1,200 LOC for the 5 adapters only. This rollup includes the core library (~200), project scaffolding (~50), CLI entry points (~160), skill definitions (~120), /defrag heuristics (~120), and /ingest Brain-awareness (~100) beyond the adapter implementations. The ~1,950 total aligns with ADR-001's Confirmation note that "total project including tests, CLI entry points, plan schema definitions, and Zod validation layer is estimated 2x-3x larger (~2,500-3,600 LOC)" -- the ~1,950 figure excludes test code, which adds ~500-1,000 LOC for a total of ~2,500-2,950 including tests.

## CVA Conditional Assessment

**Recommendation: YES -- CVA Step 3 should fire.**

Rationale: 3 of the 5 proposed SPECs (SPEC-001, SPEC-002, SPEC-003) share the CompositionAdapter interface (ADR-002 D-2). Within that group, the ADR adapter (SPEC-001), ANALYSIS adapter (SPEC-002), and SESSION adapter (SPEC-002) share the BaseMarkdownAdapter implementation pattern (ADR-002 D-3 capability matrix). This is a textbook CVA scenario: the commonality is the adapter interface + base class + Zod schema envelope + hash protocol; the variability is the section_delimiter, identifier_pattern, cross-source mutation capability, regenerative content handling, and recursive subtree scope. CVA will formalize the variability matrix and confirm (or refine) the BaseMarkdownAdapter abstraction boundary.

Additionally, SPEC-004 and SPEC-005 share commonality as skill-layer bundles (SKILL.md + install.sh + CLI entry point) though with less structural overlap than the adapters. CVA may surface shared skill infrastructure patterns.

The TIER_4 complexity tier makes CVA mandatory when 2+ similar SPECs are proposed. The 3 adapter SPECs clearly meet that threshold.

## Recommendations

### Alternative 1 -- All 5 adapters in one SPEC

Bundle all adapter work (ADR + ANALYSIS + SESSION + PLAN + SPEC subtree) into a single large SPEC alongside the core library.

**Pros:**
- Reduces SPEC count from 5 to 3 (one library SPEC, one skills SPEC, one higher-level skills SPEC)
- No incremental schema index.ts extension needed; full discriminated union authored once
- Simpler dependency graph

**Cons:**
- The single adapter SPEC would be ~1,250 LOC with L+ effort (8-12d), making it too large for a single spec/build cycle
- Loses the PROOF validation principle: the ADR adapter must validate the architecture before the SPEC subtree (~500 LOC) is attempted
- Contradicts the locked "simplest first" build order from KICKOFF-BRIEF.md
- Blocks progress: a single-SPEC approach means no adapter ships until all 5 are ready

**Verdict**: Rejected. The PROOF principle and build order are locked design decisions.

### Alternative 2 -- Per-adapter SPECs (one SPEC per adapter)

Each of the 5 adapters gets its own SPEC (7 SPECs total with skills).

**Pros:**
- Maximum granularity; each adapter independently spec'd, built, and reviewed
- Matches the 5-item build order exactly

**Cons:**
- ANALYSIS adapter is ~50 LOC delta; a full SPEC for 50 lines is overhead-heavy
- SESSION adapter is ~100 LOC delta; marginal for a standalone SPEC
- 7 SPECs for ~1,950 LOC is a high SPEC-to-LOC ratio that increases planning/tracking overhead

**Verdict**: Deferred. If SPEC-002 (Simple Adapters bundle) proves too complex during Stage 2 spec authoring, it can be split into SPEC-002a (ANALYSIS) and SPEC-002b (SESSION). The proposed 5-SPEC clustering provides a reasonable middle ground.

## Adjudication Outcome (2026-05-19)

User adjudicated this clustering proposal via AskUserQuestion at /spec Stage 1 Step 5 on 2026-05-19. Outcome: **6 SPECs final** (SPEC-003 SPLIT applied per critic + analyst recommendation).

### Final SPEC set (6)

| # | SPEC | Was (5-SPEC proposal) | Now (6-SPEC final) |
|:--|:--|:--|:--|
| 1 | SPEC-001 Composition Core and ADR Adapter | (unchanged) | (unchanged) |
| 2 | SPEC-002 Simple Adapters (ANALYSIS + SESSION) | (unchanged) | (unchanged) |
| 3 | SPEC-003 PLAN Adapter | was bundled with SPEC subtree as SPEC-003 Complex Adapters (~800 LOC L) | SPLIT — PLAN Adapter only (~250 LOC M) |
| 4 | SPEC-004 SPEC Subtree Adapter | was SPEC-003b in analyst's flagged split option | new SPEC-004 (~500 LOC M) |
| 5 | SPEC-005 Decompose and Recompose Skills | was SPEC-004 | renumbered to SPEC-005 |
| 6 | SPEC-006 Defrag and Ingest Skills | was SPEC-005 | renumbered to SPEC-006 |

### Split rationale (per critic agent)

SPEC-003 split was recommended for: (a) PLAN adapter and SPEC subtree adapter share zero implementation code (both are "distinct implementations" per ADR-002 D-3 capability matrix — only the CompositionAdapter interface in common, which every adapter shares); (b) combined L effort (6-8d) exceeds next-largest SPEC by 2x and dominates uncertainty in the effort rollup; (c) splitting produces two independently-reviewable M-sized SPECs with no dependency between them; (d) bundling adds review-gate granularity loss without proportionate benefit since they ship independently anyway.

### P1 amendments applied (per critic findings)

**P1-1: SPEC-005 (was SPEC-004) dependency understated.** Finding 4 of this analysis stated SPEC-005 is "fully functional with only SPEC-001." Critic flagged this is inaccurate — SPEC-005 ships /decompose + /recompose CLI entry points that dispatch to adapter via source_type discriminator. If only SPEC-001 ADR adapter is complete, /decompose + /recompose work for ADR adapter ONLY. Broader coverage is incremental as additional adapter SPECs (SPEC-002, SPEC-003, SPEC-004) complete. Amendment: SPEC-005 Workflow Plan in PLAN-001 explicitly documents incremental adapter registration; SPEC-005 ships with ADR-only coverage if other adapter SPECs incomplete at its ship time.

**P1-2: SPEC-006 (was SPEC-005) /ingest Brain-awareness requirements are non-ADR scope.** KICKOFF-BRIEF.md specifies /ingest is Brain-aware with concrete requirements (CONVENTIONS, Pattern 2 three-phase write, 16 canonical entity types, observation [category] prefix + #tags, final-two-sections invariant). Critic correctly noted these are NOT covered by any ADR D-N — they derive from KICKOFF-BRIEF.md directly. This analysis's claim "all 18 ADR decisions mapped" is accurate for ADR coverage, but /ingest's full scope includes non-ADR requirements. Amendment: SPEC-006 source_artifacts in PLAN-001 explicitly includes KICKOFF-BRIEF.md alongside the ANALYSIS reference; SPEC-006 ADR coverage gate evaluates only the ADR-scoped requirements; non-ADR requirements documented separately in SPEC-006 scope.

### Review verdict synthesis

| Channel | Verdict | SPEC-003 |
|:--|:--|:--|
| CVA (orchestrator inline) | Validates ADR-002 D-3 BaseMarkdownAdapter pattern; no new abstractions warranted | (no opinion) |
| decision-critic (orchestrator inline) | 5-SPEC sound; surface SPEC-003 split decision to user | Surface |
| critic (brain:🧠-critic agent) | ACCEPT with 2 P1 amendments | SPLIT |

Status flipped DRAFT → ACCEPTED post user adjudication.

## Observations

- [decision] Proposed 5-SPEC clustering aligned to KICKOFF-BRIEF.md build order: core+PROOF, simple adapters, complex adapters, primitive skills, higher-level skills #spec-clustering #build-order
- [decision] Bundled ANALYSIS (~50 LOC) and SESSION (~100 LOC) into single SPEC-002 to avoid overhead-heavy single-adapter SPECs while preserving the BaseMarkdownAdapter shared-pattern grouping #bundling #pragmatic
- [insight] SPEC-003 and SPEC-004 can execute in parallel since both depend only on SPEC-001 core; this reduces the critical path by SPEC-004 duration (1-2d) #parallelism #scheduling
- [insight] Total LOC (~1,950 excluding tests) aligns with ADR-001 Confirmation note range of ~2,500-3,600 total when test code (~500-1,000 LOC) is included, confirming the estimate has not drifted #estimation #validation
- [risk] SPEC-003 is the largest SPEC at ~800 LOC (L effort 6-8d) driven by SPEC subtree adapter complexity (~500 LOC alone); if SPEC subtree proves harder than estimated, SPEC-003 may need splitting into PLAN adapter vs SPEC subtree adapter #complexity #spec-subtree
- [insight] CVA is clearly warranted: 3 adapter SPECs share CompositionAdapter interface and BaseMarkdownAdapter pattern; the variability matrix (section_delimiter, identifier_pattern, cross-source, regenerative, recursive subtree) is the textbook input for commonality-variability analysis #cva #adapter-pattern
- [constraint] Every SPEC root must reference the cross-cutting constraints (F-6 Bun+TS, F-8 hash protocol, ADR-001 D-1 through D-4, ADR-002 D-1 through D-5) applicable to it; these are not duplicated but cited as cross-cutting #cross-cutting #adr-coverage

## Relations

- relates_to [[ADR-001: Composition Library Architecture]]
- relates_to [[ADR-002: Adapter Contract and Plan Schema]]
- part_of [[PLAN-001: Skills Ecosystem]]