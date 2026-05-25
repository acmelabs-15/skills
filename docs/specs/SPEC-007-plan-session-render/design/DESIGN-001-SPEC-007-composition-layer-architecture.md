---
title: 'DESIGN-001-SPEC-007: Composition Layer Architecture'
type: design
permalink: specs/spec-007-plan-session-render/design/design-001-spec-007-composition-layer-architecture
status: ACCEPTED
tags:
- design
- spec-007
- module-structure
- architecture
---

# DESIGN-001-SPEC-007: Composition Layer Architecture

## Context

This design defines the module layout for the plan/session render pipeline within the existing `shared/composition/` project. It extends the composition library established by SPEC-001 with schema, parser, renderer, and mutation modules specific to plan and session notes. The module boundaries enforce the separation between schema validation (contract), parsing (markdown to model), rendering (model to markdown), and mutation (typed state changes).

## Module Structure

```text
shared/composition/src/
  schemas/
    common.ts              # Shared enums, IDs, structural schemas (REQ-001; shared with ADR-002)
    plan-note.ts           # PlanNoteSchema + sub-schemas (REQ-002)
    session-note.ts        # SessionNoteSchema + event discriminated union (REQ-003)
  parsers/
    ast-helpers.ts         # Shared AST utilities (REQ-004)
    plan-note.ts           # parsePlanNote (REQ-004)
    session-note.ts        # parseSessionNote (REQ-005)
  renderers/
    plan-note.ts           # renderPlanNote (REQ-006)
    session-note.ts        # renderSessionNote (REQ-007)
    mermaid.ts             # renderMermaid pure function (REQ-008)
  plan-mutations.ts        # 9 typed plan mutations (REQ-009)
  session-mutations.ts     # append-event mutation (REQ-010)
  tests/
    plan-schema.test.ts    # Schema validation tests
    session-schema.test.ts # Schema validation tests
    plan-parser.test.ts    # Parser unit tests
    session-parser.test.ts # Parser unit tests
    plan-renderer.test.ts  # Renderer unit tests
    session-renderer.test.ts
    mermaid.test.ts        # Mermaid renderer tests
    plan-mutations.test.ts # Mutation API tests
    session-mutations.test.ts
    round-trip.test.ts     # SHA-256 char-identity gate (REQ-011)
    fixtures/
      plan-001-trimmed.md  # PLAN-001 in trimmed template form
      session-fixture.md   # SESSION-2026-05-19_01
```

## Interfaces

```typescript
// Schema exports
export { PlanNoteSchema, type PlanNote } from "./schemas/plan-note";
export { SessionNoteSchema, type SessionNote, type Event } from "./schemas/session-note";
export * from "./schemas/common";

// Parser exports
export { parsePlanNote } from "./parsers/plan-note";
export { parseSessionNote } from "./parsers/session-note";

// Renderer exports
export { renderPlanNote } from "./renderers/plan-note";
export { renderSessionNote } from "./renderers/session-note";
export { renderMermaid } from "./renderers/mermaid";

// Mutation exports
export { applyPlanMutation, type PlanMutation } from "./plan-mutations";
export { applySessionMutation, type SessionMutation } from "./session-mutations";
```

## Dependency Graph

```text
schemas/common.ts
  <- schemas/plan-note.ts
  <- schemas/session-note.ts
  <- parsers/ast-helpers.ts (observation/relation parsing uses category/verb enums)

schemas/plan-note.ts <- parsers/plan-note.ts <- plan-mutations.ts
schemas/session-note.ts <- parsers/session-note.ts <- session-mutations.ts

parsers/plan-note.ts <- renderers/plan-note.ts (NOT a direct dep; both depend on PlanNote type)
renderers/mermaid.ts <- renderers/plan-note.ts

plan-mutations.ts depends on: parsers/plan-note.ts + renderers/plan-note.ts + schemas/plan-note.ts
session-mutations.ts depends on: parsers/session-note.ts + renderers/session-note.ts + schemas/session-note.ts
```

## Algorithms

The pipeline follows a layered architecture with four layers:

1. **Schema layer** (validation contract): Zod schemas define the typed model. No I/O. No parsing. Pure type definitions and validation logic.

2. **Parser layer** (markdown to model): unified + remark AST parsing. Depends on schema layer for final validation. Produces typed model from raw markdown. Derived sections (Progress Dashboard, Mermaid) are skipped.

3. **Renderer layer** (model to markdown): unified + remark-stringify emission. Takes typed model, produces canonical markdown. Derived views regenerated from structural content. Section ordering enforced.

4. **Mutation layer** (typed state changes): reads markdown, parses, mutates in-memory model, validates, re-renders, writes atomically. One disk write per mutation.

Each layer depends only on layers below it. Circular dependencies are structurally impossible.

## Data Flow

```text
LLM intent + parameters
  -> plan-mutations.ts (typed mutation command)
  -> Bun.file().text() (read existing markdown)
  -> parsers/plan-note.ts (markdown -> PlanNote)
  -> in-memory mutation (apply typed change)
  -> schemas/plan-note.ts (PlanNoteSchema.parse() validation)
  -> renderers/plan-note.ts (PlanNote -> canonical markdown)
  -> renderers/mermaid.ts (parts -> Mermaid string, embedded in render)
  -> Bun.write() (atomic single disk write)
```

## Edge Cases

| Case | Behavior |
| --- | --- |
| Empty tasks/pending_decisions/editor_mirror | Default to empty arrays; render empty tables with headers only |
| Part with no depends_on | Rendered as standalone node in Mermaid graph |
| Archive tasks in details collapse | If remark drops content inside HTML details, fall back to plain H3 + table |
| Frontmatter title with colons | js-yaml handles single-quoted YAML strings |
| bulletFieldMap encounters unknown field | Ignored; Zod catches schema gaps at validation |

## Performance Considerations

Full re-render on every mutation is acceptable for note-sized files (1-100 KB). SHA-256 hash computation is sub-millisecond. No optimization needed at this scale.

## Observations

- [design] Four-layer architecture (schema/parser/renderer/mutation) with strict dependency direction prevents circular dependencies #layered #architecture
- [decision] common.ts shared between ADR-003 note schemas and ADR-002 composition schemas; single source of truth for overlapping types #shared-schema #dry
- [technique] Derived views (Dashboard, Mermaid) regenerated during render, not stored separately; eliminates an entire class of drift #derived-views #anti-drift
- [constraint] Each layer depends only on layers below; mutation layer depends on all three lower layers #dependency-direction #layered

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
- implements [[ADR-001: Composition Library Architecture]]
