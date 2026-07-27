import { describe, expect, test } from "bun:test";
import { parseSectionFragment, sectionAnchored } from "../src/core/repoint-anchors.js";
import {
  type AddressedEdit,
  applyEdits,
  invertEdits,
  lineDiff,
  overlappingEdits,
  verifyAddress,
} from "../src/core/repoint-edits.js";
import { resolveReplacement } from "../src/core/repoint-resolve.js";
import {
  type ReferenceFinding,
  ReferenceFindingSchema,
  type ResolvedTarget,
  detectLegacyManifest,
} from "../src/schemas/reference-manifest.js";
import { type RepointPlan, RepointPlanSchema } from "../src/schemas/repoint-plan.js";

/**
 * Findings and plans are built THROUGH their schemas rather than cast into shape.
 * A hand-built object that no longer satisfies the schema is a test that passes
 * against a contract nothing else honours, which is the failure mode a validated
 * boundary exists to prevent.
 */
function finding(overrides: Partial<ReferenceFinding> = {}): ReferenceFinding {
  return ReferenceFindingSchema.parse({
    referencingFile: "analysis/ANALYSIS-122-repoint-referrer.md",
    line: 1,
    column: 1,
    matchedText: "ANALYSIS-120",
    class: "entity-id",
    target: "ANALYSIS-120",
    viaAlias: false,
    source: "TEXT",
    advisory: false,
    ...overrides,
  });
}

function target(overrides: Partial<ResolvedTarget> = {}): ResolvedTarget {
  return {
    path: "analysis/ANALYSIS-120-repoint-source.md",
    entityId: "ANALYSIS-120",
    title: "ANALYSIS-120: Repoint Source",
    permalink: "analysis/analysis-120-repoint-source",
    aliasTitles: [],
    aliasPermalinks: [],
    aliasEntityIds: [],
    ...overrides,
  };
}

function plan(overrides: Record<string, unknown> = {}): RepointPlan {
  return RepointPlanSchema.parse({
    plan_type: "repoint",
    renumber_map: { "ANALYSIS-120": "ANALYSIS-121" },
    ...overrides,
  });
}

describe("verifyAddress", () => {
  const lines = ["see ANALYSIS-120 here"];

  test("recorded text at its address applies", () => {
    expect(
      verifyAddress(lines, {
        line: 1,
        column: 5,
        oldText: "ANALYSIS-120",
        newText: "ANALYSIS-121",
      }),
    ).toBe("old");
  });

  test("repointed text already at its address is not re-applied", () => {
    expect(
      verifyAddress(["see ANALYSIS-121 here"], {
        line: 1,
        column: 5,
        oldText: "ANALYSIS-120",
        newText: "ANALYSIS-121",
      }),
    ).toBe("new");
  });

  test("neither form at the address is drift, not a guess", () => {
    expect(
      verifyAddress(lines, {
        line: 1,
        column: 9,
        oldText: "ANALYSIS-120",
        newText: "ANALYSIS-121",
      }),
    ).toBe("drift");
  });

  test("a missing line is drift rather than a crash", () => {
    expect(verifyAddress(lines, { line: 99, column: 1, oldText: "a", newText: "b" })).toBe("drift");
  });

  /**
   * The one shape that silently breaks idempotence: when the old permalink is a
   * PREFIX of the new one, a completed repoint still matches the old probe. The
   * longer match has to win or the second run appends again.
   */
  test("old text that is a prefix of new text still reads as already-repointed", () => {
    const edit: AddressedEdit = {
      line: 1,
      column: 1,
      oldText: "analysis/analysis-120-a",
      newText: "analysis/analysis-120-ab",
    };
    expect(verifyAddress(["analysis/analysis-120-a"], edit)).toBe("old");
    expect(verifyAddress(["analysis/analysis-120-ab"], edit)).toBe("new");
  });
});

describe("overlappingEdits", () => {
  test("a nested reference inside a wikilink is flagged on both participants", () => {
    const edits: AddressedEdit[] = [
      { line: 3, column: 1, oldText: "[[ANALYSIS-120: About ADR-001]]", newText: "[[X]]" },
      { line: 3, column: 24, oldText: "ADR-001", newText: "ADR-002" },
    ];
    expect([...overlappingEdits(edits)].sort()).toEqual([0, 1]);
  });

  test("adjacent but disjoint spans on one line are both applied", () => {
    const edits: AddressedEdit[] = [
      { line: 3, column: 1, oldText: "ANALYSIS-120", newText: "ANALYSIS-121" },
      { line: 3, column: 13, oldText: "ANALYSIS-130", newText: "ANALYSIS-131" },
    ];
    expect(overlappingEdits(edits).size).toBe(0);
  });

  test("same-column edits on different lines never conflict", () => {
    const edits: AddressedEdit[] = [
      { line: 1, column: 1, oldText: "ANALYSIS-120", newText: "ANALYSIS-121" },
      { line: 2, column: 1, oldText: "ANALYSIS-120", newText: "ANALYSIS-121" },
    ];
    expect(overlappingEdits(edits).size).toBe(0);
  });
});

describe("applyEdits and invertEdits", () => {
  test("right-to-left application keeps every recorded address valid", () => {
    const before = ["a ANALYSIS-120 b ANALYSIS-120 c"];
    const edits: AddressedEdit[] = [
      { line: 1, column: 3, oldText: "ANALYSIS-120", newText: "ANALYSIS-121" },
      { line: 1, column: 18, oldText: "ANALYSIS-120", newText: "ANALYSIS-121" },
    ];
    expect(applyEdits(before, edits)).toEqual(["a ANALYSIS-121 b ANALYSIS-121 c"]);
  });

  /**
   * The inverse of a multi-edit line cannot reuse the original columns: after a
   * right-to-left pass every substitution except the leftmost has moved by the
   * accumulated length change to its left. This is the case that proves the
   * re-derivation, so the replacements differ in LENGTH on purpose.
   */
  test("inversion restores the input when substitutions change length", () => {
    const before = ["x ANALYSIS-120 y ANALYSIS-120 z"];
    const edits: AddressedEdit[] = [
      { line: 1, column: 3, oldText: "ANALYSIS-120", newText: "A-1" },
      { line: 1, column: 18, oldText: "ANALYSIS-120", newText: "LONGER-ANALYSIS-121" },
    ];
    const after = applyEdits(before, edits);
    expect(after).toEqual(["x A-1 y LONGER-ANALYSIS-121 z"]);
    expect(applyEdits(after, invertEdits(edits))).toEqual(before);
  });

  test("inversion round-trips across several lines at once", () => {
    const before = ["ANALYSIS-120 one", "two", "three ANALYSIS-120"];
    const edits: AddressedEdit[] = [
      { line: 1, column: 1, oldText: "ANALYSIS-120", newText: "ANALYSIS-121" },
      { line: 3, column: 7, oldText: "ANALYSIS-120", newText: "ANALYSIS-121" },
    ];
    expect(applyEdits(applyEdits(before, edits), invertEdits(edits))).toEqual(before);
  });
});

describe("lineDiff", () => {
  test("reports only the lines that changed, with 1-indexed numbers", () => {
    expect(lineDiff(["a", "b", "c"], ["a", "B", "c"])).toEqual([
      { line: 2, before: "b", after: "B" },
    ]);
  });
});

describe("parseSectionFragment", () => {
  test("keyword forms parse, and the plural is folded to the singular", () => {
    expect(parseSectionFragment("Section 6")).toEqual({
      kind: "keyword",
      keyword: "Section",
      ordinal: "6",
    });
    expect(parseSectionFragment("Sections 6.1")).toEqual({
      kind: "keyword",
      keyword: "Section",
      ordinal: "6.1",
    });
    expect(parseSectionFragment("Part C")).toEqual({
      kind: "keyword",
      keyword: "Part",
      ordinal: "C",
    });
    expect(parseSectionFragment("Appendix A")).toEqual({
      kind: "keyword",
      keyword: "Appendix",
      ordinal: "A",
    });
  });

  /**
   * The designator forms the real corpus actually carries. The schema's own doc
   * comment gives "Section 6" and "Part C" as its examples, while the measured
   * data is dominated by `D-N` decision designators — so these are pinned rather
   * than assumed.
   */
  test("designator forms parse", () => {
    expect(parseSectionFragment("D-5")).toEqual({ kind: "designator", token: "D-5" });
    expect(parseSectionFragment("S-1")).toEqual({ kind: "designator", token: "S-1" });
    expect(parseSectionFragment("P0-2")).toEqual({ kind: "designator", token: "P0-2" });
  });

  test("an unrecognised shape parses to nothing rather than to a guess", () => {
    expect(parseSectionFragment("the middle bit")).toBeNull();
    expect(parseSectionFragment("Chapter 4")).toBeNull();
  });
});

describe("sectionAnchored", () => {
  const numbered = "## 2. Second Part\n\nbody\n\n### 2.3 A Subsection\n";

  test("a numbered heading anchors its ordinal", () => {
    expect(sectionAnchored("Section 2", numbered)).toBe(true);
    expect(sectionAnchored("Section 2.3", numbered)).toBe(true);
  });

  test("an absent ordinal is not anchored", () => {
    expect(sectionAnchored("Section 9", numbered)).toBe(false);
    expect(sectionAnchored("Section 2.4", numbered)).toBe(false);
  });

  /**
   * A subsection heading is not evidence that its parent section heading exists.
   * Treating `6.1` as anchoring `Section 6` is how the check would quietly pass
   * a citation of a section that was never written.
   */
  test("a subsection does not anchor its parent ordinal", () => {
    expect(sectionAnchored("Section 6", "### 6.1 Only The Subsection\n")).toBe(false);
    expect(sectionAnchored("Section 6.1", "### 6.1 Only The Subsection\n")).toBe(true);
  });

  test("a longer ordinal is not anchored by a shorter prefix of itself", () => {
    expect(sectionAnchored("Section 6.1", "### 6.10 Something Else\n")).toBe(false);
  });

  test("the spelled heading form anchors too", () => {
    expect(sectionAnchored("Section 6", "## Section 6 — Conclusion\n")).toBe(true);
    expect(sectionAnchored("Part C", "## Part C\n")).toBe(true);
  });

  test("a designator anchors from a heading or a table row", () => {
    expect(sectionAnchored("D-3", "### D-3: A Locked Decision\n")).toBe(true);
    expect(sectionAnchored("S-2", "| ID | Claim |\n| --- | --- |\n| S-2 | A claim |\n")).toBe(true);
    expect(sectionAnchored("D-3", "- **D-3** restated here\n")).toBe(true);
    expect(sectionAnchored("D-9", "### D-3: A Locked Decision\n")).toBe(false);
  });

  test("a designator inside a fenced block is not an anchor", () => {
    expect(sectionAnchored("D-3", "text\n\n```\nD-3 is sample output\n```\n")).toBe(false);
  });

  test("an unparseable fragment is never anchored", () => {
    expect(sectionAnchored("the middle bit", "## the middle bit\n")).toBe(false);
  });
});

describe("resolveReplacement — wikilink", () => {
  const wikilinkPlan = plan({
    wikilink_map: { "ANALYSIS-120: Repoint Source": "ANALYSIS-121: Repoint Destination" },
  });

  test("substitutes the mapped title", () => {
    const resolution = resolveReplacement(
      finding({ class: "wikilink", matchedText: "[[ANALYSIS-120: Repoint Source]]" }),
      wikilinkPlan,
      target(),
    );
    expect(resolution).toEqual({
      ok: true,
      replacement: { newText: "[[ANALYSIS-121: Repoint Destination]]" },
    });
  });

  test("interior padding the author wrote is preserved", () => {
    const resolution = resolveReplacement(
      finding({ class: "wikilink", matchedText: "[[ ANALYSIS-120: Repoint Source ]]" }),
      wikilinkPlan,
      target(),
    );
    expect(resolution.ok && resolution.replacement.newText).toBe(
      "[[ ANALYSIS-121: Repoint Destination ]]",
    );
  });

  /**
   * A citation written with a RETIRED title resolves through the target's current
   * identity. Without the fallback the plan would need a second key pointing at
   * the same value, which the F-8 injectivity rule rejects outright.
   */
  test("a retired title falls back to the target's current identity", () => {
    const resolution = resolveReplacement(
      finding({
        class: "wikilink",
        matchedText: "[[ANALYSIS-028: Ancient Name]]",
        viaAlias: true,
      }),
      wikilinkPlan,
      target({ aliasTitles: ["ANALYSIS-028: Ancient Name"] }),
    );
    expect(resolution.ok && resolution.replacement.newText).toBe(
      "[[ANALYSIS-121: Repoint Destination]]",
    );
  });

  test("an unmapped title is declined as unmapped, not guessed at", () => {
    const resolution = resolveReplacement(
      finding({ class: "wikilink", matchedText: "[[ANALYSIS-999: Elsewhere]]" }),
      wikilinkPlan,
      undefined,
    );
    expect(resolution.ok).toBe(false);
    expect(!resolution.ok && resolution.reason).toBe("no-mapping");
  });

  test("matched text that is not a wikilink is declined as malformed", () => {
    const resolution = resolveReplacement(
      finding({ class: "wikilink", matchedText: "ANALYSIS-120" }),
      wikilinkPlan,
      target(),
    );
    expect(!resolution.ok && resolution.reason).toBe("malformed-reference");
  });
});

describe("resolveReplacement — permalink", () => {
  const permalinkPlan = plan({
    permalink_map: {
      "analysis/analysis-120-repoint-source": "analysis/analysis-121-repoint-destination",
    },
  });

  test("a bare permalink is substituted whole", () => {
    const resolution = resolveReplacement(
      finding({ class: "permalink", matchedText: "analysis/analysis-120-repoint-source" }),
      permalinkPlan,
      target(),
    );
    expect(resolution.ok && resolution.replacement.newText).toBe(
      "analysis/analysis-121-repoint-destination",
    );
  });

  /** The project prefix is the document's, not the plan's, and is reattached. */
  test("a project-prefixed permalink keeps its prefix", () => {
    const resolution = resolveReplacement(
      finding({
        class: "permalink-project-prefixed",
        matchedText: "fond/analysis/analysis-120-repoint-source",
      }),
      permalinkPlan,
      target(),
    );
    expect(resolution.ok && resolution.replacement.newText).toBe(
      "fond/analysis/analysis-121-repoint-destination",
    );
  });

  test("the longest declared permalink wins when one is a suffix of another", () => {
    const nested = plan({
      permalink_map: {
        "analysis/a-120": "analysis/a-999",
        "deep/analysis/a-120": "deep/analysis/a-121",
      },
    });
    const resolution = resolveReplacement(
      finding({ class: "permalink", matchedText: "deep/analysis/a-120" }),
      nested,
      undefined,
    );
    expect(resolution.ok && resolution.replacement.newText).toBe("deep/analysis/a-121");
  });

  test("a retired permalink falls back to the target's current permalink", () => {
    const resolution = resolveReplacement(
      finding({ class: "permalink", matchedText: "analysis/analysis-028-ancient" }),
      permalinkPlan,
      target({ aliasPermalinks: ["analysis/analysis-028-ancient"] }),
    );
    expect(resolution.ok && resolution.replacement.newText).toBe(
      "analysis/analysis-121-repoint-destination",
    );
  });

  test("a permalink no declared key is contained in is declined", () => {
    const resolution = resolveReplacement(
      finding({ class: "permalink", matchedText: "analysis/unrelated-note" }),
      permalinkPlan,
      undefined,
    );
    expect(!resolution.ok && resolution.reason).toBe("no-mapping");
  });
});

describe("resolveReplacement — entity-id", () => {
  test("a mapped identifier is substituted", () => {
    const resolution = resolveReplacement(finding(), plan(), target());
    expect(resolution.ok && resolution.replacement.newText).toBe("ANALYSIS-121");
  });

  test("a retired identifier falls back to the finding's canonical target", () => {
    const resolution = resolveReplacement(
      finding({ matchedText: "ANALYSIS-028", viaAlias: true }),
      plan(),
      target({ aliasEntityIds: ["ANALYSIS-028"] }),
    );
    expect(resolution.ok && resolution.replacement.newText).toBe("ANALYSIS-121");
  });

  test("an unmapped identifier is declined", () => {
    const resolution = resolveReplacement(
      finding({ matchedText: "ANALYSIS-999", target: "ANALYSIS-999" }),
      plan(),
      undefined,
    );
    expect(!resolution.ok && resolution.reason).toBe("no-mapping");
  });
});

describe("resolveReplacement — entity-id-section", () => {
  const section = (overrides: Partial<ReferenceFinding> = {}) =>
    finding({
      class: "entity-id-section",
      matchedText: "ANALYSIS-120 Section 4",
      sectionFragment: "Section 4",
      ...overrides,
    });

  test("identifier only: the fragment tail is carried through byte-for-byte", () => {
    const resolution = resolveReplacement(section(), plan(), target());
    expect(resolution.ok && resolution.replacement.newText).toBe("ANALYSIS-121 Section 4");
    expect(resolution.ok && resolution.replacement.destination).toEqual({
      entityId: "ANALYSIS-121",
      fragment: "Section 4",
    });
  });

  test("an unusual separator survives when only the identifier changes", () => {
    const resolution = resolveReplacement(
      section({ matchedText: "ANALYSIS-120\t\tSection 4" }),
      plan(),
      target(),
    );
    expect(resolution.ok && resolution.replacement.newText).toBe("ANALYSIS-121\t\tSection 4");
  });

  test("trailing sentence punctuation the scanner stripped is preserved", () => {
    const resolution = resolveReplacement(
      section({ matchedText: "ANALYSIS-120 Section 4." }),
      plan(),
      target(),
    );
    expect(resolution.ok && resolution.replacement.newText).toBe("ANALYSIS-121 Section 4.");
  });

  test("fragment remap applies with the identifier", () => {
    const resolution = resolveReplacement(
      section(),
      plan({ section_map: { "ANALYSIS-120": { "Section 4": "Section 2" } } }),
      target(),
    );
    expect(resolution.ok && resolution.replacement.newText).toBe("ANALYSIS-121 Section 2");
    expect(resolution.ok && resolution.replacement.destination).toEqual({
      entityId: "ANALYSIS-121",
      fragment: "Section 2",
    });
  });

  /**
   * A structural fix renumbers sections without renumbering the note. The
   * identifier map is silent, the section map is not, and the citation still needs
   * repairing — so a fragment-only mapping is a repoint in its own right.
   */
  test("a fragment-only remap repoints even when the identifier is unchanged", () => {
    const resolution = resolveReplacement(
      section(),
      RepointPlanSchema.parse({
        plan_type: "repoint",
        renumber_map: { "ANALYSIS-500": "ANALYSIS-501" },
        section_map: { "ANALYSIS-120": { "Section 4": "Section 2" } },
      }),
      target(),
    );
    expect(resolution.ok && resolution.replacement.newText).toBe("ANALYSIS-120 Section 2");
  });

  test("a designator fragment remaps like an ordinal one", () => {
    const resolution = resolveReplacement(
      section({ matchedText: "ANALYSIS-120 D-3", sectionFragment: "D-3" }),
      plan({ section_map: { "ANALYSIS-120": { "D-3": "D-7" } } }),
      target(),
    );
    expect(resolution.ok && resolution.replacement.newText).toBe("ANALYSIS-121 D-7");
  });

  test("neither map declaring anything is declined rather than written unchanged", () => {
    const resolution = resolveReplacement(
      section({ matchedText: "ANALYSIS-777 Section 4", target: "ANALYSIS-777" }),
      plan(),
      undefined,
    );
    expect(!resolution.ok && resolution.reason).toBe("no-mapping");
  });

  test("a finding missing its sectionFragment is declined as malformed", () => {
    const resolution = resolveReplacement(
      finding({ class: "entity-id-section", matchedText: "ANALYSIS-120 Section 4" }),
      plan(),
      target(),
    );
    expect(!resolution.ok && resolution.reason).toBe("malformed-reference");
  });
});

describe("resolveReplacement — judgment classes", () => {
  test.each([
    "bidirectional-missing-on-target",
    "bidirectional-missing-on-referencer",
    "index-stale",
  ] as const)("%s is never mechanically repointed", (cls) => {
    const resolution = resolveReplacement(
      finding({ class: cls, matchedText: "relates_to [[ANALYSIS-120: Repoint Source]]" }),
      plan(),
      target(),
    );
    expect(!resolution.ok && resolution.reason).toBe("judgment-class");
  });
});

describe("RepointPlanSchema", () => {
  test("a plan with no identifier mapping is refused", () => {
    expect(() =>
      RepointPlanSchema.parse({
        plan_type: "repoint",
        section_map: { "ANALYSIS-120": { "Section 4": "Section 2" } },
      }),
    ).toThrow(/no renumber_map, wikilink_map or permalink_map entry/);
  });

  test("the F-8 invariants hold on every identifier map", () => {
    expect(() =>
      RepointPlanSchema.parse({
        plan_type: "repoint",
        renumber_map: { "ANALYSIS-120": "ANALYSIS-130", "ANALYSIS-121": "ANALYSIS-130" },
      }),
    ).toThrow();
    expect(() =>
      RepointPlanSchema.parse({
        plan_type: "repoint",
        renumber_map: { "ANALYSIS-120": "ANALYSIS-121", "ANALYSIS-121": "ANALYSIS-122" },
      }),
    ).toThrow();
  });

  /**
   * The deliberate exemption. A section renumber cascades — delete section 3 and
   * 4 becomes 3, 5 becomes 4 — which disjointness would reject even though it is
   * unambiguous under the exact-lookup remap this executor performs.
   */
  test("section_map accepts the cascade the identifier maps forbid", () => {
    const parsed = RepointPlanSchema.parse({
      plan_type: "repoint",
      renumber_map: { "ANALYSIS-120": "ANALYSIS-121" },
      section_map: {
        "ANALYSIS-120": { "Section 4": "Section 3", "Section 5": "Section 4" },
      },
    });
    expect(parsed.section_map["ANALYSIS-120"]?.["Section 4"]).toBe("Section 3");
  });

  test("a line break in any map value is refused as structural injection", () => {
    expect(() =>
      RepointPlanSchema.parse({
        plan_type: "repoint",
        wikilink_map: { "ANALYSIS-120: A": "ANALYSIS-121: B\n---\ntitle: forged" },
      }),
    ).toThrow(/line breaks/);
    expect(() =>
      RepointPlanSchema.parse({
        plan_type: "repoint",
        renumber_map: { "ANALYSIS-120": "ANALYSIS-121" },
        section_map: { "ANALYSIS-120": { "Section 4": "Section 2\n## Relations" } },
      }),
    ).toThrow(/line breaks/);
  });

  test("unknown fields are refused rather than ignored", () => {
    expect(() =>
      RepointPlanSchema.parse({
        plan_type: "repoint",
        renumber_map: { "ANALYSIS-120": "ANALYSIS-121" },
        renumber_maps: { typo: "here" },
      }),
    ).toThrow();
  });
});

describe("ReferenceFindingSchema provenance fields", () => {
  test("the two new fields are accepted alongside mode", () => {
    const parsed = finding({
      source: "SEARCH",
      advisory: true,
      mode: "auto",
      searchType: "permalink",
      actualSource: "keyword",
    });
    // Narrowed first: the provenance fields live only on the SEARCH branch, which is
    // the point of the discriminated shape.
    if (parsed.source !== "SEARCH") throw new Error("expected a SEARCH-sourced finding");
    expect(parsed.searchType).toBe("permalink");
    expect(parsed.actualSource).toBe("keyword");
  });

  /**
   * No back-compat, by owner decision. A SEARCH entry recorded under the old shape is
   * missing provenance that was never captured and cannot be reconstructed, so the
   * only honest repair is re-running the scan — and the failure says exactly that
   * instead of surfacing a four-branch union error.
   */
  test("a manifest written before the fields existed is refused, not migrated", () => {
    const legacy = {
      referencingFile: "analysis/A.md",
      line: 1,
      column: 1,
      matchedText: "ANALYSIS-120",
      class: "entity-id",
      target: "ANALYSIS-120",
      viaAlias: false,
      source: "SEARCH",
      advisory: true,
      mode: "keyword",
    };
    expect(ReferenceFindingSchema.safeParse(legacy).success).toBe(false);
    const remedy = detectLegacyManifest({ findings: [legacy] });
    expect(remedy).toContain("searchType");
    expect(remedy).toContain("re-run the scan");
  });

  test("the legacy detector also catches an unlabelled finding and a mislabelled one", () => {
    expect(detectLegacyManifest({ findings: [{ referencingFile: "a.md" }] })).toContain("`source`");
    expect(detectLegacyManifest({ findings: [{ source: "TEXT", mode: "keyword" }] })).toContain(
      "no deterministic leg produces",
    );
    // A well-formed manifest is not flagged.
    expect(detectLegacyManifest({ findings: [{ source: "TEXT" }] })).toBeNull();
  });

  /**
   * `auto` is a request-only routing value. A response claiming it served the row
   * is malformed, and storing it would be provenance that explains nothing.
   */
  test("actualSource refuses the request-only auto value", () => {
    expect(() => finding({ actualSource: "auto" as never })).toThrow();
  });

  test("searchType refuses a value outside the retrieval enum", () => {
    expect(() => finding({ searchType: "keyword" as never })).toThrow();
  });
});
