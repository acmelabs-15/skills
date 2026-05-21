---
title: 'REQ-001-SPEC-006: Defrag Skill Implementation'
type: requirement
status: DRAFT
permalink: specs/spec-006-defrag-and-ingest-skills/requirements/req-001-spec-006-defrag-skill-implementation
tags:
- requirement
- defrag
- curator
- cron
---

# REQ-001-SPEC-006: Defrag Skill Implementation

## Requirement Statement (EARS)

WHEN a user invokes /defrag (interactively or via cron schedule)
THE SYSTEM SHALL audit the active Brain project's knowledge-graph notes against CONVENTIONS Section 6 quality thresholds and scope-evaluation heuristics, identify candidates for split, merge, and stale-entry cleanup, present a summary report of candidates to the user for confirmation, and delegate confirmed actions to /decompose, /recompose, or native Brain MCP delete operations
SO THAT the knowledge graph stays within quality thresholds without manual curation effort.

## Acceptance Criteria (GIVEN/WHEN/THEN)

GIVEN a Brain project with notes under docs/**
WHEN /defrag is invoked
THEN the system performs a full audit cycle across all note directories, produces a candidates report grouped by action type (split, merge, stale-delete), and awaits user confirmation before executing any action.

GIVEN a note exceeding CONVENTIONS Section 6 observation threshold (more than 15 observations without H3 sub-grouping)
WHEN /defrag audit identifies the note
THEN the note appears in the split-candidates list with the specific threshold violation cited.

GIVEN a set of notes identified as merge candidates (related notes below minimum observation count or with high content overlap)
WHEN /defrag audit identifies the set
THEN the set appears in the merge-candidates list with overlap rationale.

GIVEN the user confirms a split candidate
WHEN /defrag processes the confirmation
THEN /defrag delegates to /decompose with the candidate note path and source_type.

GIVEN the user confirms a merge candidate set
WHEN /defrag processes the confirmation
THEN /defrag delegates to /recompose with the candidate note paths and source_type.

GIVEN the user confirms a stale-delete candidate
WHEN /defrag processes the confirmation
THEN /defrag calls Brain MCP delete_note with confirmation, and records the deletion in the audit log.

GIVEN /defrag is invoked via cron (non-interactive mode)
WHEN candidates are identified
THEN /defrag writes the candidates report to a file and exits without executing actions (report-only mode for cron).

## Source

KICKOFF-BRIEF.md "/defrag and /ingest" section. ADR-001 F-1 (symlink install), F-2 (Brain-first scope).

## Observations

- [requirement] /defrag is a periodic curator skill that can run interactively or via cron schedule in report-only mode #defrag #cron #curator
- [requirement] The audit cycle covers all note directories under docs/** in the active Brain project #audit #scope
- [requirement] User confirmation is mandatory before any destructive or restructuring action is taken #confirmation #safety
- [constraint] /defrag delegates restructuring to /decompose and /recompose primitives; it does not perform composition operations directly #delegation #separation-of-concerns

## Relations

- part_of [[SPEC-006: Defrag and Ingest Skills]]
- depends_on [[REQ-003-SPEC-006: Defrag Delegation Protocol]]
- relates_to [[ADR-001: Composition Library Architecture]]
