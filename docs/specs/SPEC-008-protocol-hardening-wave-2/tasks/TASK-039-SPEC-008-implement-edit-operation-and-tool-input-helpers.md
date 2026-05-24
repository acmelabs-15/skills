---
title: 'TASK-039-SPEC-008: Implement Edit Operation and Tool Input Helpers'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-039-spec-008-implement-edit-operation-and-tool-input-helpers
status: TODO
effort: M
estimate: 1d
tags:
- task
- spec-008
- hooks
- edit-operation
- parse-tool-input
- format-response
- wave-2
---

# TASK-039-SPEC-008: Implement Edit Operation and Tool Input Helpers

## Description

Implement three shared hook utilities under `hooks/lib/` per [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]]:

1. `apply-edit-operation.ts` — applies a parsed `EditOperation` (Edit, Write, or MultiEdit) against current file content in memory and returns the proposed post-edit content. Used by Layer 1 to compute what the file WOULD look like after the edit, then dispatched to the validator before the write lands on disk.
2. `parse-tool-input.ts` — reads hook input as JSON on stdin per the Claude Code hooks contract, returns a typed `HookInput` carrying `tool_name`, `tool_input` (with per-tool shape handling for Edit/Write/MultiEdit and MCP `edit_note`/`write_note`), `transcript_path` (for Stop and FileChanged), and `cwd`.
3. `format-hook-response.ts` — emits the four hook response shapes (`PreToolUseDeny`, `PreToolUseAllow`, `StopBlock`, `FileChangedObserve`) as JSON on stdout with the exact key names the Claude Code runtime expects.

## Definition of Done

- [ ] `hooks/lib/apply-edit-operation.ts` exists with `applyEditOperation(op: EditOperation, currentContent: string): string`
- [ ] applyEditOperation handles `Edit` (single `oldString`/`newString` find-replace), `Write` (full content overwrite), and `MultiEdit` (sequential application of `edits[]`)
- [ ] applyEditOperation throws an explicit error when `oldString` does not exist or matches non-uniquely (for Edit/MultiEdit) so the caller can fall back to fail-open
- [ ] `hooks/lib/parse-tool-input.ts` exists with `readHookInput(): Promise<HookInput>`
- [ ] readHookInput reads stdin to EOF, parses JSON, validates the shape against a Zod schema, returns the typed HookInput
- [ ] parse-tool-input handles tool_input shape variation between local Edit/Write/MultiEdit and MCP `edit_note`/`write_note` (the latter carries `permalink` and `content` rather than `file_path` and `new_string`)
- [ ] `hooks/lib/format-hook-response.ts` exists with `emitResponse(response): void`
- [ ] emitResponse writes JSON to stdout with no trailing whitespace, calls `process.stdout.write` followed by `\n`, does not pretty-print
- [ ] Unit tests cover each Edit/Write/MultiEdit shape against representative current content
- [ ] Unit tests cover the four response shapes for emitResponse byte-for-byte against fixtures
- [ ] biome lint passes
- [ ] `bun tsc --noEmit` passes

## ADR Compliance

- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 Implementation Notes (lib/ utilities listed: apply-edit-operation, parse-tool-input, format-hook-response)
- [ ] Honors Phase 3 security P1 — applyEditOperation does not resolve paths or shell out; path containment validation lives in the per-handler entry scripts

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `hooks/lib/apply-edit-operation.ts` | NEW | Compute proposed content for Edit/Write/MultiEdit |
| `hooks/lib/parse-tool-input.ts` | NEW | Read and validate hook input JSON from stdin |
| `hooks/lib/format-hook-response.ts` | NEW | Emit PreToolUse/Stop/FileChanged JSON to stdout |
| `hooks/lib/__tests__/apply-edit-operation.test.ts` | NEW | Unit tests covering Edit, Write, MultiEdit |
| `hooks/lib/__tests__/parse-tool-input.test.ts` | NEW | Unit tests covering tool input shape variation |
| `hooks/lib/__tests__/format-hook-response.test.ts` | NEW | Byte-for-byte fixture tests |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Three small modules plus unit tests |
| AI-Dominant | 0.5d | Mechanical translation of design interfaces |
| AI-Assisted | 1d | Module assembly with fixtures |

## Observations

- [task] These three utilities are the I/O boundary between the Claude Code hook runtime and the validator pipeline; they isolate every tool_input shape quirk in one place #boundary-layer
- [technique] applyEditOperation runs the edit in memory so the validator sees the proposed post-edit content; the actual file write is gated downstream by the dispatch verdict #in-memory-apply
- [constraint] format-hook-response MUST NOT pretty-print; Claude Code parses the response as a single JSON line on stdout #json-line-protocol

## Relations

- implements [[REQ-011-SPEC-008: PreToolUse Blocking Gates]]
- implements [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]]
- implements [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
