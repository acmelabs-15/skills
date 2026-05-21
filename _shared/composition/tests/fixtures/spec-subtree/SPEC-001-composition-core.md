---
title: "SPEC-001: Composition Core"
type: spec
status: ACCEPTED
permalink: specs/spec-001-composition-core
tags:
  - composition
  - core
  - round-trip
---

# SPEC-001: Composition Core

## Overview

This SPEC defines the composition library that provides reversible
decomposition and recomposition of markdown notes with a bit-exact
SHA-256 round-trip invariant.

## Phases

- [ ] REQ-001-SPEC-001 implemented
- [ ] REQ-002-SPEC-001 implemented
- [ ] TASK-001-SPEC-001 done

## Observations

- [decision] Composition is single-file at the adapter interface #design
- [constraint] Subtree adapters must guarantee per-file SHA-256 identity #correctness
- [requirement] REQ-001 covers the adapter interface contract #ears

## Relations

- contains [[REQ-001-SPEC-001: Adapter Interface]]
- contains [[REQ-002-SPEC-001: Hash Utility]]
- contains [[TASK-001-SPEC-001: Scaffold Adapter]]
