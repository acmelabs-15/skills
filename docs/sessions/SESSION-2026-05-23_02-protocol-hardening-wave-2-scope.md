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
