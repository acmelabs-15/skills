# Two-Step Edit Pattern

Every state transition during a session is a **2-step Brain MCP edit sequence**, followed by a project repo commit. Sourced from D-04 + Contract 5. Sync-graph was dropped because it didn't work properly; the canonical replacement is direct Brain MCP `edit_note` calls in sequence + immediate commit.

## The pattern (CRITICAL protocol)

```text
1. PLAN edit       — canonical state mutation
2. SESSION Event   — pointer ledger append
3. Project commit  — durability
```

All three execute in the **same turn**. Never batch across multiple events.

### Step 1 — PLAN edit (canonical state mutation)

Apply the state change via `mcp__plugin_brain_brain__edit_note` on the PLAN note:

- Update the part's `Substatus`, `Owning session`, `Completing session`, `Outcome`, or `d_n_substatus` row — whichever changed
- Use targeted `find_replace` for line-level changes (e.g., `**Substatus**: PENDING` → `**Substatus**: IN_PROGRESS`)
- Use `replace_section` for whole-subsection rewrites
- Use `append` for adding new parts or new log entries

This edit is the **source-of-truth mutation**. The new state is canonical the moment this edit lands.

### Step 2 — SESSION Event append (pointer ledger)

Append a new `## Event NN — {summary}` entry to the active session note via `mcp__plugin_brain_brain__edit_note` (operation `append`):

```markdown
## Event NN — <YYYY-MM-DD HH:MM> — <short title>

**Type**:         <agent-dispatch | decision-lock | state-change | halt | user-flag | drift-corrected | reflect-capture>
**Trigger**:      <wikilink or step ref>
**Outcome**:      <wikilink or status transition>
**Observations**: <[category]-tagged inline observations if any>

[Event-specific body — agent return summary, locked decision verbatim, halt details, etc.]
```

Per Contract 5: Event entries are append-only; never mutate prior Events. State-snapshot tables NEVER live inside an Event body — they live in `## Tasks` / `## Workflow Plan` / Scope sections of the PLAN (which MUTATE in place).

The Event body points at state that's already canonical (Step 1 already landed). Never the other way around.

### Step 3 — Project repo commit (durability)

Commit the .md changes to the project repo immediately:

```bash
git add docs/planning/PLAN-NNN-*.md docs/sessions/SESSION-*.md
git commit -m "plan: <one-line summary of the state change>"
```

Every PLAN or SESSION edit gets a project repo commit in the same turn — never batched across multiple events. Without this invariant, the commit boundary obscures which Event corresponds to which state change, and crash/branch-switch loses state that lives only in the working tree.

Commit message format:

| Action | Commit message |
|---|---|
| Part status transition | `plan: <part-id> <status-from> → <status-to>` |
| set-part-done | `plan: <part-id> done; outcome <wikilink>` |
| New part added | `plan: add part <part-id> in <phase>` |
| Decision lock (D-N) | `plan: lock D-{N} in <part-id>` |
| Scope evaluation finding | `plan: scope eval <part-id> {finding}` |
| Migration completion | `plan: migration complete; <N> artifacts bound` |

## Why this ordering matters

If Step 2 ran before Step 1, the Event would reference state that doesn't exist yet — a fresh reader following the Event's pointer hits an empty target. PLAN-first ensures the pointer always lands on canonical state.

If Step 3 is skipped (or batched), state changes survive only as long as the working tree. A crash or branch switch loses the state. Per-edit commits guarantee durability.

## Session note structure under /plan lifecycle (CANONICAL)

A session note created or maintained by any /plan-managed skill (`/plan` create/migrate/continue, `/research`, `/decisions`, `/spec`, `/build`, `/review`, `/end`) is a **pure temporal ledger**. PLAN owns workflow state; SESSION owns the chronological event log only.

### Canonical sections (in order)

```text
---
title: 'SESSION-YYYY-MM-DD_NN: {Project} {Topic}'
type: session
status: IN_PROGRESS | PAUSED | DONE
permalink: sessions/session-yyyy-mm-dd_nn-{project}-{topic-kebab}
tags: [session, {project-slug}, {phase-keyword}]
binds_to: PLAN-NNN                # optional: explicit PLAN binding when SESSION drives one part
---

# SESSION-YYYY-MM-DD_NN: {Project} {Topic}

**Scope**: one-paragraph description + PLAN binding wikilink ([[PLAN-NNN: ...]]) + Part(s) being worked on
**State**: (optional) one-paragraph snapshot of where the session left off

## Event 01 — {brief summary}
...
## Event NN — {brief summary}

## Observations
- [category] ... #tag

## Relations
- part_of [[PLAN-NNN: ...]]
- (other valid typed relations)
```

That's the entire structure. Nothing else.

### Sections FORBIDDEN in lifecycle-managed session notes

These are all owned by the PLAN note now (see `plan-note-schema.md` per-part scaffold). Do NOT add any of these to a session note:

| Forbidden section | Lives in PLAN at | Why forbidden in session |
|---|---|---|
| `## Workflow Plan` | PLAN top-level + per-part `#### Workflow Plan (for {part-id})` | State snapshot; goes stale immediately; pointers don't |
| `## Phase Progression` | PLAN top-level | Same — derived view of PLAN parts |
| `## Tasks` (and Active / Backlog / Archive tables) | PLAN per-part `#### Tasks (for {part-id})` | Tasks belong to PLAN parts; session events reference them via wikilink |
| `## Cross-Part Dependency Graph` / Mermaid deps graph | PLAN top-level + per-part `#### Intra-part Deps Graph` | Graph state mirrors PLAN; session refs PLAN graph by link |
| `## Pending User Decisions` | PLAN per-part `#### Pending User Decisions (for {part-id})` | Decisions queued per-part on PLAN |
| `## Editor Mirror IDs` / `## Tasks ID Mirror` | PLAN per-part `#### Editor Mirror IDs (for {part-id})` | T-ID ↔ CC-ID ↔ Cursor-ID mapping is PLAN-scoped |
| `## D-N substatus list` | PLAN decisions parts `#### D-N substatus list` | Per-decision lock state lives on PLAN |
| `## Progress Dashboard` | PLAN top-level | Rollup view of PLAN parts |
| Any state-snapshot table embedded in an Event body | PLAN MUTATE-in-place sections | Event bodies are append-only pointers; snapshots go stale |

### What session events DO carry

Event NN bodies hold POINTERS to PLAN-owned state, not duplicates:

- Wikilinks to changed PLAN parts (`[[PLAN-NNN: ...]] decisions.N: PENDING → IN_PROGRESS`)
- Wikilinks to other artifacts changed (`[[ADR-NNN: ...]] ACCEPTED`)
- `file:line` for code references
- Commit SHAs for git references
- Per-event Type / Trigger / Outcome / Observations fields (Contract 5)

If a future reader wants the current workflow state, they read the PLAN (canonical mutator). The session tells them WHEN each change happened and WHO (agent / user) drove it.

### Legacy session notes (pre-/plan-lifecycle)

Session notes created before the /plan lifecycle existed may contain `## Workflow Plan`, `## Phase Progression`, `## Tasks` sections because they doubled as workflow trackers when no PLAN existed. These are LEGACY and:

- Are preserved verbatim during `/plan --migrate` (Step 7 immutability rule — DONE session Scope is never rewritten retroactively)
- Should NOT be re-added when a new session is created under the /plan lifecycle
- Are referenced by `/plan --migrate` Step 7 + `workflow-migration.md:86` for "parse Scope + any prior Workflow Plan section" — that's a READ of legacy data, not a write of new sections

### Skill responsibilities

- **`/plan` create / migrate**: WRITES the session note (and PLAN). The session body it creates MUST conform to the canonical sections above. Pattern 2 three-phase write applies for the colon-in-title trap.
- **`/plan` continue, `/research`, `/decisions`, `/spec`, `/build`, `/review`, `/end`**: APPEND Event NN entries to the active session via two-step edit pattern. They never add new top-level H2 sections to the session.

### Audit check

When a session note is touched by any /plan-managed skill, the per-turn self-check should verify no forbidden section was added. A quick grep at end of turn:

```bash
grep -E '^## (Workflow Plan|Phase Progression|Tasks|Cross-Part Dependency Graph|Pending User Decisions|Editor Mirror IDs|Progress Dashboard)' docs/sessions/SESSION-*.md
```

Any hits in a freshly-created (post-/plan-lifecycle) session indicate drift and require removal before commit.

## Pattern 2 three-phase write (for new PLAN creation)

When creating a new PLAN note in create / migrate modes, the title contains a colon (`PLAN-NNN: Topic`). Brain MCP's `write_note` may preserve spaces in the derived filename if the title contains a colon. Always use the three-phase pattern (CONVENTIONS Section 1.7.2):

### Phase 1 — write_note with no-colon title

```text
mcp__plugin_brain_brain__write_note({
  title: "PLAN-001 Lifecycle Skills Rework",     # no colon
  content: "<full PLAN body>",
  directory: "planning",
  note_type: "plan",
  tags: ["plan", "workflow", "ideation", "lifecycle-skills-rework", "active"]
})
```

The file lands as `planning/PLAN-001 Lifecycle Skills Rework.md` — non-conforming, but fixed in Phase 3.

### Phase 2 — edit_note to insert colons

```text
mcp__plugin_brain_brain__edit_note({
  identifier: "planning/PLAN-001 Lifecycle Skills Rework",
  operation: "find_replace",
  find_text: "PLAN-001 Lifecycle Skills Rework",
  content: "PLAN-001: Lifecycle Skills Rework",
  expected_replacements: 2    # frontmatter title + H1
})
```

This inserts the colon into BOTH the frontmatter title AND the H1. Both must update in the same edit (use `expected_replacements: 2`).

### Phase 3 (MANDATORY) — move_note to rename file

```text
mcp__plugin_brain_brain__move_note({
  identifier: "planning/PLAN-001 Lifecycle Skills Rework",
  destination_path: "planning/PLAN-001-lifecycle-skills-rework.md"
})
```

Skipping Phase 3 leaves a malformed filename with spaces — violates CONVENTIONS Section 1.6.

### Verification

```text
mcp__plugin_brain_brain__list_directory({ dir_name: "planning" })
```

Confirm:
- Filename is kebab-case (`PLAN-001-lifecycle-skills-rework.md`)
- CAPS entity prefix preserved
- No spaces in filename
- Frontmatter title contains the colon
- H1 matches frontmatter title verbatim

## Edit-only updates (continue mode + set-part-done)

When updating an existing PLAN, the two-step pattern applies without Pattern 2 (the file already exists):

```text
1. edit_note on PLAN (find_replace or replace_section)
2. edit_note on SESSION (append a new Event NN)
3. git commit
```

No write_note, no move_note. The file structure is stable; only contents change.

## Batch operations (forbidden)

Common anti-patterns that violate the two-step pattern:

| Anti-pattern | Why forbidden |
|---|---|
| Edit PLAN for 5 D-N locks before appending 5 Events | Pointer ledger gets reconstructed from memory after the fact — drift between actual edit ordering and recorded ordering |
| Append Event before applying PLAN edit | Event references state that doesn't exist yet — fresh reader hits empty target |
| Commit at end of turn instead of per-event | Loses immediate-event-write invariant — commit boundary obscures which Event corresponds to which commit |
| Edit PLAN + Event but skip commit | State survives only in working tree — crash loses it |
| Skip Event entirely "because the PLAN already shows the change" | Loses the temporal log; future reader can't tell WHEN the change happened or which session was responsible |

## Two-step pattern for set-part-done

When `/plan` receives a Contract 1 `set-part-done` call from a phase skill:

```text
Step 1 — PLAN edit:
  Update the target part's:
    - outcome      → <wikilink from call>
    - status       → DONE | DEFERRED | ABANDONED (from call; default DONE)
    - completing_session → current session identifier

Step 2 — SESSION Event NN append:
  ## Event NN — Part {part-id} done — outcome [[<wikilink>]]

  **Type**:     state-change
  **Trigger**:  Skill(skill="plan", args="set-part-done ...") from {phase-skill}
  **Outcome**:  {part-id} <status-from> → <status-to>; outcome [[<wikilink>]]

  [Optional body: rationale if DEFERRED / ABANDONED; next-ready part identification]

Step 3 — Project commit:
  git commit -m "plan: {part-id} done; outcome <wikilink>"
```

## Two-step pattern for part status transitions

For PENDING → READY (dependency met):

```text
Step 1 — PLAN edit:
  find_replace on the part's **Substatus**: PENDING → **Substatus**: READY

Step 2 — SESSION Event append:
  ## Event NN — Part {part-id} unblocked: dependencies met

Step 3 — Commit.
```

For READY → IN_PROGRESS (part picked by /plan PLAN-NNN):

```text
Step 1 — PLAN edit:
  Update **Substatus**: READY → **Substatus**: IN_PROGRESS
  Set **Owning session**: [[SESSION-...: ...]]

Step 2 — SESSION Event append:
  ## Event NN — Part {part-id} started: auto-routed to /<phase>

Step 3 — Commit.
```

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Step 2 before Step 1 | Event points at non-existent state | Always PLAN edit first, then Event |
| Skipping Step 3 | State not durable; crash loses it | Always commit in same turn |
| Batching Step 3 across multiple events | Commit boundary obscures Event-to-state correspondence | One Event = one commit |
| Embedding state-snapshot tables inside Event bodies | Snapshots get stale immediately; pointers don't | Events reference state via wikilinks + file:line; snapshots live in PLAN MUTATE-in-place sections |
| Writing to PLAN via Read/Edit/Write | Bypasses Brain MCP's entity validation + embedding regeneration + event emission | Always use `mcp__plugin_brain_brain__edit_note` for `docs/**` notes |
| Using write_note with a colon-containing title | Triggers filename trap (spaces preserved) | Use Pattern 2 three-phase write (Phase 1 no-colon → Phase 2 insert colon → Phase 3 move_note to kebab) |
| Skipping Phase 3 of Pattern 2 | Leaves malformed filename with spaces | Always execute all 3 phases + verify via list_directory |
