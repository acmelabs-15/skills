# Graph audits the CLIs perform

Three audits that look at a note's place in the graph rather than its own contents: which notes point at it, whether corrections have been reconciled, and whether its figures still match what they describe. Read this when running an audit cycle by hand, or when deciding whether a candidate is safe to restructure.

**This is agent procedure.** `defrag.ts` does not perform any of it — the CLI classifies notes and reports. These audits are steps an agent runs, invoking the composition CLIs by path, and reading their output to decide. That division is deliberate: the classification is mechanical and belongs in code, while deciding whether forty inbound references make a merge too expensive is judgment.

Every command below is real and shipped, at `${CLAUDE_PLUGIN_ROOT}/dist/cli/`.

## Inbound-reference audit

The quality thresholds above look at a note in isolation: how many observations
it carries, how long it is, when it was last touched. None of that sees the
edges. A note with two observations looks like a merge candidate whether it has
zero inbound references or forty, and the cost of restructuring it is almost
entirely a function of that number.

Run the scanner over the candidate set to supply the missing dimension:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/reference-scan.js" \
  --docs-root docs \
  --targets defrag/reports/defrag-candidates-targets.json \
  --out defrag/reports/defrag-YYYY-MM-DD-impact.json
```

The targets file is the candidate list, one entry per note. Candidates surfaced
by threshold alone have no retired identities, so no aliases are needed; supply
`aliasTitles` / `aliasPermalinks` / `aliasEntityIds` only where you already know
a note was renumbered or renamed. Where you do, each alias becomes a discovery
query of its own — no query on a note's current identity can reach a retired one,
which is what makes it retired.

`--project <name>` is optional and pins the graph the queries run against. Left
off, the CLI resolves one itself (`BM_PROJECT`, `BM_ACTIVE_PROJECT`,
`BRAIN_PROJECT`, then a match of the working directory against configured code
paths), and the project that answered is recorded on the impact manifest with
whether you named it or the CLI resolved it. For a cron-scheduled audit, name it:
a resolved project is an inference a changed working directory could redirect.

The scan reads each candidate's own Relations section as a formal inbound index
before scanning prose. Under the bi-directional rule — when note A carries a
`part_of` edge naming note B, B must carry the inverse `contains` edge naming A
— a candidate's Relations enumerate the notes that reference it, and one-way
edges surface as `bidirectional-missing-on-target` and
`bidirectional-missing-on-referencer` findings with the repair site named.

Those two classes are structural-fix candidates in their own right, independent
of any split or merge. A one-way edge is a defect whether or not the note is
ever restructured, and this audit is the only place defrag would notice it.

**Malformed references are the third such class. Surface them as their own
structural-fix findings.** The `wikilink-malformed` class flags colon-less and
filename-stem wikilinks pointing at the candidate. Those are already broken,
independently of any restructuring, and are worth fixing whether or not the
candidate is ever touched — so a scan run for a proposed merge routinely turns
up repairs that have nothing to do with the merge. Do not discard them because
the candidate was skipped.

### What the report must carry

Two things the finding line does not have a field for, and both change what the
user decides:

**A stale-delete candidate with inbound references is not a delete.** It is a
delete plus a repointing pass, and the report should say so rather than
presenting it as one-step cleanup. The cost of the two is not comparable, and
the count is the only thing that distinguishes them.

**Show the inbound count when asking the user to confirm a candidate.** Consent
to restructure a note is not informed consent if the blast radius is not on
screen. Carry the manifest's `discovery` block alongside the count, because a
count is only as good as the scope that produced it — an unproven scan's low
number is a claim, not a reassurance.

### How the audit finds referencing notes

The audit rides the same two-stage funnel the restructuring skills use, and that
mechanism is defined once, in `../decompose/references/impact-manifest.md`. Read
it there; it is not restated here. It covers the candidate-set queries and their
completeness contract, the GRAPH and TEXT legs, the advisory channel, and the
gating assertions to run before believing a low finding count.

One difference worth stating, because it is easy to misread: the scanner no
longer walks the docs tree to find referencing notes — that census was removed
rather than kept as a fallback, so a run cannot silently take a different path to
a different answer. The audit cycle's own step 1 DOES still enumerate every note
under `docs/**`, but that walk feeds the quality thresholds and is a different
mechanism from reference discovery.

What the audit adds on top of the shared mechanism is when to run it: before
proposing to move, merge or delete any candidate, so the blast radius is known
while the candidate is still a proposal.

## Correction and figure audit

Two further audits run over the same candidate set, both read-only, both using
the defrag convention that exit 2 means the audit found work.

**Unlanded corrections.** A correction naming its target and quoting the text it
retires is a machine-checkable obligation:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/correction-reconcile.js" \
  --docs-root docs --source <candidate.md> [--source ...] \
  --out defrag/reports/defrag-YYYY-MM-DD-corrections.json
```

An OUTSTANDING obligation on a candidate changes what the candidate is. A note
carrying an unlanded correction is not a split candidate that happens to need
tidying — restructuring it moves the target assertion out from under a correction
nobody has applied yet, and the correction is then pointing into a child. Surface
it as a blocker on that candidate rather than a note beside it. `TARGET-NOT-FOUND`
is stronger still: the correction names a note that has moved or never existed.

**Derivable figures.** Stated figures that summarise structure can be re-derived
from it, and `--all` needs no configuration:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli/figure-check.js" \
  --docs-root docs --all \
  --out defrag/reports/defrag-YYYY-MM-DD-figures.json
```

MISMATCH findings are structural-fix candidates in their own right — a stale
count is wrong whether or not the note is ever restructured, and this sweep is
the only place defrag would notice. `UNANCHORED` findings are the tool declining
to guess which structure a figure refers to; report them, do not action them.

Run the `--all` figure sweep even when the candidate list is short. It is the
cheapest audit in the cycle and the one whose findings are most likely to be
independent of the thresholds that produced the candidates.
