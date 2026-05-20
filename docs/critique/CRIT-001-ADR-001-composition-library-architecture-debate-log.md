---
title: 'CRIT-001-ADR-001: Composition Library Architecture Debate Log'
type: critique
status: ACCEPTED
permalink: critique/crit-001-adr-001-composition-library-architecture-debate-log
tags:
- critique
- adr-review
- skills-ecosystem
- composition-library
---

# CRIT-001-ADR-001: Composition Library Architecture Debate Log

## Context

Multi-agent debate on ADR-001 Composition Library Architecture (PROPOSED), conducted via the brain:---adr-review skill on 2026-05-19 during SESSION-2026-05-19_01 (skills bootstrap and PLAN-001). 6 reviewer agents (architect + critic + independent-thinker + security + analyst + high-level-advisor) ran independent reviews in parallel (Phase 1), with verdicts consolidated and resolutions applied in this single-round debate. Phase 4 convergence achieved 5 ACCEPT + 1 CONCERNS + 0 BLOCK — Disagree-and-Commit threshold met with documented dissent.

## Verdict Tally

| Reviewer | Verdict | P0 | P1 | P2 |
|:--|:--|:--|:--|:--|
| architect | ACCEPT | 0 | 0 | 2 |
| critic | ACCEPT | 0 | 2 | 2 |
| independent-thinker | CONCERNS | 0 | 2 | 2 |
| security | ACCEPT | 0 | 2 | 1 |
| analyst | ACCEPT | 0 | 2 | 1 |
| high-level-advisor | ACCEPT | 0 | 0 | 1 |
| **Totals** | **5A + 1C + 0B** | **0** | **8 → 6 dedup themes** | **9 → multiple** |

Result: convergence threshold met (≥5 ACCEPT, 0 BLOCK; 1 CONCERNS treated as Disagree-and-Commit with documented dissent).

## P0 Issues

None.

## P1 Issues

### P1-1: Hash protocol formal specification undefined (RESOLVED)

- **Source**: critic + analyst
- **Finding**: the F-8 "modulo deterministic renumber/wikilink mutations" hash check lacks formal specification of how the reverse mutation is applied before comparison. Critic: "should state explicitly (strip mutations then hash, or reverse mutations then hash)." Analyst: "renumbering and wikilink substitution are bijective only if the mapping is injective; without the injectivity constraint the hash check has a silent collision class."
- **Resolution**: RESOLVED in ADR refinement. F-8 expanded with formal Hash protocol subsection: 4 steps (source-extract → destination-extract → reverse-mutate → compare) plus the BLOCKING injectivity constraint on the plan YAML validator. See ADR-001 F-8 Hash protocol.

### P1-2: Rollback mechanism unspecified (RESOLVED)

- **Source**: critic
- **Finding**: F-8's "ROLLBACK, never partial write" is aspiration not invariant. No mechanism stated (transactional staging dir, write-to-temp-then-rename, or in-memory-only until final flush). A partial-failure crash could leave inconsistent state.
- **Resolution**: RESOLVED in ADR refinement. F-8 expanded with formal Rollback mechanism subsection: write-to-temp-then-rename with per-cluster all-or-nothing atomicity (POSIX rename guarantee). Source files never mutated until ALL destinations validate AND rename successfully. See ADR-001 F-8 Rollback mechanism.

### P1-3: YAML hardening + path traversal not specified (RESOLVED)

- **Source**: security
- **Finding**: D-3 selects YAML without specifying parser hardening. Default `yaml.load()` processes custom tags and recursive anchors (billion-laughs DoS risk, CWE-502/CWE-400). Plan YAMLs are LLM-authored — path values containing `../` could write outside docs/ (CWE-22).
- **Resolution**: RESOLVED in ADR refinement. Confirmation expanded with two security gates: (a) mandate FAILSAFE_SCHEMA (or equivalent strict parser config) with 1 MB max file-size guard before parse; (b) Zod schema validates destination paths via `path.resolve()` containment within docs/. See ADR-001 Confirmation security items.

### P1-4: LOC scope estimate excludes tests + CLI + schemas (RESOLVED)

- **Source**: analyst
- **Finding**: ~1,200 LOC total estimate is plausible for the adapter layer but excludes test code, CLI entry points, plan schema definitions, and the Zod validation layer. Real scope is likely 2x-3x when tests are included. Not a blocker but should be noted.
- **Resolution**: RESOLVED in ADR refinement. Confirmation expanded with LOC scope clarification: ~1,200 LOC covers 5 adapter implementations only; total project including tests/CLI/schemas/Zod estimated 2x-3x larger (~2,500-3,600 LOC). Track actuals after ADR adapter PROOF ships; recalibrate before SPEC subtree if overshoot exceeds 50%.

### P1-5: SHA-256 may be overkill versus xxHash (DEFERRED with rationale)

- **Source**: independent-thinker
- **Finding**: SHA-256 is cryptographic, designed for adversarial resistance. The composition library uses hash for content-identity, not crypto security. xxHash or FNV would run 10-50x faster with equivalent collision resistance for non-adversarial integrity checks. Bun.hash supports multiple algorithms.
- **Resolution**: DEFERRED with rationale. F-8 LOCKED SHA-256 via KICKOFF-BRIEF.md design decision 8 (locked before this debate; re-adjudication requires user re-opening). For personal-scope local tooling on TIER_4 project, hash-compute is not expected to dominate round-trip latency. SHA-256 is also more conservative and avoids the perception of cutting corners on the integrity invariant. **Revisit trigger**: profile real-world note sizes (3,000+ line ADRs) and switch to xxHash if hash compute exceeds 10% of round-trip latency. Documented in ADR-001 Clarifications.

### P1-6: unified+remark over-indexed on hardest case (DEFERRED with rationale)

- **Source**: independent-thinker
- **Finding**: 4 of 5 adapters are structurally simple (H2/H3 sections). Pulling in unified + remark + remark-frontmatter + remark-stringify + remark-parse means the simplest adapters pay the complexity tax of the hardest. The hybrid option (regex for line ranges + light AST for wikilink rewriting) was dismissed too quickly in D-2.
- **Resolution**: DEFERRED with rationale. D-2 LOCKED unified+remark via Step 5 AskUserQuestion (locked before this debate; re-adjudication requires user re-opening). Single-parser strategy is easier to reason about, test, and validate against the round-trip property test invariant. Two parsers = two attack surfaces for char-identity drift. **Revisit trigger**: if ADR adapter implementation exceeds 350 LOC (40% overshoot of ~250 estimate) due to unified parsing overhead, re-evaluate hybrid. Documented in ADR-001 Clarifications.

## P2 Issues

### P2-1: Confirmation gate type-mix (architect)

- **Finding**: Confirmation lists 4 technical criteria + 1 process gate (adr-review PASS); consider separating
- **Status**: documented; not blocking. ADR-001 Confirmation refinement added separator clarifying "process gate per D-5; separate from technical verification above" on the adr-review item.

### P2-2: Bun lock-in exit strategy unstructured (architect)

- **Finding**: Vendor Lock-in rates Bun as MEDIUM but Exit Strategy subsection structure absent
- **Status**: documented for future ADR refinement; not blocking PROPOSED→ACCEPTED.

### P2-3: AST round-trip performance estimate missing (critic)

- **Finding**: No performance estimate for AST round-trip on a 3,680-line note
- **Status**: documented; performance characterization belongs in SPEC phase per architecture-before-implementation separation.

### P2-4: Coverage targets per fixture not quantified (critic)

- **Finding**: Confirmation criteria are pass/fail but lack quantified per-adapter fixture coverage
- **Status**: documented for SPEC phase definition.

### P2-5: LLM plan-authoring errors (independent-thinker)

- **Finding**: ADR addresses LLM drift on content but not LLM error on plan authoring (e.g., wrong line ranges in plan YAML)
- **Status**: documented; Zod validation + user-adjudication-via-AskUserQuestion (per architecture decision LLM-script division) is the mitigation. If user-adjudication step is skipped or LLM plan is wrong AND Zod validator passes invalid line ranges, hash check still catches the resulting content mismatch.

### P2-6: ~1,200 LOC basis unverified (independent-thinker + advisor)

- **Finding**: No reference project or prototype validates the 1,200 LOC estimate for 5 adapters
- **Status**: documented; recalibration trigger added to ADR Confirmation per P1-4 resolution.

### P2-7: Dependency supply chain (security)

- **Finding**: All 6 runtime deps MIT, high-popularity, actively maintained. Risk score 1.5/5 (Low)
- **Status**: documented; no action needed beyond standard `bun audit` at build time. Add `bun audit` as a CI/build step in SPEC phase.

### P2-8: remark-stringify char-identity risk (analyst)

- **Finding**: remark-stringify is near-deterministic but not perfectly char-preserving (trailing newlines, whitespace normalization)
- **Status**: documented; ADR-001 Confirmation already includes "parse then stringify round-trip preserves char-identity" gate which catches this. Phase 3 review note added.

### P2-9: LOC estimate optimistic (advisor)

- **Finding**: ~1,200 LOC feels optimistic given SPEC subtree complexity
- **Status**: documented; same recalibration trigger as P1-4.

## Points of Consensus

- The architectural pattern (LLM-for-plan + script-for-execution; SHA-256 char-identity round-trip; LLM removed from content-modification loop) directly addresses the root cause of the prior drift incident.
- The build-order strategy (ADR adapter PROOF first; SPEC subtree last) is the correct risk-mitigation sequence.
- The technology choices are conservative, Lindy-compliant, and low lock-in (Zod 2020 with mass adoption; unified 2014 battle-tested; YAML 2001; SHA-256 ubiquitous; Bun with Node fallback).
- All locked decisions (F-1..F-8 + D-1..D-5) form an internally consistent decision graph with documented inter-decision dependencies.
- No second-system effect detected; ADR scope is focused on one problem (zero-drift restructuring) not a generic refactoring platform.

## Observations

- [outcome] Phase 4 convergence achieved round 1: 5 ACCEPT + 1 CONCERNS + 0 BLOCK; meets threshold for PROPOSED to ACCEPTED transition after P1 resolution + DEFER documentation #adr-review-pass #convergence
- [decision] P1 themes 1-4 RESOLVED via in-place ADR refinement (F-8 hash protocol formal spec, F-8 rollback mechanism, Confirmation security hardening, Confirmation LOC scope clarification) #p1-resolved
- [decision] P1 themes 5-6 DEFERRED with documented rationale — both challenge already-LOCKED decisions (F-8 SHA-256, D-2 unified+remark); revisit triggers specified for both #p1-deferred #disagree-and-commit
- [insight] All 9 P2 items documented in this CRIT for tracking; none blocking; several feed naturally into SPEC phase definition (coverage targets, performance characterization, bun audit CI step) #p2-tracking
- [insight] Single-round debate convergence is consistent with a greenfield project's first ADR where the architecture is largely transcription of a thoroughly thought-out KICKOFF-BRIEF.md plus 5 LOCKED Step 5 D-Ns — agents found refinement opportunities (P1) rather than fundamental architectural objections #greenfield-debate-pattern
- [constraint] Independent-thinker CONCERNS verdict is accepted as Disagree-and-Commit position. Documented dissent: SHA-256 unnecessarily heavy for non-adversarial integrity check; unified+remark over-indexed on the hardest adapter. Both deferred with documented revisit triggers. #documented-dissent
- [risk] Themes 5 (hash algorithm) and 6 (parser choice) revisit triggers are quantitative (hash dominates 10% of round-trip; ADR adapter exceeds 350 LOC). Future re-adjudication is mechanical if triggers fire; user need not re-open locked decisions unless triggers materialize. #revisit-mechanism
- [outcome] Architecture stress-tested across 6 distinct review lenses (structure, gaps, contrarian, security, evidence, strategy) — no P0 issues surfaced from any lens, indicating the KICKOFF-BRIEF.md baked-in first-principles thinking + Step 5 AskUserQuestion adjudication produced a sound architectural foundation #foundation-validated

## Relations

- relates_to [[ADR-001: Composition Library Architecture]]
- part_of [[PLAN-001: Skills Ecosystem]]
- relates_to [[SESSION-2026-05-19_01: Skills Bootstrap and PLAN-001]]