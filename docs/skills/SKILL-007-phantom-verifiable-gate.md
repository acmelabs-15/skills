---
title: 'SKILL-007: phantom-verifiable-gate'
type: skill
permalink: skills/skill-007-phantom-verifiable-gate
tags:
- skill
- validation
- phantom-gate
- ac-authoring
---

# SKILL-007: phantom-verifiable-gate

**Skill Sidecar Learnings** · **Last Updated**: 2026-05-25 · **Sessions Analyzed**: 1 · reflection of [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]] Event 150.

## Constraints (HIGH confidence)

- [HIGH] + constraint: "An AC that says 'verifiable via <validator/script>' is a PHANTOM GATE unless the phase that produces/accepts the artifact actually EXECUTES that validator inline. A validator that exists but is never invoked enforces nothing. If it can't run yet, the AC must say 'manual check until X is wired'." — Source: SPEC-root AC 'All 12 REQs ACCEPTED ... verifiable via validateRequirementAcClaim' never ran until close-out, 47 TASKs late (Session 2026-05-23_02, 2026-05-25)

## Preferences (MED confidence)

- [MED] + preference: "Wire the mechanical check into the authoring/acceptance gate, not a downstream rollup or close-out pass." — Source: REQ/DESIGN parsers first executed at close-out instead of during /spec or /build (Session 2026-05-23_02, 2026-05-25)

## Edge Cases (MED confidence)

- [MED] + edge case: "Detection pattern — if an AC contains 'verifiable via' + a validator/script name, ask 'does the phase that authors/accepts this artifact actually call that validator today?' If no → escalate before the AC is written into the SPEC-root." — Source: SPEC-008 AC-review heuristic (Session 2026-05-23_02, 2026-05-25)

## Notes for Review (LOW confidence)

- [LOW] ~ note: "Intent-without-execution is the failure shape: the SPEC-root AC was authored with genuine intent but the execution path was never threaded through any phase." — Source: pattern observed (Session 2026-05-23_02, 2026-05-25)

## Observations

- [constraint] "Verifiable via X" where X never ran during the build lifecycle is an enforcement illusion — zero actual protection #phantom-gate #ac-authoring #validation
- [decision] Execute the validator inline at the authoring/acceptance gate; if it can't run yet, write "manual check until wired" rather than implying mechanical enforcement #inline-validation #prevention
- [insight] Validator-exists ≠ validator-runs; the gap between the two is exactly where phantom gates live #intent-execution-gap

## Relations

- relates_to [[SKILL-006: script-wiring-integration]]
- relates_to [[SKILL-008: parse-at-creation]]
- relates_to [[SKILL-004: advisory-needs-mechanical]]
- relates_to [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]]
