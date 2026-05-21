---
title: 'TASK-006-SPEC-001: Implement Injectivity and Path Containment Validators'
type: task
permalink: specs/spec-001-composition-core-and-adr-adapter/tasks/task-006-spec-001-implement-injectivity-and-path-containment-validators
status: DONE
effort: S
estimate: 0.5d
tags:
- task
- spec-001
- validators
- security
---

# TASK-006-SPEC-001: Implement Injectivity and Path Containment Validators

## Design Context

This TASK realizes DESIGN-003-SPEC-001 section "Algorithms" -- the injectiveDisjointMap and containedPathSchema validators.

## Objective

Implement the injectivity + disjointness validator and the async realpath-based path containment validator at src/core/validators.ts.

## Scope

**In Scope**: injectiveDisjointMap Zod .refine() function, containedPathSchema async Zod .refine(), unit tests with injective/non-injective/disjoint/non-disjoint/path-traversal fixtures
**Out of Scope**: Integration with plan schemas (TASK-005 wires these into schemas)

## Implementation Notes

injectiveDisjointMap uses Set operations per ADR-002 D-5 spec. containedPathSchema uses realpath + path.sep per ADR-002 D-5 with SKILLS_DOCS_ROOT env var. Both are exported as reusable Zod refinement builders.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| _shared/composition/src/core/validators.ts | NEW | Validator implementations |
| _shared/composition/tests/validators.test.ts | NEW | Validator unit tests |

## Testing Requirements

- Injective map passes, non-injective map rejected
- Disjoint domains pass, overlapping domains rejected
- Path within docs/ passes, path outside docs/ rejected
- Symlink that escapes docs/ rejected via realpath

## Definition of Done

- [x] injectiveDisjointMap exported and validates both injectivity and disjointness
- [x] containedPathSchema exported with async realpath + path.sep containment check
- [x] Error messages are descriptive per ADR-002 D-5
- [x] Unit tests cover all edge cases (5+ test cases)

## ADR Compliance

- [x] Honors ADR-001 F-8: Injectivity is BLOCKING validator gate
- [x] Honors ADR-002 D-5: Validator structure matches specification

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.5d | Set operations + realpath logic |
| AI-Dominant | 0.5d | Specification-driven implementation |
| AI-Assisted | 0.5d | Autocomplete |

## Observations

- [requirement] Injectivity and path containment validators are BLOCKING gates at plan load time before any file I/O #validation #blocking
- [constraint] containedPathSchema is async requiring parseAsync at the schema entry point #async #realpath
- [technique] Set operations for injectivity check are O(n) and trivially correct #set-operations #algorithm

## Relations

- validated_by [[TEST-REPORT-006-SPEC-001: Injectivity and Path Containment Validators]]

- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[REQ-005-SPEC-001: Injectivity and Path Containment Validators]]
- implements [[DESIGN-003-SPEC-001: Zod Plan Schema Modular Layout]]
- depends_on [[TASK-001-SPEC-001: Scaffold Composition Project]]
