import type { Root } from "mdast";
import type { LineRange, MutationSpec } from "./types.js";

/**
 * Contract for all composition adapters.
 * Call sequence: parse → extractByRange → applyMutations → serialize
 * Round-trip invariant: reverseMutations(applyMutations(content, m), m) ≡ content (char-identity)
 */
export interface CompositionAdapter {
  /** Discriminant matching the plan YAML source_type field. */
  readonly sourceType: string;
  /** Parse markdown content to mdast Root. */
  parse(content: string): Root;
  /** Extract lines [range.start, range.end] from content. end=-1 means end of file. */
  extractByRange(content: string, range: LineRange): string;
  /** Apply all mutations from spec to content in a single pass. */
  applyMutations(content: string, mutations: MutationSpec): string;
  /** Invert all mutations from spec on content (used for hash validation). */
  reverseMutations(content: string, mutations: MutationSpec): string;
  /** Serialize mdast Root back to markdown string. */
  serialize(ast: Root): string;
}
