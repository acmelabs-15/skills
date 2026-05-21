/**
 * Cluster-level hash validation + filesystem rollback for SPEC subtrees.
 *
 * Implements DESIGN-003-SPEC-004:
 *   - Component 1 (PerFileHashValidator): `validateSubtreeHashes` runs the
 *     4-step protocol per file (extract source -> stage mutated content ->
 *     reverse mutations on staged content -> compare hashes) in a
 *     collect-then-validate pattern with full per-file aggregation.
 *   - Component 2 (ClusterRollback): `rollbackCluster` removes all staged
 *     `.tmp` files and any already-renamed destinations on failure. Never
 *     throws; cleanup is best-effort.
 */

import { existsSync, unlinkSync } from "node:fs";
import type { MutationSpec } from "./types.js";
import { sha256 } from "./hash.js";

/**
 * Adapter contract surface used by cluster-rollback. Mirrors the
 * `reverseMutations` method on `CompositionAdapter`, kept narrow so this
 * module never imports the adapter class directly (avoids cycles).
 */
export interface SubtreeReverseMutator {
  reverseMutations(content: string, mutations: MutationSpec): string;
}

/** Per-file hash comparison record (DESIGN-003 Component 1). */
export interface HashValidationEntry {
  filePath: string;
  sourceHash: string;
  reversedHash: string;
  match: boolean;
}

/** Aggregated cluster hash-validation result (DESIGN-003 Component 1). */
export interface HashValidationResult {
  allPass: boolean;
  entries: HashValidationEntry[];
  firstFailure: HashValidationEntry | null;
}

/**
 * Entry passed to `validateSubtreeHashes`: a single file's source content,
 * staged (mutated) content, and the mutations applied. The orchestrator
 * builds these from the in-memory manifest before calling.
 */
export interface SubtreeFileForValidation {
  filePath: string;
  sourceContent: string;
  stagedContent: string;
  mutations: MutationSpec;
}

/**
 * Collect-then-validate per-file hash check across an entire SPEC subtree.
 *
 * For each file:
 *   Step 1 — S = sourceContent
 *   Step 2 — D = stagedContent (already-mutated)
 *   Step 3 — D' = adapter.reverseMutations(D, mutations)
 *   Step 4 — compare sha256(S) === sha256(D')
 *
 * Iterates every file even after the first mismatch so full diagnostics are
 * available, while still recording `firstFailure` for fast feedback per
 * DESIGN-003 short-circuit-with-aggregation rule.
 */
export function validateSubtreeHashes(
  adapter: SubtreeReverseMutator,
  files: SubtreeFileForValidation[],
): HashValidationResult {
  const entries: HashValidationEntry[] = [];
  let firstFailure: HashValidationEntry | null = null;

  for (const file of files) {
    const reversed = adapter.reverseMutations(file.stagedContent, file.mutations);
    const sourceHash = sha256(file.sourceContent);
    const reversedHash = sha256(reversed);
    const match = sourceHash === reversedHash;
    const entry: HashValidationEntry = {
      filePath: file.filePath,
      sourceHash,
      reversedHash,
      match,
    };
    entries.push(entry);
    if (!match && firstFailure === null) {
      firstFailure = entry;
    }
  }

  return {
    allPass: firstFailure === null,
    entries,
    firstFailure,
  };
}

/**
 * Best-effort cleanup of staged `.tmp` files and any destinations already
 * renamed when a failure occurred mid-rename. Never throws; per
 * DESIGN-003 Component 2 + ADR-001 F-8 cluster-rollback resilience rule
 * the validation error is the one that must surface to the caller.
 */
export function rollbackCluster(stagedPaths: string[], renamedPaths: string[]): void {
  for (const tmp of stagedPaths) {
    try {
      if (existsSync(tmp)) {
        unlinkSync(tmp);
      }
    } catch {
      // Swallow — cleanup is best-effort.
    }
  }
  for (const dest of renamedPaths) {
    try {
      if (existsSync(dest)) {
        unlinkSync(dest);
      }
    } catch {
      // Swallow — cleanup is best-effort.
    }
  }
}
