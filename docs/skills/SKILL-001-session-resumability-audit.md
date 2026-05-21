---
title: 'SKILL-001: session-resumability-audit'
type: skill
permalink: skills/skill-001-session-resumability-audit
tags:
- skill
- session-lifecycle
- plan-state
- resumability
---

# Skill-Session-001: Session Resumability Audit

**Statement**: Audit PLAN state for next-session resumability before every session close.

**Context**: Apply at session close, before final commit and PR creation. Triggered any time a session ends with in-progress PLAN work that a future agent must resume.

**Evidence**: Event 14 of SESSION-2026-05-20_06 — recovery-test readiness audit caught 5 PLAN-001 gaps (stale part substatus, missing owning_session references, incorrect Exit Criteria checkbox state) that would have broken fresh invocations. Zero gaps caught in sessions without this audit.

**Atomicity**: 94% | **Impact**: 9/10

## Pattern

1. Read the active PLAN note in full.
2. For each in-progress part: verify substatus is set, owning_session populated, at_event current.
3. For each blocked part: verify blocker note exists and blocker text is non-stale.
4. Verify Exit Criteria checkboxes reflect actual completion state (no premature `[x]`).
5. Verify next-ready parts are clearly identified with no ambiguous ordering.
6. Fix all gaps before committing. Document fixes in the session note as a final Event entry.

## Anti-Pattern

Treating the PLAN note as a living document that "looks fine" without reading it end-to-end. Gaps surface only when a fresh agent loads the PLAN and cannot determine where to start.

## Observations

- [technique] Recovery-test readiness audit at session close catches PLAN state gaps before they block fresh invocations #session-lifecycle #prevention
- [fact] Event 14 SESSION-2026-05-20_06: 5 gaps found and fixed in single audit pass; zero gaps found in sessions with this audit #validation #evidence
- [constraint] Audit must complete before final commit — gaps committed to main block all downstream build sessions #blocking-gate
- [insight] The audit is a one-time read-and-fix pass, not a recurring overhead; average cost is under 5 minutes #effort

## Relations

- relates_to [[RETRO-003: Phase X Execution and Composition Library Completion]]
- relates_to [[SKILL-003: dispatch-scope-fences]]
