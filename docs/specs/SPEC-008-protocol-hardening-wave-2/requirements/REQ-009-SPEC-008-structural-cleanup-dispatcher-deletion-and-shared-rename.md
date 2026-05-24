---
title: 'REQ-009-SPEC-008: Structural Cleanup Dispatcher Deletion and Shared Rename'
type: requirement
permalink: specs/spec-008-protocol-hardening-wave-2/requirements/req-009-spec-008-structural-cleanup-dispatcher-deletion-and-shared-rename-2
status: DRAFT
tags:
- requirement
- spec-008
- track-4
- structural-cleanup
- dispatcher-deletion
- shared-rename
---

# REQ-009-SPEC-008: Structural Cleanup Dispatcher Deletion and Shared Rename

## EARS

WHEN the composition library directory `_shared/` at project root contains the prototype dispatcher `core/dispatcher.ts` (a duplicate of `registry.ts` registering only 4 of 5 source_types) and its paired test `tests/dispatcher.test.ts`, the orchestrator SHALL delete both files, AND `bun test` SHALL remain green (zero regressions), SO THAT the production composition library exposes a single source of truth for source_type dispatch (`registry.ts`) and the latent `spec` registration gap (Audit D finding) is eliminated by removal rather than patch.

WHEN the composition library is referenced anywhere in the project root, the directory SHALL be renamed from `_shared/` to `shared/` (drop the leading underscore), AND every import path, script reference, documentation citation, and Brain note pointer that previously referenced `_shared/composition/` SHALL be updated to `shared/composition/`, SO THAT the directory name aligns with the user directive captured in SESSION-2026-05-23_02 Event 11 and removes the visual signal that `_shared/` is a private or internal module (it is the canonical composition library).

## Acceptance Criteria

- [x] GIVEN `_shared/` directory at project root WHEN orchestrator dispatches TASK-029 THEN `_shared/` is renamed to `shared/` via `git mv _shared shared`
- [x] GIVEN every `.ts` source file in the renamed `shared/` tree WHEN ripgrep audits `import.*_shared/` THEN zero matches remain
- [x] GIVEN every `package.json`, `tsconfig.json`, `bunfig.toml`, and skill `scripts/` entry referencing the library WHEN read after rename THEN every reference reads `shared/composition/` (not `_shared/composition/`)
- [x] GIVEN repo-wide `bun test` invocation after rename WHEN run THEN test count matches pre-rename baseline (508 minimum; +N for any new TASK-031 added tests) and verdict is pass
- [x] GIVEN `shared/composition/src/core/dispatcher.ts` and `shared/composition/src/tests/dispatcher.test.ts` WHEN TASK-030 executes THEN both files are deleted via `git rm` (closed by [[TASK-030-SPEC-008: Delete Core Dispatcher and Its Test]] 2026-05-24 SESSION-2026-05-23_02 Event 68; commit 64dd1ca)
- [x] GIVEN post-deletion repo WHEN ripgrep audits for imports of `core/dispatcher` THEN zero production imports remain (only `core/adapter.ts` interface retained per ADR-005 D-7 evidence) (closed by [[TASK-030-SPEC-008: Delete Core Dispatcher and Its Test]] 2026-05-24)
- [x] GIVEN `bun test` after dispatcher deletion WHEN run THEN test count equals pre-deletion count minus the dispatcher.test.ts case count and verdict is pass (closed by [[TASK-030-SPEC-008: Delete Core Dispatcher and Its Test]] 2026-05-24; 707 → 701, delta 6)
- [ ] GIVEN Brain notes citing `_shared/composition/` paths WHEN the Track 4 path-rewrite sweep runs THEN SESSION notes (all dates), ADR-005, ANALYSIS-004, and RETRO-003 preserve the `_shared/` literal (temporal-log plus decision-record archival fidelity); ALL other Brain notes that cite `_shared/composition/` paths (SPEC, REQ, DESIGN, and TASK notes) are rewritten to `shared/composition/`

## Observations

- [decision] Rename precedes deletion in TASK ordering so deletion operates on the renamed `shared/` tree; reduces post-deletion path churn #ordering #risk-reduction
- [decision] `core/dispatcher.ts` deletion over fix per ADR-005 D-7 evidence: zero production imports, registry.ts is SPEC-005 production dispatcher with all 5 types #d-7 #single-source-of-truth
- [constraint] CompositionAdapter interface at `core/adapter.ts` is PRESERVED; deletion is scoped to dispatcher.ts + its test only #preserve #adapter
- [constraint] Historical session notes and ADR-005 itself reference `_shared/` literally — those references stay as written (temporal-log invariant; rewriting history is forbidden) #immutable-history
- [insight] `_shared` → `shared` rename is the load-bearing structural change that affects every downstream TASK path; every other Track 4 task depends on this completing first #dependency-graph #ordering
- [risk] Path rewriting across imports + skill scripts + docs is wide-blast-radius; recommend ripgrep verification gates at each step #blast-radius #verification

## Relations

- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]]
- relates_to [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]]
