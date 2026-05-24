---
title: 'TASK-022-SPEC-008: Author Initial Adversarial Fixture Set for Five Existing Validators'
type: task
permalink: specs/spec-008-protocol-hardening-wave-2/tasks/task-022-spec-008-initial-adversarial-fixtures
status: DONE
effort: M
estimate: 1d
tags:
- task
- spec-008
- track-3
- adversarial
- fixtures
---

# TASK-022-SPEC-008: Author Initial Adversarial Fixture Set for Five Existing Validators

## Description

Author the initial set of adversarial fixture markdown files at `shared/composition/tests/fixtures/adversarial/<type>/drift-NN-<slug>.md` covering Audit E's top-10 prioritized scenarios across the five existing claim validators (task, spec, requirement, design, test-report). Each fixture encodes one realistic lying-claim scenario as a canonical Brain note (frontmatter + H1 + sections + Observations + Relations) with the lying behavior identifiable from the markdown content alone. Fixture filenames double as drift regression markers per DESIGN-003 and REQ-006 AC-4.

## Definition of Done
- [x] Subdirectories exist: `shared/composition/tests/fixtures/adversarial/task/`, `spec/`, `requirement/`, `design/`, `test-report/`
- [x] At least ten fixture markdown files exist across the five subdirectories covering Audit E's top-10 scenarios
- [x] Each fixture's filename matches `drift-NN-<slug>.md` (two-digit counter restarting per subdirectory; lowercase kebab-case slug)
- [x] Each fixture is a structurally valid Brain note (passes its type's schema parse) but contains a lying-claim payload that the corresponding claim validator must reject
- [x] At least the following named fixtures exist: `task/drift-01-all-deferred-bypass.md`, `task/drift-02-checkbox-flip-without-evidence.md`, `requirement/drift-01-ac-flip-without-evidence.md`, `design/drift-01-design-compliance-flip-without-evidence.md`, `spec/drift-01-spec-done-with-all-deferred-success-criteria.md`, `test-report/drift-01-test-report-all-deferred-verdict.md`
- [x] Each fixture's frontmatter `tags` array includes a Phase-X-drift-surface tag where applicable (per DESIGN-003 drift-surface mapping section)
- [x] No fixture filename contains spaces; CAPS prefixes preserved where applicable; slugs lowercase kebab
- [x] Manual review confirms each fixture is self-documenting (the lying behavior is identifiable from the markdown alone)

## ADR Compliance
- [x] Honors ADR-005 D-3 verbatim: fixture directory layout `tests/fixtures/adversarial/<type>/drift-NN-<slug>.md`
- [x] Honors ADR-005 D-3 Implementation Notes: initial fixture set covers Audit E's top-10 prioritized scenarios
- [x] Honors REQ-006 AC-4: at least the six named drift surfaces listed in the AC are present

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `shared/composition/tests/fixtures/adversarial/task/drift-01-all-deferred-bypass.md` | NEW | Task validator: all DoD items marked deferred to bypass DONE check |
| `shared/composition/tests/fixtures/adversarial/task/drift-02-checkbox-flip-without-evidence.md` | NEW | Task validator: DoD flipped to `[x]` without code-change evidence cited |
| `shared/composition/tests/fixtures/adversarial/requirement/drift-01-ac-flip-without-evidence.md` | NEW | Requirement validator: AC `[x]` without `**Evidence**:` line |
| `shared/composition/tests/fixtures/adversarial/design/drift-01-design-compliance-flip-without-evidence.md` | NEW | Design validator: compliance `[x]` without evidence section |
| `shared/composition/tests/fixtures/adversarial/spec/drift-01-spec-done-with-all-deferred-success-criteria.md` | NEW | Spec validator: SPEC DONE with all success_criteria deferred |
| `shared/composition/tests/fixtures/adversarial/test-report/drift-01-test-report-all-deferred-verdict.md` | NEW | Test-report validator: PASS verdict with all rows DEFERRED |
| `shared/composition/tests/fixtures/adversarial/task/drift-03-...md` through additional 4 fixtures across types | NEW | Cover remaining Audit E top-10 scenarios |

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 2d | Authoring realistic lying-claim notes requires modeling the lying agent's mindset |
| AI-Dominant | 1d | Pattern-based generation from canonical samples plus targeted lies |
| AI-Assisted | 1d | Each fixture is approximately 30-60 lines of markdown |

## Observations

- [fact] Ten fixtures across five validator types is the Audit E top-10 closure; each fixture is one realistic lying scenario #closure #audit-e
- [technique] Author each fixture by copying the matching `*-sample.md` canonical fixture, then introducing exactly one lying mutation per file; keeps the diff between honest and lying minimal and reviewable #minimal-diff
- [constraint] Each fixture MUST parse successfully against its type's schema; the lying behavior lives at the claim-validator level not the schema level (otherwise the schema would reject it before the validator runs) #schema-vs-validator

## Relations

- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- implements [[REQ-006-SPEC-008: Adversarial-Claim Test Harness and Initial Fixture Set]]
- implements [[DESIGN-003-SPEC-008: Adversarial Test Fixture Layout and Harness Shape]]
- depends_on [[TASK-021-SPEC-008: Implement Adversarial-Claim Test Harness]]
- relates_to [[QA-075-SPEC-008: Validation Report for TASK-022 Initial Adversarial Fixture Set]]