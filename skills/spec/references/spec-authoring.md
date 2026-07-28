# SPEC Authoring — Stage 2 Full Pipeline (Per-SPEC)

The Stage 2 pipeline authors the full SPEC subtree for one approved SPEC. Authoring order is non-negotiable: REQ → DESIGN → TASK → SPEC root. SPEC root last because its Artifact Status listings reference real notes; authoring it first creates broken wikilinks.

## Pipeline overview

```text
Step 1: Create SPEC folder + reserve SPEC counter
Step 2: Author REQ notes (one per requirement)
Step 3: Author DESIGN note(s)
Step 4: Author TASK notes
Step 5: Author SPEC root note LAST
Step 6: Bi-directional relation closure
Phase 3: Validation (CONVENTIONS Section 8 pre-flight + post-write)
ADR coverage gate: every ACCEPTED ADR has implemented_by [[SPEC-N]]
Gate A: Semantic gap analysis (analyst as requirements reviewer)
Gate B: 4 binary drift checks (REQ→ADR, scope conservation, TASK→REQ, scope-in match)
Final:  flip SPEC DRAFT → ACCEPTED; set-part-done
```

## Step 1 — Create SPEC folder + reserve SPEC counter

1. Run `mcp__plugin_brain_brain__list_directory({ dir_name: "specs" })` to find the highest existing SPEC-NNN (counter-availability check; prevents collisions if multiple authoring passes run).
2. Determine the SPEC folder name. Pattern: `SPEC-NNN-{feature-kebab-descriptor}` from the Stage 1 cluster definition (e.g., `SPEC-001-core-grid-display`, `SPEC-002-sorting`).
3. The folder is created implicitly when the first note inside it is written via `write_note` with the folder path.

**G2 resume**: skip Step 1 if the SPEC folder exists.

## Step 2 — Author REQ notes (one per requirement)

For each requirement identified in the Stage 1 cluster, create a REQ note.

- Filename: `REQ-{NNN}-SPEC-{NNN}-{descriptor}.md`
- Title: `REQ-{NNN}-SPEC-{NNN}: {Descriptor in Title Case}`
- Folder: `specs/SPEC-NNN-{feature-kebab}/requirements/`
- Single `write_note` call passing the full colon title (CONVENTIONS Section 1.7.2)

Required sections (see `spec-templates.md` for full template):

- Requirement Statement (EARS format: WHEN / THE SYSTEM SHALL / SO THAT)
- Acceptance Criteria (GIVEN / WHEN / THEN bulleted checklist; all `[ ]` at draft)
- Implementation Notes (technical hints, library specifics — NOT full design)
- Consumer Implementation Pattern (when the requirement is API-shaped — show usage)
- `## Observations` (always penultimate)
- `## Relations` (always last)

REQ counter restarts per SPEC (REQ-1, REQ-2, ... within SPEC-001; REQ-1, REQ-2, ... within SPEC-002; per CONVENTIONS Section 2.2).

**G2 resume**: skip REQs already authored; only create missing ones.

## Step 3 — Author DESIGN note(s)

Most SPECs have one DESIGN note; complex SPECs may have multiple. DESIGN captures the technical design that REQs depend on: module shapes, interfaces, algorithms, data structures.

- Filename: `DESIGN-{NNN}-SPEC-{NNN}-{descriptor}.md`
- Title: `DESIGN-{NNN}-SPEC-{NNN}: {Descriptor in Title Case}`
- Folder: `specs/SPEC-NNN-{feature-kebab}/design/`

Required sections per `spec-templates.md` DESIGN template: Context, Module Structure, Interfaces, Algorithms, Data Flow, Edge Cases, Performance / Security / A11y considerations, `## Observations`, `## Relations`.

**G2 resume**: skip DESIGNs already authored.

## Step 4 — Author TASK notes

Each TASK is an atomic work unit a single implementer can complete in 1-3 days. TASK notes are the input to /build per-task cycle.

- Filename: `TASK-{NNN}-SPEC-{NNN}-{descriptor}.md`
- Title: `TASK-{NNN}-SPEC-{NNN}: {Descriptor in Title Case}`
- Folder: `specs/SPEC-NNN-{feature-kebab}/tasks/`
- Frontmatter status: `TODO` at draft; `effort: S|M|L`; `estimate: Nd`

Required sections (see `spec-templates.md` for full template):

- Design Context (which DESIGN section this TASK realizes)
- Objective (one sentence)
- Scope (In Scope / Out of Scope)
- Implementation Notes
- Files Affected (table: File | Action | Purpose)
- Testing Requirements
- Definition of Done (checklist — all `[ ]` at draft; one `[ ]` per acceptance criterion; traceable back to a REQ)
- ADR Compliance (when relevant — checklist verifying ADR Cross-cutting Constraints are honored)
- Effort Summary (3-tier table: Human / AI-Dominant / AI-Assisted)
- `## Observations`, `## Relations`

**Estimate reconciliation** (per the estimate-reconciliation cross-cutting principle): if rolled-up TASK estimates diverge >10% from SPEC-level estimate (from Stage 1 cluster effort), HALT and require documented reconciliation: (a) update SPEC estimate, (b) document rationale, or (c) flag for user review.

**G2 resume**: skip TASKs already authored.

## Step 5 — Author SPEC root note (LAST)

The SPEC root rolls up everything beneath it. Authoring it last means counts are known and Artifact Status listings can be built accurately.

- Filename: `SPEC-NNN-{feature-kebab}.md` (inside the spec's own folder, alongside `requirements/` / `design/` / `tasks/`)
- Title: `SPEC-NNN: {Feature Title in Title Case}`
- Folder: `specs/SPEC-NNN-{feature-kebab}/`
- Frontmatter status: `ACCEPTED` (specs born ACCEPTED after /decisions locks ADRs; IN_PROGRESS is the implementation state set by /build)

Required sections (see `spec-templates.md` for full template):

- Context (what this SPEC implements; foundational facts; ADR citations)
- Scope (In Scope = bulleted REQ list; Out of Scope = explicit non-goals + cross-SPEC delegations)
- Phases (P0 / P1 / P2 groupings if the SPEC sequences work)
- Effort Summary (3-tier table)
- Success Criteria (one-line acceptance signals; all `[ ]` at draft)
- Artifact Status (Requirements / Designs / Tasks sub-listings with `[ ]` checkboxes + wikilinks)
- ADR Cross-cutting Constraints (when applicable per Stage 1 clustering)
- Progress Log (empty at draft; populated by /build during implementation)
- `## Observations` (penultimate)
- `## Relations` (last) — `implements [[ADR-N: ...]]` for every ADR this SPEC realizes; `part_of [[EPIC-NNN: ...]]` if an EPIC exists; `relates_to [[ANALYSIS-NNN: ...]]` etc.

**G2 resume**: skip if SPEC root exists; verify status is `ACCEPTED` (per the born-ACCEPTED invariant — SPECs are created at status ACCEPTED in Step 5; DRAFT status indicates Step 5 didn't complete and the root needs re-authoring).

## Step 6 — Bi-directional relation closure

See `bi-directional-relation-closure.md` for the full procedure. Summary:

For every relation authored in steps 2-5, verify the bi-directional inverse exists on the target note (per CONVENTIONS Section 4.4):

- Every SPEC's `implements [[ADR-N]]` → edit the ADR to add `implemented_by [[SPEC-N: ...]]`
- Every REQ's `part_of [[SPEC-N]]` → SPEC's Relations already contains `contains [[REQ-N-SPEC-N: ...]]` via Artifact Status; verify the listing matches exactly
- Every TASK's `implements [[DESIGN-N-SPEC-N]]` → edit DESIGN to add `implemented_by [[TASK-N-SPEC-N: ...]]`
- Every TASK's `implements [[REQ-N-SPEC-N]]` → edit REQ to add `implemented_by [[TASK-N-SPEC-N: ...]]`

If a wikilink target doesn't exist: HALT via `spec-bi-dir-target-missing-halt`; the wikilink was wrong; fix the source note's relation.

## Phase 3 — Validation

Run the pre-flight + post-write checks from CONVENTIONS Section 8 against every newly-authored note. See `authoring-workflow.md` for the full validation script. Highlights:

- Filename kebab-case with CAPS entity + parent prefixes
- Frontmatter title format `{ENTITY-ID}: {Descriptor Title Case}` matching H1 verbatim
- Permalink = folder + filename-stem-lowercased
- Observations ≥3 with `[category]` + 1-3 `#tags`; H3 sub-grouping when >15
- Relations ≥2 using only the 11 valid relation types; H3 type-grouping when >12
- Final two sections invariant: `## Observations` then `## Relations` — no section after Relations
- No `[x]` checkboxes at draft (DRAFT specs have all `[ ]`)
- No duplicate frontmatter blocks
- No bare entity references in body text (every reference is `[[Wikilinked]]` with colon)

Any pre-flight failure: HALT via `spec-preflight-halt`; fix the violation; resume.

## ADR coverage gate

After Phase 3 finishes for the last SPEC in the part, run this audit:

1. `mcp__plugin_brain_brain__list_directory({ dir_name: "decisions" })` → list every ACCEPTED ADR
2. For each ADR, `mcp__plugin_brain_brain__search({ query: "implemented_by [[SPEC-" })` scoped to the ADR
3. Any ADR without an `implemented_by` relation → uncovered

If any ADR uncovered: HALT via `spec-adr-coverage-uncovered-halt`; surface to user with options:

- Amend Stage 1 clustering to include the uncovered ADR (loop back to Stage 1)
- Document explicit deferral with rationale in PLAN Decision Log
- Author an additional SPEC covering the uncovered ADR(s) immediately

## Gate A — Semantic gap analysis

After Phase 3 syntactic validation + ADR coverage gate, dispatch:

```text
Task(subagent_type="brain:🧠-analyst")
```

Brief:

> "You are reviewing SPEC-NNN as a requirements analyst with adversarial framing. For each REQ in this SPEC, ask: can this be verified pass/fail given the current EARS clause + acceptance criteria + DESIGN context? Flag anything vague, anything that requires runtime judgment, anything where two reasonable implementers would build different things. Cite REQ section evidence for every flag. 'Spec looks fine' is a failure mode — find at least one concrete concern."

HALT on any flagged REQ via `spec-gate-a-halt`; refine the requirement (more specific EARS clause; tighter acceptance criteria; clearer DESIGN section); re-run Gate A.

## Gate B — 4 binary drift checks

Dispatch:

```text
Task(subagent_type="brain:🧠-critic")
```

Brief includes adversarial framing AND the 4 binary checks. Critic verifies all four; HALT on any FAIL:

### (a) REQ → ADR traceability

Every REQ traces to at least one ADR via Relations (`implements [[ADR-N]]`) OR via parent SPEC's `implements` set. Orphan REQs are scope creep.

Method: for each REQ, check Relations section for `implements [[ADR-` OR check parent SPEC's `implements` set covers the REQ's scope.

HALT: `spec-gate-b-a-halt`. Resolution: add `implements [[ADR-N]]` to the REQ OR document why the REQ extends scope beyond the ADR set.

### (b) Scope conservation

No REQ adds scope beyond the ADR set without explicit documented rationale (ADR amendment OR SPEC body note explaining the extension).

Method: cross-reference each REQ's scope against the ADR set; flag any REQ that introduces capabilities not present in any ADR.

HALT: `spec-gate-b-b-halt`. Resolution: add scope-extension rationale in SPEC body OR amend the source ADR.

### (c) TASK → REQ traceability

Every TASK has at least one `implements [[REQ-N-SPEC-N: ...]]` relation. Orphan TASKs are implementation drift.

Method: for each TASK, check Relations section for `implements [[REQ-`.

HALT: `spec-gate-b-c-halt`. Resolution: add `implements` relation; OR if the TASK genuinely doesn't map to a REQ, either author the REQ first OR remove the TASK.

### (d) Scope-In match

SPEC's `## Scope` In Scope sub-section matches the SPEC Clustering analysis from Stage 1. Divergence requires documented justification or revision.

Method: compare SPEC In Scope REQ list vs Stage 1 cluster's REQ list (from `ANALYSIS-NNN: SPEC Clustering`).

HALT: `spec-gate-b-d-halt`. Resolution: align SPEC scope to Stage 1 cluster OR document scope-change rationale (which may require revisiting Stage 1 if substantive).

## Final — Flip SPEC DRAFT → ACCEPTED + set-part-done

On Gate A PASS + Gate B PASS:

1. Edit SPEC root frontmatter: `status: DRAFT → ACCEPTED` via Brain MCP `edit_note`
2. Apply two-step edit (SPEC edit → SESSION Event NN append → project repo commit)
3. `Skill(skill="plan", args="set-part-done plan=PLAN-NNN part=spec.SPEC-NNN outcome=[[SPEC-NNN: ...]]")`

/plan flips the part status → DONE; the next `spec.SPEC-NNN` (if more SPECs in this decomposition) OR the first `build.SPEC-NNN` becomes READY; /plan surfaces next-ready part as recommendation.

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Authoring SPEC root before children | Artifact Status listings broken | Author REQs → DESIGN → TASKs → SPEC root |
| Premature `[x]` in DRAFT specs | Misleads rollup | All `[ ]` at draft; /build flips |
| Asymmetric relations (no inverse) | Breaks graph traversal | Always add inverse in Step 6 |
| Bare entity references | Breaks search-with-relations | Always `[[Wikilinked]]` with colon |
| Skipping ADR coverage gate | Spec layer claims complete with uncovered ADRs | Run gate before declaring done |
| Skipping Gate A or B | Quality issues surface in /build | Both gates MANDATORY before DRAFT → ACCEPTED |
| Single architect dispatch for entire SPEC subtree | Loses per-artifact sign-off granularity | Per-note authoring; orchestrator-driven OR per-note agent dispatch |
| Project-slug SPEC folders (SPEC-001-polar-mcp) | Conflates project with feature | Feature-themed slugs (SPEC-001-core-grid-display) |
| Estimate reconciliation skipped | Rollup drifts; downstream estimates wrong | If TASK rollup diverges >10% from SPEC estimate, halt and reconcile |
