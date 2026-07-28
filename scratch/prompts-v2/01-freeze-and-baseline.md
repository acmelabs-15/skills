# Prompt 1 — Freeze the window, take the baseline, stop the bleeding

_First prompt of the programme. Everything else depends on this one._

> **HISTORICAL RECORD — do not act on this prompt's `create-skill` citations.** This prompt **already ran** (2026-07-27; its snapshot, `BASELINE.md` and `FICTION-REGISTER.md` are at `~/Desktop/brain-consolidation-baseline-2026-07-27/`). Its references to `create-skill`, `authoring-style.md`, `eval-workflow.md` and `python -m scripts.quick_validate` were accurate when it executed. The skill was **deleted on 2026-07-28** and replaced by the `skill-creator@ACMElabs` plugin (R-32), so those file:line citations no longer resolve. The text is left unedited deliberately, as the record of what actually ran — prompts 4 through 12 carry the corrected citations. The predecessor's files survive read-only inside this prompt's own snapshot at `skill-snapshot/create-skill/`.

**Execution contract (R-31): before doing anything else, read `scratch/prompts-v2/RUN-CONTRACT.md` — it sits beside this file — and run this entire prompt in its collaborative mode: granular, guided, opinions labeled, no assumptions. It overrides any "autonomous" framing below.**

---

I am consolidating my Brain agent-workflow system: the `skills` plugin at `/Users/peter.kloss/Dev/ACMElabs/skills`, the `brain` plugin, the eight home-spec documents at `~/.claude/home-specs/` (symlinked to `~/{NAME}.md`), and the auto-memory layer at `~/.claude/memory/`. Twelve prompts, run in order. This is prompt 1.

This prompt does the work whose **window closes the moment the first real edit lands**, plus the zero-risk repairs that make every later prompt safe. Nothing here changes system behaviour. Every item here is worth doing even if I cancelled the rest of the programme tomorrow.

**HUMAN ATTENTION: autonomous.** **Zero `AskUserQuestion` rounds** — the one question this prompt used to carry (snapshot scope) was answered during review and is decided in Step 1 — plus **one map-before-edit checkpoint** where you stop and wait for me (Step 1.5). Everything else runs without me. If you find yourself wanting a question, that is a signal you have hit something the prompt got wrong: say so plainly rather than inventing a round.

Read before you design, and tell me what you read. Do not sample.

---

## Standing rules

These fourteen apply to this prompt and to all eleven that follow. They are not preamble; several of them will contradict something you find in my own files, and where they do, these win.

**P4-1 — Every question goes through `AskUserQuestion`.** No exceptions, no "this one is too conversational" carve-out. Maximum **4 authored options per question**; the tool auto-appends "Other" itself, so **never author an "Other", a "none of these" or a "let me write my own"** — authoring one wastes a slot and produces two of them. Any section that yields more than four candidates splits across **consecutive rounds**, never a fifth option. Do tell me in the question text that the appended "Other" is where I write my own answer — the affordance exists and nobody ever says so. Correction you must carry: the 4-option cap is a documentation fact, not a fact stated anywhere in my repo. `AskUserQuestion` appears exactly once in the 5,904 lines of home specs (`~/CLAUDE.md:37`, a routing-table trigger) with no cap and no "Other". And be precise about my own memory: `feedback_ask_protocol.md:34` says *"Batch up to 4 per `AskUserQuestion` call (tool's hard cap)"* — that is four **questions per call**, which is a real cap on a *different axis*; the line is not factually wrong. Its problem is that it collides head-on with `feedback_one_decision_at_a_time.md:12`, *"Every AskUserQuestion shows ONE thing to decide, not a batch"*. Record the conflict as the defect, not the arithmetic, and treat the option cap as binding.

**P4-2 — grill-me's "never bundle" is satisfied, not violated,** by one-section-per-question with one question in flight. A multiselect that decomposes a *single* section is not several unrelated decisions stacked.

**P4-3 — Author the moment it locks.** Never defer: not to the end of a phase, not to the phase that "owns" the artifact type, not to the end of a turn.

**P4-4 — Independent evaluation on every skill touched.** Evaluate each skill *as if handed it cold with no brief* — not as an audit against my brief or a checklist. Deliver **ranked findings, each with a recommended action and a one-line rationale**. Apply nothing without my approval. Give me an honest short list rather than padding.

**P4-5 — Full `create-skill` lifecycle including the empirical Stages 7–9, baselined before the first edit.** The baseline for the whole programme is taken in this prompt. `create-skill/references/eval-workflow.md:69`, complete sentence: *"**Improving an existing skill:** the OLD version. Before editing, snapshot it (`cp -r <skill-path> <workspace>/skill-snapshot/`), point the baseline subagent at the snapshot, and save to `old_skill/outputs/`."* `:53`: *"do not spawn with-skill runs first and circle back for baselines."* `:85`, on `timing.json`: *"this is the only chance to capture it; it is not persisted elsewhere."* Stage 9's `run_loop` **requires `--model`** (no default — `create-skill/SKILL.md:122`, `eval-workflow.md:158`) and the `claude` CLI; skip Stage 9 if absent. `run_eval.py` **mutates the live project** (`eval-workflow.md:206`: *"It plants a temporary command file into the project's `.claude/commands/` … A crash mid-run can leave stray command files"*). Note also: `skill-creator@claude-plugins-official` (`settings.json:257`) and `plugin-eval@claude-code-workflows` (`:241`) are both **`false`**; `create-skill` and `grill-me` are user-level skills under `/Users/peter.kloss/.claude/skills/`. Verify `skill-reviewer` resolves before treating it as a gate, and fall back to create-skill's inline fresh-eyes review (`create-skill/SKILL.md:128`) if it does not. The mechanical floor of that same line is `python -m scripts.quick_validate <skill-dir>`, which is Tier 1 and always runs — **for any prompt that edits a `SKILL.md`. This one does not**; see `## Independent evaluation`.

**P4-6 — Binary tool rule, routed by artifact and not by phase.** Brain notes under `docs/**` → Brain MCP tools. Non-graph files — auto-memories, skill bodies, reference files, config, `.ts` — → `Read`/`Edit`/`Write`, on which Brain MCP is **forbidden**. Normative source `~/KNOWLEDGE-GRAPH-CONVENTIONS.md:184-186`, hardened at `:202`: *"Rule applies at ALL agent tiers… No exceptions."* Almost everything in this prompt is non-graph, so almost everything here uses generic file tools.

**P4-7 — Git.** Verify the branch before any git operation. One branch per prompt. Commit in coherent steps — max 5 files or one logical change. Leave the branch unmerged for my review. **Do not push.** No `--no-verify`, no force-push. **No indication of AI contribution in any commit message.**

**P4-8 — Update cost is work, not an argument.** My standing principle: *"I don't wanna not do a thing because it's going to require updating something in a bunch of places… I wanna do something because it's the right decision to make."* Recommend what is right, state the work it implies, and never let the tally become the reason.

**P4-9 — Nothing deleted in bulk; nothing deleted before its destination is live and verified.** Verification means read-back or exercise, not assertion. Operational note that applies wherever anything is removed: **`Bash(rm:*)` sits in the `ask` list of my permissions block (`settings.json:158`)**, alongside `Bash(git reset:*)` and `Bash(gh pr create:*)`. Deletions therefore raise a prompt on my screen even where I have approved the deletion in principle, and even though `defaultMode` is `bypassPermissions` (`:160`) — an explicit `ask` rule is more specific than the default mode. That prompt is a feature. **Do not route around it**: no `find -delete`, no `mv` to a scratch directory as a stand-in for deletion, no shell function or alias that hides the verb. If a removal is blocked or I do not answer, report it as blocked and move on (P4-12) rather than substituting a different mechanism. In this prompt the only removals are *line* deletions made with `Edit` inside existing files, which never touch `rm`; say so in your report so the distinction is on the record for the prompts that do delete files.

**P4-10 — Read before designing, and say what was read. Do not sample.**

**P4-11 — Precedence, published once.** Skills plugin > brain plugin > home specs > auto-memories. Five different precedence rules with five different winners are currently in force across my corpus with no arbiter. This ordering is the arbiter. Prompt 11 publishes it at the top of whatever survives.

**P4-12 — Fail closed. Never "document a rationale and proceed".** Do not repeat a headline count here: earlier drafts of this programme asserted "27 rationale-and-proceed branches and 34 escape hatches" and neither figure is reproducible against the corpus — `grep -rni "rationale.*proceed"` returns **2**, `grep -rni "escape hatch"` returns **7 text hits**, and `grep -rni "rationale-and-proceed"` returns **0**. The class is real; the number was invented, and stating it violates my own rule against unsupported quantitative claims. The nearest genuinely measured figure is `docs/analysis/ANALYSIS-005-skills-ecosystem-enforcement-wiring-deep-analysis.md:64` — *"**23 of 27 enumerated gates fully phantom**"* — which counts *gates*, not rationale branches, so do not reuse it as though it did. If you want a number, derive one and state the exact command that produced it. The counter-models to imitate: `build/SKILL.md:257` with `build/references/exit-gates.md:3` — *"'I'll fix in review' is NOT acceptable rationale"* (that file is under `build/references/`, **not** `end/references/`, which holds only `end-checklist.md` and `pr-creation.md`) — and `brain/agents/orchestrator.md:1890-1892`, where `:1890` reads *"If the validator cannot run (environment error, script missing):"* and `:1892` is the bullet *"**DO NOT claim completion**"*. `decompose`/`recompose`/`defrag` have no rationale-and-proceed branch at all; `decompose/SKILL.md:768` is *"Never skip adjudication."*

**P4-13 — Do not build what already ships.** Three things exist, fully built, with **zero non-test, non-hook callers** — that qualifier matters, and the earlier "zero callers" phrasing was wrong: `skills/end/scripts/run-pre-flight.ts` (290 lines, the structural validator), `validateIntegrityFloor` (`shared/composition/src/core/validate.ts:32`, imported at `tests/plan-integrity-floor.test.ts:39` and invoked at `:236`, `:256`, `:273` and nowhere else), and the brief-rendering inversion (`skills/build/scripts/dispatch-implementer.ts:44-73`, `dispatch-qa.ts:48-88`). `docs/analysis/ANALYSIS-005-skills-ecosystem-enforcement-wiring-deep-analysis.md:61` records *"0 of 17 lifecycle scripts invoked by any SKILL.md … 6 DESCRIBED-NOT-INVOKED … 11 ORPHAN"*, and `:62` gives the same qualifier for the validator family: *"All 10 claim-validators have zero non-test, non-hook callers"*. Wire, do not rebuild.

**P4-14 — Every claim of mechanical enforcement in this corpus is currently a fiction.** `parsePlanNote` fails **7 of 7** real PLANs. The composition suite is entirely synthetic: **458 tests, 458 pass / 0 fail** at the last recorded run (`skills/docs/qa/QA-030-SPEC-002-reconcile-session-adapter-design-001-drift.md:35`, and `:38` — *"→ 458 pass / 0 fail / 938 expects in 895ms"*). If you have seen "82 passing composition tests" anywhere in this programme, it is sourced nowhere in the corpus — discard it. And the fixture caveat belongs to a *plan-skill script test*, not a composition test: `skills/plan/scripts/render-plan-note.test.ts:10-11` — *"re-renders without drift. A spec-phase part in IN_PROGRESS keeps the fixture / free of build_workflow_items (which build.SPEC-NNN parts would require)."* Until prompt 5 lands, no prompt — including this one — may assert that a schema, validator or mutation "enforces" anything against production data.

---

## What this prompt is

Every other prompt in the programme can be run late. This one cannot. These are the only actions whose *window closes*:

| Action | What is lost if it happens later |
|---|---|
| The pre-edit snapshot | A skill edited without a week-0 snapshot is permanently unmeasurable. `create-skill`'s improve-an-existing-skill baseline **is** the snapshot (`eval-workflow.md:69`), so P4-5 becomes unsatisfiable for that skill, forever. |
| The regrowth clause | `~/.claude/memory/feedback_session_protocol.md:377` mandates creating new `feedback_*.md` files at every session end, with no routing rule. Until that line is narrowed, every session keeps writing **lifecycle** rules into the very layer I am migrating them out of — the migration chases a moving target. |
| The 16 template wikilinks | `~/NOTE-TEMPLATES.md:22` instructs *"Copy the frontmatter + section layout verbatim."* Sixteen live `[[feedback_*]]` wikilinks sit inside those templates and inside CONVENTIONS' own `## 9. Pairs with` section (14 in NOTE-TEMPLATES + STRUCTURES, 2 in CONVENTIONS `:645-646`). The instant a cited memory is deleted, every future note copied from them emits a dangling wikilink into `docs/**` — which my own CONVENTIONS classifies as a forbidden pattern at `:602`. |
| The 13 TypeScript citations | One of them is a thrown `Error` string printed to the operator. Deleting the memory turns a runtime error message into a pointer at a file that no longer exists, at the exact moment something has already gone wrong. |
| The stub verification | Four redirect stubs claim their content moved into CONVENTIONS on 2026-04-21 and nobody re-checked. If a stub is sole-source, deleting it in prompt 12 destroys the only copy. |
| The out-of-corpus retrieval | Two memories cite `~/Desktop/protocols/SKILL-0{12,17}-*.md`, which are not in the working corpus. Delete the memories first and the pointer is all that survives. |

The last two sections — the fiction register and the home-spec diff — are read-only compilations that four later prompts consume. They are here because compiling them costs nothing now and blocks work later if missing.

---

## What I have already decided

Do not re-litigate any of this. Ask HOW, not WHETHER.

1. **The auto-memory layer is being thinned, not eliminated** (owner revision, 2026-07-27 — supersedes any earlier "phased out entirely" phrasing you may have seen). Everything the plan lifecycle owns — session/plan/phase discipline, research→end conduct, ADR/PRD/SPEC/ANALYSIS authoring, curation, rehydration — migrates into the skill that governs it and is then deleted from the layer. Everything else — tooling preferences, credentials pointers, Jira mechanics, environment gotchas — **stays in the layer and keeps being served to agents.** The same scope applies to `~/CLAUDE.md` and `~/AGENTS.md`: thinned to pointers plus their non-lifecycle content, not deleted. This prompt does not debate that scope; it freezes the state so the migration is safe. The migration itself is prompts 3 and 6–11; prompt 12 verifies and deletes **only the migrated lifecycle set**.
2. **Update cost is not an argument** (P4-8). If a fix touches sixteen sites, it touches sixteen sites.
3. **Nothing is deleted before its destination is live and verified** (P4-9). This prompt deletes nothing at all: the two regrowth clauses in Step 2 are **narrowed in place**, not removed.
4. **The auto-memory layer is 119 files / 7,081 lines / zero subdirectories** — 113 `feedback_*`, 2 `project_*`, 3 `reference_*`, 1 `MEMORY.md`, 0 `summary.md`. Measured on disk. If you have seen "171 files / ~17,280 lines" or "~140 / 6 / 6", both are wrong: the second is internally impossible (152 > 119), and the first counts the separate `~/Desktop/auto-memories` project-history tree, which is not the memory layer.
5. **There are 16 live template-injection sites across four memory names**, not six across one. `feedback_ai_dominant_estimates` ×12, `feedback_session_protocol` ×2, `feedback_orchestrator_delegation_rules` ×1, `feedback_spec_implementation_no_assumptions` ×1. The full list is in Step 6. A gate that only covers `feedback_ai_dominant_estimates` ships two dangling sources for `feedback_session_protocol` — the very memory prompt 10 migrates — and two more inside CONVENTIONS' own `## 9. Pairs with`.
6. **The snapshot precedes every edit in the programme.** Including the edits in this prompt.

---

## Already decided: the snapshot scope

Do not ask. This was the prompt's one runtime question; it was worked through and **ratified during the walkthrough review**. The snapshot target set is **full brain plus targeted rest**:

- All 11 ACMElabs plugin skills (`build`, `decisions`, `decompose`, `defrag`, `end`, `ingest`, `plan`, `recompose`, `research`, `review`, `spec`)
- `/Users/peter.kloss/.claude/skills/grill-me` and `/Users/peter.kloss/.claude/skills/create-skill`
- **All of `brain/skills/**`** (48 skills — this subsumes `memory`, `adr-review` and the four `session*` skills, and closes a hole an earlier target list had: prompt 3 edits `brain/skills/reflect`, and P4-4 requires a week-0 baseline for every edited skill)
- `brain/rules/**`, `brain/agents/**` (27 files), `brain/commands/**`, `brain/instructions/**` (small, and the fiction register cites all of them)
- The 8 home specs; `~/.claude/memory/**`; `shared/composition/src/**`

Exclude `node_modules`, `.git`, `coverage`, `dist` everywhere. If disk pressure makes this set infeasible, stop and tell me rather than trimming it silently.

---

## Step 1 — The snapshot [FREEZE-SNAPSHOT]

`cp -r` every target from the answer above into a **dated, off-tree** workspace — outside every working tree the programme will edit, so nothing you snapshot can be mutated by a later prompt or swept by a later `git clean`. Default location unless I say otherwise: `~/Desktop/brain-consolidation-baseline-<YYYY-MM-DD>/`.

Two structural requirements:

1. **Lay it out so `create-skill` can use it directly.** Each snapshotted skill must land at `<workspace>/skill-snapshot/<skill-name>/`, because that is the exact path shape `eval-workflow.md:69` points a baseline subagent at. If the layout does not match, every later prompt has to reconstruct it.
2. **Point create-skill's baseline at the snapshot now.** Record, in the snapshot root as `BASELINE.md`, the snapshot date, the exact `cp -r` commands you ran, the target list, and the instruction that any later `create-skill` run improving one of these skills uses `<workspace>/skill-snapshot/<skill-name>/` as its `old_skill` baseline.

Carry these three facts into `BASELINE.md` verbatim so later prompts do not have to re-derive them:

- `eval-workflow.md:53` — *"do not spawn with-skill runs first and circle back for baselines."*
- `eval-workflow.md:85` — `timing.json` is capture-once: *"this is the only chance to capture it; it is not persisted elsewhere."*
- `eval-workflow.md:206` — `run_eval.py` plants a temporary command file into the live project's `.claude/commands/`, so evals must not run concurrently with edits to that project.

Report the snapshot size, the file count, and the exact commands.

Snapshotting is a `cp -r`, never a `mv`, and nothing in this step removes anything. If a partial or failed copy needs clearing, that is an `rm` and it will prompt me (P4-9) — say so and wait rather than working around it.

---

## Step 1.5 — The map, delivered before any edit lands [FREEZE-MAP]

**This is a hard gate, not a disclosure.** Every edit in this prompt is a small surgical change to a file I am not going to re-read line by line, so the only moment I can judge the surface area is *before* it changes. Two earlier versions of this work made a delivered map a blocking precondition on any edit — *"Report the map before proposing any change"* — and that checkpoint was lost when this prompt was rewritten around pre-supplied file:line facts. Pre-supplied facts are better grounding; they are not a substitute for me seeing the surface.

So: **stop here and give me four tables. Then wait for my go-ahead. Do not begin Step 2 until I answer.**

1. **Regrowth sites** — the exact current text of `feedback_session_protocol.md:377` and of `feedback_inline_reflect_capture.md` `:13`, `:118`, `:135-137`, with the surrounding list items so I can see what renumbering implies.
2. **Wikilink sites** — all 19 hits of `grep -rn "\[\[feedback_" ~/*.md`, each row marked `REWRITE` / `DEFER` / `MUST SURVIVE`, each with a `FENCED` or `PLAIN` flag saying whether it sits inside a fenced copy-paste block, and each `REWRITE` row carrying the replacement sentence you propose.
3. **TypeScript citation sites** — all 14 hits of `grep -rn "feedback_" /Users/peter.kloss/Dev/ACMElabs/skills/shared/`, each with the one-line inline rule you propose to replace it with, `mutations/plan-mutations.ts:271` first because it is the only runtime string.
4. **Index defects** — the six from Step 5, each marked `FIX NOW` or `RECORD ONLY`, with the exact before/after for the four you intend to fix.

If any table disagrees with the numbers I have given you below, the table wins and I want the discrepancy called out in the same message. A row you cannot locate is a finding, not a rounding error.

Nothing in this step edits anything. The snapshot in Step 1 is already taken, so the map costs one turn and buys the whole prompt.

---

## Step 2 — Route the regrowth [FREEZE-REGROWTH]

Under the thinning scope, regrowth is not amputated — it is **routed**. Non-lifecycle learnings keep flowing into the layer; lifecycle-owned learnings stop landing here and get proposed as edits to the owning skill instead. Two edits plus one recording step. Both edits in `~/.claude/memory/`, both `Edit` (P4-6). Nothing is deleted.

**2a.** `feedback_session_protocol.md:377`, verbatim:

```
6. Save any new durable principles as memory feedback_*.md files
```

**Narrow it in place** (no deletion, no renumbering) to:

```
6. Save a new durable principle as a memory feedback_*.md file ONLY if no lifecycle skill owns its subject. Lifecycle-owned principles — anything governing sessions, PLAN notes, phases or parts, research/decisions/spec/build/review/end conduct, ADR/PRD/SPEC/ANALYSIS authoring, note curation, or rehydration — are never persisted here: propose them as an edit to the owning skill and tell the user.
```

Flag for prompt 10: this memory migrates into the canonical session definition, and **the narrowed routing rule must survive that migration** — it becomes part of the session-end checklist wherever that checklist lands.

**2b.** `feedback_inline_reflect_capture.md` describes the same regrowth as an architecture, in three places: `:13` (*"skillbook persists durable ones to `~/.claude/memory/feedback_*.md`"*), `:118` (*"persistence engine that promotes HIGH-confidence reflect-captures … to durable `feedback_*.md` memories"*), and the pipeline diagram at `:135-137`:

```
brain:🧠-skillbook agent (persistence; ADD candidates → feedback_*.md auto-memories)
  ↓
~/.claude/memory/ updated; future sessions auto-load via MEMORY.md → CLAUDE.md tier-1 import chain
```

Apply the same treatment, not amputation: at all three sites, condition the persistence leg — skillbook persists HIGH-confidence captures to `~/.claude/memory/feedback_*.md` **only when no lifecycle skill owns the subject**; lifecycle-owned captures are surfaced as proposed edits to the owning skill, clearly labelled for my review, never written into the layer. The reflect→retrospective capture chain stays fully intact. Add a one-line note that the routing boundary is the lifecycle-ownership test above and that prompt 12 re-checks the layer for boundary violations.

**2c. Record — do not change — the system-level generation posture.** The narrowed clauses govern instruction-following agents; the *native* generators do not read them. From `settings.json`: `autoMemoryEnabled: true` (`:305`), `autoMemoryDirectory: "~/.claude/memory"` (`:306`), `autoDreamEnabled: true` (`:307`), `dreamAgentsEnabled: true` (`:336`), `autoMemoryAgentsEnabled: true` (`:337`), `memoryMode: "auto"` (`:338`). **All six stay exactly as they are** — loading must stay on for the surviving memories to reach agents, and generation stays on so non-lifecycle capture continues. The accepted consequence, stated for the record: lifecycle-ish files may still appear during the programme via the native generators, so **prompt 12 runs a delta-sweep** — it re-classifies every file in `~/.claude/memory/` newer than Step 3's inventory instead of assuming a frozen 119. Record all six flag values in `BASELINE.md`.

Do not touch any other memory file in this step.

---

## Step 3 — Complete the inventory [FREEZE-INVENTORY, FREEZE-OUTOFCORPUS]

**3a. Export the `~/Desktop/auto-memories` project-history tree** into the working corpus alongside the memory layer, clearly labelled as a *separate* tree. It was never exported, and its absence is why the file count has been wrong in every earlier version of this work.

**If that path does not exist, say so plainly and export nothing.** Same escape as 3b, and for the same reason: I would rather learn that the tree is gone than receive a plausible substitute assembled from somewhere else in `~/Desktop`. An absent tree changes the disposition of the 171-file figure from "counts a real second tree" to "counts a tree that no longer exists", and prompt 12 needs to know which. Do not widen the search, do not glob for anything auto-memory-shaped, and do not create the directory. Report the path you checked and the result.

**3b. Retrieve the two out-of-corpus sources**, both cited by memories that later prompts will migrate or delete:

| Source | Cited by |
|---|---|
| `~/Desktop/protocols/SKILL-017-formal-skill-invocation-discipline.md` | `feedback_load_governing_skill_before_acting.md:23` |
| `~/Desktop/protocols/SKILL-012-phase-skill-wins-conflicts-with-general-specs.md` | `feedback_phase_skill_wins_conflicts.md:23` |

If either file does not exist at that path, say so plainly and do not invent a substitute — that changes the memory's disposition from "has a source" to "is the source", which prompt 12 needs to know.

**3c. State the true scale** in your report so nothing downstream repeats the old error:

| Measure | Value |
|---|---|
| Files in `~/.claude/memory/` | **119** |
| Lines | **7,081** |
| Subdirectories | **0** |
| `feedback_*` | 113 |
| `project_*` | 2 |
| `reference_*` | 3 |
| `MEMORY.md` | 1 |
| `summary.md` | 0 |

Re-measure rather than trusting me. If your count differs, report the difference — do not silently adopt either number.

---

## Step 4 — Verify the 2026-04-21 consolidation [FREEZE-STUB-VERIFY]

Four memories self-declare `superseded_by: ~/KNOWLEDGE-GRAPH-CONVENTIONS.md` with `superseded_date: 2026-04-21` and a "Where this content lives now" section. **Nobody re-checked whether the content actually landed.** If a stub is sole-source, deleting it in prompt 12 destroys the only copy of a live rule.

| Stub | Claims content moved to | Load-bearing? |
|---|---|---|
| `feedback_auto_memories_not_in_brain_notes` | CONVENTIONS §5.3 + §7 | Moderate — this is the rule Steps 6 and 7 apply |
| `feedback_canonical_state_and_rollups` | CONVENTIONS Information Model preamble + §7 | **Yes.** `:19` claims the **recovery protocol** (*"fresh reader reads IN_PROGRESS session note and follows references"*) moved to "Information Model preamble Section Category 4" |
| `feedback_brain_note_naming` | CONVENTIONS §1.8, §1.7.2, §3 | Moderate |
| `feedback_skill_content_no_knowledge_graph` | CONVENTIONS §5.2, §5.3, §7 | Moderate |

**Verify each by reading `~/KNOWLEDGE-GRAPH-CONVENTIONS.md`, not by reading the stub.** For each, mark `VERIFIED-LANDED` or `NOT-LANDED` and quote the CONVENTIONS text that carries it (or state that no such text exists). A stub asserting its own supersession is not evidence.

Then one more, which is not a stub but the same class of unverified claim: `feedback_bidirectional_relations.md:16` heads its inverse-pairs table *"## Inverse pairs (add to CONVENTIONS Section 4.4 valid list)"* — phrased as a pending action, not a completed one. The table at `:18-28` carries nine pairs (`implements`/`implemented_by`, `depends_on`/`required_by`, `extends`/`extended_by`, `part_of`/`contains`, `inspired_by`/`inspires`, `supersedes`/`superseded_by`, `leads_to`/`caused_by`, `pairs_with` symmetric, `relates_to` symmetric), and `:29` adds the forbidden list: *"**Forbidden** (per CONVENTIONS Section 7, unchanged): `reviews`, `critiques`, `derives_from`, `records_completion_of`, `references` — never use these as relation types."*

CONVENTIONS §4.4 begins at `~/KNOWLEDGE-GRAPH-CONVENTIONS.md:394` and its **Valid relation types (inverse pairs for bi-directional coverage)** table sits at `:406-416`; the forbidden five are restated at `:626` inside the pre-flight checklist. Go to those exact lines rather than searching. Report, pair by pair, which of the nine are present in CONVENTIONS and which exist only in the memory, and note whether the wording matches or merely agrees — `pairs_with` reads *"symmetric (same verb both sides)"* in CONVENTIONS and *"symmetric (use same verb on both sides)"* in the memory, and I want to know if that is the only drift. If all nine are present, the memory heading is a **completed action phrased as pending**, which is a different disposition from an unlanded one and matters to prompt 12.

Output a five-row verdict table. Change nothing in CONVENTIONS in this prompt — a NOT-LANDED verdict is an input to prompts 11 and 12, not a repair to make now.

---

## Step 5 — Fix the index [FREEZE-INVENTORY]

Six index defects, all of which make the register untrustworthy before a single deletion has happened. Fix the first four; record the fifth and sixth.

1. **`MEMORY.md:71`** lists `feedback_brain_v2_highspot_private_only` under "Project-specific constraints" with no VOID marker, while that file's `:13` reads *"**VOID as of 2026-07-25 — do not apply this constraint.** User stated plainly: 'brain isn't a highspot project.'"* A reader consulting the index gets the reversed constraint. Add the VOID marker to the index line.
2. **`feedback_subagents_use_opus.md`** exists on disk and appears nowhere in `MEMORY.md`. Index it, or mark it as absorbed by `feedback_no_unfounded_subagent_model_override` — check which is true before choosing.
3. **`feedback_post_compaction_rehydration_protocol.md:55` and `:131`** name `feedback_skills_phase_x_protocol_hardening_state` as a read-target; that file is RETIRED. Re-point or remove both references.
4. **`feedback_sync_graph_unreliable.md:15`** reads *"Do NOT recommend `/sync-graph` as a remediation step for drift, permalink artifacts, rollup propagation, or stale-estimate audits. Suggesting it as a follow-up is misleading — the user knows it's broken and won't run it."* **Do not "reconcile" the index entry — it is already correct.** `MEMORY.md:32` reads *"- [sync-graph skill is unreliable](feedback_sync_graph_unreliable.md) — reconcile rollup/status drift manually via edit_note"*, which agrees with the memory rather than contradicting it. An earlier version of this prompt told you the index still advertised `/sync-graph` as guidance; that was wrong, and rewriting a correct line would be the only damage in this step. **Verify it, record it as already-correct, and change nothing.** The live contradiction is in `~/CLAUDE.md`, which routes to `/sync-graph` in two places — leave that alone too; that file's fate is prompt 12's.
5. **Six references are already dangling** before any deletion. Record them; do not migrate them:
   - `feedback_always_check_memories.md:56` → `feedback_knowledge_graph_conventions.md` (no such file)
   - `feedback_commit_cadence.md:111` → same non-existent file
   - `feedback_commit_cadence.md:86` → `feedback_note_templates.md` (no such file)
   - `feedback_load_governing_skill_before_acting.md:23` → the out-of-corpus path from Step 3b
   - both wikilinks at `reference_basic_memory_date_filter_semantics.md:19` (`[[reference-basic-memory-watermark-pathflip]]` — no such file; `[[feedback-brain-basic-memory-config-disconnect]]` — hyphenated, the real file uses underscores)
6. **`feedback_post_compaction_rehydration_protocol.md:53`** — one line, not a range. It reads *"2. Read every memory listed under "Protocol memories (always consult proactively — non-negotiable)" — every TIER-1 BLOCKING and PROJECT-STATE entry"*. That is a **structural dependency on a `MEMORY.md` heading string**: `:52` above it is the harmless *"1. Read `~/.claude/memory/MEMORY.md` (the index)"*, and only `:53` reaches into the index by heading text. Record it prominently — renaming that heading silently breaks Step 2 of the rehydration protocol, and prompt 10 owns rehydration. Do not rename it here, and do not rename it as a side effect of fixing defect 1 or 3 above.

---

## Step 6 — De-fang the templates [FREEZE-WIKILINK]

Sixteen live `[[feedback_*]]` wikilink sites sit inside my note templates — fourteen of them across `~/NOTE-TEMPLATES.md` and `~/KNOWLEDGE-GRAPH-STRUCTURES.md`, and two more inside `~/KNOWLEDGE-GRAPH-CONVENTIONS.md`'s own `## 9. Pairs with` section, which is not a template at all. `~/NOTE-TEMPLATES.md:22` tells every agent *"Copy the frontmatter + section layout verbatim."* The failure mode is concrete: prompt 12 deletes `feedback_ai_dominant_estimates`, and from that moment every SPEC, PLAN and TASK note anyone writes from these templates carries a wikilink to a file that does not exist — into `docs/**`, where `~/KNOWLEDGE-GRAPH-CONVENTIONS.md:602` classifies it as a forbidden pattern.

The mechanism is worse than an oversight. `CONVENTIONS.md:478` lists `` `[[feedback_claude_code_markdown_first]]` (wikilink) `` under **Forbidden forms**, and then the same file commits the identical offence 167 lines later at `:645-646`.

**Four memory names, not three.** `feedback_ai_dominant_estimates` ×12; `feedback_session_protocol` ×2; `feedback_orchestrator_delegation_rules` ×1; `feedback_spec_implementation_no_assumptions` ×1. Count the names as well as the sites when you report, because the *names* are what prompt 12 deletes.

**Method** — my own documented replacement pattern, stated at `CONVENTIONS.md:484`: *"**Replacement pattern — describe the principle INLINE, don't cite the filename**:"*. (There is a second, near-identical one at `:504` — *"**Replacement pattern — INLINE the principle without citing the Brain entity**"* — for a different case; do not conflate them.) Never re-point a citation at a future destination; a repointed citation just dangles later.

**Do the six inside fenced copy-paste blocks first** — those are the ones that get copied verbatim into real notes. Determine fenced-ness mechanically, not by eye: `~/NOTE-TEMPLATES.md` nests a ```` ```mermaid ```` block inside a ```` ```markdown ```` block (open at `:926`, nested pair at `:956`/`:994`, outer close at `:1108`), so a naive backtick-parity counter mis-labels everything after `:956`. Walk the fences with nesting in mind and put the `FENCED`/`PLAIN` flag in the Step 1.5 map.

| # | Site | Text |
|---|---|---|
| 1 | `KNOWLEDGE-GRAPH-STRUCTURES.md:113` | `**Estimate**: {single AI-Dominant day total per [[feedback_ai_dominant_estimates]]; …}` |
| 2 | `KNOWLEDGE-GRAPH-STRUCTURES.md:379` | `_AI-Dominant totals are the canonical single-reference per [[feedback_ai_dominant_estimates]]. …_` |
| 3 | `NOTE-TEMPLATES.md:420` | `_Size bands: … AI-Dominant totals are the canonical single-reference per [[feedback_ai_dominant_estimates]]._` |
| 4 | `NOTE-TEMPLATES.md:430` | `_AI-Dominant totals are the canonical single-reference per [[feedback_ai_dominant_estimates]]. …_` |
| 5 | `NOTE-TEMPLATES.md:692` | `**Estimate**: {single AI-Dominant day total per [[feedback_ai_dominant_estimates]]}` |
| 6 | `NOTE-TEMPLATES.md:782` | `_AI-Dominant is the canonical single-reference per [[feedback_ai_dominant_estimates]]. …_` |

Then the remaining six `ai_dominant_estimates` sites — `KNOWLEDGE-GRAPH-STRUCTURES.md:86, 315, 348, 365, 401, 418`, all plain prose, none fenced — and the four across the **three other memory names**:

| Site | Text | Fenced? | Treatment |
|---|---|---|---|
| `NOTE-TEMPLATES.md:920` | *"Session notes are pure pointer-ledger format per [[feedback_session_protocol]]. No narrative prose."* | plain | Delete the citation. The sentence already states the rule. (Note: the source has **no backticks** around the wikilink — do not add any when you quote it back to me.) |
| `NOTE-TEMPLATES.md:1048` | *"**Column semantics** (see [[feedback_session_protocol]] "Task persistence" for full spec):"* | **fenced** — inside the ```` ```markdown ```` SESSION template opened at `:926` | **Defer.** Leave a `TODO` naming prompt 10 — see the warning below. |
| `KNOWLEDGE-GRAPH-CONVENTIONS.md:645` | *"[[feedback_orchestrator_delegation_rules]] — subagents must apply these conventions when persisting findings"* | plain | Delete the line — it is a §5.3 self-violation in the file's own `## 9. Pairs with`. |
| `KNOWLEDGE-GRAPH-CONVENTIONS.md:646` | *"[[feedback_spec_implementation_no_assumptions]] — rich specification richness assumes these note structures"* | plain | Delete the line, same reason. |

For the twelve `ai_dominant_estimates` sites, most surrounding sentences already state the rule, so deleting `per [[feedback_ai_dominant_estimates]]` loses nothing. Where the sentence does *not* carry the rule, restate it inline using the text the templates already use elsewhere: *AI-Dominant is the canonical single-reference; Human ≈ 3-5× AI-Dominant; AI-Assisted ≈ 1.5-2× AI-Dominant; show all three only in TASK `## Effort` tables.*

`NOTE-TEMPLATES.md:1048` is the one deferral, and it is deliberate: it points at a "Task persistence" spec that has no home yet, because the canonical `session` definition does not exist until prompt 10. Anchor the TODO to prompt 10 explicitly. **And flag it loudly**, because it is the uncomfortable one: `:1048` is itself **inside a fenced copy-paste block**, so the deferral leaves exactly one live wikilink in exactly the class of place this step exists to clear. That is an accepted, time-boxed risk with a named owner, not an oversight — write the `TODO` on its own line *immediately above* the `**Column semantics**` line and inside the same fence, so anyone copying the template copies the warning with it. Record in your report that this site is the single remaining copy-paste-reachable injection and that it must not survive prompt 10.

**Three sites must survive untouched, and this is the exact carve-out.** `KNOWLEDGE-GRAPH-CONVENTIONS.md:478`, `:481` and `:602` contain `[[feedback_*]]` strings as the **examples that define the forbidden-form rule**. Verbatim, so you can match them without guessing:

- `:478` — `- ``[[feedback_claude_code_markdown_first]]`` (wikilink)` — a bullet under the **Forbidden forms** list that opens at `:474`.
- `:481` — `- Any Relations entry: `- informed_by [[feedback_*]]`` — same list.
- `:602` — `- **Auto-memory filename references in Brain notes** — `[[feedback_*]]` wikilinks, backticked filenames, inline `per feedback_X` text, etc. Describe the principle inline instead. See Section 5.3.` — in `## 7. Forbidden Patterns`.

All three match a naive `grep -rn "\[\[feedback_"`, and two of them (`:481`, `:602`) match on the literal glob `[[feedback_*]]` rather than on a real memory name. **Deleting any of them deletes the rule that forbids the pattern.** Do not "fix" them; do not rewrite them into prose; do not replace the example with a placeholder. Call all three out by line in your report so nobody else does either.

**One thing to record and not fix:** `docs/**` is not clean either. Measure it and state the measurement three ways, because a single number here has already been wrong once: `grep -ro "feedback_" skills/docs/ | wc -l` = **72 occurrences**, on **64 matching lines**, across **10 files**. Among them are **three** live `[[feedback_*]]` wikilinks, not two — `docs/sessions/SESSION-2026-05-20_05-wave-2-integration-and-brain-state-sync.md:132` and `:133`, plus `docs/sessions/SESSION-2026-05-23_02-protocol-hardening-wave-2-scope.md:888`. Count them and stop. That sweep is prompt 12's, and it needs Brain MCP `edit_note`, not `Edit` (P4-6).

---

## Step 7 — Make the TypeScript citations self-contained [AM-COMPLIB]

Thirteen auto-memory citations are shipped in TypeScript under `/Users/peter.kloss/Dev/ACMElabs/skills/shared/composition/src/`. This directory was never in scope for the §5.3 sweep that cleaned the rest of the corpus, which is why they are still there.

**Do `mutations/plan-mutations.ts:271` first.** It is not a comment — it is a thrown `Error` whose message is written to stderr and shown to me mid-failure, via `skills/build/scripts/transition-impl-item.ts:157` and `transition-qa-item.ts:175`:

```ts
`${mutationType}: owning_session is required (per feedback_per_task_build_qa_cycle — every workflow transition MUST carry session context)`
```

After the phase-out that prints a pointer to a deleted file at the exact moment a transition has already failed.

**Method: state the rule inline. Do not re-point at a future destination.** A self-contained rule never needs revisiting, which is the whole reason this unit sits in prompt 1 rather than in prompt 5 with the rest of the schema work. Recommended replacement for `:271`:

```ts
`${mutationType}: owning_session is required — every workflow transition must carry the session that owns it, so the PLAN records who moved the item and at which event`
```

The other twelve are doc comments; apply the same treatment:

| File | Lines |
|---|---|
| `schemas/requirement-note.ts` | `:12`, `:87` |
| `schemas/task-note.ts` | `:12`, `:112` |
| `schemas/plan-note.ts` | `:23`, `:24`, `:137` |
| `mutations/plan-mutations.ts` | `:89` (comment), `:271` (runtime) |
| `validators/requirement-claim-validator.ts` | `:8` |
| `validators/spec-claim-validator.ts` | `:8` |
| `validators/task-claim-validator.ts` | `:8` |
| `validators/design-claim-validator.ts` | `:8` |

Only two identifiers appear across all thirteen — `feedback_per_task_build_qa_cycle` (twelve sites) and `feedback_workflow_phase_rigor_at_every_layer` (`plan-note.ts:24`) — and both are cited as the source of rules **already implemented in the code they annotate**. The code is the migration target; it has already absorbed the rules. Replace each citation with a one-line statement of the rule the code enforces, in the code's own terms.

There is a fourteenth site, `shared/composition/tests/plan-note-schema.test.ts:36`, a test comment. Fix it too; it is not counted in the thirteen. Fourteen is the total: `grep -rn "feedback_" /Users/peter.kloss/Dev/ACMElabs/skills/shared/` returns exactly 14 lines today, which is what makes the "returns 0" gate in `## Done means` reachable rather than aspirational.

Run the composition test suite afterwards (`bun test` from `shared/composition/`) and report the pass count against the last recorded baseline: **458 pass / 0 fail / 938 expects** (`skills/docs/qa/QA-030-SPEC-002-reconcile-session-adapter-design-001-drift.md:38`). A different total is not automatically a failure — that QA note itself records the count drifting upward as tests land elsewhere in the tree (`:53`: *"Implementer claimed 447; current count is 458"*) — but any *failure*, or a total that has gone **down**, is a stop-and-tell-me. Per P4-14: a green suite here proves these edits are non-breaking and proves nothing whatsoever about production data.

---

## Step 8 — Compile the fiction register [FREEZE-FICTION]

Read-only. **Change nothing in this step.** Produce one document — `FICTION-REGISTER.md`, next to `BASELINE.md` in the snapshot workspace — carrying the **47** live entries below, each verified at source, each tagged, each assigned, plus the one struck entry recorded as struck. A fiction is a spec, schema or documented behaviour that no code implements and no artifact honours.

Verify each row before writing it down. Where my file:line is wrong, correct it and say so. Where the fiction has since been fixed, mark it RESOLVED and give the evidence. **A row I have already corrected below is still a row you verify** — I have been wrong about several of these, which is why the correction notes are inline.

**Tier 1 — fictions that make a documented mechanism inoperative**

| ID | Claim | Reality | Tag | Acted on in |
|---|---|---|---|---|
| FIC-1 | PLAN carries per-TASK dispatch instructions — `plan/SKILL.md:28,39,48`; `build/SKILL.md:63`; `review/SKILL.md:325,334`; `end/SKILL.md:373,382`; `examples/PLAN-004…:244`; `PLAN-003…:240`; **and, outside the skills repo, `~/.claude/memory/feedback_per_task_build_qa_cycle.md:43,45,104,174,183`** | `renderers/plan-note.ts:190-203` emits one `#### {id}` heading, a blank, and **eight** status bullets — no instruction content; `schemas/plan-note.ts:41-52` has no free-text field; `renderPlanNote` (`:330`) is pure, no file I/O | delete | 2 (skills repo) · 9 (the memory's migration) · 12 (the memory's deletion) |
| FIC-2 | `plan-note-schema.md:3` "Authoritative schema", six per-part H4s (`:124-140`), `d_n_substatus.decision: <verbatim text>` (`:56-57`) | `renderPart` emits none; `parseBuildWorkflowItems` treats every H4 in a part body as a build item; `DecisionStateSchema` (`schemas/plan-note.ts:114-120`) is `{id, status, topic}` | implement (verbatim field) + delete (six H4s) | 5 |
| FIC-3 | `#### Phase N Exit Criteria` + `brain:🧠-qa` gate line, "MANDATORY" — `STRUCTURES.md:24,160-167` | Zero occurrences across 10 example notes | delete | 11 |
| FIC-4 | `validateIntegrityFloor` enforces ≤50% regenerated lines — `core/validate.ts:32`; advertised at `shared/composition/**schemas**/base.ts:105` (the top-level `schemas/`, **not** `src/schemas/`, which also exists and has no `base.ts`) | Zero **non-test, non-hook** call sites: only `tests/plan-integrity-floor.test.ts:39, 236, 256, 273`. Note the adapter runs a *separate* private floor (`adapters/plan.ts:300, 326`), so "no floor runs" would be too strong | implement | 5 |
| FIC-5 | The `sync` agent — **27** agent files; `orchestrator.md:1118-1120,1123,1142,1152`; BLOCKING at `:1103,1128` | No `agents/sync.md`; gate always takes `:1135` "proceed but note state drift risk" | implement (repoint to `sync-graph`/`sync-jira`) | 11 |
| FIC-6 | defrag's inbound-reference audit (`defrag/SKILL.md:79-253`) + correction/figure audit (`:254-291`) | Zero reference/backlink code in `defrag/scripts/*.ts`; **213** of 319 SKILL.md lines are unimplemented LLM procedure (`253−79+1` plus `291−254+1`) | accept-with-justification (relabel; mark which parts are code) | 4 |
| FIC-7 | Seven non-test scripts in `research`/`decisions`/`spec` (**808** lines: 101 + 171 + 150 + 145 + 80 + 80 + 81) | No markdown file names any script; `scripts/` appears in zero of the slice's **16** markdown files (research 5, decisions 5, spec 6) | implement (wiring) | 7 |
| FIC-8 | `end`'s `run-pre-flight.ts` + `validate-spec-done.ts`, fully implemented and tested | Named in no skill document; `/end` never invokes them | implement (wiring) | 4 |
| FIC-9 | `session-init` reads the canonical template from SESSION-PROTOCOL.md — `session-init/SKILL.md:84-94,37,220,300,313` | It hardcodes the checklist at `new_session_log.ts:108-172`; `newPopulatedSessionLog` is dead code with only test callers | delete | 10 |
| FIC-10 | `plan.ts` safely splits a PLAN note | Extraction is a line slice; mutation is regex find/replace; part IDs are the designated mutation surface; `PlanNoteSchema` never runs in the decompose path | delete (`--split`) + implement (3 adapter additions) | 5 |
| FIC-11 | Renderer's `## Tasks`, `## Pending User Decisions`, `## Editor Mirror IDs` — `renderers/plan-note.ts:237-259,261-285,287-301` | Authored by nobody, read by nobody, present in 0 of 7 real PLANs; `const backlog = plan.tasks.filter((_t) => false)` | delete | 5 |
| FIC-12 | Plan-driven rehydration (D-17) | `skills/plan` has none; `completing_session` exists and nothing follows it | implement | 10 |
| FIC-13 | Change-request re-entry lifecycle (D-21) | Zero representation in `research`, `decisions`, `spec` | implement | 8 |
| FIC-14 | Contract 1 — `set-part-done` signature cited in four files | `set-part-done.ts:77-83` needs `--plan-path`, `--owning-session`, `--at-event`; every documented invocation exits 2 | implement | 5 |
| FIC-15 | Four scripts operate on PLAN notes; six skills claim "Defense in depth" | `parsePlanNote` fails 7 of 7 real PLANs | implement | 5 |
| FIC-16 | `render-plan-note.ts` "regenerates the two derived sections" — `renderers/plan-note.ts:22-24` | It regenerates the entire document and destroys `## Risks`, `## Workflow Plan`, `## Decision Log`, `## Progress Log` and every phase H2 | implement (docstring **and** section model, before the parser) | 5 |

**Tier 2 — fictions in specs and templates**

| ID | Claim | Reality | Tag | Acted on in |
|---|---|---|---|---|
| FIC-17 | `#### Milestone N.M` 8-field blocks — `NOTE-TEMPLATES.md:706`, `STRUCTURES.md:90-158` | Zero occurrences in 7 real PLANs | delete | 11 |
| FIC-18 | Fixed `## Progress Dashboard` columns — `STRUCTURES.md:82`, `NOTE-TEMPLATES.md:677-680` | Six different header sets; three named columns appear nowhere | delete | 11 |
| FIC-19 | `## Effort Tracking` 3-mode table — `STRUCTURES.md:86`, `NOTE-TEMPLATES.md:775-782` | Present in 1 of 7 PLANs and empty there | delete | 11 |
| FIC-20 | PLAN enum `NOT STARTED / IN PROGRESS / COMPLETE` — `STRUCTURES.md:197` | Zero occurrences | delete | 11 |
| FIC-21 | PLAN title form `PLAN-NNN-SPEC-NNN:` — `NOTE-TEMPLATES.md:661` | Zero occurrences | delete | 11 |
| FIC-22 | PRD `## Success Metrics` + `## Non-Goals` — `NOTE-TEMPLATES.md:802` | Zero occurrences across all three real PRDs | delete | 7 |
| FIC-23 | `## Implementation Sequence` — `STRUCTURES.md:83`, `NOTE-TEMPLATES.md:682` | Absent everywhere; replaced by phase H2 buckets | delete | 11 |
| FIC-24 | `[[QA-NNN: Phase N Validation]]` wikilinks required — `STRUCTURES.md:162` (**not** `:220`, which is the unrelated `qa_ref` field row *"optional `[[QA-NNN: ...]]` wikilink \| Required when qa item is DONE or FAILED"*) | Zero occurrences; the parser rejects the prescribed form; every QA note is graph-invisible | implement differently (`validated_by` relation) | 11 |
| FIC-25 | `STRUCTURES §4.13 QA note structure` (`:620`) | Unreachable — CONVENTIONS `:91,420` and `CLAUDE.md:82` index STRUCTURES as "§4.5-§4.12" | implement (fix the index) | 11 |
| FIC-26 | `STRUCTURES.md:556` "DESIGN Component Diagrams (Section 4.8)" | §4.8 is TASK; there is no DESIGN section in STRUCTURES | implement | 11 |
| FIC-27 | DESIGN `## Compliance` gated by `validateDesignComplianceClaim` | Absent from both templates | implement | 8 |
| FIC-28 | `AGENTS.md:94` four registries "populated dynamically" | Never populated | delete | 12 |
| FIC-29 | `brain/instructions/AGENTS.md` | 1 byte (`wc -c` = 1). And the link is worse than advertised: `brain/rules/SESSION-PROTOCOL.md:651` is `- [AGENTS.md](../AGENTS.md) - Entry point and coordination rules`, which resolves from `brain/rules/` to `brain/AGENTS.md` — **a path that does not exist**. It does not link `instructions/AGENTS.md` at all, so this is two defects: a 1-byte stub nothing points at, and a broken relative link | delete | 11 |
| FIC-30 | `AGENT-SYSTEM.md:43` "19 specialized agents" | 27 agent files; 8 absent from the catalog and invisible to routing | implement (catalog 27) | 11 |

**Tier 3 — fictions in code and configuration**

| ID | Claim | Reality | Tag | Acted on in |
|---|---|---|---|---|
| FIC-31 | `session.traceId` / `parentSessionId` recording — `orchestrator.md:273-280` | No session template has those fields — but the **receiver exists**: `session-init/scripts/new_session_log_json.ts:32,33,130,131` | implement | 10 |
| FIC-32 | Adapter seam metadata — `core/base-markdown-adapter.ts:14-16`, `plan.ts:59,67` | No method body in any adapter reads any of them | delete | 5 |
| FIC-33 | `PlanAdapter.extractBySectionName` (`plan.ts:127-144`) | Unreachable, and the proof is in the type: it is `private` and called only from `plan.ts:107` when `range.section` is set, but `LineRange` (`core/types.ts:2-5`) declares **only `start` and `end`** — there is no `section` field to populate. `decompose.ts:294` calls `adapter.extractByRange(content, range)`, and `decompose.ts:265` records why: *"The adapter contract (ADR-002 D-2) exposes extractByRange only; there is no identifier-driven extraction path to fall back on."* | delete | 5 |
| FIC-34 | ADR-002's cross-source safeguard (`:262,523,571`) | `ADR-004:24` — the interface, class and schema "None of these exist in code" | delete (correct the ADR via Brain MCP) | 11 |
| FIC-35 | `defrag --basic-memory` — parsed, stored, documented, tested | Never read; `AuditOptions` has no `basicMemory` field | delete | 4 |
| FIC-36 | `defrag.ts:8-9` docstring exit codes | `:160` does the opposite: `result.candidates.length > 0 ? 2 : 0` | implement (fix docstring) | 4 |
| FIC-37 | `defrag/SKILL.md:65-66` split "with multi-entity content" | `audit.ts:163` is `if (e.lineCount > t.lineMax)` | implement or delete the qualifier | 4 |
| FIC-38 | `defrag/SKILL.md:74` "grouped markdown" report | `scripts/report.ts:38-76` emits a specific test-pinned shape SKILL.md never documents | implement (document it) | 4 |
| FIC-39 | `ingest/SKILL.md:52-61` six verification claims | Item 1 is an identity transform in an empty `if`; item 4 is two comment lines; verification runs after the write with no rollback | delete | 4 |
| FIC-40 | `ingest/SKILL.md:74-76` "may augment to meet minimum counts" | `assemble.ts:112-117` never augments | delete | 4 |
| FIC-41 | Brain `memory` Tier 2 Episodic / Tier 3 Causal — `memory/SKILL.md:652-721` | Same file marks both `[FUTURE]` at `:103,108`; 70 lines injected into 22 agents at startup | delete | 6 |
| FIC-42 | `memory/references/**` (9 files, 4,810 lines) Serena/Forgetful/PowerShell architecture | `memory/SKILL.md:226` deprecates it outright | delete | 6 |
| FIC-43 | `feedback_drift_detector_hook` full hook spec | `:24` — *"**NOT registered in Claude Code** (de-registered 2026-06-30 along with the rest of the hook set)."* Quote through "hook set" or use an ellipsis; closing the paren early makes the string unfindable by `grep -F` | delete | 12 |
| FIC-44 | `AGENTS.md:61` *"the only hook registered in Claude Code"*, restated at `:111` (`post-compact` \| **Registered**) | `settings.json:163-204` registers **four hook commands across three events** — Notification/osascript `:170`, SessionStart/`session-start-init.ts` `:181`, SessionStart/`post-compact.ts` `:186`, PreCompact/`pre-compact.ts` `:198`. The narrower range `:175-203` covers only three of the four | delete | 12 |
| ~~FIC-45~~ | ~~`brain/commands/memory-documentary.md` steps 3-4 and `research.md` action phase require `Bash`/`Write` their `allowed-tools` do not grant~~ | **STRUCK — not a fiction.** The frontmatter facts are right (`memory-documentary.md:4` grants `mcp__plugin_brain_brain__*, mcp__context7__*, WebSearch, Grep, Glob, Read, Skill`; `research.md:3` grants `WebSearch, WebFetch, mcp__plugin_brain_brain__*, Skill`; neither lists `Bash` or `Write`). But `allowed-tools` **pre-approves and never restricts** — *"It does not restrict which tools are available: every tool remains callable"* — so a missing grant produces a permission prompt, not an inoperative step. Nothing here is broken. Record it as a **UX note** for prompt 11 (*"these two commands will prompt mid-run; granting `Bash`/`Write` would make them quiet"*) and **exclude it from every total** | — (struck) | none |
| FIC-46 | `pr-comment-responder.md` six BLOCKING gates | Gate 1 greps a file no step creates → always exit 1; Gate 4 `^\[x\]` never matches `- [x]`; ~20 corrupted skill paths | delete | 11 |
| FIC-47 | `feedback_checkbox_sweep_before_part_done.md:12` — validators "already exist … unwired" | Confirmed: the schema layer exists and the skills do not call it | delete (the memories self-document the gap and go) | 12 |
| FIC-48 | The five HTML docs — `documentation/{index,ai,cli,setup,workflows}.html`, **not** `skills/docs/*.html`, which contains no HTML at all — describe a system with no templates, taxonomy, frontmatter, permalinks, wikilinks, memory layer or CLAUDE.md | They document none of the 5,904 lines of home specs | accept-with-justification — **this is target state, not defect** | 11 |

**Totals to check your work against, and the tie-break rule that makes them reconcile.**

Two rows are dual-tagged — FIC-2 (`implement (verbatim field) + delete (six H4s)`) and FIC-10 (`delete (--split) + implement (3 adapter additions)`). Earlier statements of this register gave a 27/19/2 split with no rule for those two, and 27/19/2 does not add up under any consistent reading. **The rule: a dual-tagged row counts exactly once, under the disposition listed first.** FIC-2 → implement. FIC-10 → delete.

| Disposition | Count |
|---|---|
| delete | **26** |
| implement | **19** |
| accept-with-justification | **2** |
| **Live total** | **47** |
| struck (FIC-45, excluded) | 1 |

Cross-check with a second, deliberately different tally so an arithmetic slip cannot hide: counting *actions* rather than rows, **27 rows carry a delete action** and **20 carry an implement action** (the two dual-tagged rows appear in both). If your census disagrees with either table, report the disagreement and your own numbers rather than adopting mine.

Two notes on presentation. Keep FIC-45 in the register as a struck row with the reasoning intact — a deleted row invites someone to rediscover it and re-file it as a fiction, which is exactly what happened the first time. And where a row's tag reads "implement or delete" (FIC-37), it counts as implement under the same first-listed rule; flag it as genuinely undecided so prompt 4 knows it is choosing, not executing.

Record at the top of the register that **acting on it is not this prompt's job**. Prompt 4 owns the defrag/ingest fictions, prompt 5 the composition-library and PLAN-model fictions, prompt 11 the template and brain-agent fictions, prompt 12 the terminal deletions; prompts 2, 6, 7, 8 and 10 own one cluster each. Each row's "Acted on in" column is the assignment. FIC-45's assignment to prompt 11 is **retired** by the strike — record that explicitly, so prompt 11 does not go looking for a fiction that is not there, and so the UX note travels instead.

Also note the three fictions already settled by decision, so nobody reopens them: `defrag`'s `## Coexistence` (4 sites across 2 skills — void, `defrag` is the only `defrag`), `/plan --split` (removed, and independently schema-invalid), and `feedback_brain_v2_highspot_private_only` (self-VOIDed at `:13`).

---

## Step 9 — Diff the three "stale" home specs [HS-DIFF3]

Read-only. **Delete nothing.** `~/AGENT-SYSTEM.md`, `~/AGENT-INSTRUCTIONS.md` and `~/SESSION-PROTOCOL.md` each have a fork under `brain/rules/`. Prompt 11 rules on them and prompt 12 executes; both need to know exactly what is unique to each side.

Established facts — do not re-derive these, verify them and move on:

| File | Home copy | Fork |
|---|---|---|
| `AGENT-SYSTEM.md` | 1,478 lines; `version: 3.0` at `:3`; `last_updated: 2026-02-10` at `:4` | `brain/rules/AGENT-SYSTEM.md`, 1,233 lines, differs by **479 lines** — **362 present only in the home copy, 117 only in the fork** — while carrying the same version stamp |
| `AGENT-INSTRUCTIONS.md` | 441 lines; **no date anywhere**; "Version 3.0" only as a trailing italic | `brain/rules/AGENT-INSTRUCTIONS.md`, 465 lines, differs by **142 lines** — **59 home-only, 83 fork-only** — same stamp. Note the fork is the *longer* file here, the opposite of AGENT-SYSTEM |
| `SESSION-PROTOCOL.md` | 657 lines; `> **Last Updated**: 2026-02-10` at `:5`; no `version:` field; "Version 3.0" is the trailing italic at `:657` | **Byte-identical.** md5 `b6432f02ffd059b023431c5e3e269ea5` both sides, `diff` empty, 657 lines each, both self-declare `> **Status**: Canonical Source of Truth` at `:3` |

Do not ask me whether the SESSION-PROTOCOL copies are identical. They are. That is **one definition duplicated, not two**, which means reconciling it is one edit, not a merge.

The AGENT-* pair is the opposite case and the interesting one: both carry **post-fork edits under an unchanged version stamp**. Be exact about which line, because I got this wrong once and the wrong version is easy to repeat. At `AGENT-SYSTEM.md:315-316` only **`:316` diverges** — home reads `- QA notes in \`qa/QA-NNN-*.md\`` where the fork reads `- Test reports in \`qa/NNN-*-test-report.md\``; `:315` is byte-identical on both sides. And the rename is **undated**: `grep -n "2026-05" ~/AGENT-SYSTEM.md` returns **zero lines**, so any claim that it "carries a 2026-05-21 rename" is unsupported by the file. The second post-fork edit is the `#### state-sync` agent block at `:637-666`. Neither is reflected in the stamp. That is a falsified identity, not drift, and it means "they're both 3.0 so they're the same" is a trap.

Produce, per file: content unique to the home copy, content unique to the `brain/rules/` fork, and a one-line judgement on whether the difference looks like a deliberate divergence or an un-swept edit. Two further facts worth carrying into the report because prompt 11 will need them.

First, `SESSION-PROTOCOL.md` is the heaviest normative file in the entire corpus, and the count needs its case-sensitivity stated or it means nothing: **103 `MUST` (case-sensitive, and 15 of those 103 are the `MUST NOT` occurrences — they are not a separate 15 on top), 26 `SHOULD` (2 of them `SHOULD NOT`), and 6 `BLOCKING` case-sensitive / 11 counting lowercase "blocking"**. Earlier versions of this figure silently mixed case-sensitivity and double-counted `MUST NOT` inside `MUST`, producing "103/15/26/11" as if it were four disjoint buckets. Re-run it and state your method.

Second, all three files contain **zero** `feedback_*` references — so deleting them removes none of the auto-memory coupling. Anyone who told you consolidation is "largely deletion" was reasoning from the version stamps, and the stamps are wrong.

---

## Independent evaluation

P4-4 is armed from this point forward. This prompt edits no skill body — `~/.claude/memory/**`, the home specs and `shared/composition/src/**` are not skills, and none of them carries a `SKILL.md` — so there is nothing to evaluate yet and no `quick_validate` to run. State that explicitly in your report rather than skipping the section, and confirm three things:

1. The snapshot layout makes `create-skill`'s improve-an-existing-skill baseline reachable for **every** skill in the target list, per `eval-workflow.md:69`.
2. `skill-reviewer` either resolves or does not. If it does not, record the fallback now — create-skill's inline fresh-eyes review (`create-skill/SKILL.md:128`) — so no later prompt discovers it mid-run and improvises.
3. **No file you touched in this prompt was a `SKILL.md`.** If that turns out to be false — if any repair lands inside a skill directory — then the skill-touching gate applies to it and this prompt's `## Done means` gains two items: `python -m scripts.quick_validate <skill-dir>` passes, and a `run_loop`/benchmark comparison against the Step 1 snapshot shows no regression. Prompts 6 through 11 all carry that gate because they all edit skills; this one carries it only conditionally, and I want the condition checked rather than assumed.

---

## Git

Verify the branch before anything else: `git branch --show-current` in each working tree you touch. This prompt spans more than one tree, and at least one of them (`~/.claude/memory/`) may not be a git repo at all — check, do not assume, and if a tree is not versioned, say so plainly: for that tree the Step 1 snapshot is the only rollback that exists.

One branch for this prompt's work in each versioned tree. Commit in coherent steps — max 5 files or one logical change. Suggested boundaries: regrowth clauses; index fixes; the six fenced wikilink sites; the remaining ten wikilink sites; the thirteen TypeScript citations. Leave everything unmerged for my review. **Do not push.** No `--no-verify`, no force-push. **No indication of AI contribution in any commit message.**

---

## Done means

- [ ] Snapshot exists off-tree, at a dated path, covering the **decided target set** (full brain + targeted rest, per the review ruling — no snapshot-scope question was asked), with each skill at `<workspace>/skill-snapshot/<skill-name>/`; `BASELINE.md` records the exact `cp -r` commands, the target list, and the three `eval-workflow.md` facts.
- [ ] **The Step 1.5 map — all four tables — was delivered to me and I answered before the first edit landed.** No edit precedes that answer.
- [ ] `feedback_session_protocol.md:377` carries the lifecycle-ownership routing rule (persist only what no lifecycle skill owns; propose skill edits otherwise) and flags that the rule must survive the prompt-10 migration; the persistence leg in `feedback_inline_reflect_capture.md` at `:13`, `:118` and `:135-137` carries the same condition; the reflect→retrospective chain is intact; nothing in either file was deleted.
- [ ] Settings are untouched: all six generation/loading flags (`settings.json:305-307`, `:336-338`) are recorded in `BASELINE.md` at their current values, and the report states that prompt 12's delta-sweep covers files newer than the Step 3 inventory.
- [ ] The `~/Desktop/auto-memories` project-history tree is exported into the working corpus and labelled as separate from the memory layer — **or its absence at that exact path is reported explicitly, with no substitute assembled from elsewhere.**
- [ ] Both `~/Desktop/protocols/SKILL-0{12,17}-*.md` are retrieved into the corpus, or their absence is reported explicitly.
- [ ] The measured memory-layer scale is reported: 119 files / 7,081 lines / 0 subdirectories / 113 / 2 / 3 / 1 / 0.
- [ ] Each of the four 2026-04-21 redirect stubs is marked `VERIFIED-LANDED` or `NOT-LANDED` **against CONVENTIONS, by quotation**, plus a pair-by-pair verdict on the `feedback_bidirectional_relations` inverse-pairs table against CONVENTIONS `:406-416`.
- [ ] Index defects 1, 2 and 3 in Step 5 are fixed; defect 4 is **verified already-correct and left alone**; defects 5 and 6 are recorded, including the `MEMORY.md` heading-string dependency at `feedback_post_compaction_rehydration_protocol.md:53`.
- [ ] All 15 non-deferred wikilink sites are de-wikilinked with the rule stated inline; `NOTE-TEMPLATES.md:1048` carries a `TODO` naming prompt 10, written inside its fence and immediately above the `**Column semantics**` line.
- [ ] The wikilink gate passes **in both forms**. Raw: `grep -rn "\[\[feedback_" ~/*.md` returns exactly **4** lines — `KNOWLEDGE-GRAPH-CONVENTIONS.md:478`, `:481`, `:602` and `NOTE-TEMPLATES.md:1048` — down from 19. Carved out: `grep -rn "\[\[feedback_" ~/*.md | grep -v "^/Users/peter.kloss/KNOWLEDGE-GRAPH-CONVENTIONS.md:\(478\|481\|602\):"` returns exactly **1** line, `NOTE-TEMPLATES.md:1048`. The three CONVENTIONS lines are the **examples that define the forbidden-form rule** and are permanently exempt — the report names all three by line and states that they must survive this prompt and every later one.
- [ ] `grep -rn "feedback_" /Users/peter.kloss/Dev/ACMElabs/skills/shared/` returns 0, down from 14, including the test comment at `tests/plan-note-schema.test.ts:36`.
- [ ] The composition test suite is green — reported as a pass/fail count against the 458/458 baseline — and the report states that this proves the edits are non-breaking and nothing about production data (P4-14).
- [ ] `FICTION-REGISTER.md` lists the **47** live entries with file:line and a disposition tag plus FIC-45 recorded as struck-and-excluded; totals reconcile to **26 delete / 19 implement / 2 accept = 47** under the stated first-listed-disposition tie-break, with the cross-check tally (27 delete actions / 20 implement actions) also shown; each row names the prompt that acts on it; and the register states that this prompt acts on none of them.
- [ ] The HS-DIFF3 report names, per file, the content unique to the home copy and unique to the `brain/rules/` fork with per-side line counts, states the SESSION-PROTOCOL byte-identity as fact, records the normative counts **with their case-sensitivity method stated**, and records the zero `feedback_*` finding.
- [ ] Every number in the final report was re-measured, and every measurement that disagreed with a figure I gave in this prompt is called out as a disagreement rather than silently adopted in either direction.
- [ ] Branch created per versioned tree, commits coherent, nothing pushed, no AI attribution in any message.
- [ ] No `rm` was run, or every `rm` that was run is listed with the prompt I answered; no deletion mechanism was substituted to avoid the prompt.
- [ ] System behaviour is unchanged. Nothing in this prompt alters what any skill or agent does at runtime.

---

## Corrections to anything you may have seen before

If you have been handed an earlier version of this work, six things in it are wrong.

0. **"The auto-memory layer is being phased out entirely; the end state is auto-memories and home specs gone."** → The layer is being **thinned** (owner revision, 2026-07-27): lifecycle-owned content migrates out and is deleted; non-lifecycle content stays and keeps being served, with generation and loading flags untouched. `~/CLAUDE.md` and `~/AGENTS.md` are thinned to pointers plus non-lifecycle content, not deleted. Read any later prompt's "phase-out", "retirement" or "empty directory" language as scoped to the lifecycle subset only.

1. **"171 files, ~17,280 lines — roughly 140 `feedback_*`, 6 `project_*`, 6 `reference_*`, plus repeated `MEMORY.md` and `summary.md` files in subdirectories"** and the matching gate "All 171 auto-memories are classified." → **119 files / 7,081 lines / zero subdirectories / zero `summary.md`.** The 171 figure counts the separate `~/Desktop` project-history tree. A checklist demanding 171 classifications cannot be satisfied.
2. **"At least six sites inject `[[feedback_ai_dominant_estimates]]`."** → **16 sites across four memory names.** Gating only on `ai_dominant_estimates` ships two dangling sources for `feedback_session_protocol` — the exact memory prompt 10 migrates — and two more inside CONVENTIONS' own `## 9. Pairs with`.
3. **"Check whether the two SESSION-PROTOCOL copies are byte-identical."** → Do not check. They are: md5 `b6432f02ffd059b023431c5e3e269ea5`, empty `diff`, 657 lines each.
4. **"≥6 wikilink sites in NOTE-TEMPLATES and STRUCTURES."** → **14 in those two files** (NOTE-TEMPLATES 6 at `:420, 430, 692, 782, 920, 1048`; STRUCTURES 8 at `:86, 113, 315, 348, 365, 379, 401, 418`) **plus 2 in CONVENTIONS** at `:645, 646`; 16 total. If you have seen "12 in those two files plus 4 elsewhere" — an earlier version of *this* prompt said exactly that — it contradicts the Step 6 enumeration in the same document. The enumeration is right; the summary was wrong.
5. **Five things appear in no earlier version at all** and are new here: the thirteen TypeScript citations (fourteen counting the test comment), the redirect-stub verification, the out-of-corpus retrieval, the six index defects, and the `feedback_*` finding inside `docs/**`.

And two corrections to earlier versions of **this** prompt, which you may also have been handed:

- **FIC-45 was registered as a fiction and is not one.** See the struck row in Step 8. The register is 47 live entries, not 48, and its totals are 26/19/2 under a stated tie-break — not 27/19/2, which never reconciled.
- **"`MEMORY.md:32` still indexes `/sync-graph` as guidance."** → It does not; it already says to reconcile by hand. Step 5 defect 4 is a verify-and-leave-alone, not a fix.

Finally, one mechanic that is easy to get backwards, and which is the reason FIC-45 was struck: `allowed-tools` in skill and command frontmatter **pre-approves; it never restricts**. The docs are explicit — *"Tools Claude can use without asking permission during the turn that invokes this skill"* and *"It does not restrict which tools are available: every tool remains callable."* Only `disallowed-tools` removes tools from the pool. So nothing in this programme is broken by a missing tool grant; a missing grant only means a permission prompt. **Never diagnose a step as inoperative because its `allowed-tools` lacks a tool.** And the grant clears when I send my next message, so it is not a mechanism for standing permission across a multi-turn interview — permission-settings allow rules are, which is also where `Bash(rm:*)` sits on the `ask` list (`settings.json:158`) and why deletions prompt.
