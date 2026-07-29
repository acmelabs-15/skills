# What goes wrong when you split, specifically

The mechanics of the impact manifest, repointing and closure are direction-neutral and live in `impact-manifest.md`, `repoint.md` and `closure.md`. This file carries the part that is not: which failure to expect when the operation is a split.

It exists because the failures invert. `recompose/references/merge-divergences.md` is its mirror, and reading the wrong one sends you looking for the wrong thing — the same CLI, the same exit codes, the opposite defect.

## What retires

A split retires **identifier strings**, not notes. The source note usually survives on disk as a retained shell — its frontmatter, H1 and trailing sections stay behind — while the identifiers that named its sections move into children under new names.

So the aliases that matter are the ones `renumber_map` names. Every retired `D-N`, every renumbered entity ID, is a literal no query on the current identity can reach. A split that renumbers and declares no aliases produces a manifest that looks clean and is short by exactly the number of retired identifiers.

## Figures: LOSS

A split breaks a derivable figure by separating a claim from the structure it counts:

- the source keeps a totals row while the table it summarises moves to a child, or
- a child inherits half a table and the whole count.

Watch for figures that got **smaller than their claim**. A child asserting "16 rows" over eight rows is the signature.

## Corrections: ORPHANING

Splitting a note that is the target of an outstanding correction moves the target assertion out from under the correction. The obligation then points into a child, or into content that stayed behind, and nobody finds out.

The after-state to look for is `LANDED` before and `TARGET-NOT-FOUND` after — the correction lost its target. Repoint the obligation at whichever child inherited the assertion.

## Graph edges: MIS-ASSIGNMENT

One target's inbound index disperses across N children. Every note that pointed at the source now needs to point at whichever child inherited the thing it was citing, and no map can decide which — the citing note's own words are the only evidence.

The risk is a repair that lands on the wrong child. It is not a broken link, so nothing downstream catches it: the edge resolves, at a note that does not contain what the citation claims.

## The batch boundary: HIGH stakes

Stage two excludes target files from the text scan, so cross-target references are neither reported nor repaired.

For a split this matters more than it does for a merge. The destinations all survive as independent notes, so a missed destination-to-destination reference is a permanent stale citation between two live notes. Scan targets that cite one another one at a time.

## Reversibility

A plan that retains ranges cannot be reversed from its destinations alone, because retained content exists only in the source and appears in no destination. Recompose recovers the concatenation of the written content slices; the source note itself — untouched by the split — is the record for retained ranges.

Plans with no scaffolding and no retention keep the full byte-identical decompose-then-recompose round trip.
