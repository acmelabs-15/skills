---
title: 'SPEC-005: Decompose and Recompose Skills'
type: spec
status: ACCEPTED
date: 2026-05-19
permalink: specs/spec-005-decompose-and-recompose-skills/spec-005-decompose-and-recompose-skills
tags:
- spec
- decompose
- recompose
- skills
- spec-005
---

# SPEC-005: Decompose and Recompose Skills

## Context

This SPEC delivers the /decompose and /recompose primitive skills that expose the composition library to users as Claude Code skills. Per ANALYSIS-001 SPEC Clustering Finding 5 (renumbered from Finding 4 after the SPEC-003 split), these two skills are the thin orchestration layer that bridges LLM cognitive work (source classification, cluster analysis, plan YAML authoring) to the deterministic composition library (plan validation, adapter dispatch, hash-validated execution).

The skills implement the three-phase workflow locked in KICKOFF-BRIEF.md: (1) LLM authors a plan YAML, (2) user adjudicates via AskUserQuestion, (3) deterministic script executes the plan via adapter dispatch. The adapter registry dispatcher routes by source_type to whichever adapters are registered. Per the P1 amendment from ANALYSIS-001 critic, at SPEC-005 ship time /decompose and /recompose work for the ADR adapter ONLY (from SPEC-001). Broader source_type coverage is incremental as SPEC-002 (ANALYSIS, SESSION), SPEC-003 (PLAN), and SPEC-004 (SPEC subtree) complete their respective adapter implementations.

Key architectural constraints from ADR-001: the LLM never touches content bytes (F-8 division of labor); SHA-256 hash validation is BLOCKING (F-8); plan YAML artifacts live at docs/_restructure/ (F-7); skills installed via symlinks (F-1); Bun + TypeScript runtime (F-6).

## Scope

### In Scope

- /decompose skill: SKILL.md definition + CLI entry point (decompose.ts) for 1-to-N distribution plans
- /recompose skill: SKILL.md definition + CLI entry point (recompose.ts) for N-to-1 composition plans
- Plan YAML adjudication via AskUserQuestion with approve/reject-with-feedback/abort options and refinement loop
- Adapter registry dispatcher with incremental registration (ADR adapter only at ship time)
- install.sh extension for /decompose and /recompose symlinks at ~/.claude/skills/
- End-to-end round-trip tests at the skill orchestration level (decompose then recompose equals identity)

### Out of Scope

- Composition library internals (stable from SPEC-001)
- ANALYSIS and SESSION adapters (SPEC-002)
- PLAN adapter (SPEC-003)
- SPEC subtree adapter (SPEC-004)
- /defrag and /ingest higher-level skills (SPEC-006)

## Acceptance Criteria

- [ ] /decompose skill orchestrates full pipeline: LLM plan authoring, user adjudication, script execution with hash validation
- [ ] /recompose skill orchestrates full inverse pipeline: multi-source reading, LLM plan authoring, user adjudication, script execution with hash validation
- [ ] AskUserQuestion presents plan with approve/reject-with-feedback/abort; rejection triggers refinement loop
- [ ] Adapter dispatcher routes by source_type; returns ADR adapter; throws structured error for unregistered types
- [ ] install.sh creates symlinks for /decompose and /recompose at ~/.claude/skills/
- [ ] End-to-end round-trip test: SHA-256(original) === SHA-256(decompose then recompose(original)) at skill level

## Phases

### Phase 1: Skill Scaffolding and Core Pipeline

Phase 1 delivers the /decompose and /recompose skill definitions, CLI entry points, and adapter dispatcher. After this phase, both skills can execute plans end-to-end with the ADR adapter.

#### Requirements

- [ ] REQ-001-SPEC-005: Decompose Skill Implementation
- [ ] REQ-002-SPEC-005: Recompose Skill Implementation
- [ ] REQ-004-SPEC-005: Adapter Registry Dispatcher

#### Design

- [ ] DESIGN-001-SPEC-005: Skill Architecture
- [ ] DESIGN-003-SPEC-005: Adapter Registry and Dispatcher

#### Tasks

- [ ] TASK-001-SPEC-005: Implement Decompose CLI Entry Point and Skill Structure (S, 1d)
- [ ] TASK-002-SPEC-005: Implement Recompose CLI Entry Point and Skill Structure (S, 1d)
- [ ] TASK-004-SPEC-005: Implement Adapter Dispatcher with Incremental Registration (S, 0.5d)

### Phase 2: Adjudication, Install, and Testing

Phase 2 adds the AskUserQuestion adjudication step, symlink activation, and end-to-end round-trip tests. After this phase, the skills are fully functional and validated.

#### Requirements

- [ ] REQ-003-SPEC-005: Plan YAML Adjudication via AskUserQuestion
- [ ] REQ-005-SPEC-005: Symlink Activation via Install Script
- [ ] REQ-006-SPEC-005: Skill Round-Trip Tests

#### Design

- [ ] DESIGN-002-SPEC-005: Plan YAML Lifecycle

#### Tasks

- [ ] TASK-003-SPEC-005: Implement Plan YAML Adjudication Step (S, 0.5d)
- [ ] TASK-005-SPEC-005: Implement Install Script Symlink Activation (S, 0.25d)
- [ ] TASK-006-SPEC-005: Skill End-to-End Round-Trip Tests and Docs (M, 2d)

## Effort Summary

| Phase | Tasks | Size (S / M / L) | AI-Dominant |
|:--|:--|:--|:--|
| Phase 1: Skill Scaffolding and Core Pipeline | 3 | 3 / 0 / 0 | 2.5d |
| Phase 2: Adjudication, Install, and Testing | 3 | 2 / 1 / 0 | 2.75d |
| **Total** | **6** | **5 / 1 / 0** | **5.25d** |

## Estimate Summary

| Phase | Human | AI-Dominant | AI-Assisted |
|:--|:--|:--|:--|
| Phase 1 | 7.5d | 2.5d | 4d |
| Phase 2 | 7.5d | 2.75d | 4.5d |
| **Total** | **15d** | **5.25d** | **8.5d** |

## ADR Cross-cutting Constraints

| ADR | Constraint | How honored in this SPEC |
|---|---|---|
| ADR-001 F-1 | Symlink install | REQ-005, TASK-005 extend install.sh for /decompose and /recompose |
| ADR-001 F-5 | Naming (decompose, recompose) | Skill names and directory names follow locked naming convention |
| ADR-001 F-6 | Bun + TS runtime | CLI entry points use Bun.$, Bun.file; biome for lint |
| ADR-001 F-7 | Plan YAML at docs/_restructure/ | REQ-001, REQ-002 write plans to locked location |
| ADR-001 F-8 | SHA-256 hash BLOCKING invariant | REQ-006 validates round-trip at skill level; CLI entry points enforce hash check |
| ADR-002 D-1 | Plan YAML schema | CLI entry points validate via Zod planSchema.parseAsync() |
| ADR-002 D-2 | CompositionAdapter interface | REQ-004 dispatcher resolves to registered adapters |
| ADR-002 D-5 | Error reporting format | CLI entry points emit PlanValidationError array |

## Progress Log

| Date | Update | TASK | Session |

## Observations

- [decision] SPEC-005 authored on 2026-05-19 covering 6 REQs + 3 DESIGNs + 6 TASKs for /decompose and /recompose primitive skills #spec #status
- [decision] Cluster source from ANALYSIS-001 SPEC Clustering Finding 5 (renumbered from Finding 4 post SPEC-003 split) #provenance #clustering
- [constraint] At ship time, /decompose and /recompose work for ADR adapter ONLY; broader coverage incremental per P1 amendment #incremental #p1-amendment
- [constraint] Three-phase workflow (LLM authors plan, user adjudicates, script executes) is locked from KICKOFF-BRIEF.md #workflow #locked
- [insight] Estimated 5.25d AI-Dominant effort for ~200 LOC across CLI entry points, SKILL.md files, adapter dispatcher, and tests #effort #estimation

## Relations

- implements [[ADR-001: Composition Library Architecture]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- relates_to [[ANALYSIS-001: SPEC Clustering]]
- relates_to [[SPEC-001: Composition Core and ADR Adapter]]
- part_of [[PLAN-001: Skills Ecosystem]]
- contains [[REQ-001-SPEC-005: Decompose Skill Implementation]]
- contains [[REQ-002-SPEC-005: Recompose Skill Implementation]]
- contains [[REQ-003-SPEC-005: Plan YAML Adjudication via AskUserQuestion]]
- contains [[REQ-004-SPEC-005: Adapter Registry Dispatcher]]
- contains [[REQ-005-SPEC-005: Symlink Activation via Install Script]]
- contains [[REQ-006-SPEC-005: Skill Round-Trip Tests]]
- contains [[DESIGN-001-SPEC-005: Skill Architecture]]
- contains [[DESIGN-002-SPEC-005: Plan YAML Lifecycle]]
- contains [[DESIGN-003-SPEC-005: Adapter Registry and Dispatcher]]
- contains [[TASK-001-SPEC-005: Implement Decompose CLI Entry Point and Skill Structure]]
- contains [[TASK-002-SPEC-005: Implement Recompose CLI Entry Point and Skill Structure]]
- contains [[TASK-003-SPEC-005: Implement Plan YAML Adjudication Step]]
- contains [[TASK-004-SPEC-005: Implement Adapter Dispatcher with Incremental Registration]]
- contains [[TASK-005-SPEC-005: Implement Install Script Symlink Activation]]
- contains [[TASK-006-SPEC-005: Skill End-to-End Round-Trip Tests and Docs]]
