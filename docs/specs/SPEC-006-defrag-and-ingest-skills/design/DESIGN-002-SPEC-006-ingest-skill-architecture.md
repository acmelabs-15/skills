---
title: 'DESIGN-002-SPEC-006: Ingest Skill Architecture'
type: design
status: DRAFT
permalink: specs/spec-006-defrag-and-ingest-skills/design/design-002-spec-006-ingest-skill-architecture
tags:
- design
- ingest
- verbatim
- brain-awareness
---

# DESIGN-002-SPEC-006: Ingest Skill Architecture

## Overview

The /ingest skill brings external content into the Brain knowledge graph as well-formed notes. It parses source files, auto-detects entity type from frontmatter or user input, creates notes via Brain MCP Pattern 2 three-phase write, preserves source content verbatim, and generates CONVENTIONS-compliant frontmatter, observations, and relations.

## Architecture

### Skill Structure

The /ingest skill lives at ingest/SKILL.md in the skills project root. It is installed via symlink at ~/.claude/skills/ingest per ADR-001 F-1. The SKILL.md defines trigger phrases, description, and the ingest orchestration pipeline.

### Ingest Pipeline

The ingest pipeline processes one source file at a time (batch mode iterates over files in a directory).

**Step 1 -- Source Parsing.** Read the source file via Bun.file(path).text(). Parse any existing YAML frontmatter using js-yaml. Extract the first H1 heading as a fallback title. Detect existing Observations and Relations sections by heading match.

**Step 2 -- Entity Type Detection.** If the source frontmatter contains a type field matching one of the 16 canonical entity types, use that type. If the user provided a --type flag, the flag overrides auto-detection. If neither is available, prompt the user to select a type.

**Step 3 -- Target Path Resolution.** Map the detected entity type to the correct folder per CONVENTIONS Section 5.1 entity-type-to-folder mapping. For spec-nested types (requirement, design, task), prompt for the parent SPEC identifier. Generate the target filename using the CAPS prefix pattern from Section 1.6. Determine the next available counter by listing existing notes in the target folder via Brain MCP list_directory.

**Step 4 -- Content Assembly.** Assemble the note content with: CONVENTIONS-compliant frontmatter (title in ENTITY-ID colon Descriptor format, type, status DRAFT, permalink, 2-5 tags), source content preserved verbatim in the body, Observations section (preserve existing valid observations or generate at least 3 from source content with category prefix and inline tags), Relations section (preserve existing valid relations or generate at least 2 with valid relation types targeting existing notes found via Brain MCP search).

**Step 5 -- Three-Phase Write.** Execute Pattern 2 per CONVENTIONS Section 1.7.2: Phase 1 write_note with space-separated title (no colon), Phase 2 edit_note to insert colon in frontmatter title and H1, Phase 3 move_note to rename to kebab filename.

**Step 6 -- Post-Write Verification.** Run the 6-item post-write verification from CONVENTIONS Section 8.2: confirm kebab filename, confirm frontmatter title matches, confirm H1 matches, confirm valid relation types, confirm observation and relation counts, confirm final-two-sections invariant.

### Verbatim Source Preservation

The source content body is preserved character-for-character between the frontmatter block and the Observations section. /ingest does not summarize, rewrite, or reorganize source content. If the source already has well-formed sections, they are kept intact. /ingest only adds missing structural elements (frontmatter, observations, relations, final-two-sections) around the preserved source body.

### Brain vs Basic Memory Routing

Per ADR-001 F-2, /ingest auto-detects Brain vs Basic Memory context. Brain detection: presence of docs/** directory structure AND frontmatter type matching one of the 16 canonical entity types. Basic Memory detection: absence of canonical entity types OR explicit --basic-memory flag. In Basic Memory mode, /ingest skips CONVENTIONS-specific requirements (Pattern 2 three-phase write, observation category validation, relation type validation, final-two-sections invariant) and performs a simplified write_note call.

## Module Structure

ingest/SKILL.md -- Claude Code skill definition (trigger phrases, description, orchestration pipeline instructions)
ingest/scripts/parse.ts -- Source file parser (frontmatter extraction, H1 detection, section detection)
ingest/scripts/detect.ts -- Entity type detection and target path resolution
ingest/scripts/assemble.ts -- Content assembly (frontmatter generation, observation/relation generation)
ingest/scripts/ingest.ts -- CLI entry point (parses --type and --basic-memory flags, orchestrates pipeline)

## Observations

- [design] Six-step ingest pipeline: parse, detect type, resolve path, assemble content, three-phase write, post-write verify #pipeline #six-step
- [design] Verbatim source preservation: body content between frontmatter and Observations is never modified #verbatim #preservation
- [design] Brain vs Basic Memory routing via frontmatter type auto-detection with explicit --basic-memory flag override #routing #auto-detect
- [constraint] Pattern 2 three-phase write is mandatory for Brain context to avoid the write_note filename trap #pattern-2 #conventions

## Relations

- part_of [[SPEC-006: Defrag and Ingest Skills]]
- implements [[REQ-004-SPEC-006: Ingest Skill Implementation]]
- implements [[REQ-005-SPEC-006: Ingest Brain-Awareness]]
- implements [[REQ-006-SPEC-006: Coexistence with Memory-Ingest and Memory-Defrag]]