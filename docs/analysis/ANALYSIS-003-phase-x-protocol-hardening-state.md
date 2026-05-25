---
title: 'ANALYSIS-003: Phase X Protocol Hardening State'
type: analysis
permalink: analysis/analysis-003-phase-x-protocol-hardening-state
status: ACCEPTED
tags:
- analysis
- phase-x
- protocol-hardening
- drift-remediation
- active
---

# ANALYSIS-003: Phase X Protocol Hardening State

## Context

Canonical project-knowledge-graph record for Phase X (Protocol Hardening) work on PLAN-001 (skills-ecosystem). Brain-side mirror of the assistant-private state-capture memory. A fresh agent reading this plus SESSION-2026-05-20_05 plus PLAN-001 can pick up exactly where work left off.

## Why Phase X exists

Today (2026-05-20) the orchestrator catastrophically failed during Wave 2 builds (build.SPEC-002 + 003 + 004 + 007). The orchestrator dispatched 4 single-agent builds without per-TASK QA gates. 30 TASK notes were flipped to DONE without any QA notes existing. 28 REQs + 12 DESIGNs flipped DRAFT to ACCEPTED prematurely. The session note SESSION-2026-05-20_05 was created retroactively from memory rather than lived as a ledger. 95 Brain note edits done today are uncommitted to git. PLAN-001 was partially damaged by a killed agent and is missing 5 branches in its frontmatter. 37 distinct drift surfaces have been catalogued — full inventory in SESSION-2026-05-20_05 Event 09.

User analyzed root cause as a system-design failure, not just an execution failure. The protocol existed in fragments across many files but was not ENFORCED at the layers that matter (schemas, templates, renderers, skills). Even reading every memory and every standard, the orchestrator still bypassed the protocol because it was not mechanically enforceable.

## Protocol architecture locked 2026-05-20

Two TIER-1 BLOCKING orchestrator-private rules. Inlined below per Brain note convention.

### Rigid per-TASK build+qa cycle

The only valid way to orchestrate spec implementation. Per-TASK atomic cycles enumerated as explicit PLAN items (impl + qa per TASK). Each item has its own status state (PENDING / IN_PROGRESS / DONE / BLOCKED / FAILED). State transitions in the PLAN happen FIRST, then drive session-note Events, then drive agent dispatches.

Non-negotiables:

- Implementer reads entire spec subtree before touching code
- Implementer implements ONE TASK at a time; scope = ONLY that TASK
- QA agent dispatched with the SAME TASK scope; also reads entire spec subtree
- QA does scoped evaluation against TASK Definition of Done + linked REQ Acceptance Criteria + linked DESIGN compliance points
- QA writes findings to a QA note with per-criterion PASS/FAIL/PARTIAL evidence
- QA returns verdict only: PASS or FAILED + reference to QA
- Implementer MUST go back and address problems — no exceptions
- Fix cycle scope = ONLY the scoped problem area
- 3-iteration cap then HALT to user

Checkbox lists ARE the validation contract:

- TASK Definition of Done — implementer's build contract
- REQ Acceptance Criteria (EARS Given/When/Then) — QA validates against these
- DESIGN compliance/architecture checkboxes — QA validates against these

The PLAN note carries the dispatch instructions. The PLAN Zod schema mandates per-TASK impl + qa items; the plan-note renderer deterministically generates them with checkboxes rendered inline from the linked TASK/REQ/DESIGN notes. The orchestrator's dispatch brief equals verbatim rendered content. Agents receive crystal-clear instructions without needing prompt-file updates.

QA to orchestrator to implementer handoff translation (fail path):

- QA signals FAILED + reference to the QA note — nothing more
- Orchestrator reads the QA, identifies each unchecked item across TASK + linked REQs + linked DESIGNs
- Orchestrator builds the implementer fix-brief that QUOTES each unchecked item VERBATIM + cites the QA note evidence
- Implementer cannot claim ambiguity — the brief literally quotes what is not done

Programmatic schema validation of agent claims:

- Implementer claim TASK done parses TASK note, requires every DoD item to be checked. If any unchecked, reject the claim
- QA claim validation PASSED parses linked REQ + DESIGN + TASK notes, requires every covered checkbox to be checked. If any unchecked, reject the claim
- Schema-rejected claim then orchestrator re-engages the agent with the specific failing item

### Workflow phase rigor at every layer (meta-rule)

Every workflow phase (research / decisions / spec / build / review / end / plan) MUST embed its rigid protocol at ALL of these layers:

1. Zod schema — validates note structure + agent claims
2. Template — mandates required sections
3. Renderer — deterministically generates required structure
4. Skill SKILL.md — explicit ordered protocol with verification gates
5. Orchestrator-private memory — high-visibility cross-session reference
6. CLAUDE.md — Tier-1 references as blocking gates
7. Orchestrator dispatch briefs — verbatim quoted content

The PLAN renderer is the load-bearing enforcement. It reads linked TASK DoD + REQ AC + DESIGN compliance and generates per-TASK impl + qa items with dispatch-brief-ready content. Defense in depth at multiple layers means single-layer failures cannot bypass the protocol.

## Drift inventory summary

37 surfaces — full details in SESSION-2026-05-20_05 Event 09.

| Category | Count | Examples |
|---|---|---|
| Git uncommitted work | 3 | 95 modified Brain notes; session note originally untracked |
| PLAN-001 damage | 7 | Partial damage; missing branches; false DONE; stale dashboard; bad wikilinks |
| Session notes | 7 | Type/title/status frontmatter violations; PII paths; two IN_PROGRESS sessions |
| SPEC-001 subtree | 5 | REQs/DESIGNs at ACCEPTED (should be DONE post-QA); derived view drift; Brain MCP edit bug |
| Wave 2 SPECs | 7 | 4 SPEC roots false DONE; 30 TASKs false DONE; premature ACCEPTED; fake validated_by; 34 missing QAs |
| QA note frontmatter | 4 | Duplicate type field; underscore in type; quote inconsistencies |
| Other notes | 3 | ANALYSIS-002 kebab title; RETRO-001 + ADR-003 cross-contamination |
| Code-vs-spec | 1 | Wave 2 code (200 tests pass) UNVALIDATED against REQ EARS / DESIGN constraints |

## Phase X work plan

| # | Item | Status |
|---|---|---|
| X.A | Phase X Bootstrap | DONE |
| X.A.1 | Capture protocol verbatim in SESSION-_05 Event 10 | DONE |
| X.A.2 | Write per-TASK build+qa cycle orchestrator-private memory | DONE |
| X.A.3 | Write workflow-phase-rigor-at-every-layer orchestrator-private memory | DONE |
| X.A.4 | Update MEMORY.md index | DONE |
| X.A.5 | Commit X.A initial | DONE |
| X.A.6 | Write state-capture orchestrator-private memory | DONE |
| X.A.7 | Write this Brain knowledge-graph mirror (ANALYSIS-003) | IN_PROGRESS |
| X.B | Audit existing enforcement layers | PENDING |
| X.B.1 through X.B.10 | Audit 7 lifecycle skills + NOTE-TEMPLATES + STRUCTURES + composition library | PENDING |
| X.C | Update skills + templates + structures | PENDING |
| X.C.1 through X.C.6 | Update /plan /build /spec /decisions /research /review /end + NOTE-TEMPLATES + STRUCTURES | PENDING |
| X.D | Composition library mechanisms | PENDING-DECISION |
| X.D.1 through X.D.7 | Extend PlanNote schema + renderer + add TaskNote/ReqNote/DesignNote/TestReportNote schemas + claim-validators | PENDING-DECISION |
| X.E | Wrap-up | PENDING |
| X.E.1 | Update CLAUDE.md with TIER-1 references | PENDING-DECISION |
| X.E.2 | Reconcile PLAN-001 + add Phase X structure | PENDING |
| X.E.3 | Final commit + phase close | PENDING |

## Pending user decisions

D1: Composition library mechanism completion tonight? Options: (a) defer to Wave 2 rebuild, (b) include tonight 8-12hr, (c) partial schemas-only 5-6hr.

D2: Wave 2 code throw-out vs salvage? Options: (1) throw out + rebuild, (2) salvage + retrofit QA.

D3: CLAUDE.md updates? Options: (1) update tonight, (2) hold for user review.

D4: PLAN-001 reconciliation timing? Options: (1) reconcile now before audit, (2) inline as part of audit.

## How to resume Phase X

If picking up cold, read in this order:

1. This analysis note
2. Orchestrator-private TIER-1 BLOCKING memories at the assistant's auto-memory location
3. SESSION-2026-05-20_05 Events 09+ for verbatim protocol + audit + bootstrap
4. PLAN-001 in paginated reads
5. Confirm branch: feat/plan-001-wave-2-integration; last commits d28852f + c02ca27
6. Check git status: ~95 Brain notes modified, uncommitted — held pending D2
7. Surface pending decisions D1-D4 to user if not already answered

## Retirement criteria

Move to DONE when Phase X.E.3 done, all D1-D4 resolved + applied, PLAN-001 frontmatter shows Phase X DONE, Wave 2 either fully thrown-out + rebuilt OR fully retro-validated + closed.

## Status Update — Post-PR-#8 (2026-05-21)

Phase X execution complete except for D2-blocked X.E.2 + X.E.3. All sections above this point are historical record of the planning + audit work as it stood on 2026-05-20. This section is the durable post-execution state.

### Final phase status

| Phase | Status | Outcome |
|---|---|---|
| X.A Bootstrap | DONE | Two TIER-1 protocol memories + ANALYSIS-003 + MEMORY.md index |
| X.B Audit | DONE | 7-skill audit + composition library audit + NOTE-TEMPLATES audit. 15-item execution order locked |
| X.C Skills + Templates + Structures | DONE | 10-agent parallel wave (7 SKILL.md + 3 deferred code items). PR #6 |
| X.D Composition Library Mechanism | DONE | 7 of 7 sub-items via PR #6 |
| X.E Wrap-up | PARTIAL DONE | Docs portion DONE (CLAUDE.md + NOTE-TEMPLATES.md + KNOWLEDGE-GRAPH-STRUCTURES.md); X.E.2 + X.E.3 BLOCKED on PUD-D2 |

### Composition library deliverables (PR #6 + #7 + #8)

- **6 note-type schemas**: PlanNoteSchema (with BuildWorkflowItem), SessionNoteSchema, TaskNoteSchema, RequirementNoteSchema, DesignNoteSchema, SpecRootNoteSchema, TestReportNoteSchema
- **6 parsers**: corresponding parser for each note type
- **4 renderers**: PlanNote, SessionNote, SpecRoot semantic, TestReport byte-identical
- **13 mutations**: 11 plan mutations including transition-impl-item + transition-qa-item (mandate session context, throw on missing) + applyCheckboxMutation (cross-note flip)
- **6 claim validators**: validateTaskDoneClaim, validateRequirementAcClaim, validateDesignComplianceClaim, validateSpecDoneClaim, validateTestReportPassClaim, applyCheckboxMutation re-parse validation
- **Test counts**: 200 pass / 16 fail (session start) to 444 pass / 0 fail (session end)

### PRs landed

| PR | Title | Merge commit |
|---|---|---|
| #6 | Phase X protocol hardening (X.D + X.C + X.E docs) | `2f049fd` |
| #7 | Recovery-test readiness (PUD-D2 surfacing + BLOCKED transitions) | `8dc30f1` |
| #8 | Session close (PAUSED to DONE + Event 15) | `ce3d726` |

### Pending User Decisions resolved + remaining

- **D1 Composition library scope** — RESOLVED (include with renderer-per-note-type scope; all 7 X.D items done)
- **D2 Wave 2 retro-validation disposition** — STILL OPEN. Captured as PUD-D2 in PLAN-001. Hybrid recommended (use new claim validators to find gaps; file new TASKs only for genuine gaps; drive only gaps through rigid cycle). Blocks X.E.2 (PLAN-001 final reconciliation) + X.E.3 (final phase close) + all 6 build.SPEC-NNN parts
- **D3 CLAUDE.md updates** — RESOLVED (TIER-1 references applied)
- **D4 PLAN-001 reconciliation timing** — RESOLVED partial (recovery-readiness in PR #7; full reconciliation gated on D2)

### Resume instructions (fresh session)

A fresh `/plan PLAN-001-skills-ecosystem` invocation will:

1. Run post-compaction rehydration checklist (TIER-1 BLOCKING)
2. Read PLAN-001 - find protocol-hardening IN_PROGRESS + 6 BLOCKED build.SPEC-NNN parts
3. See PUD-D2 in `## Pending User Decisions` as the gating decision
4. Surface PUD-D2 with Hybrid as Recommended default
5. After user adjudicates: D2 resolution unblocks build.SPEC-002/003/004/007 retro-validation chain (parallelizable as 4-SPEC swarm); resolving those unblocks build.SPEC-005/006 then review + end phases then X.E.2 + X.E.3

### Retirement criteria revision

This note transitioned from IN_PROGRESS to ACCEPTED on 2026-05-21. It will move to DEPRECATED when:

- PUD-D2 is resolved AND applied (Wave 2 either retro-validated to closed state OR thrown-out + rebuilt)
- PLAN-001 frontmatter shows Phase X status DONE
- build.SPEC-NNN parts no longer reference PUD-D2 as blocker

Until then it remains the canonical Brain knowledge-graph anchor for Phase X work.

## Observations

### Planning + audit (2026-05-20, historical)

- [decision] Phase X created to embed rigid implementation+QA protocol at every enforcement layer simultaneously after today's orchestrator + system-design failures #protocol #hardening
- [fact] 37 distinct drift surfaces catalogued from today's work #drift #audit
- [decision] Brain knowledge-graph mirror of orchestrator-private state-capture memory is intentional — different audiences and lifecycles #knowledge-graph #durability
- [constraint] Phase X.D originally gated on user decision D1; D2 throw-out vs salvage gates Phase X.E.2 #decisions-pending
- [risk] If session compacts before decisions resolved, fresh agent reads this analysis to reactivate the decision surface #continuity #resumability

### Post-execution (2026-05-21, current)

- [outcome] Phase X.A + X.B + X.C + X.D completed end-to-end in SESSION-2026-05-20_06; X.E docs portion completed via 3-agent parallel wave; X.E.2 + X.E.3 BLOCKED on PUD-D2 #x-phase-execution
- [fact] Composition library deliverables: 6 note-type schemas + 6 parsers + 4 renderers + 13 mutations + 6 claim validators across PLAN / SESSION / TASK / REQ / DESIGN / SPEC root / QA — defense in depth across schema + parser + renderer + mutation + validator + skill + auto-memory + CLAUDE.md + dispatch-brief layers #defense-in-depth
- [fact] Test counts: 200 pass / 16 fail at session start → 444 pass / 0 fail at session end; +244 new tests #verification
- [decision] D1 (composition library scope) RESOLVED include-with-renderer-per-note-type; D3 (CLAUDE.md updates) RESOLVED applied; D4 (PLAN-001 reconciliation timing) RESOLVED partial; D2 (Wave 2 disposition) STILL OPEN as PUD-D2 #decisions-status
- [decision] Hybrid recommended for D2 — keep existing code as baseline; use new claim validators to find real gaps; file new TASKs only for genuine gaps; drive those through rigid cycle. Parallelizable 4-SPEC swarm. Estimated 6-10 hours #d2-recommendation
- [insight] Parallel-wave-with-shared-protocol-block pattern worked well — pre-pass authors canonical inline block once + N agents inline verbatim. Avoids per-agent reinvention; produces consistent surface across files #parallelism #pattern
- [problem] AGENTS.md required-reading was skipped in post-compaction rehydration step 1 (TIER-1 BLOCKING violation flagged by user 2026-05-21); session-note Observations + Relations were not refreshed across Events 02-15 (violation of the rule that every session-note section stays current at all times, not just event entries, same user flag) — corrective refresh applied to this note and SESSION-_06 in chore/analysis-003-post-pr-8-state branch #self-flagged-violation #remediation

## Relations

### Plan + decision lineage

- part_of [[PLAN-001: Skills Ecosystem]]
- implements [[ADR-003: Plan/Session Render Architecture]]
- extends [[SPEC-007: Plan/Session Render Implementation]]

### Session ledger

- relates_to [[SESSION-2026-05-20_05: Wave 2 Integration and Brain State Sync]]
- relates_to [[SESSION-2026-05-20_06: Phase X.D.2 PlanNote Renderer Extension]]

### Related analyses

- relates_to [[ANALYSIS-001: SPEC Clustering]]
- relates_to [[ANALYSIS-002: Plan/Session Note Render Architecture]]

## X.B Audit Findings (DONE 2026-05-20)

7 lifecycle skills audited + composition library current state + NOTE-TEMPLATES. Per-skill gap-analysis summary:

| Skill | Lines | Existing rigor | Highest-leverage gap |
|---|---|---|---|
| /plan | 230 | Two-step edit; PLAN owns workflow state; status enum | No per-TASK impl+qa mandate inside build parts; no composition library reference |
| /build | 286 | Per-TASK Stage A cycle 4a-4g (closest to rigid protocol) | Briefs ad-hoc, not = verbatim rendered PLAN content; no schema validation of agent claims |
| /spec | 242 | Strict REQ→DESIGN→TASK order; Gate B traceability | No PLAN handoff contract emitting per-TASK impl+qa items with rendered DoD/AC/compliance |
| /decisions | 257 | Per-D-N micro-cycle (closest decisions-side match) | lockDecision not formalized as deterministic function requiring context |
| /research | 208 | Options-only; no-Open-Questions; no-deferral | convergencePass not schema-validated mechanically |
| /review | 320 | 10-value verdict enum; diff-hash cache | No checkbox-vs-diff cross-check axis |
| /end | 401 | Step 1 DoD halt-on-empty (closest end-of-phase gate) | Doesn't distinguish impl/QA marks; doesn't verify QA linkages for x claims |

Composition library state: PlanNote/SessionNote schemas/renderers/mutations present. Missing 5 schemas (TaskNote, RequirementNote, DesignNote, SpecRootNote, TestReportNote), 5 renderers, claim-validators, deterministic transition functions.

NOTE-TEMPLATES: TASK/REQ/DESIGN templates have checkbox sections but no checkbox-as-contract language. QA template is STUB.

15-item execution order locked for X.C + X.D. Next: begin item 1 (extend PlanNote schema with BuildWorkflowItemSchema).

## Architectural reinforcement — composition library is THE enforcement layer (user verbatim 2026-05-20)

User direct quote captured verbatim to prevent drift:

> Again I just want to remind you the whole point of doing all that work in the what is now the acme lab skills directory where you created all of these you created all of these schemas for the ADR the analysis the plan the session the spec adapters for ADR analysis plan core adapter atomic right like a plan mutation like all of these things the whole point of that right was so that we could like just remember like this whole flow starts with me using the plan skill and pointing that to a play in reference so the plan skills will kicks off the flow so by updating like the plans skill to very rigorously and it's resources in the main ski itself like everywhere in the different modes we're just constantly reinforcing these things like the decision skill is also used by that like because this all gets kicked off by the plan skill we kind of do have a lot of control over kicking off the flow and then those other skills are used throughout the the plan workflow right so we have to like use those like those deterministic rendering mechanisms that we're going to provide to those like to the plan skill right so that it can instead of having the agent do it it's rendering it's rendering the plan itself with that deterministic render and so like there should be errors in there and validation so like when that script is used and something's you know by the agents leaves pass to it incorrectly it'll error or when the agent correctly passes like a state to it it will correctly propagate throughout the whole thing right and we have to worry about it so I think this should be pretty doable

Plus follow-up:

> like for example because again the plan skill kicks off the flow - and it is going to be deterministically rendered - and beacuse when a part of tyhe plan gets transitioned to inprogress it must aslso be provided with the session note handling that in progess transition - if a ession note isn't provided it shoudl throw and error which should call it out - again another enforcing/prventing thje agent from going to many turns w/out completely forgetting the protocols and stadrnrsds

### What this means architecturally

The composition library at `shared/composition/` is the LOAD-BEARING enforcement layer, not just documentation. /plan kicks off the workflow and uses deterministic Bun+TS scripts from the composition library for:

- Reading the PLAN reference the user provides
- Authoring/updating the PLAN note via the deterministic renderer (NOT having an agent author it directly)
- Validating every state transition against the PlanNote Zod schema
- Requiring context (session note reference, reason, commit_sha) on every state-transition function call — throws on missing
- Propagating state correctly throughout the PLAN structure when inputs are valid

The other lifecycle skills (/decisions, /spec, /build, /review, /end) all run UNDER /plan's coordination. Each uses the same composition library deterministic functions. This means:

- The protocol gets reinforced at every workflow step because every skill calls the same enforcement layer
- Agents don't have to remember protocols across many turns — the script either accepts the input or throws
- The PLAN renders itself deterministically with rendered dispatch instructions for impl + qa items
- Errors thrown by the script are unmissable — orchestrator MUST address them before continuing

### Why this is doable

The composition library schemas + renderers + mutations for PlanNote and SessionNote already exist (SPEC-001 + Wave 2 SPEC-007 work). Extending them with BuildWorkflowItem (Phase X.D.1 — DONE), 5 new note-type schemas (X.D.5-7), the renderer extension (X.D.2), and the transition functions (X.D.3) completes the enforcement layer. After that, the skill updates (X.C) just rewire the skills to call these functions instead of having agents do the work.

## 15-item ordered execution sequence (X.C + X.D combined)

The execution order locked 2026-05-20 after Phase X.B audit. Sequencing rationale: skills describe protocol → composition library implements protocol → templates reinforce. Status updated as items complete.

| # | Item | Status | Reason for ordering |
|---|---|---|---|
| 1 | Extend PlanNote schema with BuildWorkflowItemSchema (impl+qa per TASK) | DONE (X.D.1, commit deeae3f) | Foundation — everything else references it |
| 2 | Extend PlanNote renderer to generate rendered impl+qa instruction blocks | PENDING | Output of (1); becomes orchestrator dispatch brief source |
| 3 | Add transitionImplItem + transitionQaItem + checkbox-flip mutations — require context, throw on missing | PENDING | Mechanical enforcement; called by all skills |
| 4 | Update /plan SKILL.md | PENDING | Highest priority — entry point to the workflow; mandates per-TASK impl+qa structure |
| 5 | Update /spec SKILL.md | PENDING | Adds PLAN handoff contract — emits per-TASK items on Stage 2 close |
| 6 | Update /build SKILL.md | PENDING | Dispatch briefs = verbatim rendered PLAN content; schema-validates agent claims |
| 7 | Add TaskNote schema + DoD claim validator | PENDING | Validates implementer TASK done claim |
| 8 | Add RequirementNote + DesignNote schemas + AC/compliance claim validators | PENDING | Validates QA PASS claim |
| 9 | Update /end SKILL.md | PENDING | Verifies impl+qa pairing + QA linkages at session close |
| 10 | Add SpecRootNote + TestReportNote schemas + renderers | PENDING | Completes the schema coverage |
| 11 | Update /decisions SKILL.md with lockDecision reference | PENDING | Formalizes decision micro-cycle as deterministic |
| 12 | Update /review SKILL.md with checkbox-vs-diff cross-check axis | PENDING | Self-review uses schema-based validation |
| 13 | Update /research SKILL.md with convergencePass reference | PENDING | Lighter touch |
| 14 | Update NOTE-TEMPLATES.md (TASK + REQ + DESIGN + QA + PLAN templates) | PENDING | Reinforces checkbox-as-contract; flesh out QA stub |
| 15 | Update KNOWLEDGE-GRAPH-STRUCTURES.md (Sections 4.6/4.7/4.8/4.9) | PENDING | Embeds rigor in canonical spec |

## Per-skill detailed audit findings (X.B subagent return, verbatim)

### /spec (242 lines)

Existing rigor: Strict authoring order (REQ→DESIGN→TASK→SPEC root); Pattern 2 three-phase write; Phase 3 pre-flight + ADR coverage gate + Gate A semantic gap + Gate B 4 binary drift checks; G2 resume per-step skip conditions; halt-block inventory with Contract 3 schema; bi-directional relation closure (Step 6).

Gaps:

- per-TASK impl+qa mandate: ABSENT. /spec authors TASK notes with DoD checklists (line 138) but says nothing about /plan emitting paired impl-TASK-N + qa-TASK-N items per TASK. Handoff to /plan is implicit — no contract for what PLAN items get created.
- checkbox-as-contract: PARTIALLY PRESENT. TASK DoD is named (line 138) and "premature [x]" is anti-pattern (lines 134, 210), but REQ Acceptance Criteria + DESIGN compliance checkboxes aren't framed as the QA contract; they're authoring concerns, not validation contracts for downstream agents.
- PLAN-renderer-as-dispatch-source: ABSENT. No mention that PLAN renders verbatim TASK DoD / REQ AC / DESIGN compliance for dispatch briefs.
- state-transition-requires-context: ABSENT for SPEC subtree state. Two-step edit pattern (lines 85-93) mandates Brain edit + SESSION Event + commit, but doesn't require sessionNoteRef / reason / commit_sha as input to a deterministic state-transition function.
- schema-validates-claims: PARTIALLY PRESENT. Gate B (c) checks TASK→REQ traceability (line 166); Phase 3 pre-flight validates structure — but no schema check that an "all DoD [x]" claim mechanically matches PLAN per-TASK impl status.

Highest-leverage change: Add a "PLAN handoff contract" section that mandates Stage 2 Step 5 (or set-part-done) emits two PLAN items per authored TASK (impl-TASK-N rendering verbatim DoD + Files Affected + ADR Compliance; qa-TASK-N rendering verbatim linked REQ Acceptance Criteria + DESIGN compliance) — making TASK DoD / REQ AC the literal contracts /build dispatches.

### /decisions (257 lines)

Existing rigor: Per-D-N 7-sub-step micro-cycle (2a-2g) with one-decision-at-a-time, decision-critic stress-test, verbatim option capture, decision-binding echo, diff-approval, two-step PLAN→SESSION edit, commit (lines 96-107); 12-item hygiene audit + 4 binary drift checks at Step 3-3.5; tier-aware pre-author-composite gate (Step 4); architect dispatch with detail-parity mandate (Step 5); detail-parity audit (Step 6) with re-dispatch loop; MANDATORY adr-review blocking gate (Step 7); per-D-N status enum (PENDING|LOCKED) in d_n_substatus.

Gaps:

- PLAN-renderer-as-dispatch-source: PARTIALLY PRESENT. Step 5 architect dispatch brief MUST include PLAN-part d_n_substatus (all LOCKED D-Ns with verbatim decision text) + corresponding SESSION Event NN entries (lines 152-153) — this IS render-as-dispatch for ADR authoring. Pattern exists but isn't named/generalized.
- state-transition-requires-context: PARTIALLY PRESENT. 2c-2g requires verbatim text + rationale + diff approval + SESSION ref + commit, but no formal function-call signature requiring (sessionNoteRef, reason, commit_sha) as throwable inputs.
- schema-validates-claims: PARTIALLY PRESENT. Step 6 detail-parity audit samples ≥5 D-Ns and verifies ADR sections vs SESSION events; Step 3.5 (a) verifies source traceability — but no schema that says "claim of LOCKED requires verbatim option text field non-empty + decision-binding echo logged."

Highest-leverage change: Formalize Step 2f as a deterministic lockDecision(planId, d_n, verbatim, rationale, sessionEventRef, commit_sha) function that throws on missing fields — turn the implicit 7-sub-step protocol into a schema-validated state transition that mechanically cannot complete without provenance.

### /research (208 lines)

Existing rigor: Step 0 first-principles gate; Memory-First gate; tier classification (Step 2) sets PLAN frontmatter complexity_tier with HALT-on-missing downstream; buy-vs-build BLOCKING for new capabilities (Step 3); conditional CVA at Tier ≥3 (Step 4); per-requirement analyst dispatch surfaces options-only — no lock (Step 5); convergence loop (Steps 6-8) with max-3 iterations; explicit "options surfaced, /decisions locks" boundary (line 9, anti-pattern line 170); no-Open-Questions invariant (line 172); no-deferral-to-implementation (line 174).

Highest-leverage change: Add a convergencePass(prdRef, analyses[], userConfirmation) schema check at Step 8 that mechanically verifies (a) every PRD requirement has ≥1 ANALYSIS note, (b) no ANALYSIS note has an "Open Questions" section, (c) no ANALYSIS has unsupported quant claims — making the convergence gate auditable rather than relying on critic judgment.

### /review (320 lines)

Existing rigor: Two modes (self-review when plan= arg / review-others when pr= arg) with calibrated adversarial framing per Tier (lines 60-69); 8 axes (5 skill + 3 agent) with adaptive PR-type subset selection (Step 2 table line 128); per-axis verdict caching by diff hash for G2 resume (lines 76-80); 10-value verdict enum with strict merge rules (Step 6 lines 196-203); UNKNOWN-never-overrides-WARN/FAIL invariant (line 207); structured report block for /end consumption (lines 242-249); reviewer-asymmetry mandate embedded in every agent brief (lines 147, 155, 163).

Highest-leverage change: In self-review mode (when plan= arg present), add a "checkbox-vs-diff cross-check" axis that reads every linked TASK's DoD + REQ AC + DESIGN compliance and verifies each [x] claim has corresponding diff evidence — converts /review from judgment-based to schema-based for the claim-validation dimension.

### /end (401 lines)

Existing rigor: Step 1 DoD verification reads every owning part's H3 part-id body and HALTs on any [ ] (lines 84-94); /review BLOCKING gate (Step 2) with strict verdict→action mapping (line 104 table); 5 pre-flight checks; 3-option AskUserQuestion FAIL branch with Recommended default + fix-target routing (lines 122-148); G2 resume per-step skip markers (lines 73-82); two-step edit + atomic commit ordering (Step 4); structured end-of-session report (Step 5); halt-block inventory.

Highest-leverage change: Extend Step 1 to verify the impl-TASK-N + qa-TASK-N pairing — for every owning part, every TASK referenced must have BOTH (a) impl item status=DONE AND all DoD checkboxes [x], AND (b) qa item status=DONE AND linked QA exists with all REQ AC + DESIGN compliance checkboxes [x] + PASS verdict — making the session-close gate mechanically tied to the paired-item rigid protocol.

## 3 next-move options (surfaced 2026-05-20)

For user to decide pace + scope of next action:

1. **Continue this session** — keep going on X.D.2 (renderer extension) → X.D.3 (transitions) → X.D.4 (fixture) etc. Real risk: orchestrator hits context limits mid-work.

2. **Checkpoint here** — clean stopping point. Resume in fresh session using this analysis + the state-capture memory + the TIER-1 BLOCKING memories. Cleanest for protocol-correctness; relies on the post-compaction rehydration protocol working as designed.

3. **Pick a specific next subset** — e.g., "do X.D.2-4 to unblock the 16 failing tests + close out the composition library round-trip, then pause"; or "do all X.C skill updates first then composition library"; or any other ordered slice.

Default recommendation: option 2 (checkpoint) given orchestrator context depth + the multi-session realistic scope. The post-compaction rehydration protocol (run the full rehydration checklist before any work after compaction/resume) makes resumption reliable.
