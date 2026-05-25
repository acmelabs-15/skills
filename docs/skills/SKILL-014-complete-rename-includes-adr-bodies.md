---
title: 'SKILL-014: complete-rename-includes-adr-bodies'
type: skill
permalink: skills/skill-014-complete-rename-includes-adr-bodies
tags:
- skill
- complete-rename
- adr
- no-backcompat
---

# SKILL-014: complete-rename-includes-adr-bodies

**Skill Sidecar Learnings** · **Last Updated**: 2026-05-25 · **Sessions Analyzed**: 1 · reflection of [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]] Event 158.

## Constraints (HIGH confidence)

- [HIGH] + constraint: "A complete rename (no backwards-compat) applies to ADR decision BODIES too — not just code/specs. Do NOT treat an ADR as a preserve-only immutable record and wrap the rename in 'read X as Y' clarifications/caveats. Convert the old name to the new name directly in the ADR body, leaving zero old-name hits. The 'ADRs are immutable; post-decision changes go in Clarifications' convention governs DECISION CHANGES, not a mechanical project-wide rename." — Source: user correction, "I don't want you to add caveats - I just want you to update the adr by converting test-report to qa - no backwards compat or anything" (Session 2026-05-23_02, 2026-05-25)

## Preferences (MED confidence)

- [MED] + preference: "When the user says 'just convert X to Y', do the direct conversion and skip the decision-record-integrity framing. Over-preserving + adding 'read as' caveats is over-thinking the user explicitly rejects." — Source: this correction (Session 2026-05-23_02, 2026-05-25)

## Edge Cases (MED confidence)

- [MED] + edge case: "A blanket convert can produce a cosmetically-odd artifact (e.g. a rename-script's own filename `rename-X-to-Y.ts` becoming `rename-Y-to-Y.ts`, or 'stale type:X' becoming 'stale type:Y'). Flag such trivia in ONE line; do not block on it or wrap it in caveats." — Source: ADR-005 line-508 migration-artifact list (Session 2026-05-23_02, 2026-05-25)

## Notes for Review (LOW confidence)

- [LOW] ~ note: "Reflection/skill-sidecar notes are themselves Brain notes and must obey §5.3 — describe principles inline, never cite an auto-memory filename. SKILL-013 slipped on this (cited an auto-memory by name); fixed. Every capture brief must forbid auto-memory-filename citations." — Source: §5.3 self-check this session (Session 2026-05-23_02, 2026-05-25)

## Observations

- [constraint] Complete-rename (no backwards-compat) includes ADR decision bodies; convert directly, no preserve-caveats #complete-rename #adr #no-backcompat
- [insight] ADR immutability ('changes go in Clarifications') governs decision CHANGES, not mechanical project-wide renames #adr-convention #scope
- [decision] On 'just convert X to Y', do the direct conversion + skip integrity framing; flag cosmetic artifacts in one line, never block #user-intent #no-overthink

## Relations

- relates_to [[SKILL-013: adr-review-gate-scope]]
- relates_to [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]]