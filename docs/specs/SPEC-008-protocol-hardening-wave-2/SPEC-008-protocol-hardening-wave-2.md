---
title: 'SPEC-008: Protocol Hardening Wave 2'
type: spec
permalink: specs/spec-008-protocol-hardening-wave-2/spec-008-protocol-hardening-wave-2-1
status: ACCEPTED
tags:
- spec
- protocol-hardening
- wave-2
- composition-library
- automated-enforcement
- skills-ecosystem
---

# SPEC-008: Protocol Hardening Wave 2

## Scope

### In Scope

Wave 2 of the protocol-hardening initiative closes the convergent root finding from the 5 parallel audits captured in [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]]: the rigid per-TASK build+QA protocol exists as PROSE, not as RUNTIME ENFORCEMENT. SPEC-008 implements the architecture locked in [[ADR-005: Protocol Hardening Wave 2 Architecture]] across 5 tracks:

- Track 1 — Library coverage gaps: 5 new schemas + 5 new parsers + 4 new claim validators in `shared/composition/src/{schemas,parsers,validators}/` covering ADR, ANALYSIS, EPIC, CRIT (new) plus PLAN-done-claim extension. Closes Audit A coverage gaps.
- Track 2 — Per-skill scripts: gate-point invocation scripts at `skills/<name>/scripts/<verb>.ts` for each lifecycle skill (build/end/spec/decisions/plan/research/review) + programmatic dispatch-brief generator scripts that import cross-cutting constants from `shared/composition/src/schemas/common.ts`. Closes Audit B (invocation gap) + Audit C (dispatch-brief template gap that produced `validates` relation drift).
- Track 3 — Test harness + integration + regression: shared fixture-driven adversarial-claim test harness at `tests/_helpers/adversarial.ts` + initial fixture set for Audit E top-10 scenarios + integration tests (parse-mutate-validate-render full path) + mutation invariant tests (backward-transition rejection, double-apply idempotency, duplicate-event-number rejection) + drift regression markers. Closes Audit E gaps.
- Track 4 — Drift cleanup: SPEC-007 `[~]` deferred-checkbox notation amendment + `validateSpecDoneClaim` extension; deletion of dead `core/dispatcher.ts` + its test; structural `_shared/` → `shared/` rename; 10 Brain note hygiene fixes from Audit C; SPEC-002/003 checkbox rollup propagation + 4 REQ DRAFT→ACCEPTED flips; REQ-009-SPEC-007 mutation count amendment (9 → 11). Closes Audits C + D current-state drift.
- Track 5 — Automated enforcement gates: plugin hooks layer at `hooks/` with 5 PreToolUse blocking gates (pre-write local + pre-write MCP + pre-commit + pre-push + pre-PR-create) + Stop turn-end backstop + FileChanged post-commit observability. Makes Track 1+2 scripts mandatory at runtime — closes the independent-thinker P2 gap (voluntary invocation = Wave 1 failure mode).

Per Stage 2 Step 5 SPEC-root invariant, this SPEC is born ACCEPTED at authoring time (after /decisions locked all D-Ns in ADR-005). `IN_PROGRESS` is set by `/build` at first TASK transition; `DONE` flips at /build close.

### Out of Scope (deferred)

- P2 schemas (PRD, FEATURE, SECURITY, RETROSPECTIVE, SKILL) — Wave 3 if demand surfaces.
- CRIT claim validator — D-5 includes CRIT schema + parser but explicitly excludes a claim validator (no per-CRIT claim pattern today).
- Persistent validator daemon (HTTP hook handlers) — performance optimization deferred to Wave 3 if Bun-startup overhead becomes a measurable problem.
- External-editor edit observability — Layer 7 FileChanged watches `.git/HEAD|.git/index|.git/logs/HEAD`; out-of-tool edits (vim outside Claude Code) are out of scope per the tool-mediated threat model.
- Test-fixture exhaustive coverage of every drift surface — fixtures cover Audit E top-10 prioritized scenarios; Wave 3 may expand if new drift surfaces emerge.

## Phases

| # | Phase | Track | Scope | Output |
|---|---|---|---|---|
| 1 | Library coverage | T1 | D-2, D-5; new schemas + parsers + validators | Track 1 REQs/DESIGN/TASKs DONE |
| 2 | Per-skill scripts | T2 | D-1, D-4; gate-point + brief generators | Track 2 REQs/DESIGN/TASKs DONE |
| 3 | Test harness + regression | T3 | D-3 expanded; adversarial harness + fixtures + integration + mutation invariants + drift markers | Track 3 REQs/DESIGN/TASKs DONE |
| 4 | Drift cleanup | T4 | D-6, D-7, rename, hygiene, code-vs-spec | Track 4 REQs/TASKs DONE |
| 5 | Plugin hooks | T5 | D-8; 7-layer hook architecture | Track 5 REQs/DESIGN/TASKs DONE |

Phase ordering: Phase 4 TASK-029 (rename) MUST land first (every Track touches paths under `shared/`). After rename, Phases 1 + 3 + 4 + 5 partially parallelizable per cross-track dependency edges. Phase 2 + 5 require Phase 1 validators. Phase 3 ADR/ANALYSIS/EPIC fixtures (TASK-024) require Phase 1 validators. Phase 5 smoke tests (TASK-046) require Phase 3 fixture set. Full dependency graph rendered by PLAN-001 build sequencing.

## Artifact Status

All checkboxes `[ ]` at SPEC ACCEPTED time; `/build` flips them as each child note transitions to DONE/ACCEPTED. Notation: `[ ]` = TODO; `[x]` = DONE; `[~]` = DEFERRED-with-rationale (D-6 canonical notation — recognized as terminal by `validateSpecDoneClaim`).

### Requirements (12)

- [ ] [[REQ-001-SPEC-008: New Schema Suite]]
- [ ] [[REQ-002-SPEC-008: New Parser Suite]]
- [ ] [[REQ-003-SPEC-008: New Claim Validator Suite]]
- [ ] [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]]
- [ ] [[REQ-005-SPEC-008: Per-Skill Dispatch-Brief Generator Scripts]]
- [ ] [[REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set]]
- [ ] [[REQ-007-SPEC-008: Integration Tests and Mutation Tests and Drift Regression Markers]]
- [ ] [[REQ-008-SPEC-008: Deferred Checkbox Notation and Validator Extension]]
- [ ] [[REQ-009-SPEC-008: Structural Cleanup Dispatcher Deletion and Shared Rename]]
- [ ] [[REQ-010-SPEC-008: Brain Note Hygiene and Code-vs-Spec Drift Cleanup]]
- [ ] [[REQ-011-SPEC-008: PreToolUse Blocking Gates]]
- [ ] [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]]

### Designs (4)

- [ ] [[DESIGN-001-SPEC-008: Coverage Module Layout]]
- [ ] [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]]
- [ ] [[DESIGN-003-SPEC-008: Adversarial Test Fixture Layout and Harness Shape]]
- [ ] [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]]

### Tasks (46)

- [x] [[TASK-001-SPEC-008: Implement ADR Schema]]
- [ ] [[TASK-002-SPEC-008: Implement ANALYSIS Schema]]
- [ ] [[TASK-003-SPEC-008: Implement EPIC Schema]]
- [ ] [[TASK-004-SPEC-008: Implement CRIT Schema]]
- [ ] [[TASK-005-SPEC-008: Implement ADR Parser]]
- [ ] [[TASK-006-SPEC-008: Implement ANALYSIS EPIC and CRIT Parsers]]
- [ ] [[TASK-007-SPEC-008: Implement validateAdrAcceptedClaim]]
- [ ] [[TASK-008-SPEC-008: Implement validateAnalysisAcceptedClaim]]
- [ ] [[TASK-009-SPEC-008: Implement validateEpicDoneClaim]]
- [ ] [[TASK-010-SPEC-008: Extend PLAN Schema and Implement validatePlanDoneClaim]]
- [ ] [[TASK-011-SPEC-008: Implement validate-task-done Script]]
- [ ] [[TASK-012-SPEC-008: Implement transition-impl-item Script]]
- [ ] [[TASK-013-SPEC-008: Implement transition-qa-item Script]]
- [ ] [[TASK-014-SPEC-008: Implement validate-spec-done and run-pre-flight Scripts]]
- [ ] [[TASK-015-SPEC-008: Implement spec-Skill Schema Validator Scripts]]
- [ ] [[TASK-016-SPEC-008: Implement lock-decision-mutation Script]]
- [ ] [[TASK-017-SPEC-008: Implement render-plan-note and set-part-done Scripts]]
- [ ] [[TASK-018-SPEC-008: Implement build-Skill Dispatch-Brief Generators]]
- [ ] [[TASK-019-SPEC-008: Implement decisions-Skill Dispatch-Brief Generators]]
- [ ] [[TASK-020-SPEC-008: Implement research-Skill and review-Skill Dispatch-Brief Generators]]
- [x] [[TASK-021-SPEC-008: Implement Adversarial-Claim Test Harness]]
- [ ] [[TASK-022-SPEC-008: Author Initial Adversarial Fixture Set for Five Existing Validators]]
- [ ] [[TASK-023-SPEC-008: Wire Adversarial-Claims Table-Driven Test Runner]]
- [ ] [[TASK-024-SPEC-008: Author ADR ANALYSIS EPIC Adversarial Fixtures]]
- [ ] [[TASK-025-SPEC-008: Integration Test Parse Mutate Validate Render]]
- [x] [[TASK-026-SPEC-008: Mutation Backward Transition and Idempotency Tests]]
- [ ] [[TASK-027-SPEC-008: Session Mutation Duplicate Event Number Test]]
- [ ] [[TASK-028-SPEC-008: Annotate Existing Tests with Phase X Drift Markers]]
- [x] [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
- [ ] [[TASK-030-SPEC-008: Delete Core Dispatcher and Its Test]]
- [ ] [[TASK-031-SPEC-008: Amend SPEC-007 Root with Deferred Notation and Legend]]
- [ ] [[TASK-032-SPEC-008: Extend validateSpecDoneClaim for Deferred Notation]]
- [ ] [[TASK-033-SPEC-008: Document Deferred Notation in CONVENTIONS Sections 4.6 and 4.7]]
- [ ] [[TASK-034-SPEC-008: Repair Brain Note Hygiene Violations from Audit C]]
- [ ] [[TASK-035-SPEC-008: Propagate SPEC-002 and SPEC-003 Checkbox Rollups and REQ Status Flips]]
- [ ] [[TASK-036-SPEC-008: Amend REQ-009-SPEC-007 Mutation Count from 9 to 11]]
- [ ] [[TASK-037-SPEC-008: Author hooks.json Manifest]]
- [ ] [[TASK-038-SPEC-008: Implement dispatch-validator Utility]]
- [ ] [[TASK-039-SPEC-008: Implement Edit Operation and Tool Input Helpers]]
- [ ] [[TASK-040-SPEC-008: Implement Git Helpers for Staged and Diff Content]]
- [ ] [[TASK-041-SPEC-008: Implement pre-write-brain-note Handler Layer 1]]
- [ ] [[TASK-042-SPEC-008: Implement pre-write-brain-note-mcp Handler Layer 2]]
- [ ] [[TASK-043-SPEC-008: Implement pre-commit pre-push and pre-pr-create Handlers Layers 3-5]]
- [ ] [[TASK-044-SPEC-008: Implement stop-backstop Handler Layer 6]]
- [ ] [[TASK-045-SPEC-008: Implement git-state-observer Handler Layer 7]]
- [ ] [[TASK-046-SPEC-008: Author Hook Smoke Tests and Adversarial Fixture Reuse]]

## ADR Cross-cutting Constraints

SPEC-008 implements ADR-005 (primary) and continues to honor the architectural constraints established by ADR-001, ADR-002, and ADR-003. Each constraint binding:

### ADR-001 Composition Library Architecture

Zod for plan validation; unified + remark + remark-frontmatter for markdown AST; YAML at docs/_restructure/*.yaml; discriminated union on source_type; adr-review BLOCKING gate. All new schemas under T1 follow the Zod + superRefine pattern established here. PLAN-done-claim extension (T1) reuses the discriminated-union pattern.

### ADR-002 Adapter Contract and Plan Schema

CompositionAdapter 5-method interface; BaseMarkdownAdapter pattern for ADR/ANALYSIS/SESSION (T1 new ADR + ANALYSIS schemas extend this base); hash-validation invariants per adapter; modular Zod schemas with injectivity + path containment.

### ADR-003 Plan/Session Render Architecture

Render layer architecture; T2 dispatch-brief generators import cross-cutting constants from the schema common module — same composition discipline ADR-003 established for renderers.

### ADR-005 Protocol Hardening Wave 2 Architecture (PRIMARY)

8 D-Ns (D-1..D-8) define every Wave 2 architectural choice; every REQ in this SPEC `implements` ≥1 ADR-005 D-N; every TASK `implements` ≥1 REQ.

## Acceptance Criteria

- [ ] All 12 REQs status ACCEPTED with their `## Acceptance Criteria` checkboxes `[x]` (Wave 2 acceptance verifiable via `validateRequirementAcClaim`)
- [ ] All 4 DESIGN notes status ACCEPTED with `## Compliance` checkboxes `[x]` where present (Wave 2 acceptance verifiable via `validateDesignComplianceClaim`)
- [ ] All 46 TASKs status DONE with all `## Definition of Done` checkboxes `[x]` (Wave 2 acceptance verifiable via `validateTaskDoneClaim`)
- [ ] ADR coverage gate PASS — ADR-001, ADR-002, ADR-003, ADR-005 all have `implemented_by [[SPEC-008: Protocol Hardening Wave 2]]` in their Relations sections
- [ ] Gate A semantic gap analysis PASS — no REQ flagged as vague or runtime-judgment-dependent by analyst review
- [ ] Gate B 4 binary drift checks PASS — (a) REQ→ADR traceability, (b) scope conservation, (c) TASK→REQ traceability, (d) Scope-In match against ANALYSIS-004
- [ ] Composition library tests pass: 508/508 baseline preserved + new Wave 2 additions (~30-50 new tests across adversarial fixtures + integration + mutation invariants)
- [ ] All 5 PreToolUse hooks + Stop backstop + FileChanged observability smoke-tested against representative adversarial fixtures
- [ ] 11 Track 4 drift items cleaned: `_shared`→`shared` rename complete; `core/dispatcher.ts` + test deleted; SPEC-007 `[~]` notation applied + legend added; 10 Brain note hygiene fixes landed (2 dup-frontmatter + 4 forbidden-relation + 3 title-no-colon + 2 stale-type + 3 PII redactions + 1 dup-event); SPEC-002/003 rollups propagated; REQ-009-SPEC-007 amended
- [ ] CONVENTIONS Section 4.6/4.7 amended to document `[~]` as canonical deferred-checkbox notation

## Success Criteria

- [ ] Voluntary-invocation gap closed: every gate point in the rigid per-TASK build+QA cycle is mechanically enforced by a hook (PreToolUse or Stop) that cannot be bypassed by orchestrator omission
- [ ] Schema coverage matrix complete: all 16 canonical Brain note types either have schemas (12 covered: SPEC root, TASK, REQ, DESIGN, SESSION, PLAN, TEST-REPORT, ADR, ANALYSIS, EPIC, CRIT, plan-yaml) or are explicitly deferred (4 deferred P2: PRD, FEATURE, SECURITY, RETROSPECTIVE, SKILL)
- [ ] Adversarial-fixture inventory operates as the drift-regression marker corpus: every Audit E top-10 scenario has a fixture file; every future drift surface gets a new fixture file as the regression test
- [ ] Dispatch briefs auto-include schema-defined constraints (e.g., `validRelationTypes`) via direct import — no manual prose sync between schema and brief

## Files Affected (post-build summary; targets, not authored content)

- `shared/composition/src/schemas/`: +5 files (adr-note.ts, analysis-note.ts, epic-note.ts, crit-note.ts; plan-done-claim addition to plan-note.ts or new file)
- `shared/composition/src/parsers/`: +4 files (adr-note.ts, analysis-note.ts, epic-note.ts, crit-note.ts)
- `shared/composition/src/validators/`: +4 files (validateAdrAcceptedClaim, validateAnalysisAcceptedClaim, validateEpicDoneClaim, validatePlanDoneClaim)
- `shared/composition/src/schemas/common.ts`: add `validRelationTypes` export (gap flagged by Track 2 agent)
- `shared/composition/src/core/dispatcher.ts` + `tests/dispatcher.test.ts`: DELETED (D-7)
- `skills/{build,end,spec,decisions,plan,research,review}/scripts/`: +10-20 files (D-1 gate-point invocation scripts + D-4 brief generators)
- `tests/_helpers/adversarial.ts` + `tests/fixtures/adversarial/<type>/`: +1 harness + ~10-15 fixtures + 3-5 fixture dirs for new types (adr/analysis/epic)
- `tests/adversarial-claims.test.ts` + integration test files + mutation invariant tests
- `hooks/hooks.json` + `hooks/lib/` (6 utilities) + `hooks/scripts/` (7 handlers)
- `_shared/` → `shared/` directory rename (all paths above already reflect post-rename form)
- 10 Brain notes repaired in `docs/` (Audit C cleanup)
- SPEC-002, SPEC-003 root notes: checkbox rollup propagation
- SPEC-007 root note: `[~]` notation applied + legend
- 4 REQ notes (in SPEC-002/003 subtrees): status DRAFT → ACCEPTED
- REQ-009-SPEC-007: text amendment 9 → 11 mutation types
- `~/KNOWLEDGE-GRAPH-CONVENTIONS.md` Section 4.6 or 4.7: `[~]` notation canonical documentation

## Effort Summary

Per ADR-005 D-5 estimate (final, post-Phase 3 buffer): ~14-16 days AI-Dominant for the full build phase. Breakdown:

- Track 1 (Library coverage): ~3-4 days; 14 atomic TASKs
- Track 2 (Per-skill scripts): ~3-4 days; 10 atomic TASKs (depends on Track 1)
- Track 3 (Tests): ~2-3 days; 8 atomic TASKs (TASK-024 depends on Track 1 validators)
- Track 4 (Drift cleanup): ~1-2 days; 8 atomic TASKs (TASK-029 rename runs FIRST)
- Track 5 (Plugin hooks): ~3-4 days; 10 atomic TASKs (depends on Track 1+3+4)

Build parallelism opportunity: ~30-40% reduction possible per cross-track dependency graph; rendered + sequenced by PLAN-001 build phase.

## Observations

- [decision] SPEC-008 born ACCEPTED at /spec Stage 2 close per /spec invariant (DRAFT applies to in-flight authoring; ACCEPTED is the terminal authoring state before /build sets IN_PROGRESS) #spec-lifecycle #protocol
- [decision] 5-track decomposition mirrors ADR-005 D-N clustering (per Cross-Decision Coherence section) — single SPEC chosen over 3-spec split per Event 22 (cohesion preserved; one /build cycle + one QA sweep + one DONE gate) #scope-shape #cohesion
- [insight] The cross-track dependency graph is non-trivial — Track 4 TASK-029 (`_shared`→`shared` rename) is the load-bearing first TASK; Track 1 validators block Track 2 scripts + Track 3 fixtures + Track 5 hook handlers; Track 3 fixtures block Track 5 smoke tests #dependency-graph #sequencing
- [constraint] Wave 2 closes the documented Wave 1 failure mode: validators existed but were not invoked at gate points; D-8 hooks make invocation mandatory at runtime, eliminating the orchestrator-cooperation requirement #automated-enforcement #defense-in-depth
- [risk] If Track 5 hook smoke tests reveal a Claude Code matcher quirk for MCP tool names (Layer 2 PreToolUse on `mcp__plugin_brain_brain__*`), Brain MCP edits bypass validation — mitigated by TASK-046 DoD asserting MCP write triggers Layer 2 handler #hook-coverage #known-risk
- [outcome] 62 child notes authored across 5 parallel architect dispatches in a single Wave; counter allocation respected; zero collisions; Pattern 2 three-phase write applied to every note #wave-1-output #orchestration
- [insight] Track 4 has no DESIGN note by orchestrator allocation — mechanical cleanup with no architectural design choices to record (all behavior specified in ADR-005 D-Ns + audit findings); compliant with the "DESIGN exists when binary-verifiable" convention #design-allocation
- [fact] 5 schemas + 5 parsers + 4 claim validators + 10-20 per-skill scripts + 7 hook handlers + ~15 adversarial fixtures + ~5 integration/mutation tests = post-Wave 2 composition layer surface area #scope-summary

## Relations

- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- implements [[ADR-001: Composition Library Architecture]]
- implements [[ADR-002: Adapter Contract and Plan Schema]]
- implements [[ADR-003: Plan/Session Render Architecture]]
- part_of [[PLAN-001: Skills Ecosystem]]
- relates_to [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]]
- supersedes [[ANALYSIS-003: Phase X Protocol Hardening State]]
- contains [[REQ-001-SPEC-008: New Schema Suite]]
- contains [[REQ-002-SPEC-008: New Parser Suite]]
- contains [[REQ-003-SPEC-008: New Claim Validator Suite]]
- contains [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]]
- contains [[REQ-005-SPEC-008: Per-Skill Dispatch-Brief Generator Scripts]]
- contains [[REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set]]
- contains [[REQ-007-SPEC-008: Integration Tests and Mutation Tests and Drift Regression Markers]]
- contains [[REQ-008-SPEC-008: Deferred Checkbox Notation and Validator Extension]]
- contains [[REQ-009-SPEC-008: Structural Cleanup Dispatcher Deletion and Shared Rename]]
- contains [[REQ-010-SPEC-008: Brain Note Hygiene and Code-vs-Spec Drift Cleanup]]
- contains [[REQ-011-SPEC-008: PreToolUse Blocking Gates]]
- contains [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]]
- contains [[DESIGN-001-SPEC-008: Coverage Module Layout]]
- contains [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]]
- contains [[DESIGN-003-SPEC-008: Adversarial Test Fixture Layout and Harness Shape]]
- contains [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]]
- contains [[TASK-001-SPEC-008: Implement ADR Schema]]
- contains [[TASK-002-SPEC-008: Implement ANALYSIS Schema]]
- contains [[TASK-003-SPEC-008: Implement EPIC Schema]]
- contains [[TASK-004-SPEC-008: Implement CRIT Schema]]
- contains [[TASK-005-SPEC-008: Implement ADR Parser]]
- contains [[TASK-006-SPEC-008: Implement ANALYSIS EPIC and CRIT Parsers]]
- contains [[TASK-007-SPEC-008: Implement validateAdrAcceptedClaim]]
- contains [[TASK-008-SPEC-008: Implement validateAnalysisAcceptedClaim]]
- contains [[TASK-009-SPEC-008: Implement validateEpicDoneClaim]]
- contains [[TASK-010-SPEC-008: Extend PLAN Schema and Implement validatePlanDoneClaim]]
- contains [[TASK-011-SPEC-008: Implement validate-task-done Script]]
- contains [[TASK-012-SPEC-008: Implement transition-impl-item Script]]
- contains [[TASK-013-SPEC-008: Implement transition-qa-item Script]]
- contains [[TASK-014-SPEC-008: Implement validate-spec-done and run-pre-flight Scripts]]
- contains [[TASK-015-SPEC-008: Implement spec-Skill Schema Validator Scripts]]
- contains [[TASK-016-SPEC-008: Implement lock-decision-mutation Script]]
- contains [[TASK-017-SPEC-008: Implement render-plan-note and set-part-done Scripts]]
- contains [[TASK-018-SPEC-008: Implement build-Skill Dispatch-Brief Generators]]
- contains [[TASK-019-SPEC-008: Implement decisions-Skill Dispatch-Brief Generators]]
- contains [[TASK-020-SPEC-008: Implement research-Skill and review-Skill Dispatch-Brief Generators]]
- contains [[TASK-021-SPEC-008: Implement Adversarial-Claim Test Harness]]
- contains [[TASK-022-SPEC-008: Author Initial Adversarial Fixture Set for Five Existing Validators]]
- contains [[TASK-023-SPEC-008: Wire Adversarial-Claims Table-Driven Test Runner]]
- contains [[TASK-024-SPEC-008: Author ADR ANALYSIS EPIC Adversarial Fixtures]]
- contains [[TASK-025-SPEC-008: Integration Test Parse Mutate Validate Render]]
- contains [[TASK-026-SPEC-008: Mutation Backward Transition and Idempotency Tests]]
- contains [[TASK-027-SPEC-008: Session Mutation Duplicate Event Number Test]]
- contains [[TASK-028-SPEC-008: Annotate Existing Tests with Phase X Drift Markers]]
- contains [[TASK-029-SPEC-008: Rename Shared Composition Directory]]
- contains [[TASK-030-SPEC-008: Delete Core Dispatcher and Its Test]]
- contains [[TASK-031-SPEC-008: Amend SPEC-007 Root with Deferred Notation and Legend]]
- contains [[TASK-032-SPEC-008: Extend validateSpecDoneClaim for Deferred Notation]]
- contains [[TASK-033-SPEC-008: Document Deferred Notation in CONVENTIONS Sections 4.6 and 4.7]]
- contains [[TASK-034-SPEC-008: Repair Brain Note Hygiene Violations from Audit C]]
- contains [[TASK-035-SPEC-008: Propagate SPEC-002 and SPEC-003 Checkbox Rollups and REQ Status Flips]]
- contains [[TASK-036-SPEC-008: Amend REQ-009-SPEC-007 Mutation Count from 9 to 11]]
- contains [[TASK-037-SPEC-008: Author hooks.json Manifest]]
- contains [[TASK-038-SPEC-008: Implement dispatch-validator Utility]]
- contains [[TASK-039-SPEC-008: Implement Edit Operation and Tool Input Helpers]]
- contains [[TASK-040-SPEC-008: Implement Git Helpers for Staged and Diff Content]]
- contains [[TASK-041-SPEC-008: Implement pre-write-brain-note Handler Layer 1]]
- contains [[TASK-042-SPEC-008: Implement pre-write-brain-note-mcp Handler Layer 2]]
- contains [[TASK-043-SPEC-008: Implement pre-commit pre-push and pre-pr-create Handlers Layers 3-5]]
- contains [[TASK-044-SPEC-008: Implement stop-backstop Handler Layer 6]]
- contains [[TASK-045-SPEC-008: Implement git-state-observer Handler Layer 7]]
- contains [[TASK-046-SPEC-008: Author Hook Smoke Tests and Adversarial Fixture Reuse]]
