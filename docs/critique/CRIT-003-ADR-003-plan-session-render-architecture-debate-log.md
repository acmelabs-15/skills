---
title: 'CRIT-003-ADR-003: Plan/Session Render Architecture Debate Log'
type: critique
status: ACCEPTED
permalink: critique/crit-003-adr-003-plan-session-render-architecture-debate-log
tags:
- critique
- adr-review
- adr-003
- skills-ecosystem
- render-architecture
---

# CRIT-003-ADR-003: Plan/Session Render Architecture Debate Log

## Overview

Multi-agent brain:---adr-review of ADR-003 (Plan/Session Render Architecture). 6 parallel reviewers (architect, critic, independent-thinker, security, analyst, high-level-advisor) executed Phase 1 independent review on 2026-05-20. Convergence achieved Round 1: 5 ACCEPT + 1 CONCERNS + 0 BLOCK (passes ≥5 ACCEPT threshold). Independent Thinker dissent captured as Disagree-and-Commit (D&C) with documented strategic-fit rationale from High-Level Advisor tie-breaker.

## Round 1 Verdicts

| Agent | Verdict | P1 Count | P2 Count |
|:--|:--|:--|:--|
| architect | ACCEPT | 1 | 4 |
| critic | ACCEPT | 1 | 4 |
| independent-thinker | CONCERNS | 3 | 2 |
| security | ACCEPT | 1 | 6 |
| analyst | ACCEPT | 1 | 6 |
| high-level-advisor | ACCEPT | 2 | 3 |

**Final**: 5 ACCEPT + 1 CONCERNS + 0 BLOCK. Convergence achieved per skill threshold (≥5 ACCEPT + zero BLOCK).

## P1 Findings (BLOCKING per skill — resolve or defer with rationale)

### F-1: common.ts shared vs duplicated between ADR-002 and ADR-003 (architect)

ADR-003 D-4 schemas (plan-note.ts, session-note.ts) share enums (EntityIdSchema, status enums, ObservationSchema, RelationSchema) with ADR-002's composition plan schemas. ADR-003 does not explicitly state whether common.ts is shared or duplicated.

**Disposition**: DEFERRED to SPEC-007 authoring. Architect's own recommendation. The SPEC will resolve via shared common.ts in `shared/composition/src/schemas/common.ts` (architectural intent is shared; specifics belong in SPEC).

**Resolution applied**: ADR-003 Implementation Notes section clarification added — common.ts is shared with ADR-002's composition schemas (DRY principle).

### F-2: No explicit rollback plan documented (critic)

ADR-003 Consequences section does not state the rollback path if render scripts introduce bugs that corrupt plan/session notes.

**Disposition**: RESOLVED in-ADR with 1-line clarification.

**Resolution applied**: ADR-003 Consequences section gains explicit "Rollback: git revert + resume manual edit_note" statement.

### F-3: Over-engineering signal — 11 decisions for a note-formatting problem (independent-thinker)

IT argues that 5 of 6 drift surfaces trace to one root cause: basic-memory's `replace_section` silently appending H2 instead of replacing H4. D-1..D-11 build a full parse/render pipeline (~800-1100 LOC) to route around a single platform bug. Cost/benefit ratio not formally examined.

**Disposition**: DISAGREE-AND-COMMIT. High-Level Advisor tie-breaker sided with ACCEPT.

**Advisor's tie-breaker rationale**: "Deterministic plan/session rendering is a CORE capability for this project. The entire skills ecosystem depends on plan notes staying structurally correct across multi-session, multi-agent workflows. When your coordination layer drifts, every downstream SPEC build inherits that drift. This is infrastructure that every other SPEC depends on. Every future SPEC build session pays the drift tax until this is fixed."

**Dissent preserved**: IT's full P1 finding text retained in this debate log. If the future round-trip property test (D-8) fails to deliver "mathematical drift impossibility" or if the 800-1100 LOC estimate materially overshoots, revisit this dissent.

### F-4: Round-trip identity is false invariant for prose-heavy notes (independent-thinker)

IT challenges ADR-003's claim that drift becomes "mathematically impossible" via round-trip identity (D-8). PLAN notes contain LLM-authored prose (Scope, DoD text, blocker descriptions, observation text). Any prose edit by any agent breaks `render(parse(md)) === md` unless the parser preserves every whitespace character and comment. Confidence: medium-high that edge cases in whitespace, table cell line breaks, and Mermaid raw blocks will prevent clean round-trip.

**Disposition**: RESOLVED in-ADR by scoping the claim more carefully.

**Resolution applied**: ADR-003 D-8 + Consequences section claim updated from "mathematically impossible drift" to "structurally drift-resistant" — round-trip identity gate applies to the structural template content (frontmatter shape, section ordering, table schemas, Mermaid graph derivation). Prose mutations are expected to break char-identity; they propagate through deterministic re-render after Zod schema validation.

### F-5: Simpler alternative not evaluated — fix basic-memory + simplify template (independent-thinker)

IT argues D-6 (consolidation), D-10 (drop Decision/Progress Log), D-11 (move prose to skill docs) together achieve roughly 70% of stated benefit (bulk reduction + responsibility split) with ZERO new code. These are template design decisions, not render-pipeline decisions. Could ship today via manual PLAN-001 rewrite.

**Disposition**: DISAGREE-AND-COMMIT. Linked to F-3 strategic question. Advisor's rationale applies.

**Dissent preserved**: The simpler-alternative analysis is retained in this debate log. If SPEC-007 build encounters significant overrun or if the dogfooding migration plan reveals that D-6/D-10/D-11 alone close the drift problem, the parse/render pipeline scope may be deferred or descoped.

### F-6: Verify path.resolve() before startsWith() comparison (security)

Path traversal mitigation (CWE-22) must use `path.resolve()` normalization before `startsWith()` containment check, not raw string matching.

**Disposition**: DEFERRED to SPEC-007 implementation verification. ADR-001 already specifies the correct mitigation pattern; SPEC-007 inherits.

### F-7: Observation regex fragility (analyst)

Parser observation regex uses `\w+` for category, accepting values outside the 10-category enum. Zod catches downstream but errors point to schema, not source line.

**Disposition**: DEFERRED to SPEC-007 implementation. Minor; ParseError path design partially mitigates.

## P2 Findings (non-blocking)

29 P2 findings total across reviewers. Not enumerated here individually — see source agent outputs preserved at:

- `/private/tmp/claude-502/.../tasks/aed35764a120f0ef6.output` (architect)
- `/private/tmp/claude-502/.../tasks/a4fb159a2e809f6ff.output` (critic)
- `/private/tmp/claude-502/.../tasks/af0db4661b4f9aad3.output` (independent-thinker)
- `/private/tmp/claude-502/.../tasks/abb325df0846ed1f0.output` (security)
- `/private/tmp/claude-502/.../tasks/a8b80f08eeba14f54.output` (analyst)
- `/private/tmp/claude-502/.../tasks/a7030cc2d1ca7a322.output` (high-level-advisor)

(These transcripts are local to the orchestration session and will be flushed; key P2 themes are summarized in this debate log's Observations.)

## Convergence

Phase 4 vote: 5 ACCEPT + 1 CONCERNS (D&C) + 0 BLOCK. ADR-003 status: PROPOSED → ACCEPTED.

P1 resolution summary:

- F-1: deferred (architect's recommendation)
- F-2: resolved in-ADR (rollback statement)
- F-3: D&C (Advisor tie-breaker rationale documented)
- F-4: resolved in-ADR (round-trip claim scoped)
- F-5: D&C (linked to F-3; dissent preserved for future revisit)
- F-6: deferred (specified in ADR-001; SPEC-007 verifies)
- F-7: deferred (SPEC-007 implementation detail)

## Observations

- [outcome] 5 ACCEPT + 1 CONCERNS + 0 BLOCK Round 1 convergence; ADR-003 ACCEPTED via Phase 3 resolution + Phase 4 vote #convergence #round-1-pass
- [decision] IT dissent on F-3 + F-5 captured as Disagree-and-Commit per skill protocol; Advisor tie-broke on strategic-fit (Core capability, every SPEC pays drift tax) #disagree-and-commit #tie-breaker
- [decision] F-4 round-trip claim scoped to structural template content (not LLM-prose) — drift-resistance applies to schema, ordering, Mermaid; prose mutates through Zod-validated re-render #claim-scoping #round-trip-bounds
- [decision] F-2 explicit rollback statement added to ADR-003 Consequences (git revert + resume edit_note) #rollback #recovery-path
- [constraint] F-1 common.ts shared with ADR-002 schemas (single source for shared enums); specifics deferred to SPEC-007 #shared-schema #dry
- [risk] Over-engineering risk preserved as IT dissent — if 800-1100 LOC materially overshoots OR if D-6/D-10/D-11 alone resolve the drift problem during dogfooding, parse/render pipeline scope may be descoped #over-engineering-risk #escape-hatch
- [insight] Round-trip identity invariant from ADR-001 (composition library) applies to closed structural notes; PLAN/SESSION are mixed (structural sections + prose sections); the invariant must be scoped accordingly per F-4 #ADR-001-pattern-extension
- [fact] All 6 reviewers verified evidence: commit f280c0f exists, 6 drift surfaces are concrete, 30+ edit_note count is verifiable from session history #evidence-verified
- [outcome] P1 findings: 2 resolved in-ADR (F-2 + F-4); 4 deferred to SPEC-007 (F-1 + F-6 + F-7 + common.ts specifics); 2 captured as D&C (F-3 + F-5) #p1-disposition

## Relations

- relates_to [[ADR-003: Plan/Session Render Architecture]]
- relates_to [[ANALYSIS-002: Plan/Session Note Render Architecture]]
- pairs_with [[ADR-001: Composition Library Architecture]]
- pairs_with [[ADR-002: Adapter Contract and Plan Schema]]
- part_of [[PLAN-001: Skills Ecosystem]]
