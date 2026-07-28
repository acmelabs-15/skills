/**
 * Canonical plan-schema surface (`schemas/index.ts`).
 *
 * This file previously exercised the `planSchema` discriminated union over the
 * per-type envelope wrappers. Those wrappers encoded the non-canonical
 * `sources[]` + `destinations[]` dialect, were loaded by nothing in production,
 * and were retired when the owner blessed the CLI dialect. The union went with
 * them — with one envelope there is nothing left to discriminate.
 *
 * What is asserted here now is the surface that survives: `index.ts` re-exports
 * the ONE canonical envelope, and `formatValidationErrors` shapes its errors.
 *
 * Coverage that moved rather than disappeared:
 *  - injective / disjoint map rejection → `plan-yaml-map-invariants.test.ts`
 *    (12 tests, both maps, both plan types) and `schema-primitives.test.ts`
 *    (invariants carried by the primitives themselves).
 *  - per-type refinements → the fragment tests in `spec-subtree-schema.test.ts`,
 *    `session-cross-source.test.ts`, and `plan-integrity-floor.test.ts`.
 */
import { describe, expect, test } from "bun:test";
import {
  type DistributionPlan,
  compositionPlanSchema,
  distributionPlanSchema,
  formatValidationErrors,
} from "@acmelabs/core/schemas/base-index";

const validDistribution = {
  plan_type: "distribution",
  source_type: "adr",
  source_path: "docs/decisions/ADR-001.md",
  renumber_map: { "D-1": "D-100" },
  wikilink_map: {},
  clusters: {
    "cluster-a": {
      destination_path: "docs/decisions/ADR-001a.md",
      range: { start: 1, end: -1 },
    },
  },
};

const validComposition = {
  plan_type: "composition",
  source_type: "adr",
  target_path: "docs/decisions/ADR-001.md",
  sources: ["docs/decisions/ADR-001a.md"],
  renumber_map: { "D-100": "D-1" },
  wikilink_map: {},
};

describe("canonical envelope re-exported from schemas/index.ts", () => {
  test("a valid distribution plan parses", async () => {
    const result = await distributionPlanSchema.safeParseAsync(validDistribution);
    expect(result.success).toBe(true);
  });

  test("a valid composition plan parses", async () => {
    const result = await compositionPlanSchema.safeParseAsync(validComposition);
    expect(result.success).toBe(true);
  });

  test("a missing required field is rejected", async () => {
    const { source_path, ...withoutSource } = validDistribution;
    void source_path;
    const result = await distributionPlanSchema.safeParseAsync(withoutSource);
    expect(result.success).toBe(false);
  });

  test("an unknown plan_type is rejected", async () => {
    const result = await distributionPlanSchema.safeParseAsync({
      ...validDistribution,
      plan_type: "teleport",
    });
    expect(result.success).toBe(false);
  });

  test("the index re-export is the same schema the CLI loads", async () => {
    // Guards the point of this consolidation: one envelope, not a copy of one.
    const { DistributionPlanSchema } = await import("@acmelabs/core/schemas/plan-yaml");
    expect(distributionPlanSchema).toBe(DistributionPlanSchema);
  });

  test("a parsed plan satisfies the exported DistributionPlan type", async () => {
    const parsed = await distributionPlanSchema.parseAsync(validDistribution);
    const typed: DistributionPlan = parsed;
    expect(typed.source_path).toBe("docs/decisions/ADR-001.md");
  });
});

describe("formatValidationErrors", () => {
  test("maps a ZodError into the PlanValidationError array shape", async () => {
    const result = await distributionPlanSchema.safeParseAsync({ plan_type: "distribution" });
    expect(result.success).toBe(false);
    if (result.success) return;

    const formatted = formatValidationErrors(result.error);
    expect(formatted.length).toBeGreaterThan(0);
    for (const issue of formatted) {
      expect(Array.isArray(issue.path)).toBe(true);
      expect(typeof issue.message).toBe("string");
      expect(issue.severity).toBe("error");
    }
  });
});
