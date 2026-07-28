import { afterAll, expect, test } from "bun:test";
// node:fs is limited to directory ops (mkdtemp/rm), and node:path/node:os have no
// Bun equivalents; every file-content probe below is Bun-native per ADR-001 F-6.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { cleanup, clusterAtomicRename, rename, stage } from "../src/core/atomic-write.js";

const testDir = mkdtempSync(path.join(tmpdir(), "atomic-write-test-"));
afterAll(() => rmSync(testDir, { recursive: true, force: true }));

const exists = (p: string): Promise<boolean> => Bun.file(p).exists();

test("stage creates .tmp file with correct content", async () => {
  const dest = path.join(testDir, "stage-content.txt");
  await stage(dest, "hello");

  expect(await exists(`${dest}.tmp`)).toBe(true);
  expect(await Bun.file(`${dest}.tmp`).text()).toBe("hello");

  await cleanup(dest);
});

test("rename moves .tmp to final path", async () => {
  const dest = path.join(testDir, "rename-target.txt");
  await stage(dest, "renamed");
  rename(dest);

  expect(await exists(dest)).toBe(true);
  expect(await exists(`${dest}.tmp`)).toBe(false);
  expect(await Bun.file(dest).text()).toBe("renamed");
});

test("cleanup removes .tmp file", async () => {
  const dest = path.join(testDir, "cleanup-target.txt");
  await stage(dest, "cleanup-me");

  expect(await exists(`${dest}.tmp`)).toBe(true);
  await cleanup(dest);
  expect(await exists(`${dest}.tmp`)).toBe(false);
});

test("cleanup is idempotent on missing .tmp", async () => {
  const dest = path.join(testDir, "never-staged.txt");

  expect(await exists(`${dest}.tmp`)).toBe(false);
  // Bun.file().delete() throws ENOENT, so idempotency rests on the exists()
  // guard inside cleanup(). Assert it holds across repeated calls.
  await expect(cleanup(dest)).resolves.toBeUndefined();
  await expect(cleanup(dest)).resolves.toBeUndefined();
});

test("clusterAtomicRename renames all files", async () => {
  const destA = path.join(testDir, "cluster-a.txt");
  const destB = path.join(testDir, "cluster-b.txt");

  await stage(destA, "content-a");
  await stage(destB, "content-b");

  await clusterAtomicRename([destA, destB]);

  expect(await exists(destA)).toBe(true);
  expect(await exists(destB)).toBe(true);
  expect(await exists(`${destA}.tmp`)).toBe(false);
  expect(await exists(`${destB}.tmp`)).toBe(false);
  expect(await Bun.file(destA).text()).toBe("content-a");
  expect(await Bun.file(destB).text()).toBe("content-b");
});

test("clusterAtomicRename cleans up on partial failure", async () => {
  const validDest = path.join(testDir, "cluster-valid.txt");
  const invalidDest = path.join(testDir, "nonexistent-dir", "cluster-bad.txt");

  await stage(validDest, "valid-content");
  // Do NOT stage invalidDest — its .tmp does not exist and parent dir is missing,
  // so renameSync will throw when it reaches that entry.

  expect(await exists(`${validDest}.tmp`)).toBe(true);

  // Put the invalid path FIRST so the valid .tmp is still pending when failure
  // occurs — this exercises the cleanup path (renameSync would otherwise rename
  // the valid one before hitting the failure).
  await expect(clusterAtomicRename([invalidDest, validDest])).rejects.toThrow();

  // After failure, the valid .tmp must be cleaned up (all-or-nothing).
  expect(await exists(`${validDest}.tmp`)).toBe(false);
  // And the valid dest was never created (failure happened on the first rename).
  expect(await exists(validDest)).toBe(false);
});
