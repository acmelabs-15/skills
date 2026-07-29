# Repointing the mechanical references

How the repoint executor repairs the citations a restructuring broke, what it refuses to touch, and how to read the brief it hands back. Read this after the content has moved and before declaring the operation finished.

**Direction-neutral.** Splitting, merging and auditing all repoint the same way; only the identifier maps differ.

## The repoint plan

Author a plan naming what moved. Every value is an identifier, and the plan must declare at least one of the three identifier maps — a repoint with no mapping would downgrade every finding to residual, so the schema refuses it:

```yaml
plan_type: repoint
renumber_map:  { "ANALYSIS-034": "ANALYSIS-041" }
wikilink_map:  { "ANALYSIS-034: Old Title": "ANALYSIS-041: New Title" }
permalink_map: { "analysis/analysis-034-old": "analysis/analysis-041-new" }
section_map:   { "ANALYSIS-034": { "Section 6": "Section 3" } }
```

Preview first — this is the default and writes nothing — then apply:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/repoint.js" \
  --manifest docs/_restructure/<id>-impact.json \
  --plan docs/_restructure/<id>-repoint.yaml \
  --docs-root docs --out docs/_restructure/<id>-repoint-preview.json

bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/repoint.js" \
  --manifest docs/_restructure/<id>-impact.json \
  --plan docs/_restructure/<id>-repoint.yaml \
  --apply --docs-root docs --out docs/_restructure/<id>-repoint.json
```

## Four properties that make it safe to run and safe to re-run

- **Preview is the default; `--apply` is required to write.** A preview runs the identical computation — resolution, the section-existence check, address verification, the reversibility proof — and stops before the rename. It is evidence about what the apply will do, not a cheaper approximation of it.
- **Nothing is written until everything verifies.** Every file is staged, each file's edit set is proven reversible byte-for-byte against what was read, and only then is anything renamed. A failure anywhere leaves the tree exactly as found.
- **A second run is a no-op.** An address already holding its repointed form is reported as already-repointed rather than substituted again, so re-running after a partial failure is safe and re-running after success changes nothing.
- **The write set is the mechanical set only.** Bi-directional closure findings, index staleness, malformed references and every advisory entry are declined by construction — before any file is opened — because their repair is an edge insertion, a re-index or an authored correction, none of which a map can express. Automating them would mean guessing.

## The manifest must be current

A stale manifest is regenerated rather than migrated. The executor treats it as untrusted input in the same sense a plan YAML is — it is read back from disk and may have been hand-edited — so a manifest that does not satisfy the current schema fails validation loudly and writes nothing, rather than being coerced into something the executor then edits from.

There is no special case for any particular way a manifest can be wrong: whatever it is missing, a scan produced it and a scan replaces it, and the refusal names that remedy rather than emitting a bare union error. Re-running the scan is the remedy in every such case, and it is the only one — a hand-migrated manifest would carry addresses measured against a tree that has since moved.

The same applies when the tree shifts under a valid manifest, which surfaces per finding as `address-drift`: the recorded position no longer holds the stale text, so re-scan and re-run.

## Exit codes

- `0` — every mechanically repairable finding was applied or was already applied, and the residual worklist is empty.
- `1` — validation error (argv, missing file, malformed JSON or YAML, Zod rejection, unsafe path). Nothing was written.
- `2` — the run completed and work remains. This is an EXPECTED outcome, not a failure: a manifest carrying judgment-class or unmapped findings exits 2 by design, and those are worklist items. Same convention as the closure checker.
- `3` — integrity failure: the pass could not be proven reversible. Nothing was renamed. Distinguished from 2 because 2 is expected and this is a bug.

## The work brief: everything the executor declined

The report's `workBrief` is the deliverable of a residual, and it is what replaces read-everything discovery. It is grouped by the note needing the edit, heaviest note first so a partially-worked brief has made the most progress, with entries inside each note ordered top-to-bottom so one pass down an open file closes everything in it.

Each entry answers four questions an agent would otherwise re-derive:

- `path` and `permalink` — which note to open.
- `anchor` — where to look: a real `line` and `col` for prose, plus the cited fragment where one exists.
- `class` and `reason` — why it was declined.
- `evidence` — the matched text, and the file and line it was seen in, plus the expected inverse edge and its counterpart on a bi-directional entry.
- `causingOperation` — what the plan says happened to the target.
- `suggestedAction` — the shape of the repair.

Three details in there are load-bearing:

**The repair site for a bi-directional finding is the COUNTERPART note**, not the note carrying the evidence. The missing inverse edge belongs there, and the note holding the evidence needs no change at all.

**An entry whose address was never measured from a line of text reads `whole note`** rather than `line 1, col 1`, because printing a position that was never taken sends an agent to the frontmatter.

**`causingOperation` is read off the plan's declared maps rather than inferred**, so it says plainly when the plan declared no change to that target instead of asserting a restructuring nobody requested.

`suggestedAction` is a SHAPE, not an instruction to follow blindly. Every entry in the brief exists precisely because a machine could not decide it, so each one names the edit and leaves the judgment where it belongs. For an index-edge entry it says so explicitly: open both notes, check their Relations sections carry the typed pair in both directions, and do not copy the index's verb — it is not evidence.
