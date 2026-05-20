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

describe("PlanAdapter frontmatter mutations (TASK-003)", () => {
  test("applyMutations rewrites title field via frontmatter_map", () => {
    const mutations: MutationSpec = {
      renumber_map: {},
      wikilink_map: {},
      frontmatter_map: {
        title: '"PLAN-100: Renamed Plan"',
      },
    };
    const mutated = adapter.applyMutations(planWithFrontmatter, mutations);
    expect(mutated).toContain('title: "PLAN-100: Renamed Plan"');
    expect(mutated).not.toContain("PLAN-001: Example Plan\ntype:");
  });

  test("applyMutations rewrites permalink field", () => {
    const mutations: MutationSpec = {
      renumber_map: {},
      wikilink_map: {},
      frontmatter_map: {
        permalink: "planning/plan-100-renamed",
      },
    };
    const mutated = adapter.applyMutations(planWithFrontmatter, mutations);
    expect(mutated).toContain("permalink: planning/plan-100-renamed");
    expect(mutated).not.toContain("permalink: planning/plan-001-example");
  });

  test("applyMutations rewrites branches single-line array literal", () => {
    const mutations: MutationSpec = {
      renumber_map: {},
      wikilink_map: {},
      frontmatter_map: {
        branches: "[feat/plan-001-build-spec-003]",
      },
    };
    const mutated = adapter.applyMutations(planWithFrontmatter, mutations);
    expect(mutated).toContain("branches: [feat/plan-001-build-spec-003]");
    expect(mutated).not.toMatch(/^branches: \[\]$/m);
  });

  test("applyMutations rewrites multiple frontmatter fields at once", () => {
    const mutations: MutationSpec = {
      renumber_map: {},
      wikilink_map: {},
      frontmatter_map: {
        title: '"PLAN-200: Multi-Mutated"',
        permalink: "planning/plan-200-multi",
        status: "DONE",
      },
    };
    const mutated = adapter.applyMutations(planWithFrontmatter, mutations);
    expect(mutated).toContain('title: "PLAN-200: Multi-Mutated"');
    expect(mutated).toContain("permalink: planning/plan-200-multi");
    expect(mutated).toContain("status: DONE");
  });

  test("reverseMutations leaves forward-applied frontmatter fields intact (field-name semantics)", () => {
    // frontmatter_map uses field-name semantics (consistent with BaseMarkdownAdapter):
    // keys are YAML field names, values are the NEW field values. The map does not
    // record the original values, so reverseMutations cannot algebraically restore them.
    // Per the contract, frontmatter_map mutations are forward-only — round-trip callers
    // that need bit-exact restoration MUST omit frontmatter_map from both passes (or
    // supply an explicit inverse spec). This test pins that semantic: after reverse,
    // the FORWARD frontmatter values are still present.
    const mutations: MutationSpec = {
      renumber_map: {},
      wikilink_map: {},
      frontmatter_map: {
        title: '"PLAN-100: Renamed Plan"',
        permalink: "planning/plan-100-renamed",
        status: "DONE",
      },
    };
    const mutated = adapter.applyMutations(planWithFrontmatter, mutations);
    const reversed = adapter.reverseMutations(mutated, mutations);
    expect(reversed).toContain('title: "PLAN-100: Renamed Plan"');
    expect(reversed).toContain("permalink: planning/plan-100-renamed");
    expect(reversed).toContain("status: DONE");
  });

  test("reverseMutations with explicit inverse frontmatter_map restores original values", () => {
    // Callers that need round-trip frontmatter restoration must supply the inverse
    // spec explicitly. This documents the supported workflow.
    const forward: MutationSpec = {
      renumber_map: {},
      wikilink_map: {},
      frontmatter_map: {
        title: '"PLAN-100: Renamed Plan"',
        permalink: "planning/plan-100-renamed",
        status: "DONE",
      },
    };
    const inverse: MutationSpec = {
      renumber_map: {},
      wikilink_map: {},
      frontmatter_map: {
        title: '"PLAN-001: Example Plan"',
        permalink: "planning/plan-001-example",
        status: "IN_PROGRESS",
      },
    };
    const mutated = adapter.applyMutations(planWithFrontmatter, forward);
    const restored = adapter.applyMutations(mutated, inverse);
    expect(restored).toBe(planWithFrontmatter);
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
      frontmatter_map: { title: '"PLAN-100: Renamed"' },
    };
    const mutated = adapter.applyMutations(content, mutations);
    // Frontmatter mutated
    expect(mutated).toContain('title: "PLAN-100: Renamed"');
    // Body unchanged
    expect(mutated).toContain('This body also has title: "PLAN-001: Example" as text.');
  });

  test("frontmatter mutations skipped inside regenerated section that contains body-level frontmatter-like text", () => {
    // Regenerated sections only affect body, not frontmatter — verify they don't
    // accidentally protect the frontmatter block.
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
      frontmatter_map: { title: '"PLAN-100: Renamed"' },
      regenerated_sections: ["Progress Dashboard"],
    };
    const mutated = adapter.applyMutations(content, mutations);
    expect(mutated).toContain('title: "PLAN-100: Renamed"');
    // Body inside Progress Dashboard untouched
    expect(mutated).toContain('This dashboard mentions title: "PLAN-001" in a row.');
  });
});
