---
title: 'DESIGN-003-SPEC-005: Adapter Registry and Dispatcher'
type: design
status: ACCEPTED
permalink: specs/spec-005-decompose-and-recompose-skills/design/design-003-spec-005-adapter-registry-and-dispatcher
tags:
- design
- adapter-registry
- dispatcher
- incremental
- spec-005
---

# DESIGN-003-SPEC-005: Adapter Registry and Dispatcher

## Requirements Addressed

- REQ-004-SPEC-005: Adapter Registry Dispatcher -- defines the source_type-to-adapter resolution mechanism and incremental registration pattern

## Design Overview

The adapter registry is a static Record mapping source_type strings to CompositionAdapter instances. The dispatcher function accepts a validated plan's source_type and returns the matching adapter. Registration happens at module initialization via imports; no dynamic loading or plugin discovery is involved. This design honors ADR-001 D-4 (discriminated union on source_type) and ADR-002 D-2 (CompositionAdapter interface).

The incremental registration pattern means that at SPEC-005 ship time, only the ADR adapter (from SPEC-001) is imported and registered. As subsequent SPECs complete, their adapter imports are added to the registry module. The dispatcher provides clear error messages when an unregistered source_type is requested, including which SPEC must complete for that adapter to become available.

## Component Architecture

### Component 1: Adapter Registry Module

**Purpose**: Central registry mapping source_type strings to CompositionAdapter instances.

**Definition**:

```typescript
import type { CompositionAdapter } from "./core/adapter";
import { AdrAdapter } from "./adapters/adr";
// Future imports as SPECs complete:
// import { AnalysisAdapter } from "./adapters/analysis";
// import { SessionAdapter } from "./adapters/session";
// import { PlanAdapter } from "./adapters/plan";
// import { SpecAdapter } from "./adapters/spec";

const registry: Record<string, CompositionAdapter> = {
  adr: new AdrAdapter(),
  // analysis: new AnalysisAdapter(),  // SPEC-002
  // session: new SessionAdapter(),    // SPEC-002
  // plan: new PlanAdapter(),          // SPEC-003
  // spec: new SpecAdapter(),          // SPEC-004
};

const adapterSpecMap: Record<string, string> = {
  analysis: "SPEC-002",
  session: "SPEC-002",
  plan: "SPEC-003",
  spec: "SPEC-004",
};
```

**Responsibilities**:

- Hold the source_type-to-adapter mapping
- Hold the source_type-to-SPEC mapping for error messages on unregistered types

### Component 2: Dispatcher Function

**Purpose**: Resolve a source_type to its registered adapter or throw a structured error.

**Definition**:

```typescript
export function getAdapter(sourceType: string): CompositionAdapter {
  const adapter = registry[sourceType];
  if (adapter) return adapter;

  const requiredSpec = adapterSpecMap[sourceType];
  if (requiredSpec) {
    throw new Error(
      `Adapter for source_type "${sourceType}" is not yet registered. ` +
      `Complete ${requiredSpec} to enable this adapter.`
    );
  }

  throw new Error(
    `Unknown source_type "${sourceType}". ` +
    `Valid types: ${Object.keys(registry).join(", ")}`
  );
}
```

**Responsibilities**:

- Return the adapter if registered
- Throw with SPEC reference if source_type is known but unregistered
- Throw with valid types list if source_type is entirely unknown

### Component 3: Registration Extension Point

**Purpose**: Adding a new adapter requires exactly two changes: import the adapter class and add it to the registry Record.

**Responsibilities**:

- No framework, no dynamic discovery, no plugin interface
- The extension point is a single module file (shared/composition/src/registry.ts)
- Registration is verified by TypeScript: the Record value type is CompositionAdapter, so only valid implementations can register

## Technology Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Registry data structure | Record of string to CompositionAdapter | Simplest possible mapping; O(1) lookup |
| Registration mechanism | Static imports at module init | No runtime overhead; TypeScript catches type mismatches at compile time |
| Error messages | Include SPEC reference for unregistered types | Guides user to the resolution path |

## Security Considerations

- No security implications; the registry is populated at build time from trusted source code

## Testing Strategy

- Unit test: getAdapter("adr") returns AdrAdapter instance
- Unit test: getAdapter("analysis") throws with "Complete SPEC-002" message
- Unit test: getAdapter("bogus") throws with valid types list
- Integration: registry contains exactly 1 entry at SPEC-005 ship; test count grows as SPECs complete

## Open Questions

None. The design is a direct implementation of ADR-001 D-4 and ADR-002 D-2.

## Observations

- [design] Static Record registry with import-based registration; no dynamic loading or plugin framework #registry #simplicity
- [decision] Dispatcher error messages include SPEC reference for unregistered types to guide users #ux #error-handling
- [technique] Extension point is a single module file; adding an adapter requires one import plus one Record entry #extension-point #minimal
- [constraint] At SPEC-005 ship, exactly 1 adapter registered (ADR); incremental per P1 amendment #incremental #p1-amendment

## Relations

- implements [[REQ-004-SPEC-005: Adapter Registry Dispatcher]]
- part_of [[SPEC-005: Decompose and Recompose Skills]]
- depends_on [[SPEC-001: Composition Core and ADR Adapter]]
