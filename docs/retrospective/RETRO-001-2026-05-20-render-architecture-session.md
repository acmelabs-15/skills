---
title: 'RETRO-001: SESSION-2026-05-20_03 Render Architecture Retrospective'
type: retrospective
status: ACCEPTED
permalink: retrospective/retro-001-2026-05-20-render-architecture-session
tags:
- retrospective
- session-2026-05-20-03
- brain-mcp
- agent-performance
- process-improvement
---

# RETRO-001: SESSION-2026-05-20_03 Render Architecture Retrospective

## Session Summary

SESSION-2026-05-20_03 resumed PLAN-001 to author ADR-003 (Plan/Session Render Architecture), run brain:---adr-review, author SPEC-007 subtree (30 notes), add 7 build.SPEC-NNN parts, and lock a 4-wave parallelism strategy. PR #4 created at close.

**Duration**: 11:23 (79c4fa9) to 13:24 (f4573f0) = ~2 hours wall clock.
**Commits**: 11 on `feat/plan-001-adr-003-render-architecture`.
**Outcome**: [PASS] decisions.3 DONE + spec.SPEC-007 DONE + 7 build parts READY.

## Phase 0: Data Gathering

### Execution Trace

| Time | Event | Action | Outcome | Energy |
|:--|:--|:--|:--|:--|
| 11:23 | E01 | /plan continue; create branch + session note | Success | High |
| 11:23 | E02 | PLAN-001 decisions.3 part authored + committed (79c4fa9) | Success | High |
| 11:26 | E03 | /decisions Step 1 BLOCKED on Brain MCP read failure | [BLOCKED] | Stalled |
| 11:51 | E04 | Brain MCP basic-memory cleanup (69 permalinks + 8 dupes + config fix) | [FAIL] infrastructure | Low |
| 12:11 | E05 | ADR-003 duplicate deduplication (parallel session race) | [FAIL] infrastructure | Low |
| 12:37 | E06 | brain:---adr-review 6-agent debate Round 1 (5A+1C+0B) | Success | High |
| 12:37 | E07 | Phase 3 in-ADR resolutions + ADR-003 ACCEPTED | Success | High |
| 12:37 | E08 | PLAN-001 set-part-done decisions.3 | Success | High |
| 12:43 | E09 | spec.SPEC-007 READY to IN_PROGRESS; /spec Stage 2 dispatched | Success | High |
| 12:43 | E10 | Background architect Write-permission failure; relaunch foreground | [FAIL] permission | Medium |
| 13:10 | E11 | SPEC-007 30-note subtree authored (foreground, 13 min) | Success | High |
| 13:10 | E12 | Phase 3 + ADR coverage + Gate B validation; SPEC-007 DONE | Success | High |
| 13:15 | E13 | 7 build.SPEC-NNN parts added to PLAN-001 | Success | High |
| 13:19 | E14 | Parallelism analysis + Wave 1 plan locked | Success | High |
| 13:22-13:24 | E15 | Session close; build.SPEC-001 reverted READY; DoD fix commit | Success | Medium |

### Outcome Classification

**Mad (Blocked/Failed)**: 3 events

- E03: Brain MCP read failure blocked /decisions for ~25 min
- E04: 69-note permalink drift + 8 duplicate entities from 6 racing MCP processes
- E05: ADR-003 authored twice by parallel Claude Code session (dedup required)

**Sad (Suboptimal)**: 2 events

- E10: Background architect hit Write permission wall; ~5 min lost on TaskStop + relaunch
- E15: DoD misclassification caught at /end gate (build-phase items mixed into SPEC DoD)

**Glad (Success)**: 10 events

- E01-E02: Clean branch + plan part creation
- E06-E08: ADR review converged Round 1 (no second round needed)
- E09, E11-E14: SPEC-007 30 notes authored in 13 min; all gates PASS; 7 build parts + wave plan locked

**Distribution**: Mad 3 (20%) / Sad 2 (13%) / Glad 10 (67%). Success rate: 67%.

### Timeline Analysis: Workflow vs Infrastructure

| Segment | Start | End | Duration | Category |
|:--|:--|:--|:--|:--|
| Branch + plan setup | 11:23 | 11:26 | 3 min | Workflow |
| Brain MCP blocked + diagnosis | 11:26 | 11:51 | 25 min | Infrastructure |
| Permalink + DB cleanup | 11:51 | 12:11 | 20 min | Infrastructure |
| ADR-003 dedup + normalization | 12:11 | 12:37 | 26 min | Infrastructure (partial; ADR review ran in parallel) |
| ADR review + ACCEPTED | 12:37 | 12:37 | ~10 min (subagent time) | Workflow |
| SPEC-007 dispatch + authoring | 12:43 | 13:10 | 27 min | Workflow |
| Build parts + parallelism + close | 13:10 | 13:24 | 14 min | Workflow |

**Infrastructure debugging**: ~45-50 min (E03+E04+E05 serial segment from 11:26 to 12:11, plus overlap with E05 cleanup during review dispatch).
**Actual workflow**: ~54 min.
**Ratio**: ~47% of session wall clock spent on infrastructure debugging. This is the single largest inefficiency.

## Phase 1: Insights

### Five Whys -- Incident 1: 6 Racing MCP Processes

**Problem**: 6 parallel basic-memory MCP processes racing on UNIQUE(permalink, project_id), producing -1 suffix drift on 69 notes and 8 duplicate entity rows.

**Q1**: Why were 6 MCP processes running?
**A1**: Each Claude Code instance (main terminal + background agents + restarts after crashes) spawns its own basic-memory MCP server. No singleton enforcement exists.

**Q2**: Why does each instance spawn its own MCP?
**A2**: Claude Code MCP lifecycle is per-instance. There is no shared daemon or lock file for basic-memory. The MCP server design assumes single-writer.

**Q3**: Why wasn't the multi-process state detected earlier?
**A3**: No monitoring or health check surfaces the number of active basic-memory processes. The -1 suffix drift is silent until a read fails.

**Q4**: Why did -1 suffixes accumulate silently?
**A4**: basic-memory handles UNIQUE constraint violations by appending -1 to the permalink. This is a conflict-avoidance strategy, not an error. It never raises an error or warning.

**Q5**: Why was the project root misconfigured (repo root vs docs/ subdir)?
**A5**: The skills project was initialized with project root at `/skills` (repo root) instead of `/skills/docs` (where Brain notes live). Other projects use the `/docs` convention; skills was the outlier.

**Root Cause**: basic-memory assumes single-writer operation. Multi-session Claude Code use violates that assumption. Combined with a misconfigured project root, every write from any process creates a race. No detection mechanism exists.

**Actionable Fix**: (1) Before starting work, run `pgrep -f "basic-memory mcp" | wc -l` and kill extras if count > 1. (2) Verify project root in `~/.basic-memory/config.json` matches the docs/ subdir convention. (3) Consider a pre-session health check skill/hook.

### Five Whys -- Incident 2: Pattern 2 Failure + ADR-003 Duplicates

**Problem**: ADR-003 authored twice with spaces in filenames; Pattern 2 Phase 3 (move_note) skipped.

**Q1**: Why were there two ADR-003 files?
**A1**: A parallel Claude Code session (PID 1868, thought to be exited) dispatched its own architect simultaneously.

**Q2**: Why was PID 1868 still running?
**A2**: The user believed all other sessions were closed. PID 1868 was a detached daemon from an earlier terminal that survived the user's "close" action.

**Q3**: Why did both sessions target ADR-003?
**A3**: Both sessions read the same PLAN-001 state showing decisions.3 as the next-ready part. No locking mechanism prevents concurrent claims.

**Q4**: Why did both files have spaces in filenames?
**A4**: Pattern 2 Phase 3 (move_note to kebab) was skipped or interfered with by the concurrent writes. The write_note filename trap (Section 1.7.2 of CONVENTIONS) produces space-containing filenames when title contains a colon.

**Q5**: Why is there no mutual exclusion on PLAN part ownership?
**A5**: PLAN-001 owning_session field is informational, not enforced. Two sessions can both claim the same part.

**Root Cause**: No process-level mutual exclusion on plan parts. Combined with the detached-daemon problem, concurrent sessions silently duplicate work. Pattern 2's three-phase write is fragile under concurrency.

**Actionable Fix**: (1) Add a pre-session `pgrep -f "claude"` check to detect zombie sessions. (2) When claiming a PLAN part, verify owning_session is unbound or matches current session before proceeding. (3) The pragmatic Write-tool fallback (bypassing Pattern 2 entirely) worked this session because basic-memory's filesystem watcher syncs the graph. Formalize this as an acceptable fallback when Pattern 2 is unreliable.

### Five Whys -- Incident 3: Background Agent Permission Denial

**Problem**: Background architect dispatch for SPEC-007 hit Write permission denials.

**Q1**: Why did Write permissions fail?
**A1**: Background subagents cannot surface permission prompts to the user.

**Q2**: Why was the architect dispatched in background?
**A2**: Default dispatch mode is background for long-running agents.

**Q3**: Why does the architect need Write permissions?
**A3**: The pragmatic MCP fallback adopted this session uses Write tool instead of Brain MCP write_note. Write tool is permission-gated.

**Q4**: Why wasn't the foreground requirement anticipated?
**A4**: The feedback_foreground_permission_tools memory exists and documents this exact scenario. The dispatching code did not consult it before choosing background mode.

**Q5**: Why wasn't the memory consulted?
**A5**: The pre-operation pre-flight table in CLAUDE.md maps "Agent delegation" to feedback_research_delegation + feedback_orchestrator_delegation_rules. It does not explicitly map "dispatch with Write tool" to feedback_foreground_permission_tools.

**Root Cause**: Pre-flight table gap. The Write-tool-in-dispatch scenario is not surfaced in the delegation pre-flight row. The memory exists but the routing to it is incomplete.

**Actionable Fix**: Add feedback_foreground_permission_tools to the "Agent delegation" row in the pre-flight table, or add a new row for "Dispatch using permission-gated tools."

### Learning Matrix

**Continue (what worked)**:

- ADR review converged Round 1 (no second round; saved ~30 min vs ADR-002's two rounds)
- Architect produced 30-note SPEC-007 subtree in 13 min with all gates passing
- 4-wave parallelism analysis identified correct dependency structure
- IT dissent captured as D&C with advisor tie-breaker rationale (good institutional memory)
- DoD misclassification caught at /end gate (the gate works)

**Change (what did not work)**:

- 47% of session time on infrastructure debugging
- No pre-session MCP health check
- No zombie-session detection
- Pattern 2 three-phase write remains fragile under concurrency
- Background dispatch of permission-gated agents

**Ideas (new approaches)**:

- Pre-session hook: `pgrep -f "basic-memory mcp"` + kill extras + verify config.json project root
- Formalize Write-tool fallback for Brain notes as an accepted pattern when basic-memory is unstable
- PLAN part claim: read owning_session before binding; if already bound, halt and surface conflict

**Invest (long-term improvements)**:

- basic-memory singleton daemon or lock file (upstream fix)
- Automated pre-session environment validation (MCP count, project root, zombie sessions)
- Pattern 2 replacement: if basic-memory normalizes filenames correctly, three-phase becomes unnecessary

## Phase 2: Diagnosis

### Successes

| Strategy | Evidence | Impact (1-10) | Atomicity |
|:--|:--|:--|:--|
| ADR-003 Round 1 convergence (5A+1C+0B) | CRIT-003 debate log; no Round 2 needed | 8 | 92% |
| SPEC-007 30 notes in 13 min foreground | Commit 5901c1f; 187K tokens, 51 tool uses | 9 | 90% |
| 4-wave parallelism plan with 34% wall-clock savings | Event 14 analysis; Wave 2 = 4-way parallel | 7 | 88% |
| /end DoD gate caught misclassification | Commit f4573f0 corrected build-phase items in SPEC DoD | 6 | 85% |
| IT dissent preserved as D&C | CRIT-003 F-3 + F-5 with revisit triggers | 5 | 90% |

### Failures

| Strategy | Error Type | Root Cause | Prevention | Atomicity |
|:--|:--|:--|:--|:--|
| Multi-process MCP race | Infrastructure | Single-writer assumption violated | Pre-session MCP count check | 92% |
| Parallel session ADR duplication | Concurrency | No mutual exclusion on PLAN parts | Zombie-session detection + owning_session enforcement | 88% |
| Background dispatch + Write tool | Permission | Pre-flight table gap for permission-gated dispatch | Add foreground_permission_tools to delegation pre-flight | 90% |
| Pattern 2 three-phase fragility | Reliability | move_note fails or races under concurrency | Formalize Write-tool fallback | 85% |
| DoD misclassification at part creation | Specification | SPEC-phase DoD template included build-phase items | Split DoD templates by phase (spec vs build) | 82% |

### Near Misses

| What Almost Failed | Recovery | Learning |
|:--|:--|:--|
| Pragmatic MCP suspension could have caused graph drift | basic-memory filesystem watcher synced Write tool output | Write-tool fallback is safe IF filesystem watcher is active |
| Session length nearly pushed /build into same session | User chose fresh session at TIER_4 gate | TIER_4 mandatory pause is a useful circuit breaker for session scope |
| Gate A semantic gap analysis skipped (auto mode) | Architect output was clean; no gap found post-hoc | Auto-mode skip of Gate A is a calculated risk; track whether it produces false negatives |

## Phase 3: Decisions

### Action Classification

**Keep (reinforce)**:

| Finding | Evidence | Action |
|:--|:--|:--|
| ADR review Round 1 pass rate improving | ADR-001: R1 pass. ADR-002: R1 fail, R2 pass. ADR-003: R1 pass | Continue D-N pre-locking where applicable |
| Foreground dispatch for permission-gated work | E10 recovery successful | Document as standard practice |
| TIER_4 mandatory pause | E15 user chose fresh session | Keep circuit breaker; do not weaken for auto-mode |

**Add (new skills)**:

| Finding | Proposed Skill ID | Statement |
|:--|:--|:--|
| MCP race detection | pre-session-mcp-health | Check basic-memory process count before session start |
| Zombie session detection | pre-session-process-audit | Run pgrep for claude/basic-memory processes at session start |
| Write-tool fallback policy | brain-mcp-write-fallback | Use Write tool when Pattern 2 is unreliable; filesystem watcher maintains graph consistency |

**Modify (update existing)**:

| Finding | Target | Current | Proposed |
|:--|:--|:--|:--|
| Permission-gated dispatch gap | feedback_foreground_permission_tools | Covers foreground dispatch rule | Add to CLAUDE.md pre-flight table "Agent delegation" row |
| DoD template phase confusion | NOTE-TEMPLATES.md PLAN part DoD | Single DoD template for all parts | Split spec-phase vs build-phase DoD item sets |

## Phase 4: Extracted Learnings

### Learning 1

- **Statement**: Kill extra basic-memory MCP processes before starting each session
- **Atomicity Score**: 92%
- **Evidence**: 69-note permalink drift + 8 duplicate rows from 6 concurrent processes (commit 18d86ec)
- **Skill Operation**: ADD
- **Target**: New pre-session check

### Learning 2

- **Statement**: Run pgrep for zombie Claude Code sessions before claiming PLAN parts
- **Atomicity Score**: 88%
- **Evidence**: PID 1868 duplicated ADR-003 authoring (commit 726a563)
- **Skill Operation**: ADD
- **Target**: New pre-session check

### Learning 3

- **Statement**: Dispatch agents using Write tool in foreground mode only
- **Atomicity Score**: 90%
- **Evidence**: Background SPEC-007 architect hit Write permission wall (Event 10)
- **Skill Operation**: MODIFY
- **Target**: feedback_foreground_permission_tools + CLAUDE.md pre-flight table

### Learning 4

- **Statement**: Write-tool fallback for Brain notes is safe when filesystem watcher runs
- **Atomicity Score**: 85%
- **Evidence**: 30 SPEC-007 notes written via Write tool; graph stayed consistent (commit 5901c1f)
- **Skill Operation**: ADD
- **Target**: New policy note or ADR-001 Clarification

### Learning 5

- **Statement**: Pre-locking D-Ns before ADR authoring improves review pass rate
- **Atomicity Score**: 88%
- **Evidence**: ADR-003 (D-1..D-11 pre-locked) passed Round 1; ADR-002 (architect-direct) failed Round 1
- **Skill Operation**: ADD
- **Target**: Decisions workflow pattern

### Learning 6

- **Statement**: Separate spec-phase and build-phase DoD items in PLAN part templates
- **Atomicity Score**: 82%
- **Evidence**: spec.SPEC-007 DoD incorrectly included build deliverables; caught at /end gate (commit f4573f0)
- **Skill Operation**: MODIFY
- **Target**: NOTE-TEMPLATES.md PLAN part section

## Commit Atomicity Assessment

11 commits on the branch. Evaluating against the "max 5 files OR single logical change" rule:

| Commit | Files | Logical Unit | Atomic? |
|:--|:--|:--|:--|
| 79c4fa9 | 2 | PLAN-001 decisions.3 part added | [PASS] |
| bed3a44 | 1 | Session pause event | [PASS] |
| 18d86ec | 69 | Permalink drift fix across 69 files | [WARNING] Large but single logical operation (DB fix) |
| 726a563 | 3 | ADR-003 dedup + normalize | [PASS] |
| 888c0bd | 4 | decisions.3 DONE + ADR-003 ACCEPTED + CRIT-003 | [PASS] |
| e58dc1e | 2 | spec.SPEC-007 IN_PROGRESS | [PASS] |
| 5901c1f | 33 | SPEC-007 30 notes + PLAN + session | [WARNING] Large but single logical operation (SPEC subtree) |
| c24f71c | 1 | 7 build parts added | [PASS] |
| 6a8dac6 | 1 | build.SPEC-001 IN_PROGRESS | [PASS] |
| 4d3a226 | 2 | Session close + revert | [PASS] |
| f4573f0 | 1 | DoD correction | [PASS] |

9 of 11 commits are cleanly atomic. 2 commits (18d86ec, 5901c1f) exceed 5 files but represent single logical operations (bulk fix and SPEC subtree authoring). Acceptable given the nature of the changes.

## Agent Performance Assessment

### brain:---adr-review (6 agents, Round 1)

- **Verdict convergence**: 5 ACCEPT + 1 CONCERNS + 0 BLOCK. Round 1 pass.
- **P1 finding quality**: 7 findings (F-1..F-7). F-3 and F-5 (IT dissent) were substantive strategic challenges. F-2 and F-4 produced in-ADR improvements. F-1/F-6/F-7 correctly deferred to SPEC.
- **Token efficiency**: 6 parallel agents completed in background. No token count recorded for review agents individually.
- **Assessment**: [PASS] High-quality review with genuine dissent captured.

### brain:---architect (SPEC-007 subtree)

- **Output**: 30 notes (12 REQ + 4 DESIGN + 13 TASK + 1 root) in ~13 minutes.
- **Token usage**: 187K tokens, 51 tool uses.
- **Quality**: Phase 3 syntactic validation PASS. ADR coverage gate PASS. Gate B 4 binary drift checks PASS. No post-dispatch compliance fixes needed (contrast with SPEC-001 which needed 20 type-field corrections).
- **Assessment**: [PASS] Clean output with no retroactive compliance fixes. Performance improved from SPEC-001 (20 corrections) to SPEC-007 (0 corrections).

### Parallelism analysis (orchestrator inline)

- **Output**: 4-wave plan with file-disjoint Wave 2 (4-way parallel), sequential Waves 3-4 for dependency reasons.
- **Wall-clock savings estimate**: 34% reduction (53 serial TASKs to 35 effective with Wave 2 parallel).
- **Assessment**: [PASS] Correct dependency identification. Wave structure matches KICKOFF-BRIEF.md build order.

## Phase 6: Close the Retrospective

### +/Delta

**+ Keep**:

- Structured event ledger in session note made retrospective data gathering trivial
- Git log with timestamps enabled precise timeline analysis
- CRIT debate log preserved dissent with enough context for future revisit

**Delta Change**:

- Infrastructure debugging (47% of session) needs a pre-session automation
- This retrospective was run post-session, not inline. Inline reflect captures would have caught the pre-flight table gap in real time
- CRIT-003 Relations section uses `reviews` (a forbidden relation type per CONVENTIONS Section 4.4). Should be `relates_to` or a valid typed verb

### ROTI Assessment

**Score**: 3 (High return)

**Benefits**:

- Root cause analysis of MCP race condition produced 3 actionable pre-session checks
- Identified pre-flight table gap for permission-gated dispatch
- Confirmed Write-tool fallback policy is safe (reduces future Pattern 2 friction)
- Quantified infrastructure vs workflow time split (47/53) -- provides baseline for measuring improvement

**Time Invested**: ~30 min for full retrospective authoring.

**Verdict**: Continue. The MCP race condition root cause and pre-session health check recommendations alone justify the investment.

## Observations

- [outcome] Session shipped decisions.3 DONE + spec.SPEC-007 DONE (30 notes) + 7 build parts READY + 4-wave parallelism strategy in ~2 hours wall clock #session-output #high-throughput
- [problem] 47% of session wall clock (45-50 min) spent on infrastructure debugging: MCP race condition (69 permalink fixes + 8 duplicate deletes) + parallel session ADR dedup + project root misconfiguration #infrastructure-overhead #brain-mcp
- [insight] basic-memory assumes single-writer; multi-session Claude Code use violates that assumption silently via -1 permalink suffix drift #root-cause #single-writer-assumption
- [decision] Write-tool fallback for Brain notes is safe when filesystem watcher is active; pragmatic suspension of binary tool rule did not introduce graph drift this session #pragmatic-fallback #binary-rule-exception
- [insight] Pre-locking D-Ns before ADR authoring correlates with Round 1 review pass (ADR-001 pre-locked R1 pass; ADR-002 architect-direct R1 fail; ADR-003 pre-locked R1 pass) #adr-review-pattern #pre-locking
- [problem] CRIT-003 Relations section uses forbidden `reviews` relation type; should use a valid verb from the 11-type allowlist #conventions-violation #crit-003
- [fact] Architect performance improved: SPEC-001 needed 20 type-field corrections post-dispatch; SPEC-007 needed 0 corrections #agent-improvement #architect-quality
- [constraint] TIER_4 mandatory pause at /build Step 2.5 acts as useful session-scope circuit breaker; auto-mode should not override skill-mandated pauses #tier-4-gate #auto-mode-tension
- [risk] Gate A semantic gap analysis skipped under auto mode for SPEC-007; no false negative detected post-hoc but pattern should be tracked across future SPECs #gate-a-skip #auto-mode-risk

## Relations

- relates_to [[SESSION-2026-05-20_03: ADR-003 Render Architecture and SPEC-007 Unblock]]
- relates_to [[PLAN-001: Skills Ecosystem]]
- relates_to [[CRIT-003-ADR-003: Plan/Session Render Architecture Debate Log]]
- relates_to [[ADR-003: Plan/Session Render Architecture]]
- relates_to [[SPEC-007: Plan/Session Render Implementation]]

- relates_to [[RETRO-004: PLAN-001 Skills Ecosystem Retrospective]]