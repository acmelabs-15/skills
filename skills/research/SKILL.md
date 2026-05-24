---
name: research
description: This skill should be used when the user asks to "research X", "do an analysis on Y", "investigate Z", "gather requirements for X", "do the research phase", "analyze the problem", "explore options for X", "interview me on Y", "grill me on the requirements for Z", "start the analysis phase", "build the PRD for X", "what are our options for X", or invokes /research in any form. Also auto-invoked by /plan PLAN-NNN when the next-ready part is the 'research' phase. Authors a PRD + per-requirement ANALYSIS notes via the Step 0-9 pipeline (first-principles → memory-first → requirements-interview → tier classification → buy-vs-build → conditional CVA → per-requirement analyst dispatch → critic/decision-critic convergence loop). Surfaces options-with-pros/cons only; never locks choices (/decisions phase adjudicates each).
user-invocable: true
---

# /research

Analysis-phase skill for the Brain lifecycle. Author a PRD + per-requirement ANALYSIS notes via a recursive two-stage convergence loop. Surface options-with-pros/cons; never lock choices — the `/decisions` phase adjudicates each.

## What /research does

The pipeline runs in two stages with a convergence loop bridging them:

```text
Stage 1: requirements-interview produces a PRD with EARS-traced requirements (the WHAT)
Stage 2: dispatch brain:🧠-analyst per requirement to surface options-with-pros/cons
         (the HOW), each as an ANALYSIS-NNN note
Convergence check: critic + decision-critic + cva-analysis + gap analysis
   → if gaps found: loop back to Stage 1 to enhance PRD, then Stage 2 again
   → until complete
```

When auto-invoked from `/plan PLAN-NNN`, /research arrives via Contract 2 dispatch (`Skill(skill="research", args="plan=PLAN-NNN part=research")`). When invoked directly, the user passes a topic + optional context + URLs. Output flows back to `/plan` via Contract 1 `set-part-done`.

## Inputs and outputs

| Input | Source |
|---|---|
| `plan=PLAN-NNN` + `part=research` | Auto-routed from `/plan PLAN-NNN` (Contract 2) |
| `topic` + `context` + `urls` | Direct invocation (when no PLAN binding exists) |
| `source_artifacts` on the PLAN part | Pre-existing PRD / ANALYSIS notes from prior sessions (G2 resume case) |

| Output | Location |
|---|---|
| PRD-NNN note | `docs/planning/PRD-NNN-{slug}.md` (Brain note; Pattern 2 three-phase write) |
| ANALYSIS-NNN notes (one per requirement) | `docs/analysis/ANALYSIS-NNN-{descriptor}.md` |
| `complexity_tier` set on PLAN frontmatter | Per Contract 8; required before any downstream phase proceeds |
| `set-part-done` call back to /plan | Contract 1: `Skill(skill="plan", args="set-part-done plan=PLAN-NNN part=research outcome=<PRD wikilink> secondary_outcomes=<ANALYSIS wikilinks>")` |

## Cross-cutting behaviors (all invocations)

### Brain MCP binary rule

All `docs/**` operations use Brain MCP tools (`mcp__plugin_brain_brain__*`). Generic file tools (Read/Edit/Write) are forbidden on Brain notes. PRD titles contain a colon (`PRD-NNN: Topic`); creation uses Pattern 2 three-phase write:

1. `write_note` with no-colon title (e.g., `PRD-001 Lifecycle Skills Rework`)
2. `edit_note` (find_replace) to insert colons in frontmatter title + H1
3. `move_note` to rename file to kebab form (e.g., `prd-001-lifecycle-skills-rework.md`)

### Memory-first gate (Step 0.5)

Before changing existing systems, search Brain memory for related context (no separate skill dispatch — the gate is a meta-rule from the orchestrator protocol). Search-query table:

| Change type | Search query |
|---|---|
| Remove existing constraint | `[constraint name]` |
| Bypass existing protocol | `[protocol name] why` |
| Delete >100 lines | `[component] purpose` |
| Refactor complex code | `[component] edge case` |
| Change workflow | `[workflow] rationale` |

Document findings in PRD body; only then proceed.

### Two-step edit pattern (per D-04 + Contract 5)

After every state change (PLAN part status, PRD progress, ANALYSIS note return, etc.):

1. PLAN edit first via Brain MCP `edit_note` (canonical state mutation)
2. SESSION Event NN append via Brain MCP `edit_note` (pointer ledger; Contract 5 schema)
3. Project repo commit (durability)

Never batch across multiple events. Same pattern used by `/plan` and every lifecycle skill.

### G2 resume semantics — skip done work

On resume from a prior session, read the part's state + existing outputs and resume at the first unfinished step:

| Step | Skip condition |
|---|---|
| Step 1 (requirements-interview) | PRD exists at expected location with valid EARS-traced reqs |
| Step 2 (tier classification) | `complexity_tier` set on PLAN frontmatter |
| Step 3 (buy-vs-build) | Outcome documented on PRD or in prior ANALYSIS |
| Step 5 (per-req analyst dispatch) | Dispatch ANALYSIS only for reqs WITHOUT existing notes |
| Step 6-8 (convergence loop) | Resume from current iteration count; if PRD was enhanced but Step 6 not re-run on new reqs, run Step 6 |

## Step 0-9 pipeline

See `references/analysis-phase-workflow.md` for the full pipeline with per-step substeps + halt conditions. High-level summary:

| Step | Action |
|---|---|
| 0 | First-principles gate (6 questions; halt block per Contract 3 on fail) |
| 0.5 | Memory-first gate (cross-cutting behavior above; no separate skill dispatch) |
| 1 | `Skill(skill="requirements-interview")` → PRD with EARS-traced requirements |
| 2 | `Task(subagent_type="brain:🧠-analyst")` → classify complexity Tier 1-5; SETS PLAN frontmatter `complexity_tier` |
| 3 | `Skill(skill="brain:---buy-vs-build-framework")` — BLOCKING for new capabilities |
| 4 | `Skill(skill="brain:---cva-analysis")` — conditional on Tier ≥3 |
| 5 | Per requirement: dispatch `Task(subagent_type="brain:🧠-analyst")` → each writes ANALYSIS-NNN with options-with-pros/cons (no recommendation lock) |
| 6 | Convergence check (parallel): `brain:🧠-critic` for gap analysis + `Skill(skill="brain:---decision-critic")` for assumption stress-test |
| 7 | IF gaps OR new requirements surfaced: GOTO Step 1 (enhance PRD) then Step 5 (dispatch additional analyses) |
| 8 | UNTIL convergence: no new requirements, no new gaps, user confirms completeness via AskUserQuestion |
| 8.5 | Brain-native retrieval-density pass (see `references/retrieval-density-pass.md`) |
| 8.6 | Resource-bounds + degradation protocol (see `references/resource-bounds.md`) |
| 9 | Contract 1 `set-part-done` to `/plan` with PRD + ANALYSIS outcomes |

## Complexity tier classification (Step 2)

Step 2 dispatches `brain:🧠-analyst` with the PRD as input + the 5-tier rubric. The analyst returns a Tier 1-5 classification with confidence + rationale. Write the chosen tier to PLAN frontmatter as `complexity_tier: TIER_N` via `mcp__plugin_brain_brain__edit_note` (per Contract 8). Every downstream phase reads this field at its Step 1 and HALTs if missing.

When the analyst returns LOW CONFIDENCE on the tier classification, surface via `AskUserQuestion` for user adjudication (see `references/analysis-phase-workflow.md` Step 2 for the full question template). Tier choice drives downstream calibration per Contract 8 (per-tier table on `/decisions` thresholds, `/spec` CVA gate, `/build` oversight, `/review` axis depth).

## Buy-vs-build (Step 3)

`Skill(skill="brain:---buy-vs-build-framework")` evaluates build vs buy vs partner vs defer per the four-phase framework. **BLOCKING for new-capability decisions** — if a requirement introduces a capability the project doesn't already have (new tool, new library, new external service), this gate runs and its verdict must complete before downstream Steps 4-5 proceed.

If the framework returns BUY for a capability that doesn't fit the project's constraint set (license, hosting, integration), HALT via Contract 3 halt block (`research-step3-halt`) and surface to user with options: accept BUY anyway, pursue partner, or defer the capability entirely.

If the framework returns BUILD or PARTNER, document the decision in PRD body and proceed.

## Conditional CVA (Step 4)

`Skill(skill="brain:---cva-analysis")` runs when `complexity_tier ≥ TIER_3`. Surfaces commonality vs variability across requirements to discover natural abstractions before per-requirement analyses lock divergent patterns. Skip when Tier 1-2; mandatory when Tier 4-5.

## Convergence loop (Step 6-8)

See `references/convergence-protocol.md` for the full convergence protocol. High-level: run critic + decision-critic in parallel; collect gap findings; if any new requirements or gaps surface, GOTO Step 1 to enhance PRD then back to Step 5 for additional analyses. Loop until no new gaps + user confirms completeness via Step 8 AskUserQuestion (4 options: confirm complete / surface new requirements / surface specific gaps / pause).

Max 3 convergence-loop iterations per Step 8.6 (see `references/resource-bounds.md`); HALT on the 3rd iteration's convergence failure and recommend `/plan PLAN-NNN --split`.

## Halt blocks

All halts use Contract 3 schema with `research-<step>-halt` info-string:

````text
```research-<step>-halt
trigger: <step identifier>
question: <what the halt is checking>
answer: "<machine-extractable answer or null>"
test_failed: <which test condition failed>
deferral: <how to resume after addressing>
```
````

Examples:

- `research-step0-halt` — first-principles gate fails (e.g., no concrete demand signal)
- `research-step2-tier-low-confidence-halt` — analyst returns low-confidence Tier classification; user adjudicates
- `research-step3-halt` — buy-vs-build returns BUY for unfit capability
- `research-step6-critical-gap-halt` — critic surfaces gap requiring architectural re-think
- `research-step8-convergence-halt` — max iterations exceeded; recommend `/plan split`
- `research-step8.6-tool-unavailable-halt` — BLOCKING dispatched skill missing at both Brain locations (per Contract 9)

Coverage notes (severity INFO; non-blocking) for non-BLOCKING tool unavailability:

````text
```research-coverage-note
trigger: <step identifier>
tool_unavailable: <skill name>
reason: <error or "not installed">
severity: INFO
deferral: <gap created; how to backfill>
```
````

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Locking options during /research | Violates analysis-vs-decisions boundary; biases /decisions adjudication | Surface options-with-pros/cons only; let /decisions lock |
| Skipping Step 6 convergence and proceeding to /decisions | Silent gaps surface during decision-locking | Convergence is mandatory before set-part-done |
| Open Questions sections in ANALYSIS notes | Defers questions to a later phase; violates the no-deferred-questions invariant | Resolve all questions IN /research (codebase research, external research, user check-in) |
| Unsupported quantitative claims | Casual estimates anchor expectations + bias decisions | Cite source or describe qualitatively with anchors |
| Deferring design choices to implementation phase | "Investigate during implementation" is forbidden in planning artifacts | Resolve design choices IN /research; implementation executes mechanically |
| Running Step 6 critic with insufficient adversarial framing | "Looks good" critic returns are a failure mode | Critic brief MUST include "review as a stranger; surface at least one concrete concern even on strong work; cite file:line / wikilink evidence" |
| Skipping requirements-interview because "this is a small change" | Underspecification surfaces as ambiguity downstream | Even single-requirement work benefits from the grill-me pattern; only skip when the PRD is supplied externally |
| Setting complexity_tier without running Step 2 analyst classification | Tier is supposed to come from analyst judgment | Always dispatch Step 2; only skip if PLAN frontmatter already has tier from a prior /research session (G2 resume) |

## Skill dispatch resolution (Contract 9)

For any skill name dispatched (e.g., `requirements-interview`, `brain:---buy-vs-build-framework`, `brain:---cva-analysis`, `brain:---decision-critic`):

1. Check `~/.claude/skills/<name>/SKILL.md` first.
2. If absent, check Brain plugin path (`~/.claude/plugins/cache/brain/brain/<version>/skills/<name>/`).
3. If absent at both: emit halt block with `severity: FAIL` if step marks the skill BLOCKING; otherwise coverage-note with `severity: INFO` and continue.

Never fall back to the ai-agents path. Currently verified present at Brain locations:

**Skills (Skill dispatch — `Skill(skill="...")`):**

- `requirements-interview` → `~/.claude/skills/requirements-interview/`
- `brain:---buy-vs-build-framework` → Brain plugin path (BLOCKING for new capabilities — Step 3)
- `brain:---cva-analysis` → Brain plugin path (conditional on Tier ≥3 — Step 4)
- `brain:---decision-critic` → Brain plugin path (Step 6 convergence)

**Agents (Task dispatch — `Task(subagent_type="...")`, distinct from skills):**

- `brain:🧠-analyst` → Brain plugin agent (Step 2 tier classification + Step 5 per-requirement analyses)
- `brain:🧠-critic` → Brain plugin agent (Step 6 convergence gap analysis)

`brain:---chestertons-fence` is installed at the Brain plugin path but is NOT auto-invoked from /research — the memory-first auto-rule (orchestrator protocol) handles Step 0.5 in its place. The chestertons-fence skill remains available for any deeper investigation need (git archaeology, dependency analysis) on explicit user invocation.

### Role of /research in the rigid cycle

> /research produces the upstream ANALYSIS notes the rest of the cycle consumes. Analysis output stays at the options-with-pros/cons layer — locking choices happens in /decisions, not here. Analyses MUST land WITHOUT unresolved questions (resolution belongs IN the analysis phase via codebase research, external research, or real-time user check-in). Per-analysis briefs may include extension directives so the analyst adds dimensions specific to the codebase/topic beyond the rubric floor. Analyses that feed downstream contracts (REQs/DESIGNs/TASKs) should articulate criteria that translate cleanly into EARS or checkbox form so the spec phase can author verifiable contracts.

## Rigid per-TASK build+QA cycle

When a SPEC enters build, the orchestrator advances ONE TASK at a time through a fixed sequence. NO step may be skipped or reordered, NO batching, NO shortcuts.

For each `TASK-NNN-SPEC-MMM` in the SPEC:

a. PLAN transition `impl-TASK-NNN PENDING → IN_PROGRESS` (FIRST action)
b. Session note Event appended capturing transition
c. Git commit
d. Orchestrator dispatches implementer; brief = rendered impl item content verbatim from PLAN
e. Implementer reads ENTIRE spec subtree, implements ONLY this TASK, marks DoD `[x]` per item satisfied
f. Implementer returns `## State Changes` (this TASK only)
g. Session note Event
h. PLAN transition `impl-TASK-NNN IN_PROGRESS → DONE`
i. Git commit (code + PLAN + session note atomically)
j. PLAN transition `qa-TASK-NNN PENDING → IN_PROGRESS`
k. Session note Event
l. Git commit
m. Orchestrator dispatches QA; brief = rendered qa item content verbatim from PLAN
n. QA reads ENTIRE spec, evaluates each linked DoD + REQ AC + DESIGN compliance checkbox individually with evidence
o. QA writes per-checkbox findings to `TEST-REPORT-NNN-SPEC-MMM-{task-slug}.md` via Pattern 2 three-phase write
p. QA returns verdict ONLY: `PASS` or `FAILED + see TEST-REPORT-NNN`
q. Session note Event
r. Orchestrator updates TASK note with `validated_by` relation to TEST-REPORT
s. On PASS: PLAN `qa-TASK-NNN → DONE`; TASK note status → DONE. On FAILED: PLAN `qa-TASK-NNN → FAILED`; PLAN `impl-TASK-NNN DONE → IN_PROGRESS`; orchestrator translates QA findings into a fix-brief that quotes each unchecked item verbatim with QA evidence
t. Git commit
u. Move to TASK N+1; repeat from (a)

## Checkbox-as-contract

Implementer and QA do NOT figure out what counts as done from prose. The contract is mechanical:

- `TASK ## Definition of Done` checkboxes — implementer's build contract
- `REQ ## Acceptance Criteria` (EARS Given/When/Then) — QA validates against these
- `DESIGN ## Compliance` or `## Architecture Compliance` checkboxes (when present) — QA validates against these

## Schema-validated agent-claim verification

The composition library at `shared/composition/` provides programmatic validators across TaskNote, RequirementNote, DesignNote, SpecRootNote, TestReportNote. Lying agents are mechanically caught.

## Defense in depth

This protocol embeds at every enforcement layer. Single-layer enforcement fails under load.

## Reference files

- `references/analysis-phase-workflow.md` — Full Step 0-9 pipeline with per-step substeps, halt conditions, anti-patterns
- `references/convergence-protocol.md` — Step 6 convergence check (critic + decision-critic + cva-analysis + gap analysis loop); Step 7 GOTO logic; Step 8 user-confirms termination
- `references/retrieval-density-pass.md` — Step 8.5 Brain-native retrieval-density pass (atomic observations + Applicability sub-section + work-item adjudication)
- `references/resource-bounds.md` — Step 8.6 iteration budget + skill/tool degradation protocol + search-failure fallback
