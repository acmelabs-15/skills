---
title: 'DESIGN-001-SPEC-005: Skill Architecture'
type: design
status: ACCEPTED
permalink: specs/spec-005-decompose-and-recompose-skills/design/design-001-spec-005-skill-architecture
tags:
- design
- skill-architecture
- decompose
- recompose
- spec-005
---

# DESIGN-001-SPEC-005: Skill Architecture

## Requirements Addressed

- REQ-001-SPEC-005: Decompose Skill Implementation -- defines the /decompose orchestration flow, CLI entry point, and SKILL.md structure
- REQ-002-SPEC-005: Recompose Skill Implementation -- defines the /recompose orchestration flow, CLI entry point, and SKILL.md structure
- REQ-005-SPEC-005: Symlink Activation via Install Script -- defines the install.sh extension for skill symlinks

## Design Overview

The /decompose and /recompose skills follow the same architectural pattern: a Claude Code SKILL.md file defines the skill interface (trigger phrases, usage instructions, LLM behavior), and a CLI entry point TypeScript file bridges from the adjudicated plan YAML to the composition library's adapter dispatch. The LLM-as-author and script-as-executor separation is enforced structurally: SKILL.md instructs the LLM to author a plan YAML and present it via AskUserQuestion; only after user approval does the SKILL.md instruct execution of the CLI entry point.

Each skill directory follows the standard Claude Code skill layout:

```
decompose/
  SKILL.md              # Claude Code skill definition
  references/           # Optional reference docs for the LLM

recompose/
  SKILL.md              # Claude Code skill definition
  references/           # Optional reference docs for the LLM
```

The CLI entry points live in the shared composition library, not in the skill directories:

```
_shared/composition/src/
  decompose.ts          # CLI entry: load plan YAML -> validate -> dispatch -> execute
  recompose.ts          # CLI entry: load plan YAML -> validate -> dispatch -> execute
```

This separation ensures the SKILL.md files contain only skill interface definition (what the LLM should do) while the TypeScript files contain only deterministic execution logic (what the script does). The SKILL.md never imports or references the TypeScript directly; it instructs the LLM to invoke the entry point via Bun.$ shell execution.

## Component Architecture

### Component 1: /decompose SKILL.md

**Purpose**: Claude Code skill interface for note decomposition (1-to-N split).

**Responsibilities**:

- Define trigger phrases ("decompose this note", "split this ADR", etc.)
- Instruct LLM to: read source note, classify source_type, identify cluster seams, author distribution plan YAML at docs/_restructure/decompose-{id}-plan.yaml
- Instruct LLM to present plan via AskUserQuestion (REQ-003)
- On approval, instruct LLM to execute: bun run _shared/composition/src/decompose.ts --plan docs/_restructure/decompose-{id}-plan.yaml
- Define error handling: surface PlanValidationError to user, offer refinement loop on rejection

### Component 2: /recompose SKILL.md

**Purpose**: Claude Code skill interface for note recomposition (N-to-1 merge).

**Responsibilities**:

- Define trigger phrases ("recompose these notes", "merge these ADRs", etc.)
- Instruct LLM to: read N source notes, classify source_type, determine merge order, author composition plan YAML at docs/_restructure/recompose-{id}-plan.yaml
- Instruct LLM to present plan via AskUserQuestion (REQ-003)
- On approval, instruct LLM to execute: bun run _shared/composition/src/recompose.ts --plan docs/_restructure/recompose-{id}-plan.yaml
- Define error handling: same pattern as /decompose

### Component 3: decompose.ts CLI Entry Point

**Purpose**: Deterministic script that loads a distribution plan YAML, validates it, dispatches to the adapter, and executes the decomposition.

**Responsibilities**:

- Parse CLI arguments (--plan path)
- Read plan YAML file via Bun.file
- Parse YAML via js-yaml
- Validate via Zod planSchema.parseAsync() per ADR-002 D-5
- Resolve adapter via registry dispatcher (REQ-004)
- For each destination in the plan: extract source content by range, apply mutations, hash-validate, write via temp-then-rename
- Emit audit log per destination file
- Exit with structured error on validation failure or hash mismatch

### Component 4: recompose.ts CLI Entry Point

**Purpose**: Deterministic script that loads a composition plan YAML, validates it, dispatches to the adapter, and executes the recomposition.

**Responsibilities**:

- Same pipeline as decompose.ts but operating on plural sources and singular destination per ADR-002 D-1 composition plan schema
- Read multiple source files, extract from each by range, concatenate per plan order, apply mutations, hash-validate, write via temp-then-rename
- Emit audit log for the merged destination file

### Component 5: install.sh Extension

**Purpose**: Add /decompose and /recompose symlink targets to the existing install script.

**Responsibilities**:

- Create symlink ~/.claude/skills/decompose -> ~/Dev/skills/decompose
- Create symlink ~/.claude/skills/recompose -> ~/Dev/skills/recompose
- Idempotent: skip if symlinks already exist and point to correct targets
- Support --copy flag for rsync-based alternative per ADR-001 F-1

## Technology Decisions

| Decision | Choice | Rationale |
|---|---|---|
| CLI argument parsing | process.argv manual parse | Two skills, one argument each (--plan); no library needed |
| YAML loading | js-yaml with FAILSAFE_SCHEMA | Per ADR-001 Confirmation security hardening; prevents YAML bomb |
| Script execution | Bun.$ from SKILL.md | Bun-native shell execution per ADR-001 F-6 |
| Audit log format | JSON lines to stdout | Structured, parseable, non-blocking |

## Security Considerations

- Plan YAML loaded with FAILSAFE_SCHEMA per ADR-001 Confirmation (mitigates CWE-502 YAML bomb)
- File size guard (1 MB) applied before YAML parse per ADR-001 Confirmation (mitigates CWE-400 DoS)
- Path containment validated by Zod before any file write per ADR-002 D-5 (mitigates CWE-22 path traversal)

## Testing Strategy

- Unit tests for decompose.ts and recompose.ts CLI argument parsing
- Integration tests via fixture plan YAMLs per REQ-006-SPEC-005
- SKILL.md tested via manual invocation in Claude Code (skill files are not unit-testable)

## Open Questions

None. All design choices derive from locked ADR decisions.

## Observations

- [design] /decompose and /recompose follow identical architectural pattern: SKILL.md for LLM interface plus CLI entry point for deterministic execution #skill-architecture #symmetry
- [decision] CLI entry points live in _shared/composition/src/ not in skill directories; enforces separation of LLM interface from script logic #separation #layout
- [technique] SKILL.md instructs LLM to invoke CLI via Bun.$ shell execution; no direct TypeScript import from SKILL.md #execution-model #bun
- [fact] install.sh extends SPEC-001 scaffold with two additional symlink targets for /decompose and /recompose #install #incremental

## Relations

- implements [[REQ-001-SPEC-005: Decompose Skill Implementation]]
- implements [[REQ-002-SPEC-005: Recompose Skill Implementation]]
- implements [[REQ-005-SPEC-005: Symlink Activation via Install Script]]
- part_of [[SPEC-005: Decompose and Recompose Skills]]
