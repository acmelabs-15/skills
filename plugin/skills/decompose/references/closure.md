# Verifying reference closure

How to prove the citation repairs landed and that nothing new broke on the way. Read this after repointing, and after working the brief — a closure run against an unworked brief just re-reports what the brief already told you.

**Direction-neutral.** The check behaves identically whatever produced the stale references.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/reference-scan.js" \
  --check --manifest docs/_restructure/<id>-impact.json \
  --docs-root docs \
  --retain docs/_restructure/<id>-retain.json \
  --out docs/_restructure/<id>-closure.json
```

Every finding from the original scan comes back as one of:

- `UPDATED` — the stale form is gone.
- `RETAINED` — you allow-listed it.
- `OUTSTANDING` — still present, and nothing said to keep it.

This is the executor's acceptance test, and the pairing is exact: a finding the executor applied is a finding whose stale form is gone from the tree, which is precisely what `UPDATED` describes. So expect one `UPDATED` per repair the report counted as applied, and treat any shortfall as the interesting result — a repair the executor believed it made is not visible to a fresh scan.

Exit code 2 means closure was not reached. The report also lists `newFindings`: references that exist now but were absent at plan time, which is how a repointing pass that introduced a fresh stale form gets caught.

## It re-runs both deterministic legs

So it verifies more than text repointing. Every formal edge you repointed is re-traversed, and an edge whose inverse did not travel with it comes back as a bi-directional violation — a repoint that updated one end and orphaned the other does not pass.

It re-runs them through the SAME funnel, pinned to the project the manifest recorded, so the check cannot take a different path to a different answer than the scan did.

One addition: every file the prior manifest named is folded into the scope unconditionally. After a successful repoint those references are gone, so the index legitimately stops returning their notes — re-deriving scope from a fresh query alone would drop exactly the files being verified and report every repaired reference as UPDATED without opening one of them. Because stage two always reads current disk content, including a file that no longer references anything costs one read and proves the repair.

## Deterministic and advisory are counted separately

The summary splits `outstanding` (deterministic — this is what `closed` is computed from) and `outstandingAdvisory` (the merged advisory entries).

Advisory entries cannot be re-derived by a deterministic scan, so they are carried forward with their prior status and marked unverified rather than being silently reported as UPDATED. Confirm those by hand or re-run the search.

`closed` additionally requires no introduced asymmetry: a pass that repaired every stale reference while leaving an edge one-way has not finished.

## The retain file is yours to author

It is never inferred. A surviving reference is either a deliberate historical citation or an unrepaired break, and only you know which — a checker that guessed would quietly convert real breakage into a pass. An unconstrained rule is refused rather than retaining everything, because that is exactly the shape a typo produces:

```json
[{ "referencingFile": "sessions/SESSION-2026-07-26_01-bootstrap.md" }]
```

## Companion re-checks

Re-run both companion checks across every note the operation touched, and diff against the baselines taken beforehand:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/correction-reconcile.js" \
  --docs-root docs --source <note-a.md> --source <note-b.md> \
  --out docs/_restructure/<id>-corrections-after.json

bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/figure-check.js" \
  --docs-root docs --note <note-a.md> --note <note-b.md> \
  --out docs/_restructure/<id>-figures-after.json
```

Read the diff, not the absolute counts. **Which direction the diff moves is operation-specific** — a split loses figures and orphans corrections, a merge inflates figures and resurrects corrections — so the callers' riders say what to expect. This file only says to compare.

Report both diffs alongside the closure summary. A note whose figures no longer derive is not a clean result even when every SHA-256 proof passed: the hashes guarantee the bytes moved intact, not that the sentences about them are still true.

## Index staleness

A restructuring can also impact the search index, which is a surface the file tree does not cover. The failure mode is a stale row for a retired permalink that keeps resolving in search after the note has moved, while reading it by that permalink returns nothing — a phantom that survives repointing every citing note, because no citing note is what is serving it.

Evidence on this build is mixed and worth stating plainly: notes in this project record encountering exactly that phantom for a retired permalink, but a later index audit found no orphans in either direction (files on disk and indexed entities matched exactly). Treat the check as cheap insurance against a documented failure mode, not as a condition known to be live right now.

The scan surfaces half of this for you: a candidate the queries returned that is not on disk lands in the discovery block's `missingOnDisk`, which is the index knowing a path the tree no longer holds. The other half — a retired permalink still served for a note that moved — needs a hand check. Search for each retired title and permalink. Any hit still served that `list_directory` does not corroborate is an `index-stale` finding: record it in the merge file alongside the other advisory entries.

When any `index-stale` finding exists, recommend a re-index in the closure report — repointing every citing note does not clear a stale index row, and the next agent to search will find the phantom. The executor declines this class by construction and routes it to the work brief, so the re-index recommendation is the action; there is no text edit that would help.

## Report it, never pass silently

Report the closure summary alongside the audit log. Failure to reach closure is a surfaced finding: state how many references remain OUTSTANDING and where they are. Do not report an operation as complete on the strength of the hash proofs alone — those cover the bytes that moved, not the notes still pointing at where they used to be.
