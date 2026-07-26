---
title: "ADR-100: Reference Scan Decision"
type: decision
status: ACCEPTED
date: 2026-01-01
updated: 2026-01-01
permalink: decisions/adr-100-reference-scan-decision
tags:
- decision
- fixture
---

# ADR-100: Reference Scan Decision

## Decision

### D-1: The scanner enumerates inbound references — LOCKED

### D-2: Retention is decided by the caller — LOCKED

## Observations

- [decision] second target in the fixture tree, exercising per-target summaries #fixture
- [fact] carries D-N decision headings that inbound notes cite #fixture
- [constraint] no aliases declared, so every match is current-identity #fixture

## Relations

- relates_to [[ANALYSIS-100: Reference Scan Target]]
- relates_to [[SESSION-2026-01-01_01: Reference Scan Ledger]]
