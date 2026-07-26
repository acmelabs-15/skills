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
import { isAbsolute, relative, resolve } from "node:path";
import yaml from "js-yaml";
import type { RootContent } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { sectionizeH2 } from "../parsers/ast-helpers.js";
import { PlanValidationError } from "../schemas/plan-yaml.js";
import {
  type ClassCounts,
  type ImpactManifest,
  REFERENCE_CLASSES,
  type ReferenceFinding,
  type ResolvedTarget,
} from "../schemas/reference-manifest.js";
import { applyGraphLeg } from "./reference-graph.js";
import { matchLine } from "./reference-matchers.js";
import {
  type NoteFileSystem,
  type NoteIdentity,
  defaultNoteFileSystem,
  entityIdOfTitle,
  locateNote,
  readFrontmatter,
  stringField,
} from "./note-identity.js";
import { type ParsedRelation, parseRelationEntries } from "./relations.js";

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
  /** Externally-supplied advisory entries (semantic search, index staleness). */
  merge?: readonly ReferenceFinding[];
  /** Injected so a manifest can be byte-compared in tests. */
  now?: string;
}

function sectionLineRange(children: readonly RootContent[]): { start: number; end: number } | null {
  const start = children[0]?.position?.start.line;
  const end = children[children.length - 1]?.position?.end.line;
  return start === undefined || end === undefined ? null : { start, end };
}

/** Parse the `## Relations` section, handling flat and H3-grouped forms alike. */
function readRelations(content: string): {
  relations: ParsedRelation[];
  relationsRange: { start: number; end: number } | null;
} {
  let children: RootContent[] | undefined;
  try {
    children = sectionizeH2(processor.parse(content)).get("Relations");
  } catch {
    // A note that will not parse still contributes its TEXT findings; losing its
    // graph edges is strictly better than losing the whole file from the scan.
    return { relations: [], relationsRange: null };
  }
  if (!children) return { relations: [], relationsRange: null };
  return { relations: parseRelationEntries(children), relationsRange: sectionLineRange(children) };
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
 * One pass over the tree: every note contributes its identity and graph edges;
 * every NON-target note also contributes its text matches.
 */
async function scanTree(
  targets: readonly ResolvedTarget[],
  options: Pick<ScanOptions, "docsRoot" | "fileSystem">,
): Promise<{
  textFindings: ReferenceFinding[];
  notes: Map<string, NoteRecord>;
  filesScanned: number;
}> {
  const fileSystem = options.fileSystem ?? defaultNoteFileSystem;
  const root = resolve(options.docsRoot);
  const excluded = new Set(targets.map((target) => target.path));

  const paths: string[] = [];
  for await (const rel of fileSystem.listMarkdown(root)) paths.push(rel);
  paths.sort();

  const notes = new Map<string, NoteRecord>();
  const textFindings: ReferenceFinding[] = [];
  let filesScanned = 0;

  for (const rel of paths) {
    const content = await fileSystem.read(resolve(root, rel));
    notes.set(rel, noteRecord(rel, content));
    if (excluded.has(rel)) continue;
    filesScanned++;
    const lines = content.split("\n");
    for (let index = 0; index < lines.length; index++) {
      textFindings.push(...matchLine(lines[index] ?? "", targets, rel, index + 1));
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
  options: Pick<ScanOptions, "docsRoot" | "fileSystem">,
): Promise<{ findings: ReferenceFinding[]; filesScanned: number }> {
  const { textFindings, notes, filesScanned } = await scanTree(targets, options);
  const findings = applyGraphLeg({ targets, notes, textFindings }).sort(compareFindings);
  return { findings, filesScanned };
}

/** Resolve targets, scan the tree, merge advisory entries, assemble the manifest. */
export async function buildImpactManifest(options: ScanOptions): Promise<ImpactManifest> {
  const fileSystem = options.fileSystem ?? defaultNoteFileSystem;
  const docsRoot = resolve(options.docsRoot);
  const targets = await resolveTargets(docsRoot, options.targets, fileSystem);
  const { findings, filesScanned } = await scanReferences(targets, { docsRoot, fileSystem });

  // Externally-supplied entries are forced advisory whatever the file claims, so
  // no outside input can promote itself into the closure gate. The declared
  // `mode` is preserved — it is the caller's record of HOW the entry was found,
  // and the entry is already pinned out of the gate without touching it.
  const advisory = (options.merge ?? []).map((finding) => ({
    ...finding,
    source: "SEARCH" as const,
    advisory: true,
  }));
  const all = [...findings, ...advisory].sort(compareFindings);

  return {
    docsRoot,
    generatedAt: options.now ?? new Date().toISOString(),
    filesScanned,
    targets,
    findings: all,
    summary: summarize(all, targets),
  };
}
