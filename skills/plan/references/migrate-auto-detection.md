# Migrate — Explicit-Only Invocation Protocol

**REVISED 2026-05-19**: this skill no longer runs auto-detection during `/plan create`. Per the D-13 revision (user clarification: "no auto-migration in any form"), migrate mode fires ONLY when the user explicitly invokes `/plan --migrate`. The 4× `list_directory` sweep + classification + binding logic still applies, but only under explicit invocation.

The remaining content describes the 4× sweep + classification used INSIDE `/plan --migrate`. Sourced from D-13 (revised).

## 4× list_directory sweep (inside explicit /plan --migrate only)

Run these 4× Brain MCP calls in parallel (only when /plan --migrate is invoked; never on /plan create):

```text
mcp__plugin_brain_brain__list_directory({ dir_name: "analysis" })   → count + identifier list
mcp__plugin_brain_brain__list_directory({ dir_name: "decisions" })  → count + identifier list
mcp__plugin_brain_brain__list_directory({ dir_name: "specs" })      → count + identifier list
mcp__plugin_brain_brain__list_directory({ dir_name: "sessions" })   → count + identifier list (filter IN_PROGRESS / PAUSED)
```

Also run a 5th check:

```text
mcp__plugin_brain_brain__list_directory({ dir_name: "planning" })   → check for any existing PLAN-NNN
```

## Decision logic

```text
existing_plan_count = list_directory("planning") filtered to PLAN-* entries
artifact_count = analysis_count + decisions_count + specs_count + sessions_count

IF existing_plan_count > 0:
  → user invoked /plan create but a PLAN exists; halt and surface
    "PLAN-NNN already exists. Did you mean /plan PLAN-NNN (continue) or /plan PLAN-NNN --migrate?"
  → exit /plan create cleanly

ELSE IF artifact_count < 3:
  → near-clean slate; proceed with /plan create (fresh PLAN)

ELSE:
  → substantial artifacts without a PLAN; surface migrate-or-fresh via AskUserQuestion
```

## AskUserQuestion: migrate or fresh

When substantial artifacts exist without a PLAN, surface:

```text
Question: "Detected {N} analyses + {M} ADRs + {J} sessions + {K} specs without a PLAN. Migrate first, or start fresh?"

Options:
  1. Migrate (Recommended)
     - Switch to /plan --migrate mode (retrofit content-preservation audit + reference-gathering)
     - Existing artifacts get bound to the new PLAN as source_artifacts
     - Continue work with the new PLAN binding the existing artifacts together
  2. Start fresh
     - Proceed with /plan create (new PLAN; existing artifacts remain but are NOT bound to the new PLAN)
     - Use this when the new work is unrelated to the existing artifacts
     - Existing artifacts can still be referenced manually later
```

Recommend Migrate when artifacts are clearly related to the new description; recommend Start fresh when the new description is clearly unrelated.

## Classification on Migrate

When user picks Migrate, classify each existing artifact by phase per `references/workflow-migration.md` Step 3:

| Artifact type | Default phase mapping |
|---|---|
| ANALYSIS notes | `research` part (cluster all analyses; or split into multiple research-style parts by wave if a wave structure is detectable) |
| ADR notes (any status) | `decisions.{N}` parts (one cluster per coherent ADR group; usually 1:1 with ADRs unless they're tightly related) |
| SPEC root + subtree | `spec.SPEC-NNN` part (Spec authoring) + `build.SPEC-NNN` part (Build cycle) |
| QA notes | `build.SPEC-NNN` Stage B or `review` part |
| IN_PROGRESS / PAUSED SESSION notes | Bind to most-recent matching part via `owning_session` |
| RETRO notes | `end` part (terminal) |
| PRD / EPIC / FEATURE | Top-level PLAN Scope reference (not a phase part) |
| CRITIQUE notes | Inherit parent's phase (CRIT of ADR-001 → decisions.N containing ADR-001) |

The classification result feeds workflow-migration.md Step 4 (Part reconstruction).

## Fallback: no refs auto-detected

If the auto-detection scan returns EMPTY (all 4 directory calls return zero results) AND the user is in migrate mode (either explicit `/plan --migrate` or selected Migrate above):

Use AskUserQuestion to ask the user to identify the notes to include:

```text
Question: "No in-progress notes auto-detected at the standard docs/{analysis,decisions,specs,sessions}/ locations. Provide note identifiers/paths to include in the migration, or fall back to /plan create (fresh PLAN)?"

Options:
  1. Identify notes (free text)
     - User provides note identifiers / paths via notes field
     - The skill verifies each via Brain MCP read_note before proceeding
     - Verified refs become source_artifacts on appropriate parts
  2. Fall back to /plan create
     - Switch modes; create a fresh PLAN without migration
     - Use this when there's genuinely nothing to migrate
```

This fallback covers cases where relevant work lives outside the standard `docs/` locations (e.g., draft notes in a sandbox, work tracked in external systems, partial migrations from another project structure).

If the user can't identify any notes via option 1, gracefully drop to /plan create.

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Skipping auto-detection on `/plan create` | User starts fresh when migration is the right call; existing work goes unbound | Always run the 4× list_directory sweep before creating a fresh PLAN |
| Counting all sessions toward `artifact_count` regardless of status | Closed sessions inflate the count; might trigger migrate prompt on cleanly-completed prior workflows | Filter sessions to IN_PROGRESS / PAUSED only — DONE sessions don't need migration |
| Auto-migrating without user confirmation | Major restructuring without agency | Always surface AskUserQuestion at the migrate-or-fresh decision |
| Failing silently when zero refs are detected in migrate mode | User invoked migrate but nothing happens; confusing | Surface the no-refs fallback AskUserQuestion offering manual identification or drop to /plan create |
| Verifying user-provided refs after migration begins | Errors surface too late; partial migrations land | Verify each ref via Brain MCP read_note BEFORE proceeding with Step 4 part reconstruction |
| Re-running auto-detection on every /plan invocation (not just create) | Wastes calls; continue mode already knows its PLAN | Auto-detection runs ONLY at /plan create entry, not at /plan PLAN-NNN continue |
