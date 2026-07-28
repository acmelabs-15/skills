# Agent Message Standard — DRAFT v0.3

Walkthrough artifact, 2026-07-27. **Scope (owner-narrowed in v0.3): three agents only — `orchestrator`, `implementer`, `qa`** — the ones the build-loop update actually touches. Other specialists adopt later only if and when their dispatch relationships get reworked.

**v0.3 changes from v0.2 (owner rulings):**

- **No Zod schema, for now.** Validation machinery is deferred until something mechanically consumes the State block (the R-18 deny gate or a hook performer — both open prompt-9 forks). Until then the standard is the template text itself. The `agent-messages.ts` schema, the prompt-5 threading, and the drift-canary test are all removed from scope; they return only if a consumer lands.
- **The standard IS the agent files.** Each template lives at the **end of its agent's markdown file** — the last thing the agent reads: "when you finish, return exactly this." The dispatch template and its values close `orchestrator.md`; each return template and its values close `implementer.md` and `qa.md`. This document is the working spec only until those land (prompt 9); after that, the agent files are canonical and this file is a design record.
- **Carrier stands as ratified:** markdown sections + one fenced JSON State block, as convention. Parseable by whatever consumer eventually exists; costs nothing meanwhile.

Provenance unchanged: pattern re-derived from an external exemplar (not owned; no text lifted); fields from the owner's own system — the two-step model (R-15), the shipped `## State Changes` block, R-2 status atoms, the R-6 event enum. All tooling ever built around these messages is pure Bun (R-21). Installing the templates is the R-23-sanctioned *light, specific* brain edit: append a section, change nothing else.

## Principles

1. **Pull-model briefs** (R-15/R-16): the dispatch names refs; the agent reads the notes. Content is never restated into the brief except where a directive genuinely differs from the note.
2. **One structured surface per return** (R-19): the State block is where facts land. If it isn't in the block, it didn't happen.
3. **Judgment stays with agents** (R-16): the standard constrains *shape*, never verdicts.
4. **Status words come from the shared atom vocabulary** (R-2): `COMPLETE | BLOCKED | FAILED` — status describes the *work of this dispatch*, never the verdict.

---

## 1 · `orchestrator.md` — closing section: the DISPATCH template

```markdown
# DISPATCH — {target: implementer | qa} — {SPEC-NN} / {TASK-NN}
plan: [[PLAN-NNN]] · part: build.SPEC-NN · session: [[SESSION-YYYY-MM-DD_NN-…]] · dispatch-event: {NN}

## Objective
{one sentence — what done looks like for THIS dispatch}

## Read
- [[TASK-NNN-SPEC-NNN]] — primary; follow its Relations to every REQ and DESIGN it implements
- {ADR constraint refs, if any}
- {re-dispatch after FAIL, target implementer only: [[QA-NNN-SPEC-NNN-…]] as the FIRST read — the QA note is the fix brief (R-15)}

## Deliverables
- implementer: the implementation; DoD checkboxes marked [x] in the TASK note, each with evidence
- qa: [[QA-NNN-SPEC-NNN-{task-slug}]] authored via a single write_note call; verdict inside it and in the State block

## Boundaries
{do-not-touch paths; out-of-scope declarations}

## Return
Use YOUR return template (the closing section of your agent file). STATUS ∈ COMPLETE | BLOCKED | FAILED.
```

**Values defined here (orchestrator-owned):** `target`, the ref pair, the plan/part/session/dispatch-event header line, Objective, the Read list, Boundaries. The orchestrator never writes instruction content that belongs to the notes — that is the fiction prompt 2 deletes.

## 2 · `implementer.md` — closing section: the RETURN template

```markdown
# RETURN — implementer — {SPEC-NN} / {TASK-NN} — {STATUS}

## Summary
{≤ 3 lines, human-facing}

## Artifacts
- {created | updated} {path or [[NOTE-REF]]} — one line per artifact, nothing omitted

## State
```json
{
  "ref": "TASK-NN-SPEC-NN",
  "status": "COMPLETE",
  "checkboxes": [
    { "id": "dod-1", "state": "checked", "evidence": "src/x.ts:41; test: sorts_stable" }
  ],
  "tests": { "run": 0, "passed": 0, "failed": 0, "skipped": 0 },
  "blocker": null
}
```

## Evidence
{file:line citations, test names — the operational definition from cycle step (s)}

## Blockers / questions
{explicit, or "none" — silence is not an answer}
```

**Values defined here (implementer-owned):** `status` ∈ `COMPLETE | BLOCKED | FAILED`; `checkboxes[].state` ∈ `checked | unchecked | blocked`; every `checked` entry carries non-empty `evidence`; `tests` are the real run counts, never estimated; a `BLOCKED` status requires `blocker: { "kind": "…", "detail": "…" }` in place of `null`.

## 3 · `qa.md` — closing section: the RETURN template

Identical shape to the implementer's, with the verdict extension:

```json
{
  "ref": "TASK-NN-SPEC-NN",
  "status": "COMPLETE",
  "verdict": "PASS",
  "qa_note": "[[QA-NNN-SPEC-NN-{task-slug}]]",
  "checkboxes": [ … per-checkbox findings mirrored from the QA note … ],
  "tests": { "run": 0, "passed": 0, "failed": 0, "skipped": 0 },
  "blocker": null
}
```

**Values defined here (qa-owned):** `verdict` ∈ `PASS | FAIL` — **the QA agent's judgment alone (R-16)**; `qa_note` is mandatory whenever a verdict is present. The distinction that makes the loop work: **`status` describes the validation work, `verdict` describes the implementation.** `status: COMPLETE` + `verdict: FAIL` is the normal fail-loop signal — QA finished its job and the implementation did not pass. `status: BLOCKED` means QA could not validate at all (and carries `blocker`). Visual implementations: the QA note records the chrome-devtools visual validation performed (R-15); the State block needs no extra field for it.

---

## Mapping to the session-event enum (R-6) — informational, for prompt 10

| Message element | Event type |
|---|---|
| dispatch issued | `DISPATCH` |
| each `Artifacts` line | `ARTIFACT_WRITE` |
| return status COMPLETE/FAILED | `PART_TRANSITION` (via writer per R-17) |
| `verdict` | `GATE_RESULT` |
| R-18 gate denial (if that fork lands) | `HALT` |
| `blocker` | `HALT` |

## Landing plan

**Prompt 9 does all of it:** appends the three template sections to `orchestrator.md`, `implementer.md`, `qa.md` (light appends, R-23), and reconciles `dispatch-implementer.ts` / `dispatch-qa.ts` so what the scripts render **is** the orchestrator's dispatch template (one definition, script-rendered — not a second copy that drifts). No other prompt touches the standard.

## Open forks — assigned to prompt 9's interview

1. **Enforcement point** ⚑ — orchestrator reject-and-redelegate on malformed returns, vs the R-18 deny gate, vs staged both (R-20). Until decided, the templates are convention.
2. **Wider adoption** ⚑ — whether analyst/architect/critic/explainer ever get templates, and in what order. Out of scope for v0.3 by owner ruling.

## Non-goals

Schema validation (deferred — no consumer yet), retry semantics, the iteration cap, who performs state writes (R-17), per-agent identity content, and any change to shipped scripts before prompt 9.
