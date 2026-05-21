import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { specSubtreeCompositionPlanSchema } from "../schemas/composition/spec-subtree.plan.schema.js";
import {
  specSubtreeDistributionPlanSchema,
  specSubtreeManifestSchema,
} from "../schemas/distribution/spec-subtree.plan.schema.js";
import {
  SpecSubtreeAdapter,
  SubtreeHashValidationError,
  type SubtreeManifest,
} from "../src/adapters/spec-subtree.js";
import { sha256 } from "../src/core/hash.js";
import type { MutationSpec } from "../src/core/types.js";

const adapter = new SpecSubtreeAdapter();
const fixtureDir = join(import.meta.dir, "fixtures", "spec-subtree");

const rootContent = await Bun.file(join(fixtureDir, "SPEC-001-composition-core.md")).text();
const req001Content = await Bun.file(
  join(fixtureDir, "requirements", "REQ-001-SPEC-001-adapter-interface.md"),
).text();
const req002Content = await Bun.file(
  join(fixtureDir, "requirements", "REQ-002-SPEC-001-hash-utility.md"),
).text();
const design001Content = await Bun.file(
  join(fixtureDir, "design", "DESIGN-001-SPEC-001-adapter-architecture.md"),
).text();
const task001Content = await Bun.file(
  join(fixtureDir, "tasks", "TASK-001-SPEC-001-scaffold.md"),
).text();

const manifest: SubtreeManifest = {
  rootPath: "SPEC-001-composition-core.md",
  rootContent,
  children: [
    {
      relativePath: "requirements/REQ-001-SPEC-001-adapter-interface.md",
      content: req001Content,
      identifier: "REQ-001",
    },
    {
      relativePath: "requirements/REQ-002-SPEC-001-hash-utility.md",
      content: req002Content,
      identifier: "REQ-002",
    },
    {
      relativePath: "design/DESIGN-001-SPEC-001-adapter-architecture.md",
      content: design001Content,
      identifier: "DESIGN-001",
    },
    {
      relativePath: "tasks/TASK-001-SPEC-001-scaffold.md",
      content: task001Content,
      identifier: "TASK-001",
    },
  ],
};

const distributionSpec: MutationSpec = {
  renumber_map: {
    "REQ-001": "REQ-100",
    "REQ-002": "REQ-101",
    "DESIGN-001": "DESIGN-100",
    "TASK-001": "TASK-100",
    "SPEC-001": "SPEC-100",
  },
  wikilink_map: {
    "[[SPEC-001: Composition Core]]": "[[SPEC-100: Composition Core]]",
    "[[REQ-001-SPEC-001: Adapter Interface]]": "[[REQ-100-SPEC-100: Adapter Interface]]",
    "[[REQ-002-SPEC-001: Hash Utility]]": "[[REQ-101-SPEC-100: Hash Utility]]",
    "[[DESIGN-001-SPEC-001: Adapter Architecture]]":
      "[[DESIGN-100-SPEC-100: Adapter Architecture]]",
    "[[TASK-001-SPEC-001: Scaffold Adapter]]": "[[TASK-100-SPEC-100: Scaffold Adapter]]",
  },
};

describe("SPEC subtree round-trip property tests", () => {
  test("sourceType is 'spec'", () => {
    expect(adapter.sourceType).toBe("spec");
  });

  test("single-file applyMutations + reverseMutations is identity", () => {
    const mutated = adapter.applyMutations(rootContent, distributionSpec);
    expect(mutated).not.toBe(rootContent);
    const restored = adapter.reverseMutations(mutated, distributionSpec);
    expect(restored).toBe(rootContent);
  });

  test("applySubtreeMutations applies mutations to root + all children", () => {
    const mutated = adapter.applySubtreeMutations(manifest, distributionSpec);
    expect(mutated.children).toHaveLength(4);
    expect(mutated.rootContent).toContain("SPEC-100");
    expect(mutated.rootContent).toContain("REQ-100");
    expect(mutated.rootContent).toContain("DESIGN-100");
    expect(mutated.rootContent).toContain("TASK-100");
    expect(mutated.rootContent).not.toContain("SPEC-001");
    for (const child of mutated.children) {
      expect(child.content).toContain("SPEC-100");
    }
  });

  test("applySubtreeMutations + reverseSubtreeMutations is identity for all files", () => {
    const mutated = adapter.applySubtreeMutations(manifest, distributionSpec);
    const mutatedManifest: SubtreeManifest = {
      rootPath: manifest.rootPath,
      rootContent: mutated.rootContent,
      children: mutated.children.map((c, i) => ({
        relativePath: c.relativePath,
        content: c.content,
        identifier: manifest.children[i]?.identifier ?? "",
      })),
    };
    const recovered = adapter.reverseSubtreeMutations(mutatedManifest, distributionSpec);
    expect(recovered.rootContent).toBe(manifest.rootContent);
    for (let i = 0; i < manifest.children.length; i++) {
      expect(recovered.children[i]?.content).toBe(manifest.children[i]?.content);
    }
  });

  test("THE PROOF: per-file SHA-256 identity across full subtree decompose → recompose", () => {
    // If validateSubtreeRoundTrip throws, the proof fails. The hash-equality
    // check is per-file (root + every child) and any mismatch surfaces with
    // the failing path.
    expect(() => adapter.validateSubtreeRoundTrip(manifest, distributionSpec)).not.toThrow();
  });

  test("THE PROOF (explicit per-file hash assertion)", () => {
    const mutated = adapter.applySubtreeMutations(manifest, distributionSpec);
    const recoveredRoot = adapter.reverseMutations(mutated.rootContent, distributionSpec);
    expect(sha256(recoveredRoot)).toBe(sha256(manifest.rootContent));
    for (let i = 0; i < manifest.children.length; i++) {
      const origChild = manifest.children[i];
      const mutChild = mutated.children[i];
      if (!origChild || !mutChild) continue;
      const recoveredChild = adapter.reverseMutations(mutChild.content, distributionSpec);
      expect(sha256(recoveredChild)).toBe(sha256(origChild.content));
    }
  });

  test("SubtreeHashValidationError is thrown when round-trip fails", () => {
    // Force a non-recoverable mutation: map two distinct keys to the SAME
    // value. invertMap is lossy on non-injective maps (one key wins; the
    // other entry is dropped), so applying then reversing collapses the
    // collided identifiers and the round-trip fails.
    const nonInjectiveSpec: MutationSpec = {
      renumber_map: { "REQ-001": "REQ-999", "REQ-002": "REQ-999" },
      wikilink_map: {},
    };
    expect(() => adapter.validateSubtreeRoundTrip(manifest, nonInjectiveSpec)).toThrow(
      SubtreeHashValidationError,
    );
  });

  // Schema-shape tests below exercise the ADR-002 D-5 manifest shape
  // (root + children, per-entry mutations, optional filename_rewrite_map).
  // Per-AC coverage and rejection cases live in spec-subtree-schema.test.ts;
  // these tests anchor the schema against real fixture content.

  test("schema validates a manifest derived from fixture content (ADR-002 D-5 shape)", () => {
    const validManifest = {
      root: {
        source_path: `docs/specs/SPEC-001-composition-core/${manifest.rootPath}`,
        mutations: distributionSpec,
      },
      children: manifest.children.map((c) => ({
        source_path: `docs/specs/SPEC-001-composition-core/${c.relativePath}`,
        dest_path: `docs/specs/SPEC-100-composition-core/${c.relativePath.replace(/SPEC-001/g, "SPEC-100").replace(/-001-/g, "-100-")}`,
        mutations: distributionSpec,
      })),
    };
    const result = specSubtreeManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
  });

  test("schema validates a full distribution plan derived from fixture content", () => {
    const plan = {
      plan_type: "distribution" as const,
      source_type: "spec" as const,
      subtree_manifest: {
        root: {
          source_path: `docs/specs/SPEC-001-composition-core/${manifest.rootPath}`,
          mutations: distributionSpec,
        },
        children: manifest.children.map((c) => ({
          source_path: `docs/specs/SPEC-001-composition-core/${c.relativePath}`,
          dest_path: `docs/specs/SPEC-100-composition-core/${c.relativePath.replace(/SPEC-001/g, "SPEC-100").replace(/-001-/g, "-100-")}`,
          mutations: distributionSpec,
        })),
      },
    };
    const result = specSubtreeDistributionPlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
  });

  test("composition plan YAML fixture validates against specSubtreeCompositionPlanSchema", async () => {
    const yaml = await import("js-yaml");
    const yamlText = await Bun.file(
      join(import.meta.dir, "fixtures", "spec-subtree-composition.plan.yaml"),
    ).text();
    const parsed = yaml.load(yamlText) as {
      plan_type: string;
      source_type: string;
      subtree_manifest: { root: unknown; children: unknown[] };
    };
    const result = specSubtreeCompositionPlanSchema.safeParse(parsed);
    expect(result.success).toBe(true);
    expect(parsed.plan_type).toBe("composition");
    expect(parsed.source_type).toBe("spec");
    expect(parsed.subtree_manifest.children).toHaveLength(4);
  });

  test("distribution plan YAML fixture validates against specSubtreeDistributionPlanSchema", async () => {
    const yaml = await import("js-yaml");
    const yamlText = await Bun.file(
      join(import.meta.dir, "fixtures", "spec-subtree-distribution.plan.yaml"),
    ).text();
    const parsed = yaml.load(yamlText) as {
      plan_type: string;
      source_type: string;
      subtree_manifest: { root: unknown; children: unknown[] };
    };
    const result = specSubtreeDistributionPlanSchema.safeParse(parsed);
    expect(result.success).toBe(true);
    expect(parsed.plan_type).toBe("distribution");
    expect(parsed.source_type).toBe("spec");
    expect(parsed.subtree_manifest.children).toHaveLength(4);
  });

  test("composition plan YAML is the per-child mutations inverse of the distribution plan", async () => {
    const yaml = await import("js-yaml");
    type Plan = {
      subtree_manifest: {
        root: { mutations: { renumber_map: Record<string, string> } };
        children: { mutations: { renumber_map: Record<string, string> } }[];
      };
    };
    const dist = yaml.load(
      await Bun.file(
        join(import.meta.dir, "fixtures", "spec-subtree-distribution.plan.yaml"),
      ).text(),
    ) as Plan;
    const comp = yaml.load(
      await Bun.file(
        join(import.meta.dir, "fixtures", "spec-subtree-composition.plan.yaml"),
      ).text(),
    ) as Plan;
    // Per ADR-002 D-5: per-entry mutations. Distribution root K→V pairs
    // with composition root V→K.
    for (const [k, v] of Object.entries(dist.subtree_manifest.root.mutations.renumber_map)) {
      expect(comp.subtree_manifest.root.mutations.renumber_map[v]).toBe(k);
    }
    // And per-child entries pair likewise.
    expect(dist.subtree_manifest.children.length).toBe(comp.subtree_manifest.children.length);
    for (let i = 0; i < dist.subtree_manifest.children.length; i++) {
      const distChild = dist.subtree_manifest.children[i];
      const compChild = comp.subtree_manifest.children[i];
      if (!distChild || !compChild) continue;
      for (const [k, v] of Object.entries(distChild.mutations.renumber_map)) {
        expect(compChild.mutations.renumber_map[v]).toBe(k);
      }
    }
  });
});
