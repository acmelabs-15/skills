import { describe, expect, test } from "bun:test";
import type { Plan } from "../schemas/index.js";
import { formatValidationErrors, planSchema } from "../schemas/index.js";

const validDistribution = {
  plan_type: "distribution",
  source_type: "adr",
  sources: [{ path: "docs/decisions/ADR-001.md", range: { start: 1, end: -1 } }],
  destinations: [
    {
      path: "parts/D-1.md",
      range: { start: 10, end: 20 },
      mutations: { renumber_map: {}, wikilink_map: {} },
    },
  ],
};

const validComposition = {
  plan_type: "composition",
  source_type: "adr",
  sources: [
    {
      path: "parts/D-1.md",
      range: { start: 1, end: -1 },
      mutations: { renumber_map: {}, wikilink_map: {} },
    },
  ],
  destinations: [{ path: "docs/decisions/ADR-001.md", range: { start: 10, end: 20 } }],
};

describe("planSchema", () => {
  test("valid ADR distribution plan parses", async () => {
    const result = await planSchema.safeParseAsync(validDistribution);
    expect(result.success).toBe(true);
  });

  test("valid ADR composition plan parses", async () => {
    const result = await planSchema.safeParseAsync(validComposition);
    expect(result.success).toBe(true);
  });

  test("missing required field rejected", async () => {
    const invalid = {
      plan_type: "distribution",
      source_type: "adr",
      // sources omitted
      destinations: [
        {
          path: "parts/D-1.md",
          range: { start: 10, end: 20 },
          mutations: { renumber_map: {}, wikilink_map: {} },
        },
      ],
    };
    const result = await planSchema.safeParseAsync(invalid);
    expect(result.success).toBe(false);
  });

  test("non-injective renumber_map rejected", async () => {
    const invalid = {
      plan_type: "distribution",
      source_type: "adr",
      sources: [{ path: "docs/decisions/ADR-001.md", range: { start: 1, end: -1 } }],
      destinations: [
        {
          path: "parts/D-1.md",
          range: { start: 10, end: 20 },
          mutations: {
            renumber_map: { "D-1": "D-2", "D-3": "D-2" },
            wikilink_map: {},
          },
        },
      ],
    };
    const result = await planSchema.safeParseAsync(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("not injective"))).toBe(true);
    }
  });

  test("non-disjoint renumber_map rejected", async () => {
    const invalid = {
      plan_type: "distribution",
      source_type: "adr",
      sources: [{ path: "docs/decisions/ADR-001.md", range: { start: 1, end: -1 } }],
      destinations: [
        {
          path: "parts/D-1.md",
          range: { start: 10, end: 20 },
          mutations: {
            renumber_map: { "D-1": "D-2", "D-2": "D-3" },
            wikilink_map: {},
          },
        },
      ],
    };
    const result = await planSchema.safeParseAsync(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("not disjoint"))).toBe(true);
    }
  });

  test("unknown plan_type rejected", async () => {
    const invalid = {
      plan_type: "invalid",
      source_type: "adr",
      sources: [{ path: "docs/decisions/ADR-001.md", range: { start: 1, end: -1 } }],
      destinations: [
        {
          path: "parts/D-1.md",
          range: { start: 10, end: 20 },
          mutations: { renumber_map: {}, wikilink_map: {} },
        },
      ],
    };
    const result = await planSchema.safeParseAsync(invalid);
    expect(result.success).toBe(false);
  });

  test("formatValidationErrors maps ZodError to PlanValidationError array", async () => {
    const invalid = {
      plan_type: "distribution",
      source_type: "adr",
      sources: [{ path: "docs/decisions/ADR-001.md", range: { start: 1, end: -1 } }],
      destinations: [
        {
          path: "parts/D-1.md",
          range: { start: 10, end: 20 },
          mutations: {
            renumber_map: { "D-1": "D-2", "D-3": "D-2" },
            wikilink_map: {},
          },
        },
      ],
    };
    const result = await planSchema.safeParseAsync(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = formatValidationErrors(result.error);
      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBeGreaterThan(0);
      for (const e of errors) {
        expect(Array.isArray(e.path)).toBe(true);
        expect(typeof e.message).toBe("string");
        expect(e.severity).toBe("error");
      }
    }
  });

  test("parsed plan satisfies Plan type", async () => {
    const result = await planSchema.safeParseAsync(validDistribution);
    expect(result.success).toBe(true);
    if (result.success) {
      const plan: Plan = result.data;
      expect(plan.plan_type).toBe("distribution");
      expect(plan.source_type).toBe("adr");
    }
  });
});
