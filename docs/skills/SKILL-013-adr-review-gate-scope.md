---
title: 'SKILL-013: adr-review-gate-scope'
type: skill
permalink: skills/skill-013-adr-review-gate-scope
tags:
- skill
- adr-review
- gate-scope
- proportionality
---

# SKILL-013: adr-review-gate-scope

**Skill Sidecar Learnings** · **Last Updated**: 2026-05-25 · **Sessions Analyzed**: 1 · reflection of [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]] Event 157.

## Constraints (HIGH confidence)

- [HIGH] + constraint: "The adr-review BLOCKING gate exists to give NEW or CHANGED architectural decisions adversarial scrutiny BEFORE they are locked and BEFORE downstream work builds on them. Apply it by decision-SUBSTANCE + TIMING, not by 'any byte changed in an ADR file.' A `## Clarifications` entry that merely DOCUMENTS an already-decided + already-implemented + already-QA-validated finding, with nothing downstream depending on it, does NOT warrant a full multi-agent adr-review — the gate's purpose is structurally already satisfied." — Source: SPEC-008 close-out; user, "I'm not convinced we actually need to do an adr-review" re: ADR-005 D-B clarification (EPIC-only adversarial fixtures, decided+implemented+QA-088-validated during build) (Session 2026-05-23_02, 2026-05-25)

## Preferences (MED confidence)

- [MED] + preference: "For a documentation-only ADR edit (clarification of an implemented decision, or a mechanical ref cleanup like test-report->qa), substitute a careful orchestrator review for the full 6-agent debate. If in doubt whether an edit is substantive, RUN the gate — under-running is the safer default for genuine decisions." — Source: proportionality call this session (Session 2026-05-23_02, 2026-05-25)

## Edge Cases (MED confidence)

- [MED] + edge case: "If a 'clarification' turns out to introduce a genuinely NEW contestable scope choice (not just record a past one), the adr-review gate re-applies — re-evaluate at authoring time, not by the label 'clarification' alone." — Source: scoped-waiver reasoning (Session 2026-05-23_02, 2026-05-25)

## Notes for Review (LOW confidence)

- [LOW] ~ note: "This refines feedback_adr_review_blocking_gate (which reads 'ALL ADR creates/updates MUST trigger adr-review'); consider folding the substance+timing scoping into that memory during skillbook synthesis." — Source: this analysis (Session 2026-05-23_02, 2026-05-25)

## Observations

- [constraint] adr-review applies to NEW/CHANGED decisions pre-lock + pre-downstream-work, judged by substance+timing — not to documentation-only ADR edits #adr-review #gate-scope #proportionality
- [decision] For a clarification of an implemented+QA'd decision, substitute orchestrator review for the 6-agent debate; when in doubt, run the gate #waiver #default-safe
- [risk] Over-broad reading ("any ADR byte → full adr-review") wastes multi-agent effort on typo/ref/clarification edits; over-narrow reading skips scrutiny on real decisions — judge by substance #both-failure-modes

## Relations

- relates_to [[SKILL-009: schema-single-source-of-truth]]
- relates_to [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]]