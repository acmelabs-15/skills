# Retrieval-Density Pass — Step 8.5

A Brain-native enhancement of each ANALYSIS note produced in Step 5. Boosts the note's discoverability in Brain MCP semantic search by adding 3-5 atomic observations per note + bridges each analysis to actionable downstream work via an `Applicability` sub-section.

The concept is inspired by the canonical research-and-incorporate pattern but applies inline via Brain MCP (per the dispatch-resolution exception for memory-as-core-mechanism skills — apply the concept inline rather than dispatching).

## Step 8.5 actions per ANALYSIS note

For each ANALYSIS-NNN note produced in Step 5, do three operations via Brain MCP `edit_note`:

### Operation 1 — Append 3-5 atomic observations

Atomic observation = single load-bearing fact per observation; do not bundle. Brain MCP's semantic search resolves observation-level granularity, so high observation density improves retrieval without creating sibling notes.

Each observation requires:

- `[category]` prefix from the canonical category set: `[fact]` · `[decision]` · `[requirement]` · `[technique]` · `[insight]` · `[problem]` · `[solution]` · `[constraint]` · `[risk]` · `[outcome]`
- 1-3 inline `#tags`: lowercase, hyphens for multi-word, relevant to the observation content

(This format requirement is universal across all Brain notes — every observation, in any note, follows the same pattern.)

Append to the ANALYSIS note's existing `## Observations` section via `mcp__plugin_brain_brain__edit_note` with `operation: "append"`. Place new observations at the end of the section.

Example observations for an ANALYSIS on storage backend selection:

```markdown
- [fact] Option A (Postgres) scales to 50M rows in current benchmark suite with median p99 12ms #benchmark #postgres
- [decision] Option B (SQLite) ruled out for multi-writer concurrency limit at >50 writers #sqlite #concurrency
- [insight] Storage backend choice constrains schema evolution path — Postgres migrations are forward-only #schema-evolution
- [constraint] Brain MCP integration assumes a single canonical source-of-truth backend per project #brain-mcp #invariant
- [risk] Option A (Postgres) requires HA setup for production — adds operational complexity #operational
```

Heuristics for what makes a good atomic observation:
- One sentence; one load-bearing claim
- Stands alone semantically (a reader hitting it via search understands without context)
- Reveals decision-relevant content (a metric, a constraint, a risk) not just structural fact ("the analysis has 4 options" is NOT a useful observation)

### Operation 2 — Append `Applicability` sub-section

Append a new `### Applicability` sub-section to the ANALYSIS body, positioned ABOVE `## Observations` (per universal final-two-sections invariant — Observations + Relations always last).

Required fields:

```markdown
### Applicability

**Integration points** (where this analysis informs the broader project):
- File paths affected: {path1}, {path2}, ...
- Modules touched: {module1}, {module2}, ...
- In-progress PLANs / SPECs to cross-link via Relations: {wikilink list}

**Effort estimate**: S | M | L
  (S = <1 day; M = 1-3 days; L = >3 days)

**Priority**: High | Medium | Low
  (High = blocks downstream work; Medium = needed for next phase; Low = nice-to-have)

**Downstream consumers**:
- /decisions: this analysis feeds D-{N} via the {topic} option set
- /spec: REQ-{N} on SPEC-{NNN} will implement the chosen option
- /build: TASK-{N} on SPEC-{NNN} will execute the implementation
```

The Applicability sub-section bridges monolithic analyses to actionable downstream work. Without it, `/decisions` and `/spec` have to re-derive which analyses are relevant + how they map to D-Ns / SPECs / TASKs.

### Operation 3 — Surface separate-work-item question (if applicable)

If the analysis surfaces implementation work that should become a separate work item OUTSIDE this PLAN's scope (e.g., an unrelated infrastructure improvement, a tangential refactor opportunity), surface via `AskUserQuestion`:

```text
Question: "Analysis ANALYSIS-NNN surfaced work that is outside this PLAN's scope:
{description of the surfaced work item}. How to handle?"

Options:
  1. Spawn separate PLAN (Recommended when item is substantive + unrelated)
     — /plan create with the surfaced description; user runs /plan after this /research completes
  2. Defer to backlog
     — mcp__plugin_brain_brain__manage_backlog operation (if the backlog is in use); item lives in Brain's manage_backlog system
  3. Absorb into current PLAN as a new part
     — surface to /plan via a follow-up part-add operation; item becomes a new {phase}.{N} part on this PLAN
```

All three options are Brain MCP operations; there is no GitHub-issue-creation analog. Brain projects manage work items in the knowledge graph + Jira (via sync-jira); only adopt GitHub Issues if the project has explicitly enabled both.

## Why this pass matters

Without retrieval-density:
- ANALYSIS notes are large monolithic documents; semantic search hits them on title-keyword match but doesn't surface specific claims
- Downstream consumers (`/decisions`, `/spec`) have to read the full ANALYSIS to find the relevant content
- Cross-analysis observations (e.g., "Option A in ANALYSIS-1 conflicts with Option B in ANALYSIS-2") aren't surfaceable via search

With retrieval-density:
- 3-5 atomic observations per analysis = ~15-25 searchable fact units per typical /research output
- Semantic search resolves to the specific observation, not the whole note
- Downstream consumers find specific claims quickly + cross-analysis observations surface naturally

## Ordering with Step 8 + Step 9

Step 8.5 fires AFTER Step 8 user-confirms termination, BEFORE Step 9 set-part-done. The ordering is intentional:

```text
Step 8: user confirms /research complete
   ↓
Step 8.5: retrieval-density pass on every ANALYSIS produced
   ↓
Step 8.6: resource-bounds + degradation protocol (cleanup, coverage notes)
   ↓
Step 9: set-part-done to /plan
```

Running Step 8.5 BEFORE user-confirmation would force a pass on each loop iteration's intermediate analyses (wasted work for analyses that get superseded). Running it AFTER set-part-done would mean downstream `/decisions` doesn't benefit from the density boost.

## Two-step edit pattern (mandatory)

Each Operation 1/2 edit follows the two-step pattern:

1. PLAN edit (or here, ANALYSIS edit — the canonical state mutation)
2. SESSION Event NN append (`Type: state-change`, body: "retrieval-density pass applied to ANALYSIS-NNN: appended {K} observations + Applicability sub-section")
3. Project repo commit

Per-ANALYSIS commit OR per-batch commit? Default: per-ANALYSIS (one Event per note). If there are many analyses (>10), per-batch commit is acceptable to reduce commit churn — but each note still gets its own Event entry.

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Bundling multiple facts into one observation | Loses atomic-observation granularity; defeats the search-improvement purpose | One claim per observation; split bundled observations into separate entries |
| Observations without `[category]` prefix or `#tags` | Violates CONVENTIONS Section 4.2 observation format | Always include category + 1-3 tags |
| Observations restating the analysis title | Tautological; doesn't add search value | Observations encode DECISION-RELEVANT facts, not structural metadata |
| Placing Applicability AFTER `## Observations` or `## Relations` | Violates universal final-two-sections invariant | Applicability goes BEFORE Observations |
| Skipping the separate-work-item AskUserQuestion when warranted | Surfaced work goes unaddressed; future you re-discovers it | Always surface when analysis identifies out-of-scope work |
| Running Step 8.5 on every loop iteration | Wastes work on superseded analyses | Run ONLY after Step 8 user-confirms termination |
| Editing the analysis body to "polish" it during the pass | Mutation interleaving = harder traceability; loses provenance of analyst's original text | Step 8.5 is an APPEND operation only — add observations + Applicability; do not edit analyst-authored content |
