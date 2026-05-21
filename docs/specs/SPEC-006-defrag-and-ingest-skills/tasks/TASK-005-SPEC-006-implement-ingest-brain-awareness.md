---
title: 'TASK-005-SPEC-006: Implement Ingest Brain-Awareness'
type: task
status: TODO
permalink: specs/spec-006-defrag-and-ingest-skills/tasks/task-005-spec-006-implement-ingest-brain-awareness
tags:
- task
- ingest
- brain-awareness
- detect-context
---

# TASK-005-SPEC-006: Implement Ingest Brain-Awareness

## Description

Implement the Brain-awareness layer in the /ingest pipeline. This task covers CONVENTIONS compliance for ingested notes: frontmatter generation with all required fields, observation generation with valid category prefixes and inline tags, relation generation with valid relation types, Pattern 2 three-phase write execution, post-write verification against CONVENTIONS Section 8.1 and 8.2 checklists, and the shared Brain vs Basic Memory detection module at _shared/detect-context.ts.

## Definition of Done

- [ ] _shared/detect-context.ts exports detectProjectContext function returning contextType, evidence, and confidence
- [ ] Brain context detection: checks for docs/ directory AND canonical entity types in frontmatter
- [ ] Basic Memory context detection: absence of canonical types OR --basic-memory flag
- [ ] Frontmatter generation produces title in ENTITY-ID colon Descriptor format, type from 16 canonical types, status DRAFT, permalink in folder/kebab form, 2-5 tags
- [ ] Observation generation produces at least 3 observations with valid category prefix and 1-3 inline tags
- [ ] Relation generation produces at least 2 relations using only the 11 valid relation types
- [ ] Pattern 2 three-phase write executes correctly: space-title write_note, colon edit_note, kebab move_note
- [ ] Post-write verification checks all 6 items from CONVENTIONS Section 8.2
- [ ] Final-two-sections invariant enforced: Observations then Relations are the last two sections
- [ ] Unit tests for detect-context.ts covering Brain, Basic Memory, and flag override scenarios
- [ ] biome lint passes

## Files Affected

- _shared/detect-context.ts (new)
- _shared/detect-context.test.ts (new)
- ingest/scripts/assemble.ts (modify: add Brain-aware frontmatter/observation/relation generation)
- ingest/scripts/ingest.ts (modify: integrate detect-context routing)

## Implementation Approach

detect-context.ts uses Bun.glob to find markdown files under docs/, reads a sample (up to 10 files) via Bun.file, parses frontmatter with js-yaml, checks type field against the 16-type canonical list. assemble.ts Brain-aware path generates frontmatter from a template with entity-type-specific defaults, generates observations by extracting key sentences from source content and prefixing with appropriate categories, generates relations by searching existing notes via Brain MCP search for topically related notes.

## Effort and Estimate

effort: M
estimate: 1.5d

## Observations

- [task] Implements the shared detect-context module and Brain-aware content assembly for /ingest #brain-awareness #detect-context
- [task] Post-write verification enforces CONVENTIONS Section 8.2 six-item checklist as a programmatic gate #verification #conventions
- [technique] Frontmatter type field matching against canonical 16-type list provides reliable Brain detection #detection #canonical-types
- [constraint] Brain-awareness requirements are non-ADR scope sourced from KICKOFF-BRIEF.md per ANALYSIS-001 P1-2 amendment #non-adr #kickoff-brief

## Relations

- part_of [[SPEC-006: Defrag and Ingest Skills]]
- implements [[REQ-005-SPEC-006: Ingest Brain-Awareness]]
- implements [[DESIGN-002-SPEC-006: Ingest Skill Architecture]]
- implements [[DESIGN-003-SPEC-006: Skill Coexistence Strategy]]
