---
title: 'REQ-011-SPEC-008: PreToolUse Blocking Gates'
type: requirement
permalink: specs/spec-008-protocol-hardening-wave-2/requirements/req-011-spec-008-pre-tool-use-blocking-gates
status: DRAFT
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

- [ ] GIVEN a Layer 1 `PreToolUse` hook declared for `Edit|Write|MultiEdit` with `if: "Edit(docs/**/*.md)|Write(docs/**/*.md)|MultiEdit(docs/**/*.md)"`
      WHEN an agent invokes `Edit` on `docs/specs/SPEC-NNN/tasks/TASK-NNN-*.md` with content that flips status to `DONE` while DoD checkbox `[ ]` remains unsatisfied
      THEN the handler script `hooks/scripts/pre-write-brain-note.ts` runs the Edit operation in memory, parses the resulting markdown via `TaskNoteSchema`, calls `validateTaskDoneClaim`, and emits `{ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "TaskNoteSchema: status=DONE requires all DoD [x]; failing: <item>" } }`

- [ ] GIVEN a Layer 2 `PreToolUse` hook declared for `mcp__plugin_brain_brain__edit_note|mcp__plugin_brain_brain__write_note`
      WHEN an agent invokes the MCP `edit_note` tool with content that flips a REQ status to `ACCEPTED` while any AC checkbox `[ ]` remains unsatisfied
      THEN the handler script `hooks/scripts/pre-write-brain-note-mcp.ts` parses the proposed content via `RequirementNoteSchema`, calls `validateRequirementAcClaim`, and returns `permissionDecision: "deny"` with `permissionDecisionReason` naming the unsatisfied AC

- [ ] GIVEN a Layer 3 `PreToolUse` hook declared for `Bash` with `if: "Bash(git commit *)"`
      WHEN an agent invokes `Bash` with command `git commit -m "..."` and the staged set contains a Brain note whose content fails its claim validator
      THEN the handler script `hooks/scripts/pre-commit-validate.ts` reads each staged Brain note via `git show :<file>`, dispatches it to the validator matching its frontmatter `type:` field, and returns `permissionDecision: "deny"` IF ANY staged note fails

- [ ] GIVEN a Layer 4 `PreToolUse` hook declared for `Bash` with `if: "Bash(git push *)"`
      WHEN an agent invokes `Bash` with command `git push ...` and the commits being pushed contain a Brain note whose content fails its claim validator
      THEN the handler script `hooks/scripts/pre-push-validate.ts` computes the diff for commits being pushed via git-diff-commits helpers, dispatches each touched Brain note to its validator, and returns `permissionDecision: "deny"` IF ANY pushed note fails

- [ ] GIVEN a Layer 5 `PreToolUse` hook declared for `Bash` with `if: "Bash(gh pr create *)"`
      WHEN an agent invokes `Bash` with command `gh pr create ...` and the PR diff contains a Brain note whose content fails its claim validator
      THEN the handler script `hooks/scripts/pre-pr-create-validate.ts` computes the PR diff, dispatches each touched Brain note to its validator, and returns `permissionDecision: "deny"` IF ANY note in the PR diff fails

- [ ] GIVEN any Layer 1-5 handler script
      WHEN the script classifies a validation result against the definitive blocking/non-blocking partition derived from ADR-005 D-8 HYBRID semantics
      THEN the partition is applied exactly as follows so two implementers classify every case identically:
  - BLOCKING (`permissionDecision: "deny"`): any failure from a status-flip claim validator — `validateTaskDoneClaim`, `validateRequirementAcClaim`, `validateDesignComplianceClaim`, `validateSpecDoneClaim`, `validateTestReportPassClaim`, `validateAdrAcceptedClaim`, `validateAnalysisAcceptedClaim`, `validateEpicDoneClaim`, `validatePlanDoneClaim`
  - NON-BLOCKING (`permissionDecision: "allow"` with `additionalContext: "Schema warning: <detail> (non-blocking)"`): any schema issue surfaced by a per-type Note schema's `superRefine` that is NOT a claim-validator failure (e.g., observation count below minimum, missing inline `#tag` on an observation, tag-count bounds, malformed-but-parseable frontmatter)

- [ ] GIVEN any Layer 1-5 handler script
      WHEN the script encounters an unparseable note or an unhandled exception during validation
      THEN the handler emits a structured error response to stderr and exits non-zero, with the `PreToolUse` runtime treating non-zero exit as a non-blocking error so the tool call proceeds (fail-open on infrastructure error; fail-closed on schema violation)

- [ ] GIVEN the per-edit hook overhead budget of ~80-250ms (Bun startup ~30-50ms plus validation ~50-200ms per note)
      WHEN measured against a representative TASK note edit
      THEN end-to-end hook latency stays within the budget; per-commit hook overhead for a 5-10 file commit stays within ~500ms-2s

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
