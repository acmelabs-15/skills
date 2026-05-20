---
title: 'DESIGN-002-SPEC-002: SESSION Cross-Source Coordination Protocol'
type: design
status: DRAFT
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

When a SESSION note is decomposed, PLAN parts that reference the source SESSION note via owning_session or completing_session fields must be updated to reference the correct destination SESSION note. This design specifies how the SESSION adapter emits cross_source_updates as structured data and how the execution engine coordinates with the PLAN adapter for application.

The protocol follows a three-phase handoff: (1) SESSION adapter emits cross_source_updates in the plan output, (2) execution engine dispatches updates to the registered PLAN adapter, (3) PLAN adapter validates and applies updates atomically. If any update fails, the entire SESSION operation rolls back per ADR-001 F-8.

## Component Architecture

### Component 1: CrossSourceUpdate Schema

**Purpose**: Defines the structured shape of a single cross-source update entry.

**Definition**:

```typescript
const crossSourceUpdateSchema = z.object({
  target_note: z.string(),       // PLAN note permalink
  part_id: z.string(),           // phase/part identifier within PLAN
  field_name: z.enum(["owning_session", "completing_session"]),
  old_value: z.string(),         // source SESSION note identifier
  new_value: z.string(),         // destination SESSION note identifier
});

type CrossSourceUpdate = z.infer<typeof crossSourceUpdateSchema>;
```

**Responsibilities**:
- Validates cross_source_updates entries at plan load time via Zod
- Provides type-safe access to update fields

**Interfaces**:
- Consumed by: execution engine, PLAN adapter
- Produced by: SESSION adapter during plan processing

### Component 2: CrossSourceCoordinator

**Purpose**: Orchestrates the handoff between SESSION adapter and PLAN adapter during decomposition.

**Definition**:

```typescript
interface CrossSourceCoordinator {
  /**
   * Dispatches cross_source_updates to the target adapter.
   * Returns true if all updates applied successfully.
   * Returns false if any update was rejected (triggers rollback).
   */
  applyUpdates(updates: CrossSourceUpdate[]): Promise<boolean>;

  /**
   * Reverses previously applied cross_source_updates.
   * Used during recomposition to restore original values.
   */
  reverseUpdates(updates: CrossSourceUpdate[]): Promise<boolean>;
}
```

**Responsibilities**:
- Resolves target adapter from target_note's source type
- Validates target PLAN part exists before applying
- Applies updates atomically (all or none)
- Supports reverse for recomposition

**Interfaces**:
- Consumed by: decompose.ts, recompose.ts (execution engine)
- Depends on: adapter dispatcher for PLAN adapter resolution

### Component 3: Graceful Degradation Handler

**Purpose**: Handles the case where the PLAN adapter is not yet registered (SPEC-003 not built).

**Definition**:

```typescript
class GracefulDegradationHandler implements CrossSourceCoordinator {
  applyUpdates(updates: CrossSourceUpdate[]): Promise<boolean> {
    console.warn(
      `[cross-source] ${updates.length} updates skipped: ` +
      `PLAN adapter not registered. Install SPEC-003 for full support.`
    );
    return Promise.resolve(true); // non-blocking; SESSION operation proceeds
  }

  reverseUpdates(updates: CrossSourceUpdate[]): Promise<boolean> {
    return Promise.resolve(true);
  }
}
```

**Responsibilities**:
- Logs warning when PLAN adapter is unavailable
- Allows SESSION operations to proceed without cross-source support
- Ensures SPEC-002 can ship independently of SPEC-003

**Interfaces**:
- Registered as fallback CrossSourceCoordinator when PLAN adapter is absent

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Update dispatch | Coordinator pattern | Decouples SESSION adapter from PLAN adapter; execution engine mediates |
| Failure mode | All-or-nothing rollback | Consistent with ADR-001 F-8 atomic write protocol |
| Degradation | Log warning, proceed | Allows SPEC-002 to ship before SPEC-003; no hard dependency |
| Schema | Zod inline with plan schema | Consistent with ADR-002 D-5 modular Zod validator structure |

## Security Considerations

- cross_source_updates target_note field is subject to the same path containment validation as destination file paths per ADR-001 F-8 Confirmation item. The target_note must resolve to a valid note within the project's docs/ directory.

## Testing Strategy

- Unit test: CrossSourceUpdate schema validates well-formed and rejects malformed entries
- Unit test: GracefulDegradationHandler logs warning and returns true
- Integration test: SESSION decompose with cross_source_updates emits correct update array
- Integration test (deferred to SPEC-003): full SESSION + PLAN coordination with real PLAN adapter

## Open Questions

None. The protocol shape is locked by ADR-002 D-1 (cross_source_updates schema) and D-3 (SESSION capability matrix).

## Observations

- [technique] Coordinator pattern decouples SESSION adapter from PLAN adapter; execution engine mediates the handoff #decoupling #coordination
- [decision] Graceful degradation allows SPEC-002 to ship independently; PLAN adapter availability is not a hard gate #independence #incremental
- [constraint] All-or-nothing rollback applies: if PLAN adapter rejects any update, entire SESSION operation aborts #atomicity #rollback
- [risk] Full integration testing deferred to SPEC-003; SPEC-002 covers emission logic and schema validation only #testing #deferred

## Relations

- implements [[REQ-003-SPEC-002: SESSION Cross-Source Updates Handling]]
- part_of [[SPEC-002: Simple Adapters]]
- depends_on [[DESIGN-001-SPEC-002: BaseMarkdownAdapter Configuration Pattern]]