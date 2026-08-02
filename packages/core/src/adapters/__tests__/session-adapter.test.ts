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

  test("event identifiers round-trip through a renumber", () => {
    // REPLACES a test asserting `identifierPrefix === "Event-"`, reached through a cast
    // to read a protected field — which is itself the signal that nothing legitimate
    // consumed it. That field, and the abstract `sectionDelimiter` /
    // `identifierPattern` / `identifierPrefix` slots on BaseMarkdownAdapter, were
    // declared by three adapters and read by no method body anywhere. They described a
    // customisation seam that was never built; extraction is range-driven and mutation
    // is find-and-replace, and neither consults them.
    //
    // A DESIGN note names them; no accepted REQUIREMENT does. (PlanAdapter's
    // snake_case `section_delimiter` and `identifier_pattern` are different — those
    // ARE named by REQ-001-SPEC-003 AC-1 as observable, so they stay.)
    //
    // What matters is that event identifiers actually mutate, which this asserts
    // against behaviour rather than against a declared constant.
    const content = "## Event 01 — First\n\nBody.\n\n## Event 02 — Second\n\nBody.\n";
    const spec = { renumber_map: { "Event 01": "Event 11" }, wikilink_map: {} };
    const mutated = adapter.applyMutations(content, spec);
    expect(mutated).toContain("## Event 11 — First");
    expect(mutated).toContain("## Event 02 — Second");
    // And the inverse recovers the original, which is the property the prefix was
    // presumably meant to support.
    expect(adapter.reverseMutations(mutated, spec)).toBe(content);
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
