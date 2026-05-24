---
title: 'DESIGN-001-SPEC-008: Coverage Module Layout'
type: design
permalink: specs/spec-008-protocol-hardening-wave-2/design/design-001-spec-008-coverage-module-layout
status: ACCEPTED
tags:
- design
- spec-008
- module-structure
- coverage
- wave-2
---

# DESIGN-001-SPEC-008: Coverage Module Layout

## Context

This design fixes the module layout, naming conventions, and barrel-export shape for the five new schemas, four new parsers (plus one verify-only PLAN parser touch), and four new claim validators delivered by Track 1 of SPEC-008. The decisions are constrained by [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-2 (extend existing flat dirs, do not introduce wave-specific subdirectories) and D-5 (close all P0 and P1 coverage gaps from ANALYSIS-004 Audit A). The composition library currently lives at `_shared/composition/`; Track 4 of SPEC-008 renames `_shared` to `shared` as its first task. All file paths in this design and in every Track 1 TASK use the post-rename `shared/` form, and Track 1 TASKs that author files declare a depends_on edge against the Track 4 rename TASK.

## Design

The five new artifacts extend the existing four-layer pattern (schema, parser, renderer, mutation; renderers are out of scope for Track 1) with no structural change. Each artifact is colocated by name with its peers: `<type>-note.ts` for schemas and parsers, `<type>-claim-validator.ts` for validators. No wave-specific naming token (no `wave-2-` prefix, no `v2-` suffix); Wave 2 files are indistinguishable from Wave 1 files in the directory listing, by design.

Cross-cutting constants stay in `shared/composition/src/schemas/common.ts`. Wave 2 adds no new common entries unless a constant is genuinely shared (e.g., the `terminalPlanPartSubstatus` set used by `validatePlanDoneClaim` and the renderer). Per-type constants stay in the per-type schema file.

Barrel exports live at `shared/composition/src/schemas/index.ts`, `parsers/index.ts`, and `validators/index.ts`. Each Wave 2 module gets a single `export *` or named-export line added; downstream consumers (per-skill scripts in Track 2, hook handlers in Track 5) import from the barrel, not from individual files, to keep import paths stable across future refactors.

## Module Structure

```text
shared/composition/src/
  schemas/
    common.ts                     # EXISTING (extend if cross-cutting; per-type otherwise)
    plan-note.ts                  # EXISTING — extended with done-claim superRefine (REQ-001)
    session-note.ts               # EXISTING
    spec-root-note.ts             # EXISTING
    requirement-note.ts           # EXISTING
    design-note.ts                # EXISTING
    task-note.ts                  # EXISTING
    test-report-note.ts           # EXISTING
    adr-note.ts                   # NEW (REQ-001) — AdrNoteSchema
    analysis-note.ts              # NEW (REQ-001) — AnalysisNoteSchema (rejects ACCEPTED + Open Questions)
    epic-note.ts                  # NEW (REQ-001) — EpicNoteSchema
    crit-note.ts                  # NEW (REQ-001) — CritNoteSchema (no claim validator)
    index.ts                      # MODIFIED — barrel re-exports the four new schemas
  parsers/
    ast-helpers.ts                # EXISTING
    plan-note.ts                  # EXISTING (verified-only by REQ-002; no code change)
    session-note.ts               # EXISTING
    adr-note.ts                   # NEW (REQ-002) — parseAdrNote
    analysis-note.ts              # NEW (REQ-002) — parseAnalysisNote
    epic-note.ts                  # NEW (REQ-002) — parseEpicNote
    crit-note.ts                  # NEW (REQ-002) — parseCritNote
    index.ts                      # MODIFIED — barrel re-exports the four new parsers
  validators/
    task-claim-validator.ts       # EXISTING (Wave 1 reference)
    spec-claim-validator.ts       # EXISTING
    requirement-claim-validator.ts # EXISTING
    design-claim-validator.ts     # EXISTING
    test-report-claim-validator.ts # EXISTING
    adr-claim-validator.ts        # NEW (REQ-003) — validateAdrAcceptedClaim
    analysis-claim-validator.ts   # NEW (REQ-003) — validateAnalysisAcceptedClaim
    epic-claim-validator.ts       # NEW (REQ-003) — validateEpicDoneClaim (resolveSpec)
    plan-claim-validator.ts       # NEW (REQ-003) — validatePlanDoneClaim
    index.ts                      # MODIFIED — barrel re-exports the four new validators
```

## Interfaces

```typescript
// Schema exports (from schemas/index.ts barrel)
export { AdrNoteSchema, type AdrNote } from "./adr-note";
export { AnalysisNoteSchema, type AnalysisNote } from "./analysis-note";
export { EpicNoteSchema, type EpicNote } from "./epic-note";
export { CritNoteSchema, type CritNote } from "./crit-note";
// PlanNoteSchema export already present; extension is additive via superRefine

// Parser exports (from parsers/index.ts barrel)
export { parseAdrNote } from "./adr-note";
export { parseAnalysisNote } from "./analysis-note";
export { parseEpicNote } from "./epic-note";
export { parseCritNote } from "./crit-note";

// Claim validator exports (from validators/index.ts barrel)
export {
  validateAdrAcceptedClaim,
  type AdrClaimResult,
} from "./adr-claim-validator";
export {
  validateAnalysisAcceptedClaim,
  type AnalysisClaimResult,
} from "./analysis-claim-validator";
export {
  validateEpicDoneClaim,
  type EpicClaimResult,
  type SpecResolver,
} from "./epic-claim-validator";
export {
  validatePlanDoneClaim,
  type PlanClaimResult,
} from "./plan-claim-validator";

// Claim validator return-type contract (mirrors Wave 1 task-claim-validator)
export type ClaimResult = {
  ok: boolean;
  unsatisfied: Array<{
    path: string;        // e.g., "clarifications[2].checkbox" or "parts[3].substatus"
    reason: string;      // human-readable failure description
    value?: unknown;     // the offending value, when relevant
  }>;
};

// SpecResolver contract for cross-note EPIC validator
export type SpecResolver = (specRef: string) => SpecRootNote | undefined;
```

## Dependency Graph

```text
schemas/common.ts
  <- schemas/adr-note.ts
  <- schemas/analysis-note.ts
  <- schemas/epic-note.ts
  <- schemas/crit-note.ts
  <- schemas/plan-note.ts (existing)

schemas/adr-note.ts        <- parsers/adr-note.ts        <- validators/adr-claim-validator.ts
schemas/analysis-note.ts   <- parsers/analysis-note.ts   <- validators/analysis-claim-validator.ts
schemas/epic-note.ts       <- parsers/epic-note.ts       <- validators/epic-claim-validator.ts
schemas/crit-note.ts       <- parsers/crit-note.ts       (no claim validator)
schemas/plan-note.ts       <- parsers/plan-note.ts       <- validators/plan-claim-validator.ts

validators/epic-claim-validator.ts depends additionally on:
  - schemas/spec-root-note.ts (for SpecRootNote type)
  - SpecResolver callback (supplied at call site by hook handler or per-skill script)
```

No circular dependencies are possible because each layer depends only on lower layers, identical to the Wave 1 pattern documented in [[SPEC-007: Plan/Session Render Implementation]] DESIGN-001.

## Naming Conventions

| Artifact | Pattern | Example |
| --- | --- | --- |
| Schema file | `<type>-note.ts` | `adr-note.ts` |
| Schema constant | `<Type>NoteSchema` | `AdrNoteSchema` |
| Schema type alias | `<Type>Note` | `AdrNote` |
| Parser file | `<type>-note.ts` (in parsers/) | `parsers/adr-note.ts` |
| Parser function | `parse<Type>Note` | `parseAdrNote` |
| Claim validator file | `<type>-claim-validator.ts` | `adr-claim-validator.ts` |
| Claim validator function | `validate<Type><TerminalStatus>Claim` | `validateAdrAcceptedClaim`, `validatePlanDoneClaim` |
| Claim result type | `<Type>ClaimResult` | `AdrClaimResult` |

Names use ASCII letters and hyphens; no underscores in filenames, no abbreviations beyond the canonical entity prefixes (ADR, CRIT). This matches the Wave 1 convention.

## Compliance
- [x] Every NEW file lives at the path documented in the Module Structure section (no deviations to wave-specific subdirectories)
- [x] Every NEW schema constant is named `<Type>NoteSchema`; every type alias is `<Type>Note`
- [x] Every NEW parser function is named `parse<Type>Note` and is exported from `parsers/index.ts`
- [x] Every NEW claim validator function is named `validate<Type><TerminalStatus>Claim` and is exported from `validators/index.ts`
- [x] `validateEpicDoneClaim` accepts a `resolveSpec: SpecResolver` parameter and throws if missing when the EPIC has contains relations
- [x] CRIT has NO claim validator file in `validators/`
- [x] Every NEW file imports cross-cutting constants from `schemas/common.ts`, never duplicates them
- [x] All paths in NEW files and in TASK references use `shared/` (post-rename), never `_shared/`

_DESIGN-001 compliance fully satisfied at TASK-001..010 set closure (Event 82, 2026-05-24): all 5 schemas + 4 parsers + 4 claim validators landed; CRIT correctly has no validator; common.ts imports verified across QA notes; all paths post-rename._

## Algorithms

The Wave 2 artifacts use no new algorithms beyond those established by Wave 1. Schemas use Zod plus superRefine. Parsers use unified plus remark-parse with the `bulletFieldMap` section-dispatch pattern from SPEC-007 DESIGN-002. Claim validators are pure-function scans of the parsed model. The one cross-note pattern (`validateEpicDoneClaim`) uses a caller-supplied resolver callback rather than embedding I/O; the hook handler in Track 5 will supply a resolver that reads SPEC root notes via the project filesystem.

## Edge Cases

| Case | Behavior |
| --- | --- |
| EPIC has zero `contains` relations | `validateEpicDoneClaim` returns `{ ok: true }` without invoking the resolver |
| EPIC `contains` references a SPEC that does not exist on disk | Resolver returns undefined; validator reports `{ ok: false }` naming the missing SPEC |
| PLAN has zero parts | Schema layer (REQ-001 done-claim refinement) rejects this at parse time; validator never sees it |
| ADR has no Clarifications section | Validator skips the clarifications check and passes if other checks pass |
| ANALYSIS has Open Questions section but status is DRAFT | Validator returns `{ ok: true }` because the targeted status is ACCEPTED, not DRAFT |
| CRIT note structurally malformed | Parser throws Zod error; no claim validator path is exercised (CRIT has none) |

## Performance Considerations

Each validator is O(n) over the relevant section (Clarifications items for ADR, parts array for PLAN, contains relations for EPIC). Bounded sub-millisecond per note at realistic sizes (10-100 items). The EPIC validator's additional I/O via the resolver is dominated by filesystem read latency; mitigated by the hook handler caching resolved SPEC notes per turn.

## Observations

- [design] All Wave 2 artifacts use the existing flat-directory layout per ADR-005 D-2; no wave-specific subdirectory grouping #flat-dirs #d-2
- [decision] CRIT receives a schema and parser but no claim validator per ADR-005 D-5 because no terminal-status claim exists for CRIT #d-5 #crit
- [constraint] `validateEpicDoneClaim` is the only validator with a cross-note dependency; the resolveSpec callback is mandatory and the validator throws when the EPIC has contains relations but no resolver is supplied #cross-note #critic-p1-1
- [technique] Barrel exports at `schemas/index.ts`, `parsers/index.ts`, and `validators/index.ts` keep downstream import paths stable across future refactors #barrel #stable-imports
- [constraint] Every path in this design and in every Track 1 TASK uses `shared/` (post-rename); Track 1 TASKs that author files declare depends_on the Track 4 rename TASK #rename-dependency

## Relations

- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- implements [[ADR-001: Composition Library Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[REQ-001-SPEC-008: New Schema Suite]]
- relates_to [[REQ-002-SPEC-008: New Parser Suite]]
- relates_to [[REQ-003-SPEC-008: New Claim Validator Suite]]
