---
title: 'QA-050-SPEC-008: Author hooks.json Manifest'
type: qa
permalink: qa/qa-050-spec-008-author-hooks-json-manifest
tags:
- qa
- spec-008
- task-037
- hooks-manifest
- verdict-pass
---

# QA-050-SPEC-008: Author hooks.json Manifest

## Summary

Per-TASK QA gate for [[TASK-037-SPEC-008: Author hooks.json Manifest]]. Independent re-validation by brain:🧠-qa (`ac785498b7d2b4175`) against committed state. Verdict: **PASS** — 13 DoD all green (12 PASS + 1 sound `[~]` deferral); 7 layers verbatim per ADR-005 D-8.

## Verdict

**PASS** — every matcher and `if` filter matches ADR-005 D-8 character-for-character. Handler script names use the correct `-validate` suffix per ADR-005 D-8 Implementation Notes (lines 434-440). JSON valid. File at plugin-root `hooks/hooks.json`.

## DoD validation

| Item | Result | Evidence |
|---|---|---|
| 1 — `hooks/hooks.json` exists at plugin root | PASS | repo-root `hooks/hooks.json`, 83 lines |
| 2 — `PreToolUse`, `Stop`, `FileChanged` blocks declared | PASS | `jq '.hooks \| keys'` → `["FileChanged","PreToolUse","Stop"]` |
| 3 — Layer 1 PreToolUse matcher `Edit\|Write\|MultiEdit` + `if` filter verbatim per ADR | PASS | character-for-character match |
| 4 — Layer 2 PreToolUse matcher `mcp__plugin_brain_brain__edit_note\|...write_note` | PASS | exact match; no `if` (correct — ADR has none for L2) |
| 5 — Layer 3 PreToolUse `Bash` + `if: "Bash(git commit *)"` | PASS | exact match |
| 6 — Layer 4 PreToolUse `Bash` + `if: "Bash(git push *)"` | PASS | exact match |
| 7 — Layer 5 PreToolUse `Bash` + `if: "Bash(gh pr create *)"` | PASS | exact match |
| 8 — Stop layer NO matcher | PASS | Stop entry has only `hooks` array; no `matcher` key |
| 9 — FileChanged matcher `.git/HEAD\|.git/index\|.git/logs/HEAD` | PASS | exact match per ADR row 7 |
| 10 — all `command` entries reference `bun ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/<handler>.ts` | PASS | all 7 use the placeholder + ADR Implementation Notes filenames (`-validate` suffixed for L3/4/5) |
| 11 — JSON valid | PASS | `jq .` parses cleanly |
| 12 — biome lint N/A | PASS-`[~]` | biome.json `files.include` scopes to defrag/ingest/shared/detect-context; `hooks/hooks.json` correctly excluded; deferral sound |
| 13 — manifest at plugin root, NOT `.claude/settings.json` | PASS | no `.claude/settings.json` hooks key; file at `<repo-root>/hooks/hooks.json` |

## ADR-005 D-8 verbatim compliance

7/7 matchers + 4/4 `if` filters character-for-character match the ADR table. Handler script names per ADR Implementation Notes (line 434-440 of ADR-005), not the dispatch brief I issued (brief had outdated names `pre-commit.ts`/`pre-push.ts`/`pre-pr-create.ts`; ADR specifies `-validate` suffix). Implementer caught the divergence and followed the ADR — correct spec-is-authority discipline.

## REQ in-scope ACs (manifest slice)

- REQ-011 (PreToolUse Blocking Gates): manifest layer of the contract is satisfied; handler scripts land in TASK-041..045.
- REQ-012 (Stop Backstop + FileChanged Observability): manifest layer satisfied; handler scripts land in TASK-044..045.

## DESIGN-004 compliance

| Item | Result |
|---|---|
| Plugin-root placement (`hooks/hooks.json`, NOT `.claude/settings.json`) | PASS |
| Manifest structure matches DESIGN-004 example | PASS (additive `statusMessage` fields valid per Claude Code hooks contract) |
| `${CLAUDE_PLUGIN_ROOT}` placeholder used | PASS |

## Notes on `statusMessage` additive enhancement

The impl added `statusMessage` fields per hook entry — not in the ADR table but a valid Claude Code hooks contract property. Additive, not divergent. No DoD violation.

## Observations

- [outcome] TASK-037 hooks.json validated PASS; 7 layers verbatim per ADR-005 D-8; JSON valid; handler-name `-validate` suffix correctly followed ADR Implementation Notes #qa #hooks-manifest
- [fact] 7 hook layers: 5 PreToolUse blocking + 1 Stop backstop + 1 FileChanged observability — all matcher/if strings exactly match ADR D-8 #verbatim-compliance
- [insight] The dispatch brief had outdated handler filenames; impl correctly followed the ADR over the brief — spec-is-authority discipline held #brief-vs-spec
- [decision] biome scope-exclusion of `hooks/` is intentional (biome.json files.include narrows to defrag/ingest/shared); `[~]` deferral on the biome DoD item is sound #biome-scope
- [risk] handler scripts referenced by command paths don't yet exist (TASKs 041-045 land them); the manifest is harmless until handlers are in place; tracked in PLAN dependency graph #handler-followup

## Relations

- relates_to [[TASK-037-SPEC-008: Author hooks.json Manifest]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[REQ-011-SPEC-008: PreToolUse Blocking Gates]]
- relates_to [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]]
- relates_to [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]]