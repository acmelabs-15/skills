---
title: 'REQ-006-SPEC-006: Coexistence with Memory-Ingest and Memory-Defrag'
type: requirement
status: DRAFT
permalink: specs/spec-006-defrag-and-ingest-skills/requirements/req-006-spec-006-coexistence-with-memory-ingest-and-memory-defrag
tags:
- requirement
- coexistence
- basic-memory
- brain-first
---

# REQ-006-SPEC-006: Coexistence with Memory-Ingest and Memory-Defrag

## Requirement Statement (EARS)

WHEN /defrag or /ingest is installed alongside the existing ~/Dev/basic-memory-skills/memory-ingest and memory-defrag skills
THE SYSTEM SHALL coexist without conflict by using distinct skill names (/defrag vs memory-defrag, /ingest vs memory-ingest), auto-detecting Brain vs Basic Memory note context from frontmatter type field, and routing to the appropriate skill variant based on the detection
SO THAT users can install both skill sets simultaneously and each operates correctly in its target context.

## Acceptance Criteria (GIVEN/WHEN/THEN)

GIVEN both /ingest and memory-ingest are installed as Claude Code skills
WHEN the user invokes /ingest
THEN /ingest handles the request with Brain-awareness (CONVENTIONS compliance, Pattern 2 three-phase write, 16 canonical entity types) and memory-ingest is not invoked.

GIVEN both /defrag and memory-defrag are installed as Claude Code skills
WHEN the user invokes /defrag
THEN /defrag handles the request with Brain-awareness (CONVENTIONS Section 6 audit, delegation to /decompose and /recompose) and memory-defrag is not invoked.

GIVEN a project that uses Basic Memory (no docs/** Brain note structure, no canonical entity types in frontmatter)
WHEN /ingest is invoked and detects Basic Memory context
THEN /ingest falls back to a simplified note creation path that does not require CONVENTIONS compliance (no mandatory observations/relations sections, no Pattern 2 three-phase write, basic frontmatter only).

GIVEN a project that uses Brain (docs/** structure present, canonical entity types in frontmatter)
WHEN /ingest is invoked and detects Brain context
THEN /ingest uses the full Brain-aware path with CONVENTIONS compliance.

GIVEN install.sh is run for the skills project
WHEN symlinks are created
THEN /defrag, /ingest, /decompose, and /recompose symlinks are created at ~/.claude/skills/ without modifying or removing any existing symlinks for memory-ingest or memory-defrag at ~/Dev/basic-memory-skills/.

## Source

ADR-001 F-2 (Brain-first with Basic Memory subset), F-3 (coexist with existing skills). KICKOFF-BRIEF.md constraint 3 (do NOT delete or rename existing skills).

## Observations

- [requirement] /defrag and /ingest use distinct skill names from memory-defrag and memory-ingest; no naming collision #coexistence #naming
- [requirement] Auto-detection from frontmatter type field determines Brain vs Basic Memory routing #auto-detect #frontmatter
- [requirement] Install.sh creates new symlinks without modifying existing basic-memory-skills symlinks #install #non-destructive
- [constraint] The existing memory-ingest and memory-defrag skills are never modified, deleted, or renamed by this project per ADR-001 F-3 #f-3 #coexistence

## Relations

- part_of [[SPEC-006: Defrag and Ingest Skills]]
- implements [[ADR-001: Composition Library Architecture]]
- relates_to [[REQ-004-SPEC-006: Ingest Skill Implementation]]
