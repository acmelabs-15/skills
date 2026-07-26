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
| status | yes | `IN_PROGRESS` while active; `DONE` after `/end` completes the final part; `PAUSED` is invalid for PLANs (PAUSED is a SESSION state, not a PLAN state) |
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
  status: <PENDING|READY|IN_PROGRESS|DONE|DEFERRED|ABANDONED|BLOCKED>
  dependencies: [<other part-ids>]           # READY = all deps DONE
  source_artifacts: [<wikilinks>]            # PRD/ADR/SPEC refs feeding this part
  outcome: <wikilink>                        # populated by set-part-done
  owning_session: <SESSION-YYYY-MM-DD_NN>    # set on status → IN_PROGRESS
  completing_session: <SESSION-YYYY-MM-DD_NN># set on status → DONE
  d_n_substatus:                             # ONLY for decisions parts
    - { id: D-1, status: <PENDING|LOCKED>, decision: <verbatim text> }
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

For split parts: append `.split` and successor letters (`.a`, `.b`, ...) — e.g., `decisions.1.split`, `decisions.1.a`, `decisions.1.b`.

## Body structure

The PLAN body holds derived views + per-part rich state. SESSION notes reference PLAN state via wikilinks; they never duplicate it.

### Required top-level sections (in order)

1. `## Scope` — one-paragraph workflow description + Workflow Type + Agent Sequence + complexity + risk
2. `## Objectives` — checklist of plan-level acceptance signals (all `[ ]` at draft)
3. `## Progress Dashboard` — rollup table (Phase × {DRAFT/IN_PROGRESS/BLOCKED/DONE} counts)
4. `## Workflow Plan` — phase/wave structure with source-artifact traceability
5. `## Phase Progression` — table of phase status + output artifacts
6. `## Cross-Part Dependency Graph` — Mermaid graph showing inter-part dependencies
7. `## Decision Log` — plan-level decisions (e.g., creation event, scope-evaluation outcomes)
8. `## Progress Log` — chronological part transitions
9. `## Blockers` — open blockers (none if clean)
10. Phase H2s (`## Analysis`, `## Decisions`, etc.) — each contains per-part H3s
11. `## Risks` — top 2-3 critical risks from pre-mortem (create mode Step 8)
12. `## Observations` — penultimate; universal invariant
13. `## Relations` — last; universal invariant

### Per-part H3 structure

Each part section under a phase H2 follows:

```markdown
### {part-id} — {Concrete scope descriptor}

**Substatus**: <PENDING|READY|IN_PROGRESS|DONE|DEFERRED|ABANDONED|BLOCKED|SPLIT>
**Owning session**: [[SESSION-...: ...]] OR —
**Completing session**: [[SESSION-...: ...]] OR —
**Outcome**: [[<entity wikilink>]] OR — (will be [[...]])
**Source artifacts**: [[...]], [[...]]

**DoD**:
- [ ] {acceptance signal 1}
- [ ] {acceptance signal 2}

#### Workflow Plan (for {part-id})
{phase-specific protocol summary}

#### Tasks (for {part-id})
{Active / Backlog-Unblocked / Backlog-Blocked / Archive tables}

#### Intra-part Deps Graph (Mermaid)
{nodes scoped to this part}

#### D-N substatus list      (ONLY for decisions parts)
{Contract 6 d_n_substatus rendered as a table}

#### Editor Mirror IDs (for {part-id})
{T-ID ↔ CC-ID ↔ Cursor-ID mapping if Tasks tools are in use}

#### Pending User Decisions (for {part-id})
{open questions awaiting user response}
```

The per-part scaffold is rich (Workflow Plan, Tasks, Deps Graph, D-N substatus list, Editor Mirror IDs, Pending User Decisions). All work-tracking state lives here in the PLAN; SESSION holds Events + Scope pointer only.

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
- contains [[ANALYSIS-NNN: ...]]            # bound analyses (esp. migrate mode)
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
| Update Progress Dashboard | `edit_note` with `replace_section` on `## Progress Dashboard` |
| Append Decision Log entry | `edit_note` with `append` to `## Decision Log` |
| Update Cross-Part Deps Graph | `edit_note` with `replace_section` on `## Cross-Part Dependency Graph` |
| Add `Observations` | `edit_note` with `append` to `## Observations` |
| Add `Relations` | `edit_note` with `append` to `## Relations` (apply bi-directional inverse to target note in same pass) |

Always apply the two-step edit pattern (`references/two-step-edit-pattern.md`): PLAN edit first, SESSION Event append second, project repo commit third.
