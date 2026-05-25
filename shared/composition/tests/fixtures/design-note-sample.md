---
title: 'DESIGN-006-SPEC-007: RequirementNote and DesignNote Schema Layer'
type: design
permalink: specs/spec-007-plan-session-render/design/design-006-spec-007-req-design-schemas
status: DRAFT
tags:
  - design
  - spec-007
  - module-structure
  - schema
---

# DESIGN-006-SPEC-007: RequirementNote and DesignNote Schema Layer

## Context

This design defines the schema, parser, and validator modules for
RequirementNote and DesignNote within the composition library. It extends
the pattern established by the TaskNote schema layer (DESIGN-001 X.D.5)
with two additional note types that share the same mechanical claim-
validation contract.

## Module Structure

```text
_shared/composition/src/
  schemas/
    requirement-note.ts      # RequirementNoteSchema + EARS AC checkbox contract
    design-note.ts           # DesignNoteSchema + optional Compliance checkbox contract
  parsers/
    requirement-note.ts      # parseRequirementNote
    design-note.ts           # parseDesignNote (opaque sections Record)
  validators/
    types.ts                 # Shared ClaimResult type
    requirement-claim-validator.ts  # validateRequirementAcClaim
    design-claim-validator.ts       # validateDesignComplianceClaim
```

## Interfaces

```typescript
export { RequirementNoteSchema, type RequirementNote } from "./schemas/requirement-note";
export { DesignNoteSchema, type DesignNote } from "./schemas/design-note";
export { parseRequirementNote } from "./parsers/requirement-note";
export { parseDesignNote } from "./parsers/design-note";
export { validateRequirementAcClaim } from "./validators/requirement-claim-validator";
export { validateDesignComplianceClaim } from "./validators/design-claim-validator";
export type { ClaimResult } from "./validators/types";
```

## Algorithms

DesignNote sections are treated as opaque prose stored in a Record<string,
string> keyed by H2 heading text. Observations, Relations, and Compliance /
Architecture Compliance are excluded from the opaque map — they have
dedicated typed fields. Other DESIGN sections (Module Structure, Interfaces,
Algorithms, Data Flow, Edge Cases, etc.) are folded uniformly so the schema
does not constrain the author to a fixed set of headings.

The Compliance section is OPTIONAL. When present, it carries the same
mechanical contract as TaskNote DoD: status ACCEPTED requires every item
checked or deferred-with-rationale. When absent, ACCEPTED is permitted
unconditionally (the author opted out of mechanical compliance tracking).

## Compliance

- [ ] Honors ADR-003 D-4: Zod schema as validation contract
- [ ] Honors CRIT-003 F-1: common.ts shared primitives reused
- [ ] Compliance section is OPTIONAL per design rationale

## Observations

- [decision] DesignNote sections are opaque prose to avoid over-constraining authors #flexibility #schema
- [decision] Compliance section is OPTIONAL; ACCEPTED is unconditional when absent #optional-contract
- [constraint] Observations, Relations, Compliance are excluded from opaque sections Record #typed-fields

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
