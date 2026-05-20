---
title: 'SPEC-007: Plan/Session Render Implementation'
type: spec
permalink: specs/spec-007-plan-session-render/spec-007-plan-session-render
status: ACCEPTED
tags:
- spec
- plan-session
- render-architecture
- skills-ecosystem
---

# SPEC-007: Plan/Session Render Implementation

## Context

This SPEC implements the plan/session render architecture established by ADR-003. It realizes all 11 locked decisions (D-1 through D-11) by building Zod schemas, unified+remark parsers, deterministic renderers, a typed mutation API, and a round-trip property test for both PLAN and SESSION notes. The architecture replaces LLM-authored edit_note cycles (30+ sequential calls per state propagation, producing structural drift) with a deterministic Bun+TS pipeline that gives LLMs a narrow typed mutation interface with automatic side-channel propagation.

PLAN-001-skills-ecosystem.md is the first dogfood target: migrated to the trimmed template and proven via SHA-256 char-identity round-trip test.

## Scope

### In Scope

- Common Zod schema module shared with ADR-002 composition schemas (REQ-001)
- PlanNote Zod schema with cross-field invariants (REQ-002)
- SessionNote Zod schema with 10-type discriminated event union (REQ-003)
- PlanNote markdown parser via unified+remark (REQ-004)
- SessionNote markdown parser (REQ-005)
- PlanNote markdown renderer with derived view regeneration (REQ-006)
- SessionNote markdown renderer (REQ-007)
- Mermaid flowchart renderer as pure function (REQ-008)
- Plan mutation API with 9 typed mutations (REQ-009)
- Session mutation API with append-event (REQ-010)
- Round-trip property test as CI gate (REQ-011)
- PLAN-001 dogfood migration to trimmed template (REQ-012)

### Out of Scope

- Composition library core (SPEC-001)
- Per-type adapters for decompose/recompose (SPEC-002 through SPEC-004)
- /decompose, /recompose, /defrag, /ingest skills (SPEC-005, SPEC-006)
- Monorepo restructure (deferred to ADR-004)
- /plan and /session skill SKILL.md updates to invoke mutation API (follow-up work)

## Phases

### Phase 1: Schemas (Foundation)

- REQ-001, REQ-002, REQ-003 -- common, plan-note, session-note schemas
- DESIGN-001 -- composition layer architecture
- TASK-001 (common schema), TASK-002 (plan schema), TASK-003 (session schema)

### Phase 2: Parsers

- REQ-004, REQ-005 -- plan-note and session-note parsers
- DESIGN-002 -- round-trip strategy
- TASK-004 (ast-helpers), TASK-005 (plan parser), TASK-006 (session parser)

### Phase 3: Renderers

- REQ-006, REQ-007, REQ-008 -- plan-note, session-note, and mermaid renderers
- DESIGN-004 -- mermaid auto-derivation
- TASK-009 (mermaid), TASK-007 (plan renderer), TASK-008 (session renderer)

### Phase 4: Mutation API and Validation

- REQ-009, REQ-010, REQ-011 -- plan mutations, session mutations, round-trip test
- DESIGN-003 -- mutation API design
- TASK-010 (plan mutations), TASK-011 (session mutations), TASK-012 (round-trip test)

### Phase 5: Dogfood Migration

- REQ-012 -- PLAN-001 migration
- TASK-013 (dogfood migration)

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 13.5d | Sum of TASK Human estimates + integration overhead |
| AI-Dominant | 10.5d | Sum of TASK AI-Dominant estimates (CANONICAL for rollup) |
| AI-Assisted | 10.5d | Sum of TASK AI-Assisted estimates |

## Success Criteria

- [ ] All 12 REQs reach ACCEPTED via Gate A + Gate B
- [ ] All 4 DESIGNs reach ACCEPTED
- [ ] All 13 TASKs reach DONE via /build per-TASK cycle
- [ ] Spec-level QA sweep passes (per /build Stage B)
- [ ] All mandatory exit gates pass (per /build Step 7)
- [ ] Plan round-trip test passes: SHA-256(render(parse(PLAN-001-trimmed))) === SHA-256(PLAN-001-trimmed)
- [ ] Session round-trip test passes: SHA-256(render(parse(SESSION-fixture))) === SHA-256(SESSION-fixture)
- [ ] PLAN-001 successfully migrated to trimmed template with round-trip char-identity

## Artifact Status

### Requirements

- [ ] REQ-001-SPEC-007: Schema Common Module
- [ ] REQ-002-SPEC-007: PlanNote Zod Schema
- [ ] REQ-003-SPEC-007: SessionNote Zod Schema
- [ ] REQ-004-SPEC-007: PlanNote Markdown Parser
- [ ] REQ-005-SPEC-007: SessionNote Markdown Parser
- [ ] REQ-006-SPEC-007: PlanNote Markdown Renderer
- [ ] REQ-007-SPEC-007: SessionNote Markdown Renderer
- [ ] REQ-008-SPEC-007: Mermaid Renderer
- [ ] REQ-009-SPEC-007: Plan Mutation API
- [ ] REQ-010-SPEC-007: Session Mutation API
- [ ] REQ-011-SPEC-007: Round-Trip Property Test
- [ ] REQ-012-SPEC-007: PLAN-001 Dogfood Migration

### Designs

- [ ] DESIGN-001-SPEC-007: Composition Layer Architecture
- [ ] DESIGN-002-SPEC-007: Parser Renderer Round-Trip Strategy
- [ ] DESIGN-003-SPEC-007: Mutation API and Invariant Enforcement
- [ ] DESIGN-004-SPEC-007: Mermaid Renderer and Auto-Derivation

### Tasks

- [ ] TASK-001-SPEC-007: Implement Common Schema Module
- [ ] TASK-002-SPEC-007: Implement PlanNote Zod Schema
- [ ] TASK-003-SPEC-007: Implement SessionNote Zod Schema
- [ ] TASK-004-SPEC-007: Implement AST Helpers
- [ ] TASK-005-SPEC-007: Implement PlanNote Parser
- [ ] TASK-006-SPEC-007: Implement SessionNote Parser
- [ ] TASK-007-SPEC-007: Implement PlanNote Renderer
- [ ] TASK-008-SPEC-007: Implement SessionNote Renderer
- [ ] TASK-009-SPEC-007: Implement Mermaid Renderer
- [ ] TASK-010-SPEC-007: Implement Plan Mutation API
- [ ] TASK-011-SPEC-007: Implement Session Mutation API
- [ ] TASK-012-SPEC-007: Implement Round-Trip Property Test
- [ ] TASK-013-SPEC-007: Dogfood PLAN-001 Migration

## ADR Cross-cutting Constraints

| ADR | Constraint | How honored in this SPEC |
| --- | --- | --- |
| ADR-001 F-6 | Bun + TS runtime with Bun-native APIs | All src files use Bun.file/Bun.write/Bun.hash; biome for lint |
| ADR-001 F-8 | SHA-256 char-identity hash check | REQ-011 round-trip property test; used in mutation pipeline |
| ADR-001 D-1 | Zod for validation | REQ-001, REQ-002, REQ-003 schemas |
| ADR-001 D-2 | unified + remark for markdown AST | REQ-004, REQ-005 parsers; REQ-006, REQ-007 renderers |
| ADR-002 D-2 | Adapter contract | common.ts shared between ADR-002 and ADR-003 schemas |
| ADR-003 D-1 | Markdown is authoritative state | No parallel state.yaml; markdown files are single source of truth |
| ADR-003 D-2 | PLAN owns state; SESSION owns events | Schema design enforces responsibility split |
| ADR-003 D-3 | Deterministic render scripts | REQ-006, REQ-007 renderers; REQ-009, REQ-010 mutation APIs |
| ADR-003 D-4 | Zod schema as validation contract | All 3 schema files with cross-field invariants |
| ADR-003 D-5 | T-NN plan-scoped | TaskIdSchema regex T-NN in common.ts |
| ADR-003 D-6 | Consolidated tasks at PLAN top level | PlanNoteSchema tasks array; renderer Active/Backlog/Archive |
| ADR-003 D-7 | Mermaid as separate render concern | REQ-008 renderMermaid pure function |
| ADR-003 D-8 | Round-trip property test as gate | REQ-011 SHA-256 char-identity CI gate |
| ADR-003 D-9 | PUD + Editor Mirror at PLAN top level | PlanNoteSchema pending_decisions and editor_mirror arrays |
| ADR-003 D-10 | No Decision Log / Progress Log | PlanNoteSchema omits these arrays; absence is enforcement |
| ADR-003 D-11 | Workflow Plan prose to skill docs | PlanNoteSchema has no workflow_plan field |

## Progress Log

| Date | Update | TASK | Session |
| --- | --- | --- | --- |

## Observations

- [decision] SPEC-007 authored on 2026-05-20 covering 12 REQs + 4 DESIGNs + 13 TASKs #spec #status
- [constraint] All 11 ADR-003 D-Ns enforced via schema design, renderer behavior, and mutation API contracts #adr-003 #enforcement
- [insight] Estimated 10.5d AI-Dominant effort for ~800-1100 LOC plan + ~300-400 LOC session pipeline #effort #estimation
- [decision] common.ts shared with ADR-002 composition schemas per CRIT-003 F-1 resolution #shared-schema #dry
- [constraint] Round-trip property test is the correctness gate mirroring ADR-001 F-8 invariant #round-trip #blocking

## Relations

- implements [[ADR-003: Plan/Session Render Architecture]]
- implements [[ADR-001: Composition Library Architecture]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- relates_to [[ANALYSIS-002: Plan/Session Note Render Architecture]]
- part_of [[PLAN-001: Skills Ecosystem]]
- contains [[REQ-001-SPEC-007: Schema Common Module]]
- contains [[REQ-002-SPEC-007: PlanNote Zod Schema]]
- contains [[REQ-003-SPEC-007: SessionNote Zod Schema]]
- contains [[REQ-004-SPEC-007: PlanNote Markdown Parser]]
- contains [[REQ-005-SPEC-007: SessionNote Markdown Parser]]
- contains [[REQ-006-SPEC-007: PlanNote Markdown Renderer]]
- contains [[REQ-007-SPEC-007: SessionNote Markdown Renderer]]
- contains [[REQ-008-SPEC-007: Mermaid Renderer]]
- contains [[REQ-009-SPEC-007: Plan Mutation API]]
- contains [[REQ-010-SPEC-007: Session Mutation API]]
- contains [[REQ-011-SPEC-007: Round-Trip Property Test]]
- contains [[REQ-012-SPEC-007: PLAN-001 Dogfood Migration]]
- contains [[DESIGN-001-SPEC-007: Composition Layer Architecture]]
- contains [[DESIGN-002-SPEC-007: Parser Renderer Round-Trip Strategy]]
- contains [[DESIGN-003-SPEC-007: Mutation API and Invariant Enforcement]]
- contains [[DESIGN-004-SPEC-007: Mermaid Renderer and Auto-Derivation]]
- contains [[TASK-001-SPEC-007: Implement Common Schema Module]]
- contains [[TASK-002-SPEC-007: Implement PlanNote Zod Schema]]
- contains [[TASK-003-SPEC-007: Implement SessionNote Zod Schema]]
- contains [[TASK-004-SPEC-007: Implement AST Helpers]]
- contains [[TASK-005-SPEC-007: Implement PlanNote Parser]]
- contains [[TASK-006-SPEC-007: Implement SessionNote Parser]]
- contains [[TASK-007-SPEC-007: Implement PlanNote Renderer]]
- contains [[TASK-008-SPEC-007: Implement SessionNote Renderer]]
- contains [[TASK-009-SPEC-007: Implement Mermaid Renderer]]
- contains [[TASK-010-SPEC-007: Implement Plan Mutation API]]
- contains [[TASK-011-SPEC-007: Implement Session Mutation API]]
- contains [[TASK-012-SPEC-007: Implement Round-Trip Property Test]]
- contains [[TASK-013-SPEC-007: Dogfood PLAN-001 Migration]]
