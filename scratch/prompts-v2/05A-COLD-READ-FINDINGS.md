# Cold-read findings — prompt 5A step 18, 2026-08-02

Independent evaluation of `plan`, `research`, `decisions` and `build`, read as if handed cold. **Nothing here was applied.** Each row carries evidence, a recommended action, and its owning prompt where another prompt owns the surface.

Method: four subagent readers plus a static reviewer. Two readers (`decisions`, `build`) failed to return; their scope was covered directly by the orchestrator instead, so all four skills are covered — but the two agent-covered skills got a deeper pass than the two hand-covered ones. Weight the `decisions` and `build` sections as thinner, not cleaner.

Every file:line was verified at source. Where a claim is reproduced by running something, the probe is described so it can be re-run.

## How to read the severity column

- **CRITICAL** — following the documentation as written produces a broken or unacceptable artifact, or destroys content
- **HIGH** — a documented mechanism does not work, or two definitions of one thing have already drifted
- **MEDIUM** — a reader is misled but recovers; or a stated fact is wrong without immediate consequence
- **LOW** — cosmetic, or correct-but-confusing

---

## Independent of all deferred work — actionable now, owned elsewhere

These three do not touch the PLAN template, the session model, or wave derivation. They are recorded here and **owned by prompt 7**, which interviews on these exact files.

| # | Sev | Finding | Evidence | Action | Owner |
|---|---|---|---|---|---|
| I-1 | CRITICAL | `research` Step 1 dispatches a skill that does not exist, and the skill's own degradation rule then says to continue without it. The PRD that Stage 1 produces is never written, and Step 5 iterates "each requirement in the PRD" regardless. | `research/SKILL.md:91` dispatches `Skill(skill="requirements-interview")`; `:177` asserts it resolves. `ls ~/.claude/skills/requirements-interview` → no such directory. The installed skill is `grill-me` (`ls ~/.claude/skills/grill-me` → present), which the same file names in prose at `:172` ("the grill-me pattern"). Only Step 3 is marked BLOCKING (`:111`), so Contract 9 emits an INFO note and continues. Six sites total: `:3`, `:16`, `:77`, `:91`, `:172`, `:177`. | Rename all six sites to `grill-me`; mark Step 1 BLOCKING so a missing interviewer halts instead of silently skipping. | 7 |
| I-2 | CRITICAL | Following the documented ADR template produces an ADR that can never reach ACCEPTED. Two 11-section templates exist for one artifact and share exactly **3** section names. | Prose template `decisions/references/adr-authoring.md:67-150` — its options section is `### Alternatives Considered`. Shipped script `decisions/scripts/dispatch-architect.ts:69`, `:115` requires `Considered Options`, labelled *"required; ACCEPTED gate"*. Schema field is `considered_options`, non-optional (`packages/models/src/schemas/adr-note.ts:94`). `decisions/SKILL.md:149`, `:154`, `:256` all point the author at the prose one. Overlap computed by `comm`: Context, Decision Statement, Failure Modes. | Generate the prose template from the schema, or rename its section to match. One definition, script-rendered. | 7 |
| I-3 | CRITICAL | The composite gate's arithmetic disagrees with itself by ~8.6×, so the gate blocks at 2 decisions or at 25 depending on which line the reader believes. | `decisions/references/pre-author-composite-gate.md:40` — 70 lines × 11 sub-sections = **770 per D-N**, so 10 D-Ns ⇒ 7,700 lines. `:51` — *"for 10 D-Ns at Tier 3, expect ~800-1000 lines"* ⇒ ~900. `:114` asserts a third figure (25 D-Ns ⇒ >1200). Tier 3 hard threshold is >1200 (`:26`), breached at 2 D-Ns under the formula. 7700 ÷ 900 = 8.6. | Pick one basis; delete the other two. | 7 |

---

## `plan` — 15 findings

Two CRITICALs here are the reason the PLAN template work stopped (see R-47). Both are recorded rather than fixed.

| # | Sev | Finding | Evidence | Action |
|---|---|---|---|---|
| P-1 | CRITICAL | Real PLAN notes lose **every** acceptance criterion on parse, silently. The parser locates DoD as "the second list in the part body", which assumes the first list is the bullet field block the renderer emits. Real plans author fields as bold paragraphs, so there is one list, not two. | `packages/models/src/parsers/plan-note.ts:256-261`. Measured on the real corpus: `PLAN-010` parses OK, 5 parts, **DoD items = 0 for all five**, while the file contains 48 checkbox lines including ticked evidence at `:143-145`. Field-form census: `PLAN-010` 5 bold-paragraph / 0 bullet; `PLAN-009` 23 / 0. Renderer emits `- **Substatus**:` (`renderers/plan-note.ts:88`). Probe: parse a corpus PLAN and print `parts[].dod.length`. | Locate DoD by its `**DoD**:` label rather than list ordinal, and add a test asserting a bold-paragraph part keeps its DoD. **The parser fix is independent of the template decision** — label-based lookup works under either field form. The scaffold-form question is not. |
| P-2 | CRITICAL | `references/plan-note-schema.md` declared two sections generated on every render when nothing generates them; a hand-authored copy is therefore *preserved* rather than replaced, producing the exact drift the rule forbids. | `renderPlanNote`'s modelled list (`renderers/plan-note.ts:296-331`) omits both; `MODELLED_H2_HEADINGS` (`parsers/plan-note.ts:577-586`) omits both; `renderMermaid` (`renderers/mermaid.ts:62`) has zero production callers. Reproduced against `docs/planning/PLAN-001-skills-ecosystem.md`: `has Phase Status: false`, `has Sequence: false`. | **PARTIALLY CLOSED** — commit `70a4442` marks the section not-yet-implemented and forbids hand-authoring. Building the generators is deferred with the template work per R-47. |
| P-3 | HIGH | A round trip can place a section **after** `## Relations`, producing the violation the same file forbids. Preserved sections splice at their recorded source index with no clamp against the trailing pair. | `renderers/plan-note.ts:310-318`. Reproduced on real `PLAN-001`: last two rendered H2s are `Editor Mirror IDs , Relations` — Observations is not penultimate. Invariant asserted at `plan-note-schema.md:154-156` and in CONVENTIONS §4.0. | Clamp preserved insertion to before the Observations/Relations pair; assert the tail pair in a round-trip test. |
| P-4 | HIGH | The documented `set-part-done` invocation exits 2. All four doc sites include a leading literal verb the arg parser never strips. | Doc sites: `plan/SKILL.md:172`, `references/auto-routing.md:54`, plus two restatements. `scripts/set-part-done.ts:74-82` handles the `key=value` half via `KEY_VALUE_ALIASES` but not the bare leading token. Verified: with verb → `Usage error: unknown flag: set-part-done`, exit 2; without → exit 0. | Skip a leading bare `set-part-done` in `normalizeArgv`, or drop the verb from all four doc sites. |
| P-5 | HIGH | `PENDING → READY` has no actor, and `READY` gates every routing path — so a plan authored all-PENDING deadlocks with no documented exit. | `SKILL.md:129`, `:209` and `auto-routing.md:11`, `:78` require READY or halt; `plan-note-schema.md:65` writes the transition passively. `grep READY` over `mutations/*.ts` and `plan/scripts/*.ts` → nothing. The 11 mutation types include no dependency cascade. | State that the operator flips it via `set-part-substatus`, or add the cascade. |
| P-6 | HIGH | Authoring a part under a phase H2 — which the required-order list mandates — renders that part **twice**. | `plan-note-schema.md:102` requires phase H2s containing per-part H3s. `collectParts` reads parts from every H2 (`parsers/plan-note.ts:442-457`); the renderer emits them all under `## Phase Progression` *and* preserves the phase H2 verbatim. Verified: a part under `## Research` renders `### research` twice. | State that parts live under `## Phase Progression` only, and that phase H2s are a legacy read-shape, not an authoring shape. |
| P-7 | HIGH | An em-dash placeholder satisfies the DONE-must-have-outcome guard. | Scaffold offers `**Outcome**: [[…]] OR —` (`plan-note-schema.md:135`); `parsers/plan-note.ts:232-233` treats any truthy string as an outcome, satisfying `schemas/plan-note.ts:309-311`. Verified: a DONE part with `**Outcome**: —` validates with `outcome: "—"`. The parser *does* normalize `—` for `blocked_by` (`:242`), so the omission is inconsistent rather than deliberate. | Treat `—` / `(none)` as absent for `outcome`; drop the `OR —` affordance for DONE parts. |
| P-8 | HIGH | Neither of the skill's own two scripts is mentioned anywhere in its SKILL.md or references, while a documented rule depends on one of them running. | `plan/scripts/` holds `render-plan-note.ts` and `set-part-done.ts`; the only script mentions in the skill point at *build's* dispatch scripts (`SKILL.md:32`, `:38`). `plan-note-schema.md:191` ("Never edited — generated on every render") depends on someone running `render-plan-note.ts`. | Add a Scripts section naming each, its flags, and when it runs. |
| P-9 | MEDIUM | Removed modes survive as live instruction in ~9 places, including a named halt for a mode that no longer exists. | `SKILL.md:239` `plan-migrate-no-refs-halt`; `:99` "all modes (create / migrate / continue / split / scope)"; `:61`; `:46`, `:60`; `two-step-edit-pattern.md:64-65` commit formats for `plan: scope eval` and `plan: migration complete`; `:75`, `:146`, `:161`. Keep `two-step-edit-pattern.md:142` (correctly historical). R-41 removed every verb. | Scrub all live sites; keep the historical one. |
| P-10 | MEDIUM | `/plan create` survives R-41 in three sites, and the one reference explaining plan authoring cites the wrong step. | `references/orchestrator-routing-protocol.md:3`, `:102`, `:106`. `:106` cites *"Step 4 (Author PLAN…)"*; authoring is **Step 6** (`SKILL.md:120`), Step 4 is "Map to existing code". A fourth site at `end/references/pr-creation.md:53` is a commit-message example — harmless. | Drop the mode language; correct the citation to Step 6. |
| P-11 | MEDIUM | Two files disagree about a field name, and the doc form fails the parser. | `plan-note-schema.md:56` documents `d_n_substatus` (echoed `two-step-edit-pattern.md:19`, `per-decision-micro-cycle.md:59`, `:85`); the actual field is `decisions` (`schemas/plan-note.ts:194-203`), rendered as a markdown table (`renderers/plan-note.ts:123-133`), not nested YAML. `two-step-edit-pattern.md:19` instructs a `find_replace` on a row that exists in no rendered plan. | Correct to `decisions` and to the rendered table shape. |
| P-12 | MEDIUM | Same class: `dependencies` vs `depends_on`. | `plan-note-schema.md:51` and `auto-routing.md:11` say `dependencies`; the field is `depends_on` (`schemas/plan-note.ts:277`), rendered `- **Depends On**:`. The same file uses the correct name at `:104` and `:150`. The per-part block is what a reader copies. | Correct the two wrong sites. |
| P-13 | MEDIUM | A documented hard-fail does not occur; real behaviour is quiet data loss. | `plan-note-schema.md:148` claims the parser "fails loudly" on an unreadable H4. `parsers/plan-note.ts:336-341` says the opposite in its own comment and `continue`s on any non-matching id. Verified: `#### D-N substatus list (for research)` parses clean and is dropped on render. | Either implement the hard fail or rewrite the paragraph, whose argument rests on it. |
| P-14 | MEDIUM | The step list has no Step 2 — ten items numbered to eleven, so every citation past the gap is off by one. | `plan/SKILL.md:111-125` runs 1, 3, 4 … 11. | Renumber 1-10. |
| P-15 | MEDIUM | "Milestone" survives as plan vocabulary against R-11, in the same file that warns against it. | `SKILL.md:120` instructs "milestone-level parts"; `:203` records that authoring from a milestone shape is a rival definition and that *"A PLAN authored the other way had to be deleted and re-authored."* 83 lines apart. | Remove the vocabulary at `:120`. |
| P-16 | LOW | `completion-gating.md` runs entirely on vocabulary this skill does not use — "wave", "session row", "session task", "exit criteria" (`:3`, `:9-13`, `:20`, `:22`, `:26`, `:30`, `:50`). Parts, phases and DoD are the vocabulary here. Introduces from inside the skill the rival-vocabulary trap `SKILL.md:203` treats as live. | as cited | Re-express in parts/phases/DoD terms. |
| P-17 | LOW | The required-order list presents 11 ordered sections; only 8 are modelled, and `## Risks` (`:106`) is unmodelled — load-bearing for P-3. Also `SKILL.md:209` lists 7 substatuses, omitting `FAILED`, against 8 in `PartSubstatusEnum`. `SKILL.md:124`, `:238` gate on ">10% estimate divergence" against estimates the model cannot hold (nearest is a per-task `effort` XS-XL enum, `common.ts:210` — ordinal buckets, so a percentage is undefined). | as cited | Mark each row modelled vs preserved; add `FAILED`; drop or redefine the percentage gate. |

**Verified sound**: `enforcement-layers.md` — every checkable claim held (`DROPPED_H2_HEADINGS` real and closed at `schemas/plan-note.ts:33`; `blocked_by` required on BLOCKED at read time per its own transition-into exception; non-canonical part ids report rather than reject; `transitioned_at_event` documents the required-arg-with-no-effect bug it fixed). Its own thesis — *prose does not enforce anything; what enforces is a layer that can refuse* — is precisely what P-1 and P-2 violate.

---

## `research` — 15 findings

| # | Sev | Finding | Evidence | Action |
|---|---|---|---|---|
| R-1 | CRITICAL | See **I-1** above. | | | 
| R-2 | HIGH | `resource-bounds.md` renders **inverted from line 78 to EOF** — the verified-skills table and the whole search-failure section display as literal code inside an unterminated block. This is the file defining the degradation protocol the reader is told to follow. | Same-length nested fences: 3-backtick halt examples inside 3-backtick blocks at `:70`/`:71`, `:82`/`:83`, `:94`/`:95`, `:131`/`:132`, `:142`/`:143`. Lines `:104-130` are swallowed. `SKILL.md:131-139`, `:152-160` and `analysis-phase-workflow.md:33-41` do the identical construct correctly with a 4-backtick outer fence. | Outer fence → 4 backticks at all five sites. |
| R-3 | HIGH | `secondary_outcomes` is a parameter `/plan` neither accepts nor stores, so the ANALYSIS set never reaches `/decisions`. | Passed at `SKILL.md:39` and `analysis-phase-workflow.md:210`; `:213` claims `/decisions` consumes it as `source_analyses`. `plan/SKILL.md:171` Contract 1 has only `outcome=`; receipt steps `:175-179` apply only `part.outcome`. `plan/references/auto-routing.md:43` says `source_analyses` is "sourced from the part's `source_artifacts`" — a field nothing populates from research output. | Add it to Contract 1 with a receipt step writing into the next decisions part's `source_artifacts`, or have research write it directly. |
| R-4 | HIGH | `scripts/dispatch-analyst.ts` is invoked by nothing while the prose spells out the same brief — two definitions, already drifted in both directions. | `grep` hits only the script, its test, and `docs/**`. `research/SKILL.md` has zero occurrences of `scripts/` or `.ts`. Prose brief at `analysis-phase-workflow.md:137-145`. Script-only: EARS/checkbox translation (`:67-68`), observation/relation minimums (`:83-84`). Prose-only: PRD, CVA, buy-vs-build as brief inputs (`:140-142`). The script imports `ObservationCategoryEnum` so the allowlist "auto-propagates… no manual prose sync" (`:11-13`) — a guarantee an un-invoked script cannot deliver. Contrast `build/SKILL.md:69`, `:168`, which name their scripts as "the only definition of brief content". | Wire the script and name it at the dispatch site, or delete it and keep the prose as sole definition. |
| R-5 | MEDIUM | Step 8.5 Operation 3 offers three options, two of which name mechanisms that do not exist. | `retrieval-density-pass.md:79` → `mcp__plugin_brain_brain__manage_backlog`, not a Brain MCP tool. `:81` → "/plan via a follow-up part-add operation"; `grep part-add\|part_add` across `plugin/skills/` returns that line only. `:84` then asserts "All three options are Brain MCP operations", untrue of option 1 too. | Replace with mechanisms that exist. |
| R-6 | MEDIUM | Step 6's parallel dispatch is unexecutable as written. | `convergence-protocol.md:16-18` pairs `Task(brain:🧠-critic)` with `Skill(brain:---decision-critic)`; `:75` says "one Bash batch of two Task tool calls" — Bash batches no tool calls, and only one is a Task. The 21-line adversarial brief at `:51-71` has no delivery vehicle. `SKILL.md:96` repeats it. Step 6 is mandatory before `set-part-done` (`SKILL.md:167`). | Re-express as two dispatches, or one dispatch plus an in-context skill load. |
| R-7 | MEDIUM | Step 0's resume marker is written to a note that does not exist until Step 1, so the G2 skip can never fire. | `analysis-phase-workflow.md:43` puts `first_principles_pass: PASSED` on PRD frontmatter; Step 1 (`:69`) creates the PRD. Same for `convergence_iteration` (`convergence-protocol.md:98`, `resource-bounds.md:34`) against `SKILL.md:45`'s single-`write_note` rule. | Move the marker to the PLAN part, or create the PRD before Step 0 writes to it. |
| R-8 | MEDIUM | Step 8 "Pause" has no mechanism in research's own contract. | `convergence-protocol.md:118-119` wants status DEFERRED + rationale; research's Contract 1 shape (`SKILL.md:39`, `analysis-phase-workflow.md:210`) carries neither, though `plan/SKILL.md:171` supports both and `plan-note-schema.md:73` requires the rationale. | Add both to research's Contract 1 call. |
| R-9 | MEDIUM | Step 8's option count disagrees across three sites: `analysis-phase-workflow.md:194-197` lists 3; `SKILL.md:123` says 4; `convergence-protocol.md:110-119` enumerates 4. The 3-list is the one `SKILL.md:85` sends readers to as authority. | as cited | Reconcile to one count. |
| R-10 | MEDIUM | A halt info-string is contradicted by its own worked example. `SKILL.md:148` and `analysis-phase-workflow.md:229` register `research-step8.6-tool-unavailable-halt`; the worked example of exactly that case emits `research-step3-halt` (`resource-bounds.md:95`). A BLOCKING skill goes missing at step 3 or 4, never at 8.6. | as cited | Align the id to where the halt actually fires. |
| R-11 | MEDIUM | The 3-iteration cap is attributed to a step that runs only after convergence terminated. `SKILL.md:125` says "per Step 8.6"; `SKILL.md:100`, `analysis-phase-workflow.md:203`, `retrieval-density-pass.md:102-110` all place 8.6 after Step 8. Actual enforcement is inside the loop at `convergence-protocol.md:133`. | as cited | Attribute the cap to the loop. |
| R-12 | LOW | `trigger: H3` (`analysis-phase-workflow.md:35`) — an identifier appearing nowhere else in the system, copied verbatim into emitted halts. `SKILL.md:132` defines the field as `<step identifier>`. | as cited | Replace with a real step identifier. |
| R-13 | LOW | `resource-bounds.md:26` says "STOP" while option 2 (`:46-47`) offers more iterations and `:177` permits it once surfaced — reconcilable only after reading four sites. | as cited | State the precedence once. |
| R-14 | LOW | "two-step edit pattern" names three steps at every occurrence (`SKILL.md:61-68`, `retrieval-density-pass.md:114-121`) — system-wide via `plan/references/two-step-edit-pattern.md:8-10`. Not a research defect; recorded for whoever owns the name. | as cited | Rename or renumber, system-wide. |
| R-15 | LOW | `SKILL.md:45`'s "No `edit_note` or `move_note` follow-up" reads absolute but is PRD-creation-scoped; Step 2 (`:105`), the iteration counter, and the Convergence Findings append (`convergence-protocol.md:181`) all require `edit_note`. | as cited | Scope the sentence. |

**Verified clean**: `--split` / `/plan split` / `args="split"` → **zero** occurrences under `research/`; the stuck-reader sites offer narrow/extend/defer/abandon instead (`resource-bounds.md:38-52`) and `:26` explicitly says *"nothing is split automatically"*. `curate` → zero occurrences. `brain:---buy-vs-build-framework`, `brain:---cva-analysis`, `brain:---decision-critic`, `brain:---chestertons-fence` all resolve; `brain:🧠-analyst` and `brain:🧠-critic` exist; the cross-skill path at `SKILL.md:201` resolves; `retrieval-density-pass.md` fences are correctly paired — the fence defect is confined to `resource-bounds.md`.

---

## `decisions` — 3 findings (hand-covered; thinner pass)

The dispatched reader failed. Covered directly by the orchestrator, so this section is not a full cold read.

| # | Sev | Finding | Evidence | Action |
|---|---|---|---|---|
| D-1 | CRITICAL | See **I-2** — the two ADR templates. | | |
| D-2 | CRITICAL | See **I-3** — the composite gate arithmetic. | | |
| D-3 | HIGH | Two files with the same basename both declare themselves canonical, each deferring to the other. | `plan/references/per-decision-micro-cycle.md` (103 lines) header: *"Cross-linked with /decisions/references/… (canonical source when /decisions is authored)"*. `decisions/references/per-decision-micro-cycle.md` (184 lines) header: *"This is the canonical reference"*. Prompt 2 named this exact pattern as the precedent that let one protocol reach eight copies. | One file, pointed at. Two canonicals is zero canonicals. |

**Verified clean / already repaired**: the composite gate's dead exit is fixed — it now HALTs for a scope decision and explains why the old split-mode exit was removed (`pre-author-composite-gate.md:5`). The handoff's concern about it is stale.

---

## `build` — 2 findings (hand-covered; thinner pass)

The dispatched reader failed twice. Covered directly. **`build` is the healthiest of the four surfaces.**

| # | Sev | Finding | Evidence | Action |
|---|---|---|---|---|
| B-1 | HIGH | Gate 3 is an open escape hatch by construction, in a skill whose own `exit-gates.md:3` says *"'I'll fix in review' is NOT acceptable rationale"*. | `exit-gates.md:37-50`: `orphan-ref-validator` is absent from both Brain locations, so the gate emits an INFO coverage-note and **CONTINUEs**. Prompt 9 flagged it; unresolved. | Either the validator exists after prompt 9, or the branch is explicitly accepted in writing next to `:39`. |
| B-2 | LOW | Two stale `Progress Dashboard` mentions contradict line 55 of the same file, which explains the section no longer exists. | `state-propagation.md:68` (git-add comment) and `:85` (routing table) vs `:55`. A half-swept edit from prompt 5. | Remove both mentions. |

**Verified clean**: zero escape hatches beyond B-1 (`grep` for rationale-and-proceed → nothing). The iteration cap is consistent across five prose sites and the schema `max(3)` (`SKILL.md:26`, `:173`, `:235`, `:261`; `implementation-phase-workflow.md:216`, `:300`; `schemas/plan-note.ts:49`) — prompt 9's suspected drift does not exist. The implementer/QA dispatch asymmetry is **documented as fact** with its rationale at `per-task-build-qa-cycle.md:62-63` (push vs pull) — prompt 2's work held.

---

## Deferred by owner ruling, recorded so nothing is silently dropped

Per R-47, the PLAN template redesign stops until the SESSION model exists. These items defer with it:

| Item | Why it waits |
|---|---|
| Build the `## Phase Status` and `## Sequence` generators | R-46 ruled them; the sequence view depends on whether waves become a modelled concept (prompt 9) |
| The part-field scaffold form — bold-paragraph vs bullet | A template-shape decision |
| P-1's parser fix | **Recorded as separable.** Label-based DoD lookup works under either field form, so it does not depend on the template. Deferred only because it surfaced alongside the scaffold question. |

Note on urgency for P-1: the corpus is **not** losing data at rest. The loss materialises only when something runs the renderer against a real PLAN, and prompt 5's standing rule forbids that until the section model is settled. It is a landmine, not a fire.

## Observations

- [fact] Four skills cold-read; two dispatched readers failed and their scope was covered directly, so `decisions` and `build` got a thinner pass than `plan` and `research` #coverage #cold-read
- [problem] Three CRITICAL findings are cases where following the documentation produces a broken artifact: a dispatch to a nonexistent skill, an ADR that cannot reach ACCEPTED, and a gate whose arithmetic disagrees with itself 8.6x #critical #documentation
- [problem] Real PLAN notes lose every acceptance criterion on parse because the parser finds DoD by list position while real notes use a different field form — 48 checkbox lines invisible in one file #parser #data-loss
- [insight] The strongest file in the set states the lesson the two worst findings violate: prose does not enforce anything, only a layer that can refuse does #enforcement #placement
- [insight] Enforce on write, not on read, recurred a fourth time this session — a rule was recorded at read time that nothing enforces at write time, and the preservation path then produced the exact drift the rule forbade #pattern #placement
- [outcome] `build` is the healthiest surface: zero escape hatches beyond one absent validator, a consistent iteration cap, and a documented dispatch asymmetry #build #sound
- [decision] Nothing in this report was applied; the three prompt-7-owned findings are recorded rather than fixed so that prompt's interview arrives at unchanged ground #scope #handoff
