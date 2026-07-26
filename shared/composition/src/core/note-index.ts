/**
 * A read-only index of a docs tree, keyed by every identity a note answers to.
 *
 * Verification passes are handed targets in whatever form the citing note wrote
 * them — a bare entity ID, a colon title, a permalink, occasionally a path. All
 * four have to resolve to the same file, and a target that resolves to nothing
 * has to be reported rather than skipped, since an unresolvable target is the
 * loudest possible signal that a correction was filed against a note that has
 * since moved or was never created.
 *
 * The index is built once per run and reused, because both a correction sweep
 * and a figure sweep read the same notes repeatedly and re-reading a 500-line
 * note per obligation is the difference between a sweep that runs in a second
 * and one that does not.
 */

// node:path only — Bun exposes no native path API (ADR-001 F-6 exception).
import { resolve } from "node:path";
import { PlanValidationError } from "../schemas/plan-yaml.js";
import {
  type NoteFileSystem,
  type NoteIdentity,
  defaultNoteFileSystem,
  entityIdOfTitle,
  locateNote,
  normalizeReference,
  readFrontmatter,
  stringField,
} from "./note-identity.js";

// The identity primitives are NOT re-exported here. They live in
// `note-identity.js` and callers import them from there — one symbol, one import
// path. A convenience re-export would recreate the two-paths-to-one-helper shape
// this split exists to remove.

/** A note plus the payload the correction and figure passes read. */
export interface IndexedNote extends NoteIdentity {
  /** Frontmatter `type`, empty when absent. */
  readonly noteType: string;
  readonly content: string;
}

/**
 * Generic over the note record so every pass can share one index. The
 * correction and figure passes index `IndexedNote` (identity plus content); the
 * reference scanner indexes a record carrying parsed relations instead. Both
 * resolve references through the same four-form logic rather than each carrying
 * a private title map.
 */
export class NoteIndex<T extends NoteIdentity = IndexedNote> {
  private readonly byPath = new Map<string, T>();
  private readonly byEntityId = new Map<string, T[]>();
  private readonly byTitle = new Map<string, T>();
  private readonly byNormalizedTitle = new Map<string, T>();
  private readonly byPermalink = new Map<string, T>();

  constructor(
    readonly docsRoot: string,
    notes: readonly T[],
  ) {
    for (const note of notes) {
      this.byPath.set(note.path, note);
      const bucket = this.byEntityId.get(note.entityId) ?? [];
      bucket.push(note);
      this.byEntityId.set(note.entityId, bucket);
      if (note.title.length > 0) {
        this.byTitle.set(note.title, note);
        const normalized = normalizeReference(note.title);
        if (!this.byNormalizedTitle.has(normalized)) this.byNormalizedTitle.set(normalized, note);
      }
      if (note.permalink.length > 0) this.byPermalink.set(note.permalink, note);
    }
  }

  get size(): number {
    return this.byPath.size;
  }

  all(): T[] {
    return [...this.byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
  }

  /**
   * Resolve a reference written in any of the four forms. An entity ID claimed
   * by more than one note resolves to nothing rather than to an arbitrary pick
   * — duplicate identifiers are a known defect class in this corpus, and
   * guessing which note a correction meant is exactly the wrong response.
   */
  resolve(reference: string): T | undefined {
    const trimmed = reference.trim();
    const direct = this.byPath.get(trimmed);
    if (direct) return direct;
    const byTitle = this.byTitle.get(trimmed);
    if (byTitle) return byTitle;
    const byPermalink = this.byPermalink.get(trimmed.replace(/^[^/]+\//, ""));
    if (byPermalink) return byPermalink;
    const bucket = this.byEntityId.get(entityIdOfTitle(trimmed));
    if (bucket?.length === 1) return bucket[0];
    return undefined;
  }

  /**
   * `resolve`, then a punctuation-insensitive title fallback so a colon-less or
   * filename-stem form still lands. Kept as a SEPARATE method rather than
   * folded into `resolve`: a verification pass that reports unresolvable
   * targets depends on strict resolution to spot a genuinely broken reference,
   * and quietly making it lenient would turn those reports into false passes.
   */
  resolveNormalized(reference: string): T | undefined {
    return this.resolve(reference) ?? this.byNormalizedTitle.get(normalizeReference(reference));
  }

  /** True when the reference names an entity ID more than one note claims. */
  isAmbiguous(reference: string): boolean {
    return (this.byEntityId.get(entityIdOfTitle(reference.trim()))?.length ?? 0) > 1;
  }
}

/** Read every markdown file under `docsRoot` and index it. */
export async function buildNoteIndex(
  docsRoot: string,
  fileSystem: NoteFileSystem = defaultNoteFileSystem,
): Promise<NoteIndex> {
  const root = resolve(docsRoot);
  const paths: string[] = [];
  for await (const rel of fileSystem.listMarkdown(root)) paths.push(rel);
  paths.sort();
  const notes: IndexedNote[] = [];
  for (const path of paths) {
    const content = await fileSystem.read(resolve(root, path));
    const frontmatter = readFrontmatter(content);
    const title = stringField(frontmatter, "title");
    notes.push({
      path,
      title,
      entityId: title.length > 0 ? entityIdOfTitle(title) : "",
      permalink: stringField(frontmatter, "permalink"),
      noteType: stringField(frontmatter, "type"),
      content,
    });
  }
  return new NoteIndex(root, notes);
}

/** Load one note by path, failing loudly when it is absent. */
export async function readNoteAt(
  docsRoot: string,
  target: string,
  fileSystem: NoteFileSystem = defaultNoteFileSystem,
): Promise<IndexedNote> {
  const { abs, rel } = locateNote(docsRoot, target);
  if (!(await fileSystem.exists(abs))) {
    throw new PlanValidationError(`note not found: ${abs}`, [
      { path: target, message: "file does not exist" },
    ]);
  }
  const content = await fileSystem.read(abs);
  const frontmatter = readFrontmatter(content);
  const title = stringField(frontmatter, "title");
  return {
    path: rel,
    title,
    entityId: title.length > 0 ? entityIdOfTitle(title) : "",
    permalink: stringField(frontmatter, "permalink"),
    noteType: stringField(frontmatter, "type"),
    content,
  };
}
