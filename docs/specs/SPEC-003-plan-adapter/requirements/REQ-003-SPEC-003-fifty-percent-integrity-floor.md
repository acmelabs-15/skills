---
title: 'REQ-003-SPEC-003: Fifty Percent Integrity Floor on Regenerated Sections'
type: requirement
status: DRAFT
permalink: specs/spec-003-plan-adapter/requirements/req-003-spec-003-fifty-percent-integrity-floor
tags:
- requirement
- spec-003
- integrity-floor
- validator
---

# REQ-003-SPEC-003: Fifty Percent Integrity Floor on Regenerated Sections

## Requirement Statement

WHEN a plan YAML with source_type "plan" declares regenerated_sections in the MutationSpec
THE SYSTEM SHALL reject the plan at validation time if the regenerated_sections would cover more than 50% of the source content lines, enforced via a Zod refinement on the PLAN-specific plan schema
SO THAT the hash validation integrity guarantee is preserved -- plans cannot declare everything as regenerative to bypass the zero-drift check.

## Pattern

State-Driven (validation gate at plan load time before any file I/O).

## Priority

P0 -- without the integrity floor, a malicious or misconfigured plan could declare all sections as regenerated, bypassing the entire hash validation invariant from ADR-001 F-8.

## Category

Functional (Validation)

## Context

ADR-002 D-5 specifies the regenerated-sections integrity floor as a BLOCKING validation gate. The Zod validator REJECTS plans where regenerated_sections covers more than 50% of source content lines. At the schema level, a guard limits regenerated_sections to a maximum of 10 entries (heuristic check). The runtime 50% line-count check runs at script execution time when the source file is available for measurement.

The two known regenerative sections in PLAN notes (Progress Dashboard and Cross-Part Dependency Graph) typically occupy 10-20% of a PLAN note's total lines, well below the 50% floor. The floor exists as a safety valve against abuse or misconfiguration, not as a limit on normal operation.

## Acceptance Criteria

- [ ] GIVEN a plan YAML with source_type "plan" and regenerated_sections listing more than 10 entries
      WHEN the Zod validator parses the plan
      THEN the parse REJECTS with an error message indicating the regenerated_sections count exceeds the schema-level maximum

- [ ] GIVEN a plan YAML with source_type "plan" and regenerated_sections listing 2 entries
      WHEN the script loads the source file and computes line counts
      THEN the script verifies that the combined line count of regenerated sections is less than or equal to 50% of total source content lines

- [ ] GIVEN a plan YAML where regenerated_sections cover exactly 51% of source lines
      WHEN the runtime integrity floor check runs
      THEN the script REJECTS the plan with an error indicating the 50% integrity floor is breached

- [ ] GIVEN a plan YAML where regenerated_sections cover exactly 50% of source lines
      WHEN the runtime integrity floor check runs
      THEN the plan passes the integrity floor check (50% is the boundary; greater-than triggers rejection)

## Implementation Notes

The integrity floor has two enforcement layers. Layer 1 is the Zod schema-level guard that limits regenerated_sections array length to 10 entries maximum (a heuristic check that catches obviously excessive declarations without requiring the source file). Layer 2 is the runtime line-count check that measures actual line coverage against the source file. Layer 2 runs after plan parsing and source file loading but before any extraction or mutation begins. Both layers must pass for the plan to proceed.

## Observations

- [requirement] 50% integrity floor prevents regenerated_sections from bypassing the zero-drift hash validation guarantee #integrity-floor #safety
- [constraint] Two enforcement layers: Zod schema-level max 10 entries plus runtime 50% line-count check against source file #two-layer #validation
- [technique] Schema-level guard catches obviously excessive declarations without requiring source file; runtime check measures actual line coverage #defense-in-depth #validation
- [fact] Known regenerative sections (Progress Dashboard, Mermaid graph) typically occupy 10-20% of PLAN lines, well below the 50% floor #normal-operation #sizing

## Relations

- part_of [[SPEC-003: PLAN Adapter]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- depends_on [[REQ-002-SPEC-003: Regenerated Sections Field Handling]]
- depends_on [[REQ-004-SPEC-001: Zod Plan Validator Base]]