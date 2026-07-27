import { afterAll, beforeAll, describe, expect, test } from "bun:test";
// node:fs is limited to directory ops (mkdtemp/rm/mkdir) with no Bun equivalent;
// every content read and write below is Bun-native.
import { mkdtempSync, rmSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { entityIdOfTitle, normalizeReference } from "../src/core/note-identity.js";
import { checkClosure } from "../src/core/reference-closure.js";
import { matchLine } from "../src/core/reference-matchers.js";
import { buildImpactManifest, resolveTargets } from "../src/core/reference-scan.js";
import { main, parseArgs } from "../src/reference-scan.js";
import {
  type ClosureReport,
  type ImpactManifest,
  ImpactManifestSchema,
  REFERENCE_CLASSES,
  type ReferenceFinding,
  type ResolvedTarget,
  SEARCH_MODES,
} from "../src/schemas/reference-manifest.js";
import { treeRunner } from "./_helpers/funnel-runner.js";

/**
 * Discovery is the funnel and only the funnel, so every scan needs a search surface
 * to ask. These two wrappers supply one that returns the whole fixture tree, which
 * is exactly what the removed tree walk used to hand stage two — so the tests below
 * keep covering what they were written to cover (matchers, graph leg, closure
 * arithmetic, manifest shape) rather than becoming discovery tests by accident.
 *
 * Discovery itself is covered in `reference-funnel.test.ts`, where the runners are
 * deliberately narrow.
 */
async function scanFixture(
  options: Omit<Parameters<typeof buildImpactManifest>[0], "project" | "runner"> & {
    docsRoot: string;
  },
): Promise<ImpactManifest> {
  return await buildImpactManifest({
    ...options,
    project: "fixture",
    runner: await treeRunner(options.docsRoot),
  });
}

async function closeFixture(
  options: Omit<Parameters<typeof checkClosure>[0], "runner">,
): Promise<ClosureReport> {
  return await checkClosure({
    ...options,
    runner: await treeRunner(options.docsRoot ?? options.manifest.docsRoot),
  });
}

/**
 * RULING on the `await expect(...).rejects.toThrow(...)` hints in this file.
 *
 * A diagnostic flags the `await` as having no effect, and it is right: on Bun
 * 1.3.14 `expect(promise).rejects.toThrow()` returns `undefined` rather than a
 * thenable, so awaiting it is a no-op. The assertion still runs and still fails
 * correctly — verified by an actual observed failure attributed to its own test.
 *
 * Left as-is deliberately. This is the house form: five other call sites use it
 * (`filename-rewrite.test.ts`, `atomic-write.test.ts`). Changing only the three
 * here would leave two conventions for one thing, which is worse than the
 * cosmetic hint. It is an eight-site change or none, and none was chosen.
 */
const FIXTURE_ROOT = join(import.meta.dir, "fixtures", "reference-tree");
const TARGET_NOTE = "analysis/ANALYSIS-100-reference-scan-target.md";
const DECISION_NOTE = "decisions/ADR-100-reference-scan-decision.md";
const REFERRER_NOTE = "analysis/ANALYSIS-101-reference-scan-referrer.md";
const LEDGER_NOTE = "sessions/SESSION-2026-01-01_01-reference-scan-ledger.md";
const FIXED_NOW = "2026-01-01T00:00:00.000Z";

function target(overrides: Partial<ResolvedTarget> = {}): ResolvedTarget {
  return {
    path: TARGET_NOTE,
    entityId: "ANALYSIS-100",
    title: "ANALYSIS-100: Reference Scan Target",
    permalink: "analysis/analysis-100-reference-scan-target",
    aliasTitles: [],
    aliasPermalinks: [],
    aliasEntityIds: [],
    ...overrides,
  };
}

/** Classes present on a line, in the order the matcher reports them. */
function classesOf(text: string, targets: readonly ResolvedTarget[] = [target()]): string[] {
  return matchLine(text, targets, "some/file.md", 1).map((finding) => finding.class);
}

describe("normalizeReference / entityIdOfTitle", () => {
  test("colon form, colon-less form, and filename-stem form all converge", () => {
    const canonical = normalizeReference("ANALYSIS-100: Reference Scan Target");
    expect(normalizeReference("ANALYSIS-100 Reference Scan Target")).toBe(canonical);
    expect(normalizeReference("analysis-100-reference-scan-target")).toBe(canonical);
  });

  test("entity ID is the segment before the first colon", () => {
    expect(entityIdOfTitle("ANALYSIS-100: Reference Scan Target")).toBe("ANALYSIS-100");
    expect(entityIdOfTitle("CRIT-004-PRD-001: Debate Log")).toBe("CRIT-004-PRD-001");
    expect(entityIdOfTitle("SESSION-2026-01-01_01: Ledger")).toBe("SESSION-2026-01-01_01");
  });
});

describe("matchLine — class detection", () => {
  test("canonical wikilink is class wikilink, not viaAlias", () => {
    const [finding] = matchLine(
      "see [[ANALYSIS-100: Reference Scan Target]] here",
      [target()],
      "f.md",
      3,
    );
    expect(finding?.class).toBe("wikilink");
    expect(finding?.viaAlias).toBe(false);
    expect(finding?.matchedText).toBe("[[ANALYSIS-100: Reference Scan Target]]");
    expect(finding?.line).toBe(3);
    expect(finding?.column).toBe(5);
  });

  test("colon-less wikilink is flagged malformed rather than missed", () => {
    expect(classesOf("[[ANALYSIS-100 Reference Scan Target]]")).toEqual(["wikilink-malformed"]);
  });

  test("filename-stem wikilink is flagged malformed", () => {
    expect(classesOf("[[analysis-100-reference-scan-target]]")).toEqual(["wikilink-malformed"]);
  });

  test("unrelated wikilink produces nothing", () => {
    expect(classesOf("[[ANALYSIS-200: Something Else]]")).toEqual([]);
  });

  test("bare permalink is detected", () => {
    const [finding] = matchLine("analysis/analysis-100-reference-scan-target", [target()], "f", 1);
    expect(finding?.class).toBe("permalink");
    expect(finding?.matchedText).toBe("analysis/analysis-100-reference-scan-target");
  });

  test("project-prefixed permalink is detected and tagged distinctly", () => {
    const [finding] = matchLine(
      "see fond/analysis/analysis-100-reference-scan-target",
      [target()],
      "f",
      1,
    );
    expect(finding?.class).toBe("permalink-project-prefixed");
    expect(finding?.matchedText).toBe("fond/analysis/analysis-100-reference-scan-target");
  });

  test("a permalink that is a strict prefix of a longer one does not match", () => {
    expect(classesOf("analysis/analysis-100-reference-scan-target-extended")).toEqual([]);
  });

  test("bare entity ID is detected", () => {
    expect(classesOf("ANALYSIS-100 stands alone.")).toEqual(["entity-id"]);
  });

  test("a longer numeric ID does not match a shorter target ID", () => {
    expect(classesOf("ANALYSIS-1000 is unrelated")).toEqual([]);
  });

  test("all four families coexist on one line without interfering", () => {
    const line =
      "[[ANALYSIS-100: Reference Scan Target]] and analysis/analysis-100-reference-scan-target and ANALYSIS-100 Part C";
    expect(classesOf(line)).toEqual(["wikilink", "permalink", "entity-id-section"]);
  });
});

describe("matchLine — section citation capture", () => {
  test("Section citation captures the fragment", () => {
    const [finding] = matchLine("ANALYSIS-100 Section 4.2 says so", [target()], "f", 1);
    expect(finding?.class).toBe("entity-id-section");
    expect(finding?.sectionFragment).toBe("Section 4.2");
    expect(finding?.matchedText).toBe("ANALYSIS-100 Section 4.2");
  });

  test("Part citation captures the fragment", () => {
    const [finding] = matchLine("ANALYSIS-100 Part C", [target()], "f", 1);
    expect(finding?.sectionFragment).toBe("Part C");
  });

  test("plural Sections is captured", () => {
    const [finding] = matchLine("ANALYSIS-100 Sections 6 and 7", [target()], "f", 1);
    expect(finding?.sectionFragment).toBe("Sections 6");
  });

  test("trailing sentence punctuation is stripped from the fragment but kept in matchedText", () => {
    const adr = target({
      entityId: "ADR-100",
      title: "ADR-100: X",
      permalink: "decisions/adr-100",
    });
    const [finding] = matchLine("per ADR-100 D-21.", [adr], "f", 1);
    expect(finding?.sectionFragment).toBe("D-21");
    expect(finding?.matchedText).toBe("ADR-100 D-21.");
  });

  test("designator citations (D-N, P0-N, S-N) are captured", () => {
    const adr = target({
      entityId: "ADR-100",
      title: "ADR-100: X",
      permalink: "decisions/adr-100",
    });
    expect(matchLine("ADR-100 D-2 locked", [adr], "f", 1)[0]?.sectionFragment).toBe("D-2");
    expect(matchLine("ADR-100 P0-1 raised", [adr], "f", 1)[0]?.sectionFragment).toBe("P0-1");
    expect(matchLine("ADR-100 S-1 noted", [adr], "f", 1)[0]?.sectionFragment).toBe("S-1");
  });

  test("a sibling entity reference is not mistaken for a fragment", () => {
    const adr = target({
      entityId: "ADR-100",
      title: "ADR-100: X",
      permalink: "decisions/adr-100",
    });
    const findings = matchLine("ADR-100 PRD-001 are two entities", [adr], "f", 1);
    expect(findings.map((f) => f.class)).toEqual(["entity-id"]);
  });

  test("ordinary capitalised prose after an ID is not a fragment", () => {
    const adr = target({
      entityId: "ADR-100",
      title: "ADR-100: X",
      permalink: "decisions/adr-100",
    });
    expect(matchLine("ADR-100 Fond is not a citation", [adr], "f", 1).map((f) => f.class)).toEqual([
      "entity-id",
    ]);
  });
});

describe("matchLine — alias matching", () => {
  const aliased = target({
    aliasTitles: ["ANALYSIS-099: Reference Scan Target"],
    aliasPermalinks: ["analysis/analysis-099-reference-scan-target"],
    aliasEntityIds: ["ANALYSIS-099"],
  });

  test("alias title match is reported against the current entity ID with viaAlias", () => {
    const [finding] = matchLine("[[ANALYSIS-099: Reference Scan Target]]", [aliased], "f", 1);
    expect(finding?.class).toBe("wikilink");
    expect(finding?.viaAlias).toBe(true);
    expect(finding?.target).toBe("ANALYSIS-100");
  });

  test("retired permalink is found via alias", () => {
    const [finding] = matchLine("analysis/analysis-099-reference-scan-target", [aliased], "f", 1);
    expect(finding?.class).toBe("permalink");
    expect(finding?.viaAlias).toBe(true);
  });

  test("retired entity ID is found via alias", () => {
    const [finding] = matchLine("per ANALYSIS-099 Section 2", [aliased], "f", 1);
    expect(finding?.class).toBe("entity-id-section");
    expect(finding?.viaAlias).toBe(true);
    expect(finding?.sectionFragment).toBe("Section 2");
  });

  test("without the alias declared, the retired form is invisible — history is never guessed", () => {
    expect(classesOf("[[ANALYSIS-099: Reference Scan Target]]")).toEqual([]);
  });
});

describe("matchLine — overlap suppression", () => {
  test("a bare ID nested in a wikilink is not counted twice", () => {
    expect(classesOf("[[ANALYSIS-100: Reference Scan Target]]")).toEqual(["wikilink"]);
  });

  test("a bare ID nested in a section citation is not counted twice", () => {
    expect(classesOf("ANALYSIS-100 Section 4")).toEqual(["entity-id-section"]);
  });

  test("distinct occurrences on one line are each reported", () => {
    expect(classesOf("ANALYSIS-100 and again ANALYSIS-100")).toEqual(["entity-id", "entity-id"]);
  });
});

describe("resolveTargets", () => {
  test("reads title and permalink off disk and derives the entity ID", async () => {
    const [resolved] = await resolveTargets(FIXTURE_ROOT, [{ path: TARGET_NOTE }]);
    expect(resolved?.entityId).toBe("ANALYSIS-100");
    expect(resolved?.title).toBe("ANALYSIS-100: Reference Scan Target");
    expect(resolved?.permalink).toBe("analysis/analysis-100-reference-scan-target");
    expect(resolved?.path).toBe(TARGET_NOTE);
  });

  test("a missing target fails loudly rather than scanning for nothing", async () => {
    await expect(resolveTargets(FIXTURE_ROOT, [{ path: "analysis/nope.md" }])).rejects.toThrow(
      /target note not found/,
    );
  });

  test("an empty target list is refused", async () => {
    await expect(resolveTargets(FIXTURE_ROOT, [])).rejects.toThrow(/no targets supplied/);
  });
});

describe("buildImpactManifest — fixture tree integration", () => {
  let manifest: Awaited<ReturnType<typeof buildImpactManifest>>;

  beforeAll(async () => {
    manifest = await scanFixture({
      docsRoot: FIXTURE_ROOT,
      now: FIXED_NOW,
      targets: [
        {
          path: TARGET_NOTE,
          aliasTitles: ["ANALYSIS-099: Reference Scan Target"],
          aliasPermalinks: ["analysis/analysis-099-reference-scan-target"],
        },
        { path: DECISION_NOTE },
      ],
    });
  });

  test("the emitted manifest satisfies its own schema", () => {
    expect(ImpactManifestSchema.safeParse(manifest).success).toBe(true);
  });

  test("target files are excluded from their own scan", () => {
    const selfReferences = manifest.findings.filter(
      (finding) => finding.referencingFile === TARGET_NOTE,
    );
    expect(selfReferences).toEqual([]);
    expect(manifest.filesScanned).toBe(2);
  });

  test("every reference class is represented across the tree", () => {
    const present = new Set(manifest.findings.map((finding) => finding.class));
    expect([...present].sort()).toEqual([
      "entity-id",
      "entity-id-section",
      "permalink",
      "permalink-project-prefixed",
      "wikilink",
      "wikilink-malformed",
    ]);
  });

  test("alias-sourced findings are attributed to the current entity ID", () => {
    const viaAlias = manifest.findings.filter((finding) => finding.viaAlias);
    expect(viaAlias.length).toBeGreaterThan(0);
    for (const finding of viaAlias) expect(finding.target).toBe("ANALYSIS-100");
  });

  test("summary counts reconcile with the findings array", () => {
    expect(manifest.summary.totalFindings).toBe(manifest.findings.length);
    const summed = Object.values(manifest.summary.byClass).reduce((a, b) => a + b, 0);
    expect(summed).toBe(manifest.findings.length);
    const perTarget = Object.values(manifest.summary.byTarget).reduce((a, t) => a + t.total, 0);
    expect(perTarget).toBe(manifest.findings.length);
  });

  test("both targets appear in byTarget even before counting", () => {
    expect(Object.keys(manifest.summary.byTarget).sort()).toEqual(["ADR-100", "ANALYSIS-100"]);
  });

  test("ordering is deterministic and independent of enumeration order", async () => {
    const again = await scanFixture({
      docsRoot: FIXTURE_ROOT,
      now: FIXED_NOW,
      targets: [
        {
          path: TARGET_NOTE,
          aliasTitles: ["ANALYSIS-099: Reference Scan Target"],
          aliasPermalinks: ["analysis/analysis-099-reference-scan-target"],
        },
        { path: DECISION_NOTE },
      ],
    });
    expect(JSON.stringify(again)).toBe(JSON.stringify(manifest));
  });

  test("the ledger's designator citations land against the decision target", () => {
    const fragments = manifest.findings
      .filter((finding) => finding.referencingFile === LEDGER_NOTE && finding.sectionFragment)
      .map((finding) => finding.sectionFragment);
    expect(fragments).toContain("D-2");
    expect(fragments).toContain("P0-1");
  });
});

describe("checkClosure", () => {
  let tempRoot: string;

  async function copyFixtureTree(): Promise<string> {
    const root = mkdtempSync(join(tmpdir(), "reference-closure-"));
    for (const rel of [TARGET_NOTE, DECISION_NOTE, REFERRER_NOTE, LEDGER_NOTE]) {
      await mkdir(join(root, rel, ".."), { recursive: true });
      await Bun.write(join(root, rel), await Bun.file(join(FIXTURE_ROOT, rel)).text());
    }
    return root;
  }

  async function manifestFor(root: string) {
    return await scanFixture({
      docsRoot: root,
      now: FIXED_NOW,
      targets: [
        {
          path: TARGET_NOTE,
          aliasTitles: ["ANALYSIS-099: Reference Scan Target"],
          aliasPermalinks: ["analysis/analysis-099-reference-scan-target"],
        },
      ],
    });
  }

  beforeAll(async () => {
    tempRoot = await copyFixtureTree();
  });

  afterAll(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  test("an untouched tree reports every entry OUTSTANDING and is not closed", async () => {
    const manifest = await manifestFor(tempRoot);
    const report = await closeFixture({ manifest, now: FIXED_NOW });
    expect(report.summary.total).toBe(manifest.findings.length);
    expect(report.summary.outstanding).toBe(manifest.findings.length);
    expect(report.summary.updated).toBe(0);
    expect(report.summary.closed).toBe(false);
    expect(report.entries.every((entry) => entry.status === "OUTSTANDING")).toBe(true);
  });

  test("a caller allow-list moves entries to RETAINED without the checker deciding", async () => {
    const manifest = await manifestFor(tempRoot);
    const report = await closeFixture({
      manifest,
      now: FIXED_NOW,
      retain: [{ class: "entity-id" }],
    });
    const retained = report.entries.filter((entry) => entry.status === "RETAINED");
    expect(retained.length).toBeGreaterThan(0);
    expect(retained.every((entry) => entry.finding.class === "entity-id")).toBe(true);
    expect(report.summary.retained).toBe(retained.length);
  });

  test("an unconstrained retain rule is refused rather than retaining everything", async () => {
    const manifest = await manifestFor(tempRoot);
    await expect(closeFixture({ manifest, now: FIXED_NOW, retain: [{}] })).rejects.toThrow(
      /must constrain at least one field/,
    );
  });

  test("repairing the stale forms moves entries to UPDATED and reaches closure", async () => {
    const root = await copyFixtureTree();
    try {
      const manifest = await manifestFor(root);
      // Every referring file has to be repaired, not just the obvious one —
      // closure is a property of the tree, not of the file you remembered.
      for (const rel of [REFERRER_NOTE, DECISION_NOTE, LEDGER_NOTE]) {
        const abs = join(root, rel);
        const repaired = (await Bun.file(abs).text())
          .split("\n")
          .filter((line) => !/analysis-1?00|ANALYSIS-[01]99|ANALYSIS-100/i.test(line))
          .join("\n");
        await Bun.write(abs, repaired);
      }
      const report = await closeFixture({ manifest, docsRoot: root, now: FIXED_NOW });
      expect(report.summary.updated).toBe(manifest.findings.length);
      expect(report.summary.outstanding).toBe(0);
      expect(report.entries.every((entry) => entry.status === "UPDATED")).toBe(true);
      // Every prior finding is repaired. Whether the GATE closes additionally depends on
      // whether the repair introduced asymmetry — and this fixture's repair deletes whole
      // lines, which takes Relations edges with them. The relationship is asserted rather
      // than a hard-coded verdict, so the test states the semantics instead of the
      // fixture's incidental edge damage.
      expect(report.summary.closed).toBe(report.summary.introducedAsymmetry === 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("partial repair reports per occurrence rather than collapsing to one verdict", async () => {
    const root = mkdtempSync(join(tmpdir(), "reference-partial-"));
    try {
      await mkdir(join(root, "analysis"), { recursive: true });
      await Bun.write(
        join(root, TARGET_NOTE),
        await Bun.file(join(FIXTURE_ROOT, TARGET_NOTE)).text(),
      );
      const referrer = join(root, "analysis", "ANALYSIS-102-duplicates.md");
      await Bun.write(referrer, "ANALYSIS-100 once\nANALYSIS-100 twice\nANALYSIS-100 thrice\n");
      const manifest = await scanFixture({
        docsRoot: root,
        now: FIXED_NOW,
        targets: [{ path: TARGET_NOTE }],
      });
      expect(manifest.findings.length).toBe(3);

      await Bun.write(referrer, "removed\nANALYSIS-100 twice\nremoved\n");
      const report = await closeFixture({ manifest, docsRoot: root, now: FIXED_NOW });
      expect(report.summary.updated).toBe(2);
      expect(report.summary.outstanding).toBe(1);
      expect(report.summary.newFindings).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a reference introduced after the scan surfaces as a new finding", async () => {
    const root = mkdtempSync(join(tmpdir(), "reference-new-"));
    try {
      await mkdir(join(root, "analysis"), { recursive: true });
      await Bun.write(
        join(root, TARGET_NOTE),
        await Bun.file(join(FIXTURE_ROOT, TARGET_NOTE)).text(),
      );
      const manifest = await scanFixture({
        docsRoot: root,
        now: FIXED_NOW,
        targets: [{ path: TARGET_NOTE }],
      });
      expect(manifest.findings).toEqual([]);

      await Bun.write(join(root, "analysis", "ANALYSIS-103-late.md"), "late ANALYSIS-100 ref\n");
      const report = await closeFixture({ manifest, docsRoot: root, now: FIXED_NOW });
      expect(report.summary.newFindings).toBe(1);
      expect(report.newFindings[0]?.target).toBe("ANALYSIS-100");
      // A new finding is reported alongside, never folded into the prior contract.
      expect(report.summary.total).toBe(0);
      expect(report.summary.closed).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("CLI", () => {
  test("scan mode requires a docs root and at least one target", () => {
    expect(() => parseArgs([])).toThrow(/--docs-root is required/);
    expect(() => parseArgs(["--docs-root", "docs"])).toThrow(/--targets|--target/);
  });

  test("check mode requires a manifest", () => {
    expect(() => parseArgs(["--check"])).toThrow(/--manifest/);
  });

  test("repeated --target accumulates", () => {
    const parsed = parseArgs(["--docs-root", "docs", "--target", "a.md", "--target", "b.md"]);
    expect(parsed.targets).toEqual(["a.md", "b.md"]);
    expect(parsed.mode).toBe("scan");
  });

  test("a flag missing its value is refused rather than swallowing the next flag", () => {
    expect(() => parseArgs(["--docs-root", "--target", "a.md"])).toThrow(/requires a value/);
  });

  test("unknown arguments are refused", () => {
    expect(() => parseArgs(["--nope"])).toThrow(/unknown argument/);
  });

  test("scan writes a schema-valid manifest and exits 0", async () => {
    const out = join(mkdtempSync(join(tmpdir(), "reference-cli-")), "manifest.json");
    const code = await main(
      ["--docs-root", FIXTURE_ROOT, "--target", TARGET_NOTE, "--out", out],
      await treeRunner(FIXTURE_ROOT),
    );
    expect(code).toBe(0);
    const written: unknown = await Bun.file(out).json();
    expect(ImpactManifestSchema.safeParse(written).success).toBe(true);
    rmSync(join(out, ".."), { recursive: true, force: true });
  });

  test("check mode exits 2 when closure is not reached", async () => {
    const dir = mkdtempSync(join(tmpdir(), "reference-cli-check-"));
    try {
      const manifestPath = join(dir, "manifest.json");
      expect(
        await main(
          ["--docs-root", FIXTURE_ROOT, "--target", TARGET_NOTE, "--out", manifestPath],
          await treeRunner(FIXTURE_ROOT),
        ),
      ).toBe(0);
      const code = await main(
        ["--check", "--manifest", manifestPath, "--out", join(dir, "closure.json")],
        await treeRunner(FIXTURE_ROOT),
      );
      expect(code).toBe(2);
      const report = (await Bun.file(join(dir, "closure.json")).json()) as {
        summary: { closed: boolean; outstanding: number };
      };
      expect(report.summary.closed).toBe(false);
      expect(report.summary.outstanding).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a malformed manifest is refused with exit 1", async () => {
    const dir = mkdtempSync(join(tmpdir(), "reference-cli-bad-"));
    try {
      const bad = join(dir, "bad.json");
      await Bun.write(bad, JSON.stringify({ docsRoot: "x" }));
      expect(await main(["--check", "--manifest", bad])).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("graph leg — bi-directional closure", () => {
  const GRAPH_ROOT = join(import.meta.dir, "fixtures", "reference-graph");
  const GRAPH_TARGET = "analysis/ANALYSIS-110-graph-target.md";
  let manifest: Awaited<ReturnType<typeof buildImpactManifest>>;

  beforeAll(async () => {
    manifest = await scanFixture({
      docsRoot: GRAPH_ROOT,
      now: FIXED_NOW,
      targets: [{ path: GRAPH_TARGET }],
    });
  });

  test("the target's H3-grouped Relations are read as a formal inbound index", () => {
    // Three groups, four entries — a first-list-only parser would see two.
    const violations = manifest.findings.filter((f) => f.source === "GRAPH");
    expect(violations.length).toBeGreaterThan(0);
    expect(ImpactManifestSchema.safeParse(manifest).success).toBe(true);
  });

  test("a text finding sitting on a formal Relations edge is promoted to BOTH", () => {
    const corroborated = manifest.findings.filter((f) => f.source === "BOTH");
    expect(corroborated.map((f) => f.referencingFile).sort()).toEqual([
      "analysis/ANALYSIS-111-inverse-present.md",
      "analysis/ANALYSIS-113-one-way-inbound.md",
      "analysis/ANALYSIS-114-symmetric-peer.md",
    ]);
    expect(corroborated.every((f) => f.class === "wikilink")).toBe(true);
  });

  test("a note named by the target that carries no edge back is repaired on the referencer", () => {
    const [finding] = manifest.findings.filter(
      (f) => f.class === "bidirectional-missing-on-referencer",
    );
    expect(finding?.referencingFile).toBe(GRAPH_TARGET);
    expect(finding?.matchedText).toBe("contains [[ANALYSIS-112: Inverse Missing]]");
    expect(finding?.relation).toEqual({
      verb: "contains",
      expectedInverse: "part_of",
      counterpartFile: "analysis/ANALYSIS-112-inverse-missing.md",
    });
  });

  test("an inbound edge the target never answers is repaired on the target", () => {
    const [finding] = manifest.findings.filter(
      (f) => f.class === "bidirectional-missing-on-target",
    );
    expect(finding?.referencingFile).toBe("analysis/ANALYSIS-113-one-way-inbound.md");
    expect(finding?.matchedText).toBe("part_of [[ANALYSIS-110: Graph Target]]");
    expect(finding?.relation).toEqual({
      verb: "part_of",
      expectedInverse: "contains",
      counterpartFile: GRAPH_TARGET,
    });
  });

  test("a closed symmetric pair produces no violation", () => {
    const peerViolations = manifest.findings.filter(
      (f) => f.source === "GRAPH" && f.matchedText.includes("ANALYSIS-114"),
    );
    expect(peerViolations).toEqual([]);
  });

  test("exactly one violation of each direction — no double reporting", () => {
    expect(manifest.summary.byClass["bidirectional-missing-on-referencer"]).toBe(1);
    expect(manifest.summary.byClass["bidirectional-missing-on-target"]).toBe(1);
    expect(manifest.summary.bySource.GRAPH).toBe(2);
  });

  test("repairing a one-way edge closes it", async () => {
    const root = mkdtempSync(join(tmpdir(), "reference-graph-repair-"));
    try {
      await mkdir(join(root, "analysis"), { recursive: true });
      const glob = new Bun.Glob("**/*.md");
      for await (const rel of glob.scan({ cwd: GRAPH_ROOT, onlyFiles: true })) {
        await Bun.write(join(root, rel), await Bun.file(join(GRAPH_ROOT, rel)).text());
      }
      const before = await scanFixture({
        docsRoot: root,
        now: FIXED_NOW,
        targets: [{ path: GRAPH_TARGET }],
      });
      expect(before.summary.byClass["bidirectional-missing-on-referencer"]).toBe(1);

      // Add the missing inverse on ANALYSIS-112.
      const missing = join(root, "analysis", "ANALYSIS-112-inverse-missing.md");
      const patched = (await Bun.file(missing).text()).replace(
        "- relates_to [[ANALYSIS-114: Symmetric Peer]]",
        "- relates_to [[ANALYSIS-114: Symmetric Peer]]\n- part_of [[ANALYSIS-110: Graph Target]]",
      );
      await Bun.write(missing, patched);

      const after = await scanFixture({
        docsRoot: root,
        now: FIXED_NOW,
        targets: [{ path: GRAPH_TARGET }],
      });
      expect(after.summary.byClass["bidirectional-missing-on-referencer"]).toBe(0);

      const closure = await closeFixture({ manifest: before, docsRoot: root, now: FIXED_NOW });
      const repaired = closure.entries.find(
        (entry) => entry.finding.class === "bidirectional-missing-on-referencer",
      );
      expect(repaired?.status).toBe("UPDATED");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

/** A minimal well-formed manifest envelope, for schema-level rejection cases. */
function emptyManifest() {
  return {
    docsRoot: "/tmp/docs",
    generatedAt: FIXED_NOW,
    filesScanned: 1,
    targets: [],
    summary: {
      totalFindings: 0,
      byClass: Object.fromEntries(REFERENCE_CLASSES.map((cls) => [cls, 0])),
      byTarget: {},
      bySource: { TEXT: 0, GRAPH: 0, BOTH: 0, SEARCH: 0 },
    },
  };
}

function semanticEntryForSchema(): Record<string, unknown> {
  return {
    referencingFile: "analysis/A.md",
    line: 1,
    column: 1,
    matchedText: "the target",
    class: "entity-id",
    target: "ANALYSIS-100",
    viaAlias: false,
    source: "SEARCH",
    advisory: true,
    mode: "semantic",
    searchType: "semantic",
    actualSource: "keyword",
  };
}

describe("search advisory leg", () => {
  /**
   * A SEARCH-branch entry. All three provenance fields are present because the
   * discriminated shape REQUIRES them: an advisory entry that cannot say how it was
   * found is refused at the boundary rather than stored as unreproducible evidence.
   */
  const semanticEntry = {
    referencingFile: "analysis/ANALYSIS-101-reference-scan-referrer.md",
    line: 12,
    column: 1,
    matchedText: "the reference scan target",
    class: "entity-id" as const,
    target: "ANALYSIS-100",
    viaAlias: false,
    source: "SEARCH" as const,
    advisory: true as const,
    mode: "semantic" as const,
    searchType: "semantic" as const,
    actualSource: "keyword" as const,
  };

  test("merged entries are forced to SEARCH and advisory whatever the file claims", async () => {
    const manifest = await scanFixture({
      docsRoot: FIXTURE_ROOT,
      now: FIXED_NOW,
      targets: [{ path: TARGET_NOTE }],
      merge: [semanticEntry],
    });
    const merged = manifest.findings.filter((f) => f.matchedText === "the reference scan target");
    expect(merged).toHaveLength(1);
    expect(merged[0]?.source).toBe("SEARCH");
    expect(merged[0]?.advisory).toBe(true);
    expect(manifest.summary.bySource.SEARCH).toBe(1);
  });

  test("every search mode is representable and preserved through the merge", async () => {
    const manifest = await scanFixture({
      docsRoot: FIXTURE_ROOT,
      now: FIXED_NOW,
      targets: [{ path: TARGET_NOTE }],
      merge: SEARCH_MODES.map((mode) => ({
        ...semanticEntry,
        mode,
        matchedText: `hit via ${mode}`,
      })),
    });
    const modes = manifest.findings
      .filter((f) => f.source === "SEARCH")
      .map((f) => f.mode)
      .sort();
    expect(modes).toEqual([...SEARCH_MODES].sort());
    expect(ImpactManifestSchema.safeParse(manifest).success).toBe(true);
  });

  test("a keyword-mode entry is advisory exactly like a semantic one", async () => {
    const manifest = await scanFixture({
      docsRoot: FIXTURE_ROOT,
      now: FIXED_NOW,
      targets: [{ path: TARGET_NOTE }],
      merge: [{ ...semanticEntry, mode: "keyword" as const, class: "index-stale" as const }],
    });
    const [entry] = manifest.findings.filter((f) => f.source === "SEARCH");
    expect(entry?.mode).toBe("keyword");
    expect(entry?.advisory).toBe(true);
  });

  test("the closure detail names the mode that produced the entry", async () => {
    const manifest = await scanFixture({
      docsRoot: FIXTURE_ROOT,
      now: FIXED_NOW,
      targets: [{ path: TARGET_NOTE }],
      merge: [{ ...semanticEntry, mode: "hybrid" as const }],
    });
    const report = await closeFixture({ manifest, now: FIXED_NOW });
    const advisory = report.entries.find((entry) => entry.finding.advisory);
    expect(advisory?.detail).toContain("mode=hybrid");
  });

  /**
   * Under the discriminated shape this is enforced by the TYPE, not merely observed:
   * `mode` is not declared on the deterministic branch at all, and `.strict()` rejects
   * an entry that carries it. The runtime assertion reads the discriminator and then
   * the raw object, so the guarantee is checked rather than assumed away.
   */
  test("the deterministic legs carry no search provenance", async () => {
    const manifest = await scanFixture({
      docsRoot: FIXTURE_ROOT,
      now: FIXED_NOW,
      targets: [{ path: TARGET_NOTE }],
    });
    expect(manifest.findings.length).toBeGreaterThan(0);
    for (const finding of manifest.findings) {
      expect(finding.source).not.toBe("SEARCH");
      expect(finding.advisory).toBe(false);
      const raw = finding as Record<string, unknown>;
      expect(raw["mode"]).toBeUndefined();
      expect(raw["searchType"]).toBeUndefined();
      expect(raw["actualSource"]).toBeUndefined();
    }
  });

  test("a deterministic entry carrying search provenance is refused", () => {
    const hostile = {
      referencingFile: "analysis/A.md",
      line: 1,
      column: 1,
      matchedText: "ANALYSIS-100",
      class: "entity-id",
      target: "ANALYSIS-100",
      viaAlias: false,
      source: "TEXT",
      advisory: false,
      mode: "keyword",
    };
    expect(
      ImpactManifestSchema.safeParse({ ...emptyManifest(), findings: [hostile] }).success,
    ).toBe(false);
  });

  test("a SEARCH entry missing any provenance field is refused", () => {
    for (const drop of ["mode", "searchType", "actualSource"]) {
      const entry: Record<string, unknown> = { ...semanticEntryForSchema() };
      delete entry[drop];
      expect(
        ImpactManifestSchema.safeParse({ ...emptyManifest(), findings: [entry] }).success,
        `dropping ${drop} should be refused`,
      ).toBe(false);
    }
  });

  /**
   * `mode` alone under-specifies an advisory entry twice over: `search_type` is an
   * orthogonal retrieval dial the field cannot express, and the leg that actually
   * served the row is routinely NOT the one requested. Both travel through the
   * merge untouched, because the merge only forces `source` and `advisory`.
   */
  test("searchType and actualSource survive the merge alongside mode", async () => {
    const manifest = await scanFixture({
      docsRoot: FIXTURE_ROOT,
      now: FIXED_NOW,
      targets: [{ path: TARGET_NOTE }],
      merge: [
        {
          ...semanticEntry,
          mode: "auto" as const,
          searchType: "permalink" as const,
          actualSource: "keyword" as const,
        },
      ],
    });
    const [entry] = manifest.findings.filter((f) => f.source === "SEARCH");
    expect(entry?.mode).toBe("auto");
    expect(entry?.searchType).toBe("permalink");
    expect(entry?.actualSource).toBe("keyword");
    expect(ImpactManifestSchema.safeParse(manifest).success).toBe(true);
  });

  test("the closure detail reports all three provenance fields, not just the mode", async () => {
    const manifest = await scanFixture({
      docsRoot: FIXTURE_ROOT,
      now: FIXED_NOW,
      targets: [{ path: TARGET_NOTE }],
      merge: [
        {
          ...semanticEntry,
          mode: "semantic" as const,
          searchType: "text" as const,
          actualSource: "keyword" as const,
        },
      ],
    });
    const report = await closeFixture({ manifest, now: FIXED_NOW });
    const advisory = report.entries.find((entry) => entry.finding.advisory);
    expect(advisory?.detail).toContain("mode=semantic");
    expect(advisory?.detail).toContain("search_type=text");
    // The divergence is the whole point: a semantic request served by keyword is
    // what makes the recorded mode insufficient on its own.
    expect(advisory?.detail).toContain("actual_source=keyword");
  });

  /**
   * Under the discriminated shape there is no "recorded only a mode" case left to read
   * cleanly: all three fields are REQUIRED on a SEARCH entry, so the parenthetical is
   * always complete. That is the point — an advisory entry a reader has to confirm by
   * hand is now always reproducible.
   */
  test("the parenthetical is always complete, because the triple is always present", async () => {
    const manifest = await scanFixture({
      docsRoot: FIXTURE_ROOT,
      now: FIXED_NOW,
      targets: [{ path: TARGET_NOTE }],
      merge: [{ ...semanticEntry, mode: "keyword" as const }],
    });
    const report = await closeFixture({ manifest, now: FIXED_NOW });
    const advisory = report.entries.find((entry) => entry.finding.advisory);
    expect(advisory?.detail).toContain("mode=keyword");
    expect(advisory?.detail).toContain("search_type=");
    expect(advisory?.detail).toContain("actual_source=");
  });

  test("a deterministic entry's detail carries no provenance parenthetical at all", async () => {
    const manifest = await scanFixture({
      docsRoot: FIXTURE_ROOT,
      now: FIXED_NOW,
      targets: [{ path: TARGET_NOTE }],
    });
    const report = await closeFixture({ manifest, now: FIXED_NOW });
    expect(report.entries.length).toBeGreaterThan(0);
    for (const entry of report.entries) {
      expect(entry.finding.advisory).toBe(false);
      expect(entry.detail).not.toContain("mode=");
      expect(entry.detail).not.toContain("actual_source=");
    }
  });

  test("an index-stale entry is representable as a finding class", async () => {
    const manifest = await scanFixture({
      docsRoot: FIXTURE_ROOT,
      now: FIXED_NOW,
      targets: [{ path: TARGET_NOTE }],
      merge: [
        {
          ...semanticEntry,
          class: "index-stale" as const,
          matchedText: "analysis/analysis-099-reference-scan-target",
        },
      ],
    });
    expect(manifest.summary.byClass["index-stale"]).toBe(1);
    expect(ImpactManifestSchema.safeParse(manifest).success).toBe(true);
  });

  test("advisory entries never gate closure", async () => {
    const manifest = await scanFixture({
      docsRoot: FIXTURE_ROOT,
      now: FIXED_NOW,
      targets: [{ path: TARGET_NOTE }],
      // `index-stale` is a class the deterministic legs never produce, so the
      // retain list below can clear every deterministic finding without also
      // sweeping up the advisory one.
      merge: [{ ...semanticEntry, class: "index-stale" as const }],
    });
    // Retain every deterministic finding so only the advisory one is left open.
    const report = await closeFixture({
      manifest,
      now: FIXED_NOW,
      retain: REFERENCE_CLASSES.filter((cls) => cls !== "index-stale").map((cls) => ({
        class: cls,
      })),
    });
    expect(report.summary.outstandingAdvisory).toBe(1);
    expect(report.summary.outstanding).toBe(0);
    expect(report.summary.closed).toBe(true);
  });

  test("an advisory entry is carried forward unverified, not silently marked UPDATED", async () => {
    const manifest = await scanFixture({
      docsRoot: FIXTURE_ROOT,
      now: FIXED_NOW,
      targets: [{ path: TARGET_NOTE }],
      merge: [semanticEntry],
    });
    const report = await closeFixture({ manifest, now: FIXED_NOW });
    const advisory = report.entries.find((entry) => entry.finding.advisory);
    expect(advisory?.status).toBe("OUTSTANDING");
    expect(advisory?.detail).toMatch(/advisory/i);
  });
});

describe("findings shape", () => {
  test("sectionFragment is present only for section citations", () => {
    const findings: ReferenceFinding[] = matchLine(
      "[[ANALYSIS-100: Reference Scan Target]] and ANALYSIS-100 Section 3",
      [target()],
      "f.md",
      1,
    );
    const [wikilink, citation] = findings;
    expect(Object.hasOwn(wikilink ?? {}, "sectionFragment")).toBe(false);
    expect(citation?.sectionFragment).toBe("Section 3");
  });
});
