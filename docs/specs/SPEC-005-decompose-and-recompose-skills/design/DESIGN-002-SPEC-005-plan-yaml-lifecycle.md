---
title: 'DESIGN-002-SPEC-005: Plan YAML Lifecycle'
type: design
status: ACCEPTED
permalink: specs/spec-005-decompose-and-recompose-skills/design/design-002-spec-005-plan-yaml-lifecycle
tags:
- design
- plan-yaml
- lifecycle
- adjudication
- spec-005
---

# DESIGN-002-SPEC-005: Plan YAML Lifecycle

## Requirements Addressed

- REQ-003-SPEC-005: Plan YAML Adjudication via AskUserQuestion -- defines the three-phase lifecycle and the refinement loop mechanism

## Design Overview

The plan YAML lifecycle has three phases: LLM authoring, user adjudication, and script consumption. Each phase has defined inputs, outputs, and error handling. The lifecycle is designed to be fully auditable: every plan YAML is persisted at docs/_restructure/ before execution, enabling post-hoc review and replay.

The refinement loop on user rejection is the key UX pattern. When the user rejects a plan, the LLM receives the rejection reason and re-enters the authoring phase. The previous plan YAML remains on disk (with a -rejected suffix) for reference. The LLM authors a new plan incorporating the feedback. This loop continues until the user approves or aborts.

## Component Architecture

### Component 1: LLM Authoring Phase

**Purpose**: The LLM reads source note(s), classifies the source_type, performs cognitive analysis, and authors a plan YAML.

**Responsibilities**:

- Read source note content via Brain MCP or direct file access
- Classify source_type from frontmatter type field (auto-detect)
- For /decompose: identify cluster seams (section boundaries suitable for splitting), propose destination paths, author renumber and wikilink maps
- For /recompose: determine merge order, resolve identifier collisions, author renumber and wikilink maps that unify content
- Write plan YAML to docs/_restructure/{decompose,recompose}-{id}-plan.yaml
- The id is a short descriptive slug (e.g., "adr-001-split", "session-05-merge")

### Component 2: User Adjudication Phase (AskUserQuestion)

**Purpose**: Present the plan to the user for review and approval.

**Responsibilities**:

- Format a human-readable summary of the plan: source path(s), destination path(s), renumber map summary, wikilink map summary, type-specific fields
- Present via AskUserQuestion with three options: Approve, Reject with feedback, Abort
- On Approve: pass control to script consumption phase
- On Reject with feedback: capture feedback text, rename current plan to {name}-rejected-{N}.yaml, pass feedback to LLM for re-authoring
- On Abort: clean up (optionally remove plan YAML), exit skill

### Component 3: Script Consumption Phase

**Purpose**: The CLI entry point loads, validates, and executes the approved plan.

**Responsibilities**:

- Read approved plan YAML from disk
- Parse YAML with FAILSAFE_SCHEMA
- Validate via Zod planSchema.parseAsync()
- On validation failure: report structured PlanValidationError array, do NOT execute
- On validation success: dispatch to adapter via registry, execute per-destination write pipeline (extract, mutate, hash-validate, temp-write, atomic-rename)
- Emit audit log entry per destination

## Technology Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Plan persistence location | docs/_restructure/ | Per ADR-001 F-7; inside docs/ for auditability but separate from Brain note directories |
| Rejected plan retention | Renamed with -rejected-{N} suffix | Preserves rejection history for debugging; does not accumulate indefinitely (user can clean up) |
| AskUserQuestion format | Markdown summary with raw YAML path reference | Summary for quick review; raw YAML path for deep inspection |

## Security Considerations

- Plan YAML is authored by the LLM and could contain path traversal attempts; mitigated by Zod path containment validator in the script consumption phase per ADR-002 D-5
- Rejected plans are retained on disk; no sensitive content (plan YAMLs contain file paths and identifier maps, not note content)

## Testing Strategy

- Unit test: plan YAML round-trip (write YAML, read YAML, validate matches Zod schema)
- Unit test: rejected plan rename produces correct -rejected-{N} suffix
- Integration test: fixture-based approval flow (skip AskUserQuestion in tests; test the script consumption pipeline)

## Open Questions

None. The three-phase lifecycle is locked per KICKOFF-BRIEF.md.

## Observations

- [design] Three-phase lifecycle: LLM authoring then user adjudication then script consumption; each phase has defined I/O #lifecycle #three-phase
- [technique] Rejected plans renamed with -rejected-{N} suffix preserving rejection history for debugging #rejection #history
- [decision] AskUserQuestion presents markdown summary with raw YAML path for deep inspection #ux #adjudication
- [constraint] No silent execution path; AskUserQuestion approval is mandatory before script runs #human-in-the-loop

## Relations

- implements [[REQ-003-SPEC-005: Plan YAML Adjudication via AskUserQuestion]]
- part_of [[SPEC-005: Decompose and Recompose Skills]]
- depends_on [[DESIGN-001-SPEC-005: Skill Architecture]]
