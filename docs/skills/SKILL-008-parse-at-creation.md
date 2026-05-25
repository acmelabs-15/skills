---
title: 'SKILL-008: parse-at-creation'
type: skill
permalink: skills/skill-008-parse-at-creation
tags:
- skill
- note-authoring
- parse-validation
- template-drift
---

# SKILL-008: parse-at-creation

**Skill Sidecar Learnings** · **Last Updated**: 2026-05-25 · **Sessions Analyzed**: 1 · reflection of [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]] Event 151.

## Constraints (HIGH confidence)

- [HIGH] + constraint: "Every note-authoring subagent dispatch brief MUST include a post-write validation step: after write_note + move_note, run the type's composition parser (parseRequirementNote / parseDesignNote / parseTaskNote / ...) on the authored note and verify exit 0; if it rejects, fix before closing the task — do NOT defer. This is the Brain-note equivalent of `tsc --noEmit`: run at write time, not ship time." — Source: SPEC-008 REQ/DESIGN notes drifted from canonical template, undetected from /spec authoring through the entire 47-TASK build (Session 2026-05-23_02, 2026-05-25)

## Preferences (MED confidence)

- [MED] + preference: "Treat the type's parser as the mechanical ground truth for note structure; semantic review (analyst Gate A) + drift review (critic Gate B) do NOT substitute for it." — Source: Gate A + Gate B passed while every SPEC-008 REQ/DESIGN note failed to parse (Session 2026-05-23_02, 2026-05-25)

## Edge Cases (MED confidence)

- [MED] + edge case: "A note can have correct EARS content + valid AC checkboxes yet fail to parse because it used the wrong heading (`## EARS` vs canonical `## Requirement Statement`), an invalid observation category (`[design]` not in the 10-enum), >5 tags, or >200-char priority. Content-correct ≠ structure-valid." — Source: SPEC-008 REQ/DESIGN drift (Session 2026-05-23_02, 2026-05-25)

## Notes for Review (LOW confidence)

- [LOW] ~ note: "The further downstream the parse-catch, the more notes need remediation AND the more downstream work was already built on the drifted notes. Cost compounds with delay." — Source: project-wide REQ/DESIGN drift spanning SPEC-001..008 (Session 2026-05-23_02, 2026-05-25)

## Observations

- [constraint] Post-write parse-validation is mandatory for every Brain note a subagent authors; template drift is invisible without it #parse-at-creation #note-authoring #subagent-brief
- [insight] Semantic gates catch content correctness; parser validation catches structural correctness — both are needed, neither substitutes for the other #gate-layers #complementary
- [risk] Notes authored without parse-at-creation pass semantic review, enter the graph, and only fail when the enforcement layer first runs them — often after downstream work depends on them #drift #downstream-cost

## Relations

- relates_to [[SKILL-006: script-wiring-integration]]
- relates_to [[SKILL-007: phantom-verifiable-gate]]
- relates_to [[SKILL-004: advisory-needs-mechanical]]
- relates_to [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]]

- relates_to [[RETRO-004: PLAN-001 Skills Ecosystem Retrospective]]