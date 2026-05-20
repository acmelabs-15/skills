---
title: 'REQ-004-SPEC-006: Ingest Skill Implementation'
type: requirement
status: DRAFT
permalink: specs/spec-006-defrag-and-ingest-skills/requirements/req-004-spec-006-ingest-skill-implementation
tags:
- requirement
- ingest
- verbatim
- brain-mcp
---

# REQ-004-SPEC-006: Ingest Skill Implementation

## Requirement Statement (EARS)

WHEN a user invokes /ingest with a source file path (or directory path) and an optional target entity type
THE SYSTEM SHALL parse the source content, detect the appropriate entity type (from frontmatter or user override), create a new Brain note via Brain MCP write_note using Pattern 2 three-phase write (space-title write, edit to add colon, move_note to kebab filename), preserve source content verbatim in the note body, and generate CONVENTIONS-compliant frontmatter, observations, and relations
SO THAT external content enters the knowledge graph as a well-formed Brain note with verbatim source preservation.

## Acceptance Criteria (GIVEN/WHEN/THEN)

GIVEN a markdown file at an external path (outside docs/**)
WHEN /ingest is invoked with the file path
THEN a new Brain note is created in the correct folder per entity-type-to-folder mapping with frontmatter (title, type, status, permalink, tags), the source content preserved verbatim in the note body, and Observations and Relations sections appended as the final two sections.

GIVEN a source file with existing YAML frontmatter containing a type field matching one of the 16 canonical entity types
WHEN /ingest detects the frontmatter
THEN the detected type is used for routing to the correct folder and the source frontmatter fields are preserved or merged into the CONVENTIONS-compliant frontmatter.

GIVEN a source file without frontmatter or with a non-canonical type field
WHEN /ingest is invoked with an explicit --type flag
THEN the user-specified type overrides auto-detection and determines the target folder and frontmatter type value.

GIVEN a source file without frontmatter and no --type flag
WHEN /ingest is invoked
THEN /ingest prompts the user to select a target entity type before proceeding.

GIVEN a directory path
WHEN /ingest is invoked with the directory
THEN /ingest processes each markdown file in the directory individually, applying the same detection and creation logic per file, and produces a summary report of ingested files.

GIVEN the source content contains wikilinks, observations, or relations sections
WHEN /ingest processes the content
THEN the existing wikilinks are preserved verbatim, existing observations are validated for category prefix and tag format, and existing relations are validated for allowed relation types.

## Source

KICKOFF-BRIEF.md "/defrag and /ingest" section. ADR-001 F-2 (Brain-first scope), F-3 (coexistence).

## Observations

- [requirement] /ingest creates Brain notes via Pattern 2 three-phase write to avoid the write_note filename trap #pattern-2 #three-phase
- [requirement] Source content is preserved verbatim in the note body; /ingest does not modify or summarize source content #verbatim #preservation
- [requirement] Entity type is auto-detected from frontmatter type field or user-specified via --type flag #auto-detect #entity-type
- [constraint] /ingest uses Brain MCP tools exclusively for note creation per CONVENTIONS Section 1.7.1 binary rule #brain-mcp #conventions

## Relations

- part_of [[SPEC-006: Defrag and Ingest Skills]]
- relates_to [[REQ-005-SPEC-006: Ingest Brain-Awareness]]
- relates_to [[ADR-001: Composition Library Architecture]]