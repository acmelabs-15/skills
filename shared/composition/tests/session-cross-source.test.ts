import { describe, expect, test } from "bun:test";
import {
  type CrossSourceUpdate,
  type SessionDistributionPlan,
  sessionDistributionPlanSchema,
} from "../schemas/distribution/session.plan.schema.js";
import { SessionAdapter } from "../src/adapters/session.js";

const adapter = new SessionAdapter();

const basePlan: SessionDistributionPlan = {
  plan_type: "distribution",
  source_type: "session",
  sources: [{ path: "docs/sessions/SESSION-2026-05-20_01.md", range: { start: 1, end: -1 } }],
  destinations: [
    {
      path: "docs/sessions/SESSION-2026-05-20_01.md",
      range: { start: 10, end: 40 },
      mutations: { renumber_map: {}, wikilink_map: {} },
    },
  ],
};

describe("SESSION cross-source updates", () => {
  test("schema validates a plan WITH cross_source_updates", () => {
    const planWithUpdates: SessionDistributionPlan = {
      ...basePlan,
      cross_source_updates: [
        {
          target_source_type: "plan",
          target_path: "docs/planning/PLAN-001.md",
          frontmatter_map: { status: "IN_PROGRESS" },
          wikilink_map: { "[[OldRef]]": "[[NewRef]]" },
        },
      ],
    };
    const parsed = sessionDistributionPlanSchema.parse(planWithUpdates);
    expect(parsed.cross_source_updates).toHaveLength(1);
    const firstUpdate = parsed.cross_source_updates?.[0];
    expect(firstUpdate?.target_source_type).toBe("plan");
    expect(firstUpdate?.target_path).toBe("docs/planning/PLAN-001.md");
  });

  test("schema validates a plan WITHOUT cross_source_updates (optional field)", () => {
    const parsed = sessionDistributionPlanSchema.parse(basePlan);
    expect(parsed.cross_source_updates).toBeUndefined();
  });

  test("schema rejects cross_source_updates whose target_source_type is not 'plan'", () => {
    const invalid = {
      ...basePlan,
      cross_source_updates: [
        {
          target_source_type: "spec",
          target_path: "docs/specs/SPEC-001.md",
        },
      ],
    };
    const result = sessionDistributionPlanSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test("getCrossSourceUpdates returns the plan's declared updates verbatim", () => {
    const updates: CrossSourceUpdate[] = [
      {
        target_source_type: "plan",
        target_path: "docs/planning/PLAN-001.md",
        frontmatter_map: { status: "DONE" },
      },
      {
        target_source_type: "plan",
        target_path: "docs/planning/PLAN-002.md",
        wikilink_map: { "[[A]]": "[[B]]" },
      },
    ];
    const plan: SessionDistributionPlan = { ...basePlan, cross_source_updates: updates };
    const result = adapter.getCrossSourceUpdates("any content", plan);
    expect(result).toEqual(updates);
  });

  test("getCrossSourceUpdates returns [] when plan omits cross_source_updates", () => {
    const result = adapter.getCrossSourceUpdates("any content", basePlan);
    expect(result).toEqual([]);
  });
});
