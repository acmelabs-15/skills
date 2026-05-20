---
title: 'DESIGN-001-SPEC-006: Defrag Skill Architecture'
type: design
status: DRAFT
permalink: specs/spec-006-defrag-and-ingest-skills/design/design-001-spec-006-defrag-skill-architecture
tags:
- design
- defrag
- audit
- cron
---

# DESIGN-001-SPEC-006: Defrag Skill Architecture

## Overview

The /defrag skill is a periodic curator that audits the active Brain project's knowledge graph and delegates restructuring actions to the /decompose and /recompose primitive skills. It operates in two modes: interactive (user confirms each action) and cron/report-only (writes a candidates report without executing actions).

## Architecture

### Skill Structure

The /defrag skill lives at defrag/SKILL.md in the skills project root. It is installed via symlink at ~/.claude/skills/defrag per ADR-001 F-1. The SKILL.md defines the Claude Code skill trigger phrases, description, and orchestration instructions.

### Audit Cycle

The audit cycle is the core of /defrag. It proceeds in three phases.

**Phase 1 -- Discovery.** Use Brain MCP list_directory with depth 2+ to enumerate all notes under docs/**. For each note, use Brain MCP read_note to retrieve frontmatter and content. Build an in-memory audit state containing: note identifier, entity type, observation count, relation count, line count, H3 sub-grouping presence in Observations, H3 type-grouping presence in Relations, git last-modified date (via git log -1 --format=%aI on the file path), and status field value.

**Phase 2 -- Evaluation.** Apply the heuristic rules from CONVENTIONS Section 6 and scope-evaluation thresholds against the audit state. Classify each note into zero or more candidate buckets: split-candidate (observations more than 15 without H3 sub-grouping, line count more than 500 with multi-entity content), merge-candidate (observations fewer than 3, relations fewer than 2, high content overlap with a sibling note), stale-candidate (git last-modified more than staleness threshold days ago and status not DONE/DEPRECATED), structural-fix (relations more than 12 without H3 type-grouping).

**Phase 3 -- Reporting and Delegation.** Produce a markdown candidates report grouped by action type. In interactive mode, present the report to the user and process confirmations one candidate at a time. In cron mode, write the report to defrag/reports/defrag-YYYY-MM-DD.md and exit.

### Delegation Flow

Confirmed split candidates are delegated to /decompose via Skill invocation with the note path and detected source_type. Confirmed merge candidates are delegated to /recompose via Skill invocation with the note paths and detected source_type. Confirmed stale-delete candidates use Brain MCP delete_note directly. Confirmed structural-fix candidates (H3 grouping needed) use Brain MCP edit_note to add grouping headers without content modification.

### Cron Runnability

/defrag supports a --report-only flag that skips interactive confirmation and delegation. In this mode, the audit cycle runs Phases 1 and 2, writes the Phase 3 report to disk, and exits with code 0 (candidates found) or code 2 (no candidates). This enables cron scheduling via Claude Code's CronCreate tool or system crontab.

### Error Handling

If /decompose or /recompose fails for a candidate (hash mismatch, user rejection, validation error), /defrag logs the failure in the audit report, skips the candidate, and continues with remaining candidates. The audit cycle never aborts entirely due to a single candidate failure.

## Module Structure

defrag/SKILL.md -- Claude Code skill definition (trigger phrases, description, orchestration instructions)
defrag/scripts/audit.ts -- Audit engine (Phases 1-2: discovery + evaluation)
defrag/scripts/report.ts -- Report generator (Phase 3: markdown report formatting)
defrag/scripts/defrag.ts -- CLI entry point (parses --report-only flag, orchestrates audit + report + delegation)

## Observations

- [design] Three-phase audit cycle: discovery via Brain MCP, evaluation against CONVENTIONS thresholds, reporting and delegation #audit-cycle #three-phase
- [design] Two operation modes: interactive (user confirms each action) and cron/report-only (writes report without executing) #modes #cron
- [design] Delegation to /decompose and /recompose preserves zero-drift guarantee; /defrag never performs composition operations directly #delegation #zero-drift
- [constraint] Git last-modified date used for staleness detection requires the project to be a git repository #git #staleness

## Relations

- part_of [[SPEC-006: Defrag and Ingest Skills]]
- implements [[REQ-001-SPEC-006: Defrag Skill Implementation]]
- implements [[REQ-002-SPEC-006: Defrag Memory State Audit]]
- implements [[REQ-003-SPEC-006: Defrag Delegation Protocol]]