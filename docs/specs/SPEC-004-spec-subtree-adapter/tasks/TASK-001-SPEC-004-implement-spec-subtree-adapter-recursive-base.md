---
title: 'TASK-001-SPEC-004: Implement SPEC Subtree Adapter Recursive Base'
type: task
status: DONE
effort: M
estimate: 2d
permalink: specs/spec-004-spec-subtree-adapter/tasks/task-001-spec-004-implement-spec-subtree-adapter-recursive-base
tags:
- task
- spec-004
- adapter
- recursive
---

# TASK-001-SPEC-004: Implement SPEC Subtree Adapter Recursive Base

## Design Context

- DESIGN-001-SPEC-004 SPEC Subtree Adapter Architecture: implements the SpecSubtreeAdapter class with 5-method CompositionAdapter interface and processSubtree() orchestration method

## Objective

Create the SpecSubtreeAdapter class at _shared/composition/src/adapters/spec-subtree.ts implementing the CompositionAdapter interface with sourceType "spec". The adapter provides the 5 synchronous methods (parse, extractByRange, applyMutations, reverseMutations, serialize) for per-file content operations, plus the processSubtree() method that orchestrates manifest-driven iteration across root and children. This task establishes the adapter skeleton that subsequent tasks (TASK-002 through TASK-004) extend with frontmatter handling, filename rewrite, and hash validation.

## Scope

**In Scope**:

- SpecSubtreeAdapter class implementing CompositionAdapter at _shared/composition/src/adapters/spec-subtree.ts
- 5-method interface implementation (parse, extractByRange, applyMutations, reverseMutations, serialize) using unified + remark pipeline
- processSubtree() method with manifest iteration skeleton
- SubtreeOrchestrator internal function with two-phase pattern (stage-all, validate-all)
- Export from adapters barrel file

**Out of Scope**:

- Frontmatter mutation logic (TASK-002)
- Filename rewrite logic (TASK-003)
- Per-file hash validation orchestration (TASK-004)
- Zod schema for subtree_manifest (TASK-005)

## Implementation Notes

The adapter reuses the unified + remark pipeline pattern from BaseMarkdownAdapter but does NOT extend it. Import unified, remark-parse, remark-stringify, and remark-frontmatter for the parse/serialize pair. The applyMutations/reverseMutations methods implement single-pass string replacement for renumber_map and wikilink_map (same algorithm as BaseMarkdownAdapter but applied per-file within the subtree context).

## Files Affected

| File | Action | Purpose |
|---|---|---|
| _shared/composition/src/adapters/spec-subtree.ts | NEW | SpecSubtreeAdapter class |
| _shared/composition/src/adapters/index.ts | MODIFY | Export SpecSubtreeAdapter |

## Testing Requirements

- tsc --noEmit passes with SpecSubtreeAdapter implementing CompositionAdapter
- Unit test: parse/serialize round-trip identity on a sample SPEC root note
- Unit test: applyMutations with renumber_map and wikilink_map produces expected output
- Unit test: reverseMutations(applyMutations(content, mutations), mutations) === content

## Definition of Done

- [ ] SpecSubtreeAdapter class at _shared/composition/src/adapters/spec-subtree.ts implements CompositionAdapter
- [ ] All 5 methods compile with correct signatures under tsc strict mode
- [ ] processSubtree() accepts SpecSubtreeManifest and returns ProcessResult
- [ ] parse/serialize round-trip test passes on sample SPEC content
- [ ] applyMutations/reverseMutations inverse property holds for test renumber_map
- [ ] Exported from adapters barrel file

## ADR Compliance

- [ ] Honors ADR-002 D-2: implements CompositionAdapter 5-method interface
- [ ] Honors ADR-002 D-3: distinct implementation (not BaseMarkdownAdapter extension)
- [ ] Honors ADR-001 D-2: uses unified + remark for parse/serialize

## Effort

| Tier | Human | AI-Dominant | AI-Assisted |
|---|---|---|---|
| M | 6d | 2d | 3d |

## Observations

- [fact] Status: DONE -- drift closed by gap-TASKs 008 + 012; validated by QA-027 aggregate #status
- [fact] Size tier: M -- core adapter class with 5-method interface plus orchestration skeleton; moderate complexity #estimation
- [decision] Standalone class using composition over inheritance per DESIGN-001-SPEC-004 #architecture

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- implements [[DESIGN-001-SPEC-004: SPEC Subtree Adapter Architecture]]
- implements [[REQ-001-SPEC-004: SPEC Subtree Adapter Implementation]]
- closed_by [[TASK-008-SPEC-004: Add Adapters Barrel and Align sourceType to spec]]
- closed_by [[TASK-012-SPEC-004: Align Adapter Orchestration to DESIGN-001 and DESIGN-003]]
- validated_by [[QA-027-SPEC-004: Spec-Aggregate Retro-Validation]]
