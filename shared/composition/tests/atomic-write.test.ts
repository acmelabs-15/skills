import { afterAll, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { cleanup, clusterAtomicRename, rename, stage } from "../src/core/atomic-write.js";

const testDir = mkdtempSync(path.join(tmpdir(), "atomic-write-test-"));
afterAll(() => rmSync(testDir, { recursive: true, force: true }));

test("stage creates .tmp file with correct content", async () => {
  const dest = path.join(testDir, "stage-content.txt");
  await stage(dest, "hello");

  expect(existsSync(`${dest}.tmp`)).toBe(true);
  expect(await Bun.file(`${dest}.tmp`).text()).toBe("hello");

  cleanup(dest);
});

test("rename moves .tmp to final path", async () => {
  const dest = path.join(testDir, "rename-target.txt");
  await stage(dest, "renamed");
  rename(dest);

  expect(existsSync(dest)).toBe(true);
  expect(existsSync(`${dest}.tmp`)).toBe(false);
  expect(await Bun.file(dest).text()).toBe("renamed");
});

test("cleanup removes .tmp file", async () => {
  const dest = path.join(testDir, "cleanup-target.txt");
  await stage(dest, "cleanup-me");

  expect(existsSync(`${dest}.tmp`)).toBe(true);
  cleanup(dest);
  expect(existsSync(`${dest}.tmp`)).toBe(false);
});

test("cleanup is idempotent on missing .tmp", () => {
  const dest = path.join(testDir, "never-staged.txt");

  expect(existsSync(`${dest}.tmp`)).toBe(false);
  expect(() => cleanup(dest)).not.toThrow();
  expect(() => cleanup(dest)).not.toThrow();
});

test("clusterAtomicRename renames all files", async () => {
  const destA = path.join(testDir, "cluster-a.txt");
  const destB = path.join(testDir, "cluster-b.txt");

  await stage(destA, "content-a");
  await stage(destB, "content-b");

  clusterAtomicRename([destA, destB]);

  expect(existsSync(destA)).toBe(true);
  expect(existsSync(destB)).toBe(true);
  expect(existsSync(`${destA}.tmp`)).toBe(false);
  expect(existsSync(`${destB}.tmp`)).toBe(false);
  expect(await Bun.file(destA).text()).toBe("content-a");
  expect(await Bun.file(destB).text()).toBe("content-b");
});

test("clusterAtomicRename cleans up on partial failure", async () => {
  const validDest = path.join(testDir, "cluster-valid.txt");
  const invalidDest = path.join(testDir, "nonexistent-dir", "cluster-bad.txt");

  await stage(validDest, "valid-content");
  // Do NOT stage invalidDest — its .tmp does not exist and parent dir is missing,
  // so renameSync will throw when it reaches that entry.

  expect(existsSync(`${validDest}.tmp`)).toBe(true);

  // Put the invalid path FIRST so the valid .tmp is still pending when failure
  // occurs — this exercises the cleanup path (renameSync would otherwise rename
  // the valid one before hitting the failure).
  expect(() => clusterAtomicRename([invalidDest, validDest])).toThrow();

  // After failure, the valid .tmp must be cleaned up (all-or-nothing).
  expect(existsSync(`${validDest}.tmp`)).toBe(false);
  // And the valid dest was never created (failure happened on the first rename).
  expect(existsSync(validDest)).toBe(false);
});
