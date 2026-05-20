---
title: 'TASK-007-SPEC-006: Document Defrag and Ingest Skill UX in README'
type: task
status: TODO
permalink: specs/spec-006-defrag-and-ingest-skills/tasks/task-007-spec-006-document-defrag-and-ingest-skill-ux-in-readme-1
tags:
- task
- documentation
- readme
- ux
---

# TASK-007-SPEC-006: Document Defrag and Ingest Skill UX in README

## Description

Update the project README.md to document /defrag and /ingest skill usage, CLI flags, operation modes, and examples. Include coexistence notes explaining the relationship with memory-ingest and memory-defrag. Add usage examples for interactive mode, cron/report-only mode, Brain-aware ingest, Basic Memory fallback ingest, and directory batch mode.

## Definition of Done

- [ ] README.md updated with /defrag section: description, CLI flags (--report-only), operation modes (interactive, cron), usage examples
- [ ] README.md updated with /ingest section: description, CLI flags (--type, --basic-memory), pipeline steps, usage examples
- [ ] Coexistence section explains /defrag vs memory-defrag and /ingest vs memory-ingest
- [ ] Install section updated to list all 4 skill symlinks (decompose, recompose, defrag, ingest)
- [ ] Examples cover: interactive defrag, cron defrag, single-file ingest, directory batch ingest, Brain vs Basic Memory routing
- [ ] Markdown renders correctly (no broken links, code blocks properly fenced)
- [ ] biome lint passes (if README is in lint scope)

## Files Affected

- README.md (modify)

## Implementation Approach

Add sections to the existing README.md following the documentation structure established by /decompose and /recompose sections (from SPEC-005). Use consistent heading levels. Include CLI usage with code blocks showing actual command invocations. Add a comparison table for Brain-aware vs Basic Memory behavior.

## Effort and Estimate

effort: S
estimate: 0.5d

## Observations

- [task] Documents /defrag and /ingest skill UX for end users alongside existing /decompose and /recompose documentation #documentation #readme
- [task] Coexistence section prevents user confusion about which skill to use in which context #coexistence #ux
- [technique] Comparison table format clearly shows Brain-aware vs Basic Memory behavioral differences #table #comparison
- [constraint] Documentation must not reference internal Brain note entities or auto-memory filenames per CONVENTIONS Section 5.3 #conventions #no-internal-refs

## Relations

- part_of [[SPEC-006: Defrag and Ingest Skills]]
- implements [[REQ-001-SPEC-006: Defrag Skill Implementation]]
- implements [[REQ-004-SPEC-006: Ingest Skill Implementation]]
- implements [[REQ-006-SPEC-006: Coexistence with Memory-Ingest and Memory-Defrag]]