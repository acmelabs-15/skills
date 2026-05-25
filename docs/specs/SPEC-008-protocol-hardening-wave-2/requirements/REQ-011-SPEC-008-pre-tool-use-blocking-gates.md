---
title: 'REQ-011-SPEC-008: PreToolUse Blocking Gates'
type: requirement
permalink: specs/spec-008-protocol-hardening-wave-2/requirements/req-011-spec-008-pre-tool-use-blocking-gates
status: ACCEPTED
tags:
- requirement
- spec-008
- hooks
- pre-tool-use
- enforcement-gates
- wave-2
---

# REQ-011-SPEC-008: PreToolUse Blocking Gates

## EARS

WHEN a Claude Code tool invocation targets a Brain note write path (local `Edit`/`Write`/`MultiEdit` against `docs/**/*.md`, `mcp__plugin_brain_brain__edit_note`, `mcp__plugin_brain_brain__write_note`, `Bash(git commit *)`, `Bash(git push *)`, or `Bash(gh pr create *)`)
THE SYSTEM SHALL fire a `PreToolUse` hook handler that loads the proposed/staged/pushed note content, dispatches it to the matching claim validator from `shared/composition/src/validators/`, and returns `permissionDecision: "deny"` with a `permissionDecisionReason` describing the failing checkbox/AC/DoD item WHEN the validator rejects a status-flip claim, OR `permissionDecision: "allow"` with `additionalContext` warning WHEN only non-blocking schema issues are present
SO THAT the rigid per-TASK build+QA cycle and SPEC/REQ/DESIGN/ADR/PLAN/ANALYSIS/EPIC status-flip claims fire mechanically without orchestrator cooperation, closing the voluntary-invocation gap that defined the Wave 1 failure mode (independent-thinker P2 surfacing).

## Acceptance Criteria
> Amended 2026-05-24 (SESSION-2026-05-23_02 Event 114, user-approved): LAYERED-SEVERITY model resolves the prior AC#6↔AC#7 contradiction. `dispatchValidator` returns a 3-way verdict; each layer maps `allow-with-warning` per its position — per-write gates ALLOW it (notes stay fixable), boundary + backstop gates DENY it (nothing non-conformant lands). This denies BOTH claim-lies and hygiene without self-locking terminal-status notes.

- [x] GIVEN `dispatchValidator(noteContent, filePath)` WHEN it evaluates a routed note THEN it returns exactly one of three verdicts: `deny` (a CLAIM-validator failure — terminal status with an unsatisfied DoD/AC/compliance/completion contract), `allow-with-warning` (the note's claim passes or is N/A but a NON-claim hygiene/schema issue is present — observation `category` outside the enum, observation `tags` or frontmatter `tags` count bounds, observation/relation count below floor, or other recoverable schema-rule violation), or `allow` (clean). A hygiene defect on a note whose claim is satisfied MUST classify as `allow-with-warning`, NOT `deny`.

- [x] GIVEN a Layer 1 `PreToolUse` hook (`Edit|Write|MultiEdit`, `if: "Edit(docs/**/*.md)|Write(docs/**/*.md)|MultiEdit(docs/**/*.md)"`) WHEN an agent edits `docs/specs/.../TASK-NNN-*.md` flipping status to `DONE` with a DoD `[ ]` unsatisfied THEN `pre-write-brain-note.ts` runs the edit in memory and emits `permissionDecision: "deny"` with reason naming the failing DoD item (verdict `deny` → deny).

- [x] GIVEN a Layer 2 `PreToolUse` hook (`mcp__plugin_brain_brain__edit_note|mcp__plugin_brain_brain__write_note`) WHEN an agent flips a REQ to `ACCEPTED` with an AC `[ ]` unsatisfied THEN `pre-write-brain-note-mcp.ts` emits `permissionDecision: "deny"` naming the unsatisfied AC (verdict `deny` → deny).

- [x] GIVEN per-write gates (Layers 1-2) WHEN `dispatchValidator` returns `allow-with-warning` (a hygiene issue, claim satisfied) THEN the handler emits `permissionDecision: "allow"` with `additionalContext` surfacing the warning — the write PROCEEDS, so an imperfect note remains editable and can be fixed incrementally (no self-lock).

- [x] GIVEN a Layer 3 `PreToolUse` hook (`Bash`, `if: "Bash(git commit *)"`) WHEN any staged Brain note returns verdict `deny` OR `allow-with-warning` (i.e. ANY non-conformance — claim OR hygiene) THEN `pre-commit-validate.ts` emits `permissionDecision: "deny"` naming every non-conforming staged note. Boundary gates enforce FULL conformance.

- [x] GIVEN a Layer 4 `PreToolUse` hook (`Bash`, `if: "Bash(git push *)"`) WHEN any Brain note in the pushed commits returns `deny` OR `allow-with-warning` THEN `pre-push-validate.ts` emits `permissionDecision: "deny"` naming every non-conforming note.

- [x] GIVEN a Layer 5 `PreToolUse` hook (`Bash`, `if: "Bash(gh pr create *)"`) WHEN any Brain note in the PR diff returns `deny` OR `allow-with-warning` THEN `pre-pr-create-validate.ts` emits `permissionDecision: "deny"` naming every non-conforming note.

- [x] GIVEN the per-layer verdict-mapping is the single mechanism distinguishing the layers WHEN any handler receives a `DispatchOutcome` THEN it maps the verdict by its layer class: PER-WRITE (L1/L2) → {`deny`→deny, `allow-with-warning`→allow+additionalContext, `allow`→allow}; BOUNDARY + BACKSTOP (L3/L4/L5/L6) → {`deny`→deny, `allow-with-warning`→deny, `allow`→allow}; OBSERVE (L7) → never blocks. This partition is applied identically by every handler.

- [x] GIVEN any handler WHEN `dispatchValidator` throws `UnparseableNoteError` (cannot extract `type`/`status`, or a structural defect preventing any model — distinct from a classified hygiene/claim verdict) THEN per-write gates (L1/L2) and FileChanged (L7) FAIL-OPEN (non-zero exit, tool proceeds — infrastructure error); boundary gates (L3/L4/L5) and Stop (L6) FAIL-CLOSED (block). A claim-validator failure is always `deny` (fail-closed) at every gate.

- [x] GIVEN the per-edit hook overhead budget (~80-250ms per note edit; ~500ms-2s per 5-10 file commit) WHEN measured against a representative TASK note edit / commit THEN end-to-end latency stays within budget.
## Observations

- [requirement] Five PreToolUse blocking gates cover the four exit ramps a Brain note can take from an agent process: local file edit, MCP edit, commit, push, PR open #enforcement #defense-in-depth
- [decision] HYBRID failure semantics — deny on status-flip claim failures (terminal status with unsatisfied checkboxes); allow with `additionalContext` warning on non-blocking schema issues — keeps low-friction edits unblocked while hard-blocking lying-claim writes #hybrid-semantics #failure-mode
- [constraint] Hook handlers MUST validate that resolved file paths fall within the project root (no `..` traversal) before reading staged content, per Phase 3 security reviewer P1 #path-containment #security
- [risk] If Claude Code matcher quirks prevent `mcp__plugin_brain_brain__*` matching at Layer 2, Brain MCP writes bypass validation. Mitigation: TASK DoD includes hook smoke-test asserting MCP write triggers Layer 2 handler #matcher-risk #mcp-coverage

## Relations

- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- pairs_with [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]]
- depends_on [[REQ-003-SPEC-008: New Claim Validator Suite]]
- depends_on [[REQ-001-SPEC-008: New Schema Suite]]
