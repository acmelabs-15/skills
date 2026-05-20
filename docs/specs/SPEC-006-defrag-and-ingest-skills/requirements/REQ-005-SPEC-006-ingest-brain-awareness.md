---
title: 'REQ-005-SPEC-006: Ingest Brain-Awareness'
type: requirement
status: DRAFT
permalink: specs/spec-006-defrag-and-ingest-skills/requirements/req-005-spec-006-ingest-brain-awareness
tags:
- requirement
- ingest
- brain-awareness
- conventions
---

# REQ-005-SPEC-006: Ingest Brain-Awareness

## Requirement Statement (EARS)

WHEN /ingest creates a Brain note from external source content
THE SYSTEM SHALL ensure the resulting note is fully compliant with CONVENTIONS: frontmatter includes all required fields (title in ENTITY-ID colon Descriptor format, type from the 16 canonical entity types, status, permalink in folder/kebab form, 2-5 tags), the note body includes an Observations section with at least 3 observations each having a valid category prefix and 1-3 inline hashtag tags, the note body includes a Relations section with at least 2 relations using only the 11 valid relation types, and the final two sections are Observations followed by Relations per the Section 4.0 invariant
SO THAT ingested notes are indistinguishable from natively-authored Brain notes in the knowledge graph.

## Acceptance Criteria (GIVEN/WHEN/THEN)

GIVEN source content that lacks CONVENTIONS-compliant frontmatter
WHEN /ingest processes the content
THEN /ingest generates frontmatter with title (derived from filename or first H1), type (from auto-detection or --type flag), status (DRAFT), permalink (folder/kebab-case), and 2-5 tags (derived from content keywords).

GIVEN source content that lacks an Observations section
WHEN /ingest processes the content
THEN /ingest generates at least 3 observations from the source content, each with a valid category prefix (fact, decision, requirement, technique, insight, problem, solution, constraint, risk, outcome) and 1-3 inline hashtag tags.

GIVEN source content that lacks a Relations section
WHEN /ingest processes the content
THEN /ingest generates at least 2 relations using only the 11 valid relation types (implements, depends_on, relates_to, extends, part_of, inspired_by, contains, pairs_with, supersedes, leads_to, caused_by) with wikilink targets matching existing note titles in the knowledge graph where possible.

GIVEN source content with existing Observations and Relations sections
WHEN /ingest validates the sections
THEN /ingest preserves valid observations and relations verbatim, flags invalid category prefixes or relation types for user review, and appends corrections only with user confirmation.

GIVEN the note creation uses Pattern 2 three-phase write
WHEN /ingest executes the write
THEN Phase 1 uses write_note with a space-separated title (no colon), Phase 2 uses edit_note to insert the colon in frontmatter title and H1, and Phase 3 uses move_note to rename to kebab filename.

GIVEN the ingested note
WHEN post-write verification runs
THEN the note passes all 11 items of the CONVENTIONS Section 8.1 pre-flight checklist and all 6 items of the Section 8.2 post-write verification checklist.

## Source

KICKOFF-BRIEF.md "/defrag and /ingest" section (Brain-awareness requirements: CONVENTIONS, Pattern 2 three-phase write, 16 canonical entity types, observation category prefix + tags, final-two-sections invariant). Per ANALYSIS-001 P1-2 amendment: these are NON-ADR scope requirements sourced from KICKOFF-BRIEF.md, not from any ADR D-N decision.

## Observations

- [requirement] Ingested notes must pass CONVENTIONS Section 8.1 pre-flight checklist (11 items) and Section 8.2 post-write verification (6 items) #conventions #compliance
- [requirement] Pattern 2 three-phase write is mandatory: space-title write, colon edit, kebab move #pattern-2 #three-phase
- [requirement] Observations must have valid category prefix and 1-3 inline tags; Relations must use only the 11 valid types #observations #relations
- [constraint] Brain-awareness requirements are NON-ADR scope per ANALYSIS-001 P1-2 amendment; source is KICKOFF-BRIEF.md not any ADR decision #non-adr #kickoff-brief

## Relations

- part_of [[SPEC-006: Defrag and Ingest Skills]]
- implements [[REQ-004-SPEC-006: Ingest Skill Implementation]]
- relates_to [[ANALYSIS-001: SPEC Clustering]]