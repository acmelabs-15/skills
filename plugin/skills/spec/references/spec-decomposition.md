# SPEC Decomposition — Stage 1 Full Pipeline

The Stage 1 pipeline produces an `ANALYSIS-NNN: SPEC Clustering` note that proposes how ACCEPTED ADRs decompose into SPECs. Each approved SPEC becomes a `spec.SPEC-NNN` part in the PLAN for Stage 2 authoring.

## Pipeline overview

```text
Step 0:    First-principles re-validation
Step 0.5:  Memory-First search for prior specs
Step 1:    Dispatch brain:🧠-analyst with ACCEPTED ADRs + Prior Specs Context
Step 2:    Analyst writes ANALYSIS-NNN: SPEC Clustering
Step 3:    CVA conditional (Tier ≥3 + 2+ similar SPECs → mandatory)
Step 4:    critic + decision-critic review
Step 5:    AskUserQuestion for user adjudication
Step 6:    /plan adds one spec.SPEC-NNN part per approved SPEC
Step 7:    set-part-done outcome=[[ANALYSIS-NNN: SPEC Clustering]]
```

## Step 0 — First-principles re-validation

Re-validation is faster than re-elicitation. The first-principles questions were answered during /research Step 0; /spec verifies the ACCEPTED ADRs still align.

Read the PRD's Q1-Q6 / forcing-question answers (produced by /research Step 0 + Step 3). For each ADR:

- Does it address the original demand signal (Q3-equivalent blocked entity)?
- Does it fit within the narrowest wedge (Q4-equivalent scope)?
- Does it honor the constraint set (Q5-equivalent licensing/hosting/integration constraints)?

If drift detected (e.g., an ADR introduces scope beyond the wedge, or contradicts the constraint set):

```text
```spec-decomposition-step0-halt
trigger: Stage 1 Step 0 first-principles re-validation
question: Do the ACCEPTED ADRs still align with the PRD demand signal and wedge?
answer: "no — ADR-{NNN} drifted on {specific dimension}"
test_failed: ADR-PRD alignment check
deferral: Surface drift to user; may require /decisions revision to amend the drifted ADR before proceeding to spec decomposition.
```
```

If no drift: proceed to Step 0.5.

**G2 resume**: skip Step 0 if a `first_principles_revalidated: PASSED` marker exists on the `spec-decomposition` part.

## Step 0.5 — Memory-First search for prior specs

```text
mcp__plugin_brain_brain__search({ query: "[topic] spec" })
mcp__plugin_brain_brain__search({ query: "[topic] requirements" })
mcp__plugin_brain_brain__search({ query: "[topic] design" })
mcp__plugin_brain_brain__list_directory({ dir_name: "specs" })
```

Compile findings:

- Existing SPECs that cover related topics
- Existing REQ notes from prior workflows
- Existing DESIGN notes
- Existing TASK notes (less common at decomposition time)

Output: a "Prior Specs Context" sub-section to be included in the Step 1 analyst dispatch brief AND in the Step 2 ANALYSIS body.

The Prior Specs Context prevents two failure modes:

1. **Duplicate specifications** — authoring SPEC-NNN that mostly overlaps an existing SPEC-MMM
2. **Inconsistent patterns** — diverging from established REQ / DESIGN / TASK patterns when reuse would be cleaner

## Step 1 — Dispatch brain:🧠-analyst

```text
Task(subagent_type="brain:🧠-analyst")
```

Brief includes:

- All ACCEPTED ADRs from `docs/decisions/` (full content via `read_note`)
- The PRD (the demand context)
- Prior Specs Context from Step 0.5
- PLAN frontmatter `complexity_tier`
- Mandate: "Propose a feature-themed SPEC decomposition. Each SPEC implements one or more ADRs (every ADR must be covered by at least one SPEC). Use feature-themed slugs (e.g., SPEC-001-core-grid-display), NOT project slugs. Identify cross-cutting ADRs that apply to multiple SPECs as constraints. Provide ordering + phasing + effort rollup per SPEC. NO recommendations on which SPEC to author first — user adjudicates via Step 5."
- Evidence hierarchy: tool output > files read > web/docs > training knowledge

## Step 2 — Analyst writes ANALYSIS-NNN: SPEC Clustering

The analyst writes to `docs/analysis/` via a single Brain MCP `write_note` call passing the full colon title. Required body sections:

```markdown
# ANALYSIS-NNN: SPEC Clustering for {Topic}

## Context

{Brief: PRD topic + N ACCEPTED ADRs + PLAN binding}

## Prior Specs Context

{Findings from Step 0.5 — existing SPECs / REQs / DESIGNs that overlap or inform}

## Proposed SPECs

### SPEC-{NNN}-{feature-kebab}: {Feature Title}

**Implements ADRs**: {[[ADR-N]], [[ADR-M]]}
**Scope**: {1-paragraph description}
**Estimated REQ count**: {N}
**Estimated TASK count**: {M}
**Estimated effort**: S | M | L (per AI-Dominant tier convention)
**Phasing**: P0 | P1 | P2 (if the SPEC sequences work)

### SPEC-{NNN+1}-{feature-kebab}: {Next Feature}

(repeat per SPEC)

## ADR-to-SPEC Mapping

| ADR | Covered by SPEC(s) | Cross-cutting? |
| --- | --- | --- |
| ADR-001 | SPEC-001 | No |
| ADR-002 | SPEC-001, SPEC-002 | Yes (cross-cutting constraint) |
| ADR-003 | SPEC-002 | No |

## Cross-cutting Constraints

ADRs marked cross-cutting in the mapping table become "ADR Cross-cutting Constraints" applied to multiple SPECs. Each cross-cutting ADR gets:

- One-line description of what the constraint mandates
- List of SPECs it applies to
- How to surface the constraint in each SPEC's body (e.g., as an "ADR Cross-cutting Constraints" sub-section in SPEC root)

## Ordering + Phasing

Recommended SPEC authoring + build order based on dependencies + risk:

1. SPEC-001 (foundational; no dependencies)
2. SPEC-002 (depends on SPEC-001 DESIGN)
3. SPEC-003 (parallel-safe with SPEC-002)
...

## Effort Rollup

Total effort across all proposed SPECs (AI-Dominant tier):

| SPEC | Estimated effort |
| --- | --- |
| SPEC-001 | M |
| SPEC-002 | L |
| SPEC-003 | S |
| **Total** | {sum} |

## Observations

- [decision] Proposed N SPECs covering M ACCEPTED ADRs #spec-clustering #adr-coverage
- [constraint] ADR-N is cross-cutting; applied to SPEC-A + SPEC-B #cross-cutting
- (3+ more)

## Relations

- relates_to [[ADR-001: ...]]
- relates_to [[ADR-002: ...]]
- (one per ACCEPTED ADR)
- part_of [[PLAN-NNN: ...]]
```

Universal final two sections: `## Observations` then `## Relations`.

## Step 3 — CVA conditional

If 2+ proposed SPECs share similar structural patterns:

- Analogous APIs (e.g., SPEC-001 has CRUD on Users + SPEC-002 has CRUD on Items)
- Similar lifecycles (e.g., both SPECs follow create → review → publish → archive)
- Parallel data flows (e.g., both ingest from external API → normalize → persist → emit events)

Invoke `Skill(skill="brain:---cva-analysis")` BEFORE proceeding to Step 4. CVA surfaces:

- What VARIES between the similar SPECs (distinct entities, distinct fields)
- What is CONSTANT across them (the CRUD pattern, the lifecycle states, the data-flow stages)
- Whether a shared abstraction (a common DESIGN note, a base REQ pattern, a parameterized TASK template) should exist BEFORE individual SPEC authoring

| Tier | CVA gate |
|---|---|
| TIER_1 / TIER_2 | Skip — over-abstracting trivial work |
| TIER_3 | Required IF 2+ similar SPECs |
| TIER_4 / TIER_5 | Mandatory regardless of similarity |

Append CVA findings to the Step 2 ANALYSIS as a "CVA Analysis" sub-section. If CVA recommends a shared abstraction, the Step 5 user adjudication includes a question about whether to author the shared abstraction as part of the SPEC subtree OR as a separate cross-cutting artifact.

**G2 resume**: skip if Tier 1-2 OR if ANALYSIS body already has CVA Analysis sub-section.

## Step 4 — critic + decision-critic review

Parallel dispatch:

```text
Task(subagent_type="brain:🧠-critic")           → cluster gap analysis
Skill(skill="brain:---decision-critic")          → stress-test cluster assumptions
```

Both agents operate with reviewer-asymmetry framing: "review the proposed clustering as a stranger; the analyst made cohesion judgments — challenge them; surface at least one concrete concern; cite ADR-to-SPEC mapping evidence."

Review concerns to surface:

- **Cluster cohesion**: are the SPECs internally cohesive (one feature per SPEC, not multiple)?
- **ADR coverage**: every ACCEPTED ADR mapped to at least one SPEC (the ADR coverage gate runs later in Stage 2; this is an early check)
- **Cross-cutting handling**: cross-cutting ADRs identified correctly (none missed)
- **Feature-theme adherence**: slugs are feature-themed (not project-themed); SPEC names map to user-visible features
- **Effort estimation sanity**: total rollup reasonable given the ADR count + complexity_tier

Merge findings into a single "Stage 1 Review" sub-section in the ANALYSIS body.

## Step 5 — User adjudication

Surface via `AskUserQuestion` (Contract 4 5-field template):

```text
Question: "Stage 1 clustering proposes {N} SPECs covering {M} ACCEPTED ADRs. Approve, refine, or reject?"

Options:
  1. Approve as proposed (Recommended)
     — Locks the clustering; /plan adds N spec.SPEC-NNN parts; Stage 2 authoring begins on first SPEC
  2. Refine specific clusters
     — Adjust cluster groupings (merge two SPECs, split one SPEC into two, re-assign an ADR to a different cluster); I'll surface the diff for re-approval
  3. Reject — propose different clustering
     — Send the clustering back to brain:🧠-analyst with revision notes; restart Step 1 with the refined direction
```

The preview field shows the cluster proposal table verbatim.

If user rejects twice without actionable refinement: HALT via `spec-decomposition-step5-rejected-halt`; surface to user that Stage 1 needs a different approach (possibly re-opening /decisions to refine ADRs).

## Step 6 — /plan adds spec.SPEC-NNN parts

On approval: invoke /plan to add one `spec.SPEC-NNN` part per approved SPEC. Each part:

- `id`: `spec.SPEC-{NNN}`
- `phase`: `spec`
- `status`: `PENDING` (will be READY when its dependencies are DONE — typically when /spec Stage 1 set-part-done lands)
- `dependencies`: `[spec-decomposition]` (depends on Stage 1 completion) + any cross-SPEC dependencies from the ordering analysis
- `source_artifacts`: the source ADR wikilinks (so Stage 2 dispatch carries them as `source_adrs`)
- `outcome`: empty (populated by Stage 2 set-part-done)

After all parts are added, Stage 1 hands control back to /plan via Step 7.

## Step 7 — set-part-done

```text
Skill(skill="plan", args="set-part-done plan=PLAN-NNN part=spec-decomposition outcome=[[ANALYSIS-NNN: SPEC Clustering]]")
```

Per Contract 1. /plan flips `spec-decomposition` status → DONE; the first `spec.SPEC-NNN` part becomes READY; /plan surfaces "next-ready part: spec.SPEC-001" as recommendation; user re-invokes `/plan PLAN-NNN` to continue with Stage 2 of the first SPEC.

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Skipping Step 0 re-validation | ADR drift surfaces during Stage 2 as architectural inconsistency | Re-validate cheap; ADR-PRD alignment check |
| Project-slug SPEC names (SPEC-001-polar-mcp) | Conflates project with feature scope | Feature-themed slugs (SPEC-001-core-grid-display) |
| 1:1 ADR-to-SPEC when cross-cutting | Inflates SPEC count; repeats cross-cutting concerns | Cluster by feature; cross-cutting ADRs as constraints applied to multiple SPECs |
| Skipping CVA at Tier ≥3 with similar SPECs | Misses shared abstractions; SPECs lock divergent patterns | CVA mandatory at Tier ≥3 + 2+ similar SPECs |
| Step 4 critic without reviewer-asymmetry | "Looks good" returns are useless | Briefs MUST include reviewer-asymmetry mandate |
| Auto-approving Step 5 without user agency | Authors wrong decomposition; expensive to redo | AskUserQuestion non-skippable; user adjudicates |
| Skipping ANALYSIS Observations + Relations sections | Violates universal final-two-sections invariant | Always include both; CONVENTIONS Section 4.0 |
| Bare entity references in ANALYSIS body | Breaks search-with-relations | Always `[[Wikilinks]]` with colons matching frontmatter titles |
