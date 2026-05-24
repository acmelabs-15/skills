---
title: 'SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope'
type: session
permalink: sessions/session-2026-05-23-02-protocol-hardening-wave-2-scope-1
status: IN_PROGRESS
tags:
- session
- protocol-hardening
- wave-2
- plan-001
- skills-ecosystem
---

# SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope

## Scope

User reopened the `protocol-hardening` part of [[PLAN-001 Skills Ecosystem]] with directive "everything that needs to be done for it — i'll let you figure out what that is". Phase X Wave 1 closed 2026-05-21 (commit `94e27f9`, 585/585 tests, all D1-D4 resolved). This session scopes Wave 2: identify remaining enforcement-layer gaps via parallel audit dispatch, synthesize findings, propose tiered scope, secure user approval, then execute.

Starting branch: `feat/plan-001-protocol-hardening-wave-2-scope` (created off `main` at `eb0eb28`).

## State

- Starting commit: `eb0eb28` (end of PLAN-001 workflow close)
- PLAN-001 status: IN_PROGRESS; protocol-hardening part: IN_PROGRESS (stale DoD all-[x]-deferred)
- Audits dispatched: 5 parallel (A composition coverage, B skill protocol-embedding, C Brain notes coherence, D code-vs-spec coherence, E test coverage gaps)
- Scope shape: LOCKED — Option A (SPEC-008) per AskUserQuestion answer Event 09
- Next: decisions.4 part (ADR-004 Wave 2 architecture) → spec.SPEC-008 → build.SPEC-008

## Event 01 — Session opened; /plan continue for PLAN-001 protocol-hardening reopen

User invoked `/plan PLAN-001-skills-ecosystem`. Orchestrator surfaced PLAN-001 functionally complete (21/22 parts DONE; protocol-hardening stale IN_PROGRESS). User selected option (b) "Reopen protocol-hardening for fresh work" then directed "everything that needs to be done for it — figure out what that is, ultrathink".

Actions:

- Switched branch `main` → `feat/plan-001-protocol-hardening-wave-2-scope`
- Created task tracking entries #1..#5 (one per audit)
- Dispatched 5 parallel `brain:🧠-analyst` audits with read-only scope-bounded briefs:
  - Audit A — composition library coverage gaps (16 canonical types vs schemas/validators/mutations/renderers/parsers)
  - Audit B — skill protocol-embedding (11 skills × composition-lib usage matrix)
  - Audit C — Brain notes coherence (Section 7 violations, status drift, missing relations)
  - Audit D — code-vs-spec coherence (REQ AC + DESIGN compliance verified against current code for SPEC-001..007)
  - Audit E — test coverage gaps (adversarial-claim tests, mutation invariant tests, drift-detection regression tests)

Next: await audit returns → synthesize → surface tiered scope via AskUserQuestion → on approval, append new DoD items to protocol-hardening part + dispatch execution.

## Observations

- [decision] Wave 2 framed as scope-discovery first (audit) then execution, not direct implementation — user said "figure out what that is" #scope #process
- [decision] 5 parallel audits over single sequential sweep — orthogonal investigation surfaces (coverage / skills / notes / code / tests) #parallelism #investigation
- [constraint] Audits READ ONLY; no Brain note writes, no code modifications during this phase #safety #separation-of-concerns
- [insight] Phase X retired memory documented 37 drift surfaces — Wave 2 should verify cleanup held + catch new drift since 2026-05-21 #drift #regression
- [risk] Scope discovery may surface spec-decomposition-sized work (new SPECs for ADR/ANALYSIS schemas) rather than fitting under one part — shape decision required after synthesis #scope-shape

## Relations

- part_of [[PLAN-001 Skills Ecosystem]]
- relates_to [[RETRO-003 Phase X Execution and Composition Library Completion]]
- inspired_by [[ANALYSIS-003 Phase X Protocol Hardening State]]
- pairs_with [[SESSION-2026-05-23_01 Plan-001 Reconcile and Build SPEC-002]]


## Event 02 — Audits A and B returned; convergent finding on enforcement gap

**Audit A (Composition Coverage)** — recommended Wave 2 scope:

| Priority | Type | Artifact | Rationale |
|---|---|---|---|
| P0 | ADR | schema + parser + validator (PROPOSED→ACCEPTED gate) | Highest-consequence transition; adr-review gate; no schema today |
| P0 | PLAN | `validatePlanDoneClaim` (mechanical: all parts terminal before DONE) | Schema exists; only validator missing |
| P1 | ANALYSIS | schema + parser + validator (reject ACCEPTED + Open Questions) | Closes Brain v2 Wave 7 exploit (41 violations) |
| P1 | EPIC | schema + parser + validator (DONE gated on contained SPECs DONE) | Prevents premature EPIC closure |
| P1 | CRIT | schema + parser (structural validation, no claim validator) | Supports adr-review convergence check |

Defer P2: PRD, feature, security, retro, skill (read-only structural; no gate role).

**Audit B (Skill Protocol-Embedding)** — convergent finding:

> All 7 lifecycle SKILL.mds DESCRIBE the composition library symbols in prose ("Lying agents are mechanically caught"), but NONE INVOKE them at gate points. Validators exist; documentation says they exist; no skill prescribes `bun run validator.ts` at the moment of agent claim acceptance.

Concrete drift:

- `build/SKILL.md`: Step 4b says "cross-check status enum" — should be `validateTaskDoneClaim()` call
- `build/SKILL.md`: Steps a/h/j/s describe "PLAN transition" via raw `edit_note` — should be `applyPlanMutation({ type: "transition-impl-item" })`
- `plan/SKILL.md`: References PlanNote renderer (X.D.2) for dispatch briefs but provides no `bun run` invocation pattern
- `spec/SKILL.md`: Says authored notes "pass the schemas" but never prescribes schema-parse validation after authoring
- `end/SKILL.md`: Step 1 is manual checkbox inspection — should be `validateSpecDoneClaim()` invocation
- `decisions/SKILL.md`: Step 2f uses raw `edit_note` for d_n_substatus — should be `applyPlanMutation({ type: "lock-decision" })`

**Synthesis** — Audit A and B are COMPLEMENTARY:

- Audit A: 5 coverage gaps in the library itself
- Audit B: ALL lifecycle skills fail to invoke the library at their gate points (the rigid-protocol enforcement is documentation-grade, not runtime-grade)

Wave 2 must close BOTH: more schemas/validators are pointless if no skill calls them, AND wiring skills to call validators is pointless if half the gate points don't have validators.

Pending Audit C, D, E. After all returns, will synthesize into tiered scope proposal and surface via AskUserQuestion.


## Event 03 — Audit E returned (test coverage gaps)

**Baseline**: 508/508 tests pass; 1084 expect() calls across 58 files. Categories solid for parsers/schemas/round-trips/mutations. **Critical gap**: validators test checkbox arithmetic, NOT realistic agent-lying scenarios.

**Adversarial-claim coverage gap**:

| Validator | Happy-path | Rejection | Parse-then-validate | Missing scenarios |
|---|---|---|---|---|
| task-claim | 3 | 3 | 0 | All-DoD-deferred bypass; checkbox-flip without code change |
| requirement-claim | 2 | 3 | 1 | AC flip without evidence |
| design-claim | 2 | 3 | 1 | Compliance flip without evidence |
| spec-claim | 3 | 3 | 0 | DONE with all success_criteria deferred |
| test-report-claim | 2 | 3 | 1 | All-deferred verdict |

The "mechanically impossible to lie" claim requires parse-from-markdown-then-validate tests. Only 3 of 5 validators have even one.

**Mutation gaps**: no backward-transition (DONE→IN_PROGRESS) test; no double-apply idempotency test; no session-mutation duplicate-event-number test.

**Integration test gaps**: ZERO dedicated integration tests. spec-subtree-orchestration is the closest. Missing: parse-mutate-validate-render full path; cross-note consistency (TASK DONE while parent SPEC unchecked); test-report-vs-TASK-DoD cross-validation.

**Drift regression gaps**: 37 Phase X drift surfaces NOT captured as regression tests. plan-001-migration.test.ts is migration acceptance, not drift regression.

**Top 10 prioritized additions** (Audit E):

1. Adversarial: all-deferred DoD bypass
2. Adversarial: parse-then-validate for task-claim-validator (currently 0)
3. Adversarial: parse-then-validate for spec-claim-validator (currently 0)
4. Integration: checkbox-mutation → parse → validate-claim (the actual per-TASK enforcement path)
5. Mutation: backward-transition rejection (DONE→IN_PROGRESS)
6. Mutation: double-apply idempotency
7. Cross-note consistency: SPEC checklist vs TASK status
8. Session-mutation: duplicate-event-number rejection
9. Round-trip: malformed-wikilink resilience
10. Drift regression markers: tag 5 existing tests with Phase X drift-surface IDs

Pending Audit C (Brain notes coherence) and Audit D (code-vs-spec coherence).


## Event 04 — Audit C returned (Brain notes coherence)

**Verdict**: MINOR_DRIFT — 10 of 100 notes have violations (10%); zero systemic-convention breakdowns; Wave 2 cleanup substantially held.

**Violations to fix**:

| Severity | Category | Count | Notes |
|---|---|---|---|
| HIGH | Duplicate frontmatter blocks | 2 | QA-027-SPEC-004, QA-030-SPEC-002 |
| HIGH | Forbidden relation `validates` | 4+ | QA-027, QA-042, QA-043, QA-015 (systematic agent-brief gap) |
| HIGH | Title-without-colon | 3 | ANALYSIS-002, SESSION-2026-05-20_01, SESSION-2026-05-20_02 |
| HIGH | Non-canonical type `test_report`/`test-report` | 2 | QA-030 (`test_report`), QA-038 (`test-report`) — stale post-rename-script |
| MEDIUM | Local FS paths (PII) | 3+ | QA-036, QA-038, SESSION-2026-05-20_03 Event 04 |
| MEDIUM | Semantic relation misuse (`caused_by` on QA aggregate) | 1 | QA-015-SPEC-003 — should be `depends_on` |
| LOW | Duplicate Event numbers | 1 | SESSION-2026-05-21_01 Events 36/37/38 from killed-agent re-entry |
| LOW | Permalink `-1` collision suffix | 1 | QA-038-SPEC-004 (also affects this session note — `-1` suffix observed) |

**Clean categories**: zero `feedback_*` auto-memory refs; zero OUTCOME/SUMMARY/WRAP-UP notes; zero spaces in filenames; zero lowercase prefixes.

**Systematic pattern flag**: `validates` relation in 4 QA notes ← QA agent-dispatch brief template doesn't enumerate the 11 valid relation types. This is the same shape as Audit B finding: agent briefs are documentation-grade, not enforcement-grade.

Pending: Audit D (code-vs-spec coherence).


## Event 05 — Audit D returned (code-vs-spec coherence)

**Per-SPEC verdict**:

| SPEC | Verdict | Findings |
|---|---|---|
| SPEC-001 | PASS | All 8 REQs ACCEPTED, 9 TASKs DONE, SHA-256 round-trip green |
| SPEC-002 | PARTIAL | SPEC root has all 18 artifact checkboxes `[ ]` despite DONE; REQ-001/002/004/005 still DRAFT; fixture path discrepancy |
| SPEC-003 | PASS spot-check | Same checkbox-rollup drift as SPEC-002 |
| SPEC-004 | PASS spot-check | Implementation correct |
| SPEC-007 | PARTIAL | Status DONE with REQ-012 + TASK-013 + TASK-014 still `[ ]` — violates validateSpecDoneClaim |

**Specific drifts**:

- `core/dispatcher.ts:7-12` missing `spec` source_type registration (only 4 types; `registry.ts:34-40` has all 5) — latent bug
- REQ-009-SPEC-007 says "9 mutation types"; code has 11 (transition-impl-item + transition-qa-item added via PR #14)
- REQ-005-SPEC-002 AC-1/AC-2 specify fixture subdirs that don't exist (actual: flat `analysis-sample.md`)

**Key insight**: SPEC-002 + SPEC-003 + SPEC-007 marked DONE with unchecked checkboxes — exactly what `validateSpecDoneClaim` should reject. But no skill ran the validator at status-flip time, so the lie went through.

## Event 06 — Synthesis: convergent root finding

**One root cause across 5 audits**: the rigid protocol exists as PROSE, not as RUNTIME ENFORCEMENT. The composition library is a documentation surface, not a barrier. Specific evidence:

1. **Coverage gaps** (A): 5 missing schemas/validators at gate points
2. **Invocation gaps** (B): all 7 lifecycle skills describe validators in prose but no skill prescribes `bun run` at gate points
3. **Test gaps** (E): validators test struct arithmetic; only 3/5 have parse-then-validate; zero integration tests; zero drift-regression tests
4. **QA brief gap** (C): 4 QA notes use forbidden `validates` because dispatch brief lacks the 11-type allowlist
5. **Status drift** (D): SPEC-002/003/007 DONE with unchecked checkboxes — exactly what the unused `validateSpecDoneClaim` would catch

## Event 07 — Proposed Wave 2 scope (4 tracks)

### Track 1 — Close coverage gaps (Audit A finding)

P0 + P1 schemas/parsers/validators:

- ADR: schema + parser + `validateAdrAcceptedClaim` (PROPOSED→ACCEPTED gate; rejects ACCEPTED with unresolved Clarifications `[ ]`)
- PLAN: `validatePlanDoneClaim` (rejects DONE with non-terminal parts)
- ANALYSIS: schema + parser + `validateAnalysisAcceptedClaim` (rejects ACCEPTED with `## Open Questions` section — closes Brain v2 Wave 7 exploit)
- EPIC: schema + parser + `validateEpicDoneClaim` (rejects DONE without all contained SPECs DONE)
- CRIT: schema + parser (structural; no claim validator)

### Track 2 — Wire skills to invoke library (Audit B finding)

- build/SKILL.md: explicit `validateTaskDoneClaim()` call at Step 4b; `applyPlanMutation` at Steps a/h/j/s
- plan/SKILL.md: explicit PlanNote renderer invocation pattern
- spec/SKILL.md: post-authoring schema validation
- end/SKILL.md: `validateSpecDoneClaim()` invocation in Step 1 (would have caught SPEC-007 drift)
- decisions/SKILL.md: `applyPlanMutation({ type: "lock-decision" })` for d_n_substatus
- Update QA + implementer + analyst dispatch-brief templates: enumerate the 11 valid relation types (would have prevented the `validates` drift in Audit C)

### Track 3 — Adversarial + integration + regression tests (Audit E finding)

10 prioritized tests:

1-3. Parse-then-validate adversarial tests for task-claim, spec-claim, requirement-claim
4. Integration: checkbox-mutation → parse → validate-claim (full per-TASK cycle path)
5-6. Mutation: backward-transition rejection; double-apply idempotency
7. Cross-note consistency: SPEC checklist vs TASK status
8. Session-mutation: duplicate-event-number rejection
9. Round-trip: malformed-wikilink resilience
10. Drift regression markers tagging 5 Phase X surfaces

### Track 4 — Cleanup current drift (Audit C + D findings)

Brain notes (Audit C): fix duplicate frontmatter (2 notes); replace `validates` with valid relation (4 notes); fix title-without-colon (3 notes); fix stale `type: test-report`/`test_report` (2 notes); redact PII paths (3 notes); de-duplicate Event numbers (1 note).

Code/specs (Audit D): propagate SPEC-002/003 checkbox rollups + flip 4 REQ statuses; resolve SPEC-007 status (downgrade OR complete TASK-014); register `spec` in `core/dispatcher.ts` (or deprecate file); amend REQ-009-SPEC-007 to "11 mutation types".

### Estimate

Combined: ~10-13 days. Parallel-friendly where tracks don't overlap files.

## Event 08 — Pending: scope-shape decision

Two viable shapes:

- **Option A (Inline)**: Append the 4 tracks as new DoD items to `protocol-hardening` part. Faster; matches Phase X Wave 1 precedent (X.A..X.E sub-phases under one PLAN part). No new SPEC.
- **Option B (SPEC-008)**: Author SPEC-008-protocol-hardening-wave-2 with 4 REQ clusters mapping to the 4 tracks. Run through /spec → /build pipeline. More rigorous; eats own dogfood (uses composition library to harden composition library). Adds spec-decomposition re-entry.

Surfacing as AskUserQuestion now.


## Event 09 — Wave 2 scope shape LOCKED

**Decision** (verbatim from AskUserQuestion answer):

> **SPEC-008 (Recommended) — author full SPEC subtree for the 4 tracks**
>
> Re-enter spec-decomposition phase; author SPEC-008-protocol-hardening-wave-2 with 4 REQ clusters (one per track) + DESIGN notes + atomic TASKs with DoD; run through /spec → /build pipeline. Most rigorous; eats own dogfood (the work that hardens the protocol uses the protocol). Drawback: more ceremony; spec-decomposition + spec.SPEC-008 + build.SPEC-008 parts to add.

**Lifecycle re-entry plan**:

1. **decisions.4** (NEW part): adjudicate Wave 2 architecture choices via ADR-004:
   - D-1: Skill invocation pattern for composition library (in-process import? bun run CLI? per-validator script wrapper?)
   - D-2: Where new schemas/parsers/validators land in directory layout (extend existing pattern or new `wave-2/` subdir?)
   - D-3: Adversarial-claim test scaffold pattern
   - D-4: Dispatch-brief template persistence + enforcement mechanism
   - D-5: Include/defer adjudication for P1 gaps (ANALYSIS, EPIC, CRIT)
   - D-6: SPEC-007 status resolution path (downgrade to ACCEPTED vs complete TASK-014)
   - D-7: `core/dispatcher.ts` deprecation vs fix

2. **spec.SPEC-008** (NEW part): author SPEC-008-protocol-hardening-wave-2 subtree per ADR-004; estimated 12 REQ + 3-4 DESIGN + 15-20 TASK.

3. **build.SPEC-008** (NEW part): execute per-TASK build+QA cycle.

4. **protocol-hardening** (existing IN_PROGRESS): stays IN_PROGRESS as umbrella; flips DONE when build.SPEC-008 DONE.

PLAN-001 will be edited to add the 3 new parts + update dependency graph + update Progress Dashboard. Two-step edit + commit follows.


## Event 10 — D-1 LOCKED: per-skill scripts invocation pattern

**Decision** (verbatim from AskUserQuestion answer):

> **Per-skill scripts (extends existing pattern; Recommended)**
>
> Each lifecycle skill ships gate-point scripts in `skills/<name>/scripts/<verb>.ts`. Thin wrappers that import from `_shared/composition/`. Matches the established defrag/ingest pattern. New validators add new scripts colocated with the skill that needs them. Skills become fully self-contained — to understand what `/build` does, you read `skills/build/SKILL.md` + `skills/build/scripts/`.

Preview accepted:

```text
skills/build/scripts/validate-task-done.ts
skills/build/scripts/transition-impl-item.ts
skills/end/scripts/validate-spec-done.ts
skills/spec/scripts/validate-task-schema.ts

# SKILL.md Step 4b becomes:
bun skills/build/scripts/validate-task-done.ts <task-path>
```

**Clarification context**: User pushed back on D-1's original options (in-process import vs CLI binary vs per-validator wrapper) — pointed out skills can simply ship scripts. Original options conflated "scripts" with "in-process TS import". Reframed options around the real existing pattern (defrag/ingest already ship per-skill scripts). User selected the recommended per-skill pattern.

**Cascading implications**:

- D-2 (directory layout): partially answered — scripts live under `skills/<name>/scripts/`. Library logic stays in `_shared/composition/src/`. D-2 narrows to: where do the new schemas/parsers/validators in the library live? (probably extend existing flat dirs)
- Skill-update scope (Track 2): each lifecycle skill needs its own `scripts/` subdir created + populated. 5 lifecycle skills × ~2-4 scripts each = 10-20 new files.
- Composition library exposes TS API only; no CLI. The CLI exists per-skill.

PLAN-001 decisions.4 DoD: D-1 flipped `[ ]` → `[x]`.


## Event 11 — D-2 LOCKED: extend existing flat dirs + `_shared` rename captured

**Decision** (verbatim from AskUserQuestion answer):

> **Extend existing flat dirs (Recommended)**
>
> Add Wave 2 files to existing `shared/composition/src/schemas/`, `src/parsers/`, `src/validators/`. New types follow same naming: `adr-note.ts`, `analysis-note.ts`, etc. Consistent with 9 existing schemas; one pattern across all waves.

**Additional scope captured** (user clarification on D-2): rename `_shared/` → `shared/` at project root. This is a structural change, not an adjudication — user directive, not optional. Adding to Wave 2 scope as Track 4 cleanup item.

**Track 4 cleanup additions** (running list; will become SPEC-008 REQ-012 cluster):

| # | Item | Audit source |
|---|---|---|
| 1 | Brain notes: 2 duplicate frontmatter blocks (QA-027, QA-030) | C |
| 2 | Brain notes: 4 forbidden `validates` relations (QA-027, QA-042, QA-043, QA-015) | C |
| 3 | Brain notes: 3 title-without-colon (ANALYSIS-002, SESSION-2026-05-20_01, _02) | C |
| 4 | Brain notes: 2 stale `type:test_report`/`type:test-report` (QA-030, QA-038) | C |
| 5 | Brain notes: PII path redaction (QA-036, QA-038, SESSION-2026-05-20_03) | C |
| 6 | Brain notes: Event 36/37/38 dedup in SESSION-2026-05-21_01 | C |
| 7 | Code: SPEC-002/003 SPEC root checkbox rollup + 4 REQ statuses DRAFT→ACCEPTED | D |
| 8 | Code: SPEC-007 status resolution (per D-6) | D / D-6 |
| 9 | Code: `core/dispatcher.ts` disposition (per D-7) | D / D-7 |
| 10 | Code: REQ-009-SPEC-007 amend "9 mutation types" → "11 mutation types" | D |
| 11 | **Structural: `_shared/` → `shared/` rename** | User directive (this event) |

D-N progress: D-1 LOCKED (Event 10) → D-2 LOCKED (this event). Remaining: D-3, D-4, D-5, D-6, D-7.


## Event 12 — D-3 LOCKED: shared fixture-driven harness

**Decision** (verbatim from AskUserQuestion answer):

> **Shared fixture-driven harness (Recommended)**
>
> Single test runner + fixture directory. Each lying-claim scenario lives as a named markdown file (e.g., `tests/fixtures/adversarial/task/drift-01-all-deferred-bypass.md`). A shared `testAdversarial({fixture, validator, expectedReject})` helper runs parse → validate → assert. New scenarios add a fixture file + a one-line table entry. Natural mapping to Audit E's drift-regression-marker request — each fixture *is* a drift surface.

Implication: SPEC-008 will need a TASK for the harness implementation + a TASK for the initial fixture set covering the top-10 prioritized adversarial scenarios from Audit E + REQ-010's drift-regression markers feeding the fixture inventory.

D-N progress: D-1 ✓, D-2 ✓, D-3 ✓. Remaining: D-4 (dispatch-brief), D-5 (P1 include/defer), D-6 (SPEC-007), D-7 (dispatcher.ts).


## Event 13 — D-4 LOCKED: programmatic per-skill brief-generator scripts

**Decision** (verbatim from AskUserQuestion answer):

> **Programmatic per-skill scripts (Recommended; extends D-1)**
>
> Each skill ships brief-generator scripts at `skills/<name>/scripts/dispatch-<agent>.ts`. Scripts import cross-cutting constants (e.g., `validRelationTypes` from `shared/composition/src/schemas/common.ts`) and skill-specific data, output the full brief text. When the schema adds a relation type, every brief auto-includes it. Strongest drift-prevention; same shape as D-1's per-skill scripts.

Implication: shared/composition exports cross-cutting constants. Per-skill scripts import + compose. SPEC-008 REQ-007 = "dispatch-brief generator scripts per skill+agent" with TASKs to author each script.

## Event 14 — D-5 LOCKED: include all 3 P1 schemas (full Audit A recommendation)

**Decision** (verbatim from AskUserQuestion answer):

> **Include all 3 (full Audit A recommendation)**
>
> Build complete P1 coverage now: ANALYSIS + EPIC + CRIT. Most comprehensive; closes all P1 gaps. Adds ~2-3 days; some artifacts have no immediate consumer (no EPIC notes exist today; no per-CRIT claim pattern).

Wave 2 final coverage:

| Type | Schema | Parser | Validator | Notes |
|---|---|---|---|---|
| ADR | ✓ | ✓ | `validateAdrAcceptedClaim` | P0; PROPOSED→ACCEPTED gate; adr-review enforcement |
| PLAN | (extend existing) | (existing) | `validatePlanDoneClaim` | P0; mechanical: all parts terminal before DONE |
| ANALYSIS | ✓ | ✓ | `validateAnalysisAcceptedClaim` | P1; rejects ACCEPTED + Open Questions section |
| EPIC | ✓ | ✓ | `validateEpicDoneClaim` | P1; rejects DONE without contained SPECs DONE |
| CRIT | ✓ | ✓ | — (no claim validator) | P1; structural support for adr-review convergence |

Total: 5 schemas + 5 parsers + 4 validators added. Updated effort: ~12-14 days (up from 10-13 with P1 deferral).

D-N progress: D-1 ✓, D-2 ✓, D-3 ✓, D-4 ✓, D-5 ✓. Remaining: D-6 (SPEC-007), D-7 (dispatcher.ts).


## Event 15 — D-6 LOCKED: SPEC-007 checkbox notation amendment + validator extension

**Decision** (verbatim from AskUserQuestion answer):

> **Amend SPEC root checkbox notation for deferred items (Recommended)**
>
> Change SPEC-007 root's REQ-012/TASK-013/TASK-014 checkbox from `[ ]` to `[~]` (or `[deferred: rationale]`) to match REQ-012's `status: DEFERRED`. Add notation legend to SPEC root. Keep SPEC-007 status DONE — deferred is a legitimate terminal status. Cheapest; respects existing deferral decision. Also extends `validateSpecDoneClaim` to recognize `[~]` as terminal alongside `[x]`.

Implication: SPEC-008 needs a TASK to (a) amend SPEC-007 root notation + add legend, (b) extend `validateSpecDoneClaim` schema check to accept `[~]` alongside `[x]` as terminal markers. Validator extension reusable beyond SPEC-007.

## Event 16 — D-7 LOCKED: delete `core/dispatcher.ts` + its test

**Decision** (verbatim from AskUserQuestion answer):

> **Delete `core/dispatcher.ts` + its test (Recommended; evidence-confirmed safe)**
>
> Production code uses `registry.ts`. Adapters live in separate files (`adapters/*.ts`). CompositionAdapter interface lives in `core/adapter.ts` (preserved). Only `dispatcher.test.ts` references the dead module — deleted alongside. 508/508 tests should stay green; if any fail, investigation reveals a hidden dependency we should fix.

Evidence captured pre-lock: `core/dispatcher.ts` (33 lines) is early prototype mapping 4 source_types; `registry.ts` (~80 lines) is SPEC-005 production dispatcher mapping all 5 types with SPEC-aware errors; registry.ts docstring explicitly identifies core/dispatcher.ts as superseded. ZERO production imports of core/dispatcher.ts (only its own test). Adapters live in `adapters/*.ts` — untouched. CompositionAdapter interface in `core/adapter.ts` — preserved.

User worry "could break adapter functionality" — resolved by file-level evidence: deletion touches dispatcher + its test only, no adapter logic.

## Event 17 — All 7 D-Ns LOCKED; advancing to Step 3 hygiene audit

D-N progress: D-1 ✓, D-2 ✓, D-3 ✓, D-4 ✓, D-5 ✓, D-6 ✓, D-7 ✓. ADR-004 will lock these 7 architectural decisions for Wave 2 protocol-hardening implementation.

Next /decisions steps:

- Step 3: 12-item canonical holistic hygiene audit on PLAN-001
- Step 3.5: 4 binary drift-detection checks (source / scope / demand-signal / tier)
- Step 3.6: conditional buy-vs-build re-check (skip — no new tool/library/external-service introduced)
- Step 4: pre-author-composite gate (7 D-Ns at TIER_4; well under 25 hard threshold; ADR line estimate 600-800; under 1500 hard)
- Step 5: dispatch `brain:🧠-architect` for ADR-004 composite with detail-parity mandate
- Step 6: detail-parity audit (sample ≥5 D-Ns vs SESSION Events 10-16)
- Step 7: `brain:---adr-review` MANDATORY blocking gate
- Step 8: flip ADR-004 PROPOSED → ACCEPTED
- Step 9: set-part-done call back to /plan with ADR-004 wikilink as outcome


## Event 18 — Numbering drift caught: ADR-004 → ADR-005

User flagged that ADR-004 already exists (`ADR-004: Cross-Source Coordinator Architecture`, 2026-05-21). Counter-availability check (per `feedback_note_creation_protocol` item 10) was missed pre-architect-dispatch.

`list_directory decisions` confirmed: ADR-001, ADR-002, ADR-003, ADR-004 all extant. Wave 2 composite ADR must be **ADR-005**.

Actions taken:

- SendMessage to architect agent (background, agent ID a8793786d4f81157e): URGENT REDIRECT to ADR-005 with full filename/title/permalink substitution; instructions to delete-and-recreate if Pattern 2 Phase 1 already fired with ADR-004 title
- PLAN-001 decisions.4 part: 4 find_replace edits to substitute ADR-004 → ADR-005 across DoD + title + source_artifacts + ADR coverage gate
- spec.SPEC-008 ADR coverage gate updated: clarifies ADR-004 is cross-source-coordinator (unrelated to Wave 2); ADR-005 is the Wave 2 architecture ADR

Lesson: counter-availability check is part of the pre-flight, not post-flight. Should run `list_directory decisions` BEFORE drafting briefs that name a specific ADR number.


## Event 19 — Architect agent stalled at write_note; orchestrator authored ADR-005 directly

Background agent (a8793786d4f81157e) confirmed receipt of ADR-004→ADR-005 redirect via transcript inspection. Completed input-gathering phase (read PLAN-001, ANALYSIS-004, ADR-003 for precedent, list_directory decisions/). Last output verbatim: "Now I have everything needed to author ADR-005. Let me proceed with Pattern 2 Phase 1: write_note with NO-COLON title." Agent then stalled — no further tool calls observed after timestamp 02:04:10 UTC.

User reported stall after ~5-minute silence; orchestrator killed the agent via TaskStop and authored ADR-005 directly. Orchestrator had full source material in context (ANALYSIS-004 inline + Events 10-16 verbatim D-N lock content + ADR-003 style precedent from page-1 read).

ADR-005 authored via Pattern 2 three-phase write:

- Phase 1: `write_note` with no-colon title; landed as `decisions/ADR-005 Protocol Hardening Wave 2 Architecture.md`
- Phase 2: `edit_note` find_replace to insert colon into frontmatter title + H1 (expected_replacements=2; both replaced)
- Phase 3: `move_note` to rename to kebab `decisions/ADR-005-protocol-hardening-wave-2-architecture.md`

Permalink: `decisions/adr-005-protocol-hardening-wave-2-architecture-1` (Brain appended `-1` due to prior write collision; cosmetic, does not break wikilinks).

ADR-005 structure: top-level Status / Context / Decision Summary / Detailed Decisions (7 D-Ns × 11-section template each) / Cross-Decision Coherence / Migration Plan / Validation / Clarifications / Observations / Relations. Total ~700 lines preserving verbatim D-N lock content from Events 10-16.

**Step 6 detail-parity audit**: orchestrator self-audit (orchestrator was author + has Events 10-16 in context). Each per-D-N section quotes the AskUserQuestion answer verbatim in the "Decision" subsection (Pattern: `> **<Label>** > <description>`). Considered Options sections preserve all alternatives surfaced. PASS — detail parity confirmed.

**Next**: /decisions Step 7 `brain:---adr-review` BLOCKING gate; Step 8 ACCEPTED flip on PASS; Step 9 set-part-done to /plan.


## Event 20 — ADR-005 adr-review round 1: FAIL convergence

6-agent debate complete. Tally: 3 ACCEPT (critic, security, analyst) + 3 CONCERNS (architect, independent-thinker, advisor) + 0 BLOCK. 1 P0. Threshold ≥5 ACCEPT + 0 BLOCK + 0 P0 not met.

**P0** (advisor): D-7 (delete dead file) is task-level, not architectural — move to SPEC-008 Track 4 as a cleanup TASK; remove from ADR D-N inventory.

**P1 themes**:

- **Advisor + IT**: D-5 over-scope (EPIC + CRIT have zero current consumers; speculative schemas). User-locked in Event 14 — Disagree-and-Commit applies unless user revises.
- **Advisor**: SPEC-008 granularity (4 tracks in one SPEC); recommend split into SPEC-008 (Tracks 1+2) + SPEC-009 (Track 3) + Track 4 as individual cleanup tasks.
- **Independent-thinker** (P2 elevated): voluntary script invocation is the SAME failure mode as Wave 1 prose; real fix is automated gates (hooks, pre-commit) that fire without orchestrator cooperation. This challenges D-1+D-4's core premise. Could become a new D-8.
- **Critic**: EPIC `validateEpicDoneClaim` cross-note resolution underspecified (file I/O at validation time vs single-note pattern of other validators); integration test scaffold not addressed by any D-N; backward-transition + idempotency + duplicate-event tests not addressed.
- **Architect**: `-1` permalink suffix on ADR-005 (cosmetic; fix via move_note); duplicate-note finding FALSE POSITIVE (verified — only one ADR-005 file). MADR fields finding REJECTED (project uses CONVENTIONS Section 3, not MADR).
- **Security**: CWE-22 path containment + CWE-94 prompt injection trust-boundary docs (add to D-1 + D-4 Implementation Notes). Constructive; non-blocking.
- **Analyst**: 12-14 day estimate tight (rename cascade reduces parallelism); expect() count off by 3% (1052 actual vs 1084 cited).

**Phase 3 resolution plan**: orchestrator-authority revisions (architect P1.2/P1.3 partial, critic P1, security P1, analyst P1, P2 cleanup) applied inline. **User-input needed** on 3 substantive issues:

1. Advisor P0: remove D-7 from ADR (move to SPEC-008 task)?
2. IT P2 elevated: add D-8 for automated gates (hooks/pre-commit), OR amend D-1+D-4 to mandate them, OR accept-with-rationale that voluntary invocation is the chosen trade-off?
3. Advisor P1: SPEC-008 granularity — keep as one SPEC vs split into SPEC-008 (Tracks 1+2) + SPEC-009 (Track 3) + Track 4 individual tasks?

Plus reconfirm D-5 (EPIC + CRIT inclusion vs defer to Wave 3) given advisor + IT both flagged it.

Surfacing via AskUserQuestion next.


## Event 21 — Phase 3 resolutions applied to ADR-005

User clarification turns added Q1 lock (D-7 tactical cleanup notation) + Q2 lock (mandate automated gates as Wave 2 deliverable; full hook architecture confirmed). Q3 (SPEC-008 granularity) still pending.

**D-8 architecture confirmed by user** ("looks good"):

- 5 PreToolUse blocking gates: Edit/Write/MultiEdit on `docs/**`, Brain MCP edit_note/write_note, Bash git commit, Bash git push, Bash gh pr create
- Stop turn-end backstop
- FileChanged on `.git/HEAD|.git/index|.git/logs/HEAD` for post-commit observability
- Plugin directory layout: `hooks/hooks.json` + `hooks/lib/` (shared utilities) + `hooks/scripts/` (7 handler scripts)
- Hybrid failure semantics: deny on status-flip claim failures; allow + `additionalContext` warning on other schema issues
- Validators imported from `shared/composition/src/validators/` (per D-1+D-2 layout)

**ADR-005 edits applied this turn**:

- Status section: round 1 verdict captured + Phase 3 resolutions enumerated
- Decision Summary: D-7 tactical-cleanup notation added; D-8 line added
- D-8 full 11-section template inserted before Cross-Decision Coherence
- Cross-Decision Coherence: 5-cluster view (was 4); Track 5 (hooks) added; D-8 dependency relationships documented
- Migration Plan: 11 steps (was 10); D-8 hook authoring + smoke tests inserted at step 8; effort revised 12-14 → 14-16 days
- Validation: D-8 validation criteria added; D-5 EPIC cross-note resolver injection mechanism added (critic P1.1); D-3 expanded scope captured (critic P1.2/P1.3)
- Clarifications: Phase 3 adjustment narrative + 6 Disagree-and-Commit dissent entries (advisor+IT D-5 scope; architect MADR fields rejected; architect duplicate-note false positive; permalink `-1` cosmetic; relation-type specificity Track 4; IT alternative architectures rejected with rationale)

**Open user decision**: Q3 — SPEC-008 granularity. With D-8 added (Track 5), Wave 2 now spans 5 tracks under one SPEC. Advisor's P1 about granularity has more weight; will resurface.


## Event 22 — Q3 LOCKED: SPEC-008 single SPEC for all 5 tracks

**Decision** (verbatim from AskUserQuestion answer):

> **Keep as one SPEC-008 (Recommended for cohesion)**
>
> All 5 tracks ship as SPEC-008. One /build cycle; one QA sweep; one DONE gate. Within SPEC-008, REQ/DESIGN/TASK organized by track. PLAN-001 adds 2 new parts (spec.SPEC-008 + build.SPEC-008).

Preview accepted:

```text
SPEC-008 Protocol Hardening Wave 2
├─ REQ cluster 1: schemas/parsers/validators (Track 1)
├─ REQ cluster 2: per-skill scripts + brief generators (Track 2)
├─ REQ cluster 3: test harness + integration + regression (Track 3)
├─ REQ cluster 4: drift cleanup (Track 4)
└─ REQ cluster 5: hook architecture + handlers (Track 5)

PLAN-001 new parts: 2 (spec.SPEC-008 + build.SPEC-008)
```

All 3 Phase 3 user-input decisions resolved: Q1 (D-7 tactical notation) ✓; Q2 (D-8 automated gates) ✓; Q3 (single SPEC) ✓.

D-N inventory: D-1 ✓, D-2 ✓, D-3 ✓ (extended scope), D-4 ✓, D-5 ✓ (cross-note resolver), D-6 ✓, D-7 ✓ (tactical), D-8 ✓ NEW. Total 8 D-Ns; ADR ~900 lines post-Phase-3.

**Next decision**: run strict adr-review round 2 (re-dispatch all 6 reviewers against revised ADR for convergence vote) OR pragmatically flip ADR-005 → ACCEPTED on the basis that all P0+P1 findings have been resolved/D&C-captured (skill protocol allows convergence by Phase 3 resolution if findings are addressed).


## Event 23 — ADR-005 ACCEPTED; decisions.4 DONE; spec.SPEC-008 READY

User adjudicated pragmatic flip over strict round 2 (per AskUserQuestion Event 23). All Phase 3 resolutions applied; all P0 + P1 findings either resolved in-ADR or Disagree-and-Commit-captured in Clarifications.

Actions applied:

- ADR-005 frontmatter: `status: PROPOSED → ACCEPTED`
- ADR-005 Status section: updated to ACCEPTED with round-1 verdict + Phase 3 resolution summary + user-adjudicated pragmatic flip rationale
- PLAN-001 decisions.4 DoD: ADR-005 authored + adr-review verdict checkboxes flipped `[x]`
- PLAN-001 decisions.4 substatus: `IN_PROGRESS → DONE`; Completing Session set; Outcome line written
- PLAN-001 spec.SPEC-008 substatus: `PENDING → READY`; Source Artifacts updated to cite ACCEPTED ADR-005
- PLAN-001 Progress Dashboard: decisions 3 DONE + 1 IN_PROGRESS → 4 DONE; spec 7 DONE + 1 PENDING → 7 DONE + 1 READY; total 21 DONE / 22 → 22 DONE / 25

Per /decisions Step 9: set-part-done equivalent applied directly (skill returns to /plan via set-part-done call but with the workflow now in continue-from-spec.SPEC-008 mode). Next /plan invocation will auto-route to spec.SPEC-008 → dispatch /spec.

Pending work on PLAN-001: spec.SPEC-008 (READY), build.SPEC-008 (PENDING), protocol-hardening (IN_PROGRESS umbrella; flips DONE when build.SPEC-008 DONE).


## Event 24 — /plan continue → spec.SPEC-008 IN_PROGRESS; auto-dispatching /spec

User invoked /skills:plan PLAN-001-skills-ecosystem. Single READY part identified: spec.SPEC-008 (build.SPEC-008 blocked on it; review/end are Wave 1 closures). No multi-READY ambiguity. Current branch `feat/plan-001-protocol-hardening-wave-2-scope` retained (non-main; branch policy allows).

PLAN-001 edits:

- spec.SPEC-008 substatus: `READY → IN_PROGRESS`; owning_session set to SESSION-2026-05-23_02
- Progress Dashboard: spec column 7 DONE + 1 READY → 7 DONE + 1 IN_PROGRESS; total IN_PROGRESS row 1 → 2

Auto-dispatching skills:spec with Stage 2 args:

```text
Skill(skill="skills:spec",
      args="plan=PLAN-001 part=spec.SPEC-008 spec=SPEC-008 source_adrs=ADR-005+ADR-001+ADR-002+ADR-003")
```

(Wikilinks in args avoided per Brain MCP bullet-parser strictness; spec skill will resolve titles via Brain MCP read.)


## Event 25 — Session PAUSED for fresh-session resume of SPEC-008 authoring

User selected pause-and-resume-fresh over inline / agent-dispatch / skeleton paths. Rationale: ~30-35 note authoring + 2 review gates carries real stall + truncation risk inline; conversation context is heavy after the audit + decisions cycle; fresh session starts with clean cache + full token budget.

Session status flipped `IN_PROGRESS → PAUSED`. PLAN-001 state preserved: decisions.4 DONE; spec.SPEC-008 IN_PROGRESS (will resume mid-authoring via /spec G2 skip-done-work). All commits durable on branch `feat/plan-001-protocol-hardening-wave-2-scope` (10 commits this session: scope lock → ANALYSIS-004 → D-1..D-7 locks → ADR-005 author → adr-review round 1 → Phase 3 resolutions → ACCEPTED → spec.SPEC-008 IN_PROGRESS).

## Resume protocol (next session)

1. `/skills:plan PLAN-001-skills-ecosystem` — continue mode
2. Plan continue identifies spec.SPEC-008 is IN_PROGRESS (not READY) — auto-resumes via Stage 2 G2 skip-done-work
3. Stage 2 Step 1: SPEC-008 folder created if not present → docs/specs/SPEC-008-protocol-hardening-wave-2/
4. Stage 2 Step 2-5: author REQ/DESIGN/TASK/SPEC-root in order per ADR-005 structure (5 REQ clusters)
5. Phase 3 validation + ADR coverage gate (check ADR-001/002/003/005 each have `implemented_by [[SPEC-008]]`)
6. Gate A (analyst semantic gap) + Gate B (critic 4 binary drift checks)
7. Flip SPEC-008 DRAFT → ACCEPTED; set-part-done

## Session 23 deliverables (this session)

- 5 parallel audits (A composition coverage, B skill protocol-embedding, C Brain notes coherence, D code-vs-spec, E test coverage)
- ANALYSIS-004 omnibus authored (Brain note synthesizing audit findings)
- ADR-005 ACCEPTED with 8 architectural decisions for Wave 2 (D-1..D-8 incl. NEW D-8 automated enforcement gates via plugin hooks)
- adr-review round 1 (6 parallel reviewers) + Phase 3 resolutions + pragmatic flip
- PLAN-001 advances: decisions.4 DONE; spec.SPEC-008 IN_PROGRESS (ready for resume)
- 10 atomic git commits on `feat/plan-001-protocol-hardening-wave-2-scope`
