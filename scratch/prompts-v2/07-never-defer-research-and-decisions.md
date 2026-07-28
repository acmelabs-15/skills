# Prompt 7 — Author the moment it locks: research that decides, decisions that draft, ADRs born DRAFT

_Runs after prompt 5 (`plan-data-model`) and prompt 6 (`curate-and-tier-chain`). Prompt 8 (`no-assumptions-spec-and-change-requests`) depends on what locks here. Paste everything below into a fresh Claude Code conversation._

**Human attention: heavy — the programme's largest interview.** A full SKILL-002 section walk plus thirteen W-items. If the honest question count outgrows what this prompt sketches, say so and extend the budget; never batch to fit.

---

**Execution contract (R-31): before doing anything else, read `scratch/prompts-v2/RUN-CONTRACT.md` — it sits beside this file — and run this entire prompt in its collaborative mode: granular, guided, opinions labeled, no assumptions. It overrides any "autonomous" framing below.**

## How to read this prompt — the provenance register

Every substantive statement below carries one of four tags. This is the contract that keeps Peter's decisions his, and the assistant's analysis labeled as analysis:

- **[DECIDED]** — Peter decided it, dated, in his own words where quotable. Do not re-litigate and do not re-ask.
- **[WONDERING]** — Peter's open questions. These ARE the interview: raise each at its marked moment via `AskUserQuestion`, exactly once, with the full relevant text shown. Attached recommendations are the assistant's, never his. Nothing in this register is pre-decided, however confident the recommendation sounds.
- **[FACT]** — measured repo or tool reality, with reproduction where it matters. Verify before relying on one; report mismatches as drift, not as license to improvise.
- **[DEFAULT]** — assistant design suggestions. Adopt or improve at runtime; deviations are *reported* with the measurement that justified them, not asked about.

If anything below reads as [DECIDED] but smells like an assumption, stop and surface it. That is a defect in this prompt, not a constraint on you.

## The authority rules  [DECIDED — R-30 · D-3 · D-2]

**`grill-me` (user-level, `/Users/peter.kloss/.claude/skills/grill-me/`) drives the interview.** Peter chose it for this integration (D-3: `Skill(grill-me)`, every question through `AskUserQuestion`, no exceptions). Its cadence, its recommendation-per-question rule, its dependency ordering and its outputs are its own mechanics; this prompt does not restate them. **`skill-creator` (the `skill-creator@ACMElabs` plugin) drives the authoring lifecycle for every skill touched** — `research`, `decisions`, `grill-me` itself, `brain/skills/adr-review` — its stages, evals, validators and sign-off gates, at its own pace (D-2). Where this prompt appears to conflict with either skill about *how* to interview or *how* to author a skill, the skill wins — say so in the report. R-30 records Peter's rule for why: prompts supply only what the skills cannot know — repo facts, his decisions, his open questions.

## Standing rules (programme-wide)

- **P4-1 — Every question goes through `AskUserQuestion`.** Max **4 authored options**; "Other" is auto-appended, so never author one, and say in the question text that Peter can type his own answer there. Questions are written in **plain language** — no internal jargon, no stage numbers, no file:line in the question body unless Peter is ruling on that exact text; what breaks and what it costs, stated simply. (The fuller ASK-STANDARD is developed in THIS prompt's interview — W-2/W-3 [DECIDED — R-29]; until it lands, this paragraph is the standard.)
- **P4-2 — One decision per question, one question in flight.** A multiselect decomposing a single decision is not a bundle (ledger PART 4).
- **P4-3 — Author the moment it locks.** Never defer: not to the end of a phase, not to the phase that "owns" the artifact type, not to the end of a turn. [DECIDED — D-7; ledger PART 4.] This prompt exists because code currently contradicts it — and the rule governs this prompt's own conduct: the steps below execute at the moment their inputs close, not as a batch at the end.
- **P4-4 — Independent evaluation mandate on every skill touched (D-2).** Evaluate as if handed the skill cold. Ranked findings, each with a recommended action and one-line rationale. Apply nothing without approval. Honest short list beats padding.
- **P4-5 — The full `skill-creator` lifecycle runs for every skill touched, under the skill's own procedure.** [DECIDED — D-2 plus the authority rule.] The repo facts the skill cannot know: **prompt 1 took the programme baseline** — find it, confirm it covers `research`, `decisions`, `grill-me` and `brain/skills/adr-review`, record the path; **if it is missing for any of them, stop and tell Peter.** Every edited skill passes the lifecycle's own validation and shows no benchmark regression against that baseline.
- **P4-6 — Binary tool rule.** `docs/**` → Brain MCP; everything else (skill bodies, references, auto-memories, config, `.ts`) → `Read`/`Edit`/`Write`, on which Brain MCP is forbidden. Almost everything this prompt writes is skill text. Normative source: `KNOWLEDGE-GRAPH-CONVENTIONS.md:184-186`, `:202`.
- **P4-7 — Git.** Verify the branch first. One branch for the whole prompt. Coherent commits (≤5 files or one logical change). Leave unmerged. Do not push. No `--no-verify`, no force-push. No indication of AI contribution in any commit message.
- **P4-8 — Update cost is work, not an argument (D-19).** *"I wanna do something because it's the right decision to make."* This prompt touches eleven never-lock sites and seven ADR-ordering sites; that is a count, not an objection.
- **P4-9 — Nothing deleted in bulk; nothing deleted before its destination is live and verified** (read-back or exercise, not assertion). Migrated memories stay on disk — prompt 12 deletes them. `Bash(rm:*)` is in the permissions `ask` list (`settings.json:158`): every deletion raises a prompt even when approved in principle. Expect it; never route around it — no `find -delete`, no scratch-directory `mv`, no substituted binary. A blocked deletion is recorded as deferred, not worked around.
- **P4-10 — Read before designing, and say what was read. Do not sample.** The file:line facts below exist so the reading budget goes to the files being changed; where a line has moved, the file is authoritative and the report says so.
- **P4-11 — Precedence:** skills plugin > brain plugin > home specs > auto-memories. Prompt 11 publishes it; state it, use it, do not re-derive it.
- **P4-12 — Fail closed; never "document a rationale and proceed."** The corpus has 27 such branches (A4 F-37's enumeration — **cite the register, not a grep**); **10 sit in research/decisions/spec — this prompt's targets.** The `EH-NN` ids below are rows of that register: verify each at its cited line before acting. The counter-model shape names the specific excuse (`build/SKILL.md:257`; `brain/agents/orchestrator.md:1890-1892`; SKILL-002's own `:237`). Reject, don't edit down, any proposal that introduces a new one.
- **P4-13 — Do not build what already ships.** `ANALYSIS-005-skills-ecosystem-enforcement-wiring-deep-analysis.md:61`: *"0 of 17 lifecycle scripts invoked by any SKILL.md."* In scope here: `dispatch-analyst.ts`, `dispatch-architect.ts`, `dispatch-decision-critic.ts`, `lock-decision-mutation.ts`. Wire them; do not rewrite them.
- **P4-14 — No sentence claiming a schema/validator/mutation "enforces" anything against production data** unless it was run against production data in this session. Say what runs, where, against what. (Background facts: `parsePlanNote` fails 7 of 7 of the example-collection PLANs; the composition suite is 458 synthetic-fixture tests — re-report the count from your own run, never quote it forward.)

## What this prompt is

The SKILL-002 integration proper — the research/decisions half of Peter's authoring discipline, landed in the skills that currently contradict it. When it finishes: research locks decisions and drafts ADRs in whatever shape W-8 sets; `decisions` drafts at the first lock into per-cluster ADRs born DRAFT, with a defined clustering criterion (W-7) and a defined promoter (W-6); `adr-review` no longer fires on every save (W-5) and its consensus rule is stated correctly everywhere; no research finding lands in the PRD without W-9's named successor; D-9's dimensions ride in the rendered brief and its tests; `research` Step 5 makes `curate`'s three-way call; returning analyses derive their questions (W-11); `decisions` gains a memory-first gate with a halt; `/plan create` is PRD-first (W-1/W-12); and the r/d/grill-me memories are re-authored into their destinations. Prompt 8 does the same for the spec/no-assumptions half.

---

## Facts on the ground  [FACT]

### Sources — resolve or stop

| Role | Path |
|---|---|
| Source spec being integrated | `/Users/peter.kloss/Dev/ACMElabs/fond/docs/skills/SKILL-002-research-phase-authoring-discipline.md` |
| Target plugin | `/Users/peter.kloss/Dev/ACMElabs/skills` |
| Shape exemplar for the PRD frame | `/Users/peter.kloss/Dev/ACMElabs/fond/docs/planning/PRD-001-fond.md` |

If any path does not resolve, stop and tell Peter. Never substitute one of the quoted SKILL-002 copies scattered through analysis notes — walking a copy is how the walk silently drifts from what he actually wrote.

### SKILL-002

- **30 H3 sections**: 23 normative (C-1…C-13, P-1…P-3, E-1…E-6, N-1) — every one unbroken prose, zero bullets or numbered items (measured) — plus 7 `## Observations` groupings carrying **32 tagged bullets** (`sed -n '191,243p' SKILL-002.md | grep -c '^- '` → 32; distribution 3/12/2/2/3/4/6). The bullets are a **coverage checksum** — confirm each maps to a walked section — not extra interview rounds.
- **This prompt owns ten sections: C-1, C-2, C-3, C-6, C-7, C-8, C-11, C-12, C-13, N-1.** Prompt 8 owns C-5, C-9, E-2, E-4, E-6, P-1, P-2, P-3 (E-2 is confirmed on its walk list). C-4 and C-10 are settled standing rules — C-4 is P4-1; C-10 reconciles inside C-8's walk. E-1/E-3 are W-13; E-5 stays in SKILL-002, its substance quoted in Step 2's axis-4 guard [DEFAULT].
- A4 measured **at least 11 of 23** sections yielding ≥5 requirements under conservative decomposition (C-1, C-2, C-3, C-4, C-6, C-7, C-8, C-9, C-11, C-13, E-2). Assume a section overflows the 4-option cap and split across consecutive questions.
- Two bullets carry content no numbered section does and survive verbatim: `:237` — *"…defences must target the specific excuse rather than restate the rule"* (P4-12's design rule) — and `:210` — *"Genuine methodological forks such as whether deep passes start clean or extend shallow work belong in front of the owner; raw scale does not"* (never turn it into a question about agent counts).
- C-11 (`SKILL-002.md:121`) mandates ADRs *"merged or split while DRAFT"* — unrepresentable until Step 5 runs (see the enums below), which is why Step 5 precedes C-11's walk.

### grill-me, as found

- `grill-me/SKILL.md:7-11` reads `allowed-tools: Read Glob Grep Write Edit` / `model: inherit` / `effort: high` / `context: inline` / `shell: bash`. Peter's mid-conversation update — add `AskUserQuestion`, `model: opus`, `effort: xhigh` — **never landed** (A4 B-1). The target values are his own [DECIDED — D-3, owner-stated]: land them with the wave-6e edits and report it; do not re-ask it. Capability is unaffected either way: `allowed-tools` pre-approves and never restricts (A4 F-1), and the grant clears on each user message — confirm in one line, spend no round on it.
- `:84` — *"Do not emit the PRD before the tree is fully walked"* — repeated as an anti-pattern row at `:141`. **This is N-1's target** (W-4): a phase-skill instruction encoding deferral.
- `:88` writes the PRD to `docs/planning/` with generic `Write` and no Brain frontmatter — the default path violates the binary tool rule (A4 F-35). Flag it; prompt 11 owns the fix unless it blocks here.

### The ADR machinery

- **No DRAFT status exists in any of the three ADR status enums**: `shared/composition/src/schemas/adr-note.ts:41` — `AdrNoteStatusEnum = z.enum(["PROPOSED","ACCEPTED","DEPRECATED","SUPERSEDED"])`; `brain/agents/adr-generator.md:91` — *"Use 'Proposed' for new ADRs unless otherwise specified"*; `brain/agents/architect.md:218` — `{proposed | rejected | accepted | deprecated | superseded by ADR-NNN}` (three N — quote it as it reads). Authoring births at PROPOSED (`decisions/references/adr-authoring.md:11`; `decisions-phase-workflow.md:170-172`). D-11's steady state and C-11 are both unrepresentable today.
- `brain/skills/adr-review/SKILL.md:19-23` sets `file_triggers` on `decisions/ADR-*.md`, `events: [create, update, delete]`, `auto_invoke: true`. **Incremental drafting does not bypass the review gate — it TRIGGERS the debate, on every save.** The fix is three coordinated changes (status subset, trigger retarget, promoter), not a prose edit.
- **The consensus rule**, full three-clause form, lives at `brain/skills/adr-review/references/debate-protocol.md:190-194` only: *"All 6 agents Accept OR Disagree-and-Commit = Consensus reached / Any agent Blocks = Another round required (if round < 10) / Round 10 with no consensus = Conclude with unresolved issues documented."* `adr-review/SKILL.md:98` carries a shorter agreeing form — attribute each to its own site. Ballots are Accept / Disagree-and-Commit / Block (`references/agent-prompts.md:484-493`); the six agents at `SKILL.md:79-86`. **There is no ≥5-ACCEPT threshold. 0 Accept + 6 Disagree-and-Commit reaches consensus. Round 10 concludes rather than halts.** Two callers state it wrong, verbatim: `decisions/SKILL.md:172` (*"consensus threshold ≥5 ACCEPT + zero BLOCK"*) and `~/AGENT-SYSTEM.md:1156`.
- Cost: 6 agents × up to 10 rounds ≈ **68 invocations worst case**, against `~/AGENT-SYSTEM.md:1185`'s budget of 15 delegations per session — one uncontested single-round review is already 40% of a session; a worst-case debate exceeds the budget more than 4×.
- The four prose trigger sites: `~/CLAUDE.md:360` (its Source column cites itself — no upstream authority to preserve), `~/CLAUDE.md:246-248`, `~/AGENT-INSTRUCTIONS.md:109`, `~/AGENTS.md:66`. Meanwhile `~/CLAUDE.md:162` lists "New ADRs" under **Ask First** — so creating an ADR asks Peter while editing one auto-fires a six-agent debate. Backwards.
- **`spec`'s input contract fixes the boundary**: Stage 1 dispatches against **ACCEPTED** ADRs (`spec/references/spec-decomposition.md:10`, `:76`, `:3`) and the coverage gate walks ACCEPTED ADRs (`spec/SKILL.md:145-148`). Whatever W-5 picks must leave every spec-feeding ADR ACCEPTED by the time `spec` opens.
- A third position to surface, not resolve (prompt 8's constraint): `brain/agents/technical-writer.md:242` — *"Immutable once accepted - new context = new ADR."*

### The never-lock surface — eleven sites: nine prose, one generated, one test

| # | Site | Text |
|---|---|---|
| 1 | `research/SKILL.md:3` | description — *"Surfaces options-with-pros/cons only; **never locks choices**"* |
| 2 | `research/SKILL.md:9` | *"never lock choices — the `/decisions` phase adjudicates each"* |
| 3 | `research/SKILL.md:170` | anti-pattern row — *"Locking options during /research"* |
| 4 | `research/SKILL.md:205` | *"locking choices happens in /decisions, not here"* |
| 5 | `analysis-phase-workflow.md:16` | *"**Non-negotiable invariant**: no options are LOCKED during `/research`"* |
| 6 | `analysis-phase-workflow.md:143` | *"do NOT recommend or lock a choice"* |
| 7 | `analysis-phase-workflow.md:151` | *"analyst may indicate preference but **NEVER lock the choice**"* |
| 8 | `analysis-phase-workflow.md:235` | the mirrored anti-pattern row |
| 9 | `decisions-phase-workflow.md:23` | *"/decisions LOCKS choices; this is the opposite of /research"* |
| 10 | **`research/scripts/dispatch-analyst.ts:61-68`** | emitted into **every** analyst brief: *"Surface options-with-pros/cons only. Do NOT lock a choice…"* |
| 11 | **`__tests__/dispatch-analyst.test.ts:25-29`** | asserts the literals `"options-with-pros/cons"` and `"/decisions phase adjudicates"` |

Leave the test asserting the old strings and the suite goes red the moment the renderer changes. Update both; run the suite. C-1's source incident is exactly this rule: an orchestrator deferred an ADR *"because the decisions phase skill owns ADRs while the research phase was active, treating phase ownership as permission to wait."*

### The ADR-ordering surface — seven sites, four layers, three inside `plan`

| # | Layer | Site | Text |
|---|---|---|---|
| 1 | Pipeline order | `decisions/SKILL.md:14-24` | *"Step 2: per-pending-D-N micro-cycle… Step 5: architect dispatch → composite ADR"* |
| 2 | Workflow reference | `decisions-phase-workflow.md:63` | *"After all D-Ns LOCKED, run the 12-item… audit"* |
| 3 | Anti-pattern | `decisions/SKILL.md:226` | *"Author ONLY after all D-N substatuses = LOCKED"* |
| 4 | Anti-pattern | `decisions-phase-workflow.md:268` | same row, "ADR" without "body" |
| 5 | **Inside `plan`** | `plan/references/per-decision-micro-cycle.md:102` | *"Author composite ONLY after all D-N substatuses = LOCKED"* |
| 6 | **Inside `plan`** | `plan/references/per-decision-micro-cycle.md:83` | `set-part-done` *"after all D-N in the part are locked + composite ADR is authored"* |
| 7 | **Inside `plan`** | `plan/SKILL.md:234` | `set-part-done` after each D-N locked, *"the composite ADR is authored"*, adr-review passes |

`decisions/references/per-decision-micro-cycle.md` and `plan/references/per-decision-micro-cycle.md` are **different files with the same basename** — confirm which is open before editing. Dependent mechanisms: the composite gate needs a final count (`pre-author-composite-gate.md:32-34`); the detail-parity audit feeds on the completed Event set (`per-decision-micro-cycle.md:168-170`); `decisions/SKILL.md:162`'s ≥5-D-N sample rule is unsatisfiable for a part with fewer than five D-Ns.

Three defects to fix with the reorder:

1. `decisions/scripts/lock-decision-mutation.ts:110-128` flips the decisions part `IN_PROGRESS → DONE` when the last decision locks — end of Step 2, six gates and the entire ADR early. Its test asserts the bug as correct (`lock-decision-mutation.test.ts:131-155`). Fix both.
2. **Two mutually exclusive 11-section ADR templates**: `adr-authoring.md:67-149` vs `dispatch-architect.ts:112-122`, sharing exactly **three** section names (Decision Statement, Context, Failure Modes). `decisions/SKILL.md:153` points at the prose one, whose output lacks `## Considered Options` — schema-gated at `adr-note.ts:130-145`, enforced by `validateAdrAcceptedClaim` — so following the prose template yields an ADR that can never be ACCEPTED.
3. **The composite gate is arithmetically self-defeating**: `pre-author-composite-gate.md:38` (50-100 lines × 11 sub-sections) puts 2 LOCKED D-Ns at Tier 3 near 1,690 lines — past its own >1200 hard halt — while `decisions-phase-workflow.md:114-118` *requires* 4-15 D-Ns at Tier 3; its `:49` heuristic contradicts its own formula by roughly 8×. Per-cluster default largely moots it; correct the arithmetic anyway.

A multi-ADR path already exists — `decisions/SKILL.md:188`, `decisions-phase-workflow.md:236-240` — **with no clustering criterion defined anywhere** (W-7).

### The PRD surface — five emitters, not two

| # | Emitter | Site |
|---|---|---|
| 1 | Memory-First Context | `research/SKILL.md:63`; `analysis-phase-workflow.md:59` — *"Document findings in the PRD body… Only then proceed"* |
| 2 | Buy-vs-build | `research/SKILL.md:119`; `analysis-phase-workflow.md:103`; resume test `research/SKILL.md:83` |
| 3 | **Convergence Findings** | `convergence-protocol.md:181` — appended cumulatively, *"prior iterations stay as historical record"*; body `:151-179` is pure findings. **The PRD's traceability record** (W-9) |
| 4 | CVA Analysis | resume test `analysis-phase-workflow.md:127` — the Tier 1-2 clause means the section is never written on small plans; a purge ruling assuming it exists is a no-op there |
| 5 | Search-empty coverage gap | `resource-bounds.md:136` — closed as EH-30 in Step 7 |

`complexity_tier` (Step 2) is a **field, not a finding**, and goes to the **PLAN** (`research/SKILL.md:109`). Leave it.

- **PRD shape**: live PRDs score 0/6, 4/6, 0/6 against `NOTE-TEMPLATES.md:802`, whose required `## Success Metrics` and `## Non-Goals` appear in **none** of the three (FIC-22). grill-me's own list (`grill-me/SKILL.md:91-124`, eleven sections): PRD-003 matches as a superset; PRD-001-fond diverges — 3 sections missing, 8 extra — so it is the shape exemplar for *framing*, not proof the list migrated. Put the ratification of grill-me's list to Peter on those real numbers.
- **`explainer` already interviews**: `brain/agents/explainer.md:128` — `## Clarifying Questions (Always Ask)`, seven labelled blocks, six actual questions (the seventh is an INVEST validation directive), reinforced at `:31`, `:105`, `:114`, `:339`. Its PRD-author credential is real (`:102`; template heading at `:196`). So the instruction is **"suppress its built-in questionnaire when a completed interview is supplied"** — it stays the author.
- `requirements-interview` is already located: `research/references/resource-bounds.md:108` (user-level path). Do not re-hunt it.

### Research dispatch, loop, and curation gaps

- D-9's dimensions must land in **three unsynchronised places**: `renderAnalystBrief` (`research/scripts/dispatch-analyst.ts:36`; documented deterministic at `:15` — *"same args → byte-identical stdout"*) plus its **8 tests**; the prose brief (`analysis-phase-workflow.md:137-145`); `research/SKILL.md:99`.
- **The rendered brief is strictly weaker than the prose brief** — its only argument is `reqScope`; it carries none of the requirement verbatim, the PRD, CVA abstractions, or the buy-vs-build outcome. Fix the asymmetry or report why not [DEFAULT].
- The floor/extension mechanism already exists verbatim at `dispatch-analyst.ts:56-59`: *"The rubric you are given is a FLOOR, not a ceiling…"*
- **`scripts/` appears in zero of the 16 markdown files** in the r/d/s slice (5 research, 5 decisions, 6 spec); corroborated by `ANALYSIS-005:61`. The code path is unreachable from the skill bodies — when done, at least one markdown file names each wired script.
- Parallelism numbers for C-8's walk: `feedback_api_rate_limit_recovery_protocol.md:41-47, :68` — 17 concurrent analysts produced 14 rate-limit failures; safe ceiling 5-10; default waves 5-8. C-10 says 30-50 agents is fine. Both are true; the reconciliation goes to Peter inside C-8's walk — the assistant's recommendation, labeled as such: staggered waves of 5-8 under a 30-50 total, landing in `resource-bounds.md`.
- **The binary skip-if-exists**: `research/SKILL.md:84` — *"Dispatch ANALYSIS only for reqs WITHOUT existing notes"* — with siblings `analysis-phase-workflow.md:155` (G2 resume keeps existing analyses untouched) and `convergence-protocol.md:130-131`, whose `:131` leaves *"replaces or supplements"* unresolved. Prompt 6's `decideCuration` returns merge / split-then-recompose / create, create as the documented fallback.
- **No per-returning-analysis hook exists anywhere.** Step 7's loop (`research/SKILL.md:101`) triggers on the **batched** Steps 6-8 convergence check (`convergence-protocol.md:75`, `:82-95`, `:23-25`); the only per-analysis pass, Step 8.5, is explicitly forbidden per-iteration (`retrieval-density-pass.md:133`).
- **`decisions` has zero memory-first**: exhaustive grep over its SKILL.md, all four references and all six scripts for `memory-first` / `memory first` / `brain_brain__search` / `Step 0` → zero matches. Step 1 is *"Read inputs"* (`decisions/SKILL.md:85-89`), reading only the PLAN part and the wikilinked ANALYSIS notes.
- Standing-instruction evidence for D-7's tier: `brain/skills/context-optimizer/SKILL.md:91-96` — Baseline 53% / Skill 53% / Skill + explicit instructions 79% / AGENTS.md passive context 100% — and a skill body enters context once, never re-read on later turns. `brain/skills/memory/SKILL.md:469-482` (`### When to Store`) carries **only the write-immediately half** of the cascade — no ADR, no cluster, no curation gate, no phase-ownership rule. Author D-7's five steps fresh; cite `:469-482` for step 1 at most.

### Escape hatches in scope — rows of A4 F-37's register; verify each at its line (P4-12)

- **Close**: EH-7 (`decisions-phase-workflow.md:212` — override adr-review with documented rationale; nothing reads the marker) · EH-24 (`brain/agents/orchestrator.md:1100` — adr-review unavailable → *"proceed with warning"*; a missing tool must not disable a blocking gate) · EH-5 (`decisions-phase-workflow.md:92` — document-why-orphan branch) · EH-6 (`:100` — scope-creep-rationale branch) · EH-8 (`pre-author-composite-gate.md:85-88` — proceed-with-composite above its own threshold; the hatch that softens C-11) · EH-30 (`resource-bounds.md:136` — empty memory-first search satisfied by documenting the gap; `feedback_memory_first_gate.md:56-64`: *"Absence of memory is NOT permission to change"*) · EH-9 (`resource-bounds.md:46-47` — the only hard budget in `research` is manually extensible; replace with the halt prompt 5 established) · EH-14 (`feedback_no_unsupported_quantitative_claims_in_planning.md:51` — the qualitative-scope branch survives only with a named arbiter [DEFAULT]) · the accept-BUY branch (`decisions/SKILL.md:216`, no documentation requirement at all).
- **Accept, with a written justification naming the specific excuse each voids**: EH-17 (Disagree-and-Commit counts toward consensus — that IS the rule; correct the docs that claim otherwise) · EH-18 (round 10 concludes; bounded — document the unresolved issues) · EH-19 (`adr-review/SKILL.md:118`, the P1 defer-with-issue row — bounded by tracking; `references/issue-resolution.md:26-36` designs the rediscovery).
- **Re-scope, not close**: EH-12 — `feedback_no_open_questions_in_planning_artifacts:41-42` exempts "Rule 6 Proposals". Rule 6 **is defined**, at `feedback_no_unsupported_quantitative_claims_in_planning.md:95` (*"no silent requirement adjustment"*) — a different memory, also being retired. The exemption is legitimate on its face; carry the definition inline to the exemption's new site.

### Unnamed dependencies — state the rule inline; delete nothing that is complete

| id | Site | Defect | Fix |
|---|---|---|---|
| L4 | `plan/references/per-decision-micro-cycle.md:144` | cites "the commit-cadence invariant" | delete the attributive clause; the rule text is complete |
| L5 | `per-decision-micro-cycle.md:26` | "per the iterative-phase-reentry pattern" | state the pattern inline |
| L7 | `decisions-phase-workflow.md:84` | "Adapted from canonical drift-detection patterns" | name them or drop the clause |
| L8 | `convergence-protocol.md:9` **only** | "reviewer-asymmetry per cross-cutting principle" — defined nowhere | state inline. **Do not touch `analysis-phase-workflow.md:169`** — it resolves its pointer to `convergence-protocol.md` |
| L9 | `retrieval-density-pass.md:5` | "canonical research-and-incorporate pattern" + an undefined dispatch exception | state inline; and note `research-and-incorporate` scores on note **count** (`SKILL.md:100`; `references/workflow.md:358` — *"Create 5-10 atomic notes"*), hostile to merge-first curation. **Surface that contradiction; do not absorb it** |

L1-L3 were prompt 6's; L6 and L10 are prompt 8's.

---

## Step 0 — The map gate  [BLOCKING GATE]

Before any edit lands, deliver one table per surface about to change — the eleven never-lock sites, the seven ADR-ordering sites, the five PRD emitters, the three ADR status enums — each row with file, line, and the actual current text, confirmed by opening it. The file:line facts above are inputs to the map, not a substitute for it. Then stop and wait for Peter's go. No reply is a stop, not an implied yes.

---

## The interview — things Peter is wondering about  [WONDERING]

These are Peter's open questions, carried here so they are asked **once, at the natural moment, by you** — not pre-decided in this prompt and not re-interviewed anywhere else. One decision in flight (P4-2). Plain language (P4-1). Show the full current text whenever he is ruling on existing text. Record every answer verbatim in the report and in the Locked Decisions table; never re-ask an answered item.

**W-1 — at the frame, before any section is walked: the `scope` phase.** This is Peter's own leaning, not the assistant's idea. The rulings log (R-8): *"A `scope` phase before research, producing the PRD"* — *"owner floated, assistant supports; converges with the already-decided PRD-first item (D-12)"* — status *"LEANING — confirm at prompt 7."* In plain terms: today the PRD would be produced somewhere inside plan-creation with no part of its own — no status to check, no session to resume. A scope phase makes writing the PRD the plan's first real part. If he confirms, the phase set becomes **scope → research ⇄ decisions → spec → build → review → end**, and Step 14 lands PRD-first as the scope phase's mechanics; if he declines, D-12 still stands and PRD-first lands inside create mode. Assistant recommendation: confirm. Asked once, here; prompt 11's phase-model work consumes the answer.

**W-2 — immediately after the frame, before the walk: the ASK-STANDARD grilling.** Peter asked for this himself (R-29): grill him, grill-me-style, into a written standard for how questions are put to him — question formatting, plain-language rules, dos and don'ts, batching, option design. Origin: jargon-dense walkthrough questions repeatedly drew *"I have no context for what you're asking me here."* Run it first so the standard governs the rest of this interview. Inputs to bring: P4-1's interim clause; the 4-authored-options + automatic-"Other" tool facts; the 5-field template in his own memory (`feedback_ask_protocol.md:15-21` — Authority/Situation/Options/Recommendation/Blocking) and its `:38-40` halt-while-open rule; the layer's three-way collision on batching — `feedback_ask_protocol.md:34` (*"Batch up to 4 per call"* — a real cap on questions-per-call, a different axis from the option cap) vs `feedback_one_decision_at_a_time.md:12` (*"ONE thing to decide, not a batch"*) vs `feedback_diff_inline_where_recorded.md:21` (*"Never batch"*); and `:36`'s *"no overall cap"* overflow rule, stated nowhere else — does it survive? Deliverable: a drafted standard he approves, which then supersedes P4-1's interim clause programme-wide.

**W-3 — the moment the drafted standard is approved: where it installs.** His choice at that time (R-29: installed wherever he chooses). Candidate homes: (a) a home-spec doc pointed at by `~/CLAUDE.md`; (b) a `skill-creator` reference; (c) a skills-plugin reference. Assistant recommendation, labeled as such: (a) — the misses it fixes happened in ordinary conversation, so it must reach every session, and a one-line pointer plus an on-demand doc is the cheapest way there; the pointer is a tier-3 entry and carries the written justification that implies. Whatever he picks, later prompts point at it rather than restating it.

**W-4 — early in the section walk, before the reconciliation-heavy sections: N-1, amend at source or override case by case.** Four incompatible precedence rules are currently all in force: `feedback_phase_skill_wins_conflicts:10` (the skill's own references win over the general specs), `feedback_write_decisions_immediately:104` (the standing rule overrides the skill's wait-instruction), `feedback_always_check_memories:46` (most-authoritative-wins), `feedback_no_section_sign:37-38` (memory-is-sole-home). N-1 asks a different question from all four: when a skill's own text conflicts with Peter's standing rules, is the skill **amended at source** so the conflict stops existing, or overridden by rank each time it comes up? Concrete instance on the table: `grill-me/SKILL.md:84`/`:141` forbids emitting the PRD early; the write-immediately rule currently overrides it from outside. Assistant recommendation: amend at source — it removes the precedence question rather than adjudicating it, and this programme is itself one big instance. The answer sets the default for every reconciliation after it; Step 4 folds it into the `grill-me:84/:141` edit.

**W-5 — at Step 6, before the trigger is edited: when does `adr-review` fire?** D-11 is decided — every ADR passes `brain:---adr-review` before the spec phase — and Peter was **explicitly unsure when**; the ledger marks it genuinely open. Decision facts, in plain terms: today the six-agent debate fires every time an ADR file is saved; one review can cost up to ≈68 agent runs against a session budget of 15, so with incremental drafting every edit risks a debate costing multiple sessions. Hard boundary to state in the question: `spec` only reads ACCEPTED ADRs, so whatever he picks must leave every spec-feeding ADR ACCEPTED by the time `spec` opens. Also check prompt 6's ADR-reset ruling (curating a reviewed ADR un-reviews it) and stay consistent. Options: fire on DRAFT→PROPOSED, batched at the decisions→spec boundary [assistant recommends — satisfies spec's contract exactly when needed and cuts the worst case to once per ADR]; per-ADR on cluster stability; both; keep auto-fire on write.

**W-6 — at Step 5, once DRAFT exists: what promotes DRAFT → PROPOSED?** Plain terms: DRAFT means still being shaped; PROPOSED means ready for the six-agent review. Something has to say when an ADR crosses that line, and nothing does today. Options: the architect's Definition-of-Ready (`brain/agents/architect.md:188-210`) [assistant recommends — the only candidate already in the corpus]; explicit promotion by Peter; cluster stability (no edits for N events); automatic on entering the spec phase.

**W-7 — at Step 8, before the reorder lands: the clustering criterion.** Per-cluster ADRs are the decided default [DECIDED — D-7 step 4: a decision joins an ADR *"if it belongs to its cluster; otherwise a new ADR"*; D-11]. But nothing anywhere defines what a cluster **is** — the multi-ADR path exists with no criterion, so the default cannot execute until one is written. Present the counter-cost too, because it is real: `pre-author-composite-gate.md:120-128` argues that splitting a cohesive 25-decision ADR into five means five review gates, cross-ADR coupling, and lost single-document discoverability — and note that under W-5's option (a) the review-cost half of that mostly evaporates. Options: one ADR per disjoint decision set sharing a subsystem or requirement cluster, analyst proposes and Peter ratifies [assistant recommends]; one ADR per decision; one ADR per PLAN part; keep composite as default with a split threshold.

**W-8 — at Step 7, before the never-lock sites are edited: how far research's authority extends.** The prohibition itself falls [DECIDED — forced by D-10: *"sometimes it makes sense to lock decisions mid-research"*; Peter's own memory already says it — `feedback_write_decisions_immediately.md:17`, *"Research and decisions interleave and go back and forth"*]. Open is the shape of what replaces it. Options: research may lock **and** author DRAFT ADRs, which `decisions` ratifies and promotes [assistant recommends — one artifact from the moment of locking, no hand-off gap]; research locks but `decisions` authors; research locks only within a named decision cluster. Whatever the answer: D-8's delegation contract (always delegate; ANALYSIS notes always) is untouched — say so in the same breath, so no reader of the new `research/SKILL.md` concludes research may skip delegation.

**W-9 — at Step 9, before any emitter is edited: the successor for `## Convergence Findings`.** D-8 is decided: research findings never go into the PRD. Four of the five emitters have obvious dispositions; this one does not — it is the PRD's only running record of what each convergence pass found, appended cumulatively as the audit trail. Deleting it with no named successor loses that trail. Options: an ANALYSIS note per convergence iteration, referenced from the PLAN [assistant recommends; R-9 — the PLAN references, never composes]; the SESSION event ledger; keep it in the PRD as the one sanctioned exception; a dedicated CONVERGENCE-NNN note. Forbidden state regardless of answer: removal without a named successor.

**W-10 — at Step 10: are D-9's dimensions a rubric floor or an extension directive?** D-9 decided the three dimensions (stack identification; community architecture and pattern practice at that stack; the package/library landscape with stack fit). Open is where they bind: encoded in the rendered brief and its tests so every dispatch carries them, a prose directive analysts are told to apply, or both. Options: rubric floor, encoded in `renderAnalystBrief` and its tests [assistant recommends — the `:56-59` extension mechanism already covers the topic-specific layer]; prose-only standard extension; both — floor in code, extensions in prose.

**W-11 — at Step 12: does per-analysis derivation replace or supplement the batched check?** C-6 wants every returning analysis to trigger explicit derivation of the interview questions its findings imply — *"a finding that changes what the owner might want is a question, not a fact to file."* The counter-argument is Peter's own and must be shown, priced: `feedback_analysis_surfaces_options_decisions_phase_locks:53` — *"adjudicating 14+ decisions DURING analysis pulls user into per-analysis micro-decisions instead of letting them see the full picture at decisions time."* Per-analysis derivation raises his interruption rate; that is C-6's cost. Options: it supplements the batched convergence check [assistant recommends — derivation on each return, convergence still checked in batch]; it replaces the batched check; derive only above a findings threshold.

**W-12 — at Step 14, asked against W-1's answer: what research Stage 1 becomes under PRD-first, and the branch/session sequencing for `/plan create`.** D-12 decided the PRD comes first, authored by the brain `explainer` agent from its own grilling session; R-9 decided the PLAN references it, never composes it. Open: does Stage 1 become "read the PRD and derive the requirement list", who runs when, and where the branch gets created. Options: Stage 1 = read-the-PRD-and-derive, PRD authored by `explainer` from the grill-me interview, branch created **before** the PLAN [assistant recommends]; Stage 1 keeps requirement elicitation and the PRD is authored after; merge Stage 1 into the interview itself.

**W-13 — at close-out: the disposition of SKILL-002's E-1 and E-3.** Two short sections of Peter's spec record how the Brain memory tooling actually behaves (`SKILL-002.md:153-155`, `:163-165`). The original plan routed them to a brain-MCP troubleshooting reference; **that document will never exist** — the memories that would have seeded it were deleted by Peter's own ruling on 2026-07-27 (see `OWNER-RULED-DELETE.md`), and R-27 left E-1/E-3's disposition to this prompt. They sit in SKILL-002 today and stay there by default; nothing breaks if nothing moves. Options: keep in SKILL-002 as-is [assistant recommends — accurate where they are, zero migration cost]; fold into another home he names; drop them. Either way, no sentence anywhere may keep claiming they route to a troubleshooting doc.

---

## Execution steps

The walk is the spine; Steps 4-16 execute at the moment their section or W-item closes (P4-3 governs this prompt's own conduct). Two ordering constraints: Step 5 runs before C-11's walk; W-4 is asked before the reconciliation-heavy sections.

1. **Verify and load.** The three source paths resolve or the run stops. Load `grill-me` and `skill-creator`; find prompt 1's baseline for all four touched skills (P4-5). Report `grill-me`'s frontmatter as found; Peter's owner-stated values land with the wave-6e edits.
2. **Frame the work (D-4).** Author `docs/planning/PRD-002-skill-002-integration.md` — Problem Statement / Product Vision / Scope Partition, in PRD-001-fond's shape. The Scope Partition states all four axes: (1) skill-body text, (2) `references/` material, (3) global `~/CLAUDE.md` — with a written justification for anything that cannot be progressively loaded, (4) **Fond-project-specific observations that must not be generalised into the shared plugin** — quote E-5 (`SKILL-002.md:173`) there; SKILL-002's Observations carry project incidents that are evidence for rules, not rules. Confirm the three sections with Peter before walking any section. Open the Locked Decisions table (four columns: # / Decision / Owner's answer / Status) and append a row as each section closes — crash safety; a decision that exists only in chat is data loss waiting for a crash. Verbatim means verbatim (`feedback_decision_binding_echo.md:9-14, :33-41`); cadence is ask → answer → diff shown in the same response → applied same turn (`feedback_diff_inline_where_recorded.md:15-21`). Then W-1, W-2, W-3.
3. **The section walk [DECIDED — D-3], grill-me driving.** For each owned section: describe it in plain terms; decompose it into discrete, independently-adoptable requirements as multiselect options Peter picks from (over-cap sections split across consecutive questions); reconcile the mapped memories — conflicts put to him, never absorbed; ask load tier for every section **except C-1, C-2, C-3** [DECIDED — D-7 fixed those three: skill **body**, early, not progressively disclosed — and decided nothing about the rest], showing the cost hierarchy each time (`references/` on demand < `SKILL.md` body per trigger < `~/CLAUDE.md` every session; tier 3 needs written justification). Integration targets are pre-assigned by the map below — ask only where an assignment looks wrong, and say why; some sections point outside the skill set by design (C-3 → the curation chain, C-11 → the ADR machinery, C-13 → the orchestrator agent). Track a per-section ledger in the PRD (PENDING / WALKED / INTEGRATED / REJECTED / OUT_OF_SCOPE). Close by checking all 32 Observations bullets map to walked sections; flag any that does not.

| § | Overlapping memories (relationship) | Consumed by | Decision asked as |
|---|---|---|---|
| C-1 `:23-29` | `write_decisions_immediately` (duplicate); `draft_adrs_evolve_continuously:19,:40` (extends); `diff_inline_where_recorded:15-21` (the mechanism); `analysis_surfaces_options_decisions_phase_locks` — **direct contradiction, reversed via W-8's ground** | Steps 4, 6-7 | walk; the reversal itself is W-8 |
| C-2 `:31-37` | `write_decisions_immediately:33` (dup); `draft_adrs:14-16` (extends to merge/split) | Step 9; CR half is prompt 8's | walk |
| C-3 `:39-49` | `draft_adrs:38` names the `recompose`/`decompose` primitives — one of two lifecycle sites, the other `plan/references/scope-evaluation-and-split.md:120` | Step 11 | walk |
| C-6 `:67-73` | `iterative_phase_reentry:23` (partial); `analysis_surfaces…:53` — **the counter-argument; it must reach Peter** | Step 12 | W-11 + decomposition |
| C-7 `:75-83` | `ground_render_truth:12`; `no_unsupported_quantitative:16` (partial) | Steps 10, 12 | walk |
| C-8 `:85-95` | `api_rate_limit_recovery:41-47,:68` — **measured tension with C-10**; reconciliation put to Peter here | Step 10 + `resource-bounds.md` | walk |
| C-11 `:119-123` | `draft_adrs:14-16,:38` (dup + tooling); `adr_review_blocking_gate:8,:27` (fires on any create/edit) vs `draft_adrs:17` (fires on DRAFT→PROPOSED) — **the layer contradicting itself** | Steps 5, 6, 8 | W-6, W-5, W-7 + decomposition |
| C-12 `:125-127` | none | Step 12 | walk |
| C-13 `:129-135` | `orchestrator_delegation_rules:65-75` (partial — actions, not inferences) | Step 12 + analyst brief | walk |
| N-1 `:185-187` | `phase_skill_wins_conflicts:10` — **direct contradiction**; `write_decisions_immediately:104` resolves the same collision the opposite way | Step 4; `grill-me:84,:141` | W-4, early |

4. **The standing instruction.** Write the never-defer / curate-first discipline into the **body** of `plan`, `research`, `decisions`, early, ahead of the mode/step tables [DECIDED — D-7]. Prompt 6 put it in `spec` — check it landed and match its wording: one phrasing, authored fresh (the `memory` skill's `:469-482` covers only the immediacy half), carried identically — a second phrasing is a second authority. D-7's cascade, not to be paraphrased: (1) analysis runs → its ANALYSIS note is drafted immediately, not assembled at the end; (2) findings trigger deeper analysis → that updates the existing note; (3) a decision results → the moment the first decision locks, its ADR is drafted — not after the last; (4) further related decisions join that ADR if they belong to its cluster, otherwise a new ADR for the new cluster; (5) every point where content lands in a note, the curation gate runs. Fold W-4's answer into `grill-me:84/:141` here.
5. **DRAFT status.** Extend the ADR status subset with the shared vocabulary's DRAFT atom [DECIDED — R-2: one atom set in `shared/composition/src/schemas/common.ts` (prompt 5 defines it), each note type declaring a subset — never a local redefinition; the extension itself is forced by D-11: the steady state is unrepresentable today]. Align both brain authors' enums so the three agree; birth status DRAFT; PROPOSED becomes the explicit ready-for-review signal. Implement W-6's promoter.
6. **Retarget `adr-review`** per W-5 — at the mechanism (`SKILL.md:19-23`) **and** the four prose sites [DECIDED — forced by the `auto_invoke` fact plus D-11: a prose-only change leaves the old rule executing]. Fix the two wrong consensus callers; state the real rule correctly everywhere it appears. Close EH-7 and EH-24; accept EH-17/EH-18/EH-19 with written justifications naming the specific excuse each voids.
7. **Unlock research.** Update all eleven never-lock sites per W-8, including the renderer and its test; run the suite [DECIDED — the prohibition's removal is forced by D-10]. Distinguish in writing: only the lock prohibition falls; D-8's delegation contract is unchanged. `feedback_analysis_surfaces_options_decisions_phase_locks` is **rewritten on migration, not migrated** — its rule is reversed; do not carry it forward unchanged and do not delete it silently. Close EH-30 with `curate`'s verdict.
8. **Reorder decisions.** Remove all seven ADR-after-all-locks sites [DECIDED — forced by D-7 step 3], minding the same-basename files. Fix the three defects: the mutation early-close and its test; the template reconciliation — generate the prose template from the schema, as `dispatch-qa.ts` does for relation verbs [DEFAULT], the skill's template winning over agent-embedded ones [DECIDED — D-13]; the composite arithmetic. Write W-7's criterion; per-cluster is the default. Close EH-5, EH-6, EH-8, and the accept-BUY branch.
9. **The PRD purge.** Rule each of the five emitters explicitly — a blanket rule deletes the pipeline's own convergence record. W-9 names the successor; the PLAN references it [DECIDED — R-9]. `complexity_tier` stays.
10. **Dimensions and wiring.** Land D-9's three dimensions per W-10 in the renderer, its 8 tests, the prose brief and the skill; fix the rendered-brief asymmetry or report why not. At least one markdown file names each wired script (P4-13). Put the C-8 parallelism reconciliation to Peter during that section's walk. Any tooling authored here is pure Bun [DECIDED — R-21].
11. **Three-way, not binary.** `research/SKILL.md:84` becomes `curate`'s merge/split/create verdict [DECIDED — D-6: creating a new note is the fallback, never the default]; `analysis-phase-workflow.md:155` and `convergence-protocol.md:130-131` move with it, and `:131`'s "replaces or supplements" is resolved by the verdict. Call prompt 6's `decideCuration`; do not author a second classifier. C-3's own closing line applies: *"a call for continuous curation as a practice, not for new tooling."*
12. **Derive on every returning analysis** per W-11. Land C-7 (an eliminated option is a separate orchestrator inference, performed explicitly and sceptically or not at all), C-12 (contradicting analyses → interrogate the question first), and C-13 (a ruling inherits the epistemic status of the claims it is built on) as one unit in the same reference. Preserve the trust pairing both ways: C-13 upward, and `feedback_agents_no_autonomous_git_or_plan_writes:19` downward, verbatim — *"Agent return text **and agent-made PLAN edits are both** untrusted until disk-verified."*
13. **Memory-first in decisions.** Author a Step 0.5 **with a halt**: search → three-way verdict → act; fail closed (P4-12). Not read-and-document — that is what D-6 replaces. Fix L4, L5, L7, L8, L9; surface L9's note-count contradiction, do not absorb it.
14. **PRD-first** per W-1 and W-12. Suppress `explainer`'s built-in questionnaire when a completed interview is supplied — design the suppression explicitly; it stays the author. Put the grill-me-list-vs-`NOTE-TEMPLATES.md:802` ratification to Peter on the real numbers.
15. **Migrate the r/d/grill-me memories.** Destination-first re-authoring [DECIDED — R-26: auto-memory content is unratified by default; the memory is an input, never the artifact; any constraint deriving solely from one is flagged in the report]. Read every destination back; sources stay on disk (prompt 12 deletes). Waves:
   - **`research` (6c)**: `research_delegation` (routing table → `references/agent-routing.md`; specialist-first imperative → body; note `:64` records team-dispatch of brain specialists as experimentally confirmed) · `research_outputs_to_brain_notes` (body) · `no_unsupported_quantitative_claims_in_planning` (body + checklist → references) · `rubric_is_starting_framework_not_ceiling` (→ `dispatch-analyst.ts`, already rendering RUBRIC IS FLOOR) · `api_rate_limit_recovery_protocol` (→ `resource-bounds.md`; the only quantified parallelism ceiling in the corpus) · `analysis_surfaces_options_decisions_phase_locks` (**rewritten** — Step 7).
   - **`decisions` (6d)**: `draft_adrs_evolve_continuously` (body, early standing instruction; `:38` names the curation primitives) · `adr_review_blocking_gate` (→ `references/adr-review.md`, **edited per W-5's answer** — its fire-on-any-edit rule is what Step 6 retargets; not re-asked) · `write_decisions_immediately` (body) · `best_option_not_fastest` (body) · `no_open_questions_in_planning_artifacts` (body; EH-12 re-scoped here, Rule 6's definition carried inline) · `port_source_decisions_are_prior_art` (→ `references/rebuild-vs-port.md`).
   - **`grill-me` (6e)**: `ask_protocol`, `diff_inline_where_recorded`, `decision_binding_echo`, `informed_consent`, `one_decision_at_a_time`, `question_persistence` — the batching collisions land per W-2's standard, not re-litigated here; the diff-in-chat vs no-diff-in-durable-artifact pair (`per-decision-micro-cycle.md:68-80`) is compatible once stated together — state them together. The owner-stated frontmatter update lands with this wave.
   - One three-way reaching into prompt 8, surfaced not absorbed: `no_guessing_always_ask:9` (strict halt, quote verbatim) vs `spec_implementation_no_assumptions:48-50` (continue-and-batch) vs `no_open_questions_in_planning_artifacts` (asking what the agent could research is a process failure). Assistant's recommended reconciliation, labeled: halt when the gap blocks the current task; continue-and-batch when it does not [DEFAULT] — written explicitly, because the ambiguity is the whole problem; prompt 8 owns the spec half. Close EH-14 (named arbiter) and EH-9 (prompt 5's halt) in passing.
   - Declared, deliberate exposure at the end: the migrated memories exist twice — in `~/.claude/memory/` and in a skill body. That is the safe transient (P4-9); prompt 12 resolves it. Do not pre-empt it.
16. **Independent evaluation (P4-4/D-2)** of `research`, `decisions`, `grill-me`, `brain/skills/adr-review`, cold-read, beyond the brief. Present one skill at a time, ≤4 findings per question, multiselect = apply; nothing unselected is applied. Three known starting points — do not re-find them: `research/SKILL.md:100` says Step 6 is "critic + decision-critic" while `:20` and `analysis-phase-workflow.md:11` add cva-analysis/gap-analysis absent from `convergence-protocol.md`; `research/SKILL.md:172` forbids `## Open Questions` downstream while `analysis-phase-workflow.md:67` mandates it as a PRD section (prompt 8 owns the fix; flag it); `resource-bounds.md:70-78, 82-90, 94-102, 131-138, 142-149` nest same-length fences that render broken. Then close out: W-13, and the coverage-checksum report.

## Boundary

- **Prompt 8 owns**: C-5, C-9, E-2, E-4, E-6, P-1, P-2, P-3; the spec-side assumption gates and the change-request lifecycle; the spec half of the halt-vs-batch three-way; the `technical-writer.md:242` immutability constraint (surface only); L6 and L10.
- **Prompt 6 owns** `curate`'s mechanism and the ADR-reset invariant — read what it decided; W-5's answer stays consistent with it; no second classifier.
- **Prompt 5 owns** the shared status vocabulary — subset it (R-2), never redefine it. No enforcement claims beyond what ran here (P4-14).
- **Prompt 11 owns** the `grill-me:88` PRD-output-location fix (flag only, unless it blocks) and publishing the precedence line.
- **Prompt 12 owns** deletion of migrated memories. Sources stay on disk; the duplication is declared, not resolved.
- `analysis-phase-workflow.md:169` untouched (resolvable pointer, not an unnamed dependency). `complexity_tier`'s PLAN write stays.

## DECIDED — do not re-litigate

| Decision | Source |
|---|---|
| The interview runs under grill-me; every question through AskUserQuestion | D-3 |
| grill-me frontmatter: `allowed-tools` + `AskUserQuestion`, `model: opus`, `effort: xhigh` | owner-stated (D-3); corpus copy lags — land it, report it |
| Frame first: Problem/Vision/Scope Partition + Locked Decisions table, before the walk | D-4 |
| Continuous curation; merge/split/create with create as fallback | D-6 |
| The five-step cascade; never defer; body-early tier for C-1/C-2/C-3 material (and only that) | D-7 |
| Research always delegates; ANALYSIS notes always; findings never in the PRD | D-8 |
| The three standing research dimensions | D-9 |
| Research ⇄ decisions fluid; locking mid-research is legal | D-10 |
| Concurrent DRAFT ADRs are the steady state; all reviewed before spec (timing = W-5) | D-11 |
| PRD-first for `/plan create` | D-12 |
| The skill's template wins over agent-embedded templates | D-13 |
| full skill-creator lifecycle + independent evaluation per touched skill | D-2 |
| Update cost is work, not an argument | D-19 |
| The never-lock prohibition is removed | forced by D-10 |
| ADR-after-all-locks removed at all seven sites; the retarget lands at the mechanism | forced by D-7 step 3; the `auto_invoke` fact |
| DRAFT enters as a shared-vocabulary subset extension, defined in prompt 5 | R-2 (forced by D-11) |
| The PLAN references the PRD and successor artifacts; never composes them | R-9 |
| Pure Bun for any authored tooling | R-21 |
| Auto-memory content unratified by default; destination-first re-authoring | R-26 |
| ASK-STANDARD developed in this prompt's interview; interim = P4-1's plain-language clause | R-29 |
| Per-cluster ADR default (criterion = W-7) | D-7 step 4 / D-11 |

## Git

Verify the branch first; one branch; coherent commits — suggested boundaries: DRAFT subset; adr-review retarget + consensus; never-lock sites + tests; ADR-ordering sites (spans `decisions` and `plan` — say so); PRD emitters; dimensions + wiring; curation three-way + derivation hook; decisions memory-first; PRD-first; one per migration wave. Unmerged, no push, no `--no-verify`, no AI attribution. Every deletion through the `Bash(rm:*)` gate; no workarounds; the report says so.

## Done means

- [ ] Step 0's map delivered and approved **before any edit**.
- [ ] grill-me and skill-creator drove their own domains; the prompt-1 baseline was found and covers all four skills (or the run stopped); every touched skill passes `bun scripts/quick-validate.ts <dir> --extended` with no benchmark regression.
- [ ] **Every W item was raised at its marked moment, once, in plain language, and its answer is recorded verbatim in the report. No W item was decided silently, and none was asked twice.**
- [ ] `PRD-002-skill-002-integration.md` exists at its named path; the Scope Partition states all four axes including the Fond-specific exclusion; the Locked Decisions table is complete, every answer verbatim; anything landing in `~/CLAUDE.md` carries a written justification.
- [ ] All ten owned sections walked; the 32 Observations bullets check out as a coverage checksum (re-count; report the number); `:237` and `:210` survive verbatim; a load-tier ruling exists for every owned section except C-1/C-2/C-3.
- [ ] The ADR status subset admits DRAFT via prompt 5's shared vocabulary; the three enums agree; W-6's promoter is implemented.
- [ ] `adr-review` no longer auto-fires on save; W-5's answer is stated against `spec`'s all-ACCEPTED input contract; the consensus rule is correct everywhere, including `decisions/SKILL.md:172` and `~/AGENT-SYSTEM.md:1156`.
- [ ] All eleven never-lock sites updated, including the renderer and its test; the suite is green; the delegation-contract distinction is in writing.
- [ ] All seven ADR-ordering sites removed; the mutation early-close and its test fixed; the templates reconciled and `## Considered Options` authorable; the composite arithmetic corrected; W-7's criterion written; per-cluster default.
- [ ] Each of the five PRD emitters has an explicit ruling; `## Convergence Findings` has a named successor that the PLAN references.
- [ ] D-9's dimensions are in the renderer, its tests, the prose brief and the skill; at least one markdown file names each wired script.
- [ ] `research/SKILL.md:84` is a three-way `curate` verdict; both sibling sites moved; no second classifier exists.
- [ ] A per-returning-analysis derivation hook exists per W-11; C-7/C-12/C-13 land as one unit with both trust directions quoted.
- [ ] `decisions` has a memory-first Step 0.5 with a halt; L4/L5/L7/L8/L9 no longer defer to unnamed rules; `analysis-phase-workflow.md:169` untouched.
- [ ] `/plan create` is PRD-first per W-1/W-12; `explainer`'s questionnaire is suppressed when a completed interview is supplied.
- [ ] EH-5, EH-6, EH-7, EH-8, EH-9, EH-14, EH-24, EH-30 and the accept-BUY branch closed; EH-17/EH-18/EH-19 accepted with justifications naming the specific excuse each voids; EH-12 re-scoped with Rule 6's definition carried inline.
- [ ] Migrations are destination-first (R-26), read back, sources still on disk, the duplication declared; the batching collisions resolved per W-2's standard; the halt-vs-batch three-way and the L9 note-count contradiction surfaced, not absorbed; memory-derived constraints flagged in the report.
- [ ] No sentence anywhere still routes E-1/E-3 (or E-5) to a brain-MCP troubleshooting reference; W-13's disposition is executed; E-2 is confirmed present in prompt 8's walk list.
- [ ] Independent-evaluation findings ranked and presented per skill; nothing applied without approval.
- [ ] Branch and commits per P4-7; every deletion went through the rm gate with no workaround, and the report says so.
