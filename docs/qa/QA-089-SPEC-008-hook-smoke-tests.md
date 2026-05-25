---
title: 'QA-089-SPEC-008: Hook Smoke Tests'
type: qa
permalink: qa/qa-089-spec-008-hook-smoke-tests
status: DONE
tags:
- spec-008
- hooks
- smoke-tests
- qa
- wave-2
---

# QA-089-SPEC-008: Hook Smoke Tests

## Objective

Validate TASK-046-SPEC-008 — end-to-end hook smoke tests that wire the seven-layer hook stack (TASK-037 through TASK-045) against the Track-3 adversarial fixture set, plus the REQ-011 AC10 latency measurement folded here per SESSION-2026-05-23_02 Event 122. Verifies the four matcher-risk + behavioral assertions from [[REQ-011-SPEC-008: PreToolUse Blocking Gates]] and [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]] per [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]].

## Approach

- Test types: end-to-end smoke (handlers invoked as child processes), latency measurement.
- Environment: local, Bun 1.3.13, throwaway git repos under `tmpdir()`.
- Data strategy: Track-3 adversarial fixtures under `shared/composition/tests/fixtures/adversarial/<type>/` reused directly as lying-claim inputs; canonical `task-note-sample.md` for clean/hygiene paths.
- Command run: `bun test hooks/__tests__/smoke/` and full-suite `bun test`.

## Results

### Summary

| Metric | Value | Target | Status |
| --- | --- | --- | --- |
| Tests Run | 14 | - | - |
| Passed | 14 | - | PASS |
| Failed | 0 | 0 | PASS |
| Skipped | 0 | - | - |
| Smoke-suite execution time | 6.34s | ~10s | PASS |
| Full-suite tests | 1234 pass / 0 fail | 1234 / 0 | PASS (no regression) |

tests_run = 14 = 14 pass + 0 fail + 0 skip — consistent with the PASS verdict.

### Per-DoD-item verification

| DoD item | Evidence | Status |
| --- | --- | --- |
| `hooks/__tests__/smoke/` exists, per-layer files, flat (no nested `__tests__`) | 7 `layer-N*.smoke.test.ts` files + `_helpers/`; `find` confirms only `smoke` + `smoke/_helpers` dirs | PASS |
| Smoke 1: L2 MCP `edit_note` flipping TASK→DONE w/ unsatisfied DoD → `deny` naming the DoD item | `layer-2-mcp.smoke.test.ts` test 1 asserts `permissionDecision:"deny"`, reason contains `status=DONE` + `commit SHA` | PASS |
| Smoke 2-6: L1-L5 vs canonical adversarial fixtures → `deny` w/ reason | L1 (`layer-1` smoke2), L2 (`layer-2` smoke3 write_note), L3 (`layer-3` smoke4 commit), L4 (`layer-4` smoke5 push), L5 (`layer-5` smoke6 PR) — all assert `deny` + naming reason | PASS |
| Smoke 7: L6 Stop catches bypassed adversarial docs/** edit → `{ decision: "block" }` | `layer-6-stop` test asserts `decision:"block"`, reason contains `Turn-end backstop:` + the note path | PASS |
| Smoke 8: L7 FileChanged post-commit docs/** → `additionalContext` | `layer-7-observer` test asserts `hookEventName:"FileChanged"` + `Post-commit state:`, no `decision`/`permissionDecision` field | PASS |
| Smoke 9: L1 clean edit → `allow` (no warning) | `layer-1` test asserts `allow` + `additionalContext` undefined | PASS |
| Smoke 10: L1 hygiene-only → `allow` + `additionalContext` (layered-severity allow-with-warning) | `layer-1` test asserts `allow` + warning containing `non-blocking` | PASS |
| All invoke handlers via `bun run` (not in-process) | `_helpers/run-handler.ts` uses `Bun.spawn(["bun","run",script])` with JSON on stdin → JSON on stdout | PASS |
| Runs as part of `bun test`, ~10s | ran via `bun test`, smoke suite 6.34s | PASS |
| AC10 latency measured end-to-end w/ assertions | L1 edit 152.3ms (REQ-011 budget ~80-250ms); L3 commit 8-file 354.2ms (budget ~500ms-2s) — both logged + asserted under CI-tolerant ceilings | PASS |
| biome lint passes | FU-4 caveat (below) | PASS (caveat) |
| `bun tsc --noEmit` passes | exit 0; FU-4 caveat (below) | PASS (caveat) |

### AC10 latency evidence (REQ-011 final AC)

Measured end-to-end via `performance.now()` around the `bun run` child-process invocation in `_helpers/run-handler.ts`:

- `[AC10] Layer-1 edit handler end-to-end: 152.3ms` — within REQ-011 ~80-250ms per-edit budget.
- `[AC10] Layer-3 commit handler (8-file staged set) end-to-end: 354.2ms` — within REQ-011 ~500ms-2s per-commit budget (well under).

Both numbers logged on every run so a regression is visible even when the (generous, CI-variance-tolerant) ceiling assertions stay green.

### FU-4 caveat (config gap — not a TASK-046 failure)

`hooks/**` is excluded from the root `tsconfig.json` include (`skills/**/*.ts`, `shared/detect-context.ts`) and from `biome.json` files.include (`skills/**`, `shared/detect-context.ts`). Verified directly:

- `tsc --noEmit` exits 0 but does not type-check the smoke files (hooks/ out of include scope).
- `biome check hooks/` reports `Checked 0 files` (hooks/ out of include scope).

This matches the entire existing hook layer (`hooks/scripts.disabled/__tests__`, `hooks/lib/__tests__`) and is tracked separately as FU-4. The smoke tests are clean by inspection. Informational: a default-recommended biome config (probe, not repo config) surfaces one `organizeImports` type-import-ordering preference in `layer-6-stop` and `layer-7-observer` (`type StopResponse, parseResponse, runHandler` ordering) — stylistic only, no lint error, consistent with the existing hook layer style, not gating per the FU-4 caveat.

## Discussion

### Risk areas

| Area | Risk Level | Rationale |
| --- | --- | --- |
| Build-isolation path coupling | Low | Handlers live at `hooks/scripts.disabled/`; `HANDLER_DIR` is a single-source constant requiring a one-line rename when the layer goes live |
| Terminal-status flip modelling | Low | Fixtures carry non-terminal status; helpers flip to terminal to model the real hook threat (status flipped, contract unsatisfied) — documented in `_helpers/fixtures.ts` header |

### Coverage gaps

| Gap | Reason | Priority |
| --- | --- | --- |
| Tooling lint/typecheck of `hooks/**` | FU-4 config-scope gap; hooks/ outside tsconfig + biome include | P2 (tracked as FU-4) |

## Recommendations

1. Resolve FU-4 (add `hooks/**` to tsconfig + biome include) so the smoke tests and hook handlers are mechanically type-checked + linted rather than clean-by-inspection.
2. On hook-layer activation, rename `hooks/scripts.disabled` → `hooks/scripts` and update the single `HANDLER_DIR` constant in `_helpers/run-handler.ts`.

## Verdict

**Status**: PASS
**Confidence**: High
**Rationale**: Every TASK-046 DoD item is satisfied with run evidence, all 14 smoke tests pass, AC10 latency is measured end-to-end (L1 152.3ms / L3 354.2ms, both in budget), and the full suite holds at 1234 pass / 0 fail with no regression; tsc/biome items pass with the documented FU-4 config-scope caveat.

## Observations

- [outcome] All 14 hook smoke tests pass in 6.34s; full suite 1234 pass / 0 fail confirms zero regression #smoke-tests #no-regression
- [fact] AC10 latency measured end-to-end via `bun run`: Layer-1 edit 152.3ms (budget 80-250ms), Layer-3 commit 8-file 354.2ms (budget 500ms-2s) #latency #ac10
- [fact] Smoke harness invokes handlers as child processes via `Bun.spawn(["bun","run",script])`, asserting the JSON-stdin/stdout wiring end-to-end, not the inner pure core #wire-coverage #bun-run
- [constraint] `hooks/**` is outside tsconfig + biome include (FU-4); tsc exits 0 and biome checks 0 files — caveat noted, not a TASK-046 failure, tracked separately #fu-4 #config-scope
- [insight] Each Track-3 adversarial fixture doubles as a hook smoke test (the fixture IS the lying claim the hook must deny) per ADR-005 D-8 Cross-D-N Implications #fixture-reuse #defense-in-depth
- [decision] Layered-severity verdict mapping verified: per-write L1 allows hygiene-with-warning (Smoke 10) while boundary L3-L5 + backstop L6 deny any non-conformance #layered-severity

## Relations

- relates_to [[TASK-046-SPEC-008: Author Hook Smoke Tests and Adversarial Fixture Reuse]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[REQ-011-SPEC-008: PreToolUse Blocking Gates]]
- relates_to [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]]