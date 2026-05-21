---
title: 'SPEC-006: Defrag and Ingest Skills'
type: spec
status: ACCEPTED
permalink: specs/spec-006-defrag-and-ingest-skills/spec-006-defrag-and-ingest-skills
tags:
- spec
- defrag
- ingest
- skills-ecosystem
- higher-level
---

# SPEC-006: Defrag and Ingest Skills

## Context

This SPEC delivers the two higher-level skills (/defrag and /ingest) that compose on top of the /decompose and /recompose primitives from SPEC-005. /defrag is a periodic curator (cron-runnable) that audits memory state against CONVENTIONS Section 6 thresholds and delegates split candidates to /decompose, merge candidates to /recompose, and stale entries to native delete. /ingest brings external content into the Brain knowledge graph as well-formed notes with verbatim source preservation and full CONVENTIONS compliance. Both skills coexist with the existing ~/Dev/basic-memory-skills/memory-ingest and memory-defrag (per ADR-001 F-3).

Per ANALYSIS-001 P1-2 amendment, /ingest Brain-awareness requirements (CONVENTIONS compliance, Pattern 2 three-phase write, 16 canonical entity types, observation category prefix + tags, final-two-sections invariant) are NON-ADR scope. They derive from KICKOFF-BRIEF.md, not from any ADR D-N decision. This is documented explicitly in REQ-005-SPEC-006.

## Phases

### Phase 1 -- Requirements (6 REQs)

- [ ] REQ-001-SPEC-006: Defrag Skill Implementation
- [ ] REQ-002-SPEC-006: Defrag Memory State Audit
- [ ] REQ-003-SPEC-006: Defrag Delegation Protocol
- [ ] REQ-004-SPEC-006: Ingest Skill Implementation
- [ ] REQ-005-SPEC-006: Ingest Brain-Awareness
- [ ] REQ-006-SPEC-006: Coexistence with Memory-Ingest and Memory-Defrag

### Phase 2 -- Design (3 DESIGNs)

- [ ] DESIGN-001-SPEC-006: Defrag Skill Architecture
- [ ] DESIGN-002-SPEC-006: Ingest Skill Architecture
- [ ] DESIGN-003-SPEC-006: Skill Coexistence Strategy

### Phase 3 -- Implementation (7 TASKs)

- [ ] TASK-001-SPEC-006: Implement Defrag CLI and Skill Structure (S, 0.5d)
- [ ] TASK-002-SPEC-006: Implement Defrag Memory Audit (M, 1.5d)
- [ ] TASK-003-SPEC-006: Implement Defrag Delegation to Decompose Recompose and Delete (M, 1d)
- [ ] TASK-004-SPEC-006: Implement Ingest CLI and Skill Structure (M, 1.5d)
- [ ] TASK-005-SPEC-006: Implement Ingest Brain-Awareness (M, 1.5d)
- [ ] TASK-006-SPEC-006: Defrag and Ingest Tests (M, 2d)
- [ ] TASK-007-SPEC-006: Document Defrag and Ingest Skill UX in README (S, 0.5d)

## Artifact Status

| Artifact | Count | Status |
|:--|:--|:--|
| REQ | 6 | DRAFT |
| DESIGN | 3 | DRAFT |
| TASK | 7 | TODO |
| SPEC root | 1 | ACCEPTED |

## Effort Rollup

| Task | Effort | Estimate |
|:--|:--|:--|
| TASK-001 | S | 0.5d |
| TASK-002 | M | 1.5d |
| TASK-003 | M | 1d |
| TASK-004 | M | 1.5d |
| TASK-005 | M | 1.5d |
| TASK-006 | M | 2d |
| TASK-007 | S | 0.5d |
| Total | M | 8.5d AI-Dominant |

LOC estimate: ~300 (defrag SKILL.md ~80 + defrag scripts ~120 + ingest SKILL.md ~60 + ingest scripts ~100 + shared detect-context ~40) plus ~400 test LOC. Total ~700 including tests.

## ADR Cross-Cutting Constraints

- ADR-001 F-1 (symlink install): /defrag and /ingest installed via symlinks at ~/.claude/skills/ per install.sh
- ADR-001 F-2 (Brain-first, Basic Memory subset): Auto-detect from frontmatter type field; Brain gets full CONVENTIONS compliance, Basic Memory gets simplified path
- ADR-001 F-3 (coexist with existing skills): /defrag and /ingest coexist with memory-defrag and memory-ingest; distinct names, no modification of existing skills
- ADR-001 F-6 (Bun + TS runtime): All source files use Bun-native APIs and TypeScript with biome lint/format

## Non-ADR Scope (P1 Amendment)

/ingest Brain-awareness requirements are sourced from KICKOFF-BRIEF.md, not any ADR decision. They include: CONVENTIONS Section 3 frontmatter format, Pattern 2 three-phase write (CONVENTIONS Section 1.7.2), 16 canonical entity types (CONVENTIONS Section 3), observation category prefix + 1-3 inline tags (CONVENTIONS Section 4.2), Relations section with valid relation types (CONVENTIONS Section 4.4), and final-two-sections invariant Observations then Relations (CONVENTIONS Section 4.0). This non-ADR scope is documented per ANALYSIS-001 P1-2 amendment.

## Dependencies

- SPEC-005 Decompose and Recompose Skills (DONE + ACCEPTED): /defrag delegates to /decompose and /recompose primitives; the CompositionAdapter dispatcher from SPEC-005 provides incremental adapter registration
- SPEC-001 Composition Core and ADR Adapter (DONE + ACCEPTED): /defrag uses library utilities for heuristic evaluation; /ingest shares install infrastructure

## Observations

- [spec] SPEC-006 delivers /defrag (periodic curator) and /ingest (external-to-graph) as the two higher-level skills composing on /decompose and /recompose primitives #defrag #ingest #higher-level
- [spec] 17 total notes in subtree: 6 REQ + 3 DESIGN + 7 TASK + 1 SPEC root #note-count #subtree
- [spec] /ingest Brain-awareness is non-ADR scope per ANALYSIS-001 P1-2 amendment; sourced from KICKOFF-BRIEF.md #non-adr #p1-amendment
- [constraint] /defrag preserves zero-drift guarantee by delegating to /decompose and /recompose rather than performing composition operations directly #zero-drift #delegation
- [risk] /defrag audit cycle performance depends on Brain MCP list_directory and read_note latency across potentially large note collections; may need pagination or caching for projects with 500+ notes #performance #scalability

## Relations

- implements [[ADR-001: Composition Library Architecture]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- relates_to [[ANALYSIS-001: SPEC Clustering]]
- depends_on [[SPEC-005: Decompose and Recompose Skills]]
- part_of [[PLAN-001: Skills Ecosystem]]
- contains [[REQ-001-SPEC-006: Defrag Skill Implementation]]
- contains [[REQ-002-SPEC-006: Defrag Memory State Audit]]
- contains [[REQ-003-SPEC-006: Defrag Delegation Protocol]]
- contains [[REQ-004-SPEC-006: Ingest Skill Implementation]]
- contains [[REQ-005-SPEC-006: Ingest Brain-Awareness]]
- contains [[REQ-006-SPEC-006: Coexistence with Memory-Ingest and Memory-Defrag]]
- contains [[DESIGN-001-SPEC-006: Defrag Skill Architecture]]
- contains [[DESIGN-002-SPEC-006: Ingest Skill Architecture]]
- contains [[DESIGN-003-SPEC-006: Skill Coexistence Strategy]]
- contains [[TASK-001-SPEC-006: Implement Defrag CLI and Skill Structure]]
- contains [[TASK-002-SPEC-006: Implement Defrag Memory Audit]]
- contains [[TASK-003-SPEC-006: Implement Defrag Delegation to Decompose Recompose and Delete]]
- contains [[TASK-004-SPEC-006: Implement Ingest CLI and Skill Structure]]
- contains [[TASK-005-SPEC-006: Implement Ingest Brain-Awareness]]
- contains [[TASK-006-SPEC-006: Defrag and Ingest Tests]]
- contains [[TASK-007-SPEC-006: Document Defrag and Ingest Skill UX in README]]
