# Prompt 12 — Terminal thinning: review the survivors, verify every destination, delete only what leaves

_Run last of the 11 active prompts (prompt 3 dissolved — R-28). Paste everything below into a fresh Claude Code conversation._

---

**Execution contract (R-31): before doing anything else, read `scratch/prompts-v2/RUN-CONTRACT.md` — it sits beside this file — and run this entire prompt in its collaborative mode: granular, guided, opinions labeled, no assumptions. It overrides any "autonomous" framing below.**

## How to read this prompt — the provenance register

Every substantive statement below carries one of four tags. This is the contract that keeps Peter's decisions his, and the assistant's analysis labeled as analysis:

- **[DECIDED]** — Peter decided it, dated, in his own words where quotable. Do not re-litigate and do not re-ask.
- **[WONDERING]** — Peter's open questions. These ARE the interview: raise each at its marked moment via `AskUserQuestion`, exactly once, with the full relevant text shown. Attached recommendations are the assistant's, never his. Nothing in this register is pre-decided, however confident the recommendation sounds.
- **[FACT]** — measured repo or tool reality, with reproduction where it matters. Verify before relying on one; report mismatches as drift, not as license to improvise.
- **[DEFAULT]** — assistant design suggestions. Adopt or improve at runtime; deviations are *reported* with the measurement that justified them, not asked about.

If anything below reads as [DECIDED] but smells like an assumption, stop and surface it. That is a defect in this prompt, not a constraint on you.

## Ground truth as of 2026-07-27  [FACT — source: `OWNER-RULED-DELETE.md`; read it in full]

This prompt's ground moved on 2026-07-27. Where an earlier draft disagrees with this block, this block wins.

- **The 21 owner-ruled deletions are already executed** [DECIDED — R-27/R-28, executed]: the files were moved to `~/.claude/memory_deleted_2026-07-27/` (Cowork cannot `rm`), their 21 `MEMORY.md` index lines removed, the emptied `## Reference memories` header removed, and `feedback_post_compaction_rehydration_protocol.md`'s two stale phase-X pointers fixed. **Do not re-delete, re-migrate, or re-verify any of the 21.** A register row sourced from one closes as OWNER-DELETED citing the record — never as MISSING — and any older step naming one as a migration source or verification target is void.
- Layer now: **98 root items — 97 `feedback_*` + `MEMORY.md`** (was 119). Every 119-based count, the 7,081-line figure, and all old deletion-group arithmetic are stale. Re-derive any count before using it; the corrected figure wins and the report shows the command.
- `~/.claude/memory/` also holds **~33 per-project subdirectories** (Claude Code's per-project auto-memory, slugged by project path) — the old "zero subdirectories" claim is stale — plus one root file `MEMORY.md` never indexed: `feedback_subagents_use_opus.md`. The delta-sweep covers both.
- The prompt-3 export program is dissolved. Its one ratified survivor is `feedback_claude_code_markdown_first.md`: prompt 4 appends its substance to `create-skill/references/authoring-style.md`; this prompt cleans the memory as MIGRATED **only after verifying that append by read-back** (P4-9).

## What this prompt is

The programme's close-out. Ten prompts moved lifecycle-owned content out of the auto-memory layer and home specs. This prompt (1) runs Peter's review of the ~97 surviving root memories, (2) proves by evidence that every migrated rule is live where it was sent, and (3) deletes only what he rules out — through the rm gate, one named file at a time. **Terminal state [DECIDED — R-1/R-14]: a THINNED layer, zero dangling references, `MEMORY.md` accurate. The layer, `~/CLAUDE.md`, `~/AGENTS.md` and `~/.claude/memory/` keep existing and keep being served — an empty directory was never the goal.** The order is RULE, then VERIFY, then DELETE, and the middle one is a gate: a rule whose destination cannot be shown — real file, real line, quoted text — keeps its memory in the layer, and the run stops and says so.

## Standing rules (programme-wide)

All fourteen P4 rules hold as prompt 4 states them. The ones carrying this prompt's weight:

- **P4-1 — Every question goes through `AskUserQuestion`.** Max **4 authored options**; "Other" is auto-appended, so never author one, and say in the question text that Peter can type his own answer there. Questions are written in **plain language** — no internal jargon, no SS-IDs or file:line in the question body unless Peter is ruling on that exact text; what breaks and what it costs, stated simply. (If prompt 7's ASK-STANDARD has landed, it supersedes this paragraph — R-29.) One defect to carry into the review: `feedback_ask_protocol.md:34` mis-states the cap — *"Batch up to 4 per call (tool's hard cap)"* is four **options**, not four questions, and it contradicts `feedback_one_decision_at_a_time.md:12`.
- **P4-2 — One decision per question, one question in flight.** A multiselect decomposing a single decision is not a bundle.
- **P4-6 — Binary tool rule.** `docs/**` → Brain MCP; everything else (memories, home specs, config, `.ts`) → `Read`/`Edit`/`Write`, on which Brain MCP is forbidden (`KNOWLEDGE-GRAPH-CONVENTIONS.md:184-186`, `:202`). Route by artifact, not by phase.
- **P4-7 — Git.** Verify the branch first. One branch for the whole prompt; one commit per disposition group, naming every file; leave unmerged; do not push; no `--no-verify`, no force-push; no indication of AI contribution in any commit message.
- **P4-8 — Update cost is work, not an argument (D-19).**
- **P4-9 — Nothing deleted in bulk; nothing deleted before its destination is live and verified** (read-back or exercise, not assertion). `Bash(rm:*)` is in the permissions `ask` list (`settings.json:158`): every deletion raises a prompt even when approved in principle. Expect it; never route around it — no `find -delete`, no substituted `git rm`, no removal script, no glob to shrink the prompt count. A blocked deletion is recorded as deferred, not worked around. **This rule is most of this prompt.**
- **P4-10 — Read before designing, and say what was read. Do not sample.**
- **P4-12 — Fail closed.** A destination that cannot be verified is a **stop**, never "documented and proceeded".
- **P4-14 — No "enforces" claims without checking what prompts 5/9 actually shipped.** The composition suite is 458 synthetic-fixture tests, not 82. `validateTaskDoneClaim` / `validateSpecDoneClaim` / `applyCheckboxMutation` were recorded unwired at `feedback_checkbox_sweep_before_part_done.md:12`, `:18` (SS-22): if later prompts wired them, that record is now false and must not migrate as written; if not, it must survive as written.

Authority for facts: measured reality over the ledger's PART 2 (unreliable per its own record). Where a number below disagrees with what you find, run the command, use yours, and say so.

## Facts about the layer and its inbound references  [FACT]

**The sole-source register.** The pre-R-28 synthesis counted 90 sole-source findings (`SS-1`…`SS-84` plus six suffixed IDs) across 74 of the then-119 files, tiered 9 S1 / 29 S2 / 52 S3. Re-derive the surviving row set: rows sourced from any of the 21 close as OWNER-DELETED; every other row is verified. The nine S1 rows — none sourced from a deleted file — are verified first and individually:

| ID | Source | What vanishes if unlanded | Anchor to grep at the destination |
|---|---|---|---|
| **SS-1** | `feedback_post_compaction_rehydration_protocol.md` (whole, 139 L) | Rehydration itself — before prompt 10, `rehydrat` matched zero times in `SESSION-PROTOCOL.md` and all of `brain/**` | `rehydrat` |
| **SS-2** | `feedback_session_protocol.md:404-408` | The recovery test — a fresh instance reads the IN_PROGRESS note, follows every reference, is fully caught up | `recovery test` |
| **SS-2a** | `feedback_session_protocol.md:312-314` | The 5-minute update-latency rule | `5 minute` / `5-minute` |
| **SS-2b** | `feedback_session_protocol.md:380-390` | The backfill protocol for a never-created session note | `Backfill` |
| **SS-3** | `feedback_build_phase_autonomous_no_checkin.md:18` | The implement→QA iteration cap (*"exceeding 3 iterations"*) — the only written bound on the invariant loop | `3 iterations` / `failed_iterations` |
| **SS-4** | `feedback_draft_adrs_evolve_continuously.md:38` | The only lifecycle instruction anywhere to use `decompose`/`recompose` | `recompose` in `decisions/` |
| **SS-5** | `feedback_session_protocol.md:237` + `feedback_proactive_parallelism_check.md:11-16` | The parallel-safety biconditional (transitive `Blocked by` closure + disjoint `Files` sets) that makes computed waves possible | `Blocked by` + `disjoint` |
| **SS-5b** | `feedback_shared_tree_parallel_build_mechanics.md:15-22` | The only description of concurrent build coexistence on one tree, including double-claim detection and adjudication | `double-claim` |
| **SS-5c** | `feedback_shared_tree_parallel_build_mechanics.md:19` | The `git stash` prohibition on a shared tree (~2-second wrong-state race) | `git stash` |

`SS-2c` (MUTATE-vs-APPEND discipline + the 11-item session-note audit, `feedback_session_note_canonical_holistic_audit.md:18-26`, `:52-88`) and `SS-2d` (the 6 Mermaid dependency-graph rules, `:36-44` — STRUCTURES §4.12 carries only the palette) are prompt 10's destinations; if prompt 10 did not carry them they are MISSING like any other row.

**Evidence standard — what LANDED means.** All four, or the row is MISSING and MISSING is a stop (P4-12): (1) the destination file exists and was read; (2) the named section exists in it; (3) a sentence quoted **from the destination** states the rule — not paraphrases it; (4) the anchor greps at the destination. Migrated prose compresses 30–50%, so exact-string matches against the source fail correctly — that is not licence to lower the bar.

**Exercise, not reading, for rehydration.** SS-1 requires prompt 10's **real `/compact`** evidence, re-confirmed and dated — without it the rehydration memory does not move, however good the migrated text looks. `feedback_post_compaction_rehydration_protocol.md:52-55` also depends on `MEMORY.md`'s section headings; prompt 10 was required to cut that dependency — confirm cut. Its two phase-X pointers are already fixed (R-28) — verify only.

**Spot checks** — run against the new destinations; a hit only from `~/.claude/memory/` means the migration did not happen:

```
grep -rn "rehydrat"           ~/Dev/ACMElabs/skills/ ~/Dev/brain/ ~/references/
grep -rn "Backfill"           ~/Dev/ACMElabs/skills/ ~/Dev/brain/ ~/references/
grep -rn "globals=theme:dark" ~/Dev/ACMElabs/skills/
```

(`&globals=theme:dark` is the corpus's only working dark-mode QA method — SS-74; losing it re-costs a documented full-QA false negative.)

**The inbound-reference duty [DECIDED — P4-9 + R-1 terminal state].** Before anything is deleted here, enumerate and re-point or remove its inbound references — its `MEMORY.md` line, home-spec mentions, router rows, cross-memory wikilinks. The 21's index lines are already handled (R-28). The map:

- **Home specs**: 76 `feedback_*` occurrences on 66 lines, all in surviving files — `CLAUDE.md` 41, `KNOWLEDGE-GRAPH-CONVENTIONS.md` 17, `KNOWLEDGE-GRAPH-STRUCTURES.md` 10, `NOTE-TEMPLATES.md` 7, `AGENTS.md` 1. `~/CLAUDE.md:17-44`'s pre-flight table had 26 data rows, 23 citing a memory, 19 with the memory name as the entire payload — prompt 11 rewrote it (AM-ROUTER); verify no surviving row points at a file that left. Rows pointing at KEEP-IN-LAYER survivors are legitimate (R-1: the layer keeps being served).
- **Brain plugin**: zero coupling (283 files; `feedback_`, `.claude/memory`, `auto-memor`, `rehydrat` all → 0). Scope the sweeps accordingly.
- **`shared/composition/src/**`**: 13 citations. `plan-mutations.ts:271` was prompt 1's inline rewrite — confirm it landed. `schemas/plan-note.ts:24` cites `feedback_workflow_phase_rigor_at_every_layer` by name from shipped TypeScript.
- **`skills/docs/**`**: 72 `feedback_*` occurrences on 64 lines across 10 files (largest: `sessions/SESSION-2026-05-23_02…scope.md`, 29 lines). Re-derive: `grep -rn "feedback_" skills/docs/ | wc -l` for lines, `grep -ro "feedback_[a-z_]*" skills/docs/ | wc -l` for occurrences. Three live wikilinks — see W-3.
- **Home-spec `[[feedback_*]]` wikilinks**: 19 at programme start; 16 cleared by prompts 1/10/11 (the twelve `[[feedback_ai_dominant_estimates]]` template-injection sites, `NOTE-TEMPLATES.md:920`/`:1048`, and `CONVENTIONS.md:645-646`'s Pairs-with rows). **Three survive by design** — CONVENTIONS' own forbidden-form illustrations (pre-prompt-11 numbers `:478`, `:481`, `:602`; read prompt 11's recorded post-edit numbers, or locate by text).

**Assistant OBSOLETE proposals [DEFAULT — inputs to Peter's review; ruled there, never auto-deleted].** Ten files (the old list's eleventh, `MEMORY.md`, is off the list — the index survives and ends accurate, R-1; and the self-declared-dead seventh, the phase-X memory, is among the 21). Two old rationales are void under R-1 and are corrected below — "the layer is dying" supports nothing anymore.

| File | Zero-loss argument | Condition |
|---|---|---|
| `feedback_always_check_memories` (110 L) | `:42-50` (precedence) and `:58` (search-before-writing) are SS-27, salvaged into `curate` by prompt 6; the rest duplicates the prompt-11 router | SS-27 LANDED |
| `feedback_auto_memories_not_in_brain_notes` | self-declared superseded into CONVENTIONS §5.3/§7 | prompt 1 marked it VERIFIED-LANDED |
| `feedback_brain_note_naming` | self-declared superseded into CONVENTIONS §1.8/1.7.2/3 | prompt 1 marked it VERIFIED-LANDED |
| `feedback_canonical_state_and_rollups` | a redirect map; `:19` claims the recovery protocol moved to CONVENTIONS' Information Model preamble, Category 4 — a claim to verify, not a fact (`:20` is blank) | redirect verified at its destination; if NOT-LANDED, it reclassifies as MIGRATE |
| `feedback_skill_content_no_knowledge_graph` | self-declared superseded, 6-row destination map at `:16-21` | prompt 1 marked it VERIFIED-LANDED |
| `feedback_brain_v2_highspot_private_only` | self-VOIDed at `:13` (2026-07-25); `MEMORY.md:71` still lists it with no VOID marker | one line of reversal provenance kept in the project graph; index line removed on deletion, or VOID-marked if kept |
| `feedback_subagents_use_opus` (un-indexed) | absorbed by `feedback_no_unfounded_subagent_model_override` | that memory's own destination LANDED |
| `feedback_drift_detector_hook` | describes hooks de-registered 2026-06-30 (`:24`, verbatim: *"**NOT registered in Claude Code** (de-registered 2026-06-30 along with the rest of the hook set)"*); FIC-43 — delete the spec, keep the judgment rule | the `approvals.jsonl` 1.7 MB ops fact (also `:24`) carried to an ops note; prompt 9's hook post-mortem (R-20) has consumed this record; W-2's stop-the-line ruling applied |
| `feedback_commit_cadence` (150 L) | trigger list duplicates `feedback_session_protocol`; prompt 7 deleted the one attributive citation (`per-decision-micro-cycle.md:144`) whose sentence already states the rule. (Old rationale — "its subjects get deleted" — is void: the memory dir and `~/CLAUDE.md` survive) | Peter confirms the cadence itself is covered or unwanted |
| `feedback_sync_graph_unreliable` (28 L) | its one surviving line (*"sync-graph is unreliable; reconcile rollups manually"*) is live in `plan`/`build` | the line read back; consistent with prompt 11's repointing of the dead `sync` sites at `sync-graph`/`sync-jira` |

**Five placements decided upstream with a flagged content contradiction — verify only; silently carried forward is a stop:** `feedback_no_guessing_always_ask` (one rule, stated once, in `build` — not two); `feedback_one_decision_at_a_time` (split first — the optimistic-background-execution pattern has its own recorded fate); `feedback_question_persistence` (merged, not duplicated, into grill-me); `feedback_prereq_detect_install_fallback` (EH-29 survives as accept-with-justification; never-auto-install intact); `feedback_workflow_phase_rigor_at_every_layer` (rewritten before migration to name only the surviving layers — its `:27` "Auto-memory" row and `:51` "reference in ~/CLAUDE.md" step describe the pre-R-1 architecture, and `plan-note.ts:24` cites it from code, so a stale rewrite propagates into TypeScript).

**Stale home specs — prompt 11 rules, this prompt executes.** Do not re-open the ruling; do check its preconditions:

- Both `SESSION-PROTOCOL.md` copies go in **one operation** [DECIDED — supersession R-3; one-op forced by byte-identity: md5 `b6432f02ffd059b023431c5e3e269ea5`, `diff` empty, 657 lines each, both loaded — deleting one changes nothing and creates the false belief that it did]. It carries 103 MUST (15 of them MUST NOT) and 26 SHOULD — confirm prompt 10 triaged those, not assumed them stale.
- `AGENT-SYSTEM.md` / `AGENT-INSTRUCTIONS.md` diverge 479 / 142 lines from their `brain/rules/` forks and carry post-fork edits under an unchanged version stamp (`AGENT-SYSTEM.md:316`, an undated QA-path rename; `:637-666`, a state-sync agent absent from the fork). Prompt 1's three-way-diff extraction is applied **before** either file goes.
- Brain's phantom `.agents/SESSION-PROTOCOL.md` citations, `.agents/sessions/` paths and handoff-file references are inherited from the external ai-agents system — debris to remove, not lost intent to restore [DECIDED — R-20]. Execute whatever removals prompts 10/11 left, and report them.
- The true hook inventory (`settings.json:163-204`: four commands across Notification / SessionStart / PreCompact) matters to rehydration's firing signals — verify prompts 10/11 recorded it where rehydration landed; record it there if not.

## Step 0 — The map gate  [BLOCKING GATE]

Before anything is deleted, deliver to Peter, together: (1) the re-derived sole-source register with per-row verdicts — LANDED / OWNER-DELETED / MISSING, any MISSING having already stopped the run; (2) the classification covering every surviving root file plus everything the delta-sweep found, each in exactly one bucket. Raise W-1 in the same delivery. Wait for his go. No reply is a stop, not an implied yes.

Buckets [DECIDED — R-14 adds KEEP-IN-LAYER]:

| # | Bucket | Mandatory fields — a row missing one is not classified |
|---|---|---|
| 1 | **MIGRATE to a skill** (lifecycle-owned) | destination skill **and** load tier; a global-tier landing needs a stated reason, not a shrug |
| 2 | **MIGRATE to project knowledge** (SKILL-002 E-5) | destination project graph, and the note it lands in |
| 3 | **KEEP-IN-LAYER** (non-lifecycle; stays and keeps being served) | an accurate `MEMORY.md` index line |
| 4 | **OBSOLETE** | what supersedes it, `file:line` + quoted text — self-declaring frontmatter is the claim under test, not evidence. "Describes dead infrastructure" is a different, acceptable answer |
| 5 | **UNDECIDED** | why it could not be placed; near-empty, or the classification is not finished |

(The old "keep as reference material" bucket folds into KEEP-IN-LAYER: its `reference_*` population was owner-deleted and the layer now survives. [DEFAULT]) Cross-checks: every bucket-1/2 file has a LANDED row or an explicit no-sole-source note; every bucket-4 file has zero MISSING rows. And R-26 governs: this classification is assistant input, never a decision — Peter's review rules every disposition.

## The interview — things Peter is wondering about  [WONDERING]

These are Peter's open questions, carried here so they are asked **once, at the natural moment, by you** — not pre-decided in this prompt and not re-interviewed anywhere else. One decision in flight (P4-2). Plain language (P4-1). Show the full current text whenever he is ruling on existing text. Record every answer verbatim in the report; never re-ask an answered item.

**W-1 — at the map gate: how the ~97 surviving memories get reviewed.** The central question of this prompt. Decision facts: on 2026-07-27 Peter reviewed 22 memory dispositions per item and ruled 21 DELETE — assistant-side classification had drastically overstated keep-worthiness (R-26/R-27). The execution record leans toward repeating that per-item process (`OWNER-RULED-DELETE.md:50`) but never priced it at ~97 items. Options: (a) **per-item digests**, as in that review — highest fidelity, most rounds (a short digest per memory, a few per question); (b) **clustered digests by theme** — fewer rounds, some bundling risk; (c) **assistant proposes a KEEP-IN-LAYER list, Peter vetoes by exception** — fastest, weakest scrutiny. Assistant recommendation: (a) or (b) — never silent bulk classification; that is the R-26 lesson. Whatever he picks, every disposition is his ruling, recorded.

**W-2 — during the review, at each item: the nine memories with no destination anywhere.** Genuinely open; the options are updated for R-1 — the layer survives, so KEEP-IN-LAYER is now a lawful answer everywhere, and two recommendations changed accordingly (marked). Raise each at its item under whatever process W-1 chose.

| Memory | Decision facts | Options (+ automatic Other) | Assistant rec |
|---|---|---|---|
| `feedback_ai_dominant_estimates` (38 L) | canonical estimate mode, S/M/L bands, >10d decomposition; prompt 1 already restated the rule inline at all twelve former injection sites; the natural home depends on prompt 11's Q19 outcome — read it first, do not assume the recommended option was taken | (a) the surviving knowledge-graph spec, beside the estimate sections; (b) a `spec` `references/` file; (c) KEEP-IN-LAYER; (d) delete — the inline restatements suffice | (a), adjusted to what Q19 actually landed |
| `feedback_no_local_paths_in_brain_notes` (82 L) | no absolute local paths in Brain notes; proposes a pre-commit hook; its own examples cite `~/.claude/memory/` at `:32` | (a) CONVENTIONS §7, examples rewritten; (b) `curate`'s pre-write gate; (c) build the hook, delete the prose; (d) KEEP-IN-LAYER | (a), examples rewritten first |
| `feedback_bidirectional_relations` (46 L) | the 9 inverse relation pairs and forbidden verbs; prompt 1 ruled whether CONVENTIONS §4.4 got the table (`:16` phrased the destination as pending) — read that verdict; corroborated live-and-broken: `spec` Step 6 mandates five inverse verbs its own Phase-3 allowlist rejects | (a) NOT-LANDED → add the 9 pairs to §4.4, then clean; (b) VERIFIED-LANDED → clean outright; (c) fold into prompt 11's allowlist reconciliation; (d) hold pending the verb fix | (a)/(b) per prompt 1's verdict — never guess |
| `feedback_no_section_sign` (61 L) | never U+00A7, with the cleanup `sed`; `:37-38` names its single sanctioned home as *not* CONVENTIONS or any Brain doc — under R-1 the home it lives in survives, so the old homelessness dissolves | (a) KEEP-IN-LAYER; (b) `~/references/authoring-principles.md` under prompt 11's loader; (c) a lint/pre-commit check, prose deleted; (d) delete as cosmetic | (a) — changed from the pre-R-1 draft, which had to invent a home |
| `feedback_robustness_over_ease` (63 L) | *"always do the most robust thing, not the easiest"* — a global, non-lifecycle principle; the thinned `~/CLAUDE.md` still exists to point at it | (a) KEEP-IN-LAYER; (b) a line in thinned `~/CLAUDE.md` (prompt 11's arrangement); (c) `authoring-principles.md`; (d) restate in each lifecycle skill | (a) — same change, same reason |
| `feedback_per_turn_self_check` (62 L) | end-of-turn backstop for unauthorized sub-decisions; self-declares redundancy at `:3`, `:44-53` against four named rules | (a) delete once the four are LANDED at their destinations; (b) KEEP-IN-LAYER, shortened; (c) a standing line in `plan`'s body; (d) keep only the unauthorized-sub-decision clause | (a), conditional on the register |
| `feedback_orchestrate_notes_silently` (52 L) | never narrate note curation to the user — the silence half of the curation-frequency question prompt 6 answered; read that answer first; this ruling must not contradict it | (a) fold into `curate`'s frequency rule as its silence half; (b) delete — prompt 6's answer already covers it; (c) `brain/agents/orchestrator.md`; (d) KEEP-IN-LAYER | (a), or (b) if already covered |
| `feedback_stop_the_line_on_drift` (53 L) | any drift, by anyone, any time → stop the line; the most-referenced rule in the layer (16 citing memories + `MEMORY.md`); enforcement is dead (`feedback_drift_detector_hook:24` de-registered 2026-06-30; `:3` — judgment-only); carries EH-11's two hatches (`:37-38`), the second of which — *"Amend the spec to match drift"* — makes drift retroactively correct | (a) a real gate in `build` + `review` bodies, P4-12-backed, both hatches deleted; (b) gate **plus** build the enforcing hook — interacts with R-20's staged path and the brain hook post-mortem; (c) KEEP-IN-LAYER as aspiration, hatches intact; (d) delete | (a) |
| `feedback_vitest_test_keyword` (25 L) | `test()` never `it()`, incl. `.skip/.only/.each/.todo`, per-project caveat, perl rewrite | (a) a bun-ts-engineer standard; (b) the Labs project graph (Labs = `/Users/peter.kloss/Labs`; its former neighbour `feedback_labs_scripts_pure_bun` was owner-deleted — the pure-Bun directive lives on as R-21); (c) an ESLint rule, prose deleted; (d) KEEP-IN-LAYER | (a) |

**W-3 — at the `docs/**` step, only if a referenced memory actually left the layer.** Do not manufacture this question if every referenced memory stayed. Three live wikilinks sit in historical session notes: `SESSION-2026-05-20_05:132` (`feedback_per_task_build_qa_cycle`), `:133` (`feedback_workflow_phase_rigor_at_every_layer`), and `SESSION-2026-05-23_02:888` (`feedback_resume_paused_session_not_new` — inside a forward-looking Resume-protocol block, the one a future reader is most likely to follow). Plain question: these notes are audit records; when a memory they link to is deleted, the link points at nothing. Options: (a) de-bracket to plain text — stops the dangle, changes no assertion; (b) leave the text, add one dated `## Clarifications` line per file; (c) rewrite to point at the new destinations; (d) leave entirely. Assistant recommendation: (a) for wikilinks whose targets left, (b) for the bare prose citations; links to KEEP-IN-LAYER survivors need nothing. Context worth showing: `merge-resolver/SKILL.md:93` (*"Session files from main are immutable audit records"*) literally governs git-merge handling of `.agents/sessions/*.json` (`:108`) — extending it to these notes is a deliberate analogy, not an existing rule; do not overstate it.

**W-4 — at close: the holding folder.** `~/.claude/memory_deleted_2026-07-27/` still holds the 21 moved files — the walkthrough ran in Cowork, which cannot `rm`, and everything there is trivially restorable until emptied (`OWNER-RULED-DELETE.md:7`). Offer its final removal once, at the end: (a) remove now, through the rm gate, every file named; (b) keep it as a holding pen a while longer; (c) Peter empties it himself. Assistant recommendation: (a) — the review it hedged against is complete by then. A declined or blocked removal is recorded as deferred.

## Execution steps

1. **Read first (P4-10):** `OWNER-RULED-DELETE.md`; all 98 root items plus an enumeration of the ~33 subdirectories; the closing reports of prompts 1 and 4–11 — specifically prompt 11's Q19 outcome, router/loader results and post-edit CONVENTIONS line numbers, prompt 10's `/compact` evidence and SESSION-PROTOCOL triage, prompt 6's curation-frequency answer, prompt 1's VERIFIED-LANDED verdicts, prompt 4's authoring-style append; the surviving home specs; the ten `skills/docs/` files with `feedback_` hits. Say what was read.
2. **Delta-sweep [DECIDED — R-13/R-28]:** enumerate root files newer than prompt 1's frozen inventory, un-indexed root files (`feedback_subagents_use_opus.md` is the known one), and the ~33 per-project subdirectories. Route each by the lifecycle-ownership rule and fold it into the classification. The per-project subdirectories are the per-project memory feature working as designed — expect mostly KEEP-IN-LAYER; report the routing, don't ask. [DEFAULT]
3. **Build the register and classification; deliver the Step-0 map; raise W-1.** Wait.
4. **Run the review** per W-1's answer, raising W-2's nine at their items. Every disposition is Peter's ruling, recorded verbatim.
5. **Apply dispositions.** Migrations are destination-first re-authored (R-26 — the memory is an input, "verbatim" only as a reviewed exception) and read back at the destination; then inbound references are re-pointed or removed; only then the deletion, through the rm gate, file named. KEEP-IN-LAYER: index line accurate, nothing else. OBSOLETE: condition satisfied and zero-loss argument recorded, then the gate.
6. **`feedback_claude_code_markdown_first.md` → MIGRATED [DECIDED — R-27]:** read the end of `create-skill/references/authoring-style.md` and confirm prompt 4's append is present (markdown-first script output; ANSI only behind a `Bun.stdout.isTTY` guard; Ink/chalk/boxen disqualified). Present → delete through the gate and remove its index line. Absent → stop and report; the memory stays.
7. **Rehydration:** re-confirm prompt 10's dated `/compact` evidence and the `MEMORY.md`-heading dependency cut before that memory moves; the phase-X pointers are verify-only (R-28).
8. **`docs/**` sweep** per W-3's answer — Brain MCP for everything resolving under `docs/**`, `Edit` for anything outside it, tool stated per file. The three bare citations in `PLAN-002-datatable-feature-implementation.md` (`:132` ×2, `:263`): resolve that file's real path first and route by artifact.
9. **Home-spec executions** per prompt 11's rulings, with the preconditions above stated back as satisfied first: extraction applied; both `SESSION-PROTOCOL.md` copies in one operation; R-20 debris removals reported.
10. **Final sweeps, closing report, W-4.**
   - **Residue sweep:** every surviving `feedback_` string in the home specs, `skills/**` and `shared/composition/src/**` either resolves to a live layer file or sits on an enumerated allowlist (the three CONVENTIONS illustrations; W-3-sanctioned `docs/**` residue; anything prompt 11's report sanctions). Reconcile hit-by-hit — a bare count is not an answer; an unaccounted hit is a stop. For `docs/**`, grep is itself a forbidden pattern (`CONVENTIONS:604`): use the sanctioned audit mechanism prompt 11 landed; if it landed none, that is a stop; if it is Brain `search`, state plainly that indexed search is weaker evidence than a byte-level grep.
   - **Wikilink identity check:** `grep -rn "\[\[feedback_" <wherever the surviving specs live>` returns **exactly the three illustrative lines, verified by identity, not count**. Zero means someone deleted the rule's own examples — a failure, not a pass. More means dangling sites remain.
   - **Spot checks** return new-destination content.
   - **Closing report:** every surviving root file → its bucket and outcome; every deleted file → its ruling plus destination evidence or zero-loss argument; every W answer verbatim; every count re-derived with its command; and the plain statement that the layer, `~/CLAUDE.md`, `~/AGENTS.md` and `MEMORY.md` survive, still served, with generation settings untouched (R-13).

## Boundary

- `settings.json` untouched — `autoMemoryEnabled`, `autoMemoryDirectory`, `autoMemoryAgentsEnabled` and every generation/loading setting stay exactly as they are [DECIDED — R-13: regrowth is routed by the narrowed instruction clauses plus this delta-sweep, not amputated]. The closing report says so in plain words.
- `~/CLAUDE.md`, `~/AGENTS.md`, `MEMORY.md` and `~/.claude/memory/` are not deleted, not emptied, not renamed [DECIDED — R-1].
- Prompt 11's rulings (Q19, router, loader, home-spec fates) execute here where assigned; they are not re-opened.
- This prompt deletes and verifies; it authors no skills. Editing a skill body here signals an earlier prompt's gap — say so, and P4-4 (cold evaluation, ranked findings, nothing applied unapproved) applies.

## DECIDED — do not re-litigate

| Decision | Source |
|---|---|
| The 21 deletions are executed; consume the record; never re-delete, re-migrate or re-verify them | R-27/R-28; `OWNER-RULED-DELETE.md` |
| Terminal state: thinned layer + zero dangling references + accurate index; layer, `~/CLAUDE.md`, `~/AGENTS.md` keep existing and being served | R-1, R-14 |
| The classification gains a KEEP-IN-LAYER bucket | R-14 |
| Delta-sweep covers the ~33 per-project subdirectories and un-indexed root files | R-13, R-28 |
| Generation/loading settings stay untouched | R-13 |
| Markdown-first memory: MIGRATED cleanup here, only after prompt 4's append verifies by read-back | R-27 (+ P4-9) |
| Peter rules every disposition; assistant classification is input; migration is destination-first re-authoring | R-26 |
| SESSION-PROTOCOL is superseded; both copies go in one operation | R-3; [DECIDED — forced by byte-identity, md5 above] |
| ai-agents-inherited fossils are debris to remove, not intent to restore | R-20 |
| Inbound references handled before every deletion | P4-9 + R-1 |
| Nothing deleted before its destination is live and verified; every deletion through the rm gate | P4-9 |
| Update cost is work, not an argument | D-19 |

## Git

Verify the branch first; one branch; one commit per disposition group, naming every file; unmerged, no push, no `--no-verify`, no AI attribution. Every deletion through the `Bash(rm:*)` gate with no workaround, and the report says so.

## Done means

- [ ] The Step-0 map — register plus classification — was delivered and approved before the first deletion; no reply was treated as a stop.
- [ ] **Every W item was raised at its marked moment, once, in plain language, and its answer is recorded verbatim in the report. No W item was decided silently, and none was asked twice.**
- [ ] None of the 21 was re-deleted, re-migrated or re-verified; register rows sourced from them read OWNER-DELETED citing `OWNER-RULED-DELETE.md`.
- [ ] Every register row reads LANDED (destination `file:line`, quoted text, grepped anchor) or OWNER-DELETED; the nine S1 rows verified individually; zero MISSING survived into the deletion phase.
- [ ] Every disposition was Peter's ruling under W-1's chosen process; nothing was bulk-classified silently (R-26); migrations were destination-first re-authored and read back before their source went.
- [ ] Every deleted file's inbound references were re-pointed or removed first; `MEMORY.md` ends accurate — a line per surviving root file, none for deleted ones, the un-indexed survivor reconciled; no router row points at a departed file.
- [ ] The delta-sweep enumerated and routed files newer than the frozen inventory, the ~33 per-project subdirectories, and un-indexed root files.
- [ ] `feedback_claude_code_markdown_first.md` was cleaned as MIGRATED only after prompt 4's append was read back — or the run stopped there and said so.
- [ ] Rehydration: prompt 10's `/compact` evidence re-confirmed and dated; the `MEMORY.md`-heading dependency confirmed cut; the phase-X pointers verified as already fixed.
- [ ] The `docs/**` sweep ran per W-3's answer, Brain MCP for `docs/**` artifacts, tool stated per file; the final `docs/**` audit used prompt 11's sanctioned mechanism, named in the report.
- [ ] The residue sweep reconciled hit-by-hit against the enumerated allowlist; the wikilink check returned exactly the three illustrative lines, verified by identity — zero is a failure, not a pass.
- [ ] The three spot checks returned content from the new destinations; no result depends on `~/.claude/memory/`.
- [ ] Home-spec executions followed prompt 11's rulings with preconditions stated back: extraction applied first; both `SESSION-PROTOCOL.md` copies in one operation; R-20 debris removals reported.
- [ ] `~/CLAUDE.md`, `~/AGENTS.md`, `MEMORY.md` and `~/.claude/memory/` all still exist and are still served; `settings.json` untouched; the report says so in plain words (R-1, R-13).
- [ ] Every deletion went through the `Bash(rm:*)` gate, files named, no glob, no `find -delete`, no `mv`-to-trash, no wrapper; blocked deletions recorded as deferred.
- [ ] Branch and commits per P4-7; no AI attribution anywhere.
- [ ] The closing report maps every surviving root file to its bucket and every deleted file to its ruling and evidence; every count re-derived at source with the command shown; where a figure in this prompt was wrong, the report says so.
