---
title: 'TASK-005-SPEC-008: Implement ADR Parser'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-005-spec-008-implement-adr-parser
status: DONE
effort: M
estimate: 1d
tags:
- task
- spec-008
- parser
- adr
- wave-2
---

# TASK-005-SPEC-008: Implement ADR Parser

## Objective

Implement `parseAdrNote(markdown: string): AdrNote` at `shared/composition/src/parsers/adr-note.ts` per [[REQ-002-SPEC-008: New Parser Suite]] and [[DESIGN-001-SPEC-008: Coverage Module Layout]]. The parser uses unified plus remark-parse plus remark-frontmatter to produce an AST, extracts frontmatter via js-yaml, dispatches body sections via the `bulletFieldMap` pattern from SPEC-007 DESIGN-002, parses Observations and Relations via the existing AST helpers, then validates the assembled model via `AdrNoteSchema.parse()` from TASK-001. Parsing failures throw Zod errors with structured paths. Mismatched `type` literals (e.g., feeding a non-ADR file) fail at the frontmatter layer.

This TASK depends on TASK-001 (schema is the parser's contract) and Track 4 renaming `shared/` to `shared/`.

## Definition of Done
- [x] File `shared/composition/src/parsers/adr-note.ts` exists and exports `parseAdrNote`
- [x] Frontmatter is parsed via js-yaml and validated against `AdrNoteSchema['frontmatter']`
- [x] Body sections are dispatched via `bulletFieldMap`; unknown sections are reported through the schema (not silently dropped)
- [x] Considered Options table rows are parsed into the `considered_options` array with rationale per row
- [x] Clarifications items including checkbox state are parsed into the `clarifications` array
- [x] Observations and Relations are parsed via shared `parseObservations` and `parseRelations` AST helpers
- [x] Parser throws Zod error when input `type` field is not `decision`
- [x] Parser throws Zod error when input violates any superRefine rule from TASK-001
- [x] Unit tests cover: valid PROPOSED parse round-trips, valid ACCEPTED parse round-trips, wrong type rejection, malformed frontmatter rejection, missing required section rejection
- [x] Render-then-parse round-trip test passes (structural fields identical) where a renderer is available; if no renderer exists, integration test uses a fixture
- [x] `bun test shared/composition/tests/parsers/adr-note.test.ts` passes with at least 6 cases green
- [x] `biome check` passes
- [x] `tsc --noEmit` passes
- [x] `shared/composition/src/parsers/index.ts` re-exports `parseAdrNote`
## ADR Compliance
- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-2 (flat directory placement)
- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-5
- [x] Honors [[ADR-001: Composition Library Architecture]] (unified plus remark AST pattern)
## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/src/parsers/adr-note.ts` | NEW | parseAdrNote implementation |
| `shared/composition/src/parsers/index.ts` | MODIFY | Re-export parseAdrNote |
| `shared/composition/tests/parsers/adr-note.test.ts` | NEW | Unit tests for parseAdrNote |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1.5d | Considered Options table parsing is the most complex section |
| AI-Dominant | 1d | Pattern closely mirrors plan-note.ts |
| AI-Assisted | 1d | Existing parser as reference |

## Observations

- [fact] Implements parser layer for the ADR P0 schema gap; gates the claim validator in TASK-007 #adr #parser #p0
- [technique] Section dispatch via bulletFieldMap from SPEC-007 DESIGN-002; reuse keeps parser pattern uniform #pattern-reuse
- [constraint] Parser throws on type mismatch at the frontmatter layer; misrouted markdown cannot succeed silently #type-guard
- [risk] Path uses `shared/`; depends on Track 4 rename and TASK-001 schema #rename-dependency #task-001-dependency

## Relations

- implements [[REQ-002-SPEC-008: New Parser Suite]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[DESIGN-001-SPEC-008: Coverage Module Layout]]
- depends_on [[TASK-001-SPEC-008: Implement ADR Schema]]
- depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
- relates_to [[QA-053-SPEC-008: Implement ADR Parser]]
