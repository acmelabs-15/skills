---
title: 'REQ-004-SPEC-007: PlanNote Markdown Parser'
type: requirement
permalink: specs/spec-007-plan-session-render/requirements/req-004-spec-007-plan-note-parser
status: DRAFT
tags:
- requirement
- spec-007
- parser
- plan-note
---

# REQ-004-SPEC-007: PlanNote Markdown Parser

## Requirement Statement

WHEN a plan note markdown file is provided as a string
THE SYSTEM SHALL parse it via `parsePlanNote(markdown: string): PlanNote` at `_shared/composition/src/parsers/plan-note.ts` using unified + remark-parse + remark-frontmatter into an AST, extract frontmatter via YAML, sectionize by H2/H3 headings, parse each section (Scope, Objectives, Parts with bullet field attrs and DoD and optional decisions table, Tasks with Active/Backlog/Archive sub-tables, Pending User Decisions, Editor Mirror IDs, Blockers, Observations, Relations), skip derived sections (Progress Dashboard, Cross-Part Dependency Graph), derive phase from part id, and validate the complete model via PlanNoteSchema.parse()
SO THAT plan note markdown is transformed into a typed in-memory model suitable for mutation and rendering.

## Pattern

Parser (Stateless: called with markdown string, returns typed model or throws ParseError).

## Priority

P0 -- the parser is required before mutations or rendering can operate.

## Category

Functional

## Context

ADR-003 D-3 locks deterministic render scripts. The parser converts markdown to the typed model that the mutation API operates on and the renderer emits from. ANALYSIS-002 Appendix D provides the full parser draft for plan-note.ts including parsePlanNote, parseScope, parseObjectives, parsePartsSection, parsePart, parseDodFromPart, parseDecisionsTable, parseTasksSection, and helpers. 10 parser design decisions and 5 edge cases are documented.

## Acceptance Criteria

- [ ] GIVEN the trimmed PLAN-001 fixture markdown
      WHEN parsePlanNote() is called
      THEN it returns a PlanNote object that passes PlanNoteSchema validation

- [ ] GIVEN a part heading formatted as "partId -- title"
      WHEN parsePartsSection processes it
      THEN it extracts the correct part id and title

- [ ] GIVEN part bullet fields "- **Substatus**: DONE" and "- **Owning session**: [[SESSION-2026-05-19_01: ...]]"
      WHEN bulletFieldMap processes them
      THEN Substatus is extracted as "DONE" and session wikilink is stripped to SessionIdSchema format

- [ ] GIVEN the Progress Dashboard and Cross-Part Dependency Graph H2 sections
      WHEN parsePlanNote encounters them
      THEN they are skipped (not parsed into the model; regenerated during render)

- [ ] GIVEN Tasks with Active/Backlog/Archive H3 sub-tables
      WHEN parseTasksSection processes them
      THEN tasks are extracted with correct status derived from sub-heading when Status column is absent

- [ ] GIVEN a parser error (e.g., missing Scope section)
      WHEN parsePlanNote is called
      THEN it throws ParseError with path array indicating the error location

- [ ] GIVEN phase derivation from part id "spec.SPEC-001"
      WHEN derivePhaseFromId is called
      THEN it returns "spec"

## Implementation Notes

Full parser draft in ANALYSIS-002 Appendix D parsers/plan-note.ts section. Uses ast-helpers.ts for shared utilities (extractFrontmatter, sectionizeH2, sectionizeH3, bulletFieldMap, checkboxItems, etc.). Phase is derived from part id to eliminate a drift surface. Schema parse is the final step so bugs surface as Zod issues at a known boundary.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/parsers/plan-note.ts` | NEW | PlanNote markdown parser |
| `_shared/composition/src/parsers/ast-helpers.ts` | NEW | Shared AST parsing utilities |

## Observations

- [requirement] Parser converts markdown to typed model via unified AST; derived sections are skipped not parsed #parser #plan-note
- [technique] Phase derived from part id eliminates a drift surface; no separate phase field in markdown #phase-derivation #anti-drift
- [decision] Schema parse is the final step; all parsing bugs surface as Zod validation errors at a known boundary #validation-boundary #error-handling

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
- depends_on [[REQ-002-SPEC-007: PlanNote Zod Schema]]
- depends_on [[REQ-001-SPEC-007: Schema Common Module]]
