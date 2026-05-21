---
title: 'TASK-004-SPEC-006: Implement Ingest CLI and Skill Structure'
type: task
status: DONE
permalink: specs/spec-006-defrag-and-ingest-skills/tasks/task-004-spec-006-implement-ingest-cli-and-skill-structure
tags:
- task
- ingest
- cli
- pipeline
---

# TASK-004-SPEC-006: Implement Ingest CLI and Skill Structure

## Description

Create the /ingest skill directory structure, SKILL.md skill definition, and CLI entry point script. The SKILL.md defines trigger phrases (ingest, import note, bring into graph, ingest file), description, and the ingest orchestration pipeline instructions for Claude Code. The CLI entry point at ingest/scripts/ingest.ts accepts --type and --basic-memory flags and orchestrates the six-step ingest pipeline. Implement the source parser (parse.ts), entity type detector (detect.ts), and content assembler (assemble.ts).

## Definition of Done

- [x] ingest/SKILL.md exists with trigger phrases, description, and orchestration instructions
- [x] ingest/scripts/ingest.ts exists as CLI entry point accepting --type and --basic-memory flags
- [x] ingest/scripts/parse.ts exports source file parser (frontmatter extraction, H1 detection, section detection)
- [x] ingest/scripts/detect.ts exports entity type detection and target path resolution
- [x] ingest/scripts/assemble.ts exports content assembly (frontmatter generation, observation/relation generation)
- [x] Single-file ingest works end-to-end: parse, detect, assemble, three-phase write, verify
- [x] Directory batch mode iterates files and produces summary report
- [x] install.sh updated to include ingest/ symlink at ~/.claude/skills/ingest
- [x] biome lint passes on all new files

## Files Affected

- ingest/SKILL.md (new)
- ingest/scripts/ingest.ts (new)
- ingest/scripts/parse.ts (new)
- ingest/scripts/detect.ts (new)
- ingest/scripts/assemble.ts (new)
- install.sh (modify: add ingest symlink)

## Implementation Approach

parse.ts uses js-yaml to extract frontmatter and regex to detect H1 and section headings. detect.ts maps frontmatter type to canonical entity types and resolves target folder via a type-to-folder lookup table matching CONVENTIONS Section 5.1. assemble.ts generates CONVENTIONS-compliant frontmatter and wraps source body with Observations and Relations sections. ingest.ts orchestrates the pipeline steps and calls Brain MCP Pattern 2 three-phase write for Brain context or direct write_note for Basic Memory context.

## Effort and Estimate

effort: M
estimate: 1.5d

## Observations

- [task] Implements the /ingest skill skeleton and full six-step pipeline from parse through post-write verification #ingest #pipeline #cli
- [task] Source parser handles both frontmatter-present and frontmatter-absent source files #parsing #frontmatter
- [technique] Type-to-folder lookup table mirrors CONVENTIONS Section 5.1 entity-type-to-folder mapping as a constant #mapping #conventions
- [constraint] Pattern 2 three-phase write required for Brain context; simplified write for Basic Memory context #pattern-2 #routing

## Relations

- part_of [[SPEC-006: Defrag and Ingest Skills]]
- implements [[REQ-004-SPEC-006: Ingest Skill Implementation]]
- implements [[DESIGN-002-SPEC-006: Ingest Skill Architecture]]
