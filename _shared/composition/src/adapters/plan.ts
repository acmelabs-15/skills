import type { Root } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import type { CompositionAdapter } from "../core/adapter.js";
import type { LineRange, MutationSpec } from "../core/types.js";

/**
 * Identifies a "regenerated" section's byte span within a PLAN markdown body.
 * start: byte offset of the section's `## Heading` line (inclusive).
 * end:   byte offset just past the last character of the section (exclusive)
 *        — i.e. the index of the next `## Heading` line, or content.length if last.
 */
interface SectionSpan {
  heading: string;
  start: number;
  end: number;
}

/**
 * Raised when reverseMutations preserves less than the configured floor
 * of non-regenerated content (default 50%).
 */
export class IntegrityFloorError extends Error {
  constructor(
    readonly preservedRatio: number,
    readonly floor: number,
  ) {
    super(
      `Integrity floor violation: ${(preservedRatio * 100).toFixed(1)}% preserved, floor is ${(floor * 100).toFixed(0)}%`,
    );
    this.name = "IntegrityFloorError";
  }
}

/**
 * PLAN adapter — a DISTINCT CompositionAdapter implementation (NOT BaseMarkdownAdapter).
 *
 * Why distinct: PLAN notes contain "regenerated sections" — derived views such as the
 * Progress Dashboard and Cross-Part Dependency Graph that are recomputed from structural
 * content (Tasks tables, Phase Progression) rather than preserved char-identically.
 *
 * Behaviour summary:
 * - parse / serialize: unified + remark-parse + remark-stringify pipeline (same as base).
 * - extractByRange: 1-indexed inclusive line slice (end=-1 means EOF).
 * - applyMutations / reverseMutations: apply renumber_map, wikilink_map, frontmatter_map
 *   only OUTSIDE the byte spans of regenerated_sections. Content inside regenerated
 *   sections passes through unchanged.
 */
export class PlanAdapter implements CompositionAdapter {
  readonly sourceType = "plan";

  /** Minimum fraction of non-regenerated content that must be preserved through reverseMutations. */
  readonly integrityFloor: number;

  private readonly processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkStringify);

  constructor(integrityFloor = 0.5) {
    this.integrityFloor = integrityFloor;
  }

  parse(content: string): Root {
    return this.processor.parse(content);
  }

  serialize(ast: Root): string {
    return this.processor.stringify(ast);
  }

  extractByRange(content: string, range: LineRange): string {
    const lines = content.split("\n");
    const start = range.start - 1; // convert 1-indexed to 0-indexed
    const end = range.end === -1 ? lines.length : range.end; // end is inclusive 1-indexed
    return lines.slice(start, end).join("\n");
  }

  applyMutations(content: string, mutations: MutationSpec): string {
    return this.transformExcludingRegenerated(content, mutations, false);
  }

  reverseMutations(content: string, mutations: MutationSpec): string {
    const result = this.transformExcludingRegenerated(content, mutations, true);
    this.enforceIntegrityFloor(content, result, mutations);
    return result;
  }

  /**
   * Locate the byte spans of every `## Heading` whose text matches one of `headings`
   * (case-sensitive, trimmed). Returns spans sorted by start offset, non-overlapping.
   */
  findRegeneratedSpans(content: string, headings: readonly string[]): SectionSpan[] {
    if (headings.length === 0) return [];
    const wanted = new Set(headings.map((h) => h.trim()));
    const spans: SectionSpan[] = [];

    // Match `## ` at start of line followed by heading text up to newline.
    // Use lastIndex iteration to capture offsets.
    const headingRe = /^##[ \t]+(.+?)[ \t]*$/gm;
    type Match = { heading: string; offset: number; lineEnd: number };
    const matches: Match[] = [];
    for (;;) {
      const m = headingRe.exec(content);
      if (m === null) break;
      const headingText = (m[1] ?? "").trim();
      matches.push({
        heading: headingText,
        offset: m.index,
        lineEnd: m.index + m[0].length,
      });
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      if (!current) continue;
      if (!wanted.has(current.heading)) continue;
      const next = matches[i + 1];
      const end = next ? next.offset : content.length;
      spans.push({ heading: current.heading, start: current.offset, end });
    }

    return spans;
  }

  /**
   * Apply (or reverse) all mutations to every non-regenerated segment of content.
   * Regenerated section spans pass through unchanged.
   */
  private transformExcludingRegenerated(
    content: string,
    mutations: MutationSpec,
    reverse: boolean,
  ): string {
    const regenerated = mutations.regenerated_sections ?? [];
    const spans = this.findRegeneratedSpans(content, regenerated);

    if (spans.length === 0) {
      return this.transformSegment(content, mutations, reverse);
    }

    const parts: string[] = [];
    let cursor = 0;
    for (const span of spans) {
      if (span.start > cursor) {
        parts.push(this.transformSegment(content.slice(cursor, span.start), mutations, reverse));
      }
      parts.push(content.slice(span.start, span.end));
      cursor = span.end;
    }
    if (cursor < content.length) {
      parts.push(this.transformSegment(content.slice(cursor), mutations, reverse));
    }
    return parts.join("");
  }

  private transformSegment(segment: string, mutations: MutationSpec, reverse: boolean): string {
    const renumberMap = reverse ? this.invertMap(mutations.renumber_map) : mutations.renumber_map;
    const wikilinkMap = reverse ? this.invertMap(mutations.wikilink_map) : mutations.wikilink_map;

    let result = this.applySinglePassReplace(segment, renumberMap);
    result = this.applySinglePassReplace(result, wikilinkMap);

    // frontmatter_map uses field-name semantics (keys are YAML field names, values
    // are the new field values). The map does not record original values, so reverse
    // mutations cannot algebraically restore them. On reverse, leave the frontmatter
    // untouched — callers that need bit-exact restoration supply an explicit inverse
    // spec via a second applyMutations call.
    const fmMap = mutations.frontmatter_map;
    if (!reverse && fmMap && Object.keys(fmMap).length > 0) {
      result = this.applyFrontmatterMutations(result, fmMap);
    }
    return result;
  }

  private applySinglePassReplace(content: string, map: Record<string, string>): string {
    const keys = Object.keys(map);
    if (keys.length === 0) return content;
    // Sort by length descending so longer keys match first (e.g. D-100 before D-1).
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

  /**
   * Mutate single-line frontmatter fields. Multi-line YAML arrays (`branches:` followed
   * by `  - foo`) are not currently handled — the frontmatter_map contract requires
   * scalar string values, so callers that need to renumber arrays must serialize
   * the entire array into a single line via a different mechanism.
   */
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

  /**
   * Verify that reverseMutations recovered at least `integrityFloor` of the
   * non-regenerated bytes of the original (input) content. The "original" here
   * is the input to reverseMutations — typically the previously-mutated form.
   * We measure preservation as the longest-common-subsequence-ish ratio approximated
   * by line-overlap, since exact recovery beyond renumber/wikilink/frontmatter would
   * require the un-mutated source.
   *
   * Concretely: count the lines in the recovered text that also appear (anywhere)
   * in the non-regenerated portion of the input. preservedRatio = matches / total.
   */
  private enforceIntegrityFloor(input: string, recovered: string, mutations: MutationSpec): void {
    const regenerated = mutations.regenerated_sections ?? [];
    const inputNonRegenerated = this.stripRegeneratedSections(input, regenerated);
    const recoveredNonRegenerated = this.stripRegeneratedSections(recovered, regenerated);

    const recoveredLines = recoveredNonRegenerated
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (recoveredLines.length === 0) {
      // Empty body — nothing to validate.
      return;
    }

    const inputLineSet = new Set(
      inputNonRegenerated
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    );
    let matches = 0;
    for (const line of recoveredLines) {
      if (inputLineSet.has(line)) matches++;
    }
    const preservedRatio = matches / recoveredLines.length;
    if (preservedRatio < this.integrityFloor) {
      throw new IntegrityFloorError(preservedRatio, this.integrityFloor);
    }
  }

  /** Remove all regenerated section byte spans from content (replaced with empty). */
  private stripRegeneratedSections(content: string, headings: readonly string[]): string {
    const spans = this.findRegeneratedSpans(content, headings);
    if (spans.length === 0) return content;
    const parts: string[] = [];
    let cursor = 0;
    for (const span of spans) {
      parts.push(content.slice(cursor, span.start));
      cursor = span.end;
    }
    parts.push(content.slice(cursor));
    return parts.join("");
  }
}
