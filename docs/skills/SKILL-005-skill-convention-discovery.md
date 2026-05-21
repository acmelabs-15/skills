---
title: 'SKILL-005: skill-convention-discovery'
type: skill
permalink: skills/skill-005-skill-convention-discovery-1
tags:
- skill
- skill-development
- project-conventions
- discovery
---

# Skill-SkillDev-005: Skill Convention Discovery

**Statement**: Skills applying structural defaults must scan existing project patterns first.

**Context**: Apply before any skill recommends file structure, test runner, naming convention, or tooling configuration to a project. Required when a skill has a built-in "recommended" default that the project may already have overridden.

**Evidence**: SESSION-2026-05-20_06 — `bun-ts-best-practices` skill tried to relocate tests to `__tests__/` and switch to vitest in a project already using flat `tests/` and `bun:test`. Engineer self-corrected both times. Skill scans for `bun.lock` but not for dominant test pattern.

**Atomicity**: 85% | **Impact**: 7/10

## Pattern

Before recommending any structural default, the skill must scan:

1. **Test location**: `find . -name "*.test.ts" -not -path "*/node_modules/*" | head -5` — determine `tests/` vs `__tests__/` vs co-located.
2. **Test runner**: check `package.json` scripts for `bun test`, `vitest`, `jest`, `mocha`.
3. **Naming conventions**: sample 10 existing files to infer kebab vs camelCase vs PascalCase.
4. **Config files**: scan for `.babelrc`, `vitest.config.ts`, `jest.config.*` — presence of any overrides the skill's default recommendation.

If project pattern conflicts with skill default, apply project pattern. Surface the conflict in the output so the user can make a deliberate choice.

## Anti-Pattern

Scanning only for the presence of a runtime (e.g., `bun.lock`) and inferring all defaults from that. Runtime detection is necessary but not sufficient — projects customize conventions independently of runtime choice.

## Observations

- [problem] bun-ts-best-practices overrode project test conventions twice in SESSION-2026-05-20_06; skill scans for runtime but not dominant test pattern #skill-failure #convention
- [technique] 4-step scan (test location + runner + naming + config files) before applying any structural default #pattern #prevention
- [constraint] Skill must surface conflicts to the user rather than silently deferring to its own default #transparency
- [insight] Convention discovery adds 30-60 seconds per skill invocation; cost is negligible vs 2-3 correction rounds #efficiency

## Relations

- relates_to [[RETRO-003: Phase X Execution and Composition Library Completion]]
- relates_to [[SKILL-004: advisory-needs-mechanical]]