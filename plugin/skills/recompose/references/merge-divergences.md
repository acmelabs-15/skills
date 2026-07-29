# What goes wrong when you merge, specifically

The mechanics of the impact manifest, repointing and closure are direction-neutral and live in `../decompose/references/`. This file carries the part that is not: which failure to expect when the operation is a merge.

It exists because the failures invert. `../decompose/references/split-divergences.md` is its mirror, and reading the wrong one sends you looking for the wrong thing — the same CLI, the same exit codes, the opposite defect.

## What retires

A merge retires **whole identities**. N sources collapse into one target, so N-1 complete sets of title, permalink and entity ID stop being the current name of anything at once — while the source files themselves usually remain on disk.

That is the difference from a split, which retires identifiers *within* a surviving note: there, individual `D-N` labels get renumbered while the note keeps its own name. Here the note's entire identity goes, all three forms together.

That last part is the trap, and it has no split-side counterpart. **Because recompose leaves its sources on disk, a reference to an absorbed source still resolves to a file** — which is precisely why the closure check matters. Resolving is not the same as being current, and nothing but that scan distinguishes a citation that was repointed from one that merely still opens.

So declare every absorbed source's title, permalink and entity ID as aliases on the target. A merge that names only the surviving identity produces a manifest that cannot see the references it most needs to find.

## Figures: INFLATION

A merge breaks a derivable figure by bringing several claims about separate structures into one note that now contains all of them:

- two sources each claiming "8 rows" become one note whose table has sixteen, and **both claims survive into it**.

Watch for figures that are now **smaller than the structure they count**. Two surviving totals rows over one combined table is the signature. Neither claim was wrong before the merge; both are wrong after it, and neither was edited.

## Corrections: RESURRECTION

An obligation already LANDED against one source can re-enter scope when that source is absorbed: the corrected text arrives in the target alongside content the correction never covered, and an obligation that had been satisfied is live again over a wider assertion than it was written for.

The after-state to look for is `LANDED` before and OUTSTANDING after — the inverse of the split's orphaning, where the correction loses its target entirely. Re-read the obligation against the merged note before deciding it still applies.

## Graph edges: UNDER-REPAIR

N sources' inbound indices converge on one target. Every note that pointed at any absorbed source must now point at the target, and every one of those edges needs its verb re-checked — an edge that read `part_of` toward a source may be wrong toward the note that absorbed it.

Those are judgment-class entries the executor declines by construction, so a merge's preview typically shows **few mechanical repairs and a large residue**. That is the expected shape rather than a defect: a preview like that is telling you the merge is mostly a graph pass. Read it as a workload estimate, not a failure.

## The batch boundary: LOWER stakes

Stage two excludes target files from the text scan, so cross-target references are neither reported nor repaired.

For a merge this matters less than it does for a split. The sources dissolve into one target anyway, so a missed source-to-source reference usually lands inside content that ends up in the same note. It is still worth knowing — a source that is not absorbed, or an unmerged residual, keeps the stale citation.

## Reversibility

A merge is reversible through decompose only to the extent the composition recorded the boundaries it merged on. Where the sources were scaffolded, the prologue and epilogue are stripped rather than merged, so what round-trips is the content slices and not the scaffolding. `scaffolded-sources.md` covers that.
