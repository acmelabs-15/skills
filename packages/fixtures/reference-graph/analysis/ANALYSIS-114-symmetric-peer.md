---
title: "ANALYSIS-114: Symmetric Peer"
type: analysis
status: DRAFT
permalink: analysis/analysis-114-symmetric-peer
tags:
- analysis
- fixture
---

# ANALYSIS-114: Symmetric Peer

## Findings

Symmetric verbs carry the same verb on both ends.

## Observations

- [fact] relates_to is its own inverse #fixture
- [fact] the pair is closed when both sides carry relates_to #fixture
- [constraint] symmetry must not be treated as a missing inverse #fixture

## Relations

- relates_to [[ANALYSIS-110: Graph Target]]
- relates_to [[ANALYSIS-112: Inverse Missing]]
