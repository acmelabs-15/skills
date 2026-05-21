---
title: 'REQ-003-SPEC-006: Defrag Delegation Protocol'
type: requirement
status: DRAFT
permalink: specs/spec-006-defrag-and-ingest-skills/requirements/req-003-spec-006-defrag-delegation-protocol
tags:
- requirement
- defrag
- delegation
- decompose
- recompose
---

# REQ-003-SPEC-006: Defrag Delegation Protocol

## Requirement Statement (EARS)

WHEN /defrag has confirmed candidates requiring restructuring
THE SYSTEM SHALL delegate split candidates to /decompose (providing the note path and detected source_type), delegate merge candidates to /recompose (providing the note paths and detected source_type), and delegate stale-entry candidates to Brain MCP delete_note (with user confirmation recorded in the audit log)
SO THAT /defrag acts as an orchestrator without performing composition operations directly, preserving the zero-drift guarantee from the composition library.

## Acceptance Criteria (GIVEN/WHEN/THEN)

GIVEN a confirmed split candidate with a detected source_type (adr, analysis, session, plan, spec)
WHEN /defrag delegates to /decompose
THEN /defrag invokes /decompose with the note path and source_type, and /decompose handles the full plan-author, user-adjudicate, script-execute cycle per its own protocol.

GIVEN a confirmed merge candidate set with a detected source_type
WHEN /defrag delegates to /recompose
THEN /defrag invokes /recompose with the note paths and source_type, and /recompose handles the full plan-author, user-adjudicate, script-execute cycle per its own protocol.

GIVEN a confirmed stale-delete candidate
WHEN /defrag delegates to Brain MCP delete_note
THEN /defrag calls delete_note with the note identifier, logs the deletion in the audit report with the note title and deletion timestamp, and verifies the note no longer appears in list_directory output.

GIVEN /decompose or /recompose returns a failure (hash mismatch, user rejection, validation error)
WHEN /defrag receives the failure
THEN /defrag logs the failure in the audit report, skips the candidate, and continues processing remaining candidates without aborting the entire defrag cycle.

GIVEN all confirmed candidates have been processed
WHEN /defrag completes its delegation cycle
THEN /defrag produces a final audit report summarizing actions taken (split count, merge count, delete count, skip count, failure count) and commits the report.

## Source

KICKOFF-BRIEF.md "/defrag and /ingest" section. ADR-001 F-5 (naming: decompose, recompose).

## Observations

- [requirement] /defrag delegates to /decompose for splits and /recompose for merges; it never performs composition operations directly #delegation #zero-drift
- [requirement] Stale-entry deletion uses Brain MCP delete_note with audit logging #deletion #audit
- [requirement] Failures from /decompose or /recompose are logged and skipped; the defrag cycle continues with remaining candidates #resilience #fault-tolerance
- [constraint] The delegation protocol preserves the SHA-256 char-identity invariant because /decompose and /recompose enforce it internally #hash-validation #invariant

## Relations

- part_of [[SPEC-006: Defrag and Ingest Skills]]
- implements [[REQ-001-SPEC-006: Defrag Skill Implementation]]
- depends_on [[SPEC-005: Decompose and Recompose Skills]]
