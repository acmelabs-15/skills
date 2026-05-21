---
title: 'DESIGN-002-SPEC-007: Parser Renderer Round-Trip Strategy'
type: design
permalink: specs/spec-007-plan-session-render/design/design-002-spec-007-round-trip-strategy
status: ACCEPTED
tags:
- design
- spec-007
- round-trip
- parser-renderer
---

# DESIGN-002-SPEC-007: Parser Renderer Round-Trip Strategy

## Context

ADR-003 D-8 requires `render(parse(md)) === md` (SHA-256 char-identity) as a CI gate. This design specifies how the parser and renderer achieve this invariant, what falls inside the char-identity scope (structural content) versus outside (prose that mutates intentionally), and how the round-trip test fixtures are constructed.

## Round-Trip Identity Scope

The invariant applies to STRUCTURAL template content:

- Frontmatter field ordering and quoting
- H1 title
- H2/H3 section ordering (canonical order enforced by renderer)
- Table column schemas and alignment
- Mermaid code block structure (regenerated from parts data)
- Observation format ([category] text #tags)
- Relation format (verb [[Target]])
- Checkbox formatting (- [ ] / - [x])
- Bullet field formatting (- **Label**: value)

Prose content (Scope text, event body text, blocker descriptions, observation text) passes through the pipeline without transformation. The parser extracts it as-is; the renderer emits it as-is. Char-identity holds for prose because neither parser nor renderer modifies it.

## Parser Strategy for Round-Trip Preservation

Key design decisions that enable char-identity:

1. **Frontmatter preserved as raw YAML string, re-serialized identically.** The parser extracts frontmatter via js-yaml.load(), stores the parsed object, and the renderer re-serializes via js-yaml.dump() with matching options (quotingType: "'", forceQuotes: false, lineWidth: -1) to produce identical YAML output.

2. **Section ordering is canonical.** The parser extracts sections by H2 heading name, storing them in a typed model. The renderer emits sections in a fixed canonical order. This means the parser does not need to preserve original section ordering; the renderer always produces the canonical order.

3. **Table rendering uses consistent column widths.** GFM tables must be rendered with consistent alignment (left-aligned, padded to column width). The renderer uses remark-gfm for table emission. If remark-gfm's default alignment differs from the input, the test fixtures must be authored in remark-gfm's canonical form.

4. **Mermaid blocks are regenerated, not round-tripped.** The parser skips Progress Dashboard and Cross-Part Dependency Graph sections. The renderer regenerates them from parts data. For round-trip identity, the fixture must contain the exact Mermaid output that renderMermaid produces from the fixture's parts data.

5. **Checkbox state preserved via ListItem.checked property.** remark-parse extracts checked state from `- [x]` syntax. remark-stringify emits it back identically.

## Fixture Construction

The round-trip test fixtures must be in "canonical form" -- the exact output that the renderer would produce. Construction process:

1. Author PLAN-001-trimmed.md by hand or migration script
2. Run parsePlanNote + renderPlanNote
3. If output differs from input, adopt the output as the canonical fixture
4. Verify SHA-256 identity holds on the adopted fixture
5. Repeat for session fixture

This bootstrapping ensures fixtures are in canonical form from the start.

## Edge Cases

| Case | Strategy |
| --- | --- |
| remark-stringify normalizes whitespace differently than input | Configure remark-stringify options to match input conventions; adopt canonical form |
| js-yaml re-serializes frontmatter with different quoting | Use matching dump options; fixture authored in canonical YAML form |
| GFM table column widths differ | Adopt remark-gfm canonical column widths in fixture |
| Empty table bodies (no data rows) | Renderer emits header row + alignment row only; fixture matches |

## Observations

- [design] Round-trip identity achieved by ensuring both parser and renderer agree on a canonical form for every structural element #round-trip #canonical-form
- [technique] Fixtures are bootstrapped by running render(parse(hand-authored)) and adopting the output as canonical #fixture-construction #bootstrapping
- [constraint] Mermaid blocks are regenerated not preserved; fixture must contain exact renderMermaid output for its parts data #mermaid #regenerated
- [insight] Prose content passes through without transformation; char-identity holds for prose because neither layer modifies it #prose #passthrough

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
- implements [[ADR-001: Composition Library Architecture]]
