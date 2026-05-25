---
title: 'ADR-003: Plan/Session Render Architecture'
type: decision
permalink: decisions/adr-003-plan-session-render-architecture
status: ACCEPTED
date: 2026-05-20
updated: 2026-05-20
tags:
- decision
- skills-ecosystem
- render-architecture
- plan-session
---

# ADR-003: Plan/Session Render Architecture

## Status

ACCEPTED 2026-05-20 — brain:---adr-review Phase 4 convergence Round 1: 5 ACCEPT + 1 CONCERNS + 0 BLOCK (passes ≥5 ACCEPT threshold). Independent Thinker dissent on F-3 (over-engineering signal) + F-5 (simpler alternative not evaluated) captured as Disagree-and-Commit; High-Level Advisor tie-breaker sided with ACCEPT on strategic-fit (Core capability; every SPEC build pays drift tax until shipped). Phase 3 resolutions applied in-ADR: F-2 (rollback path documented in Consequences); F-4 (round-trip claim scoped to structural fidelity in D-8); F-1 (common.ts shared with ADR-002 noted in Implementation Notes). Full debate log: [[CRIT-003-ADR-003: Plan/Session Render Architecture Debate Log]].

## Context and Problem Statement

Structural drift in PLAN-001-skills-ecosystem after the /end pipeline closed SESSION-2026-05-19_01 triggered this architectural exploration. Per-part H4 subsections (Tasks, Intra-part Deps Graph, Editor Mirror IDs, Pending User Decisions) across all 6 spec.SPEC-NNN parts retained placeholder text despite the parent parts being marked DONE. Drift remediation required about 40 edit operations plus a comprehensive PLAN walk-through, captured in commit f280c0f.

Six specific drift surfaces were identified during remediation:

1. basic-memory edit_note replace_section operation silently appended new H2 sections at the bottom of the file when targeting H4 subsections, creating a ~210-line duplicate block instead of replacing the H4 content in place. Confirmed via Brain MCP read_note that the in-memory model also reflected the duplicates (not a markdown-vs-database divergence -- the operation genuinely created bottom-appended H2s).

2. State propagation required 30+ sequential edit_note calls per major event (set-part-done, Mermaid update, Progress Dashboard rollup, Phase Progression flip, DoD checkbox flips, Decision Log append, Progress Log append, cross-part dep graph edge update). Each call triggered basic-memory parse + render. Cumulative time per propagation: 1-3 minutes.

3. Mermaid graph styling drifted: nodes had pending class when their substatus was DONE; edge linkStyle indices misaligned after subgraph changes; classDef palette inconsistencies between deps graphs in different parts. Manual reconciliation required matching the styling template across 10+ Mermaid blocks per PLAN.

4. find_replace anchoring required complex multi-line context with embedded special characters (arrows, backticks, double-brackets, emoji checkmarks) where any single character drift broke the replacement.

5. The basic-memory bullet parser treats any bullet containing double-bracket wikilink syntax as a malformed typed-relation candidate, failing validation. Workaround: rephrase prose bullets to plain-text title references; reserve wikilinks for the Relations section.

6. Permalink dash-one suffix collisions after delete+recreate or write_note+move_note sequences accumulated to about 95 unresolved across 6 SPEC subtrees.

The architectural insight: the same LLM-for-plan / script-for-execution pattern established by the composition library (ADR-001) should apply to plan/session note maintenance. The LLM provides intent and any dynamic prose content; a deterministic Bun + TS render script applies state and content to produce canonical markdown. This eliminates the root cause of every drift surface above.

The foundational invariant, captured verbatim from the user's framing:

> Relationship to plan notes: The plan note holds a workflow's authoritative progress state and is mutated in place as steps advance. The session note is the append-only event log produced during a plan step's execution. A plan transition (ready to in progress) initiates the work that a session captures; on completion, the plan transitions again (in progress to done) and references the session note as the receipt for that step. Plans look forward; sessions look backward; together they form the workflow's read/write loop.

## Decision Drivers

1. **Anti-drift via deterministic render.** LLM-authored find_replace / edit_note cycles produce drift through multiple failure modes (silent H2 appending, Mermaid styling inconsistency, find_replace anchoring brittleness). Deterministic scripts with full-document state-then-render propagation eliminate each of these.

2. **Responsibility split correctness.** Plans look forward (mutable state); sessions look backward (append-only events). Mixing event content into plan documents and state content into session documents caused the original bloat and drift.

3. **Round-trip identity as correctness gate.** The SHA-256 char-identity property test from ADR-001 F-8 should extend to plan/session render: render(parse(md)) === md guarantees no incidental structural change.

4. **Schema as contract between LLM and script.** Zod schemas validate plan/session structures at parse and pre-write boundaries, catching cross-field invariant violations that edit_note silently accepts.

5. **Mermaid as a derived view.** Mermaid dependency graphs are a function of part structure and substatus, not hand-authored content. Generating them eliminates an entire class of drift.

6. **Consolidation reduces surface area.** Per-part duplication of Tasks, Editor Mirror IDs, and Pending User Decisions across N parts was the primary bloat source. Top-level consolidation with a Part column eliminates duplication while preserving data.

## Considered Options

### Axis 1: State model

#### Option A: state.yaml as authoritative + .md regenerated from it

A YAML file holds the canonical state; markdown is regenerated from it on every state change.

**Pros:**

- Clean separation between state and presentation
- YAML is easier to parse/validate programmatically than markdown

**Cons:**

- Creates a dual-truth problem: if .md and .yaml diverge, which wins?
- basic-memory's binary rule (CONVENTIONS Section 1.7.1) establishes markdown as canonical for Brain notes -- adding a second authoritative source contradicts this
- The drift problem we are solving would reappear one layer down (YAML-to-markdown divergence)
- Git diff tooling works better on markdown than YAML for prose-heavy content

#### Option B: Markdown is authoritative state (SELECTED -- D-1)

The markdown files in docs/** are the single source of truth. No parallel state.yaml.

**Pros:**

- Aligns with basic-memory's existing canonical model
- Single source of truth eliminates dual-truth divergence
- Git history captures state evolution in human-readable form
- basic-memory indexing, search, and wikilink resolution all work against the .md files directly

**Cons:**

- Markdown is harder to parse programmatically than YAML (mitigated by the unified + remark parser layer per D-9)
- Schema validation requires parsing markdown first (but this is the parser layer's job)

### Axis 2: Edit strategy

#### Option A: LLM-authored edit_note with better prompts

Keep the current approach but write more careful find_replace anchoring and more explicit LLM instructions.

**Pros:**

- Zero new code; works today
- No dependency on render scripts

**Cons:**

- Failure modes are inherent to incremental editing without full-document state-then-render propagation
- basic-memory replace_section silent appending at H4 targets is a platform bug, not a prompting problem
- 30+ sequential edits per propagation cycle remains architecturally expensive regardless of prompt quality
- Mermaid styling coordination across multiple blocks requires global knowledge that per-edit prompts lack

#### Option B: Deterministic Bun + TS render scripts (SELECTED -- D-3)

Plan and session note mutations go through Bun + TypeScript scripts that: parse markdown into a typed in-memory model, apply typed mutations, re-emit the entire document deterministically, validate against the Zod schema, write atomically. The LLM provides intent (which mutation, with what parameters) and any dynamic prose content; the script applies state and content to produce canonical markdown.

**Pros:**

- Full-document propagation eliminates every drift surface identified in the problem framing
- Single disk write per mutation (atomic)
- Side-channel propagation (Progress Dashboard rollup, Cross-Part Deps Graph, status consistency checks) all happen automatically as derived views during render
- Same architectural pattern as the composition library (LLM plans, script executes mechanically)
- Testable via round-trip property test

**Cons:**

- Requires building parser + renderer + mutation API (~500-700 LOC estimated)
- Adds Bun + TS toolchain dependency for plan/session maintenance
- Render script must be maintained as plan/session template evolves

### Axis 3: Task scoping

#### Option A: T-NN session-scoped + prefix with session id for plan-level references

Keep T-NN session-scoped per existing feedback_session_protocol guidance. Cross-session references use a session-prefixed form.

**Pros:**

- Consistent with existing convention
- Session boundary provides natural namespace

**Cons:**

- Cross-session task references are cumbersome (SESSION-2026-05-19_01:T-12 is verbose)
- Tasks are state living in PLAN, not events living in SESSION; session-scoping their IDs contradicts the responsibility split

#### Option B: T-NN plan-scoped (SELECTED -- D-5)

Task IDs use T-NN where NN is a plan-global counter (2+ digits), continuous across sessions of the same workflow.

**Pros:**

- Unambiguous cross-session task references (T-42 means one task regardless of which session created it)
- Aligns with the D-2 decision that tasks are PLAN state, not SESSION events
- Continuous numbering across sessions makes the task ledger coherent

**Cons:**

- Breaks existing T-NN session-scoping convention (migration: existing PLAN-001 T-IDs are already plan-global continuous T-01..T-57; no renumbering needed)

### Axis 4: Consolidation strategy for per-part sections

#### Option A: Keep per-part Tasks/PUD/EditorMirror sections

Retain the existing structure where each part has its own Tasks, Pending User Decisions, and Editor Mirror IDs sub-sections.

**Pros:**

- No structural migration needed
- Part-scoped view when reading a single part

**Cons:**

- Primary bloat source: same table headers repeated x N parts
- Event commentary embedded in task rows (violates state/event split)
- Cross-part task queries require reading N sections

#### Option B: Consolidate at PLAN top level (SELECTED -- D-6, D-9)

A single Tasks section at PLAN top level contains three sub-tables: Active (IN_PROGRESS), Backlog (PENDING), Archive (DONE). PUD and Editor Mirror IDs also at top level. Each task row has a Part column for filtering.

**Pros:**

- Eliminates per-part duplication (about 70% bulk reduction)
- Matches the existing three-table hybrid pattern, relocated from SESSION to PLAN where state belongs
- Active/Backlog/Archive split keeps visible PLAN size manageable at 100+ tasks
- Cross-part queries are a single table scan

**Cons:**

- Loses the per-part visual grouping (mitigated by the Part column filter)

## Decision

This ADR captures 11 locked architectural decisions (D-1 through D-11) established during the ANALYSIS-002 exploration of plan/session note render architecture. All 11 decisions were locked via user adjudication during the analysis and are formalized here for adversarial review via brain:---adr-review.

### D-1: Markdown is authoritative state

**Decision**: The markdown files in docs/** are the single source of truth for plan and session state. No parallel state.yaml as a second source of truth.

**Rationale**: basic-memory's binary rule (CONVENTIONS Section 1.7.1) already establishes markdown as canonical for Brain notes. The markdown files are what gets committed to git, indexed by basic-memory, and surfaced to readers. Introducing a state.yaml as authoritative would create a dual-truth problem: if the .md and the .yaml ever diverge, which wins? The drift problem we are trying to solve would reappear one layer down.

**Alternative considered**: state.yaml as authoritative + .md regenerated from it on every state change. This was the initial proposal in the exploration. The orchestrator was corrected by the user; the corrected pattern is the locked one above.

**Cross-decision implications**: D-1 grounds the entire architecture. D-3 (deterministic render scripts) operates on markdown as both input and output. D-4 (Zod schema) validates the parsed markdown model. D-8 (round-trip property test) verifies render(parse(md)) === md against the authoritative markdown.

### D-2: PLAN owns forward state; SESSION owns backward events

**Decision**: PLAN tracks all forward-looking workflow state (parts, tasks, pending decisions, editor mirror IDs, dashboard rollups, deps graph). SESSION is a pure append-only event ledger that captures what happened during a session, referencing PLAN state by id where relevant.

**Rationale**: Per the user's read/write loop framing -- plans look forward (mutated in place as steps advance); sessions look backward (capture events produced during a plan step's execution). A plan transition initiates work that a session captures; on completion, the plan transitions again and references the session as the receipt.

**Alternative considered**: Putting Tasks in SESSION (initial responsibility audit). Rejected because tasks ARE state with a status state machine (PENDING to IN_PROGRESS to DONE), not events. The transitions are events; the tasks themselves are state.

**Cross-decision implications**: D-2 is the responsibility-split foundation. D-5 (T-NN plan-scoped) follows from tasks being PLAN state. D-6 (consolidated tasks) follows from tasks being PLAN state at top level. D-9 (PUD + Editor Mirror at PLAN top level) follows from both being state. D-10 (no Decision Log / Progress Log in PLAN) follows from logs being event-shaped. D-11 (workflow plan prose to skill docs) follows from protocol documentation being invariant across plan instances.

### D-3: Deterministic render scripts replace LLM-authored find_replace cycles

**Decision**: Plan and session note mutations go through Bun + TypeScript scripts that parse markdown into a typed in-memory model, apply typed mutations, re-emit the entire document deterministically, validate against the Zod schema, and write atomically. The LLM provides intent (which mutation, with what parameters) and any dynamic prose content; the script applies state and content to produce canonical markdown.

**Rationale**: LLM-authored find_replace / edit_note cycles produce drift through multiple failure modes: basic-memory replace_section silently appending H2 sections at the bottom; 30+ sequential edits per state propagation each triggering basic-memory parse+render; Mermaid graph styling falling out of sync with substatus; find_replace anchoring brittleness on multi-line context with special characters. A deterministic script with full-document propagation eliminates each of these. The architectural pattern is the same as the composition library's: LLM plans, script executes mechanically with cryptographic invariants.

**Alternative considered**: Keep LLM-authored edit_note but write better prompts + more careful anchoring. Rejected because the failure modes are inherent to incremental editing without full-document state-then-render propagation. The basic-memory replace_section bug is a platform behavior, not a prompting deficiency.

**Cross-decision implications**: D-3 is the execution mechanism for the entire render architecture. D-4 (Zod schema) provides the validation contract for the script. D-7 (Mermaid as separate render concern) is a specific application of deterministic rendering. D-8 (round-trip property test) validates the script's correctness. The mutation API (D-11 per Appendix F) is how the LLM interfaces with the script.

### D-4: Zod schema as validation contract

**Decision**: Plan and session note structures are validated by Zod schemas living in shared/composition/src/schemas/ (plan-note.ts, session-note.ts, common.ts). Schema runs on every parse and pre-write. Validation includes cross-field invariants: DONE part must have outcome; task.part must reference a valid part; event numbers must be continuous starting at 1; first event must be session-start; DONE task must reference a resolving event.

**Rationale**: Type safety + runtime validation + cross-field invariants caught at a known boundary. Mirrors ADR-001 D-1 (Zod for plan validation). The schema is the contract between LLM authoring layer and the deterministic render script.

**Alternative considered**: JSON Schema. Rejected per ADR-001 D-1 reasoning (Zod is TS-native, single source of truth between types and validation; JSON Schema requires maintaining separate type definitions, creating sync drift).

**Schema design decisions baked in** (per ANALYSIS-002 Appendix C):

1. Strict objects throughout (.strict()) -- unknown fields fail validation. Schema is single source of truth for shape.
2. Discriminated union for events -- every event has a type field; event-type-specific fields are statically typed.
3. Cross-field invariants in superRefine -- task-to-part, depends_on-to-part, status consistency, event-number continuity, first-event-is-session-start.
4. outcome required when substatus is DONE; resolved_at_event required when status is DONE.
5. branches[] on PLAN, binds_to[] on SESSION -- arrays for the many-to-many case. Min 1.
6. No per-part objectives -- objectives are workflow-level only.
7. tasks, pending_decisions, editor_mirror default to [] -- empty arrays for plans that haven't accrued any yet.
8. PUD options 2-4 -- matches AskUserQuestion's option constraint per the ask protocol.
9. No decision_log / progress_log arrays -- absence enforces the responsibility split (D-2 + D-10).
10. Observation min 3, Relations min 2 -- matches CONVENTIONS Section 6.

**Cross-decision implications**: D-4 depends on ADR-001 D-1 (Zod selection). D-4 validates the output of D-9 (parser layer) and the input to D-10 (renderer layer). D-4's cross-field invariants encode the constraints from D-2 (responsibility split), D-5 (plan-scoped tasks), and D-6 (consolidated tasks).

### D-5: T-NN tasks are plan-scoped (not session-scoped)

**Decision**: Task IDs use the format T-NN where NN is a plan-global counter (2+ digits), continuous across sessions of the same workflow. Previously T-NN was session-scoped per the existing feedback_session_protocol guidance.

**Rationale**: Tasks are state living in PLAN; therefore their identifiers span the PLAN lifecycle, not the session lifecycle. Continuous numbering across sessions makes cross-session task references unambiguous.

**Alternative considered**: Keep T-NN session-scoped + prefix with session id for plan-level references. Rejected because the cross-session reference is more cumbersome and contradicts the D-2 responsibility split where tasks are PLAN state.

**Migration**: Existing T-IDs in PLAN-001 are already plan-global continuous (T-01..T-57 across the bootstrap session); no renumbering needed.

**Cross-decision implications**: D-5 follows from D-2 (tasks are PLAN state). D-5 feeds into D-6 (consolidated tasks at PLAN top level use plan-scoped IDs). The session-note event schema references tasks by T-NN (task-transition event type) which requires plan-scoped unambiguity.

### D-6: Tasks consolidated at PLAN top level with three-table split

**Decision**: A single Tasks section at PLAN top level contains three sub-tables: Active (IN_PROGRESS tasks), Backlog (PENDING tasks), Archive (DONE tasks, optionally inside a details collapse). The tasks table schema has columns: T-ID, Subject, Part, Agent, Effort, Status, Created (event ref), Resolved (event ref). The per-part Tasks H4 sections are dropped entirely.

**Rationale**: Per-part Tasks duplication was the primary bloat source. Consolidation matches the existing three-table hybrid pattern, just relocated from SESSION to PLAN where state belongs (per D-2). The Active/Backlog/Archive split keeps the visible PLAN size manageable even when the workflow has 100+ tasks.

**Cross-decision implications**: D-6 follows from D-2 (tasks are PLAN state) and D-5 (plan-scoped T-NN). The Part column in the consolidated table enables per-part filtering without per-part structural duplication.

### D-7: Mermaid as separate render concern

**Decision**: The Mermaid rendering logic for the Cross-Part Dependency Graph is a separate pure function renderMermaid(parts, layout) callable independently. Single source of truth for graph styling. Used internally by applyPlanMutation (auto-propagate on every substatus change) and exposed as a standalone command for manual regeneration when drift is detected.

**Rationale**: Mermaid charts were a particularly painful drift surface -- class assignments, substatus icons, and edge linkStyle indices all needed consistent updates that LLM-authored edit_note couldn't reliably coordinate. Making Mermaid a derived view eliminates an entire class of drift by generating the chart from the part structure and substatus state, not from hand-authored content.

**Cross-decision implications**: D-7 is a specific application of D-3 (deterministic rendering). The renderMermaid function takes the parts array from the parsed PlanNote model (D-4 schema) as input. It produces canonical styling per the CONVENTIONS Section 4.12 Mermaid palette (graph TD, classDef done/pending, subgraphs by phase, emoji-prefix node labels, gray intra-wave + blue cross-wave edges via linkStyle).

### D-8: Round-trip property test as gate

**Decision**: render(parse(md)) === md (SHA-256 char-identity, modulo intentional template normalization) is a CI gate for the plan/session render pipeline. PLAN-001 itself becomes the first round-trip fixture.

**Rationale**: Same hash-validation principle as the composition library's adapter contract per ADR-001 F-8. The invariant applies to STRUCTURAL template content (frontmatter shape, section ordering, table schemas, Mermaid graph derivation, observation/relation formatting) — drift becomes structurally drift-resistant inside the rendered plan/session note. LLM-authored prose sections (Scope, DoD text, blocker descriptions, observation/event bodies) are expected to mutate — they propagate through deterministic re-render after Zod schema validation. Once the parser + renderer pair achieves round-trip for the dogfood fixtures, the mutation API can be built on top with confidence that no incidental structural change to the markdown occurs from a no-op operation.

**Scope of the invariant** (per CRIT-003 F-4 resolution): `render(parse(md)) === md` is the gate for STRUCTURAL fidelity. Prose mutations break char-identity by design (the LLM is intentionally changing prose content); the gate fires when the structural diff is non-zero on a no-op mutation, indicating parser/renderer regression rather than intended content change.

**Round-trip test design** (per ANALYSIS-002 Appendix H):

```ts
test('plan round-trip identity', () => {
  const md = readFileSync('docs/planning/PLAN-001-skills-ecosystem.md', 'utf8');
  const parsed = parsePlanNote(md);
  const rendered = renderPlanNote(parsed);
  expect(sha256(rendered)).toBe(sha256(md));
});

test('session round-trip identity', () => {
  const md = readFileSync('docs/sessions/SESSION-2026-05-19_01-skills-bootstrap-and-plan-001.md', 'utf8');
  const parsed = parseSessionNote(md);
  const rendered = renderSessionNote(parsed);
  expect(sha256(rendered)).toBe(sha256(md));
});
```

For the existing PLAN-001 (which uses the original template, not the trimmed one), round-trip parity holds only after PLAN-001 is re-authored to the trimmed template. Strategy: parse current PLAN-001, drop the dropped sections (Workflow Plan / Decision Log / Progress Log / per-part redundancies), consolidate Tasks at top level, render, diff. Iterate until char-identity holds against the new trimmed canonical form.

**Cross-decision implications**: D-8 validates D-3 (deterministic render), D-9 (parser), and D-10 (renderer) end-to-end. D-8 mirrors ADR-001 F-8 (SHA-256 char-identity invariant). The round-trip test becomes a CI gate that prevents parser/renderer regressions from silently introducing structural drift.

### D-9: PUD + Editor Mirror IDs at PLAN top level (state, not event)

**Decision**: Pending User Decisions and Editor Mirror IDs are top-level PLAN sections (not per-part, not in SESSION). PUDs are open AskUserQuestion prompts that span sessions until resolved; Editor Mirror IDs are the persistent T-ID to CC-ID to Cursor-ID mapping.

**Rationale**: These are state, not events. Per-part scoping was duplication; SESSION scoping conflated state with events. Consolidation at PLAN top level follows the same logic as D-6 (task consolidation).

**Cross-decision implications**: D-9 follows from D-2 (forward state in PLAN). The PendingDecisionSchema and EditorMirrorEntrySchema in the Zod schema (D-4) validate these as PLAN-level arrays. Session events reference PUDs by id (pending-decision-surfaced, pending-decision-resolved event types) rather than embedding the PUD state.

### D-10: No Decision Log / Progress Log in PLAN

**Decision**: PLAN drops the top-level Decision Log and Progress Log sections. Their content was event-shaped and duplicated SESSION Event NN entries. If a cross-session executive summary is wanted later, build a separate "bun run plan:history PLAN-NNN" command that pretty-prints from session events rather than embedding the rollup in the artifact.

**Rationale**: Decision-lock events and progress events are SESSION-scoped event-log content (per D-2). Removing them is the largest single source of PLAN bloat reduction. The session notes already capture every decision lock and progress transition as Event NN entries with typed fields; duplicating those into PLAN was redundant.

**Cross-decision implications**: D-10 follows from D-2 (event content belongs in SESSION). The PlanNoteSchema (D-4) enforces this by omitting decision_log and progress_log arrays -- absence is the enforcement mechanism. The future "plan:history" command would read session events and aggregate; this is a presentation concern, not a state concern.

### D-11: Workflow Plan prose moves to skill docs

**Decision**: PLAN drops the top-level Workflow Plan prose and per-part Workflow Plan prose. These described HOW work gets executed (the skill protocol). That content belongs in the skill spec, not in workflow state.

**Rationale**: Skill protocol documentation is invariant across plan instances. It should live once in the skill's SKILL.md (or reference files), not be re-authored into every plan note. Removing workflow prose from PLAN is a separation-of-concerns correction: PLAN tracks WHAT work is being done and its state; the skill's documentation describes HOW.

**Cross-decision implications**: D-11 reduces PLAN size further after D-6 (task consolidation) and D-10 (log removal). The skill spec (e.g., the planning skill's SKILL.md) becomes the canonical location for workflow protocol documentation.

## Responsibility Audit

Every current PLAN section was classified by nature (state vs event vs documentation) and assigned to a destination per D-1 through D-11.

### PLAN keeps (forward-looking workflow state)

- Frontmatter (title, type=plan, status, complexity_tier, branches, permalink, tags)
- Scope (workflow intent prose)
- Objectives (checklist with per-item done state)
- Progress Dashboard (derived rollup of parts substatus by phase; regenerated by render script)
- Cross-Part Dependency Graph (derived Mermaid from parts depends_on + phase grouping; regenerated by render script)
- Per-part state: Substatus, Owning session, Completing session, Outcome, Source artifacts, Depends on, DoD
- Per-part D-N substatus list (decisions parts only; slim format -- D-N id + LOCKED + one-line topic; verbose content lives in the ADR)
- Tasks (Active / Backlog / Archive three-table split, consolidated at PLAN top level with a Part column)
- Pending User Decisions (consolidated at PLAN top level)
- Editor Mirror IDs (consolidated at PLAN top level; persistent T-ID to CC-ID to Cursor-ID map)
- Blockers (forward-looking list)
- Observations and Relations (CONVENTIONS Section 4.0 invariant final two sections)

### PLAN drops (moved out)

- Workflow Plan top-level prose: skill protocol documentation, not workflow state -- moves to skill spec (D-11)
- Decision Log top-level: event-shaped (chronological log of decision lock events) -- moves to SESSION events (D-10)
- Progress Log top-level: event-shaped (duplicates SESSION Event NN entries) -- moves to SESSION events (D-10)
- Per-part Workflow Plan prose: skill protocol documentation -- moves to skill spec (D-11)
- Per-part Tasks tables: duplicate headers + structure across N parts -- consolidated into top-level Tasks with a Part column (D-6)
- Per-part Intra-part Deps Graph: redundant -- Cross-Part Deps Graph + depends_on already establishes order -- dropped entirely
- Per-part Editor Mirror IDs: per-part scoping was duplication -- consolidated at PLAN top level (D-9)
- Per-part Pending User Decisions: per-part scoping was duplication -- consolidated at PLAN top level (D-9)

### SESSION keeps (backward-looking event ledger)

- Frontmatter (title, type=session, status, binds_to, permalink, tags)
- Scope (session intent prose)
- Bound PLAN pointer list with worked_parts
- Event NN entries (append-only); each event has typed-field bullets (Type, Part, Transition, Outcome, Decision IDs, Task, Agent, Verdict, Tally) followed by free-text body
- Observations and Relations

### SESSION drops (proposed and rejected)

An earlier proposal moved Tasks tables and per-session Pending User Decisions and Editor Mirror IDs into the SESSION note. This was rejected by the user with the observation that tasks are state with a status state machine; the events that transition them belong in SESSION (referencing the task by ID), but the tasks themselves live in PLAN. Same pattern applies to Pending User Decisions and Editor Mirror IDs: persistent state in PLAN; events that surface or resolve them in SESSION.

### Root cause of original bloat

Two compounding sources, neither of which was "Tasks shouldn't be in PLAN":

1. Per-part duplication. The same Tasks/Editor/Pending headers were repeated x 10 parts. Same column structure; different rows. Consolidation at PLAN top level (with a Part column) eliminates the duplication while preserving the data.

2. Event commentary embedded in task rows. The Resolved column carried prose like "PASS unanimous; no P1; 134K tokens" -- that's event detail, not task state. The task row should reference the resolving event by id; the event body carries the detail.

Net effect of the fix: about 70% bulk reduction in PLAN markdown; SESSION grows by 30-50 lines per session (consolidated Tasks references) but stays genuinely session-scoped.

## Technology Stack

### Runtime Dependencies

- **Bun**: Runtime, test runner, package manager (per ADR-001 F-6)
- **Zod**: Plan/session note validation with TS type inference (per D-4; extends ADR-001 D-1)
- **unified + remark-parse + remark-stringify**: Markdown AST parsing and serialization (per D-9 parser / D-10 renderer; extends ADR-001 D-2)
- **remark-frontmatter**: YAML frontmatter extraction plugin for remark (per ADR-001 D-2)
- **remark-gfm**: GFM tables support for task tables and dashboard (new dependency for plan/session rendering)
- **js-yaml**: YAML parsing for frontmatter extraction (per ADR-001 D-3, implied)
- **mdast-util-to-string**: AST node text extraction utility (used by parser helpers)

### Dev Dependencies

- **biome**: Lint and format (per ADR-001 F-6)
- **bun test**: Built-in test runner (per ADR-001 F-6)

## Consequences

### Positive

- Structural drift-resistance: round-trip property test (SHA-256 char-identity) gates structural fidelity (frontmatter shape, section ordering, table schemas, Mermaid graph) in the rendered plan/session note. Prose mutations propagate intentionally through Zod-validated re-render; the invariant fires on no-op mutations producing non-zero structural diff (regression signal), not on intended prose changes (see D-8 Scope of the invariant)
- Single disk write per mutation replaces 30+ sequential edit_note calls per state propagation cycle
- Mermaid graph styling is generated, not hand-maintained, eliminating the most painful manual drift surface
- About 70% PLAN bulk reduction from consolidation (D-6) and responsibility-split enforcement (D-10, D-11)
- Typed mutation API gives LLMs a narrow, validated interface instead of free-form find_replace
- Cross-field invariants (DONE part must have outcome; task.part must reference valid part; continuous event numbering) caught at schema boundary rather than silently violated
- Plan/session templates become mechanically enforceable rather than conventionally enforced

### Rollback path

If the render scripts introduce bugs that corrupt plan/session notes: (1) git revert the offending commit (notes restored to last-good state); (2) resume manual edit_note workflow until the regression is fixed; (3) the round-trip property test in CI gates regressions before they merge. Per the atomic write-to-temp-then-rename protocol inherited from ADR-001 F-8, no partial-write corruption can occur — a crash mid-write leaves source untouched and a recoverable `.tmp` artifact. This rollback path applies to all 11 D-Ns; no decision here is irreversible.

### Negative

- Requires building parser + renderer + mutation API layer (~500-700 LOC for plan; ~300-400 LOC for session; total ~800-1100 LOC excluding tests)
- Adds dependency on the render scripts for plan/session maintenance -- LLM can no longer edit plan notes directly via edit_note for structural changes (prose edits to scope/body content remain possible)
- Render script must be maintained as plan/session template evolves (schema changes require parser + renderer updates)
- Migration cost: existing PLAN-001 must be re-authored to the trimmed template before round-trip parity holds

### Neutral

- The plan/session render architecture shares all runtime dependencies with the composition library (ADR-001) -- no new dependency categories introduced
- T-NN plan-scoping (D-5) breaks existing session-scoping convention but existing PLAN-001 T-IDs are already plan-global continuous; no migration cost

## Vendor Lock-in Assessment

No new vendor lock-in beyond what ADR-001 already assessed. The plan/session render architecture reuses the same technology stack:

- **Zod** (D-4): Low lock-in. MIT license. Drop-in alternatives exist. (Same assessment as ADR-001 D-1.)
- **unified + remark** (D-9, D-10): Low lock-in. MIT license. mdast is an open spec. (Same assessment as ADR-001 D-2.)
- **Bun** (runtime): Medium lock-in. Bun-native APIs at ~15-20 call sites. (Same assessment as ADR-001 F-6.)

## Confirmation

- [ ] Plan-note parser achieves Zod-validated parse of PLAN-001 (trimmed template form) without errors
- [ ] Session-note parser achieves Zod-validated parse of SESSION-2026-05-19_01 without errors
- [ ] Plan round-trip identity: render(parse(md)) === md (SHA-256 char-identity) for PLAN-001 trimmed fixture
- [ ] Session round-trip identity: render(parse(md)) === md (SHA-256 char-identity) for SESSION-2026-05-19_01 fixture
- [ ] Mermaid renderMermaid(parts, layout) produces canonical styling matching CONVENTIONS Section 4.12 palette
- [ ] Mutation API: set-part-substatus triggers automatic Progress Dashboard rollup + Cross-Part Deps Graph regeneration + Mermaid class reassignment
- [ ] Mutation API: append-event preserves continuous numbering and validates event type discrimination
- [ ] Cross-field invariants enforced: DONE part without outcome fails validation; task referencing unknown part fails; non-continuous event numbers fail
- [ ] /brain:---adr-review PASS verdict on this ADR before any SPEC-007 implementation work proceeds (process gate)

## Implementation Notes

### Schema layer at shared/composition/src/schemas/

Three files: common.ts (shared IDs, enums, observation/relation schemas), plan-note.ts (PlanNoteSchema with PlanFrontmatterSchema, PartSchema, TaskSchema, PendingDecisionSchema, EditorMirrorEntrySchema), session-note.ts (SessionNoteSchema with SessionFrontmatterSchema, EventSchema discriminated union with 10 event types).

**common.ts is shared with ADR-002's composition schemas** (per CRIT-003 F-1 resolution). The shared enums (status enums, observation category enum, relation verb enum, EntityIdSchema regex, WikilinkSchema) live in `shared/composition/src/schemas/common.ts` and are imported by both ADR-002's plan-schema.ts and ADR-003's plan-note.ts + session-note.ts. DRY single source of truth; no duplicate schema definitions for overlapping types. SPEC-007 authoring will detail the import structure.

Full Zod schema drafts are in ANALYSIS-002 Appendix C. Key design points:

**common.ts** defines: EntityIdSchema (regex matching all 16 canonical entity prefixes), PartIdSchema (regex matching research|decisions.N|spec-decomposition|spec.SPEC-NNN|build.SPEC-NNN|review|end), TaskIdSchema (T-NN), DecisionIdSchema (D-N or F-N), EventNumberSchema (positive int), SessionIdSchema (SESSION-YYYY-MM-DD_NN). Status enums: PartSubstatusEnum (PENDING|READY|IN_PROGRESS|DONE|DEFERRED|ABANDONED|BLOCKED), TaskStatusEnum (PENDING|IN_PROGRESS|DONE|DEFERRED|ABANDONED|BLOCKED), PlanStatusEnum (IN_PROGRESS|DONE|PAUSED), SessionStatusEnum (IN_PROGRESS|PAUSED|DONE), DecisionStatusEnum (PENDING|LOCKED|REJECTED|DEFERRED), EffortEnum (XS|S|M|L|XL), ComplexityTierEnum (TIER_1..TIER_5|TBD), PhaseEnum (research|decisions|spec-decomposition|spec|build|review|end). WikilinkSchema as { ref: string }. OutcomeSchema as discriminated union on kind: file|wikilink. ObservationSchema with category enum (10 valid categories per CONVENTIONS Section 4.2) + text + tags[1-3]. RelationSchema with verb enum (16 valid verbs per CONVENTIONS Section 4.4) + target.

**plan-note.ts** defines: PlanFrontmatterSchema (title regex, type literal 'plan', status, complexity_tier, branches[], permalink regex, tags[2-5]). ObjectiveSchema (id, text, done). DodItemSchema (text, done, optional deferred_rationale). DecisionStateSchema (id, status, topic). PartSchema (id, phase, title, substatus, owning_session?, completing_session?, outcome?, source_artifacts[], depends_on[], dod[], decisions?) with refine: DONE part must have outcome. TaskSchema (id, subject, part, agent, files[], effort, status, created_at_event?, resolved_at_event?) with refine: DONE task must reference resolving event. PendingDecisionSchema (id PUD-N, part, question, surfaced_at_event, surfaced_session, options[2-4] with label+description). EditorMirrorEntrySchema (task_id, cc_id nullable, cursor_id nullable, last_synced nullable). PlanNoteSchema (frontmatter, scope, source_reference?, objectives[1+], parts[1+], tasks[], pending_decisions[], editor_mirror[], blockers[], observations[3+], relations[2+]) with superRefine: task.part must reference valid part; part.depends_on must reference valid part; all-terminal parts implies plan status not IN_PROGRESS.

**session-note.ts** defines: SessionFrontmatterSchema (title regex, type literal 'session', status, binds_to[1+], permalink regex, tags[2-5]). 10 event types via discriminated union on type field: session-start (project?, branch?, starting_sha?), bootstrap (step?), part-transition (part, from, to, outcome?), decision-lock (part, decision_ids[1+]), task-transition (task, from, to), agent-dispatch (agent, task?, part?, token_usage?, duration_seconds?), debate-result (target, verdict PASS|FAIL|CONCERNS|BLOCK, tally {accept,concerns,block}, p0/p1/p2 counts, artifact?), pending-decision-surfaced (pud_id, part), pending-decision-resolved (pud_id, selected_option), state-change (scope plan|artifact|other, target). BoundPlanRefSchema (ref, worked_parts[1+]). SessionNoteSchema (frontmatter, scope, bound_plans[1+], events[1+], observations[3+], relations[2+]) with superRefine: event numbers continuous from 1; first event must be session-start.

### Parser layer at shared/composition/src/parsers/

Three files: ast-helpers.ts (shared utilities), plan-note.ts (parsePlanNote), session-note.ts (parseSessionNote).

Full parser drafts are in ANALYSIS-002 Appendix D. Key design points:

**ast-helpers.ts** provides: extractFrontmatter (yaml node extraction from AST), sectionizeH2 (split tree into Map of H2 sections), sectionizeH3 (split children into Map of H3 subsections), proseFromChildren (paragraph text extraction), stripWikilink (detect and extract wikilink ref), findList/findTable (node finders), tableRows/tableHeader (table parsing), bulletFieldMap (parse "- **Field**: value" bullets into key-value Map), checkboxItems (extract checkbox list items with done state), ParseError class with path array for Zod-style error locality.

**parsePlanNote** flow: parse markdown via unified+remarkParse+remarkFrontmatter into AST Root. extractFrontmatter. sectionizeH2 to get Scope, Objectives, Parts, Tasks, Pending User Decisions, Editor Mirror IDs, Blockers, Observations, Relations sections. Parse each section: parseScope extracts scope prose + optional Source reference. parseObjectives extracts checkbox list. parsePartsSection uses sectionizeH3 to iterate H3 part headings ("partId -- title" format), extracting bullet field attrs (Substatus, Owning session, Completing session, Outcome, Source artifacts, Depends on), DoD checkbox list, optional Locked decisions table. derivePhaseFromId eliminates phase as a drift surface. parseTasksSection uses sectionizeH3 for Active/Backlog/Archive sub-tables. parsePendingDecisions / parseEditorMirror / parseBlockers / parseObservations / parseRelations complete the model. Final PlanNoteSchema.parse() validates cross-field invariants.

**parseSessionNote** flow: same AST pipeline. sectionizeH2 for Scope, Bound PLAN, Events, Observations, Relations. parseBoundPlans extracts wikilink ref + worked_parts from bullet pattern. parseEvents uses sectionizeH3 for "Event NN -- title" headings; bulletFieldMap extracts typed fields (Type, Part, Transition, Outcome, Decision IDs, Task, Agent, Verdict, Tally, P0/P1/P2); discriminated union narrowing happens at Zod validation via EventSchema.parse(). Final SessionNoteSchema.parse() validates event-number continuity and first-event-is-session-start.

**Parser design decisions baked in** (10 items from ANALYSIS-002):

1. Headings are the index -- H2 sections are top-level; H3 sub-sections walked separately.
2. Derived sections are skipped, not parsed -- Progress Dashboard and Cross-Part Dependency Graph are regenerated by the renderer.
3. Wikilink as { ref } object -- preserves the wikilink-vs-plain distinction through the model.
4. Phase is derived from part id -- eliminates a drift surface.
5. Schema parse is the final step -- bugs surface as Zod issues at a known boundary.
6. details blocks in Tasks archive: assumes remark's table-finder recurses into HTML; may need to switch to plain H3 + table if remark drops content inside details.
7. Event types dispatch by Type field bullet -- discriminated union narrowing happens at Zod validation.
8. Bullet field map is forgiving -- unknown bullets ignored; Zod catches schema gaps.
9. bulletFieldMap matches both "- **Field**: value" and "- Field: value" -- accommodates LLM authoring variance.
10. ParseError carries a path array -- gives Zod-style locality for error messages.

**Parser edge cases surfaced** (5 items from ANALYSIS-002):

1. Pending User Decisions body shape -- stubbed to return [] for the common "None -- ..." case; real PUD body shape locks when first real use case emerges.
2. Bullet field map vs paragraph body ordering in events -- parser assumes bullets-first, paragraphs-after. Renderer enforces this order.
3. details collapse in Tasks archive -- depends on remark's HTML handling. Fallback: drop the collapse, use plain H3 + table.
4. Multi-line cell content in tables -- remark uses br for line breaks; parser may need br-to-newline mapping for cell content.
5. Frontmatter title quoting -- YAML single-quotes around colon-containing titles handled via js-yaml.

### Renderer layer at shared/composition/src/renderers/

Three files: plan-note.ts (renderPlanNote), session-note.ts (renderSessionNote), mermaid.ts (renderMermaid).

Renderer sketch from ANALYSIS-002 Appendix E. The renderer is the inverse of the parser: typed in-memory model to markdown string. Expected size ~150-200 LOC each for plan + session renderers. Uses unified + remark-stringify + remark-gfm for emission so the same AST library is used both directions.

**renderPlanNote** builds canonical AST in section order: frontmatter, H1 title, Scope (+ Source paragraph if present), Objectives (checkbox list), Progress Dashboard (derived table from parts substatus by phase), Cross-Part Dependency Graph (derived Mermaid from renderMermaid), Parts (H3 per part with bullet attrs + DoD + optional decisions table), Tasks (Active/Backlog/Archive sub-tables), Pending User Decisions, Editor Mirror IDs, Blockers, Observations, Relations.

**renderMermaid** is a pure function: renderMermaid(parts, layout) takes the parts array and produces a Mermaid flowchart string. Single source of truth for: canonical init block with theme/flowchart/curve/font/padding, classDef done + pending palette, subgraphs by phase if groupBy='phase', node label format "<icon> <b>id</b><br/><span>title</span>", edges from parts[].depends_on, class assignments from substatus to done|pending, linkStyle directives for sequential vs parallel edges.

**renderSessionNote** builds canonical AST: frontmatter, H1 title, Scope, Bound PLAN (bullet list with wikilink ref + worked_parts), Events (H3 per event with typed-field bullets first + prose body after), Observations, Relations.

### Mutation API at shared/composition/src/plan-mutations.ts + session-mutations.ts

Narrow set of typed mutations that read existing markdown, parse to typed model, mutate in-memory, validate via Zod, re-render entire document, write atomically. One disk write per mutation. Side-channel propagation (Progress Dashboard rollup, Cross-Part Deps Graph, status consistency checks) all happen automatically because they're derived during render.

Full mutation API sketches from ANALYSIS-002 Appendix F. Plan mutation types:

- **set-part-substatus**: partId, from, to, completing_session?, outcome? -- triggers automatic Progress Dashboard rollup + Cross-Part Deps Graph regeneration + Mermaid class reassignment
- **lock-decision**: partId, decisionId, topic -- updates the part's decisions table
- **flip-dod-item**: partId, dodIndex, done -- toggles a DoD checkbox
- **add-task**: task object (id, subject, part, agent, effort, status) -- adds to appropriate sub-table
- **transition-task**: taskId, from, to, atEvent? -- moves between Active/Backlog/Archive
- **surface-pending-decision**: pud object (id, part, question, options, surfaced_at_event, surfaced_session) -- adds to PUD array
- **resolve-pending-decision**: pudId, selectedOption -- removes from PUD array
- **add-blocker**: text -- adds to blockers list
- **clear-blockers**: removes all blockers

Session mutation types:

- **append-event**: event object (n, type, title, body, + type-specific fields) -- appends to events array with continuity validation

Each mutation is a typed input validated by Zod. The library function reads the markdown, parses to typed model, applies the mutation in-memory, runs schema validation, re-renders the entire document, writes atomically.

### PLAN template (trimmed form)

Full worked example in ANALYSIS-002 Appendix A. Delta from the current PLAN-001:

- Dropped sections: Workflow Plan (top-level prose), Decision Log, Progress Log, per-part Workflow Plan, per-part Tasks tables, per-part Intra-part Deps Graph, per-part Editor Mirror IDs, per-part Pending User Decisions
- Consolidated sections: Tasks (Active/Backlog/Archive at top level), Editor Mirror IDs (top level), Pending User Decisions (top level)
- Slimmed sections: per-part D-N substatus list (one-line topic per decision; verbose content in the ADR)
- Uniform per-part format: bullet list with bold-label colon-value pattern; DoD as the only checklist; decisions parts add a Locked decisions table
- Net effect: about 70% bulk reduction

### SESSION template (trimmed form)

Full worked example in ANALYSIS-002 Appendix B. Key properties:

- No standalone Tasks, Pending User Decisions, or Editor Mirror IDs sections -- those are PLAN state. Events reference them by ID.
- Each event has typed-field bullets at the start (Type, Part, Transition, Outcome, Decision IDs, Task, Agent, Verdict, Tally, P0/P1/P2) followed by free-text prose body.
- Event numbers are continuous starting at 1; first event must be session-start.

### Migration / dogfooding plan

Recommended sequence from ANALYSIS-002 Appendix I:

1. Build composition library + render scripts in current single-project layout. SPEC-007 owns this.
2. Achieve round-trip parity on PLAN-001 (or close -- modulo intentional template simplification).
3. Use the new tooling to re-author PLAN-001 in trimmed form. Dogfood the mutation API by applying historical state-changes via the typed mutations.
4. Migrate other plan/session notes to trimmed form incrementally as they're touched.
5. When composition is stable enough to start a 2nd package: trigger ADR-004 monorepo restructure.
6. Per-package Brain projects + per-package docs/ created during restructure.
7. Notes migrate to per-package destinations per the mapping in ANALYSIS-002 Appendix G.
8. Top-level docs/ retained only for cross-package coordination.

This sequence avoids the bulk migration-then-build cost. The new tooling matures incrementally against real fixtures. Restructure happens when there's actual demand (not speculatively).

### Monorepo restructure (deferred -- becomes ADR-004 when 2nd package starts)

Proposed layout from ANALYSIS-002 Appendix G: packages/composition/ (deterministic library), packages/decompose-recompose/ (skill pair), packages/defrag/ (skill), packages/ingest/ (skill). Each package has its own docs/ Brain project + src/ + tests/ + package.json. Top-level docs/ retained for cross-package coordination only.

Constraint: Brain MCP projects do NOT share wikilinks across project boundaries. Cross-project references in the monorepo MUST use file paths (relative or absolute), not wikilink syntax. Within a package, wikilinks resolve as normal.

Status: DEFERRED. The user pulled back from the monorepo restructure ("maybe I'm getting ahead of myself") in favor of capturing the design decisions first. The restructure becomes ADR-004 when there's actual demand for a 2nd package (i.e., when composition library is built enough that decompose-recompose starts).

## Open Items

NONE -- all 11 decisions (D-1 through D-11) are LOCKED. Implementation refinements happen during SPEC-007 authoring + build.

## Clarifications

_No clarifications yet._

## Observations

- [decision] D-1 locks markdown as authoritative state; DB is index/cache only #render-architecture #state-model
- [decision] D-2 establishes PLAN as forward-looking mutable state and SESSION as backward-looking append-only event ledger #responsibility-split #state-event
- [decision] D-3 removes LLM from content-modifying loop; deterministic Bun+TS scripts replace find_replace #drift-prevention #determinism
- [decision] D-4 Zod schema validates plan/session structures at parse and pre-write with cross-field invariants #validation #zod
- [decision] D-5 T-NN task IDs plan-scoped not session-scoped for unambiguous cross-session references #task-scoping #plan-lifecycle
- [decision] D-6 consolidates tasks at PLAN top level with Active/Backlog/Archive three-table split; about 70% bulk reduction #consolidation #bloat-reduction
- [decision] D-7 Mermaid dependency graph generated from part structure not hand-authored; eliminates styling drift class #render-separation #mermaid
- [constraint] D-8 round-trip property test mirrors ADR-001 F-8 SHA-256 identity invariant; CI gate #correctness-gate #property-test
- [decision] D-9 PUD and Editor Mirror IDs at PLAN top level as persistent state not per-part duplicates #consolidation #state-model
- [decision] D-10 Decision Log and Progress Log dropped from PLAN; event content belongs in SESSION per D-2 #responsibility-split #bloat-reduction
- [decision] D-11 Workflow Plan prose moved to skill docs; protocol documentation is invariant across plan instances #separation-of-concerns
- [insight] LLM-for-plan + script-for-execution pattern is the canonical anti-drift mechanism for any note class with structural integrity requirements #architectural-pattern #composition-library

## Relations

- implemented_by [[SPEC-008: Protocol Hardening Wave 2]]
- implements [[ANALYSIS-002: Plan/Session Note Render Architecture]]
- extends [[ADR-001: Composition Library Architecture]]
- pairs_with [[ADR-002: Adapter Contract and Plan Schema]]
- relates_to [[PLAN-001: Skills Ecosystem]]
- implemented_by [[SPEC-007: Plan/Session Render Implementation]]
