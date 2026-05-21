---
title: 'SESSION-2026-05-20_05: Wave 2 Integration and Brain State Sync'
type: session
permalink: sessions/session-2026-05-20_05-wave-2-integration-and-brain-state-sync
status: IN_PROGRESS
tags:
- session
- build
- wave-2
- integration
- brain-sync
---

# SESSION-2026-05-20_05: Wave 2 Integration and Brain State Sync

## Scope

Integrate the 4 Wave 2 parallel build branches (SPEC-002 + SPEC-003 + SPEC-004 + SPEC-007) into a unified working tree, restore CI-clean state across the merged composition library, and propagate the completion state to all Brain knowledge-graph notes (PLAN, SPEC roots, REQ, DESIGN, TASK). Continuation of [[SESSION-2026-05-20_04: Build Phase Wave 1 SPEC-001 PROOF]] which dispatched Wave 2 at its Event 09.

## State

Session resumed from compacted context. All 4 Wave 2 build agents had returned DONE before resume:
- build.SPEC-002 (ANALYSIS + SESSION adapters) — 27 tests, both round-trip PROOFs PASS
- build.SPEC-003 (PLAN adapter) — 31 tests, PLAN round-trip PROOF PASS
- build.SPEC-004 (SPEC subtree adapter) — 27 tests, per-file SHA-256 PROOF PASS
- build.SPEC-007 (Plan/Session render pipeline) — 68 tests, both round-trip PROOFs PASS

Branches present: feat/plan-001-build-spec-002, -003, -004, -007 (each off the Wave 2 dispatch commit b707ec6).

## Event 01

**Type**: integration-branch-create | 2026-05-20

- Created branch `feat/plan-001-wave-2-integration` off `feat/plan-001-build-spec-004` (HEAD with SPEC-004 changes)
- Verified all 4 Wave 2 branches had their commits intact via `git log --oneline`
- /tmp worktrees for SPEC-002 and SPEC-007 gone (no longer needed; commits in branches)

## Event 02

**Type**: merge | 2026-05-20

- `git merge feat/plan-001-build-spec-002` — conflict in `_shared/composition/schemas/index.ts`
- Resolved with 5-way discriminated union: adr + analysis + session + plan + spec-subtree
- Commit b6e0fc6 `merge(wave-2): SPEC-002 — analysis + session adapters`

## Event 03

**Type**: merge | 2026-05-20

- `git merge feat/plan-001-build-spec-003` — schemas/index.ts conflict; HEAD already had all variants (SPEC-003 was a subset)
- Accepted HEAD; commit 8a28b59 `merge(wave-2): SPEC-003 — plan adapter + regenerated sections`

## Event 04

**Type**: merge | 2026-05-20

- `git merge feat/plan-001-build-spec-007` — clean merge (no conflicts; disjoint files in src/schemas/, src/parsers/, src/renderers/, src/mutations/)
- 28 files added including biome.json + bun.lock + package.json (new SPEC-007 deps)
- Merge commit by 'ort' strategy

## Event 05

**Type**: dependency-fix | 2026-05-20

- `bun test` failed: `Cannot find package 'remark-gfm'` — SPEC-007 added it to package.json on its worktree but Bun's lock file in main checkout was stale
- `bun install` installed remark-gfm@4.0.1 + @types/js-yaml@4.0.9
- Test suite: **200 pass / 0 fail / 411 expect() calls across 31 test files** — all 5 SPECs' tests green
- `biome check` clean; `tsc --noEmit` clean

## Event 06

**Type**: user-flag-drift | 2026-05-20

- User flagged: SPEC root notes, TASK notes, REQ notes, DESIGN notes are 100% out of sync — even SPEC-001 (marked DONE) had ALL its Success Criteria + Artifact Status checkboxes empty
- Orchestrator initially dispatched brain:implementer agents for Brain note updates — user REJECTED
- Locked feedback rule: Brain notes (docs/**) require brain:memory agent or direct Brain MCP tools — never brain:implementer (bypasses graph processing, no embedding regen, no relation propagation)
- New auto-memory: feedback_memory_updates_via_memory_agent — captures the rule

## Event 07

**Type**: brain-sync-dispatch | 2026-05-20

- Dispatched 5 brain:memory agents in parallel — one per SPEC (001/002/003/004/007)
- Each agent flips: SPEC root note (status + Success Criteria + Artifact Status checkboxes), all TASK notes (TODO to DONE + DoD), all REQ notes (DRAFT/PROPOSED to ACCEPTED), all DESIGN notes (DRAFT to ACCEPTED)
- TASK-013-SPEC-007 + REQ-012-SPEC-007 deferred (dogfood PLAN-001 migration out of Wave 2 scope)
- Total: 95 notes being synced in parallel

## Event 08

**Type**: user-flag-drift | 2026-05-20

- User flagged: if SPEC notes were that bad, session and PLAN notes also out of sync
- Confirmed: no session note for 2026-05-20_05 had been created; PLAN-001 last touched at Wave 2 dispatch (Event 09 of SESSION-2026-05-20_04)
- This session note created (Event 08); PLAN-001 update dispatched as sibling brain:memory task

## Observations

- [decision] Wave 2 integration via single integration branch + sequential merges; conflicts confined to schemas/index.ts which has a clean 5-way discriminated union resolution #merge #integration
- [decision] brain:implementer is BANNED from Brain note updates per user lock 2026-05-20 — use brain:memory or direct Brain MCP only #protocol #blocking
- [fact] Final test suite: 200 pass / 0 fail / 411 expect() calls / 31 test files / biome + tsc clean #verification #green
- [fact] No session note existed for this work until Event 08 — protocol violation; session note created retroactively from event reconstruction #drift #retro-fix
- [risk] Retroactive event reconstruction risks missing nuance; future sessions must follow immediate-event-writes from session-init #process

## Relations

- continues [[SESSION-2026-05-20_04: Build Phase Wave 1 SPEC-001 PROOF]]
- part_of [[PLAN-001: Skills Ecosystem]]
- implements [[SPEC-002: Simple Adapters]]
- implements [[SPEC-003: PLAN Adapter]]
- implements [[SPEC-004: SPEC Subtree Adapter]]
- implements [[SPEC-007: Plan/Session Render Implementation]]


## Event 09 — Reflect capture: assumption-substitution pattern + comprehensive drift audit initiated (2026-05-20)

**Type**: reflect-capture | user-flagged-drift

- User locked new rule mid-recovery: brain:---reflect MUST fire IMMEDIATELY at any drift detection or unclear-correctness moment; fix-vs-redo call is user's, NOT orchestrator's; NEVER assume anything
- Orchestrator proposed initial Phase 0 plan based on a SURFACE-LEVEL drift inventory (~9 items)
- User challenged: "are you sure you've fully identified the full extent of the drift?"
- Reflect-skill: HIGH-confidence learning identified — assumption-substitution pattern manifests repeatedly today: (a) Wave 2 ships without QA assumed = validation; (b) SESSION-2026-05-20_05 reconstruction assumed = ledger; (c) DONE flips via memory agents assumed = closure; (d) initial drift inventory assumed = exhaustive. ALL same root cause: orchestrator treating first-pass output as authoritative without verification.
- Action: pause all forward motion, execute comprehensive drift audit covering PLAN-001 partial-update damage, all 7 SPECs + subtrees, all session notes, ADRs, QA, git/Brain divergence, forbidden-pattern greps. NO agent dispatches until audit done + user approves revised plan.
- Next: full audit then present comprehensive drift inventory + revised Phase 0 plan


## Event 10 — Protocol architecture locked: rigor at every layer + checkbox-as-contract + PLAN-as-dispatch-brief-source (2026-05-20)

**Type**: protocol-lock | architecture-decision

This Event captures verbatim, per user instruction, the protocol architecture locked across 5 conversation turns. Two auto-memories will be written immediately after this Event:
- [[feedback_per_task_build_qa_cycle]]: the specific rigid build+qa per-TASK protocol
- [[feedback_workflow_phase_rigor_at_every_layer]]: the meta-rule that every workflow phase must embed rigor at every enforcement layer

### Core protocol (rigidly systematic per-TASK build+qa cycle)

For each spec to be implemented, the PLAN MUST contain `## Implement SPEC-NNN` subsection with explicit per-TASK items:
- impl-TASK-NNN-SPEC-MMM (status: PENDING | IN_PROGRESS | DONE | BLOCKED | FAILED)
- qa-TASK-NNN-SPEC-MMM (status: same)

Orchestrator follows rigid sequence per TASK (NO step may be skipped or reordered):
- (a) PLAN transition: impl-TASK-N PENDING → IN_PROGRESS (FIRST action)
- (b) Session note Event appended capturing transition
- (c) Git commit
- (d) Orchestrator dispatches implementer with brief = rendered impl item instructions verbatim
- (e) Implementer reads full spec subtree + implements ONLY this TASK + marks DoD [x]
- (f) Implementer returns with ## State Changes (only this TASK's transitions)
- (g) Session note Event appended
- (h) PLAN transition: impl-TASK-N IN_PROGRESS → DONE
- (i) Git commit (code + PLAN + session note atomically)
- (j) PLAN transition: qa-TASK-N PENDING → IN_PROGRESS
- (k) Session note Event
- (l) Git commit
- (m) Orchestrator dispatches QA with brief = rendered qa item instructions verbatim
- (n) QA reads full spec + evaluates each checkbox
- (o) QA writes per-checkbox findings to TEST-REPORT-NNN-SPEC-MMM-{task-slug}.md (Pattern 2 three-phase write)
- (p) QA returns verdict only: PASS / FAILED + see TEST-REPORT
- (q) Session note Event
- (r) Orchestrator updates TASK note with validated_by relation
- (s) If PASS: PLAN qa-TASK-N IN_PROGRESS → DONE; TASK note status → DONE
- (s-fail) If FAILED: PLAN qa-TASK-N IN_PROGRESS → FAILED; impl-TASK-N DONE → IN_PROGRESS; orchestrator translates QA findings into fix-brief
- (t) Git commit
- (u) Move to TASK N+1; repeat from (a). NO batching, NO shortcuts

### Checkbox lists ARE the validation contract

The implementer and QA agents do NOT figure out from prose what counts as done. The contract is mechanical:

- TASK `## Definition of Done` — implementer's build contract; implementer marks [x] as items met
- REQ `## Acceptance Criteria` (EARS Given/When/Then) — QA validates against these
- DESIGN compliance/architecture checkboxes (when present) — QA validates against these

When dispatching implementer: brief MUST quote the TASK DoD verbatim + link to linked REQs/DESIGNs + state "you implement against the checkboxes; you check [x] as each is satisfied".

When dispatching QA: brief MUST quote the TASK DoD + linked REQ Acceptance Criteria + linked DESIGN checkboxes verbatim + state "you validate each checkbox individually with evidence; you mark [x] for satisfied items, leave [ ] for unsatisfied; per-item PASS/FAIL/PARTIAL evidence to TEST-REPORT".

### The QA → orchestrator → implementer handoff translation (fail path)

QA's responsibility: signal `FAILED + [[TEST-REPORT-NNN]]` — nothing more. The TEST-REPORT is the contract document.

Orchestrator's responsibility: TRANSLATE the QA findings into an unambiguous implementer fix-brief by:
1. Reading TEST-REPORT-NNN-SPEC-NNN-{task-slug} in full
2. Identifying each [ ] unchecked item across the task's TASK + linked REQs + linked DESIGNs
3. Building the implementer fix-brief that QUOTES each unchecked item VERBATIM + cites the QA note evidence (file:line, test name, etc.)
4. Stating explicitly: "Fix ONLY these items. Do not refactor or improve anything else. Mark [x] as each is satisfied. Return when done."

The implementer cannot claim ambiguity. The orchestrator's brief makes it crystal clear. The orchestrator is the translator; QA is the auditor; implementer is the executor.

### The PLAN note carries the dispatch instructions (no agent file updates needed)

The protocol gets enforced WITHOUT touching agent files because the PLAN note itself contains the rendered instructions for every impl + qa item. The PlanNote Zod schema mandates this structure; the plan-note renderer generates it deterministically from the linked spec subtree.

For each TASK in a spec, the renderer produces an impl item block containing:
1. Status state
2. Full implementer instructions (rendered verbatim from template)
3. DoD checkboxes pulled verbatim from the linked TASK note
4. AC items pulled verbatim from each linked REQ
5. Compliance points pulled verbatim from each linked DESIGN
6. Explicit per-step protocol expectations (read entire subtree, implement only this TASK, mark [x] as satisfied)

And a qa item block containing:
1. Status state
2. Full QA instructions (rendered verbatim from template)
3. Same DoD + AC + compliance checkboxes rendered for validation
4. Per-item PASS/FAIL/PARTIAL evidence template
5. Authority to flip checkboxes [x] in TASK/REQ/DESIGN notes
6. Verdict-only return format

Orchestrator's dispatch brief = verbatim copy of the rendered item block. Agents receive crystal-clear instructions without needing updates to their prompt files.

### Programmatic schema validation of agent claims

Zod schemas verify agent claims mechanically:
- Implementer claim "TASK done" → schema parses TASK note, requires every `## Definition of Done` item to be [x]. If any [ ], reject the claim
- QA claim "validation PASSED" → schema parses linked REQ + DESIGN + TASK notes, requires every checkbox covered by this TASK's scope to be [x]. If any [ ], reject the claim
- Schema-rejected claim → orchestrator re-engages the agent with the specific failing item

This makes lying mechanically impossible. The agent must actually do the work to satisfy the schema.

### Rigor at every enforcement layer (meta-rule)

Single-layer protocols fail (today's drift proves it). Every workflow phase (research/decisions/spec/build/review/end/plan) MUST embed its rigid protocol at ALL of:

1. **Zod schema** — validates note structure programmatically + validates agent return claims
2. **Template** (NOTE-TEMPLATES.md) — mandates required sections
3. **Renderer** — deterministically generates required structure
4. **Skill SKILL.md** — explicit ordered protocol with verification gates
5. **Auto-memory** — high-visibility cross-session protocol reference
6. **CLAUDE.md** — tier-1 references to phase memories as blocking gates
7. **Orchestrator dispatch briefs** — quote rendered content verbatim

A workflow phase missing ANY of these layers is incomplete — it WILL be bypassed under load.

### Scope of this protocol-hardening phase (Phase X to be added to PLAN-001)

- IN scope:
  - Two memories (feedback_per_task_build_qa_cycle + feedback_workflow_phase_rigor_at_every_layer)
  - User-created lifecycle skills at ~/.claude/skills/{build,decisions,end,plan,research,review,spec}
  - Project artifacts at /Users/peter.kloss/Dev/ACMElabs/skills: ADR-003 amendment + SPEC-007 expansion (PlanNote schema + renderer + new TaskNote/RequirementNote/DesignNote/TestReportNote schemas)
  - NOTE-TEMPLATES.md (PLAN, TASK, REQ, DESIGN, TEST-REPORT templates)
  - KNOWLEDGE-GRAPH-STRUCTURES.md (Sections 4.6/4.7/4.8/4.9)
  - ~/CLAUDE.md tier-1 references

- OUT of scope:
  - Updates to brain plugin agent files (instructions land via rendered dispatch briefs instead)
  - Updates to plugin-marketplace skills (brain:---reflect etc.)

- Time budget: 3-4 hours focused execution

### Architecture summary

The protocol enforces itself via surface area produced by templates + schemas + renderers + skills. Agents receive their instructions from rendered PLAN content. Lying agents are caught by schema-validated claim checking. Orchestrator drift is caught by tier-1 auto-memories + CLAUDE.md references. Defense in depth at multiple layers means single-layer failures cannot bypass the protocol.


## Event 11 — Phase X.A complete: memories written + indexed (2026-05-20)

**Type**: protocol-bootstrap-complete

- Memory 1 written: `~/.claude/memory/feedback_per_task_build_qa_cycle.md` — TIER-1 BLOCKING; per-TASK build+qa rigid protocol with checkbox-as-contract + plan-renderer-as-dispatch-brief-source
- Memory 2 written: `~/.claude/memory/feedback_workflow_phase_rigor_at_every_layer.md` — TIER-1 BLOCKING; meta-rule for rigor at every enforcement layer
- `~/.claude/memory/MEMORY.md` index updated: both memories added at TOP of "Protocol memories" section with TIER-1 BLOCKING markers
- Next: scope-decision question on composition library mechanism completion (Phase X.D vs deferred to Wave 2 rebuild). Phase X.B audit + Phase X.C skill/template updates can proceed in parallel either way.


## Event 12 — Phase X state-capture memory written (resumption anchor) (2026-05-20)

**Type**: state-persistence

- Written: `~/.claude/memory/feedback_skills_phase_x_protocol_hardening_state.md` — PROJECT-STATE memory capturing Phase X work plan (29 items + status), 37-surface drift inventory summary, 4 pending user decisions (D1-D4), resume instructions, key references
- MEMORY.md index updated: new entry at top of Protocol memories section above the two TIER-1 BLOCKING memories
- Designed for resumability: fresh agent / post-compaction can read this memory + the two TIER-1 memories + SESSION-_05 + PLAN-001 and pick up exactly where work left off
- Phase X.A.6 (state-capture memory) DONE
- Next: pending user decisions D1-D4 before Phase X.B audit can start


## Event 13 — Brain note mirror of state-capture written (2026-05-20)

**Type**: state-persistence | brain-graph-mirror

- Written: ANALYSIS-003 at `analysis/ANALYSIS-003-phase-x-protocol-hardening-state.md` — Brain knowledge-graph mirror of the orchestrator-private state-capture memory
- Title fixed via Pattern 2 Phase 2: frontmatter title + H1 now `'ANALYSIS-003: Phase X Protocol Hardening State'`
- ANALYSIS-003 captures: Phase X work plan (29 items + status), 37-surface drift inventory summary, 4 pending user decisions (D1-D4), protocol architecture (inlined per Section 5.3 — no assistant-private memory references in Brain notes), resume instructions, key references
- Designed as resumption anchor on Brain knowledge-graph side; orchestrator-private state-capture memory is its mirror on the assistant-private side
- Phase X.A.7 (Brain note mirror) DONE
- User reinforced architecture in two messages mid-write: (a) composition library mechanisms are the deterministic enforcement that /plan and other lifecycle skills LEVERAGE (not just docs/skills updates); (b) deterministic plan-state-transition script must REQUIRE session note reference as input — throws error if missing — mechanically enforcing the protocol step-by-step
- Next: address user's architecture reinforcement, confirm Phase X.D scope (decision D1 leaning toward 'include tonight' or partial), then begin Phase X.B audit


## Event 14 — PLAN-001 partial reconciliation + Phase X structure added (2026-05-20)

**Type**: plan-update

- ANALYSIS-003 title fixed via Pattern 2 Phase 2 (frontmatter title + H1 now colon + Title Case)
- PLAN-001 frontmatter: added 5 missing branches (build-spec-002/003/004/007 + wave-2-integration) → branches list now 8 entries
- PLAN-001 Progress Dashboard: added protocol-hardening row between build.SPEC-NNN and review rows
- PLAN-001 Phase Progression: added protocol-hardening IN_PROGRESS row between build.SPEC-007 and review pointing at the ANALYSIS-003 work plan
- PLAN-001 H2 sections: inserted Phase-X — Protocol Hardening section between Build and Review (line 1232). Sub-phases X.A through X.E with Status, canonical work plan pointer, sub-phases, Exit Criteria, Blockers, owning session
- Brain MCP response noise: edits hit a pre-existing serialization bug where Progress Log bullets parse as overlong relation_types. Edits land on disk; responses error. Future schemas will reject such bullet shapes
- DEFERRED until D2 (throw-out vs salvage): reverting Wave 2 false-DONE statuses on 4 SPEC roots + 30 TASKs + 28 REQs + 12 DESIGNs. Phase Progression for those still shows IN_PROGRESS — truthful pre-Wave-2-build state
- Phase X.A complete (all 7 items DONE). Commit 15174d7 closes Phase X.A
- Next: Phase X.B audit of 7 lifecycle skills plus composition library current state. Inline findings in this conversation


## Event 15 — Phase X.B audit complete (2026-05-20)

**Type**: audit-complete

Audited 7 user-created lifecycle skills + composition library current state + NOTE-TEMPLATES. Findings:

- /plan (230L): no mandate for per-TASK impl+qa items in build parts; no reference to composition library deterministic functions
- /build (286L): per-TASK Stage A cycle closest match to rigid protocol; briefs are ad-hoc not verbatim rendered PLAN content; no schema validation of agent claims
- /spec (242L): strict authoring order present; no PLAN handoff contract emitting per-TASK impl+qa with rendered DoD/AC/compliance
- /decisions (257L): per-D-N micro-cycle closest decisions-side match; lockDecision not formalized as deterministic function
- /research (208L): options-only + no-Open-Questions present; convergencePass not schema-validated
- /review (320L): 10-value verdict enum; no checkbox-vs-diff axis
- /end (401L): Step 1 DoD halt-on-empty present; doesn't distinguish impl/QA marks or verify TEST-REPORT linkages
- Composition library: PlanNote + SessionNote schemas/renderers/mutations exist; missing TaskNote/RequirementNote/DesignNote/SpecRootNote/TestReportNote schemas + renderers + claim-validators + deterministic transition functions
- NOTE-TEMPLATES TASK template has DoD section but no checkbox-as-contract language; TEST-REPORT template is STUB; needs full development

15-item execution order locked covering Phase X.C + X.D. Next: begin item 1 (extend PlanNote schema with BuildWorkflowItemSchema for per-TASK impl+qa items).
