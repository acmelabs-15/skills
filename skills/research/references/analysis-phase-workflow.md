# Analysis Phase Workflow — Full Step 0-9 Pipeline

The complete `/research` pipeline. Each step lists action, dispatch shape, halt conditions, and notes on resumability (G2 resume semantics — skip steps that already produced their outputs).

## Pipeline overview

```text
Stage 1: requirements-interview produces a PRD with EARS-traced requirements (the WHAT)
Stage 2: dispatch brain:🧠-analyst per requirement to surface options-with-pros/cons
         (the HOW), each as an ANALYSIS-NNN note
Convergence check: critic + decision-critic + cva-analysis + gap analysis
   → if gaps found: loop back to Stage 1 to enhance PRD, then Stage 2 again
   → until complete
```

**Non-negotiable invariant**: no options are LOCKED during `/research`. Analysis surfaces options-with-pros/cons; `/decisions` adjudicates each. This boundary is forbidden to cross — the analysis phase is for discovery, not selection.

## Step 0 — First-principles gate

Six first-principles questions (adapted from Q1-Q6 in upstream first-principles framework). Each question requires a concrete answer; aspirational future-tense answers (e.g., "users would want this") trigger a halt.

The six questions:

1. **Demand reality** — name three or more specific requesters by name + role + the system they currently use to address this need
2. **Blocked entity** — identify the entity currently blocked + the workflow that's blocked + the impact of the block
3. **Wedge** — what is the narrowest version of this work that delivers the intended outcome?
4. **Constraint set** — what hard constraints (licensing, hosting, integrations, compliance, perf) bound the solution space?
5. **Adjacent prior art** — what existing systems, tools, or libraries address adjacent problems? Cite at least 2-3.
6. **Failure mode** — what concrete failure mode would invalidate the work mid-flight?

Halt block on any failed test:

````text
```research-step0-halt
trigger: H3
question: Q<N> <question-name>
answer: "<machine-extractable answer or null>"
test_failed: <which test condition failed — e.g., "aspirational future-tense in answer">
deferral: Re-invoke /research after addressing the question concretely (e.g., naming specific requesters).
```
````

**G2 resume**: skip Step 0 if the PRD frontmatter already contains a `first_principles_pass: PASSED` marker (set on first successful pass).

## Step 0.5 — Memory-first gate

Search Brain memory for related context before changing existing systems. This is a meta-rule from the orchestrator protocol, not a separate skill dispatch. The search-query table by change type:

| Change type | Search query |
|---|---|
| Remove existing constraint | `[constraint name]` |
| Bypass existing protocol | `[protocol name] why` |
| Delete >100 lines | `[component] purpose` |
| Refactor complex code | `[component] edge case` |
| Change workflow | `[workflow] rationale` |

For new-capability proposals (no existing system to change), this gate is brief: search for prior decisions on adjacent topics + cite findings in the PRD.

Document findings in the PRD body under a "Memory-First Context" sub-section. Only then proceed to Step 1.

## Step 1 — requirements-interview

```text
Skill(skill="requirements-interview")
```

Produces a PRD with EARS-traced requirements (WHEN/THE SYSTEM SHALL/SO THAT) + 7-branch checklist coverage (user stories / data model / integrations / failure modes / security / observability / scope boundaries) + structured 11-section output (Problem / User stories / Data model / Integrations / Failure modes / Security / Observability / Acceptance criteria / Out of scope / Deferred / Open questions).

The PRD lands at `docs/planning/PRD-NNN-{slug}.md` via a single Brain MCP `write_note` call passing the full colon title.

**Loop iteration**: when `/research` re-enters Step 1 from Step 7, the interview is scoped to the gap — new requirements only. The existing PRD is enhanced, not replaced.

**G2 resume**: skip Step 1 if the PRD exists at the expected location with valid EARS-traced requirements. The interview's job is done; proceed to Step 2 (or beyond if tier is already set).

## Step 2 — Tier classification

```text
Task(subagent_type="brain:🧠-analyst")
```

Brief: classify the PRD's overall complexity Tier 1-5 (entry / mid / senior / staff / principal). Return tier + confidence (HIGH / MEDIUM / LOW) + rationale citing PRD content.

Write the chosen tier to PLAN frontmatter as `complexity_tier: TIER_N` via Brain MCP `edit_note` (Contract 8 — required field; every downstream phase reads it).

**Low-confidence handling**: when the analyst returns LOW CONFIDENCE (e.g., signals split between two tiers), surface via `AskUserQuestion`:

> "Analyst classified at Tier {N} with LOW CONFIDENCE — signals also support Tier {M} (and Tier {O}). Confirm Tier {N}, choose {M}/{O}, or refine the rubric inputs (additional context, narrower scope)?"

Tier drives downstream calibration per Contract 8 — `/decisions` thresholds, `/spec` CVA gate, `/build` oversight depth, `/review` axis depth.

**G2 resume**: skip Step 2 if PLAN frontmatter already has `complexity_tier` set.

## Step 3 — Buy-vs-build (BLOCKING for new capabilities)

```text
Skill(skill="brain:---buy-vs-build-framework")
```

Evaluates build vs buy vs partner vs defer per the four-phase framework. **BLOCKING when a requirement introduces a new capability** (new tool, new library, new external service the project doesn't already have).

| Framework verdict | Action |
|---|---|
| BUILD | Document decision in PRD body under "Build vs Buy" sub-section; proceed |
| BUY (fits constraints) | Document decision; surface the BUY recommendation as a Step 5 input (subsequent analyses reference the chosen vendor) |
| BUY (doesn't fit constraints) | HALT via `research-step3-halt` (severity FAIL); surface to user; options: accept BUY anyway, pursue PARTNER, or DEFER capability |
| PARTNER | Document; surface as Step 5 input; partner identification is itself an ANALYSIS topic |
| DEFER | HALT via `research-step3-halt`; if capability deferred, the requirements depending on it move OUT_OF_SCOPE |

**G2 resume**: skip Step 3 if buy-vs-build outcome is documented on the PRD OR in a prior ANALYSIS note.

## Step 4 — Conditional CVA

```text
Skill(skill="brain:---cva-analysis")
```

Commonality-variability analysis. Surfaces what varies vs what's constant across requirements to discover natural abstractions before per-requirement analyses lock divergent patterns.

| Tier | CVA gate |
|---|---|
| TIER_1 / TIER_2 | Skip — over-abstracting trivial work |
| TIER_3 | Required IF 2+ requirements share structural patterns (analogous APIs, similar lifecycles, parallel data flows) |
| TIER_4 / TIER_5 | Mandatory regardless of similarity |

CVA output is a matrix + recommended abstractions list; informs Step 5 analyst dispatch briefs (so per-requirement analyses don't reinvent shared concepts).

**G2 resume**: skip Step 4 if PRD already has a "CVA Analysis" sub-section OR if Tier 1-2.

## Step 5 — Per-requirement analyst dispatch

For each requirement in the PRD, dispatch a `brain:🧠-analyst` agent:

```text
Task(subagent_type="brain:🧠-analyst")
```

Brief includes:

- The requirement (verbatim EARS clause + GIVEN/WHEN/THEN acceptance criteria)
- The PRD as context (so the analyst sees how this requirement fits)
- CVA abstractions (from Step 4 if applicable)
- Buy-vs-build outcome (from Step 3 if a capability is in scope)
- Mandate: "Surface options-with-pros/cons; do NOT recommend or lock a choice. Open Questions are forbidden — resolve all questions IN this analysis via codebase research, external research, or user check-in."
- Evidence hierarchy: tool output > files read in this dispatch > web/docs search > training knowledge (lowest priority)
- Rubric extension directive: "Rubric is FLOOR; identify + add additional dimensions specific to the codebase/topic AND propagate to other relevant analyses."

Each analyst writes `ANALYSIS-NNN-{descriptor}.md` to `docs/analysis/` with:

- Title + EARS reference (the requirement this analysis addresses)
- Options table: each row is one option with pros/cons/effort/risk/cited evidence
- Recommended option (optional — analyst may indicate preference but NEVER lock the choice)
- Memory-first context (from prior decisions on adjacent topics if relevant)
- Universal final sections: `## Observations` then `## Relations`

**Loop iteration**: when re-entering Step 5 from Step 7, dispatch only for NEW requirements added in the latest Step 1 iteration. Existing analyses are untouched (G2 resume).

**Parallel dispatch**: dispatch all per-requirement analysts in parallel (one batch). Each runs independently; results return asynchronously.

## Step 6 — Convergence check

See `convergence-protocol.md` for full details. Summary:

```text
Parallel:
  Task(subagent_type="brain:🧠-critic")           → gap analysis on returned ANALYSIS set
  Skill(skill="brain:---decision-critic")          → stress-test assumptions across the analysis set
```

Both agents operate with adversarial framing (reviewer-asymmetry mandate — see `convergence-protocol.md` for the full briefs): "review as a stranger to the work; surface at least one concrete concern even on strong work; cite file:line / wikilink evidence for every finding."

Outputs combined into a single "Convergence Findings" report. Categories:

- **Missing requirements** — gaps in PRD coverage
- **Insufficient analyses** — analyses that need additional depth (low-confidence options, missing failure mode coverage, etc.)
- **Reasoning gaps** — assumptions that aren't supported by cited evidence
- **Architectural inconsistencies** — options across analyses that would conflict if all selected

## Step 7 — GOTO logic

| Convergence outcome | Next |
|---|---|
| No gaps + no new requirements | Proceed to Step 8 |
| New requirements surfaced | GOTO Step 1 (enhance PRD with new reqs) then GOTO Step 5 (dispatch additional analyses) |
| Insufficient analyses surfaced | GOTO Step 5 (re-dispatch with refined briefs) without re-running Step 1 |
| Architectural inconsistency requiring scope re-think | HALT via `research-step6-critical-gap-halt`; surface to user; may require `/plan PLAN-NNN --scope` evaluation |

## Step 8 — User-confirms termination

When Step 6 returns clean (no gaps, no new requirements), surface via `AskUserQuestion`:

> "Convergence reached. {N} requirements covered by {M} ANALYSIS notes. {K} options per requirement on average. Confirm /research complete and proceed to /decisions, or surface additional requirements / gaps to investigate?"

| User response | Action |
|---|---|
| Confirm complete | Proceed to Step 8.5 (retrieval-density pass) then Step 9 (set-part-done) |
| Surface additional requirements | GOTO Step 1 (enhance PRD) then Step 5 |
| Surface specific gaps | GOTO Step 5 (re-dispatch with gap-focused brief) |

## Step 8.5 — Brain-native retrieval-density pass

See `retrieval-density-pass.md`. Summary: for each ANALYSIS produced in Step 5, append 3-5 atomic observations to the `## Observations` section + add an `Applicability` sub-section bridging the analysis to actionable downstream work. Surface any newly-identified work items outside the PLAN's scope via AskUserQuestion (spawn separate PLAN / defer to backlog / absorb into current PLAN).

## Step 8.6 — Resource-bounds + degradation protocol

See `resource-bounds.md`. Summary: iteration budget = max 3 convergence-loop iterations (HALT on 3rd-iteration convergence failure; recommend `/plan PLAN-NNN --split`); skill/tool degradation protocol per Contract 3 (INFO coverage-note for non-BLOCKING tool unavailability; FAIL halt for BLOCKING); search-failure fallback retries with 2 alternative queries before noting as a coverage gap.

## Step 9 — set-part-done

```text
Skill(skill="plan", args="set-part-done plan=PLAN-NNN part=research outcome=[[PRD-NNN: ...]] secondary_outcomes=[[ANALYSIS-NNN-1: ...]],[[ANALYSIS-NNN-2: ...]],...")
```

Per Contract 1. `outcome` is the PRD wikilink. `secondary_outcomes` lists all ANALYSIS wikilinks produced (used by `/decisions` as `source_analyses` per Contract 2).

After /plan receives set-part-done:
- /plan flips `research` part status → DONE; sets `completing_session`
- /plan applies the two-step edit pattern (PLAN edit + SESSION Event + commit)
- /plan surfaces "next-ready part: decisions.1" (or whichever is next) as a recommendation; user re-invokes `/plan PLAN-NNN` to continue

## Halt conditions (full inventory)

| Halt | Trigger | Resolution |
|---|---|---|
| `research-step0-halt` | First-principles gate fails | Address the failed question concretely; re-invoke /research |
| `research-step2-tier-low-confidence-halt` | Analyst returns LOW CONFIDENCE on tier | User confirms tier choice via AskUserQuestion |
| `research-step3-halt` | Buy-vs-build returns BUY for unfit capability | User decides: accept BUY, pursue PARTNER, or DEFER |
| `research-step6-critical-gap-halt` | Critic surfaces architectural inconsistency requiring scope re-think | Surface to user; may require `/plan --scope` evaluation |
| `research-step8-convergence-halt` | Max 3 convergence iterations exceeded without convergence | Recommend `/plan PLAN-NNN --split`; surface scope concern |
| `research-step8.6-tool-unavailable-halt` | BLOCKING dispatched skill missing at both Brain locations | Per Contract 9: port the skill OR replace with Brain-side alternative |

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Locking options during /research | Violates analysis-vs-decisions boundary | Surface options-with-pros/cons only; /decisions locks |
| Skipping Step 6 convergence | Silent gaps surface during /decisions adjudication | Run convergence before set-part-done |
| Open Questions sections in ANALYSIS notes | Defers questions to a later phase | Resolve all questions IN /research (research, external research, user check-in) |
| Unsupported quantitative claims | Casual estimates anchor expectations + bias decisions | Cite source OR describe qualitatively with anchors |
| Deferring design choices to implementation phase | Forbidden in planning artifacts | Resolve design choices IN /research; implementation executes mechanically |
| Running Step 6 critic without adversarial framing | "Looks good" critic returns are failure mode | Brief MUST include reviewer-asymmetry mandate |
| Skipping requirements-interview because "small change" | Underspecification surfaces downstream | Always run the grill-me pattern; only skip when PRD supplied externally |
| Setting complexity_tier without Step 2 analyst dispatch | Tier should come from analyst judgment | Always dispatch Step 2; only skip on G2 resume with existing tier |
| Per-requirement dispatch with skinny briefs | Analyses come back shallow | Brief includes PRD + CVA + buy-vs-build + evidence hierarchy + rubric-extension directive |
| Re-running Step 1 from scratch on Step 7 loop | Wasted interview effort; user fatigue | Loop iteration enhances PRD with NEW reqs only; existing PRD content untouched |
