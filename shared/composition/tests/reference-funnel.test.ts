import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type SearchRunner,
  SearchUnavailableError,
  buildExhaustiveArgs,
  buildReferencesArgs,
  searchExhaustive,
  searchReferences,
} from "../src/core/brain-cli.js";
import { discoverCandidates, planQueries } from "../src/core/reference-funnel.js";
import { buildImpactManifest } from "../src/core/reference-scan.js";
import type { ResolvedTarget } from "../src/schemas/reference-manifest.js";

/**
 * Every test drives the injected subprocess runner, never a live server.
 *
 * The response bodies below are transcribed from real probes of the installed
 * binary against the fond project, so the fixtures are measured rather than
 * invented — including the shapes that matter most here, which are the ones a live
 * server produces only in states that are awkward to arrange on demand (an
 * unresolvable target, a leg that will not state its scope).
 */

function envelope(payload: Record<string, unknown>): string {
  return JSON.stringify({ content: [{ type: "text", text: JSON.stringify(payload) }] });
}

function row(filePath: string, extra: Record<string, unknown> = {}) {
  const stem = filePath.replace(/\.md$/, "").toLowerCase();
  return { permalink: stem, title: `Title of ${filePath}`, file_path: filePath, ...extra };
}

/** A `--references` payload in the exact shape the live CLI returns. */
function referencesPayload(paths: string[], overrides: Record<string, unknown> = {}) {
  return {
    references: "ANALYSIS-100",
    resolved_permalink: "analysis/analysis-100-target",
    project: "fixture",
    total: paths.length,
    dangling_outbound_edges: 0,
    completeness: { provable: true },
    scope: "wikilink edges only; bare text mentions are covered by exhaustive",
    results: paths.map((path) => row(path, { direction: "both" })),
    ...overrides,
  };
}

/** An `--exhaustive` payload in the exact shape the live CLI returns. */
function exhaustivePayload(paths: string[], overrides: Record<string, unknown> = {}) {
  return {
    query: "ANALYSIS-100",
    project: "fixture",
    total: paths.length,
    indexed_notes: 73,
    completeness: { provable: true },
    scope: "literal content containment; wikilink edges are covered by references",
    results: paths.map((path) => row(path, { evidence: "index" })),
    ...overrides,
  };
}

/** Route by leg, so one runner serves a whole funnel run. */
function runnerFor(handlers: {
  references?: (target: string) => Record<string, unknown>;
  exhaustive?: (query: string) => Record<string, unknown>;
}): { runner: SearchRunner; calls: string[][] } {
  const calls: string[][] = [];
  const runner: SearchRunner = async (args) => {
    calls.push([...args]);
    const at = args.indexOf("--references");
    const payload =
      at >= 0
        ? (handlers.references?.(args[at + 1] ?? "") ?? referencesPayload([]))
        : (handlers.exhaustive?.(args[1] ?? "") ?? exhaustivePayload([]));
    return { exitCode: 0, stdout: envelope(payload), stderr: "" };
  };
  return { runner, calls };
}

function target(overrides: Partial<ResolvedTarget> = {}): ResolvedTarget {
  return {
    path: "analysis/ANALYSIS-100-target.md",
    entityId: "ANALYSIS-100",
    title: "ANALYSIS-100: Target",
    permalink: "analysis/analysis-100-target",
    aliasTitles: [],
    aliasPermalinks: [],
    aliasEntityIds: [],
    ...overrides,
  };
}

describe("complete-retrieval argv", () => {
  test("the references leg passes the target as a flag value, unquoted", () => {
    const args = buildReferencesArgs("ANALYSIS-033", "fond");
    expect(args).toEqual(["search", "--references", "ANALYSIS-033", "--project", "fond", "--json"]);
  });

  /**
   * The CLI documents that hyphenated identifiers must be double-quoted. That rule is
   * about a SHELL tokenizer splitting on hyphens; argv goes to Bun.spawn directly, so
   * adding quotes would make them part of the literal being searched for.
   */
  test("the exhaustive leg passes the query positionally with no added quoting", () => {
    const args = buildExhaustiveArgs("ANALYSIS-033", "fond");
    expect(args).toEqual(["search", "ANALYSIS-033", "--exhaustive", "--project", "fond", "--json"]);
    expect(args[1]).not.toContain('"');
  });

  test("neither leg sends a limit — completeness is the contract, not a page size", () => {
    expect(buildReferencesArgs("X", "p")).not.toContain("--limit");
    expect(buildExhaustiveArgs("X", "p")).not.toContain("--limit");
  });
});

/**
 * THE EXHAUSTION GUARANTEE.
 *
 * These are the mutation tests the reduction depends on. Removing a full-tree walk is
 * only defensible if a search leg that CANNOT prove completeness says so — a leg that
 * is complete but silent is indistinguishable from one that quietly truncated, and
 * both look identical to a reader counting findings.
 *
 * The first case is not hypothetical. Probed live against fond,
 * `brain search --references ANALYSIS-999` returns total 0, an empty results array,
 * and exit code 0. Nothing in that response distinguishes "this note has no
 * references" from "this target does not exist" EXCEPT `completeness.provable`.
 */
describe("exhaustion guarantee — provable is read strictly", () => {
  test("an unresolvable target reports not-provable with the surface's reason", async () => {
    const { runner } = runnerFor({
      references: () =>
        referencesPayload([], {
          total: 0,
          completeness: {
            provable: false,
            reason: 'target "ANALYSIS-999" matched no note in this project',
          },
        }),
    });
    const response = await searchReferences("ANALYSIS-999", "fixture", runner);
    expect(response.rows).toHaveLength(0);
    expect(response.provable).toBe(false);
    expect(response.reason).toContain("matched no note");
  });

  test("an absent completeness block is NOT read as complete", async () => {
    const payload = exhaustivePayload(["analysis/A.md"]);
    // biome-ignore lint/performance/noDelete: modelling a payload that omits the field
    delete (payload as Record<string, unknown>)["completeness"];
    const { runner } = runnerFor({ exhaustive: () => payload });
    const response = await searchExhaustive("X", "fixture", runner);
    // Rows still arrive. What is refused is the CLAIM that they are all of them.
    expect(response.rows).toHaveLength(1);
    expect(response.provable).toBe(false);
  });

  test("an empty completeness block is NOT read as complete", async () => {
    const { runner } = runnerFor({
      exhaustive: () => exhaustivePayload(["analysis/A.md"], { completeness: {} }),
    });
    expect((await searchExhaustive("X", "fixture", runner)).provable).toBe(false);
  });

  test("a non-boolean provable is NOT read as complete", async () => {
    const { runner } = runnerFor({
      exhaustive: () =>
        exhaustivePayload(["analysis/A.md"], { completeness: { provable: "true" } }),
    });
    expect((await searchExhaustive("X", "fixture", runner)).provable).toBe(false);
  });

  test("explicit provable false is not-provable", async () => {
    const { runner } = runnerFor({
      exhaustive: () => exhaustivePayload(["analysis/A.md"], { completeness: { provable: false } }),
    });
    expect((await searchExhaustive("X", "fixture", runner)).provable).toBe(false);
  });
});

describe("exhaustion guarantee — the funnel aggregates honestly", () => {
  const docsRoot = "/nonexistent-root";
  const fileSystem = {
    async *listMarkdown() {
      /* the funnel never enumerates */
    },
    async read() {
      return "";
    },
    async exists() {
      return true;
    },
  };

  test("one unproven query makes the whole union unproven", async () => {
    const { runner } = runnerFor({
      references: () => referencesPayload(["analysis/A.md"]),
      exhaustive: () =>
        exhaustivePayload(["analysis/B.md"], { completeness: { provable: false, reason: "nope" } }),
    });
    const result = await discoverCandidates([target()], {
      project: "fixture",
      docsRoot,
      runner,
      fileSystem,
    });
    expect(result.provable).toBe(false);
    // The candidates still arrive — an unproven set is not an empty one.
    expect(result.candidates).toContain("analysis/A.md");
    expect(result.candidates).toContain("analysis/B.md");
    expect(result.queries.filter((q) => !q.provable).map((q) => q.reason)).toContain("nope");
  });

  /**
   * A leg that will not state WHAT it covered cannot be trusted to have covered it.
   * Scope and completeness are the whole honesty surface and both are required.
   */
  test("a missing scope demotes a query even when it claims provable", async () => {
    const { runner } = runnerFor({
      references: () => referencesPayload(["analysis/A.md"], { scope: "" }),
    });
    const result = await discoverCandidates([target()], {
      project: "fixture",
      docsRoot,
      runner,
      fileSystem,
    });
    expect(result.provable).toBe(false);
    expect(result.queries.find((q) => q.leg === "references")?.reason).toContain("scope");
  });

  test("all queries proving themselves yields a provable union", async () => {
    const { runner } = runnerFor({
      references: () => referencesPayload(["analysis/A.md"]),
      exhaustive: () => exhaustivePayload(["analysis/B.md"]),
    });
    const result = await discoverCandidates([target()], {
      project: "fixture",
      docsRoot,
      runner,
      fileSystem,
    });
    expect(result.provable).toBe(true);
  });

  /**
   * The loud-failure requirement. An outage must fail the run, because an empty
   * candidate set is indistinguishable from "nothing references these targets" and
   * would hand back a clean bill of health produced by a dead server.
   */
  test("an unreachable search throws rather than degrading to an empty set", async () => {
    const runner: SearchRunner = async () => ({
      exitCode: 1,
      stdout: "",
      stderr: "connection refused",
    });
    let raised: unknown;
    try {
      await discoverCandidates([target()], {
        project: "fixture",
        docsRoot,
        runner,
        fileSystem,
      });
    } catch (err) {
      raised = err;
    }
    expect(raised).toBeInstanceOf(SearchUnavailableError);
    expect((raised as SearchUnavailableError).detail).toContain("connection refused");
  });

  test("a malformed envelope throws rather than reporting zero references", async () => {
    const runner: SearchRunner = async () => ({
      exitCode: 0,
      stdout: JSON.stringify({ content: [{ type: "text", text: JSON.stringify({ total: 0 }) }] }),
      stderr: "",
    });
    let raised: unknown;
    try {
      await discoverCandidates([target()], { project: "fixture", docsRoot, runner, fileSystem });
    } catch (err) {
      raised = err;
    }
    expect(raised).toBeInstanceOf(SearchUnavailableError);
    expect((raised as Error).message).toContain("results array");
  });
});

/**
 * PROJECT RESOLUTION.
 *
 * `--project` is optional: omitted, the CLI resolves one from environment or working
 * directory. That is convenient and it is also the one place a scan can quietly
 * answer about the WRONG GRAPH — a resolved project pointing at another repo returns
 * real notes and proves every query complete. These cover the three guards.
 */
describe("project resolution — optional, echoed, and guarded", () => {
  const docsRoot = "/root";
  const presentFs = {
    async *listMarkdown() {
      /* the funnel never enumerates */
    },
    async read() {
      return "";
    },
    async exists() {
      return true;
    },
  };

  test("an omitted project leaves the flag off the query entirely", () => {
    expect(buildReferencesArgs("ANALYSIS-033")).toEqual([
      "search",
      "--references",
      "ANALYSIS-033",
      "--json",
    ]);
    expect(buildExhaustiveArgs("ANALYSIS-033")).toEqual([
      "search",
      "ANALYSIS-033",
      "--exhaustive",
      "--json",
    ]);
  });

  test("an empty project is treated as absent rather than passed as an empty flag", () => {
    expect(buildReferencesArgs("X", "")).not.toContain("--project");
  });

  test("the project that answered is read off the response and marked cli-resolved", async () => {
    const { runner, calls } = runnerFor({
      references: () => referencesPayload(["analysis/A.md"], { project: "fond" }),
      exhaustive: () => exhaustivePayload(["analysis/A.md"], { project: "fond" }),
    });
    const result = await discoverCandidates([target()], {
      docsRoot,
      runner,
      fileSystem: presentFs,
    });
    expect(result.project).toBe("fond");
    expect(result.projectSource).toBe("cli");
    expect(calls.every((args) => !args.includes("--project"))).toBe(true);
  });

  test("a caller-supplied project is marked as such", async () => {
    const { runner } = runnerFor({
      references: () => referencesPayload(["analysis/A.md"], { project: "fond" }),
      exhaustive: () => exhaustivePayload(["analysis/A.md"], { project: "fond" }),
    });
    const result = await discoverCandidates([target()], {
      project: "fond",
      docsRoot,
      runner,
      fileSystem: presentFs,
    });
    expect(result.projectSource).toBe("caller");
  });

  /**
   * One scan, one graph. Two projects answering inside a single run means the
   * environment moved mid-scan, and the union of two graphs' answers is a worklist
   * for neither.
   */
  test("two projects answering in one scan fails loudly", async () => {
    let call = 0;
    const runner: SearchRunner = async (args) => {
      const project = call++ === 0 ? "fond" : "skills";
      const isRefs = args.includes("--references");
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                total: 0,
                project,
                completeness: { provable: true },
                scope: isRefs ? "wikilink edges only" : "literal content containment",
                results: [],
              }),
            },
          ],
        }),
        stderr: "",
      };
    };
    let raised: unknown;
    try {
      await discoverCandidates([target()], { docsRoot, runner, fileSystem: presentFs });
    } catch (err) {
      raised = err;
    }
    expect(raised).toBeInstanceOf(SearchUnavailableError);
    expect((raised as SearchUnavailableError).detail).toContain("fond");
    expect((raised as SearchUnavailableError).detail).toContain("skills");
  });

  /**
   * The structural detector. A wrong graph answers fluently and provably; the only
   * thing that gives it away is that essentially none of its notes are on this disk.
   */
  test("candidates that essentially all miss disk raise project-mismatch suspicion", async () => {
    const absentFs = {
      ...presentFs,
      async exists() {
        return false;
      },
    };
    const { runner } = runnerFor({
      references: () =>
        referencesPayload(["other/X.md", "other/Y.md"], { project: "someone-else" }),
      exhaustive: () => exhaustivePayload(["other/Z.md"], { project: "someone-else" }),
    });
    const result = await discoverCandidates([target()], {
      docsRoot,
      runner,
      fileSystem: absentFs,
    });
    expect(result.projectMismatchSuspected).toBe(true);
    expect(result.project).toBe("someone-else");
  });

  /**
   * Ordinary index staleness — a handful of moved notes — must NOT trip the guard,
   * or the warning becomes noise and stops being read.
   */
  test("a single stale path does not raise project-mismatch suspicion", async () => {
    const mostlyPresent = {
      ...presentFs,
      async exists(abs: string) {
        return !abs.includes("ghost");
      },
    };
    const { runner } = runnerFor({
      references: () =>
        referencesPayload(["analysis/ghost.md", "analysis/A.md", "analysis/B.md"], {
          project: "fond",
        }),
      exhaustive: () => exhaustivePayload(["analysis/C.md"], { project: "fond" }),
    });
    const result = await discoverCandidates([target()], {
      docsRoot,
      runner,
      fileSystem: mostlyPresent,
    });
    expect(result.projectMismatchSuspected).toBe(false);
    expect(result.missingOnDisk).toEqual(["analysis/ghost.md"]);
  });
});

describe("planQueries — the alias fold", () => {
  test("a convention-following target plans exactly two queries", () => {
    const queries = planQueries(target());
    expect(queries).toHaveLength(2);
    expect(queries.map((q) => q.leg).sort()).toEqual(["exhaustive", "references"]);
    // The title and permalink both embed the entity ID, so one exhaustive query on the
    // ID already returns every note carrying either form.
    expect(queries.filter((q) => q.leg === "exhaustive").map((q) => q.query)).toEqual([
      "ANALYSIS-100",
    ]);
  });

  /**
   * The measured fond case. ANALYSIS-034 references ANALYSIS-033 ONLY through the
   * retired permalink and carries zero literal ANALYSIS-033 occurrences, so the
   * entity-ID query cannot reach it and the alias query is the only thing that can.
   */
  test("a declared alias permalink becomes its own exhaustive query", () => {
    const queries = planQueries(
      target({
        entityId: "ANALYSIS-033",
        title: "ANALYSIS-033: Independent Pass Reconciliation",
        permalink: "analysis/analysis-033-independent-pass-reconciliation",
        aliasTitles: ["ANALYSIS-028: Independent Pass Reconciliation"],
        aliasPermalinks: ["analysis/analysis-028-independent-pass-reconciliation"],
      }),
    );
    const literals = queries.filter((q) => q.leg === "exhaustive").map((q) => q.query);
    expect(literals).toContain("analysis/analysis-028-independent-pass-reconciliation");
    expect(queries.some((q) => q.viaAlias)).toBe(true);
  });

  /**
   * Subsumption is safe under literal-substring semantics: if B contains A then every
   * note containing B contains A, so exhaustive(A) is a superset of exhaustive(B).
   */
  test("an alias title containing a declared alias entity ID is dropped as subsumed", () => {
    const queries = planQueries(
      target({
        aliasEntityIds: ["ANALYSIS-028"],
        aliasTitles: ["ANALYSIS-028: Independent Pass Reconciliation"],
      }),
    );
    const literals = queries.filter((q) => q.leg === "exhaustive").map((q) => q.query);
    expect(literals).toContain("ANALYSIS-028");
    expect(literals).not.toContain("ANALYSIS-028: Independent Pass Reconciliation");
  });

  test("no references query is planned for an alias", () => {
    const queries = planQueries(
      target({ aliasEntityIds: ["ANALYSIS-028"], aliasPermalinks: ["analysis/old"] }),
    );
    expect(queries.filter((q) => q.leg === "references")).toHaveLength(1);
    expect(queries.find((q) => q.leg === "references")?.viaAlias).toBe(false);
  });

  /**
   * The defensive branch: a note violating the naming convention, whose title does
   * not contain its own entity ID, would otherwise be unreachable by title.
   */
  test("a title not containing the entity ID gets its own query", () => {
    const queries = planQueries(target({ title: "A Note With No Identifier In Its Title" }));
    const literals = queries.filter((q) => q.leg === "exhaustive").map((q) => q.query);
    expect(literals).toContain("A Note With No Identifier In Its Title");
  });
});

describe("funnel discovery — candidate set construction", () => {
  const fileSystem = {
    async *listMarkdown() {
      /* never called */
    },
    async read() {
      return "";
    },
    async exists(abs: string) {
      return !abs.includes("ghost");
    },
  };

  test("the union of both legs is the candidate set, deduplicated", async () => {
    const { runner } = runnerFor({
      references: () => referencesPayload(["analysis/A.md", "analysis/B.md"]),
      exhaustive: () => exhaustivePayload(["analysis/B.md", "analysis/C.md"]),
    });
    const result = await discoverCandidates([target()], {
      project: "fixture",
      docsRoot: "/root",
      runner,
      fileSystem,
    });
    expect(result.candidates).toEqual([
      "analysis/A.md",
      "analysis/ANALYSIS-100-target.md",
      "analysis/B.md",
      "analysis/C.md",
    ]);
  });

  /**
   * A target's own Relations section is the formal index of what references it, so
   * the graph leg reads it whether or not a query happened to name the target's file.
   */
  test("the target is always in scope even when no query returns it", async () => {
    const { runner } = runnerFor({
      references: () => referencesPayload([]),
      exhaustive: () => exhaustivePayload([]),
    });
    const result = await discoverCandidates([target()], {
      project: "fixture",
      docsRoot: "/root",
      runner,
      fileSystem,
    });
    expect(result.candidates).toEqual(["analysis/ANALYSIS-100-target.md"]);
  });

  test("a candidate the index knows but the disk does not is reported, not dropped silently", async () => {
    const { runner } = runnerFor({
      references: () => referencesPayload(["analysis/ghost.md", "analysis/A.md"]),
      exhaustive: () => exhaustivePayload([]),
    });
    const result = await discoverCandidates([target()], {
      project: "fixture",
      docsRoot: "/root",
      runner,
      fileSystem,
    });
    expect(result.candidates).not.toContain("analysis/ghost.md");
    expect(result.missingOnDisk).toEqual(["analysis/ghost.md"]);
  });

  /**
   * Measured on fond: four `decompose-*.yaml` distribution plans sit in the docs root,
   * contain target identifiers, and come back as real containment hits — 90 findings
   * across them. Admitting those would break closure, not merely widen the worklist:
   * `--check` re-scans with the census, the census enumerates `**\/*.md` only, so a
   * finding in a YAML could never be re-derived and the very next check would report
   * it UPDATED — counting a reference nobody touched as repaired.
   */
  test("non-markdown files are excluded from the candidate set and reported", async () => {
    const { runner } = runnerFor({
      references: () => referencesPayload([]),
      exhaustive: () =>
        exhaustivePayload(["decompose-adr-001-cluster-split-plan.yaml", "analysis/A.md"]),
    });
    const result = await discoverCandidates([target()], {
      project: "fixture",
      docsRoot: "/root",
      runner,
      fileSystem,
    });
    expect(result.candidates).toContain("analysis/A.md");
    expect(result.candidates).not.toContain("decompose-adr-001-cluster-split-plan.yaml");
    expect(result.nonNoteCandidates).toEqual(["decompose-adr-001-cluster-split-plan.yaml"]);
    // The exclusion is a scope statement, not an incompleteness: the queries still
    // proved themselves, so the union is still provable.
    expect(result.provable).toBe(true);
  });

  test("rows carrying no file path are skipped without failing the run", async () => {
    const { runner } = runnerFor({
      references: () => referencesPayload([], { results: [{ permalink: "x", title: "y" }] }),
      exhaustive: () => exhaustivePayload([]),
    });
    const result = await discoverCandidates([target()], {
      project: "fixture",
      docsRoot: "/root",
      runner,
      fileSystem,
    });
    expect(result.queries.find((q) => q.leg === "references")?.notes).toBe(0);
  });
});

/**
 * Stage one narrows; stage two addresses. These cover the join: that a funnel scan
 * reads ONLY the candidate notes, and that the manifest records how the scope was
 * chosen and whether that scope can prove itself whole.
 */
describe("funnel-scoped scan — stage two runs over the candidate set only", () => {
  const root = mkdtempSync(join(tmpdir(), "funnel-scan-"));

  async function write(rel: string, body: string): Promise<void> {
    await mkdir(join(root, rel, ".."), { recursive: true });
    await Bun.write(join(root, rel), body);
  }

  async function seed(): Promise<void> {
    await write(
      "analysis/ANALYSIS-100-target.md",
      "---\ntitle: 'ANALYSIS-100: Target'\npermalink: analysis/analysis-100-target\n---\n\n# ANALYSIS-100: Target\n",
    );
    await write(
      "analysis/ANALYSIS-101-referrer.md",
      "---\ntitle: 'ANALYSIS-101: Referrer'\npermalink: analysis/analysis-101-referrer\n---\n\nSee [[ANALYSIS-100: Target]] for detail.\n",
    );
    // Present on disk, referencing the target, but NOT returned by stage one. Its
    // absence from the funnel result is what proves the scan was actually scoped.
    await write(
      "analysis/ANALYSIS-102-unreached.md",
      "---\ntitle: 'ANALYSIS-102: Unreached'\npermalink: analysis/analysis-102-unreached\n---\n\nAlso cites ANALYSIS-100 here.\n",
    );
  }

  test("a funnel scan finds references in candidates and never opens the rest", async () => {
    await seed();
    const { runner, calls } = runnerFor({
      references: () => referencesPayload(["analysis/ANALYSIS-101-referrer.md"]),
      exhaustive: () => exhaustivePayload(["analysis/ANALYSIS-101-referrer.md"]),
    });
    const manifest = await buildImpactManifest({
      docsRoot: root,
      targets: [{ path: "analysis/ANALYSIS-100-target.md" }],
      project: "fixture",
      runner,
      now: "2026-01-01T00:00:00.000Z",
    });

    expect(manifest.discovery.provable).toBe(true);
    expect(manifest.discovery.projectSource).toBe("caller");
    expect(manifest.discovery.queries).toHaveLength(2);
    // The referrer's wikilink was found by position...
    expect(manifest.findings.map((f) => f.referencingFile)).toContain(
      "analysis/ANALYSIS-101-referrer.md",
    );
    // ...and the note stage one never returned was never read, so its real reference
    // is absent. That is the funnel being genuinely SCOPED rather than a tree walk
    // wearing a query's clothing — and it is why stage one's completeness contract
    // has to be mutation-proven rather than assumed.
    expect(manifest.findings.map((f) => f.referencingFile)).not.toContain(
      "analysis/ANALYSIS-102-unreached.md",
    );
    expect(calls.length).toBe(2);
  });

  test("an unproven funnel still produces a manifest, flagged unprovable", async () => {
    await seed();
    const { runner } = runnerFor({
      references: () =>
        referencesPayload(["analysis/ANALYSIS-101-referrer.md"], {
          completeness: { provable: false, reason: "unreachable leg" },
        }),
      exhaustive: () => exhaustivePayload(["analysis/ANALYSIS-101-referrer.md"]),
    });
    const manifest = await buildImpactManifest({
      docsRoot: root,
      targets: [{ path: "analysis/ANALYSIS-100-target.md" }],
      project: "fixture",
      runner,
      now: "2026-01-01T00:00:00.000Z",
    });
    expect(manifest.discovery.provable).toBe(false);
    expect(manifest.discovery.queries.filter((q) => !q.provable)[0]?.reason).toBe(
      "unreachable leg",
    );
  });

  /**
   * Timing must never reach the manifest.
   *
   * A regression guard with a real cause: wall-clock was briefly recorded in the
   * discovery block, and the determinism test caught it immediately — two scans of
   * an unchanged graph stopped being byte-identical, which is the property that
   * makes a manifest diffable at all. Timing is a property of the RUN, not of the
   * graph, so it is reported on stderr by the caller instead.
   */
  test("no timing field leaks into the manifest, so repeat scans are byte-identical", async () => {
    await seed();
    const scan = async () =>
      await buildImpactManifest({
        docsRoot: root,
        targets: [{ path: "analysis/ANALYSIS-100-target.md" }],
        project: "fixture",
        runner: runnerFor({
          references: () => referencesPayload(["analysis/ANALYSIS-101-referrer.md"]),
          exhaustive: () => exhaustivePayload(["analysis/ANALYSIS-101-referrer.md"]),
        }).runner,
        now: "2026-01-01T00:00:00.000Z",
      });
    const first = await scan();
    const second = await scan();
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    const serialized = JSON.stringify(first);
    expect(serialized).not.toContain("elapsedMs");
    expect(serialized).not.toContain("concurrency");
  });

  test("a search outage fails the scan instead of yielding an empty worklist", async () => {
    await seed();
    const runner: SearchRunner = async () => ({ exitCode: 7, stdout: "", stderr: "no server" });
    let raised: unknown;
    try {
      await buildImpactManifest({
        docsRoot: root,
        targets: [{ path: "analysis/ANALYSIS-100-target.md" }],
        project: "fixture",
        runner,
      });
    } catch (err) {
      raised = err;
    }
    expect(raised).toBeInstanceOf(SearchUnavailableError);
  });

  test("cleanup", () => {
    rmSync(root, { recursive: true, force: true });
    expect(true).toBe(true);
  });
});
