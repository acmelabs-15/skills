# Per-TASK build+QA cycle

The canonical protocol for advancing a TASK through implementation and validation. This file is the single source inside this repo; `/plan` and `/build` point at it and no skill restates it.

## The model — two steps, looping until PASS

Every build-spec task is **implement → validate**, in that order, repeated until validation passes.

1. **Implement.** `brain:🧠-implementer` reads the TASK note and, through its Relations, the linked REQ and DESIGN notes. It implements only that TASK and marks each Definition of Done checkbox `[x]` as it is satisfied.
2. **Validate.** `brain:🧠-qa` receives the same refs and reads the same notes. It rules valid or invalid per checkbox, with evidence, and writes a QA note. On FAIL the TASK returns to step 1 with the QA findings as a fix-brief.

The two steps are always sequential — validation never runs before or beside its implementation. Parallelism lives at a different level: **tasks parallelize against each other, and specs against each other, wherever their `depends_on` relations permit.** Where an implementation has visual parts, step 2 adds chrome-devtools validation of the rendered result.

Everything below is the operational bookkeeping around those two steps — state transitions, event ledger entries, and commit boundaries. It is choreography, not the model.

## The rigid sequence per TASK

When a SPEC enters build, the orchestrator advances ONE TASK at a time through a fixed sequence. NO step may be skipped or reordered, NO batching, NO shortcuts.

For each `TASK-NNN-SPEC-MMM` in the SPEC:

a. PLAN transition `impl-TASK-NNN PENDING → IN_PROGRESS` (FIRST action)
b. Session note Event appended capturing transition
c. Git commit
d. Orchestrator dispatches implementer; the brief is rendered from the TASK/REQ/DESIGN subtree by `build/scripts/dispatch-implementer.ts` — never from the PLAN
e. Implementer reads ENTIRE spec subtree, implements ONLY this TASK, marks DoD `[x]` per item satisfied
f. Implementer returns `## State Changes` (this TASK only)
g. Session note Event
h. PLAN transition `impl-TASK-NNN IN_PROGRESS → DONE`
i. Git commit (code + PLAN + session note atomically)
j. PLAN transition `qa-TASK-NNN PENDING → IN_PROGRESS`
k. Session note Event
l. Git commit
m. Orchestrator dispatches QA; the brief is rendered from the TASK/REQ/DESIGN subtree by `build/scripts/dispatch-qa.ts` — never from the PLAN
n. QA reads ENTIRE spec, evaluates each linked DoD + REQ AC + DESIGN compliance checkbox individually with evidence
o. QA writes per-checkbox findings to `QA-NNN-SPEC-MMM-{task-slug}.md` via a single `write_note` call
p. QA returns verdict ONLY: `PASS` or `FAILED + see QA-NNN` — nothing more; the QA note is the contract document
q. Session note Event
r. Orchestrator updates TASK note with `validated_by` relation to the QA note
s. On PASS: PLAN `qa-TASK-NNN → DONE`; TASK note status → DONE. On FAILED: PLAN `qa-TASK-NNN → FAILED`; PLAN `impl-TASK-NNN DONE → IN_PROGRESS`; orchestrator translates QA findings into a fix-brief that quotes each unchecked item verbatim with QA evidence (file:line, test name)
t. Git commit
u. Move to TASK N+1; repeat from (a)

## Checkbox-as-contract

Implementer and QA do NOT figure out what counts as done from prose. The contract is mechanical:

- `TASK ## Definition of Done` checkboxes — implementer's build contract
- `REQ ## Acceptance Criteria` (EARS Given/When/Then) — QA validates against these
- `DESIGN ## Compliance` or `## Architecture Compliance` checkboxes (when present) — QA validates against these

When dispatching implementer: brief MUST quote the TASK DoD verbatim + link the linked REQs/DESIGNs + state "you implement against the checkboxes; you check [x] as each is satisfied".

When dispatching QA: brief MUST quote the TASK DoD + linked REQ AC + linked DESIGN compliance verbatim + state "you validate each checkbox individually with evidence; you mark [x] for satisfied items, leave [ ] for unsatisfied; per-item PASS/FAIL/PARTIAL evidence to the QA note".

## The dispatch briefs

Two scripts render the briefs, and they are the only definition of brief content:

| Script | Interface | Shape |
|---|---|---|
| `build/scripts/dispatch-implementer.ts` | `{ taskRef, taskContent }` | **Push** — embeds the rendered TASK body under a `## Rendered TASK content` heading, then five directives (TDD, canonical-source-mirror, evidence hierarchy, quality self-check, memory-first gate) and a contract section |
| `build/scripts/dispatch-qa.ts` | `{ taskRef, reqRefs }` | **Pull** — carries refs only, no note content, and directs the agent to read the entire spec subtree itself. Also carries a reviewer-asymmetry mandate with no implementer counterpart |

These are two deliberately different shapes, documented here as current-state fact. Do not describe them as the same, and do not "unify" them for consistency — collapsing QA's pull model into a push would break it.

The target model is **pull for both**: the brief names the spec and task, and the agent reads the TASK note and, through Relations, the REQ and DESIGN notes. The shipped implementer script embeds content instead and has no spec-ref parameter; reconciling it is a later change, not one this file makes.

Neither script reads the PLAN. The PLAN has never carried brief content and cannot: `BuildWorkflowItemSchema` is `.strict()` with no free-text field, its only text-suggesting field `fix_brief_for_event` is a number, and `renderPlanNote` is a pure function with no file I/O.

## Agent-claim verification

Claims are verified by an adversarial reader, not by a validator run inside this cycle.

1. **The QA agent is the verifier.** The valid/invalid judgment on every DoD, Acceptance Criteria and Compliance checkbox belongs to `brain:🧠-qa` alone. It reads the same TASK/REQ/DESIGN notes the implementer worked from and records per-item evidence in the QA note. No mechanical validator gates that judgment.
2. **The mutation layer schema-validates state transitions.** When the PLAN is written, `transition-impl-item.ts` and `transition-qa-item.ts` enforce their preconditions — session context (`owning_session` + `at_event`) is mandatory and the mutations throw on missing, a qa item cannot advance past its paired impl item, and a qa item reaching DONE or FAILED must carry a `qa_ref`. This is state management, and it stays.
3. **The composition library's claim validators exist and are unwired by decision.** The inventory below is what the library contains, not a description of what runs in this cycle:

- `TaskNoteSchema` + `validateTaskDoneClaim()` — rejects a "DONE" claim if any DoD `[ ]` is unsatisfied
- `RequirementNoteSchema` + `validateRequirementAcClaim()` — rejects REQ ACCEPTED if any AC `[ ]`
- `DesignNoteSchema` + `validateDesignComplianceClaim()` — same for DESIGN
- `SpecRootNoteSchema` + `validateSpecDoneClaim()` — same for SPEC root
- `QaNoteSchema` + `validateQaPassClaim()` + schema superRefine — rejects a QA "PASS" verdict that doesn't match per-row results AND rejects `tests_run !== passed + failed + skipped`
- `PlanNoteSchema.BuildWorkflowItem` + `transition-impl-item` / `transition-qa-item` mutations — mandate session context (`owning_session` + `at_event`), throw on missing

They remain available as advisory tooling. Any future wiring must not contradict the rule above: nothing mechanical gates the QA agent's judgment.

## Defense in depth

This protocol embeds at every enforcement layer — Zod schemas + templates + renderers + skill SKILL.md + orchestrator dispatch briefs. Single-layer enforcement fails under load. Each layer is independent and redundant by design.

## Per-TASK progress rollup

`build_workflow_items` on a PLAN part is a **derived per-TASK progress rollup** — the single-surface view of where every impl/qa pair stands. It is emitted per part by `renderPart` and sorted deterministically by `sortBuildWorkflowItems` (by `task_ref` ascending, impl before qa). Each item renders as one `#### {id}` heading followed by eight status bullets: Type, Task Ref, Status, Owning Session, Transitioned At Event, Failed Iterations, QA Ref, Fix Brief For Event.

This is where per-TASK visibility lands. Every field is recomputable from TASK frontmatter `status` plus `validated_by` relations, so nothing in the block is authored content. `fix_brief_for_event` is an event **pointer**, not brief text — the cleanest single piece of evidence that briefs live elsewhere.

The rollup records progress. It does not enforce or guarantee anything.
