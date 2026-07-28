# The twelve prompts — what they are and how to run them

Replaces the earlier four-prompt set (A/B/C/D), which is superseded. Those four asserted things that turned out to be false; several instructed Claude Code to build capabilities that already ship.

## How to run one

You provide nothing — every file the prompts reference already lives on this machine, and the agent reads it from disk. Open a fresh Claude Code conversation **in the repo root** (`/Users/peter.kloss/Dev/ACMElabs/skills`) and type one line:

> Read `scratch/prompts-v2/RUN-CONTRACT.md` and `scratch/prompts-v2/NN-<name>.md` in full — paginate, never act on a partial read — then run the prompt under the contract.

`RUN-CONTRACT.md` (R-31) is the collaborative execution mode: the agent orients you with the prompt's structure first, previews every step with its concerns/options/opinions before acting, asks your W-items via AskUserQuestion with labeled recommendations, assumes nothing on your behalf, and checkpoints at every section boundary. It overrides any "autonomous" framing inside a prompt. Out-of-repo targets (user-level skills, home specs, the brain plugin/repo, `~/.claude/memory/`) are cited by absolute path — the agent opens them itself; permission prompts along the way are expected.

Run the prompts in order, with the exceptions noted below.

## The set

| # | Prompt | Attention | Rounds | Depends on |
|---|---|---|---|---|
| 1 | `freeze-and-baseline` — freeze the window, take the baseline, route the regrowth | autonomous | 0 | — |
| 2 | `cycle-collapse-and-brief-contract` — eight copies of one cycle | autonomous | 0 | 1 |
| 3 | **DISSOLVED 2026-07-27** — the owner's content review ruled 21 of its 22 memories DELETE and the deletions were executed during the walkthrough (see `OWNER-RULED-DELETE.md` and the tombstone in `03-*.md`); the one survivor rides in prompt 4 | — | — | — |
| 4 | `pd-refactor-and-classifier-seam` — create-skill drives; three spines, one defrag, the classifier seam (+ the markdown-first append) — **rewritten 2026-07-27 under the R-30 provenance register** | create-skill-driven | map gate + W-1…W-6 + findings | 1 |
| 5 | `plan-data-model` — one PLAN definition, a parser that reads real PLANs — **rewritten (R-30)** | register | map + 5 W | 1, 2 |
| 6 | `curate-and-tier-chain` — curate before you write — **rewritten (R-30)** | register | map + 8 W | 4 |
| 7 | `never-defer-research-and-decisions` — author the moment it locks; + the ASK-STANDARD grilling — **rewritten (R-30)** | register | map + 13 W | 5, 6 |
| 8 | `no-assumptions-spec-and-change-requests` — nothing left to assume — **rewritten (R-30)** | register | map + 9 W | 7 |
| 9 | `build-autonomy-and-derived-waves` — derived waves, one cap, visual QA, the agent message standard — **rewritten (R-30)** | register | map + 10 W | 2, 5, 8 |
| 10 | `session-and-rehydration` — one session note, one rehydration — **rewritten (R-30)** | register | map + 7 W | 2, 6, 9 |
| 11 | `home-specs-precedence-and-orchestration` — one authority, one loader, one orchestrator — **rewritten (R-30)** | register | map + 8 W | 7, 10 |
| 12 | `terminal-retirement` — rule the survivors, verify, then delete — **rewritten (R-30)** | register | 4 W | all |

**Concurrency.** With prompt 3 dissolved (it was the only concurrent lane), all 11 active prompts are strictly sequential.

**Prompt 1 is not optional.** It takes the snapshot every later prompt's before/after comparison depends on, and it routes auto-memory regrowth so lifecycle rules stop landing in the layer being thinned. (Scope note, 2026-07-27: the program **thins** the auto-memory layer and home specs — lifecycle-owned content migrates out; everything else stays and keeps being served. Earlier "phase out entirely" language is superseded.)

**Prompt 12 is the only prompt that deletes anything.** Everything before it migrates and verifies. (One executed exception: the 21 owner-ruled memory deletions from the prompt-3 review were carried out during the walkthrough itself, 2026-07-27 — `OWNER-RULED-DELETE.md` is the record; prompt 12 consumes it and does not re-delete.)

## Why twelve and not four

Three forces drove the split:

**Human attention.** Prompts 6, 7, 8, 10 and 11 are interviews. Batching them into fewer conversations would have meant twenty-plus decision rounds in one sitting. The seams are placed where decisions genuinely stop depending on each other.

**File conflicts.** `skills/plan/SKILL.md` is touched by 13 units of work and `~/CLAUDE.md` by 9. Work that edits the same file cannot be split across prompts that might run concurrently, and must not be spread across prompts that run far apart.

**Forbidden intermediate states.** Ten sequences would have left a rule existing in neither its old home nor its new one, or a pointer aimed at something not yet built. The ordering avoids all ten. The sharpest: deleting the brain memory-skill's session template before the canonical definition is authored would strip 22 of 27 agents of their template with nothing in its place.

## What changed from the four superseded prompts

The corpus was read exhaustively — 119 auto-memories, 283 brain files, 800 skills-plugin files, 8 home specs, the docs site, real PLAN and PRD notes. That read overturned most of what the earlier prompts asserted.

- **The PLAN note is not the dispatch-brief carrier.** Prompt C's central premise. `renderBuildWorkflowItem` emits eight status bullets and no instruction content; the schema has no free-text field; the renderer is a pure function that cannot read linked notes. The inversion already ships and is tested in `dispatch-implementer.ts` and `dispatch-qa.ts`. The work is documentation, not architecture.
- **All 7 example PLAN notes fail to parse.** So `render-plan-note.ts`, `set-part-done.ts` and the transition mutations have never run on real data. Fixing the parser before the section model would convert a silent no-op into silent destruction of `## Risks` and every phase heading.
- **The structural validator already exists** at `end/scripts/run-pre-flight.ts`, 290 lines, with no callers. Prompt B asked Claude to design one.
- **No DRAFT ADR status exists** in any of the three enums, and `adr-review` fires automatically on create. So incremental drafting *triggers* the debate rather than bypassing it — the opposite of what Prompt B claimed made the fix cheap.
- **The consensus rule is all-six accept-or-disagree-and-commit**, not the "≥5 ACCEPT" Prompt B stated. Zero accepts can pass.
- **The auto-memory layer is 119 files and 7,081 lines**, not the 171 and 17,280 Prompt D claimed — that checklist was unsatisfiable as written.
- **The a–u build cycle is duplicated eight times**, not two, with an eighth copy inside a TIER-1 BLOCKING memory.
- **`allowed-tools` pre-approves and never restricts**, so several "this is broken because it lacks tool X" claims were false.

## Supporting artifacts

In `scratch/synthesis/`:

- `00-CONVERSATION-LEDGER.md` — every decision, finding and open question from the design conversation. The prompts are downstream of this.
- `MAP-01`–`MAP-08` — exhaustive per-slice corpus maps (renamed with the `MAP-` prefix so they can't be confused with the numbered prompts in `prompts-v2/`).
- `A1-contradictions.md` — 138 contradictions, the fiction register, the escape-hatch register, the terminology collisions.
- `A2-automem.md` — all 119 memories bucketed, 90 sole-source findings, the breakage list, the migration sequence.
- `A3-sequencing.md` — the work-unit inventory, dependency graph, file-conflict matrix, forbidden states.
- `A4-ledger-reconciliation.md` — the audit that found most of the earlier findings wrong. Read this first.
- `SPEC.md` — the decomposition spec these twelve implement.
- `V1-coverage.md`, `V2-groundedness.md` — the two adversarial audits, and the defects the repair pass fixed.

## Standing caveats

**The provenance register (R-30, 2026-07-27).** Every prompt is being re-authored under a four-tag register: **[DECIDED]** (owner rulings, dated), **[WONDERING]** (the owner's open questions — interviewed once, at runtime, at their natural moment; attached recommendations are the assistant's), **[FACT]** (measured, reproducible), **[DEFAULT]** (assistant suggestions; deviations reported, not asked). Prompts 4–12 are rewritten (2026-07-27). Prompts 1–2 were walked line-by-line with the owner before the register existed and carry his rulings without the tags. If a prompt asserts something as [DECIDED] that reads like an assumption, that is a prompt defect — the runner surfaces it.

Line numbers are relative to the corpus snapshot taken during this analysis. Each prompt instructs Claude Code to verify citations at source before acting on them; treat a mismatch as a signal the file moved, not as licence to skip the step.

Every prompt carries the same fourteen cross-cutting rules: every question through `AskUserQuestion` with at most four authored options, author the moment a decision locks, nothing deleted before its destination is live and verified, nothing deleted in bulk, a map delivered before any edit lands, and an independent-evaluation mandate on every skill touched.
