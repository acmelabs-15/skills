/**
 * Adapter registry and dispatcher for the composition library.
 *
 * Per DESIGN-003-SPEC-005, this module is the source_type → CompositionAdapter
 * resolution point used by the /decompose and /recompose CLI entry points
 * (decompose.ts, recompose.ts). It is intentionally a static Record + function
 * pair; no dynamic plugin discovery.
 *
 * Registration is incremental per the P1 amendment from ANALYSIS-001 critic:
 * a source_type is registered here only when its corresponding adapter SPEC has
 * shipped. Unregistered-but-known source_types throw with a SPEC-NNN reference
 * to guide the user to the unlock path; truly unknown types throw with the list
 * of currently-registered types.
 *
 * Note: an earlier internal dispatcher exists at core/dispatcher.ts. This
 * registry.ts module is the SPEC-005-defined surface that the public CLI entry
 * points consume; it provides the SPEC-aware error messages that the older
 * core dispatcher does not.
 */
import { AdrAdapter } from "@acmelabs/core/adapters/adr";
import { AnalysisAdapter } from "@acmelabs/core/adapters/analysis";
import { PlanAdapter } from "@acmelabs/core/adapters/plan";
import { SessionAdapter } from "@acmelabs/core/adapters/session";
import { SpecSubtreeAdapter } from "@acmelabs/core/adapters/spec-subtree";
import type { CompositionAdapter } from "@acmelabs/core/core/adapter";

/**
 * Source-type to adapter mapping. Each entry corresponds to an adapter SPEC
 * that has shipped. To register a new adapter:
 *   1. Import the adapter class above.
 *   2. Add the `source_type` → `new Adapter()` entry to this Record.
 * TypeScript's structural typing on `CompositionAdapter` validates the entry.
 */
const registry: Record<string, CompositionAdapter> = {
  adr: new AdrAdapter(), // SPEC-001
  analysis: new AnalysisAdapter(), // SPEC-002
  session: new SessionAdapter(), // SPEC-002
  plan: new PlanAdapter(), // SPEC-003
  spec: new SpecSubtreeAdapter(), // SPEC-004
};

/**
 * Source-type to SPEC mapping used for error messages when a known-but-not-yet
 * shipped adapter is requested. Update this map when the contract of an
 * adapter's source_type changes (e.g., a future "epic" source_type would land
 * here ahead of its SPEC shipping the adapter).
 */
const adapterSpecMap: Record<string, string> = {
  // No currently-pending adapters; all source_types defined in the project
  // ship in SPEC-001..SPEC-004 and are registered above. Future entries land
  // here while their SPEC is still in flight.
};

/**
 * Resolve a `source_type` discriminant to its registered CompositionAdapter.
 *
 * - If the source_type is registered, returns the adapter.
 * - If the source_type is known but not yet registered (its adapter SPEC is in
 *   flight), throws with a SPEC-NNN reference guiding the user to the unlock
 *   path.
 * - If the source_type is entirely unknown, throws with the list of currently
 *   registered types.
 */
export function getAdapter(sourceType: string): CompositionAdapter {
  const adapter = registry[sourceType];
  if (adapter) return adapter;

  const requiredSpec = adapterSpecMap[sourceType];
  if (requiredSpec) {
    throw new Error(
      `Adapter for source_type "${sourceType}" is not yet registered. Complete ${requiredSpec} to enable this adapter.`,
    );
  }

  throw new Error(
    `Unknown source_type "${sourceType}". Valid types: ${Object.keys(registry).join(", ")}`,
  );
}

/** List the source_type discriminants of every registered adapter. */
export function listRegisteredSourceTypes(): string[] {
  return Object.keys(registry);
}
