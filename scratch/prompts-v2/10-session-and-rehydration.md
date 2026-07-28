# Prompt 10 — One session definition, one rehydration path

_Run after prompts 1, 2, 5, 6 and 9 (prompt 9's writer ruling is an input here). Prompt 11 depends on what lands here; prompt 12 consumes the handoffs. Part of Peter's consolidation programme (11 active prompts — prompt 3 dissolved, R-28). The work lives in his `skills` plugin (`/Users/peter.kloss/Dev/ACMElabs/skills`), his `brain` plugin, and his home-spec markdown. Paste everything below into a fresh Claude Code conversation._

**Mission.** Install the session model Peter ratified (R-3..R-7) as the one canonical definition, at one home, with one path and filename; make `/plan continue` and post-compaction rehydration one real, exercised protocol; supersede the ~30 competing definitions; migrate the live session memories under R-1 — the layer is thinned, never eliminated. Attention budget: up to seven W rounds, most small (the heavy calls are already ruled), plus two blocking gates — the map, and the deletion-by-exercise gate.

---

**Execution contract (R-31): before doing anything else, read `scratch/prompts-v2/RUN-CONTRACT.md` — it sits beside this file — and run this entire prompt in its collaborative mode: granular, guided, opinions labeled, no assumptions. It overrides any "autonomous" framing below.**

## How to read this prompt — the provenance register

Every substantive statement below carries one of four tags. This is the contract that keeps Peter's decisions his, and the assistant's analysis labeled as analysis:

- **[DECIDED]** — Peter decided it, dated, in his own words where quotable. Do not re-litigate and do not re-ask.
- **[WONDERING]** — Peter's open questions. These ARE the interview: raise each at its marked moment via `AskUserQuestion`, exactly once, with the full relevant text shown. Attached recommendations are the assistant's, never his. Nothing in this register is pre-decided, however confident the recommendation sounds.
- **[FACT]** — measured repo or tool reality, with reproduction where it matters. Verify before relying on one; report mismatches as drift, not as license to improvise.
- **[DEFAULT]** — assistant design suggestions. Adopt or improve at runtime; deviations are *reported* with the measurement that justified them, not asked about.

If anything below reads as [DECIDED] but smells like an assumption, stop and surface it. That is a defect in this prompt, not a constraint on you.

Two sourcing corrections: the conversation ledger's PART 1 decisions are citable; its PART 2 findings are **not reliable** — corrected facts are restated inline here, never re-derive from F-numbers. And `allowed-tools` pre-approves, never restricts [FACT] — no claim that a missing grant breaks anything.

## The authority rule  [DECIDED 2026-07-27]

Split by subject:

- **The session model is Peter's, ruled R-3..R-7** (next section). The interview asks only what those rulings left open.
- **`create-skill` (user-level, `/Users/peter.kloss/.claude/skills/create-skill/`) is the authority for skill-authoring mechanics.** Every SKILL.md this prompt authors, renames or edits runs under its lifecycle, validators and gates — this prompt does not restate them. The two repo facts the skill cannot know: prompt 1 took the week-0 snapshot (point evals at it; never re-baseline), and a rename or `description` change is the likeliest benchmark regression — re-run on exactly those skills.

## Standing rules (programme-wide)

- **P4-1 — Every question goes through `AskUserQuestion`.** Max **4 authored options**; "Other" is auto-appended, so never author one, and say in the question text that Peter can type his own answer there. Questions are written in **plain language** — no internal jargon, no file:line in the question body unless Peter is ruling on that exact text; what breaks and what it costs, stated simply. (ASK-STANDARD lands in prompt 7's interview [R-29]; until then, this paragraph is the standard.)
- **P4-2 — One decision per question, one question in flight.** A multiselect decomposing a single decision is not a bundle.
- **P4-3 — Author the moment it locks.** Never defer to a later phase or turn.
- **P4-4 — Independent evaluation mandate on every skill touched (D-2).** Cold read, ranked findings each with a recommended action and one-line rationale; apply nothing without approval; honest short list beats padding.
- **P4-5 — Full `create-skill` lifecycle for every skill touched, under the skill's own procedure** (authority rule above).
- **P4-6 — Binary tool rule.** `docs/**` → Brain MCP; everything else (skill bodies, references, config, `.ts`, home specs, memory files) → `Read`/`Edit`/`Write`, on which Brain MCP is forbidden. Normative source: `KNOWLEDGE-GRAPH-CONVENTIONS.md:184-186`, `:202`. Nearly everything this prompt writes is non-graph.
- **P4-7 — Git.** Verify the branch first. One branch for the whole prompt. Coherent commits (≤5 files or one logical change, except where this prompt mandates a wider single commit). Leave unmerged. Do not push. No `--no-verify`, no force-push. No indication of AI contribution in any commit message.
- **P4-8 — Update cost is work, not an argument (D-19).** *"I wanna do something because it's the right decision to make."*
- **P4-9 — Nothing deleted in bulk; nothing deleted before its destination is live and verified** (read-back or exercise, not assertion). `Bash(rm:*)` is in the permissions `ask` list (`settings.json:158`): every deletion raises a prompt even when approved in principle — that is Peter's last look. Never route around it: no `find -delete`, no substituted `git rm`, no removal wrapper, no batching to reduce prompts. **This is the load-bearing rule of this prompt** — re-read it before the retirement and deletion steps.
- **P4-10 — Read before designing, and say what was read. Do not sample.** Cited line numbers may drift a line or two against the working copy — confirm each before acting on it; report a non-resolving citation as drift, never snap silently to the nearest match.
- **P4-11 — Precedence:** skills plugin > brain plugin > home specs > auto-memories.
- **P4-12 — Fail closed; never "document a rationale and proceed."** A class, not a tally. Counter-models to imitate: `build/references/exit-gates.md:3` (*"'I'll fix in review' is NOT acceptable rationale"*) and `brain/agents/orchestrator.md:1890-1892` (*"DO NOT claim completion"*).
- **P4-13 — Do not build what already ships.** Wire, don't rebuild: `part.completing_session` (populated by `set-part-done.ts:155`, rendered at `renderers/plan-note.ts:137`, followed by nothing), the shipped SESSION Zod schema, and `new_session_log_json.ts`'s guards (facts below).
- **P4-14 — No bare mechanical-enforcement claims.** The precise SESSION statement [FACT]: a SESSION Zod schema exists (`shared/composition/src/schemas/session-note.ts` — *"append-only event ledger. 10 typed event variants"*); `src/validators/` exports ten `validate*Claim` functions, **none for SESSION**, and none of the ten has a live runtime caller (`ANALYSIS-005:206`). Write exactly that — never "schema-validated" as a bare claim, never "no schema exists". If Peter wants a SESSION claim validator, surface it as a P4-4 finding; do not build it uninstructed.
- **R-21 — Pure Bun, program-wide.** Any script or hook authored here is Bun TS. No Python, no Node.

---

## The session model  [DECIDED 2026-07-27 — Peter's rulings R-3..R-7; do not re-litigate]

- **R-3 — Session invariants replace the global single-active-session rule.** A session binds to exactly one plan; at most one active session per plan; at most one active **owning** session per part — the load-bearing clause that makes team-mode legal later. SESSION-PROTOCOL's global constraint dies with that file's supersession. (`owning_session` schema fields are prompt 5's.)
- **R-4 — Session frontmatter carries the filterable bindings**: `started`, `ended`, `branch`, `plan` (permalink), `parts` (list), plus existing `status`/`type`/`tags`. Frontmatter for filtering, Relations for traversal, and a validator checks they agree. Explicit date keys are what make date filtering real (`after_date` filters on index-modified time). Schema keys live in prompt 5's composition work; the **note model** is authored here. `status` draws from the shared atom set's session family — IN_PROGRESS/PAUSED/DONE — as a subset, never a redefinition (R-2).
- **R-5 — Session sections: frontmatter + Events + Observations + Relations. NOTHING else.** `## Scope` folds into frontmatter + Event 01; optional `## State` dies — a pause is an event. Append-only after creation except frontmatter `status`/`ended`. Peter's rationale: every other section in the corpus was plan-state duplication or protocol theater with no validator.
- **R-6 — Cadence is immediate, per-event, same turn — enforced by a typed event enum.** Candidate types, decided as listed: SESSION_OPEN / PAUSE / RESUME / CLOSE, PART_TRANSITION, DISPATCH, ARTIFACT_WRITE, DECISION_LOCKED, GATE_RESULT, USER_RULING (Q+A verbatim), COMMIT, HALT, CURATION_OP, CORRECTION. **Additions are a confirm-only sub-question (W-6).** Ordinal `## Event NN` headings; wall-clock timestamp from `date` in the body. "Every 5 turns / at milestones" dies with the orchestrator's rival definition. Hook enforcement is **available** — `invoke_session_log_guard.ts` exists in templates [FACT] — but whether hooks perform or merely gate follows prompt 9's writer ruling. The event schema's home is the composition library (prompt 5); reconcile the shipped schema's 10 variants against this candidate list there and report deltas.
- **R-7 — Session length is sitting-based, never phase-bound.** Pause/resume allowed; **resume-don't-recreate stands** (ratifying `feedback_resume_paused_session_not_new`). Parts bind sessions, not the reverse; research⇄decisions is naturally multi-session. Past ~N events, close and open a successor — **N is deliberately unset: R-7 says "N to be set in prompt 10's interview" → W-5.** `decompose` is the repair for existing monsters; the 316-event fond note is the cautionary example [FACT].

Riders on the model:

- **R-13.** Prompt 1 narrowed the auto-memory regrowth clauses with a lifecycle-ownership routing rule. `feedback_session_protocol` is **alive in the layer** and migrates in this prompt — the narrowed clause must survive that migration intact.
- **R-20.** Brain drew on an external system (`~/Dev/ai-agents` — not Peter's). Its phantom `.agents/SESSION-PROTOCOL.md` citations, `.agents/sessions/` paths and handoff-file references are **inherited debris: remove, don't restore.**
- **Dependencies, not questions:** who writes events (R-17) and whether QA-denial events join the enum (R-18) **consume prompt 9's writer ruling** — key the event-writer column and any DENIAL type to that outcome; R-19/R-22's return templates map onto this enum informationally.

Already settled from the old interview — do not re-ask: the `## Tasks`-in-session fight (R-5: nothing else); `/end`'s frontmatter state markers (R-4 fixes the key set; verdicts/pre-flights become GATE_RESULT events, commits COMMIT events per R-6); `## Scope` and `## State` (R-5); the "every 5 turns" rival cadence (R-6); which note when parts and sessions span each other (R-3/R-4/R-7: a session lists its parts; one active owning session per part); resume-vs-recreate (R-7).

---

## Facts on the ground  [FACT]

**The census to verify.** ~30 distinct session-note definitions at 30+ sites across four surfaces — home specs/docs (11 sites, incl. `~/SESSION-PROTOCOL.md:427-549`, `~/NOTE-TEMPLATES.md:43, 918-1115`, `~/CLAUDE.md:129, :133`, `documentation/workflows.html:220-222`), brain plugin (12), `plan` skill (2: `plan/SKILL.md:130-146`, `references/two-step-edit-pattern.md`), auto-memories (7) — on 3 filesystem roots with 5 filename templates. `~/SESSION-PROTOCOL.md` and `brain/rules/SESSION-PROTOCOL.md` are **byte-identical** (md5 `b6432f02ffd059b023431c5e3e269ea5`, 657 lines each, both self-declaring "Canonical Source of Truth" at `:3`) — one definition counted twice; deleting one is a no-op, both or neither. That file self-contradicts on the filename four lines apart (`:429` vs `:433`) and is the corpus's heaviest normative file: 103 `MUST` (15 of them `MUST NOT`), 26 `SHOULD`, 6 case-sensitive `BLOCKING`. Its MUSTs get triaged, not assumed stale.

**The brain twelve**, so nothing is hunted: the rules copy above; the memory twins (next paragraph); `orchestrator.md:306-314` (the rival *"At milestones (or every 5 turns…)"* template — trace fields live separately at `:258-280`, `:273` naming `session.traceId`/`session.parentSessionId`); `pr-comment-responder.md:244-259` (bash heredoc, literal `XX` filename at `:246`, no frontmatter); `import-memories.md:154` (rename table); `session-init/scripts/new_session_log.ts:108-172` and `new_session_log_json.ts:122-160` (hardcoded templates — `session-init`'s claim to read SESSION-PROTOCOL is unimplemented; `newPopulatedSessionLog` at `lib/template_helpers.ts:58` is dead code with only test callers); `session-log-fixer/references/template-sections.md:9-43`; `session-init/references/validation-patterns.md:15, 25, 182, 208, 216` (the doubled `.agents/sessions/.agents/sessions/` path, five times); `memory/references/troubleshooting.md:307-326`; `merge-resolver/SKILL.md:244-253`.

**The memory twins.** `brain/skills/memory/SKILL.md:572-623` and `brain/agents/memory.md:703-755` are near-identical `## Session Log Creation` blocks (52/53 lines) with **no `## Observations`** — contradicting the same skill's own checklist at `:326`. The `memory` skill is the only skill any brain agent preloads and it is preloaded into **22 of 27 agents**: the stale template outranks any new definition simply by always being in context. Both go, or neither, **in the same commit as the canonical definition landing**. Check which state the working copy is in first: the snapshot was pre-prompt-6 (`wc -l` = 723; `:652` = `## Tier 2`); post-prompt-6 the file is ~653 lines, the `[FUTURE]` block gone, the twin range unchanged. Target net-negative against the plugin's 500-line lint (`taste-lints/SKILL.md:68`).

**Rehydration in `plan` is net-new, not a reconciliation.** Case-insensitive search of `skills/plan/` for `rehydrat|resume|prior session|previous session|read the session` → five hits, none a protocol (`plan/SKILL.md:16`, `:258`; `references/scope-evaluation-and-split.md:48, 52, 58`). Both continue pipelines (`plan/SKILL.md:174-180`; `references/auto-routing.md:5-15`) run read-PLAN → validate tier → validate branch → find-next-ready → set IN_PROGRESS → two-step edit → dispatch; **no session note is ever read**. The one asset is `part.completing_session` (P4-13) — the pointer exists and nothing follows it. D-17 is aspirational, not descriptive; budget accordingly.

**Four rehydration checklists, none cross-referencing:** `feedback_post_compaction_rehydration_protocol.md:35-107` (the 8-step; the only self-contained one); `feedback_session_protocol.md:27-41` (3-vector + mandatory recap); `:263-269` (5-step keyed on the `## Tasks` table — a key R-5 just removed); `feedback_canonical_state_and_rollups.md:20` (declared moved to CONVENTIONS, never re-verified). The documentation side is one line — `documentation/workflows.html:344-346`: post-compaction rehydration is **manual and user-initiated** today.

**The trigger constraint.** A skill body enters context once and is not re-read; `/compact` does not re-inject it — a post-compaction protocol **cannot self-fire from a skill body**. Whatever survives compaction is (i) a file surviving context instructs a `Read` of, (ii) content the harness re-injects every turn, or (iii) a hook. The surviving trigger today is `~/CLAUDE.md:19` — a compressed restatement of all eight steps, deliberately placed in always-loaded context, detail delegated to the memory file.

**Paths and filenames.** Roots: `sessions/` (`~/CLAUDE.md:129`, SESSION-PROTOCOL `:429`, both twins); `docs/sessions/` (`end/SKILL.md`, composition library, `~/CLAUDE.md:133`); `.agents/sessions/` (`~/CLAUDE.md:133`, `pr-comment-responder.md:246` — R-20 debris). Five filename templates across those sites; **`end` + the composition library are the one camp with executable code behind it**: `docs/sessions/SESSION-YYYY-MM-DD_NN-*`.

**`/end` writes ten state markers into SESSION frontmatter** (`end/references/end-checklist.md:250-262`: `dod_verified`, `review_passed`, `preflight_check1..5_passed`, `step4a_commit`, `step4d_done`, `step4f_pr`; `title`/`status` are legitimate). `end/SKILL.md:47-54` routes verdict and pre-flight results, `:53` sets SESSION status → DONE, `:416-418` asserts IN_PROGRESS → DONE/PAUSED never abandoned. Prompt 2 was forbidden from touching these lines; they are this prompt's. Also in `end`: Check 3 is disabled in the body (`:20-24`; dated rationale at `:182-186`, 2026-05-19) while `:3`'s description still advertises five checks.

**Malformed tool ids.** `mcp__plugin____brain__*` (four underscores, empty plugin segment) occurs **35 times across 8 files**; repro `grep -rn "mcp__plugin____brain" brain/ | wc -l` → 35 before, 0 after. Per file: `session-log-fixer/references/template-sections.md` 2 (`:14`, `:115` — **fix first**: `:3` orders agents to copy these templates exactly, so the defect propagates into every repaired note); `reflect/SKILL.md` 6 (`:109, :113, :262, :266, :483, :486` — the learning-capture persistence path; **prompt 3 was dissolved (R-28) and never touched this file: these fixes are solely this prompt's.** The reflect protocol itself ships at `~/REFLECT-PROTOCOL.md`, prompt 11's to verify; `feedback_inline_reflect_capture` was deleted 2026-07-27 — nothing here reads or migrates it); `repo-encoder/references/phases.md` 9, `templates.md` 6, `validation.md` 6; `code-architecture/SKILL.md` 3 (`:128, :141, :204`); `threat-modeling/SKILL.md` 2 (`:400, :406`); `repo-encoder/SKILL.md` 1 (`:57`).

**R-20 debris sites.** `.agents/SESSION-PROTOCOL.md` cited with the target nonexistent: `session-init/SKILL.md:147, 388`; `session-init/references/template-extraction.md:9, 20, 40` (its `:10` extraction range `494-612` is also wrong — the template heading is at `:427` of the real file); `session-end/SKILL.md:351`; `session-log-fixer/SKILL.md:186`; `session-log-fixer/references/template-sections.md:162`. Two bare, ambiguous references besides: `merge-resolver/SKILL.md:219, 259` — disambiguate, don't count among the phantoms. Plus the doubled `.agents/sessions/` path (five sites above) and the `.agents/HANDOFF.md` read at `template-sections.md:15`. R-20 puts the phantom-citation family at nine; the enumeration above is what a grep must confirm — the disposition (remove, don't restore) is identical either way.

**Brain-side content preserved regardless of W-7's answer** (extract before any retirement; destinations follow the definition):

| Keep | Where | Why / disposition |
|---|---|---|
| State-sync hooks | `session-end/SKILL.md:139-168` | Live integration; prompt 9 depends on it |
| Jira content-push hook | `session-end/SKILL.md:170-179` | Separate from state-sync; cite separately |
| Evidence vocabulary + placeholder blacklist | `session-log-fixer/references/template-sections.md:49-61`; `references/common-fixes.md:92-95` | The corpus's only anti-fake-evidence rule; under R-5 it re-homes as payload rules for GATE_RESULT/COMMIT events [DEFAULT] |
| `### Work Blocked Until` | `template-sections.md:137-139` | Only blocking-state construct; a section cannot survive R-5 — re-express as HALT/GATE_RESULT event payload [DEFAULT], and say so |
| `maxExisting + 10` ceiling | `new_session_log_json.ts:113-118` | Only numbering-sanity guard; the mechanical answer to the literal-`XX` collision |
| `--trace-id` / `--parent-session-id` receiver | `new_session_log_json.ts:32-33` (writes `:130-131`); producer `orchestrator.md:273` | The loop is open at the template end — R-4 frontmatter is its natural home [DEFAULT]; wire or leave, never delete |
| Investigation-only allowlist | `brain/skills/session/SKILL.md:248-258` | The docs-only QA-skip eligibility test, test-validated (`:258`); its four `.agents/*` path prefixes are R-20 debris — re-point to the canonical root with tests updated [DEFAULT] |
| Post-merge immutability | `merge-resolver/SKILL.md:93, :97` | *"Session files from main are immutable audit records"* — bounds this prompt: the new shape applies to new notes; never rewrite historical session notes, and the definition says so |

---

## Step 0 — The map gate  [BLOCKING GATE]

Before any edit lands, verify the census above and deliver four tables — one row per site with file, line and the actual text — then stop:

1. **SESSION shape** — every place the note's shape is defined, all four surfaces.
2. **Rehydration** — every post-compaction or resume procedure.
3. **Path + filename** — every root and every template, with the asserting site.
4. **`/end` state markers** — every field written into SESSION frontmatter and every rule governing them.

Wait for Peter's go. No reply is a stop, not an implied yes. Where the map contradicts this prompt's census, the map wins — say where the prompt was wrong.

---

## The interview — things Peter is wondering about  [WONDERING]

Peter's open questions, asked **once, at the natural moment, by you** — not pre-decided here and not re-interviewed anywhere else. One decision in flight (P4-2), plain language (P4-1), full current text shown when he rules on existing text, every answer recorded verbatim in the report.

**W-1 — before authoring anything: where the one definition lives.** (D-17 leaves this explicitly open: where the session definition should ultimately live — *"Owner explicitly unsure."*) Options: (a) a new `session` skill in the skills plugin, invoked by `plan`; (b) inside `plan` as body + references; (c) definition in a `session` skill, rehydration stays in `plan`; (d) leave it in brain and point at it — include for honesty; it contradicts P4-11 and D-17 tomorrow. Decision facts: ~812 raw lines of source material across seven files will not fit `plan`'s 289-line spine; brain's `session` name is free (that skill is a mis-named QA-skip checker — `brain/skills/session/SKILL.md:3`, `agents: [qa]` at `:5`, redirects creation at `:42-46`); a separate skill is loadable by brain specialists that are not running the lifecycle. Assistant recommendation: (a).

**W-2 — at the path step: one root, one filename.** (Carried from the original interview; no ruling answers it.) Options: (a) `docs/sessions/SESSION-YYYY-MM-DD_NN-{slug}.md` — the only camp with executable code behind it; (b) `sessions/`; (c) keep per-project variance. Assistant recommendation: (a). Rider, same round: `brain/agents/import-memories.md:154` hardcodes the old rename mapping — if the canonical name changes and that line does not, the agent renames correct files back into the old scheme. Patch the line or retire the agent; fact for the rider: `import-memories` is the corpus's only merge/split engine (`:299-306` real thresholds; `merged_from:` provenance at `:513`; conflict table `:711-716`). Assistant recommendation: patch the line, do not retire.

**W-3 — while authoring the rehydration contract: is SS-2 the contract, and how hard does it fail?** (Ledger open question #27.) Show SS-2's recovery test verbatim (migration register below) and ask: is this the acceptance contract; does rehydration walk back through prior session notes until the test passes; is a missing or too-thin note a HALT or a best-effort continue? Assistant recommendation: contract yes; walk back until it passes; missing/thin = HALT — P4-12 applied to the highest-consequence path in the system.

**W-4 — before wiring rehydration: one protocol or two, and where the post-compaction trigger lives.** (Ledger open question #20.) Put the trigger constraint in the question body in plain terms — Peter wants to answer the trigger question, not a protocol-count question dressed up as one. Options: (a) one protocol in a reference file, two entry points — `/plan continue` invokes it directly; post-compaction reaches it via a one-line trigger in always-loaded context naming the file to `Read`; (b) two protocols, separately maintained; (c) `/plan continue` only, post-compaction stays documented-manual per `workflows.html:344-346`; (d) hook-fired — `invoke_session_log_guard.ts` exists [FACT], but perform-vs-gate follows prompt 9's writer ruling, so (d) may become a handoff rather than land here. Assistant recommendation: (a). Whichever wins, the protocol itself states in one sentence what re-enters context after a compaction and why the protocol will be reached — if the honest answer is "the user has to ask", write that plainly.

**W-5 — while writing the size guidance: the number N.** R-7 rules the guideline's existence and defers exactly one value ("N to be set in prompt 10's interview"). Ask plainly: roughly how many events before a session should close and a successor open? Recommendation allowed and labeled as the assistant's: ~50 — an order of magnitude under the 316-event cautionary note, roughly one long sitting.

**W-6 — when the event enum lands: additions beyond R-6's candidate list. Confirm-only.** Mine the migrating material for event kinds the list lacks — SS-2b's backfill entry, EH-16's deferral and discharge, SS-65's 7-row trigger table, the shipped schema's 10 variants. If everything maps onto the candidate types, report the mapping and ask nothing; if additions are needed, one confirm round listing them. (A QA-denial type is not this round's to add — R-18 consumes prompt 9's outcome.)

**W-7 — before any brain-side retirement, rename or deletion: the scope of the brain edits.** (Ledger open question #17; R-23 — Peter ruled brain edits *"light and specific, never wholesale"* and flagged exactly these retirements for re-measure.) The moves as originally designed: delete both SESSION-PROTOCOL copies; delete both memory-twin blocks; delete the rival orchestrator and pr-comment-responder templates; rename brain's `session` → `qa-eligibility`; retire `session-init` and `session-log-fixer` after extraction; keep `session-end`'s hooks. Options: (a) full retirement as designed; (b) targeted edit + pointer to the new canonical home — rival blocks emptied to a pointer, skills kept as thin shims; (c) defer the brain side to prompts 11/12, land only the skills-plugin side now. Assistant recommendation: (b) for agent files and the session skills, (a) for the SESSION-PROTOCOL pair alone — it is superseded wholesale by R-3..R-7 and byte-identical (both-or-neither). Rider, same scope: **EH-31** — wherever the rename lands, the docs-only QA skip is defined against `qa-eligibility`'s allowlist and nothing else; a hatch with one eligibility test and five prose restatements is five different hatches.

---

## The migration register — sole-source content that must survive  [FACT]

Verified sole-source: `rehydrat` and this vocabulary return zero matches across the brain plugin and `~/SESSION-PROTOCOL.md`; no skill body backfills any of it. All of it is auto-memory content, unratified by default (R-26): migrate destination-first — the memory is input, never the artifact — recorded-not-ratified where policy-shaped; the load-bearing items are ratified through W-3/W-6 or already ruled.

| ID | Source | Disposition |
|---|---|---|
| SS-2 | `feedback_session_protocol.md:404-408` | The recovery test, verbatim: *"a fresh Claude Code instance reading the IN_PROGRESS session note, following every inline reference, reading the plan for current state, reading in-progress task notes, and being fully caught up — without needing prose summaries anywhere."* Proposed contract — W-3 rules. |
| SS-2a | `:312-314` | The 5-minute update bound — **superseded by R-6's stricter same-turn cadence**; record, don't carry. |
| SS-2b | `:380-390` | Backfill protocol, incl. logging the backfill itself as an entry and *"ALWAYS worse than creating at session start"* — carries; enum mapping → W-6. |
| SS-2c | `feedback_session_note_canonical_holistic_audit.md:18-26, 52-88` | MUTATE-vs-APPEND discipline (*"events POINT AT state but never EMBED state"*), the 11-item audit + its bash block — carries, simplified to R-5's four sections. |
| SS-2d | `:38-44` | The seven Mermaid dep-graph rules (header `:36-37`; the `%%{init:}%%` row at `:43` is the one that makes Peter's diagrams look like each other; keep the failure-mode column — each failure is a real pushback of his). The graph itself is plan-side under R-5 — the rules travel with the graph, not the session [DEFAULT]. |
| SS-61 | `feedback_resume_paused_session_not_new.md:10-16` | **Ratified by R-7** (resume-don't-recreate); `:16` hooks `/plan` continue. |
| SS-62 | `feedback_session_event_append_placement.md:11-15` | `insert_before_section` on `## Observations`, never `append`; no wikilinks in prose bullets (the relation parser rejects them). Carries. |
| SS-63 | `feedback_session_note_commit_per_update.md:9, 28-40` | Commit-per-update and its message format → COMMIT events (R-6); drop the `ai-workflows`-only scoping at `:60` — the memory itself frames it as provisional. |
| SS-64 | `feedback_session_note_full_hygiene_at_all_times.md:18-28` | The nine always-current sections — **dies under R-5**; record the drop per section, not silently. |
| EH-16 | `:61-64` | The emergency deferral hatch — carried [DEFAULT, R-26-flagged] under three conditions: the expiry welded to the permission in the same sentence (*"catchup MUST happen in the very next turn after the emergency stabilizes"*); the trigger class stays narrow (rate-limit recovery, agent failures — never "when busy"); deferral and discharge are both Events, so an unpointable catchup turn means the hatch was abused. `:64`'s single-event scoping clarification rides along. |
| SS-65 | `feedback_session_note_immediate_event_writes.md:11-26` | Never save up; the 7-row trigger table — subsumed by R-6; mine it for W-6. |
| SS-66 | `feedback_session_protocol.md:43-287` | The T-NN three-table Tasks registry. **No surviving home**: R-5 bans session Tasks sections; R-11 bans a plan-level task tier (tasks stay artifact-level, plans show derived state). Record the drop explicitly — T-NN stable IDs, mirror reconciliation `:261-269` — as an R-26 flag in the report, never a silent loss. |
| SS-67 | `:241-249` | Wall-clock effort tiers — a third incompatible effort scale in the corpus. Whatever survives, **the fact that three exist survives with it**; do not silently pick one. |

---

## Execution steps

1. **Map gate** (Step 0), then W-1 and W-2.
2. **Author the one definition** at the W-1 home, in the R-3..R-7 shape, carrying the migration register and the preserved brain-side content per their dispositions. Same-commit rule: `plan/SKILL.md:130-146` is amended to match (Scope/optional-State wording and the forbidden list update to R-5's four-sections form) — the corpus never disagrees with itself for even one commit. The event-writer column and any DENIAL type consume prompt 9's writer ruling. W-3 and W-6 fire during this step. Any tooling authored (enum checks; the R-4 frontmatter/Relations agreement validator) is pure Bun (R-21) and lives where prompt 5 put the schema. State the P4-14 SESSION-validation position inside the definition, as a known gap, not a claim.
3. **Rehydration.** Reconcile the four checklists into one at the W-4 home, listing every discarded requirement with its source line. Wire `/plan continue` to follow `part.completing_session` (P4-13 — make something follow the pointer). Rewrite the 8-step protocol's reads against destinations, not the memory layer's index: the layer survives thinned (R-1) and keeps being served, but lifecycle-owned session/rehydration content is migrating out, and `~/SESSION-PROTOCOL.md` dies here — so the Step-1 8-file sweep is rewritten against what will exist, with home-spec fates prompt 11 owns written against the *role* ("the knowledge-graph authoring spec"), path bound later. Verify, don't redo: `feedback_post_compaction_rehydration_protocol` is **alive**, and its two stale phase-X pointers were already removed 2026-07-27 (`OWNER-RULED-DELETE.md`).
4. **The exercise gate — before any Step 6 deletion.** Run a real `/compact` and prove the new path reconstructs state: pick a real PLAN with a DONE part and populated `completing_session`; drive context to a meaningful compaction; `/compact`; **cold test first** — ask for continuation naming no protocol, skill or file, and record whether rehydration is reached; then the explicit entry point, scored separately; score both against SS-2 verbatim; keep transcript evidence for both. **Cold-fail + explicit-pass is a trigger failure, not a pass** — fix the trigger and re-run (P4-12). If the environment cannot run the exercise (a delegated subagent usually cannot), halt and say so. **The expected default absent a passing exercise is that nothing deletes** — a run ending with the definition authored, the twins intact and the deletions handed back as pending is a successful run of this prompt.
5. **Reconcile `/end`** [DECIDED — R-4/R-5/R-6]: the ten markers leave frontmatter; review verdict and pre-flight results land as GATE_RESULT events, commits as COMMIT events; `title`/`status` stay; the R-4 keys land. Check 3 [DEFAULT]: correct the `:3` description to match the dated, reasoned disable rather than re-enabling; a `description` change — re-run the benchmark on `end` (authority rule).
6. **Brain side, per W-7's answer** — plus, regardless of that answer (defects, not retirements): 35 malformed tool ids → 0, `template-sections.md:14, 115` first; the R-20 phantom citations, doubled paths and handoff references removed; `merge-resolver/SKILL.md:219, 259` disambiguated. Deletions only after step 4 passed and only per W-7: each through the rm gate; **each range re-confirmed first and last line before deleting** (a range delete against a shifted file is this prompt's most destructive failure); the SESSION-PROTOCOL pair triaged (extract un-superseded MUSTs, record the extraction) and removed in one operation; the twins in the same commit as the definition; `orchestrator.md:306-314` taken whole — heading `:306`, fence `:308` and `:314` included; **not** `:310-313`, which would orphan the opening call and corrupt the file — with `:258-280` untouched; `pr-comment-responder.md:244-259` taken whole.
7. **Migrate the seven live session memories** per the register: `feedback_session_protocol` (the R-13 clause must survive — show it), `_session_note_immediate_event_writes`, `_session_note_full_hygiene_at_all_times`, `_session_note_canonical_holistic_audit`, `_session_event_append_placement`, `_session_note_commit_per_update`, `_resume_paused_session_not_new`. Verify by read-back; **sources stay on disk** — prompt 12 owns layer disposition (R-1). Close prompt 1's deferred TODO: `~/NOTE-TEMPLATES.md:920` (*"…pure pointer-ledger format per [[feedback_session_protocol]]"*) and `:1048` (*"see [[feedback_session_protocol]] 'Task persistence' for full spec"*) — repoint `:920` at the canonical home; `:1048`'s target dissolves under R-5/R-11, so point it at the superseding text and hand the surrounding session-template block (`:918-1115`) to prompt 11 as a listed item. Acceptance is scoped: `grep -n "\[\[feedback_session_protocol\]\]" ~/NOTE-TEMPLATES.md` → 0; the other 17 `[[feedback_*]]` home-spec sites (`KNOWLEDGE-GRAPH-CONVENTIONS.md` 5, `KNOWLEDGE-GRAPH-STRUCTURES.md` 8, `NOTE-TEMPLATES.md` 4) are a listed handoff for prompts 11/12, not this prompt's gate.
8. **Independent evaluation (P4-4)** on every skill touched: `plan`, `end`, the new home, `brain/skills/{session,session-init,session-end,session-log-fixer,merge-resolver,memory}`. Ranked findings, cold read; nothing applied unapproved.

---

## Boundary

- Composition `src/` is prompt 5's: consume its session schema and event-schema home; report deltas (the 10-variant vs candidate-list reconciliation), do not redesign beyond what W-6 confirms.
- Prompt 9 owns the writer ruling (R-17), the denial gate (R-18), the message templates (R-19/R-22) and hook staging (R-20's path); this prompt consumes those outcomes, never decides them.
- Home-spec fates beyond `~/SESSION-PROTOCOL.md` are prompt 11's; `~/REFLECT-PROTOCOL.md` verification is prompt 11's; layer disposition, KEEP-IN-LAYER and the `[[feedback_*]]` residue are prompt 12's.
- The 21 memories deleted 2026-07-27 are gone (`OWNER-RULED-DELETE.md`); nothing here cites, reads or migrates one.

## DECIDED — do not re-litigate

| Decision | Source |
|---|---|
| Session invariants: one plan per session; ≤1 active per plan; ≤1 active owning per part | R-3 |
| Frontmatter bindings; filter-vs-traversal split; agreement validator | R-4 |
| Four sections, nothing else; Scope → frontmatter + Event 01; State dies; append-only | R-5 |
| Immediate per-event same-turn cadence; typed enum with the candidate list as given | R-6 |
| Sitting-based length; pause/resume; parts bind sessions; `decompose` repairs monsters | R-7 |
| Session status atoms = subset of the shared set (IN_PROGRESS/PAUSED/DONE) | R-2 |
| The narrowed regrowth-routing clause survives the `feedback_session_protocol` migration | R-13 |
| ai-agents debris removed, never restored | R-20 |
| Pure Bun for anything authored | R-21 |
| Brain edits light and specific, never wholesale (shape ruled at W-7) | R-23 |
| Layer thinned, never eliminated; prompt 3 dissolved — `reflect/SKILL.md` fixes owned here | R-1 · R-28 |
| The skill wins over SESSION-PROTOCOL/brain/home specs/memories; rehydration is `plan`-driven | D-17 |
| Update cost is work, not an argument | D-19 |

## Git

Verify the branch first; one branch; coherent commits — the mandated wide ones only where written (twins + canonical definition; the SESSION-PROTOCOL pair; each `plan` amendment paired with the definition change it mirrors). Unmerged, no push, no `--no-verify`, no AI attribution. Every deletion through the `Bash(rm:*)` gate with no workaround — deletions especially — and the report says so.

## Done means

- [ ] Step 0's four tables delivered and answered **before any edit**; the census confirmed or corrected with file:line proof.
- [ ] **Every W item was raised at its marked moment, once, in plain language, and its answer is recorded verbatim in the report. No W item was decided silently, and none was asked twice.**
- [ ] The one definition exists at the W-1 home in the R-3..R-7 shape; `plan/SKILL.md:130-146` amended in the same commit; nothing surviving still asserts `## Scope`, `## State`, session Tasks tables, or "every 5 turns".
- [ ] Every migration-register row landed per its disposition; every dropped requirement listed with its source line; EH-16's expiry welded to its permission; SS-66's drop recorded as an R-26 flag; SS-67's three-scales fact survives; the R-13 clause survived the migration, shown.
- [ ] The P4-14 SESSION statement appears exactly as specified; "schema-validated" appears nowhere as a bare claim.
- [ ] One root and one filename applied everywhere per W-2; `import-memories.md:154` handled per the rider.
- [ ] Rehydration exists at the W-4 home, follows `part.completing_session`, and states its own trigger mechanism in one sentence — "the user has to ask" written plainly if that is the truth.
- [ ] The `/compact` exercise ran with cold and explicit results recorded separately against SS-2 verbatim — **or nothing was deleted and the pending deletions were handed back**, which is a successful outcome.
- [ ] The four checklists reconciled into one, discards listed; the 2026-07-27 phase-X pointer fix verified, not redone; the memory layer's non-lifecycle serving untouched (R-1).
- [ ] `/end` writes no forbidden markers; verdicts, pre-flights and commits are typed events; Check 3's description matches reality; `end`'s benchmark re-run.
- [ ] Brain side executed per W-7's verbatim answer; EH-31's skip defined against the renamed eligibility home only; every preserved-content row landed and read back; deletion ranges line-confirmed; `orchestrator.md:258-280` untouched.
- [ ] `grep -rn "mcp__plugin____brain" brain/ | wc -l` → 0 (from 35), `template-sections.md:14, 115` fixed first; R-20 phantoms, doubled paths and handoff refs gone; `merge-resolver:219, 259` disambiguated.
- [ ] `grep -n "\[\[feedback_session_protocol\]\]" ~/NOTE-TEMPLATES.md` → 0; the 17 out-of-scope `[[feedback_*]]` sites handed off as a list; the seven memory sources still on disk.
- [ ] The event-writer column and any DENIAL type match prompt 9's ruling, cited.
- [ ] P4-4 findings delivered per skill; nothing applied unapproved.
- [ ] Branch/commits per P4-7; every deletion through the rm gate with no workaround, and the report says so.
