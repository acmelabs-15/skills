import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { type FilenameRewriteSpec, SpecSubtreeAdapter } from "../src/adapters/spec-subtree.js";

const adapter = new SpecSubtreeAdapter();

describe("applyFilenameRewrites", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = mkdtempSync(path.join(tmpdir(), "filename-rewrite-test-"));
    await mkdir(path.join(rootDir, "requirements"), { recursive: true });
    await mkdir(path.join(rootDir, "tasks"), { recursive: true });
  });

  afterEach(() => {
    rmSync(rootDir, { recursive: true, force: true });
  });

  test("AC: successful subtree-wide rewrite renames all files", async () => {
    const reqOld = "requirements/REQ-001-old.md";
    const reqNew = "requirements/REQ-001-new.md";
    const taskOld = "tasks/TASK-001-old.md";
    const taskNew = "tasks/TASK-001-new.md";
    await Bun.write(path.join(rootDir, reqOld), "req content");
    await Bun.write(path.join(rootDir, taskOld), "task content");

    const rewrites: FilenameRewriteSpec[] = [
      { relativePath: reqOld, newRelativePath: reqNew },
      { relativePath: taskOld, newRelativePath: taskNew },
    ];

    await adapter.applyFilenameRewrites(rootDir, rewrites);

    expect(existsSync(path.join(rootDir, reqOld))).toBe(false);
    expect(existsSync(path.join(rootDir, taskOld))).toBe(false);
    expect(existsSync(path.join(rootDir, reqNew))).toBe(true);
    expect(existsSync(path.join(rootDir, taskNew))).toBe(true);
    expect(await Bun.file(path.join(rootDir, reqNew)).text()).toBe("req content");
    expect(await Bun.file(path.join(rootDir, taskNew)).text()).toBe("task content");
  });

  test("AC: duplicate-target injectivity rejection (two rewrites → same path)", async () => {
    const srcA = "requirements/REQ-001-a.md";
    const srcB = "requirements/REQ-002-b.md";
    const dupTarget = "requirements/REQ-collision.md";
    await Bun.write(path.join(rootDir, srcA), "a");
    await Bun.write(path.join(rootDir, srcB), "b");

    const rewrites: FilenameRewriteSpec[] = [
      { relativePath: srcA, newRelativePath: dupTarget },
      { relativePath: srcB, newRelativePath: dupTarget },
    ];

    await expect(adapter.applyFilenameRewrites(rootDir, rewrites)).rejects.toThrow(/injectivity/i);
    // No files moved — pre-flight rejected.
    expect(existsSync(path.join(rootDir, srcA))).toBe(true);
    expect(existsSync(path.join(rootDir, srcB))).toBe(true);
    expect(existsSync(path.join(rootDir, dupTarget))).toBe(false);
  });

  test("AC: path-traversal target rejection (newRelativePath contains '..')", async () => {
    const src = "requirements/REQ-001.md";
    await Bun.write(path.join(rootDir, src), "content");

    const rewrites: FilenameRewriteSpec[] = [
      { relativePath: src, newRelativePath: "../escape.md" },
    ];

    await expect(adapter.applyFilenameRewrites(rootDir, rewrites)).rejects.toThrow(
      /path-containment/i,
    );
    expect(existsSync(path.join(rootDir, src))).toBe(true);
  });

  test("AC: absolute-path target rejection", async () => {
    const src = "requirements/REQ-001.md";
    await Bun.write(path.join(rootDir, src), "content");

    const rewrites: FilenameRewriteSpec[] = [
      { relativePath: src, newRelativePath: "/etc/evil.md" },
    ];

    await expect(adapter.applyFilenameRewrites(rootDir, rewrites)).rejects.toThrow(
      /path-containment/i,
    );
    expect(existsSync(path.join(rootDir, src))).toBe(true);
  });

  test("AC: mid-sequence failure LIFO rollback restores completed renames", async () => {
    // Set up three sources. The third rewrite will fail because its target
    // already exists (pre-existing file not in the source set). The first
    // two will have completed; rollback must restore them in LIFO order.
    const src1 = "requirements/REQ-001.md";
    const dst1 = "requirements/REQ-001-renamed.md";
    const src2 = "requirements/REQ-002.md";
    const dst2 = "requirements/REQ-002-renamed.md";
    const src3 = "requirements/REQ-003.md";
    const dst3 = "requirements/REQ-003-conflict.md";
    await Bun.write(path.join(rootDir, src1), "one");
    await Bun.write(path.join(rootDir, src2), "two");
    await Bun.write(path.join(rootDir, src3), "three");
    // Pre-existing dst3 — pre-flight will reject before any rename runs.
    // To force a MID-sequence failure instead, write dst3 AFTER pre-flight.
    // We achieve mid-sequence failure by monkey-patching: simpler approach
    // is to seed dst3 with a file that pre-flight tolerates via swap rules
    // — but it's not in the source set, so pre-flight will catch it.
    //
    // Instead, force mid-sequence failure by giving the third rewrite a
    // target whose parent directory cannot be created (e.g. a path where
    // a sibling FILE blocks mkdir of the required directory).
    await Bun.write(path.join(rootDir, "blocker"), "x"); // file at path "blocker"

    const rewrites: FilenameRewriteSpec[] = [
      { relativePath: src1, newRelativePath: dst1 },
      { relativePath: src2, newRelativePath: dst2 },
      // Target's parent dir is "blocker" which exists as a file → mkdir fails.
      { relativePath: src3, newRelativePath: "blocker/REQ-003.md" },
    ];

    await expect(adapter.applyFilenameRewrites(rootDir, rewrites)).rejects.toThrow();

    // LIFO rollback: src1 and src2 should be restored; their dst counterparts removed.
    expect(existsSync(path.join(rootDir, src1))).toBe(true);
    expect(existsSync(path.join(rootDir, src2))).toBe(true);
    expect(existsSync(path.join(rootDir, dst1))).toBe(false);
    expect(existsSync(path.join(rootDir, dst2))).toBe(false);
    expect(await Bun.file(path.join(rootDir, src1)).text()).toBe("one");
    expect(await Bun.file(path.join(rootDir, src2)).text()).toBe("two");
    // src3 untouched (failed before its content was written).
    expect(existsSync(path.join(rootDir, src3))).toBe(true);

    // Suppress unused warnings.
    void dst3;
  });

  test("AC: empty rewrites array is a no-op", async () => {
    const src = "requirements/REQ-001.md";
    await Bun.write(path.join(rootDir, src), "content");

    await adapter.applyFilenameRewrites(rootDir, []);

    expect(existsSync(path.join(rootDir, src))).toBe(true);
    expect(await Bun.file(path.join(rootDir, src)).text()).toBe("content");
  });
});
