---
title: 'REQ-002-SPEC-006: Defrag Memory State Audit'
type: requirement
status: DRAFT
permalink: specs/spec-006-defrag-and-ingest-skills/requirements/req-002-spec-006-defrag-memory-state-audit
tags:
- requirement
- defrag
- audit
- thresholds
---

# REQ-002-SPEC-006: Defrag Memory State Audit

## Requirement Statement (EARS)

WHEN /defrag performs its audit cycle
THE SYSTEM SHALL evaluate each Brain note against CONVENTIONS Section 6 quality thresholds (observation count min 3, relation count min 2, H3 sub-grouping required at 15+ observations, H3 relation-type grouping required at 12+ relations) and scope-evaluation criteria (note size relative to entity type norms, content cohesion within sections, temporal staleness based on git last-modified date)
SO THAT candidates for split, merge, and stale-entry cleanup are identified with specific threshold violations cited.

## Acceptance Criteria (GIVEN/WHEN/THEN)

GIVEN a note with more than 15 observations and no H3 sub-grouping within the Observations section
WHEN /defrag audit evaluates the note
THEN the note is flagged as a split candidate with violation "observations exceed 15 without H3 sub-grouping" and the observation count.

GIVEN a note with more than 12 relations and no H3 relation-type grouping within the Relations section
WHEN /defrag audit evaluates the note
THEN the note is flagged as a structural-fix candidate with violation "relations exceed 12 without H3 type grouping" and the relation count.

GIVEN a note with fewer than 3 observations
WHEN /defrag audit evaluates the note
THEN the note is flagged as a merge candidate with violation "observations below minimum threshold of 3" and the observation count.

GIVEN a note with fewer than 2 relations
WHEN /defrag audit evaluates the note
THEN the note is flagged as a merge candidate with violation "relations below minimum threshold of 2" and the relation count.

GIVEN a note whose git last-modified date exceeds a configurable staleness threshold (default 90 days) and whose status is not DONE or DEPRECATED
WHEN /defrag audit evaluates the note
THEN the note is flagged as a stale candidate with the last-modified date and days-since-modified.

GIVEN a note that exceeds 500 lines and contains content addressable as multiple distinct entity types
WHEN /defrag audit evaluates the note
THEN the note is flagged as a split candidate with violation "note exceeds size threshold with multi-entity content" and line count.

## Source

KICKOFF-BRIEF.md "/defrag and /ingest" section. CONVENTIONS Section 6 quality thresholds.

## Observations

- [requirement] Audit evaluates CONVENTIONS Section 6 thresholds: observation min 3, relation min 2, H3 sub-grouping at 15+ observations, H3 type-grouping at 12+ relations #thresholds #conventions
- [requirement] Scope evaluation includes note size, content cohesion, and temporal staleness via git last-modified date #scope-evaluation #staleness
- [requirement] Each candidate includes the specific violation type and quantitative evidence (counts, dates, line numbers) #evidence #actionable
- [constraint] Staleness threshold is configurable with a default of 90 days; notes with status DONE or DEPRECATED are excluded from staleness checks #configurable #exclusion

## Relations

- part_of [[SPEC-006: Defrag and Ingest Skills]]
- implements [[REQ-001-SPEC-006: Defrag Skill Implementation]]
- relates_to [[ADR-001: Composition Library Architecture]]