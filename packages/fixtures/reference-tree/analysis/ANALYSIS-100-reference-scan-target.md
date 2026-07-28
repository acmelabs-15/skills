---
title: "ANALYSIS-100: Reference Scan Target"
type: analysis
status: DRAFT
permalink: analysis/analysis-100-reference-scan-target
tags:
- analysis
- fixture
---

# ANALYSIS-100: Reference Scan Target

## Findings

A target that cites itself: ANALYSIS-100 Section 1. This line exists so the
scan can prove it excludes target files from their own results.

## Observations

- [fact] target note for the inbound-reference scanner fixture tree #fixture
- [fact] carries a self-citation that must never surface as inbound #fixture
- [constraint] permalink is the bare form, no project prefix #fixture

## Relations

- relates_to [[ANALYSIS-101: Reference Scan Referrer]]
- relates_to [[ADR-100: Reference Scan Decision]]
