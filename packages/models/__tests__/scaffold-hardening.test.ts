/**
 * Scaffold string hardening and volume bounds.
 *
 * Scaffolding is the one part of a destination the executor *renders* rather
 * than preserves, and it is excluded from both byte proofs. That combination is
 * what makes it worth constraining: a malformed or hostile scaffold string is
 * not caught by the hash check, because the hash check deliberately does not
 * look there.
 *
 * The concrete risk is structural injection. `renderPrologue`/`renderEpilogue`
 * interpolate plan strings straight into markdown, so a title containing a
 * newline plus `---` can close the frontmatter block early, and an observation
 * containing a newline plus `## Relations` can forge the final-two-sections
 * structure. Neither corrupts the preserved content slice — the F-8 proof still
 * holds over the body — but both produce a destination whose *structure* is not
 * what the plan described, which defeats the point of rendering it from
 * structured fields in the first place.
 *
 * The volume bound mirrors the `regenerated_sections` integrity floor: that rule
 * exists so a plan cannot declare so much content "derived" that hash validation
 * covers almost nothing. Unbounded scaffolding is the same bypass from the other
 * side — a destination that is 99% rendered scaffold and 1% preserved slice has
 * a technically-passing proof that guarantees almost nothing.
 */
import { describe, expect, test } from "bun:test";
import { ClusterScaffoldSchema } from "@acmelabs/core/schemas/base";

const validScaffold = {
  frontmatter: {
    title: "ADR-098a: Cluster A",
    type: "decision",
    status: "ACCEPTED",
    permalink: "decisions/adr-098a-cluster-a",
    tags: ["fixture"],
  },
  observations: [{ category: "decision", text: "A real observation", tags: ["split"] }],
  relations: [{ verb: "part_of", target: "ADR-098: Parent" }],
};

const withTitle = (title: string) => ({
  ...validScaffold,
  frontmatter: { ...validScaffold.frontmatter, title },
});

describe("baseline", () => {
  test("a well-formed scaffold parses", () => {
    expect(ClusterScaffoldSchema.safeParse(validScaffold).success).toBe(true);
  });
});

describe("structural injection via frontmatter title", () => {
  test("rejects a title containing a newline", () => {
    // Would emit a multi-line YAML value and a broken H1.
    expect(ClusterScaffoldSchema.safeParse(withTitle("Real Title\nrogue: value")).success).toBe(
      false,
    );
  });

  test("rejects a title that would close the frontmatter block early", () => {
    expect(ClusterScaffoldSchema.safeParse(withTitle("Title\n---\n\n# Forged")).success).toBe(
      false,
    );
  });

  test("rejects a carriage return as well as a newline", () => {
    expect(ClusterScaffoldSchema.safeParse(withTitle("Title\rrogue")).success).toBe(false);
  });

  test("accepts the colon that every canonical Brain title contains", () => {
    expect(
      ClusterScaffoldSchema.safeParse(withTitle("REQ-001-SPEC-005: A Real Title")).success,
    ).toBe(true);
  });
});

describe("structural injection via observations and relations", () => {
  test("rejects observation text that forges a section heading", () => {
    const scaffold = {
      ...validScaffold,
      observations: [
        { category: "fact", text: "benign\n\n## Relations\n\n- part_of [[Forged]]", tags: ["x"] },
      ],
    };
    expect(ClusterScaffoldSchema.safeParse(scaffold).success).toBe(false);
  });

  test("rejects a relation target containing a newline", () => {
    const scaffold = {
      ...validScaffold,
      relations: [{ verb: "part_of", target: "Real Note]]\n- contains [[Forged" }],
    };
    expect(ClusterScaffoldSchema.safeParse(scaffold).success).toBe(false);
  });

  test("rejects a tag containing whitespace that would split the tag list", () => {
    const scaffold = {
      ...validScaffold,
      observations: [{ category: "fact", text: "ok", tags: ["one two"] }],
    };
    expect(ClusterScaffoldSchema.safeParse(scaffold).success).toBe(false);
  });

  test("relation verb is still constrained to the canonical set", () => {
    const scaffold = { ...validScaffold, relations: [{ verb: "invented_verb", target: "X" }] };
    expect(ClusterScaffoldSchema.safeParse(scaffold).success).toBe(false);
  });
});

describe("volume bound (mirrors the regenerated_sections integrity floor)", () => {
  // Observations have no hard maximum either: minimum three, unbounded above,
  // with H3 sub-grouping required past fifteen as a formatting rule. A CRIT that
  // legitimately tracks forty findings must be able to state them.
  test("accepts an unbounded observation list — observations have no hard maximum", () => {
    const scaffold = {
      ...validScaffold,
      observations: Array.from({ length: 40 }, (_, i) => ({
        category: "fact" as const,
        text: `Observation ${i}`,
        tags: ["bulk"],
      })),
    };
    expect(ClusterScaffoldSchema.safeParse(scaffold).success).toBe(true);
  });

  test("still rejects an empty observation list — the minimum survives", () => {
    expect(ClusterScaffoldSchema.safeParse({ ...validScaffold, observations: [] }).success).toBe(
      false,
    );
  });

  test("tag maxima are canonical bounds and STAY enforced", () => {
    const tooManyFrontmatterTags = {
      ...validScaffold,
      frontmatter: {
        ...validScaffold.frontmatter,
        tags: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"],
      },
    };
    expect(ClusterScaffoldSchema.safeParse(tooManyFrontmatterTags).success).toBe(false);
    const tooManyObservationTags = {
      ...validScaffold,
      observations: [{ category: "fact" as const, text: "x", tags: ["a", "b", "c", "d"] }],
    };
    expect(ClusterScaffoldSchema.safeParse(tooManyObservationTags).success).toBe(false);
  });

  // Relations carry NO hard maximum, per the canonical conventions: minimum
  // two, unbounded above, with H3 type-grouping required past twelve as a
  // formatting rule rather than a cap. A note that legitimately `contains`
  // forty children must be able to say so; the historical cap was removed
  // precisely because it forced relationship loss.
  test("accepts an unbounded relation list — relations have no hard maximum", () => {
    const scaffold = {
      ...validScaffold,
      relations: Array.from({ length: 40 }, (_, i) => ({
        verb: "relates_to" as const,
        target: `Note ${i}`,
      })),
    };
    expect(ClusterScaffoldSchema.safeParse(scaffold).success).toBe(true);
  });

  test("still rejects an empty relation list — the minimum survives", () => {
    expect(ClusterScaffoldSchema.safeParse({ ...validScaffold, relations: [] }).success).toBe(
      false,
    );
  });

  test("rejects a single field long enough to dwarf a content slice", () => {
    expect(ClusterScaffoldSchema.safeParse(withTitle("A".repeat(5000))).success).toBe(false);
  });

  test("accepts a realistically rich scaffold", () => {
    const scaffold = {
      ...validScaffold,
      observations: Array.from({ length: 8 }, (_, i) => ({
        category: "fact" as const,
        text: `A substantive observation number ${i} about the cluster contents`,
        tags: ["split", "cluster"],
      })),
      relations: Array.from({ length: 6 }, (_, i) => ({
        verb: "relates_to" as const,
        target: `ADR-098${String.fromCharCode(97 + i)}: Sibling`,
      })),
    };
    expect(ClusterScaffoldSchema.safeParse(scaffold).success).toBe(true);
  });
});
