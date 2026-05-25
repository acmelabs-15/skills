---
title: 'TASK-038-SPEC-008: Implement dispatch-validator Utility'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-038-spec-008-implement-dispatch-validator-utility
status: DONE
effort: M
estimate: 1d
tags:
- spec-008
- hooks
- dispatch
- validator
- wave-2
---

# TASK-038-SPEC-008: Implement dispatch-validator Utility

## Objective

Implement `hooks/lib/dispatch-validator.ts` per [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]]. The module reads parsed Brain note content, identifies the frontmatter `type:` value, routes to the matching claim validator from `shared/composition/src/validators/`, and returns a `DispatchOutcome` of `{ verdict: "deny" | "allow-with-warning" | "allow", reason?, warning? }`. The dispatch routing table covers the Wave 1 validators (`validateTaskDoneClaim`, `validateRequirementAcClaim`, `validateDesignComplianceClaim`, `validateSpecDoneClaim`, `validateQaPassClaim`) plus the Wave 2 validators authored under [[REQ-003-SPEC-008: New Claim Validator Suite]]. Schema parse failures map to deny if they touch status-flip claim contracts; non-blocking schema issues (missing tags, observation count below threshold) map to allow-with-warning. Unparseable input throws and surfaces to the caller, which converts to a structured stderr error.

## Definition of Done

- [x] `hooks/lib/dispatch-validator.ts` exists
- [x] Exports `dispatchValidator(noteContent: string, filePath: string): DispatchOutcome`
- [x] Routing table maps frontmatter `type:` values (`task`, `requirement`, `design`, `spec`, `qa`, `decision`, `plan`, `analysis`, `epic`) to the matching schema and claim validator
- [x] Status-flip claim failures return `{ verdict: "deny", reason: "<schema-name>: status=<value> requires ...; failing: <item>" }`
- [x] Non-blocking schema issues return `{ verdict: "allow-with-warning", warning: "Schema warning: <detail> (non-blocking)" }`
- [x] Notes that pass cleanly return `{ verdict: "allow" }`
- [x] Unparseable input throws an explicit `UnparseableNoteError` carrying the original Zod issue list
- [x] Unit tests cover each note type with one passing fixture and one denying fixture
- [x] Unit tests cover the non-blocking schema warning path with a representative low-severity issue
- [x] biome lint passes
- [x] `bun tsc --noEmit` passes

## ADR Compliance

- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-2 directory layout (imports validators from `shared/composition/src/validators/`)
- [x] Honors [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-8 hybrid failure semantics (three-way verdict)

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `hooks/lib/dispatch-validator.ts` | NEW | Frontmatter-type-to-validator routing |
| `hooks/lib/__tests__/dispatch-validator.test.ts` | NEW | Unit tests for the dispatch table |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Routing table plus unit tests |
| AI-Dominant | 0.5d | Pattern follows Wave 1 validator dispatch |
| AI-Assisted | 1d | Routing assembly with adversarial fixtures |

## Observations

- [fact] dispatch-validator is the single chokepoint between hook handlers and the validator catalog; new validators land in the routing table here and nowhere else #single-source-of-truth
- [decision] Three-way verdict (`deny` | `allow-with-warning` | `allow`) encodes the hybrid failure semantics from ADR-005 D-8 as a typed contract rather than ad-hoc strings #verdict-shape
- [constraint] Module MUST NOT throw on validator-reachable rejection; it returns `deny`. Only unparseable input throws, mapping infrastructure failures away from schema rejections #error-boundary

## Relations

- implements [[REQ-011-SPEC-008: PreToolUse Blocking Gates]]
- implements [[REQ-012-SPEC-008: Stop Backstop and File Changed Observability]]
- implements [[DESIGN-004-SPEC-008: Hook Layer and Plugin Directory Layout]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[REQ-003-SPEC-008: New Claim Validator Suite]]
- relates_to [[QA-076-SPEC-008: Validation Report for TASK-038 dispatch-validator Utility]]
