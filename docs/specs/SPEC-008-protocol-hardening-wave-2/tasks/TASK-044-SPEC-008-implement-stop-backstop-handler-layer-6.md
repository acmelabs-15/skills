---
title: 'TASK-044-SPEC-008: Implement stop-backstop Handler (Layer 6)'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-044-spec-008-implement-stop-backstop-handler-layer-6
status: DONE
effort: M
estimate: 1d
tags:
- spec-008
- hooks
- stop
- layer-6
- backstop
---

# TASK-044-SPEC-008: Implement stop-backstop Handler (Layer 6)

## Objective
> Amended 2026-05-24 (SESSION-2026-05-23_02 Event 105, user-approved Option A): enumeration mechanism changed from transcript-walk to `git status --porcelain` per REQ-012 AC1 (transcript-parsing misses Brain-MCP edits; mtime-scanning misses reverts; git-status catches tool-mediated edits regardless of the Edit/Write vs MCP path). DESIGN-004 Layer-6 prose amended to match.

Implement `hooks/scripts/stop-backstop.ts` per [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]] and [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]]. The script binds to the `Stop` event with no matcher (fires on every turn end). On invocation it:

1. Reads hook input including the working directory / repo root.
2. Enumerates candidate `docs/**` files via `git status --porcelain` (uncommitted modified/added/renamed working-tree entries under `docs/`) — catches Edit/Write/MultiEdit local writes AND `mcp__plugin_brain_brain__edit_note`/`write_note` MCP writes alike, since both leave on-disk modifications.
3. Validates path containment for the enumerated set.
4. For each file: reads the current on-disk content, dispatches it through `dispatchValidator(content, filePath)`.
5. If any file fails: emits `{ decision: "block", reason: "Turn-end backstop: <N> docs/** notes modified this turn fail validation: <list>" }`.
6. Otherwise: exits 0 with no decision payload, allowing the turn to complete.

Unlike Layers 1-5 (fail-open on infrastructure error), Layer 6 fails closed: if the git enumeration or validator dispatch throws, the handler emits `{ decision: "block", reason: "Turn-end backstop: infrastructure error during validation; turn blocked pending investigation" }` so the protocol stays preserved at the turn boundary per ADR-005 D-8.
## Definition of Done
> Amended 2026-05-24 (Event 105, user-approved Option A): transcript-walk → `git status --porcelain` enumeration per REQ-012 AC1. DoD#2/#3/#4 + smoke test reframed to the git-status mechanism; regression intent (catch any unvalidated docs/** modification at turn end, incl. MCP edits) preserved.

- [x] `hooks/scripts/stop-backstop.ts` exists
- [x] Handler resolves the repo root from hook input (cwd)
- [x] Handler enumerates `docs/**` files modified this turn via `git status --porcelain` (covers Edit/Write/MultiEdit local writes AND `mcp__plugin_brain_brain__edit_note`/`write_note` MCP writes — both leave on-disk modifications)
- [x] Handler deduplicates the file set (git status yields one entry per path)
- [x] Handler validates path containment for the enumerated set; rejects with structured block reason if traversal detected
- [x] Handler reads current on-disk content for each file and dispatches through `dispatchValidator`
- [x] Handler emits `{ decision: "block", reason: "..." }` listing every failing file when ANY fail
- [x] Handler emits no payload and exits 0 when no docs/** files were modified OR every modified file passes
- [x] Handler fails closed on infrastructure error: emits `{ decision: "block", reason: "Turn-end backstop: infrastructure error ..." }`
- [x] Unit tests cover: empty-modification turn (no block), all-passing turn (no block), one-failing turn (block with file listed), traversal rejection, infrastructure-error fail-closed
- [x] Smoke test asserts that a `docs/**` note modified on disk WITHOUT passing a PreToolUse gate (simulating an MCP edit_note that bypassed Layer 2) is still caught by Layer 6 via the `git status --porcelain` enumeration
- [x] biome lint passes
- [x] `bun tsc --noEmit` passes
## ADR Compliance

- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 Stop layer (no matcher; fail-closed semantics)
- [x] Honors [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]] AC — block turn completion on any unvalidated `docs/**` modification
- [x] Honors Phase 3 security P1 — path containment validated before reading any disk content

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `hooks/scripts/stop-backstop.ts` | NEW | Layer 6 turn-end backstop |
| `hooks/scripts/__tests__/stop-backstop.test.ts` | NEW | Unit and smoke tests |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Transcript walking plus fail-closed handling |
| AI-Dominant | 0.5d | Re-uses dispatch-validator |
| AI-Assisted | 1d | Smoke test that bypasses Layer 2 |

## Observations

- [fact] Layer 6 is the defense-in-depth backstop; if Layers 1-2 miss anything (matcher gaps, MCP shape changes), turn end still validates the full modified set #defense-in-depth #backstop
- [decision] Layer 6 fails CLOSED (block on infrastructure error) while Layers 1-5 fail OPEN; the turn boundary is the protocol's outermost gate where conservative defaults outrank availability #fail-mode-asymmetry
- [risk] Transcript walking depends on Claude Code's `transcript_path` schema; schema changes break enumeration. Mitigation: unit test against a representative transcript fixture; surface schema drift early #transcript-schema-risk

## Relations

- implements [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]]
- implements [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[REQ-003-SPEC-008: New Claim Validator Suite]]
