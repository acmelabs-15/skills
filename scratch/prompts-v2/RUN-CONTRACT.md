# RUN-CONTRACT — how every prompt in this program is executed

_Owner ruling R-31, 2026-07-27. This contract governs the runtime behavior of every prompt-conversation (1 through 12). Each prompt instructs the agent to read this file before doing anything else. Where a prompt's own text says "autonomous," this contract overrides it._

## The mode — Peter's words

> "I want the agent to go over all of this with me in pretty granular detail — while I do want it to use the ask user question tool and identify the answer(s) it recommends — I also do not want it making assumptions for me — I want it to help provide structure, provide opinions and options, surface concerns, improvements, problems, etc and help guide me through this in an extremely collaborative way."

## What that means, concretely

1. **Orient first.** Open the conversation by presenting the whole prompt's structure in plain language: the sections, what work each does, where Peter's decision points (the W-items) sit, and what the checkpoints will be. Give him the map before the journey. Wait for his go before starting (this subsumes and does not replace any blocking map gate the prompt itself defines — those still deliver their tables and wait).
2. **Step preview, then act.** Before each step: two to six plain-language sentences — what you are about to do, why, what it touches, any concerns / risks / improvement ideas you see (including ones the prompt itself missed), and which [DEFAULT] choices you are adopting. He can redirect in flight. Silence is consent to proceed with exactly what you previewed — never to something you didn't.
3. **W-items are his decisions.** Raise each via `AskUserQuestion` at its marked moment, exactly once: plain language, at most four authored options, a recommendation identified and labeled as the assistant's, and a note that he can type his own answer into the auto-appended "Other." Never pre-decide one, never re-ask one, never bundle two.
4. **No assumptions.** Anything not tagged [DECIDED] that materially shapes an output gets surfaced — in the step preview if it is a working default, as a question if it is genuinely his call. If you catch yourself inferring what Peter would want, stop and surface it instead. An assumption he discovers later is a defect in the run.
5. **Checkpoint summaries.** At every section boundary: what was done, what you noticed — concerns, problems, improvement opportunities, honestly stated and ranked when there are several — and what comes next. Keep them short; he has been following.
6. **Opinions are welcome, labeled.** Provide real opinions and recommendations throughout — that is part of the job — but always as yours. The register's tags ([DECIDED] / [WONDERING] / [FACT] / [DEFAULT]) bind everywhere; a recommendation never migrates into a decision without his answer.
7. **Collaboration is not re-litigation.** [DECIDED] items are presented as settled context, not re-opened — unless you spot a genuine defect in one, which you surface as a concern with evidence rather than silently obeying or silently fixing.
8. **Plain language everywhere** (interim ASK-STANDARD, P4-1): no internal jargon, stage numbers, or bare file:line at him unless he is ruling on that exact text; say what breaks and what it costs. The full ASK-STANDARD is developed in prompt 7's interview and supersedes this clause when it lands.
9. **Verify [FACT]s before leaning on them**; report drift as drift. Map gates stay blocking. Permission prompts (including every `Bash(rm:*)` ask) are expected — answer them, never route around them.

## Mechanics — how Peter provides the material

He doesn't. Everything the prompts reference already lives on this machine, and the agent reads it from disk:

- **Start the conversation in `/Users/peter.kloss/Dev/ACMElabs/skills`** (the repo root). The prompts, this contract, the rulings log, and the synthesis artifacts are all in `scratch/prompts-v2/` and `scratch/synthesis/` inside it.
- **The launch line is one sentence.** Peter opens a fresh Claude Code conversation and types:
  > Read `scratch/prompts-v2/RUN-CONTRACT.md` and `scratch/prompts-v2/NN-<name>.md` in full — paginate, never act on a partial read — then run the prompt under the contract.
- **Out-of-repo targets** (user-level skills under `~/.claude/skills/`, the home specs at `~/*.md`, the brain plugin and brain repo, `~/.claude/memory/`, `settings.json`) are cited by absolute path inside the prompts; the agent opens them itself. Nothing is pasted, uploaded, or attached.
- **Authoritative context on disk, read on demand:** `scratch/prompts-v2/RULINGS-LOG.md` (Peter's rulings R-1…R-31 — the provenance behind every [DECIDED] tag), `OWNER-RULED-DELETE.md` (the executed 2026-07-27 memory deletions), `MESSAGE-STANDARD-DRAFT.md` (prompt 9's working spec), and `scratch/synthesis/00-CONVERSATION-LEDGER.md` (D-numbers; its PART 2 findings are unreliable — the prompts carry the corrected wording).
- **Order:** 1 → 2 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 (3 is dissolved). Strictly sequential; each prompt's header names its dependencies.
- **Every prompt-conversation ends with its branch unmerged, nothing pushed, no AI attribution in any commit message.** Peter reviews and merges.
