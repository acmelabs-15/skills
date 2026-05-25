---
title: 'SKILL-006: script-wiring-integration'
type: skill
permalink: skills/skill-006-script-wiring-integration
tags:
- skill
- scripts
- integration
- done-definition
---

# SKILL-006: script-wiring-integration

**Skill Sidecar Learnings** · **Last Updated**: 2026-05-25 · **Sessions Analyzed**: 1 · reflection of [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]] Event 149.

## Constraints (HIGH confidence)

- [HIGH] + constraint: "A script/CLI deliverable is NOT done on 'exists + unit-tested'. DONE requires the runtime surface (SKILL.md prose or equivalent caller) to explicitly reference the script by path and describe when/how to invoke it at its gate point. Every 'new script' task carries a DoD checkbox for that wiring." — Source: user-identified, "the whole point of a scripts directory w/ scripts is because they are explicitly mentioned in the skill ... I'm pretty sure none of our skills mention any of their scripts" (Session 2026-05-23_02, 2026-05-25)

## Preferences (MED confidence)

- [MED] + preference: "Co-author skill prose and its scripts together (as defrag/ingest did). Co-authoring is the forcing function that wires the script in; bolting scripts onto an existing skill later is where the wiring gets skipped." — Source: defrag (5 refs) / ingest (6 refs) wire theirs; the 7 lifecycle skills that got scripts bolted on by SPEC-008 wire none (Session 2026-05-23_02, 2026-05-25)

## Edge Cases (MED confidence)

- [MED] + edge case: "A script can pass ALL its unit tests + ACs (existence, import.meta.main guard, path-containment, colocated success/fail tests) and still be 100% inert at runtime if no SKILL.md invokes it. Test-green ≠ wired-in." — Source: 11 SPEC-008 Track-2 scripts, 180 tests / 0 fail, 0 SKILL.md references (Session 2026-05-23_02, 2026-05-25)

## Notes for Review (LOW confidence)

- [LOW] ~ note: "Consider a mechanical check (lint/hook) flagging any `skills/<skill>/scripts/*.ts` not referenced by that skill's SKILL.md — turn this advisory into a gate (pairs with the advisory-needs-mechanical lesson)." — Source: pattern observed across 7 skills (Session 2026-05-23_02, 2026-05-25)

## Observations

- [constraint] Script DONE = exists + tested + WIRED (SKILL.md names the path + trigger); missing the wire-up makes it dead code at runtime #done-definition #script-wiring #integration
- [insight] Co-authoring skill prose + scripts is the forcing function; retro-bolted scripts are where wiring is skipped — defrag/ingest wire theirs, the 7 lifecycle skills don't #co-authoring #retro-gap
- [problem] REQ-004/005 ACs verified script existence + guard + path-containment + colocated tests but never the integration step — a completeness illusion #ac-gap #completeness-illusion

## Relations

- relates_to [[SKILL-007: phantom-verifiable-gate]]
- relates_to [[SKILL-008: parse-at-creation]]
- relates_to [[SKILL-004: advisory-needs-mechanical]]
- relates_to [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]]

- relates_to [[RETRO-004: PLAN-001 Skills Ecosystem Retrospective]]