---
title: 'SKILL-003: dispatch-scope-fences'
type: skill
permalink: skills/skill-003-dispatch-scope-fences
tags:
- skill
- dispatch
- scope
- agent-delegation
---

# Skill-Dispatch-003: Dispatch Scope Fences

**Statement**: Every dispatch brief lists explicit IN-SCOPE and OUT-OF-SCOPE items.

**Context**: Apply to every agent dispatch brief, regardless of task size. Required before any Task() or SendMessage() call. Especially critical for parallel waves where agents cannot ask clarifying questions mid-execution.

**Evidence**: Events 03-08 of SESSION-2026-05-20_06 — 6 sequential engineer dispatches with explicit scope fences produced zero scope creep. Prior sessions without fences regularly required mid-execution corrections or rollback of unauthorized changes.

**Atomicity**: 90% | **Impact**: 8/10

## Pattern

```markdown
## Scope

**IN-SCOPE**:
- [specific item 1]
- [specific item 2]

**OUT-OF-SCOPE** (do not touch):
- [adjacent item that might seem related]
- [file / module that is off-limits this dispatch]
```

Place the Scope section immediately after the task statement, before any implementation detail.

## Anti-Pattern

Describing only what the agent should do and assuming it will not touch adjacent systems. Agents infer task boundaries from context; without explicit fences, they extend scope to "helpfully" fix related issues.

## Observations

- [technique] Explicit IN-SCOPE / OUT-OF-SCOPE in every dispatch brief prevents scope creep across parallel and sequential dispatches #dispatch #scope
- [fact] Events 03-08 SESSION-2026-05-20_06: 6 dispatches with scope fences, zero scope creep; prior sessions without fences averaged 1.5 corrections per dispatch #evidence #metrics
- [constraint] OUT-OF-SCOPE list must name files/modules explicitly — "don't change other things" is not a fence #specificity
- [insight] Scope fences also serve as post-execution audit criteria — easy to verify agent compliance against the list #verification

## Relations

- relates_to [[RETRO-003: Phase X Execution and Composition Library Completion]]
- relates_to [[SKILL-002: canonical-block-parallelism]]
- relates_to [[SKILL-001: session-resumability-audit]]