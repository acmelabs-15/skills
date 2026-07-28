/**
 * ADR-002 D-5 — canonical schema primitives in `schemas/base.ts`.
 *
 * D-5 specifies base.ts as the home for "common envelope fields, shared types,
 * and shared refinements". Three properties are tested here because each one is
 * a defect this consolidation exists to close:
 *
 *  1. **FAILSAFE-loadable.** ADR-001 mandates `yaml.FAILSAFE_SCHEMA`, which
 *     resolves every scalar as a string. A primitive declared `z.number()` can
 *     therefore never validate a real plan. base.ts previously had exactly that,
 *     so the modular tree had only ever been exercised against hand-built JS
 *     objects — never a YAML file.
 *
 *  2. **Invariants carried, not re-applied.** The F-8 map rule lives *inside*
 *     the map primitives rather than being re-stated via superRefine at each
 *     per-type call site. Re-application is what let `spec-subtree` ship with
 *     the BLOCKING gate enforced nowhere: it deferred to "the runtime
 *     injectiveDisjointMap", and no runtime call site exists.
 *
 *  3. **One definition.** The CLI schema imports these rather than declaring its
 *     own, so the two trees cannot drift apart again.
 */
import { describe, expect, test } from "bun:test";
import yaml from "js-yaml";
import {
  lineRangeSchema,
  mutationSpecSchema,
  renumberMapSchema,
  wikilinkMapSchema,
  yamlInt,
} from "@acmelabs/core/schemas/base";

/** Load through the same parser the CLI uses, so tests see production types. */
const failsafe = (text: string): unknown => yaml.load(text, { schema: yaml.FAILSAFE_SCHEMA });

describe("yamlInt — FAILSAFE tolerance without re-opening coercion", () => {
  test("accepts the string form FAILSAFE_SCHEMA produces", () => {
    expect(yamlInt.parse("1")).toBe(1);
    expect(yamlInt.parse("-1")).toBe(-1);
    expect(yamlInt.parse(42)).toBe(42);
  });

  test("rejects the values z.coerce.number() would silently admit", () => {
    // These are precisely why the coercion is a regex union, not z.coerce.
    for (const bad of ["", "  12  ", "1.5", "1e3", "abc", "0x10"]) {
      expect(yamlInt.safeParse(bad).success).toBe(false);
    }
  });
});

describe("lineRangeSchema — loadable from a real FAILSAFE plan", () => {
  test("parses the string form and yields numbers", () => {
    const parsed = lineRangeSchema.safeParse(failsafe("start: 1\nend: -1\n"));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toEqual({ start: 1, end: -1 });
  });

  test("enforces the ADR-002 D-5 bound: end >= start, or -1", () => {
    expect(lineRangeSchema.safeParse(failsafe("start: 10\nend: 4\n")).success).toBe(false);
    expect(lineRangeSchema.safeParse(failsafe("start: 10\nend: -1\n")).success).toBe(true);
    expect(lineRangeSchema.safeParse(failsafe("start: 0\nend: 5\n")).success).toBe(false);
  });
});

describe("map primitives carry the F-8 invariants intrinsically", () => {
  test("renumberMapSchema rejects a non-injective map with no extra wiring", () => {
    const result = renumberMapSchema.safeParse({ "D-1": "D-9", "D-2": "D-9" });
    expect(result.success).toBe(false);
  });

  test("renumberMapSchema rejects a non-disjoint map with no extra wiring", () => {
    const result = renumberMapSchema.safeParse({ "D-1": "D-2", "D-2": "D-3" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message).join(" ")).toContain("disjoint");
    }
  });

  test("wikilinkMapSchema carries the same rule — the gap that let spec-subtree slip", () => {
    expect(wikilinkMapSchema.safeParse({ "[[A]]": "[[Z]]", "[[B]]": "[[Z]]" }).success).toBe(false);
    expect(wikilinkMapSchema.safeParse({ "[[A]]": "[[B]]", "[[B]]": "[[C]]" }).success).toBe(false);
  });

  test("valid maps still pass", () => {
    expect(renumberMapSchema.safeParse({ "D-1": "D-500" }).success).toBe(true);
    expect(wikilinkMapSchema.safeParse({}).success).toBe(true);
  });
});

describe("mutationSpecSchema", () => {
  test("exposes frontmatter_map and regenerated_sections", () => {
    const parsed = mutationSpecSchema.safeParse({
      renumber_map: { "D-1": "D-500" },
      wikilink_map: {},
      frontmatter_map: { title: "New Title" },
      regenerated_sections: ["Progress Dashboard"],
    });
    expect(parsed.success).toBe(true);
  });

  test("inherits the map invariants through the shared primitives", () => {
    const parsed = mutationSpecSchema.safeParse({
      renumber_map: { "D-1": "D-9", "D-2": "D-9" },
      wikilink_map: {},
    });
    expect(parsed.success).toBe(false);
  });

  test("still enforces the regenerated_sections integrity floor", () => {
    const parsed = mutationSpecSchema.safeParse({
      renumber_map: {},
      wikilink_map: {},
      regenerated_sections: Array.from({ length: 11 }, (_, i) => `Section ${i}`),
    });
    expect(parsed.success).toBe(false);
  });
});
