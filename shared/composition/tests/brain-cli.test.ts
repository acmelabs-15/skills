import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  MAX_LIMIT,
  type SearchRunner,
  SearchUnavailableError,
  buildSearchArgs,
  searchAll,
} from "../src/core/brain-cli.js";
import { buildImpactManifest } from "../src/core/reference-scan.js";
import { augmentManifestWithSearch, locateSnippet } from "../src/core/reference-search.js";

/**
 * Every test here drives the injected runner rather than a live server.
 *
 * That is a deliberate choice over spawning a from-source server against a fixture
 * project. What needs covering is THIS module's behaviour — the double-unwrap, the
 * exhaustion rule, the de-duplication, the failure paths — none of which a live
 * server exercises any better, and all of which a live server makes
 * non-deterministic. The response shapes below are transcribed from real probes of
 * the installed binary, so the fixtures are not invented.
 */
function envelope(rows: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    content: [
      {
        type: "text",
        text: JSON.stringify({
          total: rows.length,
          query: "q",
          mode: "keyword",
          actual_source: "keyword",
          depth: 0,
          results: rows,
          ...extra,
        }),
      },
    ],
  });
}

function row(permalink: string) {
  return {
    permalink,
    title: `Title of ${permalink}`,
    similarity_score: -1.5,
    snippet: `snippet for ${permalink}`,
    source: "keyword",
  };
}

/** A runner serving fixed pages in order. */
function pagedRunner(pages: Array<Array<Record<string, unknown>>>): {
  runner: SearchRunner;
  calls: string[][];
} {
  const calls: string[][] = [];
  let index = 0;
  const runner: SearchRunner = async (args) => {
    calls.push([...args]);
    const page = pages[index++] ?? [];
    return { exitCode: 0, stdout: envelope(page), stderr: "" };
  };
  return { runner, calls };
}

describe("buildSearchArgs", () => {
  test("a filter-only query omits the positional term", () => {
    const args = buildSearchArgs({ project: "skills", noteTypes: ["decision"] }, 1);
    expect(args[0]).toBe("search");
    expect(args).not.toContain("");
    expect(args).toContain("--note-types");
    expect(args[args.indexOf("--note-types") + 1]).toBe("decision");
  });

  test("every filter maps to its flag, and lists are comma-joined", () => {
    const args = buildSearchArgs(
      {
        query: "grid",
        project: "fond",
        mode: "keyword",
        searchType: "text",
        entityTypes: ["observation", "relation"],
        noteTypes: ["analysis", "decision"],
        categories: ["decision"],
        tags: ["a", "b"],
        status: "DRAFT",
        afterDate: "2026-07-01",
        metadataFilters: { status: "DRAFT" },
      },
      2,
    );
    const at = (flag: string) => args[args.indexOf(flag) + 1];
    expect(at("--entity-types")).toBe("observation,relation");
    expect(at("--note-types")).toBe("analysis,decision");
    expect(at("--tags")).toBe("a,b");
    expect(at("--status")).toBe("DRAFT");
    expect(at("--after-date")).toBe("2026-07-01");
    expect(at("--metadata-filters")).toBe('{"status":"DRAFT"}');
    expect(at("--page")).toBe("2");
    expect(args).toContain("--json");
  });

  test("the limit is capped at the surface's documented maximum", () => {
    const args = buildSearchArgs({ project: "skills", limit: 5000 }, 1);
    expect(args[args.indexOf("--limit") + 1]).toBe(String(MAX_LIMIT));
  });
});

describe("searchAll — exhaustion", () => {
  /**
   * The measured reason `total` cannot be trusted: it mirrors the returned count, so
   * a query at limit 100 reports total 100 whether or not more rows exist. A SHORT
   * page is the only exhaustion signal the surface provides.
   */
  test("paging stops on the first short page and reports exhaustion", async () => {
    const { runner, calls } = pagedRunner([[row("a"), row("b")], [row("c")]]);
    const result = await searchAll({ project: "skills", limit: 2 }, runner);
    expect(result.hits.map((hit) => hit.permalink)).toEqual(["a", "b", "c"]);
    expect(result.exhausted).toBe(true);
    expect(result.pages).toBe(2);
    expect(calls).toHaveLength(2);
  });

  test("an empty first page is exhausted, not an error", async () => {
    const { runner } = pagedRunner([[]]);
    const result = await searchAll({ project: "skills", limit: 10 }, runner);
    expect(result.hits).toEqual([]);
    expect(result.exhausted).toBe(true);
  });

  /**
   * The completeness failure this leg exists to remove. Every page full to the limit
   * means rows may remain, and the result says so instead of looking finished.
   */
  test("hitting the page bound with every page full is NOT reported as complete", async () => {
    const { runner, calls } = pagedRunner([[row("a")], [row("b")], [row("c")]]);
    const result = await searchAll({ project: "skills", limit: 1, maxPages: 3 }, runner);
    expect(result.hits).toHaveLength(3);
    expect(result.exhausted).toBe(false);
    expect(calls).toHaveLength(3);
  });

  test("a row re-served across a page boundary is counted once", async () => {
    const { runner } = pagedRunner([[row("a"), row("b")], [row("b"), row("c")], [row("d")]]);
    const result = await searchAll({ project: "skills", limit: 2 }, runner);
    expect(result.hits.map((hit) => hit.permalink)).toEqual(["a", "b", "c", "d"]);
  });

  test("the requested mode and the leg that served it are both reported", async () => {
    const runner: SearchRunner = async () => ({
      exitCode: 0,
      stdout: JSON.stringify({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              results: [row("a")],
              mode: "semantic",
              actual_source: "keyword",
            }),
          },
        ],
      }),
      stderr: "",
    });
    const result = await searchAll({ project: "skills", limit: 10 }, runner);
    expect(result.mode).toBe("semantic");
    expect(result.actualSource).toBe("keyword");
  });
});

describe("searchAll — failing loud", () => {
  test("a non-zero exit is unavailable, with the CLI's own stderr carried through", async () => {
    const runner: SearchRunner = async () => ({
      exitCode: 1,
      stdout: "",
      stderr: "connection refused on 8765",
    });
    const failure = await searchAll({ project: "skills" }, runner).catch((err: unknown) => err);
    expect(failure).toBeInstanceOf(SearchUnavailableError);
    expect((failure as SearchUnavailableError).detail).toContain("connection refused");
    // The message names the probe a reader can run, since the dependency is a server.
    expect((failure as Error).message).toContain("brain search");
  });

  test("a spawn failure is unavailable rather than an unhandled rejection", async () => {
    const runner: SearchRunner = async () => {
      throw new Error("ENOENT: brain");
    };
    expect(searchAll({ project: "skills" }, runner)).rejects.toBeInstanceOf(SearchUnavailableError);
  });

  /**
   * The silent-zero trap. The MCP envelope parses on its own and yields an object
   * with no `results`, which a lenient reader reports as "found nothing" — an
   * unreachable index arriving as a clean bill of health.
   */
  test("output that is not the MCP envelope fails instead of reading as zero results", async () => {
    for (const stdout of ["not json at all", "{}", '{"content":[]}', '{"content":[{"text":""}]}']) {
      const runner: SearchRunner = async () => ({ exitCode: 0, stdout, stderr: "" });
      expect(
        searchAll({ project: "skills" }, runner),
        `stdout ${stdout} should have failed`,
      ).rejects.toBeInstanceOf(SearchUnavailableError);
    }
  });

  test("an envelope whose inner payload is not JSON fails loudly", async () => {
    const runner: SearchRunner = async () => ({
      exitCode: 0,
      stdout: JSON.stringify({ content: [{ type: "text", text: "{ broken" }] }),
      stderr: "",
    });
    expect(searchAll({ project: "skills" }, runner)).rejects.toThrow(/not JSON/);
  });

  test("an inner payload with no results array fails rather than returning none", async () => {
    const runner: SearchRunner = async () => ({
      exitCode: 0,
      stdout: JSON.stringify({ content: [{ type: "text", text: '{"total":0}' }] }),
      stderr: "",
    });
    expect(searchAll({ project: "skills" }, runner)).rejects.toThrow(/no results array/);
  });
});

describe("augmentManifestWithSearch — widening without moving the gate", () => {
  const FIXTURE_ROOT = join(import.meta.dir, "fixtures", "repoint-tree");
  const SOURCE = "analysis/ANALYSIS-120-repoint-source.md";
  const REFERRER = "analysis/ANALYSIS-122-repoint-referrer.md";
  const DECISION = "decisions/ADR-120-repoint-decision.md";

  function manifestFor() {
    return buildImpactManifest({
      docsRoot: FIXTURE_ROOT,
      targets: [{ path: SOURCE }],
      now: "2026-01-01T00:00:00.000Z",
    });
  }

  /** Serves a descriptive hit on one note, then an empty relation page. */
  function runnerHitting(permalink: string, snippet: string): SearchRunner {
    return async (args) => {
      const isRelation = args.includes("relation");
      const rows = isRelation
        ? []
        : [
            {
              permalink,
              title: "ANALYSIS-121: Repoint Destination",
              similarity_score: 0.71,
              snippet,
              source: "semantic",
            },
          ];
      return { exitCode: 0, stdout: envelope(rows, { actual_source: "semantic" }), stderr: "" };
    };
  }

  test("the deterministic findings are left exactly as they were", async () => {
    const before = await manifestFor();
    const { manifest } = await augmentManifestWithSearch({
      manifest: before,
      project: "fixture",
      runner: runnerHitting("decisions/adr-120-repoint-decision", "no such text in that note"),
    });
    const deterministic = manifest.findings.filter((finding) => finding.source !== "SEARCH");
    // Compared as JSON: the filtered array's element type is the deterministic branch
    // while the original is the full union, so a structural compare is what states
    // "byte-for-byte the same findings" without a cast.
    expect(JSON.stringify(deterministic)).toBe(JSON.stringify(before.findings));
    expect(manifest.summary.bySource.TEXT).toBe(before.summary.bySource.TEXT);
    expect(manifest.summary.bySource.GRAPH).toBe(before.summary.bySource.GRAPH);
  });

  /**
   * The precision rule. Every note in this fixture that the text scan matched is
   * already covered, so a hit on one adds nothing and must not double-count it.
   */
  test("a hit on a note the text scan already matched is dropped", async () => {
    const { manifest, leg } = await augmentManifestWithSearch({
      manifest: await manifestFor(),
      project: "fixture",
      runner: runnerHitting(
        "analysis/analysis-122-repoint-referrer",
        "The canonical wikilink form is",
      ),
    });
    expect(leg.findings).toEqual([]);
    expect(manifest.summary.bySource.SEARCH).toBe(0);
    expect(REFERRER.length).toBeGreaterThan(0);
  });

  test("a hit whose snippet cannot be located in the note is dropped, not placed at line 1", async () => {
    const { leg } = await augmentManifestWithSearch({
      manifest: await manifestFor(),
      project: "fixture",
      runner: runnerHitting(
        "analysis/analysis-121-repoint-destination",
        "a sentence this fixture never contains anywhere",
      ),
    });
    expect(leg.findings).toEqual([]);
  });

  test("a locatable hit on an uncovered note becomes an advisory finding with a real address", async () => {
    const { manifest, leg } = await augmentManifestWithSearch({
      manifest: await manifestFor(),
      project: "fixture",
      mode: "semantic",
      runner: runnerHitting(
        "analysis/analysis-121-repoint-destination",
        "The post-split identity. Every section a repointed citation can name",
      ),
    });
    expect(leg.findings).toHaveLength(1);
    const finding = leg.findings[0];
    expect(finding?.referencingFile).toBe("analysis/ANALYSIS-121-repoint-destination.md");
    expect(finding?.line).toBeGreaterThan(1);
    // Forced advisory, so it can never gate closure or be written from.
    expect(finding?.source).toBe("SEARCH");
    expect(finding?.advisory).toBe(true);
    // The provenance triple is now populated in-library rather than hand-supplied.
    // Narrowed on the discriminator before reading provenance: the fields exist only
    // on the SEARCH branch now, which is the guarantee under test.
    if (finding?.source !== "SEARCH") throw new Error("advisory finding is not SEARCH-sourced");
    expect(finding.mode).toBe("semantic");
    expect(finding.actualSource).toBe("semantic");
    expect(finding.searchType).toBeDefined();
    expect(manifest.summary.bySource.SEARCH).toBe(1);
    expect(DECISION.length).toBeGreaterThan(0);
  });

  /**
   * The measured false-positive shape: on the live graph an ungated probe returned
   * 120 entries for three targets, nearly all of them the same note-OPENING line
   * repeated per target, because a semantic snippet is the note's opening rather than
   * the sentence naming the target. Real addresses on irrelevant lines are the worst
   * kind of finding, so the located line must share a distinctive title word.
   */
  test("a located line sharing no distinctive title word is gated out", async () => {
    const { leg } = await augmentManifestWithSearch({
      manifest: await manifestFor(),
      project: "fixture",
      runner: runnerHitting(
        "analysis/analysis-121-repoint-destination",
        // Real text from the destination note, but about anchors rather than the
        // target's own subject.
        "A designator anchor written as a heading",
      ),
    });
    expect(leg.findings).toEqual([]);
  });

  test("an incomplete enumeration is reported rather than passed off as complete", async () => {
    // Every page full to the limit, which is the boundary that proves nothing about
    // exhaustion. The runner reads the limit off argv so the real code path is what
    // decides, rather than a hard-coded row count that happens to match.
    const runner: SearchRunner = async (args) => {
      const limit = Number(args[args.indexOf("--limit") + 1] ?? 0);
      const rows = Array.from({ length: limit }, (_unused, index) => row(`note-${index}`));
      return { exitCode: 0, stdout: envelope(rows), stderr: "" };
    };
    const { leg } = await augmentManifestWithSearch({
      manifest: await manifestFor(),
      project: "fixture",
      runner,
    });
    expect(leg.complete).toBe(false);
    expect(leg.queries.some((query) => !query.exhausted)).toBe(true);
  });

  test("an unreachable search surfaces as an error, never as an empty advisory leg", async () => {
    const runner: SearchRunner = async () => ({
      exitCode: 1,
      stdout: "",
      stderr: "dial tcp 127.0.0.1:8765: connect: connection refused",
    });
    expect(
      augmentManifestWithSearch({
        manifest: await manifestFor(),
        project: "fixture",
        runner,
      }),
    ).rejects.toBeInstanceOf(SearchUnavailableError);
  });
});

describe("locateSnippet", () => {
  const content = ["# Title", "", "The substrate analysis settled the storage question.", ""].join(
    "\n",
  );

  test("a snippet fragment resolves to the 1-indexed line carrying it", () => {
    expect(locateSnippet(content, "settled the storage question")).toBe(3);
  });

  test("a multi-line snippet resolves on its longest locatable fragment", () => {
    expect(locateSnippet(content, "# Title\n\nThe substrate analysis settled")).toBe(3);
  });

  /** No address is better than a wrong one: the caller drops the hit on null. */
  test("a snippet that is not in the note resolves to nothing, not to line 1", () => {
    expect(locateSnippet(content, "an assertion this note never makes")).toBeNull();
  });

  test("fragments too short to be distinctive are not matched on", () => {
    expect(locateSnippet(content, "The")).toBeNull();
  });
});
