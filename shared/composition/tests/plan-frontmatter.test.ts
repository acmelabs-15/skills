import { describe, expect, test } from "bun:test";
import { PlanAdapter } from "../src/adapters/plan.js";
import type { MutationSpec } from "../src/core/types.js";

const adapter = new PlanAdapter();

const planWithFrontmatter = `---
title: "PLAN-001: Example Plan"
type: plan
status: IN_PROGRESS
branches: []
permalink: planning/plan-001-example
tags:
  - planning
---

# PLAN-001: Example Plan

Body referencing SPEC-001.
`;

describe("PlanAdapter frontmatter mutations (TASK-009 — old-value -> new-value semantics)", () => {
  test("applyMutations rewrites title value via frontmatter_map (old-value -> new-value)", () => {
    // Per REQ-004 AC-2: frontmatter_map keys are EXISTING values; values are the NEW values.
    const mutations: MutationSpec = {
      renumber_map: {},
      wikilink_map: {},
      frontmatter_map: {
        '"PLAN-001: Example Plan"': '"PLAN-100: Renamed Plan"',
      },
    };
    const mutated = adapter.applyMutations(planWithFrontmatter, mutations);
    expect(mutated).toContain('title: "PLAN-100: Renamed Plan"');
    expect(mutated).not.toContain('title: "PLAN-001: Example Plan"');
  });

  test("applyMutations rewrites permalink value", () => {
    const mutations: MutationSpec = {
      renumber_map: {},
      wikilink_map: {},
      frontmatter_map: {
        "planning/plan-001-example": "planning/plan-100-renamed",
      },
    };
    const mutated = adapter.applyMutations(planWithFrontmatter, mutations);
    expect(mutated).toContain("permalink: planning/plan-100-renamed");
    expect(mutated).not.toContain("permalink: planning/plan-001-example");
  });

  test("branches[] value rendered as YAML inline array when entry value is a JSON array literal", () => {
    // Per REQ-004 AC-5: array-valued frontmatter_map entry → YAML inline array.
    const mutations: MutationSpec = {
      renumber_map: {},
      wikilink_map: {},
      frontmatter_map: {
        // Existing value of branches in fixture is `[]` — replace with a populated array.
        "[]": '["feat/plan-001-build-spec-003"]',
      },
    };
    const mutated = adapter.applyMutations(planWithFrontmatter, mutations);
    expect(mutated).toContain("branches: [feat/plan-001-build-spec-003]");
    expect(mutated).not.toMatch(/^branches: \[\]$/m);
  });

  test("applyMutations rewrites multiple frontmatter values at once", () => {
    const mutations: MutationSpec = {
      renumber_map: {},
      wikilink_map: {},
      frontmatter_map: {
        '"PLAN-001: Example Plan"': '"PLAN-200: Multi-Mutated"',
        "planning/plan-001-example": "planning/plan-200-multi",
        IN_PROGRESS: "DONE",
      },
    };
    const mutated = adapter.applyMutations(planWithFrontmatter, mutations);
    expect(mutated).toContain('title: "PLAN-200: Multi-Mutated"');
    expect(mutated).toContain("permalink: planning/plan-200-multi");
    expect(mutated).toContain("status: DONE");
  });

  test("reverseMutations algebraically restores original frontmatter values (inverse contract)", () => {
    // Per REQ-004 AC-2 + TASK-009 DoD: apply-then-reverse is identity for frontmatter
    // because the map is inverted (new -> old) on reverse and re-applied to the mutated content.
    const mutations: MutationSpec = {
      renumber_map: {},
      wikilink_map: {},
      frontmatter_map: {
        '"PLAN-001: Example Plan"': '"PLAN-100: Renamed Plan"',
        "planning/plan-001-example": "planning/plan-100-renamed",
        IN_PROGRESS: "DONE",
      },
    };
    const mutated = adapter.applyMutations(planWithFrontmatter, mutations);
    const reversed = adapter.reverseMutations(mutated, mutations);
    expect(reversed).toBe(planWithFrontmatter);
  });

  test("frontmatter mutations only touch frontmatter, not body", () => {
    const content = `---
title: "PLAN-001: Example"
type: plan
---

# Body

This body also has title: "PLAN-001: Example" as text.
`;
    const mutations: MutationSpec = {
      renumber_map: {},
      wikilink_map: {},
      frontmatter_map: { '"PLAN-001: Example"': '"PLAN-100: Renamed"' },
    };
    const mutated = adapter.applyMutations(content, mutations);
    // Frontmatter mutated
    expect(mutated).toContain('title: "PLAN-100: Renamed"');
    // Body unchanged
    expect(mutated).toContain('This body also has title: "PLAN-001: Example" as text.');
  });

  test("frontmatter mutations skipped inside regenerated section that contains body-level frontmatter-like text", () => {
    const content = `---
title: "PLAN-001: Example"
type: plan
---

# Body

## Progress Dashboard

This dashboard mentions title: "PLAN-001" in a row.
`;
    const mutations: MutationSpec = {
      renumber_map: {},
      wikilink_map: {},
      frontmatter_map: { '"PLAN-001: Example"': '"PLAN-100: Renamed"' },
      regenerated_sections: ["Progress Dashboard"],
    };
    const mutated = adapter.applyMutations(content, mutations);
    expect(mutated).toContain('title: "PLAN-100: Renamed"');
    // Body inside Progress Dashboard untouched
    expect(mutated).toContain('This dashboard mentions title: "PLAN-001" in a row.');
  });
});
