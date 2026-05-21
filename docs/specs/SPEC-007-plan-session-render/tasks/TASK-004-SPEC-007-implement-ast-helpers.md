---
title: 'TASK-004-SPEC-007: Implement AST Helpers'
type: task
permalink: specs/spec-007-plan-session-render/tasks/task-004-spec-007-implement-ast-helpers
status: DONE
effort: S
estimate: 0.5d
tags:
- task
- spec-007
- parser
- ast-helpers
---

# TASK-004-SPEC-007: Implement AST Helpers

## Design Context

This TASK realizes the shared parser utilities from ANALYSIS-002 Appendix D ast-helpers.ts, supporting both REQ-004 and REQ-005.

## Objective

Create `_shared/composition/src/parsers/ast-helpers.ts` with shared AST parsing utilities: extractFrontmatter, sectionizeH2, sectionizeH3, proseFromChildren, stripWikilink, findList, findTable, tableRows, tableHeader, bulletFieldMap, checkboxItems, and ParseError class.

## Scope

**In Scope**:

- All 12 utility functions per ANALYSIS-002 Appendix D draft
- ParseError class with path array for Zod-style error locality
- bulletFieldMap matching both `- **Field**: value` and `- Field: value` patterns
- stripWikilink detecting and extracting `[[ref]]` syntax

**Out of Scope**:

- Plan-specific or session-specific parsing logic (TASK-005, TASK-006)

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/parsers/ast-helpers.ts` | NEW | Shared AST parsing utilities |

## Testing Requirements

- extractFrontmatter returns parsed YAML object from AST with yaml node
- sectionizeH2 correctly splits AST into named sections
- bulletFieldMap parses both bold and non-bold field patterns
- checkboxItems extracts text and done state from checkbox lists
- stripWikilink returns { ref } object for wikilinks and string for plain text
- ParseError includes path array in message

## Definition of Done

- [ ] All 12 utility functions implemented per ANALYSIS-002 draft
- [ ] ParseError class provides Zod-style error paths
- [ ] bulletFieldMap handles both bold and non-bold patterns
- [ ] Unit tests cover each utility function including edge cases
- [ ] biome lint + tsc --noEmit pass

## ADR Compliance

- [ ] Honors ADR-001 D-2: uses unified + remark mdast types

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.5d | Utility functions with clear specifications |
| AI-Dominant | 0.5d | Draft code available in ANALYSIS-002 |
| AI-Assisted | 0.5d | Direct translation from draft |

## Observations

- [task] AST helpers are shared between plan and session parsers; implementing them first enables parallel parser development #shared #foundation
- [technique] bulletFieldMap forgiveness (unknown bullets ignored) enables forward compatibility as template evolves #forgiving #extensibility
- [constraint] ParseError carries path array matching Zod error locality pattern for consistent error reporting #error-pattern #consistency

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[REQ-004-SPEC-007: PlanNote Markdown Parser]]
- implements [[REQ-005-SPEC-007: SessionNote Markdown Parser]]
- implements [[DESIGN-001-SPEC-007: Composition Layer Architecture]]
- validated_by [[QA-013-SPEC-007: Implement AST Helpers]]
