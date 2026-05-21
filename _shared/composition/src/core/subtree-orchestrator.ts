/**
 * Manifest-driven SPEC-subtree orchestration.
 *
 * Implements DESIGN-001-SPEC-004 Component 2: iterates the manifest
 * (root first, then children in order), stages every file to a `.tmp`
 * path with mutations applied, then runs a single collect-then-validate
 * pass over staged content. On all-pass, atomically renames every `.tmp`
 * to its destination; on any failure, invokes `rollbackCluster` to
 * remove all staged + already-renamed files.
 */

import { renameSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { MutationSpec } from "./types.js";
import {
  type HashValidationEntry,
  rollbackCluster,
  type SubtreeFileForValidation,
  type SubtreeReverseMutator,
  validateSubtreeHashes,
} from "./cluster-rollback.js";

/**
 * Single-file extension of `MutationSpec` keyed by relative path within the
 * subtree. The orchestrator applies the same `mutations` to every file by
 * default; per-file overrides can be threaded via `perFileMutations`.
 */
export interface SubtreeProcessInput {
  /** Absolute path of the SPEC root note on disk. */
  rootPath: string;
  /** Raw content of the root note (already read by caller). */
  rootContent: string;
  /**
   * Children with relative paths (relative to `rootDir`) + raw content.
   * Identifier is forwarded for diagnostics.
   */
  children: Array<{
    relativePath: string;
    content: string;
    identifier?: string;
  }>;
  /** Root directory used to resolve child relativePath -> absolute path. */
  rootDir: string;
  /** Mutations applied to root + every child unless `perFileMutations` overrides. */
  mutations: MutationSpec;
  /** Optional per-file mutation override, keyed by absolute file path. */
  perFileMutations?: Map<string, MutationSpec>;
}

/**
 * Aggregated outcome of `processSubtree`. Matches DESIGN-001 Component 2
 * `ProcessResult` shape with per-file diagnostics for failure cases.
 */
export interface ProcessResult {
  success: boolean;
  filesProcessed: number;
  errors: Array<{ filePath: string; expected: string; actual: string }>;
  /** Full per-file hash entries when validation ran (aids diagnostics). */
  hashEntries?: HashValidationEntry[];
}

/** I/O surface for `processSubtree`; injectable for tests. */
export interface SubtreeFileIO {
  /** Persist `content` to `path + ".tmp"`. */
  writeTemp(path: string, content: string): Promise<void>;
  /** Atomic rename of `path + ".tmp"` -> `path`. POSIX rename. */
  rename(path: string): void;
  /** Best-effort cluster cleanup. */
  rollback(stagedTmpPaths: string[], renamedPaths: string[]): void;
  /** Ensure parent directory of `path` exists. */
  ensureDir(path: string): Promise<void>;
}

/**
 * Default `SubtreeFileIO` implementation using Bun.write + node:fs rename.
 * Stages atomically via `.tmp` suffix, renames POSIX-atomically, and
 * delegates cleanup to `rollbackCluster` from cluster-rollback.ts.
 */
export const defaultSubtreeFileIO: SubtreeFileIO = {
  async writeTemp(path, content) {
    await Bun.write(`${path}.tmp`, content);
  },
  rename(path) {
    renameSync(`${path}.tmp`, path);
  },
  rollback(stagedTmpPaths, renamedPaths) {
    rollbackCluster(stagedTmpPaths, renamedPaths);
  },
  async ensureDir(path) {
    await mkdir(dirname(path), { recursive: true });
  },
};

/**
 * Adapter contract the orchestrator depends on: must expose
 * `applyMutations` (forward) for staging and `reverseMutations` (inverse)
 * for hash validation. Kept narrow to avoid cycles.
 */
export interface SubtreeOrchestrationAdapter extends SubtreeReverseMutator {
  applyMutations(content: string, mutations: MutationSpec): string;
}

/**
 * Manifest-driven orchestration entry point (DESIGN-001 Component 2).
 *
 * Phase A: stage-all
 *   For each manifest entry (root first, then children in order):
 *     1. resolve absolute destPath
 *     2. ensure parent dir
 *     3. compute mutated content via adapter.applyMutations
 *     4. writeTemp(destPath, mutated)
 *
 * Phase B: validate-all
 *   Call `validateSubtreeHashes` over the in-memory source/staged pairs.
 *   On allPass=false: rollbackCluster(stagedTmps, []) + return failure.
 *
 * Phase C: rename-all
 *   For each staged file, fileIO.rename. If a rename throws midway,
 *   rollbackCluster(remainingTmps, alreadyRenamed) + rethrow.
 */
export async function processSubtree(
  adapter: SubtreeOrchestrationAdapter,
  input: SubtreeProcessInput,
  fileIO: SubtreeFileIO = defaultSubtreeFileIO,
): Promise<ProcessResult> {
  const entries: Array<{
    filePath: string;
    sourceContent: string;
    stagedContent: string;
    mutations: MutationSpec;
  }> = [];

  // Phase A: stage-all (root first, then children in order).
  const rootEntry = {
    filePath: input.rootPath,
    sourceContent: input.rootContent,
    mutations: input.perFileMutations?.get(input.rootPath) ?? input.mutations,
  };
  const rootStaged = adapter.applyMutations(rootEntry.sourceContent, rootEntry.mutations);
  entries.push({ ...rootEntry, stagedContent: rootStaged });

  for (const child of input.children) {
    const absPath = join(input.rootDir, child.relativePath);
    const childMutations = input.perFileMutations?.get(absPath) ?? input.mutations;
    const staged = adapter.applyMutations(child.content, childMutations);
    entries.push({
      filePath: absPath,
      sourceContent: child.content,
      stagedContent: staged,
      mutations: childMutations,
    });
  }

  // Write every staged content to its `.tmp` location before validating.
  // If staging throws mid-loop, roll back whatever has already been written.
  const stagedTmps: string[] = [];
  try {
    for (const entry of entries) {
      await fileIO.ensureDir(entry.filePath);
      await fileIO.writeTemp(entry.filePath, entry.stagedContent);
      stagedTmps.push(`${entry.filePath}.tmp`);
    }
  } catch (stageErr) {
    fileIO.rollback(stagedTmps, []);
    throw stageErr;
  }

  // Phase B: validate-all (collect-then-validate per DESIGN-003 Component 1).
  const validationInputs: SubtreeFileForValidation[] = entries.map((e) => ({
    filePath: e.filePath,
    sourceContent: e.sourceContent,
    stagedContent: e.stagedContent,
    mutations: e.mutations,
  }));
  const validation = validateSubtreeHashes(adapter, validationInputs);

  if (!validation.allPass) {
    fileIO.rollback(stagedTmps, []);
    return {
      success: false,
      filesProcessed: entries.length,
      errors: validation.entries
        .filter((e) => !e.match)
        .map((e) => ({
          filePath: e.filePath,
          expected: e.sourceHash,
          actual: e.reversedHash,
        })),
      hashEntries: validation.entries,
    };
  }

  // Phase C: rename-all. On any rename failure, roll back already-renamed
  // destinations AND any still-staged `.tmp` files.
  const renamed: string[] = [];
  const remainingTmps = [...stagedTmps];
  try {
    for (const entry of entries) {
      fileIO.rename(entry.filePath);
      // Remove from remaining-tmps once renamed.
      const idx = remainingTmps.indexOf(`${entry.filePath}.tmp`);
      if (idx >= 0) remainingTmps.splice(idx, 1);
      renamed.push(entry.filePath);
    }
  } catch (renameErr) {
    fileIO.rollback(remainingTmps, renamed);
    throw renameErr;
  }

  return {
    success: true,
    filesProcessed: entries.length,
    errors: [],
    hashEntries: validation.entries,
  };
}
