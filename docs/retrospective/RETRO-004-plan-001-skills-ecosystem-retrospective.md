---
title: 'RETRO-004: PLAN-001 Skills Ecosystem Retrospective'
type: retrospective
permalink: retrospective/retro-004-plan-001-skills-ecosystem-retrospective
status: ACCEPTED
tags:
- retrospective
- plan-001
- plan-capstone
- skills-ecosystem
- protocol-hardening
---

# RETRO-004: PLAN-001 Skills Ecosystem Retrospective

TIER_4 plan-capstone retrospective spanning 9 PLAN-001 sessions (2026-05-19 to 2026-05-25). Sits above RETRO-001/002/003 and synthesizes the full arc: bootstrap, spec authoring, the Wave 2 drift incident, Phase X protocol hardening, Wave 2 retro-validation, the original workflow close, and the SPEC-008 protocol-hardening Wave 2 build marathon. This note is the BRIDGE artifact for the post-merge parser-conformance session.

## Context and Discovery

### Discovery Map: Session to Plan-Part

| Session | Plan parts advanced | Reflection coverage | Event record |
|:--|:--|:--|:--|
| SESSION-2026-05-19_01 | research, decisions.1, decisions.2, spec-decomposition, spec.SPEC-001..006 | self (28 Events) | full |
| SESSION-2026-05-20_01 | drift remediation, ANALYSIS-002, spec.SPEC-007 stub, ADR-001 F-4 remote | self (13 Events) | full |
| SESSION-2026-05-20_02 | acmelabs-15 relocation (tangential; not a PLAN-001 part) | n/a | header only |
| SESSION-2026-05-20_03 | decisions.3 (ADR-003), spec.SPEC-007, 7 build parts | RETRO-001 | via RETRO-001 (15 Events) |
| SESSION-2026-05-20_04 | build.SPEC-001 PROOF, Wave 2 dispatch | self (9 Events) | full |
| SESSION-2026-05-20_05 | Wave 2 integration, Phase X bootstrap | RETRO-002 | via RETRO-002 (22 Events) |
| SESSION-2026-05-20_06 | Phase X.D/C/E execution | RETRO-003 | via RETRO-003 (15 Events) |
| SESSION-2026-05-21_01 | Wave 2 retro-validation, ADR-004, Wave 4 SPEC-005/006 | self (48 Events) | full |
| SESSION-2026-05-23_01 | PLAN reconcile, build.SPEC-002/003, review, end | self (8 Events) | full |
| SESSION-2026-05-23_02 | decisions.4 (ADR-005), spec.SPEC-008, build.SPEC-008 marathon | self (162 Events) + SKILL-006..014 | full |

### Coverage Statement

100 percent of the relevant record was read. Plan note read in full (99477 chars). All 9 PLAN-001 sessions covered: _01, _20_01, _04, _21_01, _23_01, _23_02 read directly from event records; _03, _05, _06 covered via RETRO-001/002/003 (their dedicated retrospectives). SESSION-2026-05-20_02 confirmed tangential (acmelabs-15 relocation, not a PLAN-001 part). RETRO-001/002/003 read in full. SKILL-006 and SKILL-009 reflections read in full; SKILL-007/008/010/011/012/013/014 covered via their Event pointers in SESSION-2026-05-23_02.

### Discovery Gaps

- [WARNING] SESSION-2026-05-21_01 ran 48 Events delivering the bulk of Wave 2 retro-validation (SPEC-002/003/004/007), ADR-004, and Wave 4 fresh builds (SPEC-005/006), yet the PLAN does NOT name it as owning or completing ANY build part. The PLAN attributes build.SPEC-002/003 to SESSION-2026-05-23_01 and build.SPEC-001 to _04. The richest build session is invisible in the PLAN provenance fields. Source-of-truth was preserved in per-TASK frontmatter, but the PLAN-to-session provenance link was lost. This is a derived-view drift, not data loss.
- [WARNING] SESSION-2026-05-20_04 frontmatter is malformed: type is note not session, no status field, H1 lacks the colon form. One of the hygiene violations flagged in RETRO-002; never retro-fixed.
- [WARNING] SESSION-2026-05-21_01 ended PAUSED and was never resumed or closed DONE; its substantial work was reconciled into the PLAN two sessions later via the PR-12 audit, not by closing the session.
- No reflection or event record was missing or fabricated. Three sessions delegate their reflection to RETRO-001/002/003 by design.

### Planned Scope vs What Shipped

Original PLAN-001 scope (8 objectives, all checked): composition library with SHA-256 char-identity round-trip, 5 adapters (ADR/ANALYSIS/SESSION/PLAN/SPEC-subtree), 4 user-facing skills (ingest/decompose/recompose/defrag), symlink install, zero net-new drift. All 8 objectives shipped and verified.

ADDITIONS beyond original scope (scope grew ~3x in parts):

- ADR-003 + SPEC-007 render architecture (plan/session note render pipeline) — a whole new feature cluster, born from the _20_01 drift-remediation experience.
- Phase X protocol hardening (29-item work plan, 3 TIER-1 BLOCKING memories, 6 note-type schemas + 6 claim validators) — born from the _05 catastrophic drift.
- ADR-004 Cross-Source Coordinator — born from Wave 2 retro-validation gap.
- ADR-005 + SPEC-008 protocol-hardening Wave 2 (63 notes, 47 TASKs, plugin hooks enforcement layer) — born from a 5-audit synthesis.

UNFINISHED at retro time: build.SPEC-008 part-level close is IN_PROGRESS (all 47 TASKs DONE and QA'd, suite 1252/0, but SPEC-008 root stays ACCEPTED not DONE; PLAN-001 stays IN_PROGRESS). DEFERRED to a post-merge session: Problem A (wire 11 per-skill scripts into 7 lifecycle SKILL.md; wire REQ/DESIGN validators into gates), Problem B (single-schema-source so REQ/DESIGN notes parse), MCP-backed bulk-rewrite tool, hooks go-live, final SPEC-008/PLAN DONE flips.

## Phase 0: Data Gathering

### 4-Step Debrief (across the plan)

**Observe (facts).** 162 + 48 + 28 + 13 + 9 + 8 events across the 6 directly-read sessions, plus 52 events via the 3 prior RETROs. 15 merged PRs in the original workflow plus the protocol-hardening branch. Test suite grew 0 -> 47 (SPEC-001 PROOF) -> 200 -> 444 -> 508 -> 1252. 25 PLAN parts, 8 ADRs (5 accepted decisions + ADR-004 + ADR-005), 8 SPECs, ~250 Brain notes.

**Respond (reactions).** Three sharp pivots: (1) the _05 post-compaction catastrophic drift forced the entire Phase X protocol-hardening detour; (2) the _21_01 user pivot deferred Wave 2 retro-validation mid-swarm then re-engaged it same session; (3) the _23_02 dogfooding catch where the enforcement layer under construction went live and blocked its own build. Repeated stalls on basic-memory infrastructure (MCP races, permalink drift, the wikilink links_to DB corruption needing a global reset --reindex).

**Analyze (interpretations).** The plan's central thesis (LLM-authors-intent, script-executes-bytes, SHA-256 gate) held perfectly: zero content-drift incidents in any composition-library operation across the whole plan. Every drift that DID occur was in the surrounding process layer (status flips, derived-view sync, note-template conformance, provenance links) where no mechanical gate existed yet. The plan proved its own thesis by failing only where the thesis was not yet applied.

**Apply (actions).** Extract the recurring meta-pattern (advisory-fails-under-load, build-the-mechanism-but-wire-it) as durable skills; carry the deferred parser-conformance inventory forward; reinforce derived-view sync and PLAN-session provenance as mechanical gates.

### Execution Trace (plan-level milestones)

| Date | Session | Milestone | Outcome | Energy |
|:--|:--|:--|:--|:--|
| 05-19 | _01 | Bootstrap + decisions + 6 SPEC subtrees authored | All gates PASS (12/12) | High |
| 05-20 | _20_01 | Render architecture 11 decisions + F-4 remote | ANALYSIS-002 + SPEC-007 stub | High |
| 05-20 | _03 | ADR-003 ACCEPTED + SPEC-007 (30 notes) + 7 build parts | PASS (47 percent infra overhead) | Mixed |
| 05-20 | _04 | build.SPEC-001 PROOF — SHA-256 round-trip PASS | 47/47 tests | High |
| 05-20 | _05 | Wave 2 merge then post-compaction catastrophic drift | 37 drift surfaces; 0 percent post-compaction | Crash |
| 05-20 | _05 | Recovery: 3 TIER-1 memories + Phase X plan | Hardening locked | High |
| 05-20 | _06 | Phase X execution: schemas + validators + skills | 200 -> 444 tests, 0 failures | High |
| 05-21 | _21_01 | Wave 2 retro-validation + ADR-004 + Wave 4 builds | 7/7 SPECs validated, 501 tests | High |
| 05-23 | _23_01 | PLAN reconcile + build.SPEC-002/003 + review + end | 508/508, /review PASS, PRs 12-15 | High |
| 05-23 | _23_02 | Wave 2 hardening: ADR-005 + SPEC-008 + 47-TASK marathon | 47/47 TASKs, 1252/0; close-out in-flight | High |

### Outcome Classification (plan-level)

**Mad (blocked).** Post-compaction catastrophic drift (_05). basic-memory MCP races and the links_to DB corruption (_03, _23_02). Enforcement-layer self-block during dogfooding (_23_02 Events 107-108). Session-limit deaths mid-swarm requiring re-dispatch (_21_01 Event 14).

**Sad (suboptimal).** 47 percent infrastructure overhead in _03. PLAN-session provenance lost for _21_01. Repeated note-template drift (P2/P3 in _23_02) authored before any parse-gate existed. Per-skill scripts built but never wired (Problem A). REQ/DESIGN validators never run during build (phantom gate).

**Glad (success).** SHA-256 round-trip PROOF passed first build and never regressed. Advisory-to-mechanical transition worked: _05 had 37 drift surfaces, _06 had 1. ADR-review converged (ADR-001/003/004 round 1; ADR-002 round 2; ADR-005 by resolution). Parallel swarms (5-7 wide) executed cleanly once batching discipline locked. The enforcement layer caught real pre-existing drift (P2/P3/P4) the moment it ran.

## Phase 1: Insights

### Patterns and Shifts (primary)

| Pattern | Frequency | Impact | Category |
|:--|:--|:--|:--|
| Mechanism built but not wired or invoked | 3 (scripts unwired; validators never run; hooks disabled) | High | Failure |
| Advisory protocol fails under context pressure | 2 (post-compaction drift; batch status-flips) | High | Failure |
| Derived-view drift (PLAN dashboard vs per-TASK truth) | 4 (_05, _21_01, _23_01 reconcile, _23_02) | High | Failure |
| Note-template conformance drift authored pre-gate | 4 classes (P1/P2/P3/P4) | Med | Failure |
| basic-memory infra friction (races, permalinks, links_to) | 5+ across sessions | Med | Failure |
| SHA-256 round-trip gate held | every build | High | Success |
| ADR-review converges with pre-locked D-Ns | 5 ADRs | Med | Success |
| Canonical-block-N-agents-inline parallel swarm | 4 waves | High | Success |
| Pre-close resumability audit catches PLAN gaps | 3 sessions | Med | Success |
| Stop-the-line discipline halts forward motion on drift | 6+ | High | Success |

**Shifts detected.**

| Shift | When | Before | After | Cause |
|:--|:--|:--|:--|:--|
| Enforcement model | _05 to _06 | advisory prose rules | schema + validator + 3 TIER-1 memories | post-compaction drift root-caused to single-layer advisory |
| Drift defense | _19 to _23 | hope plus discipline | mechanical claim validators plus plugin hooks | repeated derived-view + note-template drift |
| Scope | _19 to _23 | composition library plus 4 skills | plus render arch plus Phase X plus Wave 2 hardening | each drift incident spawned a hardening cluster |
| Provenance authoring | _21_01 to _23_02 | LLM find_replace on PLAN | deterministic renderPlanNote source of truth | hand-maintained custom sections kept drifting and breaking |
| Reflection capture | _06 to _23_02 | post-session retrospective | inline background skill-sidecar plus pointer, never ask | user hard-lock after wrong-form mid-session captures |

### Five Whys: build.SPEC-008 mechanism inert (the capstone failure)

**Problem.** SPEC-008 shipped the entire enforcement mechanism (validators, per-skill scripts, hooks) yet at close-out the mechanism is largely inert: scripts uninvoked, REQ/DESIGN validators cannot parse the notes, hooks disabled.

**Q1.** Why is the mechanism inert? A1. The 11 per-skill scripts are not referenced by any of the 7 lifecycle SKILL.md files; the REQ/DESIGN validators were never run during the build; the hooks were disabled after they self-blocked.

**Q2.** Why were scripts not wired and validators not run? A2. No acceptance criterion required the wiring step or the validator-run step. REQ-004/005 ACs verified scripts EXIST, have import.meta.main, path-containment, and colocated tests — but never that a SKILL.md INVOKES the script at its gate.

**Q3.** Why did the ACs verify existence but not integration? A3. The SPEC was authored by 5 parallel architects with file-ownership fences; each owned its track in isolation. Integration is a cross-track concern that fell between the fences. The ACs were written track-locally.

**Q4.** Why did cross-track integration fall between the fences? A4. There was no single owner or single source defining how the tracks compose at runtime. The schema owns data shape; the parser owns heading-to-field mapping; the template owns heading layout — structure is triplicated, and runtime composition is owned by nobody.

**Q5.** Why is structure triplicated and composition unowned? A5. The schema-driven approach was applied to validation (Zod is the validator) but NOT to structure or to integration. The schema was never elevated to be the single source the parser, template, renderer, and skill-wiring all derive from.

**Root cause.** Schema-driven was applied half-way: the schema validates data but does not own structure or runtime integration, so parser/template/notes drift multi-directionally and the built mechanism is never wired into the lifecycle it was meant to enforce. "Exists plus unit-tested" was accepted as DONE for integration deliverables.

**Actionable fix (deferred to post-merge, captured in SKILL-006/007/008/009).** Make the schema the single source the parser/validator/template/renderer/skill-wiring all derive from (Problem B). Add a wiring AC and a parse-at-creation gate so every script names its caller and every note parses against its type at authoring (Problem A). Treat a script or validator as DONE only when invoked.

### Five Whys: PLAN-session provenance lost for _21_01

**Problem.** The session that did the most build work (_21_01, 48 events) is named by the PLAN as owning or completing zero build parts.

**Q1.** Why no provenance link? A1. _21_01 advanced work at per-TASK granularity (schema-honest PENDING substatus) while batched Wave-4 dispatch did not author per-TASK build_workflow_items, so the PLAN build-part substatus never transitioned to reference _21_01.

**Q2.** Why did batched dispatch skip per-TASK PLAN items? A2. PlanNoteSchema requires per-TASK build_workflow_items for non-PENDING build parts; batched agents flip per-TASK frontmatter directly, leaving the PLAN part at PENDING as the schema-honest representation.

**Q3.** Why was schema-honest PENDING acceptable as a stopping point? A3. Source-of-truth lives in per-TASK frontmatter; the PLAN rollup is a derived view. Under speed pressure the derived view was deferred ("reconcile later").

**Q4.** Why was the derived view deferred rather than synced each batch? A4. No mechanical gate forced PLAN-rollup sync at batch close; the rule (keep derived views synced) was advisory.

**Q5.** Why advisory not mechanical? A5. Same root as the capstone: derived-view sync is a cross-note concern with no single owner or gate; it relied on orchestrator discipline, which degrades under pressure.

**Root cause.** Derived-view sync (PLAN rollup, PLAN-session provenance) was advisory and deferred under speed pressure; it required an explicit reconciliation session (PR-12) to repair. Same advisory-fails-under-load pattern as the _05 drift.

**Actionable fix.** Mechanical PLAN-rollup-and-provenance sync at every batch close (the spec-root-and-plan-graph-sync rule, locked 2026-05-24, now exists as a memory; make it a renderer-enforced gate). The Event-128/129 decision (renderPlanNote is the deterministic source of truth; stop hand-maintaining custom sections) is the structural fix.

## Phase 2: Diagnosis

### Critical Error Patterns

| Finding | Priority | Evidence |
|:--|:--|:--|
| Built-but-not-wired mechanism (scripts/validators/hooks inert) | P0 | _23_02 Event 148 (3 compounding failures); 0/7 lifecycle skills wire scripts |
| Advisory protocol collapses under context pressure | P0 | _05 (37 surfaces; 0 percent post-compaction vs 100 percent pre); RETRO-002 |
| Derived-view drift PLAN vs per-TASK truth | P1 | _23_01 Event 01 (5 builds done in code, dashboard claimed 1); _21_01 provenance loss |
| Enforcement-layer self-block during dogfooding | P1 | _23_02 Events 107-108 (Layer-2/6 hooks live mid-build) |
| Note-template conformance drift authored pre-gate | P1 | P1/P2/P3/P4 in _23_02 (task category, Description/Objective, false-DONE) |
| basic-memory infra friction | P2 | MCP races (_03); links_to DB corruption needing global reset (_23_02) |

### Success Analysis

| Strategy | Evidence | Impact | Atomicity |
|:--|:--|:--|:--|
| SHA-256 char-identity round-trip as BLOCKING gate | PROOF passed first build, never regressed across 1252 tests | 10 | 95 percent |
| LLM-authors-intent, script-executes-bytes split | zero content-drift in any composition operation plan-wide | 10 | 92 percent |
| Advisory-to-mechanical enforcement transition | _05 37 surfaces to _06 1 surface, same orchestrator | 9 | 90 percent |
| Canonical-block-N-agents-inline parallel swarm | 4 waves, 5-10 agents, zero output variance | 8 | 88 percent |
| Pre-close resumability audit | caught PLAN gaps before fresh-session pickups | 7 | 90 percent |
| Stop-the-line on every drift detection | 6+ halts; each prevented compounding drift | 8 | 90 percent |
| ADR-review with pre-locked D-Ns converges faster | ADR-001/003 round-1 pass; ADR-002 architect-direct failed round 1 | 7 | 88 percent |

### Near Misses

| What almost failed | Recovery | Learning |
|:--|:--|:--|
| Enforcement hooks went live mid-build and blocked the session | disabled the layer; deferred go-live to post-parser-fix | a plugin hook activates the moment its handler file appears; never wire an enforcement layer live until complete and QA'd |
| 4 notes flagged false-DONE (P4) | verified genuinely done via QA reports + disk; reconciled checkboxes | the validators surfaced REAL pre-existing drift; none were lies, but the record was unticked |
| Wave 2 code shipped 200 tests but UNVALIDATED against REQ/DESIGN | PUD-D2 Hybrid retro-validation validated all 7 SPECs | passing tests is not spec-compliance; retro-validation closed the gap |
| Mermaid reserved word `end` broke the renderer graph | root-caused and fixed the renderer | reserved words in deterministic renderers need escaping |

### Traceability Health

| Metric | Count | Status |
|:--|:--|:--|
| ADRs (5 decisions + ADR-004 + ADR-005) | 8 | - |
| SPECs | 8 | - |
| build TASKs (SPEC-008) | 47/47 DONE + QA'd | [PASS] |
| ADR coverage gate (every accepted ADR implemented_by a SPEC) | all PASS | [PASS] |
| Gate A semantic gap + Gate B drift (per SPEC) | all PASS after refinement | [PASS] |
| TASK to REQ traceability (SPEC-008) | 46/46 | [PASS] |
| REQ/DESIGN parse-conformance against their own validators | 0 of all REQ/DESIGN parse | [FAIL] |
| PLAN-to-session provenance for _21_01 build work | missing | [WARNING] |

REQ/DESIGN parse-conformance is the central [FAIL]: parseRequirementNote reads `## Requirement Statement` but SPEC-008 REQs use `## EARS`; DesignNoteSchema lacks a `design` observation category yet 20/24 design notes use it; some `## Priority` prose exceeds the 200-char cap; some frontmatter exceeds 5 tags. This affects ALL REQ/DESIGN notes project-wide, including pre-accepted ones, because the gate never ran during /spec or /build (Gate A/B used analyst/critic judgment, not the parsers).

### Decisions That Aged Well vs Badly

**Aged well.** SHA-256 round-trip as the non-negotiable invariant (the plan's reason to exist; never failed). LLM-plan + script-execute split (zero content drift). Deferring the SPEC-subtree adapter behind the ADR PROOF (validated architecture before the hardest 500-LOC adapter). The 3 TIER-1 BLOCKING memories from _05 (directly produced _06 clean execution). renderPlanNote as deterministic source of truth (Event 128/129; ended the hand-maintained-section drift).

**Aged badly.** Schema-honest PENDING substatus during batched dispatch (caused the _23_01 reconciliation drift and the _21_01 provenance loss). Track-local SPEC authoring without an integration owner (produced the built-but-not-wired capstone failure). Authoring REQ/DESIGN notes without running their parsers at creation (let 4 drift classes accumulate invisibly). Building the enforcement hooks inside the same repo that loads them as a plugin (self-block during dogfooding).

## Phase 3: Decisions

### Action Classification

**Keep (reinforce).** SHA-256 round-trip gate; LLM-intent/script-bytes split; multi-layer mechanical enforcement; canonical-block parallel swarms; pre-close resumability audit; stop-the-line discipline; pre-locked D-Ns before ADR authoring.

**Drop (stop).** Accepting "exists plus unit-tested" as DONE for integration/script deliverables. Deferring derived-view sync under speed pressure. Authoring notes without a parse-at-creation check. Wiring an enforcement layer live before it is complete and QA'd. Batched status-flips without per-TASK QA evidence.

**Add (new skills).** See Phase 4 — built-but-not-wired (SKILL-006/007), parse-at-creation (SKILL-008), schema-single-source (SKILL-009), reflection-capture process (SKILL-010/011), bulk-migration tooling gap (SKILL-012), adr-review gate scope (SKILL-013), complete-rename (SKILL-014).

**Modify (update existing).** Spec-root-and-plan-graph-sync from advisory to renderer-enforced gate. /spec and /build gates to run the REQ/DESIGN parsers (close the phantom-gate). SPEC authoring to require an integration/wiring AC per cross-track deliverable.

### SMART Validation (top new skills)

| Skill | Specific | Measurable | Attainable | Relevant | Timely | Verdict |
|:--|:--|:--|:--|:--|:--|:--|
| script-DONE-includes-wiring | Y | Y (grep SKILL.md for script path) | Y | Y | Y (at script-task DoD) | Accept |
| parse-at-creation | Y | Y (run type parser, exit 0) | Y | Y | Y (at note authoring) | Accept |
| schema-single-source | Y | partial (architectural) | Y | Y | Y (at schema design) | Accept with refinement |
| phantom-verifiable-gate | Y | Y (AC verb names an executed step) | Y | Y | Y (at AC authoring) | Accept |
| enforcement-layer-build-isolation | Y | Y (hooks.json absent until QA'd) | Y | Y | Y (during hook build) | Accept |

### Action Sequence (deferred close-out, dependency-ordered)

| Order | Action | Depends on | Blocks |
|:--|:--|:--|:--|
| 1 | Problem B: schema as single source; reconcile REQ/DESIGN notes to parse | none | 2, 3, 5 |
| 2 | Problem A: wire 11 per-skill scripts into 7 SKILL.md; wire REQ/DESIGN validators into gates | 1 | 5 |
| 3 | Build MCP-backed bulk-rewrite tool (no sanctioned bulk Brain-note find-replace primitive) | 1 | 4 |
| 4 | Hooks go-live: re-enable hooks.json + scripts; TASK-046 smoke proves it | 1, 2 | 5 |
| 5 | Flip SPEC-008 root DONE + PLAN-001 DONE (validateSpecDoneClaim can then run) | 1, 2, 4 | none |

## Phase 4: Extracted Learnings (atomicity-scored)

### Learning 1
- Statement: A script or validator is DONE only when a caller invokes it; exists-plus-tested is inert.
- Atomicity: 93 percent
- Evidence: 11 SPEC-008 scripts, 180 tests passing, 0 SKILL.md references (Event 148)
- Operation: existing SKILL-006

### Learning 2
- Statement: An AC saying "verifiable via X" where X never runs in the lifecycle is a phantom gate.
- Atomicity: 92 percent
- Evidence: REQ/DESIGN validators first ran at close-out and failed every note (Event 147-148)
- Operation: existing SKILL-007

### Learning 3
- Statement: Run a note type's parser at authoring time or template drift accumulates until a downstream gate catches it.
- Atomicity: 90 percent
- Evidence: P2/P3 drift across 37-40 notes surfaced only when validators ran (Event 110-111)
- Operation: existing SKILL-008

### Learning 4
- Statement: Schema-driven requires the schema to be the single source the parser, validator, template, and renderer derive from.
- Atomicity: 90 percent
- Evidence: structure triplicated across schema/parser/template; drift was multi-directional (Event 153)
- Operation: existing SKILL-009

### Learning 5
- Statement: Sync PLAN rollup and PLAN-to-session provenance at every batch close; do not defer derived-view sync under speed pressure.
- Atomicity: 88 percent
- Evidence: _23_01 reconciliation found 5 builds done but dashboard showed 1; _21_01 provenance lost
- Operation: ADD (reinforces spec-root-and-plan-graph-sync memory)

### Learning 6
- Statement: Never wire an enforcement layer live in a loaded plugin until the layer is complete and QA'd; a declared hook activates when its handler file appears.
- Atomicity: 90 percent
- Evidence: Layer-2/6 hooks went live mid-build and blocked the session (Events 107-108)
- Operation: existing (enforcement-layer-build-isolation memory)

### Learning 7
- Statement: Advisory protocol fails under context pressure; enforce critical protocol at 3-plus layers (schema, validator, memory, hook).
- Atomicity: 88 percent
- Evidence: _05 37 drift surfaces under post-compaction pressure; _06 1 surface after mechanical enforcement
- Operation: existing (workflow-phase-rigor memory; reinforced)

### Learning 8
- Statement: Passing tests is not spec-compliance; retro-validate code against REQ/DESIGN before claiming a build done.
- Atomicity: 86 percent
- Evidence: Wave 2 shipped 200 tests but PUD-D2 Hybrid retro-validation found gaps in all 7 SPECs
- Operation: ADD

### Learning 9
- Statement: Reflect immediately and in the background at each correction or dogfooding catch; never ask whether to capture.
- Atomicity: 90 percent
- Evidence: user hard-locked the canonical reflection-capture process after wrong-form mid-session captures (Events 152-155)
- Operation: existing SKILL-010/011

### Learning 10
- Statement: Avoid wikilink syntax for non-Brain-note references; body-text links to unresolvable targets create NULL-permalink rows that brick edit_note.
- Atomicity: 85 percent
- Evidence: ADR-001/002/003 links_to corruption required a global reset --reindex (Event 28)
- Operation: ADD (basic-memory mitigation)

## Phase 6: Close the Retrospective

### Plus / Delta

**Plus.** The structured event ledgers (especially _23_02's 162 events with explicit State Changes and reflect-capture pointers) made plan-level synthesis tractable. The 3 prior RETROs covered _03/_05/_06 in depth, so this capstone could synthesize rather than re-derive. SKILL-006..014 sidecar notes gave atomic, pre-scored learnings.

**Delta.** Some sessions delegate reflection to RETROs (good) while others self-reflect inline (also good) but there is no index mapping which session is covered where; this discovery step had to be reconstructed. The PLAN-session provenance gap for _21_01 meant the richest build session had to be found by reading, not by following the PLAN.

### ROTI

Score: 3 (high return). This capstone produced the bridge inventory for the deferred post-merge session, surfaced the PLAN-session provenance gap that no per-session retro caught, and consolidated the built-but-not-wired meta-pattern that recurs across the inert mechanism, the phantom gate, and the unsynced derived views. Time invested: one focused retrospective pass over 9 sessions.

### Helped, Hindered, Hypothesis

**Helped.** Event ledgers with State Changes sections; the 3 prior RETROs; SKILL sidecar reflections with confidence buckets and atomicity; the PLAN State header in _23_02 precisely stating the deferred inventory.

**Hindered.** Large session notes overflowing read_note into files (paginated via jq + chunked reads). Missing session-to-RETRO coverage index. PLAN provenance fields not naming _21_01.

**Hypothesis.** A renderer-enforced derived-view sync at batch close would have eliminated the _23_01 reconciliation and the _21_01 provenance loss. A parse-at-creation gate plus a wiring AC would have prevented the entire built-but-not-wired capstone failure. Next plan should make both mechanical from day one.

## Observations

### Plan outcomes

- [outcome] All 8 PLAN-001 objectives shipped and verified; composition library + 4 skills + render pipeline live; suite grew 0 to 1252 with 0 failures #plan-complete #verification
- [outcome] build.SPEC-008 reached 47/47 TASKs DONE and QA'd but part-level close is IN_PROGRESS; SPEC-008 root stays ACCEPTED and PLAN-001 stays IN_PROGRESS pending parser-conformance #in-flight #deferred
- [outcome] Scope grew roughly threefold beyond the original plan; each drift incident spawned a hardening cluster (render arch, Phase X, ADR-004, Wave 2 hardening) #scope-growth #emergent

### Successes

- [fact] SHA-256 char-identity round-trip PROOF passed the first build and never regressed across the entire plan; zero content-drift in any composition operation #sha256 #zero-drift
- [insight] The plan proved its own thesis by failing only where the thesis was not yet applied: every drift occurred in the unmechanized process layer, never in the gated composition layer #thesis-validation #root-cause
- [insight] Advisory-to-mechanical enforcement works: same orchestrator went from 37 drift surfaces (_05) to 1 (_06) after 3 TIER-1 memories plus schemas landed #defense-in-depth #evidence
- [technique] Canonical-block-N-agents-inline produced zero output variance across 4 parallel waves of 5-10 agents #parallelism #pattern

### Critical failures

- [problem] SPEC-008 built the full enforcement mechanism but left it inert: 0 of 7 lifecycle skills wire their scripts; REQ/DESIGN validators never ran during build; hooks disabled after self-block #built-not-wired #capstone-failure
- [problem] REQ/DESIGN notes fail their own parsers project-wide (EARS vs Requirement Statement heading; design category absent from enum; priority over 200 chars; tags over 5) — the gate never ran during /spec or /build #parser-conformance #phantom-gate
- [problem] Derived-view drift recurred 4 times: PLAN dashboard diverged from per-TASK frontmatter truth; required an explicit PR-12 reconciliation session #derived-view-drift #advisory-fails
- [problem] The enforcement hook layer went live mid-build because a loaded plugin resolves hook commands at runtime; it blocked its own build #dogfooding #self-block

### Process and infra

- [risk] basic-memory body-text wikilinks to unresolvable targets create NULL-permalink rows that brick edit_note; required a global reset --reindex across 10 projects #basic-memory #links-to-corruption
- [decision] renderPlanNote is the deterministic source of truth for PLAN structure; hand-maintained custom sections kept drifting and were abandoned (Event 128-129) #renderer-source-of-truth #fix
- [constraint] A script or validator is DONE only when invoked; exists-plus-unit-tested is a completeness illusion #done-definition #wiring
- [risk] SESSION-2026-05-21_01 (48 events, the richest build session) is named by the PLAN as owning zero parts; PLAN-session provenance was lost under speed pressure #provenance-gap #plan-drift
- [insight] Passing tests is not spec-compliance; Wave 2 shipped 200 green tests yet retro-validation found gaps in all 7 SPECs #test-vs-spec #retro-validation

### Carry-forward (deferred to post-merge session)

- [decision] Problem B (single-schema-source) is ordered first: reconcile REQ/DESIGN notes to parse, then Problem A (wire scripts and validators into gates), then bulk-rewrite tool, then hooks go-live, then SPEC-008 and PLAN DONE flips #deferred-inventory #action-sequence
- [requirement] This retrospective is the bridge artifact for the post-merge parser-conformance session; it synthesizes SKILL-006 through SKILL-014 and the full deferred inventory #bridge-note #handoff

## Relations

### part_of

- part_of [[PLAN-001: Skills Ecosystem]]

### relates_to

- relates_to [[SESSION-2026-05-19_01: Skills Bootstrap and PLAN-001]]
- relates_to [[SESSION-2026-05-20_01: PLAN-001 Drift Remediation and Plan/Session Render Architecture]]
- relates_to [[SESSION-2026-05-20_03: ADR-003 Render Architecture and SPEC-007 Unblock]]
- relates_to [[SESSION-2026-05-20_04: Build Phase Wave 1 SPEC-001 PROOF]]
- relates_to [[SESSION-2026-05-20_05: Wave 2 Integration and Brain State Sync]]
- relates_to [[SESSION-2026-05-20_06: Phase X.D.2 PlanNote Renderer Extension]]
- relates_to [[SESSION-2026-05-21_01: PUD-D2 Lock and Wave 2 Retro-Validation Kickoff]]
- relates_to [[SESSION-2026-05-23_01: PLAN-001 Reconcile and Build SPEC-002]]
- relates_to [[SESSION-2026-05-23_02: Protocol Hardening Wave 2 Scope]]

### relates_to (synthesized artifacts)

- relates_to [[RETRO-001: SESSION-2026-05-20_03 Render Architecture Retrospective]]
- relates_to [[RETRO-002: Phase X Bootstrap and Wave 2 Integration Drift Recovery]]
- relates_to [[RETRO-003: Phase X Execution and Composition Library Completion]]
- relates_to [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- relates_to [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[SKILL-006: script-wiring-integration]]
- relates_to [[SKILL-007: phantom-verifiable-gate]]
- relates_to [[SKILL-008: parse-at-creation]]
- relates_to [[SKILL-009: schema-single-source-of-truth]]

### inspired_by

- inspired_by [[ANALYSIS-003: Phase X Protocol Hardening State]]