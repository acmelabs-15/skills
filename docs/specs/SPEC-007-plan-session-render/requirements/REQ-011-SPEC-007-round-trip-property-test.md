---
title: 'REQ-011-SPEC-007: Round-Trip Property Test'
type: requirement
permalink: specs/spec-007-plan-session-render/requirements/req-011-spec-007-round-trip-property-test
status: ACCEPTED
tags:
- requirement
- spec-007
- round-trip
- property-test
---

# REQ-011-SPEC-007: Round-Trip Property Test

## Requirement Statement

WHEN the plan-note or session-note parser and renderer are applied in sequence
THE SYSTEM SHALL enforce via CI test that `render(parse(md)) === md` (SHA-256 char-identity) for both plan and session note fixtures, where the plan fixture is PLAN-001-skills-ecosystem.md in trimmed template form and the session fixture is SESSION-2026-05-19_01-skills-bootstrap-and-plan-001.md
SO THAT structural fidelity of the parser/renderer pair is gated by a cryptographic invariant, preventing parser/renderer regressions from silently introducing structural drift.

## Pattern

Property Test (CI gate: SHA-256 char-identity assertion on parse-then-render round-trip).

## Priority

P0 -- the round-trip test is the correctness gate for the entire render pipeline per ADR-003 D-8.

## Category

Non-Functional (Correctness Gate)

## Context

ADR-003 D-8 locks the round-trip property test as a CI gate. The invariant mirrors ADR-001 F-8 (SHA-256 char-identity for composition library). ANALYSIS-002 Appendix H provides the test design. The scope of the invariant is structural fidelity: frontmatter shape, section ordering, table schemas, Mermaid graph derivation, observation/relation formatting. Prose mutations break char-identity by design; the gate fires on no-op mutations producing non-zero structural diff.

## Acceptance Criteria

- [ ] GIVEN the trimmed PLAN-001 fixture markdown
      WHEN parsePlanNote then renderPlanNote is applied
      THEN SHA-256 of the output equals SHA-256 of the input

- [ ] GIVEN the SESSION-2026-05-19_01 fixture markdown
      WHEN parseSessionNote then renderSessionNote is applied
      THEN SHA-256 of the output equals SHA-256 of the input

- [ ] GIVEN a no-op plan mutation (e.g., set-part-substatus with from === to)
      WHEN applied and the file is re-rendered
      THEN the output is byte-identical to the input (no incidental structural change)

- [ ] GIVEN a deliberate parser or renderer regression (e.g., missing table column)
      WHEN the round-trip test runs
      THEN the test fails with a SHA-256 mismatch indicating structural drift

- [ ] GIVEN both tests
      WHEN run via bun test
      THEN they execute as part of the standard test suite and can be gated in CI

## Implementation Notes

Test design from ANALYSIS-002 Appendix H. Uses Bun.file().text() for fixture loading and Bun.hash("sha256", ...) for hash computation. The plan fixture requires PLAN-001 to be re-authored in trimmed template form before round-trip parity holds. The session fixture uses the existing SESSION-2026-05-19_01 note.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/src/tests/round-trip.test.ts` | NEW | Round-trip property test for plan and session |
| `shared/composition/src/tests/fixtures/` | NEW | PLAN-001 trimmed fixture + SESSION fixture |

## Observations

- [requirement] Round-trip property test enforces SHA-256 char-identity as CI gate for parser/renderer pair #round-trip #correctness
- [constraint] Structural fidelity scope: prose mutations break char-identity by design; gate fires on no-op structural diff only #scope #structural
- [decision] PLAN-001 and SESSION-2026-05-19_01 are the dogfood fixtures proving the pipeline against real data #dogfood #fixtures

## Relations

- part_of [[SPEC-007: Plan/Session Render Implementation]]
- implements [[ADR-003: Plan/Session Render Architecture]]
- implements [[ADR-001: Composition Library Architecture]]
- depends_on [[REQ-004-SPEC-007: PlanNote Markdown Parser]]
- depends_on [[REQ-005-SPEC-007: SessionNote Markdown Parser]]
- depends_on [[REQ-006-SPEC-007: PlanNote Markdown Renderer]]
- depends_on [[REQ-007-SPEC-007: SessionNote Markdown Renderer]]
