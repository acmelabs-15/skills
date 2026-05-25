---
title: 'QA-087-SPEC-008: REQ-009 SPEC-007 Mutation Count'
type: qa
permalink: qa/qa-087-spec-008-req-009-spec-007-mutation-count-1
status: DONE
tags:
- spec-008
- qa
- track-4
- req-amendment
- audit-d
---

# QA-087-SPEC-008: REQ-009 SPEC-007 Mutation Count

## Objective

Verify TASK-036-SPEC-008 amended REQ-009-SPEC-007 body text from "9 mutation types" to "11 mutation types" and added a PR #14 provenance Observation. The drift was identified by ANALYSIS-004 Audit D: the composition library ships 11 mutation types (transition-impl-item + transition-qa-item added via PR #14 during Phase X Wave 1) while the requirement body still read 9.

- **Feature**: TASK-036-SPEC-008 REQ amendment (spec-vs-code drift fix)
- **Scope**: REQ-009-SPEC-007 body + Observations section
- **Acceptance Criteria**: TASK-036 Definition of Done (5 items)

## Approach

Documentation-correctness verification via Brain MCP `read_note`. No executable test suite applies (Brain note content amendment). Each DoD item maps to a textual assertion against the amended note content.

- **Test Types**: Content-assertion (documentation correctness)
- **Environment**: Brain MCP (project: skills)
- **Data Strategy**: Direct read of source-of-truth note

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 5 | - | - |
| Passed | 5 | - | [PASS] |
| Failed | 0 | 0 | [PASS] |
| Skipped | 0 | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| Zero "9 mutation types" occurrences | Content-assertion | [PASS] | Body reads "supporting 11 mutation types"; only "9" is in "9 to 11" provenance fact |
| At least one "11 mutation types" | Content-assertion | [PASS] | Requirement Statement: "supporting 11 mutation types" |
| PR #14 provenance `[fact]` in Observations | Content-assertion | [PASS] | `[fact] Mutation count expanded from 9 to 11 via PR #14 ...` present |
| `read_note` returns amended content | Content-assertion | [PASS] | Brain MCP read confirmed amended body + Observation |
| Brain MCP only (no raw Edit/Write on docs) | Content-assertion | [PASS] | QA used `read_note`; no generic file tools on `docs/**` |

## Discussion

### Risk Areas

| Area | Risk Level | Rationale |
|------|------------|-----------|
| REQ-009-SPEC-007 body | Low | Single textual amendment; mechanical find_replace; no behavioral change |

### Evidence Detail

- Requirement Statement now reads: "provide a typed mutation API ... supporting 11 mutation types (set-part-substatus, lock-decision, flip-dod-item, add-task, transition-task, surface-pending-decision, resolve-pending-decision, add-blocker, clear-blockers, transition-impl-item, transition-qa-item)". The full 11-member enumeration matches the composition library `applyPlanMutation` set.
- Context, Implementation Notes, Files Affected, and first Observation all consistently reference 11 mutations. No residual "9 mutation types" / "9 plan mutations" / "9 typed" forms remain.
- Provenance Observation: `- [fact] Mutation count expanded from 9 to 11 via PR #14 (added transition-impl-item + transition-qa-item) #provenance #pr-14`.

### Coverage Gaps

| Gap | Reason | Priority |
|-----|--------|----------|
| None | All 5 DoD items verified with evidence | - |

## Recommendations

1. **No further action**: drift fix complete and consistent across the entire REQ-009-SPEC-007 body.

## Verdict

**Status**: PASS
**Confidence**: High
**Rationale**: All 5 TASK-036 DoD items satisfied with direct read-evidence; the 9→11 amendment is consistent across statement, context, files, and observations with PR #14 provenance recorded.

## Observations

- [outcome] TASK-036 PASS: REQ-009-SPEC-007 amended 9 to 11 mutation types with PR #14 provenance #qa-pass #drift-fix
- [fact] Body has zero residual "9 mutation types" forms; "11 mutation types" appears in the Requirement Statement with full 11-member enumeration #content-assertion
- [fact] Provenance `[fact]` Observation cites PR #14 (transition-impl-item + transition-qa-item) as the 9-to-11 expansion source #provenance #pr-14
- [insight] Mechanical single-edit drift fix verified by content assertion; no executable test applies to a Brain note amendment #documentation-correctness

## Relations

- relates_to [[TASK-036-SPEC-008: Amend REQ-009-SPEC-007 Mutation Count from 9 to 11]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]