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
import { findUncontainedPaths } from "@acmelabs/core/schemas/base";
import { main as decomposeMain } from "@acmelabs/cli/decompose";
import { DistributionPlanSchema } from "@acmelabs/core/schemas/plan-yaml";

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

describe("--root resolves the F-7 plan-location contradiction", () => {
  // ADR-001 F-7 locks plans to docs/_restructure/ while destinations live in
  // sibling directories (docs/decisions/). Reaching them from the plan's own
  // directory needs `../`, which the CWE-22 lexical guard rejects. The base
  // comes from the CALLER so the untrusted plan still cannot contain `..` and
  // cannot redirect its own resolution base.
  test("a sibling-directory destination works via --root, with no traversal in the plan", async () => {
    delete process.env[ENV_KEY];
    const graphRoot = mkdtempSync(join(tmpdir(), "graph-"));
    await mkdir(join(graphRoot, "_restructure"), { recursive: true });
    await mkdir(join(graphRoot, "decisions"), { recursive: true });
    await Bun.write(join(graphRoot, "decisions", "ADR-042.md"), "alpha\nbeta\n");

    const planPath = join(graphRoot, "_restructure", "plan.yaml");
    await Bun.write(
      planPath,
      [
        "plan_type: distribution",
        "source_type: adr",
        "source_path: decisions/ADR-042.md",
        "renumber_map: {}",
        "wikilink_map: {}",
        "clusters:",
        "  only:",
        "    destination_path: decisions/ADR-042a.md",
        "    range: {start: 1, end: -1}",
        "",
      ].join("\n"),
    );

    // Without --root the source resolves under _restructure/ and is not found.
    expect(await decomposeMain(["--plan", planPath])).toBe(1);

    // With --root it resolves against the graph root, exactly as authored.
    expect(await decomposeMain(["--plan", planPath, "--root", graphRoot])).toBe(0);
    expect(await Bun.file(join(graphRoot, "decisions", "ADR-042a.md")).text()).toBe(
      "alpha\nbeta\n",
    );
  });

  test("--root without a directory is a usage error", async () => {
    const dir = mkdtempSync(join(tmpdir(), "rootflag-"));
    await Bun.write(join(dir, "p.yaml"), "plan_type: distribution\n");
    expect(await decomposeMain(["--plan", join(dir, "p.yaml"), "--root"])).toBe(1);
  });
});
