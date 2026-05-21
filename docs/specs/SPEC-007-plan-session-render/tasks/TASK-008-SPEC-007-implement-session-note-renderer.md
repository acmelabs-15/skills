---
title: 'TASK-008-SPEC-007: Implement SessionNote Renderer'
type: task
permalink: specs/spec-007-plan-session-render/tasks/task-008-spec-007-implement-session-note-renderer
status: DONE
effort: M
estimate: 0.5d
tags:
- task
- spec-007
- renderer
- session-note
---

# TASK-008-SPEC-007: Implement SessionNote Renderer

## Design Context

This TASK realizes REQ-007-SPEC-007 and the renderers/session-note.ts sketch from ANALYSIS-002 Appendix E.

## Objective

Create `_shared/composition/src/renderers/session-note.ts` implementing renderSessionNote that takes a SessionNote typed model and produces canonical markdown with sections in fixed order: frontmatter, H1, Scope, Bound PLAN, Events (H3 per event with typed-field bullets first, prose body after), Observations, Relations.

## Scope

**In Scope**:

- renderSessionNote main function using unified + remark-stringify
- Frontmatter serialization matching parser expectations
- Bound PLAN bullet list with wikilink ref and worked_parts
- Per-event H3 rendering with typed-field bullets before prose body
- Events rendered in ascending event-number order
- Observation and relation formatting per CONVENTIONS

**Out of Scope**:

- Plan renderer (TASK-007)
- Mutation API

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/renderers/session-note.ts` | NEW | SessionNote markdown renderer |

## Testing Requirements

- renderSessionNote produces valid markdown from parsed SessionNote model
- Events appear in ascending order
- Typed-field bullets appear before prose body in each event
- Bound PLAN list renders with wikilink ref and worked_parts
- Observations and Relations are final two H2 sections
- Round-trip: render(parse(session-fixture)) produces SHA-256 identical output

## Definition of Done

- [ ] renderSessionNote produces canonical markdown from SessionNote model
- [ ] Events rendered in ascending event-number order
- [ ] Per-event typed-field bullets rendered before prose body
- [ ] Bound PLAN section renders correctly
- [ ] Observations and Relations are final two H2 sections
- [ ] Round-trip identity holds on SESSION fixture
- [ ] biome lint + tsc --noEmit pass

## ADR Compliance

- [ ] Honors ADR-003 D-3: deterministic render script
- [ ] Honors ADR-003 D-2: SESSION as append-only event ledger
- [ ] Honors ADR-003 D-8: round-trip char-identity

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Simpler than plan renderer; no derived views |
| AI-Dominant | 0.5d | Sketch available; straightforward rendering |
| AI-Assisted | 0.5d | Follows same pattern as plan renderer |

## Observations

- [task] Session renderer is simpler than plan renderer with no derived views to regenerate #simpler #session
- [constraint] Typed-field bullets must precede prose body per parser contract #ordering #contract
- [technique] Same unified + remark-stringify pipeline as plan renderer; shared configuration #shared-pipeline

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[REQ-007-SPEC-007: SessionNote Markdown Renderer]]
- depends_on [[TASK-003-SPEC-007: Implement SessionNote Zod Schema]]
- validated_by [[QA-017-SPEC-007: Implement SessionNote Renderer]]
