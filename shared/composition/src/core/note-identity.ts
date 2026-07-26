/**
 * The identity primitives every docs-tree pass shares: what a note is called,
 * how a reference to it is normalized, where its file lives, and how the tree is
 * read.
 *
 * This module exists because three tool families — the inbound-reference
 * scanner, the correction-propagation checker, and the figure-staleness checker
 * — arrived at the same helpers independently and in parallel. Two copies each
 * of entity-ID derivation, the canonical-prefix list, frontmatter reading, path
 * location, and the filesystem seam. The lists happened to agree on the day they
 * were written, which is precisely how they would have diverged later: a prefix
 * added for one tool and not the other produces a checker that silently sees a
 * different graph than its neighbour.
 *
 * It is deliberately a LEAF — it imports nothing from the tool families that
 * depend on it. A merge in either direction would have created a cycle
 * (`note-index` needing the scanner's normalizer, the scanner needing
 * `note-index`'s identity), and a circular import in this package collapses at
 * build time rather than at type-check time.
 */

// node:path only — Bun exposes no native path API (ADR-001 F-6 exception).
import { isAbsolute, relative, resolve } from "node:path";
import yaml from "js-yaml";

/**
 * The four identity fields every indexed note answers to. Tool-specific note
 * records extend this with whatever else that pass needs — content, frontmatter
 * type, parsed relations — so a shared index can resolve references over any of
 * them.
 */
export interface NoteIdentity {
  /** Path relative to the docs root. */
  readonly path: string;
  readonly title: string;
  readonly entityId: string;
  readonly permalink: string;
}

/** Seam for tests and for callers whose tree is not on disk. */
export interface NoteFileSystem {
  /** Markdown paths relative to `docsRoot`. */
  listMarkdown(docsRoot: string): AsyncIterable<string>;
  read(absPath: string): Promise<string>;
  exists(absPath: string): Promise<boolean>;
}

export const defaultNoteFileSystem: NoteFileSystem = {
  async *listMarkdown(docsRoot: string) {
    const glob = new Bun.Glob("**/*.md");
    for await (const rel of glob.scan({ cwd: docsRoot, onlyFiles: true, absolute: false })) {
      yield rel;
    }
  },
  async read(absPath: string) {
    return await Bun.file(absPath).text();
  },
  async exists(absPath: string) {
    return await Bun.file(absPath).exists();
  },
};

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

/**
 * FAILSAFE_SCHEMA (CWE-502) matches the plan loader's posture. Every scalar
 * resolves as a string, which is right for identity reading: `title`,
 * `permalink` and `type` are all strings.
 */
export function readFrontmatter(content: string): Record<string, unknown> {
  const match = FRONTMATTER_RE.exec(content);
  if (!match) return {};
  const loaded = yaml.load(match[1] ?? "", { schema: yaml.FAILSAFE_SCHEMA });
  return typeof loaded === "object" && loaded !== null ? (loaded as Record<string, unknown>) : {};
}

export function stringField(frontmatter: Record<string, unknown>, field: string): string {
  const value = frontmatter[field];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Entity ID = the segment before the first colon of a canonical title, so
 * `CRIT-004-PRD-001: Debate Log` yields `CRIT-004-PRD-001`. A colon-less title
 * is malformed per the naming spec; its whole text is used rather than failing,
 * since an unindexable note is worse than an odd key.
 */
export function entityIdOfTitle(title: string): string {
  const colon = title.indexOf(":");
  return (colon > 0 ? title.slice(0, colon) : title).trim();
}

/** Canonical entity prefixes, used to spot an entity ID inside prose. */
export const ENTITY_PREFIXES = [
  "ADR",
  "ANALYSIS",
  "CRIT",
  "DESIGN",
  "EPIC",
  "PLAN",
  "PRD",
  "QA",
  "REQ",
  "RETRO",
  "SECURITY",
  "SESSION",
  "SKILL",
  "SPEC",
  "TASK",
] as const;

/** Set form, for membership tests that would otherwise scan the array. */
export const ENTITY_PREFIX_SET: ReadonlySet<string> = new Set(ENTITY_PREFIXES);

const ENTITY_ID_RE = new RegExp(
  `\\b(?:${ENTITY_PREFIXES.join("|")})-\\d{3}(?:-(?:${ENTITY_PREFIXES.join("|")})-\\d{3})*\\b`,
  "g",
);

/** Every canonical entity ID appearing in `text`, in order, with duplicates kept. */
export function findEntityIds(text: string): string[] {
  return [...text.matchAll(ENTITY_ID_RE)].map((match) => match[0]);
}

/**
 * Collapse a reference to its comparable skeleton: lowercase, every run of
 * non-alphanumerics folded to a single hyphen. Makes the canonical colon form,
 * the colon-less form, and the filename-stem form all converge, which is how a
 * malformed near-miss is told apart from an unrelated reference.
 */
export function normalizeReference(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Absolute path plus the docs-root-relative form recorded in reports. */
export function locateNote(docsRoot: string, target: string): { abs: string; rel: string } {
  const abs = isAbsolute(target) ? resolve(target) : resolve(docsRoot, target);
  return { abs, rel: relative(resolve(docsRoot), abs) };
}
