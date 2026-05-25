---
title: 'SKILL-011: reflection-capture-runs-async'
type: skill
permalink: skills/skill-011-reflection-capture-runs-async
tags:
- skill
- reflection-capture
- async
- non-blocking
---

# SKILL-011: reflection-capture-runs-async

**Skill Sidecar Learnings** · **Last Updated**: 2026-05-25 · **Sessions Analyzed**: 1 · reflection of [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]] Event 155.

## Constraints (HIGH confidence)

- [HIGH] + constraint: "Run reflection capture in the BACKGROUND, not as a foreground blocking process. Dispatch the skill-sidecar write as a background subagent (Agent run_in_background:true, brain memory agent, opus) so the conversation never waits on the multi-step Brain writes; the orchestrator folds the new note + its session-event pointer into the next commit when the agent returns." — Source: user, "when i say background I mean as not a foreground process but run it in the background so we don't have to wait for it" (Session 2026-05-23_02, 2026-05-25)

## Preferences (MED confidence)

- [MED] + preference: "Keep the orchestrator owning the commit (agents don't self-commit per the no-autonomous-git rule) — the background agent creates the note + appends the session pointer and returns State Changes; the orchestrator commits on the next boundary." — Source: division-of-labor clarification (Session 2026-05-23_02, 2026-05-25)

## Edge Cases (MED confidence)

- [MED] + edge case: "Avoid concurrent edits to the same note: while a background capture agent is touching the session note, the main thread should not also edit it — let the agent finish, then commit." — Source: concurrency consideration (Session 2026-05-23_02, 2026-05-25)

## Notes for Review (LOW confidence)

- [LOW] ~ note: "'Background' here is literal async/non-blocking dispatch, NOT 'a foreground step done quietly' — the earlier misread was doing the capture foreground (which still made the conversation wait)." — Source: this correction (Session 2026-05-23_02, 2026-05-25)

## Observations

- [constraint] Reflection capture dispatches as a background subagent (run_in_background) so the conversation never blocks on Brain writes #reflection-capture #async #non-blocking
- [insight] Foreground capture, even unannounced, still makes the user wait — the point is true async #latency #seamless
- [decision] Background agent creates note + session pointer; orchestrator commits on next boundary #division-of-labor #no-autonomous-git

## Relations

- relates_to [[SKILL-010: reflection-capture-never-ask]]
- relates_to [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]]