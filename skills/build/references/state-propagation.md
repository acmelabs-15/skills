# State Propagation — Stage C Spec-Level Procedure

After Stage A (per-TASK cycle) completes for every TASK in the SPEC AND Stage B (final spec-level QA sweep) passes, Stage C propagates the spec-level state changes outward: EPIC update (if applicable), sync-jira push at the SPEC level, PLAN tick for SPEC completion, and atomic commit covering all the spec-level edits.

## Why Stage C exists separately from Stage A

Stage A propagates per-TASK state (TASK done → SESSION Event + sync-jira push + PLAN tick). But the SPEC-level state remains unchanged until ALL tasks are done AND Stage B passes. Stage C is the dedicated step that:

1. Updates EPIC (if SPEC is part of one) — EPIC rollup reflects SPEC completion
2. Pushes SPEC-level state to Jira — Jira sees the SPEC closure (not just per-TASK closures)
3. Ticks SPEC-level checkbox in PLAN — PLAN reflects SPEC done
4. Commits all spec-level edits atomically — single commit per SPEC, not split across steps

## Stage C sub-steps

### Sub-step 6.1 — EPIC update (conditional)

If the SPEC is part of an EPIC (check via `SPEC root.Relations.part_of [[EPIC-NNN]]`):

1. Read the EPIC note via `mcp__plugin_brain_brain__read_note`
2. Locate the SPEC's checklist entry in EPIC body (typically under a "Specs" section with `[ ] [[SPEC-NNN: ...]]`)
3. Flip the checkbox `[ ] → [x]` via `mcp__plugin_brain_brain__edit_note` with `find_replace`
4. Update EPIC frontmatter `status` if all SPECs in the EPIC are now done:
   - All SPECs DONE → EPIC status `IN_PROGRESS → DONE`
   - Otherwise stay `IN_PROGRESS`
5. Two-step edit: EPIC edit → SESSION Event NN append (Type: `state-change`; Outcome: `EPIC-NNN per-SPEC checklist updated; SPEC-NNN done`)

If no EPIC: skip this sub-step.

**G2 resume**: skip if EPIC's per-SPEC checkbox is already `[x]`.

### Sub-step 6.2 — sync-jira push at SPEC level

```text
Skill(skill="sync-jira", args="push target=[[SPEC-NNN: ...]]")
```

Pushes SPEC frontmatter status + description + linked TASK statuses to the corresponding Jira ticket. The push includes:

- SPEC-level Jira ticket status transition (e.g., to "Done")
- Description sync (SPEC body content → Jira description)
- Linked-issue updates (Jira sub-tasks for TASKs are already updated per Stage A 4f; this push verifies the SPEC-level rollup)

If sync-jira returns failure: emit `build-step6-sync-jira-halt`; surface to user with options (retry, skip-with-manual-sync, halt).

**G2 resume**: skip if sync-jira already pushed (check via Jira ticket status OR a `sync_jira_spec_pushed: YYYY-MM-DD` marker on SPEC frontmatter).

### Sub-step 6.3 — PLAN tick for SPEC-level completion

Edit PLAN body via `mcp__plugin_brain_brain__edit_note`:

1. Locate the `build.SPEC-NNN` part section
2. Mark the part's SPEC-level checkbox (typically a `[ ] SPEC-NNN done` line in the part body) `[x]`
3. Update PLAN's `## Progress Dashboard` if present (decrement IN_PROGRESS, increment DONE for the spec/build column)

This is a PLAN-level mutation; per Contract 6, the part's `status` field will transition to DONE in Step 8 set-part-done (not here).

**G2 resume**: skip if PLAN's SPEC-level checkbox is already `[x]`.

### Sub-step 6.4 — Atomic commit

Single git commit covering all Stage C edits:

```bash
git add docs/roadmap/EPIC-*.md   # if EPIC was updated
git add docs/specs/SPEC-*/        # SPEC root status flips happen in Step 8 not here, but any spec-body updates land
git add docs/planning/PLAN-*.md   # PLAN tick + Progress Dashboard
git add docs/sessions/SESSION-*.md # SESSION Event entries from sub-steps 6.1-6.3
git commit -m "build: SPEC-NNN spec-level propagation (Stage C)"
```

The commit is atomic: all spec-level edits land together. This makes git history readable per SPEC milestone.

## Comparison with Stage A propagation

Stage A propagates per-TASK; Stage C propagates per-SPEC. The two stages don't overlap because:

| Stage | What propagates | Where |
|---|---|---|
| A 4f | per-TASK Jira status | Jira sub-task / sub-issue |
| A 4g | per-TASK PLAN checkbox | PLAN body, build.SPEC-NNN part section |
| C 6.1 | per-SPEC EPIC checklist | EPIC body |
| C 6.2 | per-SPEC Jira status | Jira parent ticket (or Epic-level) |
| C 6.3 | per-SPEC PLAN checkbox + Progress Dashboard | PLAN body |
| C 6.4 | atomic commit covering 6.1-6.3 | git history |

After Stage C completes, Step 7 runs the 4 mandatory exit gates (+ Gate 5 conditional). Step 8 set-part-done is the final state transition (build.SPEC-NNN part status → DONE in PLAN).

## Two-step edit pattern (per D-04 + Contract 5)

Each sub-step that mutates a Brain note applies the two-step pattern:

1. **PLAN/EPIC edit first** (canonical state mutation): `edit_note` on the target note
2. **SESSION Event NN append second** (pointer ledger; Contract 5 schema)
3. **Project repo commit third** (durability)

Sub-step 6.4 batches commits across 6.1-6.3 because they're all SPEC-level state propagations bound to the same logical milestone. Per-event commits within Stage C would create commit clutter without separating logical work.

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Running Stage C before Stage B passes | Spec-level state propagates before QA verifies coverage | Stage B 5b coverage matrix MUST PASS before Stage C |
| Running Stage C before all Stage A TASKs done | EPIC checklist + Jira reflect partial completion | Verify every TASK in SPEC is DONE before Stage C |
| Skipping EPIC update when EPIC exists | EPIC rollup stale; EPIC consumers see wrong state | Always check SPEC.Relations.part_of [[EPIC-]] and update if present |
| sync-jira push before SPEC status flips | Jira leads source-of-truth | sync-jira is push-after-source-of-truth; here Stage C runs BEFORE Step 8 SPEC status flip, so this is the SPEC's "I'm done with all tasks; ready for closure" push (status flip is Step 8) |
| Splitting Stage C into multiple commits | Commit clutter; harder git history | Atomic commit covering all Stage C edits |
| Forgetting PLAN's Progress Dashboard refresh | Dashboard rollup drift; cross-PLAN view wrong | Always refresh dashboard if it lists SPEC-level rollups |
| Running Stage C twice on G2 resume | Idempotency violation; double-push to Jira | Skip already-completed sub-steps per G2 markers |
