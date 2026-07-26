/**
 * ADR-001 F-8 / ADR-002 D-5 — injectivity AND key-value disjointness on BOTH
 * mutation maps, enforced at plan-load time before any file I/O.
 *
 * F-8 states the constraint over both maps: "no two source IDs map to the same
 * target ID; no two source wikilinks map to the same target wikilink." D-5
 * specifies `injectiveDisjointMap` as the mechanism. That validator already
 * exists at src/core/validators.ts and the modular per-type schemas under
 * schemas/distribution/ already apply it — but `DistributionPlanSchema` and
 * `CompositionPlanSchema` in src/schemas/plan-yaml.ts, the schemas the
 * /decompose and /recompose CLIs actually load, bypassed it: renumber_map got a
 * local injectivity-only check and wikilink_map got none.
 *
 * Why disjointness matters even though the round trip currently survives without
 * it: `applySinglePassReplace` builds one regex alternation, so replacement is
 * genuinely simultaneous and a map like {D-1: D-2, D-2: D-3} does round-trip
 * today. Disjointness is the precondition that makes relying on that property
 * safe. Without the validator, a future refactor to sequential replacement turns
 * the same plan into silent content corruption with nothing standing guard.
 */
import { describe, expect, test } from "bun:test";
import { CompositionPlanSchema, DistributionPlanSchema } from "../src/schemas/plan-yaml.js";

const distribution = (renumber: Record<string, string>, wikilink: Record<string, string> = {}) => ({
  plan_type: "distribution",
  source_type: "adr",
  source_path: "source.md",
  renumber_map: renumber,
  wikilink_map: wikilink,
});

const composition = (renumber: Record<string, string>, wikilink: Record<string, string> = {}) => ({
  plan_type: "composition",
  source_type: "adr",
  target_path: "target.md",
  renumber_map: renumber,
  wikilink_map: wikilink,
});

const messagesOf = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  (result.error?.issues ?? []).map((i) => i.message).join(" | ");

describe("renumber_map invariants (distribution)", () => {
  test("accepts an injective, disjoint map", () => {
    expect(DistributionPlanSchema.safeParse(distribution({ "D-1": "D-500" })).success).toBe(true);
  });

  test("rejects a non-injective map (two keys onto one target)", () => {
    const result = DistributionPlanSchema.safeParse(distribution({ "D-1": "D-9", "D-2": "D-9" }));
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain("renumber_map");
    // Name the colliding target: on a 40-key map, a bare "duplicate values
    // detected" leaves the plan author hunting for it.
    expect(messagesOf(result)).toContain('"D-9"');
  });

  test("rejects the non-disjoint map ADR-002 D-5 names as its example", () => {
    // {"D-1":"D-2","D-2":"D-3"} — "D-2" is both a key and a value.
    const result = DistributionPlanSchema.safeParse(distribution({ "D-1": "D-2", "D-2": "D-3" }));
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain("disjoint");
    expect(messagesOf(result)).toContain("D-2");
  });

  test("accepts the high-range renumber idiom the design recommends", () => {
    // ADR-002 D-4 implementer note: map into a high range to guarantee disjointness.
    const map = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`D-${i + 1}`, `D-${900 + i + 1}`]),
    );
    expect(DistributionPlanSchema.safeParse(distribution(map)).success).toBe(true);
  });
});

describe("wikilink_map invariants (distribution)", () => {
  test("accepts an injective, disjoint map", () => {
    const ok = distribution({}, { "[[Old A]]": "[[New A]]", "[[Old B]]": "[[New B]]" });
    expect(DistributionPlanSchema.safeParse(ok).success).toBe(true);
  });

  test("rejects two wikilinks collapsing onto one target", () => {
    // The shape a post-split repointing pass can produce when two old titles are
    // repointed at a single new note. F-8 requires this be rejected at load time.
    const result = DistributionPlanSchema.safeParse(
      distribution({}, { "[[Old A]]": "[[Merged]]", "[[Old B]]": "[[Merged]]" }),
    );
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain("wikilink_map");
  });

  test("rejects a non-disjoint wikilink map", () => {
    const result = DistributionPlanSchema.safeParse(
      distribution({}, { "[[A]]": "[[B]]", "[[B]]": "[[C]]" }),
    );
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain("disjoint");
  });

  test("an omitted wikilink_map still defaults to empty and passes", () => {
    const { wikilink_map, ...withoutWikilink } = distribution({ "D-1": "D-500" });
    void wikilink_map;
    const result = DistributionPlanSchema.safeParse(withoutWikilink);
    expect(result.success).toBe(true);
  });
});

describe("composition plans enforce the same invariants", () => {
  test("accepts an injective, disjoint pair of maps", () => {
    expect(CompositionPlanSchema.safeParse(composition({ "D-500": "D-1" })).success).toBe(true);
  });

  test("rejects a non-injective renumber_map", () => {
    const result = CompositionPlanSchema.safeParse(composition({ "D-500": "D-1", "D-501": "D-1" }));
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain("renumber_map");
  });

  test("rejects a non-disjoint renumber_map", () => {
    const result = CompositionPlanSchema.safeParse(composition({ "D-1": "D-2", "D-2": "D-3" }));
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain("disjoint");
  });

  test("rejects a non-injective wikilink_map", () => {
    const result = CompositionPlanSchema.safeParse(
      composition({}, { "[[A]]": "[[Z]]", "[[B]]": "[[Z]]" }),
    );
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain("wikilink_map");
  });
});
