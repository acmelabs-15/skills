---
title: 'DESIGN-032-SPEC-008: Stop Backstop Hook Layout'
type: design
permalink: specs/spec-008-protocol-hardening-wave-2/design/design-032-spec-008-stop-backstop
status: PROPOSED
tags: [drift-marker, phase-x-surface-compliance-silent-flip, design-validator]
---

<!-- drift-marker: drift-02-compliance-silent-unchecked; lying-behavior: implementer claims the DESIGN compliant while every Compliance checkbox remains unchecked and undeferred — a silent no-op flip where the section exists but nothing was substantiated; the validator returns FAIL enumerating each item; expected-reject: /Honors ADR-005 D-3/ -->

# DESIGN-032-SPEC-008: Stop Backstop Hook Layout

## Context

This DESIGN specifies the Stop-event backstop hook layout. This fixture encodes
a lying claim: the implementer reports the DESIGN compliant while the entire
Compliance checklist remains unchecked with no deferred rationale — the section
exists but nothing was actually substantiated.

## Module Structure

```text
hooks/
  stop-backstop.ts   # Stop-event observability backstop
```

## Interfaces

`onStop(event: StopEvent): ChangedSet` records the file-changed set.

## Compliance

- [ ] Honors ADR-005 D-3: hook lives in the canonical plugin hook directory
- [ ] Honors ADR-005 D-4: hook emits a structured file-changed event
- [ ] Honors CRIT-003 F-2: hook is side-effect-isolated for testability

## Observations

- [decision] Every Compliance checkbox stays unchecked with no rationale, modelling a silent no-op compliance flip #drift #silent-flip
- [problem] The compliance-claim is wholly unsubstantiated; the validator returns FAIL enumerating each item #unsubstantiated
- [technique] The Compliance section is present so the validator runs; status PROPOSED keeps the schema satisfied #schema-vs-validator

## Relations

- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- implements [[REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set]]
