/**
 * The brain CLI as a search surface for the composition scripts.
 *
 * Post-parity the CLI exposes the full filter set the MCP surface has — permalink
 * wildcards, entity types including relation edges, note types, tags, status,
 * metadata filters, after-date, filter-only queries, pagination — which is what
 * makes "find every note impacted by this restructuring" a query rather than a
 * tree walk. This module is the only place that shells out to it.
 *
 * Three measured properties of the surface shape everything here, and each was
 * verified against the installed binary rather than assumed:
 *
 * **`total` cannot prove exhaustion.** It mirrors the number of rows returned, not
 * the number available: a query at `--limit 100` reports `total: 100`. So the only
 * valid exhaustion check is to page until a page comes back SHORTER than the limit.
 * Trusting `total` would silently truncate every enumeration at its limit
 * boundary, which is precisely the completeness failure this leg exists to remove.
 *
 * **The response is double-wrapped.** The CLI emits an MCP envelope whose single
 * text part contains the real JSON payload, so parsing is two steps. A single
 * `JSON.parse` yields an object with a `content` array and no results, which reads
 * as "the search found nothing" — a silent zero rather than a parse failure.
 *
 * **Verbs from the index are not evidence.** A relation row's verb arrives inside a
 * synthetic edge permalink and an `A -> B` title, and the index is known to strip
 * verbs on H3-grouped notes and to fabricate others. Relation rows are therefore
 * treated as EXISTENCE only; anything verb-typed reads the note body instead.
 *
 * The CLI talks to a local server and will start one if none is running. That is a
 * real dependency: this module fails loudly and immediately when search is
 * unreachable, and never retries in a loop or waits without a bound.
 */

/** One row as the surface returns it. No line or column — see `SearchHit`. */
export interface SearchHit {
  readonly permalink: string;
  readonly title: string;
  readonly snippet: string;
  readonly similarityScore: number;
  /** Which leg served this row, per the surface's own report. */
  readonly source: string;
}

export interface SearchResponse {
  readonly hits: SearchHit[];
  /** The mode requested. */
  readonly mode: string;
  /** The leg that actually served the page, which routinely differs from `mode`. */
  readonly actualSource: string;
  /**
   * True when the enumeration is known complete: the final page came back shorter
   * than the requested limit. False means a limit boundary was hit and rows may
   * remain — never treated as completeness.
   */
  readonly exhausted: boolean;
  /** Pages actually fetched, for provenance in a report. */
  readonly pages: number;
}

export interface SearchQuery {
  /** Optional: omit for a filter-only enumeration. */
  readonly query?: string | undefined;
  readonly project: string;
  readonly mode?: string | undefined;
  readonly searchType?: string | undefined;
  readonly entityTypes?: readonly string[] | undefined;
  readonly noteTypes?: readonly string[] | undefined;
  readonly categories?: readonly string[] | undefined;
  readonly tags?: readonly string[] | undefined;
  readonly status?: string | undefined;
  readonly afterDate?: string | undefined;
  readonly metadataFilters?: Readonly<Record<string, unknown>> | undefined;
  /** Rows per page, capped at the surface's own maximum. */
  readonly limit?: number | undefined;
  /** Stop after this many pages. A bound, not a target. */
  readonly maxPages?: number | undefined;
}

/**
 * The subprocess seam. Injected so the pagination, exhaustion, verb-integrity and
 * failure paths are testable without a server and without touching real notes —
 * the behaviour worth covering is this module's, not the CLI's.
 */
export type SearchRunner = (
  args: readonly string[],
) => Promise<{ exitCode: number; stdout: string; stderr: string }>;

/** The surface's documented maximum rows per request. */
export const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 100;
const DEFAULT_MAX_PAGES = 50;
const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Search is unreachable or unusable. Its own error class so a caller can tell "the
 * advisory leg could not run" from "the advisory leg ran and found nothing" —
 * conflating those is how an unavailable index becomes a clean bill of health.
 */
export class SearchUnavailableError extends Error {
  constructor(
    message: string,
    readonly detail: string,
  ) {
    super(message);
    this.name = "SearchUnavailableError";
  }
}

function unavailable(reason: string, detail: string): SearchUnavailableError {
  return new SearchUnavailableError(
    `brain search is unavailable: ${reason}. The CLI talks to a local brain server; confirm it is reachable with: brain search "probe" --project <name> --limit 1 --json`,
    detail,
  );
}

/**
 * Default runner: `Bun.spawn` with a hard timeout.
 *
 * The timeout is the "never hang" half of the server-dependency requirement. A
 * search that has not answered inside the window is treated as unavailable rather
 * than waited on, because a composition script blocking indefinitely on an
 * advisory leg is strictly worse than one that reports the leg could not run.
 */
export function defaultSearchRunner(
  binary = "brain",
  timeoutMs = DEFAULT_TIMEOUT_MS,
): SearchRunner {
  return async (args) => {
    const proc = Bun.spawn([binary, ...args], { stdout: "pipe", stderr: "pipe" });
    const timer = setTimeout(() => proc.kill(), timeoutMs);
    try {
      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);
      const exitCode = await proc.exited;
      return { exitCode, stdout, stderr };
    } finally {
      clearTimeout(timer);
    }
  };
}

function pushFlag(args: string[], flag: string, value: string | undefined): void {
  if (value !== undefined && value.length > 0) args.push(flag, value);
}

function pushList(args: string[], flag: string, values: readonly string[] | undefined): void {
  if (values !== undefined && values.length > 0) args.push(flag, values.join(","));
}

/** Build the argv for one page. Exported so a caller can log exactly what ran. */
export function buildSearchArgs(query: SearchQuery, page: number): string[] {
  const args = ["search"];
  if (query.query !== undefined && query.query.length > 0) args.push(query.query);
  args.push("--project", query.project);
  pushFlag(args, "--mode", query.mode);
  pushFlag(args, "--search-type", query.searchType);
  pushList(args, "--entity-types", query.entityTypes);
  pushList(args, "--note-types", query.noteTypes);
  pushList(args, "--categories", query.categories);
  pushList(args, "--tags", query.tags);
  pushFlag(args, "--status", query.status);
  pushFlag(args, "--after-date", query.afterDate);
  if (query.metadataFilters !== undefined) {
    args.push("--metadata-filters", JSON.stringify(query.metadataFilters));
  }
  args.push("--limit", String(Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT)));
  args.push("--page", String(page));
  args.push("--json");
  return args;
}

interface RawRow {
  permalink?: unknown;
  title?: unknown;
  snippet?: unknown;
  similarity_score?: unknown;
  source?: unknown;
}

function stringOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Unwrap the MCP envelope and parse the payload inside it.
 *
 * Both layers are checked explicitly. The failure this guards against is not a
 * crash but a silent one: the envelope parses fine on its own and yields an object
 * with no `results`, which a lenient reader reports as an empty result set.
 */
function parseEnvelope(stdout: string): { rows: RawRow[]; mode: string; actualSource: string } {
  let outer: unknown;
  try {
    outer = JSON.parse(stdout);
  } catch (err) {
    throw unavailable("output was not JSON", (err as Error).message);
  }
  const content = (outer as { content?: unknown }).content;
  if (!Array.isArray(content) || content.length === 0) {
    throw unavailable("response carried no MCP content part", stdout.slice(0, 400));
  }
  const text = stringOf((content[0] as { text?: unknown }).text);
  if (text.length === 0) {
    throw unavailable("MCP content part was empty", stdout.slice(0, 400));
  }
  let inner: unknown;
  try {
    inner = JSON.parse(text);
  } catch (err) {
    throw unavailable("payload inside the MCP envelope was not JSON", (err as Error).message);
  }
  const payload = inner as { results?: unknown; mode?: unknown; actual_source?: unknown };
  if (!Array.isArray(payload.results)) {
    throw unavailable("payload carried no results array", text.slice(0, 400));
  }
  return {
    rows: payload.results as RawRow[],
    mode: stringOf(payload.mode),
    actualSource: stringOf(payload.actual_source),
  };
}

function toHit(row: RawRow): SearchHit {
  return {
    permalink: stringOf(row.permalink),
    title: stringOf(row.title),
    snippet: stringOf(row.snippet),
    similarityScore: typeof row.similarity_score === "number" ? row.similarity_score : 0,
    source: stringOf(row.source),
  };
}

/**
 * Run one query to exhaustion.
 *
 * Paging stops on the first SHORT page — one returning fewer rows than the limit —
 * which is the only exhaustion signal the surface actually provides. Hitting
 * `maxPages` with every page full leaves `exhausted` false, so a caller can tell a
 * complete enumeration from a truncated one instead of assuming.
 */
export async function searchAll(
  query: SearchQuery,
  runner: SearchRunner = defaultSearchRunner(),
): Promise<SearchResponse> {
  const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const maxPages = query.maxPages ?? DEFAULT_MAX_PAGES;
  const hits: SearchHit[] = [];
  const seen = new Set<string>();
  let mode = "";
  let actualSource = "";
  let exhausted = false;
  let pages = 0;

  for (let page = 1; page <= maxPages; page++) {
    const args = buildSearchArgs({ ...query, limit }, page);
    let result: Awaited<ReturnType<SearchRunner>>;
    try {
      result = await runner(args);
    } catch (err) {
      throw unavailable("the CLI could not be invoked", (err as Error).message);
    }
    if (result.exitCode !== 0) {
      throw unavailable(
        `the CLI exited ${result.exitCode}`,
        result.stderr.trim() || result.stdout.slice(0, 400),
      );
    }
    const parsed = parseEnvelope(result.stdout);
    pages = page;
    mode = parsed.mode;
    actualSource = parsed.actualSource;

    for (const row of parsed.rows) {
      const hit = toHit(row);
      // De-duplicated across pages: a page boundary that re-serves a row would
      // otherwise inflate an enumeration whose whole purpose is an accurate count.
      if (hit.permalink.length > 0 && seen.has(hit.permalink)) continue;
      if (hit.permalink.length > 0) seen.add(hit.permalink);
      hits.push(hit);
    }
    if (parsed.rows.length < limit) {
      exhausted = true;
      break;
    }
  }
  return { hits, mode, actualSource, exhausted, pages };
}
