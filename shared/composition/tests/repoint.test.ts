import { afterAll, describe, expect, test } from "bun:test";
// node:fs is limited to directory ops (mkdtemp/rm) with no Bun equivalent; every
// content read and write below is Bun-native.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkClosure } from "../src/core/reference-closure.js";
import { buildImpactManifest, summarize } from "../src/core/reference-scan.js";
import { executeRepoint } from "../src/core/repoint.js";
import { workBriefEntries } from "../src/core/work-brief.js";
import { main, parseArgs } from "../src/repoint.js";
import {
  type ImpactManifest,
  type ReferenceFinding,
  ReferenceFindingSchema,
} from "../src/schemas/reference-manifest.js";
import { type RepointPlan, RepointPlanSchema } from "../src/schemas/repoint-plan.js";

const FIXTURE_ROOT = join(import.meta.dir, "fixtures", "repoint-tree");
const SOURCE = "analysis/ANALYSIS-120-repoint-source.md";
const REFERRER = "analysis/ANALYSIS-122-repoint-referrer.md";
const DECISION = "decisions/ADR-120-repoint-decision.md";
const FIXED_NOW = "2026-01-01T00:00:00.000Z";

const PLAN_YAML = `plan_type: repoint
renumber_map:
  ANALYSIS-120: ANALYSIS-121
wikilink_map:
  'ANALYSIS-120: Repoint Source': 'ANALYSIS-121: Repoint Destination'
permalink_map:
  analysis/analysis-120-repoint-source: analysis/analysis-121-repoint-destination
section_map:
  ANALYSIS-120:
    Section 4: Section 2
`;

const PLAN: RepointPlan = RepointPlanSchema.parse({
  plan_type: "repoint",
  renumber_map: { "ANALYSIS-120": "ANALYSIS-121" },
  wikilink_map: { "ANALYSIS-120: Repoint Source": "ANALYSIS-121: Repoint Destination" },
  permalink_map: {
    "analysis/analysis-120-repoint-source": "analysis/analysis-121-repoint-destination",
  },
  section_map: { "ANALYSIS-120": { "Section 4": "Section 2" } },
});

const staged: string[] = [];

/**
 * The executor writes, so every test runs against a private copy of the fixture
 * tree. A test that mutated the committed fixtures would pass once and then
 * describe a tree nobody authored.
 */
async function stagedTree(): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "repoint-"));
  staged.push(dir);
  const glob = new Bun.Glob("**/*.md");
  for await (const rel of glob.scan({ cwd: FIXTURE_ROOT, onlyFiles: true, absolute: false })) {
    await Bun.write(join(dir, rel), await Bun.file(join(FIXTURE_ROOT, rel)).text());
  }
  return dir;
}

afterAll(() => {
  for (const dir of staged) rmSync(dir, { recursive: true, force: true });
});

function manifestFor(docsRoot: string): Promise<ImpactManifest> {
  return buildImpactManifest({
    docsRoot,
    targets: [{ path: SOURCE }],
    now: FIXED_NOW,
  });
}

/** Swap in synthetic findings while keeping the manifest self-consistent. */
function withFindings(
  manifest: ImpactManifest,
  findings: readonly ReferenceFinding[],
): ImpactManifest {
  return {
    ...manifest,
    findings: [...findings],
    summary: summarize(findings, manifest.targets),
  };
}

function synthetic(overrides: Partial<ReferenceFinding> = {}): ReferenceFinding {
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

/** The work brief flattened back to a list, for per-entry assertions. */
function residueOf(report: Awaited<ReturnType<typeof executeRepoint>>) {
  return workBriefEntries(report.workBrief);
}

function lineOf(content: string, index: number): string {
  return content.split("\n")[index - 1] ?? "";
}

describe("executeRepoint — the fixture graph", () => {
  test("the manifest under test is purely mechanical, so nothing is diluted", async () => {
    const manifest = await manifestFor(await stagedTree());
    expect(manifest.summary.totalFindings).toBe(9);
    expect(manifest.summary.bySource).toEqual({ TEXT: 7, GRAPH: 0, BOTH: 2, SEARCH: 0 });
    expect(manifest.summary.byClass.wikilink).toBe(3);
    expect(manifest.summary.byClass.permalink).toBe(1);
    expect(manifest.summary.byClass["permalink-project-prefixed"]).toBe(1);
    expect(manifest.summary.byClass["entity-id"]).toBe(2);
    expect(manifest.summary.byClass["entity-id-section"]).toBe(2);
  });

  test("a dry run resolves everything and writes nothing", async () => {
    const root = await stagedTree();
    const before = await Bun.file(join(root, REFERRER)).text();
    const report = await executeRepoint({
      manifest: await manifestFor(root),
      plan: PLAN,
      dryRun: true,
      now: FIXED_NOW,
    });

    expect(report.dryRun).toBe(true);
    expect(report.summary.applied).toBe(9);
    expect(report.summary.residual).toBe(0);
    expect(report.summary.filesChanged).toBe(2);
    expect(await Bun.file(join(root, REFERRER)).text()).toBe(before);
  });

  test("a dry run's per-file diff is what an adjudicator reviews", async () => {
    const root = await stagedTree();
    const report = await executeRepoint({
      manifest: await manifestFor(root),
      plan: PLAN,
      dryRun: true,
      now: FIXED_NOW,
    });
    const referrer = report.files.find((file) => file.path === REFERRER);
    expect(referrer).toBeDefined();
    expect(referrer?.diff.map((hunk) => hunk.line)).toEqual([15, 17, 19, 21, 23, 33]);
    expect(referrer?.diff.find((hunk) => hunk.line === 23)?.after).toContain(
      "ANALYSIS-121 Section 2",
    );
    // The proof-of-work fields are populated even though nothing was written, so
    // the preview is checkable against what an apply would produce.
    expect(referrer?.sha256Before).not.toBe(referrer?.sha256After);
  });

  test("applying repoints every class, including two references on one line", async () => {
    const root = await stagedTree();
    const report = await executeRepoint({
      manifest: await manifestFor(root),
      plan: PLAN,
      dryRun: false,
      now: FIXED_NOW,
    });
    expect(report.summary.applied).toBe(9);
    expect(report.summary.byClass).toEqual({
      wikilink: 3,
      "wikilink-malformed": 0,
      permalink: 1,
      "permalink-project-prefixed": 1,
      "entity-id-section": 2,
      "entity-id": 2,
      "bidirectional-missing-on-target": 0,
      "bidirectional-missing-on-referencer": 0,
      "index-stale": 0,
    });

    const referrer = await Bun.file(join(root, REFERRER)).text();
    expect(lineOf(referrer, 15)).toContain("[[ANALYSIS-121: Repoint Destination]]");
    expect(lineOf(referrer, 17)).toContain("analysis/analysis-121-repoint-destination");
    expect(lineOf(referrer, 19)).toContain("fond/analysis/analysis-121-repoint-destination");
    // Both occurrences on line 21 are substituted, which is what column addressing
    // buys over matching on text within a line.
    expect(lineOf(referrer, 21)).toBe(
      "A bare identifier reads ANALYSIS-121 in prose, and this line carries ANALYSIS-121 twice.",
    );
    expect(lineOf(referrer, 23)).toBe(
      "Citations take two shapes: ANALYSIS-121 Section 2 for an ordinal, and ANALYSIS-121 D-3 for a designator.",
    );
    expect(referrer).not.toContain("ANALYSIS-120");

    // The H3-grouped Relations entry is reached like any other wikilink, and the
    // grouping itself is untouched.
    const decision = await Bun.file(join(root, DECISION)).text();
    expect(lineOf(decision, 33)).toBe("- [[ANALYSIS-121: Repoint Destination]]");
    expect(decision).toContain("### relates_to");
    expect(decision).not.toContain("ANALYSIS-120");
  });

  test("the source note is never touched — moving it is the split's job", async () => {
    const root = await stagedTree();
    const before = await Bun.file(join(root, SOURCE)).text();
    await executeRepoint({
      manifest: await manifestFor(root),
      plan: PLAN,
      dryRun: false,
      now: FIXED_NOW,
    });
    expect(await Bun.file(join(root, SOURCE)).text()).toBe(before);
  });

  test("a second run is a no-op that reports rather than re-writes", async () => {
    const root = await stagedTree();
    const manifest = await manifestFor(root);
    await executeRepoint({ manifest, plan: PLAN, dryRun: false, now: FIXED_NOW });
    const afterFirst = await Bun.file(join(root, REFERRER)).text();

    const second = await executeRepoint({ manifest, plan: PLAN, dryRun: false, now: FIXED_NOW });
    expect(second.summary.applied).toBe(0);
    expect(second.summary.alreadyRepointed).toBe(9);
    expect(second.summary.residual).toBe(0);
    expect(second.files).toEqual([]);
    expect(await Bun.file(join(root, REFERRER)).text()).toBe(afterFirst);
  });
});

describe("executeRepoint — closing the loop with the closure checker", () => {
  /**
   * The acceptance test the pipeline already shipped without a producer. The
   * closure report has always carried an `UPDATED` status; before this stage
   * existed nothing could make an entry reach it.
   */
  test("every repaired finding reaches UPDATED and the gate closes", async () => {
    const root = await stagedTree();
    const manifest = await manifestFor(root);
    const report = await executeRepoint({ manifest, plan: PLAN, dryRun: false, now: FIXED_NOW });
    expect(report.summary.applied).toBe(9);

    const closure = await checkClosure({ manifest, now: FIXED_NOW });
    expect(closure.entries).toHaveLength(9);
    expect(closure.entries.every((entry) => entry.status === "UPDATED")).toBe(true);
    expect(closure.summary.updated).toBe(9);
    expect(closure.summary.outstanding).toBe(0);
    expect(closure.summary.closed).toBe(true);
  });

  test("before the repoint the same check reports every finding OUTSTANDING", async () => {
    const root = await stagedTree();
    const manifest = await manifestFor(root);
    const closure = await checkClosure({ manifest, now: FIXED_NOW });
    expect(closure.summary.outstanding).toBe(9);
    expect(closure.summary.updated).toBe(0);
    expect(closure.summary.closed).toBe(false);
  });

  /**
   * An honest boundary rather than a defect. Repointing inbound references while
   * the target keeps its old identity leaves the target's own Relations pointing
   * at notes that no longer point back, and the closure re-scan surfaces that as
   * NEW findings. In the real workflow the split renumbers the target too; this
   * pins what happens when only half the operation runs.
   */
  test("repointing without renumbering the target surfaces the resulting one-way edges", async () => {
    const root = await stagedTree();
    const manifest = await manifestFor(root);
    await executeRepoint({ manifest, plan: PLAN, dryRun: false, now: FIXED_NOW });

    const closure = await checkClosure({ manifest, now: FIXED_NOW });
    expect(closure.newFindings).toHaveLength(2);
    expect(
      closure.newFindings.every((found) => found.class === "bidirectional-missing-on-referencer"),
    ).toBe(true);
    // New findings are reported alongside rather than folded in, so they never
    // silently reopen a gate the prior manifest closed.
    expect(closure.summary.closed).toBe(true);
  });
});

describe("executeRepoint — the residual worklist", () => {
  test("bi-directional closure findings are never auto-repaired", async () => {
    const root = await stagedTree();
    const manifest = await manifestFor(root);
    const report = await executeRepoint({
      manifest: withFindings(manifest, [
        synthetic({
          class: "bidirectional-missing-on-target",
          matchedText: "relates_to [[ANALYSIS-120: Repoint Source]]",
          source: "GRAPH",
          relation: {
            verb: "relates_to",
            expectedInverse: "relates_to",
            counterpartFile: SOURCE,
          },
        }),
      ]),
      plan: PLAN,
      dryRun: false,
      now: FIXED_NOW,
    });
    expect(report.summary.applied).toBe(0);
    expect(residueOf(report)).toHaveLength(1);
    expect(residueOf(report)[0]?.reason).toBe("judgment-class");
    // The repair instruction the finding already carries is surfaced rather than
    // left for the reader to reconstruct from the class name.
    expect(residueOf(report)[0]?.detail).toContain(SOURCE);
  });

  test("advisory search entries are worklist items, never write sources", async () => {
    const root = await stagedTree();
    const manifest = await manifestFor(root);
    const report = await executeRepoint({
      manifest: withFindings(manifest, [
        synthetic({ source: "SEARCH", advisory: true, mode: "semantic", actualSource: "keyword" }),
      ]),
      plan: PLAN,
      dryRun: false,
      now: FIXED_NOW,
    });
    expect(report.summary.applied).toBe(0);
    expect(residueOf(report)[0]?.reason).toBe("advisory");
  });

  test("a malformed wikilink is repaired by hand, not repointed", async () => {
    const root = await stagedTree();
    const manifest = await manifestFor(root);
    const report = await executeRepoint({
      manifest: withFindings(manifest, [
        synthetic({
          class: "wikilink-malformed",
          matchedText: "[[ANALYSIS-120 Repoint Source]]",
        }),
      ]),
      plan: PLAN,
      dryRun: false,
      now: FIXED_NOW,
    });
    expect(residueOf(report)[0]?.reason).toBe("malformed-reference");
  });

  /**
   * The check that keeps the executor from writing a citation that reads correctly
   * and points at nothing. Section 9 is deliberately absent from the destination.
   */
  test("a citation whose section is absent at the destination is downgraded", async () => {
    const root = await stagedTree();
    const manifest = await manifestFor(root);
    const report = await executeRepoint({
      manifest: withFindings(manifest, [
        synthetic({
          class: "entity-id-section",
          matchedText: "ANALYSIS-120 Section 9",
          sectionFragment: "Section 9",
        }),
      ]),
      plan: PLAN,
      dryRun: false,
      now: FIXED_NOW,
    });
    expect(report.summary.applied).toBe(0);
    expect(residueOf(report)[0]?.reason).toBe("section-absent");
    expect(residueOf(report)[0]?.detail).toContain("ANALYSIS-121-repoint-destination.md");
    expect(report.workBrief.summary.byReason["section-absent"]).toBe(1);
  });

  test("a citation whose section IS present at the destination is repointed", async () => {
    const root = await stagedTree();
    const manifest = await manifestFor(root);
    const report = await executeRepoint({
      manifest: withFindings(manifest, [
        synthetic({
          class: "entity-id-section",
          line: 23,
          column: 71,
          matchedText: "ANALYSIS-120 D-3",
          sectionFragment: "D-3",
        }),
      ]),
      plan: PLAN,
      dryRun: true,
      now: FIXED_NOW,
    });
    expect(report.summary.applied).toBe(1);
    expect(report.workBrief.summary.byReason["section-absent"]).toBe(0);
  });

  test("a renumber onto an identifier no note carries cannot be verified", async () => {
    const root = await stagedTree();
    const manifest = await manifestFor(root);
    const report = await executeRepoint({
      manifest: withFindings(manifest, [
        synthetic({
          class: "entity-id-section",
          matchedText: "ANALYSIS-120 Section 4",
          sectionFragment: "Section 4",
        }),
      ]),
      plan: RepointPlanSchema.parse({
        plan_type: "repoint",
        renumber_map: { "ANALYSIS-120": "ANALYSIS-999" },
      }),
      dryRun: false,
      now: FIXED_NOW,
    });
    expect(residueOf(report)[0]?.reason).toBe("destination-unresolved");
  });

  test("a finding the plan says nothing about is left alone, not guessed at", async () => {
    const root = await stagedTree();
    const manifest = await manifestFor(root);
    const report = await executeRepoint({
      manifest,
      plan: RepointPlanSchema.parse({
        plan_type: "repoint",
        renumber_map: { "ANALYSIS-500": "ANALYSIS-501" },
      }),
      dryRun: false,
      now: FIXED_NOW,
    });
    expect(report.summary.applied).toBe(0);
    expect(report.workBrief.summary.byReason["no-mapping"]).toBe(9);
  });

  test("an address whose text no longer matches is drift, not a nearby guess", async () => {
    const root = await stagedTree();
    const manifest = await manifestFor(root);
    const report = await executeRepoint({
      manifest: withFindings(manifest, [synthetic({ line: 21, column: 3 })]),
      plan: PLAN,
      dryRun: false,
      now: FIXED_NOW,
    });
    expect(report.summary.applied).toBe(0);
    expect(residueOf(report)[0]?.reason).toBe("address-drift");
  });

  test("a referencing file that has since been deleted is drift", async () => {
    const root = await stagedTree();
    const manifest = await manifestFor(root);
    const report = await executeRepoint({
      manifest: withFindings(manifest, [
        synthetic({ referencingFile: "analysis/ANALYSIS-900-gone.md" }),
      ]),
      plan: PLAN,
      dryRun: false,
      now: FIXED_NOW,
    });
    expect(residueOf(report)[0]?.reason).toBe("address-drift");
    expect(residueOf(report)[0]?.detail).toContain("no longer exists");
  });

  /**
   * A nested reference: a bare identifier for one target sitting inside a wikilink
   * for another. The scanner's containment suppression only works within a single
   * target, so this reaches the executor, and applying both would corrupt the line.
   */
  test("overlapping spans on one line surface both participants and write neither", async () => {
    const root = await stagedTree();
    const manifest = await manifestFor(root);
    const overlapping = [
      synthetic({
        class: "wikilink",
        line: 15,
        column: 32,
        matchedText: "[[ANALYSIS-120: Repoint Source]]",
      }),
      synthetic({ class: "entity-id", line: 15, column: 34, matchedText: "ANALYSIS-120" }),
    ];
    const report = await executeRepoint({
      manifest: withFindings(manifest, overlapping),
      plan: PLAN,
      dryRun: false,
      now: FIXED_NOW,
    });
    expect(report.summary.applied).toBe(0);
    expect(report.workBrief.summary.byReason["overlapping-edit"]).toBe(2);
    expect(await Bun.file(join(root, REFERRER)).text()).toContain(
      "[[ANALYSIS-120: Repoint Source]]",
    );
  });

  /**
   * The residue arrives as an executable brief, not a dump. This is the integration
   * assertion: an agent handed the report can open one file and act, without
   * re-deriving where to look or what edit to make.
   */
  test("the residue is a work brief grouped by repair site with everything to act on", async () => {
    const root = await stagedTree();
    const manifest = await manifestFor(root);
    const report = await executeRepoint({
      manifest: withFindings(manifest, [
        synthetic({
          class: "entity-id-section",
          line: 23,
          column: 28,
          matchedText: "ANALYSIS-120 Section 9",
          sectionFragment: "Section 9",
        }),
        synthetic({
          class: "bidirectional-missing-on-target",
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
      ]),
      plan: PLAN,
      dryRun: true,
      now: FIXED_NOW,
    });

    expect(report.workBrief.summary.entries).toBe(2);
    // Two different repair sites: the citation is repaired where it sits, the
    // missing inverse edge on the note that lacks it.
    expect(report.workBrief.notes.map((note) => note.path).sort()).toEqual([SOURCE, REFERRER]);

    const forSource = report.workBrief.notes.find((note) => note.path === SOURCE);
    expect(forSource?.permalink).toBe("analysis/analysis-120-repoint-source");
    expect(forSource?.entries[0]?.evidence.evidenceFile).toBe(REFERRER);
    expect(forSource?.entries[0]?.suggestedAction).toContain("## Relations");

    const forReferrer = report.workBrief.notes.find((note) => note.path === REFERRER);
    expect(forReferrer?.entries[0]?.anchor).toBe('line 23, col 28, cites "Section 9"');
    expect(forReferrer?.entries[0]?.causingOperation).toContain("renumbered ANALYSIS-120");
    expect(forReferrer?.entries[0]?.suggestedAction).toContain('section_map."ANALYSIS-120"');
  });

  test("a run with nothing declined carries an empty brief", async () => {
    const root = await stagedTree();
    const report = await executeRepoint({
      manifest: await manifestFor(root),
      plan: PLAN,
      dryRun: true,
      now: FIXED_NOW,
    });
    expect(report.workBrief.notes).toEqual([]);
    expect(report.workBrief.summary.entries).toBe(0);
  });

  test("byTarget accounts for every finding exactly once", async () => {
    const root = await stagedTree();
    const manifest = await manifestFor(root);
    const report = await executeRepoint({ manifest, plan: PLAN, dryRun: true, now: FIXED_NOW });
    const outcome = report.summary.byTarget["ANALYSIS-120"];
    expect(outcome).toEqual({ applied: 9, alreadyRepointed: 0, residual: 0 });
    expect(report.summary.totalFindings).toBe(9);
  });
});

describe("executeRepoint — path safety", () => {
  test("a traversal path in the manifest is refused before anything is read", async () => {
    const root = await stagedTree();
    const manifest = await manifestFor(root);
    const hostile = withFindings(manifest, [synthetic({ referencingFile: "../../etc/passwd.md" })]);
    expect(
      executeRepoint({ manifest: hostile, plan: PLAN, dryRun: true, now: FIXED_NOW }),
    ).rejects.toThrow(/CWE-22/);
  });

  test("an absolute path in the manifest is refused", async () => {
    const root = await stagedTree();
    const manifest = await manifestFor(root);
    const hostile = withFindings(manifest, [synthetic({ referencingFile: "/etc/passwd.md" })]);
    expect(
      executeRepoint({ manifest: hostile, plan: PLAN, dryRun: true, now: FIXED_NOW }),
    ).rejects.toThrow(/CWE-22/);
  });
});

describe("repoint CLI", () => {
  test("both inputs are required", () => {
    expect(() => parseArgs(["--plan", "p.yaml"])).toThrow(/--manifest/);
    expect(() => parseArgs(["--manifest", "m.json"])).toThrow(/--plan/);
    expect(() => parseArgs([])).toThrow(/--manifest/);
  });

  test("preview is the default and --apply is the opt-in to writing", () => {
    expect(parseArgs(["--manifest", "m.json", "--plan", "p.yaml"]).apply).toBe(false);
    expect(parseArgs(["--manifest", "m.json", "--plan", "p.yaml", "--apply"]).apply).toBe(true);
    // Saying the default out loud is not an error.
    expect(parseArgs(["--manifest", "m.json", "--plan", "p.yaml", "--dry-run"]).apply).toBe(false);
  });

  test("a flag without its value, and an unknown flag, are both usage errors", () => {
    expect(() => parseArgs(["--manifest", "--plan", "p.yaml"])).toThrow(/--manifest requires/);
    expect(() => parseArgs(["--manifest", "m.json", "--plan", "p.yaml", "--force"])).toThrow(
      /unknown argument/,
    );
  });

  async function cliInputs(root: string): Promise<{ manifest: string; plan: string }> {
    const manifest = join(root, "manifest.json");
    const plan = join(root, "repoint.yaml");
    await Bun.write(manifest, JSON.stringify(await manifestFor(root)));
    await Bun.write(plan, PLAN_YAML);
    return { manifest, plan };
  }

  test("a clean preview exits 0 and writes nothing", async () => {
    const root = await stagedTree();
    const { manifest, plan } = await cliInputs(root);
    const before = await Bun.file(join(root, REFERRER)).text();
    const out = join(root, "report.json");
    expect(await main(["--manifest", manifest, "--plan", plan, "--out", out])).toBe(0);
    expect(await Bun.file(join(root, REFERRER)).text()).toBe(before);

    const report = await Bun.file(out).json();
    expect(report.dryRun).toBe(true);
    expect(report.summary.applied).toBe(9);
  });

  test("--apply writes and still exits 0 when the worklist is empty", async () => {
    const root = await stagedTree();
    const { manifest, plan } = await cliInputs(root);
    // --out rather than stdout: the report is 200 lines of JSON and belongs in a
    // file, not interleaved with the suite's own output.
    const out = join(root, "applied.json");
    expect(await main(["--manifest", manifest, "--plan", plan, "--apply", "--out", out])).toBe(0);
    expect(await Bun.file(join(root, REFERRER)).text()).toContain("ANALYSIS-121");
    expect((await Bun.file(out).json()).dryRun).toBe(false);
  });

  /** Exit 2 is "there is work here", matching the closure checker and defrag. */
  test("a residual worklist exits 2 rather than failing", async () => {
    const root = await stagedTree();
    const manifest = join(root, "manifest.json");
    const plan = join(root, "repoint.yaml");
    await Bun.write(manifest, JSON.stringify(await manifestFor(root)));
    await Bun.write(plan, "plan_type: repoint\nrenumber_map:\n  ANALYSIS-500: ANALYSIS-501\n");
    expect(
      await main(["--manifest", manifest, "--plan", plan, "--out", join(root, "residual.json")]),
    ).toBe(2);
  });

  test("a missing file, a malformed plan and a bad manifest all exit 1", async () => {
    const root = await stagedTree();
    const { manifest, plan } = await cliInputs(root);
    expect(await main(["--manifest", join(root, "absent.json"), "--plan", plan])).toBe(1);

    const emptyPlan = join(root, "empty.yaml");
    await Bun.write(emptyPlan, "plan_type: repoint\n");
    expect(await main(["--manifest", manifest, "--plan", emptyPlan])).toBe(1);

    const badManifest = join(root, "bad.json");
    await Bun.write(badManifest, "{ not json");
    expect(await main(["--manifest", badManifest, "--plan", plan])).toBe(1);

    const wrongShape = join(root, "wrong.json");
    await Bun.write(wrongShape, JSON.stringify({ docsRoot: root }));
    expect(await main(["--manifest", wrongShape, "--plan", plan])).toBe(1);
  });

  test("--docs-root overrides the root the manifest recorded", async () => {
    const first = await stagedTree();
    const second = await stagedTree();
    const manifest = join(first, "manifest.json");
    const plan = join(first, "repoint.yaml");
    await Bun.write(manifest, JSON.stringify(await manifestFor(first)));
    await Bun.write(plan, PLAN_YAML);

    expect(
      await main([
        "--manifest",
        manifest,
        "--plan",
        plan,
        "--docs-root",
        second,
        "--apply",
        "--out",
        join(first, "rerooted.json"),
      ]),
    ).toBe(0);
    expect(await Bun.file(join(second, REFERRER)).text()).toContain("ANALYSIS-121");
    expect(await Bun.file(join(first, REFERRER)).text()).toContain("ANALYSIS-120");
  });
});
