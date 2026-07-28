---
title: "ANALYSIS-110: Graph Target"
type: analysis
status: DRAFT
permalink: analysis/analysis-110-graph-target
tags:
- analysis
- fixture
---

# ANALYSIS-110: Graph Target

## Findings

The scan target for bi-directional closure checks.

## Observations

- [fact] its Relations section uses the H3-grouped form #fixture
- [fact] the grouped form is what the conventions require above twelve #fixture
- [constraint] every group must be read, not just the first #fixture

## Relations

### contains

- [[ANALYSIS-111: Inverse Present]]
- [[ANALYSIS-112: Inverse Missing]]

### relates_to

- [[ANALYSIS-114: Symmetric Peer]]
