/**
 * Stage one of the two-stage funnel: which notes could possibly reference a target.
 *
 * The scanner used to answer that by walking the whole docs tree and running every
 * matcher over every line of every file. The complete-retrieval surface answers it
 * as a query instead — and, unlike the ranked search that preceded it, does so with
 * a completeness contract rather than a relevance ordering. This module turns a set
 * of targets into the CANDIDATE SET; stage two opens only those notes and finds the
 * exact `line:column` of each reference inside them.
 *
 * The split is the point. Search says WHICH NOTES are implicated and can prove the
 * set is whole; no field in any search response carries a line or a column, so
 * search can never say WHERE. Reading the candidate files is what produces the
 * addresses the repoint executor edits by. Neither half is sufficient alone.
 *
 * ## Why two legs, and why both are required
 *
 * The two arguments partition the reference space, and each is blind to the other's
 * half:
 *
 *   --references   wikilink EDGES. Unaffected by content-column truncation because
 *                  it reads the relation graph, not note text.
 *   --exhaustive   BARE TEXT containment against the full content column. Catches
 *                  permalink strings, section citations and prose identifier
 *                  mentions — including any past the 6000-character offset where
 *                  ranked keyword search silently stops seeing them.
 *
 * ## The alias fold
 *
 * A target's CURRENT identity forms all embed its entity ID by construction: the
 * canonical title is `{ENTITY-ID}: {Descriptor}` and the permalink is
 * `{folder}/{entity-id-kebab}-{descriptor}`. Since `--exhaustive` matches
 * case-insensitive literal substrings, one query on the entity ID therefore already
 * returns every note carrying the wikilink, the permalink, the project-prefixed
 * permalink, a section citation, or a bare mention. Querying the current title and
 * permalink separately would add cost and no recall — so they are planned ONLY on
 * the defensive branch where a note violates the convention and its title or
 * permalink does not in fact contain its entity ID.
 *
 * RETIRED identities are the exception, and the reason this module takes aliases at
 * all. An alias does not contain the current entity ID — that is what makes it an
 * alias — so it is unreachable from any query on the current identity. Measured on
 * the live fond graph: `ANALYSIS-034` references `ANALYSIS-033` ONLY through the
 * retired permalink `analysis/analysis-028-independent-pass-reconciliation`, with
 * zero literal `ANALYSIS-033` occurrences anywhere in the file. The entity-ID query
 * returns 16 notes and `ANALYSIS-034` is not among them; the alias-permalink query
 * returns it. Without the alias fold that reference is invisible to stage one and
 * therefore invisible to the whole funnel, however complete each individual query
 * proves itself to be.
 */

// node:path only — Bun exposes no native path API (ADR-001 F-6 exception).
import { resolve } from "node:path";
import type { ResolvedTarget } from "../schemas/reference-manifest.js";
import { type SearchRunner, searchExhaustive, searchReferences, unavailable } from "./brain-cli.js";
import { type NoteFileSystem, defaultNoteFileSystem } from "./note-identity.js";

export type FunnelLeg = "references" | "exhaustive";

/** One planned query, before it has been run. */
export interface FunnelQuery {
  /** Entity ID of the target this query serves. */
  readonly target: string;
  readonly leg: FunnelLeg;
  readonly query: string;
  /** True when the query literal is a RETIRED identity rather than the current one. */
  readonly viaAlias: boolean;
}

/** A planned query plus what running it produced — the per-query honesty record. */
export interface FunnelQueryOutcome extends FunnelQuery {
  readonly total: number;
  /** The surface proved this individual set complete AND stated its scope. */
  readonly provable: boolean;
  /** Why not, when the surface said, or this module's own reason. */
  readonly reason: string;
  readonly scope: string;
  /** Rows that carried a usable file path. */
  readonly notes: number;
  /** Wall-clock for this one round trip, so a slow leg is attributable. */
  readonly elapsedMs: number;
}

export interface FunnelResult {
  /** Docs-root-relative paths, sorted. The stage-two scope. */
  readonly candidates: readonly string[];
  readonly queries: readonly FunnelQueryOutcome[];
  /**
   * The AND over every query. False the moment ANY query could not prove its own
   * completeness — one unproven leg makes the union unproven, whatever the others said.
   */
  readonly provable: boolean;
  /** The project that answered every query. */
  readonly project: string;
  /** Whether the caller named that project or the CLI resolved it. */
  readonly projectSource: "caller" | "cli";
  /** Paths the surface returned that are not on disk. Reported, never silently dropped. */
  readonly missingOnDisk: readonly string[];
  /**
   * True when the queries returned notes but essentially none of them exist under
   * this docs root — the structural signature of having searched the WRONG GRAPH.
   * A resolved-by-cwd project pointing at a different repo answers fluently and
   * provably; only disk correspondence catches it.
   */
  readonly projectMismatchSuspected: boolean;
  /** Wall-clock for the whole of stage one, so a regression is visible. */
  readonly elapsedMs: number;
  /**
   * Indexed files that are not notes. Reported rather than dropped silently, because
   * they are real containment hits and a reader comparing counts is owed the reason.
   */
  readonly nonNoteCandidates: readonly string[];
}

export interface FunnelOptions {
  /**
   * Brain project to query. OPTIONAL — when omitted the `--project` flag is left
   * off and the CLI resolves one itself (BM_PROJECT, BM_ACTIVE_PROJECT,
   * BRAIN_PROJECT, then a cwd match against configured code paths). The project
   * that actually answered is read back off the response and reported, so omitting
   * it never means not knowing which graph produced the worklist.
   */
  readonly project?: string | undefined;
  readonly docsRoot: string;
  readonly runner?: SearchRunner | undefined;
  readonly fileSystem?: NoteFileSystem | undefined;
  /**
   * Extra paths to fold into the candidate set regardless of what the queries
   * returned. Closure supplies the prior manifest's own files here: those are the
   * worklist being verified, and a reference that was repaired must still be
   * re-examined at its original address even though the index no longer points
   * there. Without it, a repaired file could drop out of scope and its regression
   * would be invisible.
   */
  readonly alwaysInclude?: readonly string[] | undefined;
}

function containsFold(haystack: string, needle: string): boolean {
  return needle.length > 0 && haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Drop any exhaustive query whose literal CONTAINS another planned exhaustive
 * literal.
 *
 * Provably safe under literal-substring semantics: if query B contains query A,
 * then every note containing B also contains A, so `exhaustive(A)` returns a
 * superset of `exhaustive(B)` and running B adds nothing. Concretely, when a caller
 * declares both the alias entity ID `ANALYSIS-028` and the alias title
 * `ANALYSIS-028: Independent Pass Reconciliation`, only the entity ID is run.
 *
 * Shorter literals are considered first so the surviving set is the minimal one.
 * The references leg is never subsumed — it queries a different index and its
 * result set is not a text-containment superset of anything.
 */
function dropSubsumed(queries: readonly FunnelQuery[]): FunnelQuery[] {
  const kept: FunnelQuery[] = [];
  const ordered = queries
    .filter((entry) => entry.leg === "exhaustive")
    .sort((a, b) => a.query.length - b.query.length || a.query.localeCompare(b.query));
  for (const candidate of ordered) {
    if (kept.some((k) => containsFold(candidate.query, k.query))) continue;
    kept.push(candidate);
  }
  return [...queries.filter((entry) => entry.leg === "references"), ...kept];
}

/**
 * The query set for one target: the two legs on its current identity, plus one
 * exhaustive query per declared retired identity.
 *
 * No `--references` query is planned for an alias. That leg resolves its target
 * through the canonical `{ENTITY-ID}: {Descriptor}` title form, which a retired
 * permalink no longer answers to — it would return an unresolved empty set and mark
 * the whole funnel unproven for a query that had nothing to add. The alias's
 * wikilink edges are already reachable: a `[[Retired Title]]` edge is literal text
 * in the referencing note, so the alias exhaustive query returns it.
 */
export function planQueries(target: ResolvedTarget): FunnelQuery[] {
  const queries: FunnelQuery[] = [
    { target: target.entityId, leg: "references", query: target.entityId, viaAlias: false },
    { target: target.entityId, leg: "exhaustive", query: target.entityId, viaAlias: false },
  ];
  const push = (query: string, viaAlias: boolean): void => {
    if (query.trim().length === 0) return;
    queries.push({ target: target.entityId, leg: "exhaustive", query, viaAlias });
  };
  // Defensive branch only: a convention-following title and permalink both embed the
  // entity ID, so the query above already covers them. These fire when one does not.
  if (!containsFold(target.title, target.entityId)) push(target.title, false);
  if (!containsFold(target.permalink, target.entityId)) push(target.permalink, false);
  for (const alias of target.aliasEntityIds) push(alias, true);
  for (const alias of target.aliasTitles) push(alias, true);
  for (const alias of target.aliasPermalinks) push(alias, true);
  return dropSubsumed(queries);
}

async function runQuery(
  query: FunnelQuery,
  options: FunnelOptions,
): Promise<{ outcome: FunnelQueryOutcome; paths: string[]; project: string }> {
  const response =
    query.leg === "references"
      ? await searchReferences(query.query, options.project, options.runner)
      : await searchExhaustive(query.query, options.project, options.runner);
  // A leg that will not state WHAT it covered cannot be trusted to have covered it,
  // so an absent scope demotes the query exactly as an absent completeness block
  // does. The two fields are the whole honesty surface and both are required.
  const scoped = response.scope.length > 0;
  const provable = response.provable && scoped;
  const reason = provable
    ? ""
    : response.reason.length > 0
      ? response.reason
      : scoped
        ? "the surface did not state completeness as provable"
        : "the surface stated no scope for this leg";
  const paths = response.rows.map((row) => row.filePath).filter((path) => path.length > 0);
  return {
    outcome: {
      ...query,
      total: response.total,
      provable,
      reason,
      scope: response.scope,
      notes: paths.length,
      elapsedMs: 0,
    },
    paths,
    project: response.project,
  };
}

/**
 * QUERIES RUN SEQUENTIALLY, and that is a decision rather than an oversight.
 *
 * A bounded concurrent pool was built and measured, and rejected on two independent
 * grounds:
 *
 * **Parity.** The CLI and the MCP tool are two surfaces over one server, held to a
 * what-one-can-do-the-other-can contract. Nothing would drive the MCP search tool
 * from a concurrent pool, so leaning on CLI-side parallelism would buy speed by
 * exploiting an asymmetry the surfaces are explicitly designed not to have.
 *
 * **It did not work.** Measured against the live graph, a pool of 4 produced CLI
 * exits of 143 — SIGTERM, this module's own 60-second timeout firing — where the
 * same 58 queries run sequentially complete in about 9.7 seconds total. Concurrent
 * invocations do not merely fail to help; they hang. Both surfaces sit on one server
 * over one SQLite store, where concurrent access has known contention behaviour, so
 * this is treated as a property of the substrate rather than something to retry
 * around.
 *
 * The remaining cost is per-invocation overhead — roughly 167ms of process spawn and
 * round trip, times the query count. Lowering it means fewer invocations, not
 * faster-overlapping ones, and the large win (one batched invocation carrying many
 * targets) is a change to the brain CLI and MCP surfaces together, which keeps parity
 * precisely because both would grow the same argument. That is recorded as a
 * follow-up rather than worked around here.
 */

/**
 * Run stage one over every target and return the candidate set.
 *
 * Failure is LOUD by construction: a `SearchUnavailableError` from either leg
 * propagates out of this function untouched. It is deliberately not caught, because
 * the alternative — an empty candidate set — is indistinguishable from "nothing
 * references these targets" and would hand the caller a clean bill of health
 * produced by an outage. An unreachable search must fail the run.
 *
 * A search that RAN but could not prove itself complete is a different fact and is
 * reported rather than thrown: `provable` goes false, every unproven query keeps its
 * reason, and the caller decides what a non-provable worklist is worth.
 */
export async function discoverCandidates(
  targets: readonly ResolvedTarget[],
  options: FunnelOptions,
): Promise<FunnelResult> {
  const fileSystem = options.fileSystem ?? defaultNoteFileSystem;
  const docsRoot = resolve(options.docsRoot);
  const discovered = new Set<string>();
  // Query-derived paths are tracked apart from the unconditional additions below,
  // because only these carry a claim about the graph — the targets exist on disk by
  // construction and would dilute the mismatch signal to nothing.
  const fromQueries = new Set<string>();
  const projectsSeen = new Set<string>();

  const planned = targets.flatMap((target) => planQueries(target));
  const started = Bun.nanoseconds();
  const queries: FunnelQueryOutcome[] = [];
  for (const query of planned) {
    const at = Bun.nanoseconds();
    const { outcome, paths, project } = await runQuery(query, options);
    // Per-query timing is recorded so a slow leg is attributable without a rerun,
    // and so the next pass has a baseline rather than an impression.
    queries.push({ ...outcome, elapsedMs: Math.round((Bun.nanoseconds() - at) / 1e6) });
    if (project.length > 0) projectsSeen.add(project);
    for (const path of paths) {
      discovered.add(path);
      fromQueries.add(path);
    }
  }
  const elapsedMs = Math.round((Bun.nanoseconds() - started) / 1e6);

  // One scan, one graph. Two different projects answering inside a single run means
  // the environment shifted mid-scan — an env var changed, or the cwd moved — and
  // the union of two graphs' answers is not a worklist for either. Loud, because a
  // silently blended result set is unfixable downstream.
  if (projectsSeen.size > 1) {
    throw unavailable(
      "queries in one scan resolved to different projects",
      `saw ${[...projectsSeen].sort().join(", ")} — pass an explicit project, or stabilise the environment`,
    );
  }

  // Targets are always in scope regardless of what the queries returned. A target's
  // own `## Relations` section is the formal index of the notes that reference it,
  // so the graph leg reads it even when no query happened to name the target's file.
  for (const target of targets) discovered.add(target.path);
  for (const path of options.alwaysInclude ?? []) discovered.add(path);

  // A path the index knows but the disk does not is index staleness, and it is
  // surfaced rather than dropped: stage two cannot open it, and a caller comparing
  // counts is owed the reason its candidate set shrank.
  const candidates: string[] = [];
  const missingOnDisk: string[] = [];
  const nonNoteCandidates: string[] = [];
  for (const path of [...discovered].sort()) {
    // Non-markdown files are excluded, and the reason is closure correctness rather
    // than taste. The index covers everything in the project directory — measured on
    // fond, four `decompose-*.yaml` distribution plans contain target identifiers and
    // come back as containment hits. The census enumerates `**/*.md` ONLY, and the
    // census is what `--check` re-scans with. A finding recorded outside that class
    // could never be re-derived, so the very next closure check would report it
    // UPDATED — "no longer present" — - and count a reference nobody touched as
    // repaired. The two stages have to agree on what a note is.
    if (!path.toLowerCase().endsWith(".md")) {
      nonNoteCandidates.push(path);
      continue;
    }
    if (await fileSystem.exists(resolve(docsRoot, path))) candidates.push(path);
    else missingOnDisk.push(path);
  }

  // A wrong graph answers fluently: every query proves itself complete and returns
  // real notes, because those notes ARE real — just not here. Disk correspondence is
  // the structural detector, and the threshold is deliberately near-total rather than
  // a majority, so ordinary index staleness (a handful of moved notes) never trips it.
  const queryPaths = [...fromQueries].filter((path) => path.toLowerCase().endsWith(".md"));
  const absent = queryPaths.filter((path) => missingOnDisk.includes(path)).length;
  const projectMismatchSuspected = queryPaths.length > 0 && absent / queryPaths.length >= 0.9;

  return {
    candidates,
    queries,
    provable: queries.every((entry) => entry.provable),
    project: [...projectsSeen][0] ?? options.project ?? "",
    projectSource: options.project === undefined ? "cli" : "caller",
    missingOnDisk,
    nonNoteCandidates,
    projectMismatchSuspected,
    elapsedMs,
  };
}
