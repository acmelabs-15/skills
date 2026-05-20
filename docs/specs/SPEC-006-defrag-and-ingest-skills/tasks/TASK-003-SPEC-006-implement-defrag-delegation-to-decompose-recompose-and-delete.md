---
title: 'TASK-003-SPEC-006: Implement Defrag Delegation to Decompose Recompose and
  Delete'
type: task
status: TODO
permalink: specs/spec-006-defrag-and-ingest-skills/tasks/task-003-spec-006-implement-defrag-delegation-to-decompose-recompose-and-delete-1
tags:
- task
- defrag
- delegation
- report
---

# TASK-003-SPEC-006: Implement Defrag Delegation to Decompose Recompose and Delete

## Description

Implement the delegation logic in defrag/scripts/defrag.ts and defrag/scripts/report.ts. When a user confirms a split candidate, delegate to /decompose via Skill invocation. When a user confirms a merge candidate, delegate to /recompose. When a user confirms a stale-delete, call Brain MCP delete_note. Implement the report generator that formats audit candidates into a markdown report. Handle failures gracefully: log and skip, continue with remaining candidates.

## Definition of Done

- [ ] defrag/scripts/report.ts exports a report function that formats audit candidates into grouped markdown
- [ ] Split candidate confirmation triggers /decompose Skill invocation with note path and source_type
- [ ] Merge candidate confirmation triggers /recompose Skill invocation with note paths and source_type
- [ ] Stale-delete confirmation triggers Brain MCP delete_note with audit logging
- [ ] Structural-fix confirmation triggers Brain MCP edit_note to add H3 grouping headers
- [ ] Failed delegation (from /decompose or /recompose) is logged and skipped; cycle continues
- [ ] Final audit summary includes action counts (split, merge, delete, structural-fix, skipped, failed)
- [ ] --report-only mode writes report to defrag/reports/defrag-YYYY-MM-DD.md
- [ ] biome lint passes on all new/modified files

## Files Affected

- defrag/scripts/report.ts (new)
- defrag/scripts/defrag.ts (modify: add delegation orchestration)
- defrag/reports/ (new directory for cron reports)

## Implementation Approach

Report formatting uses template literal markdown with sections for each candidate type. Delegation uses Claude Code Skill invocation pattern. Error handling wraps each delegation in try-catch, logging errors to an accumulator and continuing. The final summary is appended to both the interactive output and the cron report file.

## Effort and Estimate

effort: M
estimate: 1d

## Observations

- [task] Implements Phase 3 of the defrag audit cycle: reporting and delegation orchestration #delegation #reporting
- [task] Report generator produces grouped markdown for both interactive display and cron file output #report #markdown
- [technique] Try-catch wrapping per candidate ensures single-candidate failures do not abort the cycle #resilience #error-handling
- [constraint] Delegation preserves zero-drift guarantee because /decompose and /recompose enforce SHA-256 hash validation internally #zero-drift #invariant

## Relations

- part_of [[SPEC-006: Defrag and Ingest Skills]]
- implements [[REQ-003-SPEC-006: Defrag Delegation Protocol]]
- implements [[DESIGN-001-SPEC-006: Defrag Skill Architecture]]