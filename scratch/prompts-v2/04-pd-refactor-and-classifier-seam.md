# Prompt 4 — Progressive-disclosure refactor: decompose, recompose, defrag — with create-skill driving

_Run after prompt 1 (`freeze-and-baseline`). Prompt 6 (`curate-and-tier-chain`) imports the classifier seam this prompt creates. Paste everything below into a fresh Claude Code conversation._

---

**Execution contract (R-31): before doing anything else, read `scratch/prompts-v2/RUN-CONTRACT.md` — it sits beside this file — and run this entire prompt in its collaborative mode: granular, guided, opinions labeled, no assumptions. It overrides any "autonomous" framing below.**

## How to read this prompt — the provenance register

Every substantive statement below carries one of four tags. This is the contract that keeps Peter's decisions his, and the assistant's analysis labeled as analysis:

- **[DECIDED]** — Peter decided it, dated, in his own words where quotable. Do not re-litigate and do not re-ask.
- **[WONDERING]** — Peter's open questions. These ARE the interview: raise each at its marked moment via `AskUserQuestion`, exactly once, with the full relevant text shown. Attached recommendations are the assistant's, never his. Nothing in this register is pre-decided, however confident the recommendation sounds.
- **[FACT]** — measured repo or tool reality, with reproduction where it matters. Verify before relying on one; report mismatches as drift, not as license to improvise.
- **[DEFAULT]** — assistant design suggestions. Adopt or improve at runtime; deviations are *reported* with the measurement that justified them, not asked about.

If anything below reads as [DECIDED] but smells like an assumption, stop and surface it. That is a defect in this prompt, not a constraint on you.

## The authority rule  [DECIDED 2026-07-27]

**`create-skill` (user-level, `/Users/peter.kloss/.claude/skills/create-skill/`) is the authority for skill-authoring mechanics.** Load it first and let it drive the refactor lifecycle end to end — its stages, its eval workflow, its validators, its own sign-off gates, at its own pace. This prompt deliberately does **not** restate the skill's internals; its references carry the operational traps and you will meet them when the skill directs you to. Where anything in this prompt appears to conflict with `create-skill` about *how* to author or test a skill, `create-skill` wins — say so in the report when it happens.

Peter's words, from the review: *"why are we defining this now when the create-skill skill knows how to handle it?"* — this prompt supplies only what the skill cannot know: facts about this repo, Peter's decisions, and Peter's open questions.

`grill-me` (user-level) is available if an interview segment benefits from its adversarial style; plain `AskUserQuestion` per P4-1 is otherwise fine. [DEFAULT]

## Standing rules (programme-wide)

- **P4-1 — Every question goes through `AskUserQuestion`.** Max **4 authored options**; "Other" is auto-appended, so never author one, and say in the question text that Peter can type his own answer there. Questions are written in **plain language** — no internal jargon, no stage numbers, no file:line in the question body unless Peter is ruling on that exact text; what breaks and what it costs, stated simply. (A fuller ASK-STANDARD is being developed in prompt 7's interview [DECIDED 2026-07-27]; until it lands, this paragraph is the standard.)
- **P4-2 — One decision per question, one question in flight.** A multiselect decomposing a single decision is not a bundle.
- **P4-3 — Author the moment it locks.** Never defer to a later phase or turn.
- **P4-4 — Independent evaluation mandate on every skill touched (D-2).** Evaluate as if handed the skill cold. Ranked findings, each with a recommended action and one-line rationale. Apply nothing without approval. Honest short list beats padding.
- **P4-5 — The full `create-skill` lifecycle runs for every skill touched, under the skill's own procedure.** [DECIDED — D-2 plus the authority rule above.] The one repo fact the skill cannot know: **prompt 1 already took the week-0 snapshot** to a dated off-tree workspace. Find it, confirm it covers all three skills, record the path. **If it does not exist, stop and tell Peter** — a skill edited without its before-state is permanently unmeasurable.
- **P4-6 — Binary tool rule.** `docs/**` → Brain MCP; everything else (skill bodies, references, config, `.ts`) → `Read`/`Edit`/`Write`, on which Brain MCP is forbidden. Essentially all of this prompt's output is non-graph. Normative source: `KNOWLEDGE-GRAPH-CONVENTIONS.md:184-186`, `:202`.
- **P4-7 — Git.** Verify the branch first. One branch for the whole prompt. Coherent commits (≤5 files or one logical change). Leave unmerged. Do not push. No `--no-verify`, no force-push. No indication of AI contribution in any commit message.
- **P4-8 — Update cost is work, not an argument (D-19).** *"I wanna do something because it's the right decision to make."*
- **P4-9 — Nothing deleted in bulk; nothing deleted before its destination is live and verified** (read-back or exercise, not assertion). `Bash(rm:*)` is in the permissions `ask` list (`settings.json:158`): every deletion raises a prompt even when approved in principle. Expect it; never route around it — no `find -delete`, no substituted `git rm`, no removal script. A blocked deletion is recorded as deferred, not worked around.
- **P4-10 — Read before designing, and say what was read. Do not sample.**
- **P4-11 — Precedence:** skills plugin > brain plugin > home specs > auto-memories.
- **P4-12 — Fail closed; never "document a rationale and proceed."** The corpus has 27 such branches (A4 F-37's enumeration — cite the register, not a grep). These three skills currently have **none** (`decompose/SKILL.md:768`: *"Never skip adjudication."*). Keep it that way; reject, don't edit down, any proposal that introduces one.
- **P4-13 — Do not build what already ships.** Three built-but-uncalled artifacts are in play here: `end/scripts/run-pre-flight.ts` (290 lines), `validateIntegrityFloor` (`core/validate.ts:32`), and the brief-rendering inversion in `build/scripts/`. All have **zero non-test, non-hook callers** (`ANALYSIS-005:61-62`) — phrase it exactly that way; bare "zero callers" is false and checkable. Wire, don't rebuild.
- **P4-14 — No sentence claiming a schema/validator/mutation "enforces" anything against production data** until prompt 5 lands. Say what runs, where, against what. (Background facts, populations included: `parsePlanNote` fails 7 of 7 of the example-collection PLANs and 1 of 2 of this repo's own; the composition suite is 458 synthetic-fixture tests, not 82.)

---

## Facts about the three skills  [FACT]

| Skill | SKILL.md lines | Words | `references/` | `scripts/` |
|---|---|---|---|---|
| `decompose` | 770 | 6,702 | 0 | 0 |
| `recompose` | 594 | 4,614 | 0 | 0 |
| `defrag` | 319 | 2,586 | 0 | 6 |
| `plan` (the in-repo exemplar of the target shape) | 289 | 2,835 | 8 (1,415 lines) | 4 |

- `decompose/SKILL.md` invokes **five** distinct CLI entry points across **twelve** invocation sites, all in `shared/composition/src/` — reproduce with `grep -o "shared/composition/src/[a-zA-Z-]*\.ts" decompose/SKILL.md | sort -u` (→5) and `grep -c` of the same (→12). `:441` is a continuation line, not a thirteenth site.
- The style authority is `create-skill/references/authoring-style.md` — hand the file itself to every agent rather than paraphrasing it. Its ~450-line body target, never-both rule, MUST-usage rules and description cap all bind from there, not from this prompt.
- Design language for the cut [DEFAULT]: the spine keeps the contract (invariants, gates, exit codes, refusal semantics); references carry the mechanism. "Would a reader who skips this ship something broken?" → spine.
- **Terminology hazard**: "decompose" carries **eight** unrelated senses across Peter's corpus (the skill; `/plan --split`; spec Stage-1 ADR decomposition; orchestrator work decomposition; EPIC-into-tasks; architectural subsystem breakdown; the 5-Layer Runtime Decomposition; Ideation Phase 4) and "defrag" carries three. Do not introduce a ninth.
- Duplication measurements between `decompose` Step 4 (`:121-453`) and `recompose` Step 3 (`:53-306`): char-level similarity **0.416**; identical non-blank lines **36 of 280**; identical sentences 13 of 89. The structure matches 5/5 subheadings; the prose is a hand-paraphrase. **Six measured divergences where the failure direction inverts between split and merge** (what retires; graph-leg emphasis; batch boundary; figure loss vs figure inflation; correction orphaning vs correction resurrection; merge-only source residue). A single file covering both directions would tell a merge operator to watch for figure *loss* when the real risk is *inflation*.
- Frontmatter census of all 11 plugin skills: descriptions split 2 block-scalar / 5 single-quoted / 4 bare; none sets `allowed-tools`/`model`/`effort`/`context`; `defrag` and `ingest` carry a non-standard `triggers:` key. Description lengths vs the 1,024-char cap: `review` **1,054 — already over and silently truncating today**; `spec` 984; `build` 966; the three skills owned here are 391/365/429.
- `skill-reviewer` is an external plugin agent, and both `skill-creator@claude-plugins-official` and `plugin-eval@claude-code-workflows` are `false` in `settings.json` — **verify `skill-reviewer` resolves before treating it as a gate**; otherwise use `create-skill`'s inline fresh-eyes fallback and say which path ran.

---

## Step 0 — The map gate  [BLOCKING GATE]

Before any edit lands, deliver two tables and stop:

- **Table A — duplication map**: one row per fact stated in more than one of the three SKILL.md files — every site with file:line and actual text, plus the single surviving home you propose.
- **Table B — terminology map**: the senses of "decompose"/"defrag" listed above, each with its site, plus one line each: which sense your new text uses, and what wording you use where you mean another.

Wait for Peter's go. No reply is a stop, not an implied yes.

---

## The interview — things Peter is wondering about  [WONDERING]

These are Peter's open questions, carried here so they are asked **once, at the natural moment, by you** — not pre-decided in this prompt and not re-interviewed anywhere else. One decision in flight (P4-2). Plain language (P4-1). Show the full current text whenever he is ruling on existing text. Record every answer verbatim in the report; never re-ask an answered item.

**W-1 — before any spine is written: the six pieces of current text that may not be silently lost.** Show each verbatim with its site, ask keep / move / change / drop per item. Assistant recommendation: keep all six.

1. SHA-256 round-trip checksum on every split/merge (`decompose/SKILL.md:510`; `recompose/SKILL.md:351`; impl `shared/composition/src/decompose.ts:399-439`, `core/partition.ts:107-121`). Without it: silent content loss or duplication.
2. The approve/reject/abort `AskUserQuestion` adjudication gate before any execution (`decompose:454-460`, `recompose:307-309`, reinforced `decompose:28`, `:768`, `recompose:21`). One wording defect rides along whatever he decides: *"exactly these three options"* was always false — the tool auto-appends "Other." If kept, rewrite as "three authored options plus the automatic 'Other'," semantics unchanged, and note the change.
3. The `SKILLS_DOCS_ROOT` symlink-containment export **together with its fail-open caveat** (`decompose:498-500` ≡ `recompose:338-340`; code `core/validators.ts:121-129`). Separated, someone copies the export and assumes containment they don't have.
4. The inbound-reference impact manifest — dangling-link blast radius computed **before** adjudication (`decompose:123-128`; merge-side `recompose:55-59`). Without it: review discovers dead links instead of approval.
5. `defrag`'s delegation contract (`defrag/SKILL.md:293-312`) **plus a new honest disclosure**: it has never executed — `printingDelegation` (`defrag/scripts/defrag.ts:52-71`) only `console.log`s the dispatch, admitted in its own docstring (`:16-20`).
6. The no-sample-wikilink footgun (`decompose:93-101`): a backticked example wikilink in a generated note becomes a real unresolved graph edge.

**W-2 — at the name-collision step: the cleanup shape for D-14.** D-14 itself is [DECIDED]: the ACMElabs `defrag` is the only `defrag`. How far the cleanup goes is his open question. The moving parts, all [FACT]:

- Five live coexistence claims: `defrag/SKILL.md:314-319` and `:30-32`; `ingest/SKILL.md:78-82` and `:28-29`; `skills/README.md:146-151` (the user-facing one).
- The SPEC-006 historical record under `skills/docs/` carries 21 more "coexistence" hits across 13 files — **they are the record of a shipped spec, are `docs/**`/Brain-MCP territory, and are not live instructions; the recommendation is to leave every one untouched** and say so, so surviving hits aren't read as an incomplete sweep. Scoped verification: `grep -rn "Coexistence\|coexist" skills/skills/*/SKILL.md skills/README.md` → 0.
- `~/AGENTS.md:102` carries a workflow-table row pointing at `~/.claude/workflows/defrag.md`; the target file's existence is unverified. Recommendation: remove the row either way; read-then-delete the file if it exists (through the rm gate), report non-existence otherwise.
- Whether the old basic-memory `memory-defrag`/`memory-ingest` can be suppressed at all is a research task with three honest outcomes: a real mechanism (use it, document the reversal) / none exists (log for prompt 12) / upstream-edit-only (**don't** — `basic-memory` is read-only, always; report-only). Do not invent a suppression or describe an uninstall as one.
- Whether `ingest`'s two sites ride along with `defrag`'s. Recommendation: yes — identical construction, same falsehood.

**W-3 — before the classifier-seam edits: the three code changes.** Context, all [FACT]: prompt 6 builds `curate` as `defrag`'s pre-write sibling (Peter wants it in the skills plugin), and it must call *this* classifier, not author a second one that drifts. `classify` at `defrag/scripts/audit.ts:144` has no `export` and no direct tests (exercised only through `audit()`); `interface Thresholds` at `:93` is also unexported, so external `Partial<Thresholds>` cannot resolve; the evidence-builder never reads thresholds, so a thresholds parameter on it would be inert and misleading; the threshold constants at `audit.ts:84-90` are the single source and must stay that way. The edits, with recommendation "all three":

- (a) `export` `classify` + write its first direct unit tests.
- (b) `export interface Thresholds`; add `evaluateDraft(draft: string, entityType: string): AuditEvidence` — the evidence-construction block lifted out of the loop, frontmatter supplied by the caller, `lastModifiedISO: null` so the stale arm never fires; `classify` then runs unchanged against drafts. Tests included.
- (c) Move `DelegationAdapter`, `DelegationOutcome`, `safeCall`, `tallyOutcome` (`defrag.ts:40-50`, `:220-246`) to a shared module so defrag (post-hoc) and curate (pre-write) share one contract and one failure policy.

Scope note whatever he picks: this establishes **one *audit* classifier** — `repoint-classify.ts` and `cynefin-classifier` are unrelated and out of scope; never write a bare "one classifier" sentence. And regardless of the answer: **`curate` does not exist after this prompt and nothing references it** — prompt 6 owns it.

**W-4 — before wiring: the note checker.** [FACT]: `end/scripts/run-pre-flight.ts` (290 lines, zero non-test callers) already validates note structure — observation/relation minimums with categories and verbs, final-two-sections order, folder-by-type, title/permalink shape — deriving from the composition library's canonical enums. Two defects to fix first if wiring: `TYPE_FOLDER` (`:51-67`) omits `feature`, so every `type: feature` note fails forever (consistent fix: `feature: "roadmap/"`); and there is no body-string entry point for path-less drafts (path-dependent checks must report **skipped**, not passed). The question: wire it to run after every split/merge write (decompose Step 8 / recompose Step 7 reports, invoked from the SKILL.md step so the gate is *named* somewhere) — and if so, **report-only or blocking?** Recommendation: wire it, report-only — the write already happened, nothing rolls back, but a failure must be impossible to miss and never phrased as "documented and proceeded." Keep this concession sentence alive wherever the gate is documented (`decompose:712-715`): *"the hashes guarantee the bytes moved intact, not that the sentences about them are still true."*

**W-5 — at the doc-code step: the eight documented-but-not-implemented gaps.** Apply all as prescribed / walk them / subset — recommendation: apply all. The register, all [FACT]:

| Item | Fiction | Prescribed fix |
|---|---|---|
| FIC-6 | `defrag/SKILL.md:79-291` — 213 of 319 lines are audit procedure **no code implements**, unmarked | Label explicitly as agent procedure, move to references |
| FIC-8 | `run-pre-flight.ts` + `validate-spec-done.ts` fully built, named in no skill doc | W-4 fixes half; name both wherever the gate lands |
| FIC-35 | `--basic-memory` flag: parsed, stored, documented, tested — **never read** (`AuditOptions` has no such field) | Delete the flag |
| FIC-36 | `defrag.ts:8-9` docstring states exit codes **backwards**; code+usage()+SKILL.md+test all agree against it | Fix the docstring, not the code (cron depends on current behavior) |
| FIC-37 | Split-on-line-count qualifier *"with multi-entity content"* — no such predicate exists (`audit.ts:163` is a bare line-count check) | Implement it or delete the qualifier; not a documented phantom |
| FIC-38 | SKILL.md says "grouped markdown" report; the actual contract (`report.ts:38-76`, pinned by tests) is documented nowhere | Document it in a `report-format` reference |
| FIC-39 | `ingest/SKILL.md:59-61` claims six verifications; kebab check is dead code, relation-type check is two comment lines, order check passes interlopers, verification runs after the un-rollback-able write | Correct the claims to what the code does |
| FIC-40 | `ingest/SKILL.md:74-76` claims content "augmentation"; `assemble.ts:112-117` takes verbatim or regenerates, never augments | Delete the claim |

Plus two invisible-but-defensible behaviors to document wherever defrag's thresholds are described: `classify` can put one note in multiple buckets (no early return), and staleness reads **git, not mtime** — a never-committed note can never be stale.

**W-6 — only if the refactor genuinely reaches it: wiring defrag's delegation for real.** `defrag` has never actually invoked `decompose`; the stub prints. Four options — recommendation is (1): wire a real `Skill(skill="decompose")` dispatch keeping `printingDelegation` as the CLI-only default / leave the stub for prompt 6 / wire behind a `--dispatch` flag, default off / delete the no-op default and require an adapter argument. Do not manufacture this question if the work never reaches it.

---

## Execution steps

1. **Load `create-skill`; find the prompt-1 snapshot** (P4-5); run the lifecycle under the skill's own procedure and gates for all three skills. The skill's own sign-offs (e.g. eval-prompt approval, if its empirical stages apply here) are additional human rounds and belong to it, not to this prompt.
2. **Parallel proposals, central reconciliation.** One agent per skill *proposes* its restructure; you reconcile the `defrag` ↔ `decompose` ↔ `recompose` delegation text and the shared-reference boundary yourself, in one place, before any write lands. Give every agent identical briefs: `authoring-style.md` itself, plus the repo riders — budgets below, the leaning shared-ref design, spine-keeps-contract, no new escape hatches (P4-12), frontmatter = `name` + `description` (+ existing `user-invocable`) only. An agent violating the brief is re-dispatched with the violation named, not silently corrected.
3. **Write the spines and references**, honoring the W-1 answers. Budgets [DECIDED 2026-07-27: **targets, not gates**]: aim ~195 (`decompose`) / ~150 (`recompose`) / ~130 (`defrag`); overshoot carries a stated reason in the report; only authoring-style's ~450 ceiling is hard. Shared references [DECIDED as a leaning, not locked — *"happy to lean towards it… not something I want to lock in"*]: start from one shared impact-manifest reference (~80% common mechanics) plus ~35-line per-direction riders per the divergence facts above; `create-skill`'s judgment plus measurement may override the cut — report the decision, don't ask.
4. **Name-collision cleanup** per the W-2 answers.
5. **Classifier-seam edits** per W-3. Any tooling authored is pure Bun (R-21).
6. **Note-checker wiring** per W-4, prerequisite fixes first.
7. **Doc-code gaps** per W-5.
8. **Frontmatter.** Remove `triggers:` from `defrag` and `ingest`, folding every trigger phrase into `description` — this is mechanically forced, not a preference: the loader silently ignores the key AND `create-skill`'s own validator hard-fails on it, so the lifecycle cannot pass while it stays; `quick_validate.py:62` names this exact migration. Both descriptions land far under the 1,024 cap. Do not add `version:` (trap key; and flag `authoring-style.md:282` vs `:114` as a create-skill self-contradiction — upstream defect, report only). Report the full description census including `review`'s 1,054-char live truncation — `review`, `spec`, `build` are **not yours to edit here**; measure, name the consequence, recommend.
9. **Independent evaluation (P4-4/D-2).** Ranked findings per skill, cold-read, beyond the brief. Present one skill at a time, ≤4 findings per question, multiselect = apply; nothing unselected is applied.
10. **The markdown-first append [DECIDED 2026-07-27, R-28].** After every read of `authoring-style.md` this prompt performs, append to its **end** a section carrying the ratified substance of `feedback_claude_code_markdown_first.md`: user-visible script output is markdown (Claude Code strips ANSI; upstream issues closed not-planned); ANSI only behind a `Bun.stdout.isTTY` guard; ANSI-emitting libraries (Ink, chalk, boxen) disqualified for skill scripts. Append-only — the file's existing line numbers must be unchanged (`git diff` proves it). The source memory stays in the layer, indexed; prompt 12 cleans it as MIGRATED.

## Boundary

- `shared/composition/src/decompose.ts` / `recompose.ts`: untouched except what W-4's wiring strictly requires; show that diff.
- No `PlanNoteSchema` parse, no `validatePlanDoneClaim`, no `validateIntegrityFloor` wiring — prompt 5 owns PLAN-side validation; record the `validateIntegrityFloor` hole (≤50% runtime rule advertised at `schemas/base.ts:105`, enforced nowhere) as known-open for prompt 5.
- Nothing in `plan/` changes; `--split` unchanged.
- `curate` does not exist after this prompt and nothing points at it.

## DECIDED — do not re-litigate

| Decision | Source |
|---|---|
| create-skill drives; this prompt supplies only repo facts, decisions, and Peter's open questions | owner, 2026-07-27 |
| Full lifecycle + independent-evaluation mandate | D-2 |
| Budgets are targets, not gates; only the ~450 ceiling is hard | owner, 2026-07-27 |
| Shared-reference design is a leaning starting design, create-skill may override with measurement | owner, 2026-07-27 |
| The ACMElabs `defrag` is the only `defrag` (cleanup shape = W-2) | D-14 |
| `triggers:` removed from `defrag`+`ingest`, phrases folded into `description` | forced by create-skill's own validator |
| ASK-STANDARD (AskUserQuestion usage standard) is developed in prompt 7's interview, not here | owner, 2026-07-27 |
| The markdown-first append lands here, at the end of the run | owner, 2026-07-27 (R-27/R-28) |
| Update cost is work, not an argument | D-19 |

## Git

Verify branch first; one branch; coherent commits (spines separable; seam one change; cleanup one change; gaps one change; append one change). Unmerged, no push, no `--no-verify`, no AI attribution. Every deletion through the `Bash(rm:*)` gate; no workarounds; the report says so.

## Done means

- [ ] Step 0's two maps delivered and answered **before any edit**.
- [ ] `create-skill` loaded and drove the lifecycle; its own gates were respected; the prompt-1 snapshot was found and covers all three skills (or the run stopped).
- [ ] **Every W item was raised at its marked moment, once, in plain language, and its answer is recorded verbatim in the report. No W item was decided silently, and none was asked twice.**
- [ ] Spines and references authored per the answers; any budget overshoot has a stated reason; the shared-vs-per-skill cut is reported with its measurement.
- [ ] Whatever survived W-1 is quoted with its new file:line — nothing merely discoverable.
- [ ] The W-2 cleanup executed as answered; the scoped grep returns 0; the SPEC-006 record is untouched and the report says so.
- [ ] W-3 edits as answered; thresholds still declared exactly once; `curate` nonexistent and unreferenced.
- [ ] W-4 wiring as answered, prerequisite fixes included, mode (report-only/blocking) stated.
- [ ] All eight W-5 items fixed or explicitly accepted per the answers, one line each; the two invisible behaviors documented.
- [ ] `triggers:` gone from both skills with every phrase preserved in `description`; `create-skill`'s validator passes for every skill touched; the description census is reported including `review`'s overrun.
- [ ] Ranked findings delivered per skill; nothing applied without approval.
- [ ] `authoring-style.md` appended at the end only — prior line numbers unchanged, shown by `git diff`.
- [ ] Composition files untouched except the W-4 wiring diff, shown.
- [ ] Branch/commits per P4-7; every deletion went through the rm gate with no workaround, and the report says so.
