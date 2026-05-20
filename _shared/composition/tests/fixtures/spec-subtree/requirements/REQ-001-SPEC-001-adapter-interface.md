---
title: "REQ-001-SPEC-001: Adapter Interface"
type: requirement
status: ACCEPTED
permalink: specs/spec-001-composition-core/requirements/req-001-spec-001-adapter-interface
tags:
  - requirement
  - ears
  - adapter
---

# REQ-001-SPEC-001: Adapter Interface

## EARS

WHEN a caller invokes `adapter.parse(content)`, IT SHALL return a valid
mdast `Root` AST. WHEN a caller invokes `adapter.serialize(ast)`, IT SHALL
return a markdown string that is idempotent under a second parse-serialize
pass.

## Observations

- [requirement] Adapter MUST implement parse / serialize / extractByRange / applyMutations / reverseMutations #ears
- [constraint] parse-serialize MUST be idempotent #correctness

## Relations

- part_of [[SPEC-001: Composition Core]]
- relates_to [[REQ-002-SPEC-001: Hash Utility]]
