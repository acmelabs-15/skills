---
title: 'REQ-002-SPEC-004: Frontmatter Map Mutations'
type: requirement
status: DRAFT
permalink: specs/spec-004-spec-subtree-adapter/requirements/req-002-spec-004-frontmatter-map-mutations
tags:
- requirement
- spec-004
- frontmatter
- mutations
---

# REQ-002-SPEC-004: Frontmatter Map Mutations

## Requirement Statement

WHEN the SPEC subtree adapter processes a file entry from the subtree_manifest that includes a frontmatter_map,
THE SYSTEM SHALL apply title and permalink field mutations to the YAML frontmatter block of that file, and reverse those mutations during hash comparison via the inverse frontmatter_map (swap keys and values),
SO THAT frontmatter changes (title renumbering, permalink updates) do not break char-identity validation while still producing correctly-titled destination files.

## Pattern

State-Driven (applies whenever a subtree_manifest entry contains a non-empty frontmatter_map field).

## Priority

P0 -- frontmatter mutations are required for every SPEC subtree operation since title and permalink always change when a SPEC is renumbered.

## Category

Functional

## Context

ADR-002 D-2 extends MutationSpec with an optional frontmatter_map field (Record of string to string) specifically for the SPEC subtree adapter. When a SPEC is renumbered (e.g., SPEC-001 to SPEC-003), every file in the subtree needs its frontmatter title and permalink updated to reflect the new SPEC number. The frontmatter_map captures these mutations declaratively in the plan YAML.

The critical design constraint is that frontmatter mutations must be reversible for hash validation. During the F-8 hash comparison step, the adapter applies the inverse frontmatter_map (swapping keys and values) to recover the original frontmatter before computing the hash. This ensures that the deterministic renumbering of title and permalink does not trigger a false hash mismatch.

Both the SPEC root note and every child note (REQ, DESIGN, TASK) have frontmatter that requires mutation. The root note's title changes from "SPEC-001: Brain" to "SPEC-003: Brain Reorg". Each child's title changes its SPEC reference (e.g., "REQ-001-SPEC-001: Injectable Data Source" to "REQ-001-SPEC-003: Injectable Data Source"). Permalink follows the same pattern.

## Acceptance Criteria

- [ ] Given a SPEC root note with frontmatter title "SPEC-001: Brain" and a frontmatter_map containing title: "SPEC-003: Brain Reorg", when applyMutations is called, then the frontmatter title field is replaced with "SPEC-003: Brain Reorg"

- [ ] Given a child REQ note with frontmatter permalink "specs/spec-001-brain/requirements/req-001-spec-001-injectable-data-source", when applyMutations is called with frontmatter_map containing the updated permalink, then the permalink field is replaced with the new value

- [ ] Given a file with mutated frontmatter, when reverseMutations is called with the same frontmatter_map, then the inverse mapping (swap keys and values) restores the original frontmatter field values

- [ ] Given the reverse-mutated content, when SHA-256 hash is computed, then it matches the SHA-256 hash of the original source extraction (char-identity preserved modulo deterministic frontmatter mutations)

- [ ] Given a frontmatter_map that targets only title and permalink fields, when applyMutations processes the YAML frontmatter block, then all other frontmatter fields (type, status, tags, effort, estimate) remain unchanged

## Implementation Notes

Frontmatter is parsed as the YAML block between the opening and closing `---` delimiters. The adapter must handle frontmatter fields that may be quoted or unquoted in YAML. The replacement is field-level (replace the value of a specific key), not line-level, to avoid accidentally mutating YAML comments or multi-line values. The inverse frontmatter_map is computed by swapping each key-value pair: if frontmatter_map says title: "SPEC-003: Brain Reorg" and the original title was "SPEC-001: Brain", the inverse maps "SPEC-003: Brain Reorg" back to "SPEC-001: Brain".

## Observations

- [requirement] Frontmatter mutations via frontmatter_map enable declarative title and permalink renumbering for all files in a SPEC subtree #frontmatter #mutations
- [constraint] Inverse frontmatter_map (swap keys/values) is required during reverseMutations for hash comparison to succeed per ADR-001 F-8 #reversibility #hash-validation
- [decision] Field-level replacement in YAML frontmatter block (not line-level) prevents accidental mutation of comments or multi-line values #implementation #yaml
- [fact] Both SPEC root and every child note require frontmatter mutation when a SPEC is renumbered #scope #per-file

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- depends_on [[REQ-001-SPEC-004: SPEC Subtree Adapter Implementation]]