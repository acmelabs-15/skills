---
title: SESSION-2026-05-20_01-plan-001-drift-remediation-and-plan-session-render-architecture
type: session
permalink: sessions/session-2026-05-20_01-plan-001-drift-remediation-and-plan-session-render-architecture
status: DONE
binds_to:
- PLAN-001-skills-ecosystem
tags:
- session
- skills
- drift-remediation
- render-architecture
- analysis
---

# SESSION-2026-05-20_01: PLAN-001 Drift Remediation and Plan/Session Render Architecture

## Scope

Post-/end follow-on session covering two related concerns: (1) drift remediation of PLAN-001 H4 subsection placeholders left in DONE parts after SESSION-2026-05-19_01 closed; (2) substantial design exploration of plan/session note render architecture triggered by the remediation experience (LLM-authored find_replace cycles surfaced as a drift source; the responsibility split between PLAN and SESSION clarified; 11 architectural decisions locked).

Outputs: commit f280c0f (drift remediation); ANALYSIS-002 (full design capture with Appendices A-I); PLAN-001 amendments adding spec.SPEC-007 as a PENDING part with source artifact pointing to ANALYSIS-002.

## Bound PLAN

- PLAN-001 Skills Ecosystem — worked parts: PLAN-001 itself (drift remediation across all 10 existing DONE parts); new spec.SPEC-007 stub added (PENDING; awaiting future ADR-003 + /spec Stage 2 cycle)

## Events

### Event 01 — Session started

- Type: session-start
- Project: skills
- Branch: feat/plan-001-skills-ecosystem
- Starting commit: 5ab3b98 (end of SESSION-2026-05-19_01)

Triggered by user feedback after SESSION-2026-05-19_01 closed via /end: PLAN-001 H4 subsections still held placeholder text despite parent parts being DONE. Session continues mid-conversation from the prior /end emit.

### Event 02 — PLAN-001 drift remediation complete (commit f280c0f)

- Type: state-change
- Scope: artifact
- Target: PLAN-001

Populated 24 placeholder H4 subsections across all 6 spec.SPEC-NNN parts (Tasks tables with T-22..T-57 entries; Intra-part Deps Graph Mermaid all-done; Editor Mirror IDs archived tables; Pending User Decisions "None — part DONE"). Fixed decisions.1 Mermaid (all-pending to all-done) + 3 DoD flips + Editor Mirror IDs archive transition. Fixed decisions.2 Mermaid (T-14/15/16 pending to done) + Editor Mirror IDs. Fixed spec-decomposition placeholders + 5 DoD flips. Updated top-level Blockers (stale to current). Updated Cross-Part Dependency Graph spec_n node (stale "SPEC-002 IN_PROGRESS" to "ALL 6 SPECs DONE"). Truncated a 211-line duplicate H2 block at the file bottom (artifact of basic-memory replace_section silently appending instead of replacing H4 sections in place; required sed truncation documented as binary-rule exception per CONVENTIONS Section 1.7.1).

### Event 03 — Design discussion: PLAN bloat root cause analysis

- Type: state-change
- Scope: other
- Target: design exploration

User flagged that PLAN-001 was substantially too large for a forward-looking workflow state document. User provided the foundational read/write loop framing: "The plan note holds a workflow's authoritative progress state and is mutated in place as steps advance. The session note is the append-only event log produced during a plan step's execution. Plans look forward; sessions look backward; together they form the workflow's read/write loop." Orchestrator audited every current PLAN section against this framing; identified responsibility-misplacement as the root cause (event-log content like Decision Log + Progress Log + per-part Tasks tables inappropriately stored in a forward-looking state document; per-part duplication of Tasks/Editor/Pending subsections × 10 parts).

### Event 04 — Corrected proposal: markdown-authoritative + deterministic render scripts

- Type: state-change
- Scope: other
- Target: design direction

Orchestrator initially proposed a parallel state.yaml as authoritative source of truth with .md regenerated from it. User corrected: basic-memory's binary rule already establishes markdown as canonical for Brain notes; introducing a state.yaml would create a dual-truth drift surface. Locked corrected pattern: markdown is authoritative; LLM provides intent (mutation) + dynamic content (prose); a deterministic Bun + TS render script parses the markdown to a typed model, applies typed mutations, re-emits the entire document, validates against Zod schema, writes atomically. Same architectural pattern as the composition library's LLM-plan + script-execute split.

### Event 05 — User correction: Tasks are state in PLAN (not events in SESSION)

- Type: state-change
- Scope: other
- Target: responsibility split refinement

Initial responsibility audit proposed moving Tasks tables to SESSION. User pushed back: tasks ARE state with a status state machine (PENDING to IN_PROGRESS to DONE). The events that transition them belong in SESSION (referencing the task by ID), but the tasks themselves live in PLAN. Same pattern applies to Pending User Decisions and Editor Mirror IDs: persistent state in PLAN; events that surface or resolve them in SESSION. Refined design: ONE consolidated Tasks section at PLAN top level (Active/Backlog/Archive three-table split) with a Part column for grouping queries. T-NN tasks become plan-scoped (continuous across sessions of the same workflow) instead of session-scoped.

### Event 06 — 11 architectural decisions locked

- Type: decision-lock
- Part: spec.SPEC-007
- Decision IDs: D-1, D-2, D-3, D-4, D-5, D-6, D-7, D-8, D-9, D-10, D-11

D-1 markdown is authoritative; D-2 PLAN owns forward state, SESSION owns backward events; D-3 deterministic render scripts replace LLM-authored find_replace; D-4 Zod schema as validation contract; D-5 T-NN plan-scoped; D-6 Tasks consolidated at PLAN top level with three-table split; D-7 Mermaid as separate render concern; D-8 round-trip property test as gate; D-9 PUD + Editor Mirror IDs at PLAN top level; D-10 no Decision Log / Progress Log in PLAN; D-11 Workflow Plan prose moves to skill docs. All LOCKED via in-conversation adjudication; pending formal ADR-003 + brain:---adr-review cycle in a future session.

### Event 07 — Full schema + parser drafts authored

- Type: state-change
- Scope: other
- Target: ANALYSIS-002 Appendices C+D

Drafted Zod schemas (common.ts + plan-note.ts + session-note.ts) with strict objects, discriminated union for events (10 event variants), cross-field invariants in superRefine (DONE part must have outcome; task.part must reference valid part; event numbers continuous starting at 1; first event session-start). Drafted parser implementation (ast-helpers.ts + parsers/plan-note.ts + parsers/session-note.ts) using unified + remark + remark-frontmatter stack per ADR-001 D-2 lock. 10 parser design decisions baked in (headings as index; derived sections skipped; wikilink as object; phase derived from id; Zod parse as final step; etc.). 5 edge cases surfaced for future resolution.

### Event 08 — Monorepo restructure proposed; user pulled back

- Type: state-change
- Scope: other
- Target: design scope

User raised concern about ~/Dev/skills/docs being a single Brain project for what should be a monorepo; proposed per-package Brain projects under packages/. Orchestrator surfaced Brain MCP constraint (projects do NOT share wikilinks across boundaries; cross-project refs must use file paths). Full monorepo layout proposed with migration mapping for existing 103 Brain notes. User: "maybe I'm getting ahead of myself"; restructure deferred to future ADR-004 when 2nd package actually starts.

### Event 09 — Persistence path: lightweight ANALYSIS, defer ADR-003

- Type: state-change
- Scope: other
- Target: persistence strategy

User flagged that summary capture would lose fidelity; requested full-detail preservation of all design exploration (templates, code blocks, decisions, monorepo proposal). Orchestrator proposed ANALYSIS-002 at full fidelity (~1500-2000 lines including code-block appendices) as the persistence path — captures everything without triggering the brain:---adr-review BLOCKING gate; formal ADR-003 deferred to a future session when the multi-hour adversarial review cycle can be run focused. User accepted.

### Event 10 — ANALYSIS-002 authored

- Type: state-change
- Scope: artifact
- Target: ANALYSIS-002

Authored via Brain MCP write_note (initial seed: Overview + Problem framing + Responsibility audit + D-1..D-11) + 3 sequential edit_note find_replace appends injecting Appendices A through I before the Observations section. Final structure: Overview, Problem framing, Responsibility audit, D-1..D-11 (each with rationale + alternatives + status), Appendix A PLAN template (worked PLAN-001 example with trimmed sections), Appendix B SESSION template (worked example with pure event ledger), Appendix C Zod schemas (common.ts + plan-note.ts + session-note.ts code blocks), Appendix D Parser drafts (ast-helpers + parsers code blocks), Appendix E Renderer sketch, Appendix F Mutation API sketch, Appendix G Monorepo restructure proposal, Appendix H Round-trip property test design, Appendix I Migration / dogfooding plan, Status summary, Observations (8 items), Relations (5 items).

### Event 11 — PLAN-001 amendment: spec.SPEC-007 PENDING added

- Type: part-transition
- Part: spec.SPEC-007
- Transition: (created) → PENDING

Added spec.SPEC-007 to PLAN-001 scope as a PENDING part. Progress Dashboard updated (spec.SPEC-NNN row 1 PENDING + 6 DONE = 7 total; total visible 3/0/0/10 = 13). Phase Progression added spec.SPEC-007 PENDING row. Cross-Part Dependency Graph added spec_007 node + edges (spec_n to spec_007; spec_007 to build_n). spec.SPEC-007 H3 part section authored under ## Spec with PENDING substatus + 8-item DoD (ADR-003 authored; Zod schemas authored; Parser drafts; Renderer; Mutation API; Round-trip property test passes; /plan + /session skills updated; PLAN-001 re-authored in trimmed form using new tooling as dogfood). Source artifact: ANALYSIS-002.

### Event 12 — ADR-001 F-4 evolution: remote added; auto PR creation locked

- Type: state-change
- Scope: artifact
- Target: ADR-001

User directed transition from F-4 locked state ("Standalone local-only git repo (no remote initially)") to remote-tracked. Remote chosen: git@github.com:loriensleafs/skills.git (private GitHub repo, loriensleafs namespace). Migration path: Option C (keep feat/plan-001-skills-ecosystem as working branch; create main from current HEAD as long-lived integration branch; push both; main becomes GitHub default). User directive: /end pipeline's PR-creation step (Step 4f) runs AUTOMATICALLY going forward, no per-session opt-out.

ADR-001 Clarifications section updated with the F-4 evolution entry; frontmatter updated field refreshed from 2026-05-19 to 2026-05-20. brain:---adr-review NOT re-run — Clarifications updates are documentation evolutions of already-ACCEPTED decisions per CONVENTIONS Section 3.1, not new architectural decisions. The F-4 reversibility assessment ("Adding a remote is a single git remote add command. No architectural impact.") explicitly anticipated this transition.

Operational consequence: claude/settings.json permissions.deny rules still block git push/pull/fetch/clone/remote from within Claude Code sessions for the duration of the user-imposed pause; the actual git remote add + initial push of feat branch + main branch will be executed by the user in a separate terminal outside Claude Code. After that initial push lands, the deny rules can be lifted to allow subsequent /end pipeline runs to execute Step 4f gh pr create automatically.

## Observations

- [outcome] Drift remediation of PLAN-001 H4 subsection placeholders complete via commit f280c0f; 24 subsections populated across 6 spec.SPEC-NNN parts + 3 fixes to decisions.1 + 1 fix to decisions.2 + 2 fixes to spec-decomposition + top-level Blockers + Cross-Part Deps Graph #drift-remediation #plan-001
- [decision] ADR-001 F-4 evolved: remote added at git@github.com:loriensleafs/skills.git; auto PR creation locked for /end Step 4f going forward; Clarifications-entry-only update (no adr-review re-run) per F-4's anticipated-transition rationale #adr-evolution #remote-added #auto-pr
- [decision] 11 architectural decisions locked for plan/session note render architecture; captured in ANALYSIS-002 with full rationale + alternatives; formal ADR-003 + brain:---adr-review cycle deferred #adr-pending
- [insight] basic-memory edit_note replace_section silently appends new H2 sections at file bottom when targeting H4 subsections; required sed truncation as binary-rule exception per CONVENTIONS Section 1.7.1 #brain-mcp-quirk #remediation
- [insight] basic-memory bullet parser strict validation rejects any prose bullet containing double-bracket wikilink syntax; workaround is plain-text title references in prose + wikilinks reserved for Relations section #brain-mcp-bullet-parser
- [constraint] basic-memory write_note enforces strict filename pattern (CAPS entity prefix + kebab body); the Pattern 2 three-phase write workaround documented in CONVENTIONS Section 1.7.2 may need revision since write_note now rejects titles with spaces #convention-update-pending
- [decision] Pragmatic persistence path: ANALYSIS-002 captures locked direction at full fidelity (Appendices A-I) without triggering brain:---adr-review BLOCKING gate; ADR-003 formalization is procedural and deferred #lifecycle #adr-pending
- [outcome] spec.SPEC-007 (Plan/Session Render Implementation) added to PLAN-001 scope as PENDING; depends_on infrastructure from SPEC-001; awaits future ADR-003 + /spec Stage 2 cycle #spec-007-pending

## Relations

- part_of [[PLAN-001: Skills Ecosystem]]
- contains [[ANALYSIS-002: Plan/Session Note Render Architecture]]
- pairs_with [[brain:---adr-review]]
- inspired_by [[ANALYSIS-001: SPEC Clustering]]
- relates_to [[ADR-001: Composition Library Architecture]]