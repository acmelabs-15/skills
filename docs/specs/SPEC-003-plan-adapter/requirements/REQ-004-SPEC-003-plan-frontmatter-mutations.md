---
title: 'REQ-004-SPEC-003: PLAN Frontmatter Mutations'
type: requirement
status: DRAFT
permalink: specs/spec-003-plan-adapter/requirements/req-004-spec-003-plan-frontmatter-mutations-1
tags:
- requirement
- spec-003
- frontmatter
- mutations
---

# REQ-004-SPEC-003: PLAN Frontmatter Mutations

## Requirement Statement

WHEN the PLAN adapter processes a plan YAML whose MutationSpec includes a frontmatter_map with entries for PLAN-specific fields (e.g., title, permalink, branches[])
THE SYSTEM SHALL apply frontmatter field replacements during applyMutations and apply the inverse mapping (swap keys and values) during reverseMutations before hash comparison
SO THAT PLAN notes whose frontmatter changes during decompose/recompose (e.g., branches[] array reflecting different work-in-progress branches) do not break the SHA-256 char-identity validation.

## Pattern

Behavioural (modifier on applyMutations and reverseMutations when frontmatter_map is present on MutationSpec).

## Priority

P1 -- frontmatter mutations are needed for PLAN decompose/recompose scenarios where the destination PLAN has different metadata (title, permalink, branches). Without this, frontmatter differences would cause hash mismatches on otherwise content-identical plans.

## Category

Functional

## Context

ADR-002 D-2 extends MutationSpec with a frontmatter_map field (Record of string to string, optional). The frontmatter_map governs YAML frontmatter field mutations (title, permalink, tags, etc.). The reverseMutations method applies the inverse frontmatter_map (new value to old value) before hash comparison so that frontmatter changes do not break char-identity validation.

PLAN notes have unique frontmatter fields compared to other note types. The branches[] array tracks work-in-progress git branches associated with the plan. The complexity_tier field records the tier classification. When a PLAN is decomposed (split into sub-plans), the destination plans inherit different branches[] arrays reflecting their scope. The frontmatter_map handles these field-level mutations deterministically.

The frontmatter_map inverse contract from ADR-002 D-2: applying frontmatter_map then its inverse (swapping keys and values) recovers the original frontmatter field values.

## Acceptance Criteria

- [ ] GIVEN a MutationSpec with frontmatter_map: {"title": "PLAN-002: Sub-Plan Alpha", "permalink": "planning/plan-002-sub-plan-alpha"}
      WHEN applyMutations processes PLAN content
      THEN the YAML frontmatter title field becomes "PLAN-002: Sub-Plan Alpha" and the permalink field becomes "planning/plan-002-sub-plan-alpha"

- [ ] GIVEN a MutationSpec with frontmatter_map applied to destination content
      WHEN reverseMutations processes that destination content with the same MutationSpec
      THEN the original frontmatter field values are recovered (inverse mapping swaps keys and values)

- [ ] GIVEN a MutationSpec with frontmatter_map: {} (empty map)
      WHEN applyMutations processes PLAN content
      THEN frontmatter is unchanged (no mutations applied)

- [ ] GIVEN a MutationSpec with no frontmatter_map field (undefined)
      WHEN applyMutations processes PLAN content
      THEN frontmatter is unchanged (fallback to no frontmatter mutation)

- [ ] GIVEN a MutationSpec with frontmatter_map referencing branches[] array as a JSON string value
      WHEN applyMutations processes PLAN content
      THEN the branches[] field in YAML frontmatter is replaced with the parsed array from the map value

## Implementation Notes

Frontmatter mutations operate on the YAML frontmatter block (between the opening and closing --- delimiters). The adapter parses frontmatter fields, applies the map, and serializes back. For array-valued fields like branches[], the frontmatter_map value is a JSON-serialized string that the adapter parses and inserts as a YAML array. The reverse mapping reconstructs the original array value.

## Observations

- [requirement] Frontmatter mutations enable PLAN decompose/recompose where destination PLANs have different metadata #frontmatter #plan-decompose
- [technique] frontmatter_map inverse contract: apply then inverse recovers original values; ensures hash validation passes despite frontmatter changes #inverse-contract #hash
- [constraint] branches[] array requires JSON-serialized string in frontmatter_map value; adapter parses and inserts as YAML array #branches #serialization
- [fact] PLAN-specific frontmatter fields include branches[], complexity_tier, and standard fields (title, permalink, tags, status) #plan-frontmatter #fields

## Relations

- part_of [[SPEC-003: PLAN Adapter]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- depends_on [[REQ-001-SPEC-003: PLAN Adapter Implementation]]