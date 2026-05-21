---
title: 'TASK-001-SPEC-006: Implement Defrag CLI and Skill Structure'
type: task
status: DONE
permalink: specs/spec-006-defrag-and-ingest-skills/tasks/task-001-spec-006-implement-defrag-cli-and-skill-structure
tags:
- task
- defrag
- cli
- skill-structure
---

# TASK-001-SPEC-006: Implement Defrag CLI and Skill Structure

## Description

Create the /defrag skill directory structure, SKILL.md skill definition, and CLI entry point script. The SKILL.md defines trigger phrases (defrag, defragment, curate memories, audit notes), description, and orchestration instructions for Claude Code. The CLI entry point at defrag/scripts/defrag.ts parses the --report-only flag and orchestrates the audit-report-delegation cycle.

## Definition of Done

- [x] defrag/SKILL.md exists with trigger phrases, description, and orchestration instructions
- [x] defrag/scripts/defrag.ts exists as CLI entry point accepting --report-only flag
- [x] --report-only flag causes exit after report generation without delegation
- [x] Interactive mode (no flag) proceeds to confirmation and delegation steps
- [x] install.sh updated to include defrag/ symlink at ~/.claude/skills/defrag
- [x] biome lint passes on all new files

## Files Affected

- defrag/SKILL.md (new)
- defrag/scripts/defrag.ts (new)
- install.sh (modify: add defrag symlink)

## Implementation Approach

Use Bun.argv for CLI argument parsing. Structure defrag.ts to import audit.ts and report.ts modules (implemented in TASK-002 and TASK-003). The SKILL.md follows the same structure as /decompose and /recompose SKILL.md files from SPEC-005.

## Effort and Estimate

effort: S
estimate: 0.5d

## Observations

- [task] Creates the /defrag skill skeleton: SKILL.md definition plus CLI entry point with --report-only flag #defrag #skeleton #cli
- [task] install.sh modification adds defrag/ to the symlink list alongside decompose, recompose, ingest #install #symlink
- [constraint] SKILL.md trigger phrases must not collide with existing memory-defrag skill triggers #naming #coexistence
- [technique] Bun.argv for lightweight CLI argument parsing without external dependency #bun #cli

## Relations

- part_of [[SPEC-006: Defrag and Ingest Skills]]
- implements [[REQ-001-SPEC-006: Defrag Skill Implementation]]
- implements [[DESIGN-001-SPEC-006: Defrag Skill Architecture]]
- validated_by [[QA-040-SPEC-006: Batched Build Revalidation]]
- validated_by [[QA-041-SPEC-006: Fix Iter 1 Revalidation]]
