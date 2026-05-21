---
title: 'SKILL-002: canonical-block-parallelism'
type: skill
permalink: skills/skill-002-canonical-block-parallelism
tags:
- skill
- parallelism
- dispatch
- protocol-block
---

# Skill-Parallelism-002: Canonical Block Parallelism

**Statement**: Pre-author one canonical protocol block; N agents inline verbatim.

**Context**: Apply before launching any parallel wave where agents share a protocol (schema format, mutation sequence, output contract). Required when dispatching 3 or more agents against the same structural task.

**Evidence**: Events 09-10 of SESSION-2026-05-20_06 — 10-agent parallel wave (X.C lifecycle skill updates) produced zero variance in output structure. Prior sessions without a pre-authored block required 2-3 rounds of correction per agent.

**Atomicity**: 92% | **Impact**: 9/10

## Pattern

1. Before dispatching the wave, author the canonical block in full. Include: input contract, output format, required sections, forbidden patterns.
2. Paste the canonical block verbatim into EVERY agent's dispatch brief.
3. Do not paraphrase or summarize — paraphrase introduces per-agent interpretation variance.
4. After wave returns, verify each agent's output against the canonical block. Reject and re-dispatch on deviation.

## Anti-Pattern

Writing a brief description in each agent's prompt and assuming agents will converge. Each agent interprets independently, producing N variants that require a reconciliation pass as expensive as doing the work sequentially.

## Observations

- [technique] Canonical protocol block pre-authored once then inlined verbatim by N agents eliminates reinvention variance in parallel waves #parallelism #pattern
- [fact] Events 09-10 SESSION-2026-05-20_06: 10 agents, zero structural variance; all outputs passed schema validation on first submission #evidence #green
- [constraint] Block must be complete before dispatch begins — partial blocks produce partial compliance #blocking-gate
- [insight] Cost of pre-authoring one canonical block is 5-10 minutes; savings scale linearly with agent count N #efficiency

## Relations

- relates_to [[RETRO-003: Phase X Execution and Composition Library Completion]]
- relates_to [[SKILL-003: dispatch-scope-fences]]
- relates_to [[SKILL-004: advisory-needs-mechanical]]