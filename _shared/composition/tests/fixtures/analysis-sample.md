---
title: "ANALYSIS-042: Composition Library Survey"
type: analysis
status: ACCEPTED
date: 2026-05-15
updated: 2026-05-20
tags:
  - analysis
  - composition
  - markdown
  - survey
---

# ANALYSIS-042: Composition Library Survey

## Overview

This analysis surveys the existing landscape for markdown composition and
distribution tooling, with an eye toward the round-trip-safe operations the
Brain knowledge graph requires. It enumerates concrete tradeoffs as numbered
items, and each downstream design choice references the item that motivates it.

The analysis is bounded to libraries we could realistically adopt — battle-
tested ecosystems with stable maintenance, broad ecosystem fit, and clear
extension points. Speculative or research-only tools were excluded.

## Findings

### item-1: AST-based parsers vs regex pipelines

We compared mdast/remark (AST-based) against hand-rolled regex pipelines for
identifier rewriting. item-1 captures the structural-awareness gap: AST walks
correctly skip code fences and link labels, while regex pipelines collide with
both. The cost of the AST approach is the serializer's whitespace normalization,
which forces idempotency to be defined at the serialize boundary, not the parse
boundary.

Key data points:

- AST traversal handles 100% of code-fence and link-label edge cases
- Regex pipelines need 3-5 dedicated guards to match item-1 fidelity
- mdast/remark's stringify output is stable across re-parses

See [[SPEC-001: Composition Library]] for the resulting contract.

### item-2: Single-pass string replace vs sequential rewrites

After landing on AST parsing for the structural problem, item-2 captures a
second, narrower tradeoff: how to apply identifier rewrites on the serialized
output. Sequential rewrites (apply each renumber pair in order) are intuitive
but break bijection when the codomain of one pair collides with the domain of
the next. A single-pass alternation regex avoids the collision.

Reference snippet:

```typescript
const sortedKeys = [...keys].sort((a, b) => b.length - a.length);
const pattern = new RegExp(sortedKeys.join("|"), "g");
return content.replace(pattern, (match) => map[match] ?? match);
```

The sort-by-length-descending step prevents item-1 from greedily matching the
prefix of item-100, which is the exact failure mode that motivates item-2.
See [[DESIGN-002-SPEC-001: Mutation Strategy]] for the algebraic argument.

### item-3: Atomic write semantics belong outside the adapter

item-3 makes the case for keeping the adapter pure: it should never touch the
filesystem. The atomic write layer absorbs:

- Temp file creation in the same directory as the target
- Fsync the file descriptor
- POSIX rename to the final path
- Failure rollback (delete temp file on any error)
- Permission preservation when overwriting

This keeps the adapter trivially testable while the I/O layer absorbs real-world
failure modes. See [[REQ-007-SPEC-001: Atomic Persistence]] for the EARS form.

### item-4: Plan validation at the loader boundary

item-4 argues for Zod validation at the loader, not deep in the pipeline. The
benefits are early errors with file+line evidence and a single source of truth
for the schema. The cost is one extra dependency, which we accept.

The validator table below shows schema coverage per plan type:

| Plan type    | Required fields                            | Bijection check | Wikilink check |
| ------------ | ------------------------------------------ | --------------- | -------------- |
| distribution | plan_type, source_type, clusters           | yes             | yes            |
| composition  | plan_type, source_type, renumber_map       | yes             | yes            |
| migration    | plan_type, source_type, renumber_map, from | yes             | no             |
| repair       | plan_type, source_type, frontmatter_map    | n/a             | no             |

See [[SPEC-003: Plan Validation]] for the full schema definitions.

## Observations

- [fact] item-1 captures AST vs regex tradeoff #parsing
- [fact] item-2 captures single-pass replace requirement #mutation
- [fact] item-3 captures adapter purity invariant #separation-of-concerns
- [fact] item-4 captures Zod loader-boundary validation #validation
- [insight] AST walks dodge code-fence and link-label edges that regex misses #insight
- [insight] Bijection in the renumber map is the algebraic property of reversibility #algebra
- [constraint] Adapter MUST NOT touch the filesystem #purity
- [constraint] Plan validation MUST occur at the loader boundary #boundaries
- [risk] Non-bijective renumber maps yield undefined recomposition #plan-validation
- [outcome] item-1 through item-4 collectively justify the SPEC-001 architecture #synthesis

## Relations

- implements [[SPEC-001: Composition Library]]
- depends_on [[ANALYSIS-005: Markdown AST Tradeoffs]]
- pairs_with [[ADR-042: Composition Library Architecture]]
- supersedes [[ANALYSIS-020: Legacy String-Replace Survey]]
- part_of [[EPIC-007: Knowledge Graph Tooling]]
- relates_to [[CRIT-003-ANALYSIS-042: Round-Trip Edge Cases]]
