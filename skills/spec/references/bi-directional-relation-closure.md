# Bi-Directional Relation Closure — Step 6 Procedure

Every relation authored in Stage 2 Steps 2-5 needs a bi-directional inverse on the target note (CONVENTIONS Section 4.4). Step 6 walks every relation added during SPEC authoring and verifies the inverse exists; adds if missing.

## Why bi-directional closure matters

Asymmetric relations defeat graph traversal:

- A note's `## Relations` lists its outbound edges; readers can follow them to find related entities
- BUT readers landing on a related entity must be able to find their way back — the inverse edge is the "back-pointer"
- Without inverses: graph traversal becomes one-way; Jira hierarchy derivation breaks; note threading fails

Brain's wikilink expansion relies on bi-directional edges. Search-with-relations queries traverse BOTH directions. Asymmetric edges make ~50% of related-entity lookups fail silently.

## Inverse verb table (CONVENTIONS Section 4.4)

| Outbound (on source note) | Inverse (on target note) | Symmetry |
|---|---|---|
| `implements` | `implemented_by` | directional |
| `depends_on` | `required_by` | directional |
| `extends` | `extended_by` | directional |
| `part_of` | `contains` | directional |
| `inspired_by` | `inspires` | directional |
| `supersedes` | `superseded_by` | directional |
| `leads_to` | `caused_by` | directional |
| `pairs_with` | `pairs_with` | symmetric |
| `relates_to` | `relates_to` | symmetric |

## Relations to close after Stage 2

The SPEC authoring sequence creates these relations:

### From SPEC root

- `implements [[ADR-N]]` (one per ACCEPTED ADR this SPEC realizes) → ADR needs `implemented_by [[SPEC-NNN: ...]]`
- `contains [[REQ-N-SPEC-NNN: ...]]` (one per REQ) → REQ has `part_of [[SPEC-NNN: ...]]` (already added in Step 2)
- `contains [[DESIGN-N-SPEC-NNN: ...]]` (one per DESIGN) → DESIGN has `part_of [[SPEC-NNN: ...]]` (already added in Step 3)
- `contains [[TASK-N-SPEC-NNN: ...]]` (one per TASK) → TASK has `part_of [[SPEC-NNN: ...]]` (already added in Step 4)
- `part_of [[EPIC-NNN: ...]]` (if SPEC is part of an EPIC) → EPIC needs `contains [[SPEC-NNN: ...]]`
- `relates_to [[ANALYSIS-NNN: SPEC Clustering]]` → ANALYSIS needs `relates_to [[SPEC-NNN: ...]]` (symmetric — same verb)

### From REQ

- `part_of [[SPEC-NNN: ...]]` → SPEC's `contains` already covers (added when SPEC root authored)
- `implements [[ADR-N]]` (if the REQ realizes a specific ADR) → ADR needs `implemented_by [[REQ-N-SPEC-NNN: ...]]`

### From DESIGN

- `part_of [[SPEC-NNN: ...]]` → SPEC's `contains` covers
- `implements [[ADR-N]]` (if DESIGN realizes ADR architectural mandates) → ADR needs `implemented_by [[DESIGN-N-SPEC-NNN: ...]]`
- `depends_on [[DESIGN-M-SPEC-NNN: ...]]` (cross-design dependency) → other DESIGN needs `required_by [[DESIGN-N-SPEC-NNN: ...]]`

### From TASK

- `part_of [[SPEC-NNN: ...]]` → SPEC's `contains` covers
- `implements [[REQ-N-SPEC-NNN: ...]]` → REQ needs `implemented_by [[TASK-N-SPEC-NNN: ...]]`
- `implements [[DESIGN-N-SPEC-NNN: ...]]` → DESIGN needs `implemented_by [[TASK-N-SPEC-NNN: ...]]`
- `depends_on [[TASK-M-SPEC-NNN: ...]]` (cross-task dependency) → other TASK needs `required_by [[TASK-N-SPEC-NNN: ...]]`

## Closure procedure

For each note authored in Step 2-5:

1. Read the note's `## Relations` section via `mcp__plugin_brain_brain__read_note`
2. For each relation: identify the target note (the wikilink) + the required inverse verb
3. Read the target note's `## Relations` section
4. If the inverse relation is present: skip (already closed)
5. If the inverse is absent: append it via `mcp__plugin_brain_brain__edit_note` with `operation: "append"` (or `replace_section` on `## Relations` if cleaner)
6. Apply two-step edit pattern (target edit + SESSION Event NN append for the closure + commit)

### Example: closing SPEC root's `implements [[ADR-001]]`

```text
1. Read SPEC-001 root note → Relations contains: "implements [[ADR-001: Polar MCP]]"
2. Target: ADR-001; required inverse: implemented_by [[SPEC-001: Core Grid Display]]
3. Read ADR-001 → Relations section
4. ADR-001's Relations does NOT contain implemented_by [[SPEC-001: ...]]
5. mcp__plugin_brain_brain__edit_note({
     identifier: "decisions/adr-001-polar-mcp",
     operation: "append",                # OR replace_section on ## Relations
     content: "- implemented_by [[SPEC-001: Core Grid Display]]\n"
   })
6. Two-step edit: ADR edit → SESSION Event NN ("Closed bi-dir: ADR-001 ← SPEC-001 implemented_by") → commit
```

## Target-missing halt

If a wikilink target doesn't exist (e.g., a REQ references `[[ADR-999: Foo]]` but no ADR-999 exists):

```text
```spec-bi-dir-target-missing-halt
trigger: Stage 2 Step 6 bi-directional closure
question: Does target [[ADR-999: Foo]] exist?
answer: "no"
test_failed: target-existence check
deferral: The wikilink target was wrong. Fix the source note's relation: either (a) correct the wikilink to a real ADR, (b) remove the relation if it was erroneous, or (c) author the missing target if it should exist.
```
```

This catches transcription errors + stale references.

## Edit operations summary

| Update | Operation |
|---|---|
| Add single inverse relation | `edit_note` with `operation: "append"` to the `## Relations` section content |
| Rewrite entire `## Relations` section (cleanup or restructure) | `edit_note` with `operation: "replace_section", section: "## Relations"` |
| Add multiple inverses to one target | Batch them into a single `append` operation (one edit per target, multiple relations in content) |

## Step 6 ordering within the SPEC subtree

Process notes in REVERSE creation order (TASK → DESIGN → REQ → SPEC root). Rationale: TASKs have the most outbound relations; processing TASKs first closes the deepest dependencies (TASK → REQ + TASK → DESIGN). DESIGNs come next (DESIGN → ADR). REQs follow (REQ → ADR). SPEC root last (SPEC → ADR + SPEC → EPIC + SPEC → ANALYSIS).

This order also matches G2 resume — if Step 6 halts partway through TASK closures, resume on the next TASK without re-checking already-processed TASKs.

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Skipping Step 6 because "the relations look fine" | Asymmetric edges break ~50% of graph traversals silently | Always run Step 6; closure is BLOCKING |
| Closing only SPEC-level relations (skipping TASK/REQ/DESIGN closures) | Deepest edges (TASK→REQ) stay asymmetric | Process all 4 note types per the table above |
| Using `relates_to` everywhere instead of typed verbs | Loses semantic information; degrades search-with-relations | Prefer typed verbs (`implements`, `depends_on`, `part_of`, etc.); reserve `relates_to` for genuine non-directional relationships |
| Auto-closing without verifying target exists | Silent fail if target was a typo | Always check target exists first; halt on miss |
| Batching closures across multiple SPECs | Loses per-SPEC traceability of closure events | Close all relations within one SPEC subtree before moving to next SPEC |
| Editing target's Relations via `replace_section` when only adding 1 inverse | Risk of accidentally dropping other relations | Use `append` for single additions; `replace_section` only for cleanups |
| Updating target's Relations without bi-dir verification afterward | Adds the relation but doesn't verify the inverse landed | Re-read target after edit to confirm the inverse is present |
