---
title: 'SKILL-004: advisory-needs-mechanical'
type: skill
permalink: skills/skill-004-advisory-needs-mechanical
tags:
- skill
- enforcement
- defense-in-depth
- protocol
---

# Skill-Protocol-004: Advisory Needs Mechanical

**Statement**: Advisory-only protocol rules fail without mechanical check after each operation.

**Context**: Apply when introducing any protocol rule that relies on the agent remembering to act. Required whenever a HARD-LOCKED memory rule exists for a step that is not wired to a tool hook or schema validation.

**Evidence (RETRO-002)**: Session note Observations/Relations stale across 3+ sessions despite HARD-LOCKED memory rule. Advisory rule existed; no mechanical check fired. Evidence (RETRO-003): Same problem recurred in SESSION-2026-05-20_06 across 13 events — rule remembered at close time, not after each Event append.

**Atomicity**: 88% | **Impact**: 10/10

## Pattern

For every advisory protocol rule, add a mechanical enforcement layer:

| Advisory Rule | Mechanical Equivalent |
|---|---|
| "Refresh Observations after each event" | PostToolUse hook on `edit_note` for session notes |
| "Run deduplication before ADD" | Pre-flight checklist with search step embedded |
| "Verify branch before git ops" | Pre-commit hook reading branch name |

Implementation steps:
1. Identify the advisory rule.
2. Determine the tool operation that triggers the rule (e.g., `edit_note`, `commit`, `write_note`).
3. Add a PostToolUse hook or schema `superRefine` validator that fires at that operation.
4. If hook infrastructure is unavailable, embed the check as the FIRST step in the operation template (making it procedurally mandatory).

## Anti-Pattern

Adding rules to HARD-LOCKED memories and assuming compliance improves. Memory layer is necessary but not sufficient. Defense-in-depth requires both the memory rule and a mechanical check at the operation boundary.

## Observations

- [insight] Advisory-to-mechanical enforcement transition works: SESSION-2026-05-20_05 had 37 drift surfaces; SESSION-2026-05-20_06 had 1 hygiene violation — same orchestrator, different enforcement layer #defense-in-depth #evidence
- [problem] Session note Observations/Relations stale across 4 sessions despite HARD-LOCKED rule — recurring failure pattern demonstrates advisory-only insufficiency #recurring #failure
- [technique] PostToolUse hooks and schema superRefine validators are the two mechanical enforcement surfaces available; use both where applicable #implementation
- [fact] Composition library Phase X: 6 claim validators + 4 schema superRefine checks eliminated agent lying on state transitions mechanically #validation #green
- [constraint] Mechanical check must fire at the operation boundary, not at session close — close-time checks catch recurring violations too late #timing

## Relations

- relates_to [[RETRO-003: Phase X Execution and Composition Library Completion]]
- relates_to [[RETRO-002: Phase X Bootstrap and Wave 2 Integration Drift Recovery]]
- relates_to [[SKILL-002: canonical-block-parallelism]]