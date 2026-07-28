# Prompt 6 — `curate` and the tier chain: the pre-write curation gate, built by create-skill

_Run after prompt 1 (`freeze-and-baseline`) and prompt 4 (`pd-refactor-and-classifier-seam`) — this prompt imports the classifier seam prompt 4's W-3 interview settled. One of the programme's 11 active prompts. Paste everything below into a fresh Claude Code conversation._

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

**`create-skill` (user-level, `/Users/peter.kloss/.claude/skills/create-skill/`) is the authority for skill-authoring mechanics — and this prompt creates a skill.** Load it first and let it drive `curate`'s creation lifecycle end to end — its stages, its eval workflow, its validators, its own sign-off gates, at its own pace. This prompt deliberately does **not** restate the skill's internals. Where anything here appears to conflict with `create-skill` about *how* to author or test a skill, `create-skill` wins — say so in the report when it happens.

Peter's words, from the review: *"why are we defining this now when the create-skill skill knows how to handle it?"* [DECIDED — R-30] — this prompt supplies only what the skill cannot know: facts about this repo, Peter's decisions, and Peter's open questions.

## Standing rules (programme-wide)

- **P4-1 — Every question goes through `AskUserQuestion`.** Max **4 authored options**; "Other" is auto-appended, so never author one, and say in the question text that Peter can type his own answer there. Questions are written in **plain language** — no internal jargon, no stage numbers, no file:line in the question body unless Peter is ruling on that exact text; what breaks and what it costs, stated simply. (A fuller ASK-STANDARD is being developed in prompt 7's interview [DECIDED 2026-07-27]; until it lands, this paragraph is the standard.)
- **P4-2 — One decision per question, one question in flight.** A multiselect decomposing a single decision is not a bundle.
- **P4-3 — Author the moment it locks.** Never defer to a later phase or turn.
- **P4-4 — Independent evaluation mandate on every skill touched (D-2).** Evaluate as if handed the skill cold. Ranked findings, each with a recommended action and one-line rationale. Apply nothing without approval. Honest short list beats padding.
- **P4-5 — The full `create-skill` lifecycle runs for every skill touched, under the skill's own procedure.** [DECIDED — D-2 plus the authority rule above.] The one repo fact the skill cannot know: **prompt 1 already took the week-0 snapshot** to a dated off-tree workspace. Find it, confirm it covers every existing file this prompt edits (the lifecycle skills and the brain `memory` skill; `curate` is net-new, so an empty before-state is correct for it), record the path. **If it does not exist, stop and tell Peter.**
- **P4-6 — Binary tool rule.** `docs/**` → Brain MCP; everything else (skill bodies, references, config, `.ts`, `~/CLAUDE.md`) → `Read`/`Edit`/`Write`, on which Brain MCP is forbidden. Essentially all of this prompt's output is non-graph. Normative source: `KNOWLEDGE-GRAPH-CONVENTIONS.md:184-186`, `:202`.
- **P4-7 — Git.** Verify the branch first. One branch for the whole prompt. Coherent commits (≤5 files or one logical change). Leave unmerged. Do not push. No `--no-verify`, no force-push. No indication of AI contribution in any commit message.
- **P4-8 — Update cost is work, not an argument (D-19).** *"I wanna do something because it's the right decision to make."*
- **P4-9 — Nothing deleted in bulk; nothing deleted before its destination is live and verified** (read-back or exercise, not assertion). `Bash(rm:*)` is in the permissions `ask` list (`settings.json:158`): every deletion raises a prompt even when approved in principle. Expect it; never route around it — no `mv` to scratch, no `git rm`, no redirect, no truncate-to-empty, no removal script. A blocked deletion is recorded as deferred, not worked around. If W-7 approves removals, that is several prompts in a row; answer each.
- **P4-10 — Read before designing, and say what was read. Do not sample.** The file:line facts below are a working set, not a verified census; open every citation you rely on.
- **P4-11 — Precedence:** skills plugin > brain plugin > home specs > auto-memories.
- **P4-12 — Fail closed; never "document a rationale and proceed."** The corpus has 27 such branches (A4 F-37's enumeration — cite the register, not a grep). `decompose/SKILL.md:768`: *"Never skip adjudication."* `curate` inherits that posture; reject, don't edit down, any proposal that gives it an escape hatch.
- **P4-13 — Do not build what already ships.** Two built-but-uncalled artifacts are in play here: `end/scripts/run-pre-flight.ts` (290 lines, the structural validator) and `validateIntegrityFloor` (`core/validate.ts:32`). Both had **zero non-test, non-hook callers** before prompt 4 (`ANALYSIS-005:61-62`) — phrase it exactly that way; bare "zero callers" is false and checkable. Wire, don't rebuild. Before writing any function, grep for its name; this rule caught two errors in this prompt's own earlier draft.
- **P4-14 — No sentence claiming a schema/validator/mutation "enforces" anything against production data** until it has run against production data and the number is reported. (Background: `parsePlanNote` fails 7 of 7 example-collection PLANs and 1 of 2 of this repo's own; the composition suite is 458 synthetic-fixture tests, not 82.)

---

## The mission

Author `curate` — `defrag`'s **pre-write sibling**: `defrag` audits notes after the fact, `curate` runs before any note is written. It lives in the **skills plugin, not brain** [DECIDED — D-22]. The chain and tiering are D-22's (the ledger records the architecture as *"proposed and tentatively accepted"* — treat the shape as set; report, don't ask, any deviation the work forces):

> brain `memory` skill (preloaded by every specialist, carries the imperative) → **invokes** `curate` → **invokes** `decompose`/`recompose`/`defrag` only when the plan calls for one. Every link an **invocation**, never a frontmatter `skills:` entry (frontmatter preloads the full body). Do **not** bundle the three execution skills into `memory`.

| Tier | Carrier | This prompt adds | Actual load cost |
|---|---|---|---|
| 1 | `~/CLAUDE.md` | the imperative, ~3 lines | the whole file, always |
| 2 | `brain/skills/memory/SKILL.md` | imperative + pointer, ~5 lines | the whole 723-line body, in 22 of 27 agents, at startup |
| 3 | `plan`/`research`/`decisions`/`spec` bodies | standing instruction + dispatch | that skill's body when it runs |
| 4 | `curate/SKILL.md` | the full mechanism | nothing until invoked |

This is the entire point of D-22's tiering: the three execution skills (~1,683 lines between them before prompt 4's refactor; smaller after) stay behind an invocation, never a preload.

The genuinely net-new logic is a three-way adjudicator: given a draft and its neighbours, decide **merge / split-then-merge / create**, with create as the fallback and never the default [DECIDED — D-6].

What `curate` governs, exactly:

- **NEW captures only.** It is the routing point R-13 installed: lifecycle-owned learnings route into their lifecycle home and do not regrow in the auto-memory layer; **non-lifecycle captures may still legitimately land in the layer** [DECIDED — R-13]. No phase-out framing anywhere — the layer is thinned, never eliminated [DECIDED — R-1].
- **Not the existing layer.** Auto-memory content is unratified by default, and review of existing layer content is prompt 12's owner-run per-item process — `curate` must not bulk-classify, re-bucket, or "clean up" existing memories on its own authority [DECIDED — R-26/R-27].

Any tooling authored here is pure Bun TS [DECIDED — R-21]. **HUMAN ATTENTION: heavy interview** — eight W items (W-1 and W-5 conditional), plus the map gate and the ranked-findings round.

## Facts — preload, seam, terms  [FACT]

- Peter owns the brain plugin (`brain/.claude-plugin/marketplace.json:3-5`), so editing it is legitimate; R-23 still bounds every brain edit: light and specific, never wholesale.
- `brain/skills/memory/SKILL.md` (723 lines) is preloaded **in full** by 22 of 27 brain agents at startup — the only skill any agent preloads; the preload is agent-side (`SKILL.md:1-14` has no `agents:` key). `brain/skills/taste-lints/SKILL.md:68` names the problem in the plugin's own words: *"Skills exceeding 500 lines need progressive disclosure refactoring."* Hence: chain links are invocations, and **order is forced — `curate` exists first, then the pointer, then the dispatch** [DECIDED — forced by the preload: a pointer written before `curate` exists ships a broken instruction into 22 agents on every run]. The *imperative* ("curate before you write") is a rule, not a reference, and may land at any point.
- The skill and `brain/agents/memory.md` (811 lines) are **not** byte-identical duplicates: `diff` reports 1,048 changed lines, 305 common; only `## Session Log Creation` is near-identical (`SKILL.md:572-623` vs `memory.md:703-755`). No agent preloads the *agent*; it is dispatched by name.
- **The seam is prompt 4's W-3** (three edits, recommendation was "all three"): (a) `export classify` (`defrag/scripts/audit.ts:144`) + first direct tests; (b) `export interface Thresholds` + `evaluateDraft(draft, entityType)` — the draft-shaped entry point with `lastModifiedISO: null` so the stale arm never fires; (c) `DelegationAdapter`/`DelegationOutcome`/`safeCall`/`tallyOutcome` moved to a shared module. The thresholds at `audit.ts:84-90` are **the single source; copying them into `curate` is the drift bug this architecture exists to prevent.** What actually landed depends on Peter's W-3 answer — verify before writing any import (W-1 governs the gap).
- `end/scripts/run-pre-flight.ts` is the structural note validator; `runChecks(markdown: string, filePath: string)` **already takes a body string** (declared `:230`, exported `:290`). Pure wiring — do not design a string-accepting variant. Known defect unless prompt 4's W-4 prerequisite fix landed: `TYPE_FOLDER` (`:51-67`) has 15 entries and no `feature`, so every `type: feature` note fails forever; `ingest/scripts/detect.ts:20-37` carries all 16 and is the reference. Prompt 4's W-4 also settled whether it is wired into decompose/recompose and report-only vs blocking — read that answer; do not contradict it.
- Terminology: "decompose" carries **eight** unrelated senses across the corpus (the skill; the `spec-decomposition` phase; PLAN two-level decomposition `plan/SKILL.md:167`; requirement→TASK in build; EPIC→tasks; architectural-breakdown prose `~/KNOWLEDGE-GRAPH-STRUCTURES.md:322`/`~/NOTE-TEMPLATES.md:342`; the 5-Layer Runtime Decomposition `~/AGENTS.md:11`; "Ideation Phase 4 — Decomposition" `~/AGENT-SYSTEM.md:816`); "defrag" carries three. "decompos" appears **zero** times in `documentation/` — the collision is invisible to users. This prompt writes dispatch text under that hazard; do not introduce a ninth sense. Prompt 4's W-2 owned the coexistence-claim cleanup — verify, don't redo.
- No adjudicator exists: `grep -rn "decideCuration\|CurationVerdict"` → 0. But `grep -rEl "curation|curate|merge-vs-split" /tmp/corpus | grep -v node_modules` → **53 files** of prior thinking (defrag, `spec`/`decisions` references, `curating-memories`, ADR-005, ANALYSIS-001/007/008, QA and SESSION notes). Read the relevant ones before designing; the only defensible novelty claim is the missing merge/split/create decision itself. Nearest existing *input*: `ImpactManifestSchema` (`shared/composition/src/schemas/reference-manifest.ts:334`) — blast radius, not affinity.

## Step 0 — The map gate  [BLOCKING GATE]

Before any edit lands, deliver and stop:

- **Table A — curation-decision map**: every site that today decides create-vs-update, with file:line and actual text.
- **Table B — memory-skill surface**: what the 723 lines actually contain, by block — this is the evidence base W-7 is answered against.
- **Table C — the tier chain today**: what each of the four tiers currently holds.
- **The `CONTEXT.md` draft** [DEFAULT design]: no file by that name exists anywhere in the corpus, so this is net-new authorship at the skills-plugin root — one canonical sense per term for skill instructions, plus a disambiguation table naming the other senses with their sites. Reuse prompt 4's Table B output if it survives.

Why the terminology piece blocks rather than tidies: this prompt writes `curate`'s dispatch text and the L1–L3 replacements, all of which say "decompose" to an agent that will otherwise resolve it eight ways. It is one short file — not an excuse to spend the session on terminology.

Wait for Peter's go. No reply is a stop, not an implied yes.

## The interview — things Peter is wondering about  [WONDERING]

These are Peter's open questions, carried here so they are asked **once, at the natural moment, by you** — not pre-decided in this prompt and not re-interviewed anywhere else. One decision in flight (P4-2). Plain language (P4-1). Show the full current text whenever he is ruling on existing text. Record every answer verbatim in the report; never re-ask an answered item.

**W-1 — conditional, at the seam verification: closing the seam gap.** Ask only if prompt 4's W-3 landed **less than all three** seam edits; if the seam is complete, record "seam inherited" and move on. Plain terms of what each missing piece costs: without the exported classifier, `curate` cannot judge note health except by copying `defrag`'s code, and the copy drifts within a month; without the draft entry point, nothing can check a note *before* it is written (the existing checker needs a file with git history — a draft has neither); without the shared delegation module, the before-write and after-write tools carry two different failure policies for the same dispatches. Options: (a) land the missing pieces now, in `defrag`'s own files, per prompt 4's design; (b) land only the subset `curate` strictly needs, naming what is lost; (c) hold — author `curate` without classifier integration and record the gap. Assistant recommendation: (a). Whatever he picks: never a copy, never a second classifier, thresholds stay declared once.

**W-2 — before any code: does the brain `memory` *agent* own curation dispatch?** (D-22's recorded OPEN.) Facts: 22 agents preload the *skill*; **no agent preloads the agent** — it is dispatched by name; the two files differ by 1,048 lines. Plain: when it's time to run the curation check, should the instructions every specialist already carries do the dispatching, or should a separate memory agent be the gatekeeper? A gatekeeper nobody currently loads means new wiring in every caller. Options: (a) no — the skill carries the imperative and the pointer, the lifecycle skills dispatch; (b) yes — the agent owns dispatch, the skill points at the agent; (c) both — lifecycle skills dispatch, agent as escalation for large or cross-cutting curation; (d) neither — dispatch only in the lifecycle skills, no pointer in `memory` at all. Assistant recommendation: (a) — the only path that reaches the callers today.

**W-3 — same sitting: where does the gate fire?** Options: (a) inside the delegated agent — it holds the content but is blind to its siblings, so it will answer "create" too often; (b) in the orchestrator — it sees all returning analyses, but must round-trip content; (c) both — agent for structural checks, orchestrator for affinity; (d) at the write boundary inside `curate` itself, neighbours supplied by the caller. Assistant recommendation: (b) — **and put the counter-argument in front of Peter**: `feedback_agents_author_durable_notes` (a Step-9 source) says the agent writes its own note via a single `write_note` and the orchestrator surfaces it *without retranslating*; option (b) is adjacent to that forbidden retranslation, and option (d) may reconcile both.

**W-4 — before the skill body is authored: adjudication frequency.** The load-bearing question — answered wrong, the gate gets switched off within a month. Three shipped positions conflict, all live, none owner-ratified (R-26): `curating-memories/SKILL.md:143` prompts `Proceed? (y/n)` on every curation (anti-pattern row at `:200`); `decompose/SKILL.md:454` / `recompose/SKILL.md:307` / `decompose:768` make adjudication mandatory; `feedback_orchestrate_notes_silently.md:32,:46` forbids narrating merge/split motion. The cost model, plainly: `research` dispatches one analyst per requirement (`research/SKILL.md:84`), so twelve requirements mean twelve-plus curation decisions per phase, each written the moment it lands (D-7) — prompt on every one and the phase stops twelve times. Options: (a) verdict-tiered — `create` silent, non-lossy merge silent, **every split and every lossy merge prompts**; (b) prompt on every verdict; (c) batch verdicts at phase/part boundaries; (d) never prompt — log each verdict as a session event. Assistant recommendation: (a). Two riders fold in here, whichever wins: **(i) confirm the merge path is draft-then-recompose** [DEFAULT design]: `recompose` merges N *existing* notes, so new content is written as its own note first, then recomposed into the target (N=2) — a direct `edit_note` merge silently drops the SHA-256 round-trip guarantee. The cost is a transient note; if Peter would rather accept an unchecksummed `edit_note` for small merges, he should say so knowingly. **(ii) the fate of the draft note when a merge is rejected or fails** — the assistant expects it stays (it is a valid note; create was always the fallback), but that is a design choice to state, not default. And regardless of the winner, "non-lossy" gets a **mechanical** definition, never a similarity score [DEFAULT]: SHA-256 round-trip holds, `runChecks` passes on the result, no observation dropped, inbound-reference manifest empty. Cautionary [FACT]: `validateIntegrityFloor` is advertised as live at `shared/composition/schemas/base.ts:105` and invoked only by its own tests (`tests/plan-integrity-floor.test.ts:236,:256,:273`).

**W-5 — immediately after W-4, unless W-4 landed on (b): what forces a prompt regardless of the base posture.** If W-4 = prompt-on-everything, this is vacuous — skip it and record the skip with its reason (that satisfies Done-means; a silent skip does not). Multiselect, pick any: (a) any curation whose inbound-reference manifest is non-empty — another note points at the thing being changed (`curating-memories/SKILL.md:197` already carries the concern); (b) any curation touching a note whose status is `ACCEPTED` or `DONE`; (c) any verdict where `runChecks` fails on the post-curation result; (d) any split of a note over the line-max — exactly `decompose`'s existing gate, nothing more. Assistant recommendation: (a).

**W-6 — at the ADR-reset step: curation on a reviewed ADR.** The invariant behind the question: merging or splitting a reviewed ADR leaves an artifact the review never saw. No reset rule exists anywhere; the closest protocol (`brain/skills/adr-review/references/agent-prompts.md:546-551`) supersedes and re-links but never resets review status. Show these with the question [FACT]: `adr-review/SKILL.md:19-23` sets `file_triggers` on `create, update, delete` with `auto_invoke: true` — review already fires on **every write**, so "re-queue" may be automatic and the real work is stopping it firing continuously; the debate's consensus rule is *"All 6 agents Accept OR Disagree-and-Commit"* (`references/debate-protocol.md:190-194`) — there is **no ≥5-ACCEPT threshold**, whatever `decisions/SKILL.md:172` says; worst case ≈68 agent invocations per ADR. Options: (a) reset review status and re-queue whenever curation touches a reviewed ADR; (b) keep the status and log a dated Clarifications line; (c) forbid curation on reviewed ADRs above a size band — an assistant extension with no existing rule behind it, offered only as a guardrail; (d) write only the invariant here and defer the rule to prompt 7. Assistant recommendation: (a). Prompt 7 owns *when* `adr-review` fires either way.

**W-7 — at the tier-2 step, before any brain-side deletion: the memory-skill strip.** The original design deleted three things outright: `brain/skills/memory/SKILL.md:652-721` — 70 lines of usage guidance for Tier-2-Episodic/Tier-3-Causal capabilities the same file marks `[FUTURE]` at `:103`/`:108`, preloaded into 22 agents; the whole `brain/skills/memory/references/` — 9 files, 4,810 lines documenting a Serena/Forgetful/PowerShell/`.agents`-JSON architecture that `SKILL.md:226` itself lists as an anti-pattern, with behavioural contradictions (`references/skill-reference.md:330` *"Skill only reads memory, never writes"* vs `SKILL.md:296` *"All agents MAY write"*); and `memory/scripts/*.ps1|*.psm1`. **Peter's R-23 says brain edits are light and specific, never wholesale, and flags strip-shaped steps for possible narrowing to "targeted edit + pointer" — so the strip's shape is his call, not this prompt's.** One more input for the weighing, a fact and not itself a reason to delete: the `.ps1`/`.psm1` scripts sit against R-21's pure-Bun direction. Plain: the memory instructions loaded by nearly every agent include 70 lines about features that don't exist, plus a 4,810-line reference set describing a superseded architecture — a reader following the references concludes there is no write path. Options: (a) full removal as designed — every `rm` through the ask gate, one by one; (b) **targeted edit + pointer** — remove at most the 70-line `[FUTURE]` block (one contiguous, specific cut), banner the references and scripts as superseded with a pointer to the current canonical guidance, delete nothing else now; (c) defer the whole strip to the later brain-slice prompts. Assistant recommendation: (b) — wholesale directory deletion sits poorly against R-23 unless Peter sanctions it here. If he picks (a): the old draft claimed a P4-9 exemption ("superseded architecture, no destination required") — that exemption is **his to ratify in this answer**, and anything found in the nine files that *does* have a destination is surfaced, not deleted.

**W-8 — at the tier-2 vocabulary edit: 13 or 16 entity types.** The memory skill tells 22 agents there are 13 note types (`:234`; table `:338-352`); the canonical list is 16 (`~/KNOWLEDGE-GRAPH-CONVENTIONS.md:304`); the three missing — `spec`, `plan`, `prd` — are exactly the ones the lifecycle produces most, and `~/AGENT-SYSTEM.md:1071-1085`/`:1426-1440` repeat the 13. `ingest/scripts/detect.ts:20-37` carries all 16. Plain: agents are currently told the lifecycle's own note types do not exist. Options: (a) reconcile the memory skill up to 16; (b) reconcile down to 13 and change the home specs; (c) defer entirely to prompt 11's home-spec reconciliation; (d) 16 here, and leave the file's two contradictory relation vocabularies (`:396-399` vs `:696`) to prompt 11 — noting `:696` sits inside the `:652-721` block, so W-7's answer may dissolve that half. Assistant recommendation: (a).

---

## Execution steps

1. **Load `create-skill`; find the prompt-1 snapshot** (P4-5); run `curate`'s creation — and the edits to every other skill touched — under the skill's own procedure and gates. Its sign-offs are additional human rounds and belong to it, not to this prompt.
2. **Verify the prompt-4 inheritance; report a built-vs-inherited table**: `classify`'s export, `Thresholds`, `evaluateDraft`, the shared delegation module, the W-4 note-checker wiring, `TYPE_FOLDER`'s `feature` entry. Raise W-1 if the seam is incomplete. Any classification piece W-1 approves is authored **in `defrag`'s files** — classification stays on `defrag`'s side of the seam — pure Bun (R-21), with tests. Never `import` a name before proving it resolves.
3. **Author `CONTEXT.md`** at the skills-plugin root from the approved map-gate draft. From here on, every instruction written in this prompt that names "decompose" or "defrag" uses the canonical sense or qualifies itself.
4. **Interview W-2 → W-5, then author the skill**: `skills/curate/SKILL.md` + `curate/references/note-authoring.md` + `curate/scripts/` (pure Bun). The four Step-9 source memories total 413 lines; ~140 body / ~150 reference is the working target [DEFAULT — `create-skill`'s style authority governs]. The body carries:
   - the three-way decision, **create documented as the fallback and never the default** [DECIDED — D-6];
   - the seam, stated so no future reader re-derives it: `defrag` classifies (imported), `curate` adjudicates (`decideCuration`, net-new), `decompose`/`recompose` execute (invoked via `Skill()`, through the shared delegation contract where it exists), `run-pre-flight` validates. Thresholds imported, never re-declared;
   - the merge path exactly as W-4 settled it, **with its reason stated in the body** — a rule whose reason is absent gets optimised away by the next reader;
   - the adjudication policy exactly as W-4/W-5 settled it, no escape hatch (P4-12);
   - the pre-write structural gate: **measure `runChecks` against a real sample of `docs/**` notes first and report the pass rate as a number** (P4-14); a low rate is a templates-vs-validator finding, never a bypass;
   - the R-13 routing rule for new captures: lifecycle-owned content → its lifecycle home; non-lifecycle → the auto-memory layer remains a legitimate destination;
   - no `## Coexistence` section; written as **standing instructions**, not one-time steps — a skill body enters context once and is not re-read.

   The net-new signature, a starting design to verify, not a specification [DEFAULT]:

   ```ts
   export type CurationVerdict =
     | { action: "merge";  target: string; rationale: string }   // executed per W-4's merge path
     | { action: "split";  target: string; seam: string; then: "recompose"; rationale: string }
     | { action: "create"; folder: string; rationale: string };  // fallback, never default
   export function decideCuration(draft: string, entityType: string, neighbours: NoteSummary[]): CurationVerdict;
   ```
   `neighbours` comes from Brain MCP search — the memory-first step D-6 already mandates.

   Prior art — read before authoring, say which were read [FACT]. **Extend**: `brain/skills/memory/SKILL.md:484-493` (the create-vs-update binary this replaces; `:493` *"Always search before creating"*) and `:539-569` (Freshness Protocol — the only staleness/conflict-resolution protocol in the corpus); `brain/skills/using-forgetful-memory/SKILL.md:121-151` (D-6's create-is-the-fallback ladder, already written down); `curating-memories/SKILL.md:126-131` (needs a merge row, a split row, and its create default inverted). **Call, don't restate**: `adr-review/references/deletion-workflow.md:52-77` (archive-vs-delete-vs-block table); `adr-review/references/agent-prompts.md:516-551` (the only note-splitting protocol in brain); `memory/SKILL.md:495-535` (`edit_note` mechanics). **Do not inherit**: `curating-memories` as the base — "split" appears zero times in it and two of its four decision rows default to creating a new note, inverting D-6; `analysis-provenance` — a name collision, it classifies *code files*, nothing to do with analysis notes; `research-and-incorporate` — it scores on note **count** (`SKILL.md:100`; `references/workflow.md:358` *"Create 5-10 atomic notes"*), structurally hostile to merge-first — **surface that contradiction as a finding; do not absorb it**.
5. **The ADR reset rule** per W-6. Prompt 7 owns the timing half and will apply it.
6. **Tier 1 — `~/CLAUDE.md`** [DEFAULT texts; adopt or improve, deviations reported]. The Memory-First Gate (`:282`; four steps `:289-292`) fires only on five *change* triggers (`:294-300`) — it never fires on a write; curation is its missing fifth step. Three edits in the file's existing format: widen the lede (*"…and do not write a note until you have decided whether it belongs in one that already exists"*); add step 5 — the merge / split-then-merge / create decision, create as fallback; add one Anti-Patterns row to the table at `:327-341`. One consistency repair: the `:26` note-creation routing row must agree with the gate. These edits are R-1-safe — the file is later *thinned to pointers plus non-lifecycle content, never deleted*, and a pointer-sized imperative is exactly what survives thinning. The empirical case for tier 1 [FACT]: `brain/skills/context-optimizer/SKILL.md:91-96` — baseline 53% / skill alone 53% / skill + explicit instructions 79% / **passive context 100%**. A skill alone changed nothing. Then run that file's own duplicate detector on the result (`scripts/test_skill_passive_compliance.ts`, named at `context-optimizer/SKILL.md:250`): its check 6 is exactly the tier-1/2/3 duplication this chain risks.
7. **Tier 2 — the brain `memory` skill**, every edit R-23-bounded. **MEM-POINTER** (~5 lines, in the file's own idiom): a `curate` row in `## Related Skills` (`:280-286`), and the three-way decision anchored at `### Create vs Update Decision` (`:484-493`); reuse `:469-482`, which already carries D-7's cadence (*"Update note after each finding during research"*). **The strip per W-7 — nothing brain-side is deleted before that answer.** **Vocabulary per W-8**, plus one forced fix regardless: the type table's `test-report` row became `qa` [DECIDED — forced by the 2026-05-21 rename, recorded *"per user directive"* at `~/KNOWLEDGE-GRAPH-CONVENTIONS.md:304`; `run-pre-flight.ts:51-67` already enforces `qa`, so the skill currently tells 22 agents to write a type the validator rejects]. Report the file's resulting line count with its arithmetic; there is **no numeric pass/fail gate** — flag ~670+ as a question about what else should go, never as a reason to skip the pointer.
8. **Tier 3 — the lifecycle bodies.** The discipline goes in the **body** of `plan`, `research`, `decisions`, `spec` — early, ahead of the mode/step tables; not a reference, not progressive disclosure [DECIDED — D-7]. The dispatch repairs, each a breakage fix and D-6's upgrade point [FACT]:

   | # | Site | Today | Becomes |
   |---|---|---|---|
   | L1 | `research/SKILL.md:53` | *"the gate is a meta-rule from the orchestrator protocol"* | `Skill(curate)` |
   | L2 | `research/SKILL.md:201` | *"the memory-first auto-rule (orchestrator protocol) handles Step 0.5"* | `Skill(curate)` |
   | L3 | `research/references/analysis-phase-workflow.md:47` | *"a meta-rule from the orchestrator protocol, not a separate skill dispatch"* | `Skill(curate)` |

   No orchestrator protocol carries this rule; the real carrier is `feedback_memory_first_gate`, whose lifecycle-owned content Step 9 re-authors into `curate` (the source file stays on disk — prompt 12's owner review settles it). Then the one-line change that is the whole point: `research/SKILL.md:84`'s *"Dispatch ANALYSIS only for reqs WITHOUT existing notes"* — a binary skip-if-exists — becomes the three-way curation decision [DECIDED — D-6 makes the binary wrong: a requirement *with* an existing note is a merge or a split, not a skip]. `decisions` gains its first memory-first gate (it has none — grep `decisions/` for memory-first or `brain_brain__search` → nothing). `spec`'s memory-first (`spec/references/spec-decomposition.md:45-67`) gains the curation decision and a halt — today it can find a 90%-overlapping SPEC and proceed.
9. **Migrate the four curation memories — destination-first re-authoring** [DECIDED — R-26]: the memory is an input, never the artifact; verbatim only as a deliberate, reviewed exception; flag in the report every constraint that derives solely from an auto-memory. Sources stay on disk for prompt 12's owner-run review; nothing is deleted here.

   | Source (survives in the layer) | Sole-source content to carry | Destination |
   |---|---|---|
   | `feedback_memory_first_gate.md` | the three-way MATCHES / CONTRADICTS / NEW classifier (`:66-84`) — the closest existing thing to D-6's decision; reconcile the 4-step (`~/CLAUDE.md:289-292`) vs 5-step (`memory/SKILL.md:117-121`) gate variants, or flag | `curate` body |
   | `feedback_load_template_before_creating_note.md` | the pre-write note gate (`:23-36`); the counter rule at `:61`, verbatim — *"Counters are entity-type-global, not slot-global per folder"* — with `:64`'s worked example and `:66`'s TASK-per-SPEC exception; `:129`'s list of what basic-memory does not auto-fill. **Do not migrate `:98-105`** — its SESSION structure contradicts `plan`'s canonical one; reconcile against `plan` or leave it out and flag for prompt 10 | `curate` body + `references/note-authoring.md` |
   | `feedback_agents_author_durable_notes.md` | agent authors its own note via one `write_note`; orchestrator reads it back and surfaces it without retranslating (the W-3 counter-argument) | `curate` body + lifecycle dispatch text |
   | `feedback_always_check_memories.md` | the precedence rule (`:42-50`); search-before-you-write (`:58`) | `curate` body |

   And one line not on this list that must not be lost: `feedback_draft_adrs_evolve_continuously.md:38` — *"Use the `recompose` / `decompose` primitives for content-preserving restructure"* — is the **only** instruction anywhere in the system to use those primitives. Its home is `decisions` and prompt 7 owns the rest of that file; carry that one sentence into `curate` **now** and record prompt 7's ownership, so the instruction cannot die in a sequencing gap.
10. **Independent evaluation (P4-4/D-2)** on `curate` (as authored), the brain `memory` skill, and `curating-memories`: cold-read, ranked findings, ≤4 findings per question, multiselect = apply; nothing unselected is applied. Three starting points most likely to be under-weighted: the `research-and-incorporate` count gate as a systemic incentive rather than a local defect; whether `curate`'s standing instruction actually survives the once-into-context mechanic; whether the W-4 posture as settled is one an operator still has switched on after a month of use.

## Boundary

- `brain/skills/memory/SKILL.md:572-623` and `brain/agents/memory.md:703-755` — the near-identical session-template twins — are untouched **whatever W-7 answers**: the canonical session definition does not exist until prompt 10, and deleting one leaves the surviving twin silently outranking any correct definition (it is always in context). They go together, in one commit, after prompt 10's definition lands.
- No bulk classification, re-bucketing, or review of existing auto-memories, and no auto-memory file deleted [DECIDED — R-26/R-27; prompt 12's lane].
- `decompose`/`recompose` untouched; `defrag`'s files touched only for what W-1 sanctions.
- `adr-review` timing and `research`'s never-locks prohibition → prompt 7. Home-spec template precedence → prompt 11. `~/CLAUDE.md` gets the Step-6 gate edits only; its R-1 thinning belongs to prompts 11/12.

## DECIDED — do not re-litigate

| Decision | Source |
|---|---|
| `curate` lives in the skills plugin, as `defrag`'s pre-write sibling | D-22 |
| The invocation chain and four-tier shape; no frontmatter `skills:` links; no bundling into `memory` | D-22 (ledger: *"tentatively accepted"* — shape set; deviations reported, not re-asked) |
| create-skill drives `curate`'s creation; this prompt supplies only repo facts, decisions, open questions | owner, 2026-07-27 (R-30) |
| Curation runs before writing; create is the fallback, never the default | D-6 |
| The discipline sits in skill bodies, early — not progressively disclosed | D-7 |
| New captures are routed: lifecycle-owned leaves the layer, non-lifecycle may stay; the layer is thinned, never eliminated | R-13; R-1 |
| Existing-layer review is prompt 12's owner-run process; auto-memory content is unratified by default; migration is destination-first re-authoring | R-26; R-27 |
| Any tooling authored here is pure Bun TS | R-21 |
| Brain edits light and specific, never wholesale — W-7 exists because of this | R-23 |
| `test-report` → `qa` wherever the memory skill states a type list | forced by the 2026-05-21 rename (KGC `:304`, "per user directive") |
| Full lifecycle + independent-evaluation mandate | D-2 |
| Update cost is work, not an argument | D-19 |

## Git

Verify branch first; one branch; coherent commits (suggested: curate skill; W-1 seam edits; `~/CLAUDE.md` gate; memory-skill pointer + W-7/W-8 outcomes; lifecycle dispatch; memory migration). Unmerged, no push, no `--no-verify`, no AI attribution. Every deletion through the `Bash(rm:*)` gate; no workarounds; the report says so.

## Done means

- [ ] Step 0's three maps plus the `CONTEXT.md` draft delivered and answered **before any edit**; `CONTEXT.md` approved before `curate/SKILL.md` was authored, and every instruction naming "decompose"/"defrag" uses the canonical sense or qualifies itself.
- [ ] `create-skill` loaded and drove the lifecycle; its own gates were respected; the prompt-1 snapshot was found and covers every existing file touched (or the run stopped).
- [ ] **Every W item was raised at its marked moment, once, in plain language, and its answer is recorded verbatim in the report. No W item was decided silently, and none was asked twice.**
- [ ] The built-vs-inherited seam table reported; `classify` imported, never copied; any `evaluateDraft` authored lives in `defrag`'s `audit.ts`; thresholds still declared exactly once (`audit.ts:84-90`).
- [ ] `decideCuration` exists and returns the three-way verdict; `create` documented in the body as the fallback; the merge path documented as W-4 answered it, with the checksum reason and the rejected-merge fate stated.
- [ ] `runChecks` wired against its existing `:230` string signature — no variant authored; its pass rate on a real `docs/**` sample reported as a number; a low rate reported as a finding, never patched with a bypass.
- [ ] `TYPE_FOLDER` includes `feature` — verified by running, not assumed from prompt 4 — and the `qa` rename is reflected wherever the memory skill states a type list.
- [ ] The seam stated in `curate`'s body; no second classifier exists; no `## Coexistence`; no escape hatch (P4-12).
- [ ] `~/CLAUDE.md`: widened lede, fifth step, one Anti-Patterns row, `:26` row agreeing with the gate — and nothing else in that file touched.
- [ ] Tier 2 landed per the W-7 and W-8 answers; pointer rows present at `:280-286` and `:484-493`; the memory skill's resulting line count reported with its arithmetic (no numeric gate).
- [ ] `plan`/`research`/`decisions`/`spec` carry the standing instruction in the body, early; `decisions` has a memory-first gate for the first time; `research/SKILL.md:84` is the three-way decision; L1–L3 no longer cite a nonexistent "orchestrator protocol".
- [ ] The four memories destination-first re-authored into `curate` and read back; source files still on disk; every solely-memory-derived constraint flagged per R-26; the `:98-105` SESSION block not migrated verbatim; `feedback_draft_adrs_evolve_continuously.md:38`'s clause live with prompt 7's ownership recorded.
- [ ] The `research-and-incorporate` note-count contradiction surfaced as a finding, not absorbed.
- [ ] The session-template twins untouched, with the reason recorded in the commit.
- [ ] `create-skill`'s validator passes for every skill touched, and there is no benchmark regression against the prompt-1 snapshot — both reported, under the skill's own procedure.
- [ ] Ranked findings delivered for all three evaluated skills; nothing applied without approval.
- [ ] Branch/commits per P4-7; every deletion went through the rm gate with no workaround, and the report says so.
