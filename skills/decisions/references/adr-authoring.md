# ADR Authoring — 11-Section Per-D-N Template + Architect Dispatch Brief

The composite ADR authored by the architect at Step 5 follows the canonical 11-section per-D-N template. Each LOCKED D-N becomes one section in the ADR body; the sections preserve every substantive detail from the corresponding SESSION Event entries.

## ADR file structure

```yaml
---
title: "ADR-NNN: {Topic Title Case}"
type: decision
status: PROPOSED                      # flipped to ACCEPTED by Step 8 after adr-review PASS
date: YYYY-MM-DD                      # set on first PROPOSED transition (today)
updated: YYYY-MM-DD                   # same as date initially; refreshed on Clarifications
permalink: decisions/adr-nnn-{slug}
tags: [adr, decision, {topic-tags}]
---

# ADR-NNN: {Topic Title Case}

## Context

{What problem this ADR addresses. Cite source PRD requirement + source ANALYSIS notes
via wikilinks. Reference the demand signal + wedge from /research.}

## Decision Statements

{One-line summary per D-N — fast-glance index. Format: "D-N: {short decision name}".}

## D-1: {Decision Title}

(11-section template — see below)

## D-2: {Decision Title}

(11-section template)

## D-N: {Decision Title}

(11-section template; one per LOCKED D-N in d_n_substatus)

## Cross-Cutting Constraints

{Constraints that apply across multiple D-Ns. Each constraint references the D-Ns it
governs.}

## Clarifications

(Empty at draft; populated post-ACCEPTED when ambiguities surface in downstream phases.
Each clarification has date + question + resolution.)

## Observations

- [decision] ...
- [constraint] ...
- [risk] ...

## Relations

- implements [[ANALYSIS-NNN: ...]]
- implements [[PRD-NNN: ...]]
- part_of [[PLAN-NNN: ...]]
- (additional relations per CONVENTIONS Section 4.4 typed verbs)
```

`## Observations` and `## Relations` are the final two sections per the universal invariant. `## Clarifications` (if present) goes BEFORE Observations.

## 11-section per-D-N template

Each D-N section in the ADR body has these 11 sub-sections in this exact order:

```markdown
## D-{N}: {Decision Title}

### Decision Statement

{One-sentence statement of what was decided. Verbatim from the AskUserQuestion option
label + any user refinements from sub-step 2c.}

### Context

{Why this decision was needed. Cite source PRD requirement + source ANALYSIS section.
Quote the relevant ANALYSIS option content verbatim where possible.}

### Full Rationale

{Why this option was chosen over alternatives. Multi-paragraph; preserve every reasoning
thread from the SESSION Event body. Cite evidence inline (file paths, prior decisions,
external sources).}

### Performance Analysis

{Performance characteristics of the chosen option — benchmarks, scaling assumptions,
latency targets, throughput. If not applicable for this D-N, state "N/A — non-performance
decision".}

### Implementation Pattern

{How implementers should realize this decision. Include code shapes, interface contracts,
module structure if known. Reference relevant DESIGN notes (from /spec phase) if they
exist; otherwise note "implementation pattern to be detailed in /spec phase".}

### Alternatives Considered

{Rejected options + WHY each was rejected. Preserve verbatim from SESSION Event +
source ANALYSIS. One sub-bullet per alternative. Format:

- **Option B (Postgres)** — Rejected because: {reason verbatim from Event}. Trade-off
  surfaced: {what was given up}.
- **Option C (DynamoDB)** — Rejected because: {reason}.}

### Failure Modes

{What could go wrong + how the chosen option handles each failure mode. Cover happy-path
failures (expected exceptions, timeouts) AND adversarial failures (concurrent writes,
schema drift, version skew).}

### Cross-Wave Implications

{How this D-N constrains or unlocks downstream work. Reference other parts in the PLAN
that depend on this decision. Format:

- decisions.{M}: {how this affects M}
- spec.SPEC-{NNN}: {what spec must implement}
- build.SPEC-{NNN}: {implementation constraints}}

### Configuration Knobs

{Configurable parameters introduced by this decision. Default values + acceptable ranges.
Format:

| Knob | Default | Range | Rationale |
| --- | --- | --- | --- |
| {name} | {default} | {range} | {why} |}

### User Refinements

{Verbatim quotes from user's adjudication notes (sub-step 2c). Preserve EXACT user
wording — no paraphrasing. If user accepted Recommended without refinements, state
"No refinements; user accepted Recommended option verbatim".}

### Reversibility Assessment

{How hard is this decision to reverse? Cite the work that would have to undo if this
were superseded later. Format:

- **Reversibility**: Low | Medium | High
- **Effort to reverse**: {S | M | L | XL}
- **Blast radius**: {what downstream artifacts would need to change}}
```

## Detail-parity mandate

The architect dispatch brief MUST include this exact phrase:

> Preserve every detail from SESSION events; do not summarize. The composite ADR's per-D-N section must be AT LEAST as detailed as the corresponding SESSION Event body. Compression detected during the detail-parity audit triggers re-dispatch.

This is non-negotiable. The audit at Step 6 samples ≥5 D-Ns and compares ADR content vs Event bodies; compression on ANY sample causes re-dispatch.

### Compression signals (any triggers FAIL)

- ADR omits substantive content from the SESSION Event
- ADR paraphrases instead of preserving exact wording on locked options
- ADR collapses multiple bullets into a single sentence
- ADR drops a sub-section (e.g., "Failure Modes" present in Event but missing in ADR)
- ADR uses generic language where the Event had specific examples (e.g., "various performance considerations" instead of the specific p99 numbers)

### What's allowed (NOT compression)

- Reformatting (Event has prose; ADR uses a table for the same content)
- Renumbering (Event refs D-3.2.1; ADR uses D-3 sub-section heading)
- Adding context-bridging prose for ADR readers who haven't read the Event
- Reordering bullets for readability (as long as no content drops)

## Architect dispatch brief structure

The full brief to `Task(subagent_type="brain:🧠-architect")`:

```text
Author the composite ADR for decisions.{N} of PLAN-{NNN}.

## Inputs

- PLAN-NNN: <wikilink>
- decisions.{N} part: locate via `mcp__plugin_brain_brain__read_note` on PLAN
- d_n_substatus: {N} D-Ns all LOCKED (full list with verbatim decision text inline below)
- Source SESSION Event NN entries: {list with Event references}
- Source ANALYSIS notes: <wikilinks> (the options-with-pros/cons the D-Ns adjudicated)
- PRD-{NNN}: <wikilink> (the upstream requirements)
- complexity_tier: TIER_N (drives expected ADR depth — Tier 4-5 ADRs go deeper)

## Detail-parity mandate (NON-NEGOTIABLE)

Preserve every detail from SESSION events; do not summarize. The composite ADR's
per-D-N section must be AT LEAST as detailed as the corresponding SESSION Event body.
Compression detected during the detail-parity audit triggers re-dispatch.

## Output structure

The ADR uses the 11-section per-D-N template (see adr-authoring.md). Each LOCKED D-N
becomes one ## D-{N}: ... section in the ADR body with all 11 sub-sections populated.

ADR top-level structure:
- frontmatter (status: PROPOSED; date + updated today)
- Context (cite source PRD + source ANALYSIS via wikilinks)
- Decision Statements (one-line summary per D-N — fast-glance index)
- ## D-1, ## D-2, ..., ## D-N (the meat — 11 sub-sections each)
- Cross-Cutting Constraints
- Clarifications (empty at draft)
- Observations (3-15 with [category] + 1-3 #tags)
- Relations (2+ typed verbs; implements / part_of / etc.)

## Authoring tools

- Use Brain MCP Pattern 2 three-phase write to create the ADR
- counter-availability: list_directory decisions to find next ADR-NNN
- frontmatter title MUST contain colon: "ADR-NNN: {Topic Title Case}"
- filename kebab: adr-nnn-{slug}.md

## Evidence hierarchy

For any load-bearing claim about existing code, contracts, or prior decisions:

1. Tool output (test runs, type checks, lint, search results)
2. Files actually read in this dispatch (cite path:line)
3. Web/docs search results (cite URL or canonical source)
4. Training-data knowledge (lowest priority; never assert from training alone for
   load-bearing claims)

## Canonical-source-mirror rule

When ADR content mirrors a SESSION Event verbatim, cite the source Event reference
inline. Example: "Per [[SESSION-2026-05-19_01: ...]] Event 14: '{verbatim quote}'."

When ADR content paraphrases an external source (book, paper, doc), cite the source URL
+ quote the verbatim passage being referenced.

## Reviewer-asymmetry context

You are the AUTHOR with detail-parity discipline. The REVIEWER is downstream
(brain:---adr-review) and will operate with adversarial framing. Your job is to make
the ADR un-falsifiable on detail-preservation grounds — every claim cited, every D-N
section AT LEAST as detailed as the source Event.
```

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Skipping the detail-parity mandate phrase in the dispatch brief | Architect compresses; audit fails; re-dispatch needed | Include the exact phrase verbatim |
| Allowing summarization in the Full Rationale section | Loses reasoning detail; downstream consumers can't reconstruct | Preserve every reasoning thread from the Event |
| Dropping the Failure Modes or Reversibility Assessment sub-sections | 11-section template is non-negotiable; missing sub-sections fail detail-parity | All 11 sub-sections per D-N, every time (state "N/A" with brief justification if genuinely not applicable) |
| Paraphrasing the Decision Statement | First-line accuracy matters most | Verbatim from AskUserQuestion option label + user refinements |
| Authoring D-N sections out of source order | Cross-references break; numbering drift | Source order = `d_n_substatus` array order (D-1, D-2, ..., D-N) |
| Skipping User Refinements section when user accepted Recommended | Section serves as record of user agency | State "No refinements; user accepted Recommended option verbatim" |
| Letting the architect choose D-N section order arbitrarily | Numbering drift; reader confusion | Lock D-N section order to source `d_n_substatus` array order |
| Architect dispatch without complexity_tier context | ADR depth doesn't calibrate to scope | Brief includes tier; architect aligns depth to tier expectations |
