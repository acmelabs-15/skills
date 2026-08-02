# PLAN Note Schema

Authoritative schema for PLAN note frontmatter + per-part structure. Sourced from D-12 Contract 6 (per-part schema) + Contract 7 (status enums) + Contract 8 (complexity tier).

## Frontmatter

```yaml
---
title: "PLAN-{NNN}: {Workflow Type} — {Project Name}"
type: plan
status: IN_PROGRESS                          # PLAN-note status enum (Contract 7)
complexity_tier: TIER_1|TIER_2|TIER_3|TIER_4|TIER_5
branches:                                    # chronological history; most-recent-last is the current branch
  - <derived-branch-name-1>                  # appended on each new /plan invocation that does work
  - <derived-branch-name-2>                  # prior entries are historical (typically merged or abandoned)
permalink: planning/plan-{nnn}-{workflow-kebab}-{project-slug}
tags: [plan, workflow, {workflow-kebab}, {project-slug}, active]
---
```

### Frontmatter field rules

| Field | Required | Notes |
|---|---|---|
| title | yes | `PLAN-NNN: {Topic Title Case}` (colon + space + Title Case) |
| type | yes | Always `plan` |
| status | yes | `IN_PROGRESS` while active; `PAUSED` when parked between sittings; `DONE` after `/end` completes the final part |
| complexity_tier | yes after `/research` Step 2 | One of `TIER_1..TIER_5`. May be `TBD` in create mode pre-research; first downstream phase skill HALTs if still `TBD` (per Contract 8) |
| branches | yes; populated on first creation | YAML list of all branches the PLAN has used, chronological (most-recent-last). Each `/plan` invocation that does work appends a new entry — branches are not reused across work units. The most recent entry is the active branch; prior entries are historical (typically merged or abandoned). See branch policy in SKILL.md. |
| permalink | yes | `planning/{filename-stem-kebab-lowercase}` |
| tags | yes | 2-5 entries; lowercase; include `plan`, the workflow type kebab, the project slug, and `active` while in-progress (replace `active` with `done` when status → DONE) |

### Counter check before write

Run `mcp__plugin_brain_brain__list_directory({ dir_name: "planning" })` to find the highest existing `PLAN-NNN`. Use `NNN+1` for the new note.

### Note creation (CONVENTIONS Section 1.7.2)

PLAN creation is a single `write_note` call. Brain MCP intercepts `write_note` to author the file with a kebab filename + bare permalink and index it immediately — pass the full colon title directly:

`write_note(title: "PLAN-001: Lifecycle Skills Rework", directory: "planning", project: …)` → file `planning/PLAN-001-lifecycle-skills-rework.md`, permalink `planning/plan-001-lifecycle-skills-rework`, queryable immediately. No `edit_note`/`move_note` follow-up.

## PLAN-part schema (Contract 6)

Each part in the PLAN is an entry with these fields:

```yaml
- id: <part-id>                              # e.g., "research", "decisions.1", "spec.SPEC-001"
  phase: <research|decisions|spec-decomposition|spec|build|review|end>
  status: <PENDING|READY|IN_PROGRESS|BLOCKED|FAILED|DONE|DEFERRED|ABANDONED>
  dependencies: [<other part-ids>]           # READY = all deps DONE
  source_artifacts: [<wikilinks>]            # PRD/ADR/SPEC refs feeding this part
  outcome: <wikilink>                        # populated by set-part-done
  owning_session: <SESSION-YYYY-MM-DD_NN>    # set on status → IN_PROGRESS
  completing_session: <SESSION-YYYY-MM-DD_NN># set on status → DONE
  d_n_substatus:                             # ONLY for decisions parts
    - { id: D-1, status: <PENDING|LOCKED|REJECTED|DEFERRED>,
        topic: <short label for what is being decided>,
        decision: <the chosen option, verbatim> }
```

### Status transitions (Contract 7)

```text
PENDING → READY                  (all dependencies reach DONE)
READY   → IN_PROGRESS            (auto-routing picks the part; owning_session set)
IN_PROGRESS → DONE               (set-part-done call; completing_session + outcome set)
IN_PROGRESS → DEFERRED           (set-part-done with status=DEFERRED + rationale)
IN_PROGRESS → ABANDONED          (set-part-done with status=ABANDONED + rationale)
any → BLOCKED                    (transient; resolves back to prior state once unblocked)
```

`DEFERRED` and `ABANDONED` require a `rationale` field per Contract 1.

### Part ID conventions

| Phase | Part ID pattern | Example |
|---|---|---|
| research | `research` | `research` |
| decisions | `decisions.{N}` | `decisions.1` (1-based; one part per ADR cluster) |
| spec-decomposition | `spec-decomposition` | `spec-decomposition` |
| spec | `spec.SPEC-{NNN}` | `spec.SPEC-001` (one part per approved SPEC) |
| build | `build.SPEC-{NNN}` | `build.SPEC-001` (one part per SPEC build cycle) |
| review | `review` | `review` |
| end | `end` | `end` |

There is no split-part form. `.split` and successor letters were specified here and admitted by nothing: the part-id grammar had no such pattern, there was no `SPLIT` substatus, and a part in one would have been non-terminal — permanently blocking its plan from reaching DONE.

Ids outside the patterns above still PARSE, and are reported as non-canonical rather than rejected. One bad id used to fail its entire document, which meant none of the real state inside it could be validated either.

## Body structure

The PLAN body holds derived views + per-part rich state. SESSION notes reference PLAN state via wikilinks; they never duplicate it.

### Required top-level sections (in order)

1. `## Scope` — one-paragraph workflow description + Workflow Type + Agent Sequence + complexity + risk
2. `## Objectives` — checklist of plan-level acceptance signals (all `[ ]` at draft)
3. `## Phase Status` — **generated; not yet implemented** (see the notice below — do not author by hand)
4. `## Sequence` — **generated; not yet implemented** (see the notice below — do not author by hand)
5. `## Phase Progression` — per-part H3s, or a phase-status summary with the parts under phase H2s
6. Phase H2s (`## Research`, `## Decisions`, `## Build`, …) — each contains per-part H3s
7. `## Tasks` — session-scoped work items, partitioned `Active` / `Archive`
8. `## Pending User Decisions` — open questions awaiting an answer
9. `## Blockers` — open blockers (none if clean)
10. `## Risks` — execution and sequencing risks from the pre-mortem run when the plan is created
11. `## Observations` — penultimate; universal invariant
12. `## Relations` — last; universal invariant

Sections not in this list are preserved verbatim through a parse-render round trip rather than dropped, so a plan carrying `## Workflow Plan`, `## Decision Log`, `## Progress Log` or anything else keeps it.

### Status and sequence are generated, never authored

> **NOT YET IMPLEMENTED.** The rule below is decided, and the renderer does not do it yet: it emits neither section, and neither name is in the parser's modelled-heading set. So a hand-authored `## Phase Status` or `## Sequence` is preserved verbatim as an unmodelled section rather than replaced — which is the drift this rule exists to prevent. **Until the renderer emits them, do not author either section by hand.** The generator is deferred with the wider template work, because the sequence view depends on whether waves become a modelled concept.

A PLAN's job is the status, the sequence, and the state of phases and their parts. Two sections carry that and **both are generated from `parts` on every render**:

1. `## Phase Status` — one row per phase: the phase, its parts done over total, and its status. Answers "where is this" without reading the parts.
2. `## Sequence` — a Mermaid graph computed from each part's `depends_on`. Answers "what runs next to what".

Neither is hand-authored, and neither is hand-maintained. Plain styling, computed from the parts, nothing to maintain by hand — so neither can drift from the state below it. Do not hand-write either one: the next render replaces it.

Two older headings are removed on render and do not come back: `## Progress Dashboard` and `## Cross-Part Dependency Graph`. Both were hand-maintained rollups of the same information the two generated sections now carry. A file still carrying one parses without error and loses the section on output.

Why generated rather than preserved: a hand-maintained summary drifts from the parts it summarises, and a summary that disagrees with the state below it is worse than no summary — a reader cannot tell which is true. Generation makes the summary a view of the state rather than a second copy of it.

### Per-part H3 structure

Each part section under a phase H2 follows:

```markdown
### {part-id} — {Concrete scope descriptor}

**Substatus**: <PENDING|READY|IN_PROGRESS|BLOCKED|FAILED|DONE|DEFERRED|ABANDONED>
**Owning session**: [[SESSION-...: ...]] OR —
**Completing session**: [[SESSION-...: ...]] OR —
**Outcome**: [[<entity wikilink>]] OR — (will be [[...]])
**Source artifacts**: [[...]], [[...]]

**DoD**:
- [ ] {acceptance signal 1}
- [ ] {acceptance signal 2}

#### impl-TASK-NNN-SPEC-NNN      (build parts only)
{per-TASK build workflow item fields}
```

The only H4 a part body carries is a build workflow item, and only in `build.SPEC-NNN` parts. Six other per-part H4 scaffolds were documented here and emitted by nothing, read by nothing: `Workflow Plan`, `Tasks`, `Intra-part Deps Graph`, `D-N substatus list`, `Editor Mirror IDs` and `Pending User Decisions`, each `(for {part-id})`.

They are removed rather than left as aspiration. The parser treats every H4 in a part body as a build workflow item, and now fails loudly on one it cannot read instead of skipping it silently — so a part actually authored to the scaffold above would hard-fail. The scaffolds survived only because that silent skip hid them.

Where their content belongs: workflow protocol is skill documentation, not plan state; a per-part task table is the plan-level `## Tasks` register filtered by its `Part` column; a per-part dependency graph is derivable from `Depends On`; the decisions substatus list is the part's own decisions table; editor mirror ids and pending decisions live at plan top level.

All work-tracking state lives in the PLAN; SESSION holds Events + a Scope pointer only.

## Observations + Relations

Universal invariant per CONVENTIONS Section 4.0: every PLAN note ends with `## Observations` then `## Relations` — no section after Relations.

### Observation pattern (Contract 6 part-level + plan-level mix)

```markdown
## Observations
- [decision] Plan created on YYYY-MM-DD covering {N} phases for workflow type {Type} #status
- [decision] Phase-keyed structure with per-part substatus + owning session + outcome wikilink #structure
- [constraint] Analysis surfaces options-with-pros/cons only; Decisions phase locks #separation-of-concerns
- [requirement] Every IN_PROGRESS part has an owning session — recoverability invariant #recoverability
- [requirement] Every DONE part has both completing_session AND outcome wikilink #provenance
```

### Relations pattern

```markdown
## Relations
- contains [[SESSION-YYYY-MM-DD_NN: ...]]   # bound sessions
- contains [[ANALYSIS-NNN: ...]]            # analyses bound to this plan's parts
- contains [[ADR-NNN: ...]]                 # bound ADRs
- contains [[SPEC-NNN: ...]]                # bound SPECs
- implements [[EPIC-NNN: ...]]              # if part of an EPIC
- relates_to [[PRD-NNN: ...]]               # if PRD-driven
- pairs_with [[sync-jira]]                  # standard pairing
- pairs_with [[brain:---adr-review]]        # standard pairing
```

Bi-directional rule (CONVENTIONS Section 4.4): when PLAN `contains [[SESSION-X]]`, edit SESSION-X to add `part_of [[PLAN-NNN]]` in the same pass.

## Edit operations

| Update | Operation |
|---|---|
| Part substatus change | `edit_note` with `find_replace` on the `**Substatus**:` line |
| Add new part | `edit_note` with `append` at the appropriate phase H2 |
| Phase Status / Sequence | Never edited — both are generated from `parts` on every render |
| Append Decision Log entry | `edit_note` with `append` to `## Decision Log` |
| Add `Observations` | `edit_note` with `append` to `## Observations` |
| Add `Relations` | `edit_note` with `append` to `## Relations` (apply bi-directional inverse to target note in same pass) |

Always apply the two-step edit pattern (`references/two-step-edit-pattern.md`): PLAN edit first, SESSION Event append second, project repo commit third.
