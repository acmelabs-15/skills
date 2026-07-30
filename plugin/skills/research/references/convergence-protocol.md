# Convergence Protocol — Step 6-8

The convergence check that bridges Stage 1 (PRD) and Stage 2 (per-requirement analyses) into a converged "/research complete" state. Runs the critic + decision-critic in parallel, collects gap findings, decides GOTO (loop back to Step 1 or Step 5) or proceed (Step 8 user-confirms termination).

## Why convergence matters

Without convergence, silent gaps surface during the /decisions phase — and once /decisions starts locking choices, going back to /research is expensive (re-opens settled options, requires re-adjudication). Convergence is the cheap fail-fast point.

The check is structured around adversarial review (reviewer-asymmetry per cross-cutting principle): both agents review the work as if seeing it for the first time, without access to the implementer/analyst's reasoning. "Looks good" is a failure mode; the agents must surface concrete concerns even on strong work.

## Step 6 — Run convergence in parallel

Dispatch both agents simultaneously (one batch):

```text
Task(subagent_type="brain:🧠-critic", ...)
Skill(skill="brain:---decision-critic", ...)
```

### Critic brief (gap analysis)

```text
You are reviewing the analysis-phase output for PRD-NNN: {Topic} as a stranger to the
work that produced it. You have not seen the analyst's reasoning; you only have the
PRD + the {M} ANALYSIS-NNN notes produced.

Your task: surface gaps. Gap categories:

1. Missing requirements — the PRD covers X but not Y; Y is implied by the demand
   signal but missing from the EARS-traced list
2. Insufficient analyses — ANALYSIS-NNN has 2 options but the requirement reasonably
   has 5+ viable approaches; the analysis is shallow
3. Coverage gaps — the 7-branch checklist (user stories / data model / integrations /
   failure modes / security / observability / scope boundaries) has thin coverage
   somewhere
4. Cross-analysis inconsistencies — Option A in ANALYSIS-NNN-1 would conflict with
   Option B in ANALYSIS-NNN-2 if both selected; the analyses don't acknowledge each
   other
5. Edge-case under-treatment — happy paths covered; failure modes / partial states /
   retries / replays / schema evolution sparse

For every finding, cite file:line evidence (the ANALYSIS path + section) or
wikilink to a Brain entity. Vague concerns get rejected.

"Looks good" is a failure mode. If you genuinely cannot find any concerns,
document why explicitly with file:line evidence.
```

### Decision-critic brief (assumption stress-test)

```text
You are reviewing the analysis-phase output for PRD-NNN: {Topic} as a stranger to
the work. Your task is to stress-test the assumptions baked into the analyses.

For each ANALYSIS-NNN, surface:

1. Hidden assumptions — claims presented as facts that actually require evidence
2. Verification gaps — claims that COULD be verified but weren't (cite the
   verification that should have run)
3. Adversarial perspectives — counterarguments the analysis didn't address
4. Anchoring bias — analyses that converge around an early option without genuine
   alternatives consideration
5. Sunk-cost reasoning — analyses that justify continuing a chosen path because
   of prior investment rather than current merit

For every finding, cite the specific claim being challenged + the evidence that
would resolve it (or note that the evidence cannot be obtained).

"Reasoning is sound" is a failure mode. Find at least one stress-test result per
ANALYSIS even on strong work.
```

### Parallel dispatch + result merge

Both agents run in parallel (one Bash batch of two Task tool calls). When both return, merge their findings into a single "Convergence Findings" report. Categorize per the gap categories above.

## Step 7 — GOTO decision

Convergence Findings drives the next action:

```text
IF no critical gaps AND no new requirements:
   → proceed to Step 8 (user-confirms termination)

ELSE IF new requirements identified:
   → GOTO Step 1 (enhance PRD with new reqs; loop)
   → after PRD update: GOTO Step 5 (dispatch analyses for new reqs)

ELSE IF insufficient analyses (refinement needed, no new reqs):
   → GOTO Step 5 (re-dispatch flagged analyses with refined briefs)

ELSE IF architectural inconsistency requiring scope re-think:
   → HALT via research-step6-critical-gap-halt
   → surface to user
   → the user decides whether the plan's scope changes; do not act on it unasked
```

The loop iteration counter is tracked in PRD frontmatter as `convergence_iteration: N` (1-based). Resource bounds (`resource-bounds.md`) cap this at 3.

## Step 8 — User-confirms termination

When Step 6 returns clean (no critical gaps, no new requirements), the orchestrator must NOT silently proceed to Step 9 — user confirmation closes the analysis phase explicitly. Surface via `AskUserQuestion` (per Contract 4):

```text
Question: "Convergence reached. {N} requirements covered by {M} ANALYSIS notes;
{K} options per requirement on average; {L} convergence iterations. Confirm
/research complete and proceed to /decisions, or surface additional requirements
to investigate?"

Options:
  1. Confirm complete (Recommended) — proceed to Step 8.5 retrieval-density pass,
     then Step 9 set-part-done. /research closes; /plan surfaces next-ready part
     (decisions.1) as recommendation.
  2. Surface additional requirements — GOTO Step 1 to enhance PRD with new
     requirements I'll specify. New convergence iteration.
  3. Surface specific gaps — GOTO Step 5 to re-dispatch specific analyses with
     gap-focused briefs. No PRD changes; new convergence iteration.
  4. Pause — halt /research with status DEFERRED on the part; resume later.
     /plan part frontmatter records the deferral rationale.
```

Apply the decision-binding echo (Contract 4 verbatim echo template). Then act on the choice.

## Loop iteration mechanics

When the loop fires (Option 2 or 3 from Step 8, or auto-decided in Step 7):

1. Increment `convergence_iteration` on PRD frontmatter (1 → 2 → 3 max).
2. Execute the loop:
   - For new requirements: re-run Step 1 (interview scoped to new reqs only) → Step 5 (dispatch only for new reqs; G2 resume preserves existing analyses)
   - For gap-refinement: re-run Step 5 (re-dispatch flagged analyses with refined briefs; replaces or supplements existing ANALYSIS notes)
3. Re-run Step 6 convergence on the enhanced set.
4. Check iteration budget (max 3 per `resource-bounds.md`); HALT if exceeded.

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Running Step 6 with non-adversarial briefs | "Looks good" returns are useless | Briefs MUST embed reviewer-asymmetry mandate + "find at least one concrete concern" + cite-evidence requirement |
| Skipping decision-critic because critic already ran | Different lenses surface different findings | Both agents run in parallel; their outputs complement |
| Auto-proceeding from Step 7 to Step 8 without user confirmation | User loses agency over loop continuation | Step 8 AskUserQuestion is non-skippable |
| Looping endlessly when each iteration surfaces new gaps | Convergence is never reached; user fatigue | Max 3 iterations per `resource-bounds.md`; HALT and surface the gaps for a scope decision |
| Treating critical findings as non-blocking | Settled options re-open downstream | Critical architectural inconsistencies HALT (research-step6-critical-gap-halt) |
| Re-running entire pipeline from Step 0 on loop | Wasted first-principles + memory-first work | Loop re-enters at Step 1 (interview scoped to new reqs); Step 0/0.5 marked PASSED stays passed |
| Mixing PRD content edits with analysis dispatches in same turn | Mutation interleaving = harder rollback | Each loop iteration: edit PRD first → commit → dispatch analyses → commit → run convergence → commit |

## Convergence Findings report format

The merged report from Step 6 follows this structure (for traceability + downstream consumption):

```markdown
## Convergence Findings — Iteration {N}

**Date**: YYYY-MM-DD
**PRD**: PRD-NNN-{slug}
**ANALYSIS set**: {count} notes
**Critic dispatch**: {evidence-cite}
**Decision-critic dispatch**: {evidence-cite}

### Critical (blocks proceed-to-decisions)
- {finding} — cite: {ANALYSIS-NNN}#section
- ...

### High (refinement needed; loop)
- {finding} — cite: {ANALYSIS-NNN}#section
- ...

### Medium (worth resolving; loop optional)
- {finding}

### Low (note for /decisions consideration; do not loop)
- {finding}

### New requirements identified
- {req statement} — derived from: {analysis path or critic observation}

### Architectural inconsistencies
- {description} — cite Option A in {ANALYSIS-NNN-1} vs Option B in {ANALYSIS-NNN-2}
```

This report becomes a "Convergence Findings" sub-section in the PRD body (appended via Brain MCP `edit_note`). On loop iteration, the new convergence run appends a new `## Convergence Findings — Iteration {N+1}` sub-section; prior iterations stay as historical record.
