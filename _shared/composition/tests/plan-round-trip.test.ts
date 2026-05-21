import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { IntegrityFloorError, PlanAdapter } from "../src/adapters/plan.js";
import { sha256 } from "../src/core/hash.js";
import type { MutationSpec } from "../src/core/types.js";

const adapter = new PlanAdapter();
const fixtureDir = join(import.meta.dir, "fixtures");
const originalContent = await Bun.file(join(fixtureDir, "plan-sample.md")).text();

const distributionSpec: MutationSpec = {
  renumber_map: {
    "SPEC-001": "SPEC-100",
    "SPEC-002": "SPEC-101",
    "SPEC-003": "SPEC-102",
    "SPEC-004": "SPEC-103",
    "SPEC-005": "SPEC-104",
  },
  wikilink_map: {},
  // Per TASK-009 DoD: include frontmatter_map in the round-trip distributionSpec under
  // the new old-VALUE -> new-VALUE semantics (REQ-004 AC-2). The inverse contract is
  // mechanical (invert the map on reverse), so apply-then-reverse remains identity.
  frontmatter_map: {
    '"PLAN-001: Composition Library Build-Out"': '"PLAN-001-renumbered: Composition Library Build-Out"',
    "planning/plan-001-composition-library": "planning/plan-001-renumbered-composition-library",
  },
  regenerated_sections: ["Progress Dashboard", "Cross-Part Dependency Graph"],
};

/**
 * Extract the content of the named `## Heading` sections from a PLAN document,
 * joined by a sentinel. Used to compare regenerated-section content across
 * mutated/original versions without depending on the surrounding context.
 */
function extractSections(content: string, headings: readonly string[]): string {
  const spans = adapter.findRegeneratedSpans(content, headings);
  return spans.map((s) => content.slice(s.start, s.end)).join("\n--SEP--\n");
}

/**
 * Remove the named `## Heading` sections from content, returning the rest.
 * Used to compute the hash-identity invariant on non-regenerated content only.
 */
function stripSections(content: string, headings: readonly string[]): string {
  const spans = adapter.findRegeneratedSpans(content, headings);
  if (spans.length === 0) return content;
  const parts: string[] = [];
  let cursor = 0;
  for (const span of spans) {
    parts.push(content.slice(cursor, span.start));
    cursor = span.end;
  }
  parts.push(content.slice(cursor));
  return parts.join("");
}

describe("PLAN adapter round-trip property tests (THE PROOF)", () => {
  test("precondition: parse → serialize idempotent (normalized)", () => {
    const ast = adapter.parse(originalContent);
    const serialized = adapter.serialize(ast);
    // remark-stringify normalizes whitespace; re-parse and re-serialize must be idempotent
    const ast2 = adapter.parse(serialized);
    const serialized2 = adapter.serialize(ast2);
    expect(serialized2).toBe(serialized);
  });

  test("applyMutations → reverseMutations is identity (excluding regenerated sections)", () => {
    const mutated = adapter.applyMutations(originalContent, distributionSpec);
    const recovered = adapter.reverseMutations(mutated, distributionSpec);
    expect(recovered).toBe(originalContent);
  });

  test("regenerated sections pass through unchanged during applyMutations", () => {
    const mutated = adapter.applyMutations(originalContent, distributionSpec);
    const originalSections = extractSections(originalContent, [
      "Progress Dashboard",
      "Cross-Part Dependency Graph",
    ]);
    const mutatedSections = extractSections(mutated, [
      "Progress Dashboard",
      "Cross-Part Dependency Graph",
    ]);
    expect(mutatedSections).toBe(originalSections);
    // Sanity: the original sections do contain pre-mutation identifiers
    expect(originalSections).toContain("SPEC-001");
    expect(originalSections).toContain("SPEC-001 --> SPEC-003");
  });

  test("applyMutations does rewrite identifiers OUTSIDE regenerated sections", () => {
    const mutated = adapter.applyMutations(originalContent, distributionSpec);
    // The Phase Progression checklist (outside regenerated) MUST be renumbered
    expect(mutated).toContain("- [x] build.SPEC-100");
    expect(mutated).toContain("- [x] build.SPEC-101");
    expect(mutated).toContain("- [ ] build.SPEC-102");
    // The contains relations MUST be renumbered
    expect(mutated).toContain("[[SPEC-100:");
    expect(mutated).toContain("[[SPEC-101:");
  });

  test("THE PROOF: SHA-256(original stripped) === SHA-256(decompose → recompose stripped)", () => {
    const distributed = adapter.applyMutations(originalContent, distributionSpec);
    const recomposed = adapter.reverseMutations(distributed, distributionSpec);

    // Hash identity on the full content (since regenerated sections are byte-identical
    // before/after the round trip, the full-content hash should match too)
    expect(sha256(recomposed)).toBe(sha256(originalContent));
    expect(recomposed).toBe(originalContent);

    // And on the stripped (non-regenerated) content alone
    const originalStripped = stripSections(originalContent, [
      "Progress Dashboard",
      "Cross-Part Dependency Graph",
    ]);
    const recomposedStripped = stripSections(recomposed, [
      "Progress Dashboard",
      "Cross-Part Dependency Graph",
    ]);
    expect(sha256(recomposedStripped)).toBe(sha256(originalStripped));
  });

  test("integrity floor: aggressively rewritten content with floor=0.99 raises IntegrityFloorError", () => {
    const strictAdapter = new PlanAdapter(0.99);
    // Renumber heavily so most non-regenerated lines differ between mutated and original
    const aggressiveSpec: MutationSpec = {
      renumber_map: {
        "SPEC-001": "SPEC-900",
        "SPEC-002": "SPEC-901",
        "SPEC-003": "SPEC-902",
        "SPEC-004": "SPEC-903",
        "SPEC-005": "SPEC-904",
        // also rewrite frequent words to perturb more lines
        composition: "COMPOSITION_X",
        adapter: "ADAPTER_X",
        Adapter: "AdapterX",
      },
      wikilink_map: {},
      regenerated_sections: ["Progress Dashboard", "Cross-Part Dependency Graph"],
    };
    const mutated = strictAdapter.applyMutations(originalContent, aggressiveSpec);
    expect(() => strictAdapter.reverseMutations(mutated, aggressiveSpec)).toThrow(
      IntegrityFloorError,
    );
  });

  test("integrity floor at default 0.5 succeeds for the standard distribution spec", () => {
    // Default 50% floor; the standard distribution spec only rewrites identifiers in
    // a small subset of lines, so reverseMutations recovers the original exactly.
    const defaultAdapter = new PlanAdapter();
    expect(defaultAdapter.integrityFloor).toBe(0.5);
    const mutated = defaultAdapter.applyMutations(originalContent, distributionSpec);
    const recovered = defaultAdapter.reverseMutations(mutated, distributionSpec);
    expect(recovered).toBe(originalContent);
  });
});
