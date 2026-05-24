---
title: 'REQ-012-SPEC-008: Stop Backstop and File Changed Observability'
type: requirement
permalink: specs/spec-008-protocol-hardening-wave-2/requirements/req-012-spec-008-stop-backstop-and-file-changed-observability
status: DRAFT
tags:
- requirement
- spec-008
- hooks
- stop-backstop
- observability
- plugin-layout
- wave-2
---

# REQ-012-SPEC-008: Stop Backstop and File Changed Observability

## EARS

WHEN an agent turn ends with one or more `docs/**/*.md` files modified during that turn but not yet validated by Layers 1-5, OR WHEN `.git/HEAD`/`.git/index`/`.git/logs/HEAD` changes on disk (commit landed)
THE SYSTEM SHALL fire a `Stop` hook handler that re-runs claim validators against all `docs/**` modifications from the turn and returns `decision: "block"` with a reason listing every failing note IF ANY fail (Layer 6 backstop), AND fire a `FileChanged` hook handler that emits post-commit graph state as `additionalContext` (Layer 7 observability)
SO THAT no Brain note state change escapes validation between turns and the post-commit graph state is surfaced to the transcript, providing defense in depth against PreToolUse matcher gaps and a structured ledger of landed commits.

## Acceptance Criteria

- [ ] GIVEN a Layer 6 `Stop` hook declared with no matcher (fires on every turn end)
      WHEN an agent turn modifies `docs/specs/SPEC-NNN/tasks/TASK-NNN-*.md` (or any other Brain note) via tool calls during the turn and any of those modifications would have failed its claim validator
      THEN the handler script `hooks/scripts/stop-backstop.ts` enumerates candidate docs/** files via `git status --porcelain` (capturing both staged and unstaged Brain-note writes in the working tree at turn end), parses each via its type-matching schema, dispatches to the claim validator, and emits `{ decision: "block", reason: "Turn-end backstop: <N> docs/** notes modified this turn fail validation: <list>" }` to block turn completion. The `git status --porcelain` approach is chosen over transcript-parsing (which misses MCP edits) and over mtime-scanning (which misses reverts), and catches tool-mediated edits regardless of whether they went through Edit/Write or Brain MCP and regardless of commit state

- [ ] GIVEN a Layer 6 handler that has run validation
      WHEN no docs/** files were modified during the turn OR every modified file passes its validator
      THEN the handler exits 0 with no decision payload, allowing the turn to complete normally

- [ ] GIVEN a Layer 7 `FileChanged` hook declared with matcher watching `.git/HEAD|.git/index|.git/logs/HEAD`
      WHEN the watched files change (a commit lands)
      THEN the handler script `hooks/scripts/git-state-observer.ts` runs validation across all notes touched by the new commit, computes the resulting graph state (note counts by type, status distribution, validator pass/fail tallies), and emits `{ hookSpecificOutput: { hookEventName: "FileChanged", additionalContext: "Post-commit state: commit <sha> landed; full graph validation: <PASS|FAIL summary>" } }`

- [ ] GIVEN the Layer 7 `FileChanged` matcher
      WHEN external editor edits (e.g., `vim` outside Claude Code) modify a file under `docs/**` without touching `.git/HEAD`/`.git/index`/`.git/logs/HEAD`
      THEN the handler does NOT fire, confirming that external editor edits are explicitly out of scope per ADR-005 D-8 (tool-mediated edits are the threat model)

- [ ] GIVEN the plugin directory layout under `${CLAUDE_PLUGIN_ROOT}/hooks/`
      WHEN the plugin is installed
      THEN the filesystem contains `hooks/hooks.json` declaring all seven layer hooks, `hooks/lib/` with shared utilities (`dispatch-validator.ts`, `apply-edit-operation.ts`, `git-staged-files.ts`, `git-diff-commits.ts`, `parse-tool-input.ts`, `format-hook-response.ts`), and `hooks/scripts/` with one handler per layer (`pre-write-brain-note.ts`, `pre-write-brain-note-mcp.ts`, `pre-commit-validate.ts`, `pre-push-validate.ts`, `pre-pr-create-validate.ts`, `stop-backstop.ts`, `git-state-observer.ts`)

- [ ] GIVEN any hook handler script (Layers 1-7)
      WHEN the handler receives a `file_path` or `command` argument from the Claude Code hook dispatcher
      THEN the handler resolves the path to an absolute form and verifies it falls within the project root (rejecting paths containing `..` traversal or pointing outside the repo) before reading staged file content or shelling out to `git`/`gh`, per Phase 3 security reviewer P1

- [ ] GIVEN a hook handler crash (uncaught exception or Bun startup failure)
      WHEN the runtime detects non-zero exit
      THEN PreToolUse and FileChanged treat the failure as non-blocking (fail-open on infrastructure error); Stop fails closed (fail-closed on turn-end backstop infrastructure error) so the protocol is preserved as the more conservative default at the turn boundary

- [ ] GIVEN the rollback path described in ADR-005 D-8
      WHEN the `hooks/` directory and `hooks.json` declarations are removed
      THEN composition library validators and per-skill scripts (D-1, D-4) remain functional; Wave 2 falls back to voluntary invocation (Wave 1 enforcement level); no production data migration is required

## Observations

- [requirement] Layer 6 (Stop) is the per-turn backstop that catches any docs/** modification not validated by Layers 1-5, closing the matcher-gap risk #stop-backstop #defense-in-depth
- [requirement] Layer 7 (FileChanged) is observe-only; it cannot block but surfaces post-commit graph state via additionalContext for the transcript ledger #file-changed #observability
- [constraint] Plugin layout lives at `${CLAUDE_PLUGIN_ROOT}/hooks/` so hooks ship with the plugin install rather than per-project `.claude/settings.json`, ensuring uniform coverage across every install #plugin-layout #ubiquity
- [decision] Fail-open on infrastructure error for PreToolUse and FileChanged keeps agent work moving when a hook crashes; Stop fails closed because turn completion is the protocol's outermost gate where conservative defaults outrank availability #fail-mode-asymmetry #defense-in-depth
- [risk] External editor edits to `docs/**` (vim outside Claude) bypass all hooks — accepted out-of-scope per ADR-005 D-8 threat model; tool-mediated edits are the protocol surface #external-editor #threat-model

## Relations

- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- pairs_with [[REQ-011-SPEC-008: PreToolUse Blocking Gates]]
- depends_on [[REQ-003-SPEC-008: New Claim Validator Suite]]
