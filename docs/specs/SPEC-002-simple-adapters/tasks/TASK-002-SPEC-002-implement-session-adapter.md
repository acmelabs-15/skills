---
title: 'TASK-002-SPEC-002: Implement SESSION Adapter'
type: task
status: DONE
effort: S
estimate: 0.5d
permalink: specs/spec-002-simple-adapters/tasks/task-002-spec-002-implement-session-adapter
tags:
- task
- spec-002
- session-adapter
- implementation
---

# TASK-002-SPEC-002: Implement SESSION Adapter

## Design Context

- [[DESIGN-001-SPEC-002: BaseMarkdownAdapter Configuration Pattern]]: implements SessionAdapter as config-only subclass of BaseMarkdownAdapter with supportsCrossSourceUpdates flag

## Objective

Implement the SESSION adapter as a concrete subclass of BaseMarkdownAdapter at _shared/composition/src/adapters/session.ts. The adapter overrides section_delimiter ("## Event "), identifier_pattern (/Event (\d+)/), identifier_prefix ("Event "), and sets supportsCrossSourceUpdates to true. This adapter is approximately 100 LOC delta including the cross_source_updates field handling from TASK-003-SPEC-002.

## Definition of Done

- [x] _shared/composition/src/adapters/session.ts exists and exports SessionAdapter class
- [x] SessionAdapter extends BaseMarkdownAdapter
- [x] sourceType property returns "session"
- [x] sectionDelimiter property returns "## Event "
- [x] identifierPattern property returns regex matching Event NN format (zero-padded)
- [x] identifierPrefix property returns "Event "
- [x] supportsCrossSourceUpdates property returns true
- [x] TypeScript compiles without errors (bun build validates)
- [x] biome lint passes with no errors

## Scope

**In Scope**:

- _shared/composition/src/adapters/session.ts (Create)

**Out of Scope**:

- Cross-source updates handler (TASK-003-SPEC-002)
- Registry extension (TASK-004-SPEC-002)
- Round-trip property test (TASK-006-SPEC-002)

## Files Affected

| File | Action | Description |
|------|--------|-------------|
| _shared/composition/src/adapters/session.ts | Create | SESSION adapter class extending BaseMarkdownAdapter |

## Effort

| Tier | Human | AI-Dominant | AI-Assisted |
|------|-------|-------------|-------------|
| S | 1d | 0.5d | 0.5d |

## Observations

- [fact] Status: TODO #status
- [fact] Size tier: S -- config-only subclass with 6 property overrides; base adapter handles Event-NN renumbering via standard applyMutations #estimation
- [decision] Cross-source updates handler separated into TASK-003-SPEC-002 for clean task boundaries #separation

## Relations

- validated_by [[QA-042-SPEC-002: Spec Aggregate Retro-Validation]]
- implements [[DESIGN-001-SPEC-002: BaseMarkdownAdapter Configuration Pattern]]
- implements [[REQ-002-SPEC-002: SESSION Adapter Implementation]]
- part_of [[SPEC-002: Simple Adapters]]
- leads_to [[TASK-003-SPEC-002: Implement SESSION Cross-Source Updates Handler]]
- leads_to [[TASK-004-SPEC-002: Register ANALYSIS and SESSION Adapters in Dispatcher]]
