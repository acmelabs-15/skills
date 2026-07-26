/**
 * The CLI-backed SEARCH leg: inbound references the deterministic legs cannot see.
 *
 * Until now this leg existed only as externally-supplied entries — an agent ran
 * searches by hand and handed the scanner a JSON file. Post-parity the CLI exposes
 * the full filter set, so the script runs the queries itself. That is the step this
 * module mechanises.
 *
 * What it does NOT do is replace the text scan, and the reason is structural rather
 * than a matter of trust. The executor addresses every repair by `line:column` —
 * measured unique across all 497 findings on the real graph, where matched text
 * alone collides on 26 — and no field in any search response carries a line or a
 * column. A leg that cannot say WHERE in a file a reference sits cannot feed a
 * repair stage that edits by position. Search finds which NOTES are implicated;
 * reading the file is what finds the references inside them, and the file read is
 * also the only step that can prove it saw everything.
 *
 * So the division is: the deterministic legs own everything that gates closure or
 * gets written, and this leg widens the worklist with what they structurally cannot
 * reach — prose that names a note without naming its identifier, and notes the
 * index knows are related where the tree shows no textual link.
 *
 * Two precision rules keep the widening honest:
 *
 * **Never duplicate a deterministic finding.** A hit on a note the text scan
 * already matched adds nothing and would double-count that note's impact. Only
 * notes absent from the deterministic set produce entries.
 *
 * **Never invent an address.** An advisory entry feeds a work brief that tells an
 * agent which line to read. When the snippet cannot be located in the note body the
 * hit is DROPPED rather than emitted at line 1, because a confident wrong line
 * costs more than a missing suggestion.
 */

import type {
  ImpactManifest,
  ReferenceFinding,
  ResolvedTarget,
} from "../schemas/reference-manifest.js";
import {
  type SearchQuery,
  type SearchResponse,
  type SearchRunner,
  searchAll,
} from "./brain-cli.js";
import { type NoteFileSystem, defaultNoteFileSystem } from "./note-identity.js";
import { buildNoteIndex } from "./note-index.js";
import { summarize } from "./reference-scan.js";

export interface SearchLegOptions {
  /** Brain project to search. The leg is skipped entirely when absent. */
  project: string;
  /** Note contents keyed by docs-root-relative path, as the tree scan read them. */
  notes: ReadonlyMap<string, string>;
  /** Paths the deterministic legs already matched; hits on these are dropped. */
  covered: ReadonlySet<string>;
  /** Permalink to path, so a hit can be mapped back onto the tree. */
  pathByPermalink: ReadonlyMap<string, string>;
  runner?: SearchRunner | undefined;
  mode?: string | undefined;
  searchType?: string | undefined;
}

/** What the leg found, plus the provenance a caller needs to report honestly. */
export interface SearchLegResult {
  findings: ReferenceFinding[];
  /** One per query run, so an incomplete enumeration is visible per query. */
  queries: Array<{ description: string; exhausted: boolean; pages: number; hits: number }>;
  /** False when ANY query hit a page-limit boundary without a short page. */
  complete: boolean;
}

/**
 * First line of a snippet that can be found verbatim in the note body.
 *
 * Snippets are truncated and multi-line, so the first substantive line is the
 * longest reliably-quotable fragment. Returns null when nothing matches, which is
 * the signal to drop the hit rather than guess a position.
 */
export function locateSnippet(content: string, snippet: string): number | null {
  const candidates = snippet
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length >= 12)
    .sort((a, b) => b.length - a.length);
  const lines = content.split("\n");
  for (const candidate of candidates) {
    const index = lines.findIndex((line) => line.includes(candidate));
    if (index >= 0) return index + 1;
  }
  return null;
}

/**
 * Distinctive words from a target's title: long enough to be specific, with the
 * entity ID and generic structural words dropped.
 */
function distinctiveTerms(title: string): string[] {
  const generic = new Set([
    "analysis",
    "decision",
    "session",
    "requirement",
    "design",
    "task",
    "spec",
    "plan",
    "and",
    "the",
    "for",
    "with",
    "from",
    "into",
  ]);
  return title
    .replace(/^[A-Z]+-[\w-]*:?/, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 5 && !generic.has(word));
}

/**
 * Does the located line plausibly refer to the target at all?
 *
 * The precision gate, and it is load-bearing. Measured on the live fond graph, the
 * ungated probe produced 120 entries for three targets, almost all of them the
 * SAME note-opening prose line repeated once per target — because a semantic hit's
 * snippet is the note's opening, not the sentence that names the target. Those are
 * false positives with real addresses, which is the worst kind: they read as
 * findings and cost an agent a lookup each.
 *
 * Requiring the line to share a distinctive title word turns that into a small,
 * checkable set. A probe that reports nothing is a better outcome than one that
 * reports a hundred lines an agent has to dismiss individually.
 */
function mentionsTarget(lineText: string, target: ResolvedTarget): boolean {
  const terms = distinctiveTerms(target.title);
  if (terms.length === 0) return false;
  const haystack = lineText.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

/**
 * Column for an advisory entry: where on the located line the quoted fragment
 * begins, or 1 when only the line could be established. Recorded because the schema
 * requires it, and deliberately never used for a write — advisory entries are not
 * written from.
 */
function columnOf(line: string, snippet: string): number {
  for (const candidate of snippet.split("\n").map((part) => part.trim())) {
    if (candidate.length < 12) continue;
    const at = line.indexOf(candidate);
    if (at >= 0) return at + 1;
  }
  return 1;
}

function advisoryFinding(params: {
  path: string;
  line: number;
  column: number;
  matchedText: string;
  target: string;
  response: SearchResponse;
  /** The mode ASKED for. Not the response's echo of it — see below. */
  requestedMode: string;
  cls: ReferenceFinding["class"];
}): ReferenceFinding {
  const { response } = params;
  return {
    referencingFile: params.path,
    line: params.line,
    column: params.column,
    matchedText: params.matchedText,
    class: params.cls,
    target: params.target,
    viaAlias: false,
    source: "SEARCH",
    advisory: true,
    // The provenance triple, populated in-library now that the leg runs here. The
    // requested mode and the leg that served it routinely differ, which is exactly
    // why both are recorded rather than one standing in for the other.
    //
    // `mode` comes from the REQUEST, per its schema contract, not from the response's
    // echo of it. Reading the echo would make the field describe whatever the surface
    // chose to report back, which is the one thing `actualSource` already covers.
    ...(params.requestedMode.length > 0 ? { mode: modeOf(params.requestedMode) } : {}),
    ...(response.actualSource.length > 0
      ? { actualSource: actualSourceOf(response.actualSource) }
      : {}),
  };
}

/** Narrow the surface's free-form strings onto the manifest's closed enums. */
function modeOf(value: string): ReferenceFinding["mode"] {
  return value === "auto" || value === "semantic" || value === "keyword" || value === "hybrid"
    ? value
    : undefined;
}

function actualSourceOf(value: string): ReferenceFinding["actualSource"] {
  return value === "semantic" || value === "keyword" || value === "hybrid" ? value : undefined;
}

/**
 * Descriptive-reference probe for one target: notes the index associates with it
 * that the text scan never matched.
 *
 * The query is the target's TITLE rather than its identifier, deliberately. An
 * identifier query returns what the text scan already has; the title is what prose
 * paraphrases when it names a note without citing it.
 */
async function probeDescriptive(
  target: ResolvedTarget,
  options: SearchLegOptions,
): Promise<{ findings: ReferenceFinding[]; response: SearchResponse; description: string }> {
  const requestedMode = options.mode ?? "auto";
  const query: SearchQuery = {
    query: target.title,
    project: options.project,
    mode: requestedMode,
    ...(options.searchType === undefined ? {} : { searchType: options.searchType }),
    limit: 100,
  };
  const response = await searchAll(query, options.runner);
  const findings: ReferenceFinding[] = [];

  for (const hit of response.hits) {
    const path = options.pathByPermalink.get(hit.permalink);
    // A hit outside the tree, or on a note the deterministic legs already matched,
    // or on the target itself, contributes nothing.
    if (path === undefined || path === target.path || options.covered.has(path)) continue;
    const content = options.notes.get(path);
    if (content === undefined) continue;
    const line = locateSnippet(content, hit.snippet);
    if (line === null) continue;
    const lineText = content.split("\n")[line - 1] ?? "";
    // The precision gate: a located line that shares no distinctive word with the
    // target's title is a semantic neighbour, not a reference to it.
    if (!mentionsTarget(lineText, target)) continue;
    findings.push(
      advisoryFinding({
        path,
        line,
        column: columnOf(lineText, hit.snippet),
        // The document's own text at the located line, so the work brief quotes the
        // graph rather than the index's summary of it.
        matchedText: lineText.trim().slice(0, 200) || hit.title,
        target: target.entityId,
        response,
        requestedMode,
        cls: "entity-id",
      }),
    );
  }
  return { findings, response, description: `descriptive: "${target.title}"` };
}

/**
 * Relation-edge probe: does the index hold an edge touching this target that the
 * tree shows no textual link for?
 *
 * EXISTENCE ONLY. The verb arrives inside a synthetic edge permalink and an
 * `A -> B` title, and the index is known to strip verbs on H3-grouped notes and to
 * fabricate others — a live probe returned a verb named `x`. So a hit here says
 * "look at this pair", never "the edge is typed thus". Any verb-typed conclusion is
 * the GRAPH leg's, which parses note bodies.
 */
async function probeRelations(
  target: ResolvedTarget,
  options: SearchLegOptions,
): Promise<{ findings: ReferenceFinding[]; response: SearchResponse; description: string }> {
  // Fixed to keyword/text: an existence probe wants exact-identifier retrieval, not
  // whatever the caller chose for the descriptive probe.
  const requestedMode = "keyword";
  const query: SearchQuery = {
    query: target.entityId,
    project: options.project,
    entityTypes: ["relation"],
    mode: requestedMode,
    searchType: "text",
    limit: 100,
  };
  const response = await searchAll(query, options.runner);
  const findings: ReferenceFinding[] = [];
  const seenPairs = new Set<string>();

  for (const hit of response.hits) {
    // The edge permalink is `source/verb/target`; only the endpoints are trusted, so
    // the pair is keyed on the title's two sides and the verb is never read.
    const [left, right] = hit.title.split(" -> ");
    if (left === undefined || right === undefined) continue;
    const other = left.includes(target.entityId) ? right : left;
    const path = options.pathByPermalink.get(hit.permalink);
    if (path !== undefined) continue; // a real note path here means it is not an edge row
    const key = other.trim();
    if (key.length === 0 || seenPairs.has(key)) continue;
    seenPairs.add(key);
    findings.push(
      advisoryFinding({
        path: target.path,
        line: 1,
        column: 1,
        matchedText: `index holds an edge between ${target.entityId} and ${key} (verb not trusted)`,
        target: target.entityId,
        response,
        requestedMode,
        cls: "index-stale",
      }),
    );
  }
  return { findings, response, description: `relations: ${target.entityId}` };
}

/**
 * Run the advisory leg over every target.
 *
 * Every finding is forced advisory, so nothing here can gate closure or be written
 * from — the same guarantee the externally-supplied `--merge` path has always had,
 * now applied to entries this library produces itself.
 */
export async function runSearchLeg(
  targets: readonly ResolvedTarget[],
  options: SearchLegOptions,
): Promise<SearchLegResult> {
  const findings: ReferenceFinding[] = [];
  const queries: SearchLegResult["queries"] = [];

  for (const target of targets) {
    for (const probe of [probeDescriptive, probeRelations]) {
      const outcome = await probe(target, options);
      findings.push(...outcome.findings);
      queries.push({
        description: outcome.description,
        exhausted: outcome.response.exhausted,
        pages: outcome.response.pages,
        hits: outcome.response.hits.length,
      });
    }
  }
  return {
    findings,
    queries,
    // Reported, never assumed. An incomplete enumeration is a fact the caller has to
    // be able to see, because the alternative is a worklist that looks finished.
    complete: queries.every((entry) => entry.exhausted),
  };
}

export interface AugmentOptions {
  manifest: ImpactManifest;
  /** Brain project to search. */
  project: string;
  docsRoot?: string | undefined;
  fileSystem?: NoteFileSystem | undefined;
  runner?: SearchRunner | undefined;
  mode?: string | undefined;
  searchType?: string | undefined;
}

/**
 * Add the CLI-backed advisory leg to a manifest the deterministic legs produced.
 *
 * Deliberately an AUGMENTATION rather than a change to the scan itself. The
 * deterministic legs decide what gates closure and what gets written, and they are
 * the completeness arbiter because they enumerate the tree; leaving them exactly as
 * they are means a search outage, a routing change or an index defect can widen or
 * narrow the worklist but can never move the gate.
 *
 * `covered` is taken from the deterministic findings, so the leg only reports notes
 * they did not already reach.
 */
export async function augmentManifestWithSearch(
  options: AugmentOptions,
): Promise<{ manifest: ImpactManifest; leg: SearchLegResult }> {
  const fileSystem = options.fileSystem ?? defaultNoteFileSystem;
  const docsRoot = options.docsRoot ?? options.manifest.docsRoot;
  const index = await buildNoteIndex(docsRoot, fileSystem);
  const notes = new Map<string, string>();
  const pathByPermalink = new Map<string, string>();
  for (const note of index.all()) {
    notes.set(note.path, note.content);
    if (note.permalink.length > 0) pathByPermalink.set(note.permalink, note.path);
  }

  const leg = await runSearchLeg(options.manifest.targets, {
    project: options.project,
    notes,
    covered: new Set(options.manifest.findings.map((finding) => finding.referencingFile)),
    pathByPermalink,
    ...(options.runner === undefined ? {} : { runner: options.runner }),
    ...(options.mode === undefined ? {} : { mode: options.mode }),
    ...(options.searchType === undefined ? {} : { searchType: options.searchType }),
  });

  const all = [...options.manifest.findings, ...leg.findings].sort(
    (a, b) =>
      a.referencingFile.localeCompare(b.referencingFile) || a.line - b.line || a.column - b.column,
  );
  return {
    manifest: {
      ...options.manifest,
      findings: all,
      summary: summarize(all, options.manifest.targets),
    },
    leg,
  };
}
