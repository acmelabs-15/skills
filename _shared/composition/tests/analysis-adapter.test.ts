import { describe, expect, test } from "bun:test";
import { AnalysisAdapter } from "../src/adapters/analysis.js";
import type { MutationSpec } from "../src/core/types.js";

const adapter = new AnalysisAdapter();

const analysisFixture = `---
title: "ANALYSIS-001: Example Analysis"
type: analysis
status: ACCEPTED
---

# ANALYSIS-001: Example Analysis

## Overview

Some overview content.

## Findings

### item-1: Repository structure

Notes about repository structure.

### item-2: Build pipeline

Notes about the build pipeline.

### item-3: Test coverage

Notes about test coverage.

## Observations

- [fact] item-1 captures repo layout #structure
- [fact] item-2 captures build pipeline #build
- [fact] item-3 captures coverage gaps #testing

## Relations

- relates_to [[SPEC-001: Example]]
`;

describe("AnalysisAdapter", () => {
  test("sourceType is 'analysis'", () => {
    expect(adapter.sourceType).toBe("analysis");
  });

  test("parse → serialize is idempotent (remark-normalized)", () => {
    const ast = adapter.parse(analysisFixture);
    const serialized = adapter.serialize(ast);
    // Re-parse and re-serialize must match the first serialization
    const ast2 = adapter.parse(serialized);
    const serialized2 = adapter.serialize(ast2);
    expect(serialized2).toBe(serialized);
    expect(serialized).toContain("ANALYSIS-001: Example Analysis");
    expect(serialized).toContain("item-1: Repository structure");
  });

  test("applyMutations with renumber_map renames items correctly", () => {
    const mutations: MutationSpec = {
      renumber_map: { "item-1": "item-10", "item-2": "item-11", "item-3": "item-12" },
      wikilink_map: {},
    };
    const result = adapter.applyMutations(analysisFixture, mutations);
    expect(result).toContain("### item-10: Repository structure");
    expect(result).toContain("### item-11: Build pipeline");
    expect(result).toContain("### item-12: Test coverage");
    expect(result).not.toContain("### item-1:");
    expect(result).not.toContain("### item-2:");
    expect(result).not.toContain("### item-3:");
  });

  test("reverseMutations recovers original content", () => {
    const mutations: MutationSpec = {
      renumber_map: { "item-1": "item-100", "item-2": "item-101" },
      wikilink_map: { "[[SPEC-001: Example]]": "[[SPEC-002: Example]]" },
    };
    const mutated = adapter.applyMutations(analysisFixture, mutations);
    expect(mutated).not.toBe(analysisFixture);
    const restored = adapter.reverseMutations(mutated, mutations);
    expect(restored).toBe(analysisFixture);
  });
});
