/**
 * frontmatter_map invertibility across every adapter (owner ruling, option B).
 *
 * Two semantics for one `MutationSpec` field used to coexist:
 *
 *  - PLAN (REQ-004 AC-2): **value-keyed** `{oldValue: newValue}`. Invertible,
 *    because inverting a value-to-value map yields a usable inverse. Round-trip
 *    identity was already asserted in `plan-frontmatter.test.ts`.
 *  - Base / spec-subtree (ADR-002 D-2 prose): **field-keyed** `{field: newValue}`.
 *    NOT invertible — the map never recorded the old value, so inverting
 *    `{status: "SUPERSEDED"}` produced `{SUPERSEDED: "status"}`, which hunts for
 *    a field named SUPERSEDED. Every plan using it failed the F-8 comparison.
 *
 * The ruling adopted the working semantics everywhere, so the remedy was a
 * DELETION: the two field-keyed copies were removed and all three adapters now
 * share PLAN's implementation. These tests are the proof on the adapters that
 * were previously broken.
 */
import { describe, expect, test } from "bun:test";
import { AdrAdapter } from "@acmelabs/core/adapters/adr";
import { AnalysisAdapter } from "@acmelabs/core/adapters/analysis";
import { SessionAdapter } from "@acmelabs/core/adapters/session";
import { SpecSubtreeAdapter } from "@acmelabs/core/adapters/spec-subtree";
import { sha256 } from "@acmelabs/core/core/hash";
import type { MutationSpec } from "@acmelabs/core/core/types";

const source = `---
title: "ADR-001: Example"
type: decision
status: ACCEPTED
permalink: decisions/adr-001-example
---

# ADR-001: Example

## Decision

### D-1: Something

Body text that must survive untouched.
`;

/** Value-keyed, per the adopted semantics: existing value -> replacement. */
const mutations: MutationSpec = {
  renumber_map: {},
  wikilink_map: {},
  frontmatter_map: {
    ACCEPTED: "SUPERSEDED",
    "decisions/adr-001-example": "decisions/adr-900-renamed",
  },
};

const adapters = [
  ["AdrAdapter", new AdrAdapter()],
  ["AnalysisAdapter", new AnalysisAdapter()],
  ["SessionAdapter", new SessionAdapter()],
  ["SpecSubtreeAdapter", new SpecSubtreeAdapter()],
] as const;

describe("frontmatter_map round-trips on every adapter", () => {
  for (const [name, adapter] of adapters) {
    test(`${name}: apply then reverse is identity`, () => {
      const forward = adapter.applyMutations(source, mutations);
      const recovered = adapter.reverseMutations(forward, mutations);
      expect(recovered).toBe(source);
      expect(sha256(recovered)).toBe(sha256(source));
    });

    test(`${name}: forward actually rewrote the declared values`, () => {
      // Guards against a vacuous round trip: identity is trivially true if the
      // forward pass is a no-op, so assert the mutation really happened.
      const forward = adapter.applyMutations(source, mutations);
      expect(forward).toContain("status: SUPERSEDED");
      expect(forward).toContain("permalink: decisions/adr-900-renamed");
      expect(forward).not.toContain("status: ACCEPTED");
    });

    test(`${name}: body content outside frontmatter is untouched`, () => {
      const forward = adapter.applyMutations(source, mutations);
      expect(forward).toContain("Body text that must survive untouched.");
      expect(forward).toContain("### D-1: Something");
    });
  }
});

describe("the field-keyed shape no longer silently half-applies", () => {
  test("a field name that is not an existing VALUE leaves content unchanged", () => {
    // Under the retired field-keyed reading this would have rewritten `status`.
    // Under the adopted value-keyed reading "status" is not a value present in
    // the frontmatter, so nothing matches and the content is untouched — which
    // round-trips rather than corrupting.
    const adapter = new AdrAdapter();
    const fieldKeyed: MutationSpec = {
      renumber_map: {},
      wikilink_map: {},
      frontmatter_map: { status: "SUPERSEDED" },
    };
    const forward = adapter.applyMutations(source, fieldKeyed);
    expect(forward).toBe(source);
    expect(adapter.reverseMutations(forward, fieldKeyed)).toBe(source);
  });
});
