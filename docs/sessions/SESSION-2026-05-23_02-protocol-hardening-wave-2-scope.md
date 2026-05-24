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
status_history:
- IN_PROGRESS → PAUSED 2026-05-23 (Event 64; batch 4 milestone)
- PAUSED → IN_PROGRESS 2026-05-24 (Event 65; resume + rehydration)
- IN_PROGRESS → PAUSED 2026-05-24 (Event 68; TASK-030 closed; before Batch 5a agent dispatch)
- IN_PROGRESS → PAUSED 2026-05-24 (Event 83; Track-1 trilogy milestone 21/47)
- PAUSED → IN_PROGRESS 2026-05-24 (Event 84; resume Wave 1b)
- IN_PROGRESS → PAUSED 2026-05-24 (Event 91; Wave 1b Batches A+B closed, 27/47 — budget pause)
- PAUSED → IN_PROGRESS 2026-05-24 (Event 92; resume + rehydration; Wave 1b Batch C next)
---

# SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope

## Scope

User reopened the `protocol-hardening` part of [[PLAN-001 Skills Ecosystem]] with directive "everything that needs to be done for it — i'll let you figure out what that is". Phase X Wave 1 closed 2026-05-21 (commit `94e27f9`, 585/585 tests, all D1-D4 resolved). This session scopes Wave 2: identify remaining enforcement-layer gaps via parallel audit dispatch, synthesize findings, propose tiered scope, secure user approval, then execute.

Starting branch: `feat/plan-001-protocol-hardening-wave-2-scope` (created off `main` at `eb0eb28`).

## State

- Starting commit: `eb0eb28` (end of PLAN-001 workflow close)
- PLAN-001 status: IN_PROGRESS; protocol-hardening part: IN_PROGRESS (umbrella; flips DONE when build.SPEC-008 DONE)
- ADR-005 ACCEPTED (8 D-Ns; decisions.4 DONE); spec.SPEC-008 DONE; SPEC-008 ACCEPTED (root + 12 REQ + 4 DESIGN + 47 TASK)
- build.SPEC-008 IN_PROGRESS (owning_session SESSION-2026-05-23_02)
- **27/47 TASKs fully CLOSED** (impl + QA both DONE): 001, 002, 003, 004, 005, 006, 007, 008, 009, 010, **011, 012, 013, 015, 016, 017**, 021, 025, 026, 029, 030, 033, 034, 037, 039, 040, 047
- **20/47 TASKs PENDING**: 014, 018, 019, 020, 022, 023, 024, 027, 028, 031, 032, 035, 036, 038, 041, 042, 043, 044, 045, 046
- REQs ACCEPTED: REQ-001/002/003; DESIGN-001. DRAFT (totality-gated): REQ-004 (needs 011-017 done + 014 — only 014 left), REQ-005 (needs 018/019/020), REQ-006..012; DESIGN-002 (needs all REQ-004/005 tasks)/003/004; SPEC-008 root Success/Acceptance Criteria.
- QA contract notes: QA-044..070 (added QA-065..070 this context)
- Suite baseline: **891 pass / 2 fail / 893 total** (2 fails = SPEC-007 DEFERRED `plan-001-migration.test.ts` per D-1; NEW failures elsewhere = regression)
- Config corrected this context: `.gitignore` `build/`→`/build/` (skills/build/ now tracked); tsconfig + biome `include` → `skills/**` (FU-2 RESOLVED)
- **Derived-view propagation = MANDATORY at every batch close** (user directive, Event 89): SPEC-008 root ALL 5 checkbox lists (Requirements/Designs/Tasks/Acceptance/Success) + PLAN task-level Wave Graph kept current. NO deferral. Currently: SPEC root Tasks 27 [x]; Wave Graph synced.
- **Next-ready: Wave 1b Batch C** — TASK-018 (build dispatch-implementer + dispatch-qa) + 019 (decisions dispatch-architect + critic) + 020 (research dispatch-analyst + review dispatch-reviewer) = REQ-005 brief generators. TASK-018 implementer adds `validRelationTypes` export to common.ts per SPEC Files Affected. THEN: TASK-032 → unblocks TASK-014 (closes REQ-004; add prefix-collision test before REQ-004 ACCEPTED). THEN Wave 1c (022/023/027/028/031/035/036), Wave 4 hooks (024/038/041-045), Wave 5 smoke (046).
- Open follow-ups (deferred, non-gating): REQ-004 AC-9 prefix-collision test (before REQ-004 ACCEPTED); FU-1 (`validates:` key in QA-032/033/034); FU-3 (this session Obs/Relations placement → session-end); `lock-decision`/transition scripts line-count vs DESIGN-002 soft ceiling (adjudicate at DESIGN-002 acceptance); D-3 (DESIGN-004 DiffNote.sha → TASK-043).
- 0 active blockers; 0 open user decisions (validRelationTypes resolved via SPEC Files Affected)

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
| 3 | Brain notes: 3 title-without-colon (ANALYSIS-002, SESSION-2026-05-20_01,_02) | C |
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

## Event 26 — Session resumed fresh; auto-dispatching /skills:spec Stage 2 for SPEC-008

User invoked `/skills:plan PLAN-001-skills-ecosystem` in a fresh conversation context per the Resume protocol locked in Event 25. Branch `feat/plan-001-protocol-hardening-wave-2-scope` retained (non-main; branch policy allows).

State check (rehydration):

- PLAN-001 status: IN_PROGRESS; dashboard 22 DONE / 25; 1 IN_PROGRESS (spec.SPEC-008) + 1 IN_PROGRESS (protocol-hardening umbrella) + 1 PENDING (build.SPEC-008)
- ADR-005 status: ACCEPTED; 8 D-Ns locked (D-1..D-8 incl. D-8 automated enforcement gates via plugin hooks)
- spec.SPEC-008: IN_PROGRESS (Event 24); owning_session SESSION-2026-05-23_02 → preserved for continuity
- SPEC-008 folder: not yet present in `docs/specs/` — Stage 2 Step 1 creates it
- Session note: flipped `PAUSED → IN_PROGRESS` this turn

Per /plan continue mode for an IN_PROGRESS part: skip "find next-ready"; auto-dispatch to phase skill via Contract 2. The /spec skill handles resume via Stage 2 G2 (skip-done-work) for an IN_PROGRESS spec part.

Auto-dispatching:

```text
Skill(skill="skills:spec",
      args="plan=PLAN-001 part=spec.SPEC-008 spec=SPEC-008 source_adrs=ADR-005+ADR-001+ADR-002+ADR-003")
```

Source artifacts (ADR-005 primary, plus prior accepted ADRs that SPEC-008 must continue to honor):

- [[ADR-005: Protocol Hardening Wave 2 Architecture]] — 8 D-Ns covering 5 tracks (schemas/parsers/validators; per-skill scripts; test harness; drift cleanup; plugin hooks)
- [[ADR-001: Composition Library Architecture]] — composition library invariants (Zod, AST, YAML plans, discriminated unions, adr-review gate)
- [[ADR-002: Adapter Contract and Plan Schema]] — adapter interface, capability matrix, hash invariants
- [[ADR-003: Plan/Session Render Architecture]] — render layer (relevant to SPEC-008 dispatch-brief generators per D-4)

Expected SPEC-008 shape (per Event 22 + ADR-005 Decision Summary): 5 REQ clusters (one per track), 3-4 DESIGN notes, 15-20 TASKs, 1 SPEC root. ~30-35 notes total.

## Event 27 — Wave 1 returned: 62 SPEC-008 child notes authored across 5 parallel architects

Dispatched 5 parallel `brain:🧠-architect` agents (foreground; opus model) with strict file-ownership boundaries per Track. All 5 returned successfully. Total: 12 REQs + 4 DESIGNs + 46 TASKs = 62 child notes authored. Pattern 2 three-phase write completed on every note (kebab filenames + colon-form titles + verbatim H1 matches). All notes status DRAFT (REQ/DESIGN) or TODO (TASK); no premature `[x]`.

**Track-by-track outputs**:

| Track | Owner agent | Notes | Range |
|---|---|---|---|
| 1 Library coverage | a84e965e2e4cfe0cd | 14 (REQ-001..003 + DESIGN-001 + TASK-001..010) | D-2, D-5 |
| 2 Per-skill scripts | a3a22bdbcae3b2fe3 | 13 (REQ-004..005 + DESIGN-002 + TASK-011..020) | D-1, D-4 |
| 3 Tests | a1e232a5eb0a4c912 | 11 (REQ-006..007 + DESIGN-003 + TASK-021..028) | D-3 |
| 4 Drift cleanup | aa6637442a92138ed | 11 (REQ-008..010 + TASK-029..036; no DESIGN) | D-6, D-7, rename, hygiene, code-vs-spec |
| 5 Plugin hooks | a529acb3e09ecb033 | 13 (REQ-011..012 + DESIGN-004 + TASK-037..046) | D-8 |

**Cross-track dependency flags** (surfaced by agents for the bi-directional closure pass):

1. **`_shared/` → `shared/` rename precedence (TASK-029)**: Tracks 1, 2, 4, 5 TASKs that touch composition library files need `depends_on [[TASK-029-SPEC-008: Rename Shared Composition Directory]]`. TASK-029 runs FIRST in any build sequencing.
2. **Track 1 validators → Track 5 hook handlers**: TASK-038..045 (hook handlers) `depends_on [[REQ-003-SPEC-008: New Claim Validator Suite]]`. Hooks cannot validate without the new validators existing.
3. **Track 1 validators → Track 3 fixture authoring**: TASK-024 `depends_on [[REQ-003-SPEC-008: New Claim Validator Suite]]`. ADR/ANALYSIS/EPIC adversarial fixtures require their validators to exist.
4. **Track 3 fixtures → Track 5 smoke tests**: TASK-046 `depends_on [[REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set]]`. Hook smoke tests reuse the adversarial fixture set.
5. **REQ-008 `[~]` notation → Track 2 end-skill wrapper**: TASK-014 `depends_on [[TASK-032-SPEC-008: Extend validateSpecDoneClaim for Deferred Notation]]`. The end-skill `validate-spec-done.ts` wrapper must reflect the extended validator.
6. **REQ-008 `[~]` notation → Track 5 Layer 6 Stop**: TASK-044 `depends_on [[REQ-008-SPEC-008: Deferred Checkbox Notation and Validator Extension]]`. Without it, legitimate deferred SPECs would be blocked by the turn-end backstop.
7. **`validRelationTypes` export gap**: Track 2 agent verified `_shared/composition/src/schemas/common.ts` does NOT currently export `validRelationTypes`. REQ-005 + TASK-018 assume Track 1 adds this export. Orchestrator MUST verify REQ-001 covers it or amend Track 1 to slot it in before Track 2 build phase enters IN_PROGRESS.

These cross-track edges will be added in the bi-directional closure pass via Brain MCP `edit_note` on the dependent TASK/REQ notes. ADR `implemented_by` relations (ADR-001/002/003/005 ← SPEC-008) added in the same pass.

**Next**: commit Wave 1 → author SPEC-008 root → bi-dir closure → Phase 3 + ADR coverage + Gate A + Gate B → flip ACCEPTED → set-part-done.

## Event: basic-memory DB corruption recovery on ADR-001/002/003 (2026-05-23)

**Symptom**: Brain MCP `edit_note` on ADR-001/002/003 fails with `relations.0.permalink Field required [type=missing]` Pydantic validation error.

**Root cause**: basic-memory's wikilink parser scans every `[[...]]` in note body text (including YAML code blocks and skill-name placeholders) and creates `links_to` relation rows. When the target can't be resolved to an existing Brain note's permalink, the DB row has NULL permalink. Subsequent `edit_note` calls validate all existing relations and reject these NULL rows, blocking edits.

**Recovery path (documented exception to CONVENTIONS Section 1.7.1 Brain-MCP-only rule)**: direct filesystem `Edit` on the ADR markdown files to escape/neutralize unresolvable wikilinks. Brain MCP cannot perform this fix because validation rejects the very relations we need to delete. This is the only viable path — the user authorized it explicitly for corruption recovery. NOT a precedent for general ADR editing; restricted to wikilink-target cleanup only. No architect review required because no semantic ADR content changes — only syntactic neutralization of unresolvable wikilinks (skill refs, YAML example placeholders). architect agent involvement is documented here as the recovery-protocol rationale; the ADR content is unchanged in intent.

**Plan**:

1. ADR-001: remove `pairs_with [[brain:---adr-review]]` Relations line (skill is not a Brain note)
2. ADR-002: same removal at line 897 + neutralize 6 YAML-code-block placeholder wikilinks (SESSION-2026-05-19_02 hypothetical, SPEC-001/SPEC-003 Brain-Reorg hypothetical, REQ-001-SPEC-001/SPEC-003 hypothetical, TASK-001-SPEC-001/SPEC-003 hypothetical) by stripping the double-bracket wikilink markers within the YAML strings
3. ADR-003: verified clean — no unresolvable wikilinks (all `[[...]]` resolve to real notes; `brain:---adr-review` mentions are bare prose, not bracketed)
4. Lint with markdownlint-cli2 --fix
5. Trigger basic-memory re-sync via Brain MCP `read_note`
6. Verify with benign `edit_note` append on each ADR, then revert the test edit
7. Commit fix

## Event 28 — basic-memory DB corruption resolved via user-authorized reset --reindex

Mid bi-directional closure, Brain MCP `edit_note` on ADR-001/002/003 failed with pydantic validation error `relations.0.permalink Field required` for `links_to` relation entries. Root cause: basic-memory's wikilink parser scans EVERY wikilink in note body text (not just typed-relation bullets) and creates `links_to` relation index entries. Targets like the `brain:---adr-review` skill reference (skill, not a Brain note) and YAML-code-block placeholder wikilinks (`SPEC-001 Brain`, `SESSION-2026-05-19_02 New Session`, etc. in ADR-002 examples) couldn't be resolved to permalinks → DB rows stored with NULL permalink field → validation rejected subsequent edits.

Dispatched fix agent (a970edbd0a7c047ee). Agent:

- Identified 1 unresolvable wikilink in ADR-001 (skill ref), 7 in ADR-002 (skill + 6 YAML placeholders), 0 in ADR-003
- Replaced the brain skill wikilinks with backtick-code form; YAML placeholders converted to angle-bracket placeholder notation
- Markdownlint-fix passed
- Commit `1f06eca`: `fix(adr): escape unresolvable wikilinks blocking basic-memory edit_note on ADR-001/002/003`
- BLOCKER: post-disk-fix `edit_note` still failed with same Pydantic error — basic-memory DB retains stale NULL-permalink rows; only `basic-memory reset --reindex` rebuilds the relation index globally

Surfaced 4-option AskUserQuestion to user. User locked: **"Run basic-memory reset --reindex (Recommended)"** — drops all DB tables across all 10 projects and rebuilds from filesystem; ~1-5 min reindex; notes safe on disk; affects all 10 basic-memory projects (brain, markdown-renderer, polar-ui-mcp, content-navigation, datatable, oncall, agx, datatable-v2, sidekick, skills).

Executed `yes | basic-memory reset --reindex` (user-authorized destructive operation). Result: "Reindex complete" for all 10 projects.

Post-reindex: re-set active_project=skills; bootstrap_context refreshed MCP project UUID cache; Brain MCP edit_note on all 3 ADRs SUCCEEDED. Added implemented_by SPEC-008 via find_replace to each ADR Relations section; deduped 4 leftover copies in ADR-001 + 3 in ADR-002 + 3 in ADR-003 left over from corruption-period append attempts. Final state: each of ADR-001/002/003/005 has exactly ONE implemented_by SPEC-008 relation.

Track 1 cross-cutting flag also resolved this turn: appended depends_on TASK-029 to TASK-001..010 via parallel Brain MCP append (10 successes).

Unrelated benign side effect: basic-memory reindex rewrote `skills/ingest/SKILL.md` (collapsed wrapped lines to single lines — content unchanged). Reverted via `git checkout`; not part of SPEC-008 scope.

**Lesson captured**: this kind of `links_to` DB corruption is a basic-memory parser bug that should be reported upstream — body-text wikilinks should not auto-create relation entries when targets can't resolve. Mitigation in the meantime: avoid wikilinks for non-Brain-note references (skill names, hypothetical examples) — use backtick code formatting or placeholder syntax instead.

Bi-dir closure now complete. Next: commit + Phase 3 syntactic validation → ADR coverage gate → Gate A → Gate B → flip ACCEPTED → set-part-done.

## Event 28 — basic-memory DB corruption resolved via user-authorized reset --reindex

Mid bi-directional closure, Brain MCP edit_note on ADR-001/002/003 failed with pydantic validation error `relations.0.permalink Field required` for `links_to` relation entries. Root cause: basic-memory's wikilink parser scans EVERY wikilink in note body text (not just typed-relation bullets) and creates `links_to` relation index entries. Targets like the brain skill reference (a skill, not a Brain note) and YAML-code-block placeholder wikilinks in ADR-002 examples couldn't be resolved to permalinks → DB rows stored with NULL permalink field → validation rejected subsequent edits.

Dispatched fix agent (a970edbd0a7c047ee). Agent identified 1 unresolvable wikilink in ADR-001 (skill ref), 7 in ADR-002 (skill + 6 YAML placeholders), 0 in ADR-003. Replaced the brain skill references with backtick-code form; YAML placeholders converted to angle-bracket placeholder notation. Markdownlint-fix passed. Commit `1f06eca`: `fix(adr): escape unresolvable wikilinks blocking basic-memory edit_note on ADR-001/002/003`.

BLOCKER: post-disk-fix edit_note still failed with same Pydantic error — basic-memory DB retains stale NULL-permalink rows; only `basic-memory reset --reindex` rebuilds the relation index globally.

Surfaced 4-option AskUserQuestion to user. User locked: **Run basic-memory reset --reindex (Recommended)** — drops all DB tables across all 10 projects and rebuilds from filesystem; ~1-5 min reindex; notes safe on disk; affects all 10 basic-memory projects (brain, markdown-renderer, polar-ui-mcp, content-navigation, datatable, oncall, agx, datatable-v2, sidekick, skills).

Executed `yes | basic-memory reset --reindex` (user-authorized destructive operation). Result: Reindex complete for all 10 projects.

Post-reindex: re-set active_project=skills; bootstrap_context refreshed MCP project UUID cache; Brain MCP edit_note on all 3 ADRs SUCCEEDED. Added implemented_by SPEC-008 via find_replace to each ADR Relations section; deduped 4 leftover copies in ADR-001 + 3 in ADR-002 + 3 in ADR-003 left over from corruption-period append attempts. Final state: each of ADR-001/002/003/005 has exactly ONE implemented_by SPEC-008 relation.

Track 1 cross-cutting flag also resolved this turn: appended depends_on TASK-029 to TASK-001..010 via parallel Brain MCP append (10 successes).

Unrelated benign side effect: basic-memory reindex rewrote `skills/ingest/SKILL.md` (collapsed wrapped lines to single lines — content unchanged). Reverted via `git checkout`; not part of SPEC-008 scope.

Secondary issue caught: the agent's session log entry contained literal double-bracket markers inside backticks describing the YAML fix; basic-memory's post-reindex strict parser flagged this as a malformed relation_type. Fixed via find_replace to use the prose phrase double-bracket wikilink markers instead.

**Lesson captured**: this kind of `links_to` DB corruption is a basic-memory parser bug that should be reported upstream — body-text wikilinks should not auto-create relation entries when targets can't resolve, and backtick code spans should be respected. Mitigation in the meantime: avoid wikilink syntax for non-Brain-note references (skill names, hypothetical examples) AND avoid the literal double-bracket characters in prose discussing wikilinks — use prose phrases instead.

Bi-dir closure now complete. Next: commit + Phase 3 syntactic validation → ADR coverage gate → Gate A → Gate B → flip ACCEPTED → set-part-done.

## Event 29 — Phase 3 + ADR coverage PASS; Gate A HALT (9 flagged REQs)

Phase 3 syntactic validation: PASS. Filenames kebab + CAPS-prefix correct (62 children + root); zero forbidden relation types; final two sections Observations→Relations on all sampled notes; observations ≥3; titles match H1. Fixed 134 wikilink-colon violations in SPEC-008 root (deliberately authored without colons during the DB-corruption window) via dispatched agent — commit `90789a7`.

ADR coverage gate: PASS. ADR-001/002/003/005 (SPEC-008 source ADRs) each have exactly one `implemented_by [[SPEC-008: Protocol Hardening Wave 2]]`. ADR-004 (Cross-Source Coordinator) is unrelated to SPEC-008 — covered by SPEC-002.

Gate A (analyst semantic gap, dispatched a89b2cbd14bdb62af): **HALT — 9 flagged REQs**. Findings are reviewer-asymmetry catches where two implementers would build materially different things:

| REQ | Verdict | Finding |
|---|---|---|
| REQ-004 | VAGUE | path-traversal AC doesn't pin the detection mechanism (literal `..`? path.resolve containment? symlink-resolved?) |
| REQ-005 | DIVERGENT | brief "contains X" ACs not mechanical — substring vs section-header vs regex unpinned; defeats the anti-drift purpose |
| REQ-006 | VAGUE | fixture "self-documenting / realistic" is reviewer-judgment, not pass/fail |
| REQ-007 | VAGUE | drift-marker test-to-surface mapping unpinned; implementer could mark 5 arbitrary tests |
| REQ-009 | VAGUE | Brain-note `_shared/`→`shared/` path-rewrite preservation scope (which notes keep the literal) requires per-note judgment |
| REQ-010 | RUNTIME-JUDGMENT | `validates`-replacement verb "recommended" not pinned per-note |
| REQ-011 | RUNTIME-JUDGMENT (highest impact) | blocking vs non-blocking schema-issue partition is illustrative, not definitive — the load-bearing HYBRID failure-mode boundary |
| REQ-012 | VAGUE | "modified during the turn" enumeration mechanism unspecified (transcript? git-diff? mtime?) |

Analyst gave concrete suggested refinements for each. Per /spec Gate A semantics: refine the flagged REQs, re-run Gate A. Dispatching a refinement agent with the 8 specific fixes (REQ-006 had two sub-findings folded into one). REQ-011's failure-partition is the priority fix.

Gate B (critic 4 binary checks) errored mid-run (internal tool error) — re-dispatching in parallel.

## Event 30 — Gate B remediation + Gate A refinement; both gates PASS

Gate B first run: HALT on check (c) — TASK-017 + TASK-034 were empty stubs (frontmatter permalink only; Track 2 + Track 4 Pattern-2 writes that never materialized bodies). Checks (a) REQ→ADR, (b) scope conservation, (d) Scope-In match all PASSed first run (12/12 REQs trace to ADR-005; Track 5 4→5-track expansion documented via D-8 Phase 3 addition).

Remediation: deleted both stubs, re-authored full bodies via Pattern 2 — TASK-017 (render-plan-note + set-part-done scripts, implements REQ-004; 87 lines) + TASK-034 (Audit C hygiene repair, 6 categories / 10 notes, implements REQ-010; 81 lines). Also caught + fixed TASK-035 frontmatter title missing its colon (Phase 2 miss by Track 4 agent). Commit `d057dda`.

Gate A first run: HALT — 9 findings across 8 REQs (REQ-008 clean). All were "two implementers build different things" gaps. Dispatched refinement agent (acfaaa62306b4164e) to pin each flagged AC to a mechanical assertion:

- REQ-004: path-containment pinned to `resolved === projectRoot || startsWith(projectRoot + path.sep)` + 3 named adversarial cases (banned bare `.startsWith`)
- REQ-005: brief "contains" ACs bound to `validRelationTypes.every(v => stdout.includes(v))` + literal marker strings
- REQ-006: fixture self-documentation → parseable `<!-- drift-marker: ...; expected-reject: <regex> -->` HTML-comment contract
- REQ-007: drift-marker surface-to-test mapping pinned for the 5 named surfaces + no-arbitrary-marker clause
- REQ-009: `_shared/` preservation scope enumerated (SESSION-all + ADR-005 + ANALYSIS-004 + RETRO-003 preserve; all other SPEC/REQ/DESIGN/TASK rewritten)
- REQ-010: `validates`→`depends_on` pinned MUST for all 4 named notes (dropped "recommended")
- REQ-011 (highest impact): blocking/non-blocking partition made definitive — 9 named status-flip claim validators = deny; all other superRefine schema issues = allow + additionalContext (derives directly from D-8's locked HYBRID semantics)
- REQ-012: turn-modification enumeration pinned to `git status --porcelain` (chosen over transcript-parsing + mtime-scanning)

Commit `b4ae304`.

Re-run results:

- **Gate A re-run** (ad7cd3dde88b096b3): `GATE A PASS` — all 8 refined REQs VERIFIABLE
- **Gate B check (c) re-verify**: 46/46 TASKs trace to ≥1 REQ (was 44/46); zero orphans. Combined with first-run (a)/(b)/(d) PASS → **GATE B PASS**

All /spec Stage 2 gates clear: Phase 3 syntactic PASS, ADR coverage PASS, Gate A PASS, Gate B PASS. SPEC-008 root born ACCEPTED (status set at authoring per Stage 2 Step 5 invariant). Next: PLAN-001 spec.SPEC-008 → DONE; build.SPEC-008 PENDING → READY; dashboard update; set-part-done.

## Event 31 — spec.SPEC-008 set-part-done; build.SPEC-008 READY

/spec Stage 2 complete for SPEC-008. All gates PASS. Applied set-part-done to PLAN-001:

- spec.SPEC-008 part: Substatus IN_PROGRESS → DONE; Completing Session SESSION-2026-05-23_02; Outcome line written (63 notes; ADR coverage + Gate A + Gate B all PASS); all 8 DoD checkboxes flipped `[x]`
- build.SPEC-008 part: Substatus PENDING → READY (dependency spec.SPEC-008 now DONE)
- Progress Dashboard: spec 7 DONE + 1 IN_PROGRESS → 8 DONE; build 1 PENDING + 1 IN_PROGRESS → 1 IN_PROGRESS + 1 READY; totals PENDING 1→0, IN_PROGRESS 2→1, READY 0→1, DONE 22→23 (of 25)
- Cross-Part Dependency Graph: added 3 missing Wave 2 nodes (decisions_4 done, spec_SPEC_008 done, build_SPEC_008 ready) + `ready` classDef + edges protocol_hardening → decisions_4 → spec_SPEC_008 → build_SPEC_008; updated class assignments. Graph was stale (Wave 2 parts never added since the reopen).

Workaround note: PLAN-part Outcome bullet could not use the `**Outcome**: [[wikilink]]` form (basic-memory strict parser rejects `[[` after a non-relation bullet prefix) — used plain-text "SPEC-008 Protocol Hardening Wave 2" reference instead. SPEC-008↔PLAN-001 graph linkage preserved via SPEC-008's `part_of [[PLAN-001: Skills Ecosystem]]` relation.

**PLAN-001 state**: 23/25 parts DONE. Remaining: build.SPEC-008 (READY — next available), protocol-hardening (IN_PROGRESS umbrella; flips DONE when build.SPEC-008 DONE). review + end parts were Wave 1 closures already DONE; PLAN frontmatter status flip to DONE happens after build.SPEC-008 + protocol-hardening close.

**Next available**: build.SPEC-008 — re-invoke `/skills:plan PLAN-001-skills-ecosystem` to auto-route to /build for the 46-TASK Wave 2 implementation (per-TASK build+QA cycle; TASK-029 `_shared`→`shared` rename runs FIRST per dependency graph).


## Event 32 — /plan continue → build.SPEC-008 IN_PROGRESS; PAUSED for fresh-session build marathon

User invoked `/skills:plan PLAN-001-skills-ecosystem` (3rd continue). Single READY part: build.SPEC-008 (spec.SPEC-008 DONE; protocol-hardening is the IN_PROGRESS umbrella, not auto-routable). Branch `feat/plan-001-protocol-hardening-wave-2-scope` retained (non-main; branch policy allows).

Orchestrator surfaced the build pacing decision: build.SPEC-008 is a 46-TASK marathon through the rigid per-TASK build+QA cycle (steps a-u each; impl + qa dispatch + TEST-REPORT + multiple commits per TASK) with a cross-track dependency graph. ~2-3x the SPEC-008 authoring workload that was pause-and-resume-fresh at Event 25. This session is heavy (31 events + DB-corruption recovery + full SPEC authoring).

User locked (AskUserQuestion): **Fresh session (Recommended)** — flip build.SPEC-008 → IN_PROGRESS + commit durable state now, then PAUSE; resume in a clean session with full token budget.

PLAN-001 edits applied:

- build.SPEC-008 part: Substatus READY → IN_PROGRESS; Owning Session SESSION-2026-05-23_02
- Progress Dashboard: build IN_PROGRESS 1→2, READY 1→0; total IN_PROGRESS 1→2, READY 1→0 (23 DONE / 25)
- Cross-Part Dependency Graph: build_SPEC_008 node ready (🔵) → inprogress (⚡); class moved to inprogress group alongside protocol_hardening

Session status flipped IN_PROGRESS → PAUSED.

## Resume protocol (next session)

1. `/skills:plan PLAN-001-skills-ecosystem` — continue mode
2. Plan continue identifies build.SPEC-008 is IN_PROGRESS (not READY) — auto-resumes via /build (Stage A) for the per-TASK cycle
3. /build reads the SPEC-008 subtree + complexity_tier (TIER_4) + the PlanNote renderer emits per-TASK impl + qa instruction blocks
4. **Build order (cross-track dependency graph)**:
   - FIRST: TASK-029 (`_shared/` → `shared/` rename) — every other TASK cites post-rename paths
   - THEN Track 1 (TASK-001..010 schemas/parsers/validators) — unblocks Tracks 2/3/5
   - THEN Track 4 cleanup (TASK-030..036) + Track 3 harness (TASK-021..023, 025..028) in parallel where files disjoint
   - THEN Track 2 scripts (TASK-011..020, need Track 1 validators) + Track 3 TASK-024 (needs Track 1 validators)
   - THEN Track 5 hooks (TASK-037..046, need Track 1 validators + Track 3 fixtures for smoke tests)
5. Per-TASK rigid cycle steps a-u; QA writes TEST-REPORT per TASK; PLAN impl/qa items transition with owning_session + at_event context
6. On all 46 TASKs DONE: spec-level QA coverage sweep → 4 exit gates → SPEC-008 IN_PROGRESS → DONE
7. build.SPEC-008 → DONE → protocol-hardening umbrella → DONE → PLAN-001 frontmatter status → DONE (Wave 2 closes the PLAN)

## Session 23 final deliverables (this session, across the pause/resume)

- 5 parallel audits → ANALYSIS-004 omnibus
- ADR-005 ACCEPTED (8 D-Ns: D-1..D-8 incl. D-8 automated enforcement hooks); decisions.4 DONE
- SPEC-008 authored: 63 notes (12 REQ + 4 DESIGN + 46 TASK + root) across 5 parallel architect tracks; spec.SPEC-008 DONE
- All /spec gates PASS: Phase 3 syntactic + ADR coverage + Gate A (9 REQs refined) + Gate B (2 empty TASKs authored)
- basic-memory DB corruption resolved (user-authorized reset --reindex)
- build.SPEC-008 → IN_PROGRESS (ready for fresh-session build marathon)
- PLAN-001: 23/25 parts DONE; 2 IN_PROGRESS (build.SPEC-008 + protocol-hardening umbrella)
- Commits this turn: Wave 1 (89f35cb) → SPEC root (06d2c9f) → ADR wikilink fix (1f06eca) → bi-dir + DB recovery (409e6ba) → Event 28 (213422f) → wikilink colons (90789a7) → Gate B fix (d057dda) → Gate A fix (b4ae304) → set-part-done (73f8db7) → build.SPEC-008 IN_PROGRESS + pause (this commit)


## Event 33 — Session resumed from PAUSED; build.SPEC-008 marathon begins

User invoked `/skills:plan PLAN-001-skills-ecosystem` (continue mode) in a fresh context window. Orchestrator initially mis-created a new session note `SESSION-2026-05-23_03`; user corrected — a PAUSED session for this exact work already exists, so the correct action is to resume THIS session, not branch a new one. The `_03` note was deleted (never committed; working tree returned clean). Learning: "fresh session" at Event 32 meant a fresh Claude Code context window, NOT a new Brain session note; a PAUSED session is resumed via `PAUSED → IN_PROGRESS` with continued Event numbering.

Rehydration (session-resume protocol) completed: read PLAN-001, SPEC-008 subtree (root + 12 REQ + 4 DESIGN + 46 TASK), this session's events, git state (clean tree; HEAD `91ef7bc`).

Actions:

- This session status PAUSED → IN_PROGRESS.
- State section updated (spec.SPEC-008 DONE; build.SPEC-008 IN_PROGRESS; build order; next step).
- build.SPEC-008 already IN_PROGRESS in PLAN-001 with owning_session SESSION-2026-05-23_02 — no PLAN rebind needed (the `_03` rebind was reverted with the deletion).
- Next: dispatch `Skill(skill="build", args="plan=PLAN-001 part=build.SPEC-008 spec=SPEC-008")` for Stage A — seed per-TASK impl+qa workflow items into PLAN, then begin TASK-029.

Deferred (known drift, non-blocking): this note has pre-existing structural drift — `## Observations`/`## Relations` sit after Event 01 instead of at the end, duplicate `## Event 28` headings, non-canonical `## Resume protocol` / `## deliverables` sections. Overlaps the Brain-note hygiene scope (TASK-034); not restructured mid-marathon to avoid churn.


## Event 34 — TIER_4 build approach approved; PoC = TASK-029 + TASK-001

/build Step 2.5 TIER_4 oversight gate. AskUserQuestion → user LOCKED option (a) "PoC: rename + 1st schema":

> Run pre-mortem → record risks → seed the 92 impl/qa workflow items into the PLAN → execute TASK-029 (`_shared`→`shared` rename) + TASK-001 (ADR schema) through the full rigid per-TASK cycle → PAUSE for sign-off on the established pattern, then continue the remaining 44 TASKs across sessions.

Step 1 inputs validated: complexity_tier TIER_4 (PLAN authoritative); SPEC-008 ACCEPTED; subtree complete (root + 12 REQ + 4 DESIGN + 46 TASK). Next: Step 3 pre-mortem (delegated to analyst) → seed build workflow items → PoC cycle (TASK-029 then TASK-001) → pause.


## Event 35 — Pre-mortem complete; 3 critical build risks recorded in PLAN ## Risks

/build Step 3. Delegated pre-mortem to brain:🧠-analyst (prospective hindsight against the SPEC-008 subtree; agent `ac2a239c193c2e396`). Top 3 critical build risks recorded in PLAN-001 `## Risks` (new section before `## Phase Progression`):

- R1 — `_shared`→`shared` rename cascade breaks mid-build (config files + ~549 doc refs; surfaces 5-10 TASKs late). Mitigation folded into TASK-029 brief (config checklist + post-rename tsc/biome gate + QA canary import).
- R2 — hook handlers untestable without live Claude Code runtime (matchers silently fail → unenforced enforcement, the Wave 1 failure). Mitigation folded into TASK-046 brief (per-layer integration proof; document MCP matcher; BLOCKED over untested-DONE).
- R3 — cross-track barrel-index / `common.ts` collisions. Already prevented by the rigid one-TASK-at-a-time cycle; `common.ts` single-owner.

No risk invalidates the SPEC (no `build-step3-spec-invalidated-halt`). Next: seed the 92 build workflow items into build.SPEC-008, then begin PoC TASK-029.


## Event 36 — impl-TASK-029 PENDING → IN_PROGRESS; PoC build begins (rename)

/build Stage A — TASK-029 (`_shared/`→`shared/` rename; Track 4 dependency root, executes FIRST). PLAN build.SPEC-008 `impl-TASK-029-SPEC-008`: PENDING → IN_PROGRESS (owning_session SESSION-2026-05-23_02; at Event 36). PoC items TASK-029 + TASK-001 seeded into build.SPEC-008 (remaining 44 deferred to per-track seeding on resume). Next: dispatch brain:🧠-implementer with TASK-029 DoD verbatim + R1 mitigation (config-file checklist + mandatory post-rename `bun tsc --noEmit` + `biome check` + diff review).


## Event 37 — TASK-029 impl complete (rename); DoD item 3 deferred to Track 4 doc-hygiene

brain:🧠-implementer (agent `a0116bbeb5c5200d9`) renamed `_shared/`→`shared/`. Evidence: `bun test` 590 pass / 2 pre-existing fail / 592 (identical to baseline); `bun tsc --noEmit` exit 0 (in-scope); `biome check` clean; canary import verified + deleted; 186 files changed (166 renames + 32 path-line edits across configs / SKILL.md / scripts / README / CHANGELOG / KICKOFF). No stray `_shared/` in production code/config.

DoD: items 1-2, 4-9 satisfied `[x]`. **Item 3 DEFERRED** per user decision (AskUserQuestion this event) → dedicated Track 4 doc-hygiene sweep: flip `_shared/composition` in ~171 live Brain notes (folds into TASK-034 hygiene scope; historical-immutability scope for completed QA-000..043 + SPEC-001..007 subtrees + ADR-002/003 resolved there). Tracking: TASK-029 DoD item 3 annotation + this event + session State.

Pre-existing latent (NOT a rename regression): skill scripts (`ingest`/`parse`/`audit`) + `migrate-plan-001…ts` show `Cannot find name 'Bun'` / `import.meta.dir` LSP errors — outside the root tsconfig `include`, so `tsc --noEmit` passes while the LSP flags them. Flagged for a config-coherence follow-up (relevant to Tracks 1/2/5 which add many new scripts).

PLAN `impl-TASK-029-SPEC-008`: IN_PROGRESS → DONE (at Event 37). Next: commit (code rename + state), then qa-TASK-029 cycle.


## Event 38 — qa-TASK-029 PENDING → IN_PROGRESS; dispatching QA

PLAN `qa-TASK-029-SPEC-008`: PENDING → IN_PROGRESS (owning_session SESSION-2026-05-23_02; at Event 38). Next: dispatch brain:🧠-qa to independently validate TASK-029 DoD (items 1-2,4-9; item 3 deferred) + REQ-009 acceptance criteria with evidence; QA returns per-checkbox findings + verdict; orchestrator authors the QA note (binary rule — QA agent does not write docs/**).


## Event 39 — qa-TASK-029 PASS; TASK-029 DONE (rename closed)

brain:🧠-qa (agent `a73fb5d28f9461d35`) independently re-validated TASK-029 against committed state. Verdict **PASS** — DoD items 1-2,4-9 PASS with command evidence; item 3 deferral ruled sound; REQ-009 ACs PASS. QA contract note authored: [[QA-044-SPEC-008: Rename Shared Composition Directory]] (created via Pattern 2; a transient `move_note` tmp-rename failure left a duplicate — recovered via delete_note + filesystem cleanup + clean re-create).

State: TASK-029-SPEC-008 status TODO → DONE; `relates_to [[QA-044-SPEC-008: Rename Shared Composition Directory]]` added (bi-dir). PLAN `qa-TASK-029-SPEC-008`: IN_PROGRESS → DONE (Test Report Ref QA-044; at Event 39).

**TASK-029 (rename) CLOSED** — full rigid per-TASK cycle (a–u) demonstrated end-to-end. Flagged for attention: 2 pre-existing defrag-delegation test failures (out of scope); skill-script tsconfig `Bun`-type gap (config-coherence follow-up).

Next (PoC): TASK-001 (ADR schema) — the representative schema→parser→validator pattern.


## Event 40 — PoC paused after TASK-029; resume fresh for TASK-001

User decision (AskUserQuestion): "Pause; run TASK-001 fresh." TASK-029 (rename) fully CLOSED (impl + qa PASS; commit `8144429`). Pausing the build marathon at a clean state; remaining PoC TASK-001 (ADR schema — the representative schema→parser→validator pattern) runs in a fresh context with full token budget, then user signs off before the remaining 44 TASKs. Session status IN_PROGRESS → PAUSED.

### Resume protocol (next context)

1. `/skills:plan PLAN-001-skills-ecosystem` (continue mode).
2. Continue **resumes THIS session** (SESSION-2026-05-23_02, PAUSED) — flip PAUSED → IN_PROGRESS, continue Event numbering. DO NOT create a new session note (Event 33 lesson; [[feedback_resume_paused_session_not_new]] equivalent).
3. build.SPEC-008 is IN_PROGRESS (owning_session SESSION-2026-05-23_02). Resume /build Stage A at TASK-001 (impl-TASK-001 + qa-TASK-001 already seeded PENDING in PLAN).
4. Run the rigid per-TASK cycle (a–u) for TASK-001: impl → ADR schema → DoD flip → impl DONE → commit → qa → QA-045 note → qa DONE → commit.
5. After TASK-001: PAUSE for user PoC sign-off on the schema pattern before the remaining 44 TASKs.
6. Then marathon: seed remaining items per-track; order Track 1 (TASK-002..010; 001 done) → Track 4 cleanup (incl. TASK-034 doc-hygiene sweep for the deferred ~171-note citation flip) → Track 3 harness → Track 2 scripts → Track 5 hooks (TASK-046 LAST, with R2 mitigation).

### Open items for the marathon

- DEFERRED: ~171 live Brain-note `_shared/composition` citation flip → Track 4 (TASK-034); historical-immutability scope resolved there.
- DECIDE: 2 pre-existing `defrag.test.ts` delegation failures (hash-mismatch + boom) — fix / track / accept.
- CONFIG-COHERENCE: skill scripts + `migrate-plan-001…ts` outside root tsconfig bun-typed `include` (affects Tracks 1/2/5 tsc gate).
- TOOLING: basic-memory `move_note`/`edit_note` transient failures — expect + retry across remaining TASKs.


## Event 41 — Session resumed from PAUSED (2026-05-23 23:56 PDT); PoC TASK-001 begins

User invoked `/skills:plan PLAN-001-skills-ecosystem` (continue mode) in a fresh context window. Per the Event 40 resume protocol + paused-session-resume rule, RESUMED THIS session (no new note): status PAUSED → IN_PROGRESS; State refreshed; Event numbering continued.

Rehydration checklist completed (TIER-1): re-read TIER-1 protocol memories (per-task-build-qa-cycle, workflow-phase-rigor, post-compaction-rehydration, session-protocol, resume-paused-session); set active project `skills` + bootstrap_context; read PLAN-001 (build.SPEC-008 IN_PROGRESS; impl/qa-TASK-001 seeded PENDING) + this session's Events 01–40; read TASK-001-SPEC-008 subtree (TASK DoD + REQ-001 AC + DESIGN-001 compliance) for the dispatch brief; git state clean (HEAD `f7ea73e`, branch `feat/plan-001-protocol-hardening-wave-2-scope`).

State confirmed: TASK-029 (rename) CLOSED (impl + qa PASS; commit `8144429`). No pending user decisions block TASK-001 (open items are marathon-time: ~171-note citation flip → Track 4 / TASK-034; defrag test failures; tsconfig bun-type gap; basic-memory transient flakiness).

Next: rigid per-TASK cycle a–u for TASK-001 (ADR schema). Step (a) — PLAN `impl-TASK-001-SPEC-008` PENDING → IN_PROGRESS.


## Event 42 — impl-TASK-001 PENDING → IN_PROGRESS; dispatching implementer (ADR schema)

/build Stage A — TASK-001-SPEC-008 (Implement ADR Schema; Track 1, depends_on TASK-029 rename which is DONE). PLAN `impl-TASK-001-SPEC-008`: PENDING → IN_PROGRESS (owning_session SESSION-2026-05-23_02; at Event 42).

Scope: ONE TASK only — author `shared/composition/src/schemas/adr-note.ts` (`AdrNoteSchema` + `type AdrNote`) + unit tests + barrel re-export. Build contract = TASK-001 DoD (12 items) + relevant slice of [[REQ-001-SPEC-008: New Schema Suite]] AC (the two ADR-specific GIVEN/WHEN/THEN clauses) + [[DESIGN-001-SPEC-008: Coverage Module Layout]] compliance (naming/barrel/common.ts-single-source).

R1-related guardrail folded into brief: post-author `bun tsc --noEmit` (root) + `biome check` + `bun test` on the new test file must pass. Implementer writes CODE + tests only; returns `## State Changes` with per-DoD evidence; does NOT edit Brain notes (orchestrator flips TASK DoD checkboxes after claim validation).

Next: dispatch brain:🧠-implementer (foreground) with the verbatim rendered impl brief.


## Event 43 — TASK-001 impl complete (ADR schema); orchestrator-verified; impl-TASK-001 → DONE

bun-ts-engineer (agent `a87f3a4a17661630e`) authored `AdrNoteSchema`. Files (3, scope-clean — no unrelated edits):

- `shared/composition/src/schemas/adr-note.ts` NEW — `AdrNoteSchema` + `type AdrNote`; Zod + `superRefine` (2 ACCEPTED-gate rules: unchecked Clarification rejection + option-without-rationale rejection); `.strict()` on all sub-schemas; relation-verb allowlist imported from `common.ts`; final-two-sections invariant.
- `shared/composition/src/schemas/index.ts` NEW barrel — `export { AdrNoteSchema, type AdrNote } from "./adr-note.js";`
- `shared/composition/tests/schemas/adr-note.test.ts` NEW — 22 cases.

**Orchestrator independent verification** (did NOT trust the claim — re-ran all gates): `bun test tests/schemas/adr-note.test.ts` → 22 pass / 0 fail; `bunx tsc --noEmit` → exit 0; `biome check` (3 files) → clean; full suite 528 pass / 2 fail / 530 (baseline 506+22 new = 528; zero new failures). All 12 DoD items + 3 ADR Compliance items verified SATISFIED → flipped `[x]` in [[TASK-001-SPEC-008: Implement ADR Schema]].

PLAN `impl-TASK-001-SPEC-008`: IN_PROGRESS → DONE (at Event 43). TASK frontmatter status stays TODO until qa PASS (step s).

**Flags from implementer (verified, tracked for the pause):**
- Stale baseline label corrected: the 2 pre-existing suite failures are `TASK-014-SPEC-007: PLAN-001 trimmed-template migration` (AC#1 no-forbidden-sections + AC#3 SHA-256 round-trip), NOT `defrag.test.ts` as the session State open-item said. These correspond to DEFERRED SPEC-007 work (REQ-012 status DEFERRED per ADR-005 D-6). Open-item label to be corrected at pause.
- `src/schemas/index.ts` did not previously exist (DESIGN-001 marked it MODIFIED, implying it existed). Created fresh with only the ADR export (other Wave 2 schema files are out of scope; exporting them would break tsc). Mechanical execution of the explicit DoD/DESIGN contract.

Next: step (i) commit (code + PLAN + TASK + session atomic) → then qa-TASK-001 cycle (steps j–u).


## Event 44 — qa-TASK-001 PENDING → IN_PROGRESS; dispatching QA (ADR schema)

PLAN `qa-TASK-001-SPEC-008`: PENDING → IN_PROGRESS (owning_session SESSION-2026-05-23_02; at Event 44; paired impl DONE precondition satisfied). Next: dispatch brain:🧠-qa (foreground) to INDEPENDENTLY validate each TASK-001 DoD item + the ADR-scoped REQ-001 AC clauses + DESIGN-001 compliance points with concrete evidence (file:line, test name, command output). QA returns per-checkbox findings + verdict ONLY; orchestrator authors the QA-045 contract note (binary rule — QA agent does not write docs/**).


## Event 45 — qa-TASK-001 PASS; TASK-001 DONE (ADR schema closed); PoC complete

brain:🧠-qa (agent `ab7f85c79f1bcb8dc`) independently re-validated TASK-001 against committed state (impl `63fea62`; qa-IN_PROGRESS `a06477c`). Verdict **PASS** — all 12 DoD + 3 ADR Compliance + 4 in-scope REQ-001 ACs + 5 DESIGN-001 compliance points PASS with source-line + command evidence; QA re-ran `bun test` (22/22 scoped), `tsc` (exit 0), `biome` (clean); confirmed zero new suite failures (the 2 pre-existing `plan-001-migration.test.ts` failures are DEFERRED SPEC-007 work). QA wrote no Brain note (binary rule).

Orchestrator actions (steps o–t):

- Authored QA contract note QA-045-SPEC-008 via Pattern 2 (counter-checked: QA-044 was latest → QA-045; kebab filename + colon title verified). Uses `relates_to` (NOT forbidden `validates` — Audit C lesson).
- TASK-001 note: frontmatter status TODO → DONE; added a `relates_to` edge to QA-045-SPEC-008 (bi-dir; QA-045 carries the inverse).
- PLAN `qa-TASK-001-SPEC-008`: IN_PROGRESS → DONE (Test Report Ref QA-045; at Event 45).

**TASK-001 (ADR schema) CLOSED** — full rigid per-TASK cycle (a–u) demonstrated for the representative Track-1 schema pattern.

**PoC COMPLETE (TASK-029 rename + TASK-001 ADR schema).** Per Event 40 + Event 34 plan: PAUSE for user sign-off on the established schema→parser→validator pattern before the remaining 44 TASKs. Session → PAUSED after commit.

### Open items carried to the marathon (corrected + tracked)

- CORRECTION: the 2 pre-existing suite failures are `plan-001-migration.test.ts` (`TASK-014-SPEC-007` AC#1 + AC#3), NOT `defrag.test.ts` as earlier State said. Both correspond to DEFERRED SPEC-007 work (REQ-012 DEFERRED per ADR-005 D-6). DECIDE at marathon start: fix / track / accept.
- DEFERRED: ~171 live Brain-note `_shared/composition` citation flip → Track 4 (TASK-034).
- CONFIG-COHERENCE: skill scripts + `migrate-plan-001…ts` outside root tsconfig bun-typed `include` (affects script-heavy Tracks 2/5; Track 1 schemas unaffected — they're in tsc scope).
- TOOLING: basic-memory `move_note`/`edit_note` transient failures — expect + retry. Also: edit_note rejects double-bracket entity refs placed mid-prose in a bullet — keep Event-bullet entity refs as plain text, or lead the bullet with a typed relation verb.

### Resume protocol (next context)

1. `/skills:plan PLAN-001-skills-ecosystem` (continue mode) → RESUMES THIS session (PAUSED → IN_PROGRESS; continue Event numbering; do NOT create a new note).
2. build.SPEC-008 IN_PROGRESS. Marathon order: Track 1 remainder (TASK-002..010) → Track 4 cleanup (incl. TASK-034 doc-hygiene + the 2-failure decision) → Track 3 harness → Track 2 scripts → Track 5 hooks (TASK-046 LAST, R2 mitigation).
3. Seed each track's impl+qa workflow items into PLAN just-in-time as the track begins.


## Event 46 — PoC SIGNED OFF; marathon continues this session; parallelism analysis first

User adjudicated (AskUserQuestion) the PoC sign-off. Selected option verbatim: **"Approve + continue now"** — "Sign off and immediately start the marathon in THIS session, beginning Track 1 remainder TASK-002 (ANALYSIS schema). Risk: a 44-TASK marathon (each with impl+QA dispatch + multiple commits) will exhaust this context well before completion, likely forcing a mid-track pause." User refinement (verbatim): **"I'd also like us to make sure we've done analysis and established what work can be done in parallel."**

Decision locked: pattern APPROVED; marathon proceeds in this session (session stays IN_PROGRESS). Before fanning out builds, run a dependency + file-ownership analysis across the 44 remaining SPEC-008 TASKs to establish safe parallel groups, then surface the parallelization approach for user decision.

Parallelism reconciliation constraints (orchestrator pre-analysis):

- Rigid cycle is one-TASK-per-agent + per-TASK QA gate + no integrate-later. Parallelism must keep each TASK as its own full impl→QA→done cycle; it may only fan out across INDEPENDENT TASKs (disjoint Files Affected + no in-flight dep).
- Shared serial surfaces: the PLAN note + session note + git commits are single mutation points — orchestrator bookkeeping is serial even when agent builds run concurrently. Barrel index files (`schemas/index.ts`, `parsers/index.ts`, `validators/index.ts`) are multi-TASK contention points within Track 1.
- TASK-029 + TASK-001 already DONE.

Next: dispatch brain:🧠-analyst (read-only) for the dependency DAG + parallel-wave grouping + file-contention flags; synthesize; AskUserQuestion on the parallelization approach.


## Event 47 — Parallelism analysis returned (brain:🧠-analyst, read-only)

Agent `a72742cc285442ea9` analyzed the 44 remaining TASKs (depends_on DAG + Files Affected ownership map). Key findings:

- **6 waves** (W0–W5), critical path 6 waves. Counts: W0=8 indep · W1=19 (sub-waves 1a–1e) · W2=6 · W3=3 · W4=7 · W5=1 (TASK-046 terminal). Total 44 ✓.
- **W0 (zero deps, disjoint files; 8 TASKs)**: 021, 025, 026, 033, 034, 037, 039, 040.
- **Primary bottleneck = barrel index files**: `schemas/index.ts` (TASK-002/003/004/010), `parsers/index.ts` (005/006), `validators/index.ts` (007/008/009/010) — multiple TASKs MODIFY the same barrel → forced serialization even when otherwise independent. `validators/index.ts` chain (010→007→008→009) is the longest serial constraint.
- **REQ-003 gate**: Track 5 hook handlers (038, 041–045) + Track 3 TASK-024 + TASK-046 all blocked until the 4 validators (007/008/009/010) complete (end of W3).
- **Brain-note-only TASKs** (031/033/034/035/036) use MCP, never conflict with code files at the file level.
- **TASK-046 hard terminal** (smoke-tests all handlers + reuses adversarial fixtures).
- **Analyst's practical ceiling: 4–5 concurrent builds/wave** — the PLAN/session/commit serial surface + serial QA processing bound real throughput; barrel files force sub-serialization.

Protocol tension to adjudicate: the TIER-1 hard-locked per-TASK cycle says "one TASK at a time / no parallel-per-SPEC." Its lesson-source violation was PARALLEL BUILDS WITH NO PER-TASK QA GATE (integrate-later). Parallelism is reconcilable only if every TASK retains its own independent QA gate before DONE. Surfacing the parallelization-approach decision to the user next.


## Event 48 — Parallelization approach LOCKED: bounded parallel builds + per-TASK QA

User adjudicated (AskUserQuestion). Selected verbatim: **"Bounded parallel builds + per-TASK QA"** — "Within a wave, dispatch up to ~4 INDEPENDENT implementer builds concurrently (disjoint code files; barrel-index TASKs serialized; deps satisfied). As each returns, I run that TASK's OWN independent QA gate + QA note before flipping it DONE; all PLAN/session/commit bookkeeping stays serial. Overlaps build latency without weakening the QA gate. Requires you to authorize relaxing the literal 'one-at-a-time' wording (the QA-gate invariant — the actual point of the lock — stays intact). Moderate added coordination."

Authorization recorded: the literal "one-TASK-at-a-time" wording of the per-TASK build+QA hard-lock is RELAXED for SPEC-008 build to allow ≤4 concurrent file-disjoint implementer builds. The protected invariant is PRESERVED: every TASK keeps its own independent QA gate + QA contract note before flipping DONE; NO integrate-later / batched-QA. Code-only implementer agents never touch Brain notes (binary rule), so concurrency is collision-free on PLAN/session; barrel-index files (`schemas|parsers|validators/index.ts`) + any shared code/test file force same-batch exclusion.

Agent routing by TASK type within the cycle: code TASKs → bun-ts-engineer; Brain-note TASKs (031/034/035/036 + SPEC-007 root 031) → brain:🧠-memory or orchestrator-direct Brain MCP; user-doc TASK-033 (`~/KNOWLEDGE-GRAPH-STRUCTURES.md`) → Edit tool. Each still runs its impl→QA cycle.

Wave plan + bounded-parallel per-wave protocol encoded into PLAN build.SPEC-008 (Build Sequencing subsection). Next: seed + execute Wave 0 first batch.


## Event 49 — Wave 0 batch 1 START (bounded-parallel): impl-TASK-021/025/026 → IN_PROGRESS

First bounded-parallel batch (3 file-disjoint, dep-satisfied, non-barrel Track-3 test-infra TASKs). Seeded + transitioned to IN_PROGRESS (owning_session SESSION-2026-05-23_02; at Event 49):

- impl-TASK-021 — adversarial-claim test harness → `tests/_helpers/adversarial.ts`
- impl-TASK-025 — integration parse→mutate→validate→render + 2 cross-note tests → `tests/integration/*.test.ts` + `tests/fixtures/integration/`
- impl-TASK-026 — mutation backward-transition + idempotency tests → `tests/mutation-invariants.test.ts`

File-disjointness confirmed (no shared file, no barrel). Dispatching 3 bun-ts-engineer implementers concurrently (foreground). Each brief: read existing composition API (parsers/validators/mutations/renderers) + relevant DESIGN/REQ; build code+tests only; no Brain-note edits; return per-DoD evidence. On return (serialized): per-TASK verify → impl→DONE → commit → qa gate → QA note → qa→DONE. No TASK flips DONE without its own QA PASS.


## Event 50 — TASK-021 impl complete + parallel-batch recovery; impl-TASK-021 → DONE; TASK-025 partial scrap; TASK-026 partial salvage

Wave 0 batch 1 returned partial: bun-ts-engineer `a54e71eb3026bc1cb` succeeded for TASK-021 with full State Changes; TASK-025 + TASK-026 dispatch tools errored on RETURN. Diagnosis:

- TASK-021 (adversarial harness): SUCCESS. Files in place; tsc exit 0; biome clean; full suite 528+6=534/2/536 (the +6 is TASK-026 below — TASK-021 itself adds no tests per spec; harness exercised in TASK-023). DoD (10) + ADR/REQ compliance (4) all SATISFIED with file:line evidence. **Notable agent flag**: DESIGN-003's sketch shows `result.valid` / `u.message`; the REAL validator API is `{verdict, total, unsatisfied: {index, text, section?}[]}` — agent adapted to real API (correct per the no-guessing rule) and reported it. The exported harness contract matches DESIGN-003 verbatim; only internal dispatch matched real API. Track for the doc-sync sweep (Track 4) — DESIGN-003 sketch can be aligned to real API in a follow-up edit.
- TASK-026 (mutation invariants): RETURN errored, but agent wrote a complete-looking 230-line `tests/mutation-invariants.test.ts` BEFORE failure. Tests RUN: 6 pass / 0 fail / 11 expect. No agent State Changes report — orchestrator will verify every DoD item from source (the verification step would happen anyway). Salvageable.
- TASK-025 (integration tests): RETURN errored. Agent wrote 6 fixtures to `tests/fixtures/integration/` but NO test files (`tests/integration/` does not exist). Incomplete partial — scrap fixtures + re-dispatch fresh.
- SCOPE CREEP caught + reverted: `skills/defrag/SKILL.md` was reformatted (long-line collapse) — no DoD authorized it, almost certainly a `biome --fix` side-effect from one of the parallel implementers. `git checkout` reverted before any commit. Adding to flags: parallel-implementer biome runs MUST be scoped (`biome check <specific-file>`, never bulk).

Orchestrator actions this turn:

- TASK-021 note: DoD (10) + ADR Compliance (4) flipped `[x]`. PLAN `impl-TASK-021` IN_PROGRESS → DONE (at Event 50). (TASK frontmatter status flips DONE only after qa PASS — step s.)
- Pending in this Event: TASK-025 fixture cleanup + re-dispatch; TASK-026 partial-output verification; then TASK-021 qa dispatch. Atomic commit covers TASK-021 impl + scrap of TASK-025 partial.


## Event 51 — TASK-026 partial salvaged + verified; impl-TASK-026 → DONE

Orchestrator-verified TASK-026's partial output (agent's RETURN errored, but code was complete on disk). Verification:

- Read 230-line `tests/mutation-invariants.test.ts` in full; verified each DoD item from source. 6/6 tests pass (`bun test`); tsc exit 0; biome clean.
- API-discovery quality: agent probed `applyPlanMutation` and found the backward-transition rejection actually fires via the schema cross-field invariant (`qa-DONE requires paired impl-DONE`), NOT a literal direction guard — test asserts on the real error message `/requires paired impl-TASK-001-SPEC-007 to be DONE/`. Includes positive control (forward IN_PROGRESS→DONE succeeds) + asymmetry test (exceeds DoD).
- 3 idempotent mutation types chosen with documented rationale: `flip-dod-item(done:true)` · `lock-decision(same topic)` · `set-part-substatus(DONE→DONE)`. Documented exclusions: transitions consume `from`; add-task throws on duplicate id; add-blocker appends unconditionally.
- DoD (7) + ADR/REQ compliance (2) flipped `[x]`. PLAN `impl-TASK-026-SPEC-008`: IN_PROGRESS → DONE (at Event 51).

Lesson for the marathon (partial-return recovery): when implementer tool surface errors but files were written, run gates → read source → verify each DoD item ourselves. The orchestrator-verification step happens anyway; the missing piece is the attested State Changes report. As long as DoD is verifiable from source + gates pass, salvage is sound.


## Event 52 — Batch 2 dispatches: qa-TASK-021 + qa-TASK-026 + impl-TASK-025 (re-dispatch)

PLAN transitions (3, this Event):

- qa-TASK-021-SPEC-008: PENDING → IN_PROGRESS (owning_session SESSION-2026-05-23_02)
- qa-TASK-026-SPEC-008: PENDING → IN_PROGRESS (owning_session SESSION-2026-05-23_02)
- impl-TASK-025-SPEC-008: stays IN_PROGRESS; Failed Iterations 0 → 1 (prior partial scrapped; fresh re-dispatch)

Dispatching 3 concurrent agents (bounded-parallel; QA agents are file-disjoint by code surface AND author disjoint QA-NNN notes; impl-025 writes to disjoint test files):

- brain:🧠-qa for TASK-021 — validate adversarial harness against TASK-021 DoD + REQ-006 AC-1/AC-3 + ADR-005 D-3.
- brain:🧠-qa for TASK-026 — validate mutation invariants against TASK-026 DoD + REQ-007 AC-4 + ADR-005 D-3 P1.2.
- bun-ts-engineer for TASK-025 (re-dispatch) — integration parse→mutate→validate→render + 2 cross-note tests, with explicit lessons from the first attempt (real API discovery; scope-fenced `biome` invocation; no scope creep).

QA agents return verdicts only; orchestrator authors QA-046 + QA-047 notes. impl-025 returns State Changes for orchestrator verification.


## Event 53 — Batch 2 returns: qa-021 PASS, qa-026 PASS, impl-025 PASS+verified; TASKs 021/026 CLOSED, TASK-025 impl DONE

3-agent concurrent batch returned (qa-021 + qa-026 + impl-025-v2). All clean.

**qa-TASK-021** (agent `a6586bbf1106ddaf1`): PASS. 10 DoD + 4 ADR/REQ + 4 API-drift-verification all PASS. Verified harness uses real `ClaimResult` shape (`{verdict, total, unsatisfied: [{index, text, section?}]}`); zero `.valid`/`u.message` artifacts; `FixtureMalformedError` keeps fixture-authorship debugging distinct from validator-behavior debugging. QA-046-SPEC-008 contract note authored (Pattern 2; uses `relates_to`).

**qa-TASK-026** (agent `a316a0a64e7401b9f`): PASS. 7 DoD + 2 ADR/REQ all PASS. Source-traced confirmation of the backward-transition mechanism (`plan-note.ts:168-179` superRefine fires `qa-DONE requires paired impl-DONE`; transition guard at `plan-mutations.ts:289-328` passes; rejection is invariant-backed). Confirmed 3 idempotent mutations are genuinely idempotent in source. QA-047-SPEC-008 contract note authored.

**impl-TASK-025-v2** (agent `a52e3dce08dee60ca`): PASS (full State Changes returned this time). 12 DoD all SATISFIED. 8 new tests across 3 integration files + 8 fixtures: parse-mutate-validate-render PLAN/SPEC/TASK pipelines + cross-note SPEC-TASK consistency + TEST-REPORT-vs-TASK-DoD cross-validation. Suite 534→542 (+8 pass, 0 new fails). tsc exit 0; biome clean (SCOPED invocation — `biome check tests/integration/ tests/fixtures/integration/`; no scope-creep). Implementer honestly reported 3 API-gap adaptations: no `validatePlanDoneClaim` yet (TASK-010 lands it; used `PlanNoteSchema.safeParse` as equivalent claim contract); no TASK renderer (used `applyCheckboxMutation`'s string-in/string-out re-parser-validated round-trip); no SPEC mutation API beyond model-level edits (in-model edit + `SpecRootNoteSchema.safeParse` + `validateSpecDoneClaim`). Adaptations sound — the TASK-025 acceptance allows "equivalent claim validator for the touched note" for the still-pending validator.

Orchestrator actions (steps o–t, batched across 3 closures):

- TASK-021 note: DoD/Compliance flipped Event 50; status TODO → DONE; `relates_to QA-046-SPEC-008` added.
- TASK-026 note: DoD/Compliance flipped Event 51; status TODO → DONE; `relates_to QA-047-SPEC-008` added.
- TASK-025 note: DoD (12) + ADR/REQ Compliance (4) flipped `[x]` after orchestrator-verified gates. Status TODO holds until qa-025 PASS (step s).
- PLAN `qa-TASK-021`: IN_PROGRESS → DONE (Test Report Ref QA-046).
- PLAN `qa-TASK-026`: IN_PROGRESS → DONE (Test Report Ref QA-047).
- PLAN `impl-TASK-025`: IN_PROGRESS → DONE (Failed Iterations 1 reflects the prior errored attempt).

**TASKs 021 + 026 CLOSED** — both Track 3 test-infra tasks ship; the adversarial harness is callable from TASK-023, and mutation invariants stand as a permanent regression guard. TASK-025 mid-cycle (impl DONE; qa next).

Wave 0 progress: 8 TASKs total. 2 fully CLOSED (021, 026). 1 mid-cycle (025: impl DONE, qa pending). 5 not yet started (025-then-marathon already accounted; 033/034/037/039/040 remain — Brain notes + user doc + hooks scaffolding).

Bounded-parallel observations to carry: (a) concurrent dispatches DO error on the return-channel intermittently (~33% rate in batch 1) — salvage protocol (verify on-disk + run gates + orchestrator-verify DoD-from-source) works; (b) ALL biome calls MUST be path-scoped — bare `biome check --fix` reformats anything it can see; (c) QA agents reliably return clean verdicts even when impl agents have return-channel issues (different agent type).


## Event 54 — SPEC-008 root rollup propagated for 4 closed TASKs

User flagged: keep SPEC-008 root note up to date alongside per-TASK closures. Propagated the 4 fully-CLOSED TASKs (impl + QA both PASS) to the SPEC-008 root `### Tasks (46)` rollup, flipping each from `[ ]` to `[x]`: TASK-001 (ADR schema), TASK-021 (adversarial harness), TASK-026 (mutation invariants), TASK-029 (rename).

TASK-025 stays `[ ]` (impl DONE; qa-025 pending — TASK is not DONE until both halves PASS per the rigid cycle).

REQ/DESIGN rollups in SPEC-008 root remain `[ ]` — none of their child sets are fully covered yet (REQ-001 needs TASK-001..004,010; REQ-006 needs TASK-021..024; REQ-007 needs TASK-025..028; REQ-009 needs TASK-029..030; DESIGN-001 needs TASK-001..010; DESIGN-003 needs TASK-021..024). These flip mechanically when the last child of each set closes.

Going forward in the marathon: every TASK closure (impl + QA both DONE) triggers the same `[ ]` → `[x]` propagation in the SPEC-008 root rollup. PLAN-001 Progress Dashboard follows at SPEC-008 completion.

Next: qa-TASK-025 dispatch + remaining Wave 0 batch — 033 user-doc edit + 034 Brain-note hygiene (memory agent per the binary rule) + 037 hooks.json manifest. 4 concurrent agents, all file-disjoint.

Operational lesson tracked: basic-memory's bullet parser treats `- \`[x]\` [[...]]` as a malformed relation bullet (the backtick-checkbox prefix becomes a candidate relation_type and trips validation). When recording rollup state in Event prose, use plain-text task IDs instead of double-bracketed wikilinks at bullet starts.


## Event 55 — REQ AC propagation; full-propagation protocol locked

User: "make sure anything that needs propagation gets it." Comprehensive propagation pass for the 4 closed TASKs (001, 021, 026, 029):

**REQ AC checkboxes flipped (10 across 4 REQs)**:

- REQ-001 (New Schema Suite): AC-1 (valid PROPOSED ADR parses) + AC-2 (ACCEPTED + unchecked Clarification rejected). Cross-cutting AC-7/AC-8 stay `[ ]` — they require all 5 schemas to land.
- REQ-006 (Adversarial Harness + Fixtures): AC-1 (harness signature exported) + AC-3 (parse-failure distinct from validator-rejection). AC-2/4-7 wait for TASK-022/023/024.
- REQ-007 (Integration + Mutation + Drift Markers): AC-4 (backward-transition rejection + idempotency). AC-1/2/3 wait for qa-TASK-025 PASS; AC-5/6/7/8/9 wait for TASK-027/028.
- REQ-009 (Structural Cleanup): AC-1 (git mv rename) + AC-2 (zero `_shared/` TS imports) + AC-3 (configs reference `shared/composition/`) + AC-4 (bun test baseline preserved). AC-5/6/7 wait for TASK-030; AC-8 deferred (TASK-034).

REQ statuses stay DRAFT — none have ALL their ACs satisfied yet (the cross-cutting and multi-TASK ACs gate the DRAFT→ACCEPTED flip until the last contributing TASK closes).

DESIGN compliance checkboxes intentionally NOT flipped this pass — DESIGN-001 (Coverage Module Layout) and DESIGN-003 (Adversarial Test Fixture Layout) compliance items aggregate over their full TASK sets (DESIGN-001 covers TASK-001..010; DESIGN-003 covers TASK-021..028); they flip on last-child closure rather than partial-progress.

**Full-propagation protocol locked for every TASK closure going forward**:

1. TASK DoD `[x]` on impl PASS (orchestrator-verified, not agent-claimed).
2. TASK ADR Compliance `[x]` on QA PASS.
3. TASK `status: TODO → DONE` on QA PASS.
4. TASK `relates_to QA-NNN` added (bi-dir; QA-NNN carries the inverse).
5. SPEC-008 root `### Tasks (46)` rollup `[ ]→[x]` for this TASK (plain-text bullet, not double-bracketed at bullet start — basic-memory parser constraint).
6. REQ AC checkboxes that this TASK fully satisfies → `[x]` (NOT aggregate ACs gated on multi-TASK sets).
7. REQ status DRAFT → ACCEPTED ONLY when ALL ACs `[x]` AND all child TASKs DONE.
8. DESIGN compliance checkbox `[x]` ONLY on last-child closure of that DESIGN's TASK set.
9. SPEC-008 status flip end-of-marathon (Success/Acceptance Criteria all `[x]` + 46/46 TASKs DONE).
10. PLAN-001 Progress Dashboard flip end-of-marathon.
11. Session State + Events kept current per turn (already in-cycle).
12. PLAN workflow items (impl-/qa-) transition with each step (already in-cycle).

This protocol is now the standing closure contract. The bookkeeping per TASK is heavier than just "flip TASK DoD" — full propagation pass before moving to the next TASK.


## Event 56 — Batch 3 dispatch: qa-TASK-025 + impl-TASK-033 + impl-TASK-034 + impl-TASK-037

PLAN transitions (4 transitions + 6 new items seeded this Event):

- qa-TASK-025-SPEC-008: PENDING → IN_PROGRESS (TASK-025 impl DONE precondition holds; commit `30a3c98`)
- impl-TASK-033-SPEC-008: PENDING → IN_PROGRESS (user-doc edit; `~/KNOWLEDGE-GRAPH-STRUCTURES.md` Sections 4.6/4.7 `[~]` notation)
- impl-TASK-034-SPEC-008: PENDING → IN_PROGRESS (Brain note hygiene; 6 categories × 10 notes; brain:🧠-memory agent per binary tool rule)
- impl-TASK-037-SPEC-008: PENDING → IN_PROGRESS (hooks.json manifest; 7 hook layers from ADR-005 D-8)

Also seeded PENDING: qa-TASK-033, qa-TASK-034, qa-TASK-037 (3 items).

Dispatching 4 concurrent agents (bounded-parallel; file-disjoint; agents type-specialized):

- brain:🧠-qa for TASK-025 — validate the 3 integration test files + 8 fixtures against TASK-025 DoD + REQ-007 AC-1/2/3 + DESIGN-003 compliance.
- general-purpose / Edit-tool agent for TASK-033 — STRUCTURES Section 4.6/4.7 amendment + CONVENTIONS pointer; NOT a Brain note (user-home root file).
- brain:🧠-memory for TASK-034 — 6-category Brain note hygiene repair across 10 notes via Brain MCP edit_note (binary tool rule; never Edit/Write on docs/**).
- bun-ts-engineer for TASK-037 — hooks.json manifest authoring against ADR-005 D-8 table verbatim.

File-disjointness confirmed:
- qa-025 reads code, writes nothing (it returns a verdict only).
- impl-033 writes `~/KNOWLEDGE-GRAPH-*.md` only.
- impl-034 writes via Brain MCP to docs/qa/, docs/analysis/, docs/sessions/ (specific 10 notes).
- impl-037 writes `hooks/hooks.json` only.

No file overlap; no shared barrels (this batch touches no schemas/parsers/validators/index.ts). On return (serialized): full propagation per the Event 55 locked protocol.


## Event 57 — Batch 3 returns: 3 clean closures + 1 halt; TASK-034 surfaces DoD-vs-reality contradiction

All 4 agents returned (zero return-channel errors this batch — vs 33% in batch 1; suggests bounded-parallel @ 4 + smaller per-agent task scope is more reliable).

**qa-TASK-025** (`ace36d4179c3784c3`): PASS. 11 DoD + REQ-007 AC-1/2/3 + DESIGN-003 Track-3 compliance + 3 API-gap adaptations all verified principled (each missing API verified absent via `grep` on `src/`). QA-048-SPEC-008 contract note authored. TASK-025 status TODO → DONE; bi-dir `relates_to QA-048`.

**impl-TASK-033** (`ada0e64c468bca9c0`): PASS. 6 DoD items SATISFIED. `~/KNOWLEDGE-GRAPH-STRUCTURES.md` Section 4.6 (PLAN: clarifies `[~]` is SPEC-scoped only) + Section 4.7 (SPEC: documents `[~]` canonical for `## Artifact Status` rows) edited; `~/KNOWLEDGE-GRAPH-CONVENTIONS.md` pointer block updated. Edit tool used correctly on user-home files (NOT Brain MCP per binary rule).

**impl-TASK-037** (`a8b63ce216514bfe3`): PASS. 12 DoD items SATISFIED + 1 `[~]` (biome lint N/A — biome.json files.include excludes `hooks/`). `hooks/hooks.json` authored with 7 hook layers verbatim per ADR-005 D-8. **Important agent catch**: dispatch brief had outdated handler script names (`pre-commit.ts`, `pre-push.ts`, `pre-pr-create.ts`) but ADR-005 D-8 Implementation Notes specifies `-validate` suffixed versions (`pre-commit-validate.ts`, `pre-push-validate.ts`, `pre-pr-create-validate.ts`); agent followed the ADR per spec-is-authority and surfaced the divergence in its return. TASK-041..045 (handler script authoring) must use the ADR filenames — tracked.

**impl-TASK-034** (`a6a739eb92d9316d7`): PARTIAL — agent did its scoped work correctly across 12 notes (6 violation categories from Audit C's named inventory: 4 QA notes' `validates` relations replaced with `depends_on`; 2 duplicate frontmatter blocks merged; 3 title-without-colon fixed; 2 stale `type:` flipped to `qa`; 3 PII paths redacted; 1 duplicate Event-number block renumbered to `36b/37b/38b`). All Brain MCP only. Schema re-parse confirms each repaired note still parses cleanly.

**DoD-vs-reality contradiction surfaced (DoD bug, not impl bug)**: TASK-034 DoD item 2 verification command is `grep -rn "^- validates \[\[" docs/qa/` should return zero. Running this against the broader docs/qa/ tree reveals 15+ OTHER `validates` relations in QA notes that Audit C did NOT catch (QA-002/003/021/022/025 and more). The agent's scoped work satisfied the 4 named notes per Audit C; the broader grep finding is NEW drift outside the original Audit C inventory.

This is a documented "spec is authority" / "mid-implementation halt on spec problem" scenario. PLAN `impl-TASK-034`: IN_PROGRESS → BLOCKED with Fix Brief pointer to this Event. Surfacing a user decision next.

Orchestrator actions this turn:

- QA-048-SPEC-008 authored (Pattern 2; `relates_to` only — no forbidden `validates`).
- TASK-025: status DONE; `relates_to QA-048` added.
- TASK-033: 6 DoD `[x]` (impl-only-closure; QA still pending).
- TASK-037: 12 DoD `[x]` + 1 `[~]` deferred-N/A (biome scope) — applies the canonical `[~]` notation just documented by TASK-033 (eat-own-dogfood).
- TASK-034: NO DoD flips this turn (DoD-vs-reality conflict; user adjudication required first).
- PLAN: qa-TASK-025 DONE (Test Report Ref QA-048); impl-TASK-033 DONE; impl-TASK-037 DONE; impl-TASK-034 IN_PROGRESS → BLOCKED.
- SPEC-008 root rollup: `[x]` flipped for TASK-025 (full closure). TASK-033/037 stay `[ ]` (impl-only-done; need QA). TASK-034 stays `[ ]` (BLOCKED).
- REQ-007 ACs 1, 2, 3 flipped `[x]` (TASK-025 satisfies; previously AC-4 flipped at TASK-026 closure).

State after this turn: 5 TASKs fully CLOSED (001, 021, 025, 026, 029). 2 impl-only-done (033, 037; qa pending). 1 BLOCKED (034). 38 remaining of 46.


## Event 58 — TASK-034 scope expansion locked; dispatching memory agent for 31 additional `validates` relations

User adjudicated (AskUserQuestion). Selected verbatim: **"Expand TASK-034 to fix ALL `validates`"** — authorize fixing every `validates` relation in docs/qa/ NOW (still via brain:🧠-memory / Brain MCP). Re-dispatch impl-034 with expanded scope; QA validates against the broader grep.

Scope determined by `grep -rn "^- validates \[\[" docs/`: 31 instances across 30 notes (QA-032-SPEC-003 has 3; all 30 in `docs/qa/`). The 4 Audit C named notes (QA-027-SPEC-004, QA-042-SPEC-002, QA-043-SPEC-003, QA-015-SPEC-003) are already clean from Batch 3 Event 56 work and do NOT appear in the current grep — agent must not re-touch them.

PLAN `impl-TASK-034`: BLOCKED → IN_PROGRESS (Failed Iterations stays 0 — this is scope expansion, not a fix-cycle; the prior agent's work was correct per the original-scope DoD and is preserved).

Dispatching brain:🧠-memory (foreground) with the full inventory of 30 notes + per-note grep lines. Mechanical work: replace each `- validates [[Target]]` Relations bullet with `- depends_on [[Target]]` (the canonical typed verb for QA-aggregate references per Audit C decision in the original TASK-034 brief). Brain MCP only; no raw Edit/Write on docs/**.

On return: post-fix grep must return zero. Then full propagation per Event 55 protocol: TASK-034 DoD `[x]` (full broader DoD now satisfiable), then dispatch QA.


## Event 59 — Cross-Part Dependency Graph fixed; batch 3 returns processed; TASK-033/037 CLOSED; TASK-034 sweep impl-DONE; qa-034 IN_PROGRESS

User flagged: Cross-Part Dependency Graph was broken. Root cause: node identifier `end` is a Mermaid reserved keyword (closes `subgraph` blocks; silently breaks the graph parse). Renamed node identifier `end` → `end_part` in 3 locations (declaration + `review --> end_part` edge + class assignment); display label "end" preserved inside HTML `<b>end</b>`. Validated post-fix: zero bare `end` identifier remains; 3 `end_part` references present. Graph now parses.

Batch 3 returns processed (all 3 PASS; zero return-channel errors this batch):

- **impl-TASK-034 expanded sweep** (`af0a7b87c8d91ba1e`, brain:🧠-memory): 30 notes touched, 31 `validates`→`depends_on` replacements landed (QA-032-SPEC-003 had 3 bullets). Spot-checked QA-001/QA-018/QA-025 — bullet shape correct, schema-clean, no collateral changes. `grep -rn "^- validates \[\[" docs/qa/` → 0 (broader DoD verification now satisfied). Per-protocol orchestrator gate-rerun confirms.
- **qa-TASK-033** (`a176f6333bb81326c`): PASS. 6 DoD + REQ-008 AC-6 verified. STRUCTURES Sections 4.6 + 4.7 substantive `[~]` content; CONVENTIONS pointer block updated; 8 `[~]` grep matches; 4 REQ-008 + 4 ADR-005 D-6 citations. Minor non-blocking observation: CONVENTIONS ToC not updated to mention `[~]`. QA-049-SPEC-008 contract note authored.
- **qa-TASK-037** (`ac785498b7d2b4175`): PASS. 13 DoD verified (12 PASS + 1 `[~]` biome N/A — biome.json excludes hooks/). 7 hook layers verbatim per ADR-005 D-8. Handler script names use correct `-validate` suffix per ADR Implementation Notes (NOT the outdated dispatch-brief names — implementer correctly followed ADR). `statusMessage` fields added per hook entry (additive Claude Code hooks contract property; not divergent). QA-050-SPEC-008 contract note authored.

Orchestrator full-propagation pass per Event 55 protocol:

- TASK-033: status TODO → DONE; `relates_to QA-049` added.
- TASK-037: status TODO → DONE; `relates_to QA-050` added.
- TASK-034: all 8 DoD items flipped `[x]` (including the broader-grep DoD item 2 now satisfiable after sweep); ADR Compliance `[x]` with scope-expansion annotation. PLAN `impl-TASK-034` IN_PROGRESS → DONE; PLAN `qa-TASK-034` PENDING → IN_PROGRESS (dispatching QA next).
- PLAN: `qa-TASK-033` IN_PROGRESS → DONE (TestReportRef QA-049); `qa-TASK-037` IN_PROGRESS → DONE (TestReportRef QA-050).
- SPEC-008 root rollup: TASK-033, TASK-037 `[x]` flipped. TASK-034 stays `[ ]` (impl done; qa pending).
- REQ-008 AC-6 `[x]` (TASK-033 fully satisfies). REQ-011/012 ACs unchanged — TASK-037 alone (manifest only) doesn't fully satisfy any AC; handler scripts (TASK-041..045) needed.
- SPEC-008 root Acceptance Criteria: 4 items now flipped `[x]` per current state — ADR coverage gate (passed at /spec close), Gate A semantic (PASSed Event 30), Gate B 4 binary drift checks (PASSed Event 30), CONVENTIONS 4.6/4.7 amendment (TASK-033). 5 remaining SPEC-level ACs gate on totality and stay `[ ]`.
- All 4 Success Criteria stay `[ ]` (gate on full Wave 2 close).

Cross-Part Dependency Graph node statuses unchanged (TASKs are part-internal; graph tracks part-level not task-level).

State after this turn: 7 TASKs fully CLOSED (001, 021, 025, 026, 029, 033, 037). 1 mid-cycle (034: impl done, qa-034 IN_PROGRESS). 38 PENDING. Next: dispatch qa-034 alone (no other batch starting yet — keeping the QA gate front-and-center after the prior partial-return + scope-expansion churn).


## Event 60 — TASK-034 CLOSED (both phases); qa-034 PASS; new drift finding tracked

brain:🧠-qa (`a954a7a35ebd61c5c`) independently re-validated TASK-034 across both phases. Verdict **PASS**. 8 DoD items + REQ-010 ACs 1-6 fully satisfied with file-level evidence. Both grep gates (`validates` + PII paths) return zero. 6 notes spot-checked via Brain MCP read_note — no structural damage; all parse cleanly. 42 unique notes repaired total (12 Phase 1 + 30 Phase 2). QA-051-SPEC-008 contract note authored (Pattern 2; uses `relates_to`).

Orchestrator full-propagation pass:

- TASK-034 status TODO → DONE; `relates_to QA-051` added.
- PLAN `qa-TASK-034-SPEC-008`: IN_PROGRESS → DONE (Test Report Ref QA-051).
- SPEC-008 root rollup: TASK-034 `[x]` flipped.
- REQ-010 ACs 1-6 flipped `[x]` (TASK-034 fully covers; AC scope expansion annotation added to AC-2 documenting the broader sweep). AC-7/8/9 remain `[ ]` (TASK-035/036 scope). AC-10 partial — needs TASK-035/036 closures.

**New drift finding tracked (NOT a TASK-034 failure)**: QA-032-SPEC-003 + QA-033 + QA-034 carry a `validates:` key in YAML frontmatter (not a Relations bullet). Outside TASK-034 DoD grep pattern (`^- validates \[\[`) and outside Audit C original inventory. Semantically distinct from Relations-section verb cleanup. Track as a Track-4-followup item for either a new TASK or a /defrag sweep.

State after this turn: **8 TASKs fully CLOSED** (001, 021, 025, 026, 029, 033, 034, 037). 38 TASKs PENDING (002-020, 022-024, 027, 028, 030-032, 035-036, 038-046).

Next: marathon continues. Practical context-budget consideration — the propagation per closure has been heavy (5-8 PLAN/SPEC/REQ/session edits + 2-3 commits per TASK) and 38 TASKs remain. Surfacing a pace decision next.


## Event 61 — Batch 4 START: TASK-002 + TASK-005 + TASK-039 + TASK-040 (Wave 0 finish + Wave 1a entry)

User: "keep going — next batch now." 4 file-disjoint impls dispatched concurrently. Wave 0 remainder + first 2 Wave 1a items (no barrel contention this batch):

- impl-TASK-002 (Wave 1a) — `AnalysisNoteSchema` at `shared/composition/src/schemas/analysis-note.ts` + barrel + 6+ tests; ACCEPTED+Open-Questions rejection rule (closes Brain v2 Wave 7 exploit).
- impl-TASK-005 (Wave 1a) — `parseAdrNote` at `shared/composition/src/parsers/adr-note.ts` + barrel + 6+ tests; depends on TASK-001 (DONE).
- impl-TASK-039 (Wave 0 finish) — 3 hook lib utilities `apply-edit-operation.ts` / `parse-tool-input.ts` / `format-hook-response.ts` under `hooks/lib/` + tests under `hooks/lib/__tests__/`.
- impl-TASK-040 (Wave 0 finish) — 2 git helpers `git-staged-files.ts` / `git-diff-commits.ts` under `hooks/lib/` + tests under `hooks/lib/__tests__/`.

File-disjointness confirmed: TASK-002 touches `schemas/index.ts` (different barrel from TASK-005's `parsers/index.ts`); TASK-039/040 both write to `hooks/lib/` directory but to disjoint files within; no shared source/test files; deps satisfied (TASK-001 + TASK-029 both DONE).

Agent routing: all 4 → bun-ts-engineer (foreground). Each brief carries: scope discipline (touch only the in-scope files), real-API discovery (no inventing missing symbols), scoped biome invocation (never `--fix` across non-in-scope paths — TASK-021 batch lesson), per-DoD evidence return format.

8 PLAN workflow items seeded this Event (4 impl IN_PROGRESS + 4 qa PENDING).


## Event 62 — Batch 4 impls all PASS; 4 impls DONE; dispatching 4 QAs in parallel

All 4 implementers returned cleanly (zero return-channel errors this batch). Orchestrator-verified gates: TASK-002 20/0/20, TASK-005 16/0/50, TASK-039 30/0/47, TASK-040 13/0/19. Composition workspace `tsc --noEmit` exit 0; full suite 578/2/580 (only the pre-existing SPEC-007 fails); barrels updated (schemas/index.ts adds AnalysisNoteSchema; parsers/index.ts adds parseAdrNote).

**LSP diagnostic noise flagged + resolved**: user surfaced new-diagnostics with "Cannot find module bun:test" + "Cannot find name Bun" + "no exported member 'readStagedBrainNotes'/'readPrDiffBrainNotes'" errors in `hooks/lib/**`. Grep-verified all exports ARE present on disk. Tests run 43/0/66 across hooks/lib/__tests__/. The errors are stale LSP-state artifacts from the **pre-existing tsconfig-coherence gap** (`hooks/**` not in root `tsconfig.json` `include`; also not in root `biome.json` `files.include`). Both impl agents flagged this honestly in their returns. The gap is a marathon open-item already tracked since Event 37; not a TASK-039/040 defect. Will become a follow-up TASK or config-tweak.

Also flagged by TASK-039 agent: Zod v4 deprecation warnings at top-level `hooks/lib/parse-tool-input.ts` due to a zod-version mismatch (root resolves `~/node_modules/zod` v4.1.13; composition workspace has v3.25.76). Agent wrote forward-compatible signatures. Not blocking.

PLAN transitions (8 this Event):
- impl-002/005/039/040: IN_PROGRESS → DONE
- qa-002/005/039/040: PENDING → IN_PROGRESS

Dispatching 4 brain:🧠-qa agents concurrently. File-disjoint validators (each reads different test files + different source files); QA contract notes will be QA-052..055.


## Event 63 — Batch 4 fully CLOSED: 4 QAs PASS; TASK-002/005/039/040 DONE; full SPEC-008 propagation verified

All 4 QAs returned PASS independently. QA-052/053/054/055 contract notes authored (Pattern 2). All 4 TASKs status TODO → DONE with bi-dir `relates_to QA-NNN` relations. PLAN `qa-TASK-002/005/039/040` IN_PROGRESS → DONE with Test Report Refs.

SPEC-008 root rollup verified comprehensively current:
- `### Tasks (46)`: 12 TASKs `[x]` (001, 002, 005, 021, 025, 026, 029, 033, 034, 037, 039, 040). Verified via grep.
- `### Requirements (12)`: all 12 stay `[ ]` (no REQ has ALL its child TASKs done yet — REQ-001 needs 003/004/010; REQ-002 needs 006; REQ-003 needs 007-010; REQ-006 needs 022-024; REQ-007 needs 027/028; REQ-008 needs 031/032; REQ-009 needs 030; REQ-010 needs 035/036; REQ-011 needs 038/041-043; REQ-012 needs 044/045)
- `### Designs (4)`: all 4 stay `[ ]` (none have ALL child TASKs done — DESIGN-001 covers 001-010 with 3/10 done; DESIGN-002 covers 011-020 with 0; DESIGN-003 covers 021-028 with 3/8 done; DESIGN-004 covers 037-046 with 3/10 done)
- `## Acceptance Criteria` (10): 4 `[x]` (ADR coverage gate, Gate A, Gate B, CONVENTIONS amendment); 6 remain `[ ]` (totality-gated)
- `## Success Criteria` (4): all `[ ]` (gate on full Wave 2 close)

REQ AC flips: REQ-002 AC-1 `[x]` (TASK-005 ADR-specific). REQ-002 AC-6/AC-7 cross-cutting across 4 parsers — stay `[ ]` until TASK-006 closes (consistent with REQ-001 AC-7/8 partial-cross-cutting treatment). REQ-001 AC-3 `[x]` (TASK-002 ANALYSIS-specific) flipped. No fully-satisfied AC for TASK-039/040 alone — utilities-only; handler scripts (TASK-041..045) needed for REQ-011/012 satisfaction.

State after this turn: **12 TASKs fully CLOSED** (001, 002, 005, 021, 025, 026, 029, 033, 034, 037, 039, 040). 34 TASKs PENDING. **Wave 0 + Wave 1a partial done; Wave 1a remaining**: TASK-003 (EPIC schema), TASK-004 (CRIT schema), TASK-010 (PLAN extension + validatePlanDoneClaim), TASK-030 (delete dispatcher).

Tracked open items unchanged from Event 60: 2 pre-existing `plan-001-migration.test.ts` failures (DEFERRED SPEC-007 work); pre-existing tsconfig + biome `hooks/**` scope gaps (latent config-coherence issue); new flag from Event 60 (frontmatter `validates:` key in QA-032/033/034 — Track 4 followup, not in current scope). Suite count post-batch: 705 pass / 2 fail / 707.

Marathon math: 12/46 TASKs done (26%). At ~4 TASKs per parallel batch with full propagation overhead, remaining 34 TASKs ≈ 8-9 batches. Bookkeeping is dense per batch (QA notes + status flips + REQ AC propagation + SPEC root verification + PLAN transitions + session Events + commits ≈ 25-35 tool calls per batch closure).


## Event 64 — Session PAUSED at clean milestone; resume protocol locked

User adjudicated (AskUserQuestion) the post-batch-4 pace decision: **"Pause; resume fresh (recommended)"** — natural milestone, working tree clean, all SPEC-008 root rollups verified current, PLAN durable. Strongly recommended for context budget.

This session has executed 63 Events across multiple parallel-batch dispatches over a long context window. Closures, propagation, partial-recovery, scope-expansion adjudication, graph fix, propagation protocol formalization, full SPEC-008 root + REQ AC propagation per closure. Bookkeeping is dense per closure (25-35 tool calls each); pausing at a natural milestone is the right call.

Session status IN_PROGRESS → PAUSED at commit `054a065`. All durable state preserved on branch `feat/plan-001-protocol-hardening-wave-2-scope`.

### Resume protocol (next context)

1. `/skills:plan PLAN-001-skills-ecosystem` (continue mode) → RESUMES THIS session (PAUSED → IN_PROGRESS; continue Event numbering from 65; do NOT create a new note per `feedback_resume_paused_session_not_new`).
2. Rehydration checklist (TIER-1; per `feedback_post_compaction_rehydration_protocol`): re-read TIER-1 protocol memories; set active project `skills` + `bootstrap_context`; read PLAN-001 + this session's Events 01–64; verify git state on `feat/plan-001-protocol-hardening-wave-2-scope` at `054a065` or later; recap to user.
3. build.SPEC-008 IN_PROGRESS. Next bounded-parallel batch: **TASK-003 (EPIC schema) + TASK-004 (CRIT schema) + TASK-010 (PLAN done-claim extension + validatePlanDoneClaim) + TASK-030 (delete `core/dispatcher.ts` + its test)** — Wave 1a remainder. All 4 file-disjoint; TASK-003/004 both touch `schemas/index.ts` so serialize within their sub-wave (or batch them but coordinate barrel edits); TASK-010 touches `validators/index.ts` (different barrel); TASK-030 is a small `git rm` (could even be done inline by orchestrator to save an agent).
4. Per-batch protocol: PLAN seed + transition → commit → dispatch → orchestrator-verify gates → flip DoD/Compliance + status DONE + relates_to QA-NNN + SPEC root `[x]` + REQ AC propagation + PLAN qa→DONE + session Event + commit.
5. Marathon continuation after Wave 1a: Wave 1b/c/d/e (TASK-011-020 per-skill scripts; TASK-022/023/027/028/036 cleanup + harness; TASK-031/032 SPEC-007 notation + validator ext) → Wave 2/3 (Track 1 validators: 007/008/009 — barrel-serialized on validators/index.ts) → Wave 4 (Track 5 hook handlers: 038/041-045 + TASK-024 final fixtures) → Wave 5 terminal (TASK-046 smoke tests).

### Open items for marathon resume (decisions queued)

- DECIDE at resume start: 2 pre-existing `plan-001-migration.test.ts` failures — fix now / track separately / accept as DEFERRED SPEC-007 work
- TRACK 4 followup TASK candidates: (a) frontmatter `validates:` key in QA-032/033/034 (Event 60 finding); (b) hooks/** in root tsconfig + biome includes (config-coherence gap)
- DESIGN-004 `DiffNote.sha` amendment candidate (TASK-040 QA flagged): only if Layer 4/5 handlers (TASK-043) need per-commit SHA

### Session 23 final deliverables (this session, across multiple pauses)

- 5 parallel audits (Events 1-5) → ANALYSIS-004 omnibus
- ADR-005 ACCEPTED (8 D-Ns including D-8 automated enforcement hooks); decisions.4 DONE
- SPEC-008 authored: 63 notes (12 REQ + 4 DESIGN + 46 TASK + root) across 5 parallel architect tracks
- spec.SPEC-008 DONE; all /spec gates PASS (ADR coverage + Gate A + Gate B)
- build.SPEC-008 IN_PROGRESS with 12 TASKs CLOSED (impl + QA both PASS for each)
- 12 QA contract notes (QA-044..055)
- PoC pattern established (TASK-029 rename + TASK-001 ADR schema) and signed off
- Bounded-parallel @ 4 protocol locked + proven across 4 batches
- Full-propagation protocol locked (12-step closure pattern; SPEC root + REQ ACs propagated per closure)
- Cross-Part Dependency Graph Mermaid reserved-word fix
- TASK-034 scope expansion adjudicated (31 extra `validates` swept)
- Salvage-from-errored-return pattern proven (TASK-026 partial recovery)
- ~24 atomic commits on `feat/plan-001-protocol-hardening-wave-2-scope`


## Event 65 — Session RESUMED; rehydration complete; D-1 LOCKED (pre-existing migration fails → DEFERRED SPEC-007 baseline)

Fresh context window. `/skills:plan PLAN-001-skills-ecosystem` continue mode invoked. Rehydration per TIER-1 `feedback_post_compaction_rehydration_protocol`:

- Active project: `skills` set (Brain MCP per-conversation MCP process)
- `bootstrap_context` returned (workflow mode: analysis)
- PLAN-001 read: status IN_PROGRESS; 23/25 parts DONE; only `protocol-hardening` + `build.SPEC-008` IN_PROGRESS
- SESSION-2026-05-23_02 Events 01-64 reviewed via tail extract
- Git verified: `feat/plan-001-protocol-hardening-wave-2-scope` @ `054a065` (clean working tree)
- Recap presented to user

Session status PAUSED → IN_PROGRESS (frontmatter flipped this turn). Branch unchanged. Continue Event numbering from 65 per `feedback_resume_paused_session_not_new`.

**Event 64 queued open decisions — adjudication round 1 of N**:

User adjudicated (AskUserQuestion, verbatim option lock):

> **D-1 LOCKED — Track as DEFERRED SPEC-007 (Recommended)** — These failures pre-date SPEC-008 and belong to deferred SPEC-007 work. Document in PLAN-001 + SPEC-008 root as a known-deferred baseline so Batch 5+ QAs treat them as expected (out-of-scope). Zero work added to the SPEC-008 marathon; preserves the 705/2/707 baseline as canonical.

Implications for the marathon:

1. **Baseline canonicalized**: 705 pass / 2 fail / 707 IS the expected suite state. Future QA briefs MUST instruct: "treat `plan-001-migration.test.ts` failures as DEFERRED SPEC-007 known-baseline; any NEW failure outside this baseline is a true regression."
2. **PLAN-001 Risks section** to be updated with a tracked-deferred entry pointing at these 2 fails.
3. **SPEC-008 root** Success/Acceptance criteria language stays unchanged (no totality AC explicitly tied to "0 failing tests"; AC language already accommodates the deferred baseline).
4. **No new TASK** added to SPEC-008 — the 2 fails remain SPEC-007 scope.

Next: surface D-2 (Track-4 followup candidates) and D-3 (DESIGN-004 amendment) sequentially per `feedback_one_decision_at_a_time`. Then dispatch Batch 5 (TASK-003 + 004 + 010 + 030).

State (durable): session IN_PROGRESS at `054a065`. No commits this turn yet — D-1 doc updates + PLAN risk amendment will commit together once Risk doc updated.


## Event 66 — D-2 + D-3 LOCKED; queued open decisions adjudication complete

User adjudicated remaining queued open decisions sequentially (one-decision-at-a-time per `feedback_one_decision_at_a_time`).

> **D-2 LOCKED — Track only; defer to post-marathon (Recommended)** — Document both in PLAN-001 follow-up backlog. Item (a) frontmatter `validates:` key in QA-032/033/034 — Brain MCP YAML frontmatter cleanup (3 notes); doesn't affect SPEC-008 DoD. Item (b) `hooks/**` scope gap in root tsconfig + biome — surfaces LSP false-positives but doesn't block builds/tests. Neither gates Batch 5+ dispatch. Address post-marathon via /defrag (item a) + small config PR (item b).

> **D-3 LOCKED — Defer; revisit when Layer 4/5 handlers reach the question (Recommended)** — TASK-040 implemented `git-diff-commits.ts` returning diff text only, no per-commit SHA. QA flagged this MAY be needed by Layer 4/5 handlers (TASK-043 pre-push-validate.ts) but isn't required by current DoD. Defer the DESIGN-004 amendment until TASK-043's implementer surfaces the actual need with evidence. Avoids speculative spec amendment.

Durable writes this turn:

- PLAN-001 `## Risks` section extended with **Known Deferred Test Baseline** subsection (D-1 doc) + **Post-Marathon Follow-Up Backlog** subsection (D-2 + FU-3 session-note placement drift tracked from this Event).
- PLAN-001 FU-3 added: session-end cleanup item to reorder this session's misplaced Observations/Relations sections to the true tail before session DONE flip.

D-3 needs no PLAN durable doc beyond this Event entry — it's a "do nothing now" decision; the implementer brief for TASK-043 will pick up the open question when that batch reaches the queue.

Marathon state unchanged. No commits this turn (will commit D-1/D-2/D-3 doc writes + session resume + Event 65/66 in a single atomic commit before Batch 5 dispatch).

Next: commit the adjudication round, then dispatch Batch 5 (TASK-003 + 004 + 010 + 030).


## Event 67 — Bulk PLAN seed (68 workflow items) + task-level wave graph added + Batch 5a START (impl-003/010/030)

User flagged the de-facto seed-on-transition pattern as suboptimal: "why don't we seed the plan with all the remaining items/batches". Plus: "make sure to update the Cross-Part Dependency Graph as well". Two structural improvements to PLAN-001 executed in one Event.

### Improvement 1 — Bulk seed of all remaining workflow items

Seeded 68 workflow items (34 impl + 34 qa) for the 34 PENDING SPEC-008 TASKs in one large `find_replace` operation. Items inserted between the existing `qa-TASK-026-SPEC-008` block and the `## Tasks` section in numerical task-ID order: 003, 004, 006-010, 011-020, 022-024, 027-028, 030, 031-032, 035-036, 038, 041-046.

For each TASK: 1 impl item + 1 qa item, both `Status: PENDING` with `Owning Session: —` + `Transitioned At Event: —`.

**Exception**: Batch 5a impl items seeded directly as `IN_PROGRESS` with `Owning Session: SESSION-2026-05-23_02` + `Transitioned At Event: Event 67`:

- `impl-TASK-003-SPEC-008` → IN_PROGRESS
- `impl-TASK-010-SPEC-008` → IN_PROGRESS
- `impl-TASK-030-SPEC-008` → IN_PROGRESS (Fix Brief: orchestrator-inline per ADR-005 D-7 small-scope deletion)

Paired qa items (qa-003, qa-010, qa-030) seeded as PENDING; they advance to IN_PROGRESS only on impl-DONE per the rigid cycle gate.

**Benefit**: full marathon scope (34 remaining TASKs × 2 phases = 68 items) now visible in PLAN-001 in one place. Each subsequent Batch start becomes a 3-4 line find_replace per TASK (PENDING → IN_PROGRESS) instead of seed + transition. Cross-batch dispatch planning easier. Aligns with canonical `feedback_per_task_build_qa_cycle` step (a): "PLAN transition impl-TASK-NNN PENDING → IN_PROGRESS (FIRST action)" — assumes PENDING item exists.

### Improvement 2 — Task-level wave dependency graph for SPEC-008

Added `## SPEC-008 Build Marathon — Task-Level Wave Graph` section after the existing `## Cross-Part Dependency Graph` (additive; existing part-level graph unchanged — it correctly shows `build_SPEC_008` as umbrella inprogress node).

New Mermaid graph: 46 TASK nodes grouped into 7 wave subgraphs (Wave 0, 1a, 1b, 1c, 2/3, 4, 5) with status coloring (done / inprogress / pending) + cross-wave gating edges (critical-path only; intra-wave deps omitted for clarity). Maintenance rule documented in the section preamble: flip TASK node `class` on each TASK closure + each Batch START.

Wave structure derived from Event 64 resume protocol:

- Wave 0: 9 TASKs (021/025/026/029/033/034/037/039/040) — all ✅ DONE
- Wave 1a: 8 TASKs (001/002/005 DONE; 003/010/030 IN_PROGRESS Batch 5a; 004/006 PENDING Batch 5b)
- Wave 1b: 10 TASKs (011-020) — per-skill scripts
- Wave 1c: 8 TASKs (022/023/027/028/031/032/035/036) — cleanup + harness
- Wave 2/3: 3 TASKs (007/008/009) — validators barrel-serialized
- Wave 4: 7 TASKs (024/038/041-045) — hook handlers + final fixtures
- Wave 5: 1 TASK (046) — terminal smoke tests

Cross-wave critical-path edges: T029→T001/T030; T021→T022/T023/T024; T001/T002/T003→T007/T008/T009; T037→T038/T041-045; T024+T009+T045→T046.

### Batch 5a dispatch plan (this Event)

Per rigid cycle step (a)-(c): PLAN transitions DONE this Event; session Event written; commit next.

Next (step d): orchestrator-inline execution of TASK-030 (`git rm shared/composition/src/core/dispatcher.ts` + `shared/composition/tests/dispatcher.test.ts`; verify `bun test` baseline minus dispatcher case count; verify `core/adapter.ts` untouched; commit referencing ADR-005 D-7). Parallel dispatch of impl-003 + impl-010 to bun-ts-engineer (foreground).

File-disjoint: impl-003 writes `shared/composition/src/schemas/epic-note.ts` + tests + barrel; impl-010 writes `shared/composition/src/schemas/plan-note.ts` (additive superRefine) + `validators/plan-claim-validator.ts` + tests + `validators/index.ts` barrel. TASK-003 touches `schemas/index.ts`; impl-010's modify to `plan-note.ts` is in-file (not barrel). TASK-030 touches only the deleted files + verification. No barrel collision between 003/010/030.

PLAN state (post this Event): 14/46 impl-items in IN_PROGRESS+DONE (12 DONE + 003/010/030 IN_PROGRESS); 31 PENDING. Suite expected to drop 1-2 test cases when dispatcher.test.ts is removed (TASK-030 DoD allows the count drop).

State: clean. No new commits this turn yet — PLAN edits (bulk seed + graph + Event 67) commit together.


## Event 68 — TASK-030 CLOSED (both phases, orchestrator-inline); 13/46 TASKs DONE; QA-056 authored

User adjudicated (AskUserQuestion) the post-bulk-seed pacing decision: **"Push: execute TASK-030 inline now; pause before impl-003/010 dispatch"** — close one more TASK at this milestone (13/46 progress visibility), leave the heavier impl-003 + impl-010 agent dispatches for fresh context.

### Execution (mechanical; ADR-005 D-7 permits orchestrator-inline)

1. Pre-deletion suite baseline: 705 pass / 2 fail / 707 total. dispatcher.test.ts case count: 6 (verified via `bun test shared/composition/tests/dispatcher.test.ts` → 6 pass).
2. `git rm shared/composition/src/core/dispatcher.ts shared/composition/tests/dispatcher.test.ts` executed cleanly.
3. Post-deletion gates (all PASS):
   - `rg "from ['\"].*core/dispatcher" -t ts` → exit 1 (no matches) ✓
   - `git diff shared/composition/src/core/adapter.ts` → empty ✓
   - `bun test` → 699 pass / 2 fail / 701 total (drop of 6; matches dispatcher.test.ts case count exactly) ✓
   - 2 fails are the DEFERRED SPEC-007 `plan-001-migration.test.ts` baseline (D-1 locked); zero new regressions ✓
4. Commit 64dd1ca authored with ADR-005 D-7 verbatim citation in body per DoD item 7.

### QA-056-SPEC-008 authored (Pattern 2 three-phase write)

`docs/qa/QA-056-SPEC-008-task-030-inline-deletion-verification.md` — orchestrator-inline QA contract note. Per-DoD evidence table (7 items, all PASS); per-AC evidence table (REQ-009 ACs 5/6/7, all PASS); per-DESIGN compliance note (DESIGN-002 stays `[ ]` — aggregate; gates on TASK-035/036 closure). Pattern 2 phases all clean: write_note → edit_note for colon in title + H1 → move_note to kebab filename. Relations use `relates_to` per established session convention (matches QA-055 pattern).

### Full Event 55 propagation pass (plain-text references per Event 54 parser rule)

- TASK-030 note: status TODO → DONE; all 7 DoD items `[x]` with evidence annotations; Relations section updated to add `relates_to` link to QA-056-SPEC-008.
- REQ-009 ACs 5, 6, 7 flipped `[x]` with verbatim "closed by TASK-030-SPEC-008 2026-05-24" annotations + commit ref + measurement values. REQ-009 ACs 1-4 already flipped (TASK-029 closure Event 55); AC-8 stays `[ ]` (Track 4 doc rewrite sweep — separate scope, likely TASK-035/036).
- SPEC-008 root `### Tasks (46)` rollup: TASK-030 line flipped `[ ]` → `[x]`. Rollup now: 13/46 tasks `[x]` (001, 002, 005, 021, 025, 026, 029, 030, 033, 034, 037, 039, 040).
- SPEC-008 root REQ rollup: REQ-009 stays `[ ]` (gate on full AC closure including AC-8 + last-child TASK closure; only TASK-030 closed this Event — TASK-029 already closed prior).
- SPEC-008 root DESIGN rollup: DESIGN-002 stays `[ ]` (aggregate on TASK-029/030/035/036 closure).
- SPEC-008 root Acceptance/Success Criteria: unchanged (no totality-gated AC affected).
- PLAN-001 impl-TASK-030: IN_PROGRESS → DONE (commit 64dd1ca; Event 68; orchestrator-inline note).
- PLAN-001 qa-TASK-030: PENDING → DONE (Test Report Ref QA-056-SPEC-008; orchestrator-inline self-verification note; Event 68).
- PLAN-001 task-level wave graph: T030 node label `⚡` → `✅`; classDef declaration moved T030 from `inprogress` to `done`; Wave 1a subgraph header updated `3 DONE, 3 IN PROGRESS Batch 5a, 2 PENDING Batch 5b` → `4 DONE, 2 IN PROGRESS Batch 5a, 2 PENDING Batch 5b`.
- PLAN-001 Progress Dashboard: build row unchanged (part-level rollup; build.SPEC-008 part stays IN_PROGRESS until all 46 TASKs close).

### Marathon state after Event 68

- 13 TASKs CLOSED (impl + QA both PASS): 001, 002, 005, 021, 025, 026, 029, 030, 033, 034, 037, 039, 040.
- 2 TASKs IN_PROGRESS (impl in flight pending Batch 5a launch): 003, 010.
- 31 TASKs PENDING: 004, 006, 007, 008, 009, 011-020, 022, 023, 024, 027, 028, 031, 032, 035, 036, 038, 041-046.
- Suite baseline updated: canonical post-Event-68 baseline is now 699 pass / 2 fail / 701 total. PLAN-001 Known Deferred Test Baseline subsection still applies (the 2 fails are the same DEFERRED SPEC-007 plan-001-migration.test.ts cases — total count just dropped by 6 due to TASK-030 deletion).

### Pause decision (per user adjudication)

User explicitly requested pause-before-agent-dispatch after TASK-030 closure. Honoring the pause:

- Branch stays at the propagation commit (next commit) for fresh-context resume.
- impl-003 + impl-010 stay IN_PROGRESS in PLAN; no agent dispatch yet (those are Batch 5a remainder; next context picks up).
- Session stays IN_PROGRESS for now; will be moved PAUSED at session-end after this commit lands (or by next `/plan continue` invocation which transitions PAUSED→IN_PROGRESS again).

### Resume protocol for next context

1. `/skills:plan PLAN-001-skills-ecosystem` continue mode → resumes this session.
2. Rehydration: re-read PLAN-001 + this session Events through 68 + current branch HEAD.
3. Batch 5a remainder: dispatch impl-003 (EPIC schema; bun-ts-engineer; foreground) + impl-010 (PLAN done-claim ext + validatePlanDoneClaim; bun-ts-engineer; foreground) in parallel. File-disjoint (003 writes schemas/epic-note.ts + barrel; 010 writes schemas/plan-note.ts in-file + new validators/plan-claim-validator.ts + validators/index.ts barrel — different barrels).
4. On impl-003 + impl-010 returns: full Event 55 propagation per closure; dispatch qa-003 + qa-010 (brain:🧠-qa; foreground; concurrent). Then close both → 15/46 DONE.
5. Batch 5b: TASK-004 (CRIT schema; sequential on schemas/index.ts barrel after TASK-003 lands). 1 impl + 1 qa cycle. → 16/46 DONE.
6. Then Wave 1b (TASK-011-020 per-skill scripts; 10 TASKs in ~2-3 sub-batches).

Marathon math after Event 68: 13/46 (28%). Remaining 33 TASKs ≈ 7-8 more batches at the established cadence.


## Event 69 — Batch 5a remainder: impl-003 + impl-010 returned PASS; 4 PLAN transitions; dispatching qa-003 + qa-010

User clarified ("sorry if I said I wanted to pause that was a mistake I want to continue") — reverting the prior pause intent. Continuing forward with Batch 5a remainder per Event 67 plan.

Two bun-ts-engineer agents dispatched in parallel (foreground), file-disjoint:

### impl-TASK-003 return (agent aca83cfe30745acbe; tool_uses 38; duration 532s)

**Verdict: PASS** — all 12 DoD + 3 ADR Compliance items `[x]`.

- New files: `shared/composition/src/schemas/epic-note.ts` (133 lines) + `shared/composition/tests/schemas/epic-note.test.ts` (209 lines)
- Modified: `shared/composition/src/schemas/index.ts` (+1 line; +EpicNoteSchema, +EpicNote re-export)
- Targeted tests: 20 pass / 0 fail / 20 total (DoD floor was ≥6; 3.3× exceeded)
- Gates: biome scoped PASS; `bunx tsc --noEmit` PASS
- EpicNoteSchema enforces title regex `^EPIC-\d{3}.*`, type literal `epic`, status enum, permalink regex `^roadmap/`, tags 2-5; Contained Specs section required when `contains` relations present; final-two-sections invariant; relation verb allowlist via common.ts; `.strict()` on frontmatter + outer + inherited sub-schemas; zero cross-note resolution (deferred to validateEpicDoneClaim TASK-009)
- No HALT items

### impl-TASK-010 return (agent a325feb5733a31296; tool_uses 66; duration 855s)

**Verdict: PASS** — all 14 DoD + 4 ADR Compliance items `[x]`.

- Modified: `shared/composition/src/schemas/plan-note.ts` (+33 lines additive superRefine + TERMINAL_PART_SUBSTATUSES tuple + isTerminalPartSubstatus predicate)
- New files: `shared/composition/src/validators/plan-claim-validator.ts` (53 lines) + `shared/composition/src/validators/index.ts` (12 lines; new barrel) + `shared/composition/tests/schemas/plan-note.test.ts` (174 lines; 7 new superRefine tests) + `shared/composition/tests/validators/plan-claim-validator.test.ts` (170 lines; 8 new validator tests)
- Wave 1 baseline preservation: `tests/plan-note-schema.test.ts` 18/18 pass identical to pre-change (zero regression)
- Targeted new: 15 pass / 0 fail / 15 total (7 schema + 8 validator)
- Composition package suite: 607 pass / 2 fail / 609 total (2 fails are SPEC-007 DEFERRED baseline only)
- Gates: biome scoped PASS; tsc --noEmit PASS
- Note from agent: TASK-010 DoD listed `tests/schemas/plan-note.test.ts` as MODIFY but path didn't exist pre-task (only legacy flat `tests/plan-note-schema.test.ts`). Agent created the new spec-008-convention path with 7 new superRefine tests, left legacy file untouched (Wave 1 baseline preserved). Matches Track-1 convention from adr-note.test.ts + analysis-note.test.ts.
- No HALT items

### Independent orchestrator verification

Orchestrator-run independent checks (not relying on agent self-report):

- `git status --short`: 5 new files + 3 modified files staged for next commit (epic-note.ts, validators/, tests/schemas/plan-note.test.ts, tests/validators/plan-claim-validator.test.ts; modified plan-note.ts, schemas/index.ts, 2 TASK notes, session note)
- `bun test` independent run: 734 pass / 2 fail / 736 total. Delta from pre-batch baseline (699/2/701): +35 pass = 20 (TASK-003) + 15 (TASK-010). Matches exactly. The 2 fails ARE the SPEC-007 DEFERRED `tests/skills/plan/plan-001-migration.test.ts` baseline (D-1 locked).
- TASK-003 note `[x]` count: 15 (12 DoD + 3 ADR Compliance) — matches agent claim
- TASK-010 note `[x]` count: 18 (14 DoD + 4 ADR Compliance) — matches agent claim
- New canonical suite baseline post-batch: **734 pass / 2 fail / 736 total**

### PLAN transitions this Event (4)

1. impl-TASK-003-SPEC-008: IN_PROGRESS → DONE (Event 69)
2. impl-TASK-010-SPEC-008: IN_PROGRESS → DONE (Event 69)
3. qa-TASK-003-SPEC-008: PENDING → IN_PROGRESS (Event 69; dispatching brain:🧠-qa next)
4. qa-TASK-010-SPEC-008: PENDING → IN_PROGRESS (Event 69; dispatching brain:🧠-qa next)

Wave graph: T003 + T010 stay `inprogress` (impl-done; QA pending; class flips to `done` only when both phases close per maintenance rule).

### Next action (this same turn)

Commit code + PLAN + Event 69 atomically, then dispatch qa-003 + qa-010 in parallel (foreground; brain:🧠-qa). QA brief MUST quote the TASK DoD + linked REQ AC + linked DESIGN compliance verbatim per `feedback_per_task_build_qa_cycle` step (m)-(n).


## Event 70 — Batch 5a fully CLOSED: qa-003 + qa-010 PASS; 15/46 TASKs DONE; full propagation

Two brain:🧠-qa agents returned PASS independently (file-disjoint validation; foreground; Pattern 2 contract notes authored).

### qa-TASK-003 return (agent ad9a7d20a7e67a7c1; tool_uses 37; duration 462s)

**Verdict: PASS** — QA-057-SPEC-008 contract note authored. 12 DoD + 3 ADR Compliance + REQ-001 AC-4/AC-7/AC-8 contributions + DESIGN-001 compliance all verified with file:line evidence. Independent gate runs (bun test target, biome scoped, tsc, suite-wide) all PASS. Zero regression.

### qa-TASK-010 return (agent a4a19aa101027ac7f; tool_uses 38; duration 492s)

**Verdict: PASS** — QA-058-SPEC-008 contract note authored. 14 DoD + 4 ADR Compliance + REQ-001 AC-6 + REQ-003 AC-5/AC-6 + DESIGN-001 compliance all verified. Validator purity verified (JSON snapshot compare); Wave 1 baseline 18/18 zero-regression confirmed. Implementation characterized as "clean additive extension".

### Full Event 55 propagation pass (both TASKs)

- TASK-003 note: status TODO → DONE; Relations updated to add `relates_to` link to QA-057-SPEC-008.
- TASK-010 note: status TODO → DONE; Relations updated to add `relates_to` link to QA-058-SPEC-008.
- REQ-001 AC-4 flipped `[x]` (TASK-003 satisfies; EPIC frontmatter shape validation).
- REQ-001 AC-6 flipped `[x]` (TASK-010 satisfies; PLAN DONE+non-terminal-part rejection).
- REQ-001 AC-7/AC-8 stay `[ ]` — cross-cutting final-two-sections + verb-allowlist gates on ALL 5 schemas landing (CRIT schema TASK-004 still PENDING).
- REQ-003 AC-5 flipped `[x]` (TASK-010 satisfies; validatePlanDoneClaim IN_PROGRESS-part rejection).
- REQ-003 AC-6 flipped `[x]` (TASK-010 satisfies; all-terminal `{ok:true}` case).
- REQ-003 AC-7 stays `[ ]` — cross-cutting validator-non-terminal-status gates on all 4 validators (TASK-007/008/009 PENDING).
- REQ-001 + REQ-003 status stays DRAFT — partial AC coverage; flips to ACCEPTED only when all ACs `[x]` AND all child TASKs DONE.
- SPEC-008 root `### Tasks (46)` rollup: TASK-003 + TASK-010 lines flipped `[ ]` → `[x]`. Rollup now: 15/46 tasks `[x]` (001, 002, 003, 005, 010, 021, 025, 026, 029, 030, 033, 034, 037, 039, 040).
- SPEC-008 root REQ/DESIGN/AC rollups: unchanged (no totality-gated rollup affected; REQ-001/REQ-003 still gate on remaining ACs and child TASKs).
- PLAN-001 qa-TASK-003: IN_PROGRESS → DONE (Test Report Ref QA-057).
- PLAN-001 qa-TASK-010: IN_PROGRESS → DONE (Test Report Ref QA-058).
- PLAN-001 task-level wave graph: T003 + T010 node labels `⚡` → `✅`; classDef declaration moved both to `done`; Wave 1a subgraph header updated `4 DONE, 2 IN PROGRESS Batch 5a, 2 PENDING Batch 5b` → `6 DONE, 2 PENDING — Batch 5b: TASK-004 CRIT schema + TASK-006 ANALYSIS parser`.

### Marathon state after Event 70

- **15 TASKs CLOSED** (impl + QA both PASS): 001, 002, 003, 005, 010, 021, 025, 026, 029, 030, 033, 034, 037, 039, 040. **33% complete.**
- **0 TASKs IN_PROGRESS** (Batch 5a fully closed).
- **31 TASKs PENDING**: 004, 006, 007, 008, 009, 011-020, 022, 023, 024, 027, 028, 031, 032, 035, 036, 038, 041-046.
- Canonical suite baseline (unchanged from Event 69): 734 pass / 2 fail / 736 total. The 2 fails are SPEC-007 DEFERRED `tests/skills/plan/plan-001-migration.test.ts` (D-1 locked).

### Next batch (Batch 5b)

Wave 1a remainder: TASK-004 (CRIT schema; sequential on `schemas/index.ts` barrel after TASK-003 lands — barrel safe now since TASK-003 closed). TASK-006 (ANALYSIS parser; different file `parsers/analysis-note.ts` + `parsers/index.ts` barrel — could parallel with TASK-004 if scope confirmed file-disjoint).

Per R3 barrel-collision mitigation: TASK-004 + TASK-006 touch DIFFERENT barrels (`schemas/index.ts` vs `parsers/index.ts`), so parallel dispatch is safe. Both bun-ts-engineer.

Batch 5b dispatch plan: impl-004 (bun-ts-engineer; CRIT schema) + impl-006 (bun-ts-engineer; ANALYSIS parser) in parallel.

Marathon math: 15/46 (33%). Remaining 31 TASKs ≈ 7 more batches at the established cadence.


## Event 71 — Batch 5b dependency catch + solo TASK-004 dispatch

Pre-dispatch read of TASK-004 + TASK-006 surfaced a dependency that the Event 70 Batch 5b plan glossed over. TASK-006's frontmatter `depends_on` list includes `[[TASK-004-SPEC-008: Implement CRIT Schema]]` — TASK-006 (ANALYSIS + EPIC + CRIT parsers) cannot be authored until TASK-004 (CRIT schema) lands, because `parseCritNote` imports + validates against `CritNoteSchema` per the established TASK-005 parser pattern (parser ends with `*NoteSchema.parse()` for final validation).

This is an R3-like dependency collision (different shape than barrel collision but same parallel-unsafe class). Per `feedback_stop_the_line_on_drift` + `feedback_spec_implementation_no_assumptions`, the Event 70 closing paragraph that proposed TASK-004 + TASK-006 in parallel was wrong; correcting course before dispatch.

**Corrected plan**:
- **Batch 5b**: TASK-004 (CRIT schema) ALONE — sequential dispatch.
- **Batch 5c** (next): TASK-006 (ANALYSIS + EPIC + CRIT parsers) — after TASK-004 closes, all 4 schema deps available (002 + 003 + 004 + 005 + 029 all DONE).

PLAN transitions this Event:
- impl-TASK-004-SPEC-008: PENDING → IN_PROGRESS (Event 71; solo dispatch note in Fix Brief)
- PLAN-001 task-level wave graph: T004 label `⏸` → `⚡`; classDef declaration moves T004 to `inprogress` class.

Dispatch: bun-ts-engineer (foreground) for impl-TASK-004. File set: NEW `shared/composition/src/schemas/crit-note.ts` + NEW `shared/composition/tests/schemas/crit-note.test.ts` + MODIFY `shared/composition/src/schemas/index.ts` (+CritNoteSchema, +CritNote re-export).

Critical brief contents:
- 12 DoD items + 3 ADR Compliance items
- DEFERRED SPEC-007 baseline (734/2/736 expected; 2 fails in plan-001-migration.test.ts per D-1)
- Parent-reference regex `^CRIT-\d{3}-(ADR|ANALYSIS|SPEC|REQ|DESIGN|TASK)-\d{3}.*`
- No claim validator per ADR-005 D-5 (CRIT has no terminal-status claim)
- Findings table with severity enum + description + recommendation
- common.ts relation verb allowlist + `.strict()` on sub-schemas
- File-disjoint with no concurrent batch member (solo)

Commit will land impl returns + PLAN transitions + this Event + session note in one atomic state-sync after agent returns.


## Event 72 — impl-TASK-004 PASS; dispatching qa-004

bun-ts-engineer agent a7ab239f5d807ed9d (foreground; 33 tool_uses; 478s). PASS.

- NEW: `shared/composition/src/schemas/crit-note.ts` (137 lines; CritNoteSchema + CritFindingSchema + parent-ref regex superRefine + `.strict()` on all sub-schemas)
- NEW: `shared/composition/tests/schemas/crit-note.test.ts` (262 lines; 29 cases — far above ≥5 floor)
- MODIFY: `shared/composition/src/schemas/index.ts` (+1 line; CritNoteSchema + CritNote re-export)
- 12 DoD + 3 ADR Compliance all `[x]` on TASK note
- Verified NEGATIVE DoD #7: no `validators/crit-claim-validator.ts` created (CRIT has no terminal-status claim per ADR-005 D-5)

Independent orchestrator verification:
- `bun test`: 763 pass / 2 fail / 765 total (delta +29 = exact CRIT test count). Same 2 fails (SPEC-007 DEFERRED baseline per D-1).
- TASK-004 note `[x]` count: 15 (12 DoD + 3 ADR Compliance) — matches agent claim
- Wave 1a now: 7 DONE (001/002/003/004/005/010/030); 1 PENDING (006). TASK-006 dep-unblocked.

New canonical suite baseline post-Event-72: **763 pass / 2 fail / 765 total**.

PLAN transitions:
- impl-TASK-004-SPEC-008: IN_PROGRESS → DONE (Event 72)
- qa-TASK-004-SPEC-008: PENDING → IN_PROGRESS (Event 72; dispatching brain:🧠-qa next)

Next: commit code + PLAN + session atomically, then dispatch qa-004.


## Event 73 — Batch 5b CLOSED: qa-004 PASS; 16/46 TASKs DONE; REQ-001 ACs 7+8 cross-cutting flip

brain:🧠-qa agent ad835e781b99f26dc (foreground; 45 tool_uses; 543s). PASS — QA-059-SPEC-008 authored.

**Notable AC clarification surfaced by QA**: REQ-001 AC-5 (CRIT H1-drift detection) is N/A at schema layer — no schema in the suite has an `h1` field; H1 extraction is parser-layer (`ast-helpers.ts:140`). AC-5 stays `[ ]` on REQ-001 until TASK-006 (CRIT parser) lands. This is a documented + correct interpretation per the established schema-vs-parser separation; the schema enforces structural invariants intrinsic to the model, parsers handle AST extraction concerns.

**Cross-cutting REQ-001 AC flips** (now that all 5 schemas landed):
- REQ-001 AC-7 [x] — final-two-sections invariant enforced by ALL 5 schemas (ADR/ANALYSIS/EPIC/CRIT/PLAN-ext)
- REQ-001 AC-8 [x] — relation verb allowlist enforced by ALL 5 schemas via common.ts

REQ-001 still DRAFT (7/8 ACs flipped; AC-5 gates on TASK-006 parser; status flips DRAFT→ACCEPTED only when ALL ACs satisfied AND all child TASKs DONE).

### Full Event 55 propagation

- TASK-004 note: status TODO → DONE (agent flipped); Relations updated to add `relates_to` link to QA-059-SPEC-008.
- REQ-001 AC-7 + AC-8 flipped `[x]` with cross-cutting "closed by TASK-004-SPEC-008 closure" annotations.
- SPEC-008 root `### Tasks (46)` rollup: TASK-004 flipped `[ ]` → `[x]`. Rollup now: 16/46 tasks `[x]` (001, 002, 003, 004, 005, 010, 021, 025, 026, 029, 030, 033, 034, 037, 039, 040).
- SPEC-008 root REQ rollup: REQ-001 stays `[ ]` (AC-5 + TASK-006 still gating; will flip when CRIT parser lands).
- SPEC-008 root DESIGN rollup: DESIGN-001 stays `[ ]` (covers TASK-001..010; only 6/10 closed: 001/002/003/004/005/010; TASK-006/007/008/009 still PENDING).
- PLAN-001 qa-TASK-004: IN_PROGRESS → DONE (Test Report Ref QA-059).
- PLAN-001 task-level wave graph: T004 `⚡` → `✅`; classDef → done; Wave 1a subgraph header updated `7 DONE, 1 PENDING — Batch 5c: TASK-006 ANALYSIS+EPIC+CRIT parsers; dep-unblocked`.

### Marathon state after Event 73

- **16 TASKs CLOSED** (impl + QA both PASS) — 35% complete.
- **0 TASKs IN_PROGRESS**.
- **30 TASKs PENDING**: 006, 007, 008, 009, 011-020, 022, 023, 024, 027, 028, 031, 032, 035, 036, 038, 041-046.
- Canonical suite baseline: 763 pass / 2 fail / 765 total (unchanged from Event 72; QA-059 added no new code).

### Next: Batch 5c

TASK-006 (ANALYSIS + EPIC + CRIT parsers) is now dep-unblocked (all 4 schema deps DONE: 002/003/004/005; rename 029 DONE). TASK-006 is a LARGER scope than prior batches (3 parsers + 12+ tests across 3 type-specific section handlers). Estimated effort per TASK note: AI-Dominant 2d. The implementer briefs MUST be precise about per-type variation (ANALYSIS Open Questions detection; EPIC Contained Specs section; CRIT Findings table parsing).

Wave 1a closes at TASK-006 closure. Wave 1b (per-skill scripts 011-020) follows.

Marathon math: 16/46 (35%). Remaining 30 TASKs ≈ 7 more batches at established cadence.


## Event 74 — Batch 5c START: impl-TASK-006 dispatch (3-parser closer for Wave 1a)

User adjudicated push-through. Solo dispatch of TASK-006 (3 parsers in one TASK) — largest single-TASK in the marathon. PLAN transition: impl-TASK-006 PENDING → IN_PROGRESS. Wave graph T006 inprogress.

Dispatching bun-ts-engineer (foreground). Files: NEW `shared/composition/src/parsers/{analysis-note.ts,epic-note.ts,crit-note.ts}` + NEW `shared/composition/tests/parsers/{analysis-note.test.ts,epic-note.test.ts,crit-note.test.ts}` + MODIFY `shared/composition/src/parsers/index.ts`.

Wave 1a closer: on impl + QA both PASS, all 8 Wave 1a TASKs close. REQ-001 AC-5 (H1 drift detection at parser layer) flips at TASK-006 closure. REQ-002 (parser suite) ACs flip per TASK-006 contribution.


## Event 75 — impl-TASK-006 PASS (after clean re-dispatch); dispatching qa-006

First dispatch of impl-TASK-006 died on an internal error (tool result missing) BEFORE any work — filesystem verified clean (zero parser files, clean git tree, TASK note 0 DoD flips). Clean re-dispatch per `feedback_api_rate_limit_recovery_protocol` (verify partial outputs before relaunch). Second dispatch succeeded.

bun-ts-engineer agent a147cc52d67dbb7ab (foreground; 47 tool_uses; 646s). PASS — 15 DoD + 3 ADR Compliance all `[x]`.

- NEW: `shared/composition/src/parsers/analysis-note.ts` (186L) + `epic-note.ts` (244L) + `crit-note.ts` (209L)
- NEW: `shared/composition/tests/parsers/analysis-note.test.ts` (167L) + `epic-note.test.ts` (164L) + `crit-note.test.ts` (138L)
- MODIFY: `shared/composition/src/parsers/index.ts` (13→29L; +3 parser exports + type re-exports)
- Targeted: 25 pass / 0 fail (>12 floor)
- All 3 parsers mirror TASK-005 parseAdrNote pattern (unified + remarkParse + remarkFrontmatter + remarkGfm; js-yaml frontmatter; shared ast-helpers; final schema .parse())

**Agent design-note (resolved against authority chain; NOT a halt)**: DoD items 4+5 say parser "sets `body.hasOpenQuestions`/`body.containedSpecs` on the parsed model" but the `.strict()` AnalysisNoteSchema/EpicNoteSchema have no such fields. Agent resolved by returning the schema-validated note with the DoD-named derived value attached as an extra wrapper property (`ParsedAnalysisNote = AnalysisNote & { hasOpenQuestions }`, `ParsedEpicNote = EpicNote & { containedSpecs }`). CRIT's `findings` IS a first-class schema field so it goes into the validated model directly. This honors both the DoD naming AND the `.parse()` + `.strict()` contract without schema modification. **Flagged for QA to verify against REQ-002 ACs** — if REQ-002 requires these as schema fields rather than wrapper-derived, this is a partial finding.

**Agent correctly declined out-of-scope**: skill-audit flagged project-config drift (missing vitest.config.ts; tsconfig fields) + tried to relocate crit-note.test.ts into `__tests__/`. Agent REVERTED the move + left config untouched — project standardizes on bun:test across all 84 test files; parser tests stay flat in `tests/parsers/` matching adr-note.test.ts + the DoD literal path. TASK-006 Files Affected lists only the 6 files + barrel; no vitest/tsconfig edits authorized. Correct scope discipline.

### Independent orchestrator verification

- `bun test`: 788 pass / 2 fail / 790 total. Delta from pre-batch (763/2/765): +25 = exact targeted test count. Same 2 SPEC-007 DEFERRED fails (D-1).
- `cd shared/composition && bunx tsc --noEmit`: exit 0 (clean)
- biome scoped (7 files): "No fixes applied" PASS
- TASK-006 note: 18 `[x]` (15 DoD + 3 ADR Compliance), 0 `[ ]` — matches agent claim
- New canonical suite baseline post-Event-75: **788 pass / 2 fail / 790 total**

**LSP new-diagnostics noise (NOT a regression)**: editor surfaced "Cannot find module 'bun:test'" + "Cannot find module '../../src/parsers/crit-note.js'" on `crit-note.test.ts`. These are FU-2 workspace-tsconfig-scope false positives (same class flagged Event 62 for hooks/lib). `cd shared/composition && tsc --noEmit` is clean (exit 0); the errors are root-LSP resolution artifacts from `tests/parsers/**` not being in the LSP-active tsconfig scope. Tracked under FU-2 (PLAN-001 Post-Marathon Follow-Up Backlog).

PLAN transitions:
- impl-TASK-006-SPEC-008: IN_PROGRESS → DONE (Event 75)
- qa-TASK-006-SPEC-008: PENDING → IN_PROGRESS (Event 75; dispatching brain:🧠-qa next)

Next: commit code + PLAN + session atomically, then dispatch qa-006.


## Event 76 — Batch 5c CLOSED: qa-006 PASS; Wave 1a 8/8 DONE; REQ-002 ACCEPTED; REQ-001 AC-5 contradiction surfaced (STOP-THE-LINE)

brain:🧠-qa agent abfb71cfd53115301 (foreground; 49 tool_uses; 622s). PASS — QA-060-SPEC-008 authored.

**REQ-002 wrapper-vs-schema-field judgment (the one non-mechanical call)**: QA confirmed the impl agent's wrapper approach (`ParsedAnalysisNote = AnalysisNote & { hasOpenQuestions }`) SATISFIES REQ-002. No REQ-002 AC mandates these as schema-validated fields; ACs require (1) accessible derived data on parser return + (2) schema-level structural rejection of invalid states. Both delivered; `.strict()` integrity preserved.

### Full Event 55 propagation

- TASK-006 note: status TODO → DONE; Relations + `relates_to` QA-060.
- REQ-002 ALL 7 ACs flipped `[x]`: AC-1 (ADR, prior TASK-005); AC-2 (ANALYSIS Open Questions); AC-3 (EPIC contains array); AC-4 (CRIT findings); AC-5 (PLAN parser parts — confirmed via TASK-010/QA-058); AC-6 (all 4 parsers throw on wrong type); AC-7 (round-trip all 4).
- **REQ-002 status DRAFT → ACCEPTED** — first REQ to fully close in SPEC-008 (all 7 ACs + both child TASKs 005+006 DONE).
- SPEC-008 root: TASK-006 rollup `[x]` (17/46); REQ-002 rollup `[x]`.
- PLAN-001 qa-TASK-006: IN_PROGRESS → DONE (QA-060).
- PLAN-001 wave graph: T006 `⚡`→`✅`; classDef → done; **Wave 1a subgraph header → "8/8 DONE ✅ — Wave 1a CLOSED; REQ-002 ACCEPTED"**.

### STOP-THE-LINE finding — REQ-001 AC-5 contradiction (per drift protocol)

While processing closure I found a contradiction between two QA contract notes on **REQ-001 AC-5** (CRIT H1-drift detection):

- AC-5 text: "GIVEN a CRIT note with the H1 not matching frontmatter title verbatim WHEN `CritNoteSchema.parse()` is called THEN validation fails with a message identifying the H1 drift"
- **QA-059** (TASK-004 CRIT schema): ruled AC-5 N/A at schema layer — "no schema in the 12-schema suite has an h1 field; H1 extraction is parser-layer (ast-helpers.ts:140); AC-5 closable when the CRIT parser (REQ-002 scope) is implemented" → deferred AC-5 to the parser, left `[ ]`.
- **QA-060** (TASK-006 CRIT parser): ruled AC-5 "targets the CritNoteSchema (TASK-004), not the parser; the parser at crit-note.ts does NOT implement H1-drift detection itself — it delegates to the schema; H1-drift is a cross-cutting schema concern; TASK-006 does not close AC-5; it was closed by TASK-004" → left `[ ]`, pointed back at TASK-004.

**Each QA points at the other; neither confirms H1-drift detection is actually implemented anywhere.** Root cause: the AC text asserts `CritNoteSchema.parse()` detects H1 drift, but (a) the schema has no `h1` field by design (schemas validate the parsed model's intrinsic structure; the model carries no raw H1 string), and (b) the parser explicitly delegates structural validation to the schema and does NOT compare extracted H1 vs frontmatter title. So REQ-001 AC-5 is **UNMET by any landed code** — a coverage gap that fell between the schema TASK and the parser TASK.

Both TASK-004 + TASK-006 correctly PASS their own DoDs (neither DoD enumerated an AC-5 mechanism — the DoD-vs-REQ-AC mapping for AC-5 was never assigned to a concrete TASK deliverable). This is a spec-decomposition gap, not an impl failure.

**Action per `feedback_stop_the_line_on_drift`**: did NOT flip REQ-001 AC-5 `[x]` (it is genuinely unmet). REQ-001 stays DRAFT (7/8 ACs satisfied; AC-5 the lone holdout). Forward motion on OTHER TASKs is not blocked (AC-5 gates only REQ-001 ACCEPTED, not the marathon). Surfacing a fix-or-defer decision to the user next.

### Marathon state after Event 76

- **17 TASKs CLOSED** (37%): 001-006, 010, 021, 025, 026, 029, 030, 033, 034, 037, 039, 040. **Wave 1a fully closed (8/8).**
- **0 IN_PROGRESS.**
- **29 PENDING**: 007, 008, 009, 011-020, 022, 023, 024, 027, 028, 031, 032, 035, 036, 038, 041-046.
- **REQ-002 ACCEPTED** (first REQ closed).
- Canonical suite baseline: 788 pass / 2 fail / 790 total.
- Open finding: REQ-001 AC-5 (CRIT H1-drift) unmet — fix-or-defer decision pending.

Next: commit Batch 5c closure, then surface the REQ-001 AC-5 fix-or-defer decision.


## Event 77 — D-4 LOCKED; REQ-001 AC-5 gap closed via TASK-047 amendment (spec-amend first, then dispatch)

User adjudicated the Event 76 stop-the-line REQ-001 AC-5 finding (AskUserQuestion):

> **D-4 LOCKED — Add H1-drift check to CRIT parser via TASK amendment (Recommended)** — Amend TASK-006 (or author a small follow-up TASK) to add H1-vs-frontmatter-title verbatim comparison in parseCritNote — the parser DOES have the raw H1 from the AST, so it's the natural home. On drift, throw a Zod-style error naming the mismatch. Re-dispatch a small impl + qa cycle. Closes AC-5 properly; unblocks REQ-001 ACCEPTED once TASK-007/008/009 also land. parser-layer is the correct mechanism; AC wording is slightly off but intent is clear.

Per `feedback_mid_implementation_halt` + `feedback_write_decisions_immediately`: amended the spec FIRST (user authorized the approach), then dispatch. Two design calls within the authorization:

1. **AC-5 wording corrected**: REQ-001 AC-5 reworded from `CritNoteSchema.parse()` → `parseCritNote(markdown)` (parser-layer; matches design reality — schema validates the parsed model which has no raw H1 string). Rationale annotated inline in the AC.
2. **New TASK-047 rather than reopen closed TASK-006**: keeps closures immutable (clean audit trail) + correctly files the work as REQ-001 AC-5 (not REQ-002). TASK-047 modifies the parser file TASK-006 created but satisfies a REQ-001 AC. Reopening TASK-006 would cascade un-closure (DONE→IN_PROGRESS, re-QA) and conflate REQ-002 work with a REQ-001 AC.

### Spec amendment writes (this Event)

- REQ-001 AC-5 reworded (parser-layer) with inline rationale.
- TASK-047-SPEC-008 authored (Pattern 2 three-phase write): `S` effort, 0.25d AI-Dominant; MODIFY `crit-note.ts` parser + tests; 10 DoD + 2 ADR Compliance. Uses existing `extractH1(ast)` helper at `ast-helpers.ts:140`. depends_on TASK-006; relates_to QA-060 + REQ-001 + DESIGN-001.
- SPEC-008 root: `### Tasks (46)` → `(47)`; TASK-047 added to rollup `[ ]` + Relations `contains`.
- REQ-001 Relations: `implemented_by TASK-047` added (bi-dir with TASK-047's `implements REQ-001`).
- PLAN-001: seeded impl-TASK-047 (IN_PROGRESS Event 77) + qa-TASK-047 (PENDING).
- PLAN-001 wave graph: T047 node added to Wave 1c subgraph (inprogress); classDef updated; Wave 1c header notes the follow-up.

### Marathon scope adjusted

46 → **47 TASKs**. 17 CLOSED (now 36% of 47). REQ-001 AC-5 mechanism now owned by a concrete TASK; REQ-001 unblockable once AC-5 (TASK-047) + the cross-cutting validator ACs land.

Next: dispatch impl-TASK-047 (bun-ts-engineer; small additive parser change). Then qa-047. Then REQ-001 AC-5 flips on closure.

Commit spec amendment + PLAN + Event 77 before dispatch.


## Event 78 — impl-TASK-047 PASS; dispatching qa-047

bun-ts-engineer agent a0d2f0bc8a2d89bae (foreground; 37 tool_uses; 409s). PASS — 10 DoD + 2 ADR Compliance all `[x]`.

- MODIFY `crit-note.ts` (+21L): import extractH1; H1-drift block at line 194 (before CritNoteSchema.parse); plain Error not ZodError; message includes both H1 text + frontmatter title; null-H1 case explicitly named.
- MODIFY `tests/parsers/crit-note.test.ts` (+55L net): 5 new H1-drift cases.

**Two agent HALT items, both well-handled**:
1. Two existing TASK-006 rejection tests (`unparented`, `wrongParent`) mutated only the `title:` frontmatter line, leaving H1 stale — after the new H1-drift check (runs first) they'd throw Error before reaching their intended ZodError. Agent fixed both to `.replaceAll()` (mutate title + H1 in lockstep), preserving original schema-layer test intent. Correct per CONVENTIONS Section 4.3. No production-fixture had mismatched H1 (CRIT_VALID already matched).
2. bun-ts audit `--fix` tried to relocate the test into `__tests__/` subdir; agent reverted per the project's locked flat-directory convention (ADR-005 D-2; matches adr/analysis/epic parser test layout). Spec-is-authority override; correct.

Independent verification:
- `bun test`: 793 pass / 2 fail / 795 total (delta +5 = new H1-drift cases). Same 2 SPEC-007 DEFERRED fails (D-1).
- TASK-047 note: 12 `[x]` (10 DoD + 2 ADR Compliance), 0 `[ ]`.
- H1-drift wired at crit-note.ts:194 (verified via grep).
- New canonical suite baseline post-Event-78: **793 pass / 2 fail / 795 total**.

PLAN transitions:
- impl-TASK-047-SPEC-008: IN_PROGRESS → DONE (Event 78)
- qa-TASK-047-SPEC-008: PENDING → IN_PROGRESS (Event 78; dispatching brain:🧠-qa next)

Next: commit, dispatch qa-047. On PASS: REQ-001 AC-5 flips `[x]` (the gap-closer's purpose). REQ-001 then 8/8 ACs but stays DRAFT until child TASKs 007/008/009 (validators) + TASK-002/003/004 (already done) + this — actually REQ-001 child TASKs = the schema TASKs 001/002/003/004/010 + now 047. With AC-5 closed, REQ-001 ACs all satisfied; REQ-001 → ACCEPTED iff all child TASKs DONE (verify at qa-047 closure).


## Event 79 — TASK-047 CLOSED; qa-047 PASS; REQ-001 ACCEPTED (gap fully closed); 18/47 TASKs DONE

brain:🧠-qa agent a0e6b42a1c862cb69 (foreground; 22 tool_uses; 298s). PASS — QA-061-SPEC-008 authored.

**REQ-001 AC-5 closure verdict: YES.** parseCritNote (crit-note.ts:194) calls extractH1, compares verbatim vs frontmatter.title, throws plain Error (not ZodError) on drift OR absent-H1, before CritNoteSchema.parse. 5 dedicated tests mechanically prove the AC. Both agent HALT-resolutions verified correct by QA: (1) the 2 lockstep-fixed rejection tests still test their original schema-layer ZodError intent; (2) test file is at the flat path (not `__tests__/`).

### Full Event 55 propagation (with REQ-001 closure)

- TASK-047 note: status TODO → DONE; Relations + `relates_to` QA-061.
- **REQ-001 AC-5 flipped `[x]`** — the gap-closer's purpose achieved. All 8 REQ-001 ACs now `[x]`.
- **REQ-001 status DRAFT → ACCEPTED** — all 8 ACs satisfied AND all child schema TASKs DONE (001/002/003/004/010/047). Second REQ to fully close (after REQ-002).
- SPEC-008 root: TASK-047 rollup `[x]` (**18/47**); REQ-001 rollup `[x]`.
- PLAN-001 qa-TASK-047: IN_PROGRESS → DONE (QA-061).
- PLAN-001 wave graph: T047 `⚡`→`✅`; classDef → done.
- DESIGN-001 (Coverage Module Layout, covers TASK-001..010): stays `[ ]` — 7/10 child TASKs done (001-006+010); 007/008/009 validators still PENDING.

### Marathon state after Event 79

- **18 TASKs CLOSED** (38% of 47): 001-006, 010, 021, 025, 026, 029, 030, 033, 034, 037, 039, 040, 047.
- **0 IN_PROGRESS.**
- **29 PENDING**: 007, 008, 009, 011-020, 022, 023, 024, 027, 028, 031, 032, 035, 036, 038, 041-046.
- **2 REQs ACCEPTED**: REQ-001 (schema suite) + REQ-002 (parser suite).
- Canonical suite baseline: **793 pass / 2 fail / 795 total**.
- REQ-001 AC-5 gap CLOSED — no open findings.

### Next: Wave 1b or validators

Two natural next directions:
- **Wave 2/3 validators** (TASK-007 validateAdrAcceptedClaim + 008 validateAnalysisAcceptedClaim + 009 validateEpicDoneClaim) — barrel-serialized on `validators/index.ts`; closes REQ-003 (which already has AC-5/6 done via TASK-010); DESIGN-001 closes when 007/008/009 land (completing TASK-001..010 set).
- **Wave 1b per-skill scripts** (TASK-011-020) — 10 TASKs; Track 2.

Recommend validators next (007/008/009) — small, closes REQ-003 + DESIGN-001, completes the Track-1 coverage suite. Barrel-serialized so sequential within the sub-wave.

Marathon math: 18/47 (38%). Remaining 29 TASKs ≈ 6-7 batches.


## Event 80 — Batch 6 START: validators TASK-007 + 008 + 009 (parallel; barrel orchestrator-owned per R3)

User adjudicated push-through for the validators batch. 3 impls dispatched in PARALLEL (bun-ts-engineer × 3; foreground). Each writes its own validator file + own test file; tests import directly from their validator file (matching plan-claim-validator.test.ts pattern), NOT the barrel. **Critical R3 coordination**: all 3 DoDs require `validators/index.ts` re-export, but the barrel is the single shared file → agents are instructed NOT to touch it; the orchestrator adds all 3 barrel exports in ONE coordinated edit after all 3 return, then flips those barrel DoD items. This honors "batch" (parallel) + R3 barrel-serialization (no concurrent barrel writes).

File-disjointness (excluding the orchestrator-owned barrel):
- impl-007 → `validators/adr-claim-validator.ts` + `tests/validators/adr-claim-validator.test.ts`
- impl-008 → `validators/analysis-claim-validator.ts` + `tests/validators/analysis-claim-validator.test.ts`
- impl-009 → `validators/epic-claim-validator.ts` + `tests/validators/epic-claim-validator.test.ts`

All deps satisfied: TASK-001/002/003 (schemas) + TASK-005/006 (parsers) + TASK-010 (barrel exists) + TASK-029 (rename) all DONE.

Per-validator scope:
- **007 validateAdrAcceptedClaim** (P0): fires at status ACCEPTED; checks (1) all Clarifications `[x]`, (2) all Considered Options have rationale. Pure. unsatisfied[] with dotted-bracket path.
- **008 validateAnalysisAcceptedClaim** (P1; closes Wave 7 exploit): fires at ACCEPTED; rejects body.hasOpenQuestions. Single check. Pure.
- **009 validateEpicDoneClaim** (P1; only cross-note validator): fires at DONE; iterates contains relations via injected `deps.resolveSpec`; THROWS on missing resolver or undefined resolution (no silent pass per ADR-005 D-5 Phase 3 critic P1.1). Pure given resolver.

8 PLAN workflow items already seeded (impl 007/008/009 IN_PROGRESS; qa 007/008/009 PENDING — wait, 6 items: 3 impl + 3 qa). Wave graph T007/008/009 inprogress.

Closes on completion: REQ-003 (claim validator suite; AC-5/6 already done via TASK-010) + DESIGN-001 (Coverage Module Layout; completes TASK-001..010 set). Track-1 coverage suite fully landed.

Commit PLAN transitions + Event 80, then process returns.


## Event 81 — Batch 6 impls all PASS; coordinated barrel pass; 3 impls DONE; dispatching 3 QAs

All 3 validator impls returned PASS (parallel; zero return-channel errors):

- **impl-007** (agent aeab033f3684366a2): `adr-claim-validator.ts` (95L) + test (187L; 8/0/8). Pure `{ok, unsatisfied}` with dotted-bracket paths (`clarifications[1].checkbox`, `considered_options[1].rationale`). Fires only at ACCEPTED; checks all-clarifications-checked + all-options-have-rationale. 11 DoD + 3 ADR `[x]` (barrel item left for orchestrator).
- **impl-008** (agent a5159c3aa1fe22472): `analysis-claim-validator.ts` (78L) + test (109L; 6/0/6). Reads `body.hasOpenQuestions`; **input-contract note**: accepts `ParsedAnalysisNote` (= AnalysisNote & {hasOpenQuestions}), NOT bare AnalysisNote, because hasOpenQuestions is a parser-derived prop absent from the `.strict()` schema. Reverted a bun-ts audit `__tests__/` auto-move per locked flat-dir convention. 10 DoD + 3 ADR `[x]`.
- **impl-009** (agent a45183b66f19b747f): `epic-claim-validator.ts` (110L) + test (205L; 10/0/10). Cross-note resolver injection; THROWS on missing resolver AND undefined resolution (no silent pass per ADR-005 D-5 Phase 3 critic P1.1). Reads `contains` via the Relations array (`relations.filter(verb==='contains')`), NOT the parser's containedSpecs derived prop, because input type is schema-validated EpicNote. Notable: SpecRootNoteStatusEnum has no DEFERRED/ABANDONED (unlike PLAN substatuses) so "satisfied" = `status==='DONE'` — TASK Description parenthetical doesn't apply. 12 DoD + 3 ADR `[x]`.

All 3 correctly left `validators/index.ts` untouched (R3).

### Orchestrator coordinated barrel pass (Event 81)

Per the R3-coordination plan, orchestrator added all 3 barrel exports to `shared/composition/src/validators/index.ts` in ONE Edit-tool pass (non-graph file): `validateAdrAcceptedClaim`+`AdrClaimResult`; `validateAnalysisAcceptedClaim`+`AnalysisClaimResult`; `validateEpicDoneClaim`+`EpicClaimResult`+`SpecResolver`. Post-edit verification: `cd shared/composition && tsc --noEmit` exit 0; biome on barrel clean. Then flipped the 3 orchestrator-owned barrel DoD items `[x]` on each TASK note with the Event-81 annotation.

### Independent orchestrator verification

- Repo-root `bun test`: **817 pass / 2 fail / 819 total**. Delta from 793/2/795 = +24 = exact sum of new validator tests (8+6+10). Same 2 SPEC-007 DEFERRED fails (D-1).
- New validator targeted run: 24/0/24 across 3 files.
- New canonical suite baseline post-Event-81: **817 pass / 2 fail / 819 total**.

PLAN transitions (6):
- impl-007/008/009: IN_PROGRESS → DONE (Event 81)
- qa-007/008/009: PENDING → IN_PROGRESS (Event 81; dispatching brain:🧠-qa ×3 next)

Wave graph T007/008/009 stay `inprogress` (impl-done; flip to done only on QA PASS per maintenance rule).

Next: commit code + barrel + PLAN + Event 81 atomically, then dispatch 3 QAs in parallel.


## Event 82 — Batch 6 fully CLOSED: qa-007/008/009 PASS; 21/47 TASKs DONE; REQ-003 + DESIGN-001 ACCEPTED

3 brain:🧠-qa agents returned PASS independently (parallel; QA-062/063/064 authored Pattern 2):

- **qa-007** (agent ab78e56d361d30228): PASS. 11 DoD + 3 ADR + REQ-003 ADR-validator ACs. 8/0/8. Clean pure-function; dotted-bracket paths verified.
- **qa-008** (agent a984a9af14749d3b4): PASS. 10 DoD + 3 ADR. 6/0/6. **Input-contract judgment confirmed**: accepting `ParsedAnalysisNote` (not bare AnalysisNote) is correct — hasOpenQuestions is a parser-derived prop absent from the `.strict()` schema; DoD item 3 mandates reading it.
- **qa-009** (agent a6b707c2ea3787f5d): PASS. 12 DoD + 3 ADR. 10/0/10. **Both no-silent-pass throw paths verified** (ADR-005 D-5 Phase 3 critic P1.1): missing resolver throws naming deps.resolveSpec; resolver-returns-undefined throws naming the SPEC ref.

### Full Event 55 propagation (with 2 closures)

- TASK-007/008/009 notes: status TODO → DONE; `relates_to` QA-062/063/064 added.
- **REQ-003 ACs 1,2,3,4,7,8 flipped `[x]`** (AC-5/6 done Event 70 via TASK-010). All 8 REQ-003 ACs now satisfied.
- **REQ-003 status DRAFT → ACCEPTED** (3rd REQ to close; all child TASKs 007/008/009/010 DONE).
- **DESIGN-001 compliance: all 8 items `[x]`** (Coverage Module Layout — TASK-001..010 set complete: 5 schemas + 4 parsers + 4 validators; CRIT correctly no-validator; common.ts imports; shared/ paths).
- **DESIGN-001 status DRAFT → ACCEPTED** (1st DESIGN to close).
- SPEC-008 root: TASK-007/008/009 rollup `[x]` (**21/47**); REQ-003 rollup `[x]`; DESIGN-001 rollup `[x]`.
- PLAN-001 qa-007/008/009: IN_PROGRESS → DONE (QA-062/063/064).
- PLAN-001 wave graph: T007/008/009 `⚡`→`✅`; Wave 2/3 subgraph header → "3/3 DONE ✅; REQ-003 + DESIGN-001 ACCEPTED".

### Marathon state after Event 82

- **21 TASKs CLOSED** (45% of 47): 001-010, 021, 025, 026, 029, 030, 033, 034, 037, 039, 040, 047.
- **0 IN_PROGRESS.**
- **26 PENDING**: 011-020, 022, 023, 024, 027, 028, 031, 032, 035, 036, 038, 041-046.
- **3 REQs ACCEPTED** (REQ-001 + REQ-002 + REQ-003 — the entire Track-1 coverage trilogy: schemas + parsers + validators).
- **1 DESIGN ACCEPTED** (DESIGN-001 Coverage Module Layout).
- Canonical suite baseline: **817 pass / 2 fail / 819 total**. 0 open findings.

**Track 1 (composition-library coverage extension) is functionally COMPLETE**: every one of the 5 note-types missing schema/parser/validator coverage (ADR/ANALYSIS/EPIC/CRIT + PLAN-ext) now has full Track-1 treatment, mechanically validated. This was the P0/P1 core of SPEC-008.

### Remaining waves

- **Wave 1b** (TASK-011-020): per-skill scripts (Track 2) — 10 TASKs.
- **Wave 1c** (TASK-022/023/027/028/031/032/035/036): cleanup + harness extensions — 8 TASKs.
- **Wave 4** (TASK-024/038/041-045): hook handlers + final fixtures (Track 5) — 7 TASKs.
- **Wave 5** (TASK-046): terminal smoke tests — 1 TASK.

Marathon math: 21/47 (45%). Remaining 26 TASKs ≈ 5-6 batches.


## Event 83 — Session PAUSED at Track-1 trilogy milestone (21/47, 45%)

User adjudicated (AskUserQuestion): **"Pause; resume fresh next context (Recommended)"** — 21/47 milestone with Track-1 coverage trilogy complete is a strong natural stopping point; the next waves deserve a fresh budget.

Session status IN_PROGRESS → PAUSED at the upcoming commit. All durable state preserved on `feat/plan-001-protocol-hardening-wave-2-scope`. Working tree clean after commit.

### This-context deliverables (Events 65-83)

- Rehydration + resumed SESSION-2026-05-23_02 from prior PAUSE (Event 64 → 65)
- 4 decisions LOCKED: D-1 (DEFERRED test baseline) + D-2 (FU-1/FU-2 tracked) + D-3 (DESIGN-004 DiffNote.sha deferred) + D-4 (REQ-001 AC-5 gap → TASK-047)
- Bulk-seeded all 34 remaining workflow items (68 impl+qa) + authored task-level wave graph
- **+7 TASKs CLOSED**: 030 (orchestrator-inline), 003, 010, 004, 006, 047 (follow-up), 007, 008, 009 → wait that's 9. Correction: this context closed TASK-030, 003, 010, 004, 006, 047, 007, 008, 009 = **9 TASKs** (13/46 at Event 65 start → 21/47 at Event 83; net +8 closed minus +1 scope-add = the marathon grew 46→47 via TASK-047)
- **+9 QA contract notes**: QA-056 through QA-064
- **3 REQs ACCEPTED**: REQ-001 (schemas) + REQ-002 (parsers) + REQ-003 (validators) — full Track-1 coverage trilogy
- **1 DESIGN ACCEPTED**: DESIGN-001 (Coverage Module Layout)
- 1 follow-up TASK authored + closed (TASK-047 — REQ-001 AC-5 H1-drift gap)
- Clean recoveries: 1 agent internal-error death (impl-006 re-dispatched), 1 cross-QA contradiction (REQ-001 AC-5 stop-the-line → D-4 → resolved)
- Suite baseline 705/2/707 → 817/2/819
- ~20 atomic commits

### Resume protocol (next context)

1. `/skills:plan PLAN-001-skills-ecosystem` continue mode → RESUMES this session (PAUSED → IN_PROGRESS; continue Event numbering from 84; do NOT create new note per `feedback_resume_paused_session_not_new`).
2. Rehydration (TIER-1 per `feedback_post_compaction_rehydration_protocol`): set active project `skills` + bootstrap_context; read PLAN-001 + this session Events 65-83; verify git on `feat/plan-001-protocol-hardening-wave-2-scope` at the Event-83 commit or later; recap.
3. **21/47 TASKs CLOSED.** Next-ready: Wave 1b (per-skill scripts TASK-011-020; Track 2; wires composition lib into /ingest /decompose /recompose /defrag skills). Then Wave 1c (cleanup 022/023/027/028/031/032/035/036), Wave 4 (hook handlers 024/038/041-045), Wave 5 (smoke tests 046).
4. Per-batch protocol unchanged: PLAN seed-transition (items already bulk-seeded — just PENDING → IN_PROGRESS) → commit → dispatch → orchestrator-verify gates → full Event 55 propagation per closure → commit.
5. Canonical suite baseline: **817 pass / 2 fail / 819 total** (2 fails = SPEC-007 DEFERRED `plan-001-migration.test.ts` per D-1; NEW failures elsewhere = regression).

### Open items for marathon resume

- **FU-1/FU-2/FU-3** (PLAN-001 Post-Marathon Follow-Up Backlog): frontmatter `validates:` key in QA-032/033/034; hooks/** tsconfig+biome scope gap; this session's Observations/Relations placement drift (lines 69/77 — relocate to true file-end at session-end per CONVENTIONS 4.0).
- **D-3 deferred**: DESIGN-004 DiffNote.sha amendment — revisit at TASK-043 (Layer 4/5 pre-push handler) dispatch.
- 0 active blockers; 0 open findings.

### Cumulative marathon state (across all sessions)

- build.SPEC-008: 21/47 TASKs CLOSED (45%).
- ACCEPTED: REQ-001, REQ-002, REQ-003; DESIGN-001.
- Still DRAFT (totality-gated): REQ-004..012; DESIGN-002/003/004; SPEC-008 root (Success/Acceptance Criteria; flips at full Wave close).


## Event 84 — Session RESUMED (PAUSED → IN_PROGRESS); rehydration complete; Wave 1b next

`/skills:plan PLAN-001-skills-ecosystem` continue mode. Resumed this session per the Event-83 resume protocol — continuing Event numbering from 84; no new note created (resume-paused-session-not-new rule).

### Rehydration (TIER-1)

- Active project `skills` set + `bootstrap_context` run.
- Read [[PLAN-001: Skills Ecosystem]]: `build.SPEC-008` IN_PROGRESS; 21/47 TASKs CLOSED; `protocol-hardening` umbrella IN_PROGRESS (flips DONE when build.SPEC-008 DONE).
- Read this session Events 76-83 (Track-1 trilogy close + pause point + resume protocol).
- Git verified: branch `feat/plan-001-protocol-hardening-wave-2-scope` at `bfeb589` (Event-83 PAUSE commit); working tree clean.
- Suite baseline confirmed: 817 pass / 2 fail / 819 (2 = SPEC-007 DEFERRED `plan-001-migration.test.ts` per D-1 LOCKED; new failures elsewhere = regression).

### Next-ready

`build.SPEC-008` Wave 1b — per-skill scripts TASK-011..020 (Track 2; wires the composition library into the /ingest /decompose /recompose /defrag skills). Routing to `/build` (spec=SPEC-008) for the rigid per-TASK build+QA cycle (steps a-u). Subsequent waves: Wave 1c cleanup (022/023/027/028/031/032/035/036), Wave 4 hooks (024/038/041-045), Wave 5 smoke (046).

### State Changes

- SESSION-2026-05-23_02: PAUSED → IN_PROGRESS (Event 84)


## Event 85 — Batch 7 START (Wave 1b Batch A): per-skill gate-point scripts TASK-011 + 015 + 016

Resuming marathon to completion (user cadence: "Run to completion" — pause only on real blocker / QA-fail cap / budget). Wave 1b = Track 2 per-skill scripts (TASK-011..020); wiring composition lib into lifecycle skills.

Batch A (file-disjoint, ≤4): impl PENDING → IN_PROGRESS for:

- [[TASK-011-SPEC-008: Implement validate-task-done Script]] → `skills/build/scripts/validate-task-done.ts`
- [[TASK-015-SPEC-008: Implement spec-Skill Schema Validator Scripts]] → `skills/spec/scripts/validate-{task,req,design}-schema.ts`
- [[TASK-016-SPEC-008: Implement lock-decision-mutation Script]] → `skills/decisions/scripts/lock-decision-mutation.ts`

All three implement [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]] + [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]]; only dep is TASK-029 (DONE). Code TASKs → `bun-ts-engineer` per build sequencing.

### Sequencing adjustments (dependency-graph reasoning, this context)

- **TASK-014 deferred within Wave 1b**: `depends_on` TASK-032 (Extend validateSpecDoneClaim for Deferred Notation; PENDING, Wave 1c). Will sequence TASK-032 ahead of TASK-014 rather than follow the wave label. [reflect-capture] wave labels are a guide; the dependency graph is authoritative.
- **Drift DEFERRED to Batch C** (stop-the-line, assessed): REQ-005/TASK-018 AC reference `validRelationTypes` imported from `shared/composition/src/schemas/common.ts`, but the actual Wave-1 export is `RelationVerbEnum` (a `z.enum`; `.options` for the array). Impact: TASK-018 `dispatch-qa` + REQ-005 AC ONLY; the 6 REQ-004 gate scripts (011/012/013/015/016/017) unaffected. Decision: proceed with Batches A+B now; adjudicate the symbol-name reconciliation with user before dispatching TASK-018.

### State Changes

- PLAN impl-TASK-011-SPEC-008: PENDING → IN_PROGRESS
- PLAN impl-TASK-015-SPEC-008: PENDING → IN_PROGRESS
- PLAN impl-TASK-016-SPEC-008: PENDING → IN_PROGRESS


## Event 86 — Batch 7 impls DONE (011+015+016); config drift fixed; dispatching QA

3 `bun-ts-engineer` implementers returned. Orchestrator re-ran gates INDEPENDENTLY (per Event-48):

- `bunx tsc --noEmit`: exit 0, clean across `skills/**`
- `bunx biome check skills/`: exit 0 (24 files)
- `bun test`: 845 pass / 2 fail / 847 — the 2 fails are EXACTLY the known-deferred SPEC-007 baseline (`TASK-014-SPEC-007: PLAN-001 trimmed-template migration` AC#1 + AC#3 in `plan-001-migration.test.ts`). Zero new regressions.
- Targeted: validate-task-done 6/6, spec schema-validators 15/15, lock-decision-mutation 7/7.

New code: `skills/build/scripts/validate-task-done.{ts,test.ts}` (61/131), `skills/spec/scripts/validate-{task,req,design}-schema.{ts,test.ts}` (3×), `skills/decisions/scripts/lock-decision-mutation.{ts,test.ts}` (171/293). All reconciled the DESIGN-002 representative-shape mismatch against the REAL API (`parseTaskNote`/`parseRequirementNote`/`parseDesignNote` do the markdown→object parse, then `Schema.parse`; `applyPlanMutation` discriminants).

### Config drift fixed (stop-the-line; in-build, not deferred)

- **`.gitignore` BLOCKER**: unanchored `build/` (line 15) ignored `skills/build/` everywhere — the `/build` skill's own `SKILL.md` + `references/**` were NEVER tracked. Fixed: `build/` → `/build/` (anchored to root build-output only). Side effect (correct): `skills/build/SKILL.md` + 3 references now properly tracked.
- **FU-2 config gap**: tsconfig `include` used `defrag/**`/`ingest/**` (NO `skills/` prefix → matched nothing; only explicit-path runs covered skill dirs); biome same. Fixed both to `skills/**` — now uniformly covers all skill script dirs. Supersedes the partial per-skill edits the implementers attempted (015 spec, 016 decisions).

### Findings carried forward (non-blocking for per-TASK closure)

- [finding] `lock-decision-mutation.ts` is 171 lines, exceeding DESIGN-002's SOFT "80-line ceiling for mutation scripts." TASK-016's own DoD has NO line-count item → per-TASK closure clean. The length is driven by DoD#3's dual-mutation (lock-decision + set-part-substatus) + multi-flag parsing. DISPOSITION: adjudicate at DESIGN-002 acceptance (totality-gated, later) — trim vs amend ceiling vs accept-as-soft. #design-002 #open-item
- [insight] TASK-011 DoD#4 ("exit 1 on status:DONE+unchecked") is mechanically a PARSE failure (schema superRefine) → exit 2, which satisfies parent REQ-004 AC wording "exits non-zero." Accepted with reconciliation. #spec-reconciliation

### State Changes

- TASK-011/015/016-SPEC-008: DoD + ADR-Compliance checkboxes → [x]
- PLAN impl-TASK-011/015/016-SPEC-008: IN_PROGRESS → DONE
- PLAN qa-TASK-011/015/016-SPEC-008: PENDING → IN_PROGRESS


## Event 87 — Batch 7 CLOSED (Wave 1b-A): TASK-011 + 015 + 016 DONE; 24/47

Independent QA (`brain:🧠-qa`, single batch agent) returned **3× PASS** — 28/28 colocated tests, tsc + biome clean, import boundaries clean, path-containment prefix-collision case (c) correctly rejected in all scripts (`+ sep` suffix load-bearing).

QA contract notes authored (Pattern 2 three-phase): [[QA-065-SPEC-008: Validation Report for TASK-011 Validate Task Done Script]], [[QA-066-SPEC-008: Validation Report for TASK-015 Spec Schema Validator Scripts]], [[QA-067-SPEC-008: Validation Report for TASK-016 Lock Decision Mutation Script]]. Bi-directional `relates_to` set on each TASK-to-QA pair.

Recovery note: parallel `move_note` (Pattern 2 Phase 3) raced — QA-065 moved, 066/067 failed leaving a stray kebab dup for 066. Removed stray + re-ran moves SEQUENTIALLY. [reflect-capture] `move_note` is NOT safe to parallelize (filesystem rename + DB index race); serialize all move_note calls.

### State Changes

- QA-065/066/067-SPEC-008: created (status DONE) + bi-dir relates_to to their TASKs
- TASK-011/015/016-SPEC-008: status TODO then DONE; reciprocal QA relation added
- PLAN qa-TASK-011/015/016-SPEC-008: IN_PROGRESS then DONE (Test Report Ref = QA-065/066/067)
- Marathon: 21/47 then **24/47** CLOSED


## Event 88 — Batch 8 START (Wave 1b-B): TASK-012 + 013 + 017

impl PENDING → IN_PROGRESS for:

- [[TASK-012-SPEC-008: Implement transition-impl-item Script]] → `skills/build/scripts/transition-impl-item.ts`
- [[TASK-013-SPEC-008: Implement transition-qa-item Script]] → `skills/build/scripts/transition-qa-item.ts`
- [[TASK-017-SPEC-008: Implement render-plan-note and set-part-done Scripts]] → `skills/plan/scripts/render-plan-note.ts` + `set-part-done.ts`

All REQ-004 (gate-point mutation/render scripts) + DESIGN-002. File-disjoint (012/013 distinct build files; 017 in plan/). Deps satisfied (TASK-029 DONE). Config already covers `skills/**` (no per-batch config edits needed). Code TASKs → `bun-ts-engineer`.

### State Changes

- PLAN impl-TASK-012/013/017-SPEC-008: PENDING → IN_PROGRESS


## Event 89 — Batch 8 impls DONE (012+013+017); SPEC-root + PLAN-graph derived-view sync (user directive)

3 `bun-ts-engineer` implementers returned. Orchestrator re-ran gates INDEPENDENTLY: `tsc --noEmit` exit 0; `biome check skills/` exit 0; `bun test` **891 pass / 2 fail / 893** (+46 = the 3 new test files: transition-impl 10 + transition-qa 11 + render+set-part-done 25; 2 fails = SPEC-007 deferred baseline; zero new regressions).

New code: `skills/build/scripts/transition-impl-item.{ts,test.ts}` (170/216), `transition-qa-item.{ts,test.ts}` (192/353), `skills/plan/scripts/render-plan-note.{ts,test.ts}` (122/217) + `set-part-done.{ts,test.ts}` (199/320). Sound spec-vs-schema reconciliations: `transition-*` mutations key on `partId`+`taskRef` (item-id derived); qa items carry `fix_brief_for_event` (not `failed_iterations`, which is impl-only); `set-part-substatus` folds rationale into `outcome` text + script pre-checks missing rationale → exit 2.

### USER DIRECTIVE (2× firm) — derived-view propagation is mandatory at ALL times

User: keep the SPEC-008 root note (EVERY checkbox list — Requirements, Designs, Tasks, Acceptance Criteria, Success Criteria) AND the PLAN dependency graphs current at all times. [reflect-capture] I had wrongly DEFERRED these derived-view syncs to save budget — that violates CONVENTIONS Category 2 (derived views must stay in sync with source). CORRECTED: every batch close now propagates to SPEC root all-5-lists + PLAN task-level Wave Graph. Propagation rules: SPEC-root Tasks flip `[x]` when a TASK is fully DONE (impl+qa); Requirements flip when REQ status ACCEPTED (all its TASKs done); Designs when DESIGN ACCEPTED; Acceptance/Success Criteria are totality-gated.

### Derived-view sync applied (debt cleared)

- SPEC-008 root `### Tasks`: TASK-011/015/016 → `[x]` (Batch A fully-DONE; now 24 ticked). 012/013/017 stay `[ ]` (qa in flight). Requirements/Designs/Acceptance/Success correctly unchanged (totality-gated; REQ-004 needs 011-017 + 014; nothing newly complete).
- PLAN "SPEC-008 Build Marathon" task-level Wave Graph: W1b nodes 011/015/016 → ✅, 012/013/017 → ⚡, `class` assignments + W1b/W1c labels + provenance line all updated. Part-level Progress Dashboard + Cross-Part graph unchanged (build.SPEC-008 still one IN_PROGRESS part).

### State Changes

- TASK-012/013/017-SPEC-008: DoD + ADR-Compliance checkboxes → [x]
- PLAN impl-TASK-012/013/017-SPEC-008: IN_PROGRESS → DONE
- PLAN qa-TASK-012/013/017-SPEC-008: PENDING → IN_PROGRESS
- SPEC-008 root Tasks: 011/015/016 → [x] (24/47 ticked)
- PLAN task-level Wave Graph: synced to current per-TASK status


## Event 90 — Batch 8 CLOSED (Wave 1b-B): TASK-012 + 013 + 017 DONE; 27/47

Independent QA (`brain:🧠-qa`) returned **3× PASS** — 46/46 tests, tsc + biome clean, mutation discriminants all match the real `PlanMutation` union (transition-impl-item / transition-qa-item / set-part-substatus), path-containment exact rule in all 4 scripts.

QA contract notes authored (Pattern 2; move_note SERIALIZED per Batch-A lesson — no race): [[QA-068-SPEC-008: Validation Report for TASK-012 Transition Impl Item Script]], [[QA-069-SPEC-008: Validation Report for TASK-013 Transition QA Item Script]], [[QA-070-SPEC-008: Validation Report for TASK-017 Render Plan Note and Set Part Done Scripts]]. Bi-directional relates_to set.

### Derived-view sync (per user directive — applied at batch close)

- SPEC-008 root `### Tasks`: 012/013/017 → `[x]` (now **27 ticked**). Requirements/Designs/Acceptance/Success unchanged (REQ-004 still needs 014; REQ-005 needs 018-020 — all totality-gated).
- PLAN task-level Wave Graph: W1b nodes 012/013/017 → ✅, `class` → done, label "6 DONE · 4 pending", provenance line → Event 90. Part-level dashboard + Cross-Part graph unchanged (build.SPEC-008 still one IN_PROGRESS part).

### Open items carried to next context

- **REQ-004 AC-9 test gap**: the 6 gate-point scripts implement the path-containment prefix-collision defense correctly (`+ sep`) but lack an explicit prefix-collision TEST. REQ-004 AC-9 mandates the 3 adversarial cases be VERIFIED. Add a prefix-collision test to one gate-point script BEFORE flipping REQ-004 → ACCEPTED (after 014 done).
- **validRelationTypes** (Batch C / TASK-018): SPEC-008 root Files Affected sanctions "add `validRelationTypes` export to common.ts" — so TASK-018 implementer adds the 1-line `export const validRelationTypes = RelationVerbEnum.options` (Track 1 closed without it). No user halt needed.
- TASK-014 still blocked on TASK-032 (Wave 1c). Sequence 032 → 014.

### State Changes

- QA-068/069/070-SPEC-008: created (DONE) + bi-dir relates_to to TASK-012/013/017
- TASK-012/013/017-SPEC-008: status DONE; reciprocal QA relation added
- PLAN qa-TASK-012/013/017-SPEC-008: IN_PROGRESS → DONE (Test Report Ref QA-068/069/070)
- SPEC-008 root Tasks: 012/013/017 → [x] (27/47 ticked); PLAN Wave Graph synced
- Marathon: 24/47 → **27/47** CLOSED


## Event 91 — Session PAUSED at 27/47 (budget); Wave 1b Batches A+B closed; derived views fully synced

This context resumed at 21/47 (Event 84) and closed **6 TASKs** (Wave 1b Batches A+B: 011/012/013/015/016/017 — all REQ-004/005 gate-point + the build/spec/decisions/plan per-skill scripts) → **27/47 (57%)**. Pausing at a clean, fully-committed, fully-synced boundary (budget-exhaustion stop, sanctioned by the run-to-completion cadence).

### This-context deliverables (Events 84-91)

- Resumed SESSION-2026-05-23_02 from PAUSE (Event 83 → 84); rehydration complete.
- 6 TASKs CLOSED via rigid per-TASK build+QA cycle in 2 bounded-parallel batches (Batch 7 = 011/015/016; Batch 8 = 012/013/017).
- 6 QA contract notes authored: QA-065 through QA-070 (bi-dir relates_to).
- Config drift fixed: `.gitignore` `build/`→`/build/` (skills/build/ source now tracked); tsconfig + biome `include` → `skills/**` (FU-2 RESOLVED). 12 commits.
- **User directive captured + applied**: SPEC-008 root all-5-lists + PLAN task-level Wave Graph synced at every batch close (no deferral). Auto-memory `feedback_spec_root_and_plan_graph_sync` created.
- Suite 845/2/847 → **891 pass / 2 fail / 893** (2 = SPEC-007 deferred baseline; zero new regressions).

### Resume protocol (next context)

1. `/skills:plan PLAN-001-skills-ecosystem` continue mode → RESUME this session (PAUSED → IN_PROGRESS; continue Event numbering from 92; no new note).
2. Rehydrate (TIER-1): set active project + bootstrap_context; read PLAN-001 + this session Events 84-91; verify git on `feat/plan-001-protocol-hardening-wave-2-scope` at the Event-91 commit; recap.
3. **27/47 CLOSED.** Next-ready: **Wave 1b Batch C** — TASK-018 (build dispatch-implementer + dispatch-qa) + 019 (decisions dispatch-architect + critic) + 020 (research dispatch-analyst + review dispatch-reviewer) = REQ-005 brief generators. TASK-018 implementer ALSO adds `export const validRelationTypes = RelationVerbEnum.options` to `shared/composition/src/schemas/common.ts` (per SPEC-008 Files Affected — Track 1 closed without it).
4. THEN: TASK-032 (extend validateSpecDoneClaim for `[~]`) → unblocks TASK-014; add a prefix-collision path-containment TEST to one gate-point script before flipping REQ-004 → ACCEPTED (REQ-004 AC-9). THEN Wave 1c (022/023/027/028/031/035/036), Wave 4 hooks (024/038/041-045), Wave 5 smoke (046).
5. **MANDATORY per batch close**: derived-view sync — SPEC-008 root all-5-lists + PLAN Wave Graph (per `feedback_spec_root_and_plan_graph_sync`).
6. `move_note` (Pattern 2 Phase 3) MUST be serialized — never parallel (filesystem+DB race).
7. Suite baseline: **891 pass / 2 fail / 893**.

### Cumulative marathon state

- build.SPEC-008: 27/47 (57%). ACCEPTED: REQ-001/002/003, DESIGN-001. SPEC-008 root Tasks rollup: 27 `[x]`.
- 0 active blockers; 0 open user decisions.


## Event 92 — Session RESUMED (PAUSED → IN_PROGRESS); rehydration complete; Wave 1b Batch C next

`/skills:plan PLAN-001-skills-ecosystem` continue mode, fresh context window. Resumed this session per the Event-91 resume protocol — continuing Event numbering from 92; no new note created (resume-paused-session-not-new rule).

### Rehydration (TIER-1, full checklist)

- Auto-memory sweep: re-read post-compaction-rehydration-protocol, resume-paused-session-not-new, per-task-build-qa-cycle, spec-root-and-plan-graph-sync (all TIER-1 build memories).
- Active project `skills` set + `bootstrap_context` (7d) run.
- Read [[PLAN-001: Skills Ecosystem]]: `build.SPEC-008` Substatus IN_PROGRESS (owning SESSION-2026-05-23_02); verified impl/qa items — 011-013/015-017 DONE, 018/019/020 PENDING; build sequencing approach LOCKED (Event 48, bounded-parallel ≤4 file-disjoint + per-TASK QA gate); Pending User Decisions (none); SPEC-008 blockers none.
- Read this session Events 84-91 (Wave 1b Batches A+B close + budget pause + resume protocol).
- Git verified: branch `feat/plan-001-protocol-hardening-wave-2-scope` at `168fb10` (Event-91 PAUSE commit); working tree clean.
- Suite baseline: 891 pass / 2 fail / 893 (2 = SPEC-007 DEFERRED `plan-001-migration.test.ts` per D-1 LOCKED; new failures elsewhere = regression).

### Harness note

Stray harness message surfaced at skill launch: "issue with the selected model (claude-sonnet[1m])". This conversation runs on `claude-opus-4-7[1m]`. Flagged to user; subagent dispatches will carry explicit model overrides to avoid a broken default.

### Next-ready

`build.SPEC-008` **Wave 1b Batch C** — REQ-005 brief-generator scripts (file-disjoint across build/ decisions/ research/ skill dirs):
- [[TASK-018-SPEC-008: Implement build-Skill Dispatch Brief Generators]] — build dispatch-implementer + dispatch-qa; ALSO adds `export const validRelationTypes = RelationVerbEnum.options` to `shared/composition/src/schemas/common.ts` (per SPEC-008 Files Affected).
- [[TASK-019-SPEC-008: Implement decisions-Skill Dispatch Brief Generators]] — decisions dispatch-architect + critic.
- [[TASK-020-SPEC-008: Implement research-Skill Dispatch Brief Generators]] — research dispatch-analyst + review dispatch-reviewer.

Routing to `/build` (spec=SPEC-008) for the rigid per-TASK build+QA cycle (steps a-u). THEN: TASK-032 → unblocks TASK-014 + add REQ-004 AC-9 prefix-collision test before REQ-004 ACCEPTED; THEN Wave 1c (022/023/027/028/031/035/036), Wave 4 hooks (024/038/041-045), Wave 5 smoke (046). Derived-view sync MANDATORY at every batch close.

### State Changes

- SESSION-2026-05-23_02: PAUSED → IN_PROGRESS (Event 92)


## Event 93 — Batch 9 START (Wave 1b Batch C): TASK-018 + 019 + 020 (REQ-005 brief generators)

Resuming marathon (run-to-completion cadence). Wave 1b Batch C = REQ-005 dispatch-brief generators wiring the composition library's rendered-brief surface into the lifecycle skills. File-disjoint across three skill dirs (build/ decisions/ research+review/); deps satisfied.

impl PENDING → IN_PROGRESS for:

- [[TASK-018-SPEC-008: Implement build-Skill Dispatch Brief Generators]] → `skills/build/scripts/` dispatch-implementer + dispatch-qa; ALSO adds `export const validRelationTypes = RelationVerbEnum.options` to `shared/composition/src/schemas/common.ts` (SPEC-008 Files Affected sanctions it; Track 1 closed without it).
- [[TASK-019-SPEC-008: Implement decisions-Skill Dispatch Brief Generators]] → `skills/decisions/scripts/` dispatch-architect + critic brief generators.
- [[TASK-020-SPEC-008: Implement research-Skill Dispatch Brief Generators]] → `skills/research/scripts/` dispatch-analyst + `skills/review/scripts/` dispatch-reviewer brief generators.

All implement [[REQ-005-SPEC-008: Per-Skill Dispatch-Brief Generators]] + [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]]. Code TASKs → `bun-ts-engineer` (explicit model override per Event-92 harness flag). Per-TASK QA gate retained (no integrate-later).

### State Changes

- PLAN impl-TASK-018-SPEC-008: PENDING → IN_PROGRESS
- PLAN impl-TASK-019-SPEC-008: PENDING → IN_PROGRESS
- PLAN impl-TASK-020-SPEC-008: PENDING → IN_PROGRESS