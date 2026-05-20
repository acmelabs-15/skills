---
title: "REQ-002-SPEC-001: Hash Utility"
type: requirement
status: ACCEPTED
permalink: specs/spec-001-composition-core/requirements/req-002-spec-001-hash-utility
tags:
  - requirement
  - ears
  - hashing
---

# REQ-002-SPEC-001: Hash Utility

## EARS

WHEN `sha256(content)` is invoked with a string input, IT SHALL return the
lowercase hex-encoded SHA-256 digest of the UTF-8 byte representation of
that string.

## Observations

- [requirement] sha256 MUST use Bun's CryptoHasher #hashing #bun-native
- [constraint] Output MUST be 64-character lowercase hex #correctness

## Relations

- part_of [[SPEC-001: Composition Core]]
- relates_to [[REQ-001-SPEC-001: Adapter Interface]]
