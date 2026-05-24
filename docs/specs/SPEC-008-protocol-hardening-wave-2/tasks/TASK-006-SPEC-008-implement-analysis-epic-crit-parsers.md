---
title: 'TASK-006-SPEC-008: Implement ANALYSIS, EPIC, and CRIT Parsers'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-006-spec-008-implement-analysis-epic-crit-parsers
status: DONE
effort: L
estimate: 2d
tags:
- spec-008
- parser
- analysis
- epic
- crit
---

# TASK-006-SPEC-008: Implement ANALYSIS, EPIC, and CRIT Parsers

## Objective

Implement `parseAnalysisNote`, `parseEpicNote`, and `parseCritNote` at `shared/composition/src/parsers/analysis-note.ts`, `epic-note.ts`, and `crit-note.ts` per [[REQ-002-SPEC-008: New Parser Suite]] and [[DESIGN-001-SPEC-008: Coverage Module Layout]]. Each parser follows the pattern established by TASK-005 (ADR parser): unified plus remark-parse, frontmatter via js-yaml, section dispatch via `bulletFieldMap`, Observations and Relations via shared AST helpers, final schema validation via the corresponding `*NoteSchema.parse()` call.

These three parsers are batched into one TASK because they share the same template (TASK-005 establishes the pattern) and differ only in per-type section handling (ANALYSIS detects `## Open Questions` presence; EPIC parses Contained Specs section; CRIT parses Findings table with severity enum). The CRIT parser must handle the parent-reference frontmatter shape (CRIT-NNN-PARENT-NNN-...).

This TASK depends on TASK-002 (ANALYSIS schema), TASK-003 (EPIC schema), TASK-004 (CRIT schema), TASK-005 (parser pattern established), and Track 4 renaming `_shared/` to `shared/`.

## Definition of Done


- [x] File `shared/composition/src/parsers/analysis-note.ts` exists and exports `parseAnalysisNote`
- [x] File `shared/composition/src/parsers/epic-note.ts` exists and exports `parseEpicNote`
- [x] File `shared/composition/src/parsers/crit-note.ts` exists and exports `parseCritNote`
- [x] `parseAnalysisNote` detects `## Open Questions` section heading presence (case-sensitive exact match) and sets `body.hasOpenQuestions: boolean` on the parsed model
- [x] `parseEpicNote` parses Contained Specs section rows into `body.containedSpecs: string[]` mirroring `contains` relations
- [x] `parseCritNote` parses Findings table into `body.findings: Finding[]` with severity enum, description, recommendation fields
- [x] Each parser throws Zod error when the input `type` field is wrong (analysis vs epic vs critique)
- [x] Each parser validates the assembled model via its `*NoteSchema.parse()`
- [x] Unit tests cover happy-path parse for each of the three types
- [x] Unit tests cover: ANALYSIS ACCEPTED plus Open Questions rejection, EPIC with contains but no Contained Specs rejection, CRIT with malformed parent-reference rejection
- [x] Render-then-parse round-trip test where a renderer exists; otherwise fixture-based integration test
- [x] `bun test shared/composition/tests/parsers/analysis-note.test.ts shared/composition/tests/parsers/epic-note.test.ts shared/composition/tests/parsers/crit-note.test.ts` passes with at least 12 cases total green
- [x] `biome check` passes on all three files
- [x] `tsc --noEmit` passes
- [x] `shared/composition/src/parsers/index.ts` re-exports `parseAnalysisNote`, `parseEpicNote`, `parseCritNote`

## ADR Compliance


- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-2 (flat directory placement; one file per type)
- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-5
- [x] Honors [[ADR-001: Composition Library Architecture]] (unified plus remark AST pattern; TASK-005 reference)

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/src/parsers/analysis-note.ts` | NEW | parseAnalysisNote |
| `shared/composition/src/parsers/epic-note.ts` | NEW | parseEpicNote |
| `shared/composition/src/parsers/crit-note.ts` | NEW | parseCritNote |
| `shared/composition/src/parsers/index.ts` | MODIFY | Re-export the three new parsers |
| `shared/composition/tests/parsers/analysis-note.test.ts` | NEW | Unit tests |
| `shared/composition/tests/parsers/epic-note.test.ts` | NEW | Unit tests |
| `shared/composition/tests/parsers/crit-note.test.ts` | NEW | Unit tests |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 2.5d | Three parsers; CRIT parent-reference and EPIC contained-specs require care |
| AI-Dominant | 2d | Pattern established by TASK-005; three near-identical implementations |
| AI-Assisted | 2d | Established pattern |

## Observations

- [fact] Three parsers batched because they share TASK-005's template; per-type variation is limited to one or two section handlers each #batched-parsers #pattern-reuse
- [technique] ANALYSIS parser detects Open Questions section by AST heading match; case-sensitive to avoid false positives from prose #ast-section-detection
- [constraint] EPIC parser requires Contained Specs section when contains relations exist; mismatch is a schema failure #explicit-structure
- [risk] Path uses `shared/`; depends on Track 4 rename plus TASK-002, TASK-003, TASK-004, TASK-005 #rename-dependency #chain-dependency

## Relations

- implements [[REQ-002-SPEC-008: New Parser Suite]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[DESIGN-001-SPEC-008: Coverage Module Layout]]
- depends_on [[TASK-002-SPEC-008: Implement ANALYSIS Schema]]
- depends_on [[TASK-003-SPEC-008: Implement EPIC Schema]]
- depends_on [[TASK-004-SPEC-008: Implement CRIT Schema]]
- depends_on [[TASK-005-SPEC-008: Implement ADR Parser]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
- relates_to [[QA-060-SPEC-008: Validation Report for TASK-006 ANALYSIS EPIC CRIT Parsers]]
