---
title: 'TASK-042-SPEC-008: Implement pre-write-brain-note-mcp Handler (Layer 2)'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-042-spec-008-implement-pre-write-brain-note-mcp-handler-layer-2
status: TODO
effort: S
estimate: 0.5d
tags:
- task
- spec-008
- hooks
- pre-tool-use
- layer-2
- mcp
- wave-2
---

# TASK-042-SPEC-008: Implement pre-write-brain-note-mcp Handler (Layer 2)

## Description

Implement `hooks/scripts/pre-write-brain-note-mcp.ts` per [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]] and [[REQ-011-SPEC-008: PreToolUse Blocking Gates]]. The script binds to Layer 2 (`PreToolUse` matcher `mcp__plugin_brain_brain__edit_note|mcp__plugin_brain_brain__write_note`). MCP tool inputs differ from local file tool inputs: `write_note` carries `title`, `directory`, `content`, `tags`; `edit_note` carries `identifier` and `operation` (`append`, `prepend`, `find_replace`, `replace_section`) plus operation-specific fields. The handler resolves the target Brain note's full content after the proposed MCP operation, then runs the dispatch validator and emits the matching response.

For `edit_note` the handler reads the current note via the file path resolved from `identifier` (basic-memory permalink lookup), applies the operation in memory using the same approach as `apply-edit-operation.ts` extended for the four MCP operation types, then dispatches the result. For `write_note` the handler treats `content` as the proposed full note content (with frontmatter that basic-memory will augment) and dispatches against that content.

## Definition of Done

- [ ] `hooks/scripts/pre-write-brain-note-mcp.ts` exists
- [ ] Script handles `mcp__plugin_brain_brain__edit_note` tool_input shape: `identifier`, `operation`, plus operation-specific fields (`content`, `find_text`, `section`, `expected_replacements`)
- [ ] Script handles `mcp__plugin_brain_brain__write_note` tool_input shape: `title`, `directory`, `content`, `tags`
- [ ] Script resolves `identifier` to a file path within the project root (path containment validated before disk read)
- [ ] Script applies the MCP operation in memory and dispatches the proposed full content to `dispatchValidator`
- [ ] Script emits the matching PreToolUse response per the verdict (deny / allow-with-warning / allow)
- [ ] Script wraps validator invocation in try/catch and emits structured stderr error on exception (fail-open)
- [ ] Unit tests cover write_note happy path, edit_note find_replace path, edit_note replace_section path, deny path against status-flip claim failure, traversal rejection
- [ ] Smoke test asserts that invoking `mcp__plugin_brain_brain__edit_note` against a known-failing fixture triggers Layer 2 deny (closes ADR-005 D-8 matcher-risk mitigation requirement)
- [ ] biome lint passes
- [ ] `bun tsc --noEmit` passes

## ADR Compliance

- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 Layer 2 declaration (matcher `mcp__plugin_brain_brain__edit_note|mcp__plugin_brain_brain__write_note`)
- [ ] Honors Failure Modes section — smoke test asserts MCP write triggers Layer 2 handler (mitigation requirement)
- [ ] Honors Phase 3 security P1 — `identifier` resolution validated within project root

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `hooks/scripts/pre-write-brain-note-mcp.ts` | NEW | Layer 2 hook handler |
| `hooks/scripts/__tests__/pre-write-brain-note-mcp.test.ts` | NEW | Unit and smoke tests |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.5d | MCP tool_input shape handling plus dispatch wiring |
| AI-Dominant | 0.5d | Smoke test against fixture is the gating effort |
| AI-Assisted | 0.5d | Matcher-quirk mitigation testing |

## Observations

- [task] Layer 2 closes the MCP write path that Layer 1 cannot reach; without it Brain MCP edits bypass all PreToolUse validation #mcp-coverage
- [risk] Claude Code matcher quirks may cause `mcp__plugin_brain_brain__*` patterns to not fire; the smoke test in DoD is the matcher-risk mitigation per ADR-005 D-8 Failure Modes #matcher-risk
- [technique] MCP tool_input shape differs from local file tools; resolving `identifier` and the four operation types is the bulk of the handler complexity #mcp-shape

## Relations

- implements [[REQ-011-SPEC-008: PreToolUse Blocking Gates]]
- implements [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[REQ-003-SPEC-008: New Claim Validator Suite]]
