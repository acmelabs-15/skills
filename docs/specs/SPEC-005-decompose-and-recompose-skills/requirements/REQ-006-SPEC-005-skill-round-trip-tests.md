---
title: 'REQ-006-SPEC-005: Skill Round-Trip Tests'
type: requirement
status: ACCEPTED
permalink: specs/spec-005-decompose-and-recompose-skills/requirements/req-006-spec-005-skill-round-trip-tests
tags:
- requirement
- round-trip
- testing
- spec-005
- end-to-end
---

# REQ-006-SPEC-005: Skill Round-Trip Tests

## Requirement Statement

WHEN the test suite is executed,
THE SYSTEM SHALL verify that invoking /decompose on a source note followed by /recompose on the decomposed outputs produces content that is SHA-256 identical to the original source,
SO THAT the end-to-end zero-drift guarantee is validated at the skill orchestration level, not just at the library adapter level.

## EARS Pattern: Ubiquitous

The round-trip test runs as part of the standard test suite (bun test) and gates CI. It validates the complete pipeline including plan loading, adapter dispatch, hash validation, and atomic write.

## Context

SPEC-001 establishes the round-trip property test at the adapter level: SHA-256(original) === SHA-256(decompose then recompose(original)). That test exercises the composition library directly. This REQ extends the round-trip guarantee to the skill orchestration level, testing the full pipeline through the CLI entry points (decompose.ts and recompose.ts). The test uses fixture plan YAMLs (not LLM-authored plans) to ensure deterministic test execution.

The skill-level round-trip test exercises additional code paths not covered by the adapter-level test: plan YAML loading and Zod validation, adapter registry dispatch, audit log emission, and error reporting. It also validates that the CLI entry points correctly wire the composition library components together.

## Acceptance Criteria

- [ ] Given an ADR fixture note and a fixture distribution plan YAML, when decompose.ts executes the plan, then N destination files are produced that pass hash validation
- [ ] Given the N destination files from the decompose step and a fixture composition plan YAML (inverse of the distribution plan), when recompose.ts executes the plan, then the single output file is SHA-256 identical to the original fixture note
- [ ] Given a plan YAML with an invalid source_type, when the test invokes decompose.ts, then a structured PlanValidationError is thrown before any file I/O
- [ ] Given a plan YAML with a non-injective renumber_map, when the test invokes decompose.ts, then Zod validation rejects the plan at load time

## Priority

P0 -- The round-trip property test at the skill level is the top-level validation that the entire system works end-to-end. Without it, the zero-drift guarantee exists only at the library level.

## Category

Functional

## Observations

- [requirement] End-to-end round-trip test validates /decompose then /recompose produces SHA-256 identical output at skill orchestration level #round-trip #end-to-end
- [fact] Uses fixture plan YAMLs for deterministic test execution; does not invoke LLM during testing #fixtures #deterministic
- [decision] Tests run via bun test and gate CI per ADR-001 F-6 Bun runtime #testing #ci
- [constraint] Exercises full pipeline including plan loading, Zod validation, adapter dispatch, hash validation, and atomic write #coverage #pipeline

## Relations

- part_of [[SPEC-005: Decompose and Recompose Skills]]
- implements [[ADR-001: Composition Library Architecture]]
- depends_on [[REQ-001-SPEC-005: Decompose Skill Implementation]]
- depends_on [[REQ-002-SPEC-005: Recompose Skill Implementation]]
