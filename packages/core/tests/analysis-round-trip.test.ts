import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { AnalysisAdapter } from "@acmelabs/core/adapters/analysis";
import { sha256 } from "@acmelabs/core/core/hash";
import type { MutationSpec } from "@acmelabs/core/core/types";

const adapter = new AnalysisAdapter();
const fixtureDir = join(import.meta.dir, "..", "..", "fixtures");
const originalContent = await Bun.file(join(fixtureDir, "analysis-sample.md")).text();

const distributionSpec: MutationSpec = {
  renumber_map: {
    "item-1": "item-100",
    "item-2": "item-101",
    "item-3": "item-200",
    "item-4": "item-201",
  },
  wikilink_map: {},
};

describe("ANALYSIS round-trip property tests (THE PROOF)", () => {
  test("precondition: parse → serialize preserves content structurally", () => {
    const ast = adapter.parse(originalContent);
    const serialized = adapter.serialize(ast);
    // remark-stringify normalizes whitespace; re-parse and re-serialize must be idempotent
    const ast2 = adapter.parse(serialized);
    const serialized2 = adapter.serialize(ast2);
    expect(serialized2).toBe(serialized);
  });

  test("precondition: applyMutations → reverseMutations is identity (renumber_map)", () => {
    const mutated = adapter.applyMutations(originalContent, distributionSpec);
    const recovered = adapter.reverseMutations(mutated, distributionSpec);
    expect(recovered).toBe(originalContent);
  });

  test("applyMutations with distribution spec renumbers item-1..item-4", () => {
    const mutated = adapter.applyMutations(originalContent, distributionSpec);
    expect(mutated).toContain("item-100");
    expect(mutated).toContain("item-101");
    expect(mutated).toContain("item-200");
    expect(mutated).toContain("item-201");
    // The original "### item-1:" header is gone — every item-1 now reads as item-100
    expect(mutated).not.toContain("### item-1:");
  });

  test("THE PROOF: SHA-256(original) === SHA-256(decompose → recompose)", () => {
    // Decompose: apply distribution mutations
    const distributed = adapter.applyMutations(originalContent, distributionSpec);
    // Recompose: apply composition mutations (inverse)
    const recomposed = adapter.reverseMutations(distributed, distributionSpec);
    // THE PROOF
    expect(sha256(recomposed)).toBe(sha256(originalContent));
    expect(recomposed).toBe(originalContent);
  });
});
