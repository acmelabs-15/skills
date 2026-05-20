---
title: 'CRIT-002-ADR-002: Adapter Contract and Plan Schema Debate Log'
type: critique
permalink: critique/crit-002-adr-002-adapter-contract-and-plan-schema-debate-log
tags:
- critique
- adr-review
- skills-ecosystem
- adapter-contract
- round-2-pass
---

# CRIT-002-ADR-002: Adapter Contract and Plan Schema Debate Log

## Context

Multi-agent debate on ADR-002 Adapter Contract and Plan Schema (PROPOSED), conducted via brain:---adr-review on 2026-05-19 during SESSION-2026-05-19_01. 6 reviewer agents (architect + critic + independent-thinker + security + analyst + high-level-advisor) reviewed in parallel (Phase 1). Phase 4 convergence FAILED round 1 — 3 ACCEPT + 3 CONCERNS + 0 BLOCK (threshold requires ≥5 ACCEPT). Resolution path pending user adjudication.

## Verdict Tally

| Reviewer | Verdict | P0 | P1 | P2 |
|:--|:--|:--|:--|:--|
| architect | ACCEPT | 0 | 2 | 2 |
| critic | CONCERNS | 0 | 4 | 3 |
| independent-thinker | ACCEPT | 0 | 2 | 2 |
| security | CONCERNS | 0 | 2 | 2 |
| analyst | CONCERNS | 0 | 2 | 2 |
| high-level-advisor | ACCEPT | 0 | 0 | 2 |
| **Totals** | **3A + 3C + 0B** | **0** | **12 → 10 dedup themes** | **13** |

Round 1 convergence: FAIL (3 ACCEPT below ≥5 threshold).

## P0 Issues

None.

## P1 Issues (deduplicated themes)

### P1-A: MutationSpec lacks frontmatter_map field (PENDING)

- **Source**: critic P1-4 + analyst P1
- **Finding**: D-2 MutationSpec defines only `renumber_map` + `wikilink_map`. D-4 SPEC subtree section requires "inverse frontmatter mutation" (title, permalink). No field exists to capture frontmatter changes. SPEC adapter cannot satisfy the round-trip property test without a frontmatter mutation specification.
- **Resolution**: PENDING. Add `frontmatter_map?: Record<string, string>` field to MutationSpec; reverseMutations applies inverse frontmatter map for fields like `title` and `permalink`. Affects D-2 + D-5 (Zod schema extension).

### P1-B: cross_source_updates Zod schema undefined (PENDING)

- **Source**: architect (raised as P2 but cross-correlated with critic P1-1)
- **Finding**: SESSION schema mentions `cross_source_updates` in prose. No concrete Zod shape: field type, array-vs-object, required keys all unspecified. Implementor must invent the structure.
- **Resolution**: PENDING. Define `cross_source_updates` Zod shape — likely `Array<{ target_file: string; target_part_id: string; updates: Record<string, string> }>`. Cross-references PLAN adapter; handoff protocol needs to be specified.

### P1-C: SPEC subtree manifest Zod shape undefined (PENDING)

- **Source**: critic P1-2
- **Finding**: D-1 describes SPEC subtree manifest in prose: "Array of child file entries with per-child mutations and filename_rewrite_map". No Zod schema: child entry shape, filename_rewrite_map type, root SPEC vs children distinguisher unspecified.
- **Resolution**: PENDING. Define `subtree_manifest` Zod shape — `{ root: { source_path; mutations }; children: Array<{ source_path; dest_path; mutations; filename_rewrite_map }> }`. Distinguish root via separate object vs array entry.

### P1-D: discriminatedUnion + plan_type axis (10 variants) (PENDING)

- **Source**: architect P1-2 + critic P1-3
- **Finding**: D-5 says discriminatedUnion on source_type. But ADR also has plan_type axis (distribution vs composition). With 5 source types × 2 plan types = 10 variants. Composition strategy unclear — nested discriminated union (plan_type outer, source_type inner) vs flat 10-variant union with compound key. Composition plan variant (`sources` plural replaces `source`) is shown in YAML but base schema has only `source` (singular).
- **Resolution**: PENDING. Choose nested discriminated union: outer `z.discriminatedUnion("plan_type", [Distribution, Composition])` where each branch is inner `z.discriminatedUnion("source_type", ...)`. Refactor D-1 YAML examples to show both plan_type variants per type. Refactor D-5 schema module layout to nest.

### P1-E: Adapter interface AST/string call-sequence ambiguity (PENDING)

- **Source**: architect P1-1
- **Finding**: parse returns AST; applyMutations takes content string; serialize takes AST. Mixed argument types create ambiguity about when caller uses AST vs raw string. Interface JSDoc absent.
- **Resolution**: PENDING. Add JSDoc to D-2 CompositionAdapter interface documenting call sequence: (1) parse for round-trip validation; (2) extractByRange operates on raw lines (string); (3) applyMutations / reverseMutations operate on extracted strings (NOT AST); (4) serialize converts AST back to string for verification.

### P1-F: PLAN regenerative-section stripping mechanism (PENDING)

- **Source**: analyst P1
- **Finding**: D-4 PLAN section says "strip regenerative sections from both S and D' before comparison." No method/parameter on adapter interface governs section stripping. Implementation strategy underspecified.
- **Resolution**: PENDING. Option A: add `stripSections(content: string, sections: string[]): string` method to interface. Option B: add `regenerated_sections: string[]` to MutationSpec; reverseMutations + hash check automatically strip listed sections. Option B is more declarative; recommend Option B.

### P1-G: Path containment symlink bypass (PENDING)

- **Source**: security P1-1
- **Finding**: D-5 containedPathSchema uses `relative()` + `!startsWith("..")` pattern. F-1 (foundational decision) locks symlink-based install. relative() does not dereference symlinks; resolve() does not dereference either. Bypass via symlink that resolves outside docs/ when realpath is applied.
- **Resolution**: PENDING. Refactor containedPathSchema to use `realpath` on both the input path and docsRoot, then `startsWith(resolvedBase + path.sep)` pattern from OWASP. Document in D-5 with example code.

### P1-H: Injectivity validator key-value disjointness (PENDING)

- **Source**: security P1-2
- **Finding**: Injectivity (unique values) is necessary but not sufficient for ordered string replacement. Example: `renumber_map = {"D-1": "D-2", "D-2": "D-3"}` — applying D-1→D-2 first creates false D-2 that the D-2→D-3 rule then mutates. The hash check fails or worse, false-validates.
- **Resolution**: PENDING. Specify single-pass replacement semantics in F-8 hash protocol (in ADR-001 — or document in ADR-002 D-4 as a refinement). Or add key-value domain disjointness constraint to injectivity validator (keys and values must come from disjoint domains; e.g., source IDs `D-1..D-5` map to target IDs `D-6..D-10` only).

### P1-I: hash() trivial wrapper ceremony (PENDING)

- **Source**: independent-thinker P1-1
- **Finding**: hash() method on CompositionAdapter is identical Bun.hash wrapper across all 5 adapters. Zero adapter-specific logic. Polymorphism is ceremony.
- **Resolution**: PENDING. Move hash to shared utility `_shared/composition/src/core/hash.ts`. Remove from CompositionAdapter interface. Reduce interface to 5 methods (parse / extractByRange / applyMutations / reverseMutations / serialize).

### P1-J: BaseMarkdownAdapter pattern (PENDING)

- **Source**: independent-thinker P1-2
- **Finding**: ADR + ANALYSIS + SESSION differ mostly in `section_delimiter` value (`### ` vs `## ` vs `## Event `). 3 of 5 adapters could share a parameterized base class. PLAN and SPEC genuinely need distinct adapters.
- **Resolution**: PENDING. Add note to D-3 capability matrix indicating BaseMarkdownAdapter is the impl pattern for 3 simple adapters (ADR + ANALYSIS + SESSION) with config-only overrides. PLAN and SPEC remain distinct. Does not change interface contract; reduces implementation LOC.

## P2 Issues (13 items documented for tracking)

- (architect) hash method couples interface to Bun-specific API — addressed by P1-I
- (architect) cross_source_updates schema shape missing — promoted to P1-B
- (critic) docsRoot free variable resolution unspecified — minor; spec phase
- (critic) line_range.end = -1 with file shorter than line_range.start — error path documentation
- (critic) PLAN regenerated_sections exclusion is integrity bypass risk — minimum-validated-content constraint needed (defer to spec phase or extend P1-F)
- (independent-thinker) 11 schema files for 5 source types — addressed by P1-D (nested discriminator collapses module count)
- (independent-thinker) SPEC subtree ~500 LOC estimate unvalidated — addressed by ADR-001 recalibration trigger
- (security) ReDoS bound on section_delimiter patterns — future-proofing; literal-only constraint pin in ADR text
- (security) TOCTOU on .tmp rename — advisory lock or mtime check between validate and rename
- (analyst) LOC delta framing lacks base LOC — minor; documentation refinement
- (analyst) Round-trip property test filename-rewrite dimension excluded — addressed by D-4 hash scope exclusion; document explicitly
- (advisor) SPEC subtree shipping timeline drag — already mitigated via D-3 build-order 5
- (advisor) cross_source_updates implicit contract documentation — addressed by P1-B

## Points of Consensus

- ADR-002 is well-structured at the architectural level; every D-N traces to ADR-001 locks.
- Per-type adapter pattern + capability matrix + per-file hash validation for SPEC + modular Zod schemas are all sound design choices.
- No P0 issues from any of 6 lenses.
- The 10 P1 themes are FIXABLE design-level refinements; none challenge a locked decision from ADR-001 or require architectural rework.

## Resolution path options

Per /decisions Step 7: max 3 iterations; if still non-PASS, HALT with decisions-step7-iteration-halt. Round 1 is FAIL; rounds 2 and 3 remain available.

Options for resolution (pending user adjudication):

1. **Re-dispatch architect (round 2)** with consolidated revision brief enumerating all 10 P1 themes. Architect produces revised ADR-002 incorporating all fixes; re-run Phase 1 6-agent debate. Heavy (~15-20 min architect + ~5 min parallel reviewers). Best for maintaining detail-parity discipline.

2. **Orchestrator-inline refinement** applying each P1 theme via Brain MCP edit_note calls. Medium effort (~10-15 surgical edits). Skips formal re-dispatch but maintains content quality. Re-run Phase 4 convergence by sampling fixed sections.

3. **Pause here; resume in future session** with this CRIT-002 capturing all findings. ADR-002 stays PROPOSED. Decisions.2 part stays IN_PROGRESS. Next session resumes via /plan PLAN-001 continue mode + /decisions Step 7 retry.

## Round 2 outcome (resolved 2026-05-19)

**Phase 4 convergence PASS** — unanimous 6 ACCEPT + 0 CONCERNS + 0 BLOCK + 0 P0 + 0 NEW P1/P2 across all 6 reviewers.

| Reviewer | R1 verdict | R2 verdict | R1 P1s resolved? |
|:--|:--|:--|:--|
| architect | ACCEPT | ACCEPT | 2/2 YES (JSDoc call sequence; nested discriminator) |
| critic | CONCERNS | ACCEPT | 4/4 YES (cross_source_updates Zod; subtree_manifest Zod; double discriminant; frontmatter_map) |
| independent-thinker | ACCEPT | ACCEPT | 2/2 YES (hash extracted to shared utility; BaseMarkdownAdapter pattern) |
| security | CONCERNS | ACCEPT | 2/2 YES (realpath + path.sep; key-value disjointness) |
| analyst | CONCERNS | ACCEPT | 2/2 YES (frontmatter_map; regenerated_sections + 50% integrity floor) |
| high-level-advisor | ACCEPT | ACCEPT | strategic alignment maintained; no second-system effect |

**Tally**: 12 round-1 P1 findings / 10 deduplicated themes → 12 round-2 YES resolutions → 0 NEW issues introduced by round-2 revision. Convergence achieved on iteration 2 of 3 (within /decisions Step 7 budget; 1 iteration spare).

Per /decisions Step 8: ADR-002 status flipped PROPOSED → ACCEPTED 2026-05-19 with body Status section attribution to round-2 convergence + CRIT pointer. Per /decisions Step 9: PLAN decisions.2 substatus IN_PROGRESS → DONE; completing_session bound to SESSION-2026-05-19_01; outcome wikilink resolved to ADR-002. spec-decomposition transitions PENDING → READY (decisions.2 dependency now DONE).

## Observations

- [outcome] Phase 4 convergence FAILED round 1 — 3 ACCEPT + 3 CONCERNS + 0 BLOCK; below threshold. P0=0 confirms no fundamental architectural objections #convergence-fail #round-1
- [decision] 10 deduplicated P1 themes spanning interface gaps (E, F, I), schema gaps (A, B, C, D), security refinements (G, H), and pattern guidance (J). None challenge ADR-001 locks; all are forward-compatible refinements #p1-deduplication
- [insight] Higher P1 count for ADR-002 vs ADR-001 (10 vs 6 themes) reflects design-level review surfacing more concrete interface specifications. ADR-001 had architectural decisions to debate (lock the choices); ADR-002 has interface contracts to refine (lock the shapes) #review-pattern
- [insight] Three reviewers issued CONCERNS (critic + security + analyst) due to interface/schema specification gaps where implementor would otherwise need to invent structure. The other three (architect + independent-thinker + advisor) issued ACCEPT but with substantive P1 refinements. Verdict split reflects evidence threshold difference, not architectural disagreement #verdict-split
- [constraint] All 10 P1 themes are forward-compatible: resolutions extend MutationSpec, define new Zod shapes, refine validator implementations, add JSDoc. None require D-N renumber or architectural change #forward-compatible
- [risk] Per /decisions Step 7, max 3 iterations before HALT. Round 1 consumed; rounds 2 and 3 remain. If round 2 introduces new findings beyond the current 10 themes, available iteration budget tightens #iteration-budget

## Relations

- relates_to [[ADR-002: Adapter Contract and Plan Schema]]
- part_of [[PLAN-001: Skills Ecosystem]]
- relates_to [[SESSION-2026-05-19_01: Skills Bootstrap and PLAN-001]]
- relates_to [[CRIT-001-ADR-001: Composition Library Architecture Debate Log]]