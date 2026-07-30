# Resource Bounds + Degradation Protocol — Step 8.6

Bounds on /research execution to prevent runaway loops, gracefully handle missing tools, and recover from transient failures. Sourced from Contract 3 degradation rules + Step 8.6 in the pipeline.

## Iteration budget

The convergence loop (Steps 1 → 6 → 7) has a hard cap of **3 iterations**.

```text
Iteration 1: initial PRD + initial analyses + convergence check
   → if gaps: iteration 2
Iteration 2: enhanced PRD + additional analyses + convergence check
   → if gaps: iteration 3
Iteration 3: enhanced PRD + additional analyses + convergence check
   → if still gaps: HALT
```

On the 3rd iteration's convergence failure, HALT via `research-step8-convergence-halt`:

````text
```research-step8-convergence-halt
trigger: Step 8 convergence loop
question: Did the 3rd convergence iteration close all gaps?
answer: "no"
test_failed: max iteration budget exhausted; gaps remain
deferral: Surface the scope concern and STOP. The user decides what to narrow; nothing is split automatically.
```
````

Surface to user:

> "Convergence loop exhausted after 3 iterations. {N} gaps remain unresolved: {list them}. The scope is likely too broad for a single /research pass. Tell me how to narrow it — which of these gaps belong to this part, and which belong somewhere else."

Track iteration count on PRD frontmatter as `convergence_iteration: N`. Each loop iteration increments via `mcp__plugin_brain_brain__edit_note`.

### When 3 iterations isn't enough

If the user wants to push past 3 iterations for legitimate reasons (e.g., a genuinely complex domain where convergence requires many rounds), surface via `AskUserQuestion`:

```text
Question: "Convergence iteration cap reached (3). Options?"

Options:
  1. Narrow this part's scope (Recommended)
     — Say which of the unresolved gaps belong to this part and which do not. The ones that do not become a separate part, or a separate plan. This is a scope decision, so it is yours; nothing is restructured without it.
  2. Extend the iteration cap for this part
     — Run N more iterations on the same scope. Reasonable for a genuinely deep domain, and usually a sign the part is too broad — which option 1 addresses directly.
  3. Defer the part
     — Transition it to DEFERRED with a rationale, and resume later. A real terminal state, so the phase can close over it.
  4. Abandon the part
     — Transition it to ABANDONED with a rationale. Downstream phases skip it.
```

## Skill / tool degradation protocol

Per Contract 3, the degradation protocol applies to non-Brain-MCP tools (ai-agents skills, project-specific linters, external MCPs). **Brain MCP is always available** — never write degradation logic for Brain MCP itself.

### When a dispatched skill is unavailable

Resolution order (Contract 9):

1. Check `~/.claude/skills/<name>/SKILL.md` first
2. If absent, check Brain plugin path (`~/.claude/plugins/cache/brain/brain/<version>/skills/<name>/`)
3. If absent at both:
   - If the step marks the skill BLOCKING (e.g., Step 3 buy-vs-build for new-capability decisions): emit halt block with `severity: FAIL`; HALT
   - Otherwise: emit coverage-note with `severity: INFO`; CONTINUE

### Coverage-note schema (severity INFO)

```text
```research-coverage-note
trigger: <step identifier>
tool_unavailable: <skill or external tool name — never Brain MCP, which is always available>
reason: <error message or "tool not installed">
severity: INFO
deferral: <what gap this creates; how to backfill later>
```
```

Example for an unavailable CVA skill at Tier 1-2 (where CVA is skipped anyway):

```text
```research-step4-coverage-note
trigger: Step 4 CVA conditional
tool_unavailable: brain:---cva-analysis
reason: skill not at expected Brain plugin path
severity: INFO
deferral: Tier 1-2 path; CVA was already going to skip. No actual coverage loss. Re-check at next /research invocation.
```
```

Example for an unavailable buy-vs-build skill at Step 3 with new capability (BLOCKING):

```text
```research-step3-halt
trigger: Step 3 buy-vs-build (BLOCKING for new capabilities)
tool_unavailable: brain:---buy-vs-build-framework
reason: skill not at expected Brain plugin path
severity: FAIL
deferral: Port the skill from upstream OR replace with a Brain-side alternative (e.g., manual buy-vs-build matrix in PRD body); cannot proceed without this evaluation.
```
```

### Skills currently verified present at Brain locations

| Skill | Location |
|---|---|
| `requirements-interview` | `~/.claude/skills/requirements-interview/` (user-level) |
| `brain:---buy-vs-build-framework` | Brain plugin path |
| `brain:---cva-analysis` | Brain plugin path |
| `brain:---decision-critic` | Brain plugin path |
| `brain:---chestertons-fence` | Brain plugin path (NOT auto-invoked; memory-first auto-rule is used instead) |

If any of these become unavailable at runtime, the degradation protocol fires per the table above.

## Search-failure fallback

When `mcp__plugin_brain_brain__search` returns zero results or an error during Step 0.5 (memory-first) or Step 5 analyst briefs, retry with 2 alternative queries before noting as a coverage gap.

Alternative query patterns:

| Original | Alternatives |
|---|---|
| `[topic] approach` | `[topic] decision`, `[topic] pattern` |
| `[component] purpose` | `[component] why`, `[component] rationale` |
| `[workflow] history` | `[workflow] origin`, `[workflow] precedent` |
| `[constraint] reason` | `[constraint] justification`, `[constraint] origin` |

If all 3 queries return empty: emit a coverage-note:

```text
```research-search-empty-coverage-note
trigger: Brain MCP search returned empty for 3 query variants
queries_attempted: <list of 3 queries>
severity: INFO
deferral: No prior Brain memory on this topic. Treat as greenfield; document the gap in PRD's "Memory-First Context" sub-section ("No prior Brain memory found; treating as new topic").
```
```

If the search ERRORS (vs returns empty): this is a Brain MCP failure. Brain MCP is supposed to be always available — surface as a system-level halt (`research-brain-mcp-error-halt`):

```text
```research-brain-mcp-error-halt
trigger: Brain MCP search threw an error
error: <error message>
severity: FAIL
deferral: Brain MCP must be operational for /research to proceed. Restart the MCP connection (bootstrap_context); if persistent, escalate to user.
```
```

## Per-skill timing budgets

Soft budgets (warn if exceeded; do not halt unless other gates trip):

| Step | Soft budget |
|---|---|
| Step 0 first-principles | 5 min (mostly mechanical) |
| Step 0.5 memory-first | 2 min |
| Step 1 requirements-interview | 30-90 min (depends on complexity; user-driven) |
| Step 2 tier classification | 5 min |
| Step 3 buy-vs-build | 10-30 min (only when new capability in scope) |
| Step 4 CVA | 15-45 min (only at Tier 3+) |
| Step 5 per-requirement analyst dispatch | 5-15 min per requirement (parallel) |
| Step 6 convergence | 15-30 min (parallel critic + decision-critic) |
| Step 7 GOTO | 2 min (decision logic) |
| Step 8 user-confirms | 5 min (user response) |
| Step 8.5 retrieval-density pass | 3-10 min per ANALYSIS |
| Step 8.6 (this) | 2 min (cleanup) |
| Step 9 set-part-done | 1 min |

These budgets are advisory. The hard cap is the 3-iteration convergence loop budget.

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Looping past 3 iterations without surfacing the halt | Bypasses the user-agency point on scope | Always halt at iteration 3 + surface options |
| Treating Brain MCP unavailability as a coverage-note (INFO) | Brain MCP is always available; an unavailability is a system error | Surface as research-brain-mcp-error-halt (severity FAIL) |
| Skipping retry on search empty | Single-query empty might be query-phrasing problem, not actual gap | Retry with 2 alternative queries before noting coverage gap |
| Auto-extending the iteration budget without user confirmation | User loses agency over scope decisions | AskUserQuestion before extending; the Recommended default is narrowing the part's scope, which is the user's call |
| Coverage-note for a BLOCKING tool | BLOCKING means the step cannot proceed without the tool | Halt with severity FAIL; never coverage-note for BLOCKING |
| Skipping coverage-note for non-BLOCKING tools | Silent gaps surface downstream | Always emit coverage-note (severity INFO) for any non-BLOCKING tool unavailability |
