---
title: 'TASK-002-SPEC-006: Implement Defrag Memory Audit'
type: task
status: TODO
permalink: specs/spec-006-defrag-and-ingest-skills/tasks/task-002-spec-006-implement-defrag-memory-audit
tags:
- task
- defrag
- audit
- thresholds
---

# TASK-002-SPEC-006: Implement Defrag Memory Audit

## Description

Implement the defrag audit engine at defrag/scripts/audit.ts. This module performs Phase 1 (discovery via Brain MCP list_directory and read_note) and Phase 2 (evaluation against CONVENTIONS Section 6 thresholds and scope-evaluation heuristics). It builds an in-memory audit state and classifies each note into candidate buckets: split, merge, stale, structural-fix.

## Definition of Done

- [ ] defrag/scripts/audit.ts exports an audit function accepting a project root path and staleness threshold
- [ ] Discovery phase enumerates all notes under docs/** via Brain MCP list_directory (depth 2+)
- [ ] For each note, reads frontmatter and content via Brain MCP read_note
- [ ] Evaluation checks observation count (flag split at more than 15 without H3 grouping, flag merge at fewer than 3)
- [ ] Evaluation checks relation count (flag structural-fix at more than 12 without H3 type-grouping, flag merge at fewer than 2)
- [ ] Evaluation checks line count (flag split at more than 500 lines with multi-entity content)
- [ ] Evaluation checks git last-modified date (flag stale when exceeding threshold and status not DONE/DEPRECATED)
- [ ] Returns structured audit result with candidates grouped by action type with specific violation evidence
- [ ] Unit tests cover each threshold boundary condition
- [ ] biome lint passes

## Files Affected

- defrag/scripts/audit.ts (new)
- defrag/scripts/audit.test.ts (new)

## Implementation Approach

Use Brain MCP list_directory with depth 2 to get all notes. For each note, call read_note to get content. Parse observation and relation counts by counting lines matching the category prefix pattern and wikilink relation pattern. Use Bun.$ to run git log -1 --format=%aI on each file path for staleness detection. Build a TypeScript interface for AuditCandidate with fields: path, entityType, violationType, violationDetail, evidence (counts/dates).

## Effort and Estimate

effort: M
estimate: 1.5d

## Observations

- [task] Implements Phase 1 (discovery) and Phase 2 (evaluation) of the defrag audit cycle #audit #discovery #evaluation
- [task] Threshold checks map directly to CONVENTIONS Section 6 quality thresholds #conventions #thresholds
- [technique] git log -1 --format=%aI provides ISO 8601 last-modified date for staleness detection #git #staleness
- [constraint] Brain MCP tools required for all note reads per CONVENTIONS Section 1.7.1 binary rule #brain-mcp

## Relations

- part_of [[SPEC-006: Defrag and Ingest Skills]]
- implements [[REQ-002-SPEC-006: Defrag Memory State Audit]]
- implements [[DESIGN-001-SPEC-006: Defrag Skill Architecture]]
