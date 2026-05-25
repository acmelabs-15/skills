---
title: 'QA-027-SPEC-004: Spec-Aggregate Retro-Validation'
type: qa
permalink: qa/qa-027-spec-004-spec-aggregate-retro-validation
status: DONE
tags:
- qa
- spec-004
- aggregate
- retro-validation
---

# QA-027-SPEC-004: Spec-Aggregate Retro-Validation

## Objective

Aggregate retro-validation verdict for SPEC-004 SPEC Subtree Adapter against its 7 TASKs, 6 REQs, 3 DESIGNs after Wave 2 integration. Roll up per-TASK QA-020 through QA-026 verdicts. Determine whether implementation as-built honors the spec subtree.

- **Feature**: SPEC-004 SPEC Subtree Adapter
- **Scope**: `shared/composition/src/adapters/spec-subtree.ts`, `schemas/distribution/spec-subtree.plan.schema.ts`, `schemas/composition/spec-subtree.plan.schema.ts`, `tests/spec-subtree-adapter.test.ts`, `tests/spec-subtree-round-trip.test.ts`, `tests/spec-subtree-schema.test.ts`, fixtures
- **Acceptance Criteria**: SPEC-004 root Acceptance Criteria + per-REQ AC + per-DESIGN compliance + per-TASK DoD

## Approach

- **Test Types**: Aggregate of unit + integration + property + manual fixture review
- **Environment**: Local (Bun 1.3.13, biome, tsc strict via project tsconfig)
- **Data Strategy**: Existing test suite + manual code inspection of spec-subtree.ts + schema files + fixtures
- **Test File**: Aggregate across `shared/composition/tests/spec-subtree-*.test.ts`

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tests Run | 27 | - | - |
| Passed | 27 | - | [PASS] |
| Failed | 0 | 0 | [PASS] |
| Skipped | 0 | - | - |
| Assertions | 57 | - | - |
| Execution Time | 94ms | <5s | [PASS] |

### Per-TASK roll-up

| TASK | QA | Verdict |
|------|-------------|---------|
| TASK-001 Implement SPEC Subtree Adapter Recursive Base | QA-020 | PARTIAL |
| TASK-002 Implement Frontmatter Map Handler | QA-021 | PARTIAL |
| TASK-003 Implement Filename Rewrite Handler | QA-022 | FAIL |
| TASK-004 Implement Per-File Hash Validation Orchestration | QA-023 | PARTIAL |
| TASK-005 Implement specSubtreeManifestSchema Zod Validator | QA-024 | FAIL |
| TASK-006 SPEC Subtree Test Fixtures | QA-025 | FAIL |
| TASK-007 SPEC Adapter Round-Trip Property Test | QA-026 | PARTIAL |

### Per-REQ AC roll-up

| REQ | AC verdict |
|-----|------------|
| REQ-001 SPEC Subtree Adapter Implementation | PARTIAL (sourceType drift, processSubtree missing) |
| REQ-002 Frontmatter Map Mutations | PASS (functionally; minor coverage gaps) |
| REQ-003 Filename Rewrite Per Child | FAIL (zero tests, missing pre-flight) |
| REQ-004 Per-File Hash Validation | PARTIAL (PROOF passes; no .tmp orchestration) |
| REQ-005 SPEC Subtree Manifest Zod Schema | FAIL (shape diverges, empty-children AC contradicted, destinations not contained) |
| REQ-006 Round-Trip Property Test | PARTIAL (DESIGN child missing; no frontmatter_map / filename_rewrite_map in PROOF) |

### Per-DESIGN compliance roll-up

| DESIGN | Compliance |
|--------|------------|
| DESIGN-001 SPEC Subtree Adapter Architecture | PARTIAL (Component 1 signature drift; Component 2 SubtreeOrchestrator not implemented; Component 3 private vs exported helper) |
| DESIGN-002 Filename Rewrite Coordination | FAIL (Component 1 signature drift; Component 2 not implemented; injectivity + path-containment pre-flight missing) |
| DESIGN-003 Per-File Hash Validation Strategy | PARTIAL (4-step protocol satisfied mathematically; Component 1 signature drift; Component 2 ClusterRollback not implemented; no collect-then-validate) |

### SPEC-004 root Acceptance Criteria

| AC | Status | Evidence |
|----|--------|----------|
| SpecSubtreeAdapter compiles with tsc strict mode implementing CompositionAdapter interface | PASS | `bunx tsc --noEmit -p tsconfig.json` clean |
| Per-file hash validation passes for all files in test fixture subtree (4+ files) | PASS | spec-subtree-round-trip.test.ts THE PROOF |
| Frontmatter mutations (title, permalink) are reversible for hash comparison | PASS | spec-subtree-adapter.test.ts:151 + round-trip |
| Filename rewrites execute after hash validation with rollback on failure | PARTIAL | Implementation present but untested; no test exercises filename rewrite end-to-end |
| specSubtreeManifestSchema validates valid manifests and rejects non-injective maps + path traversal | PARTIAL | Path traversal + injectivity on `relative_path` PASS; destinations + per-entry mutations not validated |
| Round-trip property test passes: per-file SHA-256(original) === SHA-256(recomposed) for entire subtree | PASS | THE PROOF passes |
| All 7 TASKs reach DONE via /build per-TASK cycle | FAIL | TASK status DRAFT pre-revert; 2 FAIL + 4 PARTIAL + 0 PASS verdicts in retro-validation |

## Findings

### Gap-TASKs filed

5 gap-TASKs authored to address findings (status DRAFT, awaiting orchestrator scheduling):

1. **TASK-008-SPEC-004: Add Adapters Barrel and Align sourceType to spec** — addresses barrel + naming drift from QA-020
2. **TASK-009-SPEC-004: Implement Filename Rewrite Unit Tests and Path Containment** — addresses zero-test coverage + missing pre-flight from QA-022
3. **TASK-010-SPEC-004: Add DESIGN Fixture and Composition Plan YAML** — addresses missing DESIGN child + composition YAML from QA-025
4. **TASK-011-SPEC-004: Align Schema Shape to ADR-002 D-5 and REQ-005 AC** — addresses ADR-002 D-5 divergence, empty-children AC, destination path containment from QA-024
5. **TASK-012-SPEC-004: Align Adapter Orchestration to DESIGN-001 and DESIGN-003** — addresses processSubtree / SubtreeOrchestrator / ClusterRollback drift from QA-020 + QA-023

TASK-008, TASK-011, TASK-012 require user adjudication (impl-vs-design boundary) before code work.

### Aggregate Verdict

**Status**: FAIL
**Confidence**: High
**Rationale**: The core cryptographic invariant — per-file SHA-256 identity across decompose -> recompose — is **proven and passes** for the in-memory adapter path. However, multiple SPEC-004 root Acceptance Criteria are not satisfied: filename rewrite has zero tests (REQ-003 fully untested), schema architecture diverges from ADR-002 D-5 (REQ-005 AC5 directly contradicted), the fixture is missing a DESIGN-type child (REQ-006 AC1 partial), and the round-trip PROOF does not exercise frontmatter_map or filename_rewrite_map. Two TASKs FAIL outright (TASK-003 + TASK-005 + TASK-006), four PARTIAL. Per the retro-validation contract, SPEC-004 cannot be marked DONE until at minimum the 5 gap-TASKs are addressed (or design amendments adjudicated).

## State Changes (PROPOSED for orchestrator)

```text
TASK-001-SPEC-004: DRAFT/READY → stays DRAFT (PARTIAL verdict)
TASK-002-SPEC-004: DRAFT/READY → stays DRAFT (PARTIAL verdict; mostly works)
TASK-003-SPEC-004: DRAFT/READY → stays DRAFT (FAIL verdict; gap TASK-009 filed)
TASK-004-SPEC-004: DRAFT/READY → stays DRAFT (PARTIAL verdict; gap TASK-012 filed)
TASK-005-SPEC-004: DRAFT/READY → stays DRAFT (FAIL verdict; gap TASK-011 filed)
TASK-006-SPEC-004: DRAFT/READY → stays DRAFT (FAIL verdict; gap TASK-010 filed)
TASK-007-SPEC-004: DRAFT/READY → stays DRAFT (PARTIAL verdict)

TASK-008-SPEC-004 (NEW gap-TASK): created DRAFT
TASK-009-SPEC-004 (NEW gap-TASK): created DRAFT
TASK-010-SPEC-004 (NEW gap-TASK): created DRAFT
TASK-011-SPEC-004 (NEW gap-TASK): created DRAFT
TASK-012-SPEC-004 (NEW gap-TASK): created DRAFT

REQ-001-SPEC-004: stays DRAFT (PARTIAL AC)
REQ-002-SPEC-004: stays DRAFT (PASS AC; deferred to wave consolidation)
REQ-003-SPEC-004: stays DRAFT (FAIL AC)
REQ-004-SPEC-004: stays DRAFT (PARTIAL AC)
REQ-005-SPEC-004: stays DRAFT (FAIL AC)
REQ-006-SPEC-004: stays DRAFT (PARTIAL AC)

DESIGN-001-SPEC-004: stays DRAFT (PARTIAL compliance)
DESIGN-002-SPEC-004: stays DRAFT (FAIL compliance)
DESIGN-003-SPEC-004: stays DRAFT (PARTIAL compliance)

SPEC-004 root: stays ACCEPTED (current frontmatter) — NOT promoted to DONE
```

## Observations

- [outcome] Core PROOF passes — per-file SHA-256 identity proven across decompose -> recompose for 4-file fixture #proof #sha-256
- [problem] 2 TASKs FAIL (TASK-003 zero tests, TASK-005 schema diverges + REQ-005 AC5 contradicted, TASK-006 missing DESIGN fixture + composition YAML) #aggregate-fail
- [problem] 4 TASKs PARTIAL — implementation diverges from DESIGN-001/002/003 component signatures + sourceType naming drift #architectural-drift
- [insight] In-memory adapter + caller-orchestration boundary may be the correct architectural choice (deferring filesystem stage-all to higher decompose/recompose skill) — but currently undeclared and not adjudicated #pending-decision
- [fact] 5 gap-TASKs filed (TASK-008 through TASK-012) covering all material findings; 3 of those require user adjudication before code work #remediation

## Relations

- depends_on [[SPEC-004: SPEC Subtree Adapter]]
- depends_on [[QA-020-SPEC-004: Implement SPEC Subtree Adapter Recursive Base]]
- depends_on [[QA-021-SPEC-004: Implement Frontmatter Map Handler]]
- depends_on [[QA-022-SPEC-004: Implement Filename Rewrite Handler]]
- depends_on [[QA-023-SPEC-004: Implement Per-File Hash Validation Orchestration]]
- depends_on [[QA-024-SPEC-004: Implement specSubtreeManifestSchema Zod Validator]]
- depends_on [[QA-025-SPEC-004: SPEC Subtree Test Fixtures]]
- depends_on [[QA-026-SPEC-004: SPEC Adapter Round-Trip Property Test]]
- part_of [[SPEC-004: SPEC Subtree Adapter]]
