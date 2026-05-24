# Auto-Routing from `/plan PLAN-NNN`

When `/plan PLAN-NNN` is invoked without an explicit `--part` flag, the skill auto-routes to the matching phase skill for the next-ready part. Sourced from D-03 + Contract 2.

## Continue mode pipeline (auto-routing)

1. Read PLAN-NNN via `mcp__plugin_brain_brain__read_note`.
2. Validate `complexity_tier` is set (not `TBD`); halt and surface if missing (per Contract 8).
3. Validate branch state — if current branch is `main` or `master`, derive a branch name from PLAN scope + create + switch (per the branch policy in SKILL.md).
4. Identify the next-ready part:
   - Status = `READY` AND all `dependencies` have status = `DONE`
   - If multiple parts qualify: surface via `AskUserQuestion` with the candidate list + dependency context; pick the lowest-numbered as the Recommended default
5. Set the part's status → `IN_PROGRESS`; set `owning_session` to the current session identifier.
6. Apply the two-step edit pattern (`references/two-step-edit-pattern.md`): PLAN edit → SESSION Event append → project repo commit.
7. Dispatch to the matching phase skill via the Contract 2 dispatch shape.

## Contract 2 dispatch shape

```text
Skill(skill="<research|decisions|spec|build|review>",
      args="plan=PLAN-NNN part=<part-id> [phase-specific args]")
```

Phase mapping (part.phase → skill):

| part.phase | Dispatched skill |
|---|---|
| research | `research` |
| decisions | `decisions` |
| spec-decomposition | `spec` (Stage 1 mode) |
| spec | `spec` (Stage 2 mode) |
| build | `build` |
| review | `review` |
| end | (no dispatch; `/end` is user-invoked) |

`end` is NOT in the auto-routing target set. After all build/review parts complete, /plan surfaces "next-ready part: end" but does not auto-invoke. The user types `/end` directly.

## Phase-specific args

| Phase | Required args |
|---|---|
| `research` | When auto-routed: just `plan=` + `part=`. When invoked directly without auto-routing: `topic=` + `context=` + `urls=` |
| `decisions` | `source_analyses=[[ANALYSIS-NNN: ...]],[[ANALYSIS-NNN: ...]]` (sourced from the part's `source_artifacts`) |
| `spec` Stage 1 | `source_adrs=[[ADR-001: ...]],...` (sourced from `source_artifacts`) |
| `spec` Stage 2 | `spec=SPEC-NNN` + `source_adrs=...` |
| `build` | `spec=SPEC-NNN` (extracted from `part.id` — e.g., `build.SPEC-001` → `spec=SPEC-001`) |
| `review` | `target=<diff|file|spec>` (default `diff` when invoked from a build/review part); `pr_type=<code|docs|config|test>` (optional; auto-classified by `/review` Step 2 if omitted) |

## Completion signal — Contract 1 set-part-done

The phase skill signals completion back to `/plan` via:

```text
Skill(skill="plan", args="set-part-done plan=PLAN-NNN part=<part-id> outcome=[[<wikilink>]] [status=DONE|DEFERRED|ABANDONED] [rationale=<text if not DONE>]")
```

### set-part-done handling in /plan

1. Validate `outcome` is a wikilink (`[[Entity Title]]` with colon matching target frontmatter).
2. Apply outcome to the part's `outcome` field.
3. Set `part.status` to the provided `status` (default `DONE`).
4. Set `part.completing_session` to the current session identifier.
5. If `status` ∈ {`DEFERRED`, `ABANDONED`}: verify `rationale` is present; halt if missing.
6. Apply the two-step edit pattern (PLAN edit → SESSION Event append → commit).
7. Identify the next-ready part (re-evaluate dependencies after this part's DONE):
   - If a single new part is now READY: surface as "next available: continue with /plan PLAN-NNN".
   - If multiple parts are now READY: surface the list as recommendations.
   - If no parts are READY but the workflow has remaining BLOCKED parts: surface blockers.
   - If all parts are DONE: surface "all parts complete; run /end to close the session and create the PR."
8. **Do not auto-invoke the next phase skill** — the user re-invokes `/plan PLAN-NNN` (or `/end`) to continue. Auto-progression within a single turn is forbidden; each phase warrants a fresh user-driven invocation for oversight.

## Continue-part mode

`/plan PLAN-NNN --part <part-id>` skips the "find next-ready" step and uses the user-provided part directly. All other steps (branch check, IN_PROGRESS transition, two-step edit, auto-dispatch) apply identically.

Validation: the user-provided `part-id` MUST exist in the PLAN AND have status ∈ {`READY`, `IN_PROGRESS`}. If `PENDING`: halt (dependencies unmet). If `DONE` / `DEFERRED` / `ABANDONED`: halt (already terminal). If `BLOCKED`: halt with blocker context.

## Halt conditions

| Condition | Halt name | Resolution |
|---|---|---|
| PLAN-NNN not found | `plan-continue-not-found-halt` | Verify PLAN identifier; check `docs/planning/` listing |
| `complexity_tier` is `TBD` or missing | `plan-tier-missing-halt` | Invoke `/research` to classify before continuing (or set manually for migration cases) |
| No part is READY | `plan-no-ready-halt` | Resolve a blocker on a `BLOCKED` part, OR all parts DONE → run `/end` |
| Multiple parts READY with no clear recommendation | (not a halt; surfaces via AskUserQuestion) | User picks |
| Dispatched skill missing at both Brain locations + BLOCKING | `plan-dispatch-missing-halt` | Port the skill OR replace with a Brain-side alternative (per Contract 9) |
| set-part-done with invalid `outcome` wikilink | `plan-set-part-done-invalid-halt` | Phase skill resubmits with corrected wikilink matching target frontmatter title |

All halt blocks use the Contract 3 schema (fenced code block with `<skill>-<step>-halt` info-string).

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Auto-invoking the next phase skill after set-part-done | Bypasses user oversight; user can't intervene between phases | Surface next-ready part as recommendation; user re-invokes /plan PLAN-NNN |
| Skipping the `complexity_tier` validation in continue mode | Downstream phase skills will halt anyway — surface the gap at /plan time for cleaner UX | Halt at /plan Step 2 if tier is missing |
| Picking next-ready part silently when multiple qualify | User loses agency over which work to start | AskUserQuestion with candidate list |
| Dispatching without sourcing `source_artifacts` from the part | Phase skill receives no inputs, has to re-discover them | Source from `part.source_artifacts`; pass via phase-specific args |
| Marking part DONE on dispatch (eager-DONE) | Phase skill hasn't actually finished; set-part-done is the canonical signal | Set IN_PROGRESS on dispatch; DONE only via inbound set-part-done call |
