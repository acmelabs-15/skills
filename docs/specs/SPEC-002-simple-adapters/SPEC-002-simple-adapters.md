---
title: 'SPEC-002: Simple Adapters'
type: spec
status: ACCEPTED
permalink: specs/spec-002-simple-adapters/spec-002-simple-adapters
tags:
- spec
- simple-adapters
- analysis-adapter
- session-adapter
- composition
---

# SPEC-002: Simple Adapters

## Context

This SPEC implements the ANALYSIS and SESSION adapters for the composition library. Both adapters extend BaseMarkdownAdapter (established in SPEC-001 REQ-002-SPEC-001 and DESIGN-002-SPEC-001) with config-only overrides, validating the BaseMarkdownAdapter extension pattern on two additional note types. The ANALYSIS adapter is the simplest adapter in the project (~50 LOC delta) and the SESSION adapter adds cross-source update capability (~100 LOC delta).

ADR-002 D-3 specifies the per-type capability matrix: ANALYSIS and SESSION are classified as BaseMarkdownAdapter extensions alongside the ADR adapter from SPEC-001. ADR-001 F-8 SHA-256 hash protocol applies to both adapters; round-trip property tests prove zero-drift for each type. SPEC clustering source is ANALYSIS-001 Finding 2.

## Scope

### In Scope

The following requirements are addressed by this SPEC:

- ANALYSIS adapter extending BaseMarkdownAdapter with H3 section delimiter and item-N identifier pattern (REQ-001)
- SESSION adapter extending BaseMarkdownAdapter with Event-NN section delimiter and Event-NN identifier pattern (REQ-002)
- SESSION cross_source_updates emission logic for PLAN coordination (REQ-003)
- Adapter registry extension to register ANALYSIS and SESSION in the dispatcher (REQ-004)
- Round-trip property tests proving SHA-256 char-identity for both adapters (REQ-005)

### Out of Scope

- PLAN adapter (SPEC-003)
- SPEC subtree adapter (SPEC-004)
- /decompose and /recompose skill SKILL.md files and CLI entry points (SPEC-005)
- /defrag and /ingest higher-level skills (SPEC-006)
- Core library changes (stable from SPEC-001)

## Acceptance Criteria

- [ ] All 5 REQs reach ACCEPTED via Gate A + Gate B
- [ ] All 6 TASKs reach DONE via /build per-TASK cycle
- [ ] Spec-level QA sweep passes (per /build Stage B)
- [ ] All 4 mandatory exit gates pass (per /build Step 7)
- [ ] Round-trip property test passes for ANALYSIS adapter: SHA-256(original) === SHA-256(recomposed)
- [ ] Round-trip property test passes for SESSION adapter: SHA-256(original) === SHA-256(recomposed)
- [ ] SESSION cross_source_updates emission verified in test suite

## Phases

### Phase 1: Adapter Implementations

ANALYSIS and SESSION adapter classes plus cross-source handler.

#### Requirements
- [ ] [[REQ-001-SPEC-002: ANALYSIS Adapter Implementation]]
- [ ] [[REQ-002-SPEC-002: SESSION Adapter Implementation]]
- [ ] [[REQ-003-SPEC-002: SESSION Cross-Source Updates Handling]]

#### Design
- [ ] [[DESIGN-001-SPEC-002: BaseMarkdownAdapter Configuration Pattern]]
- [ ] [[DESIGN-002-SPEC-002: SESSION Cross-Source Coordination Protocol]]

#### Tasks
- [ ] [[TASK-001-SPEC-002: Implement ANALYSIS Adapter]] (S, 0.5d)
- [ ] [[TASK-002-SPEC-002: Implement SESSION Adapter]] (S, 0.5d)
- [ ] [[TASK-003-SPEC-002: Implement SESSION Cross-Source Updates Handler]] (S, 0.5d)

### Phase 2: Registry and Validation

Dispatcher extension, Zod schema extension, and round-trip property tests.

#### Requirements
- [ ] [[REQ-004-SPEC-002: Adapter Registry Extension]]
- [ ] [[REQ-005-SPEC-002: Round-Trip Property Tests for ANALYSIS and SESSION]]

#### Tasks
- [ ] [[TASK-004-SPEC-002: Register ANALYSIS and SESSION Adapters in Dispatcher]] (S, 1d)
- [ ] [[TASK-005-SPEC-002: Implement ANALYSIS Adapter Round-Trip Property Test]] (S, 0.5d)
- [ ] [[TASK-006-SPEC-002: Implement SESSION Adapter Round-Trip Property Test]] (S, 1d)

## Effort Summary

| Phase | Tasks | Size (S / M / L) | AI-Dominant |
|:--|:--|:--|:--|
| Phase 1: Adapter Implementations | 3 | 3 / 0 / 0 | 1.5d |
| Phase 2: Registry and Validation | 3 | 3 / 0 / 0 | 2.5d |
| **Total** | **6** | **6 / 0 / 0** | **4d** |

## Estimate Summary

| Phase | Human | AI-Dominant | AI-Assisted |
|:--|:--|:--|:--|
| Phase 1: Adapter Implementations | 4d | 1.5d | 2d |
| Phase 2: Registry and Validation | 5.5d | 2.5d | 3.5d |
| **Total** | **9.5d** | **4d** | **5.5d** |

## ADR Cross-cutting Constraints

| ADR | Constraint | How honored in this SPEC |
| --- | --- | --- |
| ADR-001 F-6 | Bun + TS runtime with Bun-native APIs | All adapter source files use TypeScript; biome for lint |
| ADR-001 F-8 | SHA-256 char-identity hash check is BLOCKING | REQ-005 round-trip property tests for both adapters |
| ADR-001 D-1 | Zod for plan validation | TASK-004 extends Zod schemas for ANALYSIS + SESSION |
| ADR-001 D-2 | unified + remark for markdown AST | Both adapters inherit unified/remark pipeline from BaseMarkdownAdapter |
| ADR-001 D-4 | Discriminated union on source_type | TASK-004 extends discriminated union with analysis + session variants |
| ADR-002 D-1 | Plan YAML schema shape | TASK-004 creates ANALYSIS + SESSION plan schemas including cross_source_updates |
| ADR-002 D-2 | CompositionAdapter 5-method interface | Both adapters inherit CompositionAdapter implementation from BaseMarkdownAdapter |
| ADR-002 D-3 | Per-type capability matrix | ANALYSIS and SESSION classified as BaseMarkdownAdapter extensions; config-only overrides |
| ADR-002 D-4 | Per-type hash extraction strategies | REQ-005 validates ANALYSIS + SESSION extraction strategies via round-trip tests |
| ADR-002 D-5 | Modular Zod validator structure | TASK-004 creates per-type schema modules following SPEC-001 DESIGN-003 layout |

## Artifact Status

### Requirements

- [ ] REQ-001-SPEC-002: ANALYSIS Adapter Implementation
- [ ] REQ-002-SPEC-002: SESSION Adapter Implementation
- [ ] REQ-003-SPEC-002: SESSION Cross-Source Updates Handling
- [ ] REQ-004-SPEC-002: Adapter Registry Extension
- [ ] REQ-005-SPEC-002: Round-Trip Property Tests for ANALYSIS and SESSION

### Designs

- [ ] DESIGN-001-SPEC-002: BaseMarkdownAdapter Configuration Pattern
- [ ] DESIGN-002-SPEC-002: SESSION Cross-Source Coordination Protocol

### Tasks

- [ ] TASK-001-SPEC-002: Implement ANALYSIS Adapter
- [ ] TASK-002-SPEC-002: Implement SESSION Adapter
- [ ] TASK-003-SPEC-002: Implement SESSION Cross-Source Updates Handler
- [ ] TASK-004-SPEC-002: Register ANALYSIS and SESSION Adapters in Dispatcher
- [ ] TASK-005-SPEC-002: Implement ANALYSIS Adapter Round-Trip Property Test
- [ ] TASK-006-SPEC-002: Implement SESSION Adapter Round-Trip Property Test

## Progress Log

| Date | Update | TASK | Session |

## Observations

- [decision] SPEC-002 authored on 2026-05-19 covering 5 REQs + 2 DESIGNs + 6 TASKs #spec #status
- [decision] Cluster source from ANALYSIS-001 SPEC Clustering Finding 2 #provenance #clustering
- [constraint] Both adapters must pass round-trip property tests per ADR-001 F-8 SHA-256 hash protocol #proof #blocking
- [insight] All 6 TASKs are size S; total AI-Dominant effort 4d for approximately 200 LOC delta #effort #estimation
- [technique] Config-only subclassing pattern from BaseMarkdownAdapter reduces each adapter to 5-10 lines of configuration #pattern #reuse
- [risk] SESSION cross_source_updates full integration deferred to SPEC-003; SPEC-002 covers emission logic and schema validation only #testing #deferred

## Relations

- implements [[ADR-001: Composition Library Architecture]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- relates_to [[ANALYSIS-001: SPEC Clustering]]
- depends_on [[SPEC-001: Composition Core and ADR Adapter]]
- part_of [[PLAN-001: Skills Ecosystem]]
- contains [[REQ-001-SPEC-002: ANALYSIS Adapter Implementation]]
- contains [[REQ-002-SPEC-002: SESSION Adapter Implementation]]
- contains [[REQ-003-SPEC-002: SESSION Cross-Source Updates Handling]]
- contains [[REQ-004-SPEC-002: Adapter Registry Extension]]
- contains [[REQ-005-SPEC-002: Round-Trip Property Tests for ANALYSIS and SESSION]]
- contains [[DESIGN-001-SPEC-002: BaseMarkdownAdapter Configuration Pattern]]
- contains [[DESIGN-002-SPEC-002: SESSION Cross-Source Coordination Protocol]]
- contains [[TASK-001-SPEC-002: Implement ANALYSIS Adapter]]
- contains [[TASK-002-SPEC-002: Implement SESSION Adapter]]
- contains [[TASK-003-SPEC-002: Implement SESSION Cross-Source Updates Handler]]
- contains [[TASK-004-SPEC-002: Register ANALYSIS and SESSION Adapters in Dispatcher]]
- contains [[TASK-005-SPEC-002: Implement ANALYSIS Adapter Round-Trip Property Test]]
- contains [[TASK-006-SPEC-002: Implement SESSION Adapter Round-Trip Property Test]]