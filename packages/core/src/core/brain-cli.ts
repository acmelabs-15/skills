/**
 * The brain CLI as a search surface for the composition scripts.
 *
 * This module is the ONLY place that shells out to it, and it exposes exactly one
 * kind of query: COMPLETE RETRIEVAL. `--references` and `--exhaustive` return a
 * provably complete set rather than a relevance-ordered subset, take no limit, do
 * not rank, and do not page — completeness is the contract, and the response states
 * in-band whether that contract was met.
 *
 * The two partition the reference space, which is why stage one runs both:
 *
 *   --references <target>   every note holding a wikilink EDGE to the target.
 *                           Existence-only, deduplicated to notes, BOTH directions
 *                           with a per-note inbound/outbound/both marker.
 *   --exhaustive <query>    every note whose FULL CONTENT contains the query as a
 *                           literal case-insensitive substring. Reads the full
 *                           content column, so it is unaffected by the upstream
 *                           6000-character truncation that makes ranked keyword
 *                           search silently miss references past that offset.
 *
 * The RANKED surface — `searchAll`, pagination, exhaustion-by-short-page, the mode
 * and search_type dials — was REMOVED along with the leg that used it. It answered
 * the same question these two answer, but as a limit-bounded approximation whose
 * exhaustion could only be inferred from a short page. Keeping it would have left
 * two answers to one question, diverging above the page limit, with the weaker one
 * indistinguishable downstream.
 *
 * Three measured properties of this surface shape everything below, each verified
 * against the installed binary rather than assumed:
 *
 * **`completeness.provable` is the ONLY signal that a zero is real.** A probe for a
 * target the index does not know returns `total: 0`, `results: []`, and exit code 0
 * — indistinguishable from "this note genuinely has no references" unless the
 * honesty field is read. Verified live: `--references ANALYSIS-999` against a real
 * project returned exactly that, with `provable: false` and a `reason` naming the
 * unresolved target. So `provable` is parsed STRICTLY — `=== true` and nothing else
 * — because every lenient reading of a missing field turns an unproven set into a
 * claimed-complete one, which is the precise failure this leg exists to remove.
 *
 * **The response is double-wrapped.** The CLI emits an MCP envelope whose single
 * text part contains the real JSON payload, so parsing is two steps. A single
 * `JSON.parse` yields an object with a `content` array and no results, which reads
 * as "the search found nothing" — a silent zero rather than a parse failure.
 *
 * **`file_path` is what makes stage two addressable.** A permalink is not
 * mechanically invertible to a filename (the stem lowercases while the file keeps
 * its CAPS entity prefix). These rows carry the docs-root-relative path directly,
 * so a candidate note can be opened and position-matched without a tree-wide index
 * to map it back — which is what lets the tree walk go away entirely.
 *
 * The CLI talks to a local server and will start one if none is running. That is a
 * real dependency: this module fails loudly and immediately when search is
 * unreachable, and never retries in a loop or waits without a bound.
 */

/**
 * The subprocess seam. Injected so the parsing, honesty and failure paths are
 * testable without a server and without touching real notes — the behaviour worth
 * covering is this module's, not the CLI's.
 */
export type SearchRunner = (
  args: readonly string[],
) => Promise<{ exitCode: number; stdout: string; stderr: string }>;

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Search is unreachable or unusable. Its own error class so a caller can tell "the
 * leg could not run" from "the leg ran and found nothing" — conflating those is how
 * an unavailable index becomes a clean bill of health.
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

export function unavailable(reason: string, detail: string): SearchUnavailableError {
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
 * than waited on, because a composition script blocking indefinitely is strictly
 * worse than one that reports the leg could not run.
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

/** One note in a complete-retrieval result set. */
export interface CompleteRetrievalRow {
  readonly permalink: string;
  readonly title: string;
  /** Docs-root-relative path — the field stage two opens. */
  readonly filePath: string;
  /** `--references` only: `inbound` | `outbound` | `both`. Empty on the other leg. */
  readonly direction: string;
  /** `--exhaustive` only: how containment was established. Empty on the other leg. */
  readonly evidence: string;
  /**
   * Which of a batch's targets or literals this note matched.
   *
   * Empty on a single-target request, where the answer is unambiguous. On a batch it
   * is what keeps the candidate set attributable per target: rows stay deduplicated
   * to notes, and this says which members each note answers for.
   */
  readonly matched: readonly string[];
}

/** One member's own outcome within a batched request. */
export interface PerTargetOutcome {
  readonly target: string;
  readonly total: number;
  readonly provable: boolean;
  readonly reason: string;
}

export interface CompleteRetrievalResponse {
  readonly rows: readonly CompleteRetrievalRow[];
  /**
   * The project that actually answered, echoed back by the surface.
   *
   * Load-bearing when the caller supplied none: the CLI then resolves one itself
   * (BM_PROJECT, BM_ACTIVE_PROJECT, BRAIN_PROJECT, then a cwd match against
   * configured code paths), and this echo is the only way to learn WHICH graph the
   * answer came from. A worklist is meaningless without knowing that.
   */
  readonly project: string;
  /** The surface's own count. Trustworthy here — unlike ranked search, nothing is paged. */
  readonly total: number;
  /**
   * The surface's claim that this set is provably complete. Parsed strictly: a
   * missing, non-boolean, or false value all yield `false`.
   */
  readonly provable: boolean;
  /** Why completeness could not be proved, when the surface said. Empty otherwise. */
  readonly reason: string;
  /** The surface's statement of which reference class this leg covers. */
  readonly scope: string;
  /** `--references` only: the permalink the target resolved to. */
  readonly resolvedPermalink: string;
  /** `--references` only: edges out of the target that resolve to no note. */
  readonly danglingOutboundEdges: number;
  /**
   * Per-member outcomes when a BATCH was requested; empty otherwise.
   *
   * Load-bearing for provenance: the manifest records one outcome per PLANNED query,
   * and batching must not collapse that into a single aggregate row. An unresolvable
   * target has to stay attributable to itself rather than tainting its companions.
   */
  readonly perTarget: readonly PerTargetOutcome[];
}

interface RawRow {
  permalink?: unknown;
  title?: unknown;
  file_path?: unknown;
  direction?: unknown;
  evidence?: unknown;
  matched?: unknown;
}

function stringOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberOf(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toRow(raw: RawRow): CompleteRetrievalRow {
  return {
    permalink: stringOf(raw.permalink),
    title: stringOf(raw.title),
    filePath: stringOf(raw.file_path),
    direction: stringOf(raw.direction),
    evidence: stringOf(raw.evidence),
    matched: Array.isArray(raw.matched) ? raw.matched.map(stringOf).filter((m) => m !== "") : [],
  };
}

function toPerTarget(raw: unknown): PerTargetOutcome[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const row = entry as { target?: unknown; total?: unknown; completeness?: unknown };
    const claim =
      typeof row.completeness === "object" && row.completeness !== null
        ? (row.completeness as { provable?: unknown; reason?: unknown })
        : {};
    return {
      target: stringOf(row.target),
      total: numberOf(row.total),
      provable: claim.provable === true,
      reason: stringOf(claim.reason),
    };
  });
}

/**
 * Unwrap the MCP envelope and read the completeness contract out of the payload.
 *
 * Both layers are checked explicitly. The failure this guards against is not a
 * crash but a silent one: the envelope parses fine on its own and yields an object
 * with no `results`, which a lenient reader reports as an empty result set.
 */
function parsePayload(stdout: string): CompleteRetrievalResponse {
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
  const payload = inner as {
    results?: unknown;
    total?: unknown;
    completeness?: unknown;
    scope?: unknown;
    project?: unknown;
    resolved_permalink?: unknown;
    dangling_outbound_edges?: unknown;
    per_target?: unknown;
  };
  if (!Array.isArray(payload.results)) {
    throw unavailable("payload carried no results array", text.slice(0, 400));
  }
  const completeness = payload.completeness;
  const claim =
    typeof completeness === "object" && completeness !== null
      ? (completeness as { provable?: unknown; reason?: unknown })
      : {};
  return {
    rows: (payload.results as RawRow[]).map(toRow),
    total: numberOf(payload.total),
    project: stringOf(payload.project),
    // Strict. `provable === true` or nothing: an absent completeness block, a
    // non-boolean, and an explicit false are all "not proved", and collapsing any of
    // them into a claim of completeness is the one error with no recovery — the
    // worklist looks finished and the missing references are never looked for.
    provable: claim.provable === true,
    reason: stringOf(claim.reason),
    scope: stringOf(payload.scope),
    resolvedPermalink: stringOf(payload.resolved_permalink),
    danglingOutboundEdges: numberOf(payload.dangling_outbound_edges),
    perTarget: toPerTarget(payload.per_target),
  };
}

/**
 * Run one complete-retrieval query.
 *
 * Arguments go to `Bun.spawn` as an argv array, so the shell never sees them and
 * the CLI's own documented quoting rule for hyphenated identifiers does not apply.
 * That rule exists because a shell tokenizer splits on hyphens; there is no shell
 * in this path, and adding quotes here would make them part of the literal being
 * searched for.
 */
async function run(
  args: readonly string[],
  runner: SearchRunner,
): Promise<CompleteRetrievalResponse> {
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
  return parsePayload(result.stdout);
}

/**
 * Build the argv for a `--references` query. Exported so a caller can log what ran.
 *
 * An absent project OMITS the flag rather than passing an empty one, which hands
 * resolution to the CLI's own precedence chain. The project that answered comes back
 * in the response echo, so omitting the flag never means not knowing.
 */
export function buildReferencesArgs(
  target: string | readonly string[],
  project?: string,
): string[] {
  // Several targets go as ONE comma-separated flag value, which the surface answers
  // in a single self-proving pass. The fixed cost of proving the corpus current is
  // paid once per invocation, so batching is the difference between paying it N times
  // and paying it once.
  const targets = typeof target === "string" ? [target] : target;
  const args = ["search", "--references", targets.join(",")];
  if (project !== undefined && project.length > 0) args.push("--project", project);
  args.push("--json");
  return args;
}

/** Build the argv for an `--exhaustive` query. Exported so a caller can log what ran. */
export function buildExhaustiveArgs(query: string | readonly string[], project?: string): string[] {
  // Extra literals are additional POSITIONAL arguments, not a comma-joined string:
  // a literal can be a note title and titles contain commas, so splitting on them
  // would silently fracture a query.
  const literals = typeof query === "string" ? [query] : query;
  const args = ["search", ...literals, "--exhaustive"];
  if (project !== undefined && project.length > 0) args.push("--project", project);
  args.push("--json");
  return args;
}

/**
 * Every note holding a wikilink edge to `target`, in both directions.
 *
 * The target may be a permalink, a full title, or a bare entity ID. An unresolvable
 * target is NOT an error: it returns an empty set with `provable: false` and a
 * reason, which the caller must read rather than treat as "no references".
 */
export async function searchReferences(
  target: string | readonly string[],
  project?: string,
  runner: SearchRunner = defaultSearchRunner(),
): Promise<CompleteRetrievalResponse> {
  return await run(buildReferencesArgs(target, project), runner);
}

/** Every note whose full content contains `query` as a literal, case-insensitively. */
export async function searchExhaustive(
  query: string | readonly string[],
  project?: string,
  runner: SearchRunner = defaultSearchRunner(),
): Promise<CompleteRetrievalResponse> {
  return await run(buildExhaustiveArgs(query, project), runner);
}
