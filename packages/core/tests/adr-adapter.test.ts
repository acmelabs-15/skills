import { describe, expect, test } from "bun:test";
import { AdrAdapter } from "@acmelabs/core/adapters/adr";
import type { MutationSpec } from "@acmelabs/core/core/types";

const adapter = new AdrAdapter();

const adrFixture = `---
title: "ADR-001: Example Decision"
type: decision
status: ACCEPTED
---

# ADR-001: Example Decision

## Context

Some background.

## Decision

### D-1: Use Bun

We chose Bun for runtime speed.

### D-2: Use Vitest

We chose vitest for ergonomics.

## Observations

- [decision] D-1 references runtime choice #runtime
- [decision] D-2 references test framework #testing

## Relations

- relates_to [[SPEC-001: Example]]
`;

describe("AdrAdapter", () => {
  test("sourceType is 'adr'", () => {
    expect(adapter.sourceType).toBe("adr");
  });

  test("extractByRange extracts correct line ranges", () => {
    const lines = adrFixture.split("\n");
    const decisionHeadingIndex = lines.findIndex((l) => l === "## Decision");
    const start = decisionHeadingIndex + 1;
    const end = start + 6;
    const extracted = adapter.extractByRange(adrFixture, { start, end });
    expect(extracted).toContain("## Decision");
    expect(extracted).toContain("### D-1: Use Bun");
    expect(extracted).not.toContain("## Observations");
  });

  test("applyMutations renumbers D-N identifiers in a single pass", () => {
    const mutations: MutationSpec = {
      renumber_map: { "D-1": "D-2", "D-2": "D-3" },
      wikilink_map: {},
    };
    const result = adapter.applyMutations(adrFixture, mutations);
    expect(result).toContain("### D-2: Use Bun");
    expect(result).toContain("### D-3: Use Vitest");
    expect(result).not.toContain("### D-1:");
  });

  test("reverseMutations recovers original content", () => {
    const mutations: MutationSpec = {
      renumber_map: { "D-1": "D-7", "D-2": "D-8" },
      wikilink_map: { "[[SPEC-001: Example]]": "[[SPEC-002: Example]]" },
    };
    const mutated = adapter.applyMutations(adrFixture, mutations);
    expect(mutated).not.toBe(adrFixture);
    const restored = adapter.reverseMutations(mutated, mutations);
    expect(restored).toBe(adrFixture);
  });

  test("parse + serialize round-trip preserves structure", () => {
    const ast = adapter.parse(adrFixture);
    const serialized = adapter.serialize(ast);
    expect(serialized).toContain("ADR-001: Example Decision");
    expect(serialized).toContain("D-1: Use Bun");
    expect(serialized).toContain("D-2: Use Vitest");
    expect(serialized).toContain("## Decision");
    expect(serialized).toContain("## Observations");

    // Idempotent: parse-serialize the result again should match
    const ast2 = adapter.parse(serialized);
    const serialized2 = adapter.serialize(ast2);
    expect(serialized2).toBe(serialized);
  });
});
