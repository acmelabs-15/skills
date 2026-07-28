# Prompt 8 — Nothing left to assume: close the hatches, build the way back, and define re-entry

_Run after prompt 7 (`never-defer-research-and-decisions`). Prompt 9 (`build-autonomy-and-derived-waves`) depends on this prompt — specifically on the spec-generator TASK-relations fix (execution step 6), without which prompt 9's derived waves compute over an empty graph. Paste everything below into a fresh Claude Code conversation._

This is the heaviest-interview prompt in the programme: nine W items, several multi-call by design. Each is raised once, at its marked moment — there is no fixed question budget to spend or defend.

---

**Execution contract (R-31): before doing anything else, read `scratch/prompts-v2/RUN-CONTRACT.md` — it sits beside this file — and run this entire prompt in its collaborative mode: granular, guided, opinions labeled, no assumptions. It overrides any "autonomous" framing below.**

## How to read this prompt — the provenance register

Every substantive statement below carries one of four tags. This is the contract that keeps Peter's decisions his, and the assistant's analysis labeled as analysis:

- **[DECIDED]** — Peter decided it, dated, in his own words where quotable. Do not re-litigate and do not re-ask.
- **[WONDERING]** — Peter's open questions. These ARE the interview: raise each at its marked moment via `AskUserQuestion`, exactly once, with the full relevant text shown. Attached recommendations are the assistant's, never his. Nothing in this register is pre-decided, however confident the recommendation sounds.
- **[FACT]** — measured repo or tool reality, with reproduction where it matters. Verify before relying on one; report mismatches as drift, not as license to improvise.
- **[DEFAULT]** — assistant design suggestions. Adopt or improve at runtime; deviations are *reported* with the measurement that justified them, not asked about.

If anything below reads as [DECIDED] but smells like an assumption, stop and surface it. That is a defect in this prompt, not a constraint on you.

## The authority rule  [DECIDED 2026-07-27 — R-30]

Runtime skills are the authority for their own mechanics; this prompt does not restate them. Peter's words, from the review: *"why are we defining this now when the create-skill skill knows how to handle it?"*

- **`create-skill`** (user-level, `/Users/peter.kloss/.claude/skills/create-skill/`) owns skill-authoring and evaluation mechanics for every skill this prompt touches — its stages, its validators, its own sign-off gates, at its own pace. Where this prompt appears to conflict with it about *how* to author or test a skill, `create-skill` wins — say so in the report when it happens.
- **`grill-me`** (user-level) is available if an interview segment benefits from its adversarial style; plain `AskUserQuestion` per P4-1 is otherwise fine. [DEFAULT]
- Where accounts of repo reality disagree: **A4's reconciliation > the corpus maps > the ledger's PART 2 findings.** The ledger's PART 1 decisions (D-numbers) remain citable. Every PART 2 fact restated below is already in A4's corrected form. [FACT]

## Standing rules (programme-wide)

- **P4-1 — Every question goes through `AskUserQuestion`.** Max **4 authored options**; "Other" is auto-appended, so never author one, and say in the question text that Peter can type his own answer there. Questions are written in **plain language** — no internal jargon, no stage numbers, no file:line in the question body unless Peter is ruling on that exact text; what breaks and what it costs, stated simply. (A fuller ASK-STANDARD is being developed in prompt 7's interview [DECIDED 2026-07-27, R-29]; until it lands, this paragraph is the standard.)
- **P4-2 — One decision per question, one question in flight.** A multiselect decomposing a single decision is not a bundle.
- **P4-3 — Author the moment it locks.** Never defer to a later phase or turn. Append each answer to the Locked Decisions table as it lands.
- **P4-4 — Independent evaluation mandate on every skill touched (D-2).** Evaluate as if handed the skill cold. Ranked findings, each with a recommended action and one-line rationale. Apply nothing without approval. Honest short list beats padding.
- **P4-5 — The full `create-skill` lifecycle runs for every skill touched, under the skill's own procedure.** [DECIDED — D-2 plus the authority rule above.] The one repo fact the skill cannot know: **prompt 1 already took the week-0 snapshot.** Find it, confirm it covers `spec` and whatever this prompt edits in `research`/`decisions`, record the path; benchmark against it, never re-baseline. **If it does not exist, stop and tell Peter.** Verify `skill-reviewer` resolves before treating it as a gate; otherwise use `create-skill`'s inline fresh-eyes fallback and say which path ran.
- **P4-6 — Binary tool rule.** `docs/**` → Brain MCP; everything else (skill bodies, references, config, `.ts`) → `Read`/`Edit`/`Write`, on which Brain MCP is forbidden. Route by artifact, not phase — nearly everything this prompt writes is skill text. Normative source: `~/KNOWLEDGE-GRAPH-CONVENTIONS.md:184-186`, `:202`.
- **P4-7 — Git.** Verify the branch first. One branch for the whole prompt. Coherent commits (≤5 files or one logical change). Leave unmerged. Do not push. No `--no-verify`, no force-push. No indication of AI contribution in any commit message.
- **P4-8 — Update cost is work, not an argument (D-19).** *"I wanna do something because it's the right decision to make."*
- **P4-9 — Nothing deleted in bulk; nothing deleted before its destination is live and verified** (read-back or exercise, not assertion). `Bash(rm:*)` is in the permissions `ask` list (`settings.json:158`): every deletion raises a prompt even when approved in principle. Expect it; never route around it — no `find -delete`, no scratch-directory `mv`, no substituted binary. A blocked deletion is recorded as deferred, not worked around.
- **P4-10 — Read before designing, and say what was read. Do not sample.**
- **P4-11 — Precedence:** skills plugin > brain plugin > home specs > auto-memories.
- **P4-12 — Fail closed; never "document a rationale and proceed."** The organising principle of this prompt. **State no corpus-wide hatch tally** — `grep -rni "rationale.*proceed" /tmp/corpus` → 2, `"escape hatch"` → 8, `"rationale-and-proceed"` → 0; the only adjacent measured figure counts *gates*, not hatches (`ANALYSIS-005…:64`: *"23 of 27 enumerated gates fully phantom"*). What is defensible: the **nine named prose branches in W-3's table, each at file:line**, plus the schema hatch (W-2) that subsumes them. Counter-models to imitate: `build/SKILL.md:257` + `build/references/exit-gates.md:3` — *"'I'll fix in review' is NOT acceptable rationale"* — and `brain/agents/orchestrator.md:1890-1892` (*"If the validator cannot run… **DO NOT claim completion**"*).
- **P4-13 — Do not build what already ships.** `end/scripts/run-pre-flight.ts` (290 lines) already validates note structure: `runChecks(markdown, filePath)` defined at `:230`, called internally at `:267`, exported at `:290`. No SKILL.md references it; `ANALYSIS-005…:61` records *"0 of 17 lifecycle scripts invoked by any SKILL.md."* Wire, don't rebuild.
- **P4-14 — No sentence claiming a schema/validator/mutation "enforces" anything against production data.** Background facts, populations included: `parsePlanNote` fails 7 of 7 of the example-collection PLANs and 1 of 2 of this repo's own; the composition suite is **458 synthetic-fixture tests, not 82** (458 pass / 0 fail at its last recorded run — `skills/docs/qa/QA-030-SPEC-002-reconcile-session-adapter-design-001-drift.md:35`, `:38`); the facts section below shows the same synthetic-green problem for REQ, DESIGN and TASK. And [DECIDED — R-16]: **the ten claim validators stay unwired as gates by decision** — advisory tooling only, available to prompt 9; the QA agent's PASS/FAIL judgment is its own. Say what runs, where, against what; re-report suite counts from your own run, never quote 458 forward.

Any script or tooling this prompt authors is **pure Bun TS** (R-21).

---

## What this prompt is for

**The no-assumptions contract is Peter's, decided** [DECIDED — ledger D-20]:

> The purpose of research → decisions → spec is to produce a definition **comprehensive enough that the owner and the agent have equivalent understanding of what is being built, with no gaps and no unknowns.** Build can only be autonomous if the specs leave the implementer no room to assume. When spec authoring hits something requiring a decision **no ADR makes**, that is **not a gap to document** — it is a signal to go back to research and decisions, iterating with curation, until it is decided, and only then return to spec.

(Two living memories carry the same principle — `feedback_spec_implementation_no_assumptions`, `feedback_no_guessing_always_ask`. Both are assistant-authored and unratified by default [R-26], pending the prompt-12 review; the principle binds via the ledger, so cite the ledger, not the memories.)

Peter shipped the acceptance test in his own docs [FACT], `workflows.html:256-258` verbatim: *"**The test for "done enough"** — Hand the spec to the AI and ask: "what would you still have to assume to build this?" If the answer isn't "nothing," close the gaps before building."*

**Change requests are spec-driven** [DECIDED — ledger D-21]: after specs are done and the build has shipped, feedback (e.g. the UX team wants functionality changed) goes back to research, through decisions with curation of the analysis and decision notes, updates the spec, and re-enters build to implement the delta. Not bolted on.

**Downstream context** [DECIDED — R-15/R-16]: the build phase consumes specs through a two-step per-task model — the implementer reads the TASK note and, via Relations, its REQ + DESIGN notes; the QA agent receives the same refs and reads the same notes; on FAIL the orchestrator routes back pointing at the QA note; the PASS/FAIL verdict is the QA agent's judgment alone. Spec content must therefore make **TASK→REQ→DESIGN traversal complete and unambiguous**. The build mechanics themselves are prompt 9's — nothing here restates them beyond this consumption contract.

The assistant's diagnosis of where `spec` fails D-20's test, all [FACT]-backed below: gates that disable themselves on resume; escape hatches on the gates that do run; no defined way back to `/decisions` or `/research`; and no post-ship re-entry at all. The resume defect is fixed first — closing a hatch on a gate that never fires changes nothing. [DEFAULT — sequencing]

---

## Step 0 — The map gate  [BLOCKING GATE]

**The resume defect that orders everything** [FACT]: three of `spec`'s four gates permanently disable themselves on resume. The G2 resume table re-runs Phase 3 validation, Gate A, and Gate B only *"if SPEC root status is still DRAFT"* (`spec/SKILL.md:109`, `:111`, `:112`); only the ADR coverage gate (`:110`) is unconditional. But Step 5 writes the status that makes those guards false: `spec/SKILL.md:133` — *"SPEC root status = ACCEPTED at creation"* — and `:107` treats DRAFT as evidence Step 5 didn't complete. Blast radius on any resumed Stage 2: 11 pre-flight + 6 post-write checks per note (`spec/references/authoring-workflow.md:16-37`), Gate A on every REQ, and all four Gate B drift checks — silently skipped; and the Final step's `status: DRAFT → ACCEPTED` find_replace (`spec-authoring.md:216`) can never match, because the string it looks for was never written. A1 (X-8/T-3) calls this the worst live consequence of any self-contradiction in the corpus and rules the order: resolve inside `spec` first — it contradicts itself — then override `~/NOTE-TEMPLATES.md`. Second-order effect: Gate B(a) is the **only** gate in the corpus running in D-20's direction (spec → undecided thing), and on a resumed part it does not fire at all.

Before any edit lands: open all **twelve** files that make up `spec` — `SKILL.md`, its 5 references (`authoring-workflow.md`, `bi-directional-relation-closure.md`, `spec-authoring.md`, `spec-decomposition.md`, `spec-templates.md`), its 6 scripts (`validate-design-schema.ts`, `validate-req-schema.ts`, `validate-task-schema.ts`, each with its test). Then deliver four tables, actual current text at each line:

1. The **eleven status sites** (W-1), 2. the **nine prose hatches** (W-3), 3. the **six `deferred_rationale` sites** (W-2), paths verified, 4. the **five backward-pointer sites** (W-4).

**Then stop and wait for Peter's go.** No reply is a stop, not an implied yes. The file:line facts in this prompt are inputs to the map, not a substitute for it; if any line number has moved, the file's text is authoritative and the map says so.

---

## The interview — things Peter is wondering about  [WONDERING]

These are Peter's open questions, carried here so they are asked **once, at the natural moment, by you** — not pre-decided in this prompt and not re-interviewed anywhere else. One decision in flight (P4-2). Plain language (P4-1). Show the full current text whenever he is ruling on existing text. Record every answer verbatim in the report; never re-ask an answered item.

**W-1 — after the map clears, before any status edit: the spec status machine.**  [NOASSUME-SPEC-STATUS]

The facts. Eleven sites in one skill say two incompatible things. Born-ACCEPTED (4): `spec/SKILL.md:133`, `:3` (the description asserts it), `spec-authoring.md:96`, `spec-templates.md:268`. DRAFT→ACCEPTED (7): `spec/SKILL.md:12` (*"flip SPEC DRAFT → ACCEPTED"*), `:41`, `:107`, the three resume guards `:109`/`:111`/`:112`, and `spec-authoring.md:212-216`. Outside the skill: `~/NOTE-TEMPLATES.md:326` gives SPEC root `status: DRAFT`, and `authoring-workflow.md:226` carries the anti-pattern row *"DRAFT → ACCEPTED only after ALL gates PASS"* — unenforceable under born-ACCEPTED. A spec blocked on a reopened decision currently has **no status to sit in**; the same held for ADRs (`shared/composition/src/schemas/adr-note.ts:41` admits only `PROPOSED | ACCEPTED | DEPRECATED | SUPERSEDED`) — prompt 7 was to add DRAFT there. **Verify it landed before designing anything that parks an ADR; if it did not, say so and stop.**

Constraint on every option [DECIDED — R-2]: whatever machine wins, its status atoms are a **subset of the shared vocabulary** prompt 5 defines in `shared/composition/src/schemas/common.ts` (`z.enum(Atom.extract([...]))`), drawn from the artifact-lifecycle family (DRAFT/PROPOSED/ACCEPTED/SUPERSEDED…). Same atom = same meaning everywhere; subset, never redefine. A wanted atom missing from the shared set is a prompt-5 coordination item, not a local invention.

Options: (a) born **DRAFT**; the Final step flips to ACCEPTED only when Phase 3, Gate A and all four Gate B checks pass; re-entry reverts to DRAFT · (b) keep born-ACCEPTED; add a parked status for re-entry · (c) keep born-ACCEPTED; make the three resume guards unconditional · (d) born DRAFT with an intermediate review state. Assistant recommendation: (a) — it makes the seven DRAFT→ACCEPTED sites true rather than aspirational, repairs the resume guard without a second concept, lets `spec-authoring.md:216` match, and gives a blocked spec somewhere to sit (W-4 needs that); (c) fixes the gates but leaves the backflow homeless. Whatever wins: apply to all eleven sites plus `~/NOTE-TEMPLATES.md:326`, and report which sites changed and which were deleted.

**W-2 — before touching any hatch: the schema hatch, `deferred_rationale`.**  [NOASSUME-HATCHES]

The facts. In every claim validator, **a string satisfies an unchecked checkbox**. Verbatim from `shared/composition/src/schemas/task-note.ts:110-116`:

```
// Cross-field invariant 2: status DONE requires every DoD item satisfied
// (done === true OR deferred_rationale present). This is the load-bearing
// protocol enforcement — see feedback_per_task_build_qa_cycle.
if (data.frontmatter.status === "DONE") {
  const unsatisfied = data.definition_of_done.filter(
    (item) => !item.done && !item.deferred_rationale,
  );
```

And `spec-root-note.ts:150-154` is worse, adding a third terminal form:

```
const isTerminal = (item: {...}): boolean =>
  item.done || item.marker === "~" || Boolean(item.deferred_rationale);
```

Six sites carry the pattern; verify each path, one moved since an earlier draft:

| # | Site | Note |
|---|---|---|
| 1 | `shared/composition/src/schemas/task-note.ts:110-116` | |
| 2 | `shared/composition/src/schemas/requirement-note.ts:85-98` | |
| 3 | `shared/composition/src/schemas/design-note.ts:91-105` | |
| 4 | `shared/composition/src/schemas/spec-root-note.ts:140-177` | incl. `isTerminal` at `:150-154` |
| 5 | `skills/plan/scripts/set-part-done.ts:100-102` | **not** `shared/composition/src/mutations/` — that directory holds exactly three files, none of them this |
| 6 | `skills/build/scripts/validate-task-done.ts:3-8` | |

Sites 5 and 6 are skill scripts outside the composition library — a ruling applied only inside `shared/composition/` leaves two of the six live. The assistant's analysis: the design is correct in that deferral must be expressible, but under D-20 **a deferral is a decision, not a note** — and this is the one hatch requiring no user interaction, so it is the first reached under load.

Options: (a) remove it from all six sites — an unchecked box is a hard fail · (b) keep it, but require a wikilink to the artifact recording the deferral decision; reject unresolvable targets · (c) keep it, surface every deferral in the PLAN rollup · (d) keep as is; close prose hatches only. Assistant recommendation: (a) for TASK DoD and REQ acceptance criteria, where a deferral is almost always an assumption in disguise; consider (b) for SPEC-root Success Criteria, where a genuine phased deferral is legitimate. If the split is wrong, argue it with the failure case.

**W-3 — immediately after W-2: the replacement shape for the seven prose hatches.**  [NOASSUME-HATCHES]

The register, all [FACT], verbatim hatch text:

| # | Gate | The hatch | Sites |
|---|---|---|---|
| 1 | Gate B(a) — REQ→ADR traceability | *"Add `implements [[ADR-N]]` to the orphan REQ **OR document scope extension**"* | `spec/SKILL.md:198`; longer forms `spec-authoring.md:186`, `authoring-workflow.md:171` |
| 2 | Gate B(b) — scope conservation | *"Add scope-extension rationale **OR** amend the source ADR **OR** remove the REQ"* | `spec/SKILL.md:199`; `spec-authoring.md:194` (`:190` is the rule, not the hatch) |
| 3 | Gate B(d) — cluster alignment | *"Align SPEC scope to Stage 1 cluster **OR document scope-change rationale**"* | `authoring-workflow.md:195` |
| 4 | ADR coverage gate | *"amend the Stage 1 clustering… **OR document explicit deferral with rationale in PLAN Decision Log**"* | `spec/SKILL.md:148`; `authoring-workflow.md:82` |
| 5 | ADR coverage, halt-table restatement | *"Amend Stage 1 clustering OR document deferral rationale"* | `spec/SKILL.md:195` |
| 6 | Gate B(d), halt-table restatement | *"Align SPEC In Scope to Stage 1 cluster OR document scope-change rationale"* | `spec/SKILL.md:201` |
| 7 | Estimate reconciliation (>10% divergence) | HALT resolved by *"documented reconciliation"* | `spec-authoring.md:85` |
| 8 | Buy-vs-build returns BUY-unfit | *"accept BUY anyway"* — no documentation requirement at all | `research/SKILL.md:117` |
| 9 | Same, re-check in decisions | same | `decisions/SKILL.md:216` |

Rows 8–9 were prompt 7's to close — **check their current state first; do not re-edit a closed hatch; report what you found.** Rows 1/3/6 are the same hatch on neighbouring checks — a pattern, not a slip. On row 2, amending the source ADR re-fires nothing (interacts with W-7). Today Gate B(a)/(b)'s "document scope extension" is the **only landing place** for the D-20 case — the spec proceeds and the undecided thing becomes a note — which is why this W and W-4 cannot be answered independently.

Options for rows 1–7: (a) hard halt + `AskUserQuestion` — a scope change is a decision only Peter can authorise · (b) hard halt + mandatory backflow to `/decisions` (W-4's transition), no user question until the decision returns · (c) keep the OR branch but bind it to named enumerated exceptions; unlisted rationales fail · (d) per-gate — hard halt on Gate B(a)/(b) (D-20's direction), enumerated-exception on the coverage gate and estimate reconciliation (bookkeeping, not assumptions). Assistant recommendation: (a). Whichever wins, **every closed hatch gets a named-excuse line** in the `build/SKILL.md:257` style — *"defences must target the specific excuse rather than restate the rule"* (SKILL-002:237); "document scope extension" is one of the named excuses.

Also disposed of here, no separate question [DEFAULT]: **the BLOCKING classification is never enumerated** — Contract 9 (`research/SKILL.md:179-187`; `decisions/SKILL.md:236-238`; `spec/SKILL.md:218-220`) FAIL-halts *only if BLOCKING*, and nothing lists which dispatches are BLOCKING: a fail-open default wearing a fail-closed shape. Enumerate it per skill, per dispatch (`brain:🧠-buy-vs-build-framework` is documented BLOCKING for new capabilities, `resource-bounds.md:92-102`; `brain:🧠-adr-review` is a mandatory blocking gate; everything else is unclassified — classify and report).

**W-4 — before writing any backflow text: the hand-back target.**  [NOASSUME-BACKFLOW]

The facts. **There is no backward transition from `spec`** — five soft prose pointers, none an invocation, a part-status transition, or a protocol: `spec-decomposition.md:37` (*"may require /decisions revision"*), `spec/SKILL.md:190` (*"consider /decisions revision"*), `spec-decomposition.md:228` (*"possibly re-opening /decisions"*), Gate B(b)'s *"amend the source ADR"* (`spec-authoring.md:194`/`spec/SKILL.md:199` — an edit, not a re-entry), and `authoring-workflow.md:81` (a loop *within* spec). And per E-6, scope stated with the claim: `grep -rn '/research' skills/skills/spec/` over all 12 spec files → **5 hits, none a re-entry** (three backward-looking provenance — `spec-decomposition.md:21`, `:23`, `spec/SKILL.md:118`; two tier-missing data-repair halts — `spec/SKILL.md:189`, `:192`).

What is already settled: auto-invocation is out — [DECIDED — forced by `plan/references/auto-routing.md:70`: *"Do not auto-invoke the next phase skill… each phase warrants a fresh user-driven invocation for oversight"*]; every hand-off is mediated by `/plan`, so the transition is a PLAN mutation plus a halt; and queue-and-continue is the silent absorption D-20 forbids. The re-entry principle itself is D-20's (the living memory `feedback_iterative_phase_reentry_on_gap_discovery` states it — *"Phase boundaries… remain re-enterable"*, *"Silent absorption… Forbidden — surface and decide"* — but it is R-26-unratified and its migration is wave 6b, prompts 5/9: **implement here, cite it, leave the file alone**; `decisions/references/per-decision-micro-cycle.md:26` already depends on it by an unnamed alias).

The remaining open fork: when spec halts on an undecided thing, may it hand back **directly to `/research`** when the decision needs analysis first, or is re-entry **always via `/decisions`**? Assistant recommendation: allow both, hand-back naming the target phase — a spec-discovered gap that needs analysis will bounce through `/decisions` as ceremony otherwise. Argue (d)-style narrowing if a direct spec→research jump skips adjudication that matters.

**W-5 — immediately after W-4, four separate calls, one decision each: how re-entry is represented and what stops it thrashing.**  [NOASSUME-BACKFLOW]

1. **PLAN representation**: new `research`/`decisions` part, reopen an existing part, or handle the loop inside the spec part? [FACT to hold: `PartSubstatusEnum` has no `DRAFT` and no `SPLIT`, and `TERMINAL_PART_SUBSTATUSES` (`plan-note.ts:247`) governs whether the PLAN can reach DONE — the choice must be a legal substatus or coordinated with prompt 5 (R-2 families), or it is unimplementable.]
2. **The halt block**: all halts share one schema (Contract 3) — a fenced block with a `<skill>-<step>-halt` info-string carrying `trigger`, `question`, `answer`, `test_failed`, `deferral` (`spec/SKILL.md:175-183`). A backflow halt needs a sixth field naming the decision being opened, or it is not machine-resumable. Yes/no, and the field name.
3. Whether **"document scope extension" survives at all**, and under exactly what conditions (finalises W-3's Gate B(a)/(b) treatment).
4. **The thrash number**: what stops spec bouncing against a decision that keeps reopening. `decisions/SKILL.md:168` already ships *"max 3 re-dispatch iterations, then HALT"*; prompt 9 settles the build loop's cap. Assistant recommendation: reuse 3.

Design against, whatever the answers [DEFAULT]: the silent-absorption default (every gate in this corpus that degrades on absence is taken 100% of the time — `orchestrator.md:1135`'s sync bypass is the proof: the sync agent does not exist, so the escape has been taken on every invocation ever); the unresumable halt (null `answer`, unnamed decision — same defect class as Step 0's resume guard); the one-way trip (a backflow that reopens a decision but never re-validates the REQs that depended on it yields a spec that passed its gates against a decision that has since changed).

**W-6 — at the change-request design, two consecutive calls: entry point, then ACCEPTED-artifact handling.**  [CR-LIFECYCLE]

The facts. **This lifecycle exists nowhere; it is designed from nothing.** Confirm first: a grep of all 30 `research`/`decisions`/`spec` files for `change request`/`change-request`/`post-build`/`feedback`/`delta`/`supersede` *as a lifecycle action* returns zero re-entry paths; the only adjacent text in the plugin is `end/SKILL.md:139`, an abandon path. The scenario is D-21's [DECIDED, above]. Dedupe guard [DECIDED — R-15]: the *build-loop* re-entry on QA FAIL is already ruled — the orchestrator routes back pointing at the QA note — so the CR design covers post-ship feedback only and must not reinvent the in-build loop.

What exists to build on [FACT]: `## Clarifications` is the entire post-ACCEPTED mutation vocabulary (`decisions/references/adr-authoring.md:48-49`; `:13`'s `updated` field is *"same as date initially; refreshed on Clarifications"* — so `updated` alone cannot carry the change signal). Three positions on ADR mutability collide: SKILL-002 C-2's amend-in-place with dated Clarifications; `brain/agents/technical-writer.md:242` — *"Immutable once accepted - new context = new ADR"*; `brain/skills/merge-resolver/SKILL.md:93` — session files immutable (resolution row at `:97`, not `:108`). Surface the collision in the call, do not paper over it. And the verb trap, precisely: `authoring-workflow.md:26`'s check-#9 allowlist (eleven verbs: *"`implements` · `depends_on` · `relates_to` · `extends` · `part_of` · `inspired_by` · `contains` · `pairs_with` · `supersedes` · `leads_to` · `caused_by`"*) contains `supersedes` but **not** `superseded_by`, one of the five inverse verbs (`implemented_by`, `required_by`, `extended_by`, `inspires`, `superseded_by`) that Step 6 bi-directional closure (`bi-directional-relation-closure.md:24` — not `:23`, which is the `inspired_by | inspires` row) mandates emitting — a supersede-based model currently fails the skill's own validation; fix that or choose otherwise knowingly.

*Call 1 — entry point*: (a) a distinct change-request note type that spawns the parts [assistant recommendation — it gives provenance a home] · (b) a new part on the existing PLAN · (c) a new PLAN that `relates_to` the original · (d) reopen the existing research part. Alignment [DECIDED — D-12/R-9]: PRD-first is decided and the PLAN references the PRD, never composes it; product risks live in the PRD; if the entry point authors a PRD, reuse prompt 7's `explainer`-interview suppression — do not invent a second one, and do not re-ask PRD flow.

*Call 2 — per-note-type handling of ACCEPTED artifacts.* The assistant's lean, to argue with: ADR → successor that `supersedes` (decisions are prior art per C-5, not text to overwrite) · SPEC root → amend in place + dated Clarifications (a superseded SPEC leaves the graph two roots) · REQ, DESIGN → amend in place · TASK → new TASK, the original stays DONE (reopening destroys build history and `depends_on` ordering). Failure mode to stress-test in the call: amend-in-place on a SPEC whose TASKs already shipped produces a record describing behaviour nobody built — the answer probably lives in W-7's delta.

**W-7 — immediately after W-6, three consecutive calls, one each: delta computation, adr-review re-fire, provenance.**  [CR-DELTA, CR-PROVENANCE]

*Call 1 — how the delta is **computed**, not guessed.* The substantive call; do not bundle it. The graph already carries the edges (`spec-templates.md:249-255`: `part_of`, `implements` REQ/DESIGN, `depends_on`), so a changed REQ's stale-TASK set is a transitive closure over inverse `implements` plus the `depends_on` fan-out — **the same traversal prompt 9 uses to derive build waves; design them as one traversal, not two** [DEFAULT — flag to prompt 9 in the close-out]. Three fragilities the design must answer [FACT]: check #9 rejects the five inverse verbs closure mandates (and the ADR coverage gate's entire test is `implemented_by [[SPEC-` — `spec/SKILL.md:145` — a verb its own checklist calls invalid); `spec-generator`-authored specs emit no such edges at all (execution step 6); 65 TASK notes currently fail relations validation carrying 78 relation ZodIssues between them (notes ≠ issues — see the facts under W-9). And per P4-12: **when the graph is incomplete, the delta computation halts** — it never falls back to a guess.

*Call 2 — does adr-review re-fire on amendment?* Verify what prompt 7 actually landed on `brain/skills/adr-review/SKILL.md:19-23` (`file_triggers … auto_invoke: true` today) before answering. Decision facts, arithmetic done properly [FACT]: the debate is six agents (`adr-review/SKILL.md:79-86`), round cap 10 — one uncontested review is 6 invocations, worst case ≈68; `~/AGENT-SYSTEM.md:1185` budgets 15 delegations per session, so one review is 40% of a session and one worst-case debate exceeds it >4×. The consensus rule's full three clauses live only at `debate-protocol.md:190-194`: all 6 Accept **or Disagree-and-Commit** = consensus; any Block = another round (< 10); round 10 concludes with unresolved issues documented. There is no ≥5-ACCEPT threshold; 0 Accept + 6 Disagree-and-Commit passes; round 10 concludes rather than halts. A gate that can cost 4.5 sessions and passes on unanimous dissent is not one to re-fire casually — but that judgment is Peter's to make.

*Call 3 — where provenance lives*: on the change-request note; dated Clarifications lines on each amended artifact; the SESSION event ledger; a `caused_by` relation from amended artifact to change-request note. Assistant lean: the relation plus the Clarifications line — traversable and readable. `caused_by` and its inverse `leads_to` are both on the check-#9 allowlist, so that pair is safe in both directions — confirm before recommending. Fold SKILL-002 C-9 here (*"a correction is itself an inference and gets the same interrogation"* — a computed delta is a claim); it decomposes past the 4-option cap, so plan two consecutive calls for it rather than discovering mid-round.

**W-8 — when editing `spec`'s memory-first/search text, two consecutive calls: SKILL-002 E-2.**  [E-2-SEARCH-HYGIENE]

Prompt 7 hands E-2 here and keeps E-1/E-3/E-5 — those are not yours. E-2 (`SKILL-002.md:157-161`): **project-scoped Brain MCP search leaks across project indexes** — and both `spec`'s memory-first step and W-7's delta traversal act on Brain MCP results, so a leaked hit produces a duplicate SPEC or a delta computed over another project's graph. Its six requirements (over the 4-option cap → two calls), all [FACT], measured 2026-07-26:

1. Treat unexpected cross-project hits as noise, not context.
2. Verify the permalink prefix against a directory listing before acting on any result.
3. The cause is structural: the wrapper's vector index is one global table with no project column — *"the semantic leg cannot scope by construction."*
4. A fix exists uncommitted in the working tree; the discipline **stands unchanged** until it lands and the server restarts.
5. It stands even afterwards: stale orphan-row cleanup is outstanding, so phantom and project-prefixed permalink families still serve.
6. Structured filters ride the proxied leg only — *"a filter passed under semantic mode is dropped silently"*; keyword mode was repaired the same day, so identifier/filtered queries pair with keyword mode or the filter is a no-op.

The open question: where the discipline lands — `spec`'s memory-first step, a shared `references/` note, or prompt 6's `curate` neighbour-search step (the other consumer). Ask; do not assume.

**W-9 — after re-running the parse yourself, before any parser or template edit: the validators versus the repo's own notes.**  [NOASSUME-VALIDATORS]

The measured reality [FACT], executed against the corpus — 115 TASK, 60 REQ, 24 DESIGN notes: REQ 9 pass / 51 fail; DESIGN 4 / 20; TASK 48 / 67. Hold notes apart from issues: of the 67 failing TASKs, 65 fail on `relations`, carrying **78 relation ZodIssues between them** — "78 TASK notes fail relations" is wrong twice (issues named as notes; 78 > 67 total failures). Dominant REQ failure: empty `requirement_statement` — 18 notes head their statement `## EARS` (e.g. `skills/docs/specs/SPEC-008-protocol-hardening-wave-2/requirements/REQ-005-*.md:16`) while `spec-templates.md:5-63` mandates `## Requirement Statement` at `:22`. Dominant TASK failures: `relations` and `observations`. The heading census over all 60 REQs: `## Requirement Statement` 48 · `## EARS` 23 · both 11 · Statement-only 37 · EARS-only 12 · neither 0. (An earlier draft claimed *"51 of 60 REQs use `## EARS`"* — false; 51 was the fail count transposed. The template heading is the majority at 48/60, and `brain/agents/spec-generator.md:144` heads `## Requirement Statement` too.) The finding is the **split**: two live authoring surfaces, a parser reading only one, and 11 notes hedging with both headings.

Options: (a) accept both headings in the parser — `## Requirement Statement` stays canonical, `## EARS` recognised as alias, no note migration · (b) make `## EARS` canonical, migrate the 48 · (c) keep the parser strict, migrate the 12 EARS-only notes, dedupe the 11 · (d) accept both **and** normalise on write. Assistant recommendation: (a), or (d) if the normalisation is cheap. Do not accept any ruling citing "51 of 60" — re-run the census and report your own numbers. Scope notes: the parser change is `shared/composition/src/` work (`schemas/requirement-note.ts`, `parsers/requirement-note.ts`) — prompt 5 settled the PLAN model, not the REQ model; run the composition suite after. Per R-16 these validators stay advisory — this ruling fixes what they *measure*, not their unwired-as-gates status. Execution step 6 raises the TASK pass rate for future notes only; re-measure after both land, basis (E-4) and command scope (E-6) stated, note counts and issue counts labelled separately.

---

## Execution steps

1. **Load `create-skill`; find the prompt-1 snapshot** (P4-5). Deliver Step 0's map; wait for the go.
2. **Status machine per W-1** across all eleven sites plus `~/NOTE-TEMPLATES.md:326`; verify prompt 7 landed ADR DRAFT (stop if not); report changed vs deleted sites.
3. **Hatches per W-2/W-3.** Check rows 8–9's current state first. Every closed hatch gets a named-excuse line; enumerate Contract 9's BLOCKING classification per skill, per dispatch.
4. **Backflow per W-4/W-5.** One halt shape, not two: `feedback_spec_implementation_no_assumptions.md:55-65` already holds a clarification-request format (Gap / Spec reference / Why this blocks me / Options / My lean) — reuse or reconcile; if the backflow halt differs, one of them is wrong. [DEFAULT]
5. **Change-request lifecycle per W-6/W-7**, end to end. Delta halts on an incomplete graph. If the entry point authors a PRD: PRD-first per D-12, `explainer` authors from its own grilling (A4 correction stands: `explainer.md:128` *is* an interviewer — a fixed questionnaire; prompt 7 designs the completed-interview suppression — reuse it), and the PLAN references the PRD, never composes it (R-9).
6. **Template defects.** (6a) [DECIDED — D-13, skill template wins]: override `brain/agents/spec-generator.md:246-309` — its TASK Relations block emits no `part_of [[SPEC-NNN]]` and no `implements [[REQ-NNN]]` (`:304-308`) against the correct block at `spec-templates.md:249-255`, so its specs are unschedulable and W-7's delta has nothing to traverse; A1 calls it the highest-value single template override in the corpus (T-2). One targeted row of prompt 11's TPL-BRAIN-STRIP pulled forward because prompt 9 depends on it — do not do the rest of that list here (R-23: brain edits light and specific). While in the file: `:232` emits `## Open Questions` into DESIGN — a D-20 violation; fix with 6b. (6b) FIC-27, disposition IMPLEMENT: add `## Compliance` to **both** DESIGN templates (`spec-templates.md:65-159` and `~/NOTE-TEMPLATES.md:505` omit it) — it is treated as live QA contract by `design-note.ts:91-105`, `validators/design-claim-validator.ts:29` (`validateDesignComplianceClaim` lives in the validator file, not the schema), `spec/SKILL.md:274`, and `validate-design-schema.test.ts:66-68`. Be precise: `design-note.ts:93-94` makes the gate optional by design, opting out by default; adding the heading flips it **default-off → default-on** for every DESIGN authored afterwards — say that when landing it.
7. **Five smaller incoherences** — no question, every decision recorded [DEFAULT]: (i) `## Open Questions` has two opposite rules — forbidden in ANALYSIS (`research/SKILL.md:172` anti-pattern row; `dispatch-analyst.ts:48-49` *"MUST land WITHOUT unresolved questions"* / *"FORBIDDEN output structure"*) yet a canonical PRD section (`analysis-phase-workflow.md:67`) and emitted into DESIGN (`spec-generator.md:232`). One rule at all four sites; lean: legal in the PRD (the interview's working surface, consistent with R-9's PRD boundary), forbidden in every artifact downstream (D-20). (ii) Nobody persists the Q1–Q6 answers two skills read (`spec-decomposition.md:23`, `decisions-phase-workflow.md:106`) — research Step 0 (`analysis-phase-workflow.md:18-43`) only writes `first_principles_pass: PASSED`. (iii) Q-numbering is off by one between producer (`analysis-phase-workflow.md:24-29`) and consumers (`spec-decomposition.md:23`, `spec/SKILL.md:118` use Q3/Q4/Q5; `decisions-phase-workflow.md:106` uses only Q3/Q4); fix at producer or all consumers, say which. (iv) `spec/SKILL.md:107` cites "per Q9 / D-06b", an identifier system existing nowhere — resolve or delete. (v) `spec`'s memory-first has no halt (`spec-decomposition.md:45-67` names the duplicate-SPEC failure then proceeds regardless) — P4-12: give it one or write why not. Plus: `spec/SKILL.md:231-232` declares `brain:🧠-architect`/`brain:🧠-implementer` dispatch targets no step dispatches — dispatch or remove.
8. **Validator ruling per W-9**; apply; re-run the parse and the composition suite; report moved pass rates with basis, scope, and notes-vs-issues labelled.
9. **Migrate the three spec memories** [AM-MIG 6f] — destination first, verified by read-back, sources left on disk (P4-9; prompt 12 deletes). Destination-first **re-authoring**, never verbatim relocation (R-26): `feedback_verbatim_port_mode.md` → `## Port Scope` allow-list template (`:21-34`) into new `spec/references/port-mode.md` · `feedback_no_implementation_deferral_in_planning.md` → rule into `spec` body; the 15-phrase blocklist (`:22-42`) + grep audit (`:76-83`) into `spec/references/anti-deferral-audit.md` (shared with `research`/`decisions`); **close EH-13 on the way in** — `:65` permits *"reword to make the planning-phase target explicit; not a violation"*, indistinguishable from resolution under a grep audit; keep the memory's own legitimate-deferral table (`:44-57`) and name the excuses that do not qualify, `build/SKILL.md:257` style · `feedback_spec_is_authority.md` → the authority chain at `:16` (`PRD/EPIC/ANALYSIS → ADR → SPEC+REQ+DESIGN → PLAN → TASK+DoD → implementation`, the only full drawing of it) as standing instruction in the lifecycle skill bodies + chain diagram in `references/`; its `:22` line citing *"feedback memories under `~/.claude/memory/feedback_*.md`"* as an authority is re-authored on migration — the layer is thinned, not eliminated (R-1), and lifecycle authority moves to the skills. Resolve the two unnamed dependencies inline: L6 — four sites say *"per AI-Dominant tier convention"* (`spec-templates.md:240`, `:305`; `spec-decomposition.md:106`, `:140`), an unnamed dependency on `feedback_ai_dominant_estimates`; L10 — `spec-authoring.md:85`'s *"per the estimate-reconciliation cross-cutting principle"* names nothing. State both rules inline; do not point at the memory layer.
10. **Independent evaluation (P4-4/D-2)** over the twelve `spec` files and whatever this prompt touched in `research`/`decisions`, cold-read, beyond the brief. Findings are the options, ≤4 per call, consecutive calls, multiselect = apply; nothing unselected is applied. Then close out the `create-skill` lifecycle per P4-5, numbers with their measurement basis (E-4).

## Boundary

- `shared/composition/src/` is touched only by the W-2 ruling and the W-9 parser change; show those diffs; suite re-run, count re-reported from your run. The atom vocabulary itself is prompt 5's (R-2) — subset, never redefine; missing atoms/substatuses are coordination items, not local inventions.
- Build mechanics, wave derivation, and the wave-6a memories (`feedback_spec_implementation_no_assumptions`, `feedback_no_guessing_always_ask`, `feedback_no_open_questions_in_planning_artifacts`) are **prompt 9's**. They carry a real contradiction — strict-halt-on-any-gap vs continue-and-batch vs research-first — that decides how D-20 lands at the implementer. Hand forward, labelled as the assistant's recommendation, this resolution text verbatim: *strict halt for a gap that blocks the current TASK; continue-and-batch for gaps in other TASKs; research first, ask only where research cannot close it.* Also hand forward the design-the-delta-and-waves-as-one-traversal note (W-7).
- `feedback_iterative_phase_reentry_on_gap_discovery` migrates in wave 6b (prompts 5/9) — implement here, cite it, leave the file alone.
- Brain-plugin edits: only the `spec-generator.md` override (6a) and verifying `adr-review`'s triggers (W-7) — light and specific (R-23). The rest of TPL-BRAIN-STRIP is prompt 11's.
- SKILL-002 E-1/E-3/E-5 are prompt 7's close-out; only E-2 lands here. Fold C-5/C-2 into W-6, C-9/E-4 into W-7, E-6 into every "there is no X" claim (state the grep's scope alongside the claim — a claim with an unstated scope is unverified), P-1 into Step 0, P-2/P-3 into question craft.

## DECIDED — do not re-litigate

| Decision | Source |
|---|---|
| The no-assumptions contract; a decision no ADR makes is not a gap to document | ledger D-20 |
| Change requests are spec-driven through the curated loop | ledger D-21 |
| PRD-first for `/plan create`; `explainer` authors from its own grilling; PLAN references the PRD, never composes it; product risks live in the PRD | D-12 · R-9 |
| Spec-side status atoms are subsets of the shared vocabulary in `common.ts`; same atom = same meaning; subset, never redefine | R-2 |
| Two-step build-task model; on FAIL the orchestrator points at the QA note; QA's verdict is its judgment alone; claim validators advisory-only, unwired as gates | R-15 · R-16 |
| Skill templates beat brain-agent templates (authorises the `spec-generator` override) | D-13 |
| Backflow is halt-and-hand-back, never auto-invocation | forced by `auto-routing.md:70` |
| Update cost is work, not an argument | D-19 |
| Independent evaluation + full create-skill lifecycle | D-2 |
| Pure Bun for anything authored | R-21 |
| Brain edits light and specific | R-23 |
| Auto-memory content unratified by default; migration is destination-first re-authoring | R-26 |
| The layer is thinned, never eliminated | R-1 |

## Git

Verify branch first; one branch; coherent commits (suggested boundaries: status machine; prose hatches; `deferred_rationale` ruling + suite; backflow; change-request lifecycle; template defects; incoherences; parser ruling + suite; memory migration). Unmerged, no push, no `--no-verify`, no AI attribution. Every deletion through the `Bash(rm:*)` gate; no workarounds; the report says so.

## Done means

- [ ] Step 0's four map tables delivered and cleared **before any edit**; the twelve `spec` files read.
- [ ] `create-skill` loaded and drove the lifecycle; the prompt-1 snapshot found and covering (or the run stopped); its validators pass for every skill touched, no benchmark regression.
- [ ] **Every W item was raised at its marked moment, once, in plain language, and its answer is recorded verbatim in the report. No W item was decided silently, and none was asked twice.**
- [ ] `spec`'s Phase 3 validation, Gate A and all four Gate B checks run on a resumed Stage 2 — **demonstrated by resuming one**, not asserted.
- [ ] The status machine is resolved at all eleven sites plus `~/NOTE-TEMPLATES.md:326`; its atoms are R-2 subsets; `spec-authoring.md:216`'s find_replace can match; ADR DRAFT verified landed.
- [ ] All nine prose hatches closed or explicitly accepted per the W-3 answer, each with a **named-excuse line**; rows 8–9's found-state reported.
- [ ] `deferred_rationale` ruled at all **six** sites — including the two skill scripts outside the composition library; suite green, count re-reported from your own run.
- [ ] Contract 9's BLOCKING classification enumerated per skill, per dispatch.
- [ ] A backflow transition exists as an explicit hand-back, not a prose pointer; its halt block is machine-resumable; the thrash guard has a number; one clarification-halt shape, not two.
- [ ] The change-request lifecycle exists end to end with all five answers written in (entry point, per-type handling, computed delta, re-fire policy, provenance); the delta traversal **halts** on an incomplete graph.
- [ ] `spec-generator`'s TASK Relations block emits `part_of [[SPEC-NNN]]` and `implements [[REQ-NNN]]` — anchored by content, not line number — and a spec authored by that agent parses into a schedulable graph, demonstrated.
- [ ] Both DESIGN templates carry `## Compliance`, and the write-up states the default-off → default-on flip.
- [ ] W-9's ruling applied; pass rates demonstrated to have moved, basis (E-4) and scope (E-6) stated, note counts and issue counts labelled separately.
- [ ] E-2 walked across two calls; all six requirements have a landing place, including keyword-mode-for-filters.
- [ ] The five incoherences fixed and the two undispatched agents dispatched or removed; `## Open Questions` has one rule at all four sites; "per Q9 / D-06b" resolved or deleted; memory-first has a halt or a written reason.
- [ ] The three spec memories live in bodies/references and read back; sources on disk; EH-13 closed on migration; L6 and L10 stated inline; the `feedback_spec_is_authority:22` line re-authored per R-1.
- [ ] The halt-vs-batch recommendation and the one-traversal note handed to prompt 9 in the close-out, verbatim.
- [ ] Locked Decisions table complete, every answer verbatim; ranked findings delivered, nothing applied without approval.
- [ ] Branch/commits per P4-7; deletions through the rm gate; nothing pushed.
