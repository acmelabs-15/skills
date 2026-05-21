---
title: 'REQ-008-SPEC-007: Mermaid Renderer'
type: requirement
permalink: specs/spec-007-plan-session-render/requirements/req-008-spec-007-mermaid-renderer
status: ACCEPTED
tags:
- requirement
- spec-007
- renderer
- mermaid
---

# REQ-008-SPEC-007: Mermaid Renderer

## Requirement Statement

WHEN a parts array with id, phase, substatus, depends_on, and title is provided
THE SYSTEM SHALL render a Mermaid flowchart string via `renderMermaid(opts: MermaidOptions): string` at `_shared/composition/src/renderers/mermaid.ts` producing a canonical Mermaid graph with init block (theme, flowchart curve, font, padding), classDef done and pending palette, subgraphs grouped by phase, node labels with emoji-prefix and bold id and title span, edges from depends_on, class assignments from substatus, and linkStyle directives for intra-wave (gray) vs cross-wave (blue) edges
SO THAT Mermaid dependency graphs are generated from structural data not hand-authored, eliminating styling drift.

## Pattern

Pure Function (Stateless: receives parts array and layout options, returns Mermaid string).

## Priority

P1 -- the Mermaid renderer is called by the plan renderer but is independently callable.

## Category

Functional

## Context

ADR-003 D-7 locks Mermaid as a separate render concern. The Mermaid chart was one of the most painful drift surfaces in manual maintenance. ANALYSIS-002 Appendix E provides the renderMermaid sketch. The function is a pure function callable independently for manual regeneration and used internally by renderPlanNote for automatic propagation on every substatus change.

## Acceptance Criteria

- [ ] GIVEN a parts array with 3 parts in different phases and substatuses
      WHEN renderMermaid() is called with groupBy='phase'
      THEN the output contains subgraph blocks per phase

- [ ] GIVEN a part with substatus DONE
      WHEN renderMermaid() generates class assignments
      THEN the part node gets class "done"

- [ ] GIVEN a part with substatus PENDING or READY
      WHEN renderMermaid() generates class assignments
      THEN the part node gets class "pending"

- [ ] GIVEN parts where part B depends_on part A
      WHEN renderMermaid() generates edges
      THEN an edge from A to B is present

- [ ] GIVEN the output Mermaid string
      WHEN inspected
      THEN it contains the canonical init block with %%{init:...}%% and classDef done and classDef pending

- [ ] GIVEN the output
      WHEN used in a Mermaid renderer (e.g., GitHub markdown preview)
      THEN it produces a valid flowchart without syntax errors

## Implementation Notes

Expected size 60-100 LOC. The init block, classDef palette, node label format, and linkStyle conventions must match CONVENTIONS Section 4.12 Mermaid palette. The function must handle graph TD layout, direction TB per subgraph, and emoji-prefix node labels.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/renderers/mermaid.ts` | NEW | Mermaid flowchart renderer |

## Observations

- [requirement] Mermaid renderer is a pure function producing canonical styled flowcharts from parts data #mermaid #pure-function
- [decision] Single source of truth for graph styling; eliminates the most painful manual drift surface #anti-drift #styling
- [constraint] Must match CONVENTIONS Section 4.12 palette for classDef, init block, and node label format #conventions #mermaid

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
- required_by [[REQ-006-SPEC-007: PlanNote Markdown Renderer]]
