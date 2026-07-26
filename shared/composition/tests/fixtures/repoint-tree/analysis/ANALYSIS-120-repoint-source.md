---
title: 'ANALYSIS-120: Repoint Source'
type: analysis
status: DRAFT
permalink: analysis/analysis-120-repoint-source
tags:
- repoint
- fixture
---

# ANALYSIS-120: Repoint Source

## Context

The pre-split identity. A repoint plan renumbers this note to the 121 slot and
retitles it, which is what makes every inbound reference in this tree stale.

Its own body carries no reference to itself. A target is excluded from its own
text scan, so a self-citation here would leave it unclear whether an executor had
honoured that exclusion or simply missed the line.

## Observations

- [fact] This note is the scan target, so it contributes identity and graph edges but no text findings #repoint #fixture
- [decision] Sections live here before the split and in the destination note after it #repoint #split
- [constraint] Relations are complete in both directions so the graph leg reports nothing #repoint #graph

## Relations

- relates_to [[ANALYSIS-122: Repoint Referrer]]
- relates_to [[ADR-120: Repoint Decision]]
