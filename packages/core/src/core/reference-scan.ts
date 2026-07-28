/**
 * Inbound-reference impact scanning over a docs tree.
 *
 * Given one or more TARGET notes, enumerate every reference to them that lives
 * somewhere else in the tree. Decompose and recompose guarantee the content of
 * the notes they touch; this module supplies the other half — which notes now
 * point at something that moved, renumbered, or no longer exists.
 *
 * Three legs feed the manifest. Two are computed here and are deterministic:
 * the TEXT leg (this module) scans prose for wikilinks, permalinks, entity IDs
 * and section citations; the GRAPH leg (`reference-graph.ts`) traverses
 * Relations sections under the bi-directional rule and reports one-way edges.
 * The third, SEARCH, covers what neither can reach — descriptive prose naming a
 * note without any identifier, and recall from the index itself. It needs a
 * search tool this library does not call, so it arrives as externally-supplied
 * advisory entries, tagged with the mode that produced them, and never gates
 * closure.
 *
 * Targets are excluded from their own TEXT scan — a note citing itself is not an
 * inbound reference — but their Relations are still read, because a target's own
 * Relations section is the formal index of what points at it.
 */

// node:path only — Bun exposes no native path API (ADR-001 F-6 exception).
// All file I/O is Bun-native: Bun.Glob to enumerate, Bun.file to read.
import { resolve } from "node:path";
import { sectionizeH2 } from "@acmelabs/models/parsers/ast-helpers";
import type { RootContent } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { type ParsedRelation, parseRelationEntries } from "../../../models/src/relations.js";
import { PlanValidationError } from "../schemas/plan-yaml.js";
import {
  type ClassCounts,
  type ImpactManifest,
  REFERENCE_CLASSES,
  type ReferenceFinding,
  type ResolvedTarget,
  type SearchReferenceFinding,
} from "../schemas/reference-manifest.js";
import type { SearchRunner } from "./brain-cli.js";
import {
  type NoteFileSystem,
  type NoteIdentity,
  defaultNoteFileSystem,
  entityIdOfTitle,
  locateNote,
  readFrontmatter,
  stringField,
} from "./note-identity.js";
import { discoverCandidates } from "./reference-funnel.js";
import { applyGraphLeg } from "./reference-graph.js";
import { matchLine } from "./reference-matchers.js";

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ["yaml"]);

/**
 * Caller-declared target. Aliases are supplied, never inferred.
 *
 * The optional fields spell out `| undefined` so a Zod-parsed `--targets` file,
 * whose inferred type carries explicit `undefined`, is assignable under
 * `exactOptionalPropertyTypes`.
 */
export interface TargetSpec {
  /** Absolute, or relative to the docs root. */
  path: string;
  /** Retired titles, e.g. from a pre-split or pre-rename identity. */
  aliasTitles?: readonly string[] | undefined;
  /** Retired permalinks — the class that silently 404s after a renumber. */
  aliasPermalinks?: readonly string[] | undefined;
  /** Retired entity IDs, e.g. from a renumbering map. */
  aliasEntityIds?: readonly string[] | undefined;
}

/**
 * Identity and graph edges of one note, read once during the scan pass. Extends
 * the shared identity shape so a `NoteIndex` can resolve references over these
 * records exactly as it does over the correction and figure passes' records.
 */
export interface NoteRecord extends NoteIdentity {
  relations: ParsedRelation[];
  /** 1-indexed line span of the `## Relations` section body, if present. */
  relationsRange: { start: number; end: number } | null;
}

export interface ScanOptions {
  docsRoot: string;
  targets: readonly TargetSpec[];
  fileSystem?: NoteFileSystem;
  /**
   * Externally-supplied advisory entries (semantic search, index staleness).
   *
   * Typed to the SEARCH branch rather than the whole union: an entry that cannot state
   * how it was found has no provenance to carry forward, and the schema refuses it at
   * the boundary rather than here.
   */
  merge?: readonly SearchReferenceFinding[];
  /**
   * Brain project to run stage-one funnel discovery against. Optional: when absent
   * the CLI resolves one from environment or working directory, and the project that
   * answered is recorded on the manifest.
   */
  project?: string | undefined;
  /** Subprocess seam for the funnel's CLI calls, injected in tests. */
  runner?: SearchRunner | undefined;
  /** Injected so a manifest can be byte-compared in tests. */
  now?: string;
}

function sectionLineRange(children: readonly RootContent[]): { start: number; end: number } | null {
  const start = children[0]?.position?.start.line;
  const end = children[children.length - 1]?.position?.end.line;
  return start === undefined || end === undefined ? null : { start, end };
}

const RELATIONS_HEADING = /^##[ \t]*Relations[ \t]*$/;
const FENCE = /^[ \t]{0,3}(```|~~~)/;
const H2 = /^##[ \t]/;

/**
 * Byte range of the `## Relations` section, found by line scan rather than by
 * parsing the document.
 *
 * The whole document used to be parsed to reach one section. Measured on the fond
 * graph, that cost 1850ms across 69 notes while the Relations sections together are
 * 34KB of 3.5MB — 1% of the content for 100% of the parse. Slicing first and parsing
 * only the slice does the same work in 39ms.
 *
 * Two hazards are handled, and anything else falls back to the full parse rather
 * than being guessed at:
 *
 *   fenced blocks   a docs repo ABOUT knowledge graphs contains `## Relations`
 *                   inside example fences. Delimiters before the candidate are
 *                   counted; an odd count means the line is inside a fence and is
 *                   not a heading at all.
 *   duplicates      `sectionizeByDepth` builds a Map, so a later heading overwrites
 *                   an earlier one. The LAST valid candidate is taken to match.
 *
 * Returns null when no ATX candidate survives — including the setext form, which
 * this cannot see — and the caller then parses the whole document as before. The
 * fallback is what makes this an optimisation rather than a behaviour change.
 */
function sliceRelations(content: string): { text: string; offset: number } | null {
  const lines = content.split("\n");
  let fences = 0;
  let found = -1;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";
    if (FENCE.test(line)) {
      fences++;
      continue;
    }
    if (fences % 2 === 0 && RELATIONS_HEADING.test(line)) found = index;
  }
  if (found < 0) return null;
  let end = lines.length;
  for (let index = found + 1; index < lines.length; index++) {
    if (H2.test(lines[index] ?? "")) {
      end = index;
      break;
    }
  }
  return { text: lines.slice(found, end).join("\n"), offset: found };
}

/** Parse the `## Relations` section, handling flat and H3-grouped forms alike. */
function readRelations(content: string): {
  relations: ParsedRelation[];
  relationsRange: { start: number; end: number } | null;
} {
  const slice = sliceRelations(content);
  let children: RootContent[] | undefined;
  try {
    children = sectionizeH2(processor.parse(slice?.text ?? content)).get("Relations");
  } catch {
    // A note that will not parse still contributes its TEXT findings; losing its
    // graph edges is strictly better than losing the whole file from the scan.
    return { relations: [], relationsRange: null };
  }
  if (!children) return { relations: [], relationsRange: null };
  // Positions inside a slice are relative to it. The heading sits on slice line 1
  // and on absolute line `offset + 1`, so absolute = offset + relative.
  const offset = slice?.offset ?? 0;
  const range = sectionLineRange(children);
  return {
    relations: parseRelationEntries(children).map((relation) =>
      relation.line === null ? relation : { ...relation, line: relation.line + offset },
    ),
    relationsRange:
      range === null ? null : { start: range.start + offset, end: range.end + offset },
  };
}

function noteRecord(path: string, content: string): NoteRecord {
  const frontmatter = readFrontmatter(content);
  const title = stringField(frontmatter, "title");
  const { relations, relationsRange } = readRelations(content);
  return {
    path,
    title,
    entityId: entityIdOfTitle(title),
    permalink: stringField(frontmatter, "permalink"),
    relations,
    relationsRange,
  };
}

export async function resolveTargets(
  docsRoot: string,
  specs: readonly TargetSpec[],
  fileSystem: NoteFileSystem = defaultNoteFileSystem,
): Promise<ResolvedTarget[]> {
  if (specs.length === 0) {
    throw new PlanValidationError("no targets supplied; a scan with no target has no meaning", [
      { path: "targets", message: "at least one target is required" },
    ]);
  }
  const resolved: ResolvedTarget[] = [];
  for (const spec of specs) {
    const { abs, rel } = locateNote(docsRoot, spec.path);
    if (!(await fileSystem.exists(abs))) {
      throw new PlanValidationError(`target note not found: ${abs}`, [
        { path: spec.path, message: "file does not exist" },
      ]);
    }
    const frontmatter = readFrontmatter(await fileSystem.read(abs));
    const title = stringField(frontmatter, "title");
    if (title.length === 0) {
      throw new PlanValidationError(`target note has no frontmatter title: ${rel}`, [
        { path: spec.path, message: "frontmatter 'title' is required to derive the entity ID" },
      ]);
    }
    resolved.push({
      path: rel,
      entityId: entityIdOfTitle(title),
      title,
      permalink: stringField(frontmatter, "permalink"),
      aliasTitles: [...(spec.aliasTitles ?? [])],
      aliasPermalinks: [...(spec.aliasPermalinks ?? [])],
      aliasEntityIds: [...(spec.aliasEntityIds ?? [])],
    });
  }
  return resolved;
}

function emptyCounts(): ClassCounts {
  return Object.fromEntries(REFERENCE_CLASSES.map((cls) => [cls, 0])) as ClassCounts;
}

/** Deterministic order, independent of filesystem enumeration order. */
function compareFindings(a: ReferenceFinding, b: ReferenceFinding): number {
  return (
    a.referencingFile.localeCompare(b.referencingFile) ||
    a.line - b.line ||
    a.column - b.column ||
    a.class.localeCompare(b.class) ||
    a.target.localeCompare(b.target) ||
    a.matchedText.localeCompare(b.matchedText)
  );
}

export function summarize(
  findings: readonly ReferenceFinding[],
  targets: readonly ResolvedTarget[],
): ImpactManifest["summary"] {
  const byClass = emptyCounts();
  const byTarget: ImpactManifest["summary"]["byTarget"] = {};
  for (const target of targets) {
    byTarget[target.entityId] = { total: 0, byClass: emptyCounts() };
  }
  const bySource = { TEXT: 0, GRAPH: 0, BOTH: 0, SEARCH: 0 };
  for (const finding of findings) {
    byClass[finding.class] += 1;
    bySource[finding.source] += 1;
    const entry = byTarget[finding.target] ?? { total: 0, byClass: emptyCounts() };
    entry.total += 1;
    entry.byClass[finding.class] += 1;
    byTarget[finding.target] = entry;
  }
  return { totalFindings: findings.length, byClass, byTarget, bySource };
}

/**
 * Stage two: read the candidate notes stage one selected.
 *
 * Every note contributes its identity and graph edges; every NON-target note also
 * contributes its text matches. The scope is always supplied — there is no tree
 * enumeration here and no branch that reintroduces one.
 */
async function scanScope(
  targets: readonly ResolvedTarget[],
  scope: readonly string[],
  options: Pick<ScanOptions, "docsRoot" | "fileSystem">,
): Promise<{
  textFindings: ReferenceFinding[];
  notes: Map<string, NoteRecord>;
  filesScanned: number;
}> {
  const fileSystem = options.fileSystem ?? defaultNoteFileSystem;
  const root = resolve(options.docsRoot);
  // Entity ID a note answers to, for the notes that are themselves targets. This
  // is the exclusion key — see below for why it is not the file path.
  const ownEntityId = new Map(targets.map((target) => [target.path, target.entityId]));
  const paths = [...scope].sort();

  const notes = new Map<string, NoteRecord>();
  const textFindings: ReferenceFinding[] = [];
  let filesScanned = 0;

  for (const rel of paths) {
    const content = await fileSystem.read(resolve(root, rel));
    notes.set(rel, noteRecord(rel, content));
    filesScanned++;
    // Self-citation is suppressed PER CANDIDATE, not per file.
    //
    // The intent has always been "a note citing itself is not an inbound
    // reference". Keying that on the file and skipping the whole file overshoots
    // whenever more than one target is scanned at once: a target note that cites a
    // DIFFERENT target was never scanned at all, so those references went
    // unreported. Measured on the fond graph at a 28-target batch, that dropped 326
    // cross-target occurrences across 27 of the 28 targets — silently, because
    // closure diffs against the same manifest and so cannot report what the scan
    // never produced. The exposure grows with batch width and is zero for a
    // single-target repoint, which is why it survived this long.
    //
    // Filtering by candidate keeps the suppression exact: a note's own frontmatter
    // title and permalink lines, and any prose restating its own ID, still produce
    // nothing. Newly surfaced findings inside a target's own `## Relations` section
    // are promoted to BOTH by the graph leg like any other corroborated edge.
    const own = ownEntityId.get(rel);
    const lines = content.split("\n");
    for (let index = 0; index < lines.length; index++) {
      for (const finding of matchLine(lines[index] ?? "", targets, rel, index + 1)) {
        if (finding.target === own) continue;
        textFindings.push(finding);
      }
    }
  }
  return { textFindings, notes, filesScanned };
}

/**
 * The full deterministic finding set — TEXT plus GRAPH — in deterministic order.
 * This is what closure gates on; advisory entries are never part of it.
 */
export async function scanReferences(
  targets: readonly ResolvedTarget[],
  scope: readonly string[],
  options: Pick<ScanOptions, "docsRoot" | "fileSystem">,
): Promise<{ findings: ReferenceFinding[]; filesScanned: number }> {
  const { textFindings, notes, filesScanned } = await scanScope(targets, scope, options);
  const findings = applyGraphLeg({ targets, notes, textFindings }).sort(compareFindings);
  return { findings, filesScanned };
}

/**
 * Resolve targets, run stage one, scan the resulting scope, assemble the manifest.
 *
 * There is ONE discovery mechanism: the funnel. `project` is required because a scan
 * cannot be performed without asking the index which notes are implicated — the
 * tree-walking alternative was removed rather than retained as a fallback, so that
 * no run can silently take a different path to a different answer.
 */
export async function buildImpactManifest(options: ScanOptions): Promise<ImpactManifest> {
  const fileSystem = options.fileSystem ?? defaultNoteFileSystem;
  const docsRoot = resolve(options.docsRoot);
  const targets = await resolveTargets(docsRoot, options.targets, fileSystem);

  // A SearchUnavailableError here propagates: an outage must fail the run rather
  // than degrade to an empty candidate set that reads as "nothing references these".
  const funnel = await discoverCandidates(targets, {
    docsRoot,
    fileSystem,
    ...(options.project === undefined ? {} : { project: options.project }),
    ...(options.runner === undefined ? {} : { runner: options.runner }),
  });

  const { findings, filesScanned } = await scanReferences(targets, funnel.candidates, {
    docsRoot,
    fileSystem,
  });

  // Externally-supplied entries are forced advisory whatever the file claims, so
  // no outside input can promote itself into the closure gate. The declared
  // `mode` is preserved — it is the caller's record of HOW the entry was found,
  // and the entry is already pinned out of the gate without touching it.
  const advisory = (options.merge ?? []).map((finding) => ({
    ...finding,
    source: "SEARCH" as const,
    // `as const` matters: a widened `boolean` no longer satisfies the SEARCH branch's
    // literal `true`, which is the schema stating that an advisory entry cannot be
    // anything else.
    advisory: true as const,
  }));
  const all = [...findings, ...advisory].sort(compareFindings);

  return {
    docsRoot,
    generatedAt: options.now ?? new Date().toISOString(),
    filesScanned,
    discovery: {
      // The project that ANSWERED, recorded so a later closure check re-runs against
      // the same graph without the caller having to remember which one it was.
      project: funnel.project,
      projectSource: funnel.projectSource,
      provable: funnel.provable,
      notesConsidered: filesScanned,
      // Per-query WALL-CLOCK is deliberately dropped here. Two scans of an unchanged
      // graph must produce byte-identical manifests — that is what makes a manifest
      // diffable, and it is pinned by a determinism test. Timing is a property of the
      // run, not of the graph, so it is reported by the caller (which times the call)
      // rather than baked into the artefact.
      queries: funnel.queries.map(({ elapsedMs: _elapsedMs, ...record }) => record),
      missingOnDisk: [...funnel.missingOnDisk],
      nonNoteCandidates: [...funnel.nonNoteCandidates],
      projectMismatchSuspected: funnel.projectMismatchSuspected,
    },
    targets,
    findings: all,
    summary: summarize(all, targets),
  };
}
