---
title: 'ADR-120: Repoint Decision'
type: decision
status: ACCEPTED
date: 2026-01-01
updated: 2026-01-01
permalink: decisions/adr-120-repoint-decision
tags:
- repoint
- fixture
---

# ADR-120: Repoint Decision

## Context

Exists to carry an H3-GROUPED Relations section. Above twelve relations the
conventions require grouping by relation type, which puts the verb in the
sub-header and leaves the entries bare. A repoint has to reach a wikilink sitting
in that shape, so one is placed here rather than assumed equivalent to the flat
form.

## Observations

- [fact] Relations are grouped by type under H3 sub-headers rather than listed flat #repoint #relations
- [constraint] The grouped wikilink is the only inbound reference this note carries #repoint #fixture
- [decision] Grouping is the shape under test, so the note stays otherwise minimal #repoint #fixture

## Relations

### relates_to

- [[ANALYSIS-120: Repoint Source]]
- [[ANALYSIS-121: Repoint Destination]]
