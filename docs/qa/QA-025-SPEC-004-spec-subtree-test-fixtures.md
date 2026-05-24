---
title: 'QA-025-SPEC-004: SPEC Subtree Test Fixtures'
type: qa
permalink: qa/qa-025-spec-004-spec-subtree-test-fixtures
status: DONE
tags:
- qa
- spec-004
- fixtures
- task-006-spec-004
---

# QA-025-SPEC-004: SPEC Subtree Test Fixtures

## Objective

Verify TASK-006-SPEC-004 ships realistic SPEC subtree fixtures (SPEC root + REQ + DESIGN + TASK) plus distribution + composition plan YAMLs per REQ-006-SPEC-004.

- **Feature**: SPEC subtree test fixtures (TASK-006-SPEC-004)
- **Scope**: `_shared/composition/tests/fixtures/spec-subtree/**`, `tests/fixtures/spec-subtree-distribution.plan.yaml`, `tests/fixtures/spec-subtree-composition.plan.yaml`
- **Acceptance Criteria**: TASK-006 DoD

## Approach

- **Test Types**: Manual inspection + schema validation
- **Environment**: Local (Bun 1.3.13, biome)
- **Data Strategy**: Direct file enumeration + reading
- **Test File**: n/a (fixtures consumed by spec-subtree-round-trip.test.ts + spec-subtree-schema.test.ts)

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 1 | - | - |
| Passed | 1 | - | [PASS] |
| Failed | 0 | - | - |
| Skipped | 0 | - | - |
| Assertions | 1 | - | - |
| Execution Time | <50ms | - | - |

### Test Results by Category

| Test | Category | Status | Notes |
|------|----------|--------|-------|
| schema validates a full distribution plan derived from fixture content | Integration | PASS | spec-subtree-round-trip.test.ts:179 — exercises fixture-derived plan against schema |

## Findings

### Fixture inventory

Files found under `_shared/composition/tests/fixtures/`:

| File | Present | Notes |
|------|---------|-------|
| `spec-subtree/SPEC-001-composition-core.md` | YES | SPEC root with Phases + Observations + Relations |
| `spec-subtree/requirements/REQ-001-SPEC-001-adapter-interface.md` | YES | REQ child (EARS form) |
| `spec-subtree/requirements/REQ-002-SPEC-001-hash-utility.md` | YES | Second REQ child |
| `spec-subtree/design/DESIGN-001-SPEC-001-test-design.md` | **NO** | **GAP** — DoD requires DESIGN child fixture |
| `spec-subtree/tasks/TASK-001-SPEC-001-scaffold.md` | YES | TASK child with DoD checkboxes |
| `spec-subtree-distribution.plan.yaml` | YES | Distribution plan with subtree_manifest |
| `spec-composition.plan.yaml` or `spec-subtree-composition.plan.yaml` | **NO** | **GAP** — DoD requires composition plan YAML; only `adr-composition.plan.yaml` exists |

### DoD Coverage Table

| DoD Item | Status | Evidence |
|----------|--------|----------|
| SPEC root fixture follows CONVENTIONS Section 4.7 (Context, Scope, Phases, Effort Summary, Observations, Relations) | PARTIAL | SPEC-001-composition-core.md has Overview, Phases, Observations, Relations — missing Context, Scope, Effort Summary sections |
| REQ fixture follows CONVENTIONS Section 4.9 (EARS format with Given/When/Then AC) | PARTIAL | REQ-001 has EARS WHEN/SHALL phrasing but uses `## EARS` section heading instead of Given/When/Then acceptance criteria checkboxes |
| DESIGN fixture follows CONVENTIONS Section 4.8 (Component Architecture, interfaces) | FAIL | NO DESIGN fixture file exists in `tests/fixtures/spec-subtree/design/`. Fixture has 2 REQs instead of 1 REQ + 1 DESIGN. |
| TASK fixture follows CONVENTIONS Section 4.8 (DoD checkboxes, effort/estimate frontmatter, Files Affected) | PARTIAL | TASK-001-SPEC-001-scaffold.md has DoD checkboxes — but no effort/estimate frontmatter or Files Affected section |
| Distribution plan YAML validates against specSubtreeManifestSchema | PASS | spec-subtree-round-trip.test.ts:179 + schema test validates structure |
| Composition plan YAML is the mathematical inverse of the distribution plan | FAIL | NO composition plan YAML exists for spec-subtree |
| All fixtures pass biome lint | PASS | `bunx biome check tests/fixtures/spec-subtree/` clean |

### REQ-006 fixture requirements coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Fixture has 1 SPEC root + 1 REQ + 1 DESIGN + 1 TASK (4 files minimum) | FAIL | Fixture has SPEC root + 2 REQ + 1 TASK + 0 DESIGN = 4 files but wrong type distribution |
| Intra-spec wikilinks present (SPEC root referencing child REQs/TASKs) | PASS | SPEC root Relations lists `contains [[REQ-001-SPEC-001: Adapter Interface]]` etc. |

### Verdict

**Status**: FAIL
**Confidence**: High
**Rationale**: Two of the six TASK-006 DoD items materially FAIL: (1) no DESIGN fixture file exists — fixture has 2 REQs instead of 1 REQ + 1 DESIGN, which means TASK-007's round-trip test cannot exercise DESIGN-type child mutation; (2) no composition plan YAML exists, breaking the mathematical-inverse-pair contract. Other fixtures are CONVENTIONS-light but functional for round-trip purposes.

## Observations

- [problem] No DESIGN fixture in `tests/fixtures/spec-subtree/design/` — DoD + REQ-006 AC explicitly require DESIGN-type child #dod-gap #coverage
- [problem] No composition plan YAML for spec-subtree — the "mathematical inverse" pair is incomplete #dod-gap
- [fact] Fixture has 4 files total (root + 2 REQ + 1 TASK) but child-type distribution is wrong (should be 1 REQ + 1 DESIGN + 1 TASK) #fixture-shape
- [insight] CONVENTIONS Section 4.7/4.8/4.9 compliance is light (missing Context/Scope/Effort Summary; EARS uses heading not GWT checkboxes; TASK missing effort/Files Affected) — sufficient for round-trip mechanics but not exemplary #conventions

## Relations

- depends_on [[TASK-006-SPEC-004: SPEC Subtree Test Fixtures]]
- part_of [[SPEC-004: SPEC Subtree Adapter]]
