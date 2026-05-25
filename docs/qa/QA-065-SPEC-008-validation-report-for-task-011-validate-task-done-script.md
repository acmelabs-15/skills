---
title: 'QA-065-SPEC-008: Validation Report for TASK-011 Validate Task Done Script'
status: DONE
type: qa
permalink: qa/qa-065-spec-008-validation-report-for-task-011-validate-task-done-script-1
tags:
- qa
- spec-008
- task-011
- build-skill
- wave-2
---

# QA-065-SPEC-008: Validation Report for TASK-011 Validate Task Done Script

## Scope

Validates [[TASK-011-SPEC-008: Implement validate-task-done Script]] — the build-skill gate-point script wrapping `validateTaskDoneClaim`. Authority chain: ADR-005 D-1/D-8 → [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]] → [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]] → TASK-011. Branch `feat/plan-001-protocol-hardening-wave-2-scope`. Independent QA (separate agent from implementer; tests re-run by QA).

## Verdict

**[PASS]** — all 7 DoD items satisfied; 6/6 colocated tests pass; tsc + biome clean; import boundary clean; path-containment prefix-collision case correctly rejected; no new regressions (suite 845/2/847; the 2 fails are the SPEC-007 deferred baseline).

## Per-DoD Evidence

| DoD Item | Status | Evidence |
| --- | --- | --- |
| 1. Reads path, path-containment vs cwd, parseTaskNote, validateTaskDoneClaim, exits 0/1/2 | [PASS] | `validate-task-done.ts:20-58` |
| 2. import.meta.main guard + exports main | [PASS] | L57 guard, L61 `export { main }` |
| 3. Test exit 0 when all DoD checked | [PASS] | test "exit 0 when every DoD item is checked" |
| 4. Test exit non-zero on unchecked DoD + status DONE | [PASS] | status:DONE+unchecked → schema parse failure → exit 2 (satisfies parent REQ-004 AC "exits non-zero"); IN_PROGRESS+unchecked → exit 1. Both tested. |
| 5. Test exit 2 on `..` path | [PASS] | test "exit 2 on a path containing '..' segments" |
| 6. Imports only shared/composition + node/bun | [PASS] | L16-18 (`node:path` + parser + validator) |
| 7. biome + tsc pass | [PASS] | tsc exit 0; biome "No fixes applied" |

## REQ-004 AC + DESIGN-002 Compliance

- Path-containment EXACT form `resolved === root || resolved.startsWith(root + sep)` (L32) — rejects `../`, absolute-outside-root, AND the prefix-collision sibling (`<root>-sibling/x.md`); the `+ sep` suffix is load-bearing. [PASS]
- import.meta.main guard + colocated test asserts both success and failure paths. [PASS]
- DESIGN-002 line count: 61 lines (under the 80 ceiling). [PASS]

## Observations

- [outcome] validate-task-done.ts is a 61-line thin wrapper; 6/6 colocated tests green covering exit 0/1/2 paths #gate-point-script #wave-2
- [fact] Real parse path is `parseTaskNote(markdown)` → `TaskNoteSchema.parse(model)`; the DESIGN-002 representative `TaskNoteSchema.parse(text)` shape was reconciled to the actual parser API #parser-api
- [decision] DoD#4 reconciliation: status:DONE+unchecked is mechanically a parse failure (exit 2) per schema superRefine, satisfying parent REQ-004 AC wording "exits non-zero"; exit-1 path tested via a parseable IN_PROGRESS note #spec-reconciliation #req-004

## Relations

- relates_to [[TASK-011-SPEC-008: Implement validate-task-done Script]]
- relates_to [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]]
- relates_to [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]