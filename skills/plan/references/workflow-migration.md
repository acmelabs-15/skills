# Workflow Migration — Retrofitting `/plan` onto In-Progress Work

`migrate` mode retrofits a PLAN onto a workflow that's already in progress (sessions, analyses, ADRs, SPECs exist) but has no PLAN note yet. The migration is content-preserving: every existing artifact gets a home in the new PLAN as a part outcome; no content is rewritten or compressed.

Invoked via `/plan --migrate` (explicit) or auto-detected by `/plan create` when substantial artifacts exist without a PLAN (per `references/migrate-auto-detection.md`).

## Scope clarification (G1, 2026-05-19)

`migrate` mode is exclusively for the **missing-PLAN scenario**. It does NOT auto-migrate stale-schema PLAN notes. If an existing PLAN exists but doesn't match the current Contract 6 schema, that's out of scope for `migrate` — the PLAN stays as-is (manual update if needed).

## When migration applies

The operation fires when:

- A project has substantive workflow artifacts but no PLAN note in `docs/planning/`
- The user explicitly invokes migration (`/plan --migrate`, "migrate this workflow to a plan", "create a plan from existing work", "adopt /plan for in-progress work")
- `/plan create` auto-detection (per `references/migrate-auto-detection.md`) surfaces "Migrate first, or start fresh?" and the user picks Migrate

## Core principle: content preservation

Migration does NOT edit existing artifacts' content. The transformation is **structural reorganization only**:

- Existing ANALYSIS notes stay verbatim → become outcomes of `research` part(s)
- Existing ADRs stay verbatim → become outcomes of `decisions.N` part(s)
- Existing SPEC subtrees stay verbatim → become outcomes of `spec.SPEC-NNN` + `build.SPEC-NNN` parts
- Existing SESSION notes stay verbatim → migration Event appended; (IN_PROGRESS only) Scope updated to point at new PLAN

Migration's output: new PLAN note + minimal updates to in-progress sessions. Everything else unchanged. A content-preservation audit (BLOCKING) verifies no artifact is orphaned.

## 10-step migration protocol

### Step 1 — Detection scan

Run discovery via Brain MCP `list_directory` per `references/migrate-auto-detection.md`. Compile inventory (full identifier list, not just counts).

Surface to user: "Detected {N} analyses + {M} ADRs + {K} SPECs + {J} sessions + no PLAN. Proceed with migration?"

If user cancels: exit cleanly without changes.

### Step 1.5 — User-prompt fallback (no refs detected)

If the detection scan returned EMPTY (zero auto-detected refs) AND the user did not pass explicit refs via args, use AskUserQuestion to ask the user to identify notes to include:

> "No in-progress notes auto-detected at the standard `docs/{analysis,decisions,specs,sessions}/` locations. Provide note identifiers/paths to include in the migration, or fall back to `/plan create` (fresh PLAN)?"

Options:
- **Identify notes (free text)**: user provides identifiers/paths; proceed with those as `source_artifacts`
- **Fall back to /plan create**: switch modes; create a fresh PLAN without migration

If the user provides identifiers, verify each exists via Brain MCP `read_note` before proceeding.

### Step 2 — Workflow type identification

Run the orchestrator workflow routing protocol (`references/orchestrator-routing-protocol.md`) adapted for existing-work classification. Inputs differ from fresh recon:

- Existing artifacts (sampled from inventory) inform classification rather than user-provided scope
- Sample 2-3 sessions' Scope sections + 2-3 ANALYSIS titles + each ADR's title to infer workflow type

Surface inferred classification:

```text
Inferred workflow type: {Type}
Inferred agent sequence: {sequence}
Inferred phases: {phase list with current status estimate}

Confirm classification to proceed with migration.
```

User adjudicates: accept inference / refine / reject (exits migration).

### Step 3 — Phase mapping

Map each existing artifact to a phase per the canonical mapping:

| Artifact type | Default phase |
|---|---|
| ANALYSIS notes | `research` (one ANALYSIS = one item under the research part; multiple analyses cluster into one research part by default) |
| ADR notes | `decisions.N` (one ADR cluster = one decisions part) |
| SPEC root + subtree | `spec.SPEC-NNN` + `build.SPEC-NNN` (Spec authoring + Build cycle) |
| QA notes | `build.SPEC-NNN` Stage B sweep or `review` |
| SESSION notes | Cross-phase — each session is bound to one or more phase parts via `owning_session` |
| RETRO notes | `end` (terminal phase) |
| PRD / EPIC / FEATURE | Pre-workflow context; referenced in PLAN top-level Scope (not a phase part) |
| CRITIQUE notes | Tied to the parent artifact (CRIT of an ADR sits in the same `decisions.N` part as the ADR) |

For each session: parse Scope + any prior Workflow Plan section to identify which phases the session worked on. A session may bind to multiple parts across phases.

### Step 4 — Part reconstruction (default granularity: wave-level)

For each phase, reconstruct the parts list. **Default granularity is wave-level**, not per-artifact:

- `research`: cluster ANALYSIS notes by wave / topic. If source workflow already had a wave plan, use those waves directly
- `decisions.N`: one part per ADR scope cluster
- `spec.SPEC-NNN`: one part per SPEC
- `build.SPEC-NNN`: one part per ACCEPTED SPEC
- `review` / `end`: single placeholders unless artifacts already exist

Surface reconstructed parts list to user for confirmation:

```text
Reconstructed parts:

research ({N} parts):
- research — {description}; outcome [[PRD-001: ...]] or [[ANALYSIS-NNN: ...]] (cluster)

decisions ({M} parts):
- decisions.1 — {ADR-001 scope}; outcome [[ADR-001: ...]] (IN_PROGRESS)
- decisions.2 — {ADR-002 scope}; DRAFT
- ...

spec / build / review / end: placeholders (no artifacts yet)

Confirm reconstruction or refine.
```

User can: accept / refine clusters (split a wave into smaller parts; merge two) / reject migration.

### Step 5 — Substatus assignment per part

For each reconstructed part, determine substatus from artifact state:

| Artifact state | Part substatus |
|---|---|
| Outcome artifact `status: ACCEPTED` or `DONE` | `DONE` |
| Outcome artifact `status: PROPOSED` or `IN_PROGRESS` | `IN_PROGRESS` |
| No outcome artifact yet, but work referenced in sessions | `IN_PROGRESS` |
| No outcome artifact and no in-flight work | `PENDING` (or `READY` if dependencies met) |
| Upstream dependencies unmet | `BLOCKED` |

Set `owning_session` for IN_PROGRESS parts to the most recent IN_PROGRESS session bound to that part.

### Step 6 — Scope evaluation (flag-only, user adjudicates per part)

Run scope evaluation against `references/scope-evaluation-and-split.md` thresholds. For each part:

- Item / D-N / task count vs soft + hard thresholds
- Estimated target artifact line count (for DONE parts: actual line count of the existing artifact)
- Qualitative signals

Surface findings as flag-only — migration does NOT auto-execute splits. Example:

```text
Scope evaluation findings:

Soft tripped:
- research.cluster-1 (Wave 1): 18 items > soft 10

Hard tripped:
- decisions.1 (W1 Foundational): 44 D-Ns > hard 25; existing ADR-001 is 1443 lines > hard 1500
  → Recommended: queue decisions.1.split as next-action plan part

Adjudication per finding: defer (queue as draft) / split-now (block migration until inline split executes) / ignore (proceed no split).
```

Default = defer (queue split-parts as `DRAFT`). split-now blocks migration completion.

### Step 7 — Session updates (immutability-preserving)

**IN_PROGRESS sessions** (still mid-flight):

- Append `## Event NN — Workflow migrated to /plan` to session body. Event records: timestamp, new PLAN wikilink, list of parts the session is now bound to, scope evaluation findings (if any).
- Update Scope to lead with new PLAN + Part(s) rows.
- Session frontmatter `status` unchanged.

**PAUSED / DONE sessions** (closed historical record):

- Append `## Event NN — Workflow migrated to /plan (historical)`. Event records: timestamp, PLAN wikilink, list of parts this session contributed to, note that session is historical.
- Do NOT update Scope. Original Scope reflects state at close; modifying retroactively violates temporal-log immutability.

Both treatments use append-only Event semantics.

### Step 8 — Apply the migration

Apply edits in strict order. Each step uses Brain MCP; commit follows.

1. **Create the new PLAN note** via Pattern 2 three-phase write. Counter-availability check: `list_directory planning` to identify next PLAN-NNN.

2. **Populate top-level sections**: Scope (with classification summary from Step 2), Objectives, Progress Dashboard (initial rollup from Step 5), Workflow Plan (wave/phase structure from Step 4), Phase Progression, Cross-Part Dependency Graph (deps from existing artifacts' `depends_on` relations), Decision Log ("Plan migrated from existing workflow on YYYY-MM-DD"), Progress Log, Blockers.

3. **Populate phase H2s + per-part H3s**: each part gets the full per-part scaffold per `references/plan-note-schema.md`.

4. **Set outcome wikilinks** per part: each DONE / IN_PROGRESS part's `outcome` references the corresponding existing artifact.

5. **Add scope-evaluation split-parts** for any user-adjudicated "defer" findings: create `{phase}.{N}.split` in DRAFT.

6. **Update existing sessions** per Step 7.

7. **Bi-directional relations**:
   - On new PLAN: `contains [[ANALYSIS-NNN: ...]]`, `contains [[ADR-NNN: ...]]`, `contains [[SESSION-...: ...]]`, etc.
   - On each existing artifact: `part_of [[PLAN-NNN: ...]]`
   - Verify all inverses land correctly

8. **Final two-sections invariant**: PLAN ends with `## Observations` then `## Relations`.

### Step 9 — Content-preservation audit (BLOCKING)

```text
Audit checklist:

- [ ] Every ANALYSIS in docs/analysis/ has a plan-part assignment
- [ ] Every ADR in docs/decisions/ has a plan-part assignment
- [ ] Every SPEC subtree in docs/specs/ has a plan-part assignment
- [ ] Every SESSION in docs/sessions/ has its migration Event appended
- [ ] IN_PROGRESS sessions have Scope updated to lead with new PLAN + Part(s) rows
- [ ] No orphaned artifacts (artifact exists but no plan-part references it)
- [ ] No duplicate assignments (artifact referenced by more than one plan part)
- [ ] Bi-directional relations land correctly on both PLAN and each artifact
- [ ] PLAN frontmatter status: IN_PROGRESS; final two sections invariant holds
- [ ] complexity_tier set (TIER_1..TIER_5 or TBD with halt scheduled for first downstream phase)
- [ ] All scope-evaluation findings either deferred (split-part queued) or split-executed inline
```

Any fail: **ROLLBACK the entire migration**. Delete the new PLAN note; revert session edits. Never commit partial migration — canonical states are "pre-migration" or "post-migration"; in-between is forbidden.

### Step 10 — Finalize

After audit PASS:

1. Commit the project repo with all migration changes.
2. Surface migration summary:

```text
Migration complete.

PLAN created: [[PLAN-NNN: {Workflow Type} — {Project Name}]]
Phases populated: research (N parts, all DONE) · decisions (M parts, 1 IN_PROGRESS, rest PENDING) · spec/build/review/end placeholders
Existing artifacts bound: {N} analyses + {M} ADRs + {K} SPECs + {J} sessions
Scope-evaluation deferrals: {list of {phase}.{N}.split parts queued as DRAFT}
Content-preservation audit: PASS

Next-ready part: {next part identified by reading the new PLAN}
Recommended next action: /plan PLAN-NNN to pick up next-ready part.
```

3. The migration session can end OR continue with `/plan PLAN-NNN` to pick up the next-ready part.

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Editing existing artifact content during migration | Migration is structural, not editorial; introduces drift | Pure relocation / assignment; touch artifact only via `part_of` relation add |
| Executing splits inline during migration (default) | Compounds operations; couples DoDs; harder to ROLLBACK | Flag-only by default; queue split-parts as DRAFT; execute in subsequent sessions |
| Skipping content-preservation audit | Orphaned artifacts ship; later readers can't find plan-part home | Audit BLOCKING before commit; partial migration is forbidden state |
| Rewriting closed sessions' Scope sections | Violates temporal-log immutability | Append-only Event for closed sessions; Scope update only for IN_PROGRESS |
| Per-artifact granularity (e.g., 115 analysis parts) | Over-fragmentation; loses cohesion | Default wave-level granularity; user can refine but rarely wants per-artifact parts |
| Treating migration as one-and-done | New artifacts may surface post-migration | Migration is idempotent — re-running detects new artifacts and offers to extend existing PLAN |
| Migrating without user confirmation at user-facing steps | Major restructuring without user agency | Surface at Step 1 (inventory), Step 2 (workflow type), Step 4 (parts), Step 6 (scope findings) |
| Forgetting bi-directional relations | PLAN exists but artifacts have no `part_of` back-reference | Step 8 explicitly walks every artifact adding `part_of`; audit verifies both directions |
| Auto-migrating stale-schema PLANs | Out of scope per G1; might destroy customizations | Stale-schema PLANs are NOT migrated; manual update only if needed |
