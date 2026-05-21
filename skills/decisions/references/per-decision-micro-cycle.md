# Per-Decision Micro-Cycle — Canonical (Executor Version)

The 7-sub-step cycle that /decisions runs PER pending D-N. This is the canonical reference — `/plan`'s same-named file documents the cycle from /plan's perspective (receiving set-part-done downstream); this file documents the cycle from the executor's perspective (the agent actually running the sub-steps).

## Cycle invariants

- **One D-N at a time**. Never batch multiple D-Ns into a single AskUserQuestion or commit.
- **Lowest D-N number first**. Within a part, process `d_n_substatus` entries in numerical order (D-1, D-2, ...). Skip already-LOCKED entries (G2 resume).
- **HALT-on-fail propagates the loop pause**. If any sub-step halts, the D-N stays PENDING; the loop exits to the user; user resumes via re-invoking /decisions.

## Sub-step 2a — decision-critic stress-test

```text
Skill(skill="brain:---decision-critic")
```

Brief includes:

- The pending D-N (description + the options surfaced in source ANALYSIS notes)
- The PRD acceptance criteria (so the critic knows what success looks like)
- Adversarial framing: "Review this decision setup as a stranger to the work. Stress-test the assumptions: which claims are presented as fact but require evidence? Which counterarguments are unaddressed? Where might anchoring bias have narrowed options prematurely? Surface at least one concrete concern even on strong work — cite specific option content or source ANALYSIS section."

decision-critic returns a stress-test report. If critical reasoning gap surfaced:

- HALT `decisions-step2-decision-critic-halt`
- Revise the option presentation (request additional ANALYSIS content from /research if needed; loop back briefly via Phase reentry per the iterative-phase-reentry pattern)
- Re-run sub-step 2a once revisions land

If report is clean OR all flagged concerns have been addressed: proceed to 2b.

## Sub-step 2b — AskUserQuestion with verbatim option content

Compose the AskUserQuestion call per Contract 4 5-field template:

- **question**: complete sentence ending in `?`. Example: "Lock D-{N} ({short topic description}) — which option?"
- **header**: ≤12-char chip label (e.g., "D-7 backend")
- **multiSelect**: `false` (one D-N at a time)
- **options**: 2-4 options. Each option's:
  - **label**: 1-5 words; the option name from the source ANALYSIS
  - **description**: option pros/cons summary + consequences if chosen (informed-consent format)
  - **preview**: VERBATIM option content from the source ANALYSIS note (full pros/cons/cited evidence). Use the `preview` field on AskUserQuestion to show the verbatim content for visual comparison.
- First option labeled `(Recommended)` if the source ANALYSIS made a recommendation; otherwise the most-supported option from decision-critic feedback

**Verbatim-from-ANALYSIS principle**: option content in the AskUserQuestion preview MUST be copy-pasted from the source ANALYSIS — NEVER rephrased, NEVER summarized. The user adjudicates against the same content that informed the analysis; rephrasing introduces drift between locked decision and source material.

## Sub-step 2c — Capture adjudication

User answers via AskUserQuestion. Capture:

- **Selected option** (one of: Accept verbatim / Modify / Reject)
- **User refinements** (free-text notes appended to the selected option, captured in AskUserQuestion's `notes` field)
- **Rejected options** (if Reject, capture the rejection rationale from user notes)

If user picks Modify with insufficient information to lock (e.g., "modify Option A but I don't know what to modify"): HALT `decisions-step2-modify-insufficient-halt`; gather context (re-read ANALYSIS OR dispatch additional `brain:🧠-analyst` for the gap) AND re-ask via AskUserQuestion when context arrives.

If user picks Reject for ALL options (none acceptable): HALT `decisions-step2-no-acceptable-option-halt`; surface to user; options include: re-open /research for the D-N's underlying requirement, dispatch additional ANALYSIS to surface new options, defer the D-N (mark `d_n_substatus` entry status DEFERRED with rationale).

## Sub-step 2d — Decision-binding verbatim echo

Apply Contract 4 decision-binding echo template:

> Locked decision (verbatim echo): **\<option label\>** — "\<full option description verbatim\>" + any user refinements.

Quote label + description **verbatim** from the AskUserQuestion option. NO paraphrasing, NO expansion, NO interpretation. User refinements (from `notes` field) append AFTER the verbatim quote.

Skipping the echo creates drift between locked decision and durable record. The echo is the LAST chance to surface a verbatim record before durable artifact authoring.

## Sub-step 2e — Show diff for approval

Show the proposed mutations in chat BEFORE applying:

1. PLAN-part `d_n_substatus` entry diff (status PENDING → LOCKED, decision verbatim text added)
2. SESSION Event NN entry preview (the Event body that will be appended)

Two-step apply gate:

1. Show diff in chat (informational only; NEVER embed a literal ```diff block in the durable artifact — diffs are reviewable artifacts, not durable content)
2. Apply changes directly to body content after explicit user approval

Wait for user to confirm before sub-step 2f.

## Sub-step 2f — Two-step Brain MCP edit

Per Contract 5 + D-04. Apply in strict order:

### Edit 1 — PLAN edit (canonical state mutation)

```text
mcp__plugin_brain_brain__edit_note({
  identifier: "planning/PLAN-NNN-{slug}",
  operation: "find_replace",
  find_text: "...",          # the PENDING D-N substatus entry verbatim
  content: "..."             # the LOCKED entry with verbatim decision text
})
```

Or use `replace_section` if the `d_n_substatus` array is structured as a markdown section.

### Edit 2 — SESSION Event NN append (pointer ledger)

```text
mcp__plugin_brain_brain__edit_note({
  identifier: "sessions/SESSION-YYYY-MM-DD_NN-{slug}",
  operation: "append",
  content: "..."             # the Event NN body per Contract 5 schema
})
```

Event body per Contract 5 schema:

```markdown
## Event NN — <YYYY-MM-DD HH:MM> — D-{N} locked: {short title}

**Type**:         decision-lock
**Trigger**:      /decisions Step 2 micro-cycle on D-{N} ({topic})
**Outcome**:      D-{N} substatus PENDING → LOCKED; decision: {option label}
**Observations**: [decision] D-{N} locked: {locked option} #adr-{nnn} #d-{n}

### Locked decision (verbatim echo)

**{option label}** — "{full option description verbatim}"

User refinements: {user notes verbatim if any, else "none"}

### Source
- ANALYSIS-NNN sub-section {section name}
- (any other source references)

### decision-critic stress-test summary
{1-2 line summary of decision-critic findings + how they were addressed}
```

## Sub-step 2g — Project repo commit

Immediately commit the PLAN + SESSION edits:

```bash
git add docs/planning/PLAN-NNN-*.md docs/sessions/SESSION-*.md
git commit -m "decisions: lock D-{N} in decisions.{N}

{One-line summary of the locked decision}"
```

Per the commit-cadence invariant: every PLAN or SESSION edit gets a project repo commit in the same turn — never batched across multiple events. Commit message format:

| D-N action | Commit message |
|---|---|
| D-N locked | `decisions: lock D-{N} in decisions.{N}` |
| D-N deferred | `decisions: defer D-{N} in decisions.{N} (rationale: {short})` |
| D-N re-opened (rare) | `decisions: re-open D-{N} in decisions.{N}` |

## Loop continuation

After sub-step 2g, return to the top of Step 2: pick next PENDING D-N. When all D-Ns reach LOCKED, exit Step 2 and proceed to Step 3 (hygiene audit).

## How /plan sees the micro-cycle

`/plan` does NOT execute the micro-cycle — `/decisions` does. `/plan` only:

1. Auto-routes `/plan PLAN-NNN` continue mode to `/decisions` when the next-ready part is `decisions.{N}` (per auto-routing).
2. Receives `set-part-done` from `/decisions` (Step 9) after all D-Ns are locked + composite ADR is authored + adr-review passes.
3. Applies its own two-step edit pattern on set-part-done receipt (PLAN `decisions.{N}` part status PENDING → IN_PROGRESS → DONE; outcome wikilink set; commit).

The PLAN-part `d_n_substatus` mutations happen INSIDE /decisions during the micro-cycle; /plan re-reads PLAN state when /decisions returns.

## Detail-parity mandate (relevant to ADR authoring)

The verbatim-decision text captured in each D-N's `d_n_substatus` entry + the SESSION Event NN body together form the canonical source material for the composite ADR (Step 5). The architect dispatch brief includes "preserve every detail from SESSION events; do not summarize" — the detail-parity audit (Step 6) samples ≥5 D-Ns and compares ADR content vs Event bodies; compression detected triggers architect re-dispatch.

This is why the verbatim echo (sub-step 2d) + verbatim Event body (sub-step 2f) are non-negotiable — they're the source of truth for the eventual ADR.

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Locking multiple D-Ns in a single AskUserQuestion | Violates one-decision-at-a-time | One D-N per call; loop |
| Rephrasing option content in AskUserQuestion preview | Drift between source ANALYSIS and locked decision | Verbatim copy from ANALYSIS; never paraphrase |
| Skipping decision-critic | Reasoning gaps surface downstream | Invoke decision-critic before every AskUserQuestion |
| Skipping the verbatim echo | Drift between locked decision and durable record | Always echo immediately; quote verbatim |
| Embedding a literal ```diff block in the durable artifact | Confuses static parsers + readers | Show diff in chat (informational); apply changes directly to body |
| Batching Brain MCP edits across multiple D-Ns | Loss of immediate-event-write invariant | One D-N = one PLAN edit + one SESSION Event + one commit |
| Picking the next D-N out of order | Numbering drift; harder to audit | Lowest D-N number first; G2 resume skips LOCKED entries |
| Treating Reject-all as a halt without recourse | Loses user agency | Surface Reject-all options: re-open /research, dispatch additional ANALYSIS, or DEFER with rationale |
| Modify-without-context proceeding silently | Drift between user intent and locked decision | HALT on Modify-without-context; gather context; re-ask |
