---
title: 'QA-038-SPEC-004: TASK-012 Orchestrator Revalidation'
type: test-report
permalink: qa/qa-038-spec-004-task-012-orchestrator-revalidation-1
status: DONE
verdict: PASS
tests_run: 484
passed: 484
failed: 0
skipped: 0
tags:
- qa
- spec-004
- task-012
- orchestration
- design-001
- design-003
---

# QA-038-SPEC-004: TASK-012 Orchestrator Revalidation

## Scope

Revalidation of [[TASK-012-SPEC-004: Align Adapter Orchestration to DESIGN-001 and DESIGN-003]]
after the impl agent landed Option B (extend implementation to match design). Validates the
new filesystem orchestration layer that closes the QA-020 + QA-023 drift gap: in-memory
mutation round-trip was already proven; this task adds the stage-all -> validate-all ->
rename-all filesystem pipeline with cluster `.tmp` rollback called for by
DESIGN-001 Component 1+2 and DESIGN-003 Component 1+2.

In-scope artifacts:

- NEW `_shared/composition/src/core/cluster-rollback.ts` (DESIGN-003 Components 1+2)
- NEW `_shared/composition/src/core/subtree-orchestrator.ts` (DESIGN-001 Component 2 + injectable `SubtreeFileIO`)
- NEW `_shared/composition/tests/spec-subtree-orchestration.test.ts` (9 tests)
- MODIFIED `_shared/composition/src/adapters/spec-subtree.ts` -- added `processSubtree()` instance method + barrel re-exports (DESIGN-001 Component 1 surface)
- MODIFIED `_shared/composition/src/adapters/index.ts` -- barrel updated

## Test Execution

Working dir `/Users/peter.kloss/Dev/ACMElabs/skills/_shared/composition`

| Command | Result |
|---|---|
| `bun test tests/spec-subtree-orchestration.test.ts` | 9 pass / 0 fail / 47 expect() calls / 67 ms |
| `bun test` (full suite) | 484 pass / 0 fail / 1035 expect() calls / 53 files / 930 ms |
| `bunx tsc --noEmit` | clean (0 errors) |
| `bunx biome check src/ tests/spec-subtree-orchestration.test.ts` | **5 errors** -- all `organizeImports` style issues on the four touched files; auto-fixable via `biome check --fix`. Out-of-scope finding -- forwarded below |

## TASK-012 DoD Per-Checkbox Verdict

| # | DoD Item | Verdict | Evidence |
|---|----------|---------|----------|
| 1 | User adjudication on architectural boundary logged | PASS | TASK-012 body Objective records adjudication: Option B (extend impl to match design) is what landed. Impl artifacts realize the Option B path. |
| 2 | Either design amended OR implementation extended to match design | PASS | Option B realized: `cluster-rollback.ts` + `subtree-orchestrator.ts` + `SpecSubtreeAdapter.processSubtree()` extend the implementation to honor DESIGN-001 Components 1+2 and DESIGN-003 Components 1+2 verbatim. |
| 3 | If option B: filesystem stage-all + validate-all + cluster `.tmp` rollback verified by test | PASS | `tests/spec-subtree-orchestration.test.ts:172-235` -- the `validation-failure` test stages with a non-injective renumber_map (`"REQ-001" -> "X"` and `"REQ" -> "X"`), confirms `success=false`, asserts every dest hash and `.tmp` is absent, and asserts no destination files exist (failure aborts before rename). The `all-pass` test (`:173-203`) confirms the inverse: dests written, no `.tmp` remains. |
| 4 | All existing SPEC-004 tests still pass | PASS | Full suite 484/484 pass. Filtered to SPEC-004: round-trip 12/12, schema 24/24, adapter base, orchestration 9/9 -- no regressions. |
| 5 | No silent assumptions or TODOs | PASS | `grep -rn "TODO\|FIXME\|XXX" _shared/composition/src/core/cluster-rollback.ts _shared/composition/src/core/subtree-orchestrator.ts _shared/composition/src/adapters/spec-subtree.ts` returns zero matches. Adapter `processSubtree` delegates explicitly; orchestrator handles every error branch (stage throw -> rollback+rethrow; validation fail -> rollback+structured `ProcessResult`; rename throw -> rollback both staged+renamed then rethrow). |

**DoD verdict counts**: 5 PASS / 0 FAIL / 0 PARTIAL / 0 N/A.

## DESIGN-001-SPEC-004 Compliance

| Component | Verdict | Evidence |
|---|---|---|
| Component 1 -- `SpecSubtreeAdapter` exposes `processSubtree(input): ProcessResult` | PASS | `_shared/composition/src/adapters/spec-subtree.ts:154-159` declares `async processSubtree(input, fileIO = defaultSubtreeFileIO): Promise<ProcessResult>` delegating to free-function `orchestrateSubtree`. Re-export of `ProcessResult` type at `:18, :25-32` makes the adapter contract surface match the design verbatim. |
| Component 2 -- Internal orchestration: iterate manifest (root first then children), stage-all to `.tmp`, validate-all, rename-all, cluster rollback on failure | PASS | `_shared/composition/src/core/subtree-orchestrator.ts:122-217`. Root-first iteration `:134-141`; children-in-order `:143-153`; Phase A stage-all loop with mid-stage rollback `:157-167`; Phase B `validateSubtreeHashes` call `:170-176`; failure branch returns structured `ProcessResult` plus rollback `:178-192`; Phase C rename-all with mid-rename rollback of `remainingTmps` plus already-`renamed` `:196-209`. |
| Component 3 -- Frontmatter mutator with apply + reverse | PASS (pre-existing, unchanged) | `_shared/composition/src/adapters/spec-subtree.ts:117-138, 345-360` (forward + reverse via `invertMap`). Untouched by TASK-012 but still consumed by orchestrator's mutation calls. |
| Two-phase orchestration claim (stage-all then validate-all) | PASS | Phase A loop `subtree-orchestrator.ts:157-167` writes all staged content before Phase B `validateSubtreeHashes` runs `:170-176`. No interleaving. |

## DESIGN-003-SPEC-004 Compliance

| Component | Verdict | Evidence |
|---|---|---|
| Component 1 -- `validateSubtreeHashes(adapter, files): HashValidationResult` returning `{ allPass, entries, firstFailure }` | PASS | `_shared/composition/src/core/cluster-rollback.ts:67-96`. Iterates EVERY file (no `break`/`return` inside the loop -- only `firstFailure` is captured on first miss `:86-88`); aggregates per-file entries `:79-85`; returns `{ allPass: firstFailure === null, entries, firstFailure }` `:91-95`. Matches DESIGN-003 "iterate every file even after first mismatch so full diagnostics are available" verbatim. Test `:117-141` proves both entries returned even when row 2 fails. |
| Component 2 -- `rollbackCluster(stagedPaths, renamedPaths)` removes `.tmp` files + already-renamed dests; never throws | PASS | `cluster-rollback.ts:104-123`. Two best-effort loops with `try/catch` around `unlinkSync`; the `catch` blocks explicitly swallow errors (comments `// Swallow -- cleanup is best-effort.`). Test `tests/spec-subtree-orchestration.test.ts:144-170` asserts `.tmp` removal, dest removal on already-renamed paths, AND `.not.toThrow()` for missing paths. |
| 4-step hash protocol per file (S, D, D' via reverseMutations, compare sha256) | PASS | `cluster-rollback.ts:74-89` -- Step 1 `file.sourceContent`, Step 2 `file.stagedContent`, Step 3 `adapter.reverseMutations(file.stagedContent, file.mutations)`, Step 4 `sha256(S) === sha256(D')`. |
| Collect-then-validate pattern (stage all then validate all) | PASS | Orchestrator Phase A populates every entry in `entries[]` array before Phase B iterates that array for hash validation (`subtree-orchestrator.ts:127-167` then `:170-176`). |
| `firstFailure` recorded for fast feedback | PASS | `cluster-rollback.ts:86-88` -- conditional `if (!match && firstFailure === null)` ensures only the first mismatch lands in `firstFailure`. |
| Cluster rollback semantics: failure -> all `.tmp` removed, no partial state | PASS | `subtree-orchestrator.ts:178-192` (validation fail branch) + `:206-209` (rename fail branch) both call `fileIO.rollback(...)` before returning/throwing. Test `:205-235` asserts post-failure filesystem state has zero `.tmp` files and zero destinations. |

## Linked REQ AC Verdict

### REQ-001-SPEC-004 (SPEC Subtree Adapter Implementation)

| AC | Verdict | Evidence |
|---|---|---|
| AC1 -- Adapter compiles under tsc strict with 5-method interface + `sourceType = "spec"` | PASS | `tsc --noEmit` clean; `spec-subtree.ts:88` `implements CompositionAdapter`, `:89` `readonly sourceType = "spec"`, 5 methods `:98-138` |
| AC4 -- single-file mismatch triggers full-cluster `.tmp` rollback | PASS | Test `tests/spec-subtree-orchestration.test.ts:205-235` asserts on validation-fail every `.tmp` removed and no destination written |
| AC2, AC3, AC5 | N/A (scope) | Covered by TASK-001 / TASK-002. Not in TASK-012 scope; previously validated by QA-020. |

### REQ-004-SPEC-004 (Per-File Hash Validation)

| AC | Verdict | Evidence |
|---|---|---|
| AC1 -- N+1 independent SHA-256 comparisons | PASS | `validateSubtreeHashes` loop in `cluster-rollback.ts:74-89` performs one comparison per `SubtreeFileForValidation` entry; test orchestration uses 1 root + 1 child = 2 comparisons confirmed by `result.hashEntries` length 2 |
| AC2 -- reverseMutations inverse round-trips to source hash | PASS | All-pass test `tests/spec-subtree-orchestration.test.ts:173-203` asserts `result.success === true` for valid mutations; PROOF test `:256-276` additionally re-reads destinations and confirms `sha256(reverseMutations(dest)) === sha256(original)` for both files |
| AC3 -- mismatch error message identifies failing file path | PASS | `subtree-orchestrator.ts:182-190` returns `errors[].filePath` per failed entry; validation-fail test `:217-222` asserts each error has truthy `filePath` plus 64-hex `expected`/`actual` hashes |
| AC4 -- single-file mismatch -> all `.tmp` removed, no destinations written | PASS | Validation-fail test `:223-234` asserts both `.tmp` and destination absence after failure |
| AC5 -- all N+1 pass -> all `.tmp` renamed to destinations | PASS | All-pass test `:188-202` confirms both destinations exist with mutated content and no `.tmp` remains |

## Out-of-Scope Findings (forwarded)

- **Biome `organizeImports` style violations on the four touched files** (`src/core/cluster-rollback.ts`, `src/core/subtree-orchestrator.ts`, `src/adapters/spec-subtree.ts`, `tests/spec-subtree-orchestration.test.ts`). All 5 are alphabetical import ordering -- type imports vs value imports interleaved. Auto-fixable via `bunx biome check --fix`. NOT a functional defect, does NOT block DoD verdict (no test or type breakage), but QA-036 precedent treated `biome check clean` as a tooling gate. Recommend a follow-up trivial cleanup commit or fold into the next adjacent TASK's hygiene step. Severity: low.

- **DESIGN-001 + DESIGN-003 status still `DRAFT`** (frontmatter). These designs are now realized by code; their lifecycle should advance to `ACCEPTED` to reflect implementation parity. Not in TASK-012 DoD, but flagging for the SPEC-004 closeout sweep.

- **Filesystem safety / TOCTOU**: `processSubtree` ensures parent directory then writes `.tmp` then renames -- atomic per POSIX `rename(2)` semantics. The orchestrator's `mkdir { recursive: true }` then `Bun.write` to `.tmp` then `renameSync` is the canonical safe pattern. No orphan `.tmp` on success path (Phase C removes every `.tmp` indirectly via rename). No orphan renamed file on failure path (Phase C rollback removes both `remainingTmps` and already-`renamed`). PASS.

- **Bun-native API usage**: `subtree-orchestrator.ts:80-93` `defaultSubtreeFileIO` uses `Bun.write` for staging and `node:fs.renameSync` for atomic rename. Per `bun-ts-best-practices`, `renameSync` is correct: Bun does not provide a Bun-native synchronous rename, and POSIX rename is the cross-platform atomic primitive. `node:fs/promises.mkdir` is the canonical async dir-ensure on Bun. `cluster-rollback.ts:14, 105-122` uses `existsSync` + `unlinkSync` for best-effort cleanup -- legitimate use of `node:fs` because Bun's `Bun.file.delete()` is async and rollback must remain synchronous-best-effort. PASS, no migration required.

## Observations

- [outcome] All 5 TASK-012 DoD items satisfied with file:line evidence; aggregate verdict PASS #task-012-done
- [outcome] DESIGN-001 Components 1+2 and DESIGN-003 Components 1+2 fully realized by new orchestrator + cluster-rollback modules #design-realized
- [fact] 9/9 new tests pass; full suite 484/484; tsc clean #suite-clean
- [fact] `validateSubtreeHashes` iterates every file even after first failure -- aggregation invariant honored per DESIGN-003 #full-aggregation
- [fact] `rollbackCluster` swallows all filesystem errors via explicit try/catch; never-throws invariant honored #rollback-resilient
- [fact] Three-phase orchestration (stage-all -> validate-all -> rename-all) with rollback at every error branch -- stage throw, validation fail, rename throw all rollback before surfacing #atomicity
- [insight] `SubtreeFileIO` injection point makes the orchestrator filesystem-mockable; aligns with DESIGN-001 testing-strategy note about mock filesystem unit tests #testability
- [insight] `defaultSubtreeFileIO` uses `Bun.write` + `node:fs.renameSync` -- correct Bun-native pattern since POSIX atomic rename is the cross-platform primitive and Bun has no synchronous rename API #bun-native
- [problem] Five biome `organizeImports` style errors on the four touched files; auto-fixable via `bunx biome check --fix`; out-of-scope for TASK-012 DoD but flagged for hygiene cleanup #biome-style-debt
- [problem] DESIGN-001 + DESIGN-003 still in `DRAFT` status though now realized in code -- flag for SPEC-004 closeout to advance to `ACCEPTED` #design-status-drift

## State Changes

- TASK-012-SPEC-004: DONE -> DONE (validated; no state advance needed -- already DONE per impl claim)
- QA-038-SPEC-004 (this note): created with verdict PASS

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- relates_to [[TASK-012-SPEC-004: Align Adapter Orchestration to DESIGN-001 and DESIGN-003]]
- relates_to [[REQ-001-SPEC-004: SPEC Subtree Adapter Implementation]]
- relates_to [[REQ-004-SPEC-004: Per-File Hash Validation]]
- relates_to [[DESIGN-001-SPEC-004: SPEC Subtree Adapter Architecture]]
- relates_to [[DESIGN-003-SPEC-004: Per-File Hash Validation Strategy]]
- supersedes [[QA-020-SPEC-004: Implement SPEC Subtree Adapter Recursive Base]]
- supersedes [[QA-023-SPEC-004: Implement Per-File Hash Validation Orchestration]]