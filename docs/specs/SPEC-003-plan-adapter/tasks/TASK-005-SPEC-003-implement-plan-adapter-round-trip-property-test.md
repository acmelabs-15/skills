---
title: 'TASK-005-SPEC-003: Implement PLAN Adapter Round-Trip Property Test'
type: task
status: TODO
effort: S
estimate: 0.5d
permalink: specs/spec-003-plan-adapter/tasks/task-005-spec-003-implement-plan-adapter-round-trip-property-test
tags:
- task
- spec-003
- round-trip
- property-test
---

# TASK-005-SPEC-003: Implement PLAN Adapter Round-Trip Property Test

## Design Context

This TASK realizes the PLAN adapter PROOF gate: SHA-256(original non-regenerative content) === SHA-256(recomposed non-regenerative content). Extends the SPEC-001 round-trip property test pattern to the PLAN source type with regenerated_sections exclusion.

## Objective

Implement the round-trip property test for the PLAN adapter that proves zero content drift on structural/narrative content while allowing regenerative sections to be regenerated. The test exercises the full decompose/recompose cycle using fixture plan YAMLs from TASK-004.

## Scope

**In Scope**: Round-trip property test at _shared/composition/tests/plan-round-trip.test.ts, parse/serialize identity precondition test, decompose/recompose cycle with regenerated_sections exclusion, frontmatter_map mutation and reversal during the cycle, hash comparison with regenerative sections excluded
**Out of Scope**: PLAN adapter implementation (TASK-001 through TASK-003), fixture creation (TASK-004)

## Implementation Notes

The test follows the pattern established by SPEC-001 TASK-009:

```typescript
const original = await Bun.file(fixturePath).text();
const plan = loadAndValidatePlan(distributionPlanPath);
const decomposed = decompose(original, plan);
const inversePlan = loadAndValidatePlan(compositionPlanPath);
const recomposed = recompose(decomposed, inversePlan);

// Strip regenerated sections from both sides before hash comparison
const originalStripped = stripRegenerativeSections(original, plan.regenerated_sections);
const recomposedStripped = stripRegenerativeSections(recomposed, plan.regenerated_sections);

expect(sha256(originalStripped)).toBe(sha256(recomposedStripped));
```

The test also validates the parse/serialize precondition: serialize(parse(original)) === original. This must pass before the full decompose/recompose cycle is attempted.

The test validates that frontmatter mutations (title, permalink, branches[]) are correctly applied during decompose and reversed during recompose such that the hash comparison passes.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| _shared/composition/tests/plan-round-trip.test.ts | NEW | PLAN adapter round-trip property test |

## Testing Requirements

- parse/serialize round-trip identity holds for PLAN fixture
- decompose/recompose cycle produces hash-equal output (excluding regen sections)
- frontmatter mutations are correctly applied and reversed
- regenerated_sections are excluded from hash scope on both sides
- Test uses fixtures from TASK-004

## Definition of Done

- [ ] parse(content) followed by serialize(parse(content)) produces char-identical output for PLAN fixture
- [ ] SHA-256(original stripped) === SHA-256(recomposed stripped) for the full decompose/recompose cycle
- [ ] Regenerated sections correctly excluded from hash scope
- [ ] Frontmatter mutations applied during decompose and reversed during recompose
- [ ] Test passes via bun test with deterministic fixture inputs

## ADR Compliance

- [ ] Honors ADR-001 F-8: SHA-256 char-identity hash check is BLOCKING invariant
- [ ] Honors ADR-002 D-4: PLAN extraction strategy with regenerative-section carve-out

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1d | Test logic with regen exclusion and frontmatter reversal |
| AI-Dominant | 0.5d | Pattern established by SPEC-001 TASK-009 |
| AI-Assisted | 0.5d | Fixture-driven; logic follows ADR-002 D-4 |

## Observations

- [requirement] Round-trip property test is the PROOF gate for the PLAN adapter: zero drift on structural/narrative content #proof #plan-adapter
- [technique] Strip regenerated sections from both original and recomposed before hash comparison for fair evaluation #regen-exclusion #hash
- [constraint] Parse/serialize identity is a precondition that must pass before the full cycle is attempted #precondition #blocking

## Relations

- part_of [[SPEC-003: PLAN Adapter]]
- implements [[REQ-005-SPEC-003: PLAN Adapter Round-Trip Property Test]]
- depends_on [[TASK-001-SPEC-003: Implement PLAN Adapter Base]]
- depends_on [[TASK-002-SPEC-003: Implement Regenerated Sections Handler and Integrity Floor]]
- depends_on [[TASK-003-SPEC-003: Implement PLAN Frontmatter Mutations]]
- depends_on [[TASK-004-SPEC-003: Create PLAN Adapter Test Fixtures]]
- relates_to [[TASK-009-SPEC-001: Implement Round-Trip Property Test and ADR Fixtures]]
