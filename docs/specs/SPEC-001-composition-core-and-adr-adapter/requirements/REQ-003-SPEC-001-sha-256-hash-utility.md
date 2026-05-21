---
title: 'REQ-003-SPEC-001: SHA-256 Hash Utility'
type: requirement
permalink: specs/spec-001-composition-core-and-adr-adapter/requirements/req-003-spec-001-sha-256-hash-utility
status: ACCEPTED
tags:
- requirement
- spec-001
- hash
- sha256
---

# REQ-003-SPEC-001: SHA-256 Hash Utility

## Requirement Statement

WHEN the composition library needs to compute a content hash for char-identity validation
THE SYSTEM SHALL provide a shared sha256(content: string): string utility at _shared/composition/src/core/hash.ts that wraps Bun.hash("sha256", content)
SO THAT all adapters use a single hash implementation ensuring consistent validation across the entire library.

## Pattern

Ubiquitous (used by every adapter and the round-trip property test).

## Priority

P0 — the SHA-256 hash is the core anti-drift mechanism per ADR-001 F-8.

## Category

Functional

## Context

ADR-002 D-2 P1-I resolution specifies that hash() is NOT part of the CompositionAdapter interface. It is a shared utility at _shared/composition/src/core/hash.ts. Adapters compose with this utility via import. The utility wraps Bun.hash("sha256", content) per ADR-001 F-6 (Bun-native APIs) and F-8 (SHA-256 char-identity invariant). SHA-256 is a NIST standard available in every runtime; the Bun wrapper is the only Bun-specific aspect.

## Acceptance Criteria

- [x] GIVEN a string input
      WHEN sha256(input) is called
      THEN it returns the hex-encoded SHA-256 hash of the input

- [x] GIVEN two identical strings
      WHEN sha256 is called on each
      THEN the returned hashes are identical

- [x] GIVEN two strings differing by a single character
      WHEN sha256 is called on each
      THEN the returned hashes differ

- [x] GIVEN the sha256 utility
      WHEN imported from _shared/composition/src/core/hash.ts
      THEN it uses Bun.hash("sha256", ...) internally per ADR-001 F-6

## Implementation Notes

The utility is a single exported function. It should return the hex string representation of the hash for human-readable comparison and logging. The function is synchronous (Bun.hash is synchronous).

## Observations

- [requirement] Shared sha256 utility provides single hash implementation for all adapters and round-trip tests #hash #utility
- [constraint] Must use Bun.hash per ADR-001 F-6 Bun-native APIs requirement #bun #runtime
- [decision] Hash utility is a shared import not on the adapter interface per ADR-002 D-2 P1-I #separation-of-concerns

## Relations

- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[ADR-001: Composition Library Architecture]]
