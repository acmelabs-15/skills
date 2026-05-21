# Orchestrator Workflow Routing Protocol

Six-step protocol executed by `/plan create` mode to identify the workflow type before authoring the PLAN. Sourced from D-02. The protocol walks the orchestrator agent's reconnaissance sections in order; the output is a workflow-type classification that drives the PLAN's phase structure + per-tier calibration.

The orchestrator agent definition lives at `~/.claude/plugins/cache/brain/brain/<version>/agents/orchestrator.md`. The protocol steps below are the user-facing summary; consult the agent file for full per-step heuristics.

## Step 1 — Triage

Determine if orchestration is even needed. Some tasks are trivial enough to skip the routing protocol entirely (e.g., a single-file edit, a one-line documentation fix). For non-trivial work, proceed.

**Outputs**: bypass-protocol decision (yes/no). If yes: PLAN-less workflow; the skill should have been invoked differently (surface to user). If no: proceed to Step 2.

## Step 2 — Clarification Gate

Assess whether clarification is needed before routing. Ask rather than assume. Use `AskUserQuestion` to surface ambiguity (per Contract 4 5-field template).

Common clarifications:

- Scope ambiguity ("Are you asking to refactor X, or to add Y feature that uses X?")
- Audience ambiguity ("Is this for internal users, external customers, or both?")
- Constraint ambiguity ("Must this work without changing the public API, or are breaking changes OK?")
- Success-criteria ambiguity ("How will you know this is done?")

**Outputs**: clarified scope statement (verbatim user response). If user defers all clarifications: proceed with explicit assumptions documented in PLAN Scope.

## Step 3 — Task Classification

Classify the work along three dimensions:

- **Task type**: feature / bug-fix / refactoring / research / documentation / security / infrastructure / strategic / ideation / specification / pr-comment / other
- **Complexity**: Simple / Standard / Complex (drives `complexity_tier` per Contract 8 — see Step 6 for explicit tier mapping)
- **Risk level**: Low / Medium / High / Critical

Heuristics:

- Touches multiple subsystems → Standard or Complex
- Touches auth / credentials / data handling → High or Critical risk
- Reversible (easy rollback) → Low or Medium risk
- Irreversible (data migration, schema change) → High or Critical risk
- New capability (no analog exists) → Complex
- Improving existing pattern → Simple or Standard

**Outputs**: `{task_type, complexity, risk_level}` triple.

## Step 4 — Domain Identification

Identify the number + names of affected domains. A domain is a coherent area of the codebase or product (e.g., auth, payments, search, UI, infra, observability, docs).

- 1 domain → standard workflow
- 2 domains → multi-domain workflow (may need impact analysis)
- 3+ domains → multi-domain with impact analysis

**Outputs**: `{primary_domain, secondary_domains}` list.

## Step 5 — Workflow Paths

Map the task classification + domain count to one of these canonical paths:

| Path | When |
|---|---|
| Quick fix | Simple task, 1 domain, Low risk, no specification needed |
| Standard | Standard task, 1-2 domains, Low-Medium risk |
| Strategic | Complex task involving roadmap/strategy decisions |
| Specification | Spec-authoring workflow (downstream of accepted ADRs) |
| Multi-domain | 3+ domains; needs impact analysis |
| Research / Ideation | Exploratory workflows surfacing options before decisions |
| Security | Security-touching changes; mandatory security agent involvement |
| Infrastructure | DevOps / CI / build / infra changes |

**Outputs**: workflow path label.

## Step 6 — Workflow Definition / Identification

Combine task type + domains + workflow path → identify the canonical workflow. Use the agent-sequence cheat-sheet below:

| Workflow Type | Agent Sequence | Phase H2s for PLAN |
|---|---|---|
| Feature (multi-step) | analyst → planner → implementer → qa | research · decisions · spec · build · review · end |
| Feature (multi-domain) | analyst → architect → planner → critic → implementer → qa | research · decisions · spec · build · review · end (with architecture emphasis in decisions) |
| Feature (multi-domain w/ impact analysis) | analyst → architect → planner → [impact: implementer, architect, security, devops, qa] → critic → implementer → qa | research · decisions · spec · build · review · end (extended decisions w/ impact analysis sub-cycle) |
| Bug Fix (multi-step) | analyst → implementer → qa | research (analyst only) · build · review · end |
| Bug Fix (simple) | implementer → qa | build · review · end (no research/decisions; trivial scope) |
| Security | analyst → security → architect → critic → implementer → qa | research · decisions · spec · build · review · end (security agent gated in decisions + review) |
| Infrastructure | analyst → devops → security → critic → qa | research · decisions · build · review · end (devops emphasis) |
| Research | analyst (standalone) | research only (terminal at `research` part DONE; no decisions/spec/build) |
| Documentation | explainer → critic | research · build · review · end (build = doc-writing) |
| Strategic | roadmap → architect → planner → critic | research · decisions · spec · review · end (roadmap-driven) |
| Refactoring | analyst → architect → implementer → qa | research · decisions · spec · build · review · end |
| Ideation | analyst → high-level-advisor → independent-thinker → critic → roadmap → explainer → task-generator → architect → devops → security → qa | research (extended, multi-wave) · decisions (extended, multi-ADR) · spec · build · review · end |
| Specification | spec-generator → critic → architect → task-generator → implementer → qa | spec · build · review · end (skip research/decisions; ADRs already accepted upstream) |
| PR Comment (varies) | varies | Triage · (sub-workflow's phases) |

When the locked workflow doesn't map cleanly, surface the chosen phase H2s to the user via AskUserQuestion before writing the PLAN.

**Outputs**:

- Workflow type label (e.g., "Feature (multi-domain)")
- Agent sequence string
- Phase H2 list for the PLAN
- Initial `complexity_tier` recommendation (TIER_1 for Quick fix / Simple, TIER_2 for Standard, TIER_3 for Complex single-domain, TIER_4 for Multi-domain complex, TIER_5 for Strategic / Ideation)

The `complexity_tier` is a recommendation only at this stage; the canonical tier is set during `/research` Step 2 by `brain:🧠-analyst`. In `/plan create` mode without prior research, the Step 6 recommendation seeds the PLAN frontmatter as `TBD` with a note; the first downstream phase HALTs if still `TBD` per Contract 8.

## Output → PLAN authoring

The protocol's output feeds `/plan create` mode's Step 4 (Author PLAN with two-level decomposition):

| Protocol output | PLAN consequence |
|---|---|
| Workflow type label | Goes into PLAN Scope + frontmatter tags |
| Agent sequence | Documented in PLAN Scope (Agent Sequence row) |
| Phase H2 list | Each phase becomes an H2 with placeholder parts at create time |
| Primary + secondary domains | PLAN Scope (Primary Domain, Secondary Domains rows) |
| Complexity + risk + tier | PLAN frontmatter (`complexity_tier`) + Scope rows |

## Halt conditions

| Condition | Halt |
|---|---|
| User declines all clarifications + scope remains ambiguous | `plan-orchestrator-clarification-halt` |
| Task type unclassifiable | `plan-orchestrator-classification-halt` |
| Workflow path doesn't match the cheat-sheet | Surface to user; ask which path applies |
| Workflow type doesn't map to a known cheat-sheet entry | Surface phase H2 proposal; ask user to confirm |

## Anti-patterns

| Avoid | Why | Instead |
|---|---|---|
| Skipping clarification when ambiguity exists | Wrong workflow type → wrong PLAN structure → bad downstream work | Always run the Clarification Gate; AskUserQuestion when in doubt |
| Inferring task type from heuristics alone for ambiguous descriptions | Heuristics fail on novel descriptions | Ask the user |
| Picking a workflow path that includes more phases than needed | Inflates effort, slows execution | Pick the minimal path that covers the work |
| Setting `complexity_tier` without `/research` Step 2 | Tier is supposed to come from analyst classification | Set TBD in create mode; first downstream phase HALTs to classify |
| Bypassing the protocol because "it's obvious" | Surprises lurk in domain count + risk level | Always walk all 6 steps even briefly; document outputs |
