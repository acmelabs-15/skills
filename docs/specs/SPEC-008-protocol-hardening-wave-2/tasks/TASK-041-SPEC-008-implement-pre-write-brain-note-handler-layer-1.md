---
title: 'TASK-041-SPEC-008: Implement pre-write-brain-note Handler (Layer 1)'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-041-spec-008-implement-pre-write-brain-note-handler-layer-1
status: DONE
effort: S
estimate: 0.5d
tags:
- spec-008
- hooks
- pre-tool-use
- layer-1
- wave-2
---

# TASK-041-SPEC-008: Implement pre-write-brain-note Handler (Layer 1)

## Objective

Implement `hooks/scripts/pre-write-brain-note.ts` per [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]] and [[REQ-011-SPEC-008: PreToolUse Blocking Gates]]. The script binds to Layer 1 (`PreToolUse` matcher `Edit|Write|MultiEdit` with `if: "Edit(docs/**/*.md)|Write(docs/**/*.md)|MultiEdit(docs/**/*.md)"`). On each invocation it: reads hook input via `parse-tool-input.ts`; validates the resolved file path falls within the project root (Phase 3 security P1); reads the existing file content from disk; applies the Edit/Write/MultiEdit operation in memory via `apply-edit-operation.ts`; calls `dispatchValidator(proposedContent, filePath)`; emits the corresponding PreToolUse response via `format-hook-response.ts`.

## Definition of Done

- [x] `hooks/scripts/pre-write-brain-note.ts` exists
- [x] Script entry point reads HookInput from stdin via `readHookInput()`
- [x] Script validates `tool_input.file_path` resolves to an absolute path within the repo root; on traversal attempt the script exits non-zero with a structured stderr error (fail-open)
- [x] Script reads existing file content via Bun.file (or returns empty string for Write of new file)
- [x] Script applies the edit via `applyEditOperation(op, currentContent)`
- [x] Script calls `dispatchValidator(proposedContent, filePath)` and emits the matching response: `permissionDecision: "deny"` with reason for `deny` verdict; `permissionDecision: "allow"` with `additionalContext` warning for `allow-with-warning` verdict; bare allow response for `allow` verdict
- [x] Script wraps validator invocation in try/catch; unhandled exception emits structured stderr error and exits non-zero (fail-open per [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]] AC)
- [x] Unit tests cover deny path (TaskNoteSchema status=DONE with unsatisfied DoD), allow-with-warning path (missing tag), allow path (clean note), traversal rejection, and exception fail-open
- [x] biome lint passes
- [x] `bun tsc --noEmit` passes

## ADR Compliance

- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 Layer 1 declaration (matcher and `if` filter)
- [x] Honors Phase 3 security P1 — path containment validated before reading disk content
- [x] Honors hybrid failure semantics — deny on status-flip claim failures; allow-with-warning otherwise

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `hooks/scripts/pre-write-brain-note.ts` | NEW | Layer 1 hook handler |
| `hooks/scripts/__tests__/pre-write-brain-note.test.ts` | NEW | Unit tests covering deny / allow-with-warning / allow / traversal / fail-open |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.5d | Compose lib utilities into a Layer 1 entry script |
| AI-Dominant | 0.25d | Assembly of typed utilities |
| AI-Assisted | 0.5d | Path containment plus fail-open semantics |

## Observations

- [fact] Layer 1 is the earliest defense: catches lying claims before they hit disk in a local Edit/Write/MultiEdit flow #earliest-gate
- [constraint] Path containment validation MUST run before any disk read so a `..` traversal attempt cannot escape the repo root #path-containment
- [decision] Fail-open on validator exception preserves agent throughput when infrastructure fails; the Stop backstop (Layer 6) catches anything Layer 1 misses #fail-mode

## Relations

- implements [[REQ-011-SPEC-008: PreToolUse Blocking Gates]]
- implements [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[REQ-003-SPEC-008: New Claim Validator Suite]]
- relates_to [[QA-080-SPEC-008: Validation Report for TASK-041 pre-write-brain-note Handler Layer 1]]
