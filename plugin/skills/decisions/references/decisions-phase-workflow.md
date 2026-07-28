# Decisions Phase Workflow — Full Step 1-9 Pipeline

The complete `/decisions` pipeline. Each step lists action, dispatch shape, halt conditions, and notes on resumability (G2 — skip steps that already produced their outputs).

## Pipeline overview

```text
Step 1: read PLAN's decisions.{N} part + source ANALYSIS notes
Step 2: per-pending-D-N micro-cycle (one D-N at a time; LOCKED only after all 7 sub-steps complete)
Step 3: 12-item canonical holistic hygiene audit + scope evaluation
Step 3.5: 4 binary drift-detection checks
Step 3.6: conditional buy-vs-build re-check
Step 4: pre-author-composite-artifact gate (tier-aware)
Step 5: architect dispatch with detail-parity mandate
Step 6: detail-parity audit
Step 7: brain:---adr-review MANDATORY blocking gate
Step 8: flip ADR PROPOSED → ACCEPTED
Step 9: set-part-done to /plan
```

**Non-negotiable invariants**:

- /decisions LOCKS choices; this is the opposite of /research (which surfaces options-with-pros/cons). Once locked, D-N choices are committed to PLAN + SESSION + ADR; reversing requires re-opening the part.
- One D-N at a time via AskUserQuestion (Contract 4); never batch.
- Two-step edit (PLAN first, SESSION second, commit third) per D-N micro-cycle iteration.
- adr-review is MANDATORY; no downstream phase proceeds until PASS.
- Architect dispatch carries the detail-parity mandate; compression triggers re-dispatch.

## Step 1 — Read inputs

Read PLAN-NNN via `mcp__plugin_brain_brain__read_note`. Locate the `decisions.{N}` part. Read every source ANALYSIS note via `read_note` (one per wikilink in `source_artifacts`).

Validate:

- PLAN frontmatter `complexity_tier` is set (TIER_1..TIER_5; not TBD)
- PLAN-part `d_n_substatus` array exists with at least 1 D-N entry
- Every source ANALYSIS note exists and is readable

HALT with `decisions-step1-tier-missing-halt` (Contract 3 severity FAIL) if `complexity_tier` is missing.

**G2 resume**: skip Step 1 only if the part is mid-flow (some D-Ns LOCKED already); on first /decisions invocation for the part, always read inputs.

## Step 2 — Per-D-N micro-cycle

For each D-N with status `PENDING` in `d_n_substatus`, execute the micro-cycle. See `per-decision-micro-cycle.md` for sub-step details.

Loop logic:

```text
WHILE any d_n_substatus entry has status PENDING:
  pick next PENDING entry (lowest D-N number first)
  execute sub-steps 2a → 2g
  on completion, the entry's status is LOCKED with verbatim decision text
  loop
```

**G2 resume**: skip already-LOCKED entries; resume at first PENDING.

**HALT mid-loop**: if any sub-step halts (e.g., decision-critic critical gap, AskUserQuestion modify-without-context), the entry stays PENDING; the loop pauses; user resumes via re-invoking /decisions (G2 resume picks up where it stopped).

## Step 3 — Hygiene audit + scope evaluation

After all D-Ns LOCKED, run the 12-item canonical holistic hygiene audit on the PLAN's MUTATE-in-place sections:

1. `## Tasks` section current for the part (Active / Backlog / Archive tables consistent with current D-N work)
2. `## Workflow Plan` for the part reflects the current Step 2 progress
3. `## Scope` section's `**Part(s)**:` rows accurate
4. Mermaid intra-part Deps Graph nodes match current D-N states
5. `## Pending User Decisions` cleared (all locked via D-N substatus list now)
6. `## Editor Mirror IDs` table current
7. `## Observations` includes any new observations from D-N adjudications
8. `## Relations` includes any new wikilinks
9. PLAN top-level `## Progress Dashboard` rollup current
10. PLAN `## Cross-Part Dependency Graph` reflects current part state
11. `## Decision Log` (plan-level) has entries for D-N adjudication events
12. `## Progress Log` (plan-level) has entries for status transitions

Apply fixes via Brain MCP `edit_note`. Two-step pattern per edit (PLAN edit → SESSION Event → commit).

Then evaluate part scope: D-N count + estimated ADR line count vs `pre-author-composite-gate.md` thresholds. If soft threshold tripped: emit warning. If hard threshold tripped: escalate to Step 4 (which will HALT).

## Step 3.5 — Drift-detection checks (4 binary)

Adapted from canonical drift-detection patterns. Each check is binary PASS/FAIL; any FAIL HALTs:

### (a) Source traceability

Every LOCKED D-N must trace to at least one ANALYSIS finding OR PRD requirement from /research. Orphan D-Ns (decisions without upstream source) are scope creep.

Method: for each LOCKED D-N, search the SESSION Event NN (where it was locked) for explicit reference to ANALYSIS-NNN OR PRD-NNN section. If no reference found: FAIL.

HALT: `decisions-step3.5-a-halt`. Resolution: re-trace the D-N to source OR document why it's an orphan (was the source missing from /research? GOTO /research to fill gap).

### (b) Scope conservation

No LOCKED D-N adds scope beyond the PRD's acceptance criteria without explicit documented rationale (scope-creep marker in SESSION Event).

Method: for each LOCKED D-N, check that its scope ∈ PRD acceptance criteria coverage OR has explicit scope-creep rationale in the SESSION Event body.

HALT: `decisions-step3.5-b-halt`. Resolution: add scope-creep rationale to the SESSION Event OR reduce the D-N scope to fit PRD.

### (c) Demand-signal alignment

The primary blocked entity from the PRD (Q3-equivalent when present) is still addressed by the locked D-N set. Drift here = D-Ns optimized something other than the original demand.

Method: read PRD's Q3 (blocked entity) + Q4 (wedge); cross-reference against the LOCKED D-N set. If the LOCKED set doesn't address the original demand: FAIL.

HALT: `decisions-step3.5-c-halt`. Resolution: surface drift to user; possibly re-open D-Ns OR augment with additional D-Ns addressing the demand.

### (d) Tier consistency

D-N count + decision depth match the PLAN's `complexity_tier`. Mismatch signals:

| Tier | Expected D-N count range |
|---|---|
| 1-2 | 1-8 |
| 3 | 4-15 |
| 4-5 | 8-25 (composite allowed; >40 too broad) |

Tier 1-2 with 15+ D-Ns = under-scoped tier (should be Tier 3+); Tier 4-5 with 2 D-Ns = over-scoped tier (should be Tier 1-2).

HALT: `decisions-step3.5-d-halt`. Resolution: re-classify tier (update PLAN frontmatter); OR split the part if D-N count exceeds upper bound.

## Step 3.6 — Conditional buy-vs-build re-check

For each LOCKED D-N, check: does the locked option introduce a new tool / library / external service the project doesn't already have?

If YES for any D-N: invoke `Skill(skill="brain:---buy-vs-build-framework")` BEFORE Step 4. Pass the LOCKED option content as input. Catches capability decisions that should have been gated at /research Step 3 but slipped through.

| Framework verdict | Action |
|---|---|
| BUILD (fits constraints) | Document in ADR Context section; proceed to Step 4 |
| BUY (fits constraints) | Document; proceed |
| BUY (doesn't fit constraints) | HALT `decisions-step3.6-halt`; user adjudicates: accept BUY anyway, PARTNER, or DEFER |
| PARTNER | Document; surface partner identification as a follow-up D-N if needed; proceed |
| DEFER | HALT `decisions-step3.6-halt`; D-N must be re-opened (set back to PENDING; loop to Step 2) |

**G2 resume**: skip Step 3.6 if no LOCKED D-N introduces a new capability OR if a `step3.6-passed` marker exists.

## Step 4 — Pre-author-composite-artifact gate

See `pre-author-composite-gate.md` for full threshold tables + escalation rules. Summary:

- Evaluate D-N count vs tier-aware soft/hard thresholds
- Evaluate estimated ADR line count (sum of D-N section line estimates) vs tier-aware soft/hard thresholds
- Soft threshold: emit warning; proceed
- Hard threshold: HALT `decisions-step4-halt`; require `Skill(skill="plan", args="split")`; re-run /decisions per sub-part

**G2 resume**: skip if gate-passed marker exists for current D-N count + tier.

## Step 5 — Architect dispatch

`Task(subagent_type="brain:🧠-architect")` — see `adr-authoring.md` for the full dispatch brief structure.

Required brief elements:

- The PLAN-part `d_n_substatus` (all LOCKED D-Ns with verbatim decision text)
- The corresponding SESSION Event NN entries (canonical raw material)
- The 11-section per-D-N template (`adr-authoring.md`)
- **Detail-parity mandate** (exact phrase): "Preserve every detail from SESSION events; do not summarize. The composite ADR's per-D-N section must be AT LEAST as detailed as the corresponding SESSION Event body. Compression detected during the detail-parity audit triggers re-dispatch."
- Evidence hierarchy (tool output > files read > web/docs > training knowledge)
- Canonical-source-mirror constraint (cite SESSION Event references inline when mirroring)
- Reviewer-asymmetry directive (architect operates as author with detail-parity discipline; review is downstream via adr-review)

Architect writes the ADR via a single Brain MCP `write_note` call passing the full colon title. Frontmatter:

```yaml
---
title: "ADR-NNN: {Topic Title Case}"
type: decision
status: PROPOSED
date: YYYY-MM-DD                  # set on first PROPOSED transition (today)
updated: YYYY-MM-DD               # same as date initially
permalink: decisions/adr-nnn-{slug}
tags: [adr, decision, ...]
---
```

**G2 resume**: skip Step 5 if a composite ADR with status PROPOSED already exists for this `decisions.{N}` part covering all LOCKED D-Ns.

## Step 6 — Detail-parity audit

Sample selection rules:

- **5 D-Ns minimum**: 1 randomly selected + 1 per category from `[decision]`, `[constraint]`, `[risk]` SESSION Event observations (adversarial coverage)
- **For each sample**:
  1. Read the ADR D-N section
  2. Read the corresponding SESSION Event NN body (the locked decision verbatim quote + any sub-bullets)
  3. Compare: does the ADR preserve every substantive detail (rationale, alternatives considered, cross-wave implications, failure modes, performance / security / ops considerations, configuration knobs, reversibility, user refinements)?

Compression signals (any one triggers FAIL):

- ADR omits substantive content from the SESSION Event
- ADR paraphrases instead of preserving exact wording on locked options
- ADR collapses multiple bullets into a single sentence
- ADR drops a sub-section (e.g., "Failure Modes" present in Event but missing in ADR)

On compression: re-dispatch architect with revision brief naming the compressed D-Ns. Max 3 re-dispatch iterations. HALT `decisions-step6-iteration-halt` if still compressed.

**G2 resume**: skip if audit-passed marker exists.

## Step 7 — brain:---adr-review (MANDATORY blocking gate)

`Skill(skill="brain:---adr-review")` is the multi-agent debate orchestration. Phase 4 convergence PASS = 6-agent debate consensus threshold ≥5 ACCEPT + zero BLOCK.

If verdict ∈ {PASS, ACCEPTED}: proceed to Step 8.

If verdict ∈ {REQUEST_CHANGES, REJECTED, NON_COMPLIANT}: address findings per the review report; re-author affected D-N sections; re-run Step 7. Max 3 iterations. HALT `decisions-step7-iteration-halt` if still non-PASS — surface to user with options:

- Accept findings + revise + re-run
- Surface to architect for deeper revision
- Override adr-review with explicit rationale (DOCUMENT in Decision Log; not Recommended; downstream consumers should see the override marker)

**G2 resume**: skip if PASS marker present.

## Step 8 — Flip ADR ACCEPTED

Edit ADR frontmatter: `status: PROPOSED → ACCEPTED`. Update `date: YYYY-MM-DD` if first-time accept (already set in Step 5); update `updated: YYYY-MM-DD` to today.

Apply two-step edit:

1. ADR `edit_note` (find_replace on status line + update line)
2. SESSION Event NN append: `Type: state-change`, body: "ADR-NNN flipped PROPOSED → ACCEPTED; adr-review PASS"
3. Project repo commit

**G2 resume**: skip if ADR status is already ACCEPTED.

## Step 9 — set-part-done

```text
Skill(skill="plan", args="set-part-done plan=PLAN-NNN part=decisions.{N} outcome=<ADR wikilink>")
```

Per Contract 1.

**Multi-ADR parts**: if the part produced multiple ADRs (e.g., D-N cluster split across 2 ADRs by feature scope), repeat Steps 4-9 per ADR. Final `set-part-done` lists all ADRs:

```text
Skill(skill="plan", args="set-part-done plan=PLAN-NNN part=decisions.{N} outcome=[[ADR-NNN-1: ...]] secondary_outcomes=[[ADR-NNN-2: ...]],[[ADR-NNN-3: ...]]")
```

After /plan receives set-part-done:

- /plan flips `decisions.{N}` part status → DONE; sets `completing_session`
- /plan two-step edit + commit
- /plan surfaces "next-ready part" recommendation; user re-invokes /plan PLAN-NNN to continue

## Halt conditions (full inventory)

| Halt | Trigger | Resolution |
|---|---|---|
| `decisions-step1-tier-missing-halt` | PLAN frontmatter `complexity_tier` is TBD or missing | Invoke /research; or set manually for migration |
| `decisions-step2-decision-critic-halt` | decision-critic surfaces critical reasoning gap | Revise option presentation; re-ask |
| `decisions-step3.5-a-halt` | Source-traceability check fails | Re-trace D-N to ANALYSIS/PRD or document why orphan |
| `decisions-step3.5-b-halt` | Scope-conservation check fails | Add scope-creep rationale or reduce D-N scope |
| `decisions-step3.5-c-halt` | Demand-signal-alignment check fails | Re-open D-Ns or augment to address demand |
| `decisions-step3.5-d-halt` | Tier-consistency check fails | Re-classify tier or split part |
| `decisions-step3.6-halt` | buy-vs-build returns BUY for unfit capability | Accept BUY, PARTNER, or DEFER (re-opens D-N) |
| `decisions-step4-halt` | Pre-author gate triggers (over hard threshold) | Invoke `/plan --split`; re-run /decisions per sub-part |
| `decisions-step6-iteration-halt` | Detail-parity audit fails after 3 architect re-dispatches | Surface to user; scope split or manual ADR authoring |
| `decisions-step7-iteration-halt` | adr-review non-PASS after 3 iterations | Surface findings; user adjudicates fix path |

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Locking multiple D-Ns in a single AskUserQuestion | Violates one-decision-at-a-time | One D-N per call; loop |
| Authoring composite ADR before all D-N locked | Drift between SESSION Events and ADR | Author ONLY after all D-N substatuses = LOCKED |
| Skipping detail-parity audit | Composite ADR drifts; expensive recovery | Audit BLOCKING before Step 7 |
| Flipping ACCEPTED before adr-review PASS | Downstream consumers see un-validated ADR | adr-review MANDATORY; ACCEPTED only after PASS |
| Batching commits across D-N locks | Loses immediate-event-write invariant | One D-N = one PLAN edit + one SESSION Event + one commit |
| Architect dispatch without detail-parity mandate | ADR gets compressed | Brief MUST include exact mandate phrase + 11-section template |
| Skipping Step 4 pre-author gate | Composite ADRs grow uncontrollably | Always run gate; split at hard threshold |
| Step 3.5 checks with non-adversarial briefs | Reviewer accepts surface-level patterns | Briefs include reviewer-asymmetry mandate |
| Overriding adr-review without documented rationale | Quality gate bypass; silent downstream risk | Override requires explicit Decision Log entry naming the bypass |
