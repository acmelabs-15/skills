# Implementation Phase Workflow — Full Step 1-8 Pipeline

The complete `/build` pipeline for one approved SPEC. See SKILL.md for the high-level summary; this file has per-step detail with substeps, halt conditions, and the implementer dispatch brief structure.

## Pipeline overview

```text
Step 1: Read inputs (PLAN + part + SPEC + tier validation)
Step 2: brain:🧠-analyst tier classification
Step 2.5: Tier-driven oversight calibration
Step 3: Skill brain:---pre-mortem BEFORE coding
Step 4 STAGE A: per-TASK atomic cycle (loop)
Step 5 STAGE B: final spec-level QA sweep + coverage matrix
Step 6 STAGE C: spec-level propagation
Step 7: MANDATORY EXIT GATES (4 + Gate 5 conditional)
Step 8: set-part-done to /plan
```

## Step 1 — Read inputs

Read via Brain MCP:

1. `mcp__plugin_brain_brain__read_note({ identifier: "planning/plan-nnn-..." })` → identify `build.SPEC-NNN` part
2. `mcp__plugin_brain_brain__read_note({ identifier: "specs/SPEC-NNN-{slug}/spec-nnn-{slug}" })` → the SPEC root
3. For each REQ/DESIGN/TASK in the SPEC's Artifact Status: `read_note` to fully load the subtree

Validate:

- PLAN frontmatter `complexity_tier` set (HALT if missing)
- SPEC status is `ACCEPTED` (Stage 2 of /spec complete)
- Every TASK in Artifact Status exists at expected path
- Every TASK has `status: TODO` (PASSED status would imply prior /build invocation; G2 resume handles)

**G2 resume**: skip Step 1 if a prior /build invocation already validated inputs (e.g., PLAN ## Risks populated indicates Step 3 ran).

## Step 2 — Tier classification

```text
Task(subagent_type="brain:🧠-analyst")
```

Brief includes:

- The SPEC root + REQ + DESIGN + TASK notes (full subtree)
- The PLAN frontmatter `complexity_tier` (existing classification)
- 5-tier rubric (entry / mid / senior / staff / principal)

Analyst returns tier + confidence + rationale specific to the SPEC's workload (which may differ from PLAN-level tier — e.g., a Tier 3 PLAN with a Tier 2 SPEC).

If SPEC-level tier differs from PLAN-level: surface to user via AskUserQuestion:

> "PLAN-NNN is `complexity_tier: TIER_3`. SPEC-NNN-level analyst returns `TIER_2`. Use SPEC tier for /build oversight calibration, OR PLAN tier (more conservative)?"

Default Recommended: SPEC-level tier (more specific to the actual workload).

## Step 2.5 — Tier-driven oversight

The oversight level calibrates Step 4 per-TASK cycle behavior:

| Tier | Stage A behavior |
|---|---|
| 1-2 | Proceed directly to per-TASK loop; async user review sufficient (user can check after the fact) |
| 3 | After Step 4 first TASK completes, AskUserQuestion: "First TASK done: [[TASK-1-SPEC-NNN]] outcome [[TEST-REPORT-...]]. Surfaced approach: <implementer summary>. Continue with remaining TASKs, refine approach, or pause?" |
| 4-5 | BEFORE Step 4 first TASK: AskUserQuestion to confirm implementation approach (analyst-recommended approach from Step 2 brief). Then build a SMALL PoC TASK first (typically the riskiest or most-foundational TASK from the SPEC). Get user sign-off on PoC outcome. THEN proceed with remaining TASKs |

## Step 3 — Pre-mortem (BEFORE coding)

```text
Skill(skill="brain:---pre-mortem")
```

Runs against the SPEC + DESIGN + REQ set (NOT against code — there is no code yet). Output: top 2-3 critical risks.

Record risks in PLAN `## Risks` section via `mcp__plugin_brain_brain__edit_note`. Format:

```markdown
## Risks (from /build pre-mortem on SPEC-NNN)

- **Risk 1**: {description}
  - Mitigation: {what implementer/orchestrator does to mitigate}
- **Risk 2**: {description}
  - Mitigation: ...
- **Risk 3**: {description}
  - Mitigation: ...
```

The risks inform Step 4a implementer dispatch briefs ("watch for: <risk-name>; mitigation: <mitigation>").

If pre-mortem surfaces a risk that **invalidates** the SPEC (e.g., a foundational REQ is impossible given a constraint): HALT via `build-step3-spec-invalidated-halt`; surface to user; require /spec revision. The /build cycle cannot proceed until the SPEC is revised + re-approved.

## Step 4 — STAGE A per-TASK atomic cycle

For each TASK in dependency order (read from TASK frontmatter `depends_on` relations), execute substeps 4a-4g.

### 4a — Implementer dispatch (foreground)

```text
Task(subagent_type="brain:🧠-implementer")
```

Dispatch brief MUST include:

#### TDD directive (when project has tests)

```text
If the project has a test framework, write a failing test for each acceptance
criterion BEFORE implementation code. Per-slice sequence:
  failing test → minimum code to pass → refactor → commit

Skip TDD only if no test framework exists OR this TASK is non-code (docs, config).
```

#### Canonical-source-mirror constraint

```text
If implementation code claims to match, mirror, or align with an existing source
(regex, schema, interface, exit-code table, prior pattern), the first commit MUST:
  - Cite the canonical source path (file:line)
  - Quote the contract verbatim in code comments OR commit body
  - Document any intentional divergence inline with justification

This prevents drift between mirroring code and the source it claims to follow.
```

#### Evidence hierarchy

```text
For any claim about existing code or contracts, cite evidence in this priority order:
  1. Tool output (test runs, type checks, lint, Brain MCP search results)
  2. Files actually read in this dispatch (cite path:line)
  3. Web/docs search results (cite URL or canonical source)
  4. Training-data knowledge (LOWEST priority — never assert from training alone
     for load-bearing claims)

Never claim "this is how X works" without evidence from one of the top 3 sources.
```

#### Quality self-check questions (during implementation)

```text
Ask yourself during implementation:
  1. Is this hard to test? (design problem indicator)
  2. Does every method read like a sentence? (Programming by Intention)
  3. Is coupling intentional or accidental?
  4. Would a stranger understand this without asking questions?

If any answer is "no" or "uncertain," refactor before continuing.
```

#### Memory-first gate (per G3)

```text
Before changing any existing code/architecture/protocol, search Brain memory for
related context via mcp__plugin_brain_brain__search. Search-query patterns:
  Remove existing constraint  → [constraint name]
  Bypass existing protocol    → [protocol name] why
  Delete >100 lines           → [component] purpose
  Refactor complex code       → [component] edge case

Document findings in commit body or TASK note Observations. Only then proceed.
```

#### Pre-mortem risk briefing (from Step 3)

```text
Pre-mortem identified critical risks:
  Risk 1: {description} | Mitigation: {mitigation}
  Risk 2: {description} | Mitigation: {mitigation}
  Risk 3: {description} | Mitigation: {mitigation}
Watch for these during implementation; apply mitigations preemptively.
```

#### TASK scope + DoD

```text
TASK: [[TASK-NNN-SPEC-NNN: {Title}]]

Objective: {from TASK note Objective section}

Files Affected (from TASK note):
| File | Action | Purpose |
| {table from TASK note}

Definition of Done (from TASK note):
- [ ] {DoD item 1, traces to REQ-NNN}
- [ ] {DoD item 2, traces to REQ-NNN}
- (per the TASK note's DoD checklist)

ADR Compliance (from TASK note):
- [ ] {ADR constraint 1}
- [ ] (per the TASK note's ADR Compliance checklist)

Return: list of files changed + test results + `## State Changes` section
listing every status transition (e.g., `TASK-NNN-SPEC-NNN: TODO → DONE`).
```

Implementer runs foreground (per the foreground-permission-tools principle); orchestrator awaits return before proceeding.

### 4b — Process State Changes (status enum crosscheck)

Implementer returns `## State Changes` section. For each entry:

1. Parse the entity ID + status transition (e.g., `TASK-001-SPEC-001: TODO → IN_PROGRESS`)
2. Cross-check status values against Contract 7 enum:
   - Task notes: `TODO | IN_PROGRESS | DONE | BLOCKED`
3. HALT via `build-step4b-invalid-status-halt` on any non-canonical status (e.g., "TESTING", "READY", "WIP")
4. On valid transitions: apply via Brain MCP `edit_note` (find_replace on TASK frontmatter status line)

### 4c — QA dispatch

```text
Task(subagent_type="brain:🧠-qa")
```

Brief:

- The TASK note + parent SPEC + applicable ADRs
- The implementer's State Changes + summary of changes
- The TASK's DoD checklist (now annotated with implementer's `[x]` marks for completed items)
- Mandate: "Verify each DoD item passes. Cite test results (`bun test`, `pytest`, etc.) per item. Surface regressions in adjacent modules. Reviewer-asymmetry framing — review as a stranger; cite file:line evidence."

QA writes `TEST-REPORT-NNN-SPEC-NNN-{task-slug}.md` to `docs/qa/` via Brain MCP Pattern 2 three-phase. Frontmatter status: `PASS | FAIL | PARTIAL`.

### 4d — On QA FAIL: fix-implementer loop

If QA returns `FAIL` OR `PARTIAL` with critical findings:

1. Dispatch fix-implementer (same `brain:🧠-implementer` agent, different brief) with the QA findings as context
2. Wait for return
3. Re-dispatch QA (substep 4c) on the fixed TASK
4. Loop until QA PASS

**Max 3 fix iterations**. After 3 iterations without PASS: HALT via `build-step4d-iteration-halt`; surface QA findings + implementer attempts to user; user intervenes (typically: revise the TASK scope, escalate to PoC, or defer the TASK).

### 4e — State propagation

After QA PASS:

1. TASK frontmatter `status: IN_PROGRESS → DONE` via Brain MCP `edit_note`
2. Add outcome observation: `- [outcome] TASK completed: {1-line summary} #task #done`
3. Add `validated_by [[TEST-REPORT-NNN-SPEC-NNN: ...]]` relation to TASK Relations
4. Add inverse `validates [[TASK-NNN-SPEC-NNN: ...]]` to TEST-REPORT Relations

Two-step edit pattern: TASK edit → SESSION Event NN append (Type: `state-change`; Outcome: `TASK-NNN-SPEC-NNN: IN_PROGRESS → DONE; validated_by [[TEST-REPORT...]]`).

### 4f — sync-jira push

```text
Skill(skill="sync-jira", args="push target=[[TASK-NNN-SPEC-NNN: ...]]")
```

Pushes TASK status + description to the corresponding Jira ticket. If sync-jira returns failure (network error, missing credentials, ticket mismatch): emit `build-step4f-sync-jira-halt`; surface to user; user adjudicates (retry, skip, manual sync).

### 4g — PLAN tick + atomic commit

1. Edit PLAN body via `mcp__plugin_brain_brain__edit_note` to mark the TASK's DoD checkbox `[x]` in PLAN's build.SPEC-NNN part body
2. Project repo commit (`git add . && git commit -m "build: {task-slug} done"`)

The commit covers BOTH source code changes AND Brain note edits (TASK status, SESSION Event, PLAN tick, TEST-REPORT) — atomic per TASK.

Loop returns to step 4a for the next TASK in dependency order.

## Step 5 — STAGE B final spec-level QA sweep

### 5a — Spec-level QA dispatch

```text
Task(subagent_type="brain:🧠-qa")
```

Brief includes:

- Full SPEC scope (root + REQ + DESIGN + TASK notes)
- All per-task TEST-REPORTs from Stage A
- Mandate: "Verify spec-level integration. Cross-task integration tests pass; no regressions across the SPEC. Verify EACH REQ EARS clause has at least one test in the per-task TEST-REPORTs."

QA writes `TEST-REPORT-NNN-SPEC-NNN-spec-level.md` to `docs/qa/` with frontmatter status `PASS | FAIL | PARTIAL`.

### 5b — Coverage matrix

For each REQ in the SPEC:

- Extract EARS clauses + GIVEN/WHEN/THEN acceptance criteria
- For each clause, search per-task TEST-REPORTs for evidence the clause is tested
- Build a coverage matrix: REQ × TEST-REPORT × test-name

Any REQ EARS clause without ≥1 test: HALT via `build-step5b-coverage-halt`; surface to user. Resolution: (a) add a new TASK + TEST-REPORT to cover, or (b) revise an existing TEST-REPORT to cover.

## Step 6 — STAGE C spec-level propagation

See `state-propagation.md`. Summary:

- If parent EPIC exists: flip EPIC's per-SPEC checklist entry via `edit_note`
- `Skill(skill="sync-jira", args="push target=[[SPEC-NNN: ...]]")`
- PLAN tick for SPEC-level completion (mark the SPEC's overall checkbox in PLAN body)
- Atomic commit covering EPIC + SPEC + PLAN edits + SESSION Event

## Step 7 — MANDATORY EXIT GATES

See `exit-gates.md` for per-gate details including Gate 5 trigger detection heuristics + coverage-gap handling. Summary in SKILL.md halt-block table.

## Step 8 — set-part-done

```text
Skill(skill="plan", args="set-part-done plan=PLAN-NNN part=build.SPEC-NNN outcome=[[SPEC-NNN: ...]] status=DONE")
```

Per Contract 1. /plan flips `build.SPEC-NNN` part status → DONE; sets `completing_session`; surfaces next-ready part.

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Skipping pre-mortem because "small SPEC" | Small SPECs still produce surprises | Always run Step 3 regardless of size |
| Running exit gates per-TASK | Gates are spec-level | Gates run ONCE per /build after Stage C |
| Pushing to sync-jira before TASK DONE flip | Jira drifts ahead of source-of-truth | Step 4e state propagation FIRST, then 4f sync-jira |
| Fix-implementer loop without cap | Infinite loop possibility | Max 3 iterations; HALT for user intervention |
| Implementer dispatch without TDD/canonical-source-mirror briefs | Code drifts from spec; mirroring claims unverified | Brief MUST include all 5 directives (TDD/canonical-source-mirror/evidence-hierarchy/quality-self-check/memory-first) |
| Per-TASK QA findings accumulated across multiple TASKs | Each TASK should close its own QA cycle | Stage A is atomic per TASK |
| Running pre-mortem AFTER coding | Defeats purpose | Step 3 BEFORE Step 4 always |
| Spec-level QA sweep without coverage matrix | Untested REQs ship | Step 5b coverage matrix is BLOCKING |
| Pre-flight skipping Step 1 SPEC ACCEPTED check | /build runs on a DRAFT SPEC; quality issues compound | Always verify SPEC status |
