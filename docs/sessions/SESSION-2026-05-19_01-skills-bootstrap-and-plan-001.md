---
title: 'SESSION-2026-05-19_01: Skills Bootstrap and PLAN-001'
type: session
permalink: sessions/session-2026-05-19_01-skills-bootstrap-and-plan-001
tags:
- session
- skills
- bootstrap
- plan-create
---

# SESSION-2026-05-19_01: Skills Bootstrap and PLAN-001

**Scope**: Bootstrap the `skills` Brain project per user-provided 6-step instructions. Create filesystem + git, register Brain MCP project, write KICKOFF-BRIEF.md (project root file), invoke `/plan create` with `--name skills-ecosystem`, surface 5 open design questions from KICKOFF-BRIEF.md via AskUserQuestion as Step 5. Bound to PLAN-001 Skills Ecosystem (see Relations); this session drives the bootstrap (Steps 1-4) and the start of decisions.1 (Step 5).
**State**: Step 5 AskUserQuestion adjudication pending user response. PLAN-001 is authored; decisions.1 part is READY; this session is IN_PROGRESS.

## Event 01 — Session started

- Project `skills` (new — created via Brain MCP `create_project` this session)
- Branch `feat/plan-001-skills-ecosystem` (pre-created during Step 1)
- Starting commit SHA — (no commits yet on this branch; bootstrap commit pending end-of-bootstrap)
- Goal bootstrap the skills ecosystem PLAN-001 + initial session note, pause at Step 5 for user adjudication of 5 open design questions

## Event 02 — Filesystem + git setup (Step 1)

- Created `~/Dev/skills/` directory tree with `docs/{planning,decisions,specs,sessions,analysis,critique}` subdirs
- Git ran `git init` plus new branch `feat/plan-001-skills-ecosystem` (off no-commits-yet baseline)
- Verified `git status` clean, all docs/ subdirs present

## Event 03 — Brain MCP project create + activate (Step 2)

- Created Brain MCP project `skills` via `create_project` with `code_path=/Users/peter.kloss/Dev/skills`, `memories_path=CODE` (Brain notes land at `~/Dev/skills/docs/`)
- Activated `active_project` set to `skills`; `BM_PROJECT=skills` session-level
- Probe `list_directory /` returned no files (expected — empty project); `bootstrap_context` timed out twice on first-call empty-project warm-up (non-blocking — MCP server alive per `list_directory` probe; per the MCP-disconnect-recovery memo)

## Event 04 — KICKOFF-BRIEF.md written (Step 3)

- Created `KICKOFF-BRIEF.md` (project root; NOT a Brain note — project-config file per binary rule)
- Via `Write` tool (correct tool for non-graph files per CONVENTIONS Section 1.7.1)
- Content verbatim user-provided brief between BRIEF-START/END markers (mission, why-this-exists post-mortem of ADR-001 split incident, locked architecture decisions, LLM-script division of labor, per-type adapter build order, /defrag and /ingest scope, round-trip property test specification, key file references, 5 open design questions, constraints, out-of-scope items)
- PostToolUse hook reformatted (likely markdownlint --fix); verbatim semantic content preserved

## Event 05 — PLAN-001 authored (Step 4)

- Skill invoked `/plan` create mode with `--name skills-ecosystem`
- Reference reads (cognitive pre-flight) `~/.claude/skills/plan/references/plan-note-schema.md`, `~/.claude/skills/plan/references/two-step-edit-pattern.md`, `~/NOTE-TEMPLATES.md` (PLAN + SESSION sections)
- Branch policy `feat/plan-001-skills-ecosystem` pre-existing non-main branch; /plan honored it (no checkout) per skill branch policy
- Heavy /plan create dispatches (analyst + pre-mortem + critic) SKIPPED for bootstrap turn — KICKOFF-BRIEF.md substitutes for analyst output; the brief's "Why this exists" section IS the post-mortem; Step 5 AskUserQuestion IS the critique gate. Per iterative-phase-reentry rule, validation phases can re-enter if gaps surface during decisions.1 adjudication
- research part marked DONE upfront with `KICKOFF-BRIEF.md` (file-path, not wikilink) as outcome reference per explicit user direction
- Created PLAN-001 Skills Ecosystem (see Relations: part_of from this session) via Pattern 2 three-phase write (write_note → edit_note find_replace title-colon → move_note kebab filename)
- First write_note plus edit_note attempt produced malformed state (wikilinks in body lacked colons because authored-from-template without forward-reference colonization); delete_note plus recreate-with-colon-wikilinks resolved
- Permalink artifact basic-memory auto-suffixed `-1` after delete plus recreate collision; remediated this turn via edit_note find_replace on the permalink line (`planning/plan-001-skills-ecosystem-1` → `planning/plan-001-skills-ecosystem`)
- find_replace tool behavior clarified plain-text replacement IS supported on frontmatter and inline content; the misleading `# ` prefix in error messages is display-only. Inline double-bracket wikilink syntax cannot be matched via find_replace because basic-memory extracts wikilinks out of literal content into the relations table — fix via delete plus recreate with correct wikilinks from the start

## Event 06 — SESSION-2026-05-19_01 authored

- Created this session note via Pattern 2 three-phase write
- Bound to PLAN-001 Skills Ecosystem (see Relations: part_of)
- PLAN-001 already authored with the bi-directional inverse `contains` relation pointing back at this SESSION in its Relations section
- First write_note attempt failed with malformed-bullet error — 4 bullets in Events 05+06 contained the prose-plus-double-bracket-wikilink pattern that basic-memory parses as an invalid typed relation. Reauthored without double-bracket syntax in prose bullets; wikilink references in prose are now plain-text title references with "see Relations" pointers
- Second write_note attempt also failed — 3 more bullets contained double-bracket placeholder or code-span text that the parser still treats as a wikilink. Third attempt removes ALL double-bracket syntax from prose bullets entirely

## Event 07 — Step 5 pending — AskUserQuestion for 5 open design questions

- Trigger user-provided bootstrap Step 5
- Source `KICKOFF-BRIEF.md` "Open design questions for early adjudication"
- Questions to surface
  - Q1 JSON Schema vs Zod for plan validation
  - Q2 Markdown AST library (unified/remark) vs custom regex parser
  - Q3 Plan file format (YAML vs JSON vs sidecar markdown table)
  - Q4 Per-adapter vs unified discriminated-union plan schema
  - Q5 Run /brain:---adr-review on architecture ADRs as BLOCKING gate
- Batch policy up to 4 questions per AskUserQuestion call per ask protocol; Q1-Q4 batched in one call; Q5 surfaced in a second call (back-to-back per overflow rule)
- After adjudication locked answers feed directly into decisions.1 D-1 through D-5 (decision-critic stress-test plus verbatim echo plus diff-approval plus 2-step edit cycles per D-N micro-cycle) → composite ADR-001 authored → brain:---adr-review gates ACCEPTED (if Q5 = YES)

## Event 08 — 5 decisions LOCKED via AskUserQuestion (Step 5)

- Type decision-lock
- Trigger user-bootstrap Step 5 (AskUserQuestion call 1 with Q1-Q4 batched, call 2 with Q5 follow-up)
- Outcome 5 decisions LOCKED with Recommended options selected verbatim per the decision-binding-echo rule
- D-1 LOCKED Zod for plan validation (TS-native, type inference, single source of truth between TS types and validation)
- D-2 LOCKED unified + remark + remark-frontmatter for markdown AST (battle-tested AST required for SPEC subtree accuracy)
- D-3 LOCKED YAML at docs/_restructure/*.yaml for plan files (human-readable, LLM-friendly authoring; strict Zod validation on load mitigates YAML quirks)
- D-4 LOCKED Unified discriminated union on source_type for plan schema (clean type narrowing per adapter; single place to add new adapters)
- D-5 LOCKED YES — /brain:---adr-review BLOCKING gate (adr-review PASS verdict required for ADR ACCEPTED status; adheres to the adr-review-blocking-gate memory rule)
- PLAN-001 updated DoD checkboxes Q1-Q5 checked; D-N substatus table 5 rows PENDING → LOCKED with verbatim locked-decision text; Decision Log + Progress Log entries appended
- Next ADR-001 authoring via brain:🧠-architect dispatch with detail-parity mandate + brain:---adr-review gate per D-5; paused per bootstrap directive awaiting user confirmation to proceed

## Event 09 — decisions.1 transition READY → IN_PROGRESS; auto-routing to /decisions

- Type state-change
- Trigger user invoked `/plan PLAN-001-skills-ecosystem` (continue mode)
- Outcome decisions.1 substatus READY → IN_PROGRESS; owning_session bound to this SESSION
- Branch policy current branch `feat/plan-001-skills-ecosystem` is non-main; /plan honored existing branch per skill branch policy (no new branch created this invocation)
- Next per Contract 2 dispatch shape, auto-route to /decisions with `plan=PLAN-001 part=decisions.1`. /decisions will detect the 5 already-LOCKED D-Ns in PLAN-001's D-N substatus list, skip the per-D-N micro-cycle's AskUserQuestion phase, and proceed directly to brain:🧠-architect dispatch for composite ADR-001 authoring (with detail-parity mandate referencing the 8 KICKOFF-BRIEF locked design decisions plus the 5 LOCKED decisions). Then brain:---adr-review runs as BLOCKING gate per D-5 lock before ADR-001 flips PROPOSED → ACCEPTED.

## Observations

- [outcome] Bootstrap Steps 1-4 complete; PLAN-001 + SESSION-2026-05-19_01 authored; awaiting user adjudication on 5 open design questions #bootstrap-progress
- [decision] research part DONE upfront with KICKOFF-BRIEF.md as file-path outcome reference (deviation from outcome-wikilink convention documented in PLAN-001 Decision Log) #research-substitution
- [decision] Heavy /plan create dispatches (analyst + pre-mortem + critic) skipped for bootstrap; iterative-phase-reentry available if gaps surface #pragmatic-bootstrap
- [insight] Brain MCP find_replace supports plain-text replacement on frontmatter and inline content; the hash-prefix in error messages is display-only and not actual search behavior #brain-mcp-find-replace
- [insight] Brain MCP find_replace cannot match double-bracket wikilink syntax because basic-memory extracts wikilinks into the relations table out of the literal content; fix via delete plus recreate with correct wikilinks from the start #brain-mcp-wikilink-limitation
- [insight] Basic-memory's bullet parser treats ANY bullet containing double-bracket syntax (even inside code spans) as a typed-relation candidate — the text before the open brackets becomes the relation_type. Prose bullets with embedded double-bracket syntax fail malformed-bullet validation regardless of code-span context; rephrase as plain-text title references in prose bullets and use Relations section for the typed relation #brain-mcp-bullet-parser
- [insight] Basic-memory permalinks can auto-suffix `-N` after delete plus recreate collisions; remediable via find_replace on the permalink line in the frontmatter #permalink-quirks
- [constraint] All approved actions must land per the never-silently-skip rule; pending Step 5 adjudication is the only outstanding action and is being surfaced via AskUserQuestion this turn #informed-consent
- [risk] First attempt at /plan create produced malformed wikilink state (no colons) because author-from-template defaulted to no-colon form throughout — load-template-before-creating-note advice (read NOTE-TEMPLATES plus STRUCTURES plus per-type hygiene memo BEFORE first write) caught the rule but the wikilink-colonization detail was missed; documented here for future bootstrap notes #note-creation-hygiene

## Relations

- part_of [[PLAN-001: Skills Ecosystem]]
- pairs_with [[brain:---adr-review]]