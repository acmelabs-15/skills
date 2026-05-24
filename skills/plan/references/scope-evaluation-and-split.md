# Scope Evaluation and Split Protocol

When a plan part grows too large, it should be split into multiple smaller coherent parts. The split itself is a tracked plan part with a Definition of Done that BLOCKS on content-preservation — zero detail / quality / content loss during the recomposition.

Invoked via `/plan PLAN-NNN --split` (split immediately) or `/plan PLAN-NNN --scope` (evaluate and recommend; do not split).

## Core principles

1. **Content preservation is absolute** — splitting is a structural recomposition, not a content edit. Every D-N / item / task / observation / relation from the source part must land in exactly one destination, verbatim. Zero orphans, zero duplicates, zero compression.
2. **The split is itself a plan part** — not a one-shot operation. It has its own DoD checklist, owning session, completing session, and outcome. The split-part's outcome is a migration audit document confirming content preservation.
3. **Multi-point evaluation** — scope evaluation fires at several natural checkpoints throughout a part's lifecycle, not just once.
4. **Plan parts are append-only** — the original part stays in the plan with substatus `SPLIT`; new sub-parts are added alongside; cross-references via `superseded_by` / `supersedes` relations preserve traceability.

## When scope evaluation fires (multi-point)

Scope evaluation runs at five natural checkpoints in a part's lifecycle. Each catches a different failure mode.

### Trigger 1 — At part flesh-out (preventive)

When parts are first enumerated for a phase (during `/plan create` Step 6 two-level decomposition), evaluate each candidate part's expected scope BEFORE seeding it in the PLAN.

For each candidate part, surface:

- Expected item / D-N / task count (from source analyses)
- Recommended budget for this part type (threshold table below)
- If above soft threshold: flag for user review before seeding
- If above hard threshold: surface recommendation to pre-split

User adjudicates: Accept as-is / Pre-split into N coherent sub-parts / Refine clusters.

**Why this point matters**: catches oversized parts before any work begins. The cheapest split is the one done before D-N adjudication starts.

### Trigger 2 — At canonical holistic audit (detective, mid-work)

The hygiene audit at every Tier/Batch close evaluates each open part's current size against budgets. If any part exceeds soft threshold, flag in audit findings. If any part exceeds hard threshold, surface split recommendation.

**Why this point matters**: parts grow via iterative-phase-reentry. An audit at any close above 15 D-Ns catches drift in real time.

### Trigger 3 — At pre-author-composite-artifact gate (detective, at boundary)

Before dispatching the architect (Decisions phase) / spec-author (Spec phase) / implementer (Implementation phase) to author the composite artifact, evaluate the expected artifact's size against the line-count budget.

If above soft threshold: surface warning + offer split before dispatch.
If above hard threshold: HALT dispatch; require user adjudication on split-or-proceed; if user chooses proceed-anyway, capture rationale in the part's Decision Log entry.

**Why this point matters**: last chance to split before the artifact is born. 44 D-Ns would produce a 1500+ line ADR — a pre-author gate demands a split.

### Trigger 4 — At part-pick on session start (preventive at resume)

When `/plan PLAN-NNN` continue mode picks the next-ready part, evaluate the part's current scope BEFORE starting work.

If the part has grown beyond budget since it was last touched (iterative re-entry added items in the prior session without a split), surface:

> "Part decisions.1 now has N D-Ns (budget: M). Recommend split before resuming?"

User adjudicates: split first / proceed anyway / cancel session.

**Why this point matters**: parts can grow across sessions when paused/resumed.

### Trigger 5 — User-initiated (always)

The user can request scope evaluation or a direct split at any time:

- `/plan PLAN-NNN --scope` (evaluation only)
- `/plan PLAN-NNN --split` (evaluation + immediate split flow)
- Free-text: "decisions.1 is getting too big — split it" / "evaluate scope of decisions.1"

When user initiates, skip Triggers 1-4 and proceed directly to the split-as-plan-part workflow.

## Threshold table

Soft thresholds are warnings; hard thresholds block before composite-artifact authoring. Calibrated per `complexity_tier` per Contract 8.

| Part type / metric | Tier 1-2 soft | Tier 3 soft | Tier 4-5 soft | Hard (all tiers) |
|---|---|---|---|---|
| Decisions part — D-N count | >10 | >15 | >25 | >25 (Tier 4-5: composite allowed; >40 hard) |
| Decisions part — target ADR line count | >500 | >800 | >1200 | >1500 |
| Analysis part — item count | >7 | >10 | >15 | >20 |
| Analysis part — target ANALYSIS line count | >400 | >600 | >900 | >1200 |
| Spec part — task count per SPEC | >15 | >20 | >30 | >35 |
| Spec part — total SPEC subtree size | >1500 lines | >2000 lines | >3000 lines | >4000 lines |
| Implementation per SPEC — task count | >15 | >20 | >30 | >35 (recurse: SPEC split needed in Spec phase) |

**Qualitative signals** (trigger evaluation even if quantitative thresholds aren't tripped):

- Multiple distinct architectural concerns under one part
- Decisions / items depending on later-phase work that isn't done yet
- Long-tail items that aren't structurally coherent with the part's core scope
- Recurring user pushback on the part's scope ("this feels like multiple things")
- Cross-wave implications affecting more than 3 waves indicate the part crosses architectural boundaries

## The split-as-a-plan-part workflow

When scope evaluation surfaces a recommendation AND the user adjudicates "split," CREATE a new plan part `{phase}.{part-num}.split` (e.g., `decisions.1.split`) in the same phase as the source. The split-part executes through `DRAFT → IN_PROGRESS → DONE` substatuses with content-preservation as its hard DoD.

### Split-part header

```markdown
### decisions.1.split — Split decisions.1 into N coherent sub-parts

**Substatus**: IN_PROGRESS
**Owning session**: [[SESSION-...: ...]]
**Completing session**: —
**Outcome**: — (will be a content-preservation audit doc OR a Migration Plan entry in Decision Log)
**Source part**: decisions.1 (current substatus: IN_PROGRESS; will flip to SPLIT on completion)

**Trigger**: Scope evaluation at {Trigger N} surfaced: {finding}

**DoD (content-preservation BLOCKING)**:

- [ ] Cohesion analysis complete: source items clustered by architectural coherence
- [ ] Proposed split surfaced to user via AskUserQuestion with cluster groupings + rationale
- [ ] User adjudicated (Accept / Modify clusters / Reject split)
- [ ] Distribution Plan locked: explicit mapping table of each source item → destination new sub-part
- [ ] New plan parts created with header + DoD + per-part scaffold
- [ ] Source items migrated to destinations with substatuses preserved
- [ ] Locked-Event references preserved verbatim in destination D-N substatus list rows
- [ ] Bi-directional relations updated
- [ ] **Content-preservation audit** (BLOCKING; procedure below) — every source item present in exactly one destination
- [ ] (Post-artifact case only) Source artifact recomposed; source flipped `status: SUPERSEDED`; each new artifact runs its own adr-review/spec-review gate
- [ ] Source part substatus flipped → SPLIT (terminal); body becomes pointer to successors
```

### Step 1 — Cohesion analysis

The orchestrator (or a dispatched agent for very large splits) analyzes the source's items to identify natural clusters. Heuristics:

- **By subject area** — group D-Ns covering the same architectural concern
- **By cross-wave implications** — D-Ns clustering on the same downstream waves belong together
- **By dependency** — D-Ns where one materially constrains another should stay together
- **By cohesion strength** — D-Ns sharing constraint language / implementation files / rationale should cluster

Surface the cluster proposal via AskUserQuestion with each cluster's name + scope (1 sentence) + D-N list + estimated target ADR size.

### Step 2 — User adjudication

Three options:

- **Accept clusters as proposed** — proceed to Distribution Plan
- **Modify clusters** — user refines groupings; loop until concrete
- **Reject split** — proceed with original part as-is; document rationale in PLAN Decision Log; split-part flips to DONE with outcome "Split rejected — see rationale"

### Step 3 — Distribution Plan

For each source item, lock the destination. Format as a table in the split-part body:

```markdown
#### Distribution Plan (locked YYYY-MM-DD via Event NN)

| Source item | Substatus | Locked in (Event ref) | → Destination | New ID |
| --- | --- | --- | --- | --- |
| D-1 | LOCKED | requirements doc Section 1 | decisions.1.a | D-1 |
| D-2 | LOCKED | [[SESSION-...: ...]] Event 14 | decisions.1.a | D-2 |
| D-3 | LOCKED | [[SESSION-...: ...]] Event 15 | decisions.1.b | D-1 |
| ... | ... | ... | ... | ... |
```

Destination "New ID" is the renumbered ID within the destination sub-part (each new sub-part has its own D-1, D-2, ... per the per-spec counter-restart convention).

### Step 4 — Apply migration

For each row:

1. **Plan-level only (no downstream artifact yet)**:
   - Add destination's D-N row to its `#### D-N substatus list` with substatus + locked-in Event ref preserved verbatim
   - Add destination's tasks (carried from source) with substatus preserved
   - Add destination's intra-part Deps Graph nodes

2. **Post-artifact (ADR already authored)**:
   - The new ADR is authored by dispatched architect with explicit content-preservation brief
   - Architect EXTRACTS the source ADR's D-N sub-section verbatim and pastes it into the new ADR with appropriate renumbering
   - No edits to content; only structural relocation + renumbering

Update bi-directional relations: any note that `implements [[ADR-001]]` gets edited to point at the appropriate new sub-artifact. Inverse relations on the new sub-artifacts added.

### Step 5 — Content-preservation audit (BLOCKING)

Exhaustive audit before flipping the split-part to DONE:

```text
For source part decisions.1 with N items:
- [ ] All N source items accounted for in Distribution Plan (no orphans)
- [ ] Each source item maps to exactly one destination (no duplicates)
- [ ] Substatus preserved per item (LOCKED stays LOCKED, etc.)
- [ ] Locked-in Event ref preserved per item (string-level match)
- [ ] (Post-artifact) Verbatim option content preserved per LOCKED item (character-identical except for renumbering)
- [ ] (Post-artifact) Cross-wave implications preserved per item
- [ ] (Post-artifact) Alternatives Considered preserved per item
- [ ] (Post-artifact) User Refinements preserved verbatim per item
- [ ] Bi-directional relations updated correctly
- [ ] Source part body fully migrated
```

Any audit fail: **ROLLBACK the split entirely** (revert all PLAN edits + revert new artifact files). Keep source intact. Surface audit failure to user with specifics. Never commit a partial migration.

All audit items pass: proceed to Step 6.

### Step 6 — Finalize

1. Source part substatus → `SPLIT` (terminal). Body replaced with:

   ```markdown
   **Substatus**: SPLIT (terminal)
   **Split into**: decisions.1.a, decisions.1.b, decisions.1.c, ...
   **Split rationale**: {finding from scope evaluation}
   **Migration audit**: PASS YYYY-MM-DD — see Distribution Plan
   **Successors**: (wikilink list)
   ```

2. (Post-artifact) Source artifact `status: SUPERSEDED`; body updated with pointer to successor artifacts via `superseded_by` Relations.
3. Update top-level PLAN sections: Workflow Plan, Progress Dashboard, Cross-Part Deps Graph refreshed.
4. Append PLAN Decision Log row documenting the split.
5. Split-part substatus → DONE; outcome = the Distribution Plan section.

## Post-artifact split — special considerations

Post-artifact splits (the artifact is already authored) are more work than pre-author splits.

### Extra steps

1. **Source artifact preservation** — never edit-in-place the source ADR's D-N content. Architect dispatch for new sub-ADRs must EXTRACT verbatim. Source ADR retains content (eventually marked SUPERSEDED) so content-loss audit can compare line-by-line.

2. **Per-new-artifact adr-review gate** — each new ADR runs its own `brain:---adr-review`. The original verdict does NOT carry over; each new ADR is reviewed fresh.

3. **Architect dispatch brief mandates**:
   - Extract verbatim; no compression
   - Each new ADR is self-contained (re-state shared Context)
   - Renumber D-Ns within each new ADR starting at D-1
   - Update internal cross-references; cross-ADR refs use wikilink to destination ADR + new D-Y identifier
   - Preserve all sub-sections per D-N (Decision Statement, Context, Full Rationale, Alternatives Considered, etc.) — no compression

4. **Source ADR end-state**:
   - **Wrapper pattern** (preferred): source becomes a short note with `status: SUPERSEDED`, body = brief description + successor table + `superseded_by` relations
   - **Historical preservation pattern**: source kept verbatim with `status: SUPERSEDED` + header note pointing at successors

5. **adr-review on the meta-split** (optional) — validate the cohesion analysis before any new ADRs are authored.

## Sessions do NOT split

When a part splits, the session(s) that worked on it stay whole. Sessions are immutable temporal logs; only PLAN parts (and post-artifact ADRs/SPECs) get restructured. The session's `**Part(s)**:` Scope row updates to reflect the new sub-part(s); prior Events stay verbatim referencing original D-N IDs.

## Split for other artifact types

- **Analysis part split** — split into multiple Analysis parts; each new ANALYSIS still needs to pass quality bar
- **Spec part split** — split into multiple SPECs; each new SPEC gets its own spec-level review
- **Implementation part split** — happens UPSTREAM in the Spec phase (recurse). Implementation parts are 1:1 with SPECs; too-big Implementation means SPEC was too big

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Splitting by editing items in-place | Content gets compressed/lost | Extract verbatim; explicit "preserve EVERY substantive detail; no compression; renumber only" brief |
| Marking source part DONE instead of SPLIT | Loses the trail back to the split decision | Always use SPLIT terminal substatus; body becomes pointer |
| Skipping content-preservation audit | Content-loss bugs ship silently | Audit BLOCKING; failure → ROLLBACK; never partial migration |
| Single architect dispatch for both old and new content | Tempted to "improve" content during the move | Dispatch is structural only; explicit "no edits; only relocation" brief |
| Forgetting to update bi-directional relations | Orphan inbound references on new sub-artifacts | Audit walks every prior incoming reference |
| Splitting too eagerly | Over-fragmentation; sub-parts too small | Apply qualitative judgment alongside thresholds; soft = warning, not action |
| Splitting too late | Composite artifact already authored at huge scale | Honor pre-author-composite-artifact gate (Trigger 3) |
| Not running adr-review on new sub-ADRs | New scope may surface concerns masked in composite | Each new ADR runs its own adr-review |
| Mixed splitting with new content authoring | Increases content-loss risk; new content can mask drift | Split is structural; if new D-Ns needed, author AFTER split |
