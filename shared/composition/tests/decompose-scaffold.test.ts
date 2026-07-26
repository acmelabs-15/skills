/**
 * SPEC-005 — scaffolded destinations and retained ranges in the decompose executor.
 *
 * R1: every written destination is a standalone canonical Brain note — frontmatter
 * + H1 at the head, the checksummed source slice as the body, and trailing
 * `## Observations` + `## Relations`. All scaffolding is excluded from both byte
 * proofs, which stay exactly as strong over the content slices.
 *
 * R2: the source's own frontmatter/H1 and trailing Observations/Relations are
 * accounted for by the strict coverage proof WITHOUT being forced verbatim into a
 * child — they are covered by clusters with `disposition: retain`, which are
 * extracted and counted but never written.
 */
import { describe, expect, test } from "bun:test";
// mkdtemp is a directory op with no Bun equivalent; all content I/O is Bun-native.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type ClusterScaffold, stripScaffold } from "../src/core/cluster-scaffold.js";
import { sha256 } from "../src/core/hash.js";
import { main as decomposeMain } from "../src/decompose.js";

const fixtureDir = join(import.meta.dir, "fixtures");
const exists = (p: string): Promise<boolean> => Bun.file(p).exists();

/** Mirrors the `scaffold:` blocks in SCAFFOLDED_PLAN below, per shard letter. */
function scaffoldFor(letter: "a" | "b" | "c"): ClusterScaffold {
  const upper = letter.toUpperCase();
  const position = { a: "first", b: "middle", c: "final" }[letter];
  return {
    frontmatter: {
      title: `ADR-098${letter}: Cluster ${upper}`,
      type: "decision",
      status: "ACCEPTED",
      permalink: `decisions/adr-098${letter}-cluster-${letter}`,
      tags: ["fixture", `cluster-${letter}`],
    },
    observations: [
      {
        category: "decision",
        text: `Cluster ${upper} carries the ${position} decision body`,
        tags: ["split"],
      },
    ],
    relations: [{ verb: "part_of", target: "ADR-098: Multi-Cluster Round-Trip Fixture" }],
  };
}

/** Stage the multi-cluster fixture note into an isolated workspace. */
async function stageSource(): Promise<{ dir: string; sourcePath: string; original: string }> {
  const dir = mkdtempSync(join(tmpdir(), "decompose-scaffold-"));
  const sourcePath = join(dir, "multi-cluster-round-trip.md");
  await Bun.write(Bun.file(sourcePath), Bun.file(join(fixtureDir, "multi-cluster-round-trip.md")));
  return { dir, sourcePath, original: await Bun.file(sourcePath).text() };
}

async function writePlan(dir: string, name: string, body: string): Promise<string> {
  const planPath = join(dir, name);
  await Bun.write(planPath, body);
  return planPath;
}

/**
 * Fond-shaped plan: source lines 1-24 (frontmatter, H1, Context, `## Decision`)
 * and 44-EOF (the source's own Observations + Relations) are RETAINED in the
 * source; the three decision bodies become standalone scaffolded child notes.
 */
const SCAFFOLDED_PLAN = `plan_type: distribution
source_type: adr
source_path: multi-cluster-round-trip.md
renumber_map:
  "D-1": "D-700"
  "D-2": "D-701"
  "D-3": "D-702"
wikilink_map: {}
clusters:
  head:
    description: "frontmatter + H1 + Context + Decision heading — stays in the source"
    disposition: retain
    range:
      start: 1
      end: 24
  child-a:
    destination_path: shard-a.md
    range:
      start: 25
      end: 31
    scaffold:
      frontmatter:
        title: "ADR-098a: Cluster A"
        type: decision
        status: ACCEPTED
        permalink: decisions/adr-098a-cluster-a
        tags:
          - fixture
          - cluster-a
      observations:
        - category: decision
          text: "Cluster A carries the first decision body"
          tags:
            - split
      relations:
        - verb: part_of
          target: "ADR-098: Multi-Cluster Round-Trip Fixture"
  child-b:
    destination_path: shard-b.md
    range:
      start: 32
      end: 37
    scaffold:
      frontmatter:
        title: "ADR-098b: Cluster B"
        type: decision
        status: ACCEPTED
        permalink: decisions/adr-098b-cluster-b
        tags:
          - fixture
          - cluster-b
      observations:
        - category: decision
          text: "Cluster B carries the middle decision body"
          tags:
            - split
      relations:
        - verb: part_of
          target: "ADR-098: Multi-Cluster Round-Trip Fixture"
  child-c:
    destination_path: shard-c.md
    range:
      start: 38
      end: 43
    scaffold:
      frontmatter:
        title: "ADR-098c: Cluster C"
        type: decision
        status: ACCEPTED
        permalink: decisions/adr-098c-cluster-c
        tags:
          - fixture
          - cluster-c
      observations:
        - category: decision
          text: "Cluster C carries the final decision body"
          tags:
            - split
      relations:
        - verb: part_of
          target: "ADR-098: Multi-Cluster Round-Trip Fixture"
  tail:
    description: "the source's own Observations + Relations — stays in the source"
    disposition: retain
    range:
      start: 44
      end: -1
`;

describe("decompose executor — scaffolded destinations (R1)", () => {
  test("each written destination is a standalone canonical Brain note", async () => {
    const { dir } = await stageSource();
    const planPath = await writePlan(dir, "scaffolded.yaml", SCAFFOLDED_PLAN);

    expect(await decomposeMain(["--plan", planPath])).toBe(0);

    const shardA = await Bun.file(join(dir, "shard-a.md")).text();

    // Head: frontmatter block, then an H1 matching the title.
    expect(shardA.startsWith("---\n")).toBe(true);
    expect(shardA).toContain('title: "ADR-098a: Cluster A"');
    expect(shardA).toContain("type: decision");
    expect(shardA).toContain("permalink: decisions/adr-098a-cluster-a");
    expect(shardA).toContain("# ADR-098a: Cluster A");

    // Body: the verbatim (mutated) source slice.
    expect(shardA).toContain("### D-700: Cluster A");

    // Tail: Observations then Relations, in that order, as the final two sections.
    expect(shardA).toContain("- [decision] Cluster A carries the first decision body #split");
    expect(shardA).toContain("- part_of [[ADR-098: Multi-Cluster Round-Trip Fixture]]");
    expect(shardA.indexOf("## Observations")).toBeLessThan(shardA.indexOf("## Relations"));
    expect(shardA.trimEnd().split("\n").at(-1)).toContain("part_of");
  });

  test("H1 always matches the frontmatter title across every shard", async () => {
    const { dir } = await stageSource();
    const planPath = await writePlan(dir, "scaffolded.yaml", SCAFFOLDED_PLAN);
    expect(await decomposeMain(["--plan", planPath])).toBe(0);

    for (const [file, title] of [
      ["shard-a.md", "ADR-098a: Cluster A"],
      ["shard-b.md", "ADR-098b: Cluster B"],
      ["shard-c.md", "ADR-098c: Cluster C"],
    ] as const) {
      const content = await Bun.file(join(dir, file)).text();
      expect(content).toContain(`title: "${title}"`);
      expect(content).toContain(`\n# ${title}\n`);
    }
  });
});

describe("decompose executor — retained ranges (R2)", () => {
  test("retained clusters are counted for coverage but never written", async () => {
    const { dir, sourcePath, original } = await stageSource();
    const planPath = await writePlan(dir, "scaffolded.yaml", SCAFFOLDED_PLAN);

    expect(await decomposeMain(["--plan", planPath])).toBe(0);

    // No file is produced for a retained cluster, under any plausible name.
    expect(await exists(join(dir, "head.md"))).toBe(false);
    expect(await exists(join(dir, "tail.md"))).toBe(false);
    // The source keeps its frontmatter, H1 and trailing sections, unmodified.
    expect(await Bun.file(sourcePath).text()).toBe(original);
  });

  test("a plan whose written clusters alone leave a gap still passes coverage via retention", async () => {
    // Written clusters cover only lines 25-43; retention accounts for 1-24 and
    // 44-EOF. Without the retained clusters this plan would abort with exit 2.
    const { dir } = await stageSource();
    const planPath = await writePlan(dir, "scaffolded.yaml", SCAFFOLDED_PLAN);
    expect(await decomposeMain(["--plan", planPath])).toBe(0);
    expect(await exists(join(dir, "shard-a.md"))).toBe(true);
  });

  test("dropping a retained cluster reopens the gap and aborts with exit 2", async () => {
    const { dir } = await stageSource();
    const withoutTail = SCAFFOLDED_PLAN.slice(0, SCAFFOLDED_PLAN.indexOf("  tail:"));
    const planPath = await writePlan(dir, "no-tail.yaml", withoutTail);

    expect(await decomposeMain(["--plan", planPath])).toBe(2);
    expect(await exists(join(dir, "shard-a.md"))).toBe(false);
    expect(await exists(join(dir, "shard-a.md.tmp"))).toBe(false);
  });

  test("a retained cluster may not also declare a destination_path", async () => {
    const { dir } = await stageSource();
    const conflicting = SCAFFOLDED_PLAN.replace(
      '    description: "frontmatter + H1 + Context + Decision heading — stays in the source"\n    disposition: retain',
      "    destination_path: head.md\n    disposition: retain",
    );
    const planPath = await writePlan(dir, "conflicting.yaml", conflicting);

    expect(await decomposeMain(["--plan", planPath])).toBe(1);
    expect(await exists(join(dir, "head.md"))).toBe(false);
  });
});

describe("decompose executor — byte proofs stay as strong with scaffolding", () => {
  test("de-scaffolded, de-mutated shards plus retained ranges reconstruct the source", async () => {
    const { dir, original } = await stageSource();
    const planPath = await writePlan(dir, "scaffolded.yaml", SCAFFOLDED_PLAN);
    expect(await decomposeMain(["--plan", planPath])).toBe(0);

    const sourceLines = original.split("\n");
    const sliceOf = (start: number, end: number): string => {
      const endIdx = end === -1 ? sourceLines.length : end;
      const text = sourceLines.slice(start - 1, endIdx).join("\n");
      return endIdx < sourceLines.length ? `${text}\n` : text;
    };

    // Recover each written shard's body via the same verified strip the executor
    // and recompose use (independently unit-tested in cluster-scaffold.test.ts),
    // then undo the renumber. Retained ranges come straight from the source.
    const bodies: string[] = [];
    for (const [file, letter] of [
      ["shard-a.md", "a"],
      ["shard-b.md", "b"],
      ["shard-c.md", "c"],
    ] as const) {
      const content = await Bun.file(join(dir, file)).text();
      const stripped = stripScaffold(scaffoldFor(letter), content);
      expect(stripped.ok).toBe(true);
      if (!stripped.ok) throw new Error(stripped.reason);
      bodies.push(
        stripped.body.replace(/D-700/g, "D-1").replace(/D-701/g, "D-2").replace(/D-702/g, "D-3"),
      );
    }

    const reconstructed = sliceOf(1, 24) + bodies.join("") + sliceOf(44, -1);
    expect(reconstructed).toBe(original);
    expect(sha256(reconstructed)).toBe(sha256(original));
  });

  test("audit log reports the disposition of every cluster", async () => {
    const { dir } = await stageSource();
    const planPath = await writePlan(dir, "scaffolded.yaml", SCAFFOLDED_PLAN);

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

    // One entry per cluster, in range order, each declaring its disposition.
    expect(entries.map((e) => e["cluster_id"])).toEqual([
      "head",
      "child-a",
      "child-b",
      "child-c",
      "tail",
    ]);
    expect(entries.map((e) => e["disposition"])).toEqual([
      "retain",
      "write",
      "write",
      "write",
      "retain",
    ]);

    // Retained entries carry no destination; written entries always do.
    const [head] = entries;
    expect(head?.["destination_path"]).toBeUndefined();
    for (const entry of entries.filter((e) => e["disposition"] === "write")) {
      expect(typeof entry["destination_path"]).toBe("string");
      expect(entry["destination_sha256"]).toMatch(/^[0-9a-f]{64}$/);
      // The slice hash is the F-8 subject and excludes the scaffolding.
      expect(entry["source_segment_sha256"]).toMatch(/^[0-9a-f]{64}$/);
      expect(entry["destination_sha256"]).not.toBe(entry["source_segment_sha256"]);
    }
  });

  test("unscaffolded plans are unaffected — full byte-identical partition preserved", async () => {
    const { dir, original } = await stageSource();
    await Bun.write(
      Bun.file(join(dir, "multi-cluster-decompose-plan.yaml")),
      Bun.file(join(fixtureDir, "multi-cluster-decompose-plan.yaml")),
    );
    const planPath = join(dir, "multi-cluster-decompose-plan.yaml");
    expect(await decomposeMain(["--plan", planPath])).toBe(0);

    const shards = await Promise.all(
      ["multi-cluster-shard-a.md", "multi-cluster-shard-b.md", "multi-cluster-shard-c.md"].map(
        (s) => Bun.file(join(dir, s)).text(),
      ),
    );
    const reversed = shards.map((s) =>
      s.replace(/D-700/g, "D-1").replace(/D-701/g, "D-2").replace(/D-702/g, "D-3"),
    );
    expect(reversed.join("")).toBe(original);
  });
});
