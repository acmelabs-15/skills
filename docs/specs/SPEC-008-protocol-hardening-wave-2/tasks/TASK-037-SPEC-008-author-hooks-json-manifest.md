---
title: 'TASK-037-SPEC-008: Author hooks.json Manifest'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-037-spec-008-author-hooks-json-manifest
status: TODO
effort: S
estimate: 0.5d
tags:
- task
- spec-008
- hooks
- hooks-json
- manifest
- wave-2
---

# TASK-037-SPEC-008: Author hooks.json Manifest

## Description

Author `${CLAUDE_PLUGIN_ROOT}/hooks/hooks.json` declaring all seven hook layers from [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 and [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]]. The manifest binds `PreToolUse` Layers 1-5, the `Stop` Layer 6, and the `FileChanged` Layer 7 to their handler scripts under `hooks/scripts/`. Use the exact matchers and `if` filters from the ADR table verbatim. Reference handler scripts via `${CLAUDE_PLUGIN_ROOT}/hooks/scripts/<name>.ts` and invoke with `bun`.

## Definition of Done

- [ ] `hooks/hooks.json` exists at `${CLAUDE_PLUGIN_ROOT}/hooks/hooks.json`
- [ ] Manifest declares `PreToolUse`, `Stop`, and `FileChanged` event blocks
- [ ] Layer 1 PreToolUse declared with matcher `Edit|Write|MultiEdit` and `if: "Edit(docs/**/*.md)|Write(docs/**/*.md)|MultiEdit(docs/**/*.md)"`
- [ ] Layer 2 PreToolUse declared with matcher `mcp__plugin_brain_brain__edit_note|mcp__plugin_brain_brain__write_note`
- [ ] Layer 3 PreToolUse declared with matcher `Bash` and `if: "Bash(git commit *)"`
- [ ] Layer 4 PreToolUse declared with matcher `Bash` and `if: "Bash(git push *)"`
- [ ] Layer 5 PreToolUse declared with matcher `Bash` and `if: "Bash(gh pr create *)"`
- [ ] Stop layer declared with no matcher (fires on every turn end)
- [ ] FileChanged layer declared with matcher `.git/HEAD|.git/index|.git/logs/HEAD`
- [ ] All `command` entries reference `bun ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/<handler>.ts` for the corresponding layer
- [ ] JSON is valid (parses without error)
- [ ] biome lint passes if linted as JSON
- [ ] Manifest file is committed under the plugin root, not under `.claude/settings.json`

## ADR Compliance

- [ ] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 table verbatim (7 layers; exact matchers and `if` filters)
- [ ] Honors plugin-level placement decision (`${CLAUDE_PLUGIN_ROOT}/hooks/` not `.claude/settings.json`)

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `hooks/hooks.json` | NEW | Hook declarations binding all seven layers to their handler scripts |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.5d | JSON authoring against ADR table |
| AI-Dominant | 0.25d | Direct transcription from ADR table |
| AI-Assisted | 0.5d | Manifest assembly with validation |

## Observations

- [task] hooks.json is the manifest entry point; without it none of the handler scripts fire #manifest #entry-point
- [constraint] Must use exact matcher and `if` filter strings from ADR-005 D-8 table; any deviation risks matcher gaps #verbatim #matcher
- [technique] `${CLAUDE_PLUGIN_ROOT}` placeholder resolves at install time so the manifest is portable across install locations #placeholder #portability

## Relations

- implements [[REQ-011-SPEC-008: PreToolUse Blocking Gates]]
- implements [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]]
- implements [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]