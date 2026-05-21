---
title: "ADR-099: Skill Round-Trip Fixture"
type: decision
status: ACCEPTED
date: 2026-05-21
tags:
  - fixture
  - round-trip
  - spec-005
---

# ADR-099: Skill Round-Trip Fixture

## Context

A minimal fixture ADR used by the SPEC-005 skill-level round-trip test. Contains
two decisions whose identifiers are remapped by the distribution plan and
recovered by the composition plan.

## Decision

### D-1: Use Bun.file for source reads

The composition library uses Bun-native `Bun.file().text()` for all source
reads, avoiding the Node `fs/promises` import surface entirely.

### D-2: SHA-256 validates the round trip

Every distribution-then-composition cycle must reproduce the original source
byte-for-byte, verified via SHA-256.

## Observations

- [decision] Bun-native I/O throughout #bun #io
- [decision] SHA-256 is the round-trip oracle #correctness #hashing

## Relations

- part_of [[SPEC-005: Decompose and Recompose Skills]]
- relates_to [[ADR-001: Composition Library Architecture]]
