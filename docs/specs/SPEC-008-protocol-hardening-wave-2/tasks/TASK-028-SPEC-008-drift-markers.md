---
title: 'TASK-028-SPEC-008: Annotate Existing Tests with Phase X Drift Markers'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-028-spec-008-drift-markers
status: TODO
effort: S
estimate: 0.25d
tags:
- task
- spec-008
- track-3
- regression
- markers
---

# TASK-028-SPEC-008: Annotate Existing Tests with Phase X Drift Markers

## Description

Insert `// drift-marker: <PHASE-X-DRIFT-SURFACE-ID> — <one-line>` source-code comments on five existing test cases in `shared/composition/tests/` that regression-lock Phase X drift surfaces from [[RETRO-003: Phase X Execution and Composition Library Completion]] (37 surfaces enumerated). The five selected for this REQ are listed in REQ-007 Context. Each insertion is a one-line surgical edit that does not alter test behavior. The drift-marker convention makes the test-to-drift-surface mapping greppable from any test entry-point.

## Definition of Done

- [ ] Five existing test files (or five existing `describe`/`test` blocks within fewer files) carry one `// drift-marker:` comment each
- [ ] Each marker matches the canonical format: `// drift-marker: <drift-surface-id> — <one-line-description>`
- [ ] Suggested mappings (verify each against actual existing test content; substitute equivalents if exact match unavailable): (1) `plan-001-migration.test.ts` → `plan-001-trimmed-template-canonical-form` (PLAN-001 trimmed template canonical-form drift); (2) `spec-claim-validator.test.ts` → `spec-002-spec-003-rollup-drift` (SPEC-002/003 SPEC-vs-TASK rollup drift); (3) `schemas.test.ts` (duplicate-frontmatter handling) → `qa-027-qa-030-duplicate-frontmatter` (QA-027/QA-030 duplicate-frontmatter-block drift); (4) `validators.test.ts` (or relation-verb validator) → `qa-027-validates-relation-verb` (QA-027 forbidden `validates` relation type drift); (5) the new TASK-027 duplicate-event-number test → `session-2026-05-21-01-duplicate-events` (count this as one of the five even though the test is new; the drift surface it regression-locks is documented Phase X)
- [ ] `git grep "// drift-marker:" shared/composition/tests/` returns at least five matches
- [ ] No test behavior changes; `bun test` continues to pass with the same test count as before TASK-028 (modulo TASK-021 through TASK-027 additions)
- [ ] `biome lint` and `tsc --noEmit` pass

## ADR Compliance

- [ ] Honors REQ-007 AC-6: at least five existing tests carry `// drift-marker:` comments in canonical format
- [ ] Honors REQ-007 AC-7: each marker maps to a documented Phase X drift surface from RETRO-003

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/tests/plan-001-migration.test.ts` | MODIFY | Add drift-marker comment |
| `shared/composition/tests/spec-claim-validator.test.ts` | MODIFY | Add drift-marker comment |
| `shared/composition/tests/schemas.test.ts` | MODIFY | Add drift-marker comment (duplicate-frontmatter handling) |
| `shared/composition/tests/validators.test.ts` | MODIFY | Add drift-marker comment (relation-verb validator) |
| (TASK-027's new block) | MODIFY | Already carries a drift-marker from TASK-027 DoD; counts as the fifth |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.5d | Identify the exact existing test block per drift surface; surgical comment insertion |
| AI-Dominant | 0.25d | Mechanical edit per file |
| AI-Assisted | 0.25d | Five one-line insertions |

## Observations

- [task] Source-code comment marker chosen over a separate registry to keep mappings greppable from any test entry-point #grep-friendly
- [technique] Drift surface IDs come from RETRO-003 Phase X enumeration; consistent IDs lower future contributor confusion #consistent-ids
- [constraint] Marker insertion MUST NOT alter test behavior; comments only, no logic changes #behavior-preservation

## Relations

- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- implements [[REQ-007-SPEC-008: Integration Tests and Mutation Tests and Drift Regression Markers]]
- depends_on [[RETRO-003: Phase X Execution and Composition Library Completion]]
