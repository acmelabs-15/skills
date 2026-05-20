---
title: 'PLAN-001: Skills Ecosystem'
type: plan
permalink: planning/plan-001-skills-ecosystem
tags:
- plan
- workflow
- skills-ecosystem
- skills
- active
---

# PLAN-001: Skills Ecosystem

## Scope

Build a zero-content-drift restructuring capability for Brain knowledge-graph notes via a deterministic composition library (Bun + TS) plus four Claude Code skills (/ingest, /decompose, /recompose, /defrag). Workflow Type: Standard Development with Strategic Decision sub-flow for the architectural ADRs. Scope spans 5 per-type adapters (~1,200 LOC total) with SHA-256 char-identity hash validation as a BLOCKING invariant. Agent Sequence: orchestrator → architect (decisions.1 + decisions.2) → analyst (spec-decomposition clustering) → bun-ts-engineer (build) → qa (per-spec coverage gate) → review → end. Complexity: TIER_4. Risk: HIGH — the bootstrapping incident (3,680-line ADR split with 35% content drift on 10/12 D-Ns) is the explicit reason this work exists; the entire architecture exists to make a recurrence mathematically impossible via round-trip property testing.

**Source**: see `KICKOFF-BRIEF.md` in the project root for full background, locked design decisions (8 items), build order, LLM-script division of labor, and the 5 open design questions awaiting adjudication in decisions.1.

## Objectives

- [ ] Composition library at `_shared/composition/` produces SHA-256 char-identity verified decompose/recompose for the ADR adapter (PROOF)
- [ ] Round-trip property test (decompose ∘ recompose = identity on SHA-256) passes for ADR adapter
- [ ] /decompose and /recompose skills operational against ADR notes
- [ ] All 5 adapters (ADR, ANALYSIS, SESSION, PLAN, SPEC subtree) ship with passing round-trip tests
- [ ] /defrag skill operates as periodic curator delegating to /decompose + /recompose
- [ ] /ingest skill ships as Brain-aware variant of memory-ingest with verbatim source preservation
- [ ] Skills installed via symlinks at `~/.claude/skills/<name>` → `~/Dev/skills/<name>`
- [ ] Zero net-new content drift detected in any test fixture or production note touched by the skills

## Progress Dashboard

| Phase | DRAFT | IN_PROGRESS | BLOCKED | DONE | Total |
|:--|:--|:--|:--|:--|:--|
| research | 0 | 0 | 0 | 1 | 1 |
| decisions | 0 | 1 | 0 | 1 | 2 |
| spec-decomposition | 1 | 0 | 0 | 0 | 1 |
| spec.SPEC-NNN | 0 | 0 | 0 | 0 | 0 (created post spec-decomposition) |
| build.SPEC-NNN | 0 | 0 | 0 | 0 | 0 (created post per-spec spec phase) |
| review | 1 | 0 | 0 | 0 | 1 |
| end | 1 | 0 | 0 | 0 | 1 |
| **Total visible** | **3** | **1** | **0** | **2** | **6** |

## Workflow Plan

Research → decisions (×2 ADRs) → spec-decomposition → per-SPEC spec + build cycles → review → end. Research is short-circuited: the user provided `KICKOFF-BRIEF.md` (a comprehensive PRD-equivalent with locked architectural decisions, build order, and 5 open questions) which substitutes for the analyst-dispatch /research output per explicit user direction.

Heavy /plan create dispatches (analyst first-principles + pre-mortem + critic) were SKIPPED for the bootstrap turn — KICKOFF-BRIEF.md contains baked-in first-principles answers, an explicit post-mortem of the prior drift incident, and an explicit critique target via the 5 open questions adjudicated in Step 5 AskUserQuestion. Per the iterative-phase-reentry rule, validation phases can re-enter if gaps surface during decisions.1 adjudication.

Per-part workflow detail lives in each per-part H3 below.

## Phase Progression

| Phase | Status | Output Artifact |
|:--|:--|:--|
| research | DONE | `KICKOFF-BRIEF.md` (project root file; not a Brain note) |
| decisions.1 | DONE | [[ADR-001: Composition Library Architecture]] |
| decisions.2 | IN_PROGRESS | [[ADR-002: Adapter Contract and Plan Schema]] (PROPOSED at 865 lines post round-2 architect revision; round-2 brain:---adr-review re-verification pending) |
| spec-decomposition | PENDING | N×[[SPEC-XXX ...]] root notes + decomposition rationale |
| spec.SPEC-NNN | PENDING | per-SPEC REQ/DESIGN/TASK subtree (created post spec-decomposition) |
| build.SPEC-NNN | PENDING | per-SPEC implementation + tests + commits |
| review | PENDING | adversarial multi-axis review across feature surface |
| end | PENDING | PR + final session-end checklist |

## Cross-Part Dependency Graph

```mermaid
%%{init: {'theme':'base','flowchart':{'curve':'stepAfter','nodeSpacing':18,'rankSpacing':55,'padding':16,'diagramPadding':20,'htmlLabels':true},'themeVariables':{'fontFamily':'-apple-system, BlinkMacSystemFont, system-ui, sans-serif','fontSize':'13px','clusterBkg':'#f9fafb','clusterBorder':'#e5e7eb'},'themeCSS':'.edgePath path, .flowchart-link { stroke-linejoin: round !important; stroke-linecap: round !important; } .cluster-label .nodeLabel { font-family: ui-monospace, SFMono-Regular, Menlo, monospace !important; font-size: 11px !important; font-weight: 600 !important; letter-spacing: 0.1em !important; text-transform: uppercase !important; color: #6b7280 !important; }'}}%%
graph TD

  classDef done fill:#ffffff,stroke:#e5e7eb,stroke-width:1px,color:#111827,rx:14,ry:14
  classDef pending fill:#fafafa,stroke:#d1d5db,stroke-width:1px,color:#6b7280,stroke-dasharray:3 3,rx:14,ry:14

  subgraph R ["Research"]
    direction TB
    research("✅ <b>research</b><br/><span style='color:#6b7280;font-size:11px'>KICKOFF-BRIEF.md</span>")
  end

  subgraph D ["Decisions"]
    direction TB
    d1("✅ <b>decisions.1</b><br/><span style='color:#6b7280;font-size:11px'>ADR-001 ACCEPTED</span>")
    d2("🔄 <b>decisions.2</b><br/><span style='color:#6b7280;font-size:11px'>ADR-002 PROPOSED (r2)</span>")
  end

  subgraph S ["Spec-Decomposition"]
    direction TB
    sd("<b>spec-decomposition</b><br/><span style='color:#6b7280;font-size:11px'>cluster ADRs into SPECs</span>")
  end

  subgraph SB ["Spec + Build (per SPEC)"]
    direction TB
    spec_n("<b>spec.SPEC-NNN</b><br/><span style='color:#6b7280;font-size:11px'>post decomposition</span>")
    build_n("<b>build.SPEC-NNN</b><br/><span style='color:#6b7280;font-size:11px'>post spec</span>")
    spec_n --> build_n
  end

  subgraph RE ["Review + End"]
    direction TB
    review("<b>review</b><br/><span style='color:#6b7280;font-size:11px'>multi-axis</span>")
    fin("<b>end</b><br/><span style='color:#6b7280;font-size:11px'>PR + session-end</span>")
    review --> fin
  end

  research --> d1
  d1 --> d2
  d2 --> sd
  sd --> spec_n
  build_n --> review

  class research,d1,d2 done
  class sd,spec_n,build_n,review,fin pending

  linkStyle 0,1,2,3,4 stroke:#9ca3af,stroke-width:1.5px
  linkStyle 5 stroke:#3b82f6,stroke-width:2px
```

## Decision Log

- **2026-05-19** — PLAN-001 created via /plan create with `--name skills-ecosystem`. Branch `feat/plan-001-skills-ecosystem` was pre-created during bootstrap Step 1; /plan honored the existing non-main branch per skill branch policy.
- **2026-05-19** — research part marked DONE upfront with `KICKOFF-BRIEF.md` (project root file) as outcome reference (file-path, not wikilink — the brief is a project-config file under the binary-rule, not a Brain note). Justification: user explicitly directed "skip /research dispatch — KICKOFF-BRIEF.md IS the research output". Deviation from outcome-wikilink convention documented here.
- **2026-05-19** — Heavy /plan create dispatches (analyst first-principles + pre-mortem + critic) were SKIPPED for the bootstrap turn. KICKOFF-BRIEF.md contains baked-in first-principles answers, an explicit post-mortem of the prior drift incident, and an explicit critique target via the 5 open questions adjudicated in Step 5 AskUserQuestion. Per the iterative-phase-reentry rule, validation phases can re-enter if gaps surface during decisions.1 adjudication or later.
- **2026-05-19** — complexity_tier set to TIER_4 (multi-skill ecosystem ~1,200 LOC across 5 adapters + 4 skills + composition library with cryptographic invariant). Re-evaluate at spec-decomposition if SPEC count exceeds 6.
- **2026-05-19** — Q1-Q5 of decisions.1 LOCKED via AskUserQuestion (all Recommended options selected). D-1 Zod for plan validation; D-2 unified + remark + remark-frontmatter for markdown AST; D-3 YAML at docs/_restructure/*.yaml for plan files; D-4 unified discriminated union on source_type for plan schema; D-5 YES — /brain:---adr-review BLOCKING gate before ACCEPTED. DoD checkboxes Q1-Q5 checked; D-N substatus table updated. ADR-001 authoring unblocked; awaiting user confirmation per bootstrap pause directive.
- **2026-05-19** — decisions.1 DONE. ADR-001 ACCEPTED at decisions/ADR-001-composition-library-architecture.md after brain:---adr-review Phase 4 convergence PASS round 1 (5 ACCEPT + 1 D&C + 0 BLOCK). P1 themes 1-4 resolved in-ADR refinement (hash protocol formal spec + rollback mechanism + security hardening + LOC scope); P1 themes 5-6 deferred with rationale + quantitative revisit triggers in CRIT-001-ADR-001 debate log. decisions.2 transitioned PENDING → READY.
- **2026-05-19** — decisions.2 IN_PROGRESS. Path-choice: architect direct authoring (no per-D-N AskUserQuestion adjudication) selected via AskUserQuestion. ADR-002 PROPOSED authored at decisions/ADR-002-adapter-contract-and-plan-schema.md (548 lines, 5 D-N design sections — Plan YAML schema, Adapter interface, Capability matrix, Hash extraction strategies, Validator structure).
- **2026-05-19** — ADR-002 round-1 brain:---adr-review FAIL (3 ACCEPT + 3 CONCERNS + 0 BLOCK; below ≥5 ACCEPT threshold). 12 raw P1 findings deduplicated to 10 themes A-J (interface gaps + schema gaps + security refinements + pattern guidance). CRIT-002-ADR-002 authored. Round-2 resolution path-choice: re-dispatch architect with consolidated revision brief (selected via AskUserQuestion).
- **2026-05-19** — ADR-002 round-2 architect revision applied. 10 P1 themes A-J resolved in-ADR: P1-A MutationSpec frontmatter_map; P1-B cross_source_updates Zod shape; P1-C SPEC subtree manifest Zod shape; P1-D nested discriminatedUnion plan_type × source_type; P1-E JSDoc adapter call sequence; P1-F regenerated_sections declarative + 50% integrity floor; P1-G containedPathSchema realpath + path.sep; P1-H injectivity key-value domain disjointness; P1-I hash extracted to shared utility (5-method interface); P1-J BaseMarkdownAdapter pattern documented. ADR-002 line count 548 → 865 (+317 lines, +58%). Status PROPOSED pending round-2 brain:---adr-review re-verification.

## Progress Log

- **2026-05-19** — Bootstrap session started. Branch + docs/ subtree created (Step 1). Brain MCP project created and activated (Step 2). `KICKOFF-BRIEF.md` written verbatim (Step 3). PLAN-001 authored (Step 4). Pending: 5 open design question adjudication via AskUserQuestion (Step 5).
- **2026-05-19** — Step 5 complete: 5 open design questions adjudicated via AskUserQuestion (Q1-Q4 batched + Q5 follow-up). All Recommended options selected. PLAN updated with locked decisions in DoD checkboxes + D-N substatus table + Decision Log. Paused per bootstrap directive; ready to proceed to ADR-001 authoring via brain:🧠-architect dispatch + brain:---adr-review BLOCKING gate on user confirmation.
- **2026-05-19** — Step 6 (decisions.1 ADR-001 ACCEPTED) complete: /decisions Steps 5-9 executed (architect dispatch + detail-parity audit + 6-agent adr-review debate + Phase 3 P1 resolutions + CRIT authoring + ACCEPTED flip + state propagation). ADR-001 at decisions/ADR-001-composition-library-architecture.md (501 lines after Phase 3 refinements). decisions.2 READY; next-ready part on resume.
- **2026-05-19** — decisions.2 IN_PROGRESS (continuation invocation of /plan PLAN-001). Owning session bound to SESSION-2026-05-19_01. Path-choice + ADR-002 PROPOSED + round-1 adr-review FAIL + CRIT-002 auth + round-2 architect revision all completed this turn; per the user's critical state-propagation rule applied this turn — PLAN-001 sections fully propagated (Progress Dashboard decisions row IP 0→1; Phase Progression decisions.2 IN_PROGRESS; decisions.2 H3 subsections Workflow Plan / Tasks / Intra-part Deps Graph / D-N substatus list / Editor Mirror IDs / Pending User Decisions all updated; DoD checkboxes 4 of 6 flipped [x]; Cross-Part Deps Graph d1+d2 class updates).

## Blockers

None. Awaiting user adjudication on 5 open design questions before decisions.1 can proceed.

## Analysis

### research — Bootstrap research (DONE)

**Substatus**: DONE
**Owning session**: [[SESSION-2026-05-19_01: Skills Bootstrap and PLAN-001]]
**Completing session**: [[SESSION-2026-05-19_01: Skills Bootstrap and PLAN-001]]
**Outcome**: `KICKOFF-BRIEF.md` (project root file; not a Brain note — see Decision Log 2026-05-19)
**Source artifacts**: prior session work — ADR-001 split incident in the `brain` project; `~/.claude/skills/plan/references/scope-evaluation-and-split.md`

**DoD**:

- [x] Background captured: drift root cause + architectural fix direction
- [x] Locked design decisions enumerated (8 items in KICKOFF-BRIEF.md)
- [x] Build order specified (ADR adapter FIRST; PROOF before extension)
- [x] Open questions enumerated (5 items pending decisions.1 adjudication)

#### Workflow Plan (for research)

Research-by-substitution: user provided KICKOFF-BRIEF.md as pre-baked research output. No analyst dispatch was run. Brief contains: mission, why-this-exists (post-mortem of ADR-001 split incident), locked architecture, LLM-script division of labor, per-type adapter build order, /defrag and /ingest scope, round-trip property test specification, key file references, 5 open design questions, non-negotiable constraints, out-of-scope items.

#### Tasks (for research)

None — research part is DONE.

#### Intra-part Deps Graph

N/A — single-step part.

#### Editor Mirror IDs

N/A — no tasks to mirror.

#### Pending User Decisions

None.

## Decisions

### decisions.1 — Composition library architecture ADR (DONE)

**Substatus**: DONE
**Owning session**: [[SESSION-2026-05-19_01: Skills Bootstrap and PLAN-001]]
**Completing session**: [[SESSION-2026-05-19_01: Skills Bootstrap and PLAN-001]]
**Outcome**: [[ADR-001: Composition Library Architecture]]
**Source artifacts**: `KICKOFF-BRIEF.md` (sections: Architecture, LLM-script division of labor, Constraints, Open design questions Q1-Q5)

**DoD**:

- [x] Q1 LOCKED — **Zod** for plan validation
- [x] Q2 LOCKED — **unified + remark + remark-frontmatter** for markdown AST
- [x] Q3 LOCKED — **YAML at docs/_restructure/*.yaml** for plan files
- [x] Q4 LOCKED — **Unified discriminated union on source_type** for plan schema
- [x] Q5 LOCKED — **YES — /brain:---adr-review BLOCKING gate** on architecture ADRs
- [ ] All 8 locked design decisions from KICKOFF-BRIEF.md restated verbatim in ADR-001
- [ ] ADR-001 frontmatter `status: ACCEPTED`; `date` + `updated` populated
- [ ] /brain:---adr-review PASS verdict before downstream phases (if Q5 = YES)

#### Workflow Plan (for decisions.1)

Per-D-N micro-cycle: decision-critic stress-test → AskUserQuestion (one decision at a time with Recommended default) → verbatim echo → diff approval → 2-step edit (PLAN + SESSION) → commit, repeated for D-1 through D-5. Composite ADR-001 authored once all D-Ns are locked, via `brain:🧠-architect` dispatch with detail-parity mandate. `brain:---adr-review` gates ACCEPTED status if Q5 resolves to YES.

#### Tasks (for decisions.1)

| T-ID | Group | Subject | Agent | Files | Effort | Created |
|:--|:--|:--|:--|:--|:--|:--|
| T-01 | D-1 | Adjudicate Q1: JSON Schema vs Zod | orchestrator | — | XS | (this PLAN) |
| T-02 | D-2 | Adjudicate Q2: AST vs regex parser | orchestrator | — | XS | (this PLAN) |
| T-03 | D-3 | Adjudicate Q3: plan file format | orchestrator | — | XS | (this PLAN) |
| T-04 | D-4 | Adjudicate Q4: unified vs per-adapter plan schema | orchestrator | — | XS | (this PLAN) |
| T-05 | D-5 | Adjudicate Q5: adr-review gate policy | orchestrator | — | XS | (this PLAN) |
| T-06 | ADR auth | Author ADR-001 (composite) | brain:🧠-architect | `docs/decisions/ADR-001-skills-ecosystem.md` | M | (this PLAN) |
| T-07 | ADR gate | Run brain:---adr-review on ADR-001 | brain:---adr-review | — | S | (this PLAN) |

#### Intra-part Deps Graph

```mermaid
%%{init: {'theme':'base','flowchart':{'curve':'stepAfter','nodeSpacing':18,'rankSpacing':55,'padding':16,'diagramPadding':20,'htmlLabels':true},'themeVariables':{'fontFamily':'-apple-system, BlinkMacSystemFont, system-ui, sans-serif','fontSize':'13px'}}}%%
graph TD
  classDef pending fill:#fafafa,stroke:#d1d5db,stroke-width:1px,color:#6b7280,stroke-dasharray:3 3,rx:14,ry:14
  T01("<b>T-01</b><br/><span style='color:#6b7280;font-size:11px'>Q1 schema lib</span>")
  T02("<b>T-02</b><br/><span style='color:#6b7280;font-size:11px'>Q2 parser</span>")
  T03("<b>T-03</b><br/><span style='color:#6b7280;font-size:11px'>Q3 plan format</span>")
  T04("<b>T-04</b><br/><span style='color:#6b7280;font-size:11px'>Q4 schema shape</span>")
  T05("<b>T-05</b><br/><span style='color:#6b7280;font-size:11px'>Q5 adr-review</span>")
  T06("<b>T-06</b><br/><span style='color:#6b7280;font-size:11px'>author ADR-001</span>")
  T07("<b>T-07</b><br/><span style='color:#6b7280;font-size:11px'>adr-review gate</span>")
  T01 --> T06
  T02 --> T06
  T03 --> T06
  T04 --> T06
  T05 --> T06
  T06 --> T07
  class T01,T02,T03,T04,T05,T06,T07 pending
```

#### D-N substatus list (for decisions.1)

| ID | Status | Topic |
|:--|:--|:--|
| D-1 | LOCKED | Q1 → **Zod** (TS-native, type inference, single source of truth) |
| D-2 | LOCKED | Q2 → **unified + remark + remark-frontmatter** (AST required for SPEC subtree accuracy) |
| D-3 | LOCKED | Q3 → **YAML at docs/_restructure/*.yaml** (human-readable, LLM-friendly authoring) |
| D-4 | LOCKED | Q4 → **Unified discriminated union on source_type** (clean type narrowing per adapter) |
| D-5 | LOCKED | Q5 → **YES — BLOCKING gate** (adr-review PASS required for ACCEPTED status) |

#### Editor Mirror IDs (for decisions.1)

| T-ID | CC-ID | Cursor-ID | Last synced |
|:--|:--|:--|:--|
| T-01 | — | — | not yet |
| T-02 | — | — | not yet |
| T-03 | — | — | not yet |
| T-04 | — | — | not yet |
| T-05 | — | — | not yet |
| T-06 | — | — | not yet |
| T-07 | — | — | not yet |

#### Pending User Decisions (for decisions.1)

All 5 open questions from `KICKOFF-BRIEF.md` ("Open design questions for early adjudication") surfaced via AskUserQuestion in Step 5 of the user-provided bootstrap. Adjudication unlocks ADR-001 authoring.

### decisions.2 — Adapter contract + plan schema ADR (IN_PROGRESS)

**Substatus**: IN_PROGRESS
**Owning session**: [[SESSION-2026-05-19_01: Skills Bootstrap and PLAN-001]]
**Completing session**: —
**Outcome**: — (will be [[ADR-002: Adapter Contract and Plan Schema]])
**Source artifacts**: `KICKOFF-BRIEF.md` (Per-type adapter specifics), [[ADR-001: Composition Library Architecture]] (Q1-Q4 outcomes)

**DoD**:

- [x] Plan schema shape defined (Distribution + Composition plan YAML structures) — ADR-002 D-1 + D-5 (nested discriminatedUnion plan_type × source_type)
- [x] Adapter interface contract specified (parse / extract-by-range / renumber / wikilink-rewrite / serialize) — ADR-002 D-2 (CompositionAdapter 5-method interface; hash extracted to shared utility; MutationSpec extended with frontmatter_map + regenerated_sections)
- [x] Per-type adapter capability matrix (ADR / ANALYSIS / SESSION / PLAN / SPEC subtree) — ADR-002 D-3 (5 adapters with LOC + complexity; BaseMarkdownAdapter pattern for 3 simple types; PLAN + SPEC distinct)
- [x] Hash-validation invariant codified (pre-mutation source hash vs post-reverse-mutation destination hash) — ADR-002 D-4 refines ADR-001 F-8 per-type (single-pass replacement + key-value disjointness + PLAN regenerative-section carve-out)
- [ ] ADR-002 frontmatter `status: ACCEPTED`; `date` + `updated` populated
- [ ] /brain:---adr-review PASS verdict before downstream phases (if Q5 = YES from decisions.1)

#### Workflow Plan (for decisions.2)

Path-choice: architect direct authoring (user-adjudicated 2026-05-19 via AskUserQuestion). 5 design D-Ns defined by architect during composite ADR-002 authoring; no per-D-N AskUserQuestion adjudication since the choices are derivative from ADR-001 locks + KICKOFF-BRIEF.md adapter specs. Round 1 brain:---adr-review FAILED convergence 2026-05-19 (3 ACCEPT + 3 CONCERNS + 0 BLOCK; 10 P1 themes deduplicated; documented in CRIT-002-ADR-002). Round-2 resolution path-choice: re-dispatch architect with consolidated revision brief (user-adjudicated 2026-05-19 via AskUserQuestion). Round 2 architect revision applied 2026-05-19: 10 P1 themes A-J resolved in-ADR (D-1 schema shape with cross_source_updates + subtree_manifest + nested discriminatedUnion; D-2 frontmatter_map + JSDoc + hash extracted from interface; D-3 BaseMarkdownAdapter pattern note; D-4 single-pass replacement disjointness + regenerated_sections declarative; D-5 nested discriminatedUnion + realpath path containment + injectivity disjointness). ADR-002 line count 548 → 865 (+317 lines, +58%). Pending: round 2 brain:---adr-review re-verification. Per /decisions Step 7 iteration budget rounds 2 of 3 available before HALT.

#### Tasks (for decisions.2)

| T-ID | Group | Subject | Agent | Files | Effort | Created | Resolved |
|:--|:--|:--|:--|:--|:--|:--|:--|
| T-08 | path-choice | AskUserQuestion: D-N enumeration vs architect-direct vs pause | orchestrator | — | XS | Event 12 | Event 12 |
| T-09 | ADR auth | Author ADR-002 PROPOSED (composite design ADR via architect direct) | brain:🧠-architect | `docs/decisions/ADR-002-adapter-contract-and-plan-schema.md` | M | Event 13 | Event 13 (548 lines) |
| T-10 | ADR gate r1 | Dispatch 6-agent adr-review round 1 (parallel) | 6× brain:🧠-* | — | M | Event 14 | Event 14 (FAIL 3A+3C+0B) |
| T-11 | CRIT auth | Author CRIT-002-ADR-002 debate log capturing 10 P1 themes | orchestrator | `docs/critique/CRIT-002-ADR-002-...md` | S | Event 14 | Event 14 |
| T-12 | resolution path | AskUserQuestion: architect-r2 vs orchestrator-inline vs pause | orchestrator | — | XS | Event 14 | Event 14 (architect-r2 chosen) |
| T-13 | revision r2 | Re-dispatch architect round 2 with 10 P1 themes | brain:🧠-architect | `docs/decisions/ADR-002-adapter-contract-and-plan-schema.md` | M | Event 15 | Event 15 (865 lines) |
| T-14 | ADR gate r2 | Dispatch 6-agent adr-review round 2 (parallel) | 6× brain:🧠-* | — | M | Event 16 (planned) | pending |
| T-15 | ACCEPTED flip | Flip ADR-002 PROPOSED → ACCEPTED post round 2 PASS | orchestrator | — | XS | — | blocked-by T-14 |
| T-16 | propagation | Propagate decisions.2 DONE state across PLAN sections | orchestrator | — | XS | — | blocked-by T-15 |

#### Intra-part Deps Graph

```mermaid
%%{init: {'theme':'base','flowchart':{'curve':'stepAfter','nodeSpacing':18,'rankSpacing':55,'padding':16,'diagramPadding':20,'htmlLabels':true},'themeVariables':{'fontFamily':'-apple-system, BlinkMacSystemFont, system-ui, sans-serif','fontSize':'13px'}}}%%
graph TD
  classDef done fill:#ffffff,stroke:#e5e7eb,stroke-width:1px,color:#111827,rx:14,ry:14
  classDef pending fill:#fafafa,stroke:#d1d5db,stroke-width:1px,color:#6b7280,stroke-dasharray:3 3,rx:14,ry:14
  T08("✅ <b>T-08</b><br/><span style='color:#6b7280;font-size:11px'>r1 path-choice</span>")
  T09("✅ <b>T-09</b><br/><span style='color:#6b7280;font-size:11px'>ADR-002 PROPOSED</span>")
  T10("✅ <b>T-10</b><br/><span style='color:#6b7280;font-size:11px'>adr-review r1 FAIL</span>")
  T11("✅ <b>T-11</b><br/><span style='color:#6b7280;font-size:11px'>CRIT-002 auth</span>")
  T12("✅ <b>T-12</b><br/><span style='color:#6b7280;font-size:11px'>r2 path-choice</span>")
  T13("✅ <b>T-13</b><br/><span style='color:#6b7280;font-size:11px'>architect r2 revision</span>")
  T14("<b>T-14</b><br/><span style='color:#6b7280;font-size:11px'>adr-review r2</span>")
  T15("<b>T-15</b><br/><span style='color:#6b7280;font-size:11px'>ACCEPTED flip</span>")
  T16("<b>T-16</b><br/><span style='color:#6b7280;font-size:11px'>propagation</span>")
  T08 --> T09 --> T10 --> T11 --> T12 --> T13 --> T14 --> T15 --> T16
  class T08,T09,T10,T11,T12,T13 done
  class T14,T15,T16 pending
```

#### D-N substatus list (for decisions.2)

| ID | Status | Topic |
|:--|:--|:--|
| D-1 | LOCKED | Plan YAML schema shape — Distribution + Composition plans; nested discriminatedUnion (plan_type × source_type); concrete Zod shapes for cross_source_updates + subtree_manifest; YAML skeletons per type (round-2 revised) |
| D-2 | LOCKED | CompositionAdapter interface — 5 methods (parse / extractByRange / applyMutations / reverseMutations / serialize); hash extracted to shared utility; MutationSpec includes frontmatter_map + regenerated_sections; JSDoc documents call sequence (round-2 revised) |
| D-3 | LOCKED | Per-type capability matrix — 5 adapters with LOC + complexity; BaseMarkdownAdapter impl pattern for ADR + ANALYSIS + SESSION (config-only overrides); PLAN + SPEC distinct |
| D-4 | LOCKED | Hash validation per-type extraction — refines ADR-001 F-8 per adapter type; single-pass replacement semantics + key-value domain disjointness; PLAN regenerative-content carve-out via regenerated_sections (round-2 revised) |
| D-5 | LOCKED | Plan YAML validator structure — modular Zod schemas nested by plan_type × source_type; injectivity enforces key-value disjointness; containedPathSchema uses realpath + path.sep; 50% integrity floor on regenerated_sections (round-2 revised) |

#### Editor Mirror IDs (for decisions.2)

| T-ID | CC-ID | Cursor-ID | Last synced |
|:--|:--|:--|:--|
| T-08 | — | — | Event 12 (archived) |
| T-09 | — | — | Event 13 (archived) |
| T-10 | — | — | Event 14 (archived) |
| T-11 | — | — | Event 14 (archived) |
| T-12 | — | — | Event 14 (archived) |
| T-13 | — | — | Event 15 (archived) |
| T-14 | — | — | not yet |
| T-15 | — | — | not yet |
| T-16 | — | — | not yet |

#### Pending User Decisions (for decisions.2)

Path-choice resolved 2026-05-19 via AskUserQuestion: architect direct authoring (no per-D-N AskUserQuestion adjudication). Round-1 resolution path-choice resolved 2026-05-19 via AskUserQuestion: re-dispatch architect round 2 with consolidated revision brief. Currently NONE pending — awaiting round-2 brain:---adr-review re-verification (6-agent debate; same pattern as round 1; per /decisions Step 7 iteration budget rounds 2 of 3 available before HALT).

## Spec-Decomposition

### spec-decomposition — Cluster ADRs into SPECs (PENDING)

**Substatus**: PENDING
**Owning session**: —
**Completing session**: —
**Outcome**: — (will be N×[[SPEC-XXX ...]] root notes)
**Source artifacts**: [[ADR-001: Composition Library Architecture]], [[ADR-002: Adapter Contract and Plan Schema]] (both pending authorship)

**DoD**:

- [ ] All ACCEPTED ADRs analyzed for coverage clustering
- [ ] SPEC decomposition surfaced via AskUserQuestion before locking
- [ ] N SPEC root notes authored (one per feature cluster)
- [ ] ADR coverage gate passes (every accepted ADR D-N is referenced by at least one SPEC)
- [ ] Conditional CVA dispatched if 3+ similar adapters share variability matrix

#### Workflow Plan (for spec-decomposition)

Stage 1 of /spec: analyst clustering dispatch + conditional CVA analysis → proposed SPEC decomposition → user adjudication via AskUserQuestion. Expected output: 4-6 SPECs aligned to KICKOFF-BRIEF.md build order (composition core + ADR adapter as SPEC-001 PROOF; subsequent adapters + skills in subsequent SPECs).

#### Tasks (for spec-decomposition)

Pending — defined post decisions.2.

#### Intra-part Deps Graph

Pending.

#### Editor Mirror IDs (for spec-decomposition)

None yet.

#### Pending User Decisions (for spec-decomposition)

Pending — SPEC decomposition shape surfaced post decisions.2.

## Review

### review — Multi-axis adversarial review (PENDING)

**Substatus**: PENDING
**Owning session**: —
**Completing session**: —
**Outcome**: — (will be CRIT note(s))
**Source artifacts**: all built SPECs + composition library + skills

**DoD**:

- [ ] All applicable axes (CODE / DOCS / CONFIG / TEST PR-type classification) pass per /review skill protocol
- [ ] All P0 + P1 findings resolved or explicitly deferred with rationale
- [ ] Verdict ACCEPT (or DISAGREE_AND_COMMIT with rationale)

#### Workflow Plan (for review)

/review skill default flow.

## End

### end — PR creation + session-end checklist (PENDING)

**Substatus**: PENDING
**Owning session**: —
**Completing session**: —
**Outcome**: — (will be PR URL or session-end final commit SHA if local-only)
**Source artifacts**: full PLAN-001 history

**DoD**:

- [ ] All PLAN parts DONE or explicitly DEFERRED/ABANDONED
- [ ] Session-end checklist complete (all [x] in current session note)
- [ ] PR created (note: project is local-only initially per locked design decision 4; PR step is gated on the user opting to add a remote)
- [ ] `npx markdownlint-cli2 --fix "**/*.md"` clean
- [ ] All commits pushed to local branch

#### Workflow Plan (for end)

/end skill default flow. PR step contingent on remote being added; if local-only, /end stops at session-end checklist completion + final session-end commit.

## Risks

1. **Content drift in subagent dispatch** — HIGH probability, HIGH impact. Mitigation: the entire composition library architecture IS the mitigation; round-trip property test gates protocol changes; LLM removed from content-modifying loop entirely.
2. **Hash validation false positives from deterministic mutations** — MEDIUM probability, MEDIUM impact. Mitigation: extract pre-mutation source, apply reverse mutation to destination, then compare. Tests exercise this on synthetic fixtures before any production note touched.
3. **Adapter complexity creep on SPEC subtree** — MEDIUM probability, MEDIUM impact (~500 LOC, recursive rewrite of filenames + relations). Mitigation: build simplest adapter FIRST (ADR ~250 LOC PROOF); validate architecture before tackling SPEC subtree.
4. **Symlink-based skill installation breaks on Claude Code reload semantics** — LOW probability, MEDIUM impact. Mitigation: install.sh provides both symlink and copy modes; if symlinks misbehave, fall back to rsync-copy install.
5. **Coexistence drift with existing memory-ingest / memory-defrag** — LOW probability, LOW impact. Mitigation: explicit locked design decision to coexist (not delete or rename); /ingest auto-detects Brain vs Basic Memory from frontmatter type and routes accordingly.

## Observations

- [decision] PLAN-001 created 2026-05-19 covering Standard Development workflow (research + decisions ×2 + spec-decomposition + per-SPEC spec/build + review + end) for the skills-ecosystem project #plan-bootstrap #workflow
- [decision] research part marked DONE upfront; KICKOFF-BRIEF.md substitutes for analyst-dispatch research output per explicit user direction #research-substitution #bootstrap
- [decision] Heavy /plan create dispatches (analyst + pre-mortem + critic) deferred to iterative re-entry post decisions.1 adjudication if gaps surface #pragmatic-bootstrap #iterative-phase-reentry
- [decision] complexity_tier = TIER_4 (multi-skill ecosystem ~1,200 LOC across 5 adapters + 4 skills + composition library with cryptographic invariant) #complexity
- [constraint] SHA-256 char-identity hash check is BLOCKING invariant — failed validation = ROLLBACK, never partial write; LLM authors plans only, never modifies content bytes #zero-drift #hash-validation
- [constraint] LLM-for-plan + script-for-execution architectural pattern is the explicit anti-drift mechanism #architecture
- [constraint] Build order: ADR adapter FIRST as PROOF (~250 LOC); validate architecture before extending to other 4 adapters #build-order
- [requirement] Every IN_PROGRESS part must have an owning session for recoverability #recoverability
- [requirement] Every DONE part must have both completing_session AND outcome reference #provenance
- [risk] Content drift in subagent dispatch is the explicit reason this work exists — the bootstrapping incident (3,680-line ADR split, 35% drift on 10/12 D-Ns) is documented in KICKOFF-BRIEF.md as the post-mortem #drift-prevention
- [risk] SPEC subtree adapter is the hardest (~500 LOC, recursive rewrite); deferred behind ADR PROOF to validate architecture first #adapter-complexity

## Relations
- contains [[SESSION-2026-05-19_01: Skills Bootstrap and PLAN-001]]
- pairs_with [[brain:---adr-review]]
- pairs_with [[sync-jira]]
