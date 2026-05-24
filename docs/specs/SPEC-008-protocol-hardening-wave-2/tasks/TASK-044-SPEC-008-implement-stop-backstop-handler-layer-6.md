---
title: 'TASK-044-SPEC-008: Implement stop-backstop Handler (Layer 6)'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-044-spec-008-implement-stop-backstop-handler-layer-6
status: TODO
effort: M
estimate: 1d
tags:
- task
- spec-008
- hooks
- stop
- layer-6
- backstop
- wave-2
---

# TASK-044-SPEC-008: Implement stop-backstop Handler (Layer 6)

## Description

Implement `hooks/scripts/stop-backstop.ts` per [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]] and [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]]. The script binds to the `Stop` event with no matcher (fires on every turn end). On invocation it:

1. Reads hook input including `transcript_path`.
2. Walks the transcript to enumerate every tool call during the turn that modified a file under `docs/**`.
3. Validates path containment for the enumerated set.
4. For each file: reads the current on-disk content, dispatches it through `dispatchValidator(content, filePath)`.
5. If any file fails: emits `{ decision: "block", reason: "Turn-end backstop: <N> docs/** notes modified this turn fail validation: <list>" }`.
6. Otherwise: exits 0 with no decision payload, allowing the turn to complete.

Unlike Layers 1-5 (fail-open on infrastructure error), Layer 6 fails closed: if the transcript walk or validator dispatch throws, the handler emits `{ decision: "block", reason: "Turn-end backstop: infrastructure error during validation; turn blocked pending investigation" }` so the protocol stays preserved at the turn boundary per ADR-005 D-8.

## Definition of Done

- [ ] `hooks/scripts/stop-backstop.ts` exists
- [ ] Handler reads `transcript_path` from hook input
- [ ] Handler walks the transcript and enumerates every tool call that touched `docs/**` (covers Edit/Write/MultiEdit local writes and `mcp__plugin_brain_brain__edit_note`/`write_note` MCP writes)
- [ ] Handler deduplicates the file set (multiple edits to the same file collapse to one validation)
- [ ] Handler validates path containment for the enumerated set; rejects with structured block reason if traversal detected
- [ ] Handler reads current on-disk content for each file and dispatches through `dispatchValidator`
- [ ] Handler emits `{ decision: "block", reason: "..." }` listing every failing file when ANY fail
- [ ] Handler emits no payload and exits 0 when no docs/** files were modified OR every modified file passes
- [ ] Handler fails closed on infrastructure error: emits `{ decision: "block", reason: "Turn-end backstop: infrastructure error ..." }`
- [ ] Unit tests cover: empty-modification turn (no block), all-passing turn (no block), one-failing turn (block with file listed), traversal rejection, infrastructure-error fail-closed
- [ ] Smoke test asserts that an MCP edit_note that bypasses Layer 2 (simulated by disabling Layer 2 in fixture) is still caught by Layer 6
- [ ] biome lint passes
- [ ] `bun tsc --noEmit` passes

## ADR Compliance

- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 Stop layer (no matcher; fail-closed semantics)
- [ ] Honors [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]] AC — block turn completion on any unvalidated `docs/**` modification
- [ ] Honors Phase 3 security P1 — path containment validated before reading any disk content

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

- [task] Layer 6 is the defense-in-depth backstop; if Layers 1-2 miss anything (matcher gaps, MCP shape changes), turn end still validates the full modified set #defense-in-depth #backstop
- [decision] Layer 6 fails CLOSED (block on infrastructure error) while Layers 1-5 fail OPEN; the turn boundary is the protocol's outermost gate where conservative defaults outrank availability #fail-mode-asymmetry
- [risk] Transcript walking depends on Claude Code's `transcript_path` schema; schema changes break enumeration. Mitigation: unit test against a representative transcript fixture; surface schema drift early #transcript-schema-risk

## Relations

- implements [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]]
- implements [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[REQ-003-SPEC-008: New Claim Validator Suite]]
