---
title: 'REQ-005-SPEC-001: Injectivity and Path Containment Validators'
type: requirement
permalink: specs/spec-001-composition-core-and-adr-adapter/requirements/req-005-spec-001-injectivity-and-path-containment-validators
status: DRAFT
tags:
- requirement
- spec-001
- security
- validation
---

# REQ-005-SPEC-001: Injectivity and Path Containment Validators

## Requirement Statement

WHEN a plan YAML is loaded and parsed by the Zod schema
THE SYSTEM SHALL validate that renumber_map and wikilink_map are injective with disjoint key-value domains, and that all output paths resolve within the docs/ root via realpath-based containment check
SO THAT non-reversible mutation plans and path traversal attacks are rejected before any file I/O.

## Pattern

Event-Driven (triggered at plan YAML parse time as Zod .refine() rules).

## Priority

P0 — injectivity is BLOCKING per ADR-001 F-8 hash protocol; path containment mitigates CWE-22.

## Category

Security

## Context

ADR-002 D-5 specifies two BLOCKING validators as Zod .refine() rules. The injectiveDisjointMap validator checks that (a) no two source IDs map to the same target (injectivity: Set size === array length) and (b) keys and values come from disjoint sets (no key appears as a value). Without disjointness, single-pass string replacement is order-dependent and non-reversible, which breaks the F-8 hash protocol. The containedPathSchema validator uses realpath() to resolve symlinks before checking that all output paths start with the docs/ root plus path.sep, mitigating CWE-22 path traversal including symlink bypass. The containedPathSchema is async (uses realpath), requiring planSchema.parseAsync().

## Acceptance Criteria

- [ ] GIVEN a renumber_map where two source keys map to the same target value
      WHEN parsed via the Zod schema
      THEN the injectivity validator rejects it with a message identifying the non-injective mapping

- [ ] GIVEN a renumber_map where a key also appears as a value (e.g., "D-1" maps to "D-2" and "D-2" maps to "D-3")
      WHEN parsed via the Zod schema
      THEN the disjointness validator rejects it with a descriptive error

- [ ] GIVEN a wikilink_map with non-injective or non-disjoint mappings
      WHEN parsed
      THEN the same validators reject it

- [ ] GIVEN an output_path that resolves outside docs/ (e.g., "../secrets/file.md")
      WHEN parsed via containedPathSchema
      THEN it is rejected with a CWE-22 path traversal error message

- [ ] GIVEN an output_path that uses symlinks to escape docs/
      WHEN parsed via containedPathSchema with realpath resolution
      THEN it is rejected because the realpath resolves outside the docs/ root

## Implementation Notes

The injectiveDisjointMap is implemented as a Zod .refine() on z.record(z.string(), z.string()). The containedPathSchema uses path.resolve() and fs/promises realpath() with a path.sep suffix check to prevent prefix-match false positives (e.g., docs-backup/ matching docs/). Both validators are applied at the per-destination level in distribution plans and per-source level in composition plans.

## Observations

- [requirement] Injectivity plus disjointness validators ensure single-pass replacement is deterministic and reversible for the hash protocol #injectivity #validation
- [constraint] Path containment uses realpath to handle symlink bypass per ADR-001 F-1 symlink install architecture #security #cwe-22
- [risk] YAML type coercion could produce unexpected key/value types; Zod schema coerces via z.string() before injectivity check #yaml #type-safety
- [decision] Validators are BLOCKING Zod .refine() rules at plan load time not runtime adapter checks per ADR-002 D-5 #early-detection #blocking

## Relations

- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- implements [[ADR-001: Composition Library Architecture]]
