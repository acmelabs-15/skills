---
title: "ANALYSIS-112: Inverse Missing"
type: analysis
status: DRAFT
permalink: analysis/analysis-112-inverse-missing
tags:
- analysis
- fixture
---

# ANALYSIS-112: Inverse Missing

## Findings

Named by the target's contains group but carries no edge back — a one-way edge.

## Observations

- [problem] the target claims to contain this note #fixture
- [problem] this note carries no part_of edge in return #fixture
- [outcome] repair belongs on THIS note #fixture

## Relations

- relates_to [[ANALYSIS-114: Symmetric Peer]]
