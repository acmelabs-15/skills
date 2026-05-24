---
title: "SPEC-099: Sample Spec Root Note"
type: spec
permalink: specs/spec-099-sample/spec-099-sample
status: ACCEPTED
tags:
  - spec
  - sample
  - test-fixture
---

# SPEC-099: Sample Spec Root Note

## Context

This sample fixture exercises every structural section the SpecRootNote
schema and parser recognize. It is a fixture, not a real SPEC.

The Context section may span multiple paragraphs; the parser concatenates
them via `proseFromChildren`.

## Scope

### In Scope

- Schema for SpecRootNote with Success Criteria + Artifact Status gates
- Parser that handles Phases with H3 sub-sections
- Round-trip discovery of phase req_refs

### Out of Scope

- SpecRootNote renderer (deferred)
- Adapters
- Round-trip byte identity

## Phases

### Phase 1: Foundation

- REQ-001 -- common schema
- REQ-002 -- frontmatter validation

Refs: [[REQ-001-SPEC-099: Common Schema]], [[REQ-002-SPEC-099: Frontmatter]]

### Phase 2: Validation

- DESIGN-001 -- claim validation contract
- TASK-001 -- implement claim validator

Refs: [[DESIGN-001-SPEC-099: Claim Validation]], [[TASK-001-SPEC-099: Validator]]

## Success Criteria

- [x] Schema rejects mismatched verdict declarations
- [x] Parser handles Phases H3 sub-structure
- [ ] All ACCEPTED REQs reach DONE via Gate A
- [ ] Status DONE blocked unless every gate satisfied (deferred: covered by SPEC schema invariant 4)

## Artifact Status

### Requirements

- [ ] REQ-001-SPEC-099: Common Schema
- [ ] REQ-002-SPEC-099: Frontmatter

### Designs

- [ ] DESIGN-001-SPEC-099: Claim Validation

### Tasks

- [ ] TASK-001-SPEC-099: Validator

## Decomposition Methodology

Standard analyst clustering applied. No CVA needed at this scope.

## ADR Cross-cutting Constraints

| ADR | Constraint | How honored |
| --- | --- | --- |
| ADR-001 F-6 | Bun + TS runtime | All src files use Bun-native APIs |

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Test-report schema brittleness | Medium | Semantic round-trip suffices for X.D.7 |

## Observations

- [decision] SpecRootNote schema authored 2026-05-21 covering Phase X.D.7 #spec #status
- [constraint] Both gate sections optional; DONE permits when both absent #flexibility
- [insight] Body variation defers renderer to follow-up round #renderer-deferred

## Relations

- implements [[ADR-001: Sample ADR]]
- part_of [[PLAN-099: Sample Plan]]
- contains [[REQ-001-SPEC-099: Common Schema]]
- contains [[REQ-002-SPEC-099: Frontmatter]]
- contains [[DESIGN-001-SPEC-099: Claim Validation]]
- contains [[TASK-001-SPEC-099: Validator]]
