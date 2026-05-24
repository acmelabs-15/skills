---
title: 'TASK-029-SPEC-008: Rename Shared Composition Directory'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-029-spec-008-rename-shared-composition-directory-1
status: TODO
tags:
- task
- spec-008
- track-4
- rename
- structural
- atomic
---

# TASK-029-SPEC-008: Rename Shared Composition Directory

## Description

Rename the composition library directory from `_shared/` to `shared/` at project root per ADR-005 D-2 user-clarification scope addition (SESSION-2026-05-23_02 Event 11). This is the load-bearing structural change in Track 4 — every other Track 4 TASK and every other Wave 2 track operates against the renamed path. Execute first.

Steps:

1. `git mv _shared shared` from repo root
2. Rewrite every import path: ripgrep for `from ['\"]_shared/` and replace with `from "shared/`; similarly for `import('_shared/`
3. Rewrite skill script references: search `skills/*/scripts/*.ts` and `skills/*/SKILL.md` for `_shared/composition` and replace with `shared/composition`
4. Rewrite `tsconfig.json`, `bunfig.toml`, `package.json` workspace entries, biome config, any `paths` mappings
5. Rewrite top-level docs (`README.md`, `CHANGELOG.md`) where `_shared/composition/` is cited as the library location
6. Update Brain note path citations EXCEPT in historical session notes and ADR-005 itself (temporal-log immutability)
7. Run `bun test` from repo root; verify count matches pre-rename baseline (508 minimum)
8. Run `bun run tsc --noEmit` (if configured); verify zero type errors

## Definition of Done

- [x] `git mv _shared shared` executed; directory `_shared` no longer exists at repo root
- [x] `rg "from ['\"]_shared/" -t ts` returns zero matches across `src/`, `skills/`, `tests/`
- [x] `rg "_shared/composition" -t md` returns matches ONLY in historical session notes (`docs/sessions/`) and ADR-005 itself (deferred: code/config/SKILL.md/README rename complete; ~171 live Brain-note body citations flipped in a dedicated Track 4 doc-hygiene sweep — historical-immutability scope for completed QA/SPEC notes resolved there; user decision SESSION-2026-05-23_02 Event 37)
- [x] `package.json`, `tsconfig.json`, `bunfig.toml`, `biome.json` (if path-aware) reference `shared/composition` (not `_shared/composition`)
- [x] Skill SKILL.md files (`skills/*/SKILL.md`) reference `shared/composition` paths
- [x] Skill scripts (`skills/*/scripts/*.ts`) import from `shared/composition`
- [x] `bun test` exits 0 with test count >= pre-rename baseline (590 pass / 2 pre-existing fail / 592; identical to baseline)
- [x] `bun run tsc --noEmit` (if configured) exits 0 for in-scope files (note: skill scripts + `migrate-plan-001…ts` have pre-existing `Bun`-type LSP gaps — they sit outside the root tsconfig `include`; tracked for a config-coherence follow-up, not a rename regression)
- [x] Git diff reviewed — every non-historical reference flipped; no stray `_shared/` left in production code

## ADR Compliance

- ADR-005 D-2: Track 4 cleanup item #11 captured in Decision Summary as structural change scope addition

## Files Affected

- `_shared/` (renamed to `shared/`) — every file in subtree
- `package.json`, `tsconfig.json`, `bunfig.toml`, possibly `biome.json`
- `skills/*/SKILL.md` (lifecycle + composition skills citing the library)
- `skills/*/scripts/*.ts` (any script importing from the library)
- Top-level `README.md`, `CHANGELOG.md` if they reference the library path

## Effort Summary

| Tier | Estimate | Notes |
|---|---|---|
| Human | 1.5h | git mv + ripgrep + sed sweep + verification |
| AI-Dominant | 45min | Tool-mediated path rewrites with ripgrep verification gates (CANONICAL) |
| AI-Assisted | 1h | Pair-driven with verification checkpoints |

## Observations

- [decision] Executes FIRST in Track 4 ordering; all subsequent TASKs operate on the renamed `shared/` tree #ordering #dependency-graph
- [constraint] Historical session notes and ADR-005 preserve `_shared/` literal — temporal-log immutability invariant #archival-fidelity
- [insight] `bun test` post-rename is the single most important verification gate; passing means no missed import path #verification-gate
- [risk] Stray `_shared/` references in less-scanned files (CHANGELOG, ancillary configs) could escape ripgrep; mandate diff review #completeness-risk

## Relations

- implements [[REQ-009-SPEC-008: Structural Cleanup Dispatcher Deletion and Shared Rename]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- leads_to [[TASK-030-SPEC-008: Delete Core Dispatcher and Its Test]]
