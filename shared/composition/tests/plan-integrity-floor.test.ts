import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import { lineRangeSchema, mutationSpecSchema } from "../schemas/base.js";
import { planSourceEntrySchema } from "../schemas/distribution/plan.plan.schema.js";

/**
 * Local containers for exercising the PLAN integrity-floor rules.
 *
 * The per-type envelopes these rode on were retired (non-canonical
 * `destinations[]` dialect). The rules under test — `integrity_floor` bounds and
 * the `regenerated_sections` max-10 guard inside `mutationSpecSchema` — live in
 * the shared primitives, so the containers are declared here rather than
 * reintroducing a second envelope in the source tree.
 */
const planDestinationEntrySchema = z.object({
  path: z.string().min(1),
  content_hash: z.string().min(1),
});
const planDistributionPlanSchema = z.object({
  plan_type: z.literal("distribution"),
  source_type: z.literal("plan"),
  source: planSourceEntrySchema,
  destinations: z.array(planDestinationEntrySchema).min(1),
  mutations: mutationSpecSchema,
  integrity_floor: z.number().min(0).max(1).default(0.5),
});
const planCompositionPlanSchema = z.object({
  plan_type: z.literal("composition"),
  source_type: z.literal("plan"),
  source: planSourceEntrySchema,
  destinations: z.array(planDestinationEntrySchema).min(1),
  integrity_floor: z.number().min(0).max(1).default(0.5),
});
void lineRangeSchema;
import { IntegrityFloorError, PlanAdapter } from "../src/adapters/plan.js";
import type { MutationSpec } from "../src/core/types.js";
import { validateIntegrityFloor } from "../src/core/validate.js";

describe("PlanAdapter integrity floor (TASK-002)", () => {
  test("default integrity floor is 0.5", () => {
    const adapter = new PlanAdapter();
    expect(adapter.integrityFloor).toBe(0.5);
  });

  test("custom integrity floor is preserved", () => {
    const adapter = new PlanAdapter(0.9);
    expect(adapter.integrityFloor).toBe(0.9);
  });

  test("reverseMutations succeeds when preservation >= floor", () => {
    const adapter = new PlanAdapter(0.5);
    const content = `# PLAN-001: Example

Line A preserved.
Line B preserved.
SPEC-001 reference.
Line D preserved.
Line E preserved.
`;
    const mutations: MutationSpec = {
      renumber_map: { "SPEC-001": "SPEC-100" },
      wikilink_map: {},
    };
    const mutated = adapter.applyMutations(content, mutations);
    const restored = adapter.reverseMutations(mutated, mutations);
    expect(restored).toBe(content);
  });

  test("integrity floor at 0.99 with substantial rewrite throws IntegrityFloorError", () => {
    // Set a very high integrity floor; aggressively rewrite the content via a renumber map
    // that touches every line so the recovered text cannot match the (mutated) input.
    const adapter = new PlanAdapter(0.99);
    const content = `# PLAN-001: Example

Line A with SPEC-001.
Line B with SPEC-001.
Line C with SPEC-001.
Line D with SPEC-001.
Line E with SPEC-001.
`;
    const mutations: MutationSpec = {
      renumber_map: { "SPEC-001": "SPEC-999" },
      wikilink_map: {},
    };
    const mutated = adapter.applyMutations(content, mutations);
    // The reverseMutations input is `mutated`; the recovered output equals the original.
    // Since every non-trivial line in `mutated` differs from the corresponding line in
    // the original (SPEC-999 vs SPEC-001), the recovered text shares few lines with
    // `mutated`, breaching 99%.
    expect(() => adapter.reverseMutations(mutated, mutations)).toThrow(IntegrityFloorError);
  });

  test("IntegrityFloorError exposes preservedRatio and floor", () => {
    const err = new IntegrityFloorError(0.3, 0.5);
    expect(err.preservedRatio).toBe(0.3);
    expect(err.floor).toBe(0.5);
    expect(err.name).toBe("IntegrityFloorError");
    expect(err.message).toContain("30.0%");
    expect(err.message).toContain("50%");
  });
});

describe("PLAN Zod schemas (TASK-002)", () => {
  test("valid distribution plan passes", () => {
    const plan = {
      plan_type: "distribution",
      source_type: "plan",
      source: {
        path: "docs/planning/PLAN-001-example.md",
        hash: "abc123",
        range: { start: 1, end: -1 },
      },
      destinations: [{ path: "docs/planning/PLAN-001-part-a.md", content_hash: "def456" }],
      mutations: {
        renumber_map: { "SPEC-001": "SPEC-100" },
        wikilink_map: {},
        regenerated_sections: ["Progress Dashboard"],
      },
      integrity_floor: 0.5,
    };
    const result = planDistributionPlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
  });

  test("distribution plan defaults integrity_floor to 0.5", () => {
    const plan = {
      plan_type: "distribution",
      source_type: "plan",
      source: { path: "p.md", hash: "h", range: { start: 1, end: -1 } },
      destinations: [{ path: "d.md", content_hash: "h2" }],
      mutations: { renumber_map: {}, wikilink_map: {} },
    };
    const parsed = planDistributionPlanSchema.parse(plan);
    expect(parsed.integrity_floor).toBe(0.5);
  });

  test("distribution plan rejects non-injective renumber_map", () => {
    const plan = {
      plan_type: "distribution",
      source_type: "plan",
      source: { path: "p.md", hash: "h", range: { start: 1, end: -1 } },
      destinations: [{ path: "d.md", content_hash: "h2" }],
      mutations: {
        renumber_map: { A: "X", B: "X" }, // duplicate value
        wikilink_map: {},
      },
    };
    const result = planDistributionPlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  test("valid composition plan passes", () => {
    const plan = {
      plan_type: "composition",
      source_type: "plan",
      source: {
        path: "docs/planning/PLAN-001-part-a.md",
        hash: "abc",
        range: { start: 1, end: -1 },
        mutations: { renumber_map: { "SPEC-100": "SPEC-001" }, wikilink_map: {} },
      },
      destinations: [{ path: "docs/planning/PLAN-001-example.md", content_hash: "def" }],
    };
    const result = planCompositionPlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
  });

  test("distribution plan rejects regenerated_sections with >10 entries (TASK-008 max-10 schema guard)", () => {
    const plan = {
      plan_type: "distribution",
      source_type: "plan",
      source: { path: "p.md", hash: "h", range: { start: 1, end: -1 } },
      destinations: [{ path: "d.md", content_hash: "h2" }],
      mutations: {
        renumber_map: {},
        wikilink_map: {},
        regenerated_sections: Array.from({ length: 11 }, (_, i) => `Section ${i}`),
      },
    };
    const result = planDistributionPlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  test("distribution plan accepts regenerated_sections with exactly 10 entries", () => {
    const plan = {
      plan_type: "distribution",
      source_type: "plan",
      source: { path: "p.md", hash: "h", range: { start: 1, end: -1 } },
      destinations: [{ path: "d.md", content_hash: "h2" }],
      mutations: {
        renumber_map: {},
        wikilink_map: {},
        regenerated_sections: Array.from({ length: 10 }, (_, i) => `Section ${i}`),
      },
    };
    const result = planDistributionPlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
  });

  test("composition plan rejects integrity_floor outside [0,1]", () => {
    const plan = {
      plan_type: "composition",
      source_type: "plan",
      source: {
        path: "p.md",
        hash: "h",
        range: { start: 1, end: -1 },
        mutations: { renumber_map: {}, wikilink_map: {} },
      },
      destinations: [{ path: "d.md", content_hash: "h2" }],
      integrity_floor: 1.5,
    };
    const result = planCompositionPlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });
});

describe("validateIntegrityFloor source-coverage check (TASK-008 — REQ-003 AC-3/AC-4)", () => {
  test("rejects when regenerated_sections cover >50% of source lines", () => {
    // 12 total lines; Dashboard section spans 7 lines → 58%.
    const source = `# Plan
Line 1
Line 2
## Progress Dashboard
| col |
| --- |
| row1 |
| row2 |
| row3 |
| row4 |
Tail line A
Tail line B
`;
    const result = validateIntegrityFloor(source, ["Progress Dashboard"]);
    expect(result.valid).toBe(false);
    expect(result.coveragePercent).toBeGreaterThan(50);
    expect(result.message).toContain("Integrity floor violation");
  });

  test("accepts when regenerated_sections cover <50% of source lines", () => {
    const source = `# Plan
Line 1
Line 2
Line 3
Line 4
Line 5
Line 6
Line 7
Line 8
## Progress Dashboard
| col |
Tail
`;
    const result = validateIntegrityFloor(source, ["Progress Dashboard"]);
    expect(result.valid).toBe(true);
    expect(result.coveragePercent).toBeLessThan(50);
  });

  test("accepts exactly 50% coverage (REQ-003 AC-4 boundary)", () => {
    // 10 lines total, regen spans 5 → exactly 50%.
    const source = `Body A
Body B
Body C
Body D
Body E
## Progress Dashboard
row1
row2
row3
row4`;
    const result = validateIntegrityFloor(source, ["Progress Dashboard"]);
    expect(result.valid).toBe(true);
    expect(result.coveragePercent).toBeLessThanOrEqual(50);
  });
});

describe("PLAN fixture YAML parses against schemas (TASK-010 — DoD-2/DoD-4/DoD-6)", () => {
  test("plan-composition.plan.yaml fixture parses via planCompositionPlanSchema", async () => {
    const fixturePath = join(import.meta.dir, "fixtures", "plan-composition.plan.yaml");
    const raw = await Bun.file(fixturePath).text();
    const doc = yaml.load(raw);
    const result = planCompositionPlanSchema.safeParse(doc);
    expect(result.success).toBe(true);
  });

  test("plan-distribution.plan.yaml fixture parses via planDistributionPlanSchema", async () => {
    const fixturePath = join(import.meta.dir, "fixtures", "plan-distribution.plan.yaml");
    const raw = await Bun.file(fixturePath).text();
    const doc = yaml.load(raw);
    const result = planDistributionPlanSchema.safeParse(doc);
    expect(result.success).toBe(true);
  });
});

describe("findRegeneratedSpans H3 support (TASK-008 — REQ-002 AC-1)", () => {
  test("matches H3 regenerated section heading", () => {
    const adapter = new PlanAdapter();
    const content = `# Plan

## Body

Body line.

### Progress Dashboard

| col |
| --- |

## After

Tail.
`;
    const spans = adapter.findRegeneratedSpans(content, ["Progress Dashboard"]);
    expect(spans.length).toBe(1);
    const span = spans[0];
    if (!span) throw new Error("span unexpectedly undefined");
    const slice = content.slice(span.start, span.end);
    expect(slice).toContain("### Progress Dashboard");
    expect(slice).toContain("| col |");
    // Closes on next H2 (equal-or-higher level)
    expect(slice).not.toContain("## After");
    expect(slice).not.toContain("Tail.");
  });

  test("applyMutations skips H3 regenerated section content", () => {
    const adapter = new PlanAdapter();
    const content = `# Plan

## Body

SPEC-001 outside.

### Progress Dashboard

SPEC-001 inside dashboard.

## After

SPEC-001 also outside.
`;
    const mutations: MutationSpec = {
      renumber_map: { "SPEC-001": "SPEC-100" },
      wikilink_map: {},
      regenerated_sections: ["Progress Dashboard"],
    };
    const mutated = adapter.applyMutations(content, mutations);
    expect(mutated).toContain("SPEC-100 outside.");
    expect(mutated).toContain("SPEC-100 also outside.");
    expect(mutated).toContain("SPEC-001 inside dashboard.");
  });
});
