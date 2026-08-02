# Prompt 5A — finish the PLAN data model: the template redesign and the cold read

_Continuation of prompt 5 (`05-plan-data-model.md`), which ran steps 1-13 and 15-17 across 2026-07-29 to 08-02 and stopped before the two steps that need the owner present. Read `scratch/prompts-v2/RUN-CONTRACT.md` first — it governs this prompt too: granular, guided, opinions labeled, no assumptions, one decision per `AskUserQuestion`._

**Launch line:** _Read `scratch/prompts-v2/RUN-CONTRACT.md` and `scratch/prompts-v2/05A-plan-data-model-handoff.md` in full — paginate, never act on a partial read — then run the prompt under the contract._

---

## Orient before touching anything

```bash
cd ~/Dev/ACMElabs/skills && git branch --show-current   # → feat/plan-data-model
git log --oneline main..HEAD | wc -l                     # → 14
bun test 2>&1 | tail -3                                  # → 1799 pass / 0 fail
```

A different test count means something moved and this document is stale — say so rather than proceeding. Fourteen commits sit on `feat/plan-data-model`, unmerged, nothing pushed. The working tree was clean at handoff.

**Do not re-run steps 1-13 or 15-17.** They are committed. What follows is the state they left.

## What is done, and the two things that are not

| Step | State |
|---|---|
| 1-13, 15-17 | **DONE**, one commit each, all gates green at every commit |
| **14 — template redesign** | **PARTIALLY CLOSED 2026-08-02.** W-1 closed as R-46; the audit was delivered. The **template proposal and re-render are DEFERRED** per R-47 — see the correction below. |
| **18 — cold-read evaluation** | **NOT STARTED**. Needs the owner's approval on findings. |

Everything autonomous is finished. Both remaining steps are conversations, not code.

> **CORRECTION 2026-08-02 — this document's premise was wrong about the programme state.** It reads as though prompts 6-12 had run. They have not. Measured: `AdrNoteStatusEnum` has no DRAFT (prompt 7 owed it); `SessionNoteSchema` still carries `scope` + `bound_plans` as body sections against R-5; `main`'s newest commit is prompt 4A's record. Consequence, ruled by the owner as **R-47**: step 14 stops at the audit. A PLAN template cannot be designed while the SESSION model is unbuilt — the owner's documentation defines the two as a pair, and ADR-003 D-10 routes plan sections *into* SESSION events, whose shape prompt 10 authors. Prompt 7's possible `scope` phase and prompt 9's wave-derivation ruling are two further unbuilt inputs. **The template proposal and the real-PLAN re-render carry forward unticked** to a successor that runs after prompt 10, with stateless resume as the stated acceptance test.

## Rulings made during the run — do not re-ask any of these

Recorded in `RULINGS-LOG.md` as R-41 through R-45a. The ones that bind what is left:

- **R-41** — `/plan` takes a POSITION, never a verb. `create`, `split`, `scope`, `migrate` and the `--part` flag are gone; depth is how much of `PLAN-NNN <phase> <part>` you supply.
- **R-42** — nothing halts a session at the plan skill to do note surgery. Closes prompt 5's W-3 and W-4; **none of that prompt's authored options match, so they must not be re-asked**.
- **R-43** — `defrag` ships as-is. Its audit is real; only the final hand-off prints.
- **R-44** — `curate` is dropped: not built, not renamed to, not deferred. **Supersedes R-40** on both the name and the build. R-40 is marked accordingly.
- **R-45 / R-45a** — two files under `docs/planning/` were never plans (`PLAN-002-task-breakdown.md`, `PLAN-002-composition-tooling-follow-up-register.md`). Left alone. They are counted as non-plans, not failures.

Owner's framing behind R-45, worth carrying forward because it recurs: a target that says "all of them parse" is scorekeeping, and a file that was never a plan is not a defect.

## W-1 is still open, and step 14 forces it

The plan-shape question — whose shape wins, the owner's seven notes or the library's — was never locked. Three things changed around it during the run:

1. **It is no longer urgent.** Nothing can lose content: unmodelled sections are preserved verbatim through a parse-render round trip. The danger W-1 was gating is gone.
2. **The rulings already decided pieces of it.** R-9 keeps execution risks on the plan; R-11 removes the SPEC-task tier. So neither existing shape survives intact, which means the question is not "pick one" — both are wrong in recorded ways.
3. **The owner's own brief points past both.** Verbatim: _the current plan template is not good at communicating status and sequence._ Both shapes are current.

A search of all twelve prompts, the rulings log and the conversation ledger found no ruling that settles it. What it found instead: every time the owner's real notes disagreed with a spec, the spec lost — six template constructs deleted on "zero occurrences in seven real PLANs" evidence. And the owner's own first-person note in prompt 2 calls the renderer destroying his sections a **defect**, not a migration opportunity.

**Do not present W-1 as "your shape or the library's."** That framing was tried three times and is wrong, because the rulings have already broken both. Present it as: here is what the sections should be, given what is already decided.

## Step 14 — the template redesign

The prompt's own requirements, unchanged:

1. **The STAYS / MOVES / GOES audit first.** Every section across the union of definitions — fullest specimen is `PLAN-001-fond` at 20 H2s — one bucket each, ranked within bucket, one-line recommendation and rationale per row. **Approved before any section is removed.**
2. Then a proposed template.
3. Then one of the owner's real PLANs re-rendered against it, so he sees output rather than description.
4. Delete nothing from his notes without approval.

Decided constraints that are NOT part of the question:

- **R-9** — the PLAN references the PRD and never composes it. PRD-ish sections (overview beyond one line, product scope, product risks, success criteria) live in the PRD. Risks split by kind: product risks → PRD, execution and sequencing risks stay on the plan. Per-part exit criteria stay in parts.
- **R-11** — parts stay, phases stay, "milestone" dies as rival vocabulary rather than as a rename, and there is no plan-level SPEC-task tier.
- **D-16** — the PLAN's job is the status, the sequence, and the state of phases and their parts, authored progressively one phase at a time.

### What the current shape already is, measured

Do not re-derive this; confirm it if you need to.

Sections the renderer emits, in order: Scope, Objectives, Phase Progression, Tasks, Pending User Decisions, Blockers, Observations, Relations.

Two headings are **dropped** on render by owner decision — `## Progress Dashboard` and `## Cross-Part Dependency Graph`. Both were derived rollups; a file still carrying one parses cleanly and loses it on output.

Everything else is **preserved verbatim** as an unmodelled section. So `## Workflow Plan`, `## Decision Log`, `## Progress Log`, `## Risks`, `## First-Principles`, `## Open Parallel Threads` and every phase H2 survive a round trip untouched.

Which means step 14 is not "stop the renderer destroying things" — that is done. It is "decide what a plan should hold."

### The one measurement that shapes the answer

The owner's `PLAN-004` opens with a four-row dashboard: one line per phase, status and output. Readable at a glance.

The repo's own `PLAN-001` has no such summary — `## Phase Progression` holds all 25 parts in full, so answering "where is this" means reading 3,200 lines.

The owner's stated criterion is status and sequence. On that criterion his shape is closer, and the converted one is further away. That is an assistant observation, not a ruling — but it is measured, and it is the most useful thing found during the whole shape hunt.

## Step 18 — the cold read

Independent evaluation of `plan`, `research`, `decisions` and the `build` reference surfaces touched. Read them as if handed them cold, beyond this brief. Ranked findings, each with a recommended action and a one-line rationale. **Nothing applied without approval.** An honest short list beats padding.

Seeds available but not binding — fold in or reject:

- The `/plan create` step list has no Step 2 (`plan/SKILL.md`, in the creating-a-plan pipeline).
- `orchestrator-routing-protocol.md` cites Step 4 for authoring that is Step 6.
- `skills/plan/.DS_Store` is committed.
- `PhaseEnum` in `packages/models/src/schemas/common.ts` carries seven phases against five in `documentation/workflows.html`. **Record the mismatch, change nothing — prompt 11 owns that surface.**

Also outstanding, deliberately not touched: `packages/models/src/mutations/plan-mutations.ts`'s `lock-decision` flips the decisions part to DONE — six gates and the whole ADR early. **Prompt 7 owns that fix.** Recorded, untouched.

## Patterns from the run worth carrying, because they recurred

**Enforce on write, not on read.** Three read-time requirements were implemented and reverted: a verbatim decision text on every locked decision (failed 45 tests and every real plan note), canonical part ids (rejected 17 of 52 real parts, killing five of seven documents), and required session frontmatter keys (would have failed ten real notes). Each rule was right and each placement was wrong. The exception is a state something transitions INTO — a blocked part naming what blocks it is safe at read time, since no corpus of already-blocked parts exists to fail.

**Report rather than reject when history is at stake.** A rejected document is opaque — nothing inside it validates, including the parts that were fine.

**Passing tests kept two fictions alive.** One proved a code path worked; reachability was the question, and it turned out to be unreachable by type. Another reached through a cast to read a protected field, which is itself the signal nothing legitimate consumed it. A test can prove code works while saying nothing about whether anything reaches it.

**Verify a claim before building on it.** Several of prompt 5's own facts were stale: its completion gate for the removed modes greps `skills/`, a path that stopped existing when prompt 4 restructured the repo, so it returned 0 while 22 live sites remained. The corrected gate is `plugin/skills/`. Line numbers survived the restructure; directories did not.

**`/tmp/corpus/` gets swept.** The seven real PLANs live at their project paths — six under `polar-ui/src/DataTableV2/docs/planning/`, one under `ACMElabs/fond/docs/planning/`. Re-stage a read-only copy rather than working against the originals.

## Git

One branch for both steps, continuing on `feat/plan-data-model` — the work is the same prompt. Coherent commits. Leave unmerged, do not push, no `--no-verify`, no AI attribution. Every deletion through the `Bash(rm:*)` gate; a blocked deletion is recorded as deferred, never worked around.

## Done means

- [x] The ranked STAYS / MOVES / GOES audit was delivered and **approved before any section was removed**; every section across the union of definitions appears in exactly one bucket with a rationale. — delivered 2026-08-02 against a corrected corpus of **eleven** specimens (the handoff's path was stale and its six were four months old; four newer PLANs existed). Buckets are transcriptions of ADR-003's own Responsibility Audit, not assistant judgement.
- [x] W-1 is closed by an explicit owner ruling, recorded in `RULINGS-LOG.md` and in the surviving definition file — a ruling that lives only in a conversation does not exist. — **R-46**, recorded in both homes, commit `a04d387`.
- [x] R-9's routings are honored: PRD-ish content referenced not composed, risks split by kind, per-part exit criteria in parts. — honored in the audit's buckets.
- [ ] **DEFERRED per R-47** — A proposed template exists AND one of the owner's real PLANs is re-rendered against it and shown as output. Blocked on prompt 10 (SESSION model), prompt 7 (possible `scope` phase), prompt 9 (wave derivation). Carried forward, not dropped.
- [x] Nothing was deleted from the owner's notes without approval. — no plan file was touched in this run.
- [ ] Ranked cold-read findings delivered for every skill touched; nothing applied without approval; any skipped stage named with its reason.
- [ ] The `PhaseEnum` mismatch is recorded and `documentation/workflows.html` is untouched.
- [ ] Gates green: `bun test`, `bun run typecheck`, `bun run check`, `claude plugin validate plugin --strict`.
- [ ] Branch verified, commits coherent, nothing pushed, no AI attribution.
