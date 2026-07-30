---
name: plan
description: This skill should be used when the user asks to "start a new session", "plan this work", "create a workflow plan", "continue PLAN-NNN", "what's next on PLAN-NNN", "pick up the plan", "go to the build phase of PLAN-NNN", "kick off planning for X", "set up tracking for X", or invokes /plan with or without a position. Authors and maintains PLAN notes that track lifecycle work across sessions with phase-keyed parts, complexity-tier classification, and auto-routing to phase skills (/research, /decisions, /spec, /build, /review). Takes a POSITION, never a verb - no argument creates a plan, and PLAN-NNN followed by an optional phase and part opens one and drills to that point. Do not use for note surgery — splitting or merging notes is decompose and recompose, invoked directly on the note.
user-invocable: true
---

# /plan

Lifecycle planning skill for the Brain knowledge graph. Author PLAN notes, track work across sessions via phase-keyed parts, auto-route to phase skills.

## Invocation

`/plan` takes a POSITION, not a verb. Either you pass nothing and get a new plan, or you name where to go and it drills in.

| Invocation | Meaning |
|---|---|
| `/plan "<description>" [--name <slug>]` | No position — create a new PLAN note, branch and session |
| `/plan PLAN-NNN` | Open the plan; auto-route to the next-ready part |
| `/plan PLAN-NNN <phase>` | Drill to that phase |
| `/plan PLAN-NNN <phase> <part>` | Drill to that part |

There is no `create`, `split`, `scope` or `migrate` verb, and no `--part` flag — depth is expressed by how much of the coordinate you supply. `continue` and `continue-part` were the same act at two depths, which is why they collapse into one form.

Two things `/plan` deliberately does NOT do. It does not restructure notes: splitting a note into several, or merging several into one, is `decompose` and `recompose`, invoked directly on the notes. And it does not retrofit itself onto existing work automatically; a plan is authored, and no phase skill halts a session to make you run a plan mode.

Flags applicable across modes:

- `--name <slug>` — override auto-derived PLAN title + branch name with the user-provided slug. See "Name override" in cross-cutting behaviors.

### Role of /plan in the rigid cycle

> /plan is the lifecycle orchestrator. It holds sequence and status: when a build part advances, /plan's renderer emits the per-TASK impl + qa items as a progress rollup, and the dispatch briefs are rendered separately from the TASK/REQ/DESIGN subtree by `build/scripts/dispatch-implementer.ts` and `dispatch-qa.ts`. /plan never elides the cycle steps a–u. On failed QA, /plan re-enters step (a) for the same TASK with the orchestrator's fix-brief.

## Per-TASK build+QA cycle

The cycle is defined once, in `../build/references/per-task-build-qa-cycle.md`. Read it there; it is not restated here.

What /plan owns in that cycle is the lifecycle: it holds part sequence and status, advances ONE TASK at a time (NO batching, NO shortcuts), and records each impl/qa transition as a PLAN state change paired with a SESSION Event. The dispatch briefs are not /plan's — they are rendered from the TASK/REQ/DESIGN subtree by the two `build/scripts/dispatch-*.ts` scripts.

## Cross-cutting behaviors

### Branch policy

If the current branch is `main` or `master`, derive a NEW branch name and create + switch. Each `/plan` invocation that does work produces a new branch — a PLAN typically spans many branches over its lifecycle (one per wave, part, split, or atomic deliverable). Branches are not reused; the PLAN's `branches` frontmatter list tracks them all chronologically. Derivation precedence:

1. If `--name <slug>` was provided: branch = `feat/plan-NNN-<slug>` (where NNN is the resolved PLAN counter for the invocation; in create + migrate modes, that's the new PLAN's NNN).
2. Otherwise: derive a slug from the SPECIFIC WORK being done in this invocation (e.g., `adr-001-split`, `decisions-2-concurrency`, `spec-decomposition`), not from the PLAN topic alone. The slug MUST differentiate this work unit from prior branches on the same PLAN. Pick a sensible prefix (feat / fix / refactor / docs / chore / test / perf / build / ci / style / migration / etc.).

Append the chosen branch to the PLAN frontmatter `branches` list (chronological history). The most recent entry is the current branch; prior entries are historical (typically merged or abandoned). Print a one-line info: "Created and switched to branch `<name>`." Do NOT prompt for confirmation.

If the current branch is non-main, proceed without changing branch.

On conflict (derived name matches an existing local branch):
- ALWAYS AskUserQuestion offering (a) suffix derived name with `-v2` (`-v3`, …), (b) provide a custom name. NEVER auto-checkout an existing branch — it likely represents prior (possibly merged) work, and reusing it pollutes that branch's history with unrelated commits.

### Name override (`--name <slug>`)

When `--name <slug>` is provided, the slug overrides auto-derivation in TWO places:

1. **PLAN title** (when creating a plan): `PLAN-NNN: <Title Case of slug>` instead of derived from description (create) or default (migrate). De-kebab the slug for the title descriptor with acronym/version preservation per CONVENTIONS Section 3 — e.g., `brain-v2-rebuild` → `Brain v2 Rebuild` (preserve `v2` lowercase as a versioning convention); `lifecycle-skills-rework` → `Lifecycle Skills Rework`; `oauth-pkce-flow` → `OAuth PKCE Flow` (preserve well-known acronyms).
2. **Branch name** (any mode creating a new branch off main): `feat/plan-NNN-<slug>` instead of derived from session scope. The PLAN counter (NNN) is resolved before the branch name is constructed (counter-check `list_directory planning` in create + migrate; existing PLAN-NNN in continue/split/scope/continue-part).

**Slug normalization**:

- Accept kebab-case (`brain-v2-rebuild`) or free-form (`Brain v2 Rebuild`); normalize to kebab internally
- Lowercase; hyphens as separators; strip punctuation except hyphen; collapse multiple hyphens
- If normalized slug is empty or contains only hyphens, emit halt block (`plan-name-arg-halt`)

**Precedence**: `--name` always takes precedence over auto-derivation when applicable. If `--name` is provided but the invocation creates neither a new PLAN nor a new branch (e.g., `/plan PLAN-NNN` on a non-main branch with existing PLAN), the flag is ignored with one info line ("--name has no effect in <mode> when no new PLAN/branch is being created"); no halt.

**Filename consequence**: `PLAN-NNN-<slug>.md` (CAPS entity prefix + kebab slug per CONVENTIONS Section 1.6). Permalink: `planning/plan-NNN-<slug>`. Both derive deterministically from the slug — no AskUserQuestion-for-branch dance when `--name` is provided.

### Two-step edit pattern (per D-04)

After any state-changing action in any mode:

1. Edit the PLAN via Brain MCP `edit_note` first (canonical state mutation).
2. Append the SESSION Event entry via Brain MCP `edit_note` second (pointer ledger; Contract 5 schema).
3. Commit both edits to the project repo in the same turn.

Never batch across multiple events. Each state-changing turn produces an edit + commit. See `references/two-step-edit-pattern.md`.

### Session note structure (canonical)

Under the /plan lifecycle, session notes are **pure temporal ledgers** — Scope, optional State, `## Event NN` entries, `## Observations`, `## Relations`. PLAN owns workflow state (parts, dependencies, dashboards, tasks); SESSION owns the chronological event log only.

**Forbidden in lifecycle-managed session notes** (these live in PLAN, not SESSION):

- `## Workflow Plan`
- `## Phase Progression`
- `## Tasks` (and Active / Backlog / Archive tables)
- `## Cross-Part Dependency Graph` / Mermaid deps graph
- `## Pending User Decisions`
- `## Editor Mirror IDs`
- `## D-N substatus list`
- `## Progress Dashboard`
- Any state-snapshot table embedded in an Event body

Applies to all modes (create / migrate / continue / split / scope) AND to every phase skill that appends Events (`/research`, `/decisions`, `/spec`, `/build`, `/review`, `/end`). Phase skills must never add new top-level H2 sections to the session — only `## Event NN` appends. Full spec + audit grep + legacy-session handling in `references/two-step-edit-pattern.md`.

### Brain MCP binary rule

All PLAN and SESSION operations use Brain MCP tools (`mcp__plugin_brain_brain__*`). Generic file tools are forbidden on files under `docs/**`.

PLAN creation is a single `write_note` call (CONVENTIONS Section 1.7.2). Brain MCP intercepts `write_note` to author the file with a kebab filename + bare permalink and index it immediately — pass the full colon title directly:

`write_note(title: "PLAN-001: Topic", directory: "planning", project: …)` → file `planning/PLAN-001-topic.md`, permalink `planning/plan-001-topic`, queryable immediately. No `edit_note`/`move_note` follow-up.

## Creating a plan (no position given)

1. Execute the orchestrator workflow routing protocol: Triage → Clarification Gate → Task Classification → Domain Identification → Workflow Paths → Workflow Definition. See `references/orchestrator-routing-protocol.md`. (No auto-detection of existing artifacts, in any form — a plan is authored, never inferred from a graph sweep.)
3. Read source artifacts (PRD if research complete, ACCEPTED ADRs if decisions complete, prior PLAN if migrating).
4. Map to existing code via Brain MCP `search` (Memory-First; avoid duplication).
5. Dispatch `Task(subagent_type="brain:🧠-analyst")` with the 5 first-principles forcing questions:
   - What is the smallest version of this work that delivers the intended outcome?
   - What prerequisites must exist for the first part to start?
   - What downstream work does this unlock?
   - What is the riskiest unknown?
   - What is the rollback story if a part fails partway through?
6. Author the PLAN with two-level decomposition: milestone-level parts for workflow phases (research / decisions / spec-decomposition / spec.SPEC-NNN / build.SPEC-NNN / review / end); task-level within build parts (TASK references with one DoD checkbox per TASK). PLAN title: if `--name <slug>` was provided, title = `PLAN-NNN: <Title Case of slug>` per Name override rules; otherwise derive a concise Title Case descriptor from the orchestrator routing protocol output. See `references/plan-note-schema.md`.
7. Set `complexity_tier` on PLAN frontmatter (set during `/research` Step 2 normally; in create mode without prior research, set TBD and HALT downstream until classified).
8. Dispatch `Skill(skill="brain:---pre-mortem")` to surface top 2-3 critical risks. Record in PLAN body `## Risks` with mitigation pointers.
9. Dispatch `Task(subagent_type="brain:🧠-critic")` for plan-level validation (scope completeness, dependency-graph correctness, estimate credibility, risk coverage). HALT on `NEEDS_REVISION`; address findings before declaring the PLAN ready.
10. Estimate reconciliation: if rolled-up estimate diverges >10% from source-artifact estimates, HALT and require documented reconciliation: (a) update source estimate, (b) document rationale, or (c) flag for user review via AskUserQuestion.
11. Apply the two-step edit pattern + commit.

## Opening a plan (auto-routing to next-ready)

1. Read PLAN-NNN; identify the next-ready part (status `READY` with all dependencies `DONE`).
2. If multiple parts are READY: surface via AskUserQuestion (list candidates + dependency context). Pick the lowest-numbered as the recommended default.
3. Set the part's status → `IN_PROGRESS`; set `owning_session` to the current session identifier.
4. Apply the two-step edit pattern + commit.
5. Auto-dispatch to the matching phase skill via the Contract 2 dispatch shape. See `references/auto-routing.md`.

## Drilling to a phase or part

`/plan PLAN-NNN <phase>` and `/plan PLAN-NNN <phase> <part>` run the continue pipeline with the search for next-ready replaced by the position the caller named. There is no separate mode for this: the same act at a finer coordinate.

An unrecognised phase or part id is an error, not a search — a typo should say so rather than quietly resuming somewhere else.

## Removed modes

`split`, `scope` and `migrate` are gone, and `create` is the no-argument case rather than a verb.

`split` never worked. The part-id grammar admitted no split form, there was no `SPLIT` substatus, and a part in one would have been non-terminal — permanently blocking its plan from reaching DONE. What it promised, `decompose` delivers for real: line-range extraction, byte-accountability proof, a SHA-256 round trip, and nothing renamed on mismatch. `scope` was its read-only half and had no pipeline of its own.

`migrate` retrofitted a plan onto work already in progress, by sweeping the graph and guessing which notes belonged to which phase. A plan is authored instead.

Note surgery is not a plan concern at all. Splitting one note into several is `decompose`; merging several into one is `recompose`; finding which notes need either is `defrag`. Each is invoked directly on the notes.

## Phase-specific dispatch contracts

Dispatch shape (Contract 2):

```text
Skill(skill="<research|decisions|spec|build|review>",
      args="plan=PLAN-NNN part=<part-id> [phase-specific args]")
```

| Phase | Phase-specific args |
|---|---|
| research | `topic` + `context` + `urls` (only when invoked directly without auto-routing) |
| decisions | `source_analyses=[[ANALYSIS-NNN: ...]],...` |
| spec Stage 1 | `source_adrs=[[ADR-001: ...]],...` |
| spec Stage 2 | `spec=SPEC-NNN source_adrs=...` |
| build | `spec=SPEC-NNN` |
| review | `target=<diff|file|spec>` `pr_type=<code|docs|config|test>` (optional) |

Phase skills signal completion via the Contract 1 `set-part-done` call:

```text
Skill(skill="plan", args="set-part-done plan=PLAN-NNN part=<part-id> outcome=[[<wikilink>]] session=SESSION-YYYY-MM-DD_NN event=<NN> [status=DONE|DEFERRED|ABANDONED] [rationale=<text if not DONE>]")
```

On `set-part-done` receipt:

1. Apply outcome wikilink to `part.outcome`.
2. Set `part.status` (default `DONE`).
3. Set `part.completing_session` to the current session.
4. Apply the two-step edit pattern + commit.
5. Identify the next-ready part; surface as "next available" recommendation. Do not auto-invoke — the user re-invokes `/plan PLAN-NNN` to continue.

## Per-decision micro-cycle (decisions parts only)

When `/decisions` is auto-routed from a decisions part, it runs the per-D-N micro-cycle (decision-critic → AskUserQuestion → verbatim echo → diff approval → 2-step edit → commit, per D-N). `/plan` receives `set-part-done` after each D-N is locked, the composite ADR is authored, and `brain:---adr-review` passes. See `references/per-decision-micro-cycle.md`.

## Status enums (Contract 7)

- **PLAN-part substatus**: `PENDING | READY | IN_PROGRESS | DONE | DEFERRED | ABANDONED | BLOCKED`. `READY` = all dependencies `DONE`. `DEFERRED` and `ABANDONED` require `rationale`.
- **SESSION-note status**: `IN_PROGRESS | PAUSED | DONE`. Transitions: `IN_PROGRESS → DONE` (via `/end` Step 4g); `IN_PROGRESS → PAUSED` (via `/end` Step 3c option c).
- Other note-type enums (ADR / SPEC / TASK) apply to phase-skill outputs; see CONVENTIONS Section 3.

## Complexity tier (Contract 8)

PLAN frontmatter carries `complexity_tier: TIER_1 | TIER_2 | TIER_3 | TIER_4 | TIER_5`, set during `/research` Step 2. Every downstream phase skill reads it at Step 1 and calibrates depth. If missing, the skill HALTs and surfaces — tier MUST be classified before the phase proceeds.

In create mode without prior `/research`, `complexity_tier` may be set to `TBD`; the first downstream phase skill that needs it (typically `/research` if invoked, or any phase skill if research is skipped) will HALT and require classification.

## Halt blocks (Contract 3)

All halts emit a fenced code block with info-string:

````text
```plan-<step>-halt
trigger: <step identifier>
question: <what the halt is checking>
answer: "<machine-extractable answer or null>"
test_failed: <which test condition failed>
deferral: <how to resume after addressing>
```
````

Examples in /plan:

- `plan-branch-derivation-halt` — empty slug or unresolvable conflict
- `plan-create-step8-halt` — pre-mortem surfaces a critical risk that invalidates the PLAN
- `plan-create-step9-halt` — critic returns `NEEDS_REVISION`
- `plan-create-step10-halt` — estimate divergence >10% without documented reconciliation
- `plan-migrate-no-refs-halt` — migrate mode finds no refs AND user cannot enumerate any

## Skill dispatch resolution (Contract 9)

For any skill name dispatched (e.g., `pre-mortem`, `brain:---adr-review`):

1. Check `~/.claude/skills/<name>/SKILL.md` first.
2. If absent, check Brain plugin path (`~/.claude/plugins/cache/brain/brain/<version>/skills/<name>/`).
3. If absent at both: emit halt block with `severity: FAIL` if the step marks the skill BLOCKING; otherwise emit coverage-note with `severity: INFO` and continue.

Never fall back to the ai-agents path. `brain:---planner` is unaffected — it remains available as a separate plugin-level planning surface; `/plan` does not supersede it.

## Reference files

- `references/plan-note-schema.md` — Per-part schema (Contract 6); PLAN frontmatter fields (branches, complexity_tier).
- `references/auto-routing.md` — Auto-routing from `/plan PLAN-NNN` to phase skills (D-03 + Contract 2).
- `references/per-decision-micro-cycle.md` — D-N lock pattern (cross-linked with `/decisions`).
- `references/orchestrator-routing-protocol.md` — 6-step protocol per D-02 (Triage → Clarification → Task Classification → Domain Identification → Workflow Paths → Workflow Definition).
- `references/two-step-edit-pattern.md` — PLAN-then-SESSION-then-commit pattern per D-04.
