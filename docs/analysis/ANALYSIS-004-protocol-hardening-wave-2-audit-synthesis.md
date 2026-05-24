---
title: 'ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis'
type: analysis
permalink: analysis/analysis-004-protocol-hardening-wave-2-audit-synthesis-2
status: ACCEPTED
tags:
- analysis
- protocol-hardening
- wave-2
- audit
- omnibus
---

# ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis

> **Omnibus note** — this note aggregates 5 audit returns from SESSION-2026-05-23_02 Events 02-08 into a single source of truth for Wave 2 decisions (D-1..D-7) and the SPEC-008 subtree authoring.

## Scope

Five parallel read-only audits dispatched at the start of SESSION-2026-05-23_02 to scope Wave 2 of PLAN-001 protocol-hardening. Phase X (Wave 1, closed 2026-05-21 at commit `94e27f9`) shipped the per-TASK build+QA cycle infrastructure (7 schemas + 5 claim validators + 3 mutations + 5 renderers, 585/585 tests). The user reopened the part with directive "everything that needs to be done for it — figure out what that is, ultrathink". Audits surfaced what Wave 2 must close.

## Convergent root finding

Across all 5 audit dimensions, ONE root cause surfaces: the rigid protocol exists as PROSE, not as RUNTIME ENFORCEMENT. The composition library is a documentation surface, not a barrier. Validators are described in skill SKILL.md prose but never invoked at gate points. Note conventions are described in CONVENTIONS but agent dispatch briefs don't enumerate the valid relation types. The 585 tests cover happy-path arithmetic but not realistic agent-lying scenarios. The same enforcement gap manifests in five different ways.

## Audit A — Composition library coverage gaps

Mapping current artifacts to 16 canonical note types: 7 schemas, 6 parsers+validators, 3 mutations, 5 renderers exist. 9 note types have NO schema.

| Priority | Type | Missing artifacts | Rationale |
|---|---|---|---|
| P0 | ADR | schema + parser + `validateAdrAcceptedClaim` | Decisions phase gate; /brain:---adr-review validates debate convergence but no schema validates ADR structure at write time |
| P0 | PLAN | `validatePlanDoneClaim` | Schema exists; mechanical check missing (PLAN DONE should require all parts terminal) |
| P1 | ANALYSIS | schema + parser + `validateAnalysisAcceptedClaim` | Reject ACCEPTED with `## Open Questions` (closes Brain v2 Wave 7 exploit) |
| P1 | EPIC | schema + parser + `validateEpicDoneClaim` | Reject DONE without contained SPECs DONE |
| P1 | CRIT | schema + parser | Supports adr-review convergence; no claim validator needed |
| P2 | PRD / feature / security / retrospective / skill | (defer) | Read-only structural; no lifecycle gate role |

## Audit B — Skill protocol-embedding

All 7 lifecycle skills (plan/research/decisions/spec/build/review/end) DESCRIBE the composition library symbols but NONE INVOKE them at gate points.

Concrete drift surfaces:

- `build/SKILL.md` Step 4b: "cross-check status enum" — should be `validateTaskDoneClaim()` invocation
- `build/SKILL.md` Steps a/h/j/s: "PLAN transition" via raw `edit_note` — should be `applyPlanMutation({ type: "transition-impl-item" })` with mandated session context
- `plan/SKILL.md`: references PlanNote renderer (X.D.2) but no `bun run` command/script path
- `spec/SKILL.md`: says authored notes "pass the X.D.5/6/7 schemas" but never prescribes schema-parse validation after authoring
- `end/SKILL.md` Step 1: manual checkbox inspection — should be `validateSpecDoneClaim()` invocation (would have caught the SPEC-007 drift Audit D found)
- `decisions/SKILL.md` Step 2f: raw `edit_note` for d_n_substatus — should be `applyPlanMutation({ type: "lock-decision" })`

Composition skills (decompose/recompose) verdict FULL — they actually invoke `parseAsync`, `getAdapter`, `applyMutations` via CLI script. Lifecycle skills verdict PARTIAL on best.

## Audit C — Brain notes coherence

100 notes audited; MINOR_DRIFT verdict (10% violation rate).

| Severity | Category | Count | Notes |
|---|---|---|---|
| HIGH | Duplicate frontmatter blocks | 2 | QA-027-SPEC-004, QA-030-SPEC-002 (basic-memory collision recovery glitch) |
| HIGH | Forbidden relation `validates` | 4+ | QA-027, QA-042, QA-043, QA-015 (systematic QA-brief gap; the 11-type allowlist not enumerated) |
| HIGH | Title-without-colon | 3 | ANALYSIS-002, SESSION-2026-05-20_01, SESSION-2026-05-20_02 (early-session Pattern 2 Phase 2 skip) |
| HIGH | Stale type `test_report` / `test-report` | 2 | QA-030, QA-038 (rename-script lag) |
| MEDIUM | PII paths (`/Users/.../`) | 3+ | QA-036, QA-038, SESSION-2026-05-20_03 Event 04 |
| MEDIUM | Semantic relation misuse (`caused_by` on QA aggregate) | 1 | QA-015 — should be `depends_on` |
| LOW | Duplicate Event numbers | 1 | SESSION-2026-05-21_01 Events 36/37/38 (killed-agent re-entry) |
| LOW | Permalink `-1` collision | 1 | QA-038 (also this session note carries `-1` suffix) |

Clean categories: zero auto-memory references; zero forbidden note types; zero space-in-filename; zero lowercase prefixes. Wave 1 cleanup substantially held.

## Audit D — Code-vs-spec coherence

| SPEC | Verdict | Findings |
|---|---|---|
| SPEC-001 | PASS | All 8 REQ ACCEPTED; 9 TASK DONE; round-trip green |
| SPEC-002 | PARTIAL | SPEC root all 18 checkboxes `[ ]` despite DONE; 4 of 5 REQ still DRAFT; fixture path discrepancy (`tests/fixtures/analysis/` vs flat `analysis-sample.md`) |
| SPEC-003 | PASS spot-check | Same rollup drift as SPEC-002 |
| SPEC-004 | PASS spot-check | Correct |
| SPEC-007 | PARTIAL | DONE with REQ-012 + TASK-013 + TASK-014 still `[ ]` — violates the (unused) `validateSpecDoneClaim` |

Code-level drift:

- `_shared/composition/src/core/dispatcher.ts:7-12` missing `spec` source_type (only 4 of 5 types registered; `registry.ts:34-40` has all 5) — latent bug
- REQ-009-SPEC-007 says "9 mutation types"; code has 11 (transition-impl-item + transition-qa-item added via PR #14)

## Audit E — Test coverage gaps

Baseline: 508/508 tests pass; 1084 expect() calls across 58 files.

**Adversarial-claim coverage gap** (the key enforcement story):

| Validator | Happy-path | Rejection | Parse-then-validate | Missing scenarios |
|---|---|---|---|---|
| task-claim | 3 | 3 | 0 | All-DoD-deferred bypass; checkbox-flip without code change |
| requirement-claim | 2 | 3 | 1 | AC flip without evidence |
| design-claim | 2 | 3 | 1 | Compliance flip without evidence |
| spec-claim | 3 | 3 | 0 | DONE with all success_criteria deferred |
| test-report-claim | 2 | 3 | 1 | All-deferred verdict |

The "mechanically impossible to lie" claim requires parse-from-markdown-then-validate tests. Only 3 of 5 validators have even one.

**Mutation gaps**: no backward-transition (DONE→IN_PROGRESS) test; no double-apply idempotency; no session-mutation duplicate-event-number rejection.

**Integration gaps**: ZERO dedicated integration tests. Missing: parse-mutate-validate-render full path; cross-note consistency (SPEC checklist vs child TASK status); TEST-REPORT vs TASK-DoD cross-validation.

**Drift regression gaps**: 37 Phase X drift surfaces NOT captured as regression tests. `plan-001-migration.test.ts` is migration acceptance, not drift regression.

## Wave 2 scope synthesis (4 tracks)

Recommended scope (subject to D-5 P1 include/defer adjudication):

| Track | Source | Deliverables |
|---|---|---|
| 1. Coverage gaps | Audit A | 5 schemas/validators: ADR + PLAN-done-claim (P0); ANALYSIS + EPIC + CRIT (P1) |
| 2. Skill invocation wiring | Audit B | 5 SKILL.md updates (build/plan/spec/end/decisions) + dispatch-brief templates with 11-relation allowlist |
| 3. Adversarial + integration + regression tests | Audit E | 10 prioritized tests: parse-then-validate for task+spec validators; checkbox-mutation→parse→validate integration; backward-transition rejection; cross-note consistency; drift regression markers |
| 4. Current drift cleanup | Audits C + D | 10 Brain note fixes; SPEC-002/003 rollup propagation; SPEC-007 status resolution; dispatcher.ts fix; REQ-009 amendment |

Estimated effort: ~10-13 days parallel-where-possible. Spec-decomposition-sized → SPEC-008 per Wave 2 scope-shape lock (SESSION-2026-05-23_02 Event 09).

## Decision options surfaced for ADR-004 (decisions.4 D-N adjudication)

**D-1 — Composition library invocation pattern**:

- Option A: In-process import — skills load TS modules directly (fastest; requires Bun runtime in skill context)
- Option B: `bun run` CLI wrapper per validator — explicit script invocation in dispatch briefs (slowest; most observable)
- Option C: Single multi-validator CLI binary — `bun run validate <type> <file>` (middle ground; one wrapper, multiple subcommands)

**D-2 — Directory layout for new artifacts**:

- Option A: Extend flat `src/schemas|parsers|validators/` (consistent with existing 7 schemas)
- Option B: New `src/wave-2/` subdir (groups Wave 2 additions; cleaner diff for the wave)

**D-3 — Adversarial-claim test scaffold pattern**:

- Option A: Per-validator adversarial test file (e.g., `task-claim-validator-adversarial.test.ts`) — explicit naming
- Option B: Adversarial fixtures dir + shared harness — generic parse-then-validate runner that consumes lying-claim fixtures (DRY; less file proliferation)

**D-4 — Dispatch-brief template persistence**:

- Option A: Inline in each SKILL.md — versioned alongside skill content (highest coupling; updates require skill edit)
- Option B: Separate `references/dispatch-brief-templates.md` per skill — single source per skill, sourced at dispatch time (DRY across orchestrator invocations)
- Option C: Composition library template module — `_shared/composition/src/templates/` with TS-typed template fns (programmatic; consumable by future hooks)

**D-5 — P1 include/defer adjudication**:

For each P1 gap (ANALYSIS schema/validator, EPIC schema/validator, CRIT schema), choose: include in Wave 2 OR defer to Wave 3.

**D-6 — SPEC-007 status resolution**:

- Option A: Downgrade SPEC-007 status DONE → ACCEPTED (acknowledge migration gap-task TASK-014 incomplete)
- Option B: Complete TASK-014 (execute PLAN-001 dogfood migration during Wave 2 build)
- Option C: Amend REQ-012 scope to mark migration optional (close the gap by spec-amendment)

**D-7 — `core/dispatcher.ts` disposition**:

- Option A: Fix — add `spec` source_type registration to match `registry.ts` (minimal change; preserves both modules)
- Option B: Deprecate `core/dispatcher.ts` in favor of `registry.ts` — single source of truth; remove the duplicate dispatcher

## Observations

- [insight] Convergent root finding across 5 orthogonal audit dimensions: protocol enforcement is documentation-grade not runtime-grade #protocol #enforcement
- [decision] Wave 2 scope shape locked as SPEC-008 with 4 REQ clusters per AskUserQuestion Event 09 #scope #wave-2
- [outcome] Audit A surfaced 5 P0+P1 coverage gaps (ADR, PLAN-done-claim, ANALYSIS, EPIC, CRIT) #coverage #composition-library
- [outcome] Audit B verdict: ALL 7 lifecycle skills PARTIAL — describe validators in prose but no skill invokes them at gate points #skill #invocation
- [outcome] Audit C verdict MINOR_DRIFT — 10/100 notes have violations; Wave 1 cleanup substantially held #drift #notes
- [outcome] Audit D surfaced SPEC-002/003/007 marked DONE with unchecked checkboxes — exactly what missing validators would catch #drift #spec
- [outcome] Audit E surfaced ZERO integration tests, ZERO drift-regression tests, 3 of 5 validators with no parse-then-validate coverage #tests #adversarial
- [constraint] Brain MCP parser strict on new content: `**Source Artifacts**: [[wikilink]]` bullets rejected; older parts grandfathered #brain-mcp #parser
- [risk] Wave 2 estimated 10-13 days parallel-where-possible; spec-decomposition-sized #effort #scope

## Relations

- part_of [[PLAN-001 Skills Ecosystem]]
- inspired_by [[ANALYSIS-003 Phase X Protocol Hardening State]]
- relates_to [[SESSION-2026-05-23_02 Protocol Hardening Wave 2 Scope]]
- leads_to [[ADR-004 Wave 2 Architecture]]
- leads_to [[SPEC-008 Protocol Hardening Wave 2]]
- 