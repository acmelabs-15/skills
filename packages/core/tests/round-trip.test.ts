import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { AdrAdapter } from "@acmelabs/core/adapters/adr";
import { sha256 } from "@acmelabs/core/core/hash";
import type { MutationSpec } from "@acmelabs/core/core/types";

const adapter = new AdrAdapter();
const fixtureDir = join(import.meta.dir, "..", "..", "fixtures");
const originalContent = await Bun.file(join(fixtureDir, "adr-sample.md")).text();

const distributionSpec: MutationSpec = {
  renumber_map: { "D-1": "D-100", "D-2": "D-101", "D-3": "D-200", "D-4": "D-201" },
  wikilink_map: {},
};

describe("round-trip property tests (THE PROOF)", () => {
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

  test("applyMutations with distribution spec renumbers D-1..D-4 to D-100..D-201", () => {
    const mutated = adapter.applyMutations(originalContent, distributionSpec);
    expect(mutated).toContain("D-100");
    expect(mutated).toContain("D-101");
    expect(mutated).toContain("D-200");
    expect(mutated).toContain("D-201");
    expect(mutated).not.toContain("D-1:"); // original D-1: prefix gone
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
