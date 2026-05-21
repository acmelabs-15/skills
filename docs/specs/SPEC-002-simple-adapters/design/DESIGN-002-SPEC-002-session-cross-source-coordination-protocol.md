---
title: 'DESIGN-002-SPEC-002: SESSION Cross-Source Coordination Protocol'
type: design
status: ACCEPTED
permalink: specs/spec-002-simple-adapters/design/design-002-spec-002-session-cross-source-coordination-protocol
tags:
- design
- spec-002
- cross-source
- coordination
---

# DESIGN-002-SPEC-002: SESSION Cross-Source Coordination Protocol

## Requirements Addressed

- [[REQ-003-SPEC-002: SESSION Cross-Source Updates Handling]]: defines the handoff protocol between SESSION adapter and PLAN adapter via cross_source_updates field

## Design Overview
When a SESSION note is decomposed, PLAN parts that reference the source SESSION note via owning_session or completing_session fields may need updates to reference the correct destination SESSION note. This design specifies how the SESSION adapter emits cross_source_updates as structured data and how the orchestrator dispatches application.

The protocol follows a pass-through model: (1) the SESSION adapter's `getCrossSourceUpdates` method extracts `cross_source_updates` from the distribution plan and returns them as typed `CrossSourceUpdate[]`; (2) the orchestrator receives these updates and dispatches application to the appropriate target adapter. The SESSION adapter EMITS updates without applying them. No coordinator or handler infrastructure exists in SPEC-002 scope; per ADR-004 D-2, coordinator patterns are deferred to SPEC-003 if the PLAN adapter integration demands them.
## Component Architecture
### Component 1: CrossSourceUpdate Schema (as-built)

**Purpose**: Defines the structured shape of a single cross-source update entry, aligned with the distribution pipeline's map-based transform model.

**Location**: `_shared/composition/schemas/distribution/session.plan.schema.ts`

**Definition**:

```typescript
export const crossSourceUpdateSchema = z.object({
  target_source_type: z.literal("plan"),
  target_path: z.string().min(1),
  frontmatter_map: z.record(z.string(), z.string()).optional(),
  wikilink_map: z.record(z.string(), z.string()).optional(),
});

export type CrossSourceUpdate = z.infer<typeof crossSourceUpdateSchema>;
```

**Field semantics**:

- `target_source_type`: Always `"plan"` in SPEC-002 scope. Restricts cross-source targets to PLAN notes. Extensible to other source types in future SPECs.
- `target_path`: Path to the target PLAN note file. Subject to path containment validation (CWE-22 mitigation deferred to SPEC-003 per ADR-004 C-7 SEC-001).
- `frontmatter_map`: Optional record mapping frontmatter field names to new values on the target note.
- `wikilink_map`: Optional record mapping source wikilinks to destination wikilinks on the target note.

**Responsibilities**:

- Validates cross_source_updates entries at plan load time via Zod
- Provides type-safe access to update fields
- Aligns with the map-based transform model used by all adapters (frontmatter_map, wikilink_map)

**Interfaces**:

- Consumed by: orchestrator (for dispatching application to target adapter)
- Produced by: SESSION adapter via `getCrossSourceUpdates` method

### Component 2: SessionAdapter.getCrossSourceUpdates (as-built)

**Purpose**: Pass-through method that surfaces cross-source updates from the distribution plan without applying them.

**Location**: `_shared/composition/src/adapters/session.ts`

**Definition**:

```typescript
export class SessionAdapter extends BaseMarkdownAdapter {
  readonly supportsCrossSourceUpdates = true;

  getCrossSourceUpdates(
    _content: string,
    distributionPlan: SessionDistributionPlan,
  ): CrossSourceUpdate[] {
    return distributionPlan.cross_source_updates ?? [];
  }
}
```

**Semantics**:

- The adapter does NOT apply updates to any target note. It emits the updates for the orchestrator to dispatch.
- Returns an empty array when `cross_source_updates` is absent from the plan.
- The `_content` parameter is currently unused but preserved for future revisions that may filter or enrich updates based on parsed session content.
- The `supportsCrossSourceUpdates` flag enables the orchestrator to query adapter capability at dispatch time.

### Absent Infrastructure (by design)

The following DESIGN-002 original components are NOT implemented in SPEC-002 scope:

1. **CrossSourceCoordinator interface** (`applyUpdates`, `reverseUpdates`): Deferred to SPEC-003 per ADR-004 D-2. No consumer exists until the PLAN adapter integration defines its coordination needs.
2. **GracefulDegradationHandler class**: Unnecessary because the pass-through model does not require a fallback coordinator. The orchestrator handles the case where no PLAN adapter is registered.
3. **Rollback/atomicity protocol**: Original REQ-003 AC-3 (PLAN adapter rejection triggers full SESSION abort) is displaced to SPEC-003 per ADR-004 C-7 tracked pre-constraints.
4. **Reversal protocol**: Original REQ-003 AC-4 (recomposition restores original values) is displaced to SPEC-003 per ADR-004 C-7 tracked pre-constraints. The current schema shape does not carry `old_value` because reversal is out of scope.

**Rationale**: ADR-004 D-2 determined that building coordinator infrastructure for a consumer (PLAN adapter) that does not yet exist violates YAGNI. SPEC-003 retains full design freedom to introduce coordinator patterns based on actual PLAN adapter integration requirements.


## Technology Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Update emission | Pass-through on SessionAdapter | Simplest model; adapter emits, orchestrator dispatches. No indirection layer needed in SPEC-002 scope |
| Schema shape | Map-based (frontmatter_map, wikilink_map) | Aligns with the distribution pipeline's transform model used by all adapters; structurally consistent |
| Coordinator pattern | Deferred to SPEC-003 | No consumer exists; YAGNI per ADR-004 D-2 |
| Degradation | Orchestrator handles missing PLAN adapter | No dedicated handler class needed; orchestrator skips cross-source dispatch when target adapter absent |
| Schema location | session.plan.schema.ts | Co-located with SESSION plan schema per ADR-002 D-5 modular layout |
## Security Considerations

- cross_source_updates target_note field is subject to the same path containment validation as destination file paths per ADR-001 F-8 Confirmation item. The target_note must resolve to a valid note within the project's docs/ directory.

## Testing Strategy
- Unit test: CrossSourceUpdate schema validates well-formed entries and rejects malformed entries (missing fields, wrong target_source_type)
- Unit test: SessionAdapter.getCrossSourceUpdates returns plan's cross_source_updates array when present
- Unit test: SessionAdapter.getCrossSourceUpdates returns empty array when cross_source_updates absent
- Integration test: SESSION decompose round-trip exercises cross_source_updates emission path with SHA-256 PROOF gate
- Integration test (deferred to SPEC-003): full SESSION + PLAN coordination with real PLAN adapter applying updates
## Open Questions
None. The pass-through model is locked by ADR-004 D-2. Coordinator patterns deferred to SPEC-003 per C-7 tracked pre-constraints.
## Observations
- [technique] Pass-through model on SessionAdapter emits cross-source updates without applying them; orchestrator dispatches application #pass-through #decoupling
- [decision] Coordinator pattern and GracefulDegradationHandler deferred to SPEC-003 per ADR-004 D-2; no consumer exists in SPEC-002 scope #yagni #deferred
- [fact] Schema shape uses map-based transforms (frontmatter_map, wikilink_map) aligned with distribution pipeline model used by all adapters #schema #alignment
- [constraint] Rollback and reversal protocols displaced to SPEC-003 per ADR-004 C-7 tracked pre-constraints #rollback #spec-003
- [fact] DESIGN-002 amended 2026-05-21 per ADR-004 D-2 to match actual code; original coordinator/handler architecture replaced with pass-through documentation #amendment #adr-004
- [risk] Full integration testing deferred to SPEC-003; SPEC-002 covers emission logic and schema validation only #testing #deferred
## Relations
- implements [[REQ-003-SPEC-002: SESSION Cross-Source Updates Handling]]
- part_of [[SPEC-002: Simple Adapters]]
- depends_on [[DESIGN-001-SPEC-002: BaseMarkdownAdapter Configuration Pattern]]
- caused_by [[ADR-004: Cross-Source Coordinator Architecture]]
- extends [[ADR-002: Adapter Contract and Plan Schema]]