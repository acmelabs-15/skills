---
name: decisions
description: 'This skill should be used when the user asks to "lock the decisions", "adjudicate the analysis", "make decisions on X", "decide on the options", "author the ADR for X", "go through the decisions phase", "pick from the options", "what should we pick for X", "review the analysis and decide", "finalize the architecture decisions", or invokes /decisions in any form. Also auto-invoked by /plan PLAN-NNN when the next-ready part is a decisions.N phase. Adjudicates options surfaced during /research — runs the per-D-N micro-cycle (decision-critic stress-test, AskUserQuestion with verbatim options from ANALYSIS notes, verbatim echo, diff-approval, 2-step PLAN-then-SESSION edit, commit), then authors a composite ADR via architect dispatch with detail-parity mandate, then runs the adr-review skill as MANDATORY blocking gate before flipping ADR PROPOSED to ACCEPTED.'
user-invocable: true
---

# /decisions

Decisions-phase skill for the Brain lifecycle. Adjudicate options-with-pros/cons surfaced by `/research`; lock each via a per-D-N micro-cycle; author a composite ADR via architect dispatch with detail-parity mandate; gate via mandatory `brain:---adr-review` before flipping ADR `PROPOSED → ACCEPTED`.

## What /decisions does

```text
Step 1: read PLAN's decisions.{N} part + source ANALYSIS notes
Step 2: per-pending-D-N micro-cycle (one D-N at a time, locked LOCKED)
Step 3: 12-item canonical holistic hygiene audit + scope evaluation
Step 3.5: 4 binary drift-detection checks (source / scope / demand-signal / tier)
Step 3.6: conditional buy-vs-build re-check for new-capability D-Ns
Step 4: pre-author-composite-artifact gate (tier-aware thresholds)
Step 5: architect dispatch with detail-parity mandate → composite ADR
Step 6: detail-parity audit (sample ≥5 D-Ns vs SESSION Events)
Step 7: brain:---adr-review MANDATORY blocking gate
Step 8: flip ADR status PROPOSED → ACCEPTED
Step 9: set-part-done to /plan
```

When auto-invoked from `/plan PLAN-NNN`, /decisions arrives via Contract 2 dispatch (`Skill(skill="decisions", args="plan=PLAN-NNN part=decisions.{N} source_analyses=[[ANALYSIS-NNN: ...]],...")`). When invoked directly, the user provides the source ANALYSIS notes.

## Inputs and outputs

| Input | Source |
|---|---|
| `plan=PLAN-NNN` + `part=decisions.{N}` | Auto-routed from `/plan PLAN-NNN` (Contract 2) |
| `source_analyses=...` | ANALYSIS wikilinks (sourced from the part's `source_artifacts`) |
| PLAN frontmatter `complexity_tier` | Set by /research Step 2; required (HALT if missing per Contract 8) |
| PLAN-part `d_n_substatus` | Per Contract 6; each entry has id + status (PENDING|LOCKED) + decision verbatim text |

| Output | Location |
|---|---|
| `d_n_substatus` mutations | PLAN-part: each D-N locked PENDING → LOCKED with verbatim option text |
| SESSION Event NN entries | One per locked D-N (Contract 5; Type `decision-lock`) |
| ADR-NNN note | `docs/decisions/ADR-NNN-{slug}.md` (Brain note; Pattern 2 three-phase write) |
| `set-part-done` call back to /plan | Contract 1: `Skill(skill="plan", args="set-part-done plan=PLAN-NNN part=decisions.{N} outcome=<ADR wikilink>")` |

## Cross-cutting behaviors (all invocations)

### Brain MCP binary rule

All `docs/**` operations use Brain MCP tools (`mcp__plugin_brain_brain__*`). ADR titles contain a colon (`ADR-NNN: Topic`); creation uses Pattern 2 three-phase write:

1. `write_note` with no-colon title (e.g., `ADR-001 Polar MCP`)
2. `edit_note` (find_replace) to insert colons in frontmatter title + H1
3. `move_note` to rename file to kebab form (e.g., `adr-001-polar-mcp.md`)

ADR frontmatter additionally carries `date: YYYY-MM-DD` (set on first ACCEPTED transition) + `updated: YYYY-MM-DD` (refreshed on Clarifications or substantive body change).

### Two-step edit pattern (per D-04 + Contract 5)

After every state change (PLAN-part `d_n_substatus` mutation, ADR status flip, etc.):

1. PLAN edit first via Brain MCP `edit_note` (canonical state mutation)
2. SESSION Event NN append via Brain MCP `edit_note` (pointer ledger; Contract 5 schema)
3. Project repo commit (durability)

Never batch across multiple events. Same pattern used by `/plan`, `/research`, and every lifecycle skill.

### G2 resume semantics — skip done work

On resume from a prior session, read the part's state + existing outputs and resume at the first unfinished sub-step:

| Sub-step | Skip condition |
|---|---|
| Per-D-N micro-cycle | Skip D-N entries already at status LOCKED in `d_n_substatus` |
| Step 3 hygiene audit | Skip if audit-passed marker present on the part |
| Step 3.5 drift checks | Skip if all 4 checks have passed markers |
| Step 3.6 buy-vs-build re-check | Skip if no LOCKED D-N introduces a new tool/library/external service |
| Step 4 pre-author gate | Skip if gate marker passed for current D-N count + tier |
| Step 5 architect dispatch | Skip if composite ADR already exists with all locked D-Ns |
| Step 6 detail-parity audit | Skip if audit-passed marker present |
| Step 7 adr-review | Skip if brain:---adr-review PASS marker present |
| Step 8 ACCEPTED flip | Skip if ADR status is already ACCEPTED |

Markers live in additional PLAN-part frontmatter fields (e.g., `step3_audit_passed: <YYYY-MM-DD>`, `step6_audit_passed: <YYYY-MM-DD>`, `step7_adr_review_passed: <YYYY-MM-DD>`). Set via `mcp__plugin_brain_brain__edit_note` after each step completes; read on resume to skip done work.

## Step 1 — Read inputs

Read PLAN-NNN via Brain MCP. Locate the `decisions.{N}` part. Read every wikilink in `source_artifacts` (the source ANALYSIS notes) via `mcp__plugin_brain_brain__read_note`.

Validate PLAN frontmatter `complexity_tier` is set (not `TBD`); HALT with `decisions-step1-tier-missing-halt` (Contract 3) if missing.

## Step 2 — Per-D-N micro-cycle

For each pending D-N (status PENDING) in the part's `d_n_substatus`, execute the 7-sub-step micro-cycle. See `references/per-decision-micro-cycle.md` for the canonical details.

Summary:

| Sub-step | Action |
|---|---|
| 2a | `Skill(skill="brain:---decision-critic")` → stress-test reasoning before commitment |
| 2b | `AskUserQuestion` with verbatim option content from ANALYSIS notes (Contract 4 5-field template; one decision per call) |
| 2c | Capture adjudication (Accept verbatim / Modify / Reject + rationale) |
| 2d | Decision-binding verbatim echo per Contract 4 |
| 2e | Show diff in chat for user approval (diff is informational; never embed a literal ```diff block in the durable artifact) |
| 2f | Apply via two-step Brain MCP edit (PLAN `d_n_substatus` entry PENDING → LOCKED with verbatim decision text; then SESSION Event NN append) |
| 2g | Project repo commit |

One D-N at a time. Never batch multiple D-Ns into a single AskUserQuestion or commit.

## Step 3 — Hygiene audit + scope evaluation

After all D-Ns in the part are LOCKED, run the 12-item canonical holistic hygiene audit (validate `## Tasks` / `## Workflow Plan` / Scope / Mermaid graph / Pending User Decisions / Editor Mirror IDs / Observations / Relations all current on PLAN; deps graph nodes consistent with current part state).

Then evaluate part scope against `references/pre-author-composite-gate.md` thresholds — if soft threshold tripped, surface a warning; if hard threshold tripped, escalate to Step 4 (which will HALT and require split).

## Step 3.5 — Drift-detection checks (4 binary)

Verify all 4 checks; HALT with `decisions-step3.5-{check}-halt` on any FAIL:

| Check | Verifies |
|---|---|
| (a) Source traceability | Every locked D-N traces to at least one ANALYSIS finding or PRD requirement from /research |
| (b) Scope conservation | No locked D-N adds scope beyond the PRD's acceptance criteria without explicit rationale in SESSION Event |
| (c) Demand-signal alignment | The primary blocked entity from PRD (Q3-equivalent) is still addressed by the locked D-N set |
| (d) Tier consistency | D-N count + decision depth match the PLAN's `complexity_tier` (Tier 1-2 with 15+ D-Ns or Tier 4-5 with 2 D-Ns are mismatch signals) |

Each check brief operates with adversarial framing: "review the locked D-N set as a stranger; cite SESSION Event NN + PRD section for every claim."

## Step 3.6 — Conditional buy-vs-build re-check

For any locked D-N whose option introduces a new tool, library, or external service, invoke `Skill(skill="brain:---buy-vs-build-framework")` BEFORE Step 4. Catches capability decisions that should have been gated at /research Step 3 but slipped through.

If the framework returns BUY for an unfit capability, HALT via `decisions-step3.6-halt` (per Contract 9 BLOCKING).

## Step 4 — Pre-author-composite-artifact gate

Evaluate D-N count + estimated ADR line count against tier-aware thresholds (see `references/pre-author-composite-gate.md`):

| Tier | D-N soft | D-N hard | ADR line soft | ADR line hard |
|---|---|---|---|---|
| 1-2 | >8 | >10 | >500 | >800 |
| 3 | >12 | >15 | >800 | >1200 |
| 4-5 | >20 | >25 (composite allowed; >40 hard halt) | >1200 | >1500 |

If over soft threshold: emit warning; proceed.
If over hard threshold: HALT with `decisions-step4-halt`; require `Skill(skill="plan", args="split")` before re-invoking /decisions on the resulting sub-parts.

## Step 5 — Architect dispatch (detail-parity)

`Task(subagent_type="brain:🧠-architect")` to author the composite ADR. Dispatch brief MUST include:

- The PLAN-part `d_n_substatus` (all LOCKED D-Ns with verbatim decision text)
- The corresponding SESSION Event NN entries (the canonical raw material)
- The 11-section per-D-N template (see `references/adr-authoring.md`)
- **Explicit phrase**: "Preserve every detail from SESSION events; do not summarize. The composite ADR's per-D-N section must be AT LEAST as detailed as the corresponding SESSION Event body. Compression detected during the detail-parity audit (Step 6) triggers re-dispatch."
- Evidence hierarchy: cite (1) tool output, (2) files read in this dispatch, (3) web/docs search, (4) training knowledge (lowest priority)
- Canonical-source-mirror constraint: when ADR content mirrors a SESSION Event verbatim, cite the source Event reference inline

See `references/adr-authoring.md` for the full template + dispatch brief structure.

## Step 6 — Detail-parity audit

Sample ≥5 D-Ns (1 random + 1 of each `[decision]` / `[constraint]` / `[risk]` category for adversarial coverage). For each sample:

1. Read the ADR D-N section
2. Read the corresponding SESSION Event NN body
3. Compare detail density: does the ADR preserve every substantive detail (rationale, alternatives, cross-wave implications, failure modes, performance considerations)?

If compression detected on ANY sample: re-dispatch architect with revision brief naming the compressed D-Ns; do not advance to Step 7. Max 3 re-dispatch iterations; HALT with `decisions-step6-iteration-halt` if compression persists.

## Step 7 — brain:---adr-review (MANDATORY blocking gate)

`Skill(skill="brain:---adr-review")` is the multi-agent debate orchestration for the ADR. Phase 4 convergence PASS (6-agent debate consensus threshold ≥5 ACCEPT + zero BLOCK) is required before downstream work.

If non-PASS: address findings; re-author affected D-N sections; re-run Step 7. Max 3 iterations; if still non-PASS, HALT with `decisions-step7-iteration-halt` and surface to user.

## Step 8 — Flip ADR ACCEPTED

On Step 7 PASS, edit the ADR's frontmatter `status: PROPOSED → ACCEPTED` (per Contract 7). Set frontmatter `date: YYYY-MM-DD` to today's date if not already set.

Apply two-step edit pattern: ADR edit first, SESSION Event NN append ("ADR-NNN flipped PROPOSED → ACCEPTED; adr-review PASS"), project repo commit.

## Step 9 — set-part-done

```text
Skill(skill="plan", args="set-part-done plan=PLAN-NNN part=decisions.{N} outcome=<ADR wikilink>")
```

Per Contract 1. If multiple ADRs in this part (one part can produce multiple ADRs from disjoint D-N clusters), repeat Steps 4-9 per ADR. Final `set-part-done` lists ALL produced ADRs in `outcome` (primary) + `secondary_outcomes` (if more than one).

## Halt blocks

All halts use Contract 3 schema — fenced code block with `decisions-<step>-halt` info-string:

````text
```decisions-<step>-halt
trigger: <step identifier>
question: <what the halt is checking>
answer: "<machine-extractable answer or null>"
test_failed: <which test condition failed>
deferral: <how to resume after addressing>
```
````

Full halt inventory:

| Halt | Trigger | Resolution |
|---|---|---|
| `decisions-step1-tier-missing-halt` | PLAN frontmatter `complexity_tier` is TBD or missing | Invoke /research to classify, OR set manually for migration cases |
| `decisions-step2-decision-critic-halt` | decision-critic surfaces critical reasoning gap | Revise option presentation; re-ask user |
| `decisions-step2-modify-insufficient-halt` | User picks Modify but provides insufficient information to lock | Gather context (re-read ANALYSIS or dispatch additional analyst); re-ask AskUserQuestion when context arrives |
| `decisions-step2-no-acceptable-option-halt` | User rejects all options (none acceptable) | Surface options: re-open /research, dispatch additional ANALYSIS for new options, or DEFER the D-N |
| `decisions-step3.5-a-halt` | Source-traceability check fails: a D-N has no upstream ANALYSIS or PRD reference | Re-trace the D-N to source OR document orphan rationale |
| `decisions-step3.5-b-halt` | Scope-conservation check fails: a D-N adds scope beyond PRD acceptance criteria | Add scope-creep rationale in SESSION Event OR reduce D-N scope |
| `decisions-step3.5-c-halt` | Demand-signal-alignment check fails: locked D-N set doesn't address original demand | Re-open D-Ns or augment to address demand |
| `decisions-step3.5-d-halt` | Tier-consistency check fails: D-N count + depth don't match `complexity_tier` | Re-classify tier OR split the part |
| `decisions-step3.6-halt` | buy-vs-build returns BUY for unfit capability | Accept BUY anyway, pursue PARTNER, or DEFER |
| `decisions-step4-halt` | Pre-author gate triggers (over hard threshold) | Invoke `Skill(skill="plan", args="split")`; re-run /decisions per sub-part |
| `decisions-step6-iteration-halt` | Detail-parity audit fails after 3 architect re-dispatches | Surface to user; consider scope split or manual ADR authoring |
| `decisions-step7-iteration-halt` | brain:---adr-review returns non-PASS after 3 iterations | Surface adr-review findings; user adjudicates fix path |

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Locking multiple D-Ns in a single AskUserQuestion | Violates one-decision-at-a-time + Contract 4 | One D-N per AskUserQuestion; loop |
| Authoring composite ADR before all D-N locked | Drift between SESSION Events and ADR body | Author ONLY after all D-N substatuses = LOCKED |
| Skipping detail-parity audit | Composite ADR drifts from session events; expensive recovery | Audit BLOCKING before Step 7; re-dispatch architect on compression |
| Flipping ACCEPTED before adr-review PASS | Downstream consumers see un-validated ADR | adr-review is MANDATORY; ACCEPTED only after PASS |
| Batching commits across multiple D-N locks | Loses immediate-event-write invariant | One D-N = one PLAN edit + one SESSION Event + one commit |
| Skipping verbatim echo after AskUserQuestion answer | Drift between locked decision and durable record | Always echo immediately; quote label + description verbatim |
| Embedding literal ```diff blocks in the durable artifact | Diffs are reviewable artifacts, not durable content | Show diff in chat (informational); apply changes directly to body |
| Architect dispatch without detail-parity mandate | ADR gets compressed; loses SESSION Event detail | Brief MUST include "preserve every detail; do not summarize" + the 11-section template |
| Skipping Step 4 pre-author gate | Composite ADRs grow uncontrollably (44 D-Ns / 1500 lines drifts) | Always run the gate; split at hard threshold |
| Authoring D-N sections out of order in the composite ADR | Numbering drift; cross-references break | Author per the source `d_n_substatus` order; preserve D-N numbering verbatim |

## Skill dispatch resolution (Contract 9)

For any skill name dispatched, check `~/.claude/skills/<name>/SKILL.md` first; if absent, check Brain plugin path. Never fall back to ai-agents.

**Skills (Skill dispatch — `Skill(skill="...")`):**

- `brain:---decision-critic` → Brain plugin path (single canonical version; same skill used at Step 2a per-D-N stress-test here AND at /research Step 6 convergence)
- `brain:---buy-vs-build-framework` → Brain plugin path (Step 3.6 conditional re-check for new-capability D-Ns)
- `brain:---adr-review` → Brain plugin path (Step 7 MANDATORY blocking gate)

**Agents (Task dispatch — `Task(subagent_type="...")`):**

- `brain:🧠-architect` → Brain plugin agent (Step 5 composite-ADR author with detail-parity mandate)

**Excluded entirely**: `golden-principles`, `taste-lints` (Brain not aligned with these rule sets).

### Role of /decisions in the rigid cycle

/decisions runs the per-D-N analog of the build cycle: decision-critic → AskUserQuestion (with verbatim option labels and descriptions) → user adjudication → verbatim echo of the locked decision → diff approval → 2-step edit to ADR/PLAN → commit. Each D-N is its own atomic micro-cycle; never batch D-N adjudications. Locked decisions land in their destination doc within the SAME turn (no queueing). ADR ACCEPTED transitions are gated on `brain:---adr-review` PASS (BLOCKING). Composite ADRs that author REQ / DESIGN / TASK contracts produce the checkbox shapes the build cycle later validates.

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

The composition library at `shared/composition/` provides programmatic validators:

- `TaskNoteSchema` + `validateTaskDoneClaim()` — rejects implementer "DONE" claim if any DoD `[ ]` unsatisfied
- `RequirementNoteSchema` + `validateRequirementAcClaim()` — rejects REQ ACCEPTED if any AC `[ ]`
- `DesignNoteSchema` + `validateDesignComplianceClaim()` — same for DESIGN
- `SpecRootNoteSchema` + `validateSpecDoneClaim()` — same for SPEC root
- `TestReportNoteSchema` + `validateTestReportPassClaim()` — rejects QA "PASS" that doesn't match per-row results
- `PlanNoteSchema.BuildWorkflowItem` + `transition-impl-item` / `transition-qa-item` mutations — mandate session context, throw on missing

Lying agents are mechanically caught.

## Defense in depth

This protocol embeds at every enforcement layer. Single-layer enforcement fails under load.

## Reference files

- `references/decisions-phase-workflow.md` — Full Step 1-9 pipeline with per-step substeps, halt conditions, anti-patterns
- `references/per-decision-micro-cycle.md` — Sub-steps 2a-2g detailed (canonical version; the same-named file in /plan documents the cycle from /plan's perspective receiving set-part-done)
- `references/adr-authoring.md` — 11-section per-D-N template + architect dispatch brief structure + detail-parity mandate
- `references/pre-author-composite-gate.md` — Tier-aware D-N count + ADR line-count thresholds + split escalation rules
