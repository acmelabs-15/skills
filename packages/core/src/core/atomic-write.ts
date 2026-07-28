/**
 * Temp-then-rename atomic write primitives per ADR-001 F-8.
 *
 * Bun-native throughout per ADR-001 F-6: Bun.write stages, Bun.file().exists()
 * probes, Bun.file().delete() removes. `renameSync` is retained from node:fs
 * because Bun exposes no native rename, and POSIX rename is the atomicity
 * guarantee F-8 depends on — a metadata operation, not file-content I/O.
 */
import { renameSync } from "node:fs";

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
 * Safe to call after rename(). The existence probe is load-bearing:
 * Bun.file().delete() throws ENOENT on a missing file, where the previous
 * unlinkSync-behind-existsSync guard silently no-oped.
 */
export async function cleanup(destPath: string): Promise<void> {
  const tmp = Bun.file(`${destPath}.tmp`);
  if (await tmp.exists()) {
    await tmp.delete();
  }
}

/**
 * Stage all destinations, then rename all atomically.
 * If any rename fails, clean up all .tmp files (all-or-nothing).
 * Assumes all stage() calls have already completed successfully.
 */
export async function clusterAtomicRename(destPaths: string[]): Promise<void> {
  try {
    for (const dest of destPaths) {
      renameSync(`${dest}.tmp`, dest);
    }
  } catch (err) {
    await Promise.all(destPaths.map((dest) => cleanup(dest)));
    throw err;
  }
}
