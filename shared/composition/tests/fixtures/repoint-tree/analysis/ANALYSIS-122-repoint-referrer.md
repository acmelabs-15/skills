---
title: 'ANALYSIS-122: Repoint Referrer'
type: analysis
status: DRAFT
permalink: analysis/analysis-122-repoint-referrer
tags:
- repoint
- fixture
---

# ANALYSIS-122: Repoint Referrer

## Context

The canonical wikilink form is [[ANALYSIS-120: Repoint Source]] in prose.

The bare permalink form reads analysis/analysis-120-repoint-source on its own.

A pasted search result carries fond/analysis/analysis-120-repoint-source instead.

A bare identifier reads ANALYSIS-120 in prose, and this line carries ANALYSIS-120 twice.

Citations take two shapes: ANALYSIS-120 Section 4 for an ordinal, and ANALYSIS-120 D-3 for a designator.

## Observations

- [fact] Carries one reference of every mechanically repointable class #repoint #fixture
- [fact] One line carries the same bare identifier twice, so column addressing is exercised rather than assumed #repoint #addressing
- [constraint] Relations are bi-directionally complete, so no graph finding dilutes the mechanical set #repoint #graph

## Relations

- relates_to [[ANALYSIS-120: Repoint Source]]
- relates_to [[ANALYSIS-121: Repoint Destination]]
