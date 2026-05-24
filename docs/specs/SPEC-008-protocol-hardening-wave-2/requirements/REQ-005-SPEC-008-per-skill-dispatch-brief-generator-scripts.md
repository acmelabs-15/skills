---
title: 'REQ-005-SPEC-008: Per-Skill Dispatch-Brief Generator Scripts'
type: requirement
permalink: specs/spec-008-protocol-hardening-wave-2/requirements/req-005-spec-008-per-skill-dispatch-brief-generator-scripts
status: ACCEPTED
tags:
- requirement
- spec-008
- track-2
- dispatch-brief
- drift-prevention
---

# REQ-005-SPEC-008: Per-Skill Dispatch-Brief Generator Scripts

## EARS

WHEN orchestrator dispatches a subagent for a build, decisions, research, or review skill workflow step
THE SYSTEM SHALL emit the agent dispatch brief via a programmatic generator script at `skills/<skill-name>/scripts/dispatch-<agent>.ts` that imports cross-cutting constants from `shared/composition/src/schemas/common.ts` and per-skill data, then prints the full brief markdown to stdout
SO THAT schema changes to cross-cutting constants such as the valid relation-type allowlist auto-propagate into every dispatch brief without manual prose editing.

## Pattern

Brief Generation (Event-Driven, triggered once per subagent dispatch; deterministic same-args-same-output).

## Priority

P0 — Audit C found four QA notes using the forbidden `validates` relation type because the QA dispatch brief existed as prose in `build/SKILL.md` and `end/SKILL.md` and drifted from the schema's relation-type allowlist; the only structural drift-prevention is programmatic import of the constants.

## Category

Functional.

## Context

[[ADR-005: Protocol Hardening Wave 2 Architecture]] D-4 locks programmatic per-skill scripts as the persistence mechanism for dispatch briefs. [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]] Audit C surfaced the root cause: dispatch briefs lived as inline prose in SKILL.md files, and when the schema added or refined a constant such as the 11 valid relation verbs, prose drifted because there was no mechanical link. The chosen design imports the constants directly so the brief is regenerated from current source on every dispatch.

D-4 also documents a separate trust boundary for brief generators from the hook-handler validators of D-8: brief generators consume their args from the orchestrator (a trusted runtime context) and emit markdown to stdout for the orchestrator to paste; they do not perform path resolution against external user input and have no command-injection surface beyond standard CLI args.

Wave 2 coverage of agent-skill pairings:

- build dispatches implementer and qa subagents at the per-TASK build+qa cycle
- decisions dispatches architect for ADR authoring and decision-critic for adversarial stress-test
- research dispatches analyst for per-requirement analysis cluster generation
- review dispatches reviewer for the multi-axis adaptive review

## Acceptance Criteria
- [x] GIVEN the dispatch-implementer.ts script WHEN executed with a TASK note path THEN stdout contains the full implementer brief including the rendered TASK content
- [x] GIVEN the dispatch-qa.ts script WHEN executed with a TASK and REQ scope set THEN stdout contains the full QA brief such that `validRelationTypes.every(v => stdout.includes(v))` is true, where `validRelationTypes` is imported from `shared/composition/src/schemas/common.ts` (the assertion MUST be bound to the imported constant, not a human reading the brief)
- [x] GIVEN `shared/composition/src/schemas/common.ts` adds a new entry to validRelationTypes WHEN any dispatch-brief script runs THEN the emitted brief automatically includes the new entry without prose edits
- [x] GIVEN the dispatch-architect.ts script WHEN executed with an ADR scope set THEN stdout contains the literal section-header marker string `## Structural ADR Requirements` AND the test asserts its presence via `stdout.includes("## Structural ADR Requirements")`, the section enumerating the requirements that validateAdrAcceptedClaim enforces
- [x] GIVEN the dispatch-decision-critic.ts script WHEN executed with an analysis option set THEN stdout includes the adversarial-claim reviewer asymmetry mandate
- [x] GIVEN the dispatch-analyst.ts script WHEN executed with a per-requirement scope THEN stdout contains the literal marker strings `NO OPEN QUESTIONS` and `RUBRIC IS FLOOR` AND the test asserts both via `stdout.includes("NO OPEN QUESTIONS")` and `stdout.includes("RUBRIC IS FLOOR")`, encoding the no-open-questions and rubric-as-floor mandates
- [x] GIVEN the dispatch-reviewer.ts script WHEN executed with a PR-type classification THEN stdout includes the axis-selection logic and the reviewer-asymmetry mandate
- [x] GIVEN any dispatch-brief script WHEN invoked with the same args twice THEN stdout output is byte-identical (determinism)
- [x] GIVEN any dispatch-brief script WHEN tested via its colocated test file THEN the test asserts brief structure presence of the cross-cutting allowlist and per-agent context block
## Implementation Notes

Each script is structured as: (1) parse CLI args from `Bun.argv`; (2) import cross-cutting constants (`validRelationTypes`, status enums, observation categories) from `shared/composition/src/schemas/common.ts`; (3) read any per-skill data (e.g., rendered TASK markdown for an implementer brief); (4) assemble the brief via template literals or a markdown builder; (5) write to stdout. Determinism is preserved by avoiding any timestamp, random, or environment lookups in the brief body. The trust boundary differs from the per-skill validator scripts of REQ-004: brief generators do not validate paths against project-root containment because they receive their args from the trusted orchestrator runtime, not from external user input; this is documented in [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-4 trust-boundary section.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| `skills/build/scripts/dispatch-implementer.ts` | NEW | Implementer dispatch-brief generator |
| `skills/build/scripts/dispatch-qa.ts` | NEW | QA dispatch-brief generator |
| `skills/decisions/scripts/dispatch-architect.ts` | NEW | Architect dispatch-brief generator |
| `skills/decisions/scripts/dispatch-decision-critic.ts` | NEW | Decision-critic dispatch-brief generator |
| `skills/research/scripts/dispatch-analyst.ts` | NEW | Analyst dispatch-brief generator |
| `skills/review/scripts/dispatch-reviewer.ts` | NEW | Reviewer dispatch-brief generator |

## Observations

- [requirement] Six new brief-generator scripts replace inline SKILL.md prose with programmatic emission importing cross-cutting constants from common.ts #drift-prevention #single-source-of-truth
- [decision] Brief generators have a SEPARATE trust boundary from per-skill validator scripts per [[ADR-005: Protocol Hardening Wave 2 Architecture]] D-4 documentation; brief inputs come from the trusted orchestrator runtime not external user paths #security #trust-boundary
- [constraint] Scripts MUST be deterministic; same args yield byte-identical stdout #determinism #testability
- [insight] Audit C root cause was that no skill imported the relation-verb allowlist from common.ts at brief-generation time; the per-skill script fix closes the drift at its source #audit-c #root-cause
- [risk] If common.ts ever renames an exported constant without updating the importers brief generation fails at runtime caught by colocated tests #regression-risk

## Relations

- implements [[ADR-005: Protocol Hardening Wave 2 Architecture]]
- part_of [[SPEC-008: Protocol Hardening Wave 2]]
- relates_to [[REQ-004-SPEC-008: Per-Skill Gate-Point Invocation Scripts]]
- relates_to [[REQ-001-SPEC-008: New Schema Suite]]
- relates_to [[ANALYSIS-004: Protocol Hardening Wave 2 Audit Synthesis]]
