---
title: 'TASK-009-SPEC-007: Implement Mermaid Renderer'
type: task
permalink: specs/spec-007-plan-session-render/tasks/task-009-spec-007-implement-mermaid-renderer
status: TODO
effort: S
estimate: 0.5d
tags:
- task
- spec-007
- renderer
- mermaid
---

# TASK-009-SPEC-007: Implement Mermaid Renderer

## Design Context

This TASK realizes REQ-008-SPEC-007 and DESIGN-004-SPEC-007.

## Objective

Create `_shared/composition/src/renderers/mermaid.ts` implementing renderMermaid as a pure function that takes a parts array with id, phase, substatus, depends_on, and title, and returns a canonical Mermaid flowchart string with init block, classDef palette, subgraphs by phase, emoji-prefix node labels, dependency edges, class assignments, and linkStyle directives.

## Scope

**In Scope**:

- renderMermaid function with MermaidOptions input
- Canonical init block with theme, flowchart curve, font, padding
- classDef done and pending with hex color palette
- Subgraph generation by phase (groupBy='phase')
- Node labels: emoji + bold id + title span
- Edges from depends_on arrays
- Class assignments from substatus mapping
- linkStyle for intra-phase (gray) vs cross-phase (blue) edges

**Out of Scope**:

- Plan renderer integration (TASK-007)
- Non-flowchart Mermaid diagram types

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/renderers/mermaid.ts` | NEW | Mermaid flowchart renderer |

## Testing Requirements

- renderMermaid produces valid Mermaid syntax (no parse errors)
- Subgraphs grouped by phase when groupBy='phase'
- DONE parts get class "done"; PENDING/READY parts get class "pending"
- Edges match depends_on relationships
- Init block and classDef present in output

## Definition of Done

- [ ] renderMermaid produces canonical Mermaid flowchart from parts array
- [ ] Init block matches CONVENTIONS Section 4.12 palette
- [ ] classDef done and pending with correct colors
- [ ] Subgraphs by phase with direction TB
- [ ] Node labels with emoji-prefix and bold id
- [ ] Edges from depends_on with correct linkStyle
- [ ] Class assignments from substatus mapping
- [ ] Unit tests verify syntax validity and styling
- [ ] biome lint + tsc --noEmit pass

## ADR Compliance

- [ ] Honors ADR-003 D-7: Mermaid as separate render concern, pure function
- [ ] Honors CONVENTIONS Section 4.12: canonical Mermaid palette

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.5d | Template-driven string construction |
| AI-Dominant | 0.5d | Straightforward pure function |
| AI-Assisted | 0.5d | Sketch in ANALYSIS-002 |

## Observations

- [task] Mermaid renderer is a pure function with no dependencies beyond the parts array type #pure-function #standalone
- [technique] String template construction with substatus-to-class lookup table #template #lookup
- [constraint] Must produce identical output for identical input; deterministic for round-trip fixture inclusion #determinism

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[REQ-008-SPEC-007: Mermaid Renderer]]
- implements [[DESIGN-004-SPEC-007: Mermaid Renderer and Auto-Derivation]]
- required_by [[TASK-007-SPEC-007: Implement PlanNote Renderer]]
