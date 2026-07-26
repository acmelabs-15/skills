/**
 * CWE-22 path containment wired onto plan path fields.
 *
 * Two defects had to be closed before this could be wired at all:
 *
 *  1. `containedPathSchema` called `realpath()` on the value, which throws for a
 *     path that does not exist — and every DESTINATION in a distribution plan is
 *     a file that has not been written yet. Wiring it unchanged would have
 *     rejected 100% of legitimate splits. Containment now resolves symlinks on
 *     the nearest EXISTING ancestor and treats the remainder lexically, which is
 *     the standard way to validate a not-yet-created path.
 *
 *  2. `SKILLS_DOCS_ROOT` was never set anywhere outside tests, so the guard had
 *     never executed against a real plan.
 *
 * Posture: containment is enforced when a root is configured and skipped when it
 * is not. The synchronous `safePathSchema` guard (traversal + absolute rejection)
 * applies unconditionally either way; containment is the additional layer that
 * catches symlink escapes, which lexical checks cannot see.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, symlinkSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findUncontainedPaths } from "../schemas/base.js";
import { main as decomposeMain } from "../src/decompose.js";
import { DistributionPlanSchema } from "../src/schemas/plan-yaml.js";

const ENV_KEY = "SKILLS_DOCS_ROOT" as const;
const originalRoot = process.env[ENV_KEY];

afterEach(() => {
  if (originalRoot === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = originalRoot;
});

const planWith = (sourcePath: string, destPath: string) => ({
  plan_type: "distribution",
  source_type: "adr",
  source_path: sourcePath,
  renumber_map: {},
  wikilink_map: {},
  clusters: {
    only: { destination_path: destPath, range: { start: "1", end: "-1" } },
  },
});

async function stageRoot(): Promise<string> {
  const root = mkdtempSync(join(tmpdir(), "containment-"));
  await mkdir(join(root, "docs"), { recursive: true });
  await Bun.write(join(root, "docs", "source.md"), "# source\n");
  process.env[ENV_KEY] = root;
  return root;
}

describe("containment permits the normal case", () => {
  test("accepts an existing source and a destination that does not exist yet", async () => {
    await stageRoot();
    const result = await DistributionPlanSchema.safeParseAsync(
      planWith("docs/source.md", "docs/child.md"),
    );
    expect(result.success).toBe(true);
  });

  test("accepts a destination in a directory that does not exist yet", async () => {
    await stageRoot();
    const result = await DistributionPlanSchema.safeParseAsync(
      planWith("docs/source.md", "docs/new-dir/child.md"),
    );
    expect(result.success).toBe(true);
  });
});

describe("containment rejects escapes the lexical guard cannot see", () => {
  // Containment is a boundary check, not a schema refinement — attaching it to
  // the schema would force every consumer async and erase the inferred type.
  // These assert the check itself; the CLI wiring is asserted below.
  test("flags a source path escaping via a symlinked directory", async () => {
    const root = await stageRoot();
    const outside = mkdtempSync(join(tmpdir(), "outside-"));
    await Bun.write(join(outside, "secret.md"), "secret\n");
    // A symlink inside the root pointing out of it: lexically clean, real escape.
    symlinkSync(outside, join(root, "docs", "escape"));

    const offenders = await findUncontainedPaths(
      planWith("docs/escape/secret.md", "docs/child.md"),
      root,
    );
    expect(offenders).toContain("docs/escape/secret.md");
  });

  test("flags a destination written through a symlinked directory", async () => {
    const root = await stageRoot();
    const outside = mkdtempSync(join(tmpdir(), "outside-"));
    symlinkSync(outside, join(root, "docs", "out"));

    const offenders = await findUncontainedPaths(
      planWith("docs/source.md", "docs/out/child.md"),
      root,
    );
    expect(offenders).toContain("docs/out/child.md");
  });

  test("flags nothing for a contained plan", async () => {
    const root = await stageRoot();
    expect(await findUncontainedPaths(planWith("docs/source.md", "docs/child.md"), root)).toEqual(
      [],
    );
  });

  test("flags nothing when no containment root is configured", async () => {
    delete process.env[ENV_KEY];
    expect(await findUncontainedPaths(planWith("docs/source.md", "docs/child.md"), "/tmp")).toEqual(
      [],
    );
  });
});

describe("the CLI enforces containment before touching any file", () => {
  test("decompose exits 1 and writes nothing when a destination escapes", async () => {
    const root = await stageRoot();
    const outside = mkdtempSync(join(tmpdir(), "outside-"));
    symlinkSync(outside, join(root, "docs", "out"));
    await Bun.write(join(root, "docs", "src.md"), "line one\nline two\n");

    const planPath = join(root, "docs", "plan.yaml");
    await Bun.write(
      planPath,
      [
        "plan_type: distribution",
        "source_type: adr",
        "source_path: src.md",
        "renumber_map: {}",
        "wikilink_map: {}",
        "clusters:",
        "  only:",
        "    destination_path: out/child.md",
        "    range: {start: 1, end: -1}",
        "",
      ].join("\n"),
    );

    expect(await decomposeMain(["--plan", planPath])).toBe(1);
    expect(await Bun.file(join(outside, "child.md")).exists()).toBe(false);
  });
});

describe("the unconditional lexical guard is unaffected by configuration", () => {
  test("traversal is rejected with no root configured", async () => {
    delete process.env[ENV_KEY];
    const result = await DistributionPlanSchema.safeParseAsync(
      planWith("../escape.md", "docs/child.md"),
    );
    expect(result.success).toBe(false);
  });

  test("absolute paths are rejected with no root configured", async () => {
    delete process.env[ENV_KEY];
    const result = await DistributionPlanSchema.safeParseAsync(
      planWith("docs/source.md", "/etc/passwd"),
    );
    expect(result.success).toBe(false);
  });

  test("a valid plan still parses with no root configured (containment skipped)", async () => {
    delete process.env[ENV_KEY];
    const result = await DistributionPlanSchema.safeParseAsync(
      planWith("docs/source.md", "docs/child.md"),
    );
    expect(result.success).toBe(true);
  });
});
