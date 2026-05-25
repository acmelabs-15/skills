---
title: "ADR-042: Composition Library Architecture"
type: decision
status: ACCEPTED
date: 2026-05-15
updated: 2026-05-20
tags:
  - architecture
  - composition
  - markdown
  - round-trip
---

# ADR-042: Composition Library Architecture

## Overview

This ADR captures the architectural decisions for the composition library that
powers distribution (decompose) and composition (recompose) workflows for
markdown-based knowledge graph notes. The library MUST guarantee a bit-exact
SHA-256 round-trip: any document decomposed into parts and then recomposed must
hash-identically to the original input. This invariant is non-negotiable and
gates every downstream feature.

The library targets four source types: ADR notes, SPEC parent notes, PRD notes,
and ANALYSIS index notes. Each source type has different section delimiters
and identifier patterns, but all four share the same parse-mutate-reverse
contract defined by the base markdown adapter.

## Decision

### D-1: Adopt unified + remark for AST parsing

We chose the unified/remark ecosystem over hand-rolled regex parsing because
markdown is non-regular and embedded code fences, nested lists, and YAML
frontmatter all require structural awareness. The `remark-parse`,
`remark-frontmatter`, and `remark-stringify` plugin chain gives us a stable
AST representation across parse and serialize boundaries.

Key implementation points:

- Use `remark-frontmatter` with the `["yaml"]` extension to preserve YAML blocks
- Use `remark-stringify` defaults for whitespace normalization
- Treat the AST as opaque between parse and serialize calls
- Idempotency is required at the serialize boundary, not the parse boundary

See [[SPEC-001: Composition Library]] for the full implementation contract.

### D-2: Mutate via single-pass regex replacement, not AST traversal

After evaluating AST-based identifier replacement (walking every node and
rewriting matching text nodes), we chose a single-pass regex replacement
strategy on the serialized string form. The reasoning: AST walks are fragile
in the face of identifier-bearing strings that appear in code fences, link
labels, and frontmatter values. A single-pass string replace with a sorted-by-
length alternation regex handles all locations uniformly.

Reference implementation:

```typescript
const sortedKeys = [...keys].sort((a, b) => b.length - a.length);
const escaped = sortedKeys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const pattern = new RegExp(escaped.join("|"), "g");
return content.replace(pattern, (match) => map[match] ?? match);
```

The sort-by-length-descending step prevents `D-1` from greedily matching the
prefix of `D-100` when both are present in the same alternation group. This
guarantees bijection between the renumber map's domain and codomain, which is
the algebraic property the round-trip invariant relies on. See
[[DESIGN-002-SPEC-001: Mutation Strategy]] for the proof sketch.

### D-3: Defer atomic write semantics to a separate module

We considered bundling file-write logic into the adapter interface but
ultimately rejected that coupling. The adapter contract is purely
content-in/content-out: it never touches the filesystem. A separate atomic
write module handles:

- Temp file creation in the same directory as the target (preserves rename
  atomicity guarantees on POSIX filesystems)
  - Write to `target.tmp.XXXXXX`
  - Fsync the file descriptor
  - Rename to the final path
- Failure rollback (delete temp file on any error)
- Permission preservation (mirror source mode bits when overwriting)

This separation lets the adapter layer remain pure and trivially testable
while the I/O layer absorbs the messy real-world failure modes. See
[[REQ-007-SPEC-001: Atomic Persistence]] for the EARS-format requirements.

### D-4: Validate plans with Zod at the loader boundary

Distribution and composition plans are YAML files on disk. Rather than parsing
them with `js-yaml` and trusting the shape, we run every loaded plan through a
Zod schema at the loader boundary. This catches:

- Missing required fields (plan_type, source_type, renumber_map)
- Type mismatches (renumber_map values that aren't strings)
- Bijection violations (duplicate values in renumber_map codomain)

The validator table below shows the schema coverage per plan type:

| Plan type    | Required fields                            | Bijection check | Wikilink check |
| ------------ | ------------------------------------------ | --------------- | -------------- |
| distribution | plan_type, source_type, clusters           | yes             | yes            |
| composition  | plan_type, source_type, renumber_map       | yes             | yes            |
| migration    | plan_type, source_type, renumber_map, from | yes             | no             |
| repair       | plan_type, source_type, frontmatter_map    | n/a             | no             |

Validation errors surface as structured `ZodError` instances, which the CLI
layer formats into actionable messages with file + line evidence. See
[[SPEC-003: Plan Validation]] for the full schema definitions.

## Clarifications

- 2026-05-18: D-2's sort-by-length step was originally ascending; corrected to
  descending after a bug surfaced where `D-1` matched the prefix of `D-12` in
  a real document. The descending sort guarantees greedy longest-match.
- 2026-05-19: D-3 originally required fsync on the parent directory as well;
  removed after confirming POSIX rename atomicity does not require it on the
  filesystems we target (ext4, APFS, btrfs).
- 2026-05-20: D-4 added the migration and repair plan types after SPEC-003
  decomposition surfaced the need.

## Observations

- [decision] Adopted unified/remark over regex parsing for structural awareness #parsing #ast
- [decision] Single-pass string replacement with length-descending sort guarantees bijection #mutation #algebra
- [decision] Atomic write semantics live in a separate module from the adapter contract #separation-of-concerns
- [decision] Zod validates plans at the loader boundary, not deep in the pipeline #validation #boundaries
- [constraint] SHA-256 round-trip is the non-negotiable invariant #correctness #hashing
- [constraint] Adapter layer never touches the filesystem #purity #testability
- [insight] AST walks are fragile across code fences, link labels, and frontmatter #parsing-fragility
- [insight] Bijection in the renumber map is the algebraic property that enables reversibility #algebra
- [risk] If a plan's renumber_map has a non-bijective codomain, recomposition is undefined #plan-validation
- [outcome] Round-trip property test gates every downstream feature #testing #proof

## Relations

- implements [[SPEC-001: Composition Library]]
- depends_on [[ANALYSIS-005: Markdown AST Tradeoffs]]
- pairs_with [[ADR-041: Atomic Write Primitives]]
- supersedes [[ADR-020: Legacy String-Replace Approach]]
- part_of [[EPIC-007: Knowledge Graph Tooling]]
- relates_to [[CRIT-003-ADR-042: Round-Trip Edge Cases]]
