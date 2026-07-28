---
name: build
description: 'This skill should be used when the user asks to "build X", "implement the SPEC", "code up SPEC-NNN", "build out the implementation", "do the build phase", "start coding", "write the code for X", "implement the tasks", "execute the build", "start building", or invokes /build in any form. Also auto-invoked by /plan PLAN-NNN when the next-ready part is a build.SPEC-NNN phase. Runs the per-TASK atomic cycle (Stage A: implementer dispatch with TDD plus canonical-source-mirror plus evidence-hierarchy briefs, then qa dispatch, then state propagation, then sync-jira push, then PLAN tick plus commit), then a final spec-level QA sweep with coverage matrix (Stage B), then EPIC plus sync-jira plus PLAN propagation (Stage C), then 4 mandatory exit gates (code-qualities-assessment, incoherence, orphan-ref coverage-note, lint) plus conditional Gate 5 prompt-engineer for any diff containing prompt-like content, before flipping SPEC ACCEPTED then IN_PROGRESS then DONE.'
user-invocable: true
---

# /build

Implementation-phase skill for the Brain lifecycle. For one approved SPEC, execute the per-TASK atomic cycle (Stage A), final spec-level QA sweep (Stage B), spec-level state propagation (Stage C), and 4 mandatory exit gates (+ conditional Gate 5) before flipping the SPEC to DONE.

## What /build does

```text
Step 1:    Read PLAN's build.SPEC-NNN part → identify source SPEC
Step 2:    brain:🧠-analyst tier classification
Step 2.5:  Tier-driven oversight (Tier 1-2 async; Tier 3 checkpoint;
           Tier 4-5 PoC TASK first with user approval)
Step 3:    Skill brain:---pre-mortem BEFORE coding
           (top 2-3 critical risks → PLAN ## Risks)

Step 4 STAGE A — per-TASK atomic cycle (loop over each TASK):
  4a: brain:🧠-implementer (foreground; TDD + canonical-source-mirror
      + evidence-hierarchy + quality self-check)
  4b: Process State Changes; cross-check status enum (Contract 7)
  4c: brain:🧠-qa → QA-NNN-SPEC-NNN-{task-slug}.md to docs/qa/
  4d: On qa FAIL: fix-implementer loop (max 3 iterations; halt thereafter)
  4e: State propagation — TASK status DONE + outcome + validated_by
  4f: sync-jira push target=[[TASK-NNN-SPEC-NNN]]
  4g: PLAN tick + atomic commit

Step 5 STAGE B — final spec-level QA sweep:
  5a: brain:🧠-qa with full SPEC scope + all per-task QA notes
  5b: Coverage matrix — every REQ EARS clause traced to ≥1 test;
      HALT on uncovered clause

Step 6 STAGE C — spec-level propagation:
  EPIC update (if EPIC exists) → flip per-SPEC checklist
  sync-jira push target=[[SPEC-NNN]]
  PLAN tick for SPEC-level completion + commit

Step 7 — MANDATORY EXIT GATES (all PASS to declare DONE):
  Gate 1: brain:---code-qualities-assessment --changed-only
  Gate 2: brain:---incoherence --diff-base main
          (substitutes for doc-accuracy; closest Brain analog)
  Gate 3: orphan-ref-validator ABSENT at Brain locations
          → coverage-note severity INFO; CONTINUE
  Gate 4: markdownlint-cli2 + biome check (lint)
  Gate 5 (conditional, per Q10): IF diff contains prompt-like content
          (Skill/Task dispatch briefs with long args, system prompts
          in code, agent/skill/hook files, SDK messages.create system
          fields), invoke brain:---prompt-engineer in review mode.
          Reject build cycle on critical finding.

Step 8:    Skill plan set-part-done part=build.SPEC-NNN
           outcome=[[SPEC-NNN]] status=DONE
           SPEC status flips ACCEPTED → IN_PROGRESS → DONE
```

When auto-invoked from `/plan PLAN-NNN`, /build arrives via Contract 2 (`Skill(skill="build", args="plan=PLAN-NNN part=build.SPEC-NNN spec=SPEC-NNN")`).

### Role of /build in the rigid cycle

> /build is the per-TASK executor. Each invocation advances exactly ONE TASK through steps (a)-(u). /build NEVER batches multiple TASKs in a single dispatch; NEVER skips the QA gate; and never accepts an implementer's claim without adversarial QA validation — the QA agent reads the same TASK/REQ/DESIGN notes and rules valid or invalid, with per-checkbox evidence in the QA note. Both dispatch briefs are rendered from the TASK/REQ/DESIGN subtree by `scripts/dispatch-implementer.ts` and `scripts/dispatch-qa.ts`. The FAIL path's fix-brief translation (step s on FAILED) is /build's responsibility — quote each unchecked item with QA evidence.

## Per-TASK build+QA cycle

The cycle is defined once, in `references/per-task-build-qa-cycle.md`. Read it there; it is not restated here.

What /build owns is the execution: it runs the two steps per TASK — implement via `brain:🧠-implementer`, then validate via `brain:🧠-qa`, looping until PASS — and translates QA findings into the fix-brief on the FAIL path. The briefs themselves are rendered by `scripts/dispatch-implementer.ts` and `scripts/dispatch-qa.ts`, which are the only definition of brief content.

## Inputs and outputs

| Input | Source |
|---|---|
| `plan=PLAN-NNN` + `part=build.SPEC-NNN` | Auto-routed (Contract 2) |
| `spec=SPEC-NNN` | Extracted from `part.id` (e.g., `build.SPEC-001` → `spec=SPEC-001`) |
| PLAN frontmatter `complexity_tier` | Required (HALT if missing) |
| ACCEPTED SPEC subtree | REQ + DESIGN + TASK notes from /spec Stage 2 |

| Output | Location |
|---|---|
| Source code changes | Project repo (per TASK Files Affected) |
| QA notes (one per TASK + one spec-level) | `docs/qa/` |
| TASK status flips TODO → DONE | TASK frontmatter (per Contract 7) |
| SPEC status flips ACCEPTED → IN_PROGRESS → DONE | SPEC root frontmatter |
| Jira ticket pushes | Via `sync-jira` (per-TASK + per-SPEC) |
| `set-part-done` call back to /plan | Contract 1 with SPEC outcome |

## Cross-cutting behaviors (all invocations)

### Brain MCP binary rule

All `docs/**` operations use Brain MCP tools. QA note creation is a single `write_note` call passing the full canonical colon title (e.g., `QA-001-SPEC-001: Login Auth Path`); Brain MCP derives the kebab filename and bare permalink and indexes the note immediately. Verify via `list_directory`. No `edit_note` or `move_note` follow-up.

Code files (`src/**`, `lib/**`, etc.) use Read/Edit/Write per the binary rule — NEVER Brain MCP on non-graph files.

### Two-step edit pattern (per D-04 + Contract 5)

After every state change (TASK status, SPEC status, PLAN tick):

1. Brain MCP edit first (canonical state mutation on TASK/SPEC/PLAN notes)
2. SESSION Event NN append (pointer ledger; Contract 5)
3. Project repo commit (durability — includes both Brain note edits AND source code changes for atomic per-TASK commits)

Never batch across multiple TASKs. One TASK cycle = one commit.

### Memory-first gate (per G3 resolution)

Implementer dispatch briefs embed the memory-first directive — "Before changing existing code/architecture/protocol, search Brain memory for related context via `mcp__plugin_brain_brain__search`. Document findings inline. Only then proceed." No separate `brain:---chestertons-fence` dispatch.

### G2 resume semantics — skip done work

On resume:

| Substep | Skip condition |
|---|---|
| Step 1-3 (read + tier + pre-mortem) | Skip if PLAN ## Risks populated AND complexity_tier set |
| Step 4 per-TASK loop | Skip TASKs already DONE in their frontmatter status |
| Step 5a spec-level QA | Skip if spec-level QA note exists |
| Step 5b coverage matrix | Re-run on resume (cheap; catches drift) |
| Step 6 Stage C propagation | Skip already-propagated sub-steps |
| Step 7 exit gates | Re-run each gate (cheap; surfaces drift) |
| Step 8 set-part-done | Skip if already invoked (SPEC status DONE) |

## Step 1 — Read inputs

Read PLAN + `build.SPEC-NNN` part + the source SPEC (`docs/specs/SPEC-NNN-*/SPEC-NNN-*.md`). Validate:

- PLAN frontmatter `complexity_tier` set (TIER_1..5; HALT via `build-step1-tier-missing-halt` if missing)
- SPEC status is `ACCEPTED` (HALT via `build-step1-spec-not-accepted-halt` if not — Stage 2 of /spec must complete first)
- SPEC subtree complete (REQ + DESIGN + TASK notes all present per Artifact Status)

## Step 2 — Tier classification

```text
Task(subagent_type="brain:🧠-analyst")
```

Brief: classify the SPEC's workload Tier 1-5 (analyst returns tier + confidence + rationale). Drives Step 2.5 oversight.

If PLAN-level `complexity_tier` already matches: use it. If SPEC-level analyst returns different tier: surface to user via AskUserQuestion (PLAN-level OR SPEC-level wins?).

## Step 2.5 — Tier-driven oversight

| Tier | Oversight |
|---|---|
| 1-2 | Proceed to per-TASK cycle; async user review sufficient |
| 3 | Checkpoint with user via AskUserQuestion after first TASK completes; surface approach + first TASK outcome for confirmation before continuing |
| 4-5 | Require user approval of implementation approach BEFORE first TASK; build a small PoC TASK first, get sign-off, then proceed with remaining TASKs |

## Step 3 — Pre-mortem (BEFORE coding)

```text
Skill(skill="brain:---pre-mortem")
```

Runs against SPEC + DESIGN + REQ set, NOT against code. Output: top 2-3 critical risks; record in PLAN `## Risks` section. The risks inform implementer dispatch briefs (Step 4a brief includes "watch for: <risk-name>").

If pre-mortem surfaces a risk that invalidates the SPEC: HALT via `build-step3-spec-invalidated-halt`; surface to user; require /spec revision.

## Step 4 — STAGE A per-TASK atomic cycle

See `references/implementation-phase-workflow.md` for the full per-TASK cycle. Summary:

For each TASK in dependency order:

1. **4a — Implementer dispatch** (foreground per the foreground-permission-tools principle):
   - `Task(subagent_type="brain:🧠-implementer")`. The brief is generated by `scripts/dispatch-implementer.ts` — that script is the only definition of brief content, and it emits the five directives (TDD, canonical-source-mirror, evidence hierarchy, quality self-check, memory-first gate) plus the contract. Full directive text is in `references/implementation-phase-workflow.md`.
   - Test-first is unconditional for code TASKs: a failing test per acceptance criterion BEFORE implementation code.
   - Two things the script does not take as parameters, so the orchestrator supplies them in the dispatch alongside the rendered brief: the parent SPEC + applicable ADR set, and the Step 3 pre-mortem risk list.
2. **4b — Process State Changes**: implementer returns `## State Changes` listing every status transition. Cross-check each against Contract 7 task enum (`TODO | IN_PROGRESS | DONE | BLOCKED`). HALT via `build-step4b-invalid-status-halt` on any non-canonical status.
3. **4c — QA dispatch**: `Task(subagent_type="brain:🧠-qa")` → writes `QA-NNN-SPEC-NNN-{task-slug}.md` to `docs/qa/`.
4. **4d — On QA FAIL**: dispatch fix-implementer with the QA findings as context; loop 4a → 4c until PASS. **Max 3 iterations**; HALT via `build-step4d-iteration-halt` for user intervention.
5. **4e — State propagation**: TASK frontmatter `status: DONE` + outcome observation + `validated_by [[QA-NNN-SPEC-NNN: ...]]` relation. Two-step edit (TASK edit → SESSION Event NN append).
6. **4f — sync-jira push**: `Skill(skill="sync-jira", args="push target=[[TASK-NNN-SPEC-NNN: ...]]")`.
7. **4g — PLAN tick + commit**: mark TASK DoD checkbox in PLAN body via `edit_note`; atomic project repo commit covering source code + Brain note edits.

## Step 5 — STAGE B final spec-level QA sweep

1. **5a — Spec-level QA**: `Task(subagent_type="brain:🧠-qa")` with full SPEC scope + all per-task QA notes. Writes `QA-NNN-SPEC-NNN-spec-level.md`.
2. **5b — Coverage matrix**: every REQ's EARS clause traced to ≥1 test in QA notes. HALT via `build-step5b-coverage-halt` on any uncovered clause; require additional TASK OR revised QA note.

## Step 6 — STAGE C spec-level propagation

See `references/state-propagation.md`. Summary:

- EPIC update (if EPIC exists): flip EPIC's per-SPEC checklist entry via `edit_note`
- `Skill(skill="sync-jira", args="push target=[[SPEC-NNN: ...]]")`
- PLAN tick for SPEC-level completion + commit

## Step 7 — MANDATORY EXIT GATES

See `references/exit-gates.md` for full gate details, Gate 5 trigger detection, and coverage-gap handling. Summary:

| Gate | Tool | Behavior on findings |
|---|---|---|
| 1 | `Skill(skill="brain:---code-qualities-assessment", args="--changed-only")` | Reject build cycle on critical finding |
| 2 | `Skill(skill="brain:---incoherence", args="--diff-base main")` (substitutes for `doc-accuracy` per Contract 9) | Reject on critical incoherence |
| 3 | `orphan-ref-validator` — ABSENT at Brain locations | Emit `build-gate3-coverage-note` severity INFO per Contract 3; CONTINUE (non-BLOCKING) |
| 4 | `npx markdownlint-cli2 --fix "**/*.md" "!**/docs/**"` (markdown; `docs/**` excluded — `--fix` breaks wikilinks) + `biome check` (TS/JS if `biome.json` exists) | Fix in-place; commit if changes |
| 5 (conditional, Q10) | `Skill(skill="brain:---prompt-engineer")` IF diff contains prompt-like content (heuristics in `exit-gates.md`) | Reject build cycle on critical finding |

If any BLOCKING gate flags: HALT via `build-step7-gate{N}-halt`; address findings in this same /build invocation. **"I'll fix in review" is NOT acceptable rationale.**

## Step 8 — set-part-done

```text
Skill(skill="plan", args="set-part-done plan=PLAN-NNN part=build.SPEC-NNN outcome=[[SPEC-NNN: ...]] status=DONE")
```

Per Contract 1. SPEC status flips `ACCEPTED → IN_PROGRESS → DONE` for the build phase. /plan flips `build.SPEC-NNN` part status → DONE; surfaces next-ready part as recommendation; user re-invokes `/plan PLAN-NNN` to continue (typically with `build.SPEC-NNN+1` if multiple build parts) OR runs `/end` if this was the last build/review part.

## Halt blocks

All halts use Contract 3 schema with `build-<step>-halt` info-string:

````text
```build-<step>-halt
trigger: <step identifier>
question: <what the halt is checking>
answer: "<machine-extractable answer or null>"
test_failed: <which test condition failed>
deferral: <how to resume after addressing>
```
````

Full halt inventory:

| Halt | Trigger | Resolution |
|---|---|---|
| `build-step1-tier-missing-halt` | PLAN `complexity_tier` is TBD or missing | Invoke /research; or set manually |
| `build-step1-spec-not-accepted-halt` | SPEC status is DRAFT (Stage 2 of /spec incomplete) | Complete /spec Stage 2 first |
| `build-step3-spec-invalidated-halt` | Pre-mortem surfaces risk that invalidates SPEC | Surface to user; require /spec revision |
| `build-step4b-invalid-status-halt` | Implementer returns non-canonical status (e.g., "TESTING" instead of IN_PROGRESS) | Re-dispatch implementer with status enum embedded; re-process State Changes |
| `build-step4d-iteration-halt` | Fix-implementer loop exceeds 3 iterations | Surface QA findings to user; user intervenes |
| `build-step4f-sync-jira-halt` | Per-TASK sync-jira push fails (network, credentials, ticket mismatch) | User adjudicates: retry, skip-with-manual-sync, halt |
| `build-step5b-coverage-halt` | Coverage matrix uncovered REQ clauses | Add TASK OR revise the QA note to cover; re-run 5b |
| `build-step6-sync-jira-halt` | SPEC-level sync-jira push fails | User adjudicates: retry, skip-with-manual-sync, halt |
| `build-step7-gate1-halt` | code-qualities-assessment critical finding | Address finding; re-run Gate 1 |
| `build-step7-gate2-halt` | incoherence critical finding | Address finding; re-run Gate 2 |
| `build-step7-gate4-halt` | Lint failures not auto-fixable | Fix manually; re-run Gate 4 |
| `build-step7-gate5-halt` | prompt-engineer critical finding (Q10 conditional fire) | Address finding; re-run Gate 5 |

Coverage notes (severity INFO; non-BLOCKING):

| Coverage note | Trigger |
|---|---|
| `build-gate3-coverage-note` | `orphan-ref-validator` absent at both Brain locations | Document gap; CONTINUE; Peter decides whether to port |

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Running exit gates per-TASK | Gates are spec-level; per-task QA is Step 4c | Gates run ONCE per /build invocation after Stage C |
| Skipping pre-mortem because "small SPEC" | Small SPECs still produce surprises | Pre-mortem runs against all SPECs regardless of size |
| Letting per-task QA findings accumulate | Each TASK closes its own QA before next starts | Stage A loop is atomic per TASK |
| Pushing to sync-jira before TASK frontmatter flipped DONE | Jira drifts ahead of source-of-truth | Step 4e state propagation FIRST, then Step 4f sync-jira |
| Running pre-mortem AFTER coding starts | Defeats its purpose; pre-mortem informs implementer approach | Step 3 BEFORE Step 4 always |
| Implementer dispatch without TDD directive | Tests get written after the fact; coverage drift | Test-first is unconditional for code TASKs; the script always emits the directive |
| Implementer dispatch without canonical-source-mirror | Code claims to mirror but doesn't cite source | Brief MUST include the constraint |
| Fix-implementer loop without max-iteration cap | Infinite loop when QA findings can't be resolved | Max 3 iterations; HALT for user intervention |
| Treating Gate 3 coverage-note as a blocker | orphan-ref-validator is INFO (non-BLOCKING) per Contract 9 | Document gap; CONTINUE |
| "I'll fix in review" deferral on exit gate findings | Gates exist to prevent the iteration paradox | Address findings IN this /build cycle; never defer |

## Skill dispatch resolution (Contract 9)

For any skill name dispatched, check `~/.claude/skills/<name>/SKILL.md` first; if absent, check Brain plugin path. Never fall back to ai-agents.

**Skills (Skill dispatch — `Skill(skill="...")`):**

- `brain:---pre-mortem` → Brain plugin (Step 3)
- `brain:---code-qualities-assessment` → Brain plugin (Gate 1)
- `brain:---incoherence` → Brain plugin (Gate 2 — substitutes for `doc-accuracy` which is absent from Brain locations)
- `brain:---prompt-engineer` → Brain plugin (Gate 5 conditional per Q10)
- `sync-jira` → `~/.claude/skills/sync-jira/` (Step 4f per-TASK + Step 6 spec-level)

**Agents (Task dispatch — `Task(subagent_type="...")`):**

- `brain:🧠-analyst` → Brain plugin (Step 2 tier classification)
- `brain:🧠-implementer` → Brain plugin (Step 4a + fix-implementer iterations)
- `brain:🧠-qa` → Brain plugin (Step 4c per-TASK + Step 5a spec-level)

**ABSENT (coverage gap; INFO; non-BLOCKING):**

- `orphan-ref-validator` → not present at either Brain location. Gate 3 emits coverage-note + continues. Port from upstream if Peter wants this gate to become BLOCKING.

**EXCLUDED**: `golden-principles`, `taste-lints` (Brain not aligned).

## Reference files

- `references/implementation-phase-workflow.md` — Full Step 1-8 pipeline with per-step substeps + halt conditions + anti-patterns + per-TASK cycle detail
- `references/state-propagation.md` — Stage C spec-level propagation procedure (EPIC update + sync-jira + PLAN tick) with cross-references to /plan's two-step-edit-pattern
- `references/exit-gates.md` — 4 mandatory exit gates + Gate 5 conditional (Q10 trigger detection heuristics + coverage-gap documentation for missing tools + per-gate halt blocks)
