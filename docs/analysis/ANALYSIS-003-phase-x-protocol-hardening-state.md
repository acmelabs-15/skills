---
title: 'ANALYSIS-003: Phase X Protocol Hardening State'
type: analysis
permalink: analysis/analysis-003-phase-x-protocol-hardening-state
status: IN_PROGRESS
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

Today (2026-05-20) the orchestrator catastrophically failed during Wave 2 builds (build.SPEC-002 + 003 + 004 + 007). The orchestrator dispatched 4 single-agent builds without per-TASK QA gates. 30 TASK notes were flipped to DONE without any TEST-REPORT notes existing. 28 REQs + 12 DESIGNs flipped DRAFT to ACCEPTED prematurely. The session note SESSION-2026-05-20_05 was created retroactively from memory rather than lived as a ledger. 95 Brain note edits done today are uncommitted to git. PLAN-001 was partially damaged by a killed agent and is missing 5 branches in its frontmatter. 37 distinct drift surfaces have been catalogued — full inventory in SESSION-2026-05-20_05 Event 09.

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
- QA writes findings to a TEST-REPORT note with per-criterion PASS/FAIL/PARTIAL evidence
- QA returns verdict only: PASS or FAILED + reference to TEST-REPORT
- Implementer MUST go back and address problems — no exceptions
- Fix cycle scope = ONLY the scoped problem area
- 3-iteration cap then HALT to user

Checkbox lists ARE the validation contract:

- TASK Definition of Done — implementer's build contract
- REQ Acceptance Criteria (EARS Given/When/Then) — QA validates against these
- DESIGN compliance/architecture checkboxes — QA validates against these

The PLAN note carries the dispatch instructions. The PLAN Zod schema mandates per-TASK impl + qa items; the plan-note renderer deterministically generates them with checkboxes rendered inline from the linked TASK/REQ/DESIGN notes. The orchestrator's dispatch brief equals verbatim rendered content. Agents receive crystal-clear instructions without needing prompt-file updates.

QA to orchestrator to implementer handoff translation (fail path):

- QA signals FAILED + reference to the TEST-REPORT note — nothing more
- Orchestrator reads the TEST-REPORT, identifies each unchecked item across TASK + linked REQs + linked DESIGNs
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
| Wave 2 SPECs | 7 | 4 SPEC roots false DONE; 30 TASKs false DONE; premature ACCEPTED; fake validated_by; 34 missing TEST-REPORTs |
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

## Observations

- [decision] Phase X created to embed rigid implementation+QA protocol at every enforcement layer simultaneously after today's orchestrator + system-design failures #protocol #hardening
- [fact] 37 distinct drift surfaces catalogued from today's work #drift #audit
- [decision] Brain knowledge-graph mirror of orchestrator-private state-capture memory is intentional — different audiences and lifecycles #knowledge-graph #durability
- [constraint] Phase X.D gated on user decision D1; D2 throw-out vs salvage gates Phase X.E.2 #decisions-pending
- [risk] If session compacts before decisions resolved, fresh agent reads this analysis to reactivate the decision surface #continuity #resumability

## Relations

- part_of [[PLAN-001: Skills Ecosystem]]
- relates_to [[SESSION-2026-05-20_05: Wave 2 Integration and Brain State Sync]]
- relates_to [[ANALYSIS-001: SPEC Clustering]]
- relates_to [[ADR-003: Plan/Session Render Architecture]]
- relates_to [[SPEC-007: Plan/Session Render Implementation]]


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
| /end | 401 | Step 1 DoD halt-on-empty (closest end-of-phase gate) | Doesn't distinguish impl/QA marks; doesn't verify TEST-REPORT linkages for x claims |

Composition library state: PlanNote/SessionNote schemas/renderers/mutations present. Missing 5 schemas (TaskNote, RequirementNote, DesignNote, SpecRootNote, TestReportNote), 5 renderers, claim-validators, deterministic transition functions.

NOTE-TEMPLATES: TASK/REQ/DESIGN templates have checkbox sections but no checkbox-as-contract language. TEST-REPORT template is STUB.

15-item execution order locked for X.C + X.D. Next: begin item 1 (extend PlanNote schema with BuildWorkflowItemSchema).
