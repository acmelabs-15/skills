import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
// mkdir is a directory op with no Bun equivalent; content writes are Bun-native.
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { containedPathSchema, injectiveDisjointMap } from "@acmelabs/core/core/validators";

const ENV_KEY = "SKILLS_DOCS_ROOT" as const;

describe("injectiveDisjointMap", () => {
  const schema = z.record(z.string(), z.string()).superRefine(injectiveDisjointMap("renumber_map"));

  test("injective map passes", async () => {
    const result = await schema.safeParseAsync({ "D-1": "D-2", "D-3": "D-4" });
    expect(result.success).toBe(true);
  });

  test("non-injective map rejected (duplicate values)", async () => {
    const result = await schema.safeParseAsync({ "D-1": "D-2", "D-3": "D-2" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("not injective"))).toBe(true);
    }
  });

  test("non-disjoint map rejected (value also a key)", async () => {
    const result = await schema.safeParseAsync({ "D-1": "D-2", "D-2": "D-3" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("not disjoint"))).toBe(true);
    }
  });

  test("empty map passes (trivially injective and disjoint)", async () => {
    const result = await schema.safeParseAsync({});
    expect(result.success).toBe(true);
  });
});

describe("containedPathSchema", () => {
  let tempRoot: string;
  let insideFile: string;
  const originalEnv = process.env[ENV_KEY];

  const schema = z.string().superRefine(containedPathSchema);

  beforeAll(async () => {
    tempRoot = mkdtempSync(path.join(tmpdir(), "validators-test-"));
    insideFile = path.join(tempRoot, "inside.txt");
    await Bun.write(insideFile, "content");
    const subdir = path.join(tempRoot, "subdir");
    await mkdir(subdir, { recursive: true });
    await Bun.write(path.join(subdir, "nested.txt"), "nested");
  });

  afterAll(() => {
    rmSync(tempRoot, { recursive: true, force: true });
    if (originalEnv === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = originalEnv;
    }
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = originalEnv;
    }
  });

  test("path inside root passes", async () => {
    process.env[ENV_KEY] = tempRoot;
    const result = await schema.safeParseAsync(insideFile);
    expect(result.success).toBe(true);
  });

  test("nested path inside root passes", async () => {
    process.env[ENV_KEY] = tempRoot;
    const result = await schema.safeParseAsync(path.join(tempRoot, "subdir", "nested.txt"));
    expect(result.success).toBe(true);
  });

  test("path outside root rejected", async () => {
    process.env[ENV_KEY] = tempRoot;
    const outside = tmpdir();
    const result = await schema.safeParseAsync(outside);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("outside the allowed docs root"))).toBe(true);
    }
  });

  test("nonexistent path rejected", async () => {
    process.env[ENV_KEY] = tempRoot;
    const result = await schema.safeParseAsync(path.join(tempRoot, "does-not-exist.txt"));
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("does not exist or cannot be resolved"))).toBe(true);
    }
  });

  test("missing SKILLS_DOCS_ROOT env var rejected", async () => {
    delete process.env[ENV_KEY];
    const result = await schema.safeParseAsync(insideFile);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(
        messages.some((m) => m.includes("SKILLS_DOCS_ROOT environment variable is not set")),
      ).toBe(true);
    }
  });
});
