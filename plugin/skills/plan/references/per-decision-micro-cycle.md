# Per-Decision Micro-Cycle

The per-D-N lock pattern used by `/decisions` to lock each decision one at a time. `/plan` references this pattern because decisions parts (`decisions.N`) carry `d_n_substatus` (per Contract 6), and the micro-cycle is what mutates each D-N's substatus from `PENDING` to `LOCKED`. Cross-linked with `/decisions/references/per-decision-micro-cycle.md` (canonical source when `/decisions` is authored).

## Micro-cycle steps (per locked D-N)

For each pending D-N in a decisions part, run this 7-sub-step cycle:

### Sub-step 2a — decision-critic stress-test

Invoke `Skill(skill="brain:---decision-critic")` to stress-test the reasoning before commitment. Surfaces hidden assumptions, verifies claims, generates adversarial perspectives. If decision-critic surfaces a critical reasoning gap, halt and revise the option presentation before re-asking the user.

### Sub-step 2b — AskUserQuestion with verbatim option content

Surface the decision to the user via `AskUserQuestion` (per Contract 4 5-field template):

- **question**: complete sentence ending in `?`
- **header**: ≤12-char chip label
- **multiSelect**: `false` (one decision at a time)
- **options**: 2-4 options, each with label (1-5 words) + description (informed-consent format)
- First option labeled `(Recommended)` carries the default

Options are sourced **verbatim** from the upstream ANALYSIS notes — the analyses surfaced options-with-pros/cons; `/decisions` adjudicates without re-deriving. Use `preview:` on each option to show the verbatim option content for visual comparison.

### Sub-step 2c — Capture adjudication

User answers via AskUserQuestion. Capture:

- **Selected option** (Accept verbatim / Modify / Reject)
- **User refinements** (free-text notes appended to the selected option)
- **Rejected options** (if Reject, capture the rejection rationale)

If the user picks Modify with insufficient information to lock, halt: gather context (re-read ANALYSIS or dispatch additional analyst) and re-ask.

### Sub-step 2d — Decision-binding verbatim echo

Per Contract 4 decision-binding echo template:

> Locked decision (verbatim echo): **\<option label\>** — "\<full option description verbatim\>" + any user refinements.

Quote label + description **verbatim**. No paraphrasing, no expansion, no interpretation. User refinements appended after the verbatim quote.

Skipping the echo creates drift between locked decision and durable record.

### Sub-step 2e — Show diff before applying

Show the proposed edit to the destination doc (PLAN body / ADR body) in chat for user approval. Two-step apply gate — show diff in chat for approval, then apply changes directly to the document body:

1. Show diff in chat (informational only; never embed a literal `​```diff` block in the durable artifact — diffs are reviewable artifacts, not durable content)
2. Apply changes directly to body content after user approval

Wait for explicit user approval before applying.

### Sub-step 2f — 2-step Brain MCP edit

Per Contract 5 + D-04 (see `references/two-step-edit-pattern.md`):

1. **PLAN edit first** (canonical state mutation):
   - Update the decisions part's `d_n_substatus` entry for this D-N: substatus PENDING → LOCKED, decision = verbatim locked text
   - Use `mcp__plugin_brain_brain__edit_note` with `find_replace` or `replace_section` as appropriate

2. **SESSION Event NN append second** (pointer ledger):
   - Append `## Event NN — D-{N} locked: {short title}` to the session note body
   - Event body includes: Type `decision-lock`, Trigger reference to /decisions per-D-N micro-cycle, Outcome `{D-N substatus → LOCKED}`, locked decision verbatim echo, user refinements

### Sub-step 2g — Project repo commit

Commit the PLAN + SESSION edits to the project repo. Every PLAN or SESSION edit gets a project repo commit in the same turn — never batched across multiple events. Without this invariant, the durability boundary obscures which Event corresponds to which commit, and crash/branch-switch loses state that lives only in the working tree.

Commit message format:

```text
plan: lock D-{N} in decisions.{N}

{One-line summary of the locked decision}
```

## How /plan sees the micro-cycle

`/plan` does NOT execute the micro-cycle itself — `/decisions` does. `/plan` only:

1. Auto-routes `/plan PLAN-NNN` continue mode to `/decisions` when the next-ready part is `decisions.{N}` (per `references/auto-routing.md`).
2. Receives Contract 1 `set-part-done` from `/decisions` after all D-N in the part are locked + composite ADR is authored + `brain:---adr-review` passes.

The `d_n_substatus` mutations during the micro-cycle are PLAN edits applied by `/decisions` (since it has the active dispatch). `/plan` becomes involved again only at set-part-done.

## Detail-parity mandate (relevant to plan-level rollups)

The composite ADR's per-D-N sections must be AT LEAST as detailed as the corresponding SESSION Event bodies. Implementation phases must run as mechanical execution of a complete plan with no silent assumptions, which means the upstream plan (the ADR) must carry every detail an implementer would need. The architect dispatch brief includes "preserve every detail from SESSION events; do not summarize." A detail-parity audit samples ≥5 D-Ns and compares ADR content vs Event bodies; compression detected → re-dispatch architect; do not advance to adr-review.

Although this audit is `/decisions` Step 6, the rollup integrity affects `/plan`: when `/plan` receives set-part-done, the part's outcome wikilink points at an ADR that has been detail-parity-audited. PLAN-level rollups (Progress Dashboard, Phase Progression) inherit this integrity.

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Locking multiple D-Ns in a single AskUserQuestion | Violates one-decision-at-a-time | One D-N per AskUserQuestion; loop |
| Skipping decision-critic | Reasoning gaps surface as bad decisions downstream | Invoke decision-critic before every AskUserQuestion |
| Skipping the verbatim echo | Drift between locked decision and durable record | Always echo immediately after answer locks; quote verbatim |
| Embedding a literal `​```diff` block in the durable artifact | Confuses static parsers + readers; diffs are reviewable artifacts, not durable content | Show diff in chat (informational); apply changes directly to body |
| Batching Brain MCP edits across multiple D-Ns | Loss of immediate-event-write invariant | One D-N = one PLAN edit + one SESSION Event + one commit |
| Authoring composite ADR before all D-N locked | Drift between SESSION Events and ADR body | Author composite ONLY after all D-N substatuses = LOCKED |
| Flipping ADR ACCEPTED before brain:---adr-review PASS | Downstream consumers see un-validated ADR | adr-review is BLOCKING; ACCEPTED only after PASS |
