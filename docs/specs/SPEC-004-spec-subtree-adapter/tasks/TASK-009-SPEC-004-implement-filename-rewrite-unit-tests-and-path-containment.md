---
title: 'TASK-009-SPEC-004: Implement Filename Rewrite Unit Tests and Path Containment'
type: task
permalink: specs/spec-004-spec-subtree-adapter/tasks/task-009-spec-004-implement-filename-rewrite-unit-tests-and-path-containment-1
status: DRAFT
effort: S
estimate: 1d
tags:
- task
- spec-004
- gap-task
- filename-rewrite
- test-coverage
---

# TASK-009-SPEC-004: Implement Filename Rewrite Unit Tests and Path Containment

## Design Context

Gap from TEST-REPORT-022-SPEC-004: TASK-003 + DESIGN-002 require unit tests for filename rewrite (success / conflict / rollback) and pre-flight injectivity + path-containment checks; none exist.

## Objective

Author `_shared/composition/tests/filename-rewrite.test.ts` exercising `applyFilenameRewrites` for: (a) successful subtree-wide rewrite, (b) duplicate-target injectivity rejection, (c) path-traversal target rejection, (d) mid-sequence failure LIFO rollback, (e) skip-when-no-rewrites case. Add injectivity + path-containment checks to pre-flight in `applyFilenameRewrites`.

## Files Affected

| File | Action | Purpose |
|---|---|---|
| _shared/composition/tests/filename-rewrite.test.ts | NEW | Unit tests per DoD |
| _shared/composition/src/adapters/spec-subtree.ts | MODIFY | Add injectivity + containedPath pre-flight checks |

## Definition of Done

- [ ] Test file with at least 5 unit tests covering: success, duplicate target rejection, path traversal rejection, LIFO rollback after mid-sequence failure, no-rewrites no-op
- [ ] Pre-flight in `applyFilenameRewrites` rejects when two rewrites target same `newRelativePath`
- [ ] Pre-flight rejects `newRelativePath` containing `..` or starting with `/`
- [ ] All tests pass under `bun test`
- [ ] tsc strict + biome clean

## Observations

- [problem] Zero tests exercise `applyFilenameRewrites` despite TASK-003 DoD listing 3 explicit test cases #test-coverage
- [problem] Pre-flight missing injectivity + path-containment checks per DESIGN-002 Component 2 #design-gap #security

## Relations

- part_of [[SPEC-004: SPEC Subtree Adapter]]
- caused_by [[TEST-REPORT-022-SPEC-004: Implement Filename Rewrite Handler]]
- extends [[TASK-003-SPEC-004: Implement Filename Rewrite Handler]]