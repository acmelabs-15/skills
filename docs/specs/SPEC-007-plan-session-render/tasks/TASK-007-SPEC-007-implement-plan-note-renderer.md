---
title: 'TASK-007-SPEC-007: Implement PlanNote Renderer'
type: task
permalink: specs/spec-007-plan-session-render/tasks/task-007-spec-007-implement-plan-note-renderer
status: TODO
effort: L
estimate: 1.5d
tags:
- task
- spec-007
- renderer
- plan-note
---

# TASK-007-SPEC-007: Implement PlanNote Renderer

## Design Context

This TASK realizes REQ-006-SPEC-007 and the renderers/plan-note.ts sketch from ANALYSIS-002 Appendix E, plus DESIGN-002-SPEC-007 round-trip strategy.

## Objective

Create `_shared/composition/src/renderers/plan-note.ts` implementing renderPlanNote that takes a PlanNote typed model and produces canonical markdown. The renderer emits sections in fixed canonical order, regenerates Progress Dashboard (phase-by-substatus pivot table) and Cross-Part Dependency Graph (via renderMermaid), and formats all structural elements deterministically.

## Scope

**In Scope**:

- renderPlanNote main function using unified + remark-stringify + remark-gfm
- Frontmatter serialization via js-yaml.dump with round-trip-preserving options
- Section rendering in canonical order: frontmatter, H1, Scope, Objectives, Progress Dashboard, Cross-Part Deps Graph, Parts, Tasks, PUD, Editor Mirror, Blockers, Observations, Relations
- Progress Dashboard table generation from parts substatus counts by phase
- Mermaid block embedding via renderMermaid call
- Per-part H3 rendering with bullet attrs, DoD checkbox list, optional decisions table
- Tasks Active/Backlog/Archive sub-table rendering
- Observation and relation formatting per CONVENTIONS Section 4.2 and 4.4

**Out of Scope**:

- Session renderer (TASK-008)
- Mermaid renderer (TASK-009)
- Mutation API

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/renderers/plan-note.ts` | NEW | PlanNote markdown renderer |

## Testing Requirements

- renderPlanNote produces valid markdown from parsed PlanNote model
- Progress Dashboard counts match actual part substatus distribution
- Mermaid block present in Cross-Part Dependency Graph section
- Part bullet attrs rendered in bold-label colon-value format
- Tasks split into Active/Backlog/Archive with correct column schemas
- Observations and Relations are the final two H2 sections
- Round-trip test: render(parse(fixture)) produces SHA-256 identical output

## Definition of Done

- [ ] renderPlanNote produces canonical markdown from PlanNote model
- [ ] Progress Dashboard regenerated as phase-by-substatus pivot table
- [ ] Cross-Part Dependency Graph contains renderMermaid output
- [ ] Per-part sections render with bullet attrs + DoD + optional decisions table
- [ ] Tasks Active/Backlog/Archive sub-tables render with correct columns
- [ ] Observations and Relations are final two H2 sections
- [ ] Round-trip identity holds on trimmed PLAN-001 fixture
- [ ] biome lint + tsc --noEmit pass

## ADR Compliance

- [ ] Honors ADR-003 D-3: deterministic render script
- [ ] Honors ADR-003 D-7: Mermaid as derived view regenerated during render
- [ ] Honors ADR-003 D-8: round-trip char-identity for structural content
- [ ] Honors ADR-001 D-2: uses unified + remark-stringify

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 2d | Table generation + round-trip tuning |
| AI-Dominant | 1.5d | Sketch available; remark-stringify config tuning for round-trip |
| AI-Assisted | 1.5d | Renderer sketch in ANALYSIS-002 |

## Observations

- [task] Plan renderer is the largest renderer with derived view generation and 12 section types #complexity #renderer
- [technique] remark-stringify configuration must match parser expectations for round-trip identity #config #round-trip
- [constraint] Progress Dashboard and Mermaid are regenerated on every render; never preserved from input #derived #regenerated

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[REQ-006-SPEC-007: PlanNote Markdown Renderer]]
- implements [[DESIGN-002-SPEC-007: Parser Renderer Round-Trip Strategy]]
- depends_on [[TASK-002-SPEC-007: Implement PlanNote Zod Schema]]
- depends_on [[TASK-009-SPEC-007: Implement Mermaid Renderer]]
