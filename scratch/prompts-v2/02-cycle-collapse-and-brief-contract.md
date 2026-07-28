# Eight copies of one cycle, and the brief that never came from the PLAN

**Execution contract (R-31): before doing anything else, read `scratch/prompts-v2/RUN-CONTRACT.md` — it sits beside this file — and run this entire prompt in its collaborative mode: granular, guided, opinions labeled, no assumptions. It overrides any "autonomous" framing below.**

I want one thing collapsed and one lie deleted, in `/Users/peter.kloss/Dev/ACMElabs/skills`.

The `## Rigid per-TASK build+QA cycle` (steps a–u) and its three satellite sections — `## Checkbox-as-contract`, `## Schema-validated agent-claim verification`, `## Defense in depth` — exist **seven times inside the skills repo**, roughly 330 duplicated lines, and they have already started to decay. There is an **eighth full copy outside the repo**, in the auto-memory layer, which this prompt does not edit but must hand off correctly; Step 0 covers it. Separately, six prose sites in the repo tell you that the PLAN note carries the per-TASK dispatch brief. That is false, the code refutes it, and the thing those sites describe is already built and shipping somewhere else.

This is the cheapest high-leverage edit in the whole programme. Five later prompts edit these same seven files; every one of them gets easier the moment this lands. So it lands early and it lands clean.

**HUMAN ATTENTION: autonomous.** **Zero `AskUserQuestion` rounds** — both questions this prompt used to carry were answered during review: Q-a (canonical home) is `build/references/per-task-build-qa-cycle.md`, and Q-b resolved to *rewrite the false enforcement claims, wire nothing* (the valid/invalid judgment is the QA agent's alone — R-16). One **map-before-edit checkpoint** remains, where you stop and wait for me (Step 0.5). If a question forms in your head, that means this prompt is wrong about something: say what, rather than spending a round on it.

**Work units covered here:** `[BUILD-CYCLE-DEDUP]` (Steps 1 and 2), `[BUILD-PATTERN2-FIX]` (Step 3), `[BUILD-BRIEF-DOC]` (Step 0 diagnosis half and Step 4). Step 5 rewrites the false enforcement claims per the review ruling (R-16) — **nothing in this prompt changes behaviour**. The tags are inline on each step heading so coverage is auditable from the prompt text without re-reading it.

---

## Standing rules

These hold for the entire session. They are not preferences.

**P4-1 — Every question goes through `AskUserQuestion`.** No exceptions, no "this is too conversational" carve-out. Maximum **4 authored options per question**; "Other" is appended automatically, so **never author an "Other" or a "none of these"** — doing so wastes a slot and shows me two. More than four candidates splits across **consecutive rounds**, never a fifth option. Say in the question text that the appended "Other" is where I write my own answer; nobody ever tells me that and I keep forgetting it exists. Correction to carry: this cap is a documentation fact, not a repo fact. `AskUserQuestion` appears exactly once in 5,904 lines of my home specs (`~/CLAUDE.md:37`) with no cap stated. Be precise about my memory rather than calling it wrong: `feedback_ask_protocol.md:34` — *"Batch up to 4 per `AskUserQuestion` call (**tool's hard cap**)"* — is four *questions per call*, a real cap on a different axis, so the line is accurate on its own terms. The defect is that it collides with `feedback_one_decision_at_a_time.md:12` (*"Every AskUserQuestion shows ONE thing to decide, not a batch"*). Treat the option cap as binding and the collision as the thing to fix on migration.

**P4-2 — grill-me's "never bundle" is satisfied, not violated,** by one-section-per-question with one question in flight. A multiselect decomposing a *single* section is not several unrelated decisions stacked.

**P4-3 — Author the moment it locks.** Never defer: not to the end of a phase, not to the phase that owns the artifact type, not to the end of a turn.

**P4-4 — Independent evaluation mandate on every skill you touch.** Evaluate each skill *as if handed it cold with no brief* — not an audit against this prompt or against a checklist. Deliver **ranked findings, each with a recommended action and a one-line rationale**. Apply nothing without my approval. Give me an honest short list rather than a padded one.

**P4-5 — Full create-skill lifecycle, including the empirical Stages 7–9, baselined before the first edit.** The baseline for this programme was taken in prompt 1 and points at an off-tree snapshot — `create-skill/references/eval-workflow.md:69`, complete sentence: *"**Improving an existing skill:** the OLD version. Before editing, snapshot it (`cp -r <skill-path> <workspace>/skill-snapshot/`), point the baseline subagent at the snapshot, and save to `old_skill/outputs/`."* `:53` forbids spawning with-skill runs and circling back for baselines; `:85` — `timing.json` is capture-once and *"this is the only chance to capture it; it is not persisted elsewhere."* Stage 9's `run_loop` **requires `--model`** (mandatory, no default) and the `claude` CLI; skip Stage 9 if either is absent. `run_eval.py` mutates the live project. `skill-creator@claude-plugins-official` (`settings.json:257`) and `plugin-eval@claude-code-workflows` (`:241`) are both **`false`**; `create-skill` and `grill-me` are user-level skills under `/Users/peter.kloss/.claude/skills/`. Verify `skill-reviewer` resolves before making it a gate; fall back to create-skill's inline fresh-eyes review (`create-skill/SKILL.md:128`).

**This prompt edits seven `SKILL.md` files, so the skill-touching gate is live and is not optional.** `create-skill/SKILL.md:128` makes it Tier 1 — *"**Tier 1 (always):** `python -m scripts.quick_validate <skill-dir>` for the mechanical frontmatter gate, plus the authoring checklist and a fresh-eyes self-review"*. Run `quick_validate` against every skill directory you touch, and run a benchmark comparison against the prompt-1 snapshot for any skill whose `description` or `SKILL.md` body changes materially. Both are `## Done means` items below. A skill whose spine shrinks by fifty lines and whose trigger behaviour was never re-measured is a rewrite, not a refactor.

**P4-6 — Binary tool rule, routed by artifact and not by phase.** `docs/**` → Brain MCP. Non-graph files — skill content, reference files, config, `.ts` — → `Read`/`Edit`/`Write`, on which Brain MCP is **forbidden**. Normative source `KNOWLEDGE-GRAPH-CONVENTIONS.md:184-186`, hardened at `:202`: *"Rule applies at ALL agent tiers… No exceptions."* Almost everything in this prompt is skill text and TypeScript, so almost everything uses generic file tools. The two exceptions are named in Step 4.

**P4-7 — Git.** Verify the branch first (`git branch --show-current`). One branch for this prompt. Commit in coherent steps — max 5 files or one logical change. Leave it unmerged for my review. **Do not push.** No `--no-verify`, no force-push. **No indication of AI contribution in any commit message.**

**P4-8 — My standing principle.** *"I don't wanna not do a thing because it's going to require updating something in a bunch of places… I wanna do something because it's the right decision to make."* Update cost is work, not an argument. Recommend what is right, tell me the work it implies, and never let the tally become the reason.

**P4-9 — Nothing deleted in bulk; nothing deleted before its destination is live and verified.** Verification means read-back or exercise, not assertion. This prompt deletes a great deal — five whole four-section blocks — so hold the ordering: canonical file committed and read back **first**, deletions **second**. Operational note: **`Bash(rm:*)` is on the `ask` list in my permissions block (`settings.json:158`)**, so any whole-file removal prompts me even though `defaultMode` is `bypassPermissions` (`:160`) — an explicit `ask` rule beats the default mode. Everything this prompt removes is *lines inside files that survive*, done with `Edit`, which never touches `rm`; if you find yourself reaching for `rm`, stop, because that means you are deleting a file this prompt did not authorise. **Do not route around the prompt** — no `find -delete`, no `mv` to a scratch path as a stand-in, no alias. A blocked deletion is reported as blocked (P4-12), not replaced with a different mechanism.

**P4-10 — Read before designing, and say what you read. Do not sample.**

**P4-11 — Precedence, published once.** Skills plugin > brain plugin > home specs > auto-memories. Prompt 11 publishes it; every prompt states it.

**P4-12 — Fail closed. Never "document a rationale and proceed."** Do not restate a headline count: earlier drafts asserted "27 rationale-and-proceed branches and 34 escape hatches" and neither survives a grep — `grep -rni "rationale.*proceed"` over the corpus returns **2**, `grep -rni "escape hatch"` returns **7 text hits**, `grep -rni "rationale-and-proceed"` returns **0**. The class is real and the number was invented. The nearest measured figure is `ANALYSIS-005:64` — *"**23 of 27 enumerated gates fully phantom**"* — which counts *gates*, so do not press it into service as a rationale-branch count. If you want a number, derive it and cite the command. The counter-models to imitate: `build/SKILL.md:257` with **`build/references/exit-gates.md:3`** — *"'I'll fix in review' is NOT acceptable rationale"* — note the path, because that file is under `build/references/` and **not** `end/references/`, which holds only `end-checklist.md` and `pr-creation.md`. And `brain/agents/orchestrator.md:1890-1892`, where `:1890` reads *"If the validator cannot run (environment error, script missing):"* and `:1892` is the bullet *"**DO NOT claim completion**"*. `decompose`/`recompose`/`defrag` have none; `decompose:768` is *"Never skip adjudication."*

**P4-13 — Do not build what already ships.** Three things exist, fully built, with **zero non-test, non-hook callers** — that qualifier is the accurate one: `end/scripts/run-pre-flight.ts` (290 lines, the structural validator), `validateIntegrityFloor` (`core/validate.ts:32`, reached only from `tests/plan-integrity-floor.test.ts`), and the brief-rendering inversion (`build/scripts/dispatch-implementer.ts:44-73`, `dispatch-qa.ts:48-88`). `docs/analysis/ANALYSIS-005-skills-ecosystem-enforcement-wiring-deep-analysis.md:61` records *"**0 of 17 lifecycle scripts invoked by any SKILL.md** … 6 DESCRIBED-NOT-INVOKED … 11 ORPHAN"*; `:62` adds *"All 10 claim-validators have zero non-test, non-hook callers"*. Wire, do not rebuild. **The third of those three is the subject of Step 4.**

**P4-14 — Every claim of mechanical enforcement in this corpus is currently a fiction.** `parsePlanNote` fails **7 of 7** of my real PLANs. The composition suite is entirely synthetic and its size is **458 tests, 458 pass / 0 fail** at the last recorded run (`docs/qa/QA-030-SPEC-002-reconcile-session-adapter-design-001-drift.md:35`, `:38`). Discard "82 passing composition tests" if you have seen it — it is sourced nowhere. And the deliberate-fixture caveat is a *plan-skill script test*, not a composition test: `skills/plan/scripts/render-plan-note.test.ts:10-11` — *"re-renders without drift. A spec-phase part in IN_PROGRESS keeps the fixture / free of build_workflow_items (which build.SPEC-NNN parts would require)."* Until prompt 5 lands, **no text you write may assert that a schema, validator or mutation "enforces" anything against production data.**

---

## Before you touch anything

**This runs after prompt 1 (`freeze-and-baseline`), and it is blocked without it.** Two things from prompt 1 are preconditions: the off-tree `cp -r` snapshot that create-skill's eval baseline points at (P4-5 — no skill may be edited without it), and the fiction register. **FIC-1 in that register is this prompt's central item**: *"PLAN carries per-TASK dispatch instructions"*, disposition **delete**, sites `plan/SKILL.md:26-28,39,48`; `build/SKILL.md:63`; `review/SKILL.md:325,334`; `end/SKILL.md:373,382`; `PLAN-004:244`; `PLAN-003:240`. Confirm both preconditions before your first edit and say so. If the snapshot does not exist, stop and tell me.

**Authority order, throughout: the reconciliation map > the other maps > any finding you have seen restated from an earlier conversation ledger.** That ledger's findings F-1, F-3, F-6, F-8, F-9, F-10, **F-11**, F-13, F-14, F-16, F-18, F-19 were refuted or materially corrected. F-11 is the one that matters here, and Step 0 gives you its corrected text. If you have seen a "Prompt C" that says the PLAN note is the dispatch-brief carrier, that document is retired and its central premise is false.

**`allowed-tools` pre-approves; it never restricts.** The docs are explicit — *"Tools Claude can use without asking permission during the turn that invokes this skill"*, and *"It does not restrict which tools are available: every tool remains callable."* Only `disallowed-tools` removes anything from the pool. So nothing in this work is blocked by a missing tool grant; a missing grant only means a permission prompt. **Never diagnose a step, a command or a skill as broken because its `allowed-tools` lacks a tool** — that reasoning produced a whole fiction-register entry in prompt 1 that had to be struck. The grant also clears when I send my next message, so it is not standing permission across an interview; permission-settings rules are, which is where `Bash(rm:*)` sits on the `ask` list (`settings.json:158`).

**Every line number below is as of the corpus snapshot, pre-edit.** The moment you make your first edit, line numbers shift. **Re-locate by heading text and quoted string, never by remembered line number**, and say which you used.

**Read these in full before you design anything, and tell me what you read.** All seven `SKILL.md` files named in Step 1; `plan/references/two-step-edit-pattern.md`; `build/references/implementation-phase-workflow.md`; `build/scripts/dispatch-implementer.ts`, `dispatch-qa.ts` and both their test files; `shared/composition/src/renderers/plan-note.ts` and `src/schemas/plan-note.ts` (read-only — you are not editing them); `docs/analysis/ANALYSIS-005-skills-ecosystem-enforcement-wiring-deep-analysis.md`. Do not sample.

---

## What I have already decided

Do not re-litigate these. Ask HOW, not WHETHER.

1. **The implement→QA loop is invariant, and therefore never written into a plan.** Every TASK is implemented by `brain:🧠-implementer`, then immediately validated by `brain:🧠-qa`; on FAIL it returns to the implementer with the QA findings as a fix-brief; iterate until PASS. Because it never varies, it belongs in exactly one place in the skill layer and nowhere in a PLAN.
2. **The PLAN note is not the dispatch-brief carrier, and never was.** Step 0 gives you the evidence. Do not "verify the coupling" — it does not exist.
3. **The Pattern 2 three-phase write is obsolete.** `plan`'s own reference says so. Do not preserve it, do not restate it, do not treat it as a live alternative.
4. **In all three decayed lines, the longer text wins.** The degradation is monotonic and the shorter copy is always the damaged one. Restore, do not average.
5. **The canonical copy lives at `build/references/per-task-build-qa-cycle.md`** (Q-a, answered in review). The cycle is the build phase's protocol; `build` is where `dispatch-implementer.ts` and `dispatch-qa.ts` live; and prompt 9's later amendments then edit build's own file.
6. **The valid/invalid judgment is the QA agent's alone** (R-16, answered in review). No mechanical validator gates it. The claim validators stay unwired by decision, not by omission; every sentence claiming mechanical claim-enforcement is rewritten to describe the real trust chain. State-transition validation inside the mutation scripts is state management and stays.
7. **The canonical file opens with the two-step frame** (R-15): each build spec task = **implement → validate**, looping until PASS — implementer reads the TASK note and, through its Relations, the REQ and DESIGN notes; QA receives the same refs and reads the same notes; visual implementations add chrome-devtools validation to step 2. The two steps are always sequential; tasks parallelize against each other per `depends_on` relations, and so do specs. The a–u choreography is then presented as the operational bookkeeping *around* those two steps, not as the model itself.

---

## What must be true when you finish

The cycle exists **once inside the skills repo**. `research`, `decisions`, `spec`, `review` and `end` no longer carry it at all. `plan` and `build` carry a pointer plus only the part each genuinely owns. No skill instructs the Pattern-2 three-phase write. **No file this prompt owns** claims the PLAN carries instruction content — and the one file it does not own that still makes the claim is named, quoted and handed to its owning prompts rather than quietly left behind. The 57 build tests still pass. Every touched skill passes `quick_validate` with no benchmark regression. Five later prompts now edit one file where they would have edited seven.

Behaviour changes nowhere. Step 5 rewrites false claims to match what actually runs; it adds no enforcement (decided in review, R-16).

---

## Step 0 — The diagnosis, corrected [BUILD-BRIEF-DOC]

Read this before designing anything. It is the corrected statement of the finding this prompt exists to act on, and it replaces the earlier version verbatim:

> **Do not treat the PLAN note as the dispatch-brief carrier — it is not, and never was.** Six prose sites in the repo claim it (`plan/SKILL.md:28,39,48`; `build/SKILL.md:63`; and your own `PLAN-004:244` / `PLAN-003:240`), and the code refutes all six. `renderBuildWorkflowItem` (`shared/composition/src/renderers/plan-note.ts:190-203`) emits one heading, one blank line and **eight** status bullets — zero instruction content; `BuildWorkflowItemSchema` (`schemas/plan-note.ts:41-52`) has no free-text field at all; `renderPlanNote` (`:330`) is a pure function with no file I/O and cannot read a TASK note even in principle. The "instruction blocks" language traces to an X.D.2 design goal recorded at `skills/docs/sessions/SESSION-2026-05-20_06-…:18` that was never implemented. **The inversion you want is already built and tested**: `build/scripts/dispatch-implementer.ts:44-73` and `dispatch-qa.ts:48-88` build briefs from the TASK/REQ/DESIGN subtree and never touch the PLAN. Engineering cost of inverting is zero; it is a documentation change — delete or rewrite those six prose sites and `plan/SKILL.md` steps (d) and (m). Keep `build_workflow_items` as what it actually is: a derived per-TASK progress rollup, which answers "where per-TASK visibility lands." Separately, the a–u cycle is duplicated **seven** times inside the repo, not twice — `plan:30`, `build:65`, `research:207`, `spec:240`, `decisions:256`, `review:316`, `end:364` — and has already decayed in three lines, with the shorter text always the degraded one.

Three things follow that I want you to hold on to.

**My original complaint was wrong about the cause.** I said I had to hand-write the implement-then-QA flow into every build section. The flow is not missing and the PLAN is not why. Anything you have read that builds on "the PLAN materialises an impl item and a qa item per TASK *because* it carries the brief" is reasoning from a premise the code refutes — including any instruction to "verify the coupling against `scripts/render-plan-note.ts` before proceeding." That verification has been done. `plan/scripts/render-plan-note.ts:79-81` is the whole of it, inside a 122-line CLI wrapper: `export function renderPlanMarkdown(markdown: string): string { return renderPlanNote(parsePlanNote(markdown)); }`. The real renderer is `shared/composition/src/renderers/plan-note.ts`, and `renderBuildWorkflowItem` at `:190-203` returns exactly ten array elements: `#### ${item.id}`, an empty string, and then **eight** bullets — **Type**, **Task Ref**, **Status**, **Owning Session**, **Transitioned At Event**, **Failed Iterations**, **QA Ref**, **Fix Brief For Event**. Say **eight bullets under one heading**, not "nine status bullets"; the earlier phrasing counted the heading as a bullet and then listed eight, contradicting itself on the same page. No DoD text. No REQ acceptance criteria. No DESIGN compliance. No objective, no files-affected, no prose of any kind. Taken literally, an implementer briefed per `plan/SKILL.md:39` receives `#### impl-TASK-001-SPEC-003` and eight status bullets, and no instructions.

**The seventh copy was found late — and there is an eighth, outside this repo, which you must not edit.** One map's table lists six sites and misses `decisions/SKILL.md:256`; the reconciliation pass opened that file and confirmed it. Seven is the count *inside `skills/`*. The eighth lives at `~/.claude/memory/feedback_per_task_build_qa_cycle.md` — heading `## The rigid sequence per TASK (NO STEP MAY BE SKIPPED OR REORDERED)` at `:165`, table at `:169-192` (header `:169`, rows `a`–`u` plus an extra `s-fail` row at `:171-192`). It is a *different rendition*, not a copy: 22 rows instead of 21 lines, different step semantics (its `o` is "QA writes findings", its `p` is "QA returns verdict", and it splits `s` / `s-fail`), and it carries the only iteration cap in the corpus at `:190` — *"cap at 3 iterations then HALT to user"*.

That memory also carries FIC-1 in five places: `:43` (`## The PLAN note carries the dispatch instructions (no agent file updates needed)`), `:45` (*"the PLAN note itself contains rendered instructions for every impl + qa item. The PlanNote Zod schema mandates this structure"*), `:104` (`### Orchestrator's dispatch brief = rendered instructions verbatim`), and steps `d` at `:174` and `m` at `:183` (*"brief = verbatim rendered impl-TASK-N item block"*).

**Decided: this prompt does not touch that file, and here is why, so you do not helpfully fix it.** Prompt 9 migrates it — it is one of the fifteen build memories in that prompt's `AM-MIG-SKILLS` wave — and prompt 12 deletes it. Editing it here would collide with both and would put a memory edit inside a prompt whose entire commit sequence is about skill markdown. What this prompt owes instead is a **handover record**, and it is load-bearing for two reasons.

First, precedence. Under P4-11 the skills plugin outranks the auto-memory layer, so the collapsed skill copy is the authority *de jure*. But `~/CLAUDE.md:21` loads this memory as **TIER-1 BLOCKING** for spec-implementation dispatch — *"rigid per-TASK build+qa cycle with checkbox-as-contract + **PLAN-renderer-as-dispatch-brief-source**; NO EXCEPTIONS to steps a-u per TASK"* — and `:22` tells the orchestrator to *"inline the rigid (a)-(u) cycle from `feedback_per_task_build_qa_cycle`"*. The memory is always in context; the skill file is not. So *de facto* the memory wins by availability, and the phrase "PLAN-renderer-as-dispatch-brief-source" is FIC-1 sitting in tier-1 context on every build session between now and prompt 12. Name that window and its length in your report. Do not attempt to close it here.

Second, regeneration. Prompt 9 migrates this memory's content **into `build`** — the exact file you are about to make canonical. If it migrates the `:43`/`:45`/`:104` block or steps `d`/`m` verbatim, FIC-1 reappears in the one place this prompt just cleaned. So the handover must be a **do-not-migrate list with line numbers**, not a general note.

Verify each of the seven repo sites yourself by heading text before you delete anything. If you find a **ninth** copy anywhere, stop and tell me before proceeding rather than absorbing it.

---

## Step 0.5 — The duplication map, delivered before any edit lands [BUILD-CYCLE-DEDUP]

**A hard gate, not a disclosure.** You are about to delete roughly 330 lines from seven files I am not going to re-read line by line. The only moment I can judge that is before it happens. An earlier version of this work made a delivered duplication map a blocking precondition — *"Report that map before proposing any change… I need to see the surface area to judge the plan"* — and the rewrite replaced it with pre-supplied file:line facts. Better grounding, but it removed my checkpoint. P4-10 ("say what you read") is a disclosure obligation; this is a gate.

**Stop after Step 0 and give me five tables. Then wait. Do not author the canonical file and do not touch any of the seven skills until I answer.**

1. **The eight sites** — seven in `skills/` plus the auto-memory, each located by *heading text* with the line number you actually found (not the one I gave you), and each marked `COLLAPSE` / `POINTER` / `OUT OF SCOPE — HANDOVER`.
2. **The decay diff** — steps (o), (p) and (s) across all seven repo copies, side by side, so I can see for myself that the shorter text is always the degraded one.
3. **The satellite diff** — `## Checkbox-as-contract`, `## Schema-validated agent-claim verification` and `## Defense in depth` across all seven, with a per-section note on which copy is fullest. This is where I most expect the prompt to be wrong, because the "byte-identical" claims below have already failed once.
4. **The Pattern-2 census** — the output of the four greps in Step 3, each row assigned `FIX` / `REWRITE` / `HOLD` / `HOMONYM`, with the exact replacement text for every `FIX` and the owning prompt for every `HOLD`.
5. **The brief-claim census** — the six repo prose sites plus the five auto-memory lines, each with the rewrite you propose or the reason it is out of scope.

Where a table disagrees with a number or a line reference in this prompt, **the table wins** and I want the disagreement stated in the same message, not silently absorbed. A site you cannot locate is a finding, not a rounding error.

This costs one turn. It is cheap because prompt 1 already took the snapshot, so nothing is at risk while we look.

---

## Step 1 — Collapse the seven copies [BUILD-CYCLE-DEDUP]

The four-section block, as it stands. I verified these headings at source; the a–u ranges come from the diff work:

| Skill | `### Role of /X in the rigid cycle` | `## Rigid per-TASK build+QA cycle` | a–u block | `## Checkbox-as-contract` | `## Schema-validated agent-claim verification` | `## Defense in depth` | Runs the cycle? |
|---|---|---|---|---|---|---|---|
| `plan` | :26 | **:30** | :36-56 | :58 | :70 | :83 | orchestrates it |
| `build` | :61 | **:65** | :71-91 | :93 | :105 | :118 | executes it |
| `research` | :203 | **:207** | :213-233 | :235 | :243 | :247 | **no** |
| `spec` | :236 | **:240** | :246-266 | :268 | :280 | :292 | **no** |
| `decisions` | :252 | **:256** | :262-282 | :284 | :292 | :305 | **no** |
| `review` | :344 | **:316** | :322-342 | :348 | :356 | :368 | **no** |
| `end` | :416 | **:364** | :370-390 | :392 | :400 | :412 | **no** |

Roughly 55 lines × 7 ≈ 330 duplicated lines. Five of the seven skills never run the cycle and carry the whole block anyway. Note the two oddities in that table: `review` and `end` place the Role block *after* the cycle rather than before it — `review:344` lands between the a–u block and `## Checkbox-as-contract`, while `end:416` sits after `## Defense in depth` at `:412` entirely, orphaned from the thing it describes and separated from it by three sections.

**`plan` holds the only correct copy.** Every divergence in Step 2 runs `plan` > `build` > the other five. So the canonical text is `plan`'s, in every case, without exception.

### The method — one authoring act, not four passes

Steps 1 through 4 (and Step 5 if I approve it) all edit the same ~55 lines. **Do not make four sequential passes over seven files.** Author the canonical copy **once**, containing:

- `plan`'s wording throughout, including the three repaired lines from Step 2 and the fuller satellite text;
- step (o) corrected per Step 3;
- steps (d) and (m) rewritten per Step 4;
- the validator step from Step 5, only if I approve it.

Then, in a second pass, replace or delete the seven sites. Commit the canonical file first, then the deletions, so the destination is live before anything is removed (P4-9).

### What each skill keeps

- **The five that never run the cycle** (`research`, `spec`, `decisions`, `review`, `end`) lose the four sections outright. Their `### Role of /X in the rigid cycle` blocks are the only legitimately per-skill content in this whole block — **seven** genuinely distinct texts, one per skill, not six — so they stay, and for these five the Role block is the natural home for the one-line pointer to the canonical file. Formatting is currently inconsistent: `build:63`, `research:205`, `spec:238` and `end:418` use a `>` blockquote, while **`plan:28`, `decisions:254` and `review:346`** use a bare paragraph. That is three bare paragraphs, not two — `decisions` was missed in the earlier count, which is a small thing except that `decisions` is also the copy nobody diffed. Normalise to the blockquote form as you go, except where a boundary below forbids touching the line.
- **`plan` and `build`** keep a short pointer plus only what each genuinely owns: `plan` owns the lifecycle-orchestration statement, `build` owns per-TASK execution. Neither restates the steps.

### Boundaries — files other prompts own

You are the first prompt into these files. Five later prompts follow you. **Do not touch these lines**, and say in your report that you did not:

| Line(s) | What it is | Owned by |
|---|---|---|
| `end/SKILL.md:49-50` | the two output rows routing `/review` verdicts and pre-flight results into `SESSION Event NN` | prompt 10 |
| `end/SKILL.md:416-418` | `### Role of /end in the rigid cycle` (heading at `:416`, blockquote body at `:418`) — *"schema rejection blocks closure"* and the `IN_PROGRESS → DONE / PAUSED` status machine | prompt 10 |
| `end/references/end-checklist.md:250-262` | the twelve state-marker frontmatter fields (`dod_verified`, `review_passed`, `preflight_check1..5_passed`, `step4a_commit`, `step4d_done`, `step4f_pr`) | prompt 10 |
| `build/SKILL.md:67` — *"advances ONE TASK at a time… NO batching"* | in direct tension with parallel build; a four-way contradiction I am not resolving here | prompt 9 |
| `build/SKILL.md:227` — *"**Max 3 iterations**; HALT via `build-step4d-iteration-halt`"* | the iteration cap, which the corpus answers three different ways | prompt 9 |
| `shared/composition/src/schemas/plan-note.ts`, `src/renderers/plan-note.ts`, `src/parsers/plan-note.ts` | the PLAN data model | prompt 5 |

Carry `plan`'s "ONE TASK at a time / NO batching" wording into the canonical file **exactly as it stands**. Prompt 9 amends it; you do not.

Note the `end` consequence: because `:418` is untouchable, `end`'s Role block stays exactly where it is, after where `## Defense in depth` used to be. Record the orphaning in your handover note for prompt 10 rather than fixing it.

### The home — decided in review, do not ask

The canonical copy is **`build/references/per-task-build-qa-cycle.md`** (new file). `plan` and `build` bodies carry a 3-line pointer; the other five skills carry nothing but their Role block.

One warning stands from the deliberation: the corpus has **one** precedent for cross-skill protocol sharing, and it is a cautionary tale. `plan/references/per-decision-micro-cycle.md:3` says it is *"Cross-linked with `/decisions/references/per-decision-micro-cycle.md` (canonical source when `/decisions` is authored)"* — a duplicated file with a declared canonical, which is exactly how a–u reached eight copies. The outcome here must be **one file, pointed at** — never a second copy with a canonical-source disclaimer. If you find yourself about to create a second copy of the new reference anywhere, stop.

---

## Step 2 — Repair the three decayed lines [BUILD-CYCLE-DEDUP]

All three diverge the same way: the shorter text is the degraded one, and the degradation is monotonic by skill. Restore the longer text in the canonical copy.

| Step | Correct text (`plan`) | Degraded form | Where degraded |
|---|---|---|---|
| **(o)** | ``o. QA writes per-checkbox findings to `QA-NNN-SPEC-MMM-{task-slug}.md` via a single `write_note` call`` (`plan:50`) | *"…via Pattern 2 three-phase write"* | all six: `build:85`, `research:227`, `spec:260`, `decisions:276`, `review:336`, `end:384` |
| **(p)** | ``p. QA returns verdict ONLY: `PASS` or `FAILED + see QA-NNN` — nothing more; the QA note is the contract document`` (`plan:51`, `build:86`) | truncated after `` `FAILED + see QA-NNN` `` | five: `research:228`, `spec:261`, `decisions:277`, `review:337`, `end:385`. **`build:86` is intact.** |
| **(s)** | *"…quotes each unchecked item verbatim with QA evidence **(file:line, test name)**"* (`plan:54`, `build:89`) | *"…with QA evidence"* | five: `research:231`, `spec:264`, `decisions:280`, `review:340`, `end:388`. **`build:89` is intact.** |

Step (p)'s dropped clause is the load-bearing rationale for the whole verdict protocol. Step (s)'s dropped parenthetical is the operational definition of "evidence" — without it the fix-brief rule means nothing. Steps a–n, q, r, t and u are byte-identical across all seven; only o, p and s differ. Note the shape of the decay: `plan` is whole, `build` is whole on (p) and (s) and degraded only on (o), and the other five are degraded on all three. That is a clean `plan` > `build` > rest gradient, which is why "the longer text wins" is a rule and not a judgement call.

The satellite sections drifted too — considerably more than earlier accounts of this work said — and the canonical copy takes `plan`'s text in each case:

- **`## Checkbox-as-contract` is not byte-identical, and the claim that it was is the biggest single error in the earlier diff.** Only `build:93-104` matches `plan:58-69`. The bullet list (`plan:62-64`) is identical everywhere, but the **two dispatch paragraphs** are not: `plan:66` (*"When dispatching implementer: brief MUST quote the TASK DoD verbatim + link the linked REQs/DESIGNs + state 'you implement against the checkboxes; you check [x] as each is satisfied'."*) and `plan:68` (the QA equivalent) are **absent entirely** from `research`, `decisions`, `review` and `end` — those four stop after the third bullet. `spec` keeps both paragraphs but truncates them: `spec:276` is *"When dispatching implementer: brief MUST quote the TASK DoD verbatim + link the linked REQs/DESIGNs."* — the behavioural instruction to the implementer is gone — and `spec:278` collapses the QA paragraph the same way. **The canonical copy takes `plan:66` and `plan:68` in full.** Four skills currently document the checkbox contract with the dispatch instruction removed, which is the contract without the part that makes it a contract.
- **`## Schema-validated agent-claim verification` — the validator list is not identical either.** `plan:74-79` and `build:109-114` carry **six** bullets. `spec:284-288`, `review:360-364` and `end:404-408` carry **five** — all three drop the `PlanNoteSchema.BuildWorkflowItem` + `transition-impl-item`/`transition-qa-item` row, which is the only bullet about session context. `decisions:296-301` keeps six bullets but degrades two of them: `:300` drops both `+ schema superRefine` and the `tests_run !== passed + failed + skipped` clause, and `:301` drops `(owning_session + at_event)` — the field names, which are the whole point of that row. `end:408` also drops `+ schema superRefine` and the arithmetic; `review:364` keeps `+ schema superRefine` but drops the arithmetic. `research:245` has no bullets at all — it collapses the entire section to one sentence: *"The composition library at `shared/composition/` provides programmatic validators across TaskNote, RequirementNote, DesignNote, SpecRootNote, QaNote. Lying agents are mechanically caught."* The closing line degrades separately: `plan:81` is *"Lying agents are mechanically caught. **The agent must actually do the work to satisfy the schema.**"*; `build:116`, `spec:290`, `decisions:303`, `review:366` and `end:410` all drop the second sentence.
- **`## Defense in depth` — three variants.** `plan:85` is full: *"This protocol embeds at every enforcement layer — Zod schemas + templates + renderers + skill SKILL.md + orchestrator dispatch briefs. Single-layer enforcement fails under load. Each layer is independent and redundant by design."* `build:120` keeps the enumeration and drops the last sentence. `research:249`, `spec:294`, `decisions:307`, `review:370` and `end:414` all collapse to *"This protocol embeds at every enforcement layer. Single-layer enforcement fails under load."* — losing the enumeration of layers, which is the only informative part. That is **five** collapsed variants, including `decisions`.

**Override for the second satellite, decided in review (R-16) — this section is rewritten, not restored.** `plan`'s fullest text of `## Schema-validated agent-claim verification` ends in *"Lying agents are mechanically caught. The agent must actually do the work to satisfy the schema."* Under R-16 that claim is now false **by design**, not merely unimplemented: the valid/invalid judgment is the QA agent's alone, and no mechanical validator gates it. So the canonical copy's version of this section says what is true, in three parts: (1) claims are verified by the **adversarial QA agent** against the DoD / AC / Compliance checkboxes, with per-item evidence in the QA note; (2) the **mutation layer** schema-validates state transitions when the PLAN is written (`transition-impl-item.ts` / `transition-qa-item.ts`) — that is state management and it stays; (3) the **ten claim-validator modules** exist in the composition library, unwired **by decision**, inventoried for prompt 9 to reconsider as advisory tooling if it wants them. Keep `plan`'s six-bullet inventory as the factual list of what the library contains, under a heading that no longer promises it runs. The other two satellites (`## Checkbox-as-contract`, `## Defense in depth`) are restored to `plan`'s fullest text as instructed above.

**`decisions`' copy was found after the line-by-line diff work.** I have since opened it and folded its divergences into the three lists above — it degrades on (o), (p) and (s) exactly like the other four, drops both dispatch paragraphs, degrades two validator bullets, drops the closing second sentence at `:303`, and collapses Defense-in-depth at `:307`. **Diff it yourself anyway before you delete it**, and use the ranges that actually contain the divergences: **`decisions/SKILL.md:256-307` against `plan/SKILL.md:30-85`**. The narrower `:256-305` / `:30-83` ranges an earlier version gave you stop one line short of `decisions:307` and `plan:85` — that is, they exclude the Defense-in-depth body, which is precisely where `decisions` diverges. Report any divergence beyond the ones I have listed. If it contains anything the other six do not, that is content, not decay, and I want to see it.

While you are in `## Defense in depth`: it enumerates enforcement layers as if they run. Per P4-14 they do not, against production data. Do not strengthen that claim, do not add to it, and do not let the canonical copy assert that anything is currently "mechanically caught" against my real notes. Restore `plan`'s wording as-is and leave the correction of that claim to prompt 5.

---

## Step 3 — Kill the obsolete write [BUILD-PATTERN2-FIX]

`plan`'s own reference already ruled on this. `plan/references/two-step-edit-pattern.md:272`, verbatim, from the Anti-patterns table:

> `| Following the old three-phase write (write no-colon → edit colon → move) | Obsolete — `write_note` is now a single call that handles the colon title and kebab filename (CONVENTIONS Section 1.7.2) | Pass the full colon title in one `write_note` call; verify via list_directory |`

And `~/CLAUDE.md:337` says its output is a symptom of breakage: *"A space-named file or a `-1` permalink suffix means the intercept didn't run — re-run against a current brain build rather than repairing by hand."*

So six of the seven copies instruct QA to deliberately produce the broken state my own anti-pattern table warns about. That is the defect. The replacement everywhere is: **a single `write_note` call passing the full canonical colon title; verify via `list_directory`.**

### The census

I ran the greps over the corpus, because the literal string varies and the two strings do **not** cover the same set. From the repo root: `grep -rn "Pattern 2" skills/ --include=*.md` returns **23 lines across 14 files**; `grep -rn "three-phase" skills/ --include=*.md` returns **21 lines**. Dropping `--include=*.md` takes the `three-phase` count to **26** in that same directory, because four `.ts` files carry it too.

Three scoping facts you need before you run anything, all of which the earlier Done-means got wrong:

1. **`two-step-edit-pattern.md:272` contains "three-phase" but does *not* contain "Pattern 2."** It is permitted residue of the `three-phase` grep only. Expecting it in the `Pattern 2` output guarantees a failed gate.
2. **`shared/composition/src/repoint.ts:6` is outside `skills/`.** Its text is *"The three-phase workflow the composition skills use applies here in full: an"* — a genuine homonym, and no grep scoped to `skills/` can ever return it. It needs its own scoped check.
3. **Do not run either grep from the repo root unscoped.** Repo-wide, `Pattern 2` returns **116** hits and `three-phase` returns **88**, because `docs/**` is full of them — sessions, SPECs, REQs, DESIGNs, TASKs, ADRs, retros. Those are Brain notes: prompt 12's sweep, and Brain MCP territory, not `Edit` (P4-6). Scope every grep to `skills/` and `shared/`, and say in your report that you did.

Run all of them yourself against the live repo — the counts may have moved. Here is what they return and who owns each:

| Site | What it is | Disposition |
|---|---|---|
| `build:85`, `spec:260`, `decisions:276`, `review:336`, `end:384`, `research:227` | step (o) ×6 | **resolved by Step 1's collapse** — verify no orphan survives |
| `build/SKILL.md:144-148` | under `### Brain MCP binary rule` (heading at `:142`) — the Pattern-2 sentence at `:144` plus the three numbered phases at `:146-148` | **fix** |
| `build/references/implementation-phase-workflow.md:222` | QA note write via Pattern 2 | **fix** |
| `research/SKILL.md:36`, `:45`, `:47-49` | PRD write procedure and its three numbered phases | **fix** |
| `research/references/analysis-phase-workflow.md:69` | PRD lands via Pattern 2 | **fix** |
| `spec/SKILL.md:79` | SPEC-subtree creation procedure | **fix** |
| `spec/references/spec-authoring.md:36`, `spec-decomposition.md:85` | SPEC + ANALYSIS write procedure | **fix** |
| `spec/references/authoring-workflow.md:32`, `:45`, `:220` | *verification* steps phrased as "Pattern 2 Phase 3 `move_note`" | **rewrite, do not delete** — the check (filename is kebab, verified via `list_directory`) stays valid; only its justification changes |
| `decisions/SKILL.md:42`, `:49`; `decisions-phase-workflow.md:165`; `adr-authoring.md:214` | ADR write procedure | **fix** |
| `build/scripts/dispatch-qa.ts:77` | **shipped code.** The QA dispatch brief literally instructs *"Write per-checkbox findings to a QA-NNN-SPEC-NNN-{task-slug}.md note via Pattern 2 three-phase write."* | **fix** — this is the runtime propagation of the obsolete procedure, inside the very script Step 4 blesses. Fixing prose while this stands changes nothing at run time. No test asserts that string (`grep` over `build/scripts/*.test.ts` returns nothing), so the fix is safe; re-run all 57 build tests. |
| `research/scripts/dispatch-analyst.ts:82` | same one-line defect in the analyst brief | **fix the string only.** Prompt 7 owns the rest of that script; touch nothing else in it. |
| `ingest/SKILL.md:6`, `:52-61`, `:67` | ingest's three-phase write | **HOLD — see below** |
| `decompose/SKILL.md:22` (*"This skill follows the locked three-phase workflow from `KICKOFF-BRIEF.md`:"*); `shared/composition/src/repoint.ts:6` (*"The three-phase workflow the composition skills use applies here in full: an"*) | *"three-phase workflow"* meaning decompose/recompose's own plan→execute→verify pipeline | **DO NOT TOUCH.** Homonyms. A blind sweep on the word "three-phase" breaks unrelated text. Note the second one lives under `shared/`, not `skills/`, so it is invisible to a `skills/`-scoped grep and must be checked separately. |

### The `ingest` hold

`ingest`'s three-phase write is not prose — it is **executed in code** (`ingest/scripts/ingest.ts:48`, `:60`, with the write at `:153-156`, verification after the write at `:163`, and `persist` at `:85-93` having no rollback). Rewriting `ingest/SKILL.md:52-61` to describe a single `write_note` while the script still performs three phases replaces one lie with another, in the opposite direction. **So: do not edit `ingest` prose. Report it, draft the exact replacement text, and hand it to prompt 4, which owns `ingest`** (its coexistence claims at `:28-29` and `:78-81`, and its dead verification items at `:59-61`). Note the range: `ingest/SKILL.md` is **81 lines long**, `## Coexistence` is the heading at `:78`, and the section runs to end-of-file at `:81` — `:78-82` overshoots the file. Fail closed rather than shipping a doc/code divergence (P4-12).

Record every held site in a handover list with the exact replacement text and the owning prompt. The Done-means greps are satisfied when every remaining hit is either the obsolescence notice, a homonym, or on that list.

---

## Step 4 — Correct the brief contract [BUILD-BRIEF-DOC]

### The claim, and where it lives

Six sites in the repo, not five — the count in the Step 0 blockquote is the corrected one. Plus five lines in the auto-memory, listed at the end of this table and out of scope per Step 0.

| Site | Text |
|---|---|
| `plan/SKILL.md:26` (heading) / `:28` (text) | *"/plan is the lifecycle orchestrator. When a build part advances, /plan's PlanNote renderer (X.D.2) emits the per-TASK impl + qa **instruction blocks**; the orchestrator dispatches with those blocks verbatim. /plan never elides the cycle steps a–u. On failed QA, /plan re-enters step (a) for the same TASK with the orchestrator's fix-brief."* — the whole line, so you can see that the last two sentences are true and survive; only the middle clause is the fiction |
| `plan/SKILL.md:39` (step d) | *"Orchestrator dispatches implementer; brief = rendered impl item content verbatim from PLAN"* |
| `plan/SKILL.md:48` (step m) | *"Orchestrator dispatches QA; brief = rendered qa item content verbatim from PLAN"* |
| `build/SKILL.md:63` | *"The implementer dispatch brief is the PLAN's rendered impl item content verbatim; the QA dispatch brief is the rendered qa item content verbatim."* |
| `examples/PLAN-004-…:244` | *"Per the renderer, each item block IS the orchestrator dispatch brief, delivered to the implementer/qa agent verbatim."* |
| `examples/PLAN-003-…:240` | *"…each item block IS the orchestrator dispatch brief (verbatim)."* |
| **out of scope** — `~/.claude/memory/feedback_per_task_build_qa_cycle.md:43, 45, 104, 174, 183` | The eighth copy's version of the same claim. **Do not edit.** Prompt 9 migrates the file, prompt 12 deletes it; Step 0 explains why and what the handover must contain |

Plus the step (d)/(m) copies inside `review:325,334` and `end:373,382` — those disappear with Step 1, but check them off explicitly so nobody discovers them later in the two skills nobody thinks to open. (Those four line numbers follow mechanically from the a–u ranges: `review:322-342` puts d at `:325` and m at `:334`; `end:370-390` puts them at `:373` and `:382`.)

### Where the claim came from

`skills/docs/sessions/SESSION-2026-05-20_06-phase-x-d-2-plannote-renderer-extension.md:18` states the X.D.2 goal: *"extend the `PlanNote` renderer to deterministically generate per-TASK impl+qa **instruction blocks by reading linked TASK DoD + REQ Acceptance Criteria + DESIGN compliance checkboxes**."* `plan/SKILL.md:28` cites "(X.D.2)" by name. **The citation is real; the capability was never built.** That is the whole story, and it is worth one sentence in the commit message.

### What already ships

`build/scripts/dispatch-implementer.ts:44-73` renders the brief from TASK content. Its interface at `:17-20` is `{ taskRef: string; taskContent: string }` — **no `planPath`, no `partId`**. Its own test asserts the contract at `dispatch-implementer.test.ts:21`: *"brief contains rendered TASK content verbatim (DoD #1)"*. 57 tests pass across the five build test files (13 + 17 + 10 + 11 + 6).

**`dispatch-qa.ts:48-88` is *not* the same shape, and you need to know that before you document either.** Its interface at `:20-23` is `{ taskRef: string; reqRefs: string[] }` — refs only, **no note content at all**. Where the implementer brief embeds the rendered TASK body under a `## Rendered TASK content` heading (`:51-53`), the QA brief embeds nothing and instead *directs* the agent to go and read: `:74` — *"Read the ENTIRE spec subtree (TASK DoD + linked REQ Acceptance Criteria + linked DESIGN Compliance)."* Two deliberately different models — push for the implementer, pull for QA — and the QA one also carries a `## Reviewer asymmetry mandate` at `:66-70` that has no implementer counterpart (*"You are the adversarial reviewer. Your job is to find failures, not to confirm success."*). Document them as two shapes with two rationales — **as current-state fact, not design intent**. The review ruled (R-15/R-16) that the target model is **pull for both**: the brief names the spec and task; the agent reads the TASK note and, through Relations, the REQ and DESIGN notes. The shipped implementer script embeds content instead and has no spec-ref parameter; reconciling it is prompt 9's, so the canonical file records the asymmetry, states the target in one sentence, and changes no code. Calling them "the same shape" would still be wrong today, and inviting a "consistency" pass to break QA's pull model would be worse.

### `build` ships four brief models simultaneously

This is the actual mess, and only one of the four mentions the PLAN:

| # | Model | Status |
|---|---|---|
| (a) | `build/SKILL.md:74` — step (d), *"verbatim from PLAN"* | fiction; no implementation |
| (b) | `build/SKILL.md:223-224` — TASK scope + parent SPEC + applicable ADRs, then five directives | **mostly in the script — but not entirely** |
| (c) | `build/references/implementation-phase-workflow.md:173-195` — a TASK-note-sections template | prose duplicate |
| (d) | `dispatch-implementer.ts` — TASK content + directives | **the real one** |

I checked (b) against the code before writing this, and the earlier claim that "the script is a superset" is **false in two specific ways. Do not delete `:223-224` on the strength of it.**

What matches: `dispatch-implementer.ts` emits all five directives under a `## Directives` heading at `:55` — **TDD directive** `:57`, **canonical-source-mirror constraint** `:59`, **evidence hierarchy** `:61`, **quality self-check** `:63`, **memory-first gate** `:65` — followed by `## Contract` at `:67` covering the DoD checkboxes (`:69`) and the `## State Changes` return (`:71`). (Earlier text gave the range as `:56-68`, which is off by one at both ends and swallows the `## Contract` heading.)

What does **not** match, and must be moved rather than dropped:

1. **Scope.** `build/SKILL.md:223` reads *"`Task(subagent_type="brain:🧠-implementer")` with **TASK scope + parent SPEC + applicable ADRs**"*. The script's interface is `{ taskRef, taskContent }` — it has no parameter for a parent SPEC or an ADR set, and the rendered brief never mentions either. That is a real capability in prose that does not exist in code.
2. **The TDD directive is conditional in prose and unconditional in code.** `:224` says *"If project has tests, write failing test for each acceptance criterion BEFORE implementation code"*; `dispatch-implementer.ts:57` says *"Write failing tests for each acceptance criterion BEFORE implementation code."* Deleting the prose silently promotes a conditional into a mandate. That may well be what I want — but it is a decision, so surface it rather than making it by deletion.

**So: verify for yourself, and move anything prose-only into the script before deleting the prose** (P4-13: wire, do not rebuild — and do not lose content in a cleanup). If moving the SPEC/ADR scope into the script means widening its interface, that is a change to shipped code with tests: say so, and if it turns into more than a small addition, hold it and hand it forward rather than growing this prompt.

### What to do

1. Rewrite `plan/SKILL.md:26-28` so the Role block states what `/plan` actually does — orchestrate the lifecycle and hold sequence and status — with no claim about emitting instruction content.
2. In the canonical copy, rewrite steps (d) and (m) so the brief is rendered from the TASK/REQ/DESIGN subtree by `build/scripts/dispatch-implementer.ts` and `dispatch-qa.ts`, naming the scripts.
3. Delete the brief clause from `build/SKILL.md:63`. **Note that line carries two claims** — the brief claim and the validator claim (*"NEVER trusts an implementer's claim without running the schema validator"*). Step 5 decides the fate of the second; do not delete it by accident while removing the first.
4. Delete brief models (a) and (c); delete (b) once verified redundant. Point `build/SKILL.md` at the scripts. **Confirm in your report that the scripts are the only remaining definition of the brief.**
5. Fix the two example PLANs. **These are Brain notes, not files, and they belong to a different project's graph** — `PLAN-004`'s frontmatter carries `status: IN_PROGRESS` at `:4` and `permalink: datatable-next/planning/plan-004-datatable-client-side-feature-completion` at `:8`; `PLAN-003` carries `status: IN_PROGRESS` at `:4` and `permalink: datatable-next/planning/plan-003-server-side-row-model-and-server-side-grouping` at `:5`. Both live in the **`datatable-next`** graph, not the skills graph, so Brain MCP has to be pointed at that project before either is reachable. Per P4-6 they are edited with Brain MCP `edit_note` (find_replace on the offending sentence), never `Read`/`Edit`/`Write`. If they are not reachable from this machine's Brain MCP, record the exact find/replace pair per note and defer — do not touch them any other way, and do not edit the exported copies under `examples/` as a substitute, because that changes a snapshot and leaves the live note wrong.
6. **Do not run `render-plan-note.ts` against either PLAN, or against any real PLAN, for any reason.** The parser reads nine named H2 sections and silently discards every other H2 before validation, and the renderer then rewrites the file from the model — destroying `## Risks`, `## Workflow Plan`, `## Decision Log`, `## Progress Log`, and every phase H2, which is where all the parts live in 7 of 7 of my real PLANs. That defect is currently masked because parsing fails on all 7; it becomes live destruction the moment prompt 5 fixes the parser. Prompt 5 owns it. Stay out.

### Keep the rollup

`build_workflow_items` stays. Document it in the canonical file for what it is: **a derived per-TASK progress rollup** — the one single-surface view of where every impl/qa pair stands, emitted per part by `renderPart` (`renderers/plan-note.ts:166-175`) and sorted deterministically by `sortBuildWorkflowItems` (`:180-188`, by `task_ref` ascending, impl before qa). That is also my answer to "where does per-TASK visibility land after the inversion": here, as a rollup, recomputable from TASK frontmatter `status` plus `validated_by` relations. Nothing in the block is authored content, so nothing needs migrating.

Two guardrails on that sentence. First, per P4-14, say "derived progress rollup" — do not write that it "enforces" or "guarantees" anything; the renderer cannot currently run on a real PLAN. Second, `fix_brief_for_event` is an event **pointer**, not brief text; it already implies briefs live elsewhere. Say so — it is the cleanest single piece of evidence that the PLAN was never the carrier.

---

## Step 5 — Make the false enforcement claims true by rewriting them [decided in review: R-16]

`build/SKILL.md:63` claims: *"/build … **NEVER trusts an implementer's claim without running the schema validator**."* The a–u cycle contains **no validator-execution step**, and `ANALYSIS-005:63` records two siblings: `end/SKILL.md:418` claims *"schema rejection blocks closure"* while no step runs `validate-spec-done.ts`, and `dispatch-qa.ts:83` tells QA agents *"The composition library validators will be run against your QA note"* while no step runs them. The broader fact is `ANALYSIS-005:61` — *"0 of 17 lifecycle scripts invoked by any SKILL.md"*.

**The review resolved this: no validator step is added. The judgment is the QA agent's alone.** Do three rewrites and one handover:

1. **`build/SKILL.md:63`, validator clause** (the brief clause on the same line dies in Step 4) — rewrite to the real trust chain: */build never accepts an implementer's claim without adversarial QA validation — the QA agent reads the same TASK/REQ/DESIGN notes and rules valid or invalid, with per-checkbox evidence in the QA note.*
2. **`dispatch-qa.ts:83`** — the brief string promises *"The composition library validators will be run against your QA note."* False by design now. Rewrite the string to what is true — the QA note is the contract document and its per-item evidence is what the orchestrator acts on — and re-run the 57 build tests. This file is already open for the `:77` Pattern-2 fix; make both string changes in one pass.
3. **The canonical file's satellite section** — per the Step 2 override: QA-as-verifier, transition-layer schema validation stays, ten claim validators inventoried as unwired-by-decision.
4. **Handover.** `end/SKILL.md:418` (*"schema rejection blocks closure"*) is prompt 10's line — record it as the remaining false-enforcement claim with its owner. Note for prompt 9: the ten claim validators (`ANALYSIS-005:62` — *"All 10 … have zero non-test, non-hook callers"*) remain available if it wants them as **advisory** tooling; any future wiring must not contradict R-16 (nothing mechanical gates QA's judgment). And note the distinction that keeps prompt 4 and this prompt from colliding: prompt 4 wires `run-pre-flight.ts` — *structural* validation of note shape in `decompose`/`recompose`; this prompt touches *claim*-validation language only. Neither wires the other's surface.

Context worth one line in the report, because it explains why R-16 is also the pragmatic ruling: executed against the corpus, the claim validators reject my real notes — REQ **9 pass / 51 fail**, DESIGN **4 / 20**, TASK **48 / 67**, dominated by legacy REQs using `## EARS` where `spec-templates.md:5-63` mandates `## Requirement Statement`. That template-versus-notes conflict is **prompt 8's** to rule; nothing here pre-empts it. And the root hatch — a `deferred_rationale` string satisfying any unchecked checkbox (`schemas/task-note.ts:113-121`, `requirement-note.ts:85-98`, `design-note.ts:91-105`, `spec-root-note.ts:140-177`) — is also prompt 8's.

---

## Independent evaluation

P4-4 applies to all seven skills you open: `plan`, `build`, `research`, `decisions`, `spec`, `review`, `end`. Evaluate each **as if handed it cold with no brief** — not against this prompt, not against a checklist. Ranked findings, each with a recommended action and a one-line rationale. Apply nothing without my approval. An honest short list beats a padded one; if a skill is fine, say it is fine.

Run `python -m scripts.quick_validate <skill-dir>` against all seven before you report, and re-run the description benchmark against the prompt-1 snapshot for any skill whose frontmatter `description` or body shape changed materially (P4-5). A skill that loses fifty lines of body without a trigger re-measurement has been rewritten, not refactored, and I will not know which until it misfires.

I will tell you now what I expect to hear about, so you can skip re-deriving it and spend the budget on what I have not seen:

- **`plan/SKILL.md:158-172` — the `## Create mode pipeline` (heading at `:156`) is numbered 1, then 3 through 11.** There is no item 2 and the list was never re-based. Eleven steps, ten of them present. (Earlier text said "it runs 1, 3, 4, 5", which understates it by six steps.)
- **`end`'s Check 3 is disabled in the body while its own frontmatter still advertises it.** `end/SKILL.md:3` promises *"on review PASS run 5 pre-flight checks (secret-scan, tests passing, **lint clean**, PR description validation, CI workflow health)"* and the body summary at `:9` repeats "5 pre-flight checks" — while `:22` says *"run 4 pre-flight checks (Check 3 DISABLED)"*, `:182-186` documents the 2026-05-19 disabling and its rationale, and `:358` lists the halt id as *"(DISABLED 2026-05-19; Check 3 skipped)"*. The frontmatter description is what the loader matches on, so the one surface a user sees is the one that is wrong.
- **Eight `.DS_Store` files are committed**, not one: `shared/`, `shared/composition/`, `skills/`, `skills/plan/`, `hooks/`, `docs/`, `docs/planning/`, `docs/specs/`. Report it; do not fix it here — a `.gitignore` change plus eight removals is its own small commit in a prompt that is not about that, and every removal is an `rm` that prompts me (P4-9).

Those are known. Tell me what is not.

---

## Git

Verify the branch first. One branch for this prompt. Commit in coherent steps in this order, so the destination is live before anything is deleted:

1. the canonical cycle file, complete — then **read it back** before step 3 touches anything (P4-9: verification is read-back, not assertion);
2. `plan` and `build` reduced to pointer plus what each owns;
3. the five deletions;
4. the Pattern-2 sweep (prose), then the two code-string fixes with the 57 tests re-run;
5. the brief-contract corrections, including the two Brain-MCP `edit_note` calls;
6. the Step 5 claim rewrites — the two skill lines plus the `dispatch-qa.ts:83` string, with the 57 tests re-run;
7. `quick_validate` and benchmark results recorded — in the report, not as a code change.

Nothing here needs `rm`. If a step seems to, stop: it means the plan drifted into deleting a file this prompt did not authorise.

Max 5 files or one logical change per commit. Leave the branch unmerged. Do not push. No `--no-verify`, no force-push, and no indication of AI contribution in any commit message.

---

## Done means

- [ ] **The Step 0.5 duplication map — all five tables — was delivered to me and I answered before the first edit landed.** No edit precedes that answer.
- [ ] Exactly one copy of the four-section block exists **inside `skills/`**; the other six sites are a pointer or absent, and the pointer target is `build/references/per-task-build-qa-cycle.md` (decided in review — no Q-a was asked).
- [ ] The canonical file opens with the R-15 two-step frame — implement → validate, looping until PASS, visual validation via chrome-devtools when the implementation has visual parts, parallelism between tasks and between specs derived from `depends_on` relations — and presents a–u as the operational choreography of those two steps.
- [ ] `decisions/SKILL.md:256-307` was diffed against `plan/SKILL.md:30-85` before deletion — ranges that include the Defense-in-depth bodies — and any divergence beyond the ones listed in Step 2 was reported to me.
- [ ] All three decayed lines carry the longer text. `## Checkbox-as-contract` carries **both** dispatch paragraphs (`plan:66` and `plan:68`) in full; `## Schema-validated agent-claim verification` carries all **six** bullets with `owning_session + at_event`, `+ schema superRefine` and the `tests_run !== passed + failed + skipped` clause intact, plus `plan:81`'s second sentence; `## Defense in depth` carries `plan:85`'s layer enumeration and its closing sentence.
- [ ] The Pattern-2 greps pass, **each scoped and checked separately** — the earlier single-grep formulation was unsatisfiable:
  - `grep -rn "Pattern 2" skills/ --include=*.md` returns only sites on the recorded handover list (which names `ingest`, its owning prompt, and the exact replacement text). It must **not** be expected to return `two-step-edit-pattern.md:272`, which contains no "Pattern 2".
  - `grep -rn "three-phase" skills/ --include=*.md` returns only `plan/references/two-step-edit-pattern.md:272`'s obsolescence notice, the homonym at `decompose/SKILL.md:22`, and handover-list sites.
  - `grep -rn "Pattern 2\|three-phase" skills/*/scripts/` returns only handover-list sites (i.e. `ingest/scripts/ingest.ts`).
  - `grep -rn "three-phase" shared/composition/src/repoint.ts` still returns `:6`, unchanged — the homonym outside `skills/` that no `skills/`-scoped grep can see.
  - No grep was run unscoped from the repo root; `docs/**` is untouched and remains prompt 12's.
- [ ] `build/scripts/dispatch-qa.ts:77` no longer instructs a three-phase write, and `research/scripts/dispatch-analyst.ts:82` is fixed with nothing else in that file touched.
- [ ] **No file this prompt owns claims the PLAN carries dispatch instructions.** `plan/SKILL.md` steps (d) and (m) are rewritten; `plan/SKILL.md:28` is rewritten with its last two sentences preserved; `build/SKILL.md:63`'s brief clause is gone and its validator clause is rewritten to the R-16 trust chain; `dispatch-qa.ts:83` no longer promises validator runs; the satellite section is rewritten per the Step 2 override; `review:325,334` and `end:373,382` are accounted for; both example PLANs were corrected via Brain MCP `edit_note` against the `datatable-next` graph, or the exact per-note find/replace pair was recorded as deferred. No validator-execution step was added anywhere.
- [ ] **The eighth copy is handed off, not fixed.** The report names `~/.claude/memory/feedback_per_task_build_qa_cycle.md` explicitly, quotes `:43`, `:45`, `:104`, `:174` and `:183`, states that the file is untouched, gives prompt 9 a **do-not-migrate list with line numbers** so FIC-1 cannot re-enter `build` through the migration, gives prompt 12 the deletion pointer, and states the interim window in which `~/CLAUDE.md:21`'s TIER-1 BLOCKING load keeps the false claim in tier-1 context.
- [ ] **The prompt-9 amendment list is delivered** alongside the handover: step (s) transcription → QA-note pointer (R-15); implementer brief push → pull with a spec ref (R-16); the state-writer fork — orchestrator / workers / hybrid / **hook-based lifecycle middleware** — with orchestrator-single-writer as the working default and the hook option carrying its two caveats (the 2026-06-30 de-registration history to investigate first, and hooks' lack of direct MCP access); the iteration-cap sources; the NO-batching line; and R-18's **QA-completion gate** — a lifecycle hook that denies the QA agent's completion claim unless a QA note exists and validates, logging the denial to the session note (the R-16-compatible home for `validateQaPassClaim`, gating the deliverable rather than the judgment). None of these was applied here.
- [ ] `build` has exactly one brief definition — the scripts — and the report says so explicitly. Any prose capability not present in `dispatch-implementer.ts` (specifically the parent-SPEC/ADR scope at `:223` and the conditional-vs-unconditional TDD wording at `:224`) was moved into the script or explicitly surfaced to me, not silently deleted.
- [ ] The canonical file documents `dispatch-implementer.ts` and `dispatch-qa.ts` as **two different brief shapes** — embedded TASK content versus refs plus a read-the-subtree directive — and does not describe them as the same.
- [ ] `build_workflow_items` is documented as a derived per-TASK progress rollup, with no claim of enforcement.
- [ ] `end/SKILL.md:49-50`, `end/SKILL.md:416-418` and `end/references/end-checklist.md:250-262` are untouched, and the report says so. Same for `build/SKILL.md:67` and `:227`, and for everything under `shared/composition/src/`.
- [ ] `render-plan-note.ts` was never run against a real PLAN.
- [ ] All 57 build tests pass (13 + 17 + 10 + 11 + 6 across the five build test files).
- [ ] `python -m scripts.quick_validate <skill-dir>` passes for every one of the seven skills touched, and no description benchmark regressed against the prompt-1 snapshot baseline — or, where Stage 9 could not run (`--model` or the `claude` CLI absent), that is stated as a skipped gate rather than a passed one.
- [ ] Ranked independent-evaluation findings delivered for all seven skills; nothing applied without my approval.
- [ ] Every count restated in the final report was re-measured, and any disagreement with a figure in this prompt is called out rather than silently adopted in either direction.
- [ ] No `rm` was run; every removal was a line-level `Edit` inside a surviving file.
- [ ] Branch created, commits coherent and ordered destination-before-deletion, nothing pushed.

---

## Corrections against anything you may have read before

If you have seen an earlier "Prompt C — thin plan note, autonomous build, defined phase transitions", these four statements in it are wrong and are corrected here:

- **`:13` — *"It is defined twice, nearly identically."*** → **Seven times inside `skills/`, and an eighth in the auto-memory layer.** Off by at least 3.5×, and two of the seven skills (`review`, `end`) never run the cycle at all yet carry the whole four-section block. "Nearly identically" is also wrong: `## Checkbox-as-contract` loses both dispatch paragraphs in four of the seven, and the validator list loses a bullet in three more.
- **`:21` — *"The PLAN note is the dispatch-brief carrier."*** → **False.** Use Step 0's corrected statement. The entire Step 0 diagnosis in that document, and its Done-means item claiming "the coupling is confirmed… and inverted", rest on a claim the code refutes.
- **`:27-42` — *"Define it in `build/SKILL.md` so it is never restated in a plan."*** → **Already built.** The contract ships in `dispatch-implementer.ts` and `dispatch-qa.ts` with 57 passing tests. The job is to delete the three competing prose models (`build/SKILL.md:74`, `:223-224`, `implementation-phase-workflow.md:173-195`) and point `SKILL.md` at the scripts — after moving the two things `:223-224` has and the script does not.
- **`:133` — *"confirm the PLAN adapter genuinely handles part IDs, statuses, dependency edges, and session bindings across a split."*** → Unachievable, and not this prompt's problem: `adapters/plan.ts` has zero code references to any of them. Prompt 5 owns it. Do not attempt it here.

And from an earlier "Prompt B", `:127` — *"PRDs live at `docs/planning/…` via the Pattern 2 three-phase write… confirm rather than assume"* → **do not use Pattern 2.** A single `write_note` with the full colon title, per `two-step-edit-pattern.md:272`.
