/**
 * SPEC-005 — recompose inverse for scaffolded shards.
 *
 * A scaffolded destination is `prologue + content slice + epilogue`. For the
 * decompose/recompose pair to stay coherent, the merge direction must strip the
 * same planned scaffolding before joining, so what it concatenates is exactly the
 * set of content slices the split preserved.
 *
 * Scope boundary — scaffolding and retention are NOT one class, and an earlier
 * version of this comment wrongly fused them:
 *
 *  - **Scaffolding is reversible.** `stripScaffold` is an exact inverse of
 *    `assembleScaffolded`, so a scaffolded, retention-free plan round-trips
 *    BYTE-IDENTICALLY end to end — asserted below and verified through the real
 *    CLI. The condition is that the composition plan restates the identical
 *    scaffold; recovery is conditional, not impossible.
 *  - **Retention is irreversible by construction.** Retained content lives only
 *    in the source and appears in no shard, so no merge over shards alone can
 *    reproduce the original. What recompose recovers there is the concatenation
 *    of the written content slices.
 *
 * The earlier wording ("the full round trip holds only for no-scaffold /
 * no-retention plans") was false for the scaffold half, and its predecessor
 * called slice-concatenation "the strongest statement that remains true" — an
 * unproven absolute. Recording a shipped capability as impossible invites
 * someone to build a second recovery path or to declare shards unrecoverable.
 * Every claim kept here is one these tests demonstrate.
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assembleScaffolded } from "@acmelabs/core/core/cluster-scaffold";
import { sha256 } from "@acmelabs/core/core/hash";
import { main as decomposeMain } from "@acmelabs/cli/decompose";
import { main as recomposeMain } from "@acmelabs/cli/recompose";

const shardScaffold = (letter: string) => ({
  frontmatter: {
    title: `ADR-098${letter}: Cluster ${letter.toUpperCase()}`,
    type: "decision",
    status: "ACCEPTED",
    permalink: `decisions/adr-098${letter}-cluster-${letter}`,
    tags: ["fixture", `cluster-${letter}`],
  },
  observations: [
    {
      category: "decision" as const,
      text: `Cluster ${letter.toUpperCase()} body`,
      tags: ["split"],
    },
  ],
  relations: [{ verb: "part_of" as const, target: "ADR-098: Multi-Cluster Round-Trip Fixture" }],
});

const scaffoldYaml = (letter: string, indent: string): string =>
  [
    `${indent}frontmatter:`,
    `${indent}  title: "ADR-098${letter}: Cluster ${letter.toUpperCase()}"`,
    `${indent}  type: decision`,
    `${indent}  status: ACCEPTED`,
    `${indent}  permalink: decisions/adr-098${letter}-cluster-${letter}`,
    `${indent}  tags:`,
    `${indent}    - fixture`,
    `${indent}    - cluster-${letter}`,
    `${indent}observations:`,
    `${indent}  - category: decision`,
    `${indent}    text: "Cluster ${letter.toUpperCase()} body"`,
    `${indent}    tags:`,
    `${indent}      - split`,
    `${indent}relations:`,
    `${indent}  - verb: part_of`,
    `${indent}    target: "ADR-098: Multi-Cluster Round-Trip Fixture"`,
  ].join("\n");

/** Bodies chosen so their concatenation is unambiguous and newline-exact. */
const BODIES = [
  "### D-700: A\n\nbody a\n\n",
  "### D-701: B\n\nbody b\n\n",
  "### D-702: C\n\nbody c\n",
];

async function stageShards(): Promise<{ dir: string }> {
  const dir = mkdtempSync(join(tmpdir(), "recompose-scaffold-"));
  const letters = ["a", "b", "c"];
  await Promise.all(
    letters.map((letter, i) =>
      Bun.write(
        join(dir, `shard-${letter}.md`),
        assembleScaffolded(shardScaffold(letter), BODIES[i] as string),
      ),
    ),
  );
  return { dir };
}

describe("recompose — scaffolded sources", () => {
  test("strips declared scaffolding and joins the content slices", async () => {
    const { dir } = await stageShards();
    const planPath = join(dir, "recompose.yaml");
    await Bun.write(
      planPath,
      [
        "plan_type: composition",
        "source_type: adr",
        "target_path: merged.md",
        "sources:",
        ...["a", "b", "c"].flatMap((letter) => [
          `  - path: shard-${letter}.md`,
          "    scaffold:",
          scaffoldYaml(letter, "      "),
        ]),
        "renumber_map:",
        '  "D-700": "D-1"',
        '  "D-701": "D-2"',
        '  "D-702": "D-3"',
        "wikilink_map: {}",
        "",
      ].join("\n"),
    );

    expect(await recomposeMain(["--plan", planPath])).toBe(0);

    const merged = await Bun.file(join(dir, "merged.md")).text();
    const expected = BODIES.join("")
      .replace(/D-700/g, "D-1")
      .replace(/D-701/g, "D-2")
      .replace(/D-702/g, "D-3");
    expect(merged).toBe(expected);
    expect(sha256(merged)).toBe(sha256(expected));
    // No scaffolding leaked into the merged output.
    expect(merged).not.toContain("## Observations");
    expect(merged).not.toContain("permalink:");
  });

  test("a source whose bytes do not carry the declared scaffolding aborts with exit 2", async () => {
    const { dir } = await stageShards();
    // Overwrite one shard with content that lacks its planned prologue.
    await Bun.write(join(dir, "shard-b.md"), "### D-701: B\n\nunscaffolded\n");
    const planPath = join(dir, "recompose.yaml");
    await Bun.write(
      planPath,
      [
        "plan_type: composition",
        "source_type: adr",
        "target_path: merged.md",
        "sources:",
        ...["a", "b", "c"].flatMap((letter) => [
          `  - path: shard-${letter}.md`,
          "    scaffold:",
          scaffoldYaml(letter, "      "),
        ]),
        "renumber_map:",
        '  "D-700": "D-1"',
        "wikilink_map: {}",
        "",
      ].join("\n"),
    );

    expect(await recomposeMain(["--plan", planPath])).toBe(2);
    expect(await Bun.file(join(dir, "merged.md")).exists()).toBe(false);
  });

  test("plain string sources still work unchanged (no scaffolding declared)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "recompose-plain-"));
    await Bun.write(join(dir, "a.md"), "alpha\n");
    await Bun.write(join(dir, "b.md"), "beta\n");
    const planPath = join(dir, "plain.yaml");
    await Bun.write(
      planPath,
      [
        "plan_type: composition",
        "source_type: adr",
        "target_path: merged.md",
        "sources:",
        "  - a.md",
        "  - b.md",
        "renumber_map: {}",
        "wikilink_map: {}",
        "",
      ].join("\n"),
    );

    expect(await recomposeMain(["--plan", planPath])).toBe(0);
    expect(await Bun.file(join(dir, "merged.md")).text()).toBe("alpha\nbeta\n");
  });
});

describe("scaffolded, retention-free plans round-trip byte-identically", () => {
  test("decompose then recompose reproduces the source exactly", async () => {
    // The claim three reviewers flagged as overstated in this file's earlier
    // header. Scaffolding is an exact inverse, so it is NOT a round-trip breaker;
    // only retention is. Asserted here so the comment cannot drift again.
    const dir = mkdtempSync(join(tmpdir(), "scaffold-roundtrip-"));
    const srcPath = join(dir, "src.md");
    const original =
      "---\ntitle: x\n---\n\n# X\n\n### D-1: one\n\nbody one\n\n### D-2: two\n\nbody two\n";
    await Bun.write(srcPath, original);

    const scaffoldBlock = (n: string, indent: string) =>
      [
        `${indent}scaffold:`,
        `${indent}  frontmatter: { title: "ADR-9${n}: Part ${n}", type: decision, status: ACCEPTED, permalink: d/adr-9${n}, tags: [x] }`,
        `${indent}  observations: [{ category: fact, text: Part ${n}, tags: [p] }]`,
        `${indent}  relations: [{ verb: part_of, target: "ADR-9: Parent" }]`,
      ].join("\n");

    await Bun.write(
      join(dir, "d.yaml"),
      [
        "plan_type: distribution",
        "source_type: adr",
        "source_path: src.md",
        'renumber_map: { "D-1": "D-700" }',
        "wikilink_map: {}",
        "clusters:",
        "  a:",
        "    destination_path: a.md",
        "    range: { start: 1, end: 9 }",
        scaffoldBlock("a", "    "),
        "  b:",
        "    destination_path: b.md",
        "    range: { start: 10, end: -1 }",
        scaffoldBlock("b", "    "),
        "",
      ].join("\n"),
    );
    await Bun.write(
      join(dir, "r.yaml"),
      [
        "plan_type: composition",
        "source_type: adr",
        "target_path: src.md",
        "sources:",
        "  - path: a.md",
        scaffoldBlock("a", "    "),
        "  - path: b.md",
        scaffoldBlock("b", "    "),
        'renumber_map: { "D-700": "D-1" }',
        "wikilink_map: {}",
        "",
      ].join("\n"),
    );

    expect(await decomposeMain(["--plan", join(dir, "d.yaml")])).toBe(0);
    expect(await recomposeMain(["--plan", join(dir, "r.yaml")])).toBe(0);

    const recovered = await Bun.file(srcPath).text();
    expect(recovered).toBe(original);
    expect(sha256(recovered)).toBe(sha256(original));
  });
});
