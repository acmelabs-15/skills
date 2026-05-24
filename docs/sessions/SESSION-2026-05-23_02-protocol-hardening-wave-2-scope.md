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
- PLAN-001 status: IN_PROGRESS; protocol-hardening part: IN_PROGRESS (umbrella; flips DONE when build.SPEC-008 DONE)
- Scope shape: LOCKED — Option A (SPEC-008) per AskUserQuestion answer Event 09
- ADR-005 ACCEPTED 2026-05-23 — 8 D-Ns; decisions.4 DONE
- spec.SPEC-008 DONE — SPEC-008 ACCEPTED (root + 12 REQ + 4 DESIGN + 46 TASK); all /spec gates PASS
- build.SPEC-008 IN_PROGRESS — owning_session SESSION-2026-05-23_02 (this session; RESUMED from PAUSED at Event 41 for PoC TASK-001)
- Build order: TASK-029 (rename) DONE FIRST → Track 1 (TASK-001..010) → Track 4 cleanup + Track 3 harness → Track 2 scripts + Track 3 fixtures → Track 5 hooks
- TASK-029 (rename) DONE — `_shared/`→`shared/`; qa PASS (QA-044-SPEC-008); full a–u cycle demonstrated; commit `8144429`
- **CURRENT**: PoC SIGNED OFF (Event 46) — TASK-029 + TASK-001 DONE (2/46). Marathon continues IN THIS session per user. FIRST: dependency/parallelism analysis across the 44 remaining TASKs → user decision on parallelization approach (reconciled with the rigid one-TASK-at-a-time + serial PLAN/session bookkeeping) → then Track 1 remainder (TASK-002..010).
- DEFERRED (Track 4 doc-hygiene sweep / TASK-034): flip `_shared/composition` in ~171 live Brain notes (TASK-029 DoD item 3; historical-immutability scope resolved there)
- LATENT follow-up: skill scripts + `migrate-plan-001…ts` outside root tsconfig bun-typed scope (`Cannot find name 'Bun'`) — config-coherence fix, relevant to Tracks 1/2/5
- OPEN: 2 pre-existing `defrag.test.ts` delegation failures (decide fix/track/accept); basic-memory move/edit transient flakiness (retry on failure)


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
