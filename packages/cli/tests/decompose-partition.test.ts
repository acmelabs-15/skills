/**
 * SPEC-005 REQ-001 / REQ-006: real per-cluster partitioning in the decompose
 * executor.
 *
 * Governing design:
 *   - DESIGN-001-SPEC-005 Component 3 — "For each destination in the plan:
 *     extract source content by range, apply mutations, hash-validate, write
 *     via temp-then-rename".
 *   - ADR-001 F-8 hash protocol — S = source extraction by the plan's line
 *     range; D' = reverseMutations(written destination); assert
 *     SHA-256(S) === SHA-256(D') per destination. Stage ALL, validate ALL,
 *     then rename ALL (per-cluster all-or-nothing).
 *   - ADR-002 D-4 (ADR strategy) — extraction is a raw line-range slice;
 *     mutations are applied AFTER extraction.
 *   - REQ-006-SPEC-005 AC-2 — recompose of the N destinations must reproduce
 *     the original source byte-for-byte. Since recompose.ts joins source
 *     contents with "", the destinations must concatenate to the source
 *     exactly: the byte-accountability invariant asserted here.
 */
import { describe, expect, test } from "bun:test";
// node:fs is limited to mkdtemp (a directory op with no Bun equivalent); node:os
// and node:path likewise have none. All file content I/O is Bun-native per
// ADR-001 F-6: Bun.write to stage/copy, Bun.file for reads and existence probes.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sha256 } from "@acmelabs/core/core/hash";
import { main as decomposeMain } from "@acmelabs/cli/decompose";
import { main as recomposeMain } from "@acmelabs/cli/recompose";

const fixtureDir = join(import.meta.dir, "..", "..", "fixtures");

/** Bun-native file copy (OS-level zero-copy where available). */
const copyFixture = (name: string, destDir: string): Promise<number> =>
  Bun.write(Bun.file(join(destDir, name)), Bun.file(join(fixtureDir, name)));

const exists = (p: string): Promise<boolean> => Bun.file(p).exists();

const SHARDS = ["multi-cluster-shard-a.md", "multi-cluster-shard-b.md", "multi-cluster-shard-c.md"];

interface StagedWorkspace {
  readonly dir: string;
  readonly sourcePath: string;
  readonly planPath: string;
  readonly originalContent: string;
}

/** Stage the fixture source plus the pre-authored 3-cluster distribution plan. */
async function stageMultiClusterPlan(): Promise<StagedWorkspace> {
  const dir = mkdtempSync(join(tmpdir(), "decompose-partition-"));
  await copyFixture("multi-cluster-round-trip.md", dir);
  await copyFixture("multi-cluster-decompose-plan.yaml", dir);
  const sourcePath = join(dir, "multi-cluster-round-trip.md");
  const planPath = join(dir, "multi-cluster-decompose-plan.yaml");
  const originalContent = await Bun.file(sourcePath).text();
  return { dir, sourcePath, planPath, originalContent };
}

/** Write a distribution plan YAML with the given cluster block body. */
async function writePlan(dir: string, name: string, clusterYaml: string): Promise<string> {
  const planPath = join(dir, name);
  await Bun.write(
    planPath,
    [
      "plan_type: distribution",
      "source_type: adr",
      "source_path: multi-cluster-round-trip.md",
      "renumber_map:",
      '  "D-1": "D-700"',
      '  "D-2": "D-701"',
      '  "D-3": "D-702"',
      "wikilink_map: {}",
      "clusters:",
      clusterYaml,
      "",
    ].join("\n"),
  );
  return planPath;
}

describe("decompose executor — per-cluster partitioning (DESIGN-001-SPEC-005 Component 3)", () => {
  test("multi-cluster split writes distinct partitioned destinations", async () => {
    const { dir, planPath } = await stageMultiClusterPlan();

    const exit = await decomposeMain(["--plan", planPath]);
    expect(exit).toBe(0);

    const [shardA, shardB, shardC] = await Promise.all(
      SHARDS.map((s) => Bun.file(join(dir, s)).text()),
    );

    // Cluster A owns the frontmatter, H1, Context, and D-1 only.
    expect(shardA).toContain('title: "ADR-098: Multi-Cluster Round-Trip Fixture"');
    expect(shardA).toContain("### D-700: Cluster A");
    expect(shardA).not.toContain("Cluster B is the middle region");
    expect(shardA).not.toContain("## Observations");

    // Cluster B owns the middle decision body only — no frontmatter.
    expect(shardB).not.toContain("title:");
    expect(shardB).toContain("### D-701: Cluster B");
    expect(shardB).not.toContain("### D-700");
    expect(shardB).not.toContain("### D-702");

    // Cluster C owns the final decision plus the trailing sections.
    expect(shardC).toContain("### D-702: Cluster C");
    expect(shardC).toContain("## Observations");
    expect(shardC).toContain("## Relations");
    expect(shardC).not.toContain("### D-701");
  });

  test("renumber mutations apply per cluster and the source stays untouched", async () => {
    const { dir, sourcePath, planPath, originalContent } = await stageMultiClusterPlan();

    expect(await decomposeMain(["--plan", planPath])).toBe(0);

    // Design: the executor never mutates the source on a clustered split
    // (decompose SKILL.md Step 7 — "Confirm the source file remains unchanged").
    expect(await Bun.file(sourcePath).text()).toBe(originalContent);

    const shardA = await Bun.file(join(dir, SHARDS[0] as string)).text();
    expect(shardA).not.toContain("### D-1:");
    expect(shardA).toContain("D-700");
  });

  test("byte accountability: destinations concatenate to the source exactly", async () => {
    const { dir, planPath, originalContent } = await stageMultiClusterPlan();

    expect(await decomposeMain(["--plan", planPath])).toBe(0);

    const shards = await Promise.all(SHARDS.map((s) => Bun.file(join(dir, s)).text()));
    // De-mutate each shard, then join in range order: must recover the source
    // byte-for-byte (REQ-006 AC-2 mirror of recompose.ts contents.join("")).
    const reversed = shards.map((s) =>
      s.replace(/D-700/g, "D-1").replace(/D-701/g, "D-2").replace(/D-702/g, "D-3"),
    );
    expect(reversed.join("")).toBe(originalContent);
    expect(sha256(reversed.join(""))).toBe(sha256(originalContent));
  });

  test("decompose then recompose reproduces the original byte-for-byte", async () => {
    const { dir, sourcePath, planPath, originalContent } = await stageMultiClusterPlan();
    const originalHash = sha256(originalContent);

    expect(await decomposeMain(["--plan", planPath])).toBe(0);

    await copyFixture("multi-cluster-recompose-plan.yaml", dir);
    const recomposePlan = join(dir, "multi-cluster-recompose-plan.yaml");
    expect(await recomposeMain(["--plan", recomposePlan])).toBe(0);

    const recomposed = await Bun.file(sourcePath).text();
    expect(recomposed).toBe(originalContent);
    expect(sha256(recomposed)).toBe(originalHash);
  });

  test("audit log reports one entry per cluster with its range", async () => {
    const { planPath } = await stageMultiClusterPlan();
    const written: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    (process.stdout as { write: unknown }).write = (chunk: string) => {
      written.push(String(chunk));
      return true;
    };
    try {
      expect(await decomposeMain(["--plan", planPath])).toBe(0);
    } finally {
      (process.stdout as { write: unknown }).write = originalWrite;
    }

    const entries = written
      .join("")
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l) as Record<string, unknown>);

    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e["cluster_id"])).toEqual(["cluster-a", "cluster-b", "cluster-c"]);
    for (const entry of entries) {
      // Pre-existing audit fields must not break.
      expect(typeof entry["source_path"]).toBe("string");
      expect(entry["source_type"]).toBe("adr");
      expect(typeof entry["destination_path"]).toBe("string");
      expect(entry["destination_sha256"]).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

describe("decompose executor — byte-accountability failure modes", () => {
  test("a gap between cluster ranges aborts with exit 2 and writes nothing", async () => {
    const { dir, sourcePath, originalContent } = await stageMultiClusterPlan();
    // Lines 32-37 (cluster B's region) are unaccounted for.
    const planPath = await writePlan(
      dir,
      "gapped-plan.yaml",
      [
        "  cluster-a:",
        "    destination_path: gap-shard-a.md",
        "    range:",
        "      start: 1",
        "      end: 31",
        "  cluster-c:",
        "    destination_path: gap-shard-c.md",
        "    range:",
        "      start: 38",
        "      end: -1",
      ].join("\n"),
    );

    expect(await decomposeMain(["--plan", planPath])).toBe(2);
    expect(await exists(join(dir, "gap-shard-a.md"))).toBe(false);
    expect(await exists(join(dir, "gap-shard-c.md"))).toBe(false);
    expect(await exists(join(dir, "gap-shard-a.md.tmp"))).toBe(false);
    expect(await exists(join(dir, "gap-shard-c.md.tmp"))).toBe(false);
    expect(await Bun.file(sourcePath).text()).toBe(originalContent);
  });

  test("overlapping cluster ranges abort with exit 2 and write nothing", async () => {
    const { dir } = await stageMultiClusterPlan();
    const planPath = await writePlan(
      dir,
      "overlap-plan.yaml",
      [
        "  cluster-a:",
        "    destination_path: overlap-shard-a.md",
        "    range:",
        "      start: 1",
        "      end: 37",
        "  cluster-b:",
        "    destination_path: overlap-shard-b.md",
        "    range:",
        "      start: 32",
        "      end: -1",
      ].join("\n"),
    );

    expect(await decomposeMain(["--plan", planPath])).toBe(2);
    expect(await exists(join(dir, "overlap-shard-a.md"))).toBe(false);
    expect(await exists(join(dir, "overlap-shard-b.md"))).toBe(false);
  });

  test("a cluster range that does not start at line 1 aborts with exit 2", async () => {
    const { dir } = await stageMultiClusterPlan();
    const planPath = await writePlan(
      dir,
      "truncated-plan.yaml",
      [
        "  cluster-b:",
        "    destination_path: trunc-shard-b.md",
        "    range:",
        "      start: 32",
        "      end: -1",
      ].join("\n"),
    );

    expect(await decomposeMain(["--plan", planPath])).toBe(2);
    expect(await exists(join(dir, "trunc-shard-b.md"))).toBe(false);
  });

  test("a cluster without a range is rejected as a validation error (exit 1)", async () => {
    const { dir } = await stageMultiClusterPlan();
    // `identifiers`-driven extraction is not defined by the adapter contract
    // (ADR-002 D-2 exposes extractByRange only), so the executor refuses.
    const planPath = await writePlan(
      dir,
      "identifier-only-plan.yaml",
      [
        "  cluster-a:",
        "    destination_path: ident-shard-a.md",
        "    identifiers:",
        '      - "D-700"',
      ].join("\n"),
    );

    expect(await decomposeMain(["--plan", planPath])).toBe(1);
    expect(await exists(join(dir, "ident-shard-a.md"))).toBe(false);
  });
});

describe("decompose executor — preserved behaviour", () => {
  test("zero-cluster plan still renumbers the source in place", async () => {
    const dir = mkdtempSync(join(tmpdir(), "decompose-degenerate-"));
    await copyFixture("adr-round-trip.md", dir);
    await copyFixture("adr-decompose-plan.yaml", dir);
    const sourcePath = join(dir, "adr-round-trip.md");
    const planPath = join(dir, "adr-decompose-plan.yaml");

    expect(await decomposeMain(["--plan", planPath])).toBe(0);

    const rewritten = await Bun.file(sourcePath).text();
    expect(rewritten).toContain("D-500");
    expect(rewritten).toContain("D-501");
    expect(rewritten).not.toContain("### D-1:");
  });

  test("absolute destination_path is rejected by the path guard (exit 1)", async () => {
    const { dir } = await stageMultiClusterPlan();
    const planPath = await writePlan(
      dir,
      "absolute-dest-plan.yaml",
      [
        "  cluster-a:",
        "    destination_path: /etc/passwd",
        "    range:",
        "      start: 1",
        "      end: -1",
      ].join("\n"),
    );

    expect(await decomposeMain(["--plan", planPath])).toBe(1);
  });

  test("traversal in destination_path is rejected by the path guard (exit 1)", async () => {
    const { dir } = await stageMultiClusterPlan();
    const planPath = await writePlan(
      dir,
      "traversal-dest-plan.yaml",
      [
        "  cluster-a:",
        "    destination_path: ../escaped-shard.md",
        "    range:",
        "      start: 1",
        "      end: -1",
      ].join("\n"),
    );

    expect(await decomposeMain(["--plan", planPath])).toBe(1);
    expect(await exists(join(dir, "..", "escaped-shard.md"))).toBe(false);
  });
});
