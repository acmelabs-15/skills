---
title: 'DESIGN-001-SPEC-002: BaseMarkdownAdapter Configuration Pattern'
type: design
status: ACCEPTED
permalink: specs/spec-002-simple-adapters/design/design-001-spec-002-basemarkdownadapter-configuration-pattern
tags:
- design
- spec-002
- base-adapter
- configuration
---

# DESIGN-001-SPEC-002: BaseMarkdownAdapter Configuration Pattern

## Requirements Addressed

- [[REQ-001-SPEC-002: ANALYSIS Adapter Implementation]]: defines how AnalysisAdapter instantiates via config overrides
- [[REQ-002-SPEC-002: SESSION Adapter Implementation]]: defines how SessionAdapter instantiates via config overrides

## Design Overview

ANALYSIS and SESSION adapters are concrete subclasses of BaseMarkdownAdapter (defined in SPEC-001 REQ-002-SPEC-001 and DESIGN-002-SPEC-001). Each subclass overrides a minimal set of configuration properties to specialize the base class behavior for its note type. No method overrides are needed for ANALYSIS; SESSION requires one additional property for cross_source_updates support.

This design realizes ADR-002 D-3's BaseMarkdownAdapter pattern: "ADR, ANALYSIS, and SESSION adapters extend a shared BaseMarkdownAdapter class with config-only overrides on section_delimiter, identifier_pattern, and related structural parameters."

## Component Architecture

### Component 1: AnalysisAdapter

**Purpose**: Specializes BaseMarkdownAdapter for ANALYSIS-type Brain notes.

**Definition**:

```typescript
export class AnalysisAdapter extends BaseMarkdownAdapter {
  readonly sourceType = "analysis" as const;
  readonly sectionDelimiter = "### ";
  readonly identifierPattern = /item-(\d+)/i;
  readonly identifierPrefix = "item-";
}
```

**Responsibilities**:

- Provides ANALYSIS-specific configuration to BaseMarkdownAdapter
- Registers as source_type "analysis" in the adapter dispatcher

**Interfaces**:

- Consumed by: adapter dispatcher (source_type resolution), decompose.ts, recompose.ts
- Implemented by: single concrete class (no further subclassing expected)

### Component 2: SessionAdapter

**Purpose**: Specializes BaseMarkdownAdapter for SESSION-type Brain notes.

**Definition**:

```typescript
export class SessionAdapter extends BaseMarkdownAdapter {
  readonly sourceType = "session" as const;
  protected readonly sectionDelimiter = "## Event ";
  protected readonly identifierPattern = /Event-(\d+)/i;
  protected readonly identifierPrefix = "Event-";
  readonly supportsCrossSourceUpdates = true;
}
```

**Convention note (reconciled by TASK-008-SPEC-002)**: SESSION notes use a two-form Event-NN convention. The H2 section delimiter is `"## Event "` (space-separated, e.g. `## Event 01`) for human-readable Markdown headings. The body identifier token is `Event-NN` (hyphen-separated, e.g. `Event-01`) for tokenized references in body text, observations, and wikilinks. The `identifierPattern` `/Event-(\d+)/i` matches body tokens; `renumber_map` keys target the body token form. Section headings are renumbered indirectly via line-level edits driven by the same map. The `/i` flag is sanctioned to tolerate downstream casing drift without breaking parse. REQ-002 AC-3 "Event-NN format" governs the canonical identifier form.

**Responsibilities**:

- Provides SESSION-specific configuration to BaseMarkdownAdapter
- Declares cross_source_updates support via supportsCrossSourceUpdates flag
- Registers as source_type "session" in the adapter dispatcher

**Interfaces**:

- Consumed by: adapter dispatcher, decompose.ts, recompose.ts, cross-source coordination protocol
- Implemented by: single concrete class

### Component 3: Adapter Configuration Interface

**Purpose**: Type-safe configuration shape that BaseMarkdownAdapter subclasses must provide.

**Definition**:

```typescript
interface AdapterConfig {
  readonly sourceType: SourceType;
  readonly sectionDelimiter: string;
  readonly identifierPattern: RegExp;
  readonly identifierPrefix: string;
  readonly supportsCrossSourceUpdates?: boolean;
}
```

**Responsibilities**:

- Constrains the configuration surface to a known set of properties
- Ensures type safety across all BaseMarkdownAdapter subclasses

**Interfaces**:

- Consumed by: BaseMarkdownAdapter constructor
- Implemented by: AnalysisAdapter, SessionAdapter, AdrAdapter (from SPEC-001)

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Subclass vs composition | Subclass (extends) | ADR-002 D-3 specifies "extends BaseMarkdownAdapter"; subclassing is the locked pattern |
| Config properties | readonly class fields | Simple, no constructor injection needed; TypeScript readonly enforces immutability |
| Cross-source flag | boolean property | Minimal surface; execution engine checks this flag to decide whether to process cross_source_updates |

## Security Considerations

- No additional security surface beyond BaseMarkdownAdapter. All input validation (path containment, injectivity checks) is handled by the base class and Zod validators from SPEC-001.

## Testing Strategy

- Unit tests per adapter: verify config properties return expected values
- Integration with BaseMarkdownAdapter: verify parse/serialize round-trip for each adapter type
- Round-trip property tests (REQ-005-SPEC-002) validate the full decompose/recompose cycle

## Open Questions

None. All design decisions are locked by ADR-002 D-3 and SPEC-001 BaseMarkdownAdapter contract.

## Reconciliation Log

### 2026-05-21 — ANALYSIS adapter drift (TASK-007-SPEC-002, SESSION-2026-05-21_01)

Two drifts between DESIGN-001 and `_shared/composition/src/adapters/analysis.ts` discovered during Wave 2 retro-validation (QA-010-SPEC-002):

1. **`identifierPrefix`** — declared in DESIGN-001 Component 1 + Component 3 AdapterConfig but absent from code. **Resolution**: code amended — `identifierPrefix = "item-"` added to `AnalysisAdapter`. The base class abstract slot is satisfied; DESIGN-001 unchanged on this point.
2. **`identifierPattern` `/i` flag** — DESIGN-001 specified `/item-(\d+)/`; code is `/item-(\d+)/i`. **Resolution**: DESIGN-001 amended — `/i` flag added to documented pattern + observation. Rationale: the case-insensitive flag is intentional per code comments ("case-insensitive at the prefix") and matches the broader Brain note convention of accepting `Item-1`, `ITEM-1`, `item-1`.

SESSION adapter drift handled separately by TASK-008-SPEC-002.

## Observations

- [technique] Config-only subclassing pattern reduces each simple adapter to 5-10 lines of configuration code #pattern #config-override
- [decision] Subclass extends pattern chosen per ADR-002 D-3 locked decision; composition alternative not considered #inheritance #locked
- [fact] AnalysisAdapter overrides: sectionDelimiter "### ", identifierPattern /item-(\d+)/i (case-insensitive at prefix), identifierPrefix "item-" #analysis #config
- [fact] SessionAdapter overrides: sectionDelimiter "## Event ", identifierPattern /Event-(\d+)/i, identifierPrefix "Event-", supportsCrossSourceUpdates true #session #config

## Relations

- implements [[REQ-001-SPEC-002: ANALYSIS Adapter Implementation]]
- implements [[REQ-002-SPEC-002: SESSION Adapter Implementation]]
- part_of [[SPEC-002: Simple Adapters]]
- depends_on [[REQ-002-SPEC-001: BaseMarkdownAdapter Base Class]]
