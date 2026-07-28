import { describe, expect, test } from "bun:test";
import { SessionAdapter } from "@acmelabs/core/adapters/session";
import type { MutationSpec } from "@acmelabs/core/core/types";

const adapter = new SessionAdapter();

const sessionFixture = `---
title: "SESSION-2026-05-20_01: Example Session"
type: session
status: IN_PROGRESS
---

# SESSION-2026-05-20_01: Example Session

## Scope

Session scope description.

## Event 01

Bootstrapped the session. Linked Event-01 to the plan.

## Event 02

Locked decision D-1. References Event-02 metadata.

## Event 03

Dispatched implementer agents per Event-03 plan.

## Observations

- [fact] Event-01 captures bootstrap #session
- [fact] Event-02 captures decision lock #decision
- [fact] Event-03 captures dispatch #orchestration

## Relations

- relates_to [[PLAN-001: Example]]
`;

describe("SessionAdapter", () => {
  test("sourceType is 'session'", () => {
    expect(adapter.sourceType).toBe("session");
  });

  test("identifierPrefix is 'Event-' (DESIGN-001 Component 2)", () => {
    // Accessing protected via index access for test introspection.
    expect((adapter as unknown as { identifierPrefix: string }).identifierPrefix).toBe("Event-");
  });

  test("supportsCrossSourceUpdates is true (DESIGN-001 Component 2 + TASK-002 DoD item 7)", () => {
    expect(adapter.supportsCrossSourceUpdates).toBe(true);
  });

  test("parse → serialize is idempotent (remark-normalized)", () => {
    const ast = adapter.parse(sessionFixture);
    const serialized = adapter.serialize(ast);
    const ast2 = adapter.parse(serialized);
    const serialized2 = adapter.serialize(ast2);
    expect(serialized2).toBe(serialized);
    expect(serialized).toContain("SESSION-2026-05-20_01");
    expect(serialized).toContain("## Event 01");
  });

  test("applyMutations with renumber_map renames Event-NN identifiers correctly", () => {
    const mutations: MutationSpec = {
      renumber_map: { "Event-01": "Event-11", "Event-02": "Event-12", "Event-03": "Event-13" },
      wikilink_map: {},
    };
    const result = adapter.applyMutations(sessionFixture, mutations);
    expect(result).toContain("Event-11");
    expect(result).toContain("Event-12");
    expect(result).toContain("Event-13");
    expect(result).not.toContain("Event-01");
    expect(result).not.toContain("Event-02");
    expect(result).not.toContain("Event-03");
  });

  test("reverseMutations recovers original content", () => {
    const mutations: MutationSpec = {
      renumber_map: { "Event-01": "Event-100", "Event-02": "Event-101" },
      wikilink_map: { "[[PLAN-001: Example]]": "[[PLAN-002: Example]]" },
    };
    const mutated = adapter.applyMutations(sessionFixture, mutations);
    expect(mutated).not.toBe(sessionFixture);
    const restored = adapter.reverseMutations(mutated, mutations);
    expect(restored).toBe(sessionFixture);
  });
});
