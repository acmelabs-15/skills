---
title: 'TASK-002-SPEC-004: Implement Frontmatter Map Handler'
type: task
status: DONE
effort: S
estimate: 1d
permalink: specs/spec-004-spec-subtree-adapter/tasks/task-002-spec-004-implement-frontmatter-map-handler
tags:
- task
- spec-004
- frontmatter
- mutations
---

# TASK-002-SPEC-004: Implement Frontmatter Map Handler

## Design Context

- DESIGN-001-SPEC-004 SPEC Subtree Adapter Architecture: implements the FrontmatterMutator internal component for YAML frontmatter field-level mutations and inverses

## Objective

Implement the applyFrontmatterMap() and reverseFrontmatterMap() functions that handle YAML frontmatter field mutations within the SpecSubtreeAdapter. These functions parse the frontmatter block (between --- delimiters), replace specified field values (title, permalink), and compute the inverse mapping for hash validation. The implementation must preserve YAML formatting (quoted vs unquoted strings, field ordering, comments) to maintain char-identity.

## Scope

**In Scope**:

- applyFrontmatterMap(content, map) function
- reverseFrontmatterMap(content, map) function
- Integration with SpecSubtreeAdapter.applyMutations and reverseMutations methods
- Handling of quoted and unquoted YAML string values
- Preservation of all non-targeted frontmatter fields

**Out of Scope**:

- Full YAML parse/serialize (uses line-level regex to preserve formatting)
- Frontmatter fields beyond title and permalink (tags, type, status are not mutated)

## Implementation Notes

Use line-level regex targeting specific YAML keys (e.g., /^title:\s*['"]?[.*]('")?$/) rather than full js-yaml parse/serialize. Full YAML round-trip could alter whitespace, quoting style, or field order, breaking char-identity. The regex approach targets only the specified fields and leaves all other lines untouched.

The inverse frontmatter_map is computed by swapping keys and values. For the frontmatter_map {title: "SPEC-003: Brain Reorg"} where the original title was "SPEC-001: Brain", the inverse maps "SPEC-003: Brain Reorg" back to "SPEC-001: Brain".

## Files Affected

| File | Action | Purpose |
|---|---|---|
| shared/composition/src/adapters/spec-subtree.ts | MODIFY | Add frontmatter mutation functions |

## Definition of Done

- [ ] applyFrontmatterMap replaces targeted field values in YAML frontmatter block
- [ ] reverseFrontmatterMap applies inverse mapping (swapped keys/values)
- [ ] Round-trip property: reverseFrontmatterMap(applyFrontmatterMap(content, map), map) === content
- [ ] Handles both quoted ('value') and unquoted (value) YAML string formats
- [ ] Non-targeted frontmatter fields remain byte-identical after mutation
- [ ] Unit tests cover: title mutation, permalink mutation, quoted values, multi-field map

## ADR Compliance

- [ ] Honors ADR-002 D-2: MutationSpec frontmatter_map field integration
- [ ] Honors ADR-001 F-8: reversibility for hash validation

## Effort

| Tier | Human | AI-Dominant | AI-Assisted |
|---|---|---|---|
| S | 2d | 1d | 1.5d |

## Observations

- [fact] Status: DONE -- minor coverage gaps closed; validated by QA-027 aggregate #status
- [fact] Size tier: S -- focused regex-based frontmatter field replacement with inverse #estimation
- [decision] Line-level regex over full YAML parse/serialize to preserve char-identity #technique

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- implements [[DESIGN-001-SPEC-004: SPEC Subtree Adapter Architecture]]
- implements [[REQ-002-SPEC-004: Frontmatter Map Mutations]]
- depends_on [[TASK-001-SPEC-004: Implement SPEC Subtree Adapter Recursive Base]]
- validated_by [[QA-027-SPEC-004: Spec-Aggregate Retro-Validation]]
