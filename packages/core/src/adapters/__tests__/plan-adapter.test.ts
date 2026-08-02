import { describe, expect, test } from "bun:test";
import { PlanAdapter } from "@acmelabs/core/adapters/plan";
import type { MutationSpec } from "@acmelabs/core/core/types";

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

describe("PlanAdapter public surface (TASK-007 — REQ-001 AC-1)", () => {
  test("section_delimiter is exposed and equals '### '", () => {
    expect(adapter.section_delimiter).toBe("### ");
  });

  test("identifier_pattern matches phase.part-id formats", () => {
    expect(adapter.identifier_pattern.test("research.1")).toBe(true);
    expect(adapter.identifier_pattern.test("decisions.2")).toBe(true);
    expect(adapter.identifier_pattern.test("spec.SPEC-001")).toBe(true);
    expect(adapter.identifier_pattern.test("build.SPEC-003")).toBe(true);
    // Negative cases
    expect(adapter.identifier_pattern.test("Research.1")).toBe(false);
    expect(adapter.identifier_pattern.test("spec.spec-001")).toBe(false);
    expect(adapter.identifier_pattern.test("noPhase")).toBe(false);
  });
});

describe("PlanAdapter section-aware extractByRange (TASK-007 — REQ-001 AC-2)", () => {
  const planWithBuildParts = `# PLAN-001

## Build Parts

### build.SPEC-001

First spec body.

### build.SPEC-002

Second spec body.

## Other Section

Tail content.
`;

  test("extraction is range-driven; a section name cannot locate content", () => {
    // REPLACES two tests that exercised a `{ section: string }` branch of
    // extractByRange. They passed, which is exactly how the branch read as a live
    // heading-aware extraction path — but nothing could ever reach it. It was
    // unreachable by TYPE: `ClusterRange.range` is a `LineRange` and the
    // `CompositionAdapter` interface declares the parameter as one, so no caller
    // could pass a section name. The branch and its helper are removed; this asserts
    // the contract that actually holds.
    //
    // Identifiers and section names are cross-check material, never locators: a
    // heading appearing twice in a document cannot say which occurrence was meant,
    // which is why a line range is the only thing that can.
    const buildOne = planWithBuildParts.split("\n").findIndex((l) => l === "### build.SPEC-001");
    const buildTwo = planWithBuildParts.split("\n").findIndex((l) => l === "### build.SPEC-002");
    const extracted = adapter.extractByRange(planWithBuildParts, {
      start: buildOne + 1,
      end: buildTwo,
    });
    expect(extracted).toContain("### build.SPEC-001");
    expect(extracted).toContain("First spec body.");
    expect(extracted).not.toContain("### build.SPEC-002");
  });

  test("extractByRange strips regenerated_sections from output when provided", () => {
    const content = `# Plan

## Body Heading

Body content one.

## Progress Dashboard

| col |
| --- |
| row |

## Body Heading Two

Body content two.
`;
    const extracted = adapter.extractByRange(content, { start: 1, end: -1 }, [
      "Progress Dashboard",
    ]);
    expect(extracted).toContain("Body content one.");
    expect(extracted).toContain("Body content two.");
    expect(extracted).not.toContain("Progress Dashboard");
    expect(extracted).not.toContain("| col |");
  });
});
