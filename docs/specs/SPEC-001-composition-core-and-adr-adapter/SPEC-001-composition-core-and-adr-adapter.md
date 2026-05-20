---
title: 'SPEC-001: Composition Core and ADR Adapter'
type: spec
permalink: specs/spec-001-composition-core-and-adr-adapter/spec-001-composition-core-and-adr-adapter
status: ACCEPTED
tags:
- spec
- composition
- adr-adapter
- proof
---

# SPEC-001: Composition Core and ADR Adapter

## Context

This SPEC implements the foundational composition library and the ADR adapter as the architectural PROOF for the skills-ecosystem project. It realizes the 8 foundational decisions (F-1 through F-8) and 5 architectural decisions (D-1 through D-5) from ADR-001, plus the 5 design decisions (D-1 through D-5) from ADR-002. The composition library provides deterministic decompose and recompose operations with SHA-256 char-identity hash validation as a BLOCKING invariant, ensuring zero content drift when restructuring Brain knowledge-graph notes.

The ADR adapter is the first adapter built because it exercises every code path in the composition library with the simplest structural complexity (~250 LOC). The round-trip property test (SHA-256(original) === SHA-256(decompose then recompose(original))) on the ADR adapter is the PROOF gate that validates the core architecture before other adapters are built in subsequent SPECs. SPEC clustering source is ANALYSIS-001.

## Scope

### In Scope

The following requirements are addressed by this SPEC:

- CompositionAdapter 5-method synchronous interface contract (REQ-001)
- BaseMarkdownAdapter abstract class with config-only overrides (REQ-002)
- Shared SHA-256 hash utility via Bun.hash (REQ-003)
- Zod plan validator base with nested discriminatedUnion and ADR-specific schemas (REQ-004)
- Injectivity + path containment BLOCKING validators (REQ-005)
- Atomic write-to-temp-then-rename rollback mechanism (REQ-006)
- ADR adapter implementation extending BaseMarkdownAdapter (REQ-007)
- Round-trip property test proving zero drift for ADR adapter (REQ-008)

### Out of Scope

- ANALYSIS and SESSION adapters (SPEC-002)
- PLAN adapter (SPEC-003)
- SPEC subtree adapter (SPEC-004)
- /decompose and /recompose skill SKILL.md files and CLI entry points (SPEC-005)
- /defrag and /ingest higher-level skills (SPEC-006)

## Phases

### Phase 1: Core Types and Interface (Foundation)

- REQ-001, REQ-003 -- core types, interface, hash utility
- DESIGN-002 -- type hierarchy
- TASK-001 (scaffold), TASK-002 (types/interface), TASK-003 (hash)

### Phase 2: Base Adapter, Validators, and Schemas

- REQ-002, REQ-004, REQ-005, REQ-006 -- base class, Zod schemas, validators, atomic write
- DESIGN-001, DESIGN-003 -- module structure, schema layout
- TASK-004 (base adapter), TASK-005 (Zod schemas), TASK-006 (validators), TASK-007 (atomic write)

### Phase 3: ADR Adapter and PROOF Test

- REQ-007, REQ-008 -- ADR adapter implementation and round-trip property test
- TASK-008 (ADR adapter), TASK-009 (round-trip test + fixtures)

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 5.75d | Sum of TASK Human estimates + integration overhead |
| AI-Dominant | 3.75d | Sum of TASK AI-Dominant estimates (CANONICAL for rollup) |
| AI-Assisted | 3.75d | Sum of TASK AI-Assisted estimates |

## Success Criteria

- [ ] All 8 REQs reach ACCEPTED via Gate A + Gate B
- [ ] All 9 TASKs reach DONE via /build per-TASK cycle
- [ ] Spec-level QA sweep passes (per /build Stage B)
- [ ] All 4 mandatory exit gates pass (per /build Step 7)
- [ ] Round-trip property test passes: SHA-256(original) === SHA-256(recomposed) for ADR adapter (THE PROOF)

## Artifact Status

### Requirements

- [ ] REQ-001-SPEC-001: CompositionAdapter Interface Contract
- [ ] REQ-002-SPEC-001: BaseMarkdownAdapter Base Class
- [ ] REQ-003-SPEC-001: SHA-256 Hash Utility
- [ ] REQ-004-SPEC-001: Zod Plan Validator Base
- [ ] REQ-005-SPEC-001: Injectivity and Path Containment Validators
- [ ] REQ-006-SPEC-001: Atomic Write-to-Temp-Then-Rename Rollback
- [ ] REQ-007-SPEC-001: ADR Adapter Implementation
- [ ] REQ-008-SPEC-001: Round-Trip Property Test for ADR Adapter

### Designs

- [ ] DESIGN-001-SPEC-001: Composition Library Module Structure
- [ ] DESIGN-002-SPEC-001: CompositionAdapter Interface and Type Hierarchy
- [ ] DESIGN-003-SPEC-001: Zod Plan Schema Modular Layout

### Tasks

- [ ] TASK-001-SPEC-001: Scaffold Composition Project
- [ ] TASK-002-SPEC-001: Define Core Types and Adapter Interface
- [ ] TASK-003-SPEC-001: Implement SHA-256 Hash Utility
- [ ] TASK-004-SPEC-001: Implement BaseMarkdownAdapter
- [ ] TASK-005-SPEC-001: Implement Zod Plan Schemas
- [ ] TASK-006-SPEC-001: Implement Injectivity and Path Containment Validators
- [ ] TASK-007-SPEC-001: Implement Atomic Write Helper
- [ ] TASK-008-SPEC-001: Implement ADR Adapter
- [ ] TASK-009-SPEC-001: Implement Round-Trip Property Test and ADR Fixtures

## ADR Cross-cutting Constraints

| ADR | Constraint | How honored in this SPEC |
| --- | --- | --- |
| ADR-001 F-6 | Bun + TS runtime with Bun-native APIs | TASK-001 scaffolds with Bun; all src files use Bun.file/Bun.write/Bun.hash; biome for lint |
| ADR-001 F-8 | SHA-256 char-identity hash check is BLOCKING | REQ-003 (hash utility), REQ-006 (atomic write), REQ-008 (round-trip test) |
| ADR-001 D-1 | Zod for plan validation | REQ-004 (Zod base schema), TASK-005 (schema implementation) |
| ADR-001 D-2 | unified + remark for markdown AST | REQ-002 (BaseMarkdownAdapter pipeline), TASK-004 (implementation) |
| ADR-001 D-4 | Discriminated union on source_type | REQ-004 (nested discriminatedUnion), DESIGN-003 (schema layout) |
| ADR-002 D-2 | CompositionAdapter 5-method interface | REQ-001 (interface contract), DESIGN-002 (type hierarchy) |
| ADR-002 D-3 | Per-type capability matrix | REQ-007 (ADR adapter), REQ-002 (BaseMarkdownAdapter) |
| ADR-002 D-4 | Per-type hash extraction strategies | REQ-008 (round-trip test validates ADR extraction strategy) |
| ADR-002 D-5 | Modular Zod validator structure | REQ-004 + REQ-005 (schemas + validators), DESIGN-003 (layout) |

## Progress Log

| Date | Update | TASK | Session |
| --- | --- | --- | --- |

## Observations

- [decision] SPEC-001 authored on 2026-05-19 covering 8 REQs + 3 DESIGNs + 9 TASKs #spec #status
- [decision] Cluster source from ANALYSIS-001 SPEC Clustering Finding 1 #provenance #clustering
- [constraint] Round-trip property test on ADR adapter is THE PROOF gate that validates the entire architecture #proof #blocking
- [constraint] All 5 subsequent SPECs depend on SPEC-001 core library being validated via the PROOF #dependency #foundational
- [insight] Estimated 3.75d AI-Dominant effort for ~450 LOC including core library and ADR adapter #effort #estimation

## Relations

- implements [[ADR-001: Composition Library Architecture]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- relates_to [[ANALYSIS-001: SPEC Clustering]]
- part_of [[PLAN-001: Skills Ecosystem]]
- contains [[REQ-001-SPEC-001: CompositionAdapter Interface Contract]]
- contains [[REQ-002-SPEC-001: BaseMarkdownAdapter Base Class]]
- contains [[REQ-003-SPEC-001: SHA-256 Hash Utility]]
- contains [[REQ-004-SPEC-001: Zod Plan Validator Base]]
- contains [[REQ-005-SPEC-001: Injectivity and Path Containment Validators]]
- contains [[REQ-006-SPEC-001: Atomic Write-to-Temp-Then-Rename Rollback]]
- contains [[REQ-007-SPEC-001: ADR Adapter Implementation]]
- contains [[REQ-008-SPEC-001: Round-Trip Property Test for ADR Adapter]]
- contains [[DESIGN-001-SPEC-001: Composition Library Module Structure]]
- contains [[DESIGN-002-SPEC-001: CompositionAdapter Interface and Type Hierarchy]]
- contains [[DESIGN-003-SPEC-001: Zod Plan Schema Modular Layout]]
- contains [[TASK-001-SPEC-001: Scaffold Composition Project]]
- contains [[TASK-002-SPEC-001: Define Core Types and Adapter Interface]]
- contains [[TASK-003-SPEC-001: Implement SHA-256 Hash Utility]]
- contains [[TASK-004-SPEC-001: Implement BaseMarkdownAdapter]]
- contains [[TASK-005-SPEC-001: Implement Zod Plan Schemas]]
- contains [[TASK-006-SPEC-001: Implement Injectivity and Path Containment Validators]]
- contains [[TASK-007-SPEC-001: Implement Atomic Write Helper]]
- contains [[TASK-008-SPEC-001: Implement ADR Adapter]]
- contains [[TASK-009-SPEC-001: Implement Round-Trip Property Test and ADR Fixtures]]