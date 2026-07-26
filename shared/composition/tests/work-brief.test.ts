import { describe, expect, test } from "bun:test";
import { buildWorkBrief, workBriefEntries } from "../src/core/work-brief.js";
import {
  type ReferenceFinding,
  ReferenceFindingSchema,
} from "../src/schemas/reference-manifest.js";
import { type RepointPlan, RepointPlanSchema } from "../src/schemas/repoint-plan.js";
import type { RepointResidual } from "../src/schemas/repoint-residue.js";
import { WorkBriefSchema } from "../src/schemas/work-brief.js";

const REFERRER = "analysis/ANALYSIS-122-repoint-referrer.md";
const SOURCE = "analysis/ANALYSIS-120-repoint-source.md";

function finding(overrides: Partial<ReferenceFinding> = {}): ReferenceFinding {
  return ReferenceFindingSchema.parse({
    referencingFile: REFERRER,
    line: 21,
    column: 25,
    matchedText: "ANALYSIS-120",
    class: "entity-id",
    target: "ANALYSIS-120",
    viaAlias: false,
    source: "TEXT",
    advisory: false,
    ...overrides,
  });
}

const PLAN: RepointPlan = RepointPlanSchema.parse({
  plan_type: "repoint",
  renumber_map: { "ANALYSIS-120": "ANALYSIS-121" },
  wikilink_map: { "ANALYSIS-120: Repoint Source": "ANALYSIS-121: Repoint Destination" },
  permalink_map: {
    "analysis/analysis-120-repoint-source": "analysis/analysis-121-repoint-destination",
  },
  section_map: { "ANALYSIS-120": { "Section 4": "Section 2" } },
});

const permalinks: Record<string, string> = {
  [REFERRER]: "analysis/analysis-122-repoint-referrer",
  [SOURCE]: "analysis/analysis-120-repoint-source",
};
const resolver = (path: string) => permalinks[path] ?? "";

function residual(
  reason: RepointResidual["reason"],
  overrides: Partial<ReferenceFinding> = {},
  detail = "machine detail",
): RepointResidual {
  return { finding: finding(overrides), reason, detail };
}

describe("buildWorkBrief — grouping", () => {
  /**
   * The grouping key is where the EDIT goes, not where the evidence sits. For a
   * bi-directional finding those differ, and grouping by evidence would send an
   * agent to open a file that needs no change.
   */
  test("a bi-directional finding groups under the note the missing edge belongs on", () => {
    const brief = buildWorkBrief(
      [
        residual("judgment-class", {
          class: "bidirectional-missing-on-target",
          matchedText: "relates_to [[ANALYSIS-120: Repoint Source]]",
          source: "GRAPH",
          column: 1,
          relation: {
            verb: "relates_to",
            expectedInverse: "relates_to",
            counterpartFile: SOURCE,
          },
        }),
      ],
      PLAN,
      resolver,
    );
    expect(brief.notes).toHaveLength(1);
    expect(brief.notes[0]?.path).toBe(SOURCE);
    expect(brief.notes[0]?.entries[0]?.evidence.evidenceFile).toBe(REFERRER);
    expect(brief.notes[0]?.entries[0]?.evidence.counterpartFile).toBe(SOURCE);
  });

  test("a text finding groups under the note carrying it", () => {
    const brief = buildWorkBrief([residual("no-mapping")], PLAN, resolver);
    expect(brief.notes[0]?.path).toBe(REFERRER);
  });

  test("each note carries its permalink so a note can be opened either way", () => {
    const brief = buildWorkBrief([residual("no-mapping")], PLAN, resolver);
    expect(brief.notes[0]?.permalink).toBe("analysis/analysis-122-repoint-referrer");
  });

  test("an unresolvable note reports an empty permalink rather than inventing one", () => {
    const brief = buildWorkBrief(
      [residual("no-mapping", { referencingFile: "analysis/ANALYSIS-900-unknown.md" })],
      PLAN,
      resolver,
    );
    expect(brief.notes[0]?.permalink).toBe("");
  });

  test("entries within a note run top-to-bottom, so one pass down the file closes them", () => {
    const brief = buildWorkBrief(
      [
        residual("no-mapping", { line: 33, column: 14 }),
        residual("no-mapping", { line: 15, column: 32 }),
        residual("no-mapping", { line: 21, column: 70 }),
        residual("no-mapping", { line: 21, column: 25 }),
      ],
      PLAN,
      resolver,
    );
    expect(brief.notes[0]?.entries.map((entry) => [entry.line, entry.column])).toEqual([
      [15, 32],
      [21, 25],
      [21, 70],
      [33, 14],
    ]);
  });

  /** Heaviest first: a partially-worked brief has then closed the most work. */
  test("notes run heaviest-first, ties broken by path", () => {
    const brief = buildWorkBrief(
      [
        residual("no-mapping", { referencingFile: "analysis/A.md", line: 1 }),
        residual("no-mapping", { referencingFile: "analysis/B.md", line: 1 }),
        residual("no-mapping", { referencingFile: "analysis/B.md", line: 2 }),
        residual("no-mapping", { referencingFile: "analysis/B.md", line: 3 }),
        residual("no-mapping", { referencingFile: "analysis/C.md", line: 1 }),
      ],
      PLAN,
      resolver,
    );
    expect(brief.notes.map((note) => [note.path, note.entries.length])).toEqual([
      ["analysis/B.md", 3],
      ["analysis/A.md", 1],
      ["analysis/C.md", 1],
    ]);
  });

  test("an empty residue produces an empty brief, not an empty-note placeholder", () => {
    const brief = buildWorkBrief([], PLAN, resolver);
    expect(brief.notes).toEqual([]);
    expect(brief.summary).toEqual({
      entries: 0,
      notes: 0,
      byReason: {
        "judgment-class": 0,
        "malformed-reference": 0,
        advisory: 0,
        "no-mapping": 0,
        "section-absent": 0,
        "destination-unresolved": 0,
        "address-drift": 0,
        "overlapping-edit": 0,
      },
    });
  });
});

describe("buildWorkBrief — the anchor", () => {
  test("a text finding's anchor gives line and column", () => {
    const brief = buildWorkBrief([residual("no-mapping")], PLAN, resolver);
    expect(brief.notes[0]?.entries[0]?.anchor).toBe("line 21, col 25");
  });

  test("a section citation's anchor names the cited fragment", () => {
    const brief = buildWorkBrief(
      [
        residual("section-absent", {
          class: "entity-id-section",
          line: 23,
          column: 28,
          matchedText: "ANALYSIS-120 Section 9",
          sectionFragment: "Section 9",
        }),
      ],
      PLAN,
      resolver,
    );
    expect(brief.notes[0]?.entries[0]?.anchor).toBe('line 23, col 28, cites "Section 9"');
  });

  /**
   * A graph finding's column is 1 by construction, not by measurement. Reporting it
   * would read like a real position and send an agent to the start of the line.
   */
  test("a graph finding's anchor omits the synthetic column", () => {
    const brief = buildWorkBrief(
      [
        residual("judgment-class", {
          class: "bidirectional-missing-on-referencer",
          line: 30,
          column: 1,
          matchedText: "relates_to [[ANALYSIS-120: Repoint Source]]",
          source: "GRAPH",
          relation: {
            verb: "relates_to",
            expectedInverse: "relates_to",
            counterpartFile: SOURCE,
          },
        }),
      ],
      PLAN,
      resolver,
    );
    const entry = brief.notes[0]?.entries[0];
    expect(entry?.anchor).toBe("line 30");
    expect(entry?.column).toBeUndefined();
  });
});

describe("buildWorkBrief — the causing operation", () => {
  test("every declared change to the target is reported", () => {
    const brief = buildWorkBrief([residual("no-mapping")], PLAN, resolver);
    const causing = brief.notes[0]?.entries[0]?.causingOperation ?? "";
    expect(causing).toContain("renumbered ANALYSIS-120 -> ANALYSIS-121");
    expect(causing).toContain('retitled "ANALYSIS-120: Repoint Source"');
    expect(causing).toContain("permalink moved analysis/analysis-120-repoint-source");
    expect(causing).toContain("sections renumbered within ANALYSIS-120 (Section 4 -> Section 2)");
  });

  /**
   * The common benign case — a manifest covering 28 targets against a plan touching
   * three. Saying "the plan declares nothing" is the honest answer; inventing a
   * cause would make the brief assert a restructuring nobody planned.
   */
  test("a target the plan says nothing about is reported as exactly that", () => {
    const brief = buildWorkBrief(
      [residual("no-mapping", { target: "ANALYSIS-777", matchedText: "ANALYSIS-777" })],
      PLAN,
      resolver,
    );
    expect(brief.notes[0]?.entries[0]?.causingOperation).toContain(
      "the plan declares no change to ANALYSIS-777",
    );
  });
});

describe("buildWorkBrief — the suggested action", () => {
  test("a one-way edge names the verb, the note, and the section to edit", () => {
    const brief = buildWorkBrief(
      [
        residual("judgment-class", {
          class: "bidirectional-missing-on-target",
          matchedText: "part_of [[ANALYSIS-120: Repoint Source]]",
          source: "GRAPH",
          column: 1,
          relation: { verb: "part_of", expectedInverse: "contains", counterpartFile: SOURCE },
        }),
      ],
      PLAN,
      resolver,
    );
    const action = brief.notes[0]?.entries[0]?.suggestedAction ?? "";
    expect(action).toContain(SOURCE);
    expect(action).toContain('"contains');
    expect(action).toContain("## Relations");
  });

  test("an absent section names the exact section_map key that would fix it", () => {
    const brief = buildWorkBrief(
      [
        residual("section-absent", {
          class: "entity-id-section",
          matchedText: "ANALYSIS-120 Section 9",
          sectionFragment: "Section 9",
        }),
      ],
      PLAN,
      resolver,
    );
    const action = brief.notes[0]?.entries[0]?.suggestedAction ?? "";
    expect(action).toContain('section_map."ANALYSIS-120"."Section 9"');
    expect(action).toContain("ANALYSIS-121");
  });

  /** The decision stays with the reader; the brief names it rather than guessing. */
  test("an unmapped reference names the decision instead of asserting a repair", () => {
    const brief = buildWorkBrief(
      [residual("no-mapping", { target: "ANALYSIS-777", matchedText: "ANALYSIS-777" })],
      PLAN,
      resolver,
    );
    const action = brief.notes[0]?.entries[0]?.suggestedAction ?? "";
    expect(action).toContain("confirm whether ANALYSIS-777 moved");
    expect(action).toContain("this reference is correct as written");
  });

  test("an unresolvable destination points at the missing prerequisite step", () => {
    const brief = buildWorkBrief(
      [
        residual("destination-unresolved", {
          class: "entity-id-section",
          matchedText: "ANALYSIS-120 Section 4",
          sectionFragment: "Section 4",
        }),
      ],
      PLAN,
      resolver,
    );
    expect(brief.notes[0]?.entries[0]?.suggestedAction).toContain(
      "land the split or renumber that creates it",
    );
  });

  test("drift points at the re-scan rather than at a nearby guess", () => {
    const brief = buildWorkBrief([residual("address-drift")], PLAN, resolver);
    expect(brief.notes[0]?.entries[0]?.suggestedAction).toContain("re-run reference-scan");
  });

  /**
   * The two advisory probes need different actions. An index edge-existence row is
   * not prose, so telling an agent to "read the line and decide whether this prose
   * names X" costs a wasted lookup on every one of them.
   */
  test("an index edge-existence entry gets the edge action, not the prose action", () => {
    const brief = buildWorkBrief(
      [
        residual("advisory", {
          class: "index-stale",
          line: 1,
          column: 1,
          source: "SEARCH",
          advisory: true,
          matchedText: "index holds an edge between ANALYSIS-120 and PRD-001 (verb not trusted)",
        }),
      ],
      PLAN,
      resolver,
    );
    const entry = brief.notes[0]?.entries[0];
    expect(entry?.suggestedAction).toContain("## Relations");
    expect(entry?.suggestedAction).toContain("verb is not evidence");
    expect(entry?.suggestedAction).not.toContain("this prose names");
  });

  /** A synthetic address is not a measurement and must not be printed as one. */
  test("an entry with no measured position reads as whole-note, not line 1 col 1", () => {
    const brief = buildWorkBrief(
      [
        residual("advisory", {
          class: "index-stale",
          line: 1,
          column: 1,
          source: "SEARCH",
          advisory: true,
          matchedText: "index holds an edge between ANALYSIS-120 and PRD-001 (verb not trusted)",
        }),
      ],
      PLAN,
      resolver,
    );
    const entry = brief.notes[0]?.entries[0];
    expect(entry?.anchor).toBe("whole note");
    expect(entry?.column).toBeUndefined();
  });

  test("an advisory entry is framed as a judgment, never as an edit to apply", () => {
    const brief = buildWorkBrief(
      [residual("advisory", { source: "SEARCH", advisory: true, matchedText: "the source note" })],
      PLAN,
      resolver,
    );
    expect(brief.notes[0]?.entries[0]?.suggestedAction).toContain(
      "search results are never written from",
    );
  });

  test("every reason produces a non-empty action", () => {
    const reasons: Array<RepointResidual["reason"]> = [
      "judgment-class",
      "malformed-reference",
      "advisory",
      "no-mapping",
      "section-absent",
      "destination-unresolved",
      "address-drift",
      "overlapping-edit",
    ];
    for (const reason of reasons) {
      const brief = buildWorkBrief([residual(reason)], PLAN, resolver);
      const entry = brief.notes[0]?.entries[0];
      expect(entry?.suggestedAction.length, `${reason} has no suggested action`).toBeGreaterThan(0);
      expect(entry?.causingOperation.length, `${reason} has no causing operation`).toBeGreaterThan(
        0,
      );
    }
  });
});

describe("buildWorkBrief — shape and totals", () => {
  test("the brief satisfies its schema", () => {
    const brief = buildWorkBrief(
      [
        residual("no-mapping"),
        residual("advisory", { source: "SEARCH", advisory: true, line: 5 }),
        residual("judgment-class", {
          class: "bidirectional-missing-on-target",
          column: 1,
          matchedText: "relates_to [[ANALYSIS-120: Repoint Source]]",
          source: "GRAPH",
          relation: {
            verb: "relates_to",
            expectedInverse: "relates_to",
            counterpartFile: SOURCE,
          },
        }),
      ],
      PLAN,
      resolver,
    );
    expect(WorkBriefSchema.safeParse(brief).success).toBe(true);
  });

  test("totals and per-reason counts account for every entry once", () => {
    const brief = buildWorkBrief(
      [residual("no-mapping"), residual("no-mapping", { line: 2 }), residual("address-drift")],
      PLAN,
      resolver,
    );
    expect(brief.summary.entries).toBe(3);
    expect(brief.summary.byReason["no-mapping"]).toBe(2);
    expect(brief.summary.byReason["address-drift"]).toBe(1);
    expect(workBriefEntries(brief)).toHaveLength(3);
    expect(Object.values(brief.summary.byReason).reduce((sum, count) => sum + count, 0)).toBe(3);
  });

  test("the detail the executor recorded survives into the brief", () => {
    const brief = buildWorkBrief(
      [residual("no-mapping", {}, "renumber_map declares no replacement")],
      PLAN,
      resolver,
    );
    expect(brief.notes[0]?.entries[0]?.detail).toBe("renumber_map declares no replacement");
  });
});
