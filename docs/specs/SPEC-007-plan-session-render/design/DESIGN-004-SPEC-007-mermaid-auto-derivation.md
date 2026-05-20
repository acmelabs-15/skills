---
title: 'DESIGN-004-SPEC-007: Mermaid Renderer and Auto-Derivation'
type: design
permalink: specs/spec-007-plan-session-render/design/design-004-spec-007-mermaid-auto-derivation
status: DRAFT
tags:
- design
- spec-007
- mermaid
- auto-derivation
---

# DESIGN-004-SPEC-007: Mermaid Renderer and Auto-Derivation

## Context

ADR-003 D-7 locks Mermaid as a separate render concern. Mermaid charts were one of the most painful manual drift surfaces: class assignments, substatus icons, edge linkStyle indices, and classDef palette all required coordinated updates that LLM-authored edit_note could not reliably manage. This design specifies the renderMermaid pure function, its inputs, outputs, and styling conventions.

## Function Signature

```typescript
interface MermaidOptions {
  parts: Array<{
    id: string;
    phase: string;
    substatus: string;
    depends_on: string[];
    title: string;
  }>;
  groupBy?: 'phase' | 'none';  // default: 'phase'
}

function renderMermaid(opts: MermaidOptions): string;
```

## Output Structure

The function produces a complete Mermaid flowchart string including:

1. **Init block**: `%%{init: {'theme': 'base', 'themeVariables': {...}, 'flowchart': {'curve': 'basis', 'padding': 20}}}%%`

2. **Graph direction**: `graph TD` for 5+ subgraphs; `graph LR` for fewer

3. **classDef declarations**: `classDef done fill:#d4edda,stroke:#28a745,color:#155724` and `classDef pending fill:#fff3cd,stroke:#ffc107,color:#856404`

4. **Subgraphs by phase** (when groupBy='phase'): each phase gets a subgraph with `direction TB`

5. **Node labels**: `partId["<emoji> <b>partId</b><br/><span>title</span>"]` where emoji maps from substatus (checkmark for DONE, hourglass for IN_PROGRESS, circle for PENDING/READY, octagonal-sign for BLOCKED)

6. **Edges from depends_on**: `partA --> partB` for each dependency

7. **Class assignments**: `class partId done` or `class partId pending` based on substatus

8. **linkStyle directives**: gray for intra-phase edges, blue for cross-phase edges

## Substatus to Styling Mapping

| Substatus | Class | Emoji | Fill |
| --- | --- | --- | --- |
| DONE | done | checkmark | #d4edda |
| IN_PROGRESS | pending | hourglass | #fff3cd |
| PENDING | pending | circle | #fff3cd |
| READY | pending | circle | #fff3cd |
| BLOCKED | pending | octagonal-sign | #fff3cd |
| DEFERRED | done | dash | #d4edda |
| ABANDONED | done | cross | #d4edda |

## Integration with renderPlanNote

renderPlanNote calls renderMermaid internally:

```typescript
const mermaidBlock = renderMermaid({
  parts: plan.parts.map(p => ({
    id: p.id,
    phase: p.phase,
    substatus: p.substatus,
    depends_on: p.depends_on,
    title: p.title,
  })),
  groupBy: 'phase',
});
```

The output is embedded in a markdown fenced code block with language identifier `mermaid`.

## Standalone Usage

renderMermaid is also exposed as a standalone export for manual regeneration:

```typescript
import { renderMermaid } from './renderers/mermaid';
const graph = renderMermaid({ parts, groupBy: 'phase' });
```

## Observations

- [design] renderMermaid is a pure function: same inputs always produce same output; no side effects #pure-function #determinism
- [technique] Substatus-to-class mapping is a lookup table, not conditional logic; adding new substatuses requires one table entry #extensibility #mapping
- [constraint] Styling must match CONVENTIONS Section 4.12 palette for compatibility with existing Brain note Mermaid conventions #conventions #palette
- [decision] Graph direction switches from TD to LR based on subgraph count for readability at different scales #layout #adaptive

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
- relates_to [[DESIGN-001-SPEC-007: Composition Layer Architecture]]
