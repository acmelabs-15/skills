---
title: 'TASK-006-SPEC-006: Defrag and Ingest Tests'
type: task
status: DONE
permalink: specs/spec-006-defrag-and-ingest-skills/tasks/task-006-spec-006-defrag-and-ingest-tests
tags:
- task
- testing
- defrag
- ingest
---

# TASK-006-SPEC-006: Defrag and Ingest Tests

## Description

Implement tests for /defrag and /ingest skills. /defrag tests cover the audit engine threshold boundary conditions, report formatting, and delegation error handling. /ingest tests cover source parsing (with and without frontmatter), entity type detection, content assembly (Brain-aware and Basic Memory paths), Pattern 2 three-phase write round-trip, and coexistence verification (both skill sets installed without collision). Tests use Bun test runner with fixture files.

## Definition of Done

- [x] defrag/scripts/audit.test.ts covers all threshold boundary conditions (observation min/max, relation min/max, line count, staleness)
- [x] defrag/scripts/report.test.ts covers markdown report formatting for each candidate type
- [x] defrag/scripts/defrag.test.ts covers delegation error handling (mock /decompose and /recompose failures)
- [x] ingest/scripts/parse.test.ts covers frontmatter-present and frontmatter-absent source files
- [x] ingest/scripts/detect.test.ts covers entity type detection for all 16 canonical types plus fallback
- [x] ingest/scripts/assemble.test.ts covers Brain-aware content assembly (frontmatter, observations, relations) and Basic Memory path
- [x] ingest/scripts/ingest.test.ts covers end-to-end single-file ingest with Pattern 2 three-phase write verification
- [x] _shared/detect-context.test.ts covers Brain, Basic Memory, and --basic-memory flag override scenarios
- [x] Test fixtures directory at test-fixtures/ contains sample source files for each scenario
- [x] All tests pass via bun test
- [x] biome lint passes on all test files

## Files Affected

- defrag/scripts/audit.test.ts (new)
- defrag/scripts/report.test.ts (new)
- defrag/scripts/defrag.test.ts (new)
- ingest/scripts/parse.test.ts (new)
- ingest/scripts/detect.test.ts (new)
- ingest/scripts/assemble.test.ts (new)
- ingest/scripts/ingest.test.ts (new)
- _shared/detect-context.test.ts (new)
- test-fixtures/ (new directory with sample source files)

## Implementation Approach

Use bun test with describe/test blocks. Fixture files provide known-good inputs for deterministic assertions. Mock Brain MCP calls via dependency injection (pass a mock adapter interface to audit and ingest functions). For end-to-end ingest tests, use a temporary docs/ directory created via Bun.write and cleaned up in afterEach.

## Effort and Estimate

effort: M
estimate: 2d

## Observations

- [task] Comprehensive test suite covering both /defrag and /ingest across unit, integration, and end-to-end levels #testing #comprehensive
- [task] Fixture-based testing with sample source files for deterministic assertions #fixtures #deterministic
- [technique] Dependency injection of Brain MCP adapter enables mocking without network calls #mocking #di
- [technique] Use test() not it() per project vitest convention #vitest #test-keyword

## Relations

- part_of [[SPEC-006: Defrag and Ingest Skills]]
- implements [[REQ-001-SPEC-006: Defrag Skill Implementation]]
- implements [[REQ-004-SPEC-006: Ingest Skill Implementation]]
- implements [[REQ-006-SPEC-006: Coexistence with Memory-Ingest and Memory-Defrag]]
- validated_by [[QA-040-SPEC-006: Batched Build Revalidation]]
- validated_by [[QA-041-SPEC-006: Fix Iter 1 Revalidation]]
