---
title: 'SKILL-006: dependency-reorder-unblock'
type: skill
permalink: skills/skill-006-dependency-reorder-unblock-1
tags:
- skill
- execution-planning
- dependency-management
- test-health
---

# Skill-ExecutionPlanning-006: Dependency Reorder Unblock

**Statement**: Reorder dependent work items to flip expected-failures green earliest.

**Context**: Apply during execution planning when a queue of work items has known data dependencies. Required when CI shows expected-failures that will be fixed by a later item in the queue — reordering to satisfy dependencies earlier moves failures to green sooner and surfaces unexpected regressions earlier.

**Evidence**: SESSION-2026-05-20_06 Event 04 — X.D.4 (parser + fixture) pulled ahead of X.D.3 (transition mutations) because mutations depend on the parser. Result: 14 expected-failures flipped green one full event earlier. Without reorder, those 14 failures would have remained red through Event 03, masking any regressions introduced in that event.

**Atomicity**: 86% | **Impact**: 7/10

## Pattern

1. Before executing the work queue, draw a dependency graph (even informally).
2. Identify items where Item B's test suite has expected-failures that Item A will resolve (A is B's data dependency).
3. Reorder: execute A before B even if the original queue had them reversed.
4. Verify: after A completes, confirm expected-failures flip green. If they do not, stop — the dependency assumption was wrong.
5. Proceed with B.

## Anti-Pattern

Executing items in original specification order without checking whether dependencies in the test suite match that order. Expected-failures persist longer than necessary, masking regressions and reducing signal quality from CI.

## Observations

- [technique] Data-dependency reorder (X.D.4 before X.D.3) flipped 14 expected-failures green one event earlier, improving CI signal quality for subsequent events #execution-planning #evidence
- [fact] SESSION-2026-05-20_06 Event 04: +14 tests flipped green (200/16 → 214/2) by pulling parser ahead of mutations #metrics #green
- [insight] Reordering produces compound benefit: earlier green state + earlier regression detection in all subsequent events #signal-quality
- [constraint] Reorder is only valid when Item A is a pure data dependency of Item B with no shared mutable state — verify before reordering #safety

## Relations

- relates_to [[RETRO-003: Phase X Execution and Composition Library Completion]]
- relates_to [[SKILL-001: session-resumability-audit]]