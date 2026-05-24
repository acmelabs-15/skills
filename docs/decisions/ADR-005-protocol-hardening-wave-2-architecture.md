---
title: 'ADR-005: Protocol Hardening Wave 2 Architecture'
type: decision
permalink: decisions/adr-005-protocol-hardening-wave-2-architecture-1
status: PROPOSED
date: 2026-05-23
updated: 2026-05-23
tags:
- adr
- protocol-hardening
- wave-2
- architecture
- composition-library
- skills-ecosystem
---

# ADR-005: Protocol Hardening Wave 2 Architecture

## Status

PROPOSED 2026-05-23 — pending `brain:---adr-review` Phase 4 convergence gate (Step 7 of /decisions skill). Will flip to ACCEPTED on PASS verdict (≥5 ACCEPT + 0 BLOCK from 6-agent debate). Source: decisions.4 part of [[PLAN-001 Skills Ecosystem]], D-N micro-cycle adjudicating 7 architectural decisions captured in [[SESSION-2026-05-23_02 Protocol Hardening Wave 2 Scope]] Events 10-16.

## Context and Problem Statement

Phase X Wave 1 closed 2026-05-21 at commit `94e27f9` (585/585 tests, 7 schemas, 5 claim validators, 3 mutations, 5 renderers). The composition library at `_shared/composition/` shipped as the documentation-defined enforcement floor for the rigid per-TASK build+QA cycle.

Five parallel read-only audits dispatched in SESSION-2026-05-23_02 surfaced **one convergent root finding across all five orthogonal dimensions**: the rigid protocol exists as PROSE, not as RUNTIME ENFORCEMENT. The composition library is a documentation surface, not a barrier. Same pattern surfaced in:

- **Audit A — composition library coverage gaps**: 9 of 16 canonical Brain note types have no schema. Highest-consequence gap is ADR (decisions phase gate; `brain:---adr-review` validates debate convergence but no schema validates structure at write time). PLAN has schema + 11 mutations + renderer + parser but no `validatePlanDoneClaim`.
- **Audit B — skill protocol-embedding**: All 7 lifecycle SKILL.md files (plan / research / decisions / spec / build / review / end) DESCRIBE the composition library symbols in prose ("Lying agents are mechanically caught") but NONE INVOKE them at gate points. Validators exist; documentation says they exist; no skill prescribes `bun run validator.ts` at the moment of agent claim acceptance. Composition skills (decompose, recompose) verdict FULL — they actually invoke `getAdapter`, `applyMutations` via CLI script.
- **Audit C — Brain notes coherence**: 100 notes audited; 10% violation rate. Systematic pattern: 4 QA notes use forbidden `validates` relation type because QA agent-dispatch brief template never enumerated the 11 valid relation types from CONVENTIONS Section 4.4.
- **Audit D — code-vs-spec coherence**: SPEC-002, SPEC-003, SPEC-007 marked status DONE while SPEC root checkboxes (Artifact Status / Phases / Acceptance Criteria sections) remain `[ ]` — exactly what `validateSpecDoneClaim` should reject, but no skill ran the validator at status-flip time.
- **Audit E — test coverage gaps**: 508/508 tests pass; 1084 expect() calls; ZERO dedicated integration tests; only 3 of 5 claim validators have any parse-from-markdown-then-validate test; 37 Phase X drift surfaces NOT captured as regression tests.

Synthesized into [[ANALYSIS-004 Protocol Hardening Wave 2 Audit Synthesis]]; surfaced as 7 decision options to lock the Wave 2 implementation architecture.

Wave 2 scope shape locked via AskUserQuestion (SESSION-2026-05-23_02 Event 09) as **SPEC-008 protocol-hardening-wave-2** with 4 REQ clusters (coverage gaps × 5, skill invocation × 1-2, tests × 3, drift cleanup × 2). This ADR locks the architecture for that SPEC.

## Decision Summary

- **D-1**: Per-skill scripts. Each lifecycle skill ships gate-point scripts at `skills/<name>/scripts/<verb>.ts` as thin wrappers importing from `_shared/composition/`. Matches existing defrag/ingest pattern.
- **D-2**: Library directory layout extends existing flat dirs at `shared/composition/src/{schemas,parsers,validators}/` (note: `_shared` → `shared` rename captured separately as Track 4 cleanup, not an ADR-level decision).
- **D-3**: Shared fixture-driven adversarial-claim test harness. Each lying-claim scenario lives as a markdown fixture at `tests/fixtures/adversarial/<type>/drift-NN-<slug>.md`; shared `testAdversarial({fixture, validator, expectedReject})` helper runs parse → validate → assert.
- **D-4**: Programmatic per-skill dispatch-brief generator scripts at `skills/<name>/scripts/dispatch-<agent>.ts`; scripts import cross-cutting constants (e.g., `validRelationTypes` from `shared/composition/src/schemas/common.ts`) and print full brief text. Schema changes auto-propagate.
- **D-5**: Full Audit A recommendation — include ALL 3 P1 schemas in Wave 2. Final coverage adds 5 schemas + 5 parsers + 4 validators: ADR, PLAN-done-claim, ANALYSIS, EPIC, CRIT.
- **D-6**: Amend SPEC-007 root checkbox notation to use `[~]` (or `[deferred: rationale]`) for items where the underlying REQ is `status: DEFERRED`. Keep SPEC-007 status DONE. Extend `validateSpecDoneClaim` to recognize `[~]` as terminal alongside `[x]`.
- **D-7**: Delete `_shared/composition/src/core/dispatcher.ts` + `tests/dispatcher.test.ts`. Evidence-confirmed dead (zero production imports; only consumed by its own test). Production code uses `registry.ts`. 508 → 506 tests post-delete.

## Detailed Decisions

### D-1: Composition Library Invocation Pattern — Per-Skill Scripts

**Status**: LOCKED 2026-05-23 (decisions.4 in PLAN-001-skills-ecosystem)

**Context**: Audit B finding — all 7 lifecycle SKILL.md files DESCRIBE the composition library validators/mutations in a "Schema-validated agent-claim verification" prose section, but no skill prescribes the actual invocation at the gate point. Build/SKILL.md Step 4b says "cross-check status enum" instead of `validateTaskDoneClaim()`. Plan/SKILL.md references the PlanNote renderer (X.D.2) without a `bun run` command. End/SKILL.md Step 1 is manual checkbox inspection. Composition skills (decompose, recompose, defrag, ingest) verdict FULL — they actually invoke their CLI scripts. The same pattern (per-skill scripts) extends naturally to the lifecycle skills.

**Decision** (verbatim from AskUserQuestion answer, SESSION-2026-05-23_02 Event 10):

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

**Considered Options**:

- **Per-skill scripts** (chosen) — matches defrag/ingest; self-contained; new validators colocate; clear invocation surface.
- **Composition library CLI binary with subcommands** — single binary `bun run shared/composition/cli.ts validate task <file>`. Less file proliferation but lifecycle skills cite an artifact outside their own directory, breaking the self-contained pattern.
- **Hybrid: shared validators in composition CLI + skill-specific orchestration in per-skill scripts** — best separation but two places to look.
- **In-process TypeScript import** — collapses: skills are markdown consumed by Claude Code (not a TS runtime); orchestrator still dispatches via Bash regardless.

User clarification context (Event 10): original options conflated "scripts" with "in-process TS import". User pointed out skills can simply ship scripts. Reframed options around the real existing pattern.

**Consequences**:

- *Positive*: Skills are fully self-contained — one directory = one skill = all its enforcement scripts. New validators land colocated with the skill that needs them. Pattern matches existing defrag/ingest. Orchestrator dispatch briefs reference a stable, skill-local path (`skills/<name>/scripts/<verb>.ts`). Scripts can be executed standalone for testing without invoking the full skill.
- *Negative*: Multiple skills may need similar logic (e.g., build + end both validate TASK DoD); some duplication possible. Mitigated by importing shared logic from `shared/composition/` — the scripts are thin wrappers, not reimplementations.
- *Neutral*: File proliferation is bounded — one script per gate point per skill. Wave 2 estimates 10-20 new files across 5 lifecycle skills; growth is linear with new validators.

**Implementation Notes**: SPEC-008 REQ for "skill gate-point scripts" cluster includes one TASK per script: build (validate-task-done, transition-impl-item, transition-qa-item), end (validate-spec-done, run-pre-flight), spec (validate-task-schema, validate-req-schema, validate-design-schema), decisions (lock-decision-mutation), plan (render-plan-note, set-part-done). Each script imports its validator/mutation from `shared/composition/src/` and exposes a CLI entry point via `bun run`. Scripts MUST exit non-zero on validation failure for shell-composable use.

**Rollback Path**: If per-skill scripts prove burdensome, fall back to composition library CLI binary (Option 2). Migration is mechanical: move script content into subcommand handlers; update SKILL.md citations. No data migration; no production breakage.

**Cross-D-N Implications**: D-4 (dispatch-brief generator scripts) explicitly extends D-1 — brief generators are also per-skill scripts. D-2 (library directory layout) narrows because scripts live under `skills/<name>/scripts/`, leaving the library to host pure logic. D-6 (extend `validateSpecDoneClaim` for `[~]`) is mechanical: the validator change happens in `shared/composition/src/validators/` and the script that wraps it (e.g., `skills/end/scripts/validate-spec-done.ts`) transparently picks up the new behavior.

**Failure Modes**: Script omits CLI entry point shape (no `if (import.meta.main)` guard) → fails to execute via `bun run`. Mitigated by SPEC-008 TASK DoD requiring smoke-test invocation. Script imports stale composition library API after refactor → caught by `bun test` (existing 508 tests + new tests Track 3). Two skills define similar scripts that diverge → smell-test caught during /review code-qualities-assessment axis.

**Performance Considerations**: Bun subprocess startup overhead per invocation (~30-50ms). For per-TASK build cycle with ~5 gate-point invocations × N tasks, overhead is bounded; well under existing TASK cycle wall-clock. Composition library imports are tree-shakeable so cold-start is fast.

**Open Clarifications**: None. The per-skill scripts pattern is well-established by defrag/ingest precedent; D-1 lock extends it to lifecycle skills.

**References**: [[ANALYSIS-004 Protocol Hardening Wave 2 Audit Synthesis]] Audit B section; [[SESSION-2026-05-23_02 Protocol Hardening Wave 2 Scope]] Event 10; existing scripts at `skills/defrag/scripts/defrag.ts` and `skills/ingest/scripts/ingest.ts`.

### D-2: Library Directory Layout — Extend Existing Flat Dirs

**Status**: LOCKED 2026-05-23 (decisions.4 in PLAN-001-skills-ecosystem)

**Context**: With D-1 locking per-skill scripts as the invocation surface, D-2 narrows to library-internal organization. Audit A surfaced 5 new schemas/parsers/validators to add (ADR, PLAN-done-claim, ANALYSIS, EPIC, CRIT). Three layout options: extend existing flat (consistent), wave-specific subdir (cleaner diff), or full restructure by note-type (bigger refactor).

**Decision** (verbatim from AskUserQuestion answer, SESSION-2026-05-23_02 Event 11):

> **Extend existing flat dirs (Recommended)**
>
> Add Wave 2 files to existing `shared/composition/src/schemas/`, `src/parsers/`, `src/validators/`. New types follow same naming: `adr-note.ts`, `analysis-note.ts`, etc. Consistent with 9 existing schemas; one pattern across all waves.

**Additional scope captured at lock time** (user directive, not an ADR-level decision): rename `_shared/` → `shared/` at project root. Captured in PLAN-001 as Track 4 cleanup item #11; not part of D-2 itself.

**Considered Options**:

- **Extend existing flat dirs** (chosen) — one pattern across waves; no Wave-2-specific cognitive load when reading the library months from now.
- **New `wave-2/` subdir grouping additions** — cleaner git diff for the wave; isolates new code. Drawback: Wave 3 forces either further proliferation (`wave-3/`) or inconsistent fallback to flat.
- **Group-by-note-type** (`src/note-types/<type>/{schema,parser,validator,renderer}.ts`) — aesthetic; requires moving 16+ existing files; risk of regression. User did not engage with this option.

**Consequences**:

- *Positive*: Library structure stays uniform across waves. New schemas/parsers/validators land next to their Wave 1 siblings, following identical naming (`<type>-note.ts`). Existing index files (if any) get appended, not restructured.
- *Negative*: No visual diff signal for which files are Wave 2 additions. Mitigated by git log + Wave 2 PR labels.
- *Neutral*: The `_shared/` → `shared/` rename is structural, not architectural; tracked separately.

**Implementation Notes**: SPEC-008 TASK ordering: (1) rename `_shared/` → `shared/` first (Track 4 cleanup; all subsequent paths reflect the new name); (2) add new schemas/parsers/validators to flat dirs; (3) update existing Wave 1 schema barrel-exports (if any) to include new types. The `shared/composition/src/schemas/common.ts` cross-cutting constants module (exports `validRelationTypes` etc.) stays at the same location and gets imported by Wave 2 dispatch-brief generators per D-4.

**Rollback Path**: If flat dirs grow unwieldy (e.g., 30+ files per dir post-Wave 3 or 4), migrate to group-by-note-type at that future wave. No data migration; pure file moves with import path updates.

**Cross-D-N Implications**: The `_shared/` → `shared/` rename (Track 4 #11) cascades through every D-N implementation that cites a path. SPEC-008 must execute the rename in its first TASK before subsequent TASKs reference paths. D-1 scripts cite `shared/composition/src/...` directly; D-4 brief generators import `from "shared/composition/src/schemas/common.ts"` — both depend on the rename.

**Failure Modes**: Rename incomplete (some files still reference `_shared/`) → caught by `bun test` import resolution + biome check; standard CI catch. New schema misnamed (e.g., `adr-schema.ts` instead of `adr-note.ts`) → caught by /review code-qualities-assessment axis flagging naming inconsistency.

**Performance Considerations**: None — pure file organization decision.

**Open Clarifications**: None.

**References**: [[ANALYSIS-004 Protocol Hardening Wave 2 Audit Synthesis]] Audit A section; [[SESSION-2026-05-23_02 Protocol Hardening Wave 2 Scope]] Event 11.

### D-3: Adversarial-Claim Test Scaffold — Shared Fixture-Driven Harness

**Status**: LOCKED 2026-05-23 (decisions.4 in PLAN-001-skills-ecosystem)

**Context**: Audit E finding — claim validators currently test struct arithmetic (happy-path + boundary cases) but NOT realistic agent-lying scenarios. Only 3 of 5 validators have parse-from-markdown-then-validate tests. The "mechanically impossible to lie" claim of the rigid protocol requires that validators reject fixtures crafted as a lying agent would craft them, not just struct-level inputs. Three scaffold options surface: per-validator adversarial test files (explicit), shared harness + fixture dir (DRY), or extend existing per-validator test files with `describe('adversarial: ...')` blocks (conventional).

**Decision** (verbatim from AskUserQuestion answer, SESSION-2026-05-23_02 Event 12):

> **Shared fixture-driven harness (Recommended)**
>
> Single test runner + fixture directory. Each lying-claim scenario lives as a named markdown file (e.g., `tests/fixtures/adversarial/task/drift-01-all-deferred-bypass.md`). A shared `testAdversarial({fixture, validator, expectedReject})` helper runs parse → validate → assert. New scenarios add a fixture file + a one-line table entry. Natural mapping to Audit E's drift-regression-marker request — each fixture *is* a drift surface.

**Considered Options**:

- **Shared fixture-driven harness** (chosen) — DRY; scales linearly with new scenarios (one fixture file); natural fit with Audit E item 10 (drift regression markers).
- **Per-validator adversarial test file** — explicit naming; greppable. Drawback: scaffolding code repeats; new scenarios require code edits.
- **Extend existing per-validator test files** — zero new files; conventional Jest/Bun-test layout. Drawback: mixed concerns (happy-path + adversarial); existing test files grow large.

**Consequences**:

- *Positive*: Each drift surface becomes a named, citeable fixture (`drift-01-all-deferred-bypass.md`). Adding a regression test for a newly-discovered drift surface is a one-line table entry + one fixture file — no scaffolding code. Fixtures live next to other tests but are self-documenting (read the file, see what the lying agent would produce). Audit E item 10 (drift regression markers) becomes mechanical: every fixture filename is the marker.
- *Negative*: Harness abstraction adds one layer of indirection between the test name and the assertion logic. Debugging a failing test requires reading both the fixture and the harness. Mitigated by descriptive fixture names + the harness being thin (~30 lines).
- *Neutral*: Initial harness implementation is one TASK; subsequent fixture additions are smaller.

**Implementation Notes**: SPEC-008 TASKs: (a) implement `testAdversarial({fixture, validator, expectedReject})` helper in `tests/_helpers/adversarial.ts`; (b) author the initial fixture set covering Audit E's top-10 prioritized scenarios (all-deferred DoD bypass for task; checkbox-flip without code change; AC flip without evidence; etc.); (c) wire the fixture inventory to a single test file `tests/adversarial-claims.test.ts` with table-driven cases. The fixture directory `tests/fixtures/adversarial/<type>/` MUST mirror the validator types: `task/`, `spec/`, `requirement/`, `design/`, `test-report/` (and post-Wave 2: `adr/`, `analysis/`, `epic/`).

**Rollback Path**: If the harness becomes hard to extend or fixtures drift from validator API, migrate scenarios into per-validator test files (Option 2). Fixture files survive the migration — they're plain markdown.

**Cross-D-N Implications**: D-5 (include all 3 P1 schemas) expands the validators covered, requiring corresponding fixture dirs for ANALYSIS and EPIC (CRIT has no claim validator). D-6 (validateSpecDoneClaim recognizes `[~]`) needs an adversarial fixture for "SPEC marked DONE with `[~]` items where the underlying REQ is NOT DEFERRED" — i.e., abuse of the new notation.

**Failure Modes**: Fixture file not parseable as markdown → harness reports parse error before validator runs (good — signals fixture is malformed, not validator behavior). Expected rejection regex too loose → may pass when validator emits unrelated error; mitigated by encouraging specific regex (e.g., `/at least one DoD item is unchecked/`) in the harness contract.

**Performance Considerations**: Each fixture invocation is parse + validate; bounded sub-second per scenario; 10-50 scenarios is fast.

**Open Clarifications**: None.

**References**: [[ANALYSIS-004 Protocol Hardening Wave 2 Audit Synthesis]] Audit E section; [[SESSION-2026-05-23_02 Protocol Hardening Wave 2 Scope]] Event 12; Audit E top-10 scenarios.

### D-4: Dispatch-Brief Template Persistence — Programmatic Per-Skill Scripts

**Status**: LOCKED 2026-05-23 (decisions.4 in PLAN-001-skills-ecosystem)

**Context**: Audit C found 4 QA notes using forbidden `validates` relation type — root cause: QA agent-dispatch brief template never enumerated CONVENTIONS Section 4.4's 11 valid relation types. The brief existed as prose in `build/SKILL.md` and `end/SKILL.md`; the prose drifted from the schema's `validRelationTypes` constant. Four shape options: inline in SKILL.md (status quo, drift-prone), static per-skill files in `references/` (greppable but cross-cutting constants duplicate), programmatic per-skill scripts (single source of truth via direct import), or shared cross-cutting + per-skill brief structures (comprehensive but two places to look).

**Decision** (verbatim from AskUserQuestion answer, SESSION-2026-05-23_02 Event 13):

> **Programmatic per-skill scripts (Recommended; extends D-1)**
>
> Each skill ships brief-generator scripts at `skills/<name>/scripts/dispatch-<agent>.ts`. Scripts import cross-cutting constants (e.g., `validRelationTypes` from `shared/composition/src/schemas/common.ts`) and skill-specific data, output the full brief text. When the schema adds a relation type, every brief auto-includes it. Strongest drift-prevention; same shape as D-1's per-skill scripts.

**Considered Options**:

- **Programmatic per-skill scripts** (chosen) — extends D-1; type-safe imports of cross-cutting constants; schema changes auto-propagate.
- **Static per-skill files in `references/`** — simple text; cross-cutting constants duplicate; manual sync required.
- **Shared cross-cutting file + per-skill brief structures** — comprehensive; two-place lookup.
- **Inline in each SKILL.md** (status quo) — NOT recommended; this is what produced Audit C's drift.

**Consequences**:

- *Positive*: Cross-cutting constants live in one place (`shared/composition/src/schemas/common.ts`). When `validRelationTypes` adds a new entry (e.g., a new typed verb), every dispatch brief that imports it includes the new entry automatically. No prose to manually update. Brief scripts can also generate type-safe per-agent context (the implementer brief, the QA brief, the architect brief) from the same skill, sharing the cross-cutting baseline.
- *Negative*: Skills produce brief text via subprocess invocation instead of inline. Orchestrator pastes script output into the Agent prompt. Indirection adds one step. Mitigated by scripts being well-documented + outputting markdown that the orchestrator can pipe directly.
- *Neutral*: Brief generation is per-dispatch overhead (~50ms); negligible compared to subagent dispatch + work duration.

**Implementation Notes**: SPEC-008 TASKs for brief generators — one per skill+agent pairing where dispatch happens: build/scripts/dispatch-implementer.ts, build/scripts/dispatch-qa.ts, decisions/scripts/dispatch-architect.ts, decisions/scripts/dispatch-decision-critic.ts, research/scripts/dispatch-analyst.ts, review/scripts/dispatch-reviewer.ts. Each script imports `validRelationTypes` from the schema; emits a structured brief with CONVENTIONS-compliance reminders + per-agent context + per-skill data (e.g., the rendered TASK content for an implementer dispatch). Scripts MUST be deterministic — same args = same output. Brief output target: markdown to stdout (so orchestrator pastes it directly).

**Rollback Path**: If programmatic generation proves too rigid, fall back to static per-skill `references/dispatch-brief-<agent>.md` files (Option 2). Migration: extract the template string from the script into a markdown file; update the SKILL.md citation. Cross-cutting constants then duplicate, with risk of drift returning.

**Cross-D-N Implications**: D-1 prescribes the script-per-skill location. D-4 adds another script category (dispatch-brief generators) at the same location. D-5 expands the validator set; the brief generators must include constraints from new validators (e.g., ADR brief generator includes the ADR schema's structural requirements). D-3's adversarial-claim harness can also be invoked by brief generators if a per-agent brief wants to cite past drift surfaces — orthogonal but composable.

**Failure Modes**: Brief generator script crashes mid-emission → orchestrator sees stderr; dispatch halts; user resolves (standard CLI failure). Brief generator emits stale CONVENTIONS reference (e.g., the schema renames a constant, generator doesn't update) → caught by `bun test` import resolution. Brief generator includes ALL relation types in a context where only a subset applies (e.g., session note only uses a few verbs) → mitigated by per-skill scripts being free to filter; the cross-cutting source is the authoritative full list.

**Performance Considerations**: Per-invocation overhead bounded; brief generation runs once per agent dispatch. Subprocess startup dominates; the work itself is template + constant substitution.

**Open Clarifications**: None.

**References**: [[ANALYSIS-004 Protocol Hardening Wave 2 Audit Synthesis]] Audit B + Audit C sections; [[SESSION-2026-05-23_02 Protocol Hardening Wave 2 Scope]] Event 13; the 11 valid relation types in CONVENTIONS Section 4.4 of `~/KNOWLEDGE-GRAPH-CONVENTIONS.md`.

### D-5: P1 Schema Inclusion — Include All Three (ANALYSIS + EPIC + CRIT)

**Status**: LOCKED 2026-05-23 (decisions.4 in PLAN-001-skills-ecosystem)

**Context**: Audit A surfaced P0 + P1 schema gaps:

- P0 (gate enforcement): ADR (no schema; PROPOSED→ACCEPTED gate uncovered); PLAN-done-claim (schema exists; mechanical check missing)
- P1 (state-mutation role): ANALYSIS (no schema; rejects ACCEPTED + Open Questions would close Brain v2 Wave 7 exploit); EPIC (no schema; rejects DONE without contained SPECs DONE); CRIT (no schema; structural support for adr-review convergence)
- P2 (read-only structural): PRD, FEATURE, SECURITY, RETROSPECTIVE, SKILL — defer

User selected "Include all 3 (full Audit A recommendation)" over "Include ANALYSIS only" — preferring complete P1 coverage now.

**Decision** (verbatim from AskUserQuestion answer, SESSION-2026-05-23_02 Event 14):

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

Total: 5 schemas + 5 parsers + 4 validators.

**Considered Options**:

- **Include all 3 P1** (chosen) — closes all known gaps now; matches Audit A's full recommendation.
- **Include ANALYSIS only; defer EPIC + CRIT** — pragmatic: ANALYSIS closes the hard-locked Open Questions exploit; EPIC has zero current consumers; CRIT has low structural variation. Saves ~2-3 days.
- **Include ANALYSIS + CRIT; defer EPIC** — middle ground.
- **Defer all 3 (P0 only)** — fastest delivery; smallest scope.

**Consequences**:

- *Positive*: Complete P1 schema coverage. ANALYSIS schema rejects the Open-Questions-in-ACCEPTED-analysis pattern (hard-locked user concern; 41 violations in Brain v2 Wave 7). EPIC schema is ready when the first EPIC note is authored (no retroactive scramble). CRIT schema supports adr-review structural convergence checks.
- *Negative*: ~2-3 days additional implementation effort vs deferring EPIC + CRIT. Some artifacts (EPIC, CRIT) have no immediate consumer; their schemas + validators sit unused until first authoring event.
- *Neutral*: Wave 2 effort grows from ~10-13 days to ~12-14 days. Still well under TIER_4 hard threshold (>25 D-Ns or major-architectural complexity).

**Implementation Notes**: SPEC-008 TASKs add five schema files (`adr-note.ts`, `analysis-note.ts`, `epic-note.ts`, `crit-note.ts`, `plan-done-claim-validator.ts`) plus four corresponding parsers and four claim validators (CRIT has no claim validator). Each new schema follows the existing Zod + `superRefine` pattern. Claim validator for `validateAdrAcceptedClaim` must check: (a) all Considered Options have rationale; (b) no `[ ]` checkboxes in any `## Clarifications` items at ACCEPTED time; (c) Status field is ACCEPTED. For `validateAnalysisAcceptedClaim`: no `## Open Questions` section present when status = ACCEPTED. For `validateEpicDoneClaim`: every `contains` relation target SPEC has status DONE.

**Rollback Path**: If EPIC schema proves consistently unused after Wave 2 ships, mark deprecated in a future ADR. Schema files survive; no production breakage. ANALYSIS schema is essential; will not be rolled back.

**Cross-D-N Implications**: D-2 dictates these new schemas land in `shared/composition/src/schemas/` flat. D-3's adversarial harness requires fixture coverage for each new validator (ADR, ANALYSIS, EPIC; CRIT has no claim validator and so no adversarial harness coverage). D-4's brief generators may import constraints from new schemas (e.g., ADR brief generator includes the structural requirements that `validateAdrAcceptedClaim` enforces).

**Failure Modes**: EPIC schema authored before any EPIC notes exist → cannot test against real fixtures. Mitigated by authoring a representative fixture as part of the SPEC-008 TASK DoD. CRIT schema authored without a claim validator → still useful for read-time structural validation (parse, surface malformations); does not block any gate.

**Performance Considerations**: None — schemas are parse-time validation; negligible per-note overhead.

**Open Clarifications**: None.

**References**: [[ANALYSIS-004 Protocol Hardening Wave 2 Audit Synthesis]] Audit A section; [[SESSION-2026-05-23_02 Protocol Hardening Wave 2 Scope]] Event 14; the hard-locked Open Questions exploit (Brain v2 Wave 7) cited via prose principle (no-open-questions-in-planning-artifacts).

### D-6: SPEC-007 Status Resolution — Amend Checkbox Notation + Extend Validator

**Status**: LOCKED 2026-05-23 (decisions.4 in PLAN-001-skills-ecosystem)

**Context**: Audit D found SPEC-007 status DONE with REQ-012 + TASK-013 + TASK-014 root-checkbox lines unchecked (`[ ]`). Investigation revealed REQ-012-SPEC-007 status is `DEFERRED` (legitimate terminal status), not silent drift. The audit-flagged "drift" is actually a notation gap: deferred items render as `[ ]` which reads as TODO. The SPEC root needs a notation that distinguishes "TODO" (`[ ]`) from "DEFERRED" (`[~]`).

**Decision** (verbatim from AskUserQuestion answer, SESSION-2026-05-23_02 Event 15):

> **Amend SPEC root checkbox notation for deferred items (Recommended)**
>
> Change SPEC-007 root's REQ-012/TASK-013/TASK-014 checkbox from `[ ]` to `[~]` (or `[deferred: rationale]`) to match REQ-012's `status: DEFERRED`. Add notation legend to SPEC root. Keep SPEC-007 status DONE — deferred is a legitimate terminal status. Cheapest; respects existing deferral decision. Also extends `validateSpecDoneClaim` to recognize `[~]` as terminal alongside `[x]`.

**Considered Options**:

- **Amend SPEC root checkbox notation** (chosen) — cheapest; respects deferral; validator extension is reusable.
- **Complete TASK-014 (do the migration)** — most thorough; closes the gap fully. Drawback: depends on whether the migration work is in scope.
- **Downgrade SPEC-007 status DONE → ACCEPTED** — most honest about the gap. Drawback: signals process failure; complicates downstream consumers.
- **Hybrid (migration + notation amendment)** — strongest closure; most effort.

**Consequences**:

- *Positive*: SPEC-007 status accurately reflects reality. Future SPECs with DEFERRED children get a clear notation for the SPEC root checkbox. The `validateSpecDoneClaim` extension is reusable — any SPEC with deferred children now passes the validator correctly.
- *Negative*: New notation (`[~]`) is a project-local convention that future readers must learn. Mitigated by SPEC root legend + CONVENTIONS amendment.
- *Neutral*: Bounded scope: one note edit on SPEC-007 + one validator change in `shared/composition/src/validators/spec-claim-validator.ts`.

**Implementation Notes**: SPEC-008 TASK: (a) edit SPEC-007 root via Brain MCP `edit_note` (find_replace) — change `- [ ] REQ-012`/`- [ ] TASK-013`/`- [ ] TASK-014` checkbox lines to `- [~] REQ-012 (DEFERRED)` etc.; add a notation-legend section if absent. (b) Extend `validateSpecDoneClaim` so `[~]` counts as terminal (alongside `[x]`); add adversarial fixture in `tests/fixtures/adversarial/spec/drift-NN-deferred-notation-abuse.md` testing that `[~]` paired with a NON-DEFERRED child REQ is REJECTED (prevents abuse). (c) Update CONVENTIONS Section 4.6 or 4.7 (SPEC structure) to document the `[~]` notation as canonical. (d) Migration: scan existing SPEC roots; flip any deferred-child `[ ]` to `[~]` (low-volume audit work).

**Rollback Path**: If `[~]` notation causes confusion, revert SPEC root edits + validator extension; instead either (a) downgrade SPEC-007 to ACCEPTED + accept the gap, or (b) execute the deferred migration TASK-014.

**Cross-D-N Implications**: D-5 expanded validator scope, but `validateSpecDoneClaim` is in scope under D-6 explicitly. D-3 adversarial harness needs a SPEC fixture for the `[~]` abuse case.

**Failure Modes**: `[~]` notation drifts between SPEC roots (some use `[deferred]`, others use `[~]`) → mitigated by validator rejecting any non-canonical notation; CONVENTIONS amendment fixes the canonical form. Validator extension accidentally treats `[~]` as terminal in contexts where it shouldn't (e.g., individual TASK DoD lines) → restrict the `[~]` recognition to SPEC root Artifact Status / Phases / Acceptance Criteria sections only, not TASK DoD.

**Performance Considerations**: None.

**Open Clarifications**: None.

**References**: [[ANALYSIS-004 Protocol Hardening Wave 2 Audit Synthesis]] Audit D section; [[SESSION-2026-05-23_02 Protocol Hardening Wave 2 Scope]] Event 15; existing REQ-012-SPEC-007 `status: DEFERRED` in `docs/specs/SPEC-007-.../requirements/`.

### D-7: `core/dispatcher.ts` Disposition — Delete

**Status**: LOCKED 2026-05-23 (decisions.4 in PLAN-001-skills-ecosystem)

**Context**: Audit D flagged `_shared/composition/src/core/dispatcher.ts:7-12` as missing `spec` source_type registration (only 4 types registered; `registry.ts` has all 5). Investigation confirmed `core/dispatcher.ts` is dead code: zero production imports (only consumed by its own `tests/dispatcher.test.ts`). Production code (`decompose.ts`, `recompose.ts`) uses `registry.ts`. Adapter functionality lives in `adapters/*.ts` and the `CompositionAdapter` interface lives in `core/adapter.ts` — both untouched by deletion. `registry.ts` docstring explicitly identifies `core/dispatcher.ts` as superseded ("an earlier internal dispatcher exists at core/dispatcher.ts; this registry.ts module is the SPEC-005-defined surface").

User clarified concern about breaking adapter functionality (SESSION-2026-05-23_02, pre-Event-16); orchestrator surfaced file-level evidence; user locked D-7 with full confidence.

**Decision** (verbatim from AskUserQuestion answer, SESSION-2026-05-23_02 Event 16):

> **Delete `core/dispatcher.ts` + its test (Recommended; evidence-confirmed safe)**
>
> Production code uses `registry.ts`. Adapters live in separate files (`adapters/*.ts`). CompositionAdapter interface lives in `core/adapter.ts` (preserved). Only `dispatcher.test.ts` references the dead module — deleted alongside. 508/508 tests should stay green; if any fail, investigation reveals a hidden dependency we should fix.

**Considered Options**:

- **Delete** (chosen) — evidence-confirmed safe; removes duplicate dispatch logic; prevents future divergence.
- **Fix by adding `spec` registration** — one-line change; preserves both files. Drawback: keeps duplicate dispatch logic; another spec-like gap could open in the future since the two modules stay separate.
- **Move `registry.ts` into `core/` + replace `dispatcher.ts`** — cleanest layout. Drawback: import path changes across `decompose.ts`, `recompose.ts`, tests.

**Consequences**:

- *Positive*: Removes ~80 lines of dead code + ~30 lines of dead test. Single dispatch source of truth (`registry.ts`). No future drift between two dispatchers because there's only one.
- *Negative*: If any unknown consumer exists (extremely unlikely; this is a local workspace), they break. Mitigated by 508 → 506 tests post-delete being the only test impact; `bun test` will surface any hidden dependency immediately.
- *Neutral*: Test count drops by 2 (the two cases in `dispatcher.test.ts`).

**Implementation Notes**: SPEC-008 TASK: (a) `rm shared/composition/src/core/dispatcher.ts` (path reflects D-2's `_shared` → `shared` rename); (b) `rm shared/composition/tests/dispatcher.test.ts`; (c) verify `bun test` is green; (d) verify no remaining import statements reference the deleted file (`grep -r "core/dispatcher" shared scripts skills` returns zero).

**Rollback Path**: `git revert` the deletion commit if a hidden consumer surfaces. File contents are in git history.

**Cross-D-N Implications**: D-2's `_shared` → `shared` rename applies to D-7's delete paths. Otherwise standalone.

**Failure Modes**: Hidden consumer exists outside grep scope (e.g., a doc that references the file path) → caught by `bun test` import resolution + biome lint. CI catches; revert is mechanical.

**Performance Considerations**: None — pure file deletion.

**Open Clarifications**: None.

**References**: [[ANALYSIS-004 Protocol Hardening Wave 2 Audit Synthesis]] Audit D section + pre-lock evidence summary; [[SESSION-2026-05-23_02 Protocol Hardening Wave 2 Scope]] Event 16; `registry.ts` docstring at `_shared/composition/src/registry.ts` (lines 7-15 cite supersession explicitly).

## Cross-Decision Coherence

The 7 D-Ns form 4 logical clusters mapping to the Wave 2 tracks:

| Cluster | D-Ns | Wave 2 track | Purpose |
|---|---|---|---|
| **Per-skill scripts spine** | D-1, D-4 | Track 2 (skill invocation wiring) | Per-skill `scripts/<verb>.ts` for both gate-point validation/mutation invocation (D-1) and dispatch-brief generation (D-4). One pattern; one invocation surface; one drift-prevention story. |
| **Library coverage** | D-2, D-5 | Track 1 (coverage gaps) | New schemas/parsers/validators (D-5) land in extended flat dirs (D-2). Five new schemas (ADR, PLAN-done-claim, ANALYSIS, EPIC, CRIT) close the coverage matrix. |
| **Test coverage** | D-3 | Track 3 (adversarial + integration + regression tests) | Shared fixture-driven harness for adversarial-claim tests; natural mapping to drift-regression markers from Phase X retired memory. |
| **Drift cleanup** | D-6, D-7 | Track 4 (current drift cleanup) | SPEC-007 notation amendment (D-6) + `core/dispatcher.ts` deletion (D-7) close the specific code/spec drift surfaces Audit D identified. |

The clusters are loosely coupled. D-1 + D-4 form a strong dependency (D-4 explicitly extends D-1's per-skill scripts pattern). D-2's `_shared` → `shared` rename (captured separately from D-2 as a Track 4 cleanup item per user directive) cascades through ALL D-Ns that cite a path — must execute the rename before subsequent file-path-citing TASKs.

## Migration Plan

SPEC-008 TASK ordering (proposed; subject to /spec phase elaboration):

1. **Rename `_shared/` → `shared/`** (Track 4 item #11; user directive from Event 11). Mechanical sweep; all subsequent TASKs reference `shared/...`.
2. **Delete `core/dispatcher.ts` + test** (D-7). Test count drops to 506.
3. **Author 5 new schemas + 5 parsers + 4 claim validators** (D-5; lands per D-2 in flat dirs).
4. **Extend `validateSpecDoneClaim` for `[~]` notation** (D-6); migrate SPEC-007 root checkbox notation.
5. **Implement adversarial harness + initial fixture set** (D-3). Wires the validators from step 3 into adversarial coverage.
6. **Author per-skill gate-point scripts** (D-1) for build, end, spec, decisions, plan. Each script imports its validator from the schema/validator set in step 3.
7. **Author per-skill dispatch-brief generator scripts** (D-4). Each imports cross-cutting constants from `shared/composition/src/schemas/common.ts`.
8. **Update lifecycle SKILL.md files** to cite the new scripts at gate points (Audit B remediations).
9. **Brain notes drift cleanup** (Track 4 items #1-#10): duplicate frontmatter, `validates` relations, title-without-colon, stale `type:test_report`, PII paths, duplicate Event numbers.
10. **Final coverage matrix + 4 exit gates** (code-qualities-assessment + incoherence + orphan-ref + lint).

## Validation

Each D-N has corresponding validation in SPEC-008's REQ AC + TASK DoD + test scaffolding:

- **D-1**: smoke-test invocation per script (`bun skills/<name>/scripts/<verb>.ts --help`); skill SKILL.md cites the script with concrete command; CI ensures the script exits non-zero on validation failure.
- **D-2**: file layout matches Wave 1 pattern; biome lint green; existing Wave 1 tests still pass.
- **D-3**: adversarial harness exercises Audit E's top-10 prioritized scenarios; each fixture has descriptive `drift-NN-<slug>.md` name matching a Phase X drift surface.
- **D-4**: brief generator output includes `validRelationTypes` import; schema constant change automatically reflected in generator output (test: append a new relation type → generator output includes it; revert; original output restored).
- **D-5**: 5 new schemas have Zod superRefine + parser tests; 4 claim validators have happy-path + rejection + adversarial parse-then-validate coverage (per D-3).
- **D-6**: `validateSpecDoneClaim` accepts `[~]` paired with DEFERRED child REQ status; rejects `[~]` paired with non-DEFERRED child; SPEC-007 root passes the validator post-amendment.
- **D-7**: `bun test` 506/506 pass post-delete; `grep -r "core/dispatcher" shared scripts skills` returns empty.

## Clarifications

(No clarifications yet; subsequent Adjustments land here per CONVENTIONS Section 3.1 ADR-specific update protocol.)

## Observations

- [decision] D-1 + D-4 together establish per-skill scripts as the canonical surface for both validation invocation and dispatch-brief generation; one pattern; one drift-prevention story #per-skill-scripts #invocation
- [decision] D-5 includes all 3 P1 schemas (ANALYSIS + EPIC + CRIT) per full Audit A recommendation; complete P1 coverage now over deferring #scope #wave-2
- [insight] Convergent root finding across 5 audit dimensions: protocol enforcement is documentation-grade not runtime-grade — Wave 2 closes the runtime gap mechanically #protocol #enforcement
- [constraint] D-2 mandates extending flat dirs at `shared/composition/src/{schemas,parsers,validators}/`; rename `_shared` → `shared` is a separate Track 4 cleanup item, not an ADR-level decision #directory-layout
- [outcome] Wave 2 final coverage: 5 new schemas + 5 parsers + 4 claim validators + 10-20 per-skill scripts + adversarial harness + fixture set #scope-tally
- [risk] EPIC + CRIT schemas have no immediate consumers in the skills project today; sit unused until first authoring event #scope-risk
- [risk] `_shared` → `shared` rename cascades through every D-N implementation citing a path; ordering matters in SPEC-008 TASK sequence #ordering
- [requirement] `validateSpecDoneClaim` must distinguish legitimate `[~]` use (paired with DEFERRED child) from abuse (`[~]` paired with non-DEFERRED child) #validator
- [technique] Adversarial harness drift-regression markers map 1:1 with Phase X retired-memory drift surfaces; fixture filenames become the canonical traceability spine #drift-regression #traceability

## Relations

- implements [[PLAN-001 Skills Ecosystem]]
- relates_to [[ANALYSIS-004 Protocol Hardening Wave 2 Audit Synthesis]]
- relates_to [[SESSION-2026-05-23_02 Protocol Hardening Wave 2 Scope]]
- extends [[ADR-001 Composition Library Architecture]]
- extends [[ADR-002 Adapter Contract and Plan Schema]]
- extends [[ADR-003 Plan/Session Render Architecture]]
- leads_to [[SPEC-008 Protocol Hardening Wave 2]]