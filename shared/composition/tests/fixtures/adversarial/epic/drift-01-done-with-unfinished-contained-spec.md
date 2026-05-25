---
title: 'EPIC-092: Sample Adversarial Epic Roadmap'
type: epic
permalink: roadmap/epic-092-adversarial
status: DONE
tags: [drift-marker, phase-x-surface-epic-cross-note-lie, epic-validator]
---

<!-- drift-marker: drift-01-done-with-unfinished-contained-spec; lying-behavior: orchestrator claims the EPIC DONE while a SPEC it `contains` has NOT itself reached terminal status DONE; this lie is CROSS-NOTE — the EpicNoteSchema superRefine only checks the structural "contains relation requires a Contained Specs section" invariant (which this fixture satisfies, so it parses cleanly) and does NOT resolve child-SPEC status, so the lie passes `.parse()`; only `validateEpicDoneClaim` (with the harness-supplied SpecResolver that resolves the contained ref to a non-DONE SpecRootNote) rejects it; expected-reject: /SPEC-099: Unfinished Child Spec/ -->

# EPIC-092: Sample Adversarial Epic Roadmap

## Epic Statement

This sample EPIC encodes a lying EPIC-done claim: the EPIC is marked DONE while
one of the SPECs it contains has not itself reached terminal status DONE. The
structural Contained Specs section is present (so the schema accepts the note),
but the cross-note completion gate must reject the done-claim.

## Contained Specs

- [[SPEC-099: Unfinished Child Spec]]

## Observations

- [decision] EPIC frontmatter status is DONE while the single contained SPEC remains non-DONE, modelling a cross-note done-claim bypass #drift #cross-note
- [technique] The EpicNoteSchema superRefine only gates "contains relation implies a Contained Specs section" — which this fixture satisfies — so the lie survives `.parse()` and only the resolver-driven validator catches it #schema-vs-validator
- [constraint] validateEpicDoneClaim resolves every `contains` target via the caller-supplied SpecResolver; the harness supplies a resolver returning a non-DONE SpecRootNote, so the claim fails citing the unfinished child SPEC #resolver-driven

## Relations

- contains [[SPEC-099: Unfinished Child Spec]]
- part_of [[PRD-001: Protocol Hardening Roadmap]]
