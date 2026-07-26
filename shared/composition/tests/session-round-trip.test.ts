import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { z } from "zod";
import { crossSourceUpdateSchema } from "../schemas/distribution/session.plan.schema.js";

/**
 * Local container for exercising the SESSION cross-source fragment.
 *
 * The per-type envelope this used to ride on was retired (non-canonical
 * `destinations[]` dialect). The rules under test live entirely in
 * `crossSourceUpdateSchema`, so the container is declared here rather than
 * reintroducing a second envelope in the source tree.
 */
const sessionCrossSourceEnvelope = z
  .object({
    plan_type: z.literal("distribution"),
    source_type: z.literal("session"),
    cross_source_updates: z.array(crossSourceUpdateSchema).optional(),
  })
  .passthrough();
type SessionCrossSourcePlan = z.infer<typeof sessionCrossSourceEnvelope>;
import { SessionAdapter } from "../src/adapters/session.js";
import { sha256 } from "../src/core/hash.js";
import type { MutationSpec } from "../src/core/types.js";

const adapter = new SessionAdapter();
const fixtureDir = join(import.meta.dir, "fixtures");
const originalContent = await Bun.file(join(fixtureDir, "session-sample.md")).text();

const distributionSpec: MutationSpec = {
  renumber_map: {
    "Event-01": "Event-100",
    "Event-02": "Event-101",
    "Event-03": "Event-200",
    "Event-04": "Event-201",
  },
  wikilink_map: {},
};

describe("SESSION round-trip property tests (THE PROOF)", () => {
  test("precondition: parse → serialize preserves content structurally", () => {
    const ast = adapter.parse(originalContent);
    const serialized = adapter.serialize(ast);
    const ast2 = adapter.parse(serialized);
    const serialized2 = adapter.serialize(ast2);
    expect(serialized2).toBe(serialized);
  });

  test("precondition: applyMutations → reverseMutations is identity (renumber_map)", () => {
    const mutated = adapter.applyMutations(originalContent, distributionSpec);
    const recovered = adapter.reverseMutations(mutated, distributionSpec);
    expect(recovered).toBe(originalContent);
  });

  test("applyMutations with distribution spec renumbers Event-01..Event-04", () => {
    const mutated = adapter.applyMutations(originalContent, distributionSpec);
    expect(mutated).toContain("Event-100");
    expect(mutated).toContain("Event-101");
    expect(mutated).toContain("Event-200");
    expect(mutated).toContain("Event-201");
  });

  test("THE PROOF: SHA-256(original) === SHA-256(decompose → recompose)", () => {
    const distributed = adapter.applyMutations(originalContent, distributionSpec);
    const recomposed = adapter.reverseMutations(distributed, distributionSpec);
    expect(sha256(recomposed)).toBe(sha256(originalContent));
    expect(recomposed).toBe(originalContent);
  });

  test("cross_source_updates field validates correctly through the schema", () => {
    const plan: SessionCrossSourcePlan = {
      plan_type: "distribution",
      source_type: "session",
      sources: [{ path: "docs/sessions/SESSION-2026-05-20_01.md", range: { start: 1, end: -1 } }],
      destinations: [
        {
          path: "docs/sessions/SESSION-2026-05-20_01.md",
          range: { start: 30, end: 75 },
          mutations: distributionSpec,
        },
      ],
      cross_source_updates: [
        {
          target_source_type: "plan",
          target_path: "docs/planning/PLAN-001.md",
          frontmatter_map: { status: "IN_PROGRESS" },
        },
      ],
    };
    const parsed = sessionCrossSourceEnvelope.parse(plan);
    expect(parsed.cross_source_updates).toHaveLength(1);
    expect(parsed.cross_source_updates?.[0]?.target_source_type).toBe("plan");
  });
});
