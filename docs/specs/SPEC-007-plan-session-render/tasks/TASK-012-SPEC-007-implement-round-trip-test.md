---
title: 'TASK-012-SPEC-007: Implement Round-Trip Property Test'
type: task
permalink: specs/spec-007-plan-session-render/tasks/task-012-spec-007-implement-round-trip-test
status: DONE
effort: M
estimate: 1d
tags:
- task
- spec-007
- round-trip
- property-test
---

# TASK-012-SPEC-007: Implement Round-Trip Property Test

## Design Context

This TASK realizes REQ-011-SPEC-007, DESIGN-002-SPEC-007 round-trip strategy, and the test design from ANALYSIS-002 Appendix H.

## Objective

Create `_shared/composition/src/tests/round-trip.test.ts` with two SHA-256 char-identity tests: one for plan notes (using PLAN-001 trimmed fixture) and one for session notes (using SESSION-2026-05-19_01 fixture). Also create the test fixtures in `_shared/composition/src/tests/fixtures/`.

## Scope

**In Scope**:

- round-trip.test.ts with plan and session round-trip tests
- SHA-256 computation via Bun.hash
- PLAN-001 trimmed fixture creation (canonical form via render(parse(hand-authored)))
- SESSION fixture (canonical form of SESSION-2026-05-19_01)
- Fixture bootstrapping process: run render(parse(hand-authored)), adopt output as canonical

**Out of Scope**:

- Mutation testing (separate tests in TASK-010, TASK-011)
- CI pipeline configuration

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `_shared/composition/src/tests/round-trip.test.ts` | NEW | Round-trip property tests |
| `_shared/composition/src/tests/fixtures/plan-001-trimmed.md` | NEW | PLAN-001 trimmed fixture |
| `_shared/composition/src/tests/fixtures/session-fixture.md` | NEW | SESSION round-trip fixture |

## Testing Requirements

- Plan round-trip: SHA-256(renderPlanNote(parsePlanNote(fixture))) === SHA-256(fixture)
- Session round-trip: SHA-256(renderSessionNote(parseSessionNote(fixture))) === SHA-256(fixture)
- Tests run via bun test and can be gated in CI

## Definition of Done

- [ ] Plan round-trip test passes with SHA-256 char-identity on trimmed fixture
- [ ] Session round-trip test passes with SHA-256 char-identity on session fixture
- [ ] Fixtures are in canonical form (output of render(parse(hand-authored)))
- [ ] Tests use Bun.hash("sha256", ...) for hash computation
- [ ] Tests run cleanly via bun test
- [ ] biome lint + tsc --noEmit pass

## ADR Compliance

- [ ] Honors ADR-003 D-8: round-trip property test as CI gate
- [ ] Honors ADR-001 F-8: SHA-256 char-identity invariant
- [ ] Honors ADR-001 F-6: Bun-native APIs (Bun.hash, Bun.file)

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 1.5d | Fixture construction requires iterative round-trip tuning |
| AI-Dominant | 1d | Test code is simple; fixture bootstrapping is iterative |
| AI-Assisted | 1d | Test design from ANALYSIS-002 Appendix H |

## Observations

- [task] Fixture construction is the main effort; the test code itself is 20 lines #fixtures #effort
- [technique] Bootstrap fixtures by running render(parse(hand-authored)) and adopting output as canonical #bootstrapping #canonical
- [constraint] SHA-256 char-identity is a cryptographic gate; any structural diff fails the test #sha256 #blocking

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[REQ-011-SPEC-007: Round-Trip Property Test]]
- implements [[DESIGN-002-SPEC-007: Parser Renderer Round-Trip Strategy]]
- depends_on [[TASK-005-SPEC-007: Implement PlanNote Parser]]
- depends_on [[TASK-006-SPEC-007: Implement SessionNote Parser]]
- depends_on [[TASK-007-SPEC-007: Implement PlanNote Renderer]]
- depends_on [[TASK-008-SPEC-007: Implement SessionNote Renderer]]
- validated_by [[QA-021-SPEC-007: Implement Round-Trip Property Test]]
