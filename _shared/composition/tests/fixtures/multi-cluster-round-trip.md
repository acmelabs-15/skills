---
title: "ADR-098: Multi-Cluster Round-Trip Fixture"
type: decision
status: ACCEPTED
date: 2026-05-21
tags:
  - fixture
  - round-trip
  - spec-005
  - multi-cluster
---

# ADR-098: Multi-Cluster Round-Trip Fixture

## Context

A multi-region fixture used by the SPEC-005 N>1 round-trip test (QA-039
Deviation 4 remediation). The file is partitioned by line range into three
clusters, each containing a single decision identifier. Each cluster is
extracted into its own destination file via adapter.extractByRange, then
re-merged via the recompose CLI to validate the genuine 1-to-N split path.

## Decision

### D-1: Cluster A — frontmatter and context preamble

Cluster A covers the YAML frontmatter, H1 title, the Context section, and the
opening of the Decision section through this paragraph. The renumber_map
in the distribution plan isolates this region's identifier from the other
clusters' identifier spaces.

### D-2: Cluster B — middle decision body

Cluster B is the middle region containing this decision body. The distribution
plan declares a per-cluster line range for this region. The boundary between
Cluster A and Cluster B falls cleanly on the line preceding this heading.

### D-3: Cluster C — final decision and trailing sections

Cluster C contains this final decision, the Observations section, and the
Relations section. The cluster ends at end-of-file (range end -1 in the
plan YAML).

## Observations

- [decision] Multi-cluster fixture isolates 3 distinct decision identifiers #multi-cluster #fixture
- [decision] Each cluster maps to a distinct extractByRange call #spec-005 #round-trip
- [decision] Recompose CLI joins the slices via concatenation #cli #composition

## Relations

- part_of [[SPEC-005: Decompose and Recompose Skills]]
- relates_to [[ADR-099: Skill Round-Trip Fixture]]
