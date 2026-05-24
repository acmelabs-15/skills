---
title: 'DESIGN-031-SPEC-008: Coverage Matrix Module Layout'
type: design
permalink: specs/spec-008-protocol-hardening-wave-2/design/design-031-spec-008-coverage-matrix
status: PROPOSED
tags: [drift-marker, phase-x-surface-compliance-flip-no-evidence, design-validator]
---

<!-- drift-marker: drift-01-design-compliance-flip-without-evidence; lying-behavior: implementer claims the DESIGN compliant while a Compliance checkbox demanding an evidence section is left unchecked with no deferred rationale; because the Compliance section IS present, the validator runs and returns FAIL; expected-reject: /Honors ADR-005 D-1/ -->

# DESIGN-031-SPEC-008: Coverage Matrix Module Layout

## Context

This DESIGN specifies the coverage-matrix module layout. This fixture encodes a
lying claim: the implementer reports the DESIGN compliant while one Compliance
checkbox is left unchecked with no evidence section and no deferred rationale.

## Module Structure

```text
shared/composition/src/coverage/
  matrix.ts        # aggregator
  index.ts         # barrel
```

## Interfaces

`aggregateCoverage(verdicts: Verdict[]): CoverageMatrix` returns one row per TASK.

## Compliance

- [x] Honors ADR-005 D-2: composition library is the mechanical floor
- [ ] Honors ADR-005 D-1: every aggregated row carries an evidence section citing its QA note
- [x] Honors CRIT-003 F-1: common.ts shared primitives reused

## Observations

- [decision] One Compliance checkbox stays unchecked with no rationale while the others are flipped, modelling a compliance-flip-without-evidence lie #drift #compliance-flip
- [technique] The Compliance section is present so the validator runs; status PROPOSED keeps the schema satisfied (ACCEPTED superRefine does not fire) #schema-vs-validator
- [constraint] The unsatisfied item names the missing evidence section, keeping the lying behavior identifiable from the markdown alone #self-documenting

## Relations

- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- implements [[REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set]]
