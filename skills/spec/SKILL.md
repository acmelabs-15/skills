---
name: spec
description: 'This skill should be used when the user asks to "spec out X", "create specs for the ADRs", "author the SPEC for X", "build the spec layer", "do the spec phase", "decompose into SPECs", "spec out the architecture", "create implementation specs", "generate specs from decisions", "set up the SPEC subtree", or invokes /spec in any form. Also auto-invoked by /plan PLAN-NNN when the next-ready part is the spec-decomposition phase (Stage 1) or a spec.SPEC-NNN phase (Stage 2). Stage 1 proposes a SPEC decomposition from accepted ADRs via analyst clustering plus conditional CVA, then surfaces for user approval. Stage 2 authors the full SPEC subtree per spec — REQ notes (EARS plus GIVEN/WHEN/THEN), DESIGN notes (module structure plus interfaces), TASK notes (atomic units with DoD checklists), SPEC root last — then validates via Phase 3 pre-flight checks, ADR coverage gate, and Gate A semantic gap analysis plus Gate B four binary drift checks before flipping SPEC DRAFT to ACCEPTED.'
user-invocable: true
---

# /spec

Specification-phase skill for the Brain lifecycle. Two stages:

- **Stage 1 (spec-decomposition)** — propose a SPEC decomposition from ACCEPTED ADRs; surface for user approval; /plan gets one new `spec.SPEC-NNN` part per approved SPEC.
- **Stage 2 (spec.SPEC-NNN)** — author the full SPEC subtree (REQ + DESIGN + TASK + SPEC root) for one approved SPEC; validate; flip SPEC DRAFT → ACCEPTED.

Auto-routed from `/plan PLAN-NNN` via Contract 2 dispatch. Stage 1 args: `source_adrs=[[ADR-001: ...]],...`. Stage 2 args: `spec=SPEC-NNN source_adrs=...`.

## What /spec does (high level)

```text
Stage 1 (spec-decomposition):
  Step 0:  First-principles re-validation (re-read PRD Q1-Q6; verify ADRs align)
  Step 0.5: Memory-First search for prior specs
  Step 1:  Dispatch brain:🧠-analyst with ACCEPTED ADRs + Prior Specs Context
  Step 2:  Analyst writes ANALYSIS-NNN: SPEC Clustering
  Step 3:  CVA conditional (Tier ≥3 + 2+ similar SPECs → mandatory)
  Step 4:  critic + decision-critic review the clustering
  Step 5:  AskUserQuestion for adjudication
  Step 6:  /plan adds one spec.SPEC-NNN part per approved SPEC
  Step 7:  set-part-done outcome=[[ANALYSIS-NNN: SPEC Clustering]]

Stage 2 (per-SPEC; spec.SPEC-NNN):
  Step 1:  Create SPEC folder + reserve SPEC counter
  Step 2:  Author REQ notes (one per requirement)
  Step 3:  Author DESIGN note(s)
  Step 4:  Author TASK notes
  Step 5:  Author SPEC root note LAST
  Step 6:  Bi-directional relation closure
  Phase 3: Validation (pre-flight + post-write per CONVENTIONS Section 8)
  ADR coverage gate: every ACCEPTED ADR has implemented_by [[SPEC-NNN]]
  Gate A:  Semantic gap analysis (analyst as requirements reviewer)
  Gate B:  4 binary drift checks (REQ→ADR, scope conservation, TASK→REQ, scope-in match)
  Final:   flip SPEC DRAFT → ACCEPTED; set-part-done outcome=[[SPEC-NNN]]
```

## Inputs and outputs

### Stage 1

| Input | Source |
|---|---|
| `plan=PLAN-NNN` + `part=spec-decomposition` | Auto-routed (Contract 2) |
| `source_adrs=...` | ACCEPTED ADR wikilinks from /decisions |
| PLAN frontmatter `complexity_tier` | Required; HALT if missing |

| Output | Location |
|---|---|
| `ANALYSIS-NNN: SPEC Clustering` note | `docs/analysis/` |
| New `spec.SPEC-NNN` parts in PLAN | One per approved SPEC; added via /plan |
| `set-part-done` to /plan | `outcome=[[ANALYSIS-NNN: SPEC Clustering]]` |

### Stage 2

| Input | Source |
|---|---|
| `plan=PLAN-NNN` + `part=spec.SPEC-NNN` | Auto-routed (Contract 2) |
| `spec=SPEC-NNN` + `source_adrs=...` | The SPEC to author + its source ADRs |
| Stage 1's `ANALYSIS-NNN: SPEC Clustering` | Cluster definition + cross-cutting ADR constraints |

| Output | Location |
|---|---|
| SPEC root + REQ + DESIGN + TASK notes | `docs/specs/SPEC-NNN-{feature-kebab}/` |
| Bi-directional relations | Added to ADRs (`implemented_by`) + REQ/DESIGN (`implemented_by` from TASK) |
| SPEC status flipped DRAFT → ACCEPTED | Via final step |
| `set-part-done` to /plan | `outcome=[[SPEC-NNN: ...]]` |

## Cross-cutting behaviors (both stages)

### Brain MCP binary rule

All `docs/**` operations use Brain MCP tools (`mcp__plugin_brain_brain__*`). All 4 SPEC subtree note types (SPEC root, REQ, DESIGN, TASK) have colons in titles; creation uses Pattern 2 three-phase write:

1. `write_note` with no-colon title (e.g., `REQ-001-SPEC-001 Injectable Data Source`)
2. `edit_note` (find_replace) to insert colons in frontmatter title + H1
3. `move_note` to rename to kebab filename (e.g., `req-001-spec-001-injectable-data-source.md`)

### Two-step edit pattern (per D-04 + Contract 5)

After every state change (SPEC root status flip, REQ/DESIGN/TASK note creation, bi-directional relation addition):

1. Brain MCP edit first (canonical state mutation)
2. SESSION Event NN append (pointer ledger; Contract 5 schema)
3. Project repo commit (durability)

Never batch across multiple events. One note creation = one edit + one Event + one commit.

### G2 resume semantics — skip done work

**Stage 1 resume**: skip Stage 1 if `ANALYSIS-NNN: SPEC Clustering` already exists for the spec-decomposition part. Re-run Step 5 user approval only if cluster proposal hasn't been adjudicated.

**Stage 2 resume**: skip note types already authored:

| Stage 2 Step | Skip condition |
|---|---|
| Step 1 folder + counter | Skip if SPEC folder exists at `docs/specs/SPEC-NNN-*/` |
| Step 2 REQ notes | Skip REQs already authored; only create missing ones |
| Step 3 DESIGN note(s) | Skip DESIGNs already authored |
| Step 4 TASK notes | Skip TASKs already authored |
| Step 5 SPEC root | Skip if SPEC root note exists; verify status is `ACCEPTED` (re-author if drifted; specs are born ACCEPTED at Step 5 per Q9 / D-06b — DRAFT status on the SPEC root indicates the Step 5 creation didn't complete) |
| Step 6 bi-dir closure | Skip relations already present on targets; add missing ones |
| Phase 3 validation | Re-run if SPEC root status is still DRAFT |
| ADR coverage gate | Re-run on every Stage 2 invocation (cheap; surfaces drift) |
| Gate A semantic gap | Re-run if SPEC root status is still DRAFT |
| Gate B 4 binary checks | Re-run if SPEC root status is still DRAFT |

## Stage 1 pipeline

See `references/spec-decomposition.md` for the full pipeline. High-level summary:

1. **Step 0 — First-principles re-validation**: read PRD's Q1-Q6 + forcing-question answers (from /research Step 0). Verify ACCEPTED ADRs still align with the demand signal (Q3-equivalent blocked entity) + the narrowest wedge (Q4-equivalent scope). If drift detected, HALT via `spec-decomposition-step0-halt`.
2. **Step 0.5 — Memory-First search**: `mcp__plugin_brain_brain__search` for related SPECs, prior REQs, DESIGN notes. Surface findings as "Prior Specs Context" sub-section in the SPEC Clustering analysis output (Step 2).
3. **Step 1** — `Task(subagent_type="brain:🧠-analyst")` with all ACCEPTED ADRs as input + Prior Specs Context.
4. **Step 2** — Analyst writes `ANALYSIS-NNN: SPEC Clustering` to `docs/analysis/` covering: proposed SPEC list with feature-themed slugs (NOT project slugs), ADR-to-SPEC mapping, cross-cutting ADRs as constraints (applied to multiple SPECs), ordering/phasing, effort rollup per SPEC.
5. **Step 3 — CVA conditional**: if 2+ proposed SPECs share similar structural patterns (analogous APIs, similar lifecycles, parallel data flows), invoke `Skill(skill="brain:---cva-analysis")` to discover whether a shared abstraction (common DESIGN, base REQ pattern) should exist before individual SPEC authoring. Mandatory at Tier ≥3.
6. **Step 4 — Review**: `Task(subagent_type="brain:🧠-critic")` + `Skill(skill="brain:---decision-critic")` review the clustering with reviewer-asymmetry framing.
7. **Step 5 — User adjudication**: AskUserQuestion (Contract 4 5-field template) with the cluster proposal + ADR-to-SPEC mapping table.
8. **Step 6** — On approval, /plan adds one `spec.SPEC-NNN` part per approved SPEC.
9. **Step 7** — `set-part-done part=spec-decomposition outcome=[[ANALYSIS-NNN: SPEC Clustering]]`.

## Stage 2 pipeline (per-SPEC authoring)

See `references/spec-authoring.md` for the full pipeline. Key invariants:

- **Authoring order is non-negotiable**: REQ → DESIGN → TASK → SPEC root. SPEC root LAST because its Artifact Status listings reference real notes; authoring it first creates broken wikilinks.
- **SPEC root status = ACCEPTED at creation**. SPECs are born ACCEPTED after /decisions locks the ADRs. `IN_PROGRESS` is the implementation-phase state (set by /build). `DONE` is post-build.
- **No premature `[x]` checkboxes**. All DoD checkboxes are `[ ]` at SPEC root creation. `/build` flips them later.

The 6 authoring steps + Phase 3 validation + ADR coverage gate + Gate A + Gate B happen in sequence; G2 resume skips already-completed steps.

See `references/spec-templates.md` for the canonical content depth per note type (REQ EARS + GIVEN/WHEN/THEN; DESIGN sections; TASK DoD + ADR Compliance + Files Affected + Effort Summary; SPEC root Phases + Artifact Status + ADR Cross-cutting Constraints).

## ADR coverage gate

After Stage 2 Phase 2 finishes for the LAST SPEC in the part (or after every Stage 2 if the part contains a single SPEC), run this audit:

1. List every ACCEPTED ADR in `docs/decisions/`
2. For each ADR, search for `implemented_by [[SPEC-` in its Relations section (added during Stage 2 Step 6)
3. Any ADR without an `implemented_by` relation → uncovered. HALT via `spec-adr-coverage-uncovered-halt`; surface to user.

Resolution: amend the Stage 1 clustering to include the uncovered ADRs OR document explicit deferral with rationale in PLAN Decision Log.

## Gate A — Semantic gap analysis (after Phase 3 syntactic validation)

`Task(subagent_type="brain:🧠-analyst")` as a requirements analyst. Brief:

> "Review every REQ in SPEC-NNN. For each requirement, ask: can this be verified pass/fail given the current EARS clause + acceptance criteria + DESIGN context? Flag anything vague, anything that requires runtime judgment, anything where two reasonable implementers would build different things."

HALT SPEC authoring on any flagged REQ via `spec-gate-a-halt`; refine the requirement before resuming. Re-run Gate A after refinement.

## Gate B — 4 binary drift checks

The critic verifies all four; HALT on any FAIL:

| Check | Verifies |
|---|---|
| (a) REQ → ADR traceability | Every REQ traces to ≥1 ADR via Relations (`implements [[ADR-N]]`) or via parent SPEC's `implements` set. Orphan REQs = scope creep |
| (b) Scope conservation | No REQ adds scope beyond the ADR set without explicit documented rationale (ADR amendment OR SPEC body note) |
| (c) TASK → REQ traceability | Every TASK has ≥1 `implements [[REQ-N-SPEC-N: ...]]` relation. Orphan TASKs = implementation drift |
| (d) Scope-In match | SPEC's `## Scope` (In Scope sub-section) matches the SPEC Clustering analysis from Stage 1. Divergence requires documented justification or revision |

Each check uses adversarial framing (reviewer-asymmetry). HALT via `spec-gate-b-<check>-halt` on FAIL.

## Halt blocks

All halts use Contract 3 schema — fenced code block with `spec-<step>-halt` info-string:

````text
```spec-<step>-halt
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
| `spec-stage1-tier-missing-halt` | PLAN `complexity_tier` is TBD or missing | Invoke /research; or set manually |
| `spec-decomposition-step0-halt` | First-principles re-validation: ADRs drifted from PRD demand signal/wedge | Surface drift; consider /decisions revision |
| `spec-decomposition-step5-rejected-halt` | User rejects clustering twice without actionable refinement | Surface to user; halt Stage 1 pending revision |
| `spec-stage2-tier-missing-halt` | PLAN `complexity_tier` missing at Stage 2 Step 1 | Invoke /research; or set manually |
| `spec-stage2-no-source-adrs-halt` | Stage 2 invoked without source_adrs args + part doesn't carry them | Verify /plan auto-routing carried source_artifacts |
| `spec-preflight-halt` | Phase 3 pre-flight check fails on a newly-authored note | Fix the violation; resume |
| `spec-adr-coverage-uncovered-halt` | ADR coverage gate finds uncovered ACCEPTED ADR | Amend Stage 1 clustering OR document deferral rationale |
| `spec-bi-dir-target-missing-halt` | Step 6 bi-directional closure finds a wikilink target that doesn't exist | The wikilink target was wrong; fix the source note's relation |
| `spec-gate-a-halt` | Semantic gap analysis flags a vague/un-verifiable REQ | Refine the REQ; re-run Gate A |
| `spec-gate-b-a-halt` | Gate B (a) REQ→ADR traceability fails | Add `implements [[ADR-N]]` to the orphan REQ OR document scope extension |
| `spec-gate-b-b-halt` | Gate B (b) Scope conservation fails | Add scope-extension rationale OR amend the source ADR OR remove the REQ |
| `spec-gate-b-c-halt` | Gate B (c) TASK→REQ traceability fails | Add `implements [[REQ-N]]` to the orphan TASK OR author the missing REQ OR remove the TASK |
| `spec-gate-b-d-halt` | Gate B (d) Scope-In match fails | Align SPEC In Scope to Stage 1 cluster OR document scope-change rationale |

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Authoring SPEC root before children | Artifact Status listings reference non-existent notes | Author REQs → DESIGN → TASKs → SPEC root |
| 1:1 ADR-to-SPEC mapping when ADRs are cross-cutting | Inflates SPEC count; cross-cutting concerns repeated | Cluster by feature; surface cross-cutting ADRs as "ADR Cross-cutting Constraints" applied to multiple SPECs |
| Skipping Step 5 user approval after clustering | Authors the wrong decomposition; expensive to redo | Always surface; allow refinement loops |
| Premature `[x]` checkboxes in DRAFT specs | `[x]` means COMPLETED; misleads rollup | All checkboxes `[ ]` at draft; `/build` flips them |
| Asymmetric relations (`implements` without `implemented_by` inverse) | Breaks graph traversal + Jira hierarchy + note threading | Always add inverse in Step 6 |
| Bare entity references in body text | Breaks search-with-relations and wikilink expansion | Always `[[Entity Title]]` with colon matching target frontmatter |
| Skipping ADR coverage gate | Spec layer claims complete while ADRs remain unimplemented | Run the gate before declaring done |
| Skipping Gate A or B because "the spec looks fine" | Critic finds gaps the author missed | Both gates MANDATORY before DRAFT → ACCEPTED |
| Project-slug SPEC folder names (e.g., SPEC-001-polar-mcp) | Conflates project name with feature scope | Feature-themed slugs (e.g., SPEC-001-core-grid-display) |
| Skipping the CVA conditional at Tier ≥3 | Misses shared abstractions; locks divergent patterns | CVA is mandatory at Tier ≥3 with 2+ similar SPECs |

## Skill dispatch resolution (Contract 9)

For any skill name dispatched, check `~/.claude/skills/<name>/SKILL.md` first; if absent, check Brain plugin path. Never fall back to ai-agents.

**Skills (Skill dispatch — `Skill(skill="...")`):**

- `brain:---cva-analysis` → Brain plugin path (Stage 1 Step 3 conditional)
- `brain:---decision-critic` → Brain plugin path (Stage 1 Step 4 review)

**Agents (Task dispatch — `Task(subagent_type="...")`):**

- `brain:🧠-analyst` → Brain plugin agent (Stage 1 Step 1 SPEC clustering AND Stage 2 Gate A semantic gap analysis)
- `brain:🧠-critic` → Brain plugin agent (Stage 1 Step 4 review AND Stage 2 Gate B 4 binary drift checks)
- `brain:🧠-architect` → Brain plugin agent (Stage 2 dispatched per-note authoring if not orchestrator-driven)
- `brain:🧠-implementer` → Brain plugin agent (Stage 2 dispatched TASK authoring if not orchestrator-driven)

**EXCLUDED**: `golden-principles`, `taste-lints` (Brain not aligned).

### Role of /spec in the rigid cycle

> /spec authors the CHECKBOX CONTRACTS the rigid cycle later validates. Every TASK note MUST have a `## Definition of Done` checkbox list — that is the implementer's contract. Every REQ note MUST have a `## Acceptance Criteria` EARS-format checkbox list — that is the QA contract. DESIGN notes MAY include a `## Compliance` or `## Architecture Compliance` checkbox list when the design choices admit binary verification. /spec produces notes whose checkbox shapes pass the X.D.5/6/7 schemas (TaskNoteSchema / RequirementNoteSchema / DesignNoteSchema). Vague prose without a verifiable checkbox = a gap the build cycle cannot close.

## Rigid per-TASK build+QA cycle

When a SPEC enters build, the orchestrator advances ONE TASK at a time through a fixed sequence. NO step may be skipped or reordered, NO batching, NO shortcuts.

For each `TASK-NNN-SPEC-MMM` in the SPEC:

a. PLAN transition `impl-TASK-NNN PENDING → IN_PROGRESS` (FIRST action)
b. Session note Event appended capturing transition
c. Git commit
d. Orchestrator dispatches implementer; brief = rendered impl item content verbatim from PLAN
e. Implementer reads ENTIRE spec subtree, implements ONLY this TASK, marks DoD `[x]` per item satisfied
f. Implementer returns `## State Changes` (this TASK only)
g. Session note Event
h. PLAN transition `impl-TASK-NNN IN_PROGRESS → DONE`
i. Git commit (code + PLAN + session note atomically)
j. PLAN transition `qa-TASK-NNN PENDING → IN_PROGRESS`
k. Session note Event
l. Git commit
m. Orchestrator dispatches QA; brief = rendered qa item content verbatim from PLAN
n. QA reads ENTIRE spec, evaluates each linked DoD + REQ AC + DESIGN compliance checkbox individually with evidence
o. QA writes per-checkbox findings to `TEST-REPORT-NNN-SPEC-MMM-{task-slug}.md` via Pattern 2 three-phase write
p. QA returns verdict ONLY: `PASS` or `FAILED + see TEST-REPORT-NNN`
q. Session note Event
r. Orchestrator updates TASK note with `validated_by` relation to TEST-REPORT
s. On PASS: PLAN `qa-TASK-NNN → DONE`; TASK note status → DONE. On FAILED: PLAN `qa-TASK-NNN → FAILED`; PLAN `impl-TASK-NNN DONE → IN_PROGRESS`; orchestrator translates QA findings into a fix-brief that quotes each unchecked item verbatim with QA evidence
t. Git commit
u. Move to TASK N+1; repeat from (a)

## Checkbox-as-contract

Implementer and QA do NOT figure out what counts as done from prose. The contract is mechanical:

- `TASK ## Definition of Done` checkboxes — implementer's build contract
- `REQ ## Acceptance Criteria` (EARS Given/When/Then) — QA validates against these
- `DESIGN ## Compliance` or `## Architecture Compliance` checkboxes (when present) — QA validates against these

When dispatching implementer: brief MUST quote the TASK DoD verbatim + link the linked REQs/DESIGNs.

When dispatching QA: brief MUST quote the TASK DoD + linked REQ AC + linked DESIGN compliance verbatim + state per-item PASS/FAIL/PARTIAL evidence goes to TEST-REPORT.

## Schema-validated agent-claim verification

The composition library at `_shared/composition/` provides programmatic validators:

- `TaskNoteSchema` + `validateTaskDoneClaim()` — rejects implementer "DONE" claim if any DoD `[ ]` unsatisfied
- `RequirementNoteSchema` + `validateRequirementAcClaim()` — rejects REQ ACCEPTED if any AC `[ ]`
- `DesignNoteSchema` + `validateDesignComplianceClaim()` — same for DESIGN
- `SpecRootNoteSchema` + `validateSpecDoneClaim()` — same for SPEC root
- `TestReportNoteSchema` + `validateTestReportPassClaim()` + schema superRefine — rejects QA "PASS" that doesn't match per-row results

Lying agents are mechanically caught.

## Defense in depth

This protocol embeds at every enforcement layer. Single-layer enforcement fails under load.

## Reference files

- `references/spec-decomposition.md` — Stage 1 full pipeline (Steps 0-7) with halt conditions + anti-patterns
- `references/spec-authoring.md` — Stage 2 full pipeline (Steps 1-6 + Phase 3 + ADR coverage gate + Gate A + Gate B) with halt conditions + anti-patterns
- `references/spec-templates.md` — Canonical REQ + DESIGN + TASK + SPEC root note templates with required sections + content depth
- `references/bi-directional-relation-closure.md` — Step 6 closure procedure with full inverse-verb table + edit operations
- `references/authoring-workflow.md` — Phase 3 Validation script + ADR coverage gate procedure + Gate A/B briefs + verification checklist
