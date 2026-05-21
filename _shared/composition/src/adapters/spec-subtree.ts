import { dirname, isAbsolute, join, resolve } from "node:path";
import type { Root } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import type { CompositionAdapter } from "../core/adapter.js";
import { sha256 } from "../core/hash.js";
import type { LineRange, MutationSpec } from "../core/types.js";

export interface SubtreeChild {
  /** Path relative to the SPEC root directory (e.g. "requirements/REQ-001-...md"). */
  relativePath: string;
  /** Raw markdown content of the child note. */
  content: string;
  /** Short identifier (e.g. "REQ-001", "TASK-003"). */
  identifier: string;
}

export interface SubtreeManifest {
  /** Path to the SPEC root note (e.g. "SPEC-001-composition-core.md"). */
  rootPath: string;
  /** Raw markdown of the root note. */
  rootContent: string;
  /** All child notes (REQ / DESIGN / TASK). */
  children: SubtreeChild[];
}

export interface SubtreeMutationResult {
  rootContent: string;
  children: Array<{ relativePath: string; content: string }>;
}

export interface FilenameRewriteSpec {
  /** Current relative path (relative to rootDir). */
  relativePath: string;
  /** Desired relative path (relative to rootDir). */
  newRelativePath: string;
}

export class SubtreeHashValidationError extends Error {
  constructor(
    readonly failedFile: string,
    readonly expected: string,
    readonly actual: string,
  ) {
    super(
      `Hash mismatch on ${failedFile}: expected ${expected.slice(0, 8)}..., got ${actual.slice(0, 8)}...`,
    );
    this.name = "SubtreeHashValidationError";
  }
}

/**
 * Adapter for SPEC subtree distribution / composition.
 *
 * A SPEC note is a subtree: a root note plus child directories
 * (requirements/, design/, tasks/). The CompositionAdapter interface
 * is single-file; this adapter honors that contract via `applyMutations`
 * (which operates on the root note only) and adds `applySubtreeMutations`
 * / `reverseSubtreeMutations` / `validateSubtreeRoundTrip` for the full
 * subtree.
 */
export class SpecSubtreeAdapter implements CompositionAdapter {
  readonly sourceType = "spec";

  private readonly processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkStringify);

  // --- CompositionAdapter 5-method interface ---

  parse(content: string): Root {
    return this.processor.parse(content);
  }

  serialize(ast: Root): string {
    return this.processor.stringify(ast);
  }

  extractByRange(content: string, range: LineRange): string {
    const lines = content.split("\n");
    const start = range.start - 1;
    const end = range.end === -1 ? lines.length : range.end;
    return lines.slice(start, end).join("\n");
  }

  /**
   * Applies mutations to a single file (per CompositionAdapter contract).
   * For full-subtree orchestration use applySubtreeMutations.
   */
  applyMutations(content: string, mutations: MutationSpec): string {
    let result = this.applySinglePassReplace(content, mutations.renumber_map);
    result = this.applySinglePassReplace(result, mutations.wikilink_map);
    if (mutations.frontmatter_map && Object.keys(mutations.frontmatter_map).length > 0) {
      result = this.applyFrontmatterMutations(result, mutations.frontmatter_map);
    }
    return result;
  }

  /**
   * Inverts mutations on a single file.
   */
  reverseMutations(content: string, mutations: MutationSpec): string {
    const invertedRenumber = this.invertMap(mutations.renumber_map);
    const invertedWikilink = this.invertMap(mutations.wikilink_map);
    let result = this.applySinglePassReplace(content, invertedRenumber);
    result = this.applySinglePassReplace(result, invertedWikilink);
    if (mutations.frontmatter_map && Object.keys(mutations.frontmatter_map).length > 0) {
      result = this.applyFrontmatterMutations(result, this.invertMap(mutations.frontmatter_map));
    }
    return result;
  }

  // --- Additional subtree methods ---

  /**
   * Applies mutations to every file in the subtree (root + children).
   */
  applySubtreeMutations(manifest: SubtreeManifest, mutations: MutationSpec): SubtreeMutationResult {
    const rootContent = this.applyMutations(manifest.rootContent, mutations);
    const children = manifest.children.map((child) => ({
      relativePath: child.relativePath,
      content: this.applyMutations(child.content, mutations),
    }));
    return { rootContent, children };
  }

  /**
   * Inverts mutations on every file in the subtree.
   */
  reverseSubtreeMutations(
    manifest: SubtreeManifest,
    mutations: MutationSpec,
  ): SubtreeMutationResult {
    const rootContent = this.reverseMutations(manifest.rootContent, mutations);
    const children = manifest.children.map((child) => ({
      relativePath: child.relativePath,
      content: this.reverseMutations(child.content, mutations),
    }));
    return { rootContent, children };
  }

  /**
   * THE PROOF: validates that applying then reversing mutations yields a
   * byte-identical (SHA-256 identical) copy of every file in the subtree.
   * Throws SubtreeHashValidationError on the first failure; cluster-level
   * rollback of any staged writes is the caller's responsibility.
   */
  validateSubtreeRoundTrip(originalManifest: SubtreeManifest, mutations: MutationSpec): void {
    const mutated = this.applySubtreeMutations(originalManifest, mutations);
    const recoveredRoot = this.reverseMutations(mutated.rootContent, mutations);
    const expectedRootHash = sha256(originalManifest.rootContent);
    const actualRootHash = sha256(recoveredRoot);
    if (expectedRootHash !== actualRootHash) {
      throw new SubtreeHashValidationError(
        originalManifest.rootPath,
        expectedRootHash,
        actualRootHash,
      );
    }
    for (let i = 0; i < originalManifest.children.length; i++) {
      const orig = originalManifest.children[i];
      const mut = mutated.children[i];
      if (!orig || !mut) continue;
      const recovered = this.reverseMutations(mut.content, mutations);
      const expected = sha256(orig.content);
      const actual = sha256(recovered);
      if (expected !== actual) {
        throw new SubtreeHashValidationError(orig.relativePath, expected, actual);
      }
    }
  }

  /**
   * Renames child files within a SPEC subtree. Pre-flight verifies every
   * source exists and no destination conflicts. On any failure mid-sequence,
   * completed renames are undone in LIFO order.
   */
  async applyFilenameRewrites(rootDir: string, rewrites: FilenameRewriteSpec[]): Promise<void> {
    if (rewrites.length === 0) return;

    // Pre-flight: path-containment check on every target path.
    // Reject absolute paths, paths containing ".." traversal segments, and
    // paths that resolve outside rootDir.
    for (const rw of rewrites) {
      this.assertContainedRelativePath(rw.newRelativePath, rootDir);
    }

    // Pre-flight: injectivity — no two rewrites may target the same
    // newRelativePath. Detected before any rename executes (the dst-exists
    // check below would otherwise only catch this AFTER the first succeeded,
    // triggering rollback rather than pre-flight rejection).
    const targetSet = new Set<string>();
    for (const rw of rewrites) {
      if (targetSet.has(rw.newRelativePath)) {
        throw new Error(
          `Filename rewrite injectivity violation: duplicate target ${rw.newRelativePath}`,
        );
      }
      targetSet.add(rw.newRelativePath);
    }

    // Pre-flight: every source path must exist.
    for (const rw of rewrites) {
      const srcAbs = join(rootDir, rw.relativePath);
      const exists = await Bun.file(srcAbs).exists();
      if (!exists) {
        throw new Error(`Source path does not exist: ${rw.relativePath}`);
      }
    }

    // Pre-flight: no destination already exists (excluding the source set,
    // which permits swaps via the rename sequence itself).
    const sourceSet = new Set(rewrites.map((r) => r.relativePath));
    for (const rw of rewrites) {
      if (sourceSet.has(rw.newRelativePath)) continue;
      const dstAbs = join(rootDir, rw.newRelativePath);
      const dstExists = await Bun.file(dstAbs).exists();
      if (dstExists) {
        throw new Error(`Destination path already exists: ${rw.newRelativePath}`);
      }
    }

    const { mkdir } = await import("node:fs/promises");
    const completed: FilenameRewriteSpec[] = [];
    try {
      for (const rw of rewrites) {
        const srcAbs = join(rootDir, rw.relativePath);
        const dstAbs = join(rootDir, rw.newRelativePath);
        const content = await Bun.file(srcAbs).bytes();
        await mkdir(dirname(dstAbs), { recursive: true });
        await Bun.write(dstAbs, content);
        await Bun.file(srcAbs).delete();
        completed.push(rw);
      }
    } catch (err) {
      // LIFO rollback of completed renames.
      while (completed.length > 0) {
        const last = completed.pop();
        if (!last) break;
        const srcAbs = join(rootDir, last.relativePath);
        const dstAbs = join(rootDir, last.newRelativePath);
        try {
          const content = await Bun.file(dstAbs).bytes();
          await mkdir(dirname(srcAbs), { recursive: true });
          await Bun.write(srcAbs, content);
          await Bun.file(dstAbs).delete();
        } catch {
          // Swallow rollback errors; the original error is the one to surface.
        }
      }
      throw err;
    }
  }

  /**
   * Validates that a relative path is safe for use as a rewrite target:
   * not absolute, no ".." traversal segments, and resolves to a location
   * within rootDir.
   */
  private assertContainedRelativePath(relativePath: string, rootDir: string): void {
    if (relativePath.length === 0) {
      throw new Error("Filename rewrite path-containment violation: empty path");
    }
    if (isAbsolute(relativePath)) {
      throw new Error(`Filename rewrite path-containment violation: absolute path ${relativePath}`);
    }
    const segments = relativePath.split(/[/\\]/);
    if (segments.includes("..")) {
      throw new Error(`Filename rewrite path-containment violation: traversal in ${relativePath}`);
    }
    const rootAbs = resolve(rootDir);
    const targetAbs = resolve(rootAbs, relativePath);
    if (targetAbs !== rootAbs && !targetAbs.startsWith(`${rootAbs}/`)) {
      throw new Error(
        `Filename rewrite path-containment violation: escapes rootDir: ${relativePath}`,
      );
    }
  }

  // --- Internal helpers (mirror BaseMarkdownAdapter) ---

  private applySinglePassReplace(content: string, map: Record<string, string>): string {
    const keys = Object.keys(map);
    if (keys.length === 0) return content;
    const sortedKeys = [...keys].sort((a, b) => b.length - a.length);
    const escaped = sortedKeys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = new RegExp(escaped.join("|"), "g");
    return content.replace(pattern, (match) => map[match] ?? match);
  }

  private invertMap(map: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(map)) {
      result[v] = k;
    }
    return result;
  }

  private applyFrontmatterMutations(
    content: string,
    frontmatterMap: Record<string, string>,
  ): string {
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return content;
    let fm = fmMatch[1] ?? "";
    for (const [key, value] of Object.entries(frontmatterMap)) {
      const keyPattern = new RegExp(
        `^(${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*)(.+)$`,
        "m",
      );
      fm = fm.replace(keyPattern, `$1${value}`);
    }
    return content.replace(/^---\n[\s\S]*?\n---/, `---\n${fm}\n---`);
  }
}
