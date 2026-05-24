import { existsSync, renameSync, unlinkSync } from "node:fs";

/**
 * Write content to `destPath + ".tmp"` using Bun.write.
 * Call rename() after validation passes, or cleanup() on failure.
 */
export async function stage(destPath: string, content: string): Promise<void> {
  await Bun.write(`${destPath}.tmp`, content);
}

/**
 * Atomically rename `destPath + ".tmp"` to `destPath`.
 * POSIX rename is atomic on same filesystem.
 */
export function rename(destPath: string): void {
  renameSync(`${destPath}.tmp`, destPath);
}

/**
 * Remove `destPath + ".tmp"` if it exists (idempotent).
 * Safe to call after rename() — unlink of non-existent file is a no-op.
 */
export function cleanup(destPath: string): void {
  const tmp = `${destPath}.tmp`;
  if (existsSync(tmp)) {
    unlinkSync(tmp);
  }
}

/**
 * Stage all destinations, then rename all atomically.
 * If any rename fails, clean up all .tmp files (all-or-nothing).
 * Assumes all stage() calls have already completed successfully.
 */
export function clusterAtomicRename(destPaths: string[]): void {
  try {
    for (const dest of destPaths) {
      renameSync(`${dest}.tmp`, dest);
    }
  } catch (err) {
    for (const dest of destPaths) {
      cleanup(dest);
    }
    throw err;
  }
}
