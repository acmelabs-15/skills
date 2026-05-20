import { AdrAdapter } from "../adapters/adr.js";
import { AnalysisAdapter } from "../adapters/analysis.js";
import { SessionAdapter } from "../adapters/session.js";
import type { CompositionAdapter } from "./adapter.js";

const registry = new Map<string, CompositionAdapter>([
  ["adr", new AdrAdapter()],
  ["analysis", new AnalysisAdapter()],
  ["session", new SessionAdapter()],
]);

/**
 * Resolve an adapter by its `source_type` discriminant.
 * Throws when no adapter is registered for the given source_type.
 */
export function getAdapter(sourceType: string): CompositionAdapter {
  const adapter = registry.get(sourceType);
  if (!adapter) {
    throw new Error(`No adapter registered for source_type: ${sourceType}`);
  }
  return adapter;
}

/** List the source_type discriminants of every registered adapter. */
export function listAdapters(): string[] {
  return [...registry.keys()];
}
