---
title: 'ANALYSIS-005: Skills Ecosystem Enforcement Wiring Deep Analysis'
type: analysis
permalink: analysis/analysis-005-skills-ecosystem-enforcement-wiring-deep-analysis
tags:
- analysis
- skills-ecosystem
- enforcement-wiring
- deep-analysis
- plan-001
---

# ANALYSIS-005: Skills Ecosystem Enforcement Wiring Deep Analysis

> Exhaustive multi-wave deep-analysis of the ACMElabs/skills repo (723 files, Bun+TS workspace monorepo). Goal: whole-ecosystem health audit with the RETRO-004 "built-but-not-wired" capstone gap as the headline axis. 9 Wave-1 specialist cells (one lens x one slice) + 1 Wave-2 adjudication cell. Method: orchestrator never analyzed code; every finding traces to a dispatched specialist with file:line evidence. Saturation reached after Wave 2.

## Executive Summary

The composition library's central thesis is **sound and proven**: SHA-256 char-identity round-trip held across all 735 composition tests with zero content-drift in any compose/decompose operation. The deterministic engine, the adversarial-fixture harness, and the LLM-authors-intent / script-executes-bytes split are the strongest parts of the repo.

The headline finding is the inverse: **the enforcement mechanism the project built to make "agent lying mechanically impossible" is almost entirely inert.** Three independent specialists converged on this with line-level evidence:

- **0 of 17 lifecycle scripts** are invoked by any SKILL.md (6 DESCRIBED-NOT-INVOKED, 11 ORPHAN). The two that are wired (defrag, ingest) are the original curator skills.
- **All 10 composition claim-validators have zero non-test, non-hook callers.** Their only designed runtime path is the hook layer.
- **The 7-layer hook system is fully `.disabled`** with no activation path: no active `hooks.json`, no `hooks` key in `plugin.json`, `install.sh` does not enable it. 23 of 27 enumerated gates are phantom.

The data layer mirrors this: running the project's own parsers over its own notes, **140 of 204 REQ/DESIGN/TASK/ADR notes (69%) fail their own schemas** — because the schemas/parsers were authored against a narrower note shape than the corpus uses, and **nothing ever ran the parser over `docs/**`**. This is the "built-but-not-wired" pattern at the data layer.

The capstone risk for remediation is a **confirmed sequencing landmine**: wiring the validators into the /spec and /build gates (RETRO-004 "Problem A") before fixing parse-conformance ("Problem B") would cause the gates to reject ~140 existing notes and halt the lifecycle. RETRO-004's documented 5-step action sequence is correctly ordered (B before A) but ~2x under-scoped and missing three gates (fix-direction decision, parse-all verification, plugin.json hooks key). A corrected 8-step critical path is given in the Action Plan.

Verdict: the architecture is correct; the integration is half-finished and the DONE status on PLAN-001/SPEC-008 (flipped with `[~]` deferred markers) papers over an inert mechanism rather than a live one. This is legibility debt, not data loss — but the mechanism delivers near-zero enforcement value until wired.

## Stakeholder Briefs

**For the engineer.** Default `bun run test` runs only 65% of tests (819/1252) and excludes all 7 lifecycle skills + all hooks; `bun run check` lints 16 of ~100 files; `hooks/` (36 TS files) gets neither typecheck nor lint; there is no CI. `test:all`, full typecheck (root + composition), and full biome all pass today, so the gaps are latent, not active — but a regression in any lifecycle script or hook ships undetected. The composition library self-typechecks clean and self-lints with 5 trivial format/import violations no root script runs. Two scratch concerns to wire: `validated_by` (used in 66 TASK notes) is illegal under both the schema and CONVENTIONS; `install.sh --copy` produces dangling `../../../shared/` imports for 9 of 11 skills (symlink mode works).

**For the architect.** Structure is triplicated with no programmatic link: the schema declares fields, the parser matches heading-strings, the renderer emits heading-strings — confirmed at file:line for PLAN and TASK. There is one core->adapter dependency cycle (`core/validate.ts` imports `PlanAdapter`). Two adapters (Plan, SpecSubtree) bypass `BaseMarkdownAdapter`, triplicating the round-trip-critical replace/invert/frontmatter logic — and that copy-paste has already drifted into two incompatible `applyFrontmatterMutations` semantics under one name. The highest-leverage single change (ARCH-09): annotate each schema field with its heading via Zod `.describe()`, then a generic section-dispatcher parser/renderer derives from the schema — eliminating the triplication that RETRO-004 root-caused. Respect locked decisions (Zod, unified/remark, SHA-256, per-skill-script pattern, `[~]` notation, dispatcher deletion).

## Coverage Attestation Matrix

| Slice | Lens(es) applied | Specialist(s) | Coverage |
|:--|:--|:--|:--|
| S1 composition data/validation core | parser-conformance, phantom-gate | PARSE, GATE | Full |
| S2 composition round-trip engine | architecture, code-quality, security | ARCH, CQ, SEC | Full |
| S3 composition CLI orchestration | architecture, security | ARCH, SEC | Full |
| S4 lifecycle skill prose | integration-wiring, release-readiness | WIRE, REL | Full |
| S5 per-skill scripts | integration-wiring, phantom-gate | WIRE, GATE | Full |
| S6 curator skills (positive control) | integration-wiring, testing | WIRE, TEST | Full |
| S7 hooks enforcement layer | phantom-gate, security, testing | GATE, SEC, TEST | Full |
| S8 build/test/lint/CI/packaging | testing, release-readiness | TEST, REL | Full |
| S9 docs knowledge-graph conformance | parser-conformance, prior-art | PARSE, HIST | Full |
| (cross-cutting) remediation soundness | adjudication | REMED (Wave 2) | Full |

Residual gaps (honest, not dispatched — low leverage for stated goal): dependency/supply-chain version audit (zod/unified/remark/js-yaml, bun.lock integrity); deep analysis of the 4 schema-less note types (SESSION/FEATURE/SECURITY/RETRO); performance beyond hook-test runtime.

## Findings by Lens

### Integration-wiring (WIRE) + Phantom-gate (GATE) — STRUCTURAL

- **[STRUCTURAL-01] The enforcement mechanism is inert.** Severity Critical. 3+ specialists, same locators.
  - 0 of 17 lifecycle scripts invoked by any SKILL.md. `grep 'bun.*scripts/' skills/{build,decisions,end,plan,research,review,spec}/**/*.md` = 0 matches; contrast `defrag/SKILL.md:37` + `ingest/SKILL.md:34` which each have 5-6 invocation lines. Classification: 6 DESCRIBED-NOT-INVOKED (behavior duplicated in prose, script never named — e.g. dispatch-implementer.ts vs build/references/implementation-phase-workflow.md:101-195), 11 ORPHAN (neither invoked nor described — e.g. all 3 spec validators, validate-task-done.ts, validate-spec-done.ts, render-plan-note.ts).
  - All 10 claim-validators have zero non-test, non-hook callers (import-graph trace: task/requirement/design/spec/qa/adr/analysis/epic/plan-claim-validator + lenient-claim-extract). Non-test callers are exactly: `hooks/lib/dispatch-validator.ts` (disabled) and two unwired CLI wrappers.
  - build/SKILL.md:63 claims "/build NEVER trusts an implementer's claim without running the schema validator" and :116 "Lying agents are mechanically caught" — but the a-u cycle (:69-91) has no validator-execution step. end/SKILL.md:418 claims "schema rejection blocks closure" — but no step runs validate-spec-done.ts. dispatch-qa.ts:83 tells QA agents "validators will be run against your QA note" — no step runs them.
  - Gate Execution Table result: **23 of 27 enumerated gates fully phantom**, 2 partial (LLM-advisory), 2 genuinely live (/end Step 3.5 pre-flight bash checks; /review skill+agent dispatch).
  - Prior-art: corroborates RETRO-004 Five Whys, SKILL-006/007. Net-new: per-script classification + import-graph proof + the CLAUDE.md:228 instruction ("call the matching claim validator") is addressed to an LLM that cannot import TS without a concrete `bun` command that no skill provides.

- **[STRUCTURAL-02] Hooks disabled with no activation path.** Severity Critical. GATE-03, REL-07, HIST. Three-point verification: `.disabled` suffix on hooks.json + scripts dir; `plugin.json` has no `hooks` key; `install.sh` symlinks skills only, no enable logic. The hooks are the ONLY designed runtime path for the validators; with them off, the validators' sole execution path is `bun test`. Disabled after self-block during mid-build dogfooding (RETRO-004 Events 107-108).

### Parser-conformance (PARSE) — STRUCTURAL (empirical)

- **[STRUCTURAL-03] 140 of 204 notes (69%) fail their own schemas.** Severity High. Ran the project's own parsers over real docs notes.

| note-type | total | parse PASS | parse FAIL | %FAIL | top failure reason |
|:--|--:|--:|--:|--:|:--|
| REQ | 60 | 9 | 51 | 85% | ACCEPTED-gate: unchecked AC under status ACCEPTED (30); EARS heading (23 use `## EARS` vs parser's `## Requirement Statement`) |
| DESIGN | 24 | 4 | 20 | 83% | `[design]` obs-category absent from enum (20/24) |
| TASK | 115 | 48 | 67 | 58% | relation verb `validated_by` not in enum (65 notes) |
| ADR | 5 | 3 | 2 | 40% | `[design]` cat (1) + tags>5 (1) |
| **TOTAL** | **204** | **64** | **140** | **69%** | — |

  - **Refines RETRO-004**: its "0/all parse" claim is directionally true but quantitatively overstated (31% actually parse). The REQ corpus is SPLIT (42/60 `## Requirement Statement`, 23/60 `## EARS`), not uniformly EARS.
  - **Net-new driver RETRO-004 missed**: `validated_by` (66 TASK notes) + `closed_by` (5) are the primary TASK failure — the project's own TASK->QA linkage convention is illegal under its own schema AND CONVENTIONS Section 4.4's 11-verb allowlist. Also `[task]` obs-category (20 notes); free-form `files_affected` Action cells + one `CANCELLED` status; `## Priority` >200 chars (6 REQ); tags>5 (5 REQ + ADR-005).
  - Composition unit suite: 735 pass / 0 fail. The parsers are internally correct; the corpus drifted and the parser was never pointed at it.

### Architecture (ARCH) — STRUCTURAL on triplication

- **[STRUCTURAL-04] Structure triplicated, schema not single-source.** Severity High. ARCH-01/03, CQ-01/05, HIST-03 converge. For PLAN: 9 fields declared in `schemas/plan-note.ts:255-267`, matched by heading-string in `parsers/plan-note.ts:369-382`, emitted as heading-string in `renderers/plan-note.ts` — no programmatic link; a heading rename silently empties a field. `parseObservations`/`parseRelations` duplicated across 11 parsers; `renderObservations`/`renderRelations` across 5 renderers. **ARCH-09 (highest-leverage fix)**: Zod `.describe()` heading metadata + generic section-dispatcher → collapses per-type parser/renderer from 100-270 LOC to 20-40 and removes the drift vector.
- **[ARCH-05/CQ-03] core->adapter dependency cycle.** Severity Medium. `core/validate.ts:12` imports concrete `PlanAdapter` (only to reach `findRegeneratedSpans`), violating the documented cycle-avoidance contract in `cluster-rollback.ts:22-25`. All other core deps are downward.
- **[ARCH-06] SHA-256 invariant non-uniform.** Info. Strict byte-identity for ADR/Analysis/Session (via BaseMarkdownAdapter); relaxed to a 50% "integrity floor" for PLAN (regenerated sections); extended to N+1 files w/ cluster rollback for SpecSubtree. `plan-mutations.ts` parse-mutate-render path does NO round-trip hash check (trusts the schema).

### Code-quality (CQ)

- **[CQ-01/CQ-02] Adapter logic triplicated AND already drifted.** Severity High. `applySinglePassReplace`/`invertMap`/`applyFrontmatterMutations` copy-pasted into base + plan + spec-subtree (the two standalone adapters bypass BaseMarkdownAdapter). The frontmatter variants have diverged into two incompatible semantics under one method name (base = key→value replace; plan = old-value→new-value with JSON-array handling). Highest correctness-adjacent issue.
- **[CQ-04] Dead abstract surface.** Medium. `sectionDelimiter`/`identifierPattern`/`identifierPrefix` declared + subclass-set but never read (grep `this.<field>` = 0). **[CQ-06]** `registry.ts:15-18` comment references the deleted `core/dispatcher.ts` in present tense (ADR-005 D-7 deleted it — only the comment is stale; no orphan code). **[CQ-08]** `renderTasks` backlog partition is `filter(() => false)` — structurally dead.
- Subsystem scorecard: core Good (IO injected, narrow interfaces), renderers Good-but-redundant, mutations Good, adapters Fair with Poor redundancy.

### Testing posture (TEST)

- **[TEST-01] Default `test` = 65% of tests** (819/1252; excludes 7 lifecycle skills' 180 tests + hooks' 253 tests). **[TEST-02] Zero CI** (no `.github/workflows/`). **[TEST-03] hooks/ (36 TS files) excluded from both root typecheck and root lint** (`biome.json` include-allowlist omits hooks; runs 0 files). **[TEST-05] `check` lints 16 of ~100 files.** **[TEST-04] composition has 5 biome violations** no root script runs. **[TEST-06] composition excluded from root typecheck** but self-typechecks clean. **[TEST-07] decompose/recompose have 0 test files** (prose-only orchestration).
- **[TEST-08 POSITIVE] Composition tests are genuinely behavioral**: SHA-256 round-trip proofs (13 files), 11 adversarial drift fixtures (anti-lying scenarios), 10 claim-validator suites with PASS/FAIL/deferred paths. Strongest verification surface in the repo. **[TEST-10]** hook smoke tests take 16s (87% of `test:all` wall-clock — they spin up real git repos; explains their exclusion from default `test`).

### Security (SEC) — dev-tool context, 0 Critical / 0 High / 1 Medium / 6 Low / 7 PASS

- **[SEC-01..03] js-yaml `load()` on DEFAULT_SCHEMA** in dispatch-validator.ts:47/208 (Medium, disabled-latent), ast-helpers.ts:17 (Low, active), + 5 script sites — inconsistent with the CLI loaders which correctly use FAILSAFE_SCHEMA. Single fix: a shared `safeLoadYaml` wrapper. **[SEC-05]** hook path containment uses `resolve()`+`relative()` (no symlink resolution) while the purpose-built `containedPathSchema` (uses realpath) is **[SEC-04] dead code** (zero callers). **[SEC-06/07]** atomic-write + resolveRelativeToPlan validate at the caller boundary, not the utility — defense-in-depth gap.
- **PASS**: **[SEC-08]** all git subprocess calls use `Bun.spawn([...argv])` — no shell interpolation (CWE-78 clean). **[SEC-11]** plan-YAML uses FAILSAFE_SCHEMA + 1MB guard. **[SEC-12]** no committed secrets. **[SEC-10]** no ReDoS. **[SEC-13]** install.sh safe.

### Release-readiness (REL)

- **[REL-02 BLOCKER] Brain-MCP hard dependency undisclosed.** 53 `mcp__plugin_brain_brain__*` refs across 7 lifecycle skills, zero graceful degradation, and README/plugin.json/marketplace.json never state the prerequisite. Install without Brain MCP → 7 skills fail on first use.
- **[REL-03 BLOCKER] `install.sh --copy` broken** for 9 of 11 skills: scripts import `../../../shared/composition/...` but install.sh never copies `shared/`. Symlink mode works (Bun realpath).
- **[REL-04 RISK] README says "four skills"; plugin ships eleven** — zero docs for the 7 lifecycle skills. **[REL-01 RISK]** 99 wikilink instances in 4 lifecycle skills' content violate CONVENTIONS Section 5.3 (render as literal noise on Cursor/Aider; all are templates/examples, none break resolution). **[REL-06 RISK]** 3.4 MB docs/ knowledge graph ships in the plugin incl. 3 files with author-path PII. **[REL-05 RISK]** dual install paths (install.sh symlink + plugin auto-discovery) can double-register skills. **[REL-07/09 NIT]** 356K disabled hooks ship as dead weight; author email in manifests (standard).

## Findings by Slice

- **S1 (schemas/parsers/validators)**: internally correct (735 tests green) but never run against the corpus (69% fail) and never called outside tests. The contract layer exists in a vacuum.
- **S2 (adapters/core/renderers/mutations)**: sound round-trip engine; debt = triplication (two adapters bypass base class) + one core cycle + non-uniform SHA-256.
- **S3 (CLI decompose/recompose)**: 90% structural duplication, both correctly hardened (FAILSAFE yaml, CWE-22 path checks, SHA-256 gate).
- **S4 (lifecycle SKILL.md)**: describe behavior in prose; never name their scripts; carry 99 Section-5.3 wikilink violations; hard-depend on Brain MCP undisclosed.
- **S5 (17 lifecycle scripts)**: production-ready (CLI guards, colocated tests, path-containment) but unreachable from skill prose.
- **S6 (curator skills)**: defrag/ingest are the positive control (scripts wired, co-authored with SKILL.md); decompose/recompose have 0 tests.
- **S7 (hooks)**: complete + smoke-tested 7-layer design, fully disabled, untyped/unlinted, one latent symlink-traversal gap.
- **S8 (build/test/lint/CI/pkg)**: latent verification gaps (65% default test, no CI, partial lint/typecheck); two shippability blockers.
- **S9 (docs notes)**: 69% non-conformant to the project's own schemas across 7 distinct failure classes.

## Per-Specialist Unique Findings (depth preserved)

- **WIRE** unique: WIRE-07 (set-part-done is invoked as `Skill(skill="plan", ...)` LLM-dispatch, incompatible with the script's `--plan-path` CLI contract); WIRE-08 (render-plan-note.ts — RETRO-004's praised deterministic source-of-truth — has no SKILL.md invocation).
- **GATE** unique: GATE-07 (dispatch-qa.ts promises QA agents "validators will be run" with no backing); GATE-08 (CLAUDE.md:228 instruction un-executable by an LLM).
- **PARSE** unique: PARSE-05 (`validated_by` — the dominant, previously-undocumented TASK failure driver); PARSE-08 (8 REQs fail at the pre-Zod frontmatter layer — furthest from conformant, SPEC-006 cluster).
- **ARCH** unique: ARCH-04 (PlanAdapter widens `extractByRange` signature — not Liskov-substitutable; registry returns base type so extensions need downcast); ARCH-07 (decompose/recompose 90% duplicate, no shared harness); ARCH-08 (two mutation strategies — parse-mutate-render vs regex-flip-reparse — coexist because TASK/REQ/DESIGN renderers are deferred).
- **CQ** unique: CQ-07 (unified() remark pipeline instantiated 3x).
- **TEST** unique: TEST-10 (hook tests = 87% of suite wall-clock).
- **SEC** unique: the whole CWE-502 js-yaml inconsistency family (SEC-01/02/03) — net-new, not in any prior doc.
- **REL** unique: REL-03 (--copy import breakage), REL-05 (dual-install double-registration), REL-08 (defrag/ingest SKILL.md use repo-root-relative script paths that may not resolve from user CWD).
- **HIST** unique: HIST-02 (5 recon findings — no CI, lint scope, typecheck exclusion, default-test scope, decompose/recompose 0-tests — are documented NOWHERE in any ADR/RETRO/SKILL); HIST-03 (SKILL-006/007/008 are three manifestations of one root pattern, SKILL-004 advisory-needs-mechanical); HIST-04 (4 note types still schema-less, never carried forward).
- **REMED** unique: the fix-direction verdict table, the confirmed sequencing landmine, and the corrected 8-step path.

## Disagreements + Adjudications

- **RETRO-004 "0/all REQ/DESIGN parse" vs empirical "31% parse / 69% fail"** → RESOLVED by PARSE cell: RETRO-004 overstated and missed the `validated_by` TASK driver. The empirical numbers supersede.
- **Fix-direction per failure class** → adjudicated by REMED against the authority chain (CONVENTIONS → ADR → schema → notes):

| Failure class | Direction | Authority / rationale |
|:--|:--|:--|
| (a) REQ EARS heading (23/60) | FIX-PARSER | CONVENTIONS Section 4.9 names `## EARS`; schema field name is correct; parser hardcodes wrong heading. 1-line back-compat fix: accept EARS ?? Requirement Statement. |
| (b) `[design]` category (20/24) | AMEND-CONVENTIONS + RELAX-SCHEMA | meaningful domain category; force-conforming 20 notes loses precision. |
| (c) `[task]` category (20+) | AMEND-CONVENTIONS + RELAX-SCHEMA | same as (b). |
| (d) `validated_by` (66) / `closed_by` (5) | AMEND-CONVENTIONS+RELAX-SCHEMA for validated_by (add validates/validated_by pair); FIX-NOTES for closed_by | validated_by fills a real TASK→QA gap, 72 uses; closed_by maps to existing verb. |
| (e) Priority >200 chars (6) | RELAX-SCHEMA | 200-cap is ungrounded in CONVENTIONS. |
| (f) tags >5 (~61) | FIX-NOTES (trim) | CONVENTIONS Section 3 + Section 6 + schema all agree on max 5; notes drifted. |
| (g) CANCELLED status (1) | RELAX-SCHEMA | real terminal state; add to enum + CONVENTIONS Section 8.1. |
| (g2) free-form Action cells (~19) | FIX-NOTES | schema defines NEW/MODIFY/DELETE; CONVENTIONS silent; normalize notes. |

- **RETRO-004 action sequence sufficiency** → REMED verdict: ordering (B before A) correct, but Problem B is ~2x under-scoped (sees ~35 notes, real surface ~140 across 7 classes) and 3 gates are missing (fix-direction decision; parse-all verification; plugin.json hooks key). Bulk-rewrite tool is mis-ordered (needed BEFORE note-fixes, not after wiring).

## Risk + Opportunity Rollup

**Top risks (by leverage):**
1. Enforcement mechanism inert (STRUCTURAL-01/02) — the system's core value proposition delivers ~0 mechanical enforcement today.
2. Sequencing landmine — naive remediation (wire-before-fix) halts the lifecycle by rejecting 69% of notes.
3. Two shippability blockers (REL-02 Brain-MCP undisclosed, REL-03 --copy broken) make the marketplace plugin fail for a fresh installer.
4. No CI + 65% default test (TEST-01/02) — regressions in the unwired-but-real scripts ship silently.

**Top opportunities (strengths to build on):**
1. SHA-256 round-trip + adversarial harness are proven — the hardest part is done and trustworthy.
2. ARCH-09 (Zod `.describe()` single-source) is one change that dissolves the triplication root cause and ~140-note drift vector.
3. The scripts/validators/hooks already exist and are unit-tested — remediation is wiring + parse-fix, not rebuild.

## Tiered Action Plan

This is analysis output (recommended sequence), not an implementation directive; all items respect locked decisions (Zod, unified/remark, SHA-256, per-skill-script pattern, `[~]`, dispatcher deletion). Corrected 8-step critical path to make the mechanism live (supersedes RETRO-004's 5 steps):

**Tier 0 — Decide (gates, no code):**
1. Lock fix-direction per failure class (the adjudication table above) — a documented decision; CONVENTIONS amendments are architectural.

**Tier 1 — Contract reconciliation (Problem B):**
2. Amend CONVENTIONS + schema: add `design`/`task` obs-categories; add `validated_by`/`validates` verb pair (Section 4.4); add `CANCELLED` TASK status; raise/remove priority cap; fix REQ parser to accept `## EARS` (1-line, unbundled from the larger refactor).
3. Build the MCP-backed bulk-rewrite tool (SKILL-012 gap) — prerequisite for note fixes.
4. Bulk-fix notes (~80+): trim tags to 5, normalize Action cells, replace `closed_by`.
5. **Parse-all verification gate**: run all 204 notes through their parsers+schemas; zero failures required (this gate is itself the proof Problem B is closed).

**Tier 2 — Wiring (Problem A) + go-live:**
6. Wire the 17 lifecycle scripts into their 7 SKILL.md at gate points (+ wire REQ/DESIGN/TASK validators into /spec and /build).
7. Hooks go-live: rename `hooks.json.disabled`, add the `hooks` key to `plugin.json`, smoke-test all 7 layers; respect enforcement-layer-build-isolation (do not enable until verified).
8. Flip SPEC-008 root + PLAN-001 to genuinely DONE (validateSpecDoneClaim can then run and pass).

**Independent of the critical path (do anytime):**
- Add CI (`.github/workflows`) running `test:all` + root typecheck + composition typecheck + biome over all skills+hooks+composition.
- Fix the two shippability blockers (disclose Brain-MCP prereq; make --copy copy `shared/` or drop --copy).
- ARCH-09 single-source refactor (largest structural payoff; can precede or follow wiring).
- Resolve js-yaml DEFAULT_SCHEMA inconsistency (shared safeLoadYaml); break core->adapter cycle; de-duplicate adapter/renderer logic; update README to 11 skills; decide docs/ + hooks/ shipping + PII scrub.

## Methodology Appendix

- **Runtime probes**: agent-teams available; Brain MCP available (brain_mode=true, output to docs/analysis); wshobson assumed (brain:* agents used in practice).
- **Tier**: exhaustive (complex workspace monorepo + known live failure mode).
- **Waves**: Wave 1 = 9 single-hat cells (integration-wiring, phantom-gate, parser-conformance, architecture, code-quality, testing, security, release-readiness, prior-art) dispatched in parallel; Wave 2 = 1 adjudication cell (remediation soundness). Recon = 7 parallel mappers → Target Map.
- **Single-hat rule** enforced: every specialist = one lens x one slice; orchestrator performed no code analysis.
- **Convergence escalation**: 3+ specialists on one locator → Structural (STRUCTURAL-01..04). 2+ → severity +1.
- **Empirical verification**: PARSE + TEST cells executed the actual parsers/tests/lint/typecheck (not static reading) — the 69% parse-fail and the test/lint/CI matrix are measured, not inferred.
- **Residual gaps** (declared, not dispatched): supply-chain version audit; the 4 schema-less note types; performance beyond hook-test runtime.
- One specialist left scratch scripts during execution; removed — working tree verified clean.

## Observations

- [problem] The enforcement mechanism is inert: 0 of 17 lifecycle scripts wired, all 10 claim-validators have zero non-test callers, the 7-layer hook system is fully disabled with no activation path #built-not-wired #capstone
- [problem] 140 of 204 (69%) REQ/DESIGN/TASK/ADR notes fail their own schemas across 7 distinct failure classes; the parser was never run over docs/** #parser-conformance #phantom-gate
- [problem] Structure is triplicated (schema fields / parser heading-strings / renderer heading-strings) with no programmatic link, confirmed at file:line for PLAN and TASK #triplication #schema-single-source
- [insight] The composition library proves its own thesis by failing only where the thesis was not yet applied — SHA-256 round-trip held across 735 tests with zero content drift; all drift lives in the unmechanized integration layer #thesis-validation
- [risk] Wiring validators into gates before fixing parse-conformance would reject ~140 notes and halt the lifecycle — a confirmed sequencing landmine; RETRO-004's action sequence is correctly ordered but ~2x under-scoped #sequencing-landmine #remediation
- [decision] Fix-direction adjudicated per failure class against CONVENTIONS->ADR->schema->notes: FIX-PARSER for EARS heading; AMEND-CONVENTIONS+RELAX-SCHEMA for design/task categories and validated_by; FIX-NOTES for tags>5 and free-form Action cells #fix-direction
- [fact] validated_by (66 TASK notes) is illegal under both the schema RelationVerbEnum and CONVENTIONS Section 4.4 — the project's own TASK->QA convention violates its own rules; net-new, missed by RETRO-004 #relation-verb #net-new
- [problem] Verification surface gaps: default `test` runs 65% of tests, no CI exists, hooks (36 TS files) get neither typecheck nor lint, `check` lints 16 of ~100 files — all latent today, undetected tomorrow #testing #ci-gap
- [risk] Two marketplace shippability blockers: Brain-MCP hard dependency undisclosed (7 skills fail without it), install.sh --copy produces dangling imports for 9 of 11 skills #release-readiness #blocker
- [outcome] PLAN-001 and SPEC-008 are marked DONE with [~] deferred markers while the enforcement mechanism remains inert — legibility debt, not data loss; corrected 8-step critical path documented to make it genuinely live #plan-done-vs-inert
- [solution] Highest-leverage single change (ARCH-09): annotate schema fields with their heading via Zod .describe() and derive a generic section-dispatcher parser/renderer — dissolves the triplication root cause and the 140-note drift vector #architecture #single-source
- [insight] defrag and ingest are the positive control: their scripts are wired because SKILL.md and scripts were co-authored; the 7 lifecycle skills were authored Brain-side and never received the wiring step #positive-control #wiring

## Relations

- relates_to [[PLAN-001: Skills Ecosystem]]
- relates_to [[RETRO-004: PLAN-001 Skills Ecosystem Retrospective]]
- relates_to [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- inspired_by [[RETRO-004: PLAN-001 Skills Ecosystem Retrospective]]
- relates_to [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]]
- relates_to [[ANALYSIS-009: Shared-Code Shape for a Copied Plugin Artifact]]
