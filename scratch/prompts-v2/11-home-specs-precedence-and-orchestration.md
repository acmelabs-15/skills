# Prompt 11 — One authority, one loader, one orchestrator

_Run after prompts 7 and 10. (Prompt 3 is dissolved — R-28 — and is no dependency of anything here.) Paste everything below into a fresh Claude Code conversation._

The mission: settle **which template authority wins and how that is mechanically enforced**, **how the three knowledge-graph specs stay loaded once `~/CLAUDE.md` is thinned to pointers plus non-lifecycle content (R-1 — thinned, never deleted)**, and **what the orchestrator carries**. It also repoints a delegation contract that 27 brain agents depend on and that has never once executed, and rewrites Peter's pre-flight router so lifecycle-owned rows route to their canonical homes instead of memory filenames — the auto-memory layer itself keeps being generated and served (R-13); this prompt re-routes, it never disables.

[FACT] There is no plugin-root `brain/CLAUDE.md` — `find brain -iname CLAUDE.md` returns only `brain/skills/session-init/CLAUDE.md` and two `scripts/CLAUDE.md`; `brain/instructions/AGENTS.md` is a 1-byte stub (`wc -c` → 1). Do not go looking for one.

[FACT] The old conversation ledger's PART 2 findings are unreliable; every figure in this prompt was re-derived at source. Where a number here disagrees with what you find, run the command and report the command — the re-derived figure wins.

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

**Upstream rulings and runtime skills drive; this prompt supplies only facts about this tree, Peter's decisions, and Peter's open questions** (R-30: *"why are we defining this now when the create-skill skill knows how to handle it?"*). Consumed as settled inputs here — never re-decided, never re-asked:

- **The phase-and-part model** — prompt 7 (R-8, confirmed there or revised there). Step 9 applies its outcome; it does not re-open it.
- **The ADR-review timing ruling** — prompt 7. Read it at `brain/agents/orchestrator.md:1070-1101` and apply it in Steps 5 and 8.
- **The canonical session model** — prompt 10 (R-3..R-7).
- **The state-writer ruling** — prompt 9's lane (R-17). If it has landed, apply it; if not, use R-17's stated working default (orchestrator single-writer) and say so in the report.
- **ASK-STANDARD** — developed in prompt 7's interview (R-29); until it lands, P4-1 below is the standard.
- **Skill-edit mechanics** — `create-skill` (P4-5), under its own gates. **Vocabulary** — "milestone" is dead as rival PLAN vocabulary (R-11).

## Standing rules (programme-wide)

- **P4-1 — Every question goes through `AskUserQuestion`.** Max **4 authored options**; "Other" is auto-appended, so never author one, and say in the question text that Peter can type his own answer there. Questions are written in **plain language** — no internal jargon, no stage numbers, no file:line in the question body unless Peter is ruling on that exact text; what breaks and what it costs, stated simply. (A fuller ASK-STANDARD is being developed in prompt 7's interview [DECIDED 2026-07-27]; until it lands, this paragraph is the standard.) [FACT] The 4-option cap is a documentation fact, not a repo fact: `feedback_ask_protocol.md:34` mis-states it (*"Batch up to 4 per `AskUserQuestion` call"* is four *questions*, not four *options*) and contradicts `feedback_one_decision_at_a_time.md:12` — flag that defect if any step touches that memory.
- **P4-2 — One decision per question, one question in flight.** A multiselect decomposing a single decision is not a bundle.
- **P4-3 — Author the moment it locks.** Never defer to a later phase or turn.
- **P4-4 — Independent evaluation on every skill or agent touched (D-2).** Cold read, ranked findings, recommended action plus one-line rationale each; apply nothing without approval.
- **P4-5 — `create-skill` drives every skill edit, under its own procedure.** The prompt-1 snapshot is the baseline — point at it, never re-baseline. Verify `skill-reviewer` resolves before treating it as a gate; otherwise use create-skill's inline fresh-eyes fallback and say which path ran.
- **P4-6 — Binary tool rule.** `docs/**` → Brain MCP; everything else (home specs, skill bodies, agent definitions, config, `.ts`) → `Read`/`Edit`/`Write`, on which Brain MCP is forbidden. Normative source `KNOWLEDGE-GRAPH-CONVENTIONS.md:184-186`, `:202`. This prompt makes **exactly two** `docs/**` writes (Step 9); everything else is non-graph.
- **P4-7 — Git.** Verify the branch first. One branch for the whole prompt. Coherent commits (≤5 files or one logical change). Leave unmerged. Do not push. No `--no-verify`, no force-push. No indication of AI contribution in any commit message.
- **P4-8 — Update cost is work, not an argument (D-19).** *"I wanna do something because it's the right decision to make."*
- **P4-9 — Nothing deleted in bulk; nothing deleted before its destination is live and verified** (read-back or exercise, not assertion). This prompt removes *text*, never files: no `rm` runs here, no `find -delete`, no trash-moves — `Bash(rm:*)` is in the permissions `ask` list by design. Step 4 **rules** on file deletions and records the ruling; prompt 12 executes them.
- **P4-10 — Read before designing, and say what was read. Do not sample.**
- **P4-11 — Precedence: skills plugin > brain plugin > home specs > auto-memories.** [DECIDED — ledger/P4-11] Publishing that ordering, once, is this prompt's job (Step 1).
- **P4-12 — Fail closed; never "document a rationale and proceed."** Treat it as a class, not a count. This prompt disposes of three named branches — `orchestrator.md:1135`, `qa.md:434`, `security.md:377` — and you should assume more exist in every file you open. Counter-models to imitate: `build/references/exit-gates.md:3` (*"'I'll fix in review' is NOT acceptable rationale"*) and `orchestrator.md:1888-1892` (*"If the validator cannot run… DO NOT claim completion"*).
- **P4-13 — Do not build what already ships.** `ANALYSIS-005…deep-analysis.md:61`: *"0 of 17 lifecycle scripts invoked by any SKILL.md"*. Wire, don't rebuild.
- **P4-14 — No claim of mechanical enforcement against production data** unless prompt 5 verified it. The composition suite is **458 pass / 0 fail** (`QA-030…:35,:38`) and entirely synthetic; "82 passing tests" is sourced nowhere — use 458 or drop the number.
- **R-21 — Pure Bun.** Any script this prompt authors (loader tooling, catalog generation, the `docs/**` audit script) is pure Bun TS — never Python, never Node.
- **R-23 — Brain edits are light and specific, never wholesale.** The majority of change lands in the skills plugin. W-6 exists because the log flagged this prompt's template pass against exactly this bar.

## What must already be true before you start

Verify each and report the result before Step 1. If one fails, stop and tell Peter — do not work around it.

| Precondition | From | Check |
|---|---|---|
| ADR-review timing ruling applied | prompt 7 | Read `brain/agents/orchestrator.md:1070-1101`; report what the ruling is |
| Canonical session definition exists; orchestrator's embedded session template gone | prompt 10 | `grep -n "SESSION-YYYY-MM-DD_NN-orchestration" brain/agents/orchestrator.md` → **0**. Do not gate on `grep -n "Session"` (17 unrelated matches — a vacuous gate) or on `write_note({` (the second one at `:1603` is the ADR path) |
| Template wikilink injections cleared | prompts 1, 10 | `grep -rn "\[\[feedback_" ~/*.md` → **exactly three** lines: `KNOWLEDGE-GRAPH-CONVENTIONS.md:478`, `:481`, `:602` — the forbidden-form rule's own illustrative examples, load-bearing (Step 8). 19 at programme start; 0 means someone deleted the rule's examples — stop and report |
| Three-way home-spec diff (`HS-DIFF3`) on disk | prompt 1 | Step 4 consumes it |
| FIC-45 struck from the fiction register | prompt 1 | Register reads **struck, not a fiction** (Step 5) |

---

## The interview — things Peter is wondering about  [WONDERING]

These are Peter's open questions, carried here so they are asked **once, at the natural moment, by you** — not pre-decided in this prompt and not re-interviewed anywhere else. One decision in flight (P4-2). Plain language (P4-1). Show the full current text whenever he is ruling on existing text. Record every answer verbatim in the report; never re-ask an answered item.

**W-1 — at Step 1, after the Step 0 map is approved: which authority owns note shape.** The ledger records this as unsettled (F-16: *"Skill vs `~/NOTE-TEMPLATES.md` is unsettled"*), and restating 1,465 lines inside skills is its own drift engine. Options: **(a)** split by concern — skills own behaviour, home specs own shape, skills *import* the shape from one machine-readable source [assistant recommendation: the only option that ends drift instead of relocating it, and the pattern already ships once — see Step 1]; **(b)** skills win outright, `~/NOTE-TEMPLATES.md`'s 12 sole-authority templates move into the skills plugin; **(c)** home specs win outright, skill templates become pointers; **(d)** split by type — the 4 spec-subtree types are skill-owned, the other 12 stay home-spec-owned.

**W-2 — immediately after W-1: how precedence is enforced.** An unenforced precedence rule degrades silently; no ruling picks a mechanism. Options: **(a)** import-from-source plus a post-return audit — templates import enums from `shared/composition/src/schemas/common.ts` with a count-pinning test, and every agent return that produced a note is parsed through its schema and `run-pre-flight.ts`'s `runChecks`, re-dispatching on failure, capped at 3, then halting [assistant recommendation — both halves already ship once each; P4-13 says wire them]; **(b)** post-return validation only; **(c)** prose precedence headers plus periodic manual audit; **(d)** codegen — generate the prose template blocks from the Zod schemas.

**W-3 — at Step 2, before the reconciliation edits: the reconciliation batch (multiselect — one section decomposed, P4-2).** Each item is a verified contradiction with a determinable winner; the assistant recommends all four. **(a)** QA note: regenerate both home-spec tables from `QaNoteSchema` (its `tests_run === passed + failed + skipped` is load-bearing) and author the missing skill-side QA template; **(b)** names and paths: one schema name (`qa-note.ts`), one validator (`validateQaPassClaim()`), one field name (`qa_ref`), `shared/` everywhere; **(c)** relation verbs: adopt the code allowlist (16 verbs, `common.ts:79-96`) and fix the prose 11-verb list, unblocking the ADR coverage gate's `implemented_by`; **(d)** caps, heading levels, `date:`: honour the revocation at CONVENTIONS `:533`, Exit Criteria always H4, strip `date:` from PLAN and SPEC templates.

**W-4 — at Step 3: where the three reconciled specs live and how they load** (ledger Q19). Reframed by R-1/R-13: `~/CLAUDE.md` is thinned, never deleted, and pointers are exactly what the thinned file keeps — so this is a routing question, not a survival question. Options: **(a)** the three remain the canonical knowledge-graph spec, reconciled, moved into the skills plugin with their own loader, skills reference rather than restate [assistant recommendation — natural destination for W-1(a)'s import model]; **(b)** fold their content into the skills and retire all three (R-1 note: content that stays served must keep a live route — no orphaning); **(c)** leave them in place, give them a loader only; **(d)** split — CONVENTIONS and STRUCTURES become the graph spec in the skills plugin, NOTE-TEMPLATES retires in favour of skill-side templates.

**W-5 — at Step 4, with the extraction evidence in hand: the fate of `~/AGENT-SYSTEM.md` and `~/AGENT-INSTRUCTIONS.md`** (ledger Q18). SESSION-PROTOCOL is *not* part of this question — its supersession is decided (R-3). Options: **(a)** delete both after extracting the post-fork unique content per prompt 1's diff [assistant recommendation]; **(b)** keep AGENT-SYSTEM as the agent catalog, delete AGENT-INSTRUCTIONS after extraction; **(c)** keep both, reconciled against the 1.0 specs; **(d)** thin both to pointers into the surviving authorities. Whatever he picks: ruled here, executed in prompt 12 (P4-9).

**W-6 — before Step 5 executes: the shape of the brain-agent template pass [TPL-BRAIN-STRIP].** Peter's R-23 says brain edits are *"light and specific, never wholesale"*, and the rulings log flags this exact step as possibly needing narrowing *"from 'strip/retire' to 'targeted edit + pointer'"*. The measured surface is Step 5's candidate list (13 remove / 11 override / 4 re-home, plus the 21 both-ways blocks). Options: **(a)** targeted edit + pointer — each competing block is cut to a one-line pointer at its canonical home; agent files keep their shape [assistant recommendation: this is R-23's bar, and it still removes every competing definition]; **(b)** the full pass as scoped — remove/override/re-home; **(c)** hybrid — remove only the note-shaped blocks (the 0-4 census), pointer the rest; **(d)** minimal — fix only the two corrupted fences and the fifth frontmatter authority now, defer the rest. **A fact that constrains ordering regardless of the answer**: no template leaves an agent before its canonical replacement is live — prompt 10's session definition is a hard precondition, and the brain `memory` skill is injected into **22 of 27 agents** at startup, so a premature strip leaves 22 agents with nothing in its place.

**W-7 — at the end of Step 5: does `technical-writer` gain `skills: memory`** (ledger Q23). Five agents lack it: `context-retrieval`, `debug`, `import-memories`, `janitor`, `technical-writer`; only the last is a plausible future note author. Options: **(a)** yes, if and only if it authors durable notes [assistant recommendation]; **(b)** no — route its note I/O through the `memory` agent; **(c)** defer until something actually dispatches it; **(d)** retire it — its ADR template is the corrupted one from Step 5b, and its `:242` *"Immutable once accepted"* is a fourth position on ADR mutability that forbids the incremental evolution Peter decided on (D-11); fold prose authoring into `explainer`.

**W-8 — at Step 7: what the orchestrator preloads** (D-23; the ledger records the assistant's recommendation as *"Still to be confirmed by the owner"*). [FACT] Settings set `"agent": "orchestrator"` — default agent for every session; a preloaded skill injects its full body at startup; `plan` is 289 lines. The only measured evidence in the corpus is `brain/skills/context-optimizer/SKILL.md:91-96`: baseline 53% / skill 53% / skill+instructions 79% / **AGENTS.md passive context 100%** — an agent body *is* passive context. Options: **(a)** put the ~15-line discipline in `orchestrator.md`'s body, preload nothing [assistant recommendation — the 100%-scoring channel at 15 lines instead of 289]; **(b)** preload `plan` whole; **(c)** create a thin `plan-discipline` skill and preload that; **(d)** put the discipline in the Step 3 loader so every agent gets it as passive context.

---

## STEP 0 — the map, delivered before anything is edited  [BLOCKING GATE]

Nothing edits a file until Peter has seen the map and said go. The file:line facts in this prompt predate prompts 7 and 10 landing — several will have moved. Produce one table per concept, each row citing file, line and actual text, then stop:

1. **Template authority** — every place a note shape is defined: `~/NOTE-TEMPLATES.md`, `spec/references/spec-templates.md` and siblings, every fenced `markdown` block in `brain/agents/**`.
2. **Precedence and canonicity** — every statement that one source beats another or that a file is canonical. Search `wins`, `supersede`, `canonical`, `authoritative`, `source of truth` — not "precedence" (the word is not where the rules are; see Step 1).
3. **The `sync` contract** — all 26 State-Changes closing lines plus the orchestrator's four invocations, at current line numbers.
4. **The router** — `~/CLAUDE.md`'s pre-flight table and every `feedback_*` reference in the file, in and out of the table, **re-checked against the post-R-28 layer** (98 root files + ~33 per-project subdirectories; 21 memories deleted 2026-07-27 — rows naming one of those are already dead, not prospectively dead).

Where a count differs from this prompt, yours wins if you show the command — say so explicitly. Wait for Peter's go. No reply is a stop, not an implied yes.

---

## Step 1 — Publish and enforce precedence  [TPL-PRECEDENCE]

**The order itself is [DECIDED — ledger/P4-11]: skills plugin > brain plugin > home specs > auto-memories. Skill template beats brain-agent template [DECIDED — D-13].** What remains open is shape ownership (W-1) and the enforcement mechanism (W-2).

[FACT] What exists today is not five competing orderings — no surviving file publishes *any* ordering:

- `grep -rn "precedence"` across `home-specs/`, `brain/rules/`, `brain/` and every lifecycle `SKILL.md` returns no authority-ordering statement — only `plan/SKILL.md:91`/`:116` (branch-name derivation) and prompt-engineer prose.
- Four rules name a winner over a named loser, and three live in the auto-memory layer: `home-specs/CLAUDE.md:15` (*"the memory supersedes CLAUDE.md"*), `feedback_always_check_memories.md:46` (CONVENTIONS beats a derivative memory), `feedback_phase_skill_wins_conflicts.md:10` (a phase skill's `references/` beats the home specs), `feedback_no_section_sign.md:37-38` (an anti-precedence rule: its sole home is the memory itself). Rules 1 and 2 are directly circular; rule 3 inverts rule 2 inside any phase skill.
- Six statements assert canonicity without naming a loser: `CONVENTIONS.md:11`, `SESSION-PROTOCOL.md:3`, `:9`, `NOTE-TEMPLATES.md:28`, `CLAUDE.md:75`, `:244`.

So this step **authors** the published order; it does not adjudicate among orderings that were never published.

[FACT] Three template authorities, two live collisions the winner must resolve: `~/NOTE-TEMPLATES.md` (1,465 lines; sole authority for 12 of 16 entity types; cited by `~/CLAUDE.md` at `:3`, `:26`, `:70`, `:83`, `:278`) vs `spec/references/spec-templates.md` (384 lines, 4 types) vs the brain agents (**1 to 11** fenced `markdown` blocks each — adr-generator has 1; **0 to 4** counting only note-shaped blocks). Collision one: `effort: M` is 2-5 days under `NOTE-TEMPLATES.md:590`/`STRUCTURES.md:414-416` and 1-3 days under `spec-templates.md:172` — every effort rollup computes across mixed units. Collision two: SPEC root status at creation is `DRAFT` at `NOTE-TEMPLATES.md:326` and `ACCEPTED` at `spec-templates.md:268`.

[FACT] Both halves of W-2(a) already ship once. Import-from-source: `build/scripts/dispatch-qa.ts:18` imports `validRelationTypes` from the schema (rationale in its docblock `:6-8`), count pinned by `dispatch-qa.test.ts:61-63`. Post-return audit: `decisions`' detail-parity mandate (`references/adr-authoring.md:151-157`) plus Step 6 audit sampling ≥5 D-Ns (`decisions/SKILL.md:162`), re-dispatching on compression, capped at 3 (`:168`). Generalise these; do not invent a second mechanism. P4-13: `end/scripts/run-pre-flight.ts` (290 lines) already validates every invariant in question and derives its enums from the composition library — wire it, do not write a second one.

Once W-1 and W-2 lock:

1. **Publish the order once**, in a surface that survives prompt 12's thinning — its home is whatever W-4 lands, so write it the moment W-4 lands; until then carry it in working notes, not another copy. State all four layers and what "wins" means for behaviour and for shape.
2. **Convert the six canonicity claims** into positions in that order — each rewritten to point at the published order, or deleted. A bare "Canonical Source of Truth" left standing re-seeds the problem.
3. **Fold the three memory-layer ordering rules into the published order** and record the supersession for prompt 12's KEEP-IN-LAYER review — their file fate is prompt 12's per-item call, not yours [DECIDED — R-1/R-14]. `feedback_load_governing_skill_before_acting.md:18` carries the precondition worth keeping: *"precedence only matters once the skill is actually loaded."* `no_section_sign`'s home question belongs to prompt 12 — flag only that the published order must not contradict whatever it lands on.
4. **Implement the W-2 mechanism**, failing closed per P4-12.
5. **Resolve the two collisions in the winner's favour** and delete the loser's text — never both plus a note.
6. **Fix `~/CLAUDE.md`'s self-sourcing loop** [FACT]: the Critical Constraints row at `:354-360` cites CLAUDE.md as its own authority for the ADR-review constraint while `:15` lets any memory override it. Only the ADR row is self-sourced; the other two rows have real upstreams.

---

## Step 2 — Reconcile the three 1.0 specs  [HS-KG-RECONCILE, HS-PARSER-WIKILINK]

`KNOWLEDGE-GRAPH-CONVENTIONS.md`, `KNOWLEDGE-GRAPH-STRUCTURES.md`, `NOTE-TEMPLATES.md` (`1.0 / 2026-04-21`) are real, current specs — and they contradict each other and themselves. Reconcile before routing anything to them. W-3 rules the batch; the contradictions, all [FACT]:

| # | Contradiction | Sites |
|---|---|---|
| 1 | QA note defined four ways; `QaNoteSchema` (`shared/composition/src/schemas/qa-note.ts:140-148`) enforces `tests_run === passed+failed+skipped`; no skill-side QA template exists | `STRUCTURES.md:637-638` vs `NOTE-TEMPLATES.md:1384-1396` |
| 2 | The 2026-05-21 `test-report`→`qa` rename half-swept: three schema names, two validator names, and the rendered example still emits `- **Test report ref**:` where the field table says `qa_ref` | `CLAUDE.md:209`/`:219`, `STRUCTURES.md:646`/`:654`/`:250`/`:261`/`:220`, `NOTE-TEMPLATES.md:1352`/`:718` |
| 3 | `_shared/` at four copy-me callouts; everywhere else `shared/`; `CLAUDE.md:203-209` a bare third form | `NOTE-TEMPLATES.md:320`, `:448`, `:505`, `:583` |
| 4 | Bi-directional-relation rule names five inverse verbs (`CONVENTIONS.md:402`, `:406-416`) that the prose 11-verb allowlist (`:598`, `:626`; restated `spec/references/authoring-workflow.md:26`) forbids — and the ADR coverage gate tests for `implemented_by` (`spec/SKILL.md:145`). Prose-only defect: the code allowlist (`common.ts:79-96`) already has 16 verbs including all five | as cited |
| 5 | Observation/relation caps revoked at `CONVENTIONS.md:526-533`, still asserted at `:597` and `STRUCTURES.md:541-542` | as cited |
| 6 | Exit Criteria H3 (`NOTE-TEMPLATES.md:657`) vs H4 rendered (`:712`) vs "ALWAYS H4" (`STRUCTURES.md:158`) | as cited |
| 7 | `date:` emitted by PLAN/SPEC templates (`NOTE-TEMPLATES.md:664`, `:327`) against `CONVENTIONS.md:314`; all 10 real example notes side with CONVENTIONS | as cited |
| 8 | Three broken cross-references (`STRUCTURES.md:509`, `:556`, `:165`) and §4.13 unreachable — every index says "4.5-4.12" (`CONVENTIONS.md:91`, `:420`, `CLAUDE.md:82`) | as cited |
| 9 | `NOTE-TEMPLATES.md:15` says "11 full + 5 stubs"; its own index at `:32-49` lists 12 + 4 | as cited |

**Six template constructs describe nothing real — delete them** [FACT, verified against 7 real PLANs and 10 example notes]: `#### Milestone N.M` 8-field blocks (`NOTE-TEMPLATES.md:706`, `STRUCTURES.md:90-158` — zero occurrences; and "milestone" is dead as rival vocabulary [DECIDED — R-11]); the `Progress Dashboard` column mandate (`Tasks Done`/`Tasks Total`/`QA Gate` appear in zero of seven PLANs — regenerate from the renderer); the 3-mode `Effort Tracking` table (1 of 7, empty, with `PLAN-001-fond:550` refusing to fill it); the `NOT STARTED/IN PROGRESS/COMPLETE` PLAN enum (`STRUCTURES.md:197` — reality uses BuildWorkflowItem); the `PLAN-NNN-SPEC-NNN:` title form (`NOTE-TEMPLATES.md:661` — zero of seven); `## Implementation Sequence` with `### Phase N` (`STRUCTURES.md:83`, `NOTE-TEMPLATES.md:682` — absent everywhere).

### The wikilink form the live parser rejects  [DECIDED — forced by the live parser]

[FACT] The defect is in the rendered example at `STRUCTURES.md:245`, `:250`, `:256`, `:261` — **not** `:220`, which is the correct `qa_ref` field-table row. A `[[wikilink]]` inside a `**bold**:`-prefixed bullet trips basic-memory's malformed-relation guard; Peter's own PLAN records the workaround (`PLAN-003:242`: *"the live basic-memory parser rejects a `[[wikilink]]` inside a `**bold**:`-prefixed bullet"*, linkage carried by `contains`/`part_of` relations instead). Consequence: zero `[[QA-NNN: …]]` wikilinks across all 10 example notes — **every QA note in the corpus is graph-invisible.** Amend the four lines to a parser-accepted form, rename the field to `qa_ref` in the same edit, give QA notes a reachable edge (`validated_by` in `## Relations` — not bold-prefixed — is the obvious candidate [DEFAULT]). **Then prove it**: add the edge to one existing QA note under `skills/docs/qa/` via Brain MCP and demonstrate a search or traversal that returns it now and did not before.

---

## Step 3 — Routing for the specs  [HS-LOADER]

[FACT] The home-spec layer is 8 docs, 5,904 lines total, at `~/.claude/home-specs/` symlinked to `~/{NAME}.md`. `~/CLAUDE.md:5` is the **only** `@`-import in all 5,904 lines (`grep -n "^@" *.md` → one line). CONVENTIONS is tier-1 solely because of that line; STRUCTURES and NOTE-TEMPLATES load only via CLAUDE.md's on-demand pointers (`:69-70`, `:82-83`).

The reframe [DECIDED — R-1/R-13]: `~/CLAUDE.md` is **thinned to pointers plus non-lifecycle content, never deleted**, and all six auto-memory generation/loading settings stay ON. So the question is not "what loads the specs once CLAUDE.md is gone" — it is W-4's: where the reconciled specs live, and what pointer set and loader route agents to them once lifecycle-owned content migrates out. Whatever W-4 answers, the routing must: (1) not depend on any lifecycle-owned content that leaves `~/CLAUDE.md`; (2) load CONVENTIONS at Peter's **tier-1** and STRUCTURES/NOTE-TEMPLATES **on-demand** (his vocabulary — `CLAUDE.md:3`, `:68-70`, `:81-83`, `:278`); (3) keep working while the auto-memory layer continues to be served. **Demonstrate it** by loading each of the three and quoting one line from each that could only have come from the loaded file. Mirror `MEMORY.md`'s home-spec pointer lines into it (`:3-5` pre-R-28 — re-verify, the 2026-07-27 index edit removed 21 lines and a section header); `MEMORY.md` itself stays, indexing the served layer.

---

## Step 4 — Rule on the stale home specs  [HS-DELETE-3]

**`~/SESSION-PROTOCOL.md` is superseded [DECIDED — R-3]**: prompt 10's session model replaces it, and its global single-active-session constraint dies with the supersession (replaced by R-3's invariants: one plan per session, ≤1 active session per plan, ≤1 active owning session per part). [FACT] Both copies are byte-identical — md5 `b6432f02ffd059b023431c5e3e269ea5`, 657 lines each — so it is one definition stored twice; and it is the heaviest normative file in the corpus: **103 MUST (15 MUST NOT), 26 SHOULD, 6 BLOCKING** case-sensitive. Supersession is decided; the 103 obligations are **triaged, not assumed stale** — unique survivors get destinations recorded. Physical deletion timing belongs to prompt 12's lane.

W-5 rules the other two. The extraction evidence, all [FACT]:

- **The version stamps are falsified** — post-fork edits under an unchanged stamp: `AGENT-SYSTEM.md:316` carries the post-rename QA form while `brain/rules/AGENT-SYSTEM.md:316` still says "Test reports" (cite `:316` alone; `:315` is identical in both; the edit is undated in this file); `:637-666` is a whole `state-sync` agent definition absent from the fork; `:1198-1235` the agent-teams contract; `AGENT-INSTRUCTIONS.md:116`'s Codex-only hook note is undated (do not borrow `AGENTS.md:63`'s 2026-06-30 — that dates the pre-compact de-registration). The two differ from `brain/rules/` by **479 and 142 lines** under the same stamp — delete-on-version destroys current content. Consume prompt 1's HS-DIFF3.
- **They hold zero auto-memory coupling** (per-file `feedback_*` counts: CLAUDE.md 41, CONVENTIONS 17, STRUCTURES 10, NOTE-TEMPLATES 7, AGENTS 1, the three here 0/0/0) — so consolidation is mostly merge, not deletion.
- **The version census is loose**: `AGENT-INSTRUCTIONS.md` has no date and no `version:` field anywhere ("Version 3.0" is a trailing italic at `:441`); same shape for SESSION-PROTOCOL (`:657`).
- Zero occurrences of the research/decisions/spec/build/review/end lifecycle anywhere in the eight home specs; what exists is `AGENT-SYSTEM.md §3`'s 7-flow routing catalog (`:676-919`). If AGENT-SYSTEM goes, say what replaces that catalog.

Output of this step: the extraction, the triage, and an explicit keep/thin/delete ruling per file, recorded where prompt 12 will read it. Nothing is deleted here (P4-9).

---

## Step 5 — The brain-agent template pass  [TPL-BRAIN-STRIP, ADR-IDENTITY, Q23-TECHWRITER]

Skill-beats-agent is decided (D-13); **W-6 decides the shape of the pass before any of this executes** (R-23's bar). The measured candidate list [FACT]: **remove 13** (4 SESSION templates, 1 PLAN, 2 ADR — `adr-generator`, `technical-writer` — 1 TASK, 1 WBS, 2 HANDOFF, 1 Implementation Plan, 1 Session Handoff, and `rules/AGENT-INSTRUCTIONS.md:264-308`'s REQ/DESIGN/TASK frontmatter schemas — a **fifth** spec-frontmatter authority, incompatible with everything else); **override with skill templates 11** (architect ADR; spec-generator REQ/DESIGN/TASK; explainer PRD; analyst ANALYSIS ×5; retrospective RETRO; qa strategy + report); **re-home 4** (3 impact-analysis, QA pre-PR validation); **out of scope 4** (technical-writer blog/docs/tutorial, EPIC). The HANDOFF templates and handoff-file references are debris inherited from the external ai-agents system — remove, don't restore [DECIDED — R-20]. Prompt 8 already fixed `spec-generator.md:304-308`'s TASK Relations — verify, do not redo. Prompt 9 owns the R-22 message templates at the **end** of `orchestrator.md`/`implementer.md`/`qa.md` — leave those blocks untouched.

Regardless of W-6's answer:

- **5a — `adr-generator` carries two ADR identity schemes 35 lines apart** [FACT]: `:194` `adr-NNN-[title-slug].md` in `/docs/adr/` vs the `write_note` at `:228-230` with `title: "ADR-NNN-[topic]"`, `folder: "decisions"` — and it never mentions adr-review despite `orchestrator.md:1068`. Reconcile to prompt 7's ruling; do not invent a third.
- **5b — two files are corrupted by a State-Changes block injected inside a template fence** [FACT]: `technical-writer.md` (fence opens `:182`, block injected `:220-232`, nested fence `:224` — `:234-236` renders as prose, `:237-308` swallows two sections, `:212-217` truncated) and the same artifact at `adr-generator.md:161-162`. **Repair both fences before Step 6 touches these files.**
- **The two escape hatches die** [DEFAULT — P4-12 application; executed, not asked]: `qa.md:434`'s `CONDITIONAL (document gap, proceed with warning)` row — coverage below minimum *is* a gate failure; the verdict table becomes two rows — and `security.md:377`'s `CONDITIONAL: Approved with minor fixes required`, which `:233` already forbids. Record each with before/after and the rule it now fails closed on.
- **The 21-agent both-ways rule** [FACT]: 21 agents carry `## Memory Operations (MANDATORY)` forbidding direct Brain MCP, then issue literal `mcp__plugin_brain_brain__*` calls 200-500 lines later (`implementer.md:256` vs `:718-733`; `qa.md:56` vs `:579-594`; `analyst.md:72` vs `:398-413`; `orchestrator.md:151` vs `:298-313`; `skillbook.md:343` states the opposite outright). Direct Brain MCP is correct under P4-6's normative source. Delete the 21 blocks — all 21 or none [DEFAULT], in whatever form W-6's answer prescribes.
- **FIC-45 stays struck** [FACT]: `allowed-tools` pre-approves, never restricts — a missing grant prompts, it does not block. Confirm the register shows it struck; touch neither `brain/commands/memory-documentary.md` nor `brain/commands/research.md` for it.

W-7 (technical-writer) closes this step.

---

## Step 6 — Repoint `sync`  [ORCH-SYNC-DEAD]

[FACT] 26 agents close with the identical State-Changes line telling the orchestrator to delegate to a `sync` agent (e.g. `implementer.md:983`, `qa.md:689`, `memory.md:797`); `orchestrator.md:1118-1152` operationalises it under `### State Sync Enforcement (BLOCKING)` — and **`brain/agents/sync.md` does not exist** (`find . -name "sync*"` in the plugin returns nothing). The escape hatch at `:1135` (*"sync skill unavailable | Report warning, proceed"*) means the BLOCKING gate has never once fired; it degrades silently on every invocation.

[DEFAULT — deviation reported, not asked]: **repoint, do not delete** — `sync-graph` and `sync-jira` exist as user-level skills under `/Users/peter.kloss/.claude/skills/`. Delete the `:1135` hatch in the same pass (P4-12: repointing is what makes the gate able to fire). All 26 State-Changes sites change simultaneously or none do [DEFAULT — a half-repointed contract trusts half the agents]; one logical change, one commit. Repair the 5b fences first — the injected block is the block being edited. Carry Peter's recorded caveat honestly, quoting each site as it reads: `feedback_sync_graph_unreliable.md:15` (*"Do NOT recommend `/sync-graph`"* — an unratified auto-memory, R-26), `CLAUDE.md:252` (incorrect rollups; not a substitute for the manual pass), `:141` (`--dry-run` first, reconcile by hand), against `CONVENTIONS.md:50`'s bare "run it after state changes". Repoint to the real skills **and** state the `--dry-run`-then-reconcile discipline where they are repointed — do not repoint into a promise already recorded as false.

---

## Step 7 — The orchestrator  [ORCH-DELEGATION, ORCH-PRELOAD]

**7a — absorb the delegation rules leaving the memory layer.** `feedback_orchestrator_delegation_rules.md` migrates into `orchestrator.md`'s body — destination-first re-authored, the memory is input, never the artifact [DECIDED — R-26]. Its sole-source content is `:65-75`, the four hard runtime violations. [FACT] Its `:16-18` absolute ban on orchestrator note-writing contradicts `feedback_state_sync_after_agents.md:26`/`:84`, `CLAUDE.md:252` and `feedback_per_task_build_qa_cycle.md:171-192`, which all require orchestrator writes — every build cycle violates one of the three rules. Resolve it per the state-writer ruling from prompt 9's lane (R-17; working default if unlanded: orchestrator owns PLAN and SESSION state, specialists own their own artifacts; the four violations stay, scoped to specialist artifacts) — consumed, not re-decided.

**Three invariants survive the rewrite — each exists only in `orchestrator.md`** [FACT]: **H-1** one-level delegation (`:89-132`); **H-2** trace correlation — and the receiver exists: `brain/skills/session-init/scripts/new_session_log_json.ts` accepts `--trace-id`/`--parent-session-id` (`:32-33`) and writes both (`:130-131`), wired by prompt 10 (`:256-280`); **H-6** the Fail-Closed Principle (`:1879-1896`) — P4-12's model.

**7b — catalog and dispatch syntax.** [FACT] `brain/rules/AGENT-SYSTEM.md:43` claims 19 agents against 27 agent files — 8 unroutable (`adr-generator`, `backlog-generator`, `context-retrieval`, `debug`, `import-memories`, `issue-feature-review`, `janitor`, `technical-writer`); `orchestrator.md` alone carries three inventories; three incompatible dispatch syntaxes coexist (`Task(subagent_type=…)`, `Agent(subagent_type=…)`, `#runSubagent` at `pr-comment-responder.md:488`), two of them stale tool names. Catalog all 27, standardise on one syntax, generate the catalog from the directory where possible (pure Bun, R-21) [DEFAULT].

**7c — route the plan-spawn flow** [DECIDED — R-10; the flow is settled, the routing lands here]: when work is detected out-of-scope, the route is `/plan create` for the dependency plan (starting at its scope phase, per prompt 7's phase model) → link `depends_on`/`blocks` → mark the parent part BLOCKED with a pointer → optional worktree → return. Wire that route into the orchestrator's routing surface and Step 8's router; mechanics are [DEFAULT], the flow is not.

W-8 (preload) closes this step. [FACT] Constraint on anything added to brain: `brain/skills/memory/SKILL.md` is 723 lines, injected into 22 of 27 agents, already past the plugin's own 500-line lint (`taste-lints/SKILL.md:68`); prompts 6 and 10 removed 122 lines — check what remains before adding.

---

## Step 8 — The router, and the home-doc riders  [AM-ROUTER]

**The reframe [DECIDED — R-1/R-13]: the layer keeps being generated and served; `~/CLAUDE.md` is thinned, never deleted. The router is rewritten so lifecycle-owned rows route to their canonical homes; rows serving non-lifecycle memories keep routing to the layer.** Do not delete the table.

[FACT] The router's shape: `~/CLAUDE.md:17-44` — header `:17`, separator `:18`, **26 data rows** at `:19-44`. 23 rows reference `feedback_`; 22 name an actual file; for 19 the memory name is the entire actionable payload; 3 (`:19`, `:22`, `:26`) degrade rather than die; 30 of the file's 41 `feedback_*` occurrences live in the table; 11 more sit on 9 lines outside it (`:15`, `:52`, `:54`, `:85`, `:125`×2, `:238`×2, `:248`, `:252`, `:285`). Re-verify the census post-R-28 — rows naming one of the 21 deleted memories are dead today.

The rewrite, per row [DEFAULT]: rows whose memory is **lifecycle-owned** get their Consult cell rewritten to a destination skill and section (prompts 2 and 5-10 built every destination — the post-compaction row points at prompt 10's rehydration, by skill and section); rows whose memory **stays in the layer** keep naming it — the layer is served — and are recorded for prompt 12's KEEP-IN-LAYER review. The two glob rules (`:27` — never cite `feedback_*` filenames in `docs/**`; `:85` — auto-loading via MEMORY.md) **stay: both remain true under R-13** (this reverses an earlier draft that deleted them on layer-death grounds). Four prose sites (`:238`, `:248`, `:252`, `:285`) get their rule stated inline where its source migrates.

**Repairs in the same pass:**

1. **CONVENTIONS §5.2/§5.3**: prune only what is genuinely vestigial — `:461`'s out-of-scope entry, the `:488-490` replacement-pattern rows, `:518-519`'s audit greps — verifying each named memory against the post-R-28 layer first. Rules that govern the *served* layer stay (R-13). **`:476-482` and `:602` survive untouched** — the forbidden-form rule's own examples; **record their post-edit line numbers in the closing report** — prompt 12's terminal wikilink sweep builds its allowlist from them.
2. Delete `CONVENTIONS.md:6`'s `extracted_from:` frontmatter [FACT — it points at a file that does not exist].
3. **Fix the self-violating audit at `CONVENTIONS.md:518`** [FACT — a `grep` over `docs/**`, which `:184` forbids and `:604` lists verbatim as a forbidden pattern]. Move it into a script (pure Bun, R-21) or carve out read-only script-side reads explicitly. **Whatever lands becomes prompt 12's only sanctioned `docs/**` audit — land something that runs, and name it in the closing report.**
4. **Verify prompt 6's Memory-First Gate fifth step is present verbatim** (merge/split/create — creating is the fallback) and that `CLAUDE.md:26` carries `+ Memory-First Gate step 5`; report if missing, do not silently author.
5. **Write prompt 7's ADR-review ruling into the four home-spec sites** — `CLAUDE.md:360` (self-cited), `:246-248`, `AGENT-INSTRUCTIONS.md:109`, `AGENTS.md:66` — scoped to a status transition, noting `CLAUDE.md:162` lists "New ADRs" under Ask First (a three-way conflict). Consumed from prompt 7, not re-decided.

### Home-doc riders  [DECIDED 2026-07-27 — R-27/R-28]

1. **Verify the shipped `~/REFLECT-PROTOCOL.md` + `~/CLAUDE.md` pointer arrangement**: the doc exists and is the canonical reflect protocol — Peter affirmed the protocol correct; the auto-memory duplicating it verbatim (`feedback_inline_reflect_capture`) was deleted 2026-07-27. Report drift; do not re-author.
2. **Apply the R-13 lifecycle-ownership routing note to that doc's persistence hops.** It currently says *"skillbook persists durable ones to `~/.claude/memory/feedback_*.md`"* and its composability summary ends *"`~/.claude/memory/` updated; future sessions auto-load via MEMORY.md → CLAUDE.md tier-1 import chain."* Narrow in place: **lifecycle-owned learnings route to their canonical lifecycle homes and must not regrow in the layer; non-lifecycle captures may still land there** — the layer keeps being served.
3. **Remove the stale `github-ops` skill reference from home CLAUDE.md.** [FACT] No `github-ops` skill resolves; the resolvable user-level set is 17 skills.

---

## Step 9 — Reconcile the documentation  [DOC-RECONCILE]

The docs describe a system with no templates, no taxonomy, no memory layer — **treat that as the target state, not a defect**; `workflows.html`'s two-note model is the design brief. Preserve verbatim in substance [FACT]: PLAN = source of truth (`workflows.html:216-219`); SESSION = chronological event log (`:220-222`); stateless resume (`:224-227`); the done-enough test (`:256-258`); *"Never let the AI defer the workflow itself"* (`:283-285`).

Fix what is wrong:

1. **The phase model** — [FACT] the docs say five phases (`:231-232`); `PhaseEnum` carries seven (`shared/composition/src/schemas/common.ts:55-63`). **Consume prompt 7's phase-and-part model [DECIDED — R-8, as confirmed or revised there] and reconcile all three surfaces to it — docs, skill bodies, plan template — covering backward transitions (prompt 8's change-request re-entry) as well as forward.** Residual disagreements the model does not settle are flagged in the report with sites — never silently reconciled to whichever surface loaded last, and never re-interviewed here: the model is prompt 7's.
2. **The part-id grammar** — [FACT] only `build.SPEC-NNN` is documented (`index.html:120-124`); `documentation/` has zero occurrences of `decompos*`, `spec-decomposition`, or the `build.*` sub-part names. Document what prompt 5 settled for `PartIdSchema`; make part grammar and phase model one artifact.
3. **Rehydration** — [FACT] `workflows.html:344-346` (*"rehydrate manually"*) is the corpus's entire rehydration documentation. Rewrite it to describe prompt 10's skill-driven rehydration, after confirming that work landed.
4. **The Defer branch** (`workflows.html:280`) — tighten to require an explicit recorded decision, per P4-12; keep Fix and Abandon as they are.

**This prompt makes exactly two `docs/**` writes, both via Brain MCP (P4-6):** the Step 2 QA-note edge, and **the ADR-002 correction** — ADR-002 asserts a cross-source safeguard three times (`:262`, `:523`, `:571`) that ADR-004 refutes at `:24` (*"None of these exist in code"*); add a dated `## Clarifications` line.

---

## Step 10 — Migrate the six brain-destined memories  [AM-MIG-SKILLS, brain subset]

The last migration slice whose destinations are inside the brain plugin. Prompt 3 is dissolved and moved nothing — check each destination anyway; nothing lands twice. Destination-first re-authoring throughout [DECIDED — R-26]: the memory is an input, never the artifact; these are policy-class rules, so the re-authored text goes through the P4-4 approval pass before it lands. Sources stay on disk — their cleanup is prompt 12's lane, only after each destination is read back. Non-graph files: `Read`/`Edit`/`Write` (P4-6); respect the 500-line lint on `memory/SKILL.md` (Step 7).

| Memory | Destination | Sole-source content to carry |
|---|---|---|
| `feedback_brain_mcp_for_all_note_ops.md` | brain `memory` skill body + `references/mcp-disconnect-recovery.md` | `:59-96` disconnect-recovery; keep `:55`'s hard lock (*"fall back to Edit — NEVER acceptable"*) as the rule and the recovery as a **named, logged exception**, in the same destination |
| `feedback_memory_updates_via_memory_agent.md` | brain `memory` skill body | `:17` — the QA carve-out the per-TASK cycle depends on |
| `feedback_note_creation_protocol.md` | brain `memory` skill body (dispatch checklist) | `:25-58` — dispatch-prompt construction + counter-availability |
| `feedback_orchestrator_delegation_rules.md` | `orchestrator.md` body (Step 7a) | `:65-75` — the four hard runtime violations |
| `feedback_qa_in_agent_team.md` | brain `qa` agent body | `:8`, `:27-36` — QA is a team member from the start, never post-hoc |
| `feedback_team_single_lead_invariant.md` | agent-teams guidance, `references/team-lead-invariant.md` | `:12`, `:48-57` — the `TeamCreate` placeholder-collision mechanic + config-patch recipe |

---

## Sequencing, evaluation, Git

**Coherence after every step**: sequence so the system is usable after each step, not only at the end — a rule that exists in neither its old home nor its new one is worse than either endpoint. Two behaviour changes must be announced when they land, because gates that always had a way through no longer do: the QA verdict table and PIV block lose their middle option (Step 5), and the sync gate becomes able to actually block (Step 6). Duplication during Step 10 is deliberate and declared.

**Independent evaluation (P4-4)** covers every skill and agent touched — including `orchestrator.md`, the brain `memory` skill, the brain `qa` agent, and whatever surface receives the reconciled specs. Cold read, ranked findings; nothing applied without approval; a short honest list beats padding.

**Git**: verify branch first; one branch; coherent commits — the 26 State-Changes repoints are one logical change, one commit. Unmerged, no push, no `--no-verify`, no AI attribution. No `rm` runs in this prompt; if you reach for one you are doing prompt 12's job.

## DECIDED — do not re-litigate

| Decision | Source |
|---|---|
| Skill template beats brain-agent template, always | D-13 |
| Precedence: skills plugin > brain plugin > home specs > auto-memories; published once, by this prompt | ledger / P4-11 |
| Thin, don't eliminate: `~/CLAUDE.md`/`~/AGENTS.md` → pointers + non-lifecycle content, never deleted; the layer keeps being served | R-1 |
| All six auto-memory settings flags stay ON; the router/loader work is routing, not disabling | R-13 |
| SESSION-PROTOCOL superseded by prompt 10's model; single-active-session dies with it; deletion timing = prompt 12 | R-3 |
| Phase model consumed from prompt 7 | R-8 |
| Plan-spawn flow settled; its routing lands here | R-10 |
| "Milestone" dies as rival vocabulary | R-11 |
| Handoff-file references are inherited ai-agents debris — remove, don't restore | R-20 |
| Pure Bun for anything authored | R-21 |
| Brain edits light and specific, never wholesale (W-6 applies the bar) | R-23 |
| Migrated memory content is destination-first re-authored, never relocated verbatim | R-26 |
| Reflect riders: verify `~/REFLECT-PROTOCOL.md` arrangement; routing note on its persistence hops; drop stale `github-ops` ref | R-27/R-28 |
| Update cost is work, not an argument | D-19 |

## Done means

- [ ] Step 0's four maps delivered and approved **before any edit**; every count re-derived at source, command shown, divergences from this prompt stated.
- [ ] **Every W item was raised at its marked moment, once, in plain language, and its answer is recorded verbatim in the report. No W item was decided silently, and none was asked twice.**
- [ ] The precedence order is published **once**, in a surface that survives prompt 12's thinning, enforced per W-2 — and the enforcement is demonstrated on one real returned note, shown to re-dispatch on a real divergence, capped at 3.
- [ ] All six bare canonicity claims rewritten or deleted; `grep -rni "canonical source of truth\|single source of truth"` over the surviving specs returns only the published order; the three memory-layer ordering rules folded in or explicitly superseded, recorded for prompt 12's KEEP-IN-LAYER review.
- [ ] The two template collisions (effort bands, SPEC birth status) resolved in the W-1 winner's favour, loser's text deleted.
- [ ] The three 1.0 specs no longer contradict each other or themselves per the W-3 selections; the six dead constructs deleted with zero-occurrence evidence against the seven real PLANs; the prose relation allowlist matches the code's 16 verbs.
- [ ] `STRUCTURES.md:245/:250/:256/:261` amended to a parser-accepted form and `qa_ref`; `grep -Fn "Test report ref"` on STRUCTURES → 0; one existing QA note **demonstrated** graph-visible; §4.13 reachable from every index.
- [ ] A loader/routing exists that does not depend on lifecycle-owned `~/CLAUDE.md` content, **demonstrated** by quoting one line from each of the three specs.
- [ ] Unique content extracted from the stale files via HS-DIFF3; SESSION-PROTOCOL's 103 MUSTs triaged, not assumed stale; a keep/thin/delete ruling per file recorded for prompt 12.
- [ ] The brain-agent pass executed in the shape W-6 chose; `adr-generator`'s two identity schemes reconciled to prompt 7's ruling; both corrupted fences repaired; the 21 both-ways blocks gone (all 21 or none); prompt 9's R-22 template blocks untouched.
- [ ] EH-21 and EH-22 gone with before/after recorded: `grep -n "CONDITIONAL" brain/agents/qa.md` → 0; `security.md`'s PIV block offers APPROVED or REJECTED only.
- [ ] FIC-45 confirmed struck, both brain commands untouched, and the report says so explicitly.
- [ ] All 26 State-Changes sites plus the orchestrator's four invocations point at `sync-graph`/`sync-jira` in one commit; `:1135` deleted; the `--dry-run`-then-reconcile discipline stated where repointed.
- [ ] The orchestrator carries the four runtime violations with H-1, H-2, H-6 preserved verbatim in substance; the forbidden-vs-required contradiction resolved per the R-17 lane, in one written sentence; the plan-spawn route (R-10) wired.
- [ ] Catalog lists 27 agents; one dispatch syntax; W-8 answered and applied, citing `context-optimizer/SKILL.md:91-96`.
- [ ] Router rows rewritten per the R-13 split — lifecycle rows name destination skill+section, kept rows verified against the served layer and recorded for prompt 12; the two glob rules kept and verified accurate; the census re-checked post-R-28.
- [ ] `CONVENTIONS.md`'s forbidden-form examples (`:476-482`, `:602`) intact, their **post-edit line numbers recorded in the closing report**; `:6` and `:518` fixed; a sanctioned `docs/**` audit mechanism exists, runs, and is named in the closing report.
- [ ] Prompt 6's Memory-First Gate step 5 verified present; prompt 7's ADR-review ruling written into all four home-spec sites, scoped to a status transition.
- [ ] Reflect riders done: `~/REFLECT-PROTOCOL.md` arrangement verified; its persistence hops carry the lifecycle-ownership routing note; `github-ops` gone from home CLAUDE.md.
- [ ] One canonical phase-and-part model applied from prompt 7 across all three surfaces, backward transitions included; residual disagreements flagged with sites, none silently picked; `workflows.html` matches it and the five preserved claims are intact; the Defer branch tightened.
- [ ] **Exactly two `docs/**` writes happened, both via Brain MCP**: the QA-note edge and ADR-002's dated Clarifications line.
- [ ] Six memories re-authored at their destinations per R-26 and read back; sources still on disk for prompt 12's lane.
- [ ] Every skill touched passed create-skill's own gates against the prompt-1 baseline; every skill and agent touched has a P4-4 evaluation; nothing applied without approval.
- [ ] Branch/commits per P4-7; no file deletions occurred; the report says so.

## Flags for Peter's routing (report-only, not questions)

[FACT] `brain/.mcp.json` hardcodes `"args": ["run", "/Users/peter.kloss/Dev/_brain/apps/mcp/src/index.ts"]` — **303** `mcp__plugin_brain_brain__*` call sites depend on one machine's path, violating the plugin's own Path Normalization Protocol (`explainer.md:153-194`). Out of scope here; flag it in the closing report for Peter to route.
