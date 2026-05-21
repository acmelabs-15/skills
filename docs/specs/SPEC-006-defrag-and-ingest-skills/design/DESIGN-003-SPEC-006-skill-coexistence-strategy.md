---
title: 'DESIGN-003-SPEC-006: Skill Coexistence Strategy'
type: design
status: ACCEPTED
permalink: specs/spec-006-defrag-and-ingest-skills/design/design-003-spec-006-skill-coexistence-strategy
tags:
- design
- coexistence
- auto-detect
- install
---

# DESIGN-003-SPEC-006: Skill Coexistence Strategy

## Overview

The /defrag and /ingest skills coexist with the existing ~/Dev/basic-memory-skills/memory-ingest and memory-defrag skills. This design specifies the auto-detection mechanism that routes operations to the Brain-aware or Basic Memory variant, the naming separation that prevents skill collision, and the install.sh behavior that preserves existing symlinks.

## Architecture

### Naming Separation

The new skills use distinct names from the existing ones. /defrag (new) vs memory-defrag (existing). /ingest (new) vs memory-ingest (existing). Claude Code resolves skills by exact name match on the SKILL.md trigger description. Because the names are distinct, both skill sets can be installed simultaneously without ambiguity. A user invoking /defrag always gets the Brain-aware curator; a user invoking memory-defrag always gets the Basic Memory variant.

### Auto-Detection Mechanism

The auto-detection mechanism determines whether the active project uses Brain or Basic Memory. It is shared between /defrag and /ingest and lives at _shared/detect-context.ts.

Detection criteria for Brain context (all must be true): (1) a docs/ directory exists at the project root, (2) at least one markdown file under docs/ contains YAML frontmatter with a type field matching one of the 16 canonical entity types (decision, session, requirement, design, task, analysis, feature, epic, critique, qa, security, retrospective, skill, spec, plan, prd).

Detection criteria for Basic Memory context: the project does not meet Brain context criteria, OR the user provides an explicit --basic-memory flag.

### Routing Behavior

When Brain context is detected, /ingest uses the full Brain-aware pipeline (Pattern 2 three-phase write, CONVENTIONS compliance, observation/relation generation). When Basic Memory context is detected, /ingest uses a simplified pipeline (direct write_note without Pattern 2, minimal frontmatter, no observation category or relation type validation).

When Brain context is detected, /defrag audits against CONVENTIONS Section 6 thresholds and delegates to /decompose and /recompose. When Basic Memory context is detected, /defrag audits against simplified heuristics (note size only, no CONVENTIONS-specific threshold checks) and delegates directly to Brain MCP operations for simple restructuring.

### Install Script Behavior

install.sh creates symlinks for /defrag, /ingest, /decompose, and /recompose at ~/.claude/skills/. It does not modify, delete, or check for existing symlinks at ~/Dev/basic-memory-skills/. The install script uses ln -sf (force flag for idempotent reinstall of its own symlinks) but only targets the four skill directories owned by this project.

### Shared Detection Module

_shared/detect-context.ts exports a single function: detectProjectContext(projectRoot: string) returning an object with contextType (brain or basic-memory), evidence (list of matched files and their frontmatter type values), and confidence (high if more than 5 matches, medium if 1-5, low if 0 with flag override).

## Module Structure

_shared/detect-context.ts -- Shared Brain vs Basic Memory context detection
defrag/SKILL.md -- References detect-context for routing
ingest/SKILL.md -- References detect-context for routing
install.sh -- Creates symlinks for /defrag, /ingest, /decompose, /recompose only

## Observations

- [design] Distinct skill names (/defrag vs memory-defrag, /ingest vs memory-ingest) prevent Claude Code routing ambiguity #naming #coexistence
- [design] Auto-detection from frontmatter type field provides Brain vs Basic Memory routing without user configuration #auto-detect #zero-config
- [design] Shared detect-context.ts module eliminates duplication between /defrag and /ingest detection logic #shared-module #dry
- [constraint] install.sh never modifies or removes existing basic-memory-skills symlinks per ADR-001 F-3 #f-3 #non-destructive

## Relations

- part_of [[SPEC-006: Defrag and Ingest Skills]]
- implements [[REQ-006-SPEC-006: Coexistence with Memory-Ingest and Memory-Defrag]]
- relates_to [[ADR-001: Composition Library Architecture]]
