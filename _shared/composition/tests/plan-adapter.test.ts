import { describe, expect, test } from "bun:test";
import { PlanAdapter } from "../src/adapters/plan.js";
import type { MutationSpec } from "../src/core/types.js";

const adapter = new PlanAdapter();

const planFixture = `---
title: "PLAN-001: Example Plan"
type: plan
status: IN_PROGRESS
branches: []
permalink: planning/plan-001-example
tags:
  - planning
  - example
---

# PLAN-001: Example Plan

## Scope

Building SPEC-001 and SPEC-002 in parallel.

## Phase Progression

- [x] build.SPEC-001 — DONE
- [ ] build.SPEC-002 — IN_PROGRESS

## Progress Dashboard

| SPEC     | Status      | Progress |
| -------- | ----------- | -------- |
| SPEC-001 | DONE        | 100%     |
| SPEC-002 | IN_PROGRESS | 40%      |

## Cross-Part Dependency Graph

\`\`\`mermaid
graph TD
  SPEC-001 --> SPEC-002
\`\`\`

## Observations

- [decision] Adopted parallel build #planning
- [fact] Two specs in flight #status

## Relations

- contains [[SPEC-001: Example]]
- contains [[SPEC-002: Example]]
`;

describe("PlanAdapter (TASK-001 base)", () => {
  test("sourceType is 'plan'", () => {
    expect(adapter.sourceType).toBe("plan");
  });

  test("parse → serialize is idempotent (re-parse produces same output)", () => {
    const ast = adapter.parse(planFixture);
    const serialized = adapter.serialize(ast);
    const ast2 = adapter.parse(serialized);
    const serialized2 = adapter.serialize(ast2);
    expect(serialized2).toBe(serialized);
  });

  test("extractByRange slices 1-indexed inclusive line range", () => {
    const lines = planFixture.split("\n");
    const phaseIdx = lines.findIndex((l) => l === "## Phase Progression");
    const start = phaseIdx + 1;
    const end = start + 3;
    const extracted = adapter.extractByRange(planFixture, { start, end });
    expect(extracted).toContain("## Phase Progression");
    expect(extracted).toContain("build.SPEC-001");
    expect(extracted).not.toContain("## Progress Dashboard");
  });

  test("applyMutations skips content inside regenerated_sections", () => {
    const mutations: MutationSpec = {
      renumber_map: { "SPEC-001": "SPEC-100", "SPEC-002": "SPEC-101" },
      wikilink_map: {},
      regenerated_sections: ["Progress Dashboard", "Cross-Part Dependency Graph"],
    };
    const mutated = adapter.applyMutations(planFixture, mutations);

    // Outside regenerated: renumbered
    expect(mutated).toContain("build.SPEC-100");
    expect(mutated).toContain("build.SPEC-101");
    expect(mutated).toContain("[[SPEC-100: Example]]");

    // Inside regenerated: untouched (original SPEC-001/SPEC-002 still present in the table + mermaid)
    expect(mutated).toContain("| SPEC-001 | DONE");
    expect(mutated).toContain("| SPEC-002 | IN_PROGRESS");
    expect(mutated).toContain("SPEC-001 --> SPEC-002");
  });

  test("applyMutations with no regenerated_sections behaves like a standard rewrite", () => {
    const mutations: MutationSpec = {
      renumber_map: { "SPEC-001": "SPEC-100" },
      wikilink_map: {},
    };
    const mutated = adapter.applyMutations(planFixture, mutations);
    expect(mutated).toContain("SPEC-100");
    // Without regenerated_sections, even the dashboard is renumbered
    expect(mutated).toContain("| SPEC-100 | DONE");
  });

  test("reverseMutations restores non-regenerated content exactly", () => {
    const mutations: MutationSpec = {
      renumber_map: { "SPEC-001": "SPEC-100", "SPEC-002": "SPEC-101" },
      wikilink_map: {},
      regenerated_sections: ["Progress Dashboard", "Cross-Part Dependency Graph"],
    };
    const mutated = adapter.applyMutations(planFixture, mutations);
    const restored = adapter.reverseMutations(mutated, mutations);
    expect(restored).toBe(planFixture);
  });
});
