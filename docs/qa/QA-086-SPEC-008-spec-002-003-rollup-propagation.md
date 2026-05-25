---
title: 'QA-086-SPEC-008: SPEC-002 and SPEC-003 Rollup Propagation'
type: qa
permalink: qa/qa-086-spec-008-spec-002-003-rollup-propagation-1
tags:
- qa
- spec-008
- track-4
- rollup-propagation
- audit-d
---

# QA-086-SPEC-008: SPEC-002 and SPEC-003 Rollup Propagation

## Objective

QA gate for TASK-035-SPEC-008 (Propagate SPEC-002 and SPEC-003 Checkbox Rollups and REQ Status Flips). Independently validate each Definition of Done item against on-disk Brain-note state and the `validateSpecDoneClaim` validator, then emit a PASS/FAILED verdict. Acceptance criteria source: REQ-010-SPEC-008 Audit D clauses.

- **Feature**: Audit D code-vs-spec drift cleanup (SPEC-002 + SPEC-003 rollup propagation)
- **Scope**: SPEC-002 root, SPEC-003 root, REQ-001/002/004/005-SPEC-002 frontmatter + evidence
- **Acceptance Criteria**: TASK-035 Definition of Done (12 items)

## Approach

- **Check types**: per-DoD-item state verification (Brain MCP reads) + mechanical validator runs (`validateSpecDoneClaim` via `skills/end/scripts/validate-spec-done.ts`) + Audit D grep verification
- **Environment**: local; validator run from project root against `docs/specs/**` files
- **Data strategy**: cross-reference each `## Artifact Status` row against the child note's frontmatter `status`; DRAFT children correctly remain `[ ]` per QA brief

## Results

### Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Checks run | 12 | - | - |
| Passed | 10 | - | - |
| Failed | 1 | 0 | [FAIL] |
| Skipped | 1 | - | [SKIP] |
| Verdict | FAILED | PASS | [FAIL] |

tests_run = 12; passed = 10; failed = 1; skipped = 1 (10 + 1 + 1 = 12).

### Per-DoD-Item Results

| Check | DoD Item | Result | Evidence |
|-------|----------|--------|----------|
| 1 | SPEC-002 `## Artifact Status` zero `[ ]` for terminal-status artifacts | [PASS] | All Requirements/Designs/Tasks rows `[x]`; 5 REQ ACCEPTED, 2 DESIGN ACCEPTED, 6 TASK DONE cross-checked |
| 2 | SPEC-003 `## Artifact Status` zero `[ ]` for terminal-status artifacts | [PASS] | Tasks `[x]`×5 (all DONE); REQ `[ ]`×5 + DESIGN `[ ]`×2 are DRAFT, correctly remain `[ ]` per brief |
| 3 | Deferred artifacts use `[~]` not `[ ]`/`[x]` | [PASS] | No DEFERRED artifacts in either spec; vacuously satisfied |
| 4 | REQ-001-SPEC-002 `status: ACCEPTED` | [PASS] | Frontmatter `status: ACCEPTED` confirmed |
| 5 | REQ-002-SPEC-002 `status: ACCEPTED` | [PASS] | Frontmatter `status: ACCEPTED` confirmed |
| 6 | REQ-004-SPEC-002 `status: ACCEPTED` | [PASS] | Frontmatter `status: ACCEPTED` confirmed |
| 7 | REQ-005-SPEC-002 `status: ACCEPTED` | [PASS] | Frontmatter `status: ACCEPTED` confirmed |
| 8 | Each of 4 REQ flips cites implementation evidence (file + commit/QA ref) | [PASS] | Each carries `[fact] ACCEPTED 2026-05-24: implemented by TASK-NNN at <file path>; validated by QA-042-SPEC-002`. File + QA ref present (no literal git SHA; QA brief accepts file + QA ref) |
| 9 | `validateSpecDoneClaim(SPEC-002)` returns valid | [PASS] | `validate-spec-done.ts docs/specs/SPEC-002-simple-adapters/SPEC-002-simple-adapters.md` → `ok`, exit 0 |
| 10 | `validateSpecDoneClaim(SPEC-003)` returns valid | [FAIL] | Same script on SPEC-003 root → exit 2 (schema superRefine reject); 12 unsatisfied: 5 Success Criteria `[ ]` + 5 REQ `[ ]` + 2 DESIGN `[ ]` while `status: DONE` |
| 11 | All edits Brain MCP (no raw Edit/Write on docs/**) | [PASS] | Current note state well-formed; assessed as state only (QA cannot inspect edit-tool history) |
| 12 | Audit D grep: `grep "status: DONE" && grep "- [ ]"` returns zero `[ ]` under DONE spec root | [SKIP→FAIL] | Grep as literally written returns matches: SPEC-002/003 roots contain `[ ]` in `## Acceptance Criteria`/`## Success Criteria` + `## Phases` checklists (not `## Artifact Status`). Grep is unscoped and cannot distinguish sections |

## Discussion

### Decisive Failure

DoD item 10 fails mechanically. The TASK-035 objective (step 6) and DoD both require `validateSpecDoneClaim(SPEC-003)` to return `valid: true`. It returns FAIL because SPEC-003 carries `status: DONE` while 7 child artifacts (5 REQ + 2 DESIGN) remain DRAFT and 5 `## Success Criteria` items are unchecked. The validator's `SpecRootNoteSchema.superRefine` rejects a DONE spec with any unsatisfied Success Criteria or Artifact Status item.

### Internal Contradiction in TASK Scope

Two DoD items conflict for SPEC-003. Item 2 (and the QA brief) correctly state DRAFT REQ/DESIGN rows MUST remain `[ ]`. Item 10 requires `validateSpecDoneClaim(SPEC-003)` to pass — impossible while SPEC-003 is `status: DONE` with DRAFT children and unchecked Success Criteria. SPEC-003's `status: DONE` frontmatter is the root cause: a spec cannot legitimately be DONE while 7 of its artifacts are DRAFT. This is a pre-existing drift that the rollup-propagation TASK does not (and per the binary tool / status-ownership rules cannot) resolve via checkbox flips alone.

### Coverage Gap

DoD item 12's grep is unscoped (whole-file `- [ ]` match), so it cannot mechanically verify "zero `[ ]` under DONE spec root" the way item 1/2 intend (scoped to `## Artifact Status`). The scoped verification (items 1, 2) passes; the unscoped grep does not. Marked SKIP→FAIL: the literal command does not return zero matches.

## Recommendations

1. **Orchestrator: resolve SPEC-003 status drift** — either (a) revert SPEC-003 frontmatter `status: DONE` to `IN_PROGRESS`/`ACCEPTED` to match its DRAFT children + unchecked Success Criteria, OR (b) complete SPEC-003 (flip its 7 DRAFT artifacts to terminal + tick Success Criteria) so the DONE claim is legitimate. Status transitions are orchestrator-owned; QA cannot perform them.
2. **Amend TASK-035 DoD item 10** — if SPEC-003 is intentionally DONE-with-DRAFT-children pending a later wave, the `validateSpecDoneClaim(SPEC-003) valid: true` DoD item is unsatisfiable and should be deferred-with-rationale, not left as a hard gate.
3. **Tighten DoD item 12 grep** — scope the verification to the `## Artifact Status` section (e.g. `awk` between `## Artifact Status` and next H2) so it matches the item 1/2 intent rather than whole-file `[ ]`.

## Verdict

**Status**: FAILED
**Confidence**: High
**Rationale**: 10 of 12 DoD items satisfied with evidence, but `validateSpecDoneClaim(SPEC-003)` returns FAIL (not `valid: true`) and the Audit D grep verification does not return zero matches; PASS requires every DoD item satisfied.

## Observations

- [outcome] TASK-035 QA gate FAILED: `validateSpecDoneClaim(SPEC-003)` returns FAIL with 12 unsatisfied items while DoD requires valid #qa #audit-d #fail
- [fact] `validate-spec-done.ts` on SPEC-002 root returned `ok` exit 0; on SPEC-003 root returned exit 2 schema-reject #validator #evidence
- [problem] SPEC-003 carries `status: DONE` with 5 REQ + 2 DESIGN still DRAFT and 5 Success Criteria unchecked — illegitimate DONE claim #status-drift #spec-003
- [fact] All 4 REQ-SPEC-002 notes confirmed `status: ACCEPTED` with file-path + QA-042 evidence observations #req-flip #provenance
- [insight] TASK-035 DoD item 2 (DRAFT rows stay `[ ]`) and item 10 (`validateSpecDoneClaim` valid) are mutually unsatisfiable while SPEC-003 is DONE #contradiction #scope
- [constraint] QA cannot resolve the failure: status transitions are orchestrator-owned; checkbox flips alone cannot make a DONE-with-DRAFT-children spec pass the validator #ownership #blocking

## Relations

- relates_to [[TASK-035-SPEC-008: Propagate SPEC-002 and SPEC-003 Checkbox Rollups and REQ Status Flips]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- depends_on [[REQ-010-SPEC-008: Brain Note Hygiene and Code-vs-Spec Drift Cleanup]]
- relates_to [[SPEC-002: Simple Adapters]]
- relates_to [[SPEC-003: PLAN Adapter]]