---
title: 'QA-066-SPEC-008: Validation Report for TASK-015 Spec Schema Validator Scripts'
status: DONE
type: qa
permalink: qa/qa-066-spec-008-validation-report-for-task-015-spec-schema-validator-scripts
tags:
- qa
- spec-008
- task-015
- spec-skill
- wave-2
---

# QA-066-SPEC-008: Validation Report for TASK-015 Spec Schema Validator Scripts

## Scope

Validates [[TASK-015-SPEC-008: Implement spec-Skill Schema Validator Scripts]] — three schema-only validator scripts (`validate-task-schema.ts`, `validate-req-schema.ts`, `validate-design-schema.ts`) for the spec skill. Authority chain: ADR-005 D-1/D-8 → [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]] → [[DESIGN-002-SPEC-008: Per-Skill Script Layout and CLI Contract]] → TASK-015. Branch `feat/plan-001-protocol-hardening-wave-2-scope`. Independent QA (tests re-run by QA).

## Verdict

**[PASS]** — all 5 DoD items satisfied across all 3 scripts; 15/15 colocated tests pass; tsc + biome clean; import boundary clean; path-containment prefix-collision case correctly rejected; no new regressions.

## Per-DoD Evidence

| DoD Item | Status | Evidence |
| --- | --- | --- |
| 1. Each: path-containment, schema parser, exit 0 valid / exit 2 Zod issues invalid | [PASS] | `resolveContained()` L42-47 in each; parser in try/catch; `zodIssues()` surfaces issue tree to stderr |
| 2. Each has import.meta.main guard | [PASS] | task-schema L79, req-schema L78, design-schema L78 |
| 3. Tests assert exit 0 conformant + exit 2 Zod payload malformed | [PASS] | each test file has both; 15 tests total |
| 4. Imports only shared/composition + node/bun | [PASS] | each: `node:path` + one `shared/composition/src/parsers/*` |
| 5. biome + tsc pass | [PASS] | tsc exit 0; biome clean |

## Per-Script Detail

- `validate-task-schema.ts` (81 lines) — `parseTaskNote`; 5 tests.
- `validate-req-schema.ts` (80 lines) — `parseRequirementNote`; 5 tests.
- `validate-design-schema.ts` (80 lines) — `parseDesignNote`; 5 tests.

## REQ-004 AC + DESIGN-002 Compliance

- Path-containment EXACT form `target.startsWith(root + sep)` (L45 each) — rejects `../`, absolute-outside, AND prefix-collision sibling. [PASS]
- Schema-only validators: exit 0 valid / exit 2 on parse failure (Zod issue tree to stderr). Exit 1 unused by design (no claim check). [PASS]
- DESIGN-002 line count: 80/80/81. `validate-task-schema.ts` is 1 line over the 80 soft ceiling (a `CaptureResult` interface export for test ergonomics) — non-blocking; carried to DESIGN-002 acceptance disposition. [PASS-with-note]

## Observations

- [outcome] Three near-identical schema-only validators; 15/15 colocated tests green; clean separation from claim validators (schema failure = malformed structure, not premature terminal status) #spec-skill #separation-of-concerns
- [fact] Validators detect ZodError structurally (duck-typing `.issues`) rather than importing the `zod` class, keeping the import boundary strict (only composition parsers + node/bun) #import-boundary #zod
- [decision] Schema failure surfaces the full Zod issue tree to stderr so spec authors see exactly which field is malformed #traceability

## Relations

- relates_to [[TASK-015-SPEC-008: Implement spec-Skill Schema Validator Scripts]]
- relates_to [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]]
- relates_to [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]